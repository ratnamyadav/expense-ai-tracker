-- Apply to the existing database before deploying the upgraded authentication app.
-- Existing account data and the legacy expires_at column are preserved.
ALTER TABLE "account"
  ADD COLUMN IF NOT EXISTS "access_token_expires_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "refresh_token_expires_at" timestamp with time zone;
