// import { describe, expect, it } from "vitest";
// import { mapStripeSubscriptionStatus } from "./billingService.js";

// describe("mapStripeSubscriptionStatus", () => {
//   it.each([
//     ["trialing", "TRIALING"],
//     ["active", "ACTIVE"],
//     ["past_due", "PAST_DUE"],
//     ["canceled", "CANCELED"],
//     ["unpaid", "UNPAID"],
//   ] as const)("maps %s to %s", (stripeStatus, expected) => {
//     expect(mapStripeSubscriptionStatus(stripeStatus)).toBe(expected);
//   });

//   it("returns null for unsupported statuses", () => {
//     expect(mapStripeSubscriptionStatus("incomplete")).toBeNull();
//   });
// });
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../../generated/prisma/client.js";
import { BillingService } from "./billingService.js";

const prismaMock = {
  tenant: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const billingService = new BillingService(
  prismaMock as unknown as PrismaClient,
);

describe("BillingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a tenant subscription successfully", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({
      id: "tenant-123",
    });

    prismaMock.tenant.update.mockResolvedValue({
      id: "tenant-123",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_456",
      subscriptionStatus: "ACTIVE",
      planId: "pro",
    });

    await billingService.syncTenantSubscription({
      tenantId: "tenant-123",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_456",
      stripeStatus: "active",
      planId: "pro",
    });

    expect(prismaMock.tenant.update).toHaveBeenCalledWith({
      where: { id: "tenant-123" },
      data: {
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_456",
        subscriptionStatus: "ACTIVE",
        planId: "pro",
      },
    });
  });

  it("rejects an unsupported subscription status", async () => {
    await expect(
      billingService.syncTenantSubscription({
        tenantId: "tenant-123",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_456",
        stripeStatus: "incomplete",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "UNSUPPORTED_SUBSCRIPTION_STATUS",
    });

    expect(prismaMock.tenant.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.tenant.update).not.toHaveBeenCalled();
  });

  it("throws when the tenant does not exist", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(null);

    await expect(
      billingService.syncTenantSubscription({
        tenantId: "missing-tenant",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_456",
        stripeStatus: "active",
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "TENANT_NOT_FOUND",
    });

    expect(prismaMock.tenant.update).not.toHaveBeenCalled();
  });
});