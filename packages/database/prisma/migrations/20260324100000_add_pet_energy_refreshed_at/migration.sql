-- Add pet energy recovery cursor timestamp.
ALTER TABLE "Student"
ADD COLUMN "petEnergyRefreshedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
