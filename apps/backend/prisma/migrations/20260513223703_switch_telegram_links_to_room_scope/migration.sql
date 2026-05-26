-- Switch Telegram linking from per-user to per-room.
--
-- telegram_links: drop the userId column + FK, drop and recreate the
-- table contents (any existing dev rows are not preserved), add a
-- unique roomId column with FK CASCADE to rooms.
--
-- bank_payments: drop the userId column + FK + composite index, add
-- a roomId column + FK SetNull + composite index so payment rows are
-- attributed to the room whose linked chat sent the confirmation.

-- 1. telegram_links: drop old user-scoped shape (also drops rows).
DROP TABLE IF EXISTS "telegram_links";

CREATE TABLE "telegram_links" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "chatTitle" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "telegram_links_chatId_key" ON "telegram_links"("chatId");
CREATE UNIQUE INDEX "telegram_links_roomId_key" ON "telegram_links"("roomId");

ALTER TABLE "telegram_links"
  ADD CONSTRAINT "telegram_links_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "rooms"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. bank_payments: swap userId → roomId.
ALTER TABLE "bank_payments" DROP CONSTRAINT IF EXISTS "bank_payments_userId_fkey";
DROP INDEX IF EXISTS "bank_payments_userId_paidAt_idx";
ALTER TABLE "bank_payments" DROP COLUMN IF EXISTS "userId";

ALTER TABLE "bank_payments" ADD COLUMN "roomId" TEXT;

CREATE INDEX "bank_payments_roomId_paidAt_idx" ON "bank_payments"("roomId", "paidAt");

ALTER TABLE "bank_payments"
  ADD CONSTRAINT "bank_payments_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "rooms"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
