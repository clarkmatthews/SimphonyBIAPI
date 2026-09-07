import { query, queryOne } from './db';
import { computeNextRun } from './schedule';
import type { EventRow, EventRun, ScheduleConfig, TargetConfig } from './types';

function parseEvent(row: Record<string, unknown>): EventRow {
  return {
    ...(row as unknown as EventRow),
    schedule: typeof row.schedule === 'string' ? JSON.parse(row.schedule) : (row.schedule as ScheduleConfig),
    target: typeof row.target === 'string' ? JSON.parse(row.target) : (row.target as TargetConfig),
  };
}

export async function listEvents() {
  const rows = await query('SELECT * FROM jobui_events ORDER BY name');
  return rows.map(parseEvent);
}

export async function getEvent(id: string) {
  const row = await queryOne('SELECT * FROM jobui_events WHERE id = $1', [id]);
  return row ? parseEvent(row) : null;
}

export async function createEvent(
  input: Omit<EventRow, 'id' | 'created_at' | 'updated_at' | 'next_run_at'> & { next_run_at?: string | null },
  timezone = 'America/Los_Angeles'
) {
  const next = input.enabled ? computeNextRun(input.schedule, timezone) : null;
  const row = await queryOne(
    `INSERT INTO jobui_events (name, category_id, endpoint_id, enabled, schedule, target, timeout_sec, notes, next_run_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      input.name,
      input.category_id,
      input.endpoint_id,
      input.enabled,
      JSON.stringify(input.schedule),
      JSON.stringify(input.target),
      input.timeout_sec,
      input.notes,
      next,
    ]
  );
  return parseEvent(row!);
}

export async function updateEvent(id: string, input: Partial<EventRow>, timezone = 'America/Los_Angeles') {
  const current = await getEvent(id);
  if (!current) return null;
  const next = { ...current, ...input };
  const nextRun = next.enabled ? computeNextRun(next.schedule, timezone) : null;
  const row = await queryOne(
    `UPDATE jobui_events SET
      name = $2, category_id = $3, endpoint_id = $4, enabled = $5, schedule = $6, target = $7,
      timeout_sec = $8, notes = $9, next_run_at = $10, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [
      id,
      next.name,
      next.category_id,
      next.endpoint_id,
      next.enabled,
      JSON.stringify(next.schedule),
      JSON.stringify(next.target),
      next.timeout_sec,
      next.notes,
      nextRun,
    ]
  );
  return row ? parseEvent(row) : null;
}

export async function deleteEvent(id: string) {
  await queryOne('DELETE FROM jobui_events WHERE id = $1', [id]);
}

export async function listRuns(opts: { active?: boolean; eventId?: string; limit?: number } = {}) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (opts.active) where.push(`status IN ('queued','running')`);
  if (opts.eventId) {
    params.push(opts.eventId);
    where.push(`event_id = $${params.length}`);
  }
  params.push(opts.limit ?? 100);
  const sql = `SELECT * FROM jobui_event_runs ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT $${params.length}`;
  return query<EventRun>(sql, params);
}

export async function getRun(id: string) {
  return queryOne<EventRun>('SELECT * FROM jobui_event_runs WHERE id = $1', [id]);
}

export async function createRun(event: EventRow, trigger: string) {
  return queryOne<EventRun>(
    `INSERT INTO jobui_event_runs (event_id, event_name, endpoint_id, trigger, status)
     VALUES ($1,$2,$3,$4,'queued') RETURNING *`,
    [event.id, event.name, event.endpoint_id, trigger]
  );
}

export async function upcomingEvents(hours = 24) {
  return listEvents().then((events) =>
    events
      .filter((e) => e.enabled && e.next_run_at && new Date(e.next_run_at).getTime() <= Date.now() + hours * 3600 * 1000)
      .sort((a, b) => new Date(a.next_run_at!).getTime() - new Date(b.next_run_at!).getTime())
  );
}
