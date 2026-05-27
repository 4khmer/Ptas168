-- CreateTable
CREATE TABLE "bank_payments" (
    "id"            TEXT NOT NULL,
    "bank"          TEXT NOT NULL,
    "amount"        DECIMAL(14,4) NOT NULL,
    "currency"      TEXT NOT NULL,
    "senderName"    TEXT,
    "senderAccount" TEXT,
    "transactionId" TEXT NOT NULL,
    "apv"           TEXT,
    "paidAt"        TIMESTAMP(3) NOT NULL,
    "rawText"       TEXT NOT NULL,
    "chatId"        TEXT,
    "messageId"     INTEGER,
    "receivedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_payments_transactionId_key" ON "bank_payments"("transactionId");

-- CreateIndex
CREATE INDEX "bank_payments_paidAt_idx" ON "bank_payments"("paidAt");

-- CreateIndex
CREATE INDEX "bank_payments_bank_idx" ON "bank_payments"("bank");
