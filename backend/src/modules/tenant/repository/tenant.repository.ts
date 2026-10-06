import type {
  AuditEventType,
  Prisma,
  PrismaClient,
  TenantRole,
} from "../../../generated/prisma/client.js";

/**
 * Either the normal Prisma client or a transaction client.
 */
export type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Repository layer.
 *
 * The repository ONLY handles database operations.
 * It does NOT contain:
 * - permission rules
 * - business rules
 * - HTTP logic
 *
 * The service layer decides WHAT should happen.
 * The repository decides HOW to access the database.
 */
export class TenantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ─────────────────────────── transaction ───────────────────────────

  transaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  // ───────────────────────────── users ──────────────────────────────

  findUserById(
    userId: string,
    db: DbClient = this.prisma,
  ) {
    return db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
      },
    });
  }

  // ───────────────────────────── tenants ────────────────────────────

  createTenant(
    data: {
      name: string;
      slug: string;
      createdById: string;
    },
    db: DbClient = this.prisma,
  ) {
    return db.tenant.create({
      data,
    });
  }

  // ─────────────────────────── memberships ──────────────────────────

  findMembership(
    userId: string,
    tenantId: string,
    db: DbClient = this.prisma,
  ) {
    return db.tenantMember.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      include: {
        tenant: true,
      },
    });
  }

  findMembershipsByUser(
    userId: string,
    db: DbClient = this.prisma,
  ) {
    return db.tenantMember.findMany({
      where: {
        userId,
      },
      include: {
        tenant: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  findMembershipByEmail(
    tenantId: string,
    email: string,
    db: DbClient = this.prisma,
  ) {
    return db.tenantMember.findFirst({
      where: {
        tenantId,
        user: {
          email: {
            equals: email,
            mode: "insensitive",
          },
        },
      },
    });
  }

  findMembersByTenantId(
    tenantId: string,
    db: DbClient = this.prisma,
  ) {
    return db.tenantMember.findMany({
      where: {
        tenantId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  createMember(
    data: {
      userId: string;
      tenantId: string;
      role: TenantRole;
    },
    db: DbClient = this.prisma,
  ) {
    return db.tenantMember.create({
      data,
    });
  }

  updateMemberRole(
    tenantId: string,
    userId: string,
    role: TenantRole,
    db: DbClient = this.prisma,
  ) {
    return db.tenantMember.update({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      data: {
        role,
      },
    });
  }

  deleteMember(
    tenantId: string,
    userId: string,
    db: DbClient = this.prisma,
  ) {
    return db.tenantMember.delete({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });
  }

  // ───────────────────────────── owners ─────────────────────────────

  /**
   * Locks all OWNER membership rows for this tenant and counts them.
   *
   * This is used when demoting/removing an OWNER.
   *
   * FOR UPDATE prevents two concurrent transactions from both
   * thinking they are removing the last owner.
   */
  async lockAndCountOwners(
    tenantId: string,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id"
      FROM "TenantMember"
      WHERE "tenantId" = ${tenantId}
        AND "role" = 'OWNER'
      FOR UPDATE
    `;

    return rows.length;
  }

  // ───────────────────────────── sessions ───────────────────────────

  /**
   * Sets the active workspace for a login session.
   *
   * Only updates non-revoked refresh tokens belonging
   * to the specified user and session.
   */
  setSessionActiveTenant(
    sessionId: string,
    userId: string,
    tenantId: string,
    db: DbClient = this.prisma,
  ) {
    return db.refreshToken.updateMany({
      where: {
        sessionId,
        userId,
        revokeAt: null,
      },
      data: {
        activeTenantId: tenantId,
      },
    });
  }

  /**
   * When a user leaves/is removed from a workspace,
   * no refresh token should continue pointing to that workspace.
   */
  clearActiveTenantForUser(
    userId: string,
    tenantId: string,
    db: DbClient = this.prisma,
  ) {
    return db.refreshToken.updateMany({
      where: {
        userId,
        activeTenantId: tenantId,
      },
      data: {
        activeTenantId: null,
      },
    });
  }

  // ─────────────────────────── invitations ──────────────────────────

  /**
   * Creates or updates an invitation.
   *
   * If the same user/email is invited again:
   * - old token becomes invalid
   * - new token is stored
   * - expiration is refreshed
   */
  upsertInvitation(
    data: {
      tenantId: string;
      email: string;
      role: TenantRole;
      tokenHash: string;
      expiresAt: Date;
      invitedById: string;
    },
    db: DbClient = this.prisma,
  ) {
    const {
      tenantId,
      email,
      ...rest
    } = data;

    return db.tenantInvitation.upsert({
      where: {
        tenantId_email: {
          tenantId,
          email,
        },
      },

      update: {
        ...rest,
      },

      create: {
        tenantId,
        email,
        ...rest,
      },
    });
  }

  findInvitationByHash(
    tokenHash: string,
    db: DbClient = this.prisma,
  ) {
    return db.tenantInvitation.findUnique({
      where: {
        tokenHash,
      },
      include: {
        tenant: true,
      },
    });
  }

  /**
   * Deletes an invitation atomically.
   *
   * Returns:
   * 1 → invitation was successfully claimed/deleted
   * 0 → invitation was already deleted
   */
  async deleteInvitation(
    id: string,
    db: DbClient = this.prisma,
  ): Promise<number> {
    const result =
      await db.tenantInvitation.deleteMany({
        where: {
          id,
        },
      });

    return result.count;
  }

  // ───────────────────────────── audit ──────────────────────────────

  createAudit(
    data: {
      userId?: string;
      tenantId?: string;
      eventType: AuditEventType;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Prisma.InputJsonValue;
    },
    db: DbClient = this.prisma,
  ) {
    return db.auditLog.create({
      data,
    });
  }
}