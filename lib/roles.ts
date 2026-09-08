// Centralizes the two role names that get checked outside the data-driven
// roles.permissions system (route gating in middleware, nav visibility) —
// kept dependency-free so middleware.ts's Edge runtime can import it.
export const FIELD_TECH_ROLE = "Field Tech";
export const ADMIN_ROLE = "Admin";

export function isFieldTechRole(roleName: string): boolean {
  return roleName === FIELD_TECH_ROLE;
}

export function isAdminRole(roleName: string): boolean {
  return roleName === ADMIN_ROLE;
}
