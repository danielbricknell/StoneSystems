"use client";

import { useState } from "react";
import { createDepot } from "../actions";

type Technician = { id: string; fullName: string };

export function DepotForm({ technicians }: { technicians: Technician[] }) {
  const [type, setType] = useState<"office" | "vehicle">("office");

  return (
    <form action={createDepot} className="card stack">
      <div className="field">
        <label htmlFor="name">Name *</label>
        <input
          id="name"
          name="name"
          required
          placeholder={type === "vehicle" ? "Truck 4" : "Downtown Office"}
        />
      </div>

      <div className="field">
        <label htmlFor="type">Type *</label>
        <select
          id="type"
          name="type"
          required
          value={type}
          onChange={(event) => setType(event.target.value as "office" | "vehicle")}
        >
          <option value="office">Office</option>
          <option value="vehicle">Vehicle</option>
        </select>
      </div>

      {type === "office" ? (
        <div className="field">
          <label htmlFor="address">Address</label>
          <input id="address" name="address" />
        </div>
      ) : (
        <div className="field">
          <label htmlFor="assignedUserId">Assigned technician</label>
          <select id="assignedUserId" name="assignedUserId" defaultValue="">
            <option value="">Unassigned</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.fullName}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <button type="submit" className="btn">
          Create Depot
        </button>
      </div>
    </form>
  );
}
