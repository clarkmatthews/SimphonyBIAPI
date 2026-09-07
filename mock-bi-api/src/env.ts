import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));

function applyEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
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

export function loadEnv() {
  applyEnvFile(path.join(process.cwd(), '.env'));
  applyEnvFile(path.join(here, '..', '.env'));
  applyEnvFile(path.join(here, '..', '..', '.env'));
}

loadEnv();

export const mockConfig = {
  port: Number(process.env.PORT || 3006),
  username: process.env.MOCK_USERNAME || 'mockuser',
  password: process.env.MOCK_PASSWORD || 'mockpass',
  org: process.env.MOCK_ORG || 'DEMOORG',
  clientId: process.env.MOCK_CLIENT_ID || 'mock-client',
  jwtSecret: process.env.MOCK_JWT_SECRET || 'change-me-in-local-env',
};
