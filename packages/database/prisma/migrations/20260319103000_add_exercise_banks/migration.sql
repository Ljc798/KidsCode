-- CreateEnum
CREATE TYPE "ExerciseCodingStatus" AS ENUM ('PENDING', 'REVIEWED');

-- CreateTable
CREATE TABLE "ExerciseBank" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "imageUrl" TEXT,
    "level" INTEGER NOT NULL,
    "multipleChoice" JSONB NOT NULL,
    "codingTitle" TEXT NOT NULL,
    "codingPrompt" TEXT NOT NULL,
    "codingPlaceholder" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ExerciseBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseSubmission" (
    "id" TEXT NOT NULL,
    "exerciseBankId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "multipleChoiceAnswers" JSONB NOT NULL,
    "multipleChoiceScore" INTEGER NOT NULL,
    "multipleChoiceTotal" INTEGER NOT NULL,
    "codingAnswer" TEXT NOT NULL,
    "codingStatus" "ExerciseCodingStatus" NOT NULL DEFAULT 'PENDING',
    "teacherFeedback" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ExerciseSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseBank_slug_key" ON "ExerciseBank"("slug");

-- CreateIndex
CREATE INDEX "ExerciseBank_level_isPublished_idx" ON "ExerciseBank"("level", "isPublished");

-- CreateIndex
CREATE INDEX "ExerciseBank_createdAt_idx" ON "ExerciseBank"("createdAt");

-- CreateIndex
CREATE INDEX "ExerciseSubmission_studentId_createdAt_idx" ON "ExerciseSubmission"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "ExerciseSubmission_exerciseBankId_createdAt_idx" ON "ExerciseSubmission"("exerciseBankId", "createdAt");

-- CreateIndex
CREATE INDEX "ExerciseSubmission_codingStatus_createdAt_idx" ON "ExerciseSubmission"("codingStatus", "createdAt");

-- AddForeignKey
ALTER TABLE "ExerciseSubmission" ADD CONSTRAINT "ExerciseSubmission_exerciseBankId_fkey" FOREIGN KEY ("exerciseBankId") REFERENCES "ExerciseBank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSubmission" ADD CONSTRAINT "ExerciseSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
