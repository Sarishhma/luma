
import type { PrismaClient } from "../../../generated/prisma/client.js";

type UpdateTenantSubscriptionInput = {
  tenantId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  subscriptionStatus:
    | "TRIALING"
    | "ACTIVE"
    | "PAST_DUE"
    | "CANCELED"
    | "UNPAID";
  planId?: string;
};

export class BillingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findTenantById(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
  }

  async updateTenantSubscription(
    input: UpdateTenantSubscriptionInput,
  ) {
    return this.prisma.tenant.update({
      where: { id: input.tenantId },
      data: {
        stripeCustomerId: input.stripeCustomerId,
        stripeSubscriptionId: input.stripeSubscriptionId,
        subscriptionStatus: input.subscriptionStatus,
        ...(input.planId !== undefined && {
          planId: input.planId,
        }),
      },
    });
  }
}
