import type { EndpointDef } from '../types';
import { asArray, pick } from './client';

function mapRow(endpoint: EndpointDef, layers: Record<string, unknown>[]) {
  const row: Record<string, unknown> = {};
  const used = new Set<string>();
  for (const field of endpoint.fields) {
    let value: unknown;
    for (const layer of layers) {
      value = pick(layer, field.sources);
      if (value !== undefined) break;
    }
    row[field.column] = value ?? null;
    field.sources.forEach((s) => used.add(s.toLowerCase()));
  }

  const extra: Record<string, unknown> = {};
  for (const layer of layers) {
    for (const [key, value] of Object.entries(layer)) {
      if (Array.isArray(value) || (value && typeof value === 'object')) continue;
      if (!used.has(key.toLowerCase())) extra[key] = value;
    }
  }
  if (Object.keys(extra).length && endpoint.table !== 'operations_daily_totals') {
    row.extra = extra;
  }
  return row;
}

export function flattenPayload(endpoint: EndpointDef, payload: Record<string, unknown>, locRefFallback?: string) {
  const root = { ...payload };
  if (locRefFallback && !pick(root, ['locRef', 'loc_ref'])) {
    root.locRef = locRefFallback;
  }

  if (endpoint.kind === 'latestBusDt') {
    return [mapRow(endpoint, [root])];
  }

  if (endpoint.rootArray) {
    const items = asArray(root[endpoint.rootArray] ?? root[endpoint.rootArray.replace(/s$/, '')]);
    const fallbackArrays = Object.values(root).filter(Array.isArray) as Record<string, unknown>[][];
    const list = items.length ? items : fallbackArrays[0] || [];
    return list.map((item) => mapRow(endpoint, [root, item]));
  }

  const rows: Record<string, unknown>[] = [];
  const rvcs = endpoint.rvcArray ? asArray(root[endpoint.rvcArray]) : [root];
  for (const rvc of rvcs) {
    const periods = endpoint.periodArray ? asArray(rvc[endpoint.periodArray]) : [rvc];
    for (const period of periods) {
      const items = endpoint.itemArray ? asArray(period[endpoint.itemArray] ?? rvc[endpoint.itemArray!]) : [period];
      for (const item of items) {
        rows.push(mapRow(endpoint, [root, rvc, period, item]));
      }
    }
  }
  return rows.filter((row) => endpoint.uniqueKey.every((key) => row[key] !== null && row[key] !== undefined && row[key] !== ''));
}
