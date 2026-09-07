-- Move existing unprefixed scheduler tables to jobui_* if this database
-- was created before the prefix. Skip when only jobui_* tables exist.

DO $$
BEGIN
  IF to_regclass('public.events') IS NOT NULL THEN
    DROP TABLE IF EXISTS jobui_event_runs;
    DROP TABLE IF EXISTS jobui_activity_log;
    DROP TABLE IF EXISTS jobui_events;
    DROP TABLE IF EXISTS jobui_oidc_tokens;
    DROP TABLE IF EXISTS jobui_settings;
    DROP TABLE IF EXISTS jobui_categories;

    ALTER TABLE event_runs RENAME TO jobui_event_runs;
    ALTER TABLE activity_log RENAME TO jobui_activity_log;
    ALTER TABLE events RENAME TO jobui_events;
    ALTER TABLE oidc_tokens RENAME TO jobui_oidc_tokens;
    ALTER TABLE settings RENAME TO jobui_settings;
    ALTER TABLE categories RENAME TO jobui_categories;
  END IF;
END $$;

ALTER INDEX IF EXISTS event_runs_created_idx RENAME TO jobui_event_runs_created_idx;
ALTER INDEX IF EXISTS event_runs_status_idx RENAME TO jobui_event_runs_status_idx;
