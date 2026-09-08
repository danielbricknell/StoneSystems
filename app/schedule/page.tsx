import Link from "next/link";
import { prisma } from "@/lib/prisma";

const SYSTEM_USER_EMAIL = "system@internal.local";
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday as the first day
  d.setDate(d.getDate() + diff);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

// Parses a "YYYY-MM-DD" param as a local calendar date, and formats one the
// same way — avoids the UTC round-trip shifting the date by a day depending
// on the server's timezone offset.
function parseDateParam(value: string | undefined): Date {
  if (value) {
    const [year, month, day] = value.split("-").map(Number);
    if (year && month && day) return new Date(year, month - 1, day);
  }
  return new Date();
}

function toDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: { depot?: string; week?: string; view?: string };
}) {
  const view = searchParams.view === "month" ? "month" : "week";
  const refDate = parseDateParam(searchParams.week);

  const rangeStart = view === "month" ? startOfMonth(refDate) : startOfWeek(refDate);
  const days =
    view === "month"
      ? Array.from({ length: daysInMonth(rangeStart) }, (_, i) => addDays(rangeStart, i))
      : Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i));
  const rangeEnd = addDays(rangeStart, days.length);

  const selectedDepotId = searchParams.depot ?? "";

  const depots = await prisma.depot.findMany({
    where: { type: "office" },
    orderBy: { name: "asc" },
  });

  const technicians = await prisma.user.findMany({
    where: {
      active: true,
      email: { not: SYSTEM_USER_EMAIL },
      ...(selectedDepotId ? { depotId: selectedDepotId } : {}),
    },
    orderBy: { fullName: "asc" },
  });

  const appointments = technicians.length
    ? await prisma.appointment.findMany({
        where: {
          userId: { in: technicians.map((tech) => tech.id) },
          startTime: { lt: rangeEnd },
          endTime: { gte: rangeStart },
        },
        include: { job: true },
      })
    : [];

  const appointmentsByUser = new Map<string, typeof appointments>();
  for (const appointment of appointments) {
    const list = appointmentsByUser.get(appointment.userId) ?? [];
    list.push(appointment);
    appointmentsByUser.set(appointment.userId, list);
  }

  const prevHref =
    view === "month"
      ? `/schedule?depot=${selectedDepotId}&view=month&week=${toDateParam(addMonths(rangeStart, -1))}`
      : `/schedule?depot=${selectedDepotId}&view=week&week=${toDateParam(addDays(rangeStart, -7))}`;
  const nextHref =
    view === "month"
      ? `/schedule?depot=${selectedDepotId}&view=month&week=${toDateParam(addMonths(rangeStart, 1))}`
      : `/schedule?depot=${selectedDepotId}&view=week&week=${toDateParam(addDays(rangeStart, 7))}`;
  const weekViewHref = `/schedule?depot=${selectedDepotId}&view=week&week=${toDateParam(rangeStart)}`;
  const monthViewHref = `/schedule?depot=${selectedDepotId}&view=month&week=${toDateParam(rangeStart)}`;

  return (
    <main>
      <div className="page-header">
        <h1>Schedule</h1>
      </div>

      <div className="card">
        <form className="form-inline" method="get">
          <div className="field">
            <label htmlFor="depot">Depot</label>
            <select id="depot" name="depot" defaultValue={selectedDepotId}>
              <option value="">All depots</option>
              {depots.map((depot) => (
                <option key={depot.id} value={depot.id}>
                  {depot.name}
                </option>
              ))}
            </select>
          </div>
          <input type="hidden" name="view" value={view} />
          <input type="hidden" name="week" value={searchParams.week ?? ""} />
          <button type="submit" className="btn btn-secondary">
            Filter
          </button>
        </form>
      </div>

      <div className="page-header">
        <div className="checkbox-list">
          <Link href={weekViewHref} className={view === "week" ? "btn" : "btn btn-secondary"}>
            Week
          </Link>
          <Link href={monthViewHref} className={view === "month" ? "btn" : "btn btn-secondary"}>
            Month
          </Link>
        </div>
        <span className="meta">
          {view === "month"
            ? rangeStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })
            : `${rangeStart.toLocaleDateString()} – ${addDays(rangeStart, 6).toLocaleDateString()}`}
        </span>
      </div>

      <div className="page-header">
        <Link href={prevHref}>← Previous {view === "month" ? "month" : "week"}</Link>
        <Link href={nextHref}>Next {view === "month" ? "month" : "week"} →</Link>
      </div>

      {technicians.length === 0 ? (
        <p className="empty">
          No team members{selectedDepotId ? " at this depot" : ""} yet.{" "}
          <Link href="/users/new">Add one →</Link>
        </p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Technician</th>
                {days.map((day) => (
                  <th
                    key={day.toISOString()}
                    title={day.toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  >
                    {view === "month"
                      ? day.getDate()
                      : day.toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {technicians.map((tech) => {
                const techAppointments = appointmentsByUser.get(tech.id) ?? [];
                return (
                  <tr key={tech.id}>
                    <td>{tech.fullName}</td>
                    {days.map((day) => {
                      const dayStart = day;
                      const dayEnd = addDays(day, 1);
                      const dayAppointments = techAppointments.filter(
                        (a) => a.startTime < dayEnd && a.endTime > dayStart,
                      );
                      return (
                        <td key={day.toISOString()}>
                          {dayAppointments.map((appointment) => (
                            <div key={appointment.id}>
                              <Link href={`/jobs/${appointment.jobId}`}>
                                {appointment.job.title}
                              </Link>
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
