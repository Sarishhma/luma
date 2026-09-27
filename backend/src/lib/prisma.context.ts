import { PrismaClient } from '../generated/prisma/client.js';
import { getTenantClient } from './tenant.js';
import { AsyncLocalStorage } from 'async_hooks';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// 1. Setup your database driver adapter (if using pg pool)
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// 2. Instantiate the base Prisma Client with the adapter
const prisma = new PrismaClient({ adapter });

// 3. Setup AsyncLocalStorage for request-scoped tenant tracking
export const tenantStorage = new AsyncLocalStorage<{ tenantId: string }>();

// 4. Export the dynamic tenant-aware proxy client
export const db = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const store = tenantStorage.getStore();
        const tenantId = store?.tenantId;

        // Fallback for background jobs/global tasks without a tenant context
        if (!tenantId) {
          return query(args);
        }

        // Dynamically create the tenant-scoped client
        const tenantClient = getTenantClient(prisma, tenantId);
        
        // @ts-ignore - dynamic dispatch to the specific model and operation
        return tenantClient[model][operation](args);
      },
    },
  },
});