import { query, queryOne } from './db';
import { logActivity } from './activity';
import { executeRun } from './bi/sync';
import { computeNextRun } from './schedule';
import { getSettings } from './settings';
import type { EventRow, ScheduleConfig, TargetConfig } from './types';
import { createRun, getEvent } from './events';

let timer: NodeJS.Timeout | null = null;
let ticking = false;
const running = new Set<string>();

function parseEvent(row: Record<string, unknown>): EventRow {
  return {
    ...(row as unknown as EventRow),
    schedule: typeof row.schedule === 'string' ? JSON.parse(row.schedule) : (row.schedule as ScheduleConfig),
    target: typeof row.target === 'string' ? JSON.parse(row.target) : (row.target as TargetConfig),
  };
}

async function launch(event: EventRow, trigger: string) {
  if (running.has(event.id)) return;
  running.add(event.id);
  const run = await createRun(event, trigger);
  if (!run) {
    running.delete(event.id);
    return;
  }
  await logActivity('job_start', `${event.name} (${trigger})`, event.id, run.id);
  const settings = await getSettings();
  void (async () => {
    try {
      await executeRun(run.id, event, settings);
    } catch (err) {
      const aborted = Boolean((err as { aborted?: boolean }).aborted);
      const message = err instanceof Error ? err.message : String(err);
      await queryOne(
        `UPDATE jobui_event_runs SET status = $2, finished_at = now(), error = $3, log_text = log_text || $4 WHERE id = $1`,
        [run.id, aborted ? 'aborted' : 'error', message, `${message}\n`]
      );
      await logActivity(aborted ? 'job_aborted' : 'job_error', `${event.name}: ${message}`, event.id, run.id);
    } finally {
      const fresh = await getEvent(event.id);
      if (fresh?.enabled) {
        const next = computeNextRun(fresh.schedule, settings.timezone);
        await queryOne('UPDATE jobui_events SET next_run_at = $2 WHERE id = $1', [event.id, next]);
      }
      running.delete(event.id);
    }
  })();
  return run;
}

export async function runEventNow(eventId: string) {
  const event = await getEvent(eventId);
  if (!event) throw new Error('Event not found');
  return launch(event, 'manual');
}

async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    const settings = await getSettings();
    if (!settings.scheduler_enabled) return;
    const due = await query(
      `SELECT * FROM jobui_events
       WHERE enabled = true AND next_run_at IS NOT NULL AND next_run_at <= now()`
    );
    for (const row of due) {
      const event = parseEvent(row);
      const active = await queryOne(
        `SELECT id FROM jobui_event_runs WHERE event_id = $1 AND status IN ('queued','running') LIMIT 1`,
        [event.id]
      );
      if (active) continue;
      await launch(event, 'schedule');
    }
  } catch (err) {
    console.error('scheduler tick failed', err);
  } finally {
    ticking = false;
  }
}

export function startScheduler() {
  if (timer) return;
  console.log('Simphony BI scheduler started (15s tick)');
  void tick();
  timer = setInterval(() => void tick(), 15_000);
}

export function stopScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}
