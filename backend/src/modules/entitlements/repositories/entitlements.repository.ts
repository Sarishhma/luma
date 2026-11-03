    // An entitlement is simply a permission granted to a workspace based on its subscription plan.

    import { prisma } from "../../../lib/prisma.js";

    export const getTenantFeatures=async(tenantId:string)=>{
        return await prisma.tenant.findUnique({
            where:{
                id:tenantId
            },
            select:{
               plan:{
                    select:{
                        features:{
                            select:{
                                feature:{
                                    select:{
                                        id:true,
                                        name:true
                                    }
                                }
                            }
                        }
                    }
               }
            }
        })
    }