import { getIdToken, settingsToOracle } from './auth';
import { asArray, biPost, pick } from './client';
import type { Settings } from '../types';

export type ConnectionStepStatus = 'ok' | 'failed' | 'skipped';

export type ConnectionStep = {
  id: string;
  label: string;
  status: ConnectionStepStatus;
  detail: string;
};

export type ConnectionTestResult = {
  ok: boolean;
  profileName: string | null;
  steps: ConnectionStep[];
};

function failResult(profileName: string | null, steps: ConnectionStep[], error: unknown): ConnectionTestResult {
  const message = error instanceof Error ? error.message : String(error);
  const last = steps[steps.length - 1];
  if (last && last.status === 'failed' && !last.detail) last.detail = message;
  return { ok: false, profileName, steps };
}

export async function testConnection(settings: Settings): Promise<ConnectionTestResult> {
  const profileName = settings.active_profile_name;
  const steps: ConnectionStep[] = [];

  const config = settingsToOracle(settings);
  if (!config) {
    steps.push({
      id: 'settings',
      label: 'Saved settings',
      status: 'failed',
      detail:
        'Active environment is incomplete. Save auth host, app host, client ID, username, password, and org name.',
    });
    steps.push({
      id: 'auth',
      label: 'Authentication (OpenID)',
      status: 'skipped',
      detail: 'Skipped because settings are incomplete.',
    });
    steps.push({
      id: 'app',
      label: 'Application API (getLocationDimensions)',
      status: 'skipped',
      detail: 'Skipped because settings are incomplete.',
    });
    return { ok: false, profileName, steps };
  }

  steps.push({
    id: 'settings',
    label: 'Saved settings',
    status: 'ok',
    detail: `${config.authHost} to ${config.appHost} (org ${config.orgIdentifier})`,
  });

  let idToken: string;
  try {
    idToken = await getIdToken(config);
    steps.push({
      id: 'auth',
      label: 'Authentication (OpenID)',
      status: 'ok',
      detail: `Received id_token from ${config.authHost}/oidc-provider/v1/oauth2`,
    });
  } catch (err) {
    steps.push({
      id: 'auth',
      label: 'Authentication (OpenID)',
      status: 'failed',
      detail: err instanceof Error ? err.message : String(err),
    });
    steps.push({
      id: 'app',
      label: 'Application API (getLocationDimensions)',
      status: 'skipped',
      detail: 'Skipped because authentication failed.',
    });
    return failResult(profileName, steps, err);
  }

  try {
    const payload = await biPost(config, idToken, 'getLocationDimensions', {});
    const locations = asArray(payload.locations);
    const sampleLocRefs = locations
      .map((loc) => String(pick(loc, ['locRef']) || ''))
      .filter(Boolean)
      .slice(0, 5);
    const sample = sampleLocRefs.length ? ` Sample locRef: ${sampleLocRefs.join(', ')}.` : '';
    steps.push({
      id: 'app',
      label: 'Application API (getLocationDimensions)',
      status: 'ok',
      detail: `POST ${config.appHost}/bi/v1/${config.orgIdentifier}/getLocationDimensions returned ${locations.length} location(s).${sample}`,
    });
    return { ok: true, profileName, steps };
  } catch (err) {
    steps.push({
      id: 'app',
      label: 'Application API (getLocationDimensions)',
      status: 'failed',
      detail: err instanceof Error ? err.message : String(err),
    });
    return failResult(profileName, steps, err);
  }
}
