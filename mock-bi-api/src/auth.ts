import { createHash, createHmac, randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { mockConfig } from './env';
import { query, queryOne } from './db';

const SESSION_COOKIE = 'oidc_session';

function base64Url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomId(bytes = 24) {
  return base64Url(randomBytes(bytes));
}

function pkceChallenge(verifier: string) {
  return base64Url(createHash('sha256').update(verifier).digest());
}

function signJwt(payload: Record<string, unknown>) {
  const header = base64Url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = base64Url(Buffer.from(JSON.stringify(payload)));
  const sig = base64Url(createHmac('sha256', mockConfig.jwtSecret).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}

export function verifyJwt(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const expected = base64Url(createHmac('sha256', mockConfig.jwtSecret).update(`${parts[0]}.${parts[1]}`).digest());
  if (expected !== parts[2]) return null;
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((parts[1].length + 3) % 4);
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as { exp?: number; sub?: string };
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function makeIdToken(username: string, orgname: string, clientId: string) {
  const now = Math.floor(Date.now() / 1000);
  return signJwt({
    sub: username,
    org: orgname,
    iss: 'simphony-bi-mock-api',
    aud: clientId,
    iat: now,
    exp: now + 14 * 24 * 60 * 60,
  });
}

function cookieFrom(req: Request) {
  const raw = req.cookies?.[SESSION_COOKIE] || '';
  return String(raw || '');
}

export async function authorize(req: Request, res: Response) {
  const sessionId = randomId();
  await query(
    `INSERT INTO apitestdata_oidc_sessions (id, client_id, redirect_uri, code_challenge, code_challenge_method)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      sessionId,
      String(req.query.client_id || ''),
      String(req.query.redirect_uri || 'apiaccount://callback'),
      String(req.query.code_challenge || ''),
      String(req.query.code_challenge_method || 'S256'),
    ]
  );
  res.cookie(SESSION_COOKIE, sessionId, { httpOnly: true, sameSite: 'lax', path: '/' });
  res.status(200).json({ status: 'ok' });
}

export async function signin(req: Request, res: Response) {
  const username = String(req.body.username || '');
  const password = String(req.body.password || '');
  const orgname = String(req.body.orgname || '');
  if (username !== mockConfig.username || password !== mockConfig.password || orgname !== mockConfig.org) {
    res.status(401).json({ error: 'invalid_credentials', message: 'Invalid username, password, or organization.' });
    return;
  }

  const sessionId = cookieFrom(req);
  const session = sessionId
    ? await queryOne<{
        id: string;
        client_id: string | null;
        redirect_uri: string | null;
        code_challenge: string | null;
        code_challenge_method: string | null;
      }>('SELECT * FROM apitestdata_oidc_sessions WHERE id = $1', [sessionId])
    : null;
  if (!session) {
    res.status(400).json({ error: 'invalid_session', message: 'Authorize the client before signing in.' });
    return;
  }

  const code = randomId(18);
  const expires = new Date(Date.now() + 10 * 60 * 1000);
  await query(
    `INSERT INTO apitestdata_oidc_codes
      (code, session_id, username, orgname, client_id, redirect_uri, code_challenge, code_challenge_method, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      code,
      session.id,
      username,
      orgname,
      session.client_id,
      session.redirect_uri,
      session.code_challenge,
      session.code_challenge_method,
      expires.toISOString(),
    ]
  );
  const redirect = new URL(session.redirect_uri || 'apiaccount://callback');
  redirect.searchParams.set('code', code);
  res.json({ redirectUrl: redirect.toString() });
}

export async function token(req: Request, res: Response) {
  const grant = String(req.body.grant_type || '');
  if (grant === 'refresh_token') {
    const refresh = String(req.body.refresh_token || '');
    const stored = await queryOne<{
      id_token: string;
      username: string | null;
      orgname: string | null;
      client_id: string | null;
      expires_at: string;
    }>('SELECT * FROM apitestdata_oidc_tokens WHERE refresh_token = $1', [refresh]);
    if (!stored || new Date(stored.expires_at).getTime() <= Date.now()) {
      res.status(400).json({ error: 'invalid_grant', message: 'Refresh token is missing or expired.' });
      return;
    }
    const idToken = makeIdToken(stored.username || mockConfig.username, stored.orgname || mockConfig.org, stored.client_id || mockConfig.clientId);
    const nextRefresh = randomId(24);
    const expires = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000);
    await query('DELETE FROM apitestdata_oidc_tokens WHERE refresh_token = $1', [refresh]);
    await query(
      `INSERT INTO apitestdata_oidc_tokens (refresh_token, id_token, username, orgname, client_id, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [nextRefresh, idToken, stored.username, stored.orgname, stored.client_id, expires.toISOString()]
    );
    res.json({
      token_type: 'Bearer',
      id_token: idToken,
      access_token: idToken,
      refresh_token: nextRefresh,
      expires_in: 14 * 24 * 60 * 60,
    });
    return;
  }

  if (grant !== 'authorization_code') {
    res.status(400).json({ error: 'unsupported_grant_type' });
    return;
  }

  const code = String(req.body.code || '');
  const verifier = String(req.body.code_verifier || '');
  const row = await queryOne<{
    code: string;
    used: boolean;
    expires_at: string;
    username: string | null;
    orgname: string | null;
    client_id: string | null;
    code_challenge: string | null;
    code_challenge_method: string | null;
  }>('SELECT * FROM apitestdata_oidc_codes WHERE code = $1', [code]);

  if (!row || row.used || new Date(row.expires_at).getTime() <= Date.now()) {
    res.status(400).json({ error: 'invalid_grant', message: 'Authorization code is invalid or expired.' });
    return;
  }
  if (row.code_challenge && pkceChallenge(verifier) !== row.code_challenge) {
    res.status(400).json({ error: 'invalid_grant', message: 'PKCE verification failed.' });
    return;
  }

  await query('UPDATE apitestdata_oidc_codes SET used = true WHERE code = $1', [code]);
  const idToken = makeIdToken(row.username || mockConfig.username, row.orgname || mockConfig.org, row.client_id || mockConfig.clientId);
  const refreshToken = randomId(24);
  const expires = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO apitestdata_oidc_tokens (refresh_token, id_token, username, orgname, client_id, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [refreshToken, idToken, row.username, row.orgname, row.client_id, expires.toISOString()]
  );
  res.json({
    token_type: 'Bearer',
    id_token: idToken,
    access_token: idToken,
    refresh_token: refreshToken,
    expires_in: 14 * 24 * 60 * 60,
  });
}

export function requireBearer(req: Request, res: Response, next: () => void) {
  const header = String(req.headers.authorization || '');
  const tokenValue = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!verifyJwt(tokenValue)) {
    res.status(401).json({ error: 'invalid_token', message: 'A valid Bearer id_token is required.' });
    return;
  }
  next();
}
