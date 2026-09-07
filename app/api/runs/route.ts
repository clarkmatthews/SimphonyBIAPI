import { NextResponse } from 'next/server';
import { listRuns, upcomingEvents } from '@/lib/events';
import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const active = url.searchParams.get('active') === '1';
  const eventId = url.searchParams.get('eventId') || undefined;
  const [runs, upcoming, today] = await Promise.all([
    listRuns({ active, eventId, limit: active ? 50 : 100 }),
    upcomingEvents(24),
    queryOne<{ completed: string; failed: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'success' AND finished_at::date = CURRENT_DATE)::text AS completed,
         COUNT(*) FILTER (WHERE status = 'error' AND finished_at::date = CURRENT_DATE)::text AS failed
       FROM jobui_event_runs`
    ),
  ]);
  return NextResponse.json({ runs, upcoming, today });
}
