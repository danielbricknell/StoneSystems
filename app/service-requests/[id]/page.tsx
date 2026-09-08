import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatEnum, statusBadgeClass } from "@/lib/format";
import { markServiceRequestReviewed, markServiceRequestSpam } from "../actions";
import { ConvertServiceRequestForm } from "./ConvertServiceRequestForm";

export default async function ServiceRequestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [request, customers] = await Promise.all([
    prisma.serviceRequest.findUnique({
      where: { id: params.id },
      include: { matchedCustomer: true, convertedJob: true },
    }),
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      include: { properties: { orderBy: { createdAt: "asc" } } },
    }),
  ]);

  if (!request) notFound();

  const markReviewed = markServiceRequestReviewed.bind(null, request.id);
  const markSpam = markServiceRequestSpam.bind(null, request.id);
  const isOpen = request.status !== "converted" && request.status !== "spam";

  return (
    <main>
      <div className="page-header">
        <h1>Service Request</h1>
        <Link href="/service-requests">← All requests</Link>
      </div>

      <div className="card">
        <p className="section-title">Details</p>
        <p className="meta">Source: {formatEnum(request.source)}</p>
        <p className="meta">Received: {request.receivedAt.toLocaleString()}</p>
        <p className="meta">Name: {request.customerName ?? "—"}</p>
        <p className="meta">Email: {request.customerEmail ?? "—"}</p>
        <p className="meta">Phone: {request.customerPhone ?? "—"}</p>
        <p className="meta">Property address: {request.propertyAddress ?? "—"}</p>
        {request.description && <p className="meta">Description: {request.description}</p>}
        <p className="meta">
          Status: <span className={statusBadgeClass(request.status)}>{formatEnum(request.status)}</span>
        </p>
        {request.matchedCustomer && (
          <p className="meta">
            Matched customer:{" "}
            <Link href={`/customers/${request.matchedCustomer.id}`}>
              {request.matchedCustomer.name}
            </Link>
          </p>
        )}
        {request.convertedJob && (
          <p className="meta">
            Converted job:{" "}
            <Link href={`/jobs/${request.convertedJob.id}`}>{request.convertedJob.title}</Link>
          </p>
        )}
      </div>

      {isOpen && (
        <div className="card">
          <p className="section-title">Actions</p>
          <div className="form-inline">
            {request.status === "new" && (
              <form action={markReviewed}>
                <button type="submit" className="btn btn-secondary">
                  Mark Reviewed
                </button>
              </form>
            )}
            <form action={markSpam}>
              <button type="submit" className="btn-danger">
                Mark Spam
              </button>
            </form>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="card">
          <p className="section-title">Convert to Job</p>
          <ConvertServiceRequestForm
            requestId={request.id}
            customers={customers.map((customer) => ({
              id: customer.id,
              name: customer.name,
              properties: customer.properties.map((property) => ({
                id: property.id,
                label: property.label,
                address: property.address,
              })),
            }))}
            defaultCustomerName={request.customerName ?? "New customer"}
            defaultPropertyAddress={request.propertyAddress ?? ""}
            defaultTitle={(request.description ?? "Service call").slice(0, 80)}
          />
        </div>
      )}
    </main>
  );
}
