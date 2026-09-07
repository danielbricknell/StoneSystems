import { submitServiceRequest } from "./actions";

export default function RequestServicePage({
  searchParams,
}: {
  searchParams: { submitted?: string; error?: string };
}) {
  if (searchParams.submitted) {
    return (
      <main>
        <div className="page-header">
          <h1>Request Received</h1>
        </div>
        <div className="card">
          <p>Thanks — we&apos;ve received your request and someone will follow up with you shortly.</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="page-header">
        <h1>Request Service</h1>
      </div>

      <form action={submitServiceRequest} className="card stack">
        {searchParams.error && (
          <p className="empty error-text">
            Please enter your name and describe what you need help with.
          </p>
        )}
        <div className="field">
          <label htmlFor="customerName">Name *</label>
          <input id="customerName" name="customerName" required />
        </div>
        <div className="field">
          <label htmlFor="customerEmail">Email</label>
          <input id="customerEmail" name="customerEmail" type="email" />
        </div>
        <div className="field">
          <label htmlFor="customerPhone">Phone</label>
          <input id="customerPhone" name="customerPhone" />
        </div>
        <div className="field">
          <label htmlFor="propertyAddress">Property address</label>
          <input id="propertyAddress" name="propertyAddress" />
        </div>
        <div className="field">
          <label htmlFor="description">What do you need help with? *</label>
          <textarea id="description" name="description" rows={4} required />
        </div>
        <div>
          <button type="submit" className="btn">
            Submit Request
          </button>
        </div>
      </form>
    </main>
  );
}
