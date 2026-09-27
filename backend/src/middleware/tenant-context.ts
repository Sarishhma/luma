import type { FastifyReply, FastifyRequest } from "fastify";
import { tenantStorage } from "../lib/prisma.context.js";
// Change the type from PrismaClient to `any` to accept both base and extended clients safely
export function createTenantContextHook(prisma: any) {
  return async function resolveTenantContext(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.status(401).send({ message: "Unauthenticated" });
    }

    const userId = request.user.sub;
    const headerTenantId = request.headers["x-tenant-id"] as string | undefined;
    const paramsTenantId = (request.params as { tenantId?: string })?.tenantId;
    const userActiveTenantId = request.user.activeTenantId;

    const targetTenantId = headerTenantId || paramsTenantId || userActiveTenantId;

    if (!targetTenantId) {
      return reply.status(400).send({
        message: "Tenant context missing. Provide X-Tenant-ID header or switch to an active workspace.",
      });
    }

    // Verify membership using the passed prisma client
    const membership = await prisma.tenantMember.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId: targetTenantId,
        },
      },
      select: {
        tenantId: true,
        role: true,
      },
    });

    if (!membership) {
      return reply.status(403).send({
        message: "Access denied: You are not a member of this workspace.",
      });
    }

    request.tenantContext = {
      tenantId: membership.tenantId,
      role: membership.role,
    };

    // Bridge to AsyncLocalStorage for subsequent queries
    return new Promise<void>((resolve) => {
      // Assuming tenantStorage is imported from your context file
      tenantStorage.run({ tenantId: membership.tenantId }, () => {
        resolve();
      });
    });
  };
}