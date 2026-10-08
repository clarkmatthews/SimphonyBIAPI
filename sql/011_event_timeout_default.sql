-- Job timeout is the whole run. 3600 was stored but never enforced.
ALTER TABLE jobui_events ALTER COLUMN timeout_sec SET DEFAULT 90;

UPDATE jobui_events
SET timeout_sec = 90, updated_at = now()
WHERE timeout_sec = 3600;
