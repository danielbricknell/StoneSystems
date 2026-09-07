"use client";

import { useMemo, useState } from "react";
import { convertServiceRequest } from "../actions";

type Property = { id: string; label: string | null; address: string | null };
type Customer = { id: string; name: string; properties: Property[] };

export function ConvertServiceRequestForm({
  requestId,
  customers,
  defaultCustomerName,
  defaultPropertyAddress,
  defaultTitle,
}: {
  requestId: string;
  customers: Customer[];
  defaultCustomerName: string;
  defaultPropertyAddress: string;
  defaultTitle: string;
}) {
  const [customerId, setCustomerId] = useState("");

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId],
  );

  const action = convertServiceRequest.bind(null, requestId);

  return (
    <form action={action} className="card stack">
      <div className="field">
        <label htmlFor="customerId">Customer</label>
        <select
          id="customerId"
          name="customerId"
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
        >
          <option value="">+ Create new customer ({defaultCustomerName})</option>
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
          <option value="">
            + Create new property ({defaultPropertyAddress || "no address given"})
          </option>
          {selectedCustomer?.properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.label ?? property.address ?? "Unlabeled property"}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="title">Job title *</label>
        <input id="title" name="title" required defaultValue={defaultTitle} />
      </div>

      <div className="field">
        <label htmlFor="type">Type *</label>
        <select id="type" name="type" required defaultValue="service_call">
          <option value="service_call">Service call</option>
          <option value="small_job">Small job</option>
          <option value="large_project">Large project</option>
        </select>
      </div>

      <div>
        <button type="submit" className="btn">
          Convert to Job
        </button>
      </div>
    </form>
  );
}
