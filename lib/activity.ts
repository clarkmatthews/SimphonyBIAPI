import { query } from './db';

export async function logActivity(action: string, detail?: string, eventId?: string | null, runId?: string | null) {
  await query(
    'INSERT INTO jobui_activity_log (action, detail, event_id, run_id) VALUES ($1, $2, $3, $4)',
    [action, detail ?? null, eventId ?? null, runId ?? null]
  );
}

export async function appendRunLog(runId: string, line: string) {
  await query('UPDATE jobui_event_runs SET log_text = log_text || $2 WHERE id = $1', [runId, `${line}\n`]);
}
