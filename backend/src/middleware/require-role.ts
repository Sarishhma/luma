

import type { FastifyReply, FastifyRequest } from "fastify";
import { forbidden } from "../common/error.js";
import { hasAtLeast } from "../common/permission.js";
import type { TenantRole } from "../generated/prisma/enums.js";
import { tenantContext } from "../lib/tenant-context.js";

/**
 * Guard a route by workspace role using async/await. 
 * Must come AFTER tenantScope:
 *   preHandler: [authGuard, tenantScope, requireRole("ADMIN")]
 */
export function requireRole(minRole: TenantRole) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const ctx = tenantContext.getStore();
    
    if (!ctx) {
      throw new Error("requireRole used without tenantScope before it");
    }

    if (!hasAtLeast(ctx.role, minRole)) {
      throw forbidden(`This action requires the ${minRole} role or higher.`);
    }
  };
}