import { Pool } from 'pg';
import { loadEnv } from './env';

loadEnv();

export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'biapi',
  user: process.env.PGUSER || 'biapiUser',
  password: process.env.PGPASSWORD || '',
});

export async function query<T extends object = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function queryOne<T extends object = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
