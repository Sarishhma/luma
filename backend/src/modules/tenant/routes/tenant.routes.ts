import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { authGuard } from "../../../middleware/authGuard.js";
import { standardErrors } from "../../../common/common.schema.js";
import { TenantController } from "../controller/tenant.controller.js";

import {
  acceptTenantInvitationResponseSchema,
  acceptTenantInvitationSchema,
  createTenantResponseSchema,
  createTenantSchema,
  inviteTenantResponseSchema,
  inviteTenantSchema,
  listMembersResponseSchema,
  listTenantsResponseSchema,
  memberParamsSchema,
  messageResponseSchema,
  switchTenantResponseSchema,
  switchTenantSchema,
  tenantParamsSchema,
  updateMemberRoleResponseSchema,
  updateMemberRoleSchema,
} from "../schema/tenant.schema.js";

export const tenantRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  const controller = new TenantController(fastify.prisma);

  // Authentication can come from either:
  // 1. Authorization: Bearer <token>
  // 2. Authentication cookie
  const security: { [key: string]: readonly string[] }[] = [
    { bearerAuth: [] },
    { cookieAuth: [] },
  ];

  // ───────── Tenant Routes ─────────

  app.post("/tenants", {
    schema: {
      tags: ["Tenants"],
      summary: "Create a workspace (you become its OWNER)",
      security,
      body: createTenantSchema,
      response: {
        201: createTenantResponseSchema,
        ...standardErrors,
      },
    },
    preHandler: authGuard,
    handler: controller.createTenant,
  });

  app.get("/tenants", {
    schema: {
      tags: ["Tenants"],
      summary: "List workspaces I belong to",
      security,
      response: {
        200: listTenantsResponseSchema,
        ...standardErrors,
      },
    },
    preHandler: authGuard,
    handler: controller.listMyTenants,
  });

  app.post("/tenants/switch", {
    schema: {
      tags: ["Tenants"],
      summary: "Switch active workspace (returns a new access token)",
      security,
      body: switchTenantSchema,
      response: {
        200: switchTenantResponseSchema,
        ...standardErrors,
      },
    },
    preHandler: authGuard,
    handler: controller.switchTenant,
  });

  // ───────── Invitation Routes ─────────

  app.post("/tenants/invitations/accept", {
    schema: {
      tags: ["Tenants"],
      summary: "Accept a workspace invitation",
      security,
      body: acceptTenantInvitationSchema,
      response: {
        200: acceptTenantInvitationResponseSchema,
        ...standardErrors,
      },
    },
    preHandler: authGuard,
    handler: controller.acceptInvitation,
  });

  app.post("/tenants/:tenantId/invitations", {
    schema: {
      tags: ["Tenants"],
      summary: "Invite someone to a workspace",
      security,
      params: tenantParamsSchema,
      body: inviteTenantSchema,
      response: {
        201: inviteTenantResponseSchema,
        ...standardErrors,
      },
    },
    preHandler: authGuard,
    handler: controller.inviteUser,
  });

  // ───────── Member Management Routes ─────────

  app.get("/tenants/:tenantId/members", {
    schema: {
      tags: ["Tenants"],
      summary: "List workspace members",
      security,
      params: tenantParamsSchema,
      response: {
        200: listMembersResponseSchema,
        ...standardErrors,
      },
    },
    preHandler: authGuard,
    handler: controller.listMembers,
  });

  app.patch("/tenants/:tenantId/members/:targetUserId", {
    schema: {
      tags: ["Tenants"],
      summary: "Change a member's role",
      security,
      params: memberParamsSchema,
      body: updateMemberRoleSchema,
      response: {
        200: updateMemberRoleResponseSchema,
        ...standardErrors,
      },
    },
    preHandler: authGuard,
    handler: controller.updateMemberRole,
  });

  app.delete("/tenants/:tenantId/members/:targetUserId", {
    schema: {
      tags: ["Tenants"],
      summary: "Remove a member, or leave the workspace",
      security,
      params: memberParamsSchema,
      response: {
        200: messageResponseSchema,
        ...standardErrors,
      },
    },
    preHandler: authGuard,
    handler: controller.removeMember,
  });
};
