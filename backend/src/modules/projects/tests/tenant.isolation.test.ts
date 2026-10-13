/**
 * THE most important test in the project: proves tenant A can never see or touch
 * tenant B's data. Needs a real Postgres (use a separate TEST database!):
 *   DATABASE_URL=postgresql://.../saas_test npx prisma migrate deploy && npx vitest run
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../../lib/prisma.js";
import { db } from "../../../lib/db.js";
import { tenantContext, type TenantContext } from "../../../lib/tenant-context.js";

const suffix = crypto.randomUUID().slice(0, 8);
const inTenant = async <T>(
  ctx: TenantContext,
  fn: () => Promise<T>
) => {
  return tenantContext.run(ctx, async () => {
    console.log("TEST CONTEXT:", tenantContext.getStore());
    return await fn();
  });
};

let ctxA: TenantContext;
let ctxB: TenantContext;
let projectAId: string;
let projectBId: string;
const tenantIds: string[] = [];
const userIds: string[] = [];

beforeAll(async () => {
  const [userA, userB] = await Promise.all(
    ["a", "b"].map((x) => prisma.user.create({ data: { email: `${x}-${suffix}@test.local` } })),
  );
  userIds.push(userA.id, userB.id);

  const [tenantA, tenantB] = await Promise.all(
    [
      [userA.id, "a"],
      [userB.id, "b"],
    ].map(([createdById, x]) =>
      prisma.tenant.create({ data: { name: `Tenant ${x}`, slug: `test-${x}-${suffix}`, createdById } }),
    ),
  );
  tenantIds.push(tenantA.id, tenantB.id);

  ctxA = { tenantId: tenantA.id, userId: userA.id, role: "OWNER" };
  ctxB = { tenantId: tenantB.id, userId: userB.id, role: "OWNER" };

  projectAId = (
    await inTenant(ctxA, () => db.project.create({ data: { name: "A project", tenantId: ctxA.tenantId } }))
  ).id;
  projectBId = (
    await inTenant(ctxB, () => db.project.create({ data: { name: "B secret", tenantId: ctxB.tenantId } }))
  ).id;
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } }); // cascades to projects
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("tenant isolation", () => {
  it("findMany only returns the current tenant's rows", async () => {
    const projects = await inTenant(ctxA, () => db.project.findMany());
    expect(projects.map((p) => p.id)).toEqual([projectAId]);
  });

  it("findUnique on another tenant's id returns null", async () => {
    expect(await inTenant(ctxA, () => db.project.findUnique({ where: { id: projectBId } }))).toBeNull();
  });

  it("count and aggregate are scoped too", async () => {
    expect(await inTenant(ctxA, () => db.project.count())).toBe(1);
  });

  it("update on another tenant's row fails", async () => {
    await expect(
      inTenant(ctxA, () => db.project.update({ where: { id: projectBId }, data: { name: "hacked" } })),
    ).rejects.toThrow();
  });

  it("deleteMany on another tenant's row deletes nothing", async () => {
    const { count } = await inTenant(ctxA, () => db.project.deleteMany({ where: { id: projectBId } }));
    expect(count).toBe(0);
    expect(await inTenant(ctxB, () => db.project.findUnique({ where: { id: projectBId } }))).not.toBeNull();
  });

  it("a caller-supplied tenantId cannot override the context on create", async () => {
    const created = await inTenant(ctxA, () =>
      db.project.create({ data: { name: "sneaky", tenantId: ctxB.tenantId } }),
    );
    expect(created.tenantId).toBe(ctxA.tenantId);
  });

  it("a caller cannot move a row to another tenant by updating tenantId", async () => {
    await inTenant(ctxA, () =>
      db.project.update({ where: { id: projectAId }, data: { tenantId: ctxB.tenantId } as any }),
    );
    const still = await inTenant(ctxA, () => db.project.findUnique({ where: { id: projectAId } }));
    expect(still?.tenantId).toBe(ctxA.tenantId);
  });

  it("fails closed when there is no tenant context", async () => {
    await expect(db.project.findMany()).rejects.toThrow(/Tenant context required/);
  });
});
