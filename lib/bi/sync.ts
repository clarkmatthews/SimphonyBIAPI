import { queryOne } from '../db';
import { appendRunLog, logActivity } from '../activity';
import { recordIoExchange } from '../ioLog';
import type { EventRow, Settings, TargetConfig } from '../types';
import { getEndpoint } from './catalog';
import { getIdToken, settingsToOracle, type OracleConfig } from './auth';
import { asArray, biPost, biRequest, pick } from './client';
import { normalizeAttempts } from '../events';
import { flattenPayload } from './flatten';
import { upsertRows } from './upsert';

async function runStatus(runId: string) {
  const row = await queryOne<{ status: string }>('SELECT status FROM jobui_event_runs WHERE id = $1', [runId]);
  return row?.status;
}

function pause(ms: number, signal?: AbortSignal) {
  if (signal?.aborted) return Promise.reject(Object.assign(new Error('Timed out'), { timedOut: true }));
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(finish, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(Object.assign(new Error('Timed out'), { timedOut: true }));
    };
    function finish() {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function callBi(
  runId: string,
  config: OracleConfig,
  idToken: string,
  operation: string,
  body: Record<string, unknown> = {},
  signal?: AbortSignal,
  attempts = 3
) {
  const { url, request } = biRequest(config, operation, body);
  const tries = normalizeAttempts(attempts);
  let lastError: unknown;
  for (let attempt = 1; attempt <= tries; attempt++) {
    if (signal?.aborted) throw Object.assign(new Error('Timed out'), { timedOut: true });
    try {
      const response = await biPost(config, idToken, operation, body, signal);
      await recordIoExchange(runId, { operation, url, request, response, error: null });
      if (attempt > 1) await appendRunLog(runId, `${operation} succeeded on attempt ${attempt} of ${tries}.`);
      return response;
    } catch (err) {
      lastError = err;
      const timedOut = Boolean(signal?.aborted);
      const message = timedOut ? 'Timed out' : err instanceof Error ? err.message : String(err);
      await recordIoExchange(runId, { operation, url, request, response: null, error: message });
      if (timedOut || attempt === tries) break;
      await appendRunLog(runId, `${operation} attempt ${attempt} of ${tries} failed: ${message}. Retrying.`);
      await pause(1000, signal);
    }
  }
  throw lastError;
}

async function ensureActive(runId: string, signal?: AbortSignal) {
  if (signal?.aborted) throw Object.assign(new Error('Timed out'), { timedOut: true });
  if ((await runStatus(runId)) === 'aborted') throw Object.assign(new Error('Aborted'), { aborted: true });
}

async function getLocations(
  runId: string,
  idToken: string,
  config: ReturnType<typeof settingsToOracle>,
  target: TargetConfig,
  signal?: AbortSignal,
  attempts = 3
) {
  if (!config) return [];
  if (Array.isArray(target.locRefs)) return target.locRefs;
  const payload = await callBi(runId, config, idToken, 'getLocationDimensions', {}, signal, attempts);
  return asArray(payload.locations)
    .filter((loc) => loc.active !== false)
    .map((loc) => String(pick(loc, ['locRef']) || ''))
    .filter(Boolean);
}

export async function executeRun(runId: string, event: EventRow, settings: Settings, signal?: AbortSignal) {
  const endpoint = getEndpoint(event.endpoint_id);
  if (!endpoint) throw new Error(`Unknown endpoint ${event.endpoint_id}`);

  await queryOne(
    `UPDATE jobui_event_runs SET status = 'running', started_at = now() WHERE id = $1 AND status = 'queued'`,
    [runId]
  );
  await appendRunLog(runId, `Starting ${endpoint.name} (${endpoint.operation})`);

  const config = settingsToOracle(settings);
  if (!config) throw new Error('Oracle settings are incomplete. Save them on the Settings page.');

  const idToken = await getIdToken(config, signal);
  await appendRunLog(runId, 'Authenticated with Oracle OpenID.');
  const attempts = normalizeAttempts(event.max_attempts);

  let rowsUpserted = 0;
  let locationsDone = 0;

  if (endpoint.kind === 'definition' && endpoint.id === 'getLocationDimensions') {
    const payload = await callBi(runId, config, idToken, endpoint.operation, {}, signal, attempts);
    const rows = flattenPayload(endpoint, payload);
    rowsUpserted += await upsertRows(endpoint, rows);
    locationsDone = rows.length;
    await appendRunLog(runId, `Upserted ${rows.length} location dimension row(s).`);
  } else if (endpoint.kind === 'definition') {
    const locRefs = await getLocations(runId, idToken, config, event.target, signal, attempts);
    if (!locRefs.length) {
      const payload = await callBi(runId, config, idToken, endpoint.operation, {}, signal, attempts);
      const rows = flattenPayload(endpoint, payload);
      rowsUpserted += await upsertRows(endpoint, rows);
      await appendRunLog(runId, `Upserted ${rows.length} row(s) without locRef loop.`);
    } else {
      for (const locRef of locRefs) {
        await ensureActive(runId, signal);
        const payload = await callBi(runId, config, idToken, endpoint.operation, { locRef }, signal, attempts);
        const rows = flattenPayload(endpoint, payload, locRef);
        rowsUpserted += await upsertRows(endpoint, rows);
        locationsDone += 1;
        await appendRunLog(runId, `${locRef}: ${rows.length} row(s)`);
        await queryOne('UPDATE jobui_event_runs SET locations_done = $2, rows_upserted = $3 WHERE id = $1', [
          runId,
          locationsDone,
          rowsUpserted,
        ]);
      }
    }
  } else {
    const locRefs = await getLocations(runId, idToken, config, event.target, signal, attempts);
    await appendRunLog(runId, `Syncing ${locRefs.length} location(s).`);
    for (const locRef of locRefs) {
      await ensureActive(runId, signal);
      let busDt = event.target.busDtMode === 'fixed' ? event.target.busDt : undefined;
      if (!busDt) {
        const latest = await callBi(runId, config, idToken, 'getLatestBusDt', { locRef }, signal, attempts);
        busDt = String(pick(latest, ['latestBusDt']) || '');
        if (endpoint.id === 'getLatestBusDt') {
          const rows = flattenPayload(endpoint, latest, locRef);
          rowsUpserted += await upsertRows(endpoint, rows);
          locationsDone += 1;
          await appendRunLog(runId, `${locRef}: latest ${busDt || 'n/a'}`);
          continue;
        }
      }
      if (!busDt) throw new Error(`No business date for ${locRef}`);
      const payload = await callBi(runId, config, idToken, endpoint.operation, { locRef, busDt }, signal, attempts);
      const rows = flattenPayload(endpoint, payload, locRef);
      rowsUpserted += await upsertRows(endpoint, rows);
      locationsDone += 1;
      await appendRunLog(runId, `${locRef} ${busDt}: ${rows.length} row(s)`);
      await queryOne('UPDATE jobui_event_runs SET locations_done = $2, rows_upserted = $3 WHERE id = $1', [
        runId,
        locationsDone,
        rowsUpserted,
      ]);
    }
  }

  const done = await queryOne(
    `UPDATE jobui_event_runs SET status = 'success', finished_at = now(), rows_upserted = $2, locations_done = $3
     WHERE id = $1 AND status = 'running' RETURNING id`,
    [runId, rowsUpserted, locationsDone]
  );
  if (!done) return;
  await logActivity('job_success', `${event.name}: ${rowsUpserted} rows`, event.id, runId);
  await appendRunLog(runId, `Done. ${rowsUpserted} row(s) upserted.`);
}
