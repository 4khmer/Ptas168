-- AlterTable
ALTER TABLE "bank_payments" ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "telegram_links" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "chatTitle" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_links_chatId_key" ON "telegram_links"("chatId");

-- CreateIndex
CREATE INDEX "telegram_links_userId_idx" ON "telegram_links"("userId");

-- CreateIndex
CREATE INDEX "bank_payments_userId_paidAt_idx" ON "bank_payments"("userId", "paidAt");

-- AddForeignKey
ALTER TABLE "bank_payments" ADD CONSTRAINT "bank_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_links" ADD CONSTRAINT "telegram_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
