-- CreateEnum
CREATE TYPE "AdminNotificationCategory" AS ENUM ('EXERCISE', 'CLASSROOM_PROJECT');

-- CreateTable
CREATE TABLE "AdminNotification" (
    "id" TEXT NOT NULL,
    "recipientAdminUserId" TEXT NOT NULL,
    "category" "AdminNotificationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "payload" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminNotification_recipientAdminUserId_createdAt_idx" ON "AdminNotification"("recipientAdminUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminNotification_recipientAdminUserId_isRead_createdAt_idx" ON "AdminNotification"("recipientAdminUserId", "isRead", "createdAt");

-- AddForeignKey
ALTER TABLE "AdminNotification" ADD CONSTRAINT "AdminNotification_recipientAdminUserId_fkey" FOREIGN KEY ("recipientAdminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
