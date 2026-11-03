import { getTenantFeatures } from "../repositories/entitlements.repository.js";

export const checkFeatureAccess = async(
    tenantid:string,
    featureId:string
):Promise<boolean>=>{
    const tenant = await getTenantFeatures(tenantid)
    if(!tenant){
        return false
    }   
    const features=tenant.plan.features.map(
        (item)=>item.feature.id
    )
    return features.includes(featureId)
}