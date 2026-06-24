-- Migration: create ActivityLog table
-- Run with: psql -d yourdb -f backend/activity-migration.sql

CREATE TABLE IF NOT EXISTS "ActivityLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "petId" UUID NOT NULL REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "type" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "date" DATE NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "ActivityLog_petId_idx" ON "ActivityLog"("petId");
CREATE INDEX IF NOT EXISTS "ActivityLog_date_idx" ON "ActivityLog"("date" DESC);
