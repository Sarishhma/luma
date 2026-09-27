// src/lib/db.ts
import { PrismaClient } from "../generated/prisma/client.js";
import { getTenantClient } from "./tenant.js";
import { AsyncLocalStorage } from "async_hooks";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const tenantStorage = new AsyncLocalStorage<{ tenantId: string }>();

export const db = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }: any) {
        const store = tenantStorage.getStore();
        const tenantId = store?.tenantId;

        if (!tenantId) {
          return query(args);
        }

        const tenantClient = getTenantClient(prisma, tenantId);
        return tenantClient[model][operation](args);
      },
    },
  },
});