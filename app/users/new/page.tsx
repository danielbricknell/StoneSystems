import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createUser } from "../actions";

export default async function NewUserPage() {
  const [roles, depots] = await Promise.all([
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    prisma.depot.findMany({ where: { type: "office" }, orderBy: { name: "asc" } }),
  ]);

  return (
    <main>
      <div className="page-header">
        <h1>New Team Member</h1>
        <Link href="/users">Cancel</Link>
      </div>

      <form action={createUser} className="card stack">
        <div className="field">
          <label htmlFor="fullName">Name *</label>
          <input id="fullName" name="fullName" required />
        </div>
        <div className="field">
          <label htmlFor="email">Email *</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" />
        </div>
        <div className="field">
          <label htmlFor="password">Password *</label>
          <input id="password" name="password" type="password" required minLength={8} />
        </div>
        <div className="field">
          <label htmlFor="roleId">Role *</label>
          <select id="roleId" name="roleId" required>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="depotId">Home Depot *</label>
          <select id="depotId" name="depotId" required>
            {depots.map((depot) => (
              <option key={depot.id} value={depot.id}>
                {depot.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <button type="submit" className="btn">
            Create Team Member
          </button>
        </div>
      </form>
    </main>
  );
}
