import { query, queryOne } from './db';
import { logActivity } from './activity';
import { getSettings, saveSettings } from './settings';
import type { Profile } from './types';

export type ProfilePatch = Partial<
  Pick<
    Profile,
    | 'name'
    | 'auth_host'
    | 'app_host'
    | 'client_id'
    | 'api_username'
    | 'api_password'
    | 'org_name'
    | 'org_identifier'
    | 'application_name'
  >
>;

export function maskProfile(profile: Profile) {
  return {
    ...profile,
    api_password: profile.api_password ? '••••••••' : '',
    has_password: Boolean(profile.api_password),
  };
}

export async function listProfiles() {
  return query<Profile>('SELECT * FROM jobui_profiles ORDER BY name');
}

export async function getProfile(id: string) {
  return queryOne<Profile>('SELECT * FROM jobui_profiles WHERE id = $1', [id]);
}

export async function createProfile(name: string, duplicateFrom?: string | null) {
  const trimmed = name.trim();
  if (!trimmed) throw Object.assign(new Error('Profile name is required'), { status: 400 });

  let source: Profile | null = null;
  if (duplicateFrom) {
    source = await getProfile(duplicateFrom);
    if (!source) throw Object.assign(new Error('Source profile not found'), { status: 404 });
  }

  try {
    const row = await queryOne<Profile>(
      `INSERT INTO jobui_profiles
        (name, auth_host, app_host, client_id, api_username, api_password, org_name, org_identifier, application_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        trimmed,
        source?.auth_host ?? null,
        source?.app_host ?? null,
        source?.client_id ?? null,
        source?.api_username ?? null,
        source?.api_password ?? null,
        source?.org_name ?? null,
        source?.org_identifier ?? null,
        source?.application_name ?? 'SimphonyBIAPI-Sample',
      ]
    );
    return row!;
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      throw Object.assign(new Error('A profile with that name already exists'), { status: 409 });
    }
    throw err;
  }
}

export async function updateProfile(id: string, patch: ProfilePatch) {
  const current = await getProfile(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  if (patch.api_password === '••••••••') next.api_password = current.api_password;
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) throw Object.assign(new Error('Profile name is required'), { status: 400 });
    next.name = trimmed;
  }
  if (patch.application_name !== undefined) {
    next.application_name = (patch.application_name || '').trim() || 'SimphonyBIAPI-Sample';
  }
  try {
    const row = await queryOne<Profile>(
      `UPDATE jobui_profiles SET
        name = $2, auth_host = $3, app_host = $4, client_id = $5, api_username = $6,
        api_password = $7, org_name = $8, org_identifier = $9, application_name = $10, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [
        id,
        next.name,
        next.auth_host,
        next.app_host,
        next.client_id,
        next.api_username,
        next.api_password,
        next.org_name,
        next.org_identifier,
        next.application_name,
      ]
    );
    return row;
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      throw Object.assign(new Error('A profile with that name already exists'), { status: 409 });
    }
    throw err;
  }
}

export async function activateProfile(id: string) {
  const profile = await getProfile(id);
  if (!profile) throw Object.assign(new Error('Profile not found'), { status: 404 });
  const saved = await saveSettings({ active_profile_id: profile.id });
  await logActivity('settings_switch', `Active environment: ${profile.name}`);
  return saved;
}

export async function deleteProfile(id: string) {
  const profiles = await listProfiles();
  if (profiles.length <= 1) {
    throw Object.assign(new Error('Cannot delete the last environment profile'), { status: 400 });
  }
  const target = profiles.find((p) => p.id === id);
  if (!target) throw Object.assign(new Error('Profile not found'), { status: 404 });

  const settings = await getSettings();
  if (settings.active_profile_id === id) {
    const next = profiles.find((p) => p.id !== id)!;
    await saveSettings({ active_profile_id: next.id });
    await logActivity('settings_switch', `Active environment: ${next.name} (previous profile deleted)`);
  }

  await queryOne('DELETE FROM jobui_profiles WHERE id = $1', [id]);
  return { ok: true };
}
