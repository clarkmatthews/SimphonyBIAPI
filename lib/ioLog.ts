import { query } from './db';
import type { IoExchange } from './types';

const MAX_JSON = 250_000;

function clip(value: unknown) {
  try {
    const text = JSON.stringify(value);
    if (!text) return value;
    if (text.length <= MAX_JSON) return value;
    return { _truncated: true, bytes: text.length, preview: text.slice(0, MAX_JSON) };
  } catch {
    return { _unserializable: true };
  }
}

export async function recordIoExchange(runId: string, exchange: Omit<IoExchange, 'at'>) {
  const row: IoExchange = {
    operation: exchange.operation,
    url: exchange.url,
    request: clip(exchange.request) as Record<string, unknown>,
    response: clip(exchange.response),
    error: exchange.error,
    at: new Date().toISOString(),
  };
  await query(
    `UPDATE jobui_event_runs
     SET io_exchanges = coalesce(io_exchanges, '[]'::jsonb) || $2::jsonb
     WHERE id = $1`,
    [runId, JSON.stringify([row])]
  );
}
