-- Scheduler / Integration Manager tables. Prefixed jobui_ to keep them
-- distinct from Oracle Simphony BI warehouse tables.

CREATE TABLE IF NOT EXISTS jobui_settings (
    id                 integer PRIMARY KEY CHECK (id = 1),
    auth_host          text,
    app_host           text,
    client_id          text,
    api_username       text,
    api_password       text,
    org_name           text,
    org_identifier     text,
    timezone           text NOT NULL DEFAULT 'America/Los_Angeles',
    scheduler_enabled  boolean NOT NULL DEFAULT true,
    updated_at         timestamptz NOT NULL DEFAULT now()
);

INSERT INTO jobui_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS jobui_categories (
    id     text PRIMARY KEY,
    name   text NOT NULL,
    color  text NOT NULL DEFAULT '#2bb3a8',
    sort   integer NOT NULL DEFAULT 0
);

INSERT INTO jobui_categories (id, name, color, sort) VALUES
    ('daily', 'Daily Totals', '#2bb3a8', 1),
    ('quarterHour', 'Quarter Hour Totals', '#4ea3e0', 2),
    ('definition', 'Definitions', '#c9a227', 3)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color, sort = EXCLUDED.sort;

CREATE TABLE IF NOT EXISTS jobui_events (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name         text NOT NULL,
    category_id  text NOT NULL REFERENCES jobui_categories(id),
    endpoint_id  text NOT NULL,
    enabled      boolean NOT NULL DEFAULT false,
    schedule     jsonb NOT NULL,
    target       jsonb NOT NULL,
    timeout_sec  integer NOT NULL DEFAULT 3600,
    notes        text,
    next_run_at  timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobui_event_runs (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id      uuid REFERENCES jobui_events(id) ON DELETE SET NULL,
    event_name    text NOT NULL,
    endpoint_id   text NOT NULL,
    trigger       text NOT NULL DEFAULT 'schedule',
    status        text NOT NULL DEFAULT 'queued',
    started_at    timestamptz,
    finished_at   timestamptz,
    rows_upserted integer NOT NULL DEFAULT 0,
    locations_done integer NOT NULL DEFAULT 0,
    error         text,
    log_text      text NOT NULL DEFAULT '',
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jobui_event_runs_created_idx ON jobui_event_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS jobui_event_runs_status_idx ON jobui_event_runs (status);

CREATE TABLE IF NOT EXISTS jobui_activity_log (
    id         bigserial PRIMARY KEY,
    action     text NOT NULL,
    detail     text,
    event_id   uuid,
    run_id     uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobui_oidc_tokens (
    id            integer PRIMARY KEY CHECK (id = 1),
    id_token      text,
    refresh_token text,
    expires_at    timestamptz,
    obtained_at   timestamptz,
    updated_at    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO jobui_oidc_tokens (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

INSERT INTO jobui_events (name, category_id, endpoint_id, enabled, schedule, target, notes, next_run_at)
SELECT
    'Operations Daily Totals',
    'daily',
    'getOperationsDailyTotals',
    false,
    '{"type":"daily","time":"02:15"}'::jsonb,
    '{"locRefs":"all","busDtMode":"latest"}'::jsonb,
    'Seeded sample. Enable after Oracle settings are saved.',
    NULL
WHERE NOT EXISTS (SELECT 1 FROM jobui_events WHERE endpoint_id = 'getOperationsDailyTotals' AND name = 'Operations Daily Totals');

INSERT INTO jobui_events (name, category_id, endpoint_id, enabled, schedule, target, notes, next_run_at)
SELECT
    'Operations Quarter Hour Totals',
    'quarterHour',
    'getOperationsQuarterHourTotals',
    false,
    '{"type":"interval","everyMinutes":15}'::jsonb,
    '{"locRefs":"all","busDtMode":"latest"}'::jsonb,
    'Seeded 15-minute poller for quarter-hour operations totals.',
    NULL
WHERE NOT EXISTS (SELECT 1 FROM jobui_events WHERE endpoint_id = 'getOperationsQuarterHourTotals' AND name = 'Operations Quarter Hour Totals');

INSERT INTO jobui_events (name, category_id, endpoint_id, enabled, schedule, target, notes, next_run_at)
SELECT
    'Location Dimensions',
    'definition',
    'getLocationDimensions',
    false,
    '{"type":"daily","time":"01:30"}'::jsonb,
    '{"locRefs":"all","busDtMode":"latest"}'::jsonb,
    'Seeded daily location dimension refresh.',
    NULL
WHERE NOT EXISTS (SELECT 1 FROM jobui_events WHERE endpoint_id = 'getLocationDimensions' AND name = 'Location Dimensions');
