"use client";

import { useState } from "react";

type InventoryItem = { id: string; name: string; unitPrice: number | null };

export function LineItemForm({
  action,
  inventoryItems,
}: {
  action: (formData: FormData) => void;
  inventoryItems: InventoryItem[];
}) {
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [description, setDescription] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  function handleInventorySelect(id: string) {
    setInventoryItemId(id);
    const item = inventoryItems.find((i) => i.id === id);
    if (item) {
      setDescription(item.name);
      setUnitPrice(item.unitPrice !== null ? String(item.unitPrice) : "");
    }
  }

  return (
    <form action={action} className="form-inline">
      {inventoryItems.length > 0 && (
        <div className="field">
          <label htmlFor="inventoryItemId">From catalog</label>
          <select
            id="inventoryItemId"
            name="inventoryItemId"
            value={inventoryItemId}
            onChange={(event) => handleInventorySelect(event.target.value)}
          >
            <option value="">Custom line item</option>
            {inventoryItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="field">
        <label htmlFor="description">Description</label>
        <input
          id="description"
          name="description"
          required
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="quantity">Qty</label>
        <input id="quantity" name="quantity" type="number" step="0.01" defaultValue="1" required />
      </div>
      <div className="field">
        <label htmlFor="unitPrice">Unit price</label>
        <input
          id="unitPrice"
          name="unitPrice"
          type="number"
          step="0.01"
          required
          value={unitPrice}
          onChange={(event) => setUnitPrice(event.target.value)}
        />
      </div>
      <button type="submit" className="btn btn-secondary">
        + Add Line Item
      </button>
    </form>
  );
}
