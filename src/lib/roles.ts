/**
 * HUXZAIN role + permission model.
 * Roles live in a dedicated `user_roles` table (never on profiles)
 * to prevent privilege escalation. See docs/SCHEMA.sql.
 */

export const ROLES = [
  "buyer",
  "seller",
  "moderator",
  "staff",
  "admin",
  "super_admin",
  "owner",
] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  // Marketplace
  "listing:create",
  "listing:update_own",
  "listing:update_any",
  "listing:approve",
  "listing:delete_any",
  // Orders
  "order:view_own",
  "order:view_any",
  "order:refund",
  // Wallet / payouts
  "wallet:withdraw",
  "payout:approve",
  // Moderation
  "dispute:resolve",
  "report:view",
  "user:suspend",
  // Admin
  "user:manage",
  "role:assign",
  "platform:configure",
  "analytics:platform",
  // Payment verification
  "payment:verify",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const rolePerms: Record<Role, Permission[]> = {
  buyer: ["order:view_own"],
  seller: ["listing:create", "listing:update_own", "order:view_own", "wallet:withdraw"],
  moderator: ["listing:approve", "dispute:resolve", "report:view", "order:view_any"],
  staff: ["report:view", "order:view_any", "dispute:resolve", "payment:verify"],
  admin: [
    "listing:approve",
    "listing:update_any",
    "listing:delete_any",
    "order:view_any",
    "order:refund",
    "payout:approve",
    "dispute:resolve",
    "report:view",
    "user:suspend",
    "user:manage",
    "analytics:platform",
  ],
  super_admin: [],
  owner: [...PERMISSIONS],
};

// super_admin gets every permission
rolePerms.super_admin = [...PERMISSIONS];

export function permissionsFor(roles: Role[]): Set<Permission> {
  const out = new Set<Permission>();
  for (const r of roles) for (const p of rolePerms[r] ?? []) out.add(p);
  return out;
}

export function hasRole(userRoles: Role[], role: Role): boolean {
  return userRoles.includes(role);
}

export function hasAnyRole(userRoles: Role[], roles: Role[]): boolean {
  return roles.some((r) => userRoles.includes(r));
}

export function hasPermission(userRoles: Role[], p: Permission): boolean {
  return permissionsFor(userRoles).has(p);
}

export const ROLE_LABELS: Record<Role, string> = {
  buyer: "Buyer",
  seller: "Seller",
  moderator: "Moderator",
  staff: "Staff",
  admin: "Admin",
  super_admin: "Super Admin",
  owner: "Owner",
};
