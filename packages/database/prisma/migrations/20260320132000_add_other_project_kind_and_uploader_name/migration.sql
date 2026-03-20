ALTER TYPE "StudentProjectKind" ADD VALUE IF NOT EXISTS 'OTHER';

ALTER TABLE "StudentProject"
ADD COLUMN "uploaderName" TEXT;
