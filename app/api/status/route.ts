import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { listEvents } from '@/lib/events';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [settings, events, counts] = await Promise.all([
    getSettings(),
    listEvents(),
    queryOne<{ completed: string; failed: string; avg_ms: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'success' AND finished_at::date = CURRENT_DATE)::text AS completed,
         COUNT(*) FILTER (WHERE status = 'error' AND finished_at::date = CURRENT_DATE)::text AS failed,
         COALESCE(AVG(EXTRACT(EPOCH FROM (finished_at - started_at))) FILTER (WHERE finished_at IS NOT NULL AND finished_at::date = CURRENT_DATE), 0)::text AS avg_ms
       FROM jobui_event_runs`
    ),
  ]);
  const completed = Number(counts?.completed || 0);
  const failed = Number(counts?.failed || 0);
  return NextResponse.json({
    now: new Date().toISOString(),
    timezone: settings.timezone,
    schedulerEnabled: settings.scheduler_enabled,
    totalEvents: events.length,
    enabledEvents: events.filter((e) => e.enabled).length,
    categories: 3,
    jobsCompletedToday: completed,
    jobsFailedToday: failed,
    successRate: completed + failed ? Math.round((completed / (completed + failed)) * 100) : 100,
    avgDurationSec: Math.round(Number(counts?.avg_ms || 0)),
  });
}
