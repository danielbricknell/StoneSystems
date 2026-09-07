"use client";

import { useMemo, useState } from "react";
import { createJob } from "../actions";

type Property = { id: string; label: string | null; address: string | null };
type Customer = { id: string; name: string; properties: Property[] };

export function JobForm({ customers }: { customers: Customer[] }) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId],
  );
  const hasProperties = (selectedCustomer?.properties.length ?? 0) > 0;

  return (
    <form action={createJob} className="card stack">
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
        <label htmlFor="propertyId">Property *</label>
        {hasProperties ? (
          <select id="propertyId" name="propertyId" required key={customerId}>
            {selectedCustomer!.properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.label ?? property.address ?? "Unlabeled property"}
              </option>
            ))}
          </select>
        ) : (
          <p className="empty">This customer has no properties yet.</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="title">Title *</label>
        <input id="title" name="title" required />
      </div>

      <div className="field">
        <label htmlFor="type">Type *</label>
        <select id="type" name="type" required defaultValue="service_call">
          <option value="service_call">Service call</option>
          <option value="small_job">Small job</option>
          <option value="large_project">Large project</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="priority">Priority</label>
        <select id="priority" name="priority" defaultValue="">
          <option value="">—</option>
          <option value="normal">Normal</option>
          <option value="urgent">Urgent</option>
          <option value="emergency">Emergency</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={3} />
      </div>

      <div className="field">
        <label htmlFor="scheduledStart">Scheduled start</label>
        <input id="scheduledStart" name="scheduledStart" type="datetime-local" />
      </div>

      <div className="field">
        <label htmlFor="scheduledEnd">Scheduled end</label>
        <input id="scheduledEnd" name="scheduledEnd" type="datetime-local" />
      </div>

      <div>
        <button type="submit" className="btn" disabled={!hasProperties}>
          Create Job
        </button>
      </div>
    </form>
  );
}
