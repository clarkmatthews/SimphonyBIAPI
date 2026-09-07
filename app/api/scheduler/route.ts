import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({
    enabled: settings.scheduler_enabled,
    timezone: settings.timezone,
    now: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const saved = await saveSettings({ scheduler_enabled: Boolean(body.enabled) });
  return NextResponse.json({ enabled: saved.scheduler_enabled });
}
