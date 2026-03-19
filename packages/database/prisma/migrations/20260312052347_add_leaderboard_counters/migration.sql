-- CreateEnum
CREATE TYPE "StudentActivityKind" AS ENUM ('MINIGAME_PLAY', 'CODE_SUBMIT', 'POINTS_AWARD');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "codeSubmissions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gamesCompleted" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "StudentActivity" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "kind" "StudentActivityKind" NOT NULL,
    "miniGameSlug" TEXT,
    "ok" BOOLEAN,
    "pointsRequested" INTEGER,
    "pointsAdded" INTEGER,
    "code" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentActivity_studentId_createdAt_idx" ON "StudentActivity"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "StudentActivity_kind_createdAt_idx" ON "StudentActivity"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "StudentActivity_miniGameSlug_createdAt_idx" ON "StudentActivity"("miniGameSlug", "createdAt");

-- AddForeignKey
ALTER TABLE "StudentActivity" ADD CONSTRAINT "StudentActivity_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
