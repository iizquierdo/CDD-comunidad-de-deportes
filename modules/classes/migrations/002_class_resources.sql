CREATE TABLE IF NOT EXISTS "ClassResource" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'GENERAL_FILE',
    "resourceUrl" TEXT,
    "storageKey" TEXT,
    "thumbnailUrl" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'STAFF_ONLY',
    "publishedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClassResource_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClassResource_classId_idx" ON "ClassResource"("classId", "active");
CREATE INDEX IF NOT EXISTS "ClassResource_visibility_idx" ON "ClassResource"("visibility");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClassResource_classId_fkey') THEN
        ALTER TABLE "ClassResource" ADD CONSTRAINT "ClassResource_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClassResource_createdById_fkey') THEN
        ALTER TABLE "ClassResource" ADD CONSTRAINT "ClassResource_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClassResource_updatedById_fkey') THEN
        ALTER TABLE "ClassResource" ADD CONSTRAINT "ClassResource_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
