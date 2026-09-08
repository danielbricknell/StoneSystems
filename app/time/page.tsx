import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { formatEnum, statusBadgeClass } from "@/lib/format";
import { approveTimeEntry, rejectTimeEntry } from "./actions";

function formatMinutes(clockIn: Date, clockOut: Date | null, breakMinutes: number | null) {
  if (!clockOut) return "—";
  const rawMinutes = Math.round((clockOut.getTime() - clockIn.getTime()) / 60000) - (breakMinutes ?? 0);
  const totalMinutes = Math.max(0, rawMinutes);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export default async function TimePage() {
  const session = await requireSession();

  const canApprove = await hasPermission(session.userId, "approve_timesheets");

  const [myEntries, pendingEntries] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { userId: session.userId },
      orderBy: { clockIn: "desc" },
      take: 25,
      include: { job: true },
    }),
    canApprove
      ? prisma.timeEntry.findMany({
          where: { approvalStatus: "pending", clockOut: { not: null } },
          orderBy: { clockOut: "asc" },
          include: { job: true, user: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <main>
      <div className="page-header">
        <h1>Time</h1>
      </div>

      <div className="card">
        <p className="section-title">My Time Entries</p>
        {myEntries.length === 0 ? (
          <p className="empty">No time entries yet. Clock in from a job's detail page.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Duration</th>
                <th>Billable</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {myEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <Link href={`/jobs/${entry.jobId}`}>{entry.job.title}</Link>
                  </td>
                  <td>{entry.clockIn.toLocaleString()}</td>
                  <td>{entry.clockOut ? entry.clockOut.toLocaleString() : "In progress"}</td>
                  <td>{formatMinutes(entry.clockIn, entry.clockOut, entry.breakMinutes)}</td>
                  <td>{entry.billable ? "Yes" : "No"}</td>
                  <td>
                    <span className={statusBadgeClass(entry.approvalStatus)}>
                      {formatEnum(entry.approvalStatus)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {canApprove && (
      <div className="card">
        <p className="section-title">Pending Approvals</p>
        {pendingEntries.length === 0 ? (
          <p className="empty">Nothing waiting on approval.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Technician</th>
                <th>Job</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Duration</th>
                <th>Billable</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pendingEntries.map((entry) => {
                const approveThisEntry = approveTimeEntry.bind(null, entry.id);
                const rejectThisEntry = rejectTimeEntry.bind(null, entry.id);
                return (
                  <tr key={entry.id}>
                    <td>{entry.user.fullName}</td>
                    <td>
                      <Link href={`/jobs/${entry.jobId}`}>{entry.job.title}</Link>
                    </td>
                    <td>{entry.clockIn.toLocaleString()}</td>
                    <td>{entry.clockOut ? entry.clockOut.toLocaleString() : "—"}</td>
                    <td>{formatMinutes(entry.clockIn, entry.clockOut, entry.breakMinutes)}</td>
                    <td>{entry.billable ? "Yes" : "No"}</td>
                    <td>
                      <div className="checkbox-list">
                        <form action={approveThisEntry}>
                          <button type="submit" className="btn btn-secondary">
                            Approve
                          </button>
                        </form>
                        <form action={rejectThisEntry}>
                          <button type="submit" className="btn-danger">
                            Reject
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      )}
    </main>
  );
}
