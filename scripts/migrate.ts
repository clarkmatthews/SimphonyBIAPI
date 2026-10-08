import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnv();
  const client = new Client({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'biapi',
    user: process.env.PGUSER || 'biapiUser',
    password: process.env.PGPASSWORD || '',
  });
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS jobui_schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const applied = await client.query<{ filename: string }>('SELECT filename FROM jobui_schema_migrations');
  const done = new Set(applied.rows.map((row) => row.filename));
  const files = [
    '001_operations_daily_totals.sql',
    '002_scheduler.sql',
    '003_daily_totals.sql',
    '004_quarter_hour_totals.sql',
    '005_dimensions.sql',
    '006_jobui_prefix.sql',
    '007_profiles.sql',
    '008_run_io_exchanges.sql',
    '009_application_name.sql',
    '010_rebuild_warehouse.sql',
    '011_event_timeout_default.sql',
    '012_event_max_attempts.sql',
  ];
  if (done.size === 0) {
    const existing = await client.query(`SELECT to_regclass('public.jobui_settings') AS rel`);
    if (existing.rows[0]?.rel) {
      for (const file of files) {
        if (file === '010_rebuild_warehouse.sql') continue;
        await client.query('INSERT INTO jobui_schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
        done.add(file);
      }
      console.log('Recorded migrations 001-009 already present in this database');
    }
  }
  for (const file of files) {
    if (done.has(file)) {
      console.log(`Skipping ${file}`);
      continue;
    }
    const full = path.join(process.cwd(), 'sql', file);
    console.log(`Applying ${file}`);
    await client.query('BEGIN');
    try {
      await client.query(fs.readFileSync(full, 'utf8'));
      await client.query('INSERT INTO jobui_schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  const settings = await client.query('SELECT active_profile_id FROM jobui_settings WHERE id = 1');
  const profileId = settings.rows[0]?.active_profile_id;
  if (profileId) {
    const profile = await client.query('SELECT * FROM jobui_profiles WHERE id = $1', [profileId]);
    const row = profile.rows[0] || {};
    const updates: string[] = [];
    const values: unknown[] = [];
    const map: Record<string, string | undefined> = {
      auth_host: process.env.AUTH_HOST,
      app_host: process.env.APP_HOST,
      client_id: process.env.CLIENT_ID,
      api_username: process.env.API_USERNAME,
      api_password: process.env.API_PASSWORD,
      org_name: process.env.ORG_NAME,
      org_identifier: process.env.ORG_IDENTIFIER || process.env.ORG_NAME,
      application_name: process.env.APPLICATION_NAME,
    };
    for (const [col, val] of Object.entries(map)) {
      if (val && !row[col]) {
        values.push(val);
        updates.push(`${col} = $${values.length}`);
      }
    }
    if (updates.length) {
      await client.query(
        `UPDATE jobui_profiles SET ${updates.join(', ')}, updated_at = now() WHERE id = $${values.length + 1}`,
        [...values, profileId]
      );
      console.log('Seeded active profile from .env');
    }
  }

  await client.end();
  console.log('Migrations complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
