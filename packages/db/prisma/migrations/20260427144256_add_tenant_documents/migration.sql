-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "documents" JSONB NOT NULL DEFAULT '[]';
