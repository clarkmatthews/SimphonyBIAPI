import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/activity';
import { testConnection } from '@/lib/bi/testConnection';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function POST() {
  const settings = await getSettings();
  const result = await testConnection(settings);
  const failed = result.steps.find((step) => step.status === 'failed');
  const summary = result.ok
    ? `${result.profileName || 'Active'}: all steps passed`
    : `${result.profileName || 'Active'}: failed at ${failed?.label || 'unknown step'} — ${(failed?.detail || '').slice(0, 200)}`;
  await logActivity('connection_test', summary);
  return NextResponse.json(result, { status: 200 });
}
