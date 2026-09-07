import { queryOne } from './db';
import type { Settings } from './types';

export async function getSettings() {
  const row = await queryOne<Settings>('SELECT * FROM jobui_settings WHERE id = 1');
  if (!row) throw new Error('jobui_settings row missing; run npm run migrate');
  return row;
}

export async function saveSettings(patch: Partial<Settings>) {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await queryOne(
    `UPDATE jobui_settings SET
      auth_host = $1, app_host = $2, client_id = $3, api_username = $4, api_password = $5,
      org_name = $6, org_identifier = $7, timezone = $8, scheduler_enabled = $9, updated_at = now()
     WHERE id = 1`,
    [
      next.auth_host,
      next.app_host,
      next.client_id,
      next.api_username,
      next.api_password,
      next.org_name,
      next.org_identifier,
      next.timezone || 'America/Los_Angeles',
      next.scheduler_enabled,
    ]
  );
  return getSettings();
}

export function oracleReady(settings: Settings) {
  return Boolean(
    (settings.auth_host || process.env.AUTH_HOST) &&
      (settings.app_host || process.env.APP_HOST) &&
      (settings.client_id || process.env.CLIENT_ID) &&
      (settings.api_username || process.env.API_USERNAME) &&
      (settings.api_password || process.env.API_PASSWORD) &&
      (settings.org_name || process.env.ORG_NAME)
  );
}
