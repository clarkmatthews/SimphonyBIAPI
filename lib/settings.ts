import { queryOne } from './db';
import type { Settings } from './types';

export async function getSettings() {
  const row = await queryOne<Settings>(
    `SELECT
       s.id,
       s.active_profile_id,
       p.name AS active_profile_name,
       p.auth_host,
       p.app_host,
       p.client_id,
       p.api_username,
       p.api_password,
       p.org_name,
       p.org_identifier,
       p.application_name,
       s.timezone,
       s.scheduler_enabled,
       s.updated_at
     FROM jobui_settings s
     LEFT JOIN jobui_profiles p ON p.id = s.active_profile_id
     WHERE s.id = 1`
  );
  if (!row) throw new Error('jobui_settings row missing; run npm run migrate');
  return row;
}

export async function saveSettings(
  patch: Partial<Pick<Settings, 'timezone' | 'scheduler_enabled' | 'active_profile_id'>>
) {
  const current = await getSettings();
  await queryOne(
    `UPDATE jobui_settings SET
      timezone = $1, scheduler_enabled = $2, active_profile_id = $3, updated_at = now()
     WHERE id = 1`,
    [
      patch.timezone ?? current.timezone ?? 'America/Los_Angeles',
      patch.scheduler_enabled ?? current.scheduler_enabled,
      patch.active_profile_id !== undefined ? patch.active_profile_id : current.active_profile_id,
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

export function maskSettings(settings: Settings) {
  return {
    ...settings,
    api_password: settings.api_password ? '••••••••' : '',
    has_password: Boolean(settings.api_password || process.env.API_PASSWORD),
  };
}
