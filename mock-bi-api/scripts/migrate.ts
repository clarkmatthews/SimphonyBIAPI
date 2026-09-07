import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'pg';
import { loadEnv } from '../src/env';

loadEnv();

const here = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const client = new Client({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'biapi',
    user: process.env.PGUSER || 'biapiUser',
    password: process.env.PGPASSWORD || '',
  });
  await client.connect();
  const sqlPath = path.join(here, '..', 'sql', '001_apitestdata.sql');
  console.log('Applying 001_apitestdata.sql');
  await client.query(fs.readFileSync(sqlPath, 'utf8'));
  await client.end();
  console.log('Mock API tables ready (apitestdata_*).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
