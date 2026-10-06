import { z } from "zod";

export const tenantRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]);

// ───────── Requests ─────────
export const createTenantSchema = z.object({
  name: z.string().trim().min(2).max(60),
});

export const switchTenantSchema = z.object({
  tenantId: z.string().uuid(),
});

export const tenantParamsSchema = z.object({
  tenantId: z.string().uuid(),
});

export const memberParamsSchema = z.object({
  tenantId: z.string().uuid(),
  targetUserId: z.string().uuid(),
});

export const inviteTenantSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: tenantRoleSchema.default("MEMBER"),
});

export const acceptTenantInvitationSchema = z.object({
  token: z.string().min(32).max(128),
});

export const updateMemberRoleSchema = z.object({
  role: tenantRoleSchema,
});

// ───────── Responses ─────────
export const tenantSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  role: tenantRoleSchema,
});

export const createTenantResponseSchema = z.object({
  tenant: tenantSummarySchema,
  accessToken: z.string(),
});

export const listTenantsResponseSchema = z.object({
  tenants: z.array(tenantSummarySchema),
});

export const switchTenantResponseSchema = z.object({
  message: z.string(),
  accessToken: z.string(),
  activeTenant: tenantSummarySchema,
});

export const inviteTenantResponseSchema = z.object({
  invitation: z.object({
    id: z.string(),
    email: z.string(),
    role: tenantRoleSchema,
    expiresAt: z.date(),
  }),
  // Only present outside production. In production the token is EMAILED, never returned.
  devInviteToken: z.string().optional(),
});

export const acceptTenantInvitationResponseSchema = z.object({
  tenant: tenantSummarySchema,
  accessToken: z.string(),
});

export const listMembersResponseSchema = z.object({
  members: z.array(
    z.object({
      id: z.string(),
      userId: z.string(),
      role: tenantRoleSchema,
      joinedAt: z.date(),
      user: z.object({ id: z.string(), email: z.string() }),
    }),
  ),
});

export const updateMemberRoleResponseSchema = z.object({
  member: z.object({ id: z.string(), userId: z.string(), role: tenantRoleSchema }),
});

export const messageResponseSchema = z.object({ message: z.string() });

// ───────── Types ─────────
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type SwitchTenantInput = z.infer<typeof switchTenantSchema>;
export type InviteTenantInput = z.infer<typeof inviteTenantSchema>;
export type AcceptTenantInvitationInput = z.infer<typeof acceptTenantInvitationSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
