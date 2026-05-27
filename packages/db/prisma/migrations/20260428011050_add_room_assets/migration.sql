-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "assets" JSONB NOT NULL DEFAULT '[]';
