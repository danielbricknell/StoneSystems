import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissionOrRedirect } from "@/lib/permissions";
import { JobForm } from "./JobForm";

export default async function NewJobPage() {
  await requirePermissionOrRedirect("edit_jobs", "/jobs");

  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: { properties: { orderBy: { createdAt: "asc" } } },
  });

  return (
    <main>
      <div className="page-header">
        <h1>New Job</h1>
        <Link href="/jobs">Cancel</Link>
      </div>

      {customers.length === 0 ? (
        <p className="empty">
          Add a customer (with a property) before creating a job.{" "}
          <Link href="/customers/new">New customer →</Link>
        </p>
      ) : (
        <JobForm
          customers={customers.map((customer) => ({
            id: customer.id,
            name: customer.name,
            properties: customer.properties.map((property) => ({
              id: property.id,
              label: property.label,
              address: property.address,
            })),
          }))}
        />
      )}
    </main>
  );
}
