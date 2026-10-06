import type { FastifyReply, FastifyRequest } from "fastify";
import type { PrismaClient } from "../../../generated/prisma/client.js";
import type { TenantRole } from "../../../generated/prisma/enums.js";
import { TenantRepository } from "../repository/tenant.repository.js";
import { TenantService, type Actor } from "../service/tenant.service.js";
import type {
  AcceptTenantInvitationInput,
  CreateTenantInput,
  InviteTenantInput,
  SwitchTenantInput,
  UpdateMemberRoleInput,
} from "../schema/tenant.schema.js";

/** JWT + request => a plain object the service understands. */
function getActor(request: FastifyRequest): Actor {
  return {
    userId: request.user!.sub,
    sessionId: request.user!.sessionId ?? "",
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"],
  };
}

/** New access token that "lives" in the given workspace. */
function signAccessToken(request: FastifyRequest, tenant: { id: string; role: TenantRole }) {
  const { sub, email, role, sessionId } = request.user!;
  return request.server.jwt.sign(
    { sub, email, role, sessionId, activeTenantId: tenant.id, tenantRole: tenant.role },
    { expiresIn: "15m" },
  );
}

/**
 * Controllers are thin: read the request, call ONE service method, shape the response.
 * No business rules, no try/catch (the global error handler does that).
 */
export class TenantController {
  private readonly service: TenantService;

  constructor(prisma: PrismaClient) {
    this.service = new TenantService(new TenantRepository(prisma));
  }

  createTenant = async (request: FastifyRequest<{ Body: CreateTenantInput }>, reply: FastifyReply) => {
    const tenant = await this.service.createTenant(getActor(request), request.body);
    return reply.status(201).send({ tenant, accessToken: signAccessToken(request, tenant) });
  };

  listMyTenants = async (request: FastifyRequest, reply: FastifyReply) => {
    const tenants = await this.service.listMyTenants(request.user!.sub);
    return reply.status(200).send({ tenants });
  };

  switchTenant = async (request: FastifyRequest<{ Body: SwitchTenantInput }>, reply: FastifyReply) => {
    const activeTenant = await this.service.switchTenant(getActor(request), request.body.tenantId);
    return reply.status(200).send({
      message: "Workspace switched successfully.",
      accessToken: signAccessToken(request, activeTenant),
      activeTenant,
    });
  };

  inviteUser = async (
    request: FastifyRequest<{ Params: { tenantId: string }; Body: InviteTenantInput }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.inviteUser(getActor(request), request.params.tenantId, request.body);
    return reply.status(201).send({
      invitation: {
        id: result.invitationId,
        email: result.email,
        role: result.role,
        expiresAt: result.expiresAt,
      },
      // In production this token must only travel by email.
      ...(process.env.NODE_ENV !== "production" && { devInviteToken: result.rawToken }),
    });
  };

  acceptInvitation = async (
    request: FastifyRequest<{ Body: AcceptTenantInvitationInput }>,
    reply: FastifyReply,
  ) => {
    const tenant = await this.service.acceptInvitation(getActor(request), request.body.token);
    return reply.status(200).send({ tenant, accessToken: signAccessToken(request, tenant) });
  };

  listMembers = async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
    const members = await this.service.listMembers(request.user!.sub, request.params.tenantId);
    return reply.status(200).send({ members });
  };

  updateMemberRole = async (
    request: FastifyRequest<{
      Params: { tenantId: string; targetUserId: string };
      Body: UpdateMemberRoleInput;
    }>,
    reply: FastifyReply,
  ) => {
    const { tenantId, targetUserId } = request.params;
    const member = await this.service.updateMemberRole(
      getActor(request),
      tenantId,
      targetUserId,
      request.body.role,
    );
    return reply.status(200).send({ member });
  };

  removeMember = async (
    request: FastifyRequest<{ Params: { tenantId: string; targetUserId: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenantId, targetUserId } = request.params;
    const result = await this.service.removeMember(getActor(request), tenantId, targetUserId);
    return reply.status(200).send(result);
  };
}
