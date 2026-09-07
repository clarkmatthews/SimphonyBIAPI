import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/activity';
import { deleteEvent, getEvent, updateEvent } from '@/lib/events';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(event);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const settings = await getSettings();
  const event = await updateEvent(id, body, settings.timezone);
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await logActivity('event_updated', event.name, event.id);
  return NextResponse.json(event);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(id);
  await deleteEvent(id);
  if (event) await logActivity('event_deleted', event.name, event.id);
  return NextResponse.json({ ok: true });
}
