import { createHash, randomBytes } from 'crypto';
import { queryOne } from '../db';
import type { Settings } from '../types';

const REDIRECT_URI = 'apiaccount://callback';
const APP_NAME = 'SimphonyBIAPI-Sample';

export type OracleConfig = {
  authHost: string;
  appHost: string;
  clientId: string;
  username: string;
  password: string;
  orgName: string;
  orgIdentifier: string;
};

function normalizeAuthHost(host: string) {
  return host.trim().replace(/\/+$/, '').replace(/\/oidc-provider(\/v1)?$/, '');
}

function normalizeAppHost(host: string) {
  return host.trim().replace(/\/+$/, '').replace(/\/bi\/v1.*$/, '');
}

export function settingsToOracle(settings: Settings): OracleConfig | null {
  const authHost = settings.auth_host || process.env.AUTH_HOST || '';
  const appHost = settings.app_host || process.env.APP_HOST || '';
  const clientId = settings.client_id || process.env.CLIENT_ID || '';
  const username = settings.api_username || process.env.API_USERNAME || '';
  const password = settings.api_password || process.env.API_PASSWORD || '';
  const orgName = settings.org_name || process.env.ORG_NAME || '';
  const orgIdentifier = settings.org_identifier || process.env.ORG_IDENTIFIER || orgName;
  if (!authHost || !appHost || !clientId || !username || !password || !orgName) {
    return null;
  }
  return {
    authHost: normalizeAuthHost(authHost),
    appHost: normalizeAppHost(appHost),
    clientId,
    username,
    password,
    orgName,
    orgIdentifier,
  };
}

function base64Url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makePkce() {
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function jwtExp(token: string): Date | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((payload.length + 3) % 4);
    const json = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
    return json.exp ? new Date(json.exp * 1000) : null;
  } catch {
    return null;
  }
}

async function saveTokens(idToken: string, refreshToken?: string | null) {
  const expires = jwtExp(idToken);
  await queryOne(
    `UPDATE jobui_oidc_tokens
     SET id_token = $1, refresh_token = COALESCE($2, refresh_token), expires_at = $3, obtained_at = now(), updated_at = now()
     WHERE id = 1`,
    [idToken, refreshToken ?? null, expires]
  );
}

async function formPost(url: string, body: Record<string, string>, cookie?: string) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: new URLSearchParams(body),
    redirect: 'manual',
  });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  const setCookie = res.headers.getSetCookie?.() ?? [];
  return { res, text, json, cookies: setCookie };
}

export async function getIdToken(config: OracleConfig): Promise<string> {
  const cached = await queryOne<{ id_token: string | null; refresh_token: string | null; expires_at: string | null }>(
    'SELECT id_token, refresh_token, expires_at FROM jobui_oidc_tokens WHERE id = 1'
  );
  if (cached?.id_token && cached.expires_at) {
    const exp = new Date(cached.expires_at);
    if (exp.getTime() - Date.now() > 5 * 24 * 60 * 60 * 1000) {
      return cached.id_token;
    }
  }

  if (cached?.refresh_token) {
    try {
      const tokenUrl = `${config.authHost}/oidc-provider/v1/oauth2/token`;
      const refreshed = await formPost(tokenUrl, {
        scope: 'openid',
        grant_type: 'refresh_token',
        client_id: config.clientId,
        refresh_token: cached.refresh_token,
        redirect_uri: REDIRECT_URI,
      });
      const idToken = String(refreshed.json?.id_token || '');
      if (idToken) {
        await saveTokens(idToken, String(refreshed.json?.refresh_token || cached.refresh_token));
        return idToken;
      }
    } catch {
      /* fall through to full PKCE */
    }
  }

  const pkce = makePkce();
  const authorize = new URL(`${config.authHost}/oidc-provider/v1/oauth2/authorize`);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('client_id', config.clientId);
  authorize.searchParams.set('scope', 'openid');
  authorize.searchParams.set('redirect_uri', REDIRECT_URI);
  authorize.searchParams.set('code_challenge', pkce.challenge);
  authorize.searchParams.set('code_challenge_method', 'S256');

  const authRes = await fetch(authorize, { redirect: 'manual' });
  const cookies = (authRes.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');

  const signin = await formPost(
    `${config.authHost}/oidc-provider/v1/oauth2/signin`,
    {
      username: config.username,
      password: config.password,
      orgname: config.orgName,
    },
    cookies
  );

  if (signin.json?.nextOp === 'expired') {
    throw new Error('API account password expired. Reset it from the Reporting and Analytics sign-in page.');
  }
  const redirectUrl = String(signin.json?.redirectUrl || '');
  const code = new URL(redirectUrl).searchParams.get('code');
  if (!code) {
    throw new Error(`Sign-in did not return an authorization code: ${signin.text.slice(0, 300)}`);
  }

  const tokenCookies = [
    cookies,
    ...(signin.cookies || []).map((c) => c.split(';')[0]),
  ]
    .filter(Boolean)
    .join('; ');

  const token = await formPost(
    `${config.authHost}/oidc-provider/v1/oauth2/token`,
    {
      scope: 'openid',
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code_verifier: pkce.verifier,
      code,
      redirect_uri: REDIRECT_URI,
    },
    tokenCookies
  );

  const idToken = String(token.json?.id_token || '');
  if (!idToken) {
    throw new Error(`Token response missing id_token: ${token.text.slice(0, 300)}`);
  }
  await saveTokens(idToken, String(token.json?.refresh_token || ''));
  return idToken;
}

export { APP_NAME };
