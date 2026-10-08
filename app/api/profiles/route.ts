import { NextResponse } from 'next/server';
import { createProfile, listProfiles, maskProfile } from '@/lib/profiles';

export const dynamic = 'force-dynamic';

function httpError(err: unknown) {
  const status = Number((err as { status?: number }).status || 500);
  const message = err instanceof Error ? err.message : 'Request failed';
  return NextResponse.json({ error: message }, { status: status >= 400 && status < 600 ? status : 500 });
}

export async function GET() {
  const profiles = await listProfiles();
  return NextResponse.json(profiles.map(maskProfile));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const profile = await createProfile(String(body.name || ''), body.duplicateFrom || null);
    return NextResponse.json(maskProfile(profile));
  } catch (err) {
    return httpError(err);
  }
}
