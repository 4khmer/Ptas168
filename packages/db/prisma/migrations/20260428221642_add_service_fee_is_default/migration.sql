-- AlterTable
ALTER TABLE "service_fees" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: WATER + ELECTRICITY were auto-assigned on every new contract
-- before this column existed; preserve that behavior.
UPDATE "service_fees" SET "isDefault" = true WHERE "serviceType" IN ('WATER', 'ELECTRICITY');
