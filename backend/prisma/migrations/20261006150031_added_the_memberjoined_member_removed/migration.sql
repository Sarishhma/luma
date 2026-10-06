/*
  Warnings:

  - The values [CANCLED] on the enum `SubscriptionStatus` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `invitedById` to the `TenantInvitation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEventType" ADD VALUE 'MEMBER_JOINED';
ALTER TYPE "AuditEventType" ADD VALUE 'MEMBER_ROLE_CHANGED';

-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionStatus_new" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID');
ALTER TABLE "public"."Tenant" ALTER COLUMN "subscriptionStatus" DROP DEFAULT;
ALTER TABLE "Tenant" ALTER COLUMN "subscriptionStatus" TYPE "SubscriptionStatus_new" USING ("subscriptionStatus"::text::"SubscriptionStatus_new");
ALTER TYPE "SubscriptionStatus" RENAME TO "SubscriptionStatus_old";
ALTER TYPE "SubscriptionStatus_new" RENAME TO "SubscriptionStatus";
DROP TYPE "public"."SubscriptionStatus_old";
ALTER TABLE "Tenant" ALTER COLUMN "subscriptionStatus" SET DEFAULT 'TRIALING';
COMMIT;

-- AlterTable
ALTER TABLE "TenantInvitation" ADD COLUMN     "invitedById" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Post_id_tenantId_key" ON "Post"("id", "tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "TenantInvitation_invitedById_idx" ON "TenantInvitation"("invitedById");

-- AddForeignKey
ALTER TABLE "TenantInvitation" ADD CONSTRAINT "TenantInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
