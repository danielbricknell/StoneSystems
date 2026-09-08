import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { isFieldTechRole } from "@/lib/roles";
import { formatEnum } from "@/lib/format";

const RESULT_LIMIT = 10;
const SYSTEM_USER_EMAIL = "system@internal.local";
const insensitive = { mode: "insensitive" as const };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const session = await requireSession();
  const query = (searchParams.q ?? "").trim();
  const canSearch = query.length >= 2;

  const isFieldTech = isFieldTechRole(session.roleName);
  const canSearchGeneral = canSearch && !isFieldTech;
  const canSearchUsers = canSearchGeneral && (await hasPermission(session.userId, "manage_users"));

  const [jobs, customers, properties, contacts, quotes, serviceRequests, inventoryItems, depots, users] =
    await Promise.all([
      canSearch
        ? prisma.job.findMany({
            where: {
              OR: [
                { title: { contains: query, ...insensitive } },
                { description: { contains: query, ...insensitive } },
              ],
            },
            include: { customer: true },
            take: RESULT_LIMIT,
            orderBy: { createdAt: "desc" },
          })
        : [],
      canSearchGeneral
        ? prisma.customer.findMany({
            where: {
              OR: [
                { name: { contains: query, ...insensitive } },
                { email: { contains: query, ...insensitive } },
                { phone: { contains: query, ...insensitive } },
                { billingAddress: { contains: query, ...insensitive } },
                { notes: { contains: query, ...insensitive } },
              ],
            },
            take: RESULT_LIMIT,
            orderBy: { name: "asc" },
          })
        : [],
      canSearchGeneral
        ? prisma.property.findMany({
            where: {
              OR: [
                { label: { contains: query, ...insensitive } },
                { address: { contains: query, ...insensitive } },
                { accessNotes: { contains: query, ...insensitive } },
              ],
            },
            include: { customer: true },
            take: RESULT_LIMIT,
            orderBy: { createdAt: "desc" },
          })
        : [],
      canSearchGeneral
        ? prisma.contact.findMany({
            where: {
              OR: [
                { name: { contains: query, ...insensitive } },
                { email: { contains: query, ...insensitive } },
                { phone: { contains: query, ...insensitive } },
                { role: { contains: query, ...insensitive } },
              ],
            },
            include: { customer: true },
            take: RESULT_LIMIT,
            orderBy: { createdAt: "desc" },
          })
        : [],
      canSearchGeneral
        ? prisma.quote.findMany({
            where: {
              OR: [
                { notes: { contains: query, ...insensitive } },
                { customer: { name: { contains: query, ...insensitive } } },
              ],
            },
            include: { customer: true },
            take: RESULT_LIMIT,
            orderBy: { createdAt: "desc" },
          })
        : [],
      canSearchGeneral
        ? prisma.serviceRequest.findMany({
            where: {
              OR: [
                { customerName: { contains: query, ...insensitive } },
                { customerEmail: { contains: query, ...insensitive } },
                { customerPhone: { contains: query, ...insensitive } },
                { propertyAddress: { contains: query, ...insensitive } },
                { description: { contains: query, ...insensitive } },
              ],
            },
            take: RESULT_LIMIT,
            orderBy: { receivedAt: "desc" },
          })
        : [],
      canSearchGeneral
        ? prisma.inventoryItem.findMany({
            where: {
              OR: [
                { name: { contains: query, ...insensitive } },
                { sku: { contains: query, ...insensitive } },
              ],
            },
            take: RESULT_LIMIT,
            orderBy: { name: "asc" },
          })
        : [],
      canSearchGeneral
        ? prisma.depot.findMany({
            where: {
              OR: [
                { name: { contains: query, ...insensitive } },
                { address: { contains: query, ...insensitive } },
              ],
            },
            take: RESULT_LIMIT,
            orderBy: { name: "asc" },
          })
        : [],
      canSearchUsers
        ? prisma.user.findMany({
            where: {
              email: { not: SYSTEM_USER_EMAIL },
              OR: [
                { fullName: { contains: query, ...insensitive } },
                { email: { contains: query, ...insensitive } },
              ],
            },
            take: RESULT_LIMIT,
            orderBy: { fullName: "asc" },
          })
        : [],
    ]);

  const totalResults =
    jobs.length +
    customers.length +
    properties.length +
    contacts.length +
    quotes.length +
    serviceRequests.length +
    inventoryItems.length +
    depots.length +
    users.length;

  return (
    <main>
      <div className="page-header">
        <h1>Search</h1>
      </div>

      <form action="/search" method="get" className="card form-inline">
        <div className="field">
          <label htmlFor="q">Search everything</label>
          <input
            id="q"
            name="q"
            defaultValue={query}
            autoFocus
            placeholder="Name, email, phone, address…"
          />
        </div>
        <button type="submit" className="btn">
          Search
        </button>
      </form>

      {!query && <p className="empty">Type something above to search across the whole system.</p>}
      {query && !canSearch && <p className="empty">Keep typing — at least 2 characters.</p>}
      {canSearch && totalResults === 0 && (
        <p className="empty">No results for &quot;{query}&quot;.</p>
      )}

      {jobs.length > 0 && (
        <div className="card">
          <p className="section-title">Jobs</p>
          <div className="stack">
            {jobs.map((job) => (
              <div key={job.id}>
                <Link href={`/jobs/${job.id}`}>{job.title}</Link>
                <p className="meta">{job.customer.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {customers.length > 0 && (
        <div className="card">
          <p className="section-title">Customers</p>
          <div className="stack">
            {customers.map((customer) => (
              <div key={customer.id}>
                <Link href={`/customers/${customer.id}`}>{customer.name}</Link>
                <p className="meta">{customer.email ?? customer.phone ?? "—"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {properties.length > 0 && (
        <div className="card">
          <p className="section-title">Properties</p>
          <div className="stack">
            {properties.map((property) => (
              <div key={property.id}>
                <Link href={`/customers/${property.customerId}`}>
                  {property.label ?? property.address ?? "Unlabeled property"}
                </Link>
                <p className="meta">{property.customer.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {contacts.length > 0 && (
        <div className="card">
          <p className="section-title">Contacts</p>
          <div className="stack">
            {contacts.map((contact) => (
              <div key={contact.id}>
                <Link href={`/customers/${contact.customerId}`}>{contact.name}</Link>
                <p className="meta">
                  {contact.customer.name}
                  {contact.role ? ` — ${contact.role}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {quotes.length > 0 && (
        <div className="card">
          <p className="section-title">Quotes</p>
          <div className="stack">
            {quotes.map((quote) => (
              <div key={quote.id}>
                <Link href={`/quotes/${quote.id}`}>Quote for {quote.customer.name}</Link>
                <p className="meta">{formatEnum(quote.status)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {serviceRequests.length > 0 && (
        <div className="card">
          <p className="section-title">Service Requests</p>
          <div className="stack">
            {serviceRequests.map((request) => (
              <div key={request.id}>
                <Link href={`/service-requests/${request.id}`}>
                  {request.customerName ?? "Unnamed request"}
                </Link>
                <p className="meta">{request.propertyAddress ?? request.description ?? "—"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {inventoryItems.length > 0 && (
        <div className="card">
          <p className="section-title">Inventory</p>
          <div className="stack">
            {inventoryItems.map((item) => (
              <div key={item.id}>
                <Link href="/inventory">{item.name}</Link>
                <p className="meta">{item.sku ?? "—"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {depots.length > 0 && (
        <div className="card">
          <p className="section-title">Depots</p>
          <div className="stack">
            {depots.map((depot) => (
              <div key={depot.id}>
                <Link href="/depots">{depot.name}</Link>
                <p className="meta">{formatEnum(depot.type)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {users.length > 0 && (
        <div className="card">
          <p className="section-title">Team</p>
          <div className="stack">
            {users.map((user) => (
              <div key={user.id}>
                <Link href="/users">{user.fullName}</Link>
                <p className="meta">{user.email}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
