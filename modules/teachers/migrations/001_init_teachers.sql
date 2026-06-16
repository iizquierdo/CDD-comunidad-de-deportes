-- A "Profesor" is a User with the Profesor role (linked to classes via ClassTeacher).
-- No new table is needed; we only add the extra contact columns the ABM captures.
-- Mirrors the runtime "ensureUserColumns" pattern (language/accessCompanyIds/etc.)
-- and reuses the same columns the Parents module adds.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "document" TEXT;
