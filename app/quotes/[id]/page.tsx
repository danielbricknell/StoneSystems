import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermissionOrRedirect } from "@/lib/permissions";
import { formatEnum, statusBadgeClass } from "@/lib/format";
import { addQuoteLineItem, convertQuoteToJob, updateQuoteStatus } from "../actions";
import { LineItemForm } from "@/components/LineItemForm";

const EDITABLE_STATUSES = ["draft", "sent", "accepted", "declined", "expired"] as const;

export default async function QuoteDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requirePermissionOrRedirect("view_financials", "/quotes");

  const [quote, inventoryItems] = await Promise.all([
    prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        property: true,
        lineItems: { orderBy: { createdAt: "asc" } },
        job: true,
      },
    }),
    prisma.inventoryItem.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!quote) notFound();

  const updateStatusForQuote = updateQuoteStatus.bind(null, quote.id);
  const addLineItemForQuote = addQuoteLineItem.bind(null, quote.id);
  const convertThisQuote = convertQuoteToJob.bind(null, quote.id);
  const inventoryOptions = inventoryItems.map((item) => ({
    id: item.id,
    name: item.name,
    unitPrice: item.unitPrice ? item.unitPrice.toNumber() : null,
  }));

  const canConvert = quote.status === "accepted" && !quote.jobId && !!quote.propertyId;
  const missingPropertyForConvert =
    quote.status === "accepted" && !quote.jobId && !quote.propertyId;

  return (
    <main>
      <div className="page-header">
        <h1>Quote for {quote.customer.name}</h1>
        <Link href="/quotes">← All quotes</Link>
      </div>

      <div className="card">
        <p className="section-title">Details</p>
        <p className="meta">
          Customer: <Link href={`/customers/${quote.customer.id}`}>{quote.customer.name}</Link>
        </p>
        <p className="meta">
          Property:{" "}
          {quote.property ? quote.property.label ?? quote.property.address ?? "—" : "Not set"}
        </p>
        <p className="meta">Total: ${quote.total?.toFixed(2) ?? "0.00"}</p>
        {quote.notes && <p className="meta">Notes: {quote.notes}</p>}
        <p className="meta">Expires: {quote.expiresAt ? quote.expiresAt.toLocaleDateString() : "—"}</p>
        <p className="meta">Sent: {quote.sentAt ? quote.sentAt.toLocaleDateString() : "—"}</p>
        {quote.job && (
          <p className="meta">
            Converted to job:{" "}
            <Link href={`/jobs/${quote.job.id}`}>{quote.job.title}</Link>
          </p>
        )}
      </div>

      <div className="card">
        <p className="section-title">Status</p>
        <p className="meta">
          Current: <span className={statusBadgeClass(quote.status)}>{formatEnum(quote.status)}</span>
        </p>

        {quote.status !== "converted" && (
          <form action={updateStatusForQuote} className="form-inline">
            <div className="field">
              <label htmlFor="status">Change status</label>
              <select id="status" name="status" defaultValue={quote.status}>
                {EDITABLE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatEnum(status)}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-secondary">
              Update Status
            </button>
          </form>
        )}

        {canConvert && (
          <form action={convertThisQuote} className="form-inline">
            <button type="submit" className="btn">
              Convert to Job
            </button>
          </form>
        )}
        {missingPropertyForConvert && (
          <p className="empty">
            This quote has no property attached, so it can&apos;t convert to a job yet.
          </p>
        )}
      </div>

      <div className="card">
        <p className="section-title">Line Items</p>
        {quote.lineItems.length === 0 ? (
          <p className="empty">No line items yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {quote.lineItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>{item.quantity.toString()}</td>
                  <td>${item.unitPrice.toFixed(2)}</td>
                  <td>${item.lineTotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <LineItemForm
          key={quote.lineItems.length}
          action={addLineItemForQuote}
          inventoryItems={inventoryOptions}
        />
      </div>
    </main>
  );
}
