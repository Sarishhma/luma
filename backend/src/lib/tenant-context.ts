import { AsyncLocalStorage } from "node:async_hooks";
import type { TenantRole } from "../generated/prisma/enums.js";

/**
 * "Who is asking, and inside which workspace?" for the CURRENT request.
 *
 * AsyncLocalStorage is like a global variable that is private to one request:
 * two requests running at the same time each see their own value, even across
 * `await`s. The tenantScope middleware fills it; `db` reads it.
 */
export interface TenantContext {
  tenantId: string;
  userId: string;
  role: TenantRole;
}

export const tenantContext = new AsyncLocalStorage<TenantContext>();

/** For services that need the current tenant explicitly (e.g. to set tenantId on create). */
export function requireTenantContext(): TenantContext {
  const ctx = tenantContext.getStore();
  if (!ctx) {
    // Programming error (route forgot the tenantScope hook), so a plain Error -> 500, not a 4xx.
    throw new Error("Tenant context missing. Did you forget the tenantScope preHandler on this route?");
  }
  return ctx;
}
