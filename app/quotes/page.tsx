import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEnum } from "@/lib/format";

export default async function QuotesPage() {
  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: true, property: true },
  });

  return (
    <main>
      <div className="page-header">
        <h1>Quotes</h1>
        <Link href="/quotes/new" className="btn">
          + New Quote
        </Link>
      </div>

      {quotes.length === 0 ? (
        <p className="empty">No quotes yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Property</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.id}>
                <td>
                  <Link href={`/quotes/${quote.id}`}>{quote.customer.name}</Link>
                </td>
                <td>{quote.property?.label ?? quote.property?.address ?? "—"}</td>
                <td>
                  <span className="badge">{formatEnum(quote.status)}</span>
                </td>
                <td>${quote.total?.toFixed(2) ?? "0.00"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
