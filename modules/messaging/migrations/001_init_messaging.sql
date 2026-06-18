CREATE TABLE IF NOT EXISTS "MessageThread" (
  id            TEXT        PRIMARY KEY,
  "companyId"   TEXT        NOT NULL,
  "tutorUserId" TEXT        NOT NULL,
  "profesorUserId" TEXT     NOT NULL,
  subject       TEXT,
  "unreadTutor"   INTEGER   NOT NULL DEFAULT 0,
  "unreadProfesor" INTEGER  NOT NULL DEFAULT 0,
  "lastMessageAt" TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "MessageThread_tutor_profesor_company_key"
    UNIQUE ("companyId", "tutorUserId", "profesorUserId")
);

CREATE INDEX IF NOT EXISTS "MessageThread_company_idx"
  ON "MessageThread" ("companyId");

CREATE INDEX IF NOT EXISTS "MessageThread_tutor_idx"
  ON "MessageThread" ("tutorUserId");

CREATE INDEX IF NOT EXISTS "MessageThread_profesor_idx"
  ON "MessageThread" ("profesorUserId");

CREATE TABLE IF NOT EXISTS "DirectMessage" (
  id              TEXT        PRIMARY KEY,
  "threadId"      TEXT        NOT NULL REFERENCES "MessageThread"(id) ON DELETE CASCADE,
  "senderUserId"  TEXT        NOT NULL,
  body            TEXT        NOT NULL,
  "readAt"        TIMESTAMPTZ,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "DirectMessage_thread_idx"
  ON "DirectMessage" ("threadId", "createdAt");
