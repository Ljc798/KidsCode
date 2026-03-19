-- Add account login + class field (idempotent)

-- User.account
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "account" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_account_key" ON "User" ("account");

-- User.phone becomes nullable (students may not have a phone)
DO $$ BEGIN
  ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Student.className
ALTER TABLE "Student"
  ADD COLUMN IF NOT EXISTS "className" TEXT;

