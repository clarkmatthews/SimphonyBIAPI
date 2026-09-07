import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await query('SELECT * FROM jobui_activity_log ORDER BY created_at DESC LIMIT 200');
  return NextResponse.json({ activity: rows });
}
