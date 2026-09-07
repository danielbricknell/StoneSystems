import { prisma } from "./prisma";
import { requireSession, type SessionPayload } from "./auth";

// Keys match the jsonb shape seeded onto roles.permissions in prisma/seed.ts.
export type PermissionKey =
  | "view_financials"
  | "edit_jobs"
  | "manage_users"
  | "approve_timesheets";

export async function hasPermission(userId: string, key: PermissionKey): Promise<boolean> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { role: true },
  });

  // Admin is a superuser regardless of what's stored in the role's jsonb —
  // avoids needing every new permission key kept in sync with that seed row.
  if (user.role.name === "Admin") return true;

  const permissions = user.role.permissions as Record<string, boolean> | null;
  return permissions?.[key] === true;
}

export async function requirePermission(key: PermissionKey): Promise<SessionPayload> {
  const session = await requireSession();
  const allowed = await hasPermission(session.userId, key);
  if (!allowed) {
    throw new Error("You don't have permission to do that.");
  }
  return session;
}
