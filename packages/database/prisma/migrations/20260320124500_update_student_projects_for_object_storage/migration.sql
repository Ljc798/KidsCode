ALTER TABLE "StudentProject"
ALTER COLUMN "content" DROP NOT NULL;

ALTER TABLE "StudentProject"
ADD COLUMN "size" INTEGER,
ADD COLUMN "bucket" TEXT,
ADD COLUMN "objectKey" TEXT,
ADD COLUMN "storageProvider" TEXT;

UPDATE "StudentProject"
SET "size" = CASE
  WHEN "kind" = 'CPP' THEN char_length(COALESCE("content", ''))
  ELSE octet_length(COALESCE("content", ''))
END
WHERE "size" IS NULL;
