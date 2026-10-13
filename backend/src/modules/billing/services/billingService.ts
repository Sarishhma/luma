
import { badRequest, notFound } from "../../../common/error.js";
import type { PrismaClient } from "../../../generated/prisma/client.js";
import type { SubscriptionStatus } from "../../../generated/prisma/enums.js";
import { BillingRepository } from "../controllers/billing.controller.js";


export function mapStripeSubscriptionStatus(
  status: string,
): SubscriptionStatus | null {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "unpaid":
      return "UNPAID";
    default:
      return null;
  }
}

type SyncTenantSubscriptionInput = {
  tenantId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripeStatus: string;
  planId?: string;
};

export class BillingService {
  private readonly billingRepository: BillingRepository;

  constructor(prisma: PrismaClient) {
    this.billingRepository = new BillingRepository(prisma);
  }

  async syncTenantSubscription(input: SyncTenantSubscriptionInput) {
    // 1. Convert Stripe's status into our internal status.
    const status = mapStripeSubscriptionStatus(input.stripeStatus);

    if (!status) {
      throw badRequest(
        `Unsupported Stripe subscription status: ${input.stripeStatus}`,
        "UNSUPPORTED_SUBSCRIPTION_STATUS",
      );
    }

    // 2. Check that the tenant exists.
    const tenant = await this.billingRepository.findTenantById(
      input.tenantId,
    );

    if (!tenant) {
      throw notFound("Tenant not found", "TENANT_NOT_FOUND");
    }

    // 3. Delegate the database update to the repository.
    return this.billingRepository.updateTenantSubscription({
      tenantId: input.tenantId,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      subscriptionStatus: status,
      ...(input.planId !== undefined && {
        planId: input.planId,
      }),
    });
  }
}
