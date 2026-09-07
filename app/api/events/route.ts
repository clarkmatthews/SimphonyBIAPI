import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/activity';
import { ENDPOINTS } from '@/lib/bi/catalog';
import { createEvent, listEvents } from '@/lib/events';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [events, settings] = await Promise.all([listEvents(), getSettings()]);
  return NextResponse.json({ events, endpoints: ENDPOINTS, timezone: settings.timezone });
}

export async function POST(req: Request) {
  const body = await req.json();
  const settings = await getSettings();
  const event = await createEvent(
    {
      name: body.name,
      category_id: body.category_id,
      endpoint_id: body.endpoint_id,
      enabled: Boolean(body.enabled),
      schedule: body.schedule,
      target: body.target,
      timeout_sec: Number(body.timeout_sec || 3600),
      notes: body.notes || null,
    },
    settings.timezone
  );
  await logActivity('event_created', event.name, event.id);
  return NextResponse.json(event);
}
