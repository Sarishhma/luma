import type { PrismaClient } from "../generated/prisma/client.js";

// Define the models in your schema that actually contain a `tenantId` field
const TENANT_SCOPED_MODELS = [
  'Project',
  'Post',
  'AuditLog',
  'TenantMember',
  'TenantInvitation',
] as const;

// src/lib/tenant.ts
export function getTenantClient(prisma: any, tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          const TENANT_SCOPED_MODELS = [
            'Project',
            'Post',
            'AuditLog',
            'TenantMember',
            'TenantInvitation',
          ] as const;

          if (!model || !TENANT_SCOPED_MODELS.includes(model)) {
            return query(args);
          }

          const mutableArgs = args || {};

          // --- READ OPERATIONS ---
          if ([
            'findMany', 
            'findFirst', 
            'findFirstOrThrow', 
            'findUnique', 
            'findUniqueOrThrow'
          ].includes(operation)) {
            mutableArgs.where = { ...mutableArgs.where, tenantId };
          }

          // --- CREATE OPERATIONS ---
          if (operation === 'create') {
            mutableArgs.data = { ...mutableArgs.data, tenantId };
          }
          
          if (operation === 'createMany' && mutableArgs.data) {
            mutableArgs.data = Array.isArray(mutableArgs.data)
              ? mutableArgs.data.map((item: any) => ({ ...item, tenantId }))
              : { ...mutableArgs.data, tenantId };
          }

          // --- UPDATE & DELETE OPERATIONS ---
          if ([
            'update', 
            'updateMany', 
            'upsert', 
            'delete', 
            'deleteMany'
          ].includes(operation)) {
            mutableArgs.where = { ...mutableArgs.where, tenantId };
            
            if (operation === 'upsert') {
              mutableArgs.create = { ...mutableArgs.create, tenantId };
            }
          }

          return query(mutableArgs);
        },
      },
    },
  });
}