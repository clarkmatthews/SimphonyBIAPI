import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({
    ...settings,
    api_password: settings.api_password ? '••••••••' : '',
    has_password: Boolean(settings.api_password || process.env.API_PASSWORD),
  });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const current = await getSettings();
  const saved = await saveSettings({
    auth_host: body.auth_host,
    app_host: body.app_host,
    client_id: body.client_id,
    api_username: body.api_username,
    api_password: body.api_password && body.api_password !== '••••••••' ? body.api_password : current.api_password,
    org_name: body.org_name,
    org_identifier: body.org_identifier,
    timezone: body.timezone,
    scheduler_enabled: body.scheduler_enabled,
  });
  return NextResponse.json({
    ...saved,
    api_password: saved.api_password ? '••••••••' : '',
    has_password: Boolean(saved.api_password),
  });
}
