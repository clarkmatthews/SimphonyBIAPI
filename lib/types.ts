export type CategoryId = 'daily' | 'quarterHour' | 'definition';

export type ScheduleConfig =
  | { type: 'interval'; everyMinutes: number }
  | { type: 'daily'; time: string }
  | { type: 'weekly'; daysOfWeek: number[]; time: string };

export type TargetConfig = {
  locRefs: 'all' | string[];
  busDtMode: 'latest' | 'fixed';
  busDt?: string;
};

export type Settings = {
  id: number;
  auth_host: string | null;
  app_host: string | null;
  client_id: string | null;
  api_username: string | null;
  api_password: string | null;
  org_name: string | null;
  org_identifier: string | null;
  timezone: string;
  scheduler_enabled: boolean;
  updated_at: string;
};

export type EventRow = {
  id: string;
  name: string;
  category_id: CategoryId;
  endpoint_id: string;
  enabled: boolean;
  schedule: ScheduleConfig;
  target: TargetConfig;
  timeout_sec: number;
  notes: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EventRun = {
  id: string;
  event_id: string | null;
  event_name: string;
  endpoint_id: string;
  trigger: string;
  status: 'queued' | 'running' | 'success' | 'error' | 'aborted';
  started_at: string | null;
  finished_at: string | null;
  rows_upserted: number;
  locations_done: number;
  error: string | null;
  log_text: string;
  created_at: string;
};

export type FieldMap = {
  column: string;
  sources: string[];
};

export type EndpointDef = {
  id: string;
  name: string;
  operation: string;
  category: CategoryId;
  table: string;
  kind: 'totals' | 'definition' | 'latestBusDt';
  rootArray?: string;
  rvcArray?: string;
  itemArray?: string;
  periodArray?: string;
  uniqueKey: string[];
  fields: FieldMap[];
};
