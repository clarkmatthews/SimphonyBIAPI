import { NextResponse } from 'next/server';
import { activateProfile, listProfiles } from '@/lib/profiles';
import { maskSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const settings = await activateProfile(id);
    const profiles = await listProfiles();
    return NextResponse.json({
      ...maskSettings(settings),
      profiles: profiles.map((p) => ({ id: p.id, name: p.name })),
    });
  } catch (err) {
    const status = Number((err as { status?: number }).status || 500);
    const message = err instanceof Error ? err.message : 'Request failed';
    return NextResponse.json({ error: message }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}
