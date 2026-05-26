// src/lib/auth/roleGuard.ts
import { hasRole, type Role } from "@/lib/roles";

export function bypassOwner(userRoles: Role[]): boolean {
  return hasRole(userRoles, "owner");
}

export function hasAccess(userRoles: Role[], requiredRoles: Role[]): boolean {
  if (bypassOwner(userRoles)) return true;
  return requiredRoles.some((r) => userRoles.includes(r));
}
