import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: { properties: true },
  });

  return (
    <main>
      <div className="page-header">
        <h1>Customers</h1>
        <Link href="/customers/new" className="btn">
          + New Customer
        </Link>
      </div>

      {customers.length === 0 ? (
        <p className="empty">No customers yet. Add your first one to get started.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Properties</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td>
                  <Link href={`/customers/${customer.id}`}>{customer.name}</Link>
                </td>
                <td>{customer.phone ?? "—"}</td>
                <td>{customer.email ?? "—"}</td>
                <td>{customer.properties.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
