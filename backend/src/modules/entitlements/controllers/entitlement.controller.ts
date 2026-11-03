import type { FastifyRequest, FastifyReply } from "fastify";
import { requireTenantContext } from "../../../lib/tenant-context.js";
import { checkFeatureAccess } from "../services/entitlements.service.js";

interface featureParams{
    featureId:string
}

export const checkEntitlementController=async(
            request:FastifyRequest<{Params:featureParams}>,
            reply:FastifyReply
)=>{
    try{
        const {tenantId}=requireTenantContext();
        const {featureId}=request.params;

        const hasAccess = await checkFeatureAccess(tenantId,featureId)

        return reply.status(200).send({
            tenantId,
            featureId,
            hasAccess
        })
    }catch(error){
        request.log.error(error);
        return reply.status(500).send({
            message:"Failed to check entitlement"
        })
    }
}