-- CreateEnum
CREATE TYPE "StudentProjectKind" AS ENUM ('SCRATCH', 'CPP');

-- CreateTable
CREATE TABLE "StudentProject" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "kind" "StudentProjectKind" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "StudentProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentProject_studentId_updatedAt_idx" ON "StudentProject"("studentId", "updatedAt");

-- CreateIndex
CREATE INDEX "StudentProject_kind_createdAt_idx" ON "StudentProject"("kind", "createdAt");

-- AddForeignKey
ALTER TABLE "StudentProject" ADD CONSTRAINT "StudentProject_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
