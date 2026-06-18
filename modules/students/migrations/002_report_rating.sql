-- Add rating fields to StudentReport
ALTER TABLE "StudentReport" ADD COLUMN IF NOT EXISTS "rating" INTEGER CHECK ("rating" >= 1 AND "rating" <= 5);
ALTER TABLE "StudentReport" ADD COLUMN IF NOT EXISTS "ratingTheme" TEXT DEFAULT 'stars';
