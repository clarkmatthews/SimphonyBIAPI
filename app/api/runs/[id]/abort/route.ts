import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await queryOne<{ event_id: string; event_name: string }>(
    `UPDATE jobui_event_runs SET status = 'aborted', log_text = log_text || 'Abort requested.\n' WHERE id = $1 AND status IN ('queued','running') RETURNING event_id, event_name`,
    [id]
  );
  if (run) await logActivity('job_abort_requested', run.event_name, run.event_id, id);
  return NextResponse.json({ ok: Boolean(run) });
}
