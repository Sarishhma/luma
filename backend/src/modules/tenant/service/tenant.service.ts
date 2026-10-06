import crypto from "node:crypto";
import slugify from "slugify";
import type { TenantRole } from "../../../generated/prisma/enums.js";
import type { TenantRepository } from "../repository/tenant.repository.js";
import {
  badRequest,
  conflict,
  forbidden,
  isPrismaError,
  notFound,
} from "../../../common/error.js";
import { canManageRole } from "../../../common/permission.js";

/** Who is doing this, and from where. Built by the controller from the JWT + request. */
export interface Actor {
  userId: string;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
}

const INVITE_TTL_DAYS = 7;

const hashToken = (raw: string) =>
  crypto.createHash("sha256").update(raw).digest("hex");

/**
 * Business logic for tenant/workspace management.
 *
 * The service:
 * - contains business rules
 * - checks permissions
 * - controls transactions
 * - creates audit records
 *
 * The service does NOT:
 * - access HTTP request/reply
 * - build Prisma queries
 *
 * The repository handles database access.
 */
export class TenantService {
  constructor(private readonly repo: TenantRepository) {}

  // ─────────────────────────── workspaces ───────────────────────────

  async createTenant(actor: Actor, input: { name: string }) {
    const base =
      slugify(input.name, {
        lower: true,
        strict: true,
        trim: true,
      }) || "workspace";

    // Do not "check then insert".
    // Two requests could both pass the check.
    // Instead, insert and let the database unique constraint
    // tell us if the slug already exists.
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug =
        attempt === 0
          ? base
          : `${base}-${crypto.randomBytes(3).toString("hex")}`;

      try {
        return await this.repo.transaction(async (tx) => {
          const tenant = await this.repo.createTenant(
            {
              name: input.name,
              slug,
              createdById: actor.userId,
            },
            tx,
          );

          const member = await this.repo.createMember(
            {
              userId: actor.userId,
              tenantId: tenant.id,
              role: "OWNER",
            },
            tx,
          );

          if (actor.sessionId) {
            await this.repo.setSessionActiveTenant(
              actor.sessionId,
              actor.userId,
              tenant.id,
              tx,
            );
          }

          await this.repo.createAudit(
            {
              userId: actor.userId,
              tenantId: tenant.id,
              eventType: "TENANT_CREATED",
              ipAddress: actor.ipAddress,
              userAgent: actor.userAgent,
              metadata: {
                name: tenant.name,
                slug: tenant.slug,
              },
            },
            tx,
          );

          return {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            role: member.role,
          };
        });
      } catch (error) {
        // Slug already exists.
        // Try again with a random suffix.
        if (isPrismaError(error, "P2002")) {
          continue;
        }

        throw error;
      }
    }

    throw conflict(
      "Could not generate a unique workspace URL. Try a different name.",
    );
  }

  async listMyTenants(userId: string) {
    const memberships = await this.repo.findMembershipsByUser(userId);

    return memberships.map((membership) => ({
      id: membership.tenant.id,
      name: membership.tenant.name,
      slug: membership.tenant.slug,
      role: membership.role,
    }));
  }

  async switchTenant(actor: Actor, tenantId: string) {
    const membership = await this.repo.findMembership(
      actor.userId,
      tenantId,
    );

    if (!membership) {
      throw forbidden("You are not a member of this workspace.");
    }

    if (actor.sessionId) {
      await this.repo.setSessionActiveTenant(
        actor.sessionId,
        actor.userId,
        tenantId,
      );
    }

    await this.repo.createAudit({
      userId: actor.userId,
      tenantId,
      eventType: "TENANT_SWITCHED",
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      id: membership.tenant.id,
      name: membership.tenant.name,
      slug: membership.tenant.slug,
      role: membership.role,
    };
  }

  // ─────────────────────────── invitations ──────────────────────────

  async inviteUser(
    actor: Actor,
    tenantId: string,
    input: {
      email: string;
      role: TenantRole;
    },
  ) {
    const email = input.email.trim().toLowerCase();

    const inviter = await this.repo.findMembership(
      actor.userId,
      tenantId,
    );

    if (!inviter) {
      throw forbidden("You are not a member of this workspace.");
    }

    // ADMIN can invite MEMBER/VIEWER only.
    // OWNER can invite anyone.
    if (!canManageRole(inviter.role, input.role)) {
      throw forbidden(
        `You are not allowed to invite someone as ${input.role}.`,
      );
    }

    const existingMember = await this.repo.findMembershipByEmail(
      tenantId,
      email,
    );

    if (existingMember) {
      throw conflict(
        "This person is already a member of the workspace.",
      );
    }

    // Generate a secure random token.
    const rawToken = crypto.randomBytes(32).toString("hex");

    const expiresAt = new Date(
      Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    // Only the hash is stored in the database.
    const invitation = await this.repo.upsertInvitation({
      tenantId,
      email,
      role: input.role,
      tokenHash: hashToken(rawToken),
      expiresAt,
      invitedById: actor.userId,
    });

    await this.repo.createAudit({
      userId: actor.userId,
      tenantId,
      eventType: "MEMBER_INVITED",
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      metadata: {
        email,
        role: input.role,
      },
    });

    return {
      invitationId: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,

      // TODO:
      // Send this token through email.
      // Do NOT return it from the controller in production.
      rawToken,
    };
  }

  async acceptInvitation(actor: Actor, rawToken: string) {
    const tokenHash = hashToken(rawToken);

    const invitation =
      await this.repo.findInvitationByHash(tokenHash);

    if (!invitation) {
      throw badRequest(
        "This invitation link is invalid or has already been used.",
        "INVALID_INVITATION",
      );
    }

    if (invitation.expiresAt < new Date()) {
      await this.repo.deleteInvitation(invitation.id);

      throw badRequest(
        "This invitation has expired. Ask for a new one.",
        "INVITATION_EXPIRED",
      );
    }

    // Verify that the authenticated user exists.
    const user = await this.repo.findUserById(actor.userId);

    if (!user) {
      throw forbidden("User not found.");
    }

    // Email must be verified before accepting.
    if (!user.isEmailVerified) {
      throw forbidden(
        "Verify your email before accepting an invitation.",
      );
    }

    // The invitation belongs to a specific email.
    const userEmail = user.email.trim().toLowerCase();

    if (userEmail !== invitation.email.toLowerCase()) {
      throw forbidden(
        "This invitation was sent to a different email address.",
        "INVITATION_EMAIL_MISMATCH",
      );
    }

    return this.repo.transaction(async (tx) => {
      /*
       * Atomically claim the invitation.
       *
       * If two requests use the same invitation at the same time,
       * only one request can delete it.
       */
      const claimed = await this.repo.deleteInvitation(
        invitation.id,
        tx,
      );

      if (claimed === 0) {
        throw badRequest(
          "This invitation link is invalid or has already been used.",
          "INVALID_INVITATION",
        );
      }

      // Check if the user is already a member.
      const existing = await this.repo.findMembership(
        actor.userId,
        invitation.tenantId,
        tx,
      );

      let role: TenantRole;

      if (existing) {
        role = existing.role;
      } else {
        const member = await this.repo.createMember(
          {
            userId: actor.userId,
            tenantId: invitation.tenantId,
            role: invitation.role,
          },
          tx,
        );

        role = member.role;
      }

      if (actor.sessionId) {
        await this.repo.setSessionActiveTenant(
          actor.sessionId,
          actor.userId,
          invitation.tenantId,
          tx,
        );
      }

      await this.repo.createAudit(
        {
          userId: actor.userId,
          tenantId: invitation.tenantId,
          eventType: "MEMBER_JOINED",
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );

      return {
        id: invitation.tenant.id,
        name: invitation.tenant.name,
        slug: invitation.tenant.slug,
        role,
      };
    });
  }

  // ───────────────────────────── members ────────────────────────────

  async listMembers(userId: string, tenantId: string) {
    const membership = await this.repo.findMembership(
      userId,
      tenantId,
    );

    if (!membership) {
      throw forbidden("You are not a member of this workspace.");
    }

    const members =
      await this.repo.findMembersByTenantId(tenantId);

    return members.map((member) => ({
      id: member.id,
      userId: member.userId,
      role: member.role,
      joinedAt: member.createdAt,

      user: {
        id: member.user.id,
        email: member.user.email,
      },
    }));
  }

  async updateMemberRole(
    actor: Actor,
    tenantId: string,
    targetUserId: string,
    newRole: TenantRole,
  ) {
    // A user cannot change their own role.
    if (actor.userId === targetUserId) {
      throw forbidden("You cannot change your own role.");
    }

    return this.repo.transaction(async (tx) => {
      const requester = await this.repo.findMembership(
        actor.userId,
        tenantId,
        tx,
      );

      if (!requester) {
        throw forbidden("You are not a member of this workspace.");
      }

      const target = await this.repo.findMembership(
        targetUserId,
        tenantId,
        tx,
      );

      if (!target) {
        throw notFound(
          "That user is not a member of this workspace.",
        );
      }

      /*
       * Requester must outrank:
       *
       * 1. The role the target currently has
       * 2. The role the target will receive
       */
      if (
        !canManageRole(requester.role, target.role) ||
        !canManageRole(requester.role, newRole)
      ) {
        throw forbidden(
          "You do not have permission to make this role change.",
        );
      }

      /*
       * Never allow the last OWNER to be demoted.
       */
      if (
        target.role === "OWNER" &&
        newRole !== "OWNER"
      ) {
        const owners =
          await this.repo.lockAndCountOwners(tenantId, tx);

        if (owners <= 1) {
          throw conflict(
            "A workspace must keep at least one owner.",
          );
        }
      }

      const updated = await this.repo.updateMemberRole(
        tenantId,
        targetUserId,
        newRole,
        tx,
      );

      await this.repo.createAudit(
        {
          userId: actor.userId,
          tenantId,
          eventType: "MEMBER_ROLE_CHANGED",
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
          metadata: {
            targetUserId,
            from: target.role,
            to: newRole,
          },
        },
        tx,
      );

      

      return {
        id: updated.id,
        userId: updated.userId,
        role: updated.role,
      };
    });
  }

  async removeMember(
    actor: Actor,
    tenantId: string,
    targetUserId: string,
  ) {
    const isSelf = actor.userId === targetUserId;

    return this.repo.transaction(async (tx) => {
      const requester = await this.repo.findMembership(
        actor.userId,
        tenantId,
        tx,
      );

      if (!requester) {
        throw forbidden("You are not a member of this workspace.");
      }

      const target = await this.repo.findMembership(
        targetUserId,
        tenantId,
        tx,
      );

      if (!target) {
        throw notFound(
          "That user is not a member of this workspace.",
        );
      }

      /*
       * Anyone can remove themselves.
       *
       * Removing someone else requires a higher role.
       */
      if (
        !isSelf &&
        !canManageRole(requester.role, target.role)
      ) {
        throw forbidden(
          "You do not have permission to remove this member.",
        );
      }

      /*
       * The last OWNER cannot leave or be removed.
       */
      if (target.role === "OWNER") {
        const owners =
          await this.repo.lockAndCountOwners(tenantId, tx);

        if (owners <= 1) {
          throw conflict(
            "The last owner cannot leave or be removed. Transfer ownership first.",
          );
        }
      }

      await this.repo.deleteMember(
        tenantId,
        targetUserId,
        tx,
      );

      // If the removed user had this workspace active,
      // clear it from their session(s).
      await this.repo.clearActiveTenantForUser(
        targetUserId,
        tenantId,
        tx,
      );

      await this.repo.createAudit(
        {
          userId: actor.userId,
          tenantId,
          eventType: "MEMBER_REMOVED",
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
          metadata: {
            targetUserId,
            self: isSelf,
          },
        },
        tx,
      );

      return {
        message: isSelf
          ? "You left the workspace."
          : "Member removed from the workspace.",
      };
    });
  }
}