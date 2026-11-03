import type { FastifyPluginAsync } from "fastify";
import { authGuard } from "../../../middleware/authGuard.js";
import { createTenantScope } from "../../../middleware/tenantScope.js";
import { checkEntitlementController } from "../controllers/entitlement.controller.js";

export const entitlementsRoutes: FastifyPluginAsync = async (fastify) => {

    const tenantScope = createTenantScope(fastify.prisma);

    fastify.get<{ Params: { featureId: string } }>(
        "/:featureId",
        {
            preHandler: [
                authGuard,
                tenantScope
            ]
        },
        checkEntitlementController  
    );

};