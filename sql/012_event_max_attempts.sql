-- Attempts are the BI data calls after authentication succeeds.
ALTER TABLE jobui_events ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 3;
