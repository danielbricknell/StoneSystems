import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissionOrRedirect } from "@/lib/permissions";
import { QuoteForm } from "./QuoteForm";

export default async function NewQuotePage() {
  await requirePermissionOrRedirect("view_financials", "/quotes");

  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: { properties: { orderBy: { createdAt: "asc" } } },
  });

  return (
    <main>
      <div className="page-header">
        <h1>New Quote</h1>
        <Link href="/quotes">Cancel</Link>
      </div>

      {customers.length === 0 ? (
        <p className="empty">
          Add a customer before creating a quote.{" "}
          <Link href="/customers/new">New customer →</Link>
        </p>
      ) : (
        <QuoteForm
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
