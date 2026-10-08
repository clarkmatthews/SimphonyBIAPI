import { NextResponse } from 'next/server';
import { getProfile, listProfiles, updateProfile } from '@/lib/profiles';
import { getSettings, maskSettings, saveSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [settings, profiles] = await Promise.all([getSettings(), listProfiles()]);
  return NextResponse.json({
    ...maskSettings(settings),
    profiles: profiles.map((p) => ({ id: p.id, name: p.name })),
  });
}

export async function PUT(req: Request) {
  const body = await req.json();
  if (body.timezone !== undefined || body.scheduler_enabled !== undefined) {
    await saveSettings({
      timezone: body.timezone,
      scheduler_enabled: body.scheduler_enabled,
    });
  }
  if (body.profile_id) {
    const current = await getProfile(body.profile_id);
    if (!current) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    await updateProfile(body.profile_id, {
      auth_host: body.auth_host,
      app_host: body.app_host,
      client_id: body.client_id,
      api_username: body.api_username,
      api_password: body.api_password && body.api_password !== '••••••••' ? body.api_password : current.api_password,
      org_name: body.org_name,
      org_identifier: body.org_identifier,
      application_name: body.application_name,
    });
  }
  const [settings, profiles] = await Promise.all([getSettings(), listProfiles()]);
  return NextResponse.json({
    ...maskSettings(settings),
    profiles: profiles.map((p) => ({ id: p.id, name: p.name })),
  });
}
