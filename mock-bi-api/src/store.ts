import type { EndpointDef } from '../../lib/types';
import { query, queryOne } from './db';
import {
  ITEM_KINDS,
  KIND_BY_COLUMN,
  buildMetricFields,
  completedQuarterHours,
  generateDimensionItems,
  generateLocations,
  generateRvcs,
  itemIdentity,
  itemKeyField,
  todayInTz,
  utcNowIso,
  type DimItem,
  type ItemKind,
  type LocationRow,
  type RvcRow,
} from './generate';

type Json = Record<string, unknown>;

let worldLock: Promise<void> | null = null;

export function invalidateWorld() {
  worldLock = null;
}

export function ensureWorld() {
  if (!worldLock) worldLock = seedWorld().catch((err) => {
    worldLock = null;
    throw err;
  });
  return worldLock;
}

async function seedWorld() {
  const existing = await query<{ loc_ref: string }>('SELECT loc_ref FROM apitestdata_locations');
  if (!existing.length) {
    const locations = generateLocations();
    for (const loc of locations) {
      await query(
        `INSERT INTO apitestdata_locations
          (loc_ref, name, open_dt, active, src_name, src_ver, tz, curr, addr_ln1, addr_ln2, extra)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
         ON CONFLICT (loc_ref) DO NOTHING`,
        [
          loc.loc_ref,
          loc.name,
          loc.open_dt,
          loc.active,
          loc.src_name,
          loc.src_ver,
          loc.tz,
          loc.curr,
          loc.addr_ln1,
          loc.addr_ln2,
          JSON.stringify(loc.extra),
        ]
      );
      for (const rvc of generateRvcs(loc.loc_ref)) {
        await insertRvc(rvc);
      }
      for (const item of generateDimensionItems(loc.loc_ref)) {
        await insertDim(item);
      }
    }
    return;
  }

  for (const loc of existing) {
    const rvcCount = await queryOne<{ n: string }>(
      'SELECT count(*)::text AS n FROM apitestdata_revenue_centers WHERE loc_ref = $1',
      [loc.loc_ref]
    );
    if (!Number(rvcCount?.n || 0)) {
      for (const rvc of generateRvcs(loc.loc_ref)) await insertRvc(rvc);
    }
    for (const kind of ITEM_KINDS) {
      const found = await queryOne<{ item_num: string }>(
        'SELECT item_num FROM apitestdata_dimension_items WHERE loc_ref = $1 AND kind = $2 LIMIT 1',
        [loc.loc_ref, kind]
      );
      if (found) continue;
      for (const item of generateDimensionItems(loc.loc_ref).filter((row) => row.kind === kind)) {
        await insertDim(item);
      }
    }
  }
}

async function insertRvc(rvc: RvcRow) {
  await query(
    `INSERT INTO apitestdata_revenue_centers (loc_ref, rvc_num, name, active, extra)
     VALUES ($1,$2,$3,$4,$5::jsonb)
     ON CONFLICT (loc_ref, rvc_num) DO NOTHING`,
    [rvc.loc_ref, rvc.rvc_num, rvc.name, rvc.active, JSON.stringify(rvc.extra)]
  );
}

async function insertDim(item: DimItem) {
  await query(
    `INSERT INTO apitestdata_dimension_items (kind, loc_ref, item_num, name, extra)
     VALUES ($1,$2,$3,$4,$5::jsonb)
     ON CONFLICT (kind, loc_ref, item_num) DO NOTHING`,
    [item.kind, item.loc_ref, item.item_num, item.name, JSON.stringify(item.extra)]
  );
}

export async function listLocations() {
  await ensureWorld();
  return query<LocationRow>(
    `SELECT loc_ref, name, open_dt::text, active, src_name, src_ver, tz, curr, addr_ln1, addr_ln2, extra
     FROM apitestdata_locations
     ORDER BY loc_ref`
  );
}

export async function getLocation(locRef: string) {
  await ensureWorld();
  return queryOne<LocationRow>(
    `SELECT loc_ref, name, open_dt::text, active, src_name, src_ver, tz, curr, addr_ln1, addr_ln2, extra
     FROM apitestdata_locations WHERE loc_ref = $1`,
    [locRef]
  );
}

export async function listRvcs(locRef: string) {
  await ensureWorld();
  return query<RvcRow>(
    `SELECT loc_ref, rvc_num, name, active, extra
     FROM apitestdata_revenue_centers WHERE loc_ref = $1 ORDER BY rvc_num`,
    [locRef]
  );
}

export async function listItems(locRef: string, kind: ItemKind) {
  await ensureWorld();
  return query<DimItem>(
    `SELECT kind, loc_ref, item_num, name, extra
     FROM apitestdata_dimension_items WHERE loc_ref = $1 AND kind = $2 ORDER BY item_num`,
    [locRef, kind]
  );
}

function extraOf(row: { extra: unknown }) {
  return (row.extra || {}) as Json;
}

export async function definitionPayload(endpoint: EndpointDef, locRef?: string) {
  await ensureWorld();
  if (endpoint.operation === 'getLocationDimensions') {
    const locations = await listLocations();
    return { locations: locations.map((loc) => extraOf(loc)) };
  }

  const locations = locRef ? [await getLocation(locRef)].filter(Boolean) : await listLocations();
  if (!locations.length) return { locRef, [endpoint.rootArray || 'items']: [] };

  if (endpoint.operation === 'getRevenueCenterDimensions') {
    if (locRef) {
      const rvcs = await listRvcs(locRef);
      return { locRef, revenueCenters: rvcs.map((rvc) => extraOf(rvc)) };
    }
    const all = [];
    for (const loc of locations) {
      all.push(...(await listRvcs(loc!.loc_ref)).map((rvc) => ({ locRef: loc!.loc_ref, ...extraOf(rvc) })));
    }
    return { revenueCenters: all };
  }

  const kind = kindForDefinition(endpoint.operation);
  if (!kind) return { locRef, [endpoint.rootArray || 'items']: [] };

  if (locRef) {
    const items = await listItems(locRef, kind);
    return { locRef, [endpoint.rootArray!]: items.map((item) => extraOf(item)) };
  }

  const bundled = [];
  for (const loc of locations) {
    bundled.push(...(await listItems(loc!.loc_ref, kind)).map((item) => ({ locRef: loc!.loc_ref, ...extraOf(item) })));
  }
  return { [endpoint.rootArray!]: bundled };
}

function kindForDefinition(operation: string): ItemKind | null {
  const map: Record<string, ItemKind> = {
    getMenuItemDimensions: 'menu_item',
    getMenuItemPrices: 'price',
    getDiscountDimensions: 'discount',
    getEmployeeDimensions: 'employee',
    getJobCodeDimensions: 'job_code',
    getOrderChannelDimensions: 'order_channel',
    getOrderTypeDimensions: 'order_type',
    getReasonCodeDimensions: 'reason_code',
    getServiceChargeDimensions: 'service_charge',
    getTaxDimensions: 'tax',
    getTenderMediaDimensions: 'tender_media',
    getCashierDimensions: 'cashier',
    getCashManagementItemDimensions: 'cm_item',
    getPaymentAccountHolderDimensions: 'payment_account_holder',
    getPaymentAccountDimensions: 'payment_account',
  };
  return map[operation] ?? null;
}

function kindForTotals(endpoint: EndpointDef): ItemKind | null {
  const key = itemKeyField(endpoint);
  return key ? KIND_BY_COLUMN[key.column] : null;
}

async function defsForTotals(locRef: string, endpoint: EndpointDef) {
  const rvcs = await listRvcs(locRef);
  const kind = kindForTotals(endpoint);
  const items = kind ? await listItems(locRef, kind) : [];
  const orderTypes = endpoint.fields.some((field) => field.column === 'ot_num' && kind !== 'order_type')
    ? await listItems(locRef, 'order_type')
    : [];
  return { rvcs, items, orderTypes };
}

function rvcTotals(endpoint: EndpointDef, rvc: RvcRow, scale: 'daily' | 'quarterHour', period?: number) {
  const metrics = buildMetricFields(endpoint, scale);
  const row: Json = { rvcNum: rvc.rvc_num, ...metrics };
  if (period) row.clsdBusPrd = period;
  return row;
}

function itemRow(endpoint: EndpointDef, item: DimItem, extras: DimItem[], scale: 'daily' | 'quarterHour') {
  const key = itemKeyField(endpoint);
  const metrics = buildMetricFields(endpoint, scale);
  const identity = key ? itemIdentity(key, item) : {};
  const extraIds: Json = {};
  if (endpoint.fields.some((field) => field.column === 'ot_num') && kindForTotals(endpoint) !== 'order_type' && extras.length) {
    extraIds.otNum = Number(extras[Math.floor(Math.random() * extras.length)].item_num);
  }
  return { ...identity, ...extraIds, ...metrics };
}

function buildDailyPayload(endpoint: EndpointDef, locRef: string, busDt: string, rvcs: RvcRow[], items: DimItem[], extras: DimItem[]) {
  const scale = 'daily' as const;
  return {
    locRef,
    busDt,
    revenueCenters: rvcs.map((rvc) => {
      if (!endpoint.itemArray) return rvcTotals(endpoint, rvc, scale);
      return {
        rvcNum: rvc.rvc_num,
        [endpoint.itemArray]: items.map((item) => itemRow(endpoint, item, extras, scale)),
      };
    }),
  };
}

function buildPeriodSlice(endpoint: EndpointDef, rvcs: RvcRow[], items: DimItem[], extras: DimItem[], period: number) {
  const scale = 'quarterHour' as const;
  return {
    clsdBusPrd: period,
    revenueCenters: rvcs.map((rvc) => {
      const base = rvcTotals(endpoint, rvc, scale, period);
      if (!endpoint.itemArray) return base;
      return {
        rvcNum: rvc.rvc_num,
        clsdBusPrd: period,
        [endpoint.itemArray]: items.map((item) => itemRow(endpoint, item, extras, scale)),
      };
    }),
  };
}

export async function dailyTotals(endpoint: EndpointDef, locRef: string, busDt: string) {
  await ensureWorld();
  const existing = await queryOne<{ payload: Json }>(
    `SELECT payload FROM apitestdata_daily_snapshots
     WHERE operation = $1 AND loc_ref = $2 AND bus_dt = $3`,
    [endpoint.operation, locRef, busDt]
  );
  if (existing) return existing.payload;

  const { rvcs, items, orderTypes } = await defsForTotals(locRef, endpoint);
  const payload = buildDailyPayload(endpoint, locRef, busDt, rvcs, items, orderTypes);
  await query(
    `INSERT INTO apitestdata_daily_snapshots (operation, loc_ref, bus_dt, payload)
     VALUES ($1,$2,$3,$4::jsonb)
     ON CONFLICT (operation, loc_ref, bus_dt) DO NOTHING`,
    [endpoint.operation, locRef, busDt, JSON.stringify(payload)]
  );
  const stored = await queryOne<{ payload: Json }>(
    `SELECT payload FROM apitestdata_daily_snapshots
     WHERE operation = $1 AND loc_ref = $2 AND bus_dt = $3`,
    [endpoint.operation, locRef, busDt]
  );
  return stored?.payload ?? payload;
}

export async function quarterHourTotals(endpoint: EndpointDef, locRef: string, busDt: string) {
  await ensureWorld();
  const loc = await getLocation(locRef);
  const tz = loc?.tz || 'America/Los_Angeles';
  const needed = completedQuarterHours(busDt, tz);
  const existing = await query<{ clsd_bus_prd: number; payload: Json }>(
    `SELECT clsd_bus_prd, payload FROM apitestdata_qh_snapshots
     WHERE operation = $1 AND loc_ref = $2 AND bus_dt = $3
     ORDER BY clsd_bus_prd`,
    [endpoint.operation, locRef, busDt]
  );
  const have = new Set(existing.map((row) => Number(row.clsd_bus_prd)));
  const missing = needed.filter((period) => !have.has(period));
  if (missing.length) {
    const { rvcs, items, orderTypes } = await defsForTotals(locRef, endpoint);
    for (const period of missing) {
      const slice = buildPeriodSlice(endpoint, rvcs, items, orderTypes, period);
      await query(
        `INSERT INTO apitestdata_qh_snapshots (operation, loc_ref, bus_dt, clsd_bus_prd, payload)
         VALUES ($1,$2,$3,$4,$5::jsonb)
         ON CONFLICT (operation, loc_ref, bus_dt, clsd_bus_prd) DO NOTHING`,
        [endpoint.operation, locRef, busDt, period, JSON.stringify(slice)]
      );
    }
  }

  const rows = await query<{ clsd_bus_prd: number; payload: Json }>(
    `SELECT clsd_bus_prd, payload FROM apitestdata_qh_snapshots
     WHERE operation = $1 AND loc_ref = $2 AND bus_dt = $3 AND clsd_bus_prd = ANY($4::int[])
     ORDER BY clsd_bus_prd`,
    [endpoint.operation, locRef, busDt, needed]
  );

  const rvcMap = new Map<number, Json[]>();
  for (const row of rows) {
    const slice = row.payload;
    const centers = Array.isArray(slice.revenueCenters) ? (slice.revenueCenters as Json[]) : [];
    for (const center of centers) {
      const rvcNum = Number(center.rvcNum);
      const period: Json = { ...center, clsdBusPrd: Number(row.clsd_bus_prd) };
      delete period.rvcNum;
      if (!rvcMap.has(rvcNum)) rvcMap.set(rvcNum, []);
      rvcMap.get(rvcNum)!.push(period);
    }
  }

  return {
    locRef,
    busDt,
    revenueCenters: [...rvcMap.entries()].map(([rvcNum, quarterHours]) => ({
      rvcNum,
      quarterHours,
    })),
  };
}

export async function latestBusDt(locRef: string) {
  await ensureWorld();
  const loc = await getLocation(locRef);
  const tz = loc?.tz || 'America/Los_Angeles';
  return {
    locRef,
    latestBusDt: todayInTz(tz),
    curUTC: utcNowIso(),
    curUtc: utcNowIso(),
  };
}

export async function resetSnapshots() {
  await query('DELETE FROM apitestdata_qh_snapshots');
  await query('DELETE FROM apitestdata_daily_snapshots');
}

export async function resetDefinitions() {
  await resetSnapshots();
  await query('DELETE FROM apitestdata_dimension_items');
  await query('DELETE FROM apitestdata_revenue_centers');
  await query('DELETE FROM apitestdata_locations');
  invalidateWorld();
}
