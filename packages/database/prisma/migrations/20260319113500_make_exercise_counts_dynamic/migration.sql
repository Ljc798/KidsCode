-- AlterTable
ALTER TABLE "ExerciseBank"
ADD COLUMN "codingTasks" JSONB;

-- AlterTable
ALTER TABLE "ExerciseSubmission"
ADD COLUMN "codingAnswers" JSONB;
