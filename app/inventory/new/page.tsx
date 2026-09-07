import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createInventoryItem } from "../actions";

export default async function NewInventoryItemPage() {
  const depots = await prisma.depot.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] });

  return (
    <main>
      <div className="page-header">
        <h1>New Inventory Item</h1>
        <Link href="/inventory">Cancel</Link>
      </div>

      <form action={createInventoryItem} className="card stack">
        <div className="field">
          <label htmlFor="name">Name *</label>
          <input id="name" name="name" required />
        </div>
        <div className="field">
          <label htmlFor="sku">SKU</label>
          <input id="sku" name="sku" />
        </div>
        <div className="field">
          <label htmlFor="unitCost">Unit cost</label>
          <input id="unitCost" name="unitCost" type="number" step="0.01" min="0" />
        </div>
        <div className="field">
          <label htmlFor="unitPrice">Unit price</label>
          <input id="unitPrice" name="unitPrice" type="number" step="0.01" min="0" />
        </div>
        <div className="field">
          <label htmlFor="quantityOnHand">Quantity on hand</label>
          <input id="quantityOnHand" name="quantityOnHand" type="number" step="1" min="0" />
        </div>
        <div className="field">
          <label htmlFor="depotId">Location</label>
          <select id="depotId" name="depotId" defaultValue="">
            <option value="">Unassigned</option>
            {depots.map((depot) => (
              <option key={depot.id} value={depot.id}>
                {depot.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <button type="submit" className="btn">
            Create Item
          </button>
        </div>
      </form>
    </main>
  );
}
