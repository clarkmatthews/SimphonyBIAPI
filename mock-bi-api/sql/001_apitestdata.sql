CREATE TABLE IF NOT EXISTS apitestdata_locations (
  loc_ref text PRIMARY KEY,
  name text NOT NULL,
  open_dt date,
  active boolean NOT NULL DEFAULT true,
  src_name text,
  src_ver text,
  tz text NOT NULL DEFAULT 'America/Los_Angeles',
  curr text NOT NULL DEFAULT 'USD',
  addr_ln1 text,
  addr_ln2 text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS apitestdata_revenue_centers (
  loc_ref text NOT NULL REFERENCES apitestdata_locations (loc_ref) ON DELETE CASCADE,
  rvc_num integer NOT NULL,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (loc_ref, rvc_num)
);

CREATE TABLE IF NOT EXISTS apitestdata_dimension_items (
  kind text NOT NULL,
  loc_ref text NOT NULL REFERENCES apitestdata_locations (loc_ref) ON DELETE CASCADE,
  item_num text NOT NULL,
  name text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, loc_ref, item_num)
);

CREATE INDEX IF NOT EXISTS apitestdata_dimension_items_loc_kind_idx
  ON apitestdata_dimension_items (loc_ref, kind);

CREATE TABLE IF NOT EXISTS apitestdata_daily_snapshots (
  operation text NOT NULL,
  loc_ref text NOT NULL,
  bus_dt date NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (operation, loc_ref, bus_dt)
);

CREATE TABLE IF NOT EXISTS apitestdata_qh_snapshots (
  operation text NOT NULL,
  loc_ref text NOT NULL,
  bus_dt date NOT NULL,
  clsd_bus_prd integer NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (operation, loc_ref, bus_dt, clsd_bus_prd)
);

CREATE TABLE IF NOT EXISTS apitestdata_oidc_sessions (
  id text PRIMARY KEY,
  client_id text,
  redirect_uri text,
  code_challenge text,
  code_challenge_method text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS apitestdata_oidc_codes (
  code text PRIMARY KEY,
  session_id text,
  username text,
  orgname text,
  client_id text,
  redirect_uri text,
  code_challenge text,
  code_challenge_method text,
  used boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS apitestdata_oidc_tokens (
  refresh_token text PRIMARY KEY,
  id_token text NOT NULL,
  username text,
  orgname text,
  client_id text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
