import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissionOrRedirect } from "@/lib/permissions";
import { formatEnum, statusBadgeClass } from "@/lib/format";

export default async function InvoicesPage() {
  await requirePermissionOrRedirect("view_financials", "/");

  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: { job: { include: { customer: true } } },
  });

  return (
    <main>
      <div className="page-header">
        <h1>Invoices</h1>
      </div>

      <p className="meta">
        QBO is the accounting source of truth once sync exists — this just tracks status and
        total locally. Create one from a job&apos;s detail page.
      </p>

      {invoices.length === 0 ? (
        <p className="empty">No invoices yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Job</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>
                  <Link href={`/jobs/${invoice.job.id}`}>{invoice.job.title}</Link>
                </td>
                <td>{invoice.job.customer.name}</td>
                <td>
                  <span className={statusBadgeClass(invoice.status)}>{formatEnum(invoice.status)}</span>
                </td>
                <td>${invoice.total?.toFixed(2) ?? "0.00"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
