-- ============================================================
-- Activity Logs Schema Migration
-- ============================================================

CREATE TABLE IF NOT EXISTS "ActivityLog" (
    "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "petId"             UUID NOT NULL,
    "type"              TEXT NOT NULL, -- 'exercise', 'nutrition', 'hydration', 'sleep'
    "value"             DOUBLE PRECISION NOT NULL,
    "date"              DATE NOT NULL,
    "createdAt"         TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT "ActivityLog_petId_fkey"
    FOREIGN KEY ("petId")
    REFERENCES "Pet"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ActivityLog_petId_idx" ON "ActivityLog"("petId");
CREATE INDEX IF NOT EXISTS "ActivityLog_date_idx" ON "ActivityLog"("date" DESC);
