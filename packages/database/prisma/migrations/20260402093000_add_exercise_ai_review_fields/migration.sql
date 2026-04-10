-- Create enum for AI review status on exercise submissions
CREATE TYPE "ExerciseAiReviewStatus" AS ENUM ('PENDING', 'DONE', 'FAILED');

-- Add AI first-pass review fields
ALTER TABLE "ExerciseSubmission"
  ADD COLUMN "aiReviewStatus" "ExerciseAiReviewStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "aiSuggestedScore" INTEGER,
  ADD COLUMN "aiSuggestedFeedback" TEXT,
  ADD COLUMN "aiSuggestionJson" JSONB,
  ADD COLUMN "aiWorkflowRunId" TEXT,
  ADD COLUMN "aiReviewedAt" TIMESTAMPTZ(3);

-- Index for queue / list filtering by AI review status
CREATE INDEX "ExerciseSubmission_aiReviewStatus_createdAt_idx"
  ON "ExerciseSubmission"("aiReviewStatus", "createdAt");
