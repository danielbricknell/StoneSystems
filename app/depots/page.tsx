import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEnum } from "@/lib/format";

export default async function DepotsPage() {
  const depots = await prisma.depot.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: { assignedUser: true, _count: { select: { inventoryItems: true } } },
  });

  return (
    <main>
      <div className="page-header">
        <h1>Depots</h1>
        <Link href="/depots/new" className="btn">
          + New Depot
        </Link>
      </div>

      <p className="meta">
        Anywhere staff or stock are based — a fixed office/warehouse, or a technician&apos;s
        van.
      </p>

      {depots.length === 0 ? (
        <p className="empty">No depots yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Address</th>
              <th>Assigned To</th>
              <th>Items Stocked</th>
            </tr>
          </thead>
          <tbody>
            {depots.map((depot) => (
              <tr key={depot.id}>
                <td>{depot.name}</td>
                <td>
                  <span className="badge">{formatEnum(depot.type)}</span>
                </td>
                <td>{depot.address ?? "—"}</td>
                <td>{depot.assignedUser?.fullName ?? "—"}</td>
                <td>{depot._count.inventoryItems}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
