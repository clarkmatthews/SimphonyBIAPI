import { APP_NAME, type OracleConfig } from './auth';

export async function biPost(config: OracleConfig, idToken: string, operation: string, body: Record<string, unknown> = {}) {
  const url = `${config.appHost}/bi/v1/${config.orgIdentifier}/${operation}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ applicationName: APP_NAME, ...body }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${operation} ${res.status}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : {};
}

export function pick(obj: Record<string, unknown> | undefined, names: string[]) {
  if (!obj) return undefined;
  const keys = Object.keys(obj);
  for (const name of names) {
    const match = keys.find((k) => k.toLowerCase() === name.toLowerCase());
    if (match && obj[match] !== undefined && obj[match] !== null && obj[match] !== '') {
      return obj[match];
    }
  }
  return undefined;
}

export function asArray(value: unknown): Record<string, unknown>[] {
  if (!value) return [];
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [value as Record<string, unknown>];
}
