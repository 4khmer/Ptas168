-- Property-wide Telegram groups where bank bots (ABA, ACLEDA, …) post
-- payment confirmations. Our bot lives in these groups too and ingests
-- any bank message it sees into the global Payments list (no room
-- attribution — these are not per-room rooms).

CREATE TABLE "bank_notification_groups" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "chatTitle" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_notification_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bank_notification_groups_chatId_key" ON "bank_notification_groups"("chatId");
