import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function InventoryPage() {
  const items = await prisma.inventoryItem.findMany({
    orderBy: { name: "asc" },
    include: { depot: true },
  });

  return (
    <main>
      <div className="page-header">
        <h1>Inventory</h1>
        <Link href="/inventory/new" className="btn">
          + New Item
        </Link>
      </div>

      <p className="meta">
        Quantity on hand is normally the source of truth from QBO once that sync exists —
        for now it's entered manually.
      </p>

      {items.length === 0 ? (
        <p className="empty">No inventory items yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Unit Cost</th>
              <th>Unit Price</th>
              <th>Qty on Hand</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.sku ?? "—"}</td>
                <td>{item.unitCost ? `$${item.unitCost.toFixed(2)}` : "—"}</td>
                <td>{item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : "—"}</td>
                <td>{item.quantityOnHand?.toString() ?? "—"}</td>
                <td>{item.depot?.name ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
