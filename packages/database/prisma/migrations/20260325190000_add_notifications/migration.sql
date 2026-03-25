-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REVIEW_DONE', 'REVIEW_COMMENT', 'REWARD_GRANTED', 'SYSTEM_NOTICE');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientStudentId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "payload" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_recipientStudentId_createdAt_idx" ON "Notification"("recipientStudentId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientStudentId_isRead_createdAt_idx" ON "Notification"("recipientStudentId", "isRead", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientStudentId_fkey" FOREIGN KEY ("recipientStudentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
