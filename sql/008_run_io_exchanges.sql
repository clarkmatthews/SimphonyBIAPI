ALTER TABLE jobui_event_runs
    ADD COLUMN IF NOT EXISTS io_exchanges jsonb NOT NULL DEFAULT '[]'::jsonb;
