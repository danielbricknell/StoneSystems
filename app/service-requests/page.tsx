import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEnum, statusBadgeClass } from "@/lib/format";

export default async function ServiceRequestsPage() {
  const requests = await prisma.serviceRequest.findMany({
    orderBy: { receivedAt: "desc" },
  });

  return (
    <main>
      <div className="page-header">
        <h1>Service Requests</h1>
      </div>

      <p className="meta">
        Incoming requests from the public intake form land here first — a dispatcher reviews
        and converts each into a customer, property, and job.
      </p>

      {requests.length === 0 ? (
        <p className="empty">No incoming requests yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Received</th>
              <th>Source</th>
              <th>Name</th>
              <th>Property</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td>
                  <Link href={`/service-requests/${request.id}`}>
                    {request.receivedAt.toLocaleString()}
                  </Link>
                </td>
                <td>{formatEnum(request.source)}</td>
                <td>{request.customerName ?? "—"}</td>
                <td>{request.propertyAddress ?? "—"}</td>
                <td>
                  <span className={statusBadgeClass(request.status)}>{formatEnum(request.status)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
