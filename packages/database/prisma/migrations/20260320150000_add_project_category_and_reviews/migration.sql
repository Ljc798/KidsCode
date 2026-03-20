CREATE TYPE "StudentProjectCategory" AS ENUM ('PERSONAL', 'CLASSROOM');

CREATE TYPE "StudentProjectReviewStatus" AS ENUM ('NONE', 'PENDING', 'REVIEWED');

ALTER TABLE "StudentProject"
ADD COLUMN "category" "StudentProjectCategory" NOT NULL DEFAULT 'PERSONAL',
ADD COLUMN "weekNumber" INTEGER,
ADD COLUMN "ideaNote" TEXT,
ADD COLUMN "reviewStatus" "StudentProjectReviewStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "teacherComment" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMPTZ(3);
