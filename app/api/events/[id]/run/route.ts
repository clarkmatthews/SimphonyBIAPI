import { NextResponse } from 'next/server';
import { runEventNow } from '@/lib/scheduler';

export const dynamic = 'force-dynamic';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await runEventNow(id);
  return NextResponse.json(run);
}
