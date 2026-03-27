CREATE TYPE "ExerciseSubject" AS ENUM ('CPP', 'SCRATCH');
CREATE TYPE "ExerciseDifficultyType" AS ENUM ('LEVEL', 'OTHER');

ALTER TABLE "ExerciseBank"
  ADD COLUMN "subject" "ExerciseSubject" NOT NULL DEFAULT 'CPP',
  ADD COLUMN "difficultyType" "ExerciseDifficultyType" NOT NULL DEFAULT 'LEVEL',
  ADD COLUMN "difficultyLevel" INTEGER;

UPDATE "ExerciseBank"
SET "difficultyLevel" = "level"
WHERE "difficultyType" = 'LEVEL' AND "difficultyLevel" IS NULL;

CREATE INDEX "ExerciseBank_subject_difficultyType_difficultyLevel_isPublish_idx"
  ON "ExerciseBank"("subject", "difficultyType", "difficultyLevel", "isPublished");
