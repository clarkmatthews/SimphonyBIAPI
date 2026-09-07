import { queryOne } from '../db';
import { appendRunLog, logActivity } from '../activity';
import type { EventRow, Settings, TargetConfig } from '../types';
import { getEndpoint } from './catalog';
import { getIdToken, settingsToOracle } from './auth';
import { asArray, biPost, pick } from './client';
import { flattenPayload } from './flatten';
import { upsertRows } from './upsert';

async function runStatus(runId: string) {
  const row = await queryOne<{ status: string }>('SELECT status FROM jobui_event_runs WHERE id = $1', [runId]);
  return row?.status;
}

async function getLocations(idToken: string, config: ReturnType<typeof settingsToOracle>, target: TargetConfig) {
  if (!config) return [];
  if (Array.isArray(target.locRefs)) return target.locRefs;
  const payload = await biPost(config, idToken, 'getLocationDimensions', {});
  return asArray(payload.locations)
    .filter((loc) => loc.active !== false)
    .map((loc) => String(pick(loc, ['locRef']) || ''))
    .filter(Boolean);
}

export async function executeRun(runId: string, event: EventRow, settings: Settings) {
  const endpoint = getEndpoint(event.endpoint_id);
  if (!endpoint) throw new Error(`Unknown endpoint ${event.endpoint_id}`);

  await queryOne(
    `UPDATE jobui_event_runs SET status = 'running', started_at = now() WHERE id = $1`,
    [runId]
  );
  await appendRunLog(runId, `Starting ${endpoint.name} (${endpoint.operation})`);

  const config = settingsToOracle(settings);
  if (!config) throw new Error('Oracle settings are incomplete. Save them on the Settings page.');

  const idToken = await getIdToken(config);
  await appendRunLog(runId, 'Authenticated with Oracle OpenID.');

  let rowsUpserted = 0;
  let locationsDone = 0;

  if (endpoint.kind === 'definition' && endpoint.id === 'getLocationDimensions') {
    const payload = await biPost(config, idToken, endpoint.operation, {});
    const rows = flattenPayload(endpoint, payload);
    rowsUpserted += await upsertRows(endpoint, rows);
    locationsDone = rows.length;
    await appendRunLog(runId, `Upserted ${rows.length} location dimension row(s).`);
  } else if (endpoint.kind === 'definition') {
    const locRefs = await getLocations(idToken, config, event.target);
    if (!locRefs.length) {
      const payload = await biPost(config, idToken, endpoint.operation, {});
      const rows = flattenPayload(endpoint, payload);
      rowsUpserted += await upsertRows(endpoint, rows);
      await appendRunLog(runId, `Upserted ${rows.length} row(s) without locRef loop.`);
    } else {
      for (const locRef of locRefs) {
        if ((await runStatus(runId)) === 'aborted') throw Object.assign(new Error('Aborted'), { aborted: true });
        const payload = await biPost(config, idToken, endpoint.operation, { locRef });
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
    const locRefs = await getLocations(idToken, config, event.target);
    await appendRunLog(runId, `Syncing ${locRefs.length} location(s).`);
    for (const locRef of locRefs) {
      if ((await runStatus(runId)) === 'aborted') throw Object.assign(new Error('Aborted'), { aborted: true });
      let busDt = event.target.busDtMode === 'fixed' ? event.target.busDt : undefined;
      if (!busDt) {
        const latest = await biPost(config, idToken, 'getLatestBusDt', { locRef });
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
      const payload = await biPost(config, idToken, endpoint.operation, { locRef, busDt });
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

  await queryOne(
    `UPDATE jobui_event_runs SET status = 'success', finished_at = now(), rows_upserted = $2, locations_done = $3 WHERE id = $1`,
    [runId, rowsUpserted, locationsDone]
  );
  await logActivity('job_success', `${event.name}: ${rowsUpserted} rows`, event.id, runId);
  await appendRunLog(runId, `Done. ${rowsUpserted} row(s) upserted.`);
}
