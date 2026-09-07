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
  const files = [
    '001_operations_daily_totals.sql',
    '002_scheduler.sql',
    '003_daily_totals.sql',
    '004_quarter_hour_totals.sql',
    '005_dimensions.sql',
    '006_jobui_prefix.sql',
  ];
  for (const file of files) {
    const full = path.join(process.cwd(), 'sql', file);
    console.log(`Applying ${file}`);
    await client.query(fs.readFileSync(full, 'utf8'));
  }

  const settings = await client.query('SELECT * FROM jobui_settings WHERE id = 1');
  const row = settings.rows[0];
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
  };
  for (const [col, val] of Object.entries(map)) {
    if (val && !row[col]) {
      values.push(val);
      updates.push(`${col} = $${values.length}`);
    }
  }
  if (updates.length) {
    await client.query(`UPDATE jobui_settings SET ${updates.join(', ')}, updated_at = now() WHERE id = 1`, values);
    console.log('Seeded Oracle settings from .env');
  }

  await client.end();
  console.log('Migrations complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
