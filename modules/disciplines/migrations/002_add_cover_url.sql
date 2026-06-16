-- Disciplines: add a cover/banner image. The existing "imageUrl" is the logo
-- (avatar); "coverUrl" is the wide banner shown behind it in the detail header.
ALTER TABLE "Discipline" ADD COLUMN IF NOT EXISTS "coverUrl" TEXT;
