"use client";

import { useMemo, useState } from "react";
import { createQuote } from "../actions";

type Property = { id: string; label: string | null; address: string | null };
type Customer = { id: string; name: string; properties: Property[] };

export function QuoteForm({ customers }: { customers: Customer[] }) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId],
  );

  return (
    <form action={createQuote} className="card stack">
      <div className="field">
        <label htmlFor="customerId">Customer *</label>
        <select
          id="customerId"
          name="customerId"
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
          required
        >
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="propertyId">Property</label>
        <select id="propertyId" name="propertyId" defaultValue="" key={customerId}>
          <option value="">Not tied to a property yet</option>
          {selectedCustomer?.properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.label ?? property.address ?? "Unlabeled property"}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={3} placeholder="Scope, terms, etc." />
      </div>

      <div className="field">
        <label htmlFor="expiresAt">Expires</label>
        <input id="expiresAt" name="expiresAt" type="date" />
      </div>

      <div>
        <button type="submit" className="btn">
          Create Quote
        </button>
      </div>
    </form>
  );
}
