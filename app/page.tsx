import Link from "next/link";
import { getSession } from "@/lib/auth";
import { isFieldTechRole } from "@/lib/roles";

export default async function HomePage() {
  const session = await getSession();
  const isFieldTech = !!session && isFieldTechRole(session.roleName);

  return (
    <main>
      <div className="page-header">
        <h1>Field Service App</h1>
      </div>
      <p className="meta">
        Scaffold is up. Schema lives in <code>prisma/schema.prisma</code>.
      </p>
      <div className="card">
        <p className="section-title">Get started</p>
        <p>
          {isFieldTech ? (
            <Link href="/jobs">View your jobs →</Link>
          ) : (
            <Link href="/customers">Manage customers →</Link>
          )}
        </p>
      </div>
    </main>
  );
}
