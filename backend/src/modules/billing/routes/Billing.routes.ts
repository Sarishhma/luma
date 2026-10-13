import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import type { FastifyRequest } from "fastify";
import { stripe } from "../stripe/stripe.js";
import { badRequest, forbidden, notFound, unauthorized } from "../../../common/error.js";
import { authGuard } from "../../../middleware/authGuard.js";
import type Stripe from "stripe";
import { BillingService } from "../services/billingService.js";

async function syncStripeSubscription(
  fastify: FastifyInstance,
  subscription: Stripe.Subscription,
) {
  // 1. Find which tenant owns this subscription.
  const tenantId = subscription.metadata?.tenantId;

  if (!tenantId) {
    fastify.log.warn(
      { subscriptionId: subscription.id },
      "Stripe subscription has no tenantId metadata",
    );
    return;
  }

  // 2. Extract the Stripe customer ID.
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  // 3. Identify the subscription's price.
  const priceId = subscription.items.data[0]?.price.id;

  // 4. Map our configured Pro price to our internal plan name.
  const planId =
    priceId === process.env.STRIPE_PRO_PRICE_ID
      ? "pro"
      : undefined;

  // 5. Reuse our existing service to update PostgreSQL.
  const billingService = new BillingService(fastify.prisma);

  await billingService.syncTenantSubscription({
    tenantId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripeStatus: subscription.status,
    ...(planId !== undefined && { planId }),
  });

  fastify.log.info(
    {
      tenantId,
      subscriptionId: subscription.id,
      status: subscription.status,
    },
    "Tenant subscription synchronized",
  );
}

// subscription.metadata?.tenantId identifies the tenant attached to the Stripe subscription. We added this metadata when creating the Checkout Session.
// typeof subscription.customer === "string" handles Stripe's customer field, which can contain either a customer ID or an expanded customer object.
// priceId === process.env.STRIPE_PRO_PRICE_ID maps the configured Stripe price to your application's internal plan name, "pro". We don't blindly store a Stripe price ID as the plan name.
// new BillingService(fastify.prisma) reuses your existing service instead of putting database update logic directly into the route.
// await ensures the database update finishes before the helper returns.


export const billingRoutes: FastifyPluginAsync = async (fastify) => {
 
fastify.post(
  "/webhook",
  {
    config: {
      rawBody: true,
    },
  },
  async (request, reply) => {
    // 1. Get Stripe's signature header.
    const signature = request.headers["stripe-signature"];

    if (!signature || Array.isArray(signature)) {
      return reply.code(400).send({
        error: "Missing Stripe signature",
      });
    }

    // 2. Get the original, unmodified request body.
    const rawBody = (
      request as FastifyRequest & { rawBody?: string }
    ).rawBody;

    if (!rawBody) {
      return reply.code(400).send({
        error: "Missing raw request body",
      });
    }

    // 3. Verify the webhook signature.
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      fastify.log.error("STRIPE_WEBHOOK_SECRET is not configured");

      return reply.code(500).send({
        error: "Webhook configuration error",
      });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (error) {
      fastify.log.warn(
        { error },
        "Stripe webhook signature verification failed",
      );

      return reply.code(400).send({
        error: "Invalid Stripe webhook signature",
      });
    }

    // 4. Process the event we received.
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;

          if (session.mode !== "subscription") {
            break;
          }

          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id;

          if (!subscriptionId) {
            fastify.log.warn(
              { sessionId: session.id },
              "Checkout session has no subscription",
            );
            break;
          }

          // Retrieve the latest subscription from Stripe.
          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);

          await syncStripeSubscription(fastify, subscription);
          break;
        }

        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const subscription = event.data.object;

          await syncStripeSubscription(fastify, subscription);
          break;
        }

        default:
          fastify.log.info(
            { eventType: event.type },
            "Ignoring unhandled Stripe event",
          );
      }
    } catch (error) {
      fastify.log.error(
        { error, eventId: event.id, eventType: event.type },
        "Failed to process Stripe webhook",
      );

      // Stripe should retry if our processing failed.
      return reply.code(500).send({
        error: "Webhook processing failed",
      });
    }

    // 5. Acknowledge successful processing.
    return reply.code(200).send({ received: true });
  },
);

fastify.post(
  "/checkout",
  {
    preHandler: authGuard,
  },
  async (request, reply) => {
    // 1. Get the authenticated user's ID.
    const user = request.user;
        if (!user) {
      throw unauthorized("Authentication required");
    }
    const userId = user.sub;

    // 2. Get the currently selected tenant.
    const tenantId = user.activeTenantId;

    if (!tenantId) {
      throw badRequest(
        "Please select a tenant first",
        "ACTIVE_TENANT_REQUIRED",
      );
    }

    // 3. Check that the tenant exists.
    const tenant = await fastify.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        stripeCustomerId: true,
      },
    });

    if (!tenant) {
      throw notFound("Tenant not found", "TENANT_NOT_FOUND");
    }

    // 4. Check the user's membership in this tenant.
    const membership = await fastify.prisma.tenantMember.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      select: { role: true },
    });

    if (!membership) {
      throw forbidden(
        "You are not a member of this tenant",
        "TENANT_ACCESS_DENIED",
      );
    }

    // 5. Only owners and admins can start billing.
    if (
      membership.role !== "OWNER" &&
      membership.role !== "ADMIN"
    ) {
      throw forbidden(
        "Only tenant owners and admins can manage billing",
        "BILLING_ACCESS_DENIED",
      );
    }

    // 6. Read the configured Stripe price and frontend URL.
    const priceId = process.env.STRIPE_PRO_PRICE_ID;
    const frontendUrl = process.env.FRONTEND_URL;

    if (!priceId || !frontendUrl) {
      throw new Error(
        "STRIPE_PRO_PRICE_ID and FRONTEND_URL must be configured",
      );
    }

    // 7. Create a hosted Stripe Checkout Session.
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      ...(tenant.stripeCustomerId
        ? { customer: tenant.stripeCustomerId }
        : {}),
      client_reference_id: tenant.id,
      metadata: {
        tenantId: tenant.id,
        userId,
      },
      subscription_data: {
        metadata: {
          tenantId: tenant.id,
        },
      },
      success_url:
        `${frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/billing/cancel`,
    });

    // 8. Send the Checkout URL back to the frontend.
    return reply.code(200).send({
      checkoutUrl: session.url,
    });
  },
);

};


// Imagine a tenant owner clicks Upgrade to Pro in your SaaS dashboard.
// 1. The frontend calls POST /api/billing/checkout.
// 2. Your backend authenticates the user and checks that they are an OWNER or ADMIN of the active tenant.
// 3. The backend asks Stripe to create a subscription Checkout Session.
// 4. Stripe returns a Checkout URL, which your backend sends to the frontend.
// 5. The frontend redirects the user to Stripe.
// 6. After Checkout, Stripe sends a webhook to your backend. Your webhook handler must verify the signature and synchronize the tenant's subscription details in PostgreSQL.