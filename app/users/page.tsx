import Link from "next/link";
import { prisma } from "@/lib/prisma";

const SYSTEM_USER_EMAIL = "system@internal.local";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    where: { email: { not: SYSTEM_USER_EMAIL } },
    orderBy: { fullName: "asc" },
    include: { role: true, depot: true },
  });

  return (
    <main>
      <div className="page-header">
        <h1>Team</h1>
        <Link href="/users/new" className="btn">
          + New Team Member
        </Link>
      </div>

      {users.length === 0 ? (
        <p className="empty">No team members yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Depot</th>
              <th>Email</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.fullName}</td>
                <td>{user.role.name}</td>
                <td>{user.depot.name}</td>
                <td>{user.email}</td>
                <td>{user.active ? <span className="badge">Active</span> : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
