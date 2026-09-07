import Link from "next/link";
import { createCustomer } from "../actions";
import { AddressField } from "../AddressField";

export default function NewCustomerPage() {
  return (
    <main>
      <div className="page-header">
        <h1>New Customer</h1>
        <Link href="/customers">Cancel</Link>
      </div>

      <form action={createCustomer} className="card stack">
        <div className="field">
          <label htmlFor="name">Name *</label>
          <input id="name" name="name" required />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" />
        </div>
        <AddressField id="billingAddress" name="billingAddress" label="Billing address" />
        <div className="field">
          <label htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" rows={3} />
        </div>
        <div>
          <button type="submit" className="btn">
            Create Customer
          </button>
        </div>
      </form>
    </main>
  );
}
