import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DepotForm } from "./DepotForm";

const SYSTEM_USER_EMAIL = "system@internal.local";

export default async function NewDepotPage() {
  const technicians = await prisma.user.findMany({
    where: { active: true, email: { not: SYSTEM_USER_EMAIL } },
    orderBy: { fullName: "asc" },
  });

  return (
    <main>
      <div className="page-header">
        <h1>New Depot</h1>
        <Link href="/depots">Cancel</Link>
      </div>

      <DepotForm technicians={technicians.map((tech) => ({ id: tech.id, fullName: tech.fullName }))} />
    </main>
  );
}
