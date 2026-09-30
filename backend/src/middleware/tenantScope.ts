import type { preHandlerHookHandler } from "fastify";
import type { PrismaClient } from "../generated/prisma/client.js";
import { tenantContext } from "../lib/tenant-context.js";
import { badRequest, forbidden, unauthorized } from "../common/error.js";

/**
 * Put AFTER authGuard on every route that touches tenant data:
 *   preHandler: [authGuard, tenantScope]
 *
 * It:
 *  1. reads the active workspace from the verified JWT,
 *  2. re-checks membership in the DATABASE (so removed users lose access
 *     immediately, instead of when their 15-minute token expires),
 *  3. opens the tenant context for the rest of the request (db reads it).
 *
 * The role comes from the DB, never from the JWT claim.
 */
export function createTenantScope(prisma: PrismaClient): preHandlerHookHandler {
  return function tenantScope(request, _reply, done) {
    const user = request.user;
    if (!user) return done(unauthorized());

    const tenantId = user.activeTenantId;
    if (!tenantId) {
      return done(badRequest("No active workspace. Create or switch to one first.", "NO_ACTIVE_WORKSPACE"));
    }

    prisma.tenantMember
      .findUnique({
        where: { userId_tenantId: { userId: user.sub, tenantId } },
        select: { role: true },
      })
      .then(
        (membership) => {
          if (!membership) {
            return done(forbidden("You are no longer a member of this workspace.", "NOT_A_MEMBER"));
          }
          // Everything that runs after `done` (next hooks, the handler) sees this context.
          tenantContext.run({ tenantId, userId: user.sub, role: membership.role }, done);
        },
        done,
      );
  };
}
