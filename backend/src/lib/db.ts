import { prisma } from "./prisma.js";
import { tenantContext } from "./tenant-context.js";

/**
 * TENANT-SAFE DATABASE CLIENT
 *
 * Wraps Prisma so that every query on a tenant-scoped model is automatically
 * limited to the current request's tenant. Think of it as a seatbelt: you still
 * write correct code, but if you forget a filter, this catches it.
 *
 * Design rules:
 *  1. FAIL CLOSED: no tenant context => throw. (Never silently return everything.)
 *  2. ALLOWLIST: an operation we don't know how to scope => throw.
 *  3. Only models that are purely tenant data are listed. TenantMember,
 *     TenantInvitation, etc. legitimately span tenants ("list MY workspaces"),
 *     so the tenant module filters them explicitly.
 *
 * Limitation: nested writes (e.g. `create: { comments: { create: [...] } }`) are not
 * rewritten. Keep tenant-data queries flat, and add Postgres Row Level Security
 * later as a second lock.
 */
const TENANT_SCOPED_MODELS = new Set<string>(["Project", "Post"]);

// Operations where we add `tenantId` to `where`
const FILTERED_OPERATIONS = new Set<string>([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
]);

// Never let a caller move a row to another tenant by editing tenantId
const stripTenantId = (data: any) => {
  if (data && typeof data === "object") delete data.tenantId;
};

export const db = prisma.$extends({
  name: "tenant-isolation",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!TENANT_SCOPED_MODELS.has(model)) return query(args);

const ctx = tenantContext.getStore();

console.log("PRISMA CONTEXT:", ctx);
        if (!ctx) {
          throw new Error(`Tenant context required for ${model}.${operation}`);
        }
        const { tenantId } = ctx;
        const a = (args ?? {}) as any;

        if (FILTERED_OPERATIONS.has(operation)) {
          a.where = { ...a.where, tenantId };
          if (operation.startsWith("update")) stripTenantId(a.data);
        } else if (operation === "create") {
          a.data = { ...a.data, tenantId }; // context always wins over caller input
        } else if (operation === "createMany" || operation === "createManyAndReturn") {
          a.data = Array.isArray(a.data)
            ? a.data.map((row: object) => ({ ...row, tenantId }))
            : { ...a.data, tenantId };
        } else if (operation === "upsert") {
          a.where = { ...a.where, tenantId };
          a.create = { ...a.create, tenantId };
          stripTenantId(a.update);
        } else {
          throw new Error(`Operation "${operation}" is not allowed on tenant-scoped model ${model}`);
        }

        return query(a);
      },
    },
  },
});

export type TenantDb = typeof db;
