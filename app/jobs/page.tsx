import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { formatEnum, statusBadgeClass } from "@/lib/format";

export default async function JobsPage() {
  const session = await requireSession();
  const [jobs, canEditJobs] = await Promise.all([
    prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      include: { customer: true, property: true },
    }),
    hasPermission(session.userId, "edit_jobs"),
  ]);

  return (
    <main>
      <div className="page-header">
        <h1>Jobs</h1>
        {canEditJobs && (
          <Link href="/jobs/new" className="btn">
            + New Job
          </Link>
        )}
      </div>

      {jobs.length === 0 ? (
        <p className="empty">No jobs yet. Create one once you have a customer and property.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Customer</th>
              <th>Property</th>
              <th>Type</th>
              <th>Status</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>
                  <Link href={`/jobs/${job.id}`}>{job.title}</Link>
                </td>
                <td>{job.customer.name}</td>
                <td>{job.property.label ?? job.property.address ?? "—"}</td>
                <td>{formatEnum(job.type)}</td>
                <td>
                  <span className={statusBadgeClass(job.status)}>{formatEnum(job.status)}</span>
                </td>
                <td>{job.priority ? formatEnum(job.priority) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
