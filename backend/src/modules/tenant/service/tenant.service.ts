import { TenantRepository } from "../repository/tenant.repository.js";
import type { PrismaClient, TenantRole } from "../../../generated/prisma/client.js";
import slugify from "slugify";
import crypto from "crypto";
import { error } from "console";

export class TenantService {
  private repository: TenantRepository;

  constructor(prisma: PrismaClient) {
    this.repository = new TenantRepository(prisma);
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = slugify(name, { lower: true, strict: true, trim: true });
    let slug = baseSlug;
    let count = 1;

    while (await this.repository.findTenantBySlug(slug)) {
      slug = `${baseSlug}-${count}`;
      count++;
    }

    return slug;
  }

  async createTenant(userId: string, sessionId: string, input: { name: string }) {
    const slug = await this.generateUniqueSlug(input.name);
    const { tenant, member } = await this.repository.createTenantWithMemberAndAudit(
      userId,
      sessionId,
      { name: input.name, slug }
    );

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      role: member.role,
      createdAt: tenant.createdAt,
    };
  }

  async switchTenant(userId: string, sessionId: string, tenantId: string) {
    const membership = await this.repository.findMembership(userId, tenantId);

    if (!membership) {
      throw new Error("ACCESS_DENIED: You are not a member of this workspace.");
    }

    if (sessionId) {
      await this.repository.updateActiveSession(sessionId, tenantId);
    }

    return {
      id: membership.tenant.id,
      name: membership.tenant.name,
      slug: membership.tenant.slug,
      role: membership.role,
    };
  }

  async inviteUser(userId: string, tenantId: string, input: { email: string; role?: TenantRole }) {
    const { email, role = 'MEMBER' } = input;

    const inviterMembership = await this.repository.findMembership(userId, tenantId);
    if (!inviterMembership || !['OWNER', 'ADMIN'].includes(inviterMembership.role)) {
      throw new Error("ACCESS_DENIED: You do not have permission to invite users to this workspace.");
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation = await this.repository.upsertInvitation(
      tenantId,
      email,
      role,
      tokenHash,
      expiresAt
    );

    return {
      invitationId: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      rawToken,
    };
  }

  async acceptInvitation(userId: string, sessionId: string, rawToken: string) {
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const invitation = await this.repository.findInvitationByHash(tokenHash);

    if (!invitation) {
      throw new Error("INVALID_INVITATION: This invitation link is invalid or has already been used.");
    }

    if (invitation.expiresAt < new Date()) {
      await this.repository.deleteInvitation(invitation.id);
      throw new Error("EXPIRED_INVITATION: This invitation link has expired.");
    }

    const membership = await this.repository.acceptInvitationTx(
      userId,
      sessionId,
      invitation.tenantId,
      invitation.role,
      invitation.id
    );

    return {
      success: true,
      tenant: {
        id: invitation.tenant.id,
        name: invitation.tenant.name,
        slug: invitation.tenant.slug,
        role: membership.role,
      },
    };
  }
 async listMembers(userId: string, tenantId: string) {
    const membership = await this.repository.findMembership(userId, tenantId);
    if (!membership) {
      throw new Error("ACCESS_DENIED: You are not a member of this workspace.");
    }

    const members = await this.repository.findMembersByTenantId(tenantId);

    return members.map((member) => ({
      id: member.id,
      userId: member.userId,
      role: member.role,
      joinedAt: member.createdAt,
      user: {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        image: member.user.image,
      },
    }));
  }

  async updateMemberRole(userId: string, tenantId: string, targetUserId: string, newRole: TenantRole) {
    const requesterMembership = await this.repository.findMembership(userId, tenantId);
    if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
      throw new Error("ACCESS_DENIED: You do not have permission to update member roles.");
    }

    // Optional safety check: Prevent an admin from modifying an owner if needed
    const targetMembership = await this.repository.findMembership(targetUserId, tenantId);
    if (!targetMembership) {
      throw new Error("NOT_FOUND: Target user is not a member of this workspace.");
    }

    if (targetMembership.role === 'OWNER' && requesterMembership.role !== 'OWNER') {
      throw new Error("ACCESS_DENIED: Only an owner can modify another owner's role.");
    }

    const updatedMember = await this.repository.updateMemberRole(tenantId, targetUserId, newRole);

    return {
      success: true,
      member: {
        id: updatedMember.id,
        userId: updatedMember.userId,
        role: updatedMember.role,
      },
    };
  }

  async removeMember(userId: string, tenantId: string, targetUserId: string) {
    const requesterMembership = await this.repository.findMembership(userId, tenantId);
    if (!requesterMembership) {
      throw new Error("ACCESS_DENIED: You are not a member of this workspace.");
    }

    const isSelf = userId === targetUserId;
    const isAdminOrOwner = ['OWNER', 'ADMIN'].includes(requesterMembership.role);

    // Users can leave themselves, or admins/owners can remove others
    if (!isSelf && !isAdminOrOwner) {
      throw new Error("ACCESS_DENIED: You do not have permission to remove members from this workspace.");
    }

    const targetMembership = await this.repository.findMembership(targetUserId, tenantId);
    if (!targetMembership) {
      throw new Error("NOT_FOUND: Target user is not a member of this workspace.");
    }

    // Prevent removing the last owner
    if (targetMembership.role === 'OWNER') {
      const ownerCount = await this.repository.countOwners(tenantId);
      if (ownerCount <= 1) {
        throw new Error("CONFLICT: Cannot remove the last remaining owner of the workspace.");
      }
    }

    await this.repository.removeMember(tenantId, targetUserId);

    return {
      success: true,
      message: isSelf ? "Successfully left the workspace." : "Successfully removed member from workspace.",
    };
  }

}

