import type { TenantRole } from "../generated/prisma/enums.js";

/**
 * ALL role rules live here. Services and middleware call these helpers
 * instead of writing `['OWNER','ADMIN'].includes(...)` in ten places.
 */
export const ROLE_RANK: Record<TenantRole, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

/** Is `role` at least as powerful as `min`? (used to guard routes) */
export const hasAtLeast = (role: TenantRole, min: TenantRole): boolean => ROLE_RANK[role] >= ROLE_RANK[min];

/**
 * May `actor` invite / change / remove someone who has (or will get) `target` role?
 *  - Must be ADMIN or OWNER
 *  - OWNER can manage anyone
 *  - ADMIN can only manage roles strictly below ADMIN (so no promoting to OWNER/ADMIN,
 *    no removing other admins or owners)
 */
export const canManageRole = (actor: TenantRole, target: TenantRole): boolean => {
  if (!hasAtLeast(actor, "ADMIN")) return false;
  return actor === "OWNER" || ROLE_RANK[actor] > ROLE_RANK[target];
};
