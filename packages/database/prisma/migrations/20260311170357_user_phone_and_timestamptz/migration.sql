-- Rename email to phone (keeps existing data)
ALTER TABLE "User" RENAME COLUMN "email" TO "phone";

-- Recreate unique index with the new column name
DROP INDEX IF EXISTS "User_email_key";
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");

-- Convert timestamp fields to timestamptz, interpreting existing values as Asia/Shanghai (UTC+8)
ALTER TABLE "User"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'Asia/Shanghai');

ALTER TABLE "Student"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'Asia/Shanghai');

ALTER TABLE "Parent"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'Asia/Shanghai');

ALTER TABLE "Course"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'Asia/Shanghai');

ALTER TABLE "Game"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'Asia/Shanghai');

ALTER TABLE "GameSession"
  ALTER COLUMN "playedAt" TYPE TIMESTAMPTZ(3) USING ("playedAt" AT TIME ZONE 'Asia/Shanghai');

ALTER TABLE "LearningProgress"
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'Asia/Shanghai');

