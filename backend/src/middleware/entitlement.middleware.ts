import type { FastifyRequest,FastifyReply, preHandlerHookHandler } from "fastify";
import { checkFeatureAccess } from "../modules/entitlements/services/entitlements.service.js";
import { requireTenantContext } from "../lib/tenant-context.js";

export const requireFeature=(featureId:string)=>{
     const handler: preHandlerHookHandler = async (_request, reply)=>{
        const {tenantId} = requireTenantContext()
        const hasAccess= await  checkFeatureAccess(tenantId,featureId);
        if(!hasAccess){
            return reply.status(403).send({
                message:"Your current plan does not include this feature"
            })
        }
    }
    return handler
}