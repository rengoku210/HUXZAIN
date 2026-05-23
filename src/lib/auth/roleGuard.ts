// src/lib/auth/roleGuard.ts
// Centralized guard utilities for role‑based route protection.
// The `owner` role is a super‑admin that bypasses all checks.

import { hasRole } from "./roles";
import type { Role } from "./roles";

/**
 * Returns true if the user has the `owner` role, allowing unrestricted access.
 * Can be used in any auth‑guard logic (client‑side or server‑side).
 */
export function bypassOwner(userRoles: Role[]): boolean {
  return hasRole(userRoles, "owner");
}

/**
 * Generic guard helper – returns true if the user has any of the required roles
 * OR is an owner (which always passes).
 */
export function hasAccess(userRoles: Role[], requiredRoles: Role[]): boolean {
  if (bypassOwner(userRoles)) return true;
  return requiredRoles.some((r) => userRoles.includes(r));
}
