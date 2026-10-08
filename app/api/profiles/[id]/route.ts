import { NextResponse } from 'next/server';
import { deleteProfile, getProfile, maskProfile, updateProfile } from '@/lib/profiles';

export const dynamic = 'force-dynamic';

function httpError(err: unknown) {
  const status = Number((err as { status?: number }).status || 500);
  const message = err instanceof Error ? err.message : 'Request failed';
  return NextResponse.json({ error: message }, { status: status >= 400 && status < 600 ? status : 500 });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  return NextResponse.json(maskProfile(profile));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const profile = await updateProfile(id, body);
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    return NextResponse.json(maskProfile(profile));
  } catch (err) {
    return httpError(err);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteProfile(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return httpError(err);
  }
}
