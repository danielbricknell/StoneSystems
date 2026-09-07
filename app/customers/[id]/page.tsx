import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addContact, addProperty } from "../actions";

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      properties: { orderBy: { createdAt: "asc" } },
      contacts: {
        orderBy: { createdAt: "asc" },
        include: { contactProperties: { include: { property: true } } },
      },
    },
  });

  if (!customer) notFound();

  const addPropertyForCustomer = addProperty.bind(null, customer.id);
  const addContactForCustomer = addContact.bind(null, customer.id);

  return (
    <main>
      <div className="page-header">
        <h1>{customer.name}</h1>
        <Link href="/customers">← All customers</Link>
      </div>

      <div className="card">
        <p className="section-title">Details</p>
        <p className="meta">Phone: {customer.phone ?? "—"}</p>
        <p className="meta">Email: {customer.email ?? "—"}</p>
        <p className="meta">Billing address: {customer.billingAddress ?? "—"}</p>
        {customer.notes && <p className="meta">Notes: {customer.notes}</p>}
      </div>

      <div className="card">
        <p className="section-title">Properties</p>
        {customer.properties.length === 0 ? (
          <p className="empty">No properties yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>Address</th>
                <th>Property notes</th>
              </tr>
            </thead>
            <tbody>
              {customer.properties.map((property) => (
                <tr key={property.id}>
                  <td>{property.label ?? "—"}</td>
                  <td>{property.address ?? "—"}</td>
                  <td>{property.accessNotes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form
          key={customer.properties.length}
          action={addPropertyForCustomer}
          className="form-inline"
        >
          <div className="field">
            <label htmlFor="label">Label</label>
            <input id="label" name="label" placeholder="Main Office" />
          </div>
          <div className="field">
            <label htmlFor="address">Address</label>
            <input id="address" name="address" />
          </div>
          <div className="field">
            <label htmlFor="accessNotes">Property notes</label>
            <input id="accessNotes" name="accessNotes" placeholder="Gate code, parking, etc." />
          </div>
          <button type="submit" className="btn btn-secondary">
            + Add Property
          </button>
        </form>
      </div>

      <div className="card">
        <p className="section-title">Contacts</p>
        {customer.contacts.length === 0 ? (
          <p className="empty">No contacts yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Scope</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customer.contacts.map((contact) => (
                <tr key={contact.id}>
                  <td>{contact.name}</td>
                  <td>{contact.role ?? "—"}</td>
                  <td>{contact.phone ?? "—"}</td>
                  <td>{contact.email ?? "—"}</td>
                  <td>
                    {contact.contactProperties.length === 0 ? (
                      <span className="badge">All properties</span>
                    ) : (
                      contact.contactProperties
                        .map((cp) => cp.property.label ?? cp.property.address ?? "Unlabeled")
                        .join(", ")
                    )}
                  </td>
                  <td>{contact.isPrimary && <span className="badge">Billing</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form
          key={customer.contacts.length}
          action={addContactForCustomer}
          className="stack divider-top"
        >
          <div className="form-inline">
            <div className="field">
              <label htmlFor="contactName">Name</label>
              <input id="contactName" name="name" required />
            </div>
            <div className="field">
              <label htmlFor="role">Role</label>
              <input id="role" name="role" placeholder="Property Manager" />
            </div>
            <div className="field">
              <label htmlFor="contactPhone">Phone</label>
              <input id="contactPhone" name="phone" />
            </div>
            <div className="field">
              <label htmlFor="contactEmail">Email</label>
              <input id="contactEmail" name="email" type="email" />
            </div>
            <div className="field field-inline">
              <input id="isPrimary" name="isPrimary" type="checkbox" />
              <label htmlFor="isPrimary">Billing</label>
            </div>
          </div>

          {customer.properties.length > 0 && (
            <div className="field">
              <label>Scope to properties (leave unchecked for account-wide)</label>
              <div className="checkbox-list">
                {customer.properties.map((property) => (
                  <label key={property.id} className="field-inline">
                    <input type="checkbox" name="propertyIds" value={property.id} />
                    {property.label ?? property.address ?? "Unlabeled property"}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <button type="submit" className="btn btn-secondary">
              + Add Contact
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
