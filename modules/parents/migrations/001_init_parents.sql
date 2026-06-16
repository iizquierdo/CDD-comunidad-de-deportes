-- A "Padre" is a User with the Tutor role (linked to students via StudentTutor).
-- No new table is needed; we only add the extra contact columns the ABM captures.
-- Mirrors the runtime "ensureUserColumns" pattern (language/accessCompanyIds/etc.).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "document" TEXT;
