import type { EndpointDef, FieldMap } from '../../lib/types';

export type LocationRow = {
  loc_ref: string;
  name: string;
  open_dt: string;
  active: boolean;
  src_name: string;
  src_ver: string;
  tz: string;
  curr: string;
  addr_ln1: string;
  addr_ln2: string;
  extra: Record<string, unknown>;
};

export type RvcRow = {
  loc_ref: string;
  rvc_num: number;
  name: string;
  active: boolean;
  extra: Record<string, unknown>;
};

export type DimItem = {
  kind: string;
  loc_ref: string;
  item_num: string;
  name: string;
  extra: Record<string, unknown>;
};

export const ITEM_KINDS = [
  'menu_item',
  'combo',
  'price',
  'discount',
  'employee',
  'job_code',
  'order_channel',
  'order_type',
  'reason_code',
  'service_charge',
  'tax',
  'tender_media',
  'cashier',
  'cm_item',
  'payment_account_holder',
  'payment_account',
  'control',
] as const;

export type ItemKind = (typeof ITEM_KINDS)[number];

const CITIES = [
  { name: 'Harbor Grill', city: 'Seattle', tz: 'America/Los_Angeles', prefix: 'SEA' },
  { name: 'Canyon Kitchen', city: 'Denver', tz: 'America/Denver', prefix: 'DEN' },
  { name: 'Lakeview Bistro', city: 'Chicago', tz: 'America/Chicago', prefix: 'CHI' },
  { name: 'Pierhouse Cafe', city: 'Boston', tz: 'America/New_York', prefix: 'BOS' },
  { name: 'Mission Tavern', city: 'San Francisco', tz: 'America/Los_Angeles', prefix: 'SFO' },
  { name: 'Riverwalk Grill', city: 'Austin', tz: 'America/Chicago', prefix: 'AUS' },
];

const RVC_NAMES = ['Dining Room', 'Bar', 'Patio', 'Takeout', 'Banquet'];
const MENU_ITEMS = [
  'Classic Burger',
  'Garden Salad',
  'Fish Tacos',
  'Margherita Pizza',
  'Ribeye Steak',
  'Chicken Alfredo',
  'Clam Chowder',
  'French Fries',
  'Chocolate Cake',
  'Iced Tea',
  'House Lemonade',
  'Espresso',
];
const DISCOUNTS = ['Employee Meal', 'Happy Hour', 'Open Discount', 'Manager Comp', 'Loyalty'];
const FIRST_NAMES = ['Alex', 'Jordan', 'Sam', 'Riley', 'Casey', 'Morgan', 'Quinn', 'Avery', 'Jamie', 'Taylor'];
const LAST_NAMES = ['Nguyen', 'Patel', 'Garcia', 'Brooks', 'Kim', 'Reed', 'Santos', 'Hughes', 'Ortiz', 'Walsh'];
const JOB_CODES = [
  { name: 'Server', laborCat: 'FOH' },
  { name: 'Bartender', laborCat: 'FOH' },
  { name: 'Host', laborCat: 'FOH' },
  { name: 'Cook', laborCat: 'BOH' },
  { name: 'Manager', laborCat: 'MGMT' },
];
const ORDER_CHANNELS = ['Walk-in', 'Online', 'Phone', 'App'];
const ORDER_TYPES = ['Dine In', 'Take Out', 'Delivery', 'Bar'];
const REASON_CODES = ['Waste', 'Spill', 'Guest Complaint', 'Training'];
const SERVICE_CHARGES = ['Auto Gratuity', 'Delivery Fee', 'Large Party'];
const TAXES = ['Sales Tax', 'City Tax', 'Local Tax'];
const TENDERS = ['Cash', 'Visa', 'Mastercard', 'Amex', 'Gift Card'];
const CM_ITEMS = ['Cash Drawer', 'Safe Drop', 'Paid Out', 'Tip Out'];
const CONTROLS = ['Voids', 'No Sales', 'Error Correct', 'Manager Void'];

function pick<T>(items: T[], count: number) {
  const copy = [...items];
  const out: T[] = [];
  while (copy.length && out.length < count) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function money(min: number, max: number) {
  return Number((min + Math.random() * (max - min)).toFixed(2));
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function generateLocations(): LocationRow[] {
  const chosen = pick(CITIES, 4);
  return chosen.map((city, i) => {
    const locRef = `${city.prefix}${String(i + 1).padStart(2, '0')}`;
    const open = new Date();
    open.setFullYear(open.getFullYear() - randInt(2, 8));
    const extra = {
      locRef,
      name: city.name,
      openDt: ymd(open),
      active: true,
      srcName: 'Simphony',
      srcVer: '19.8',
      tz: city.tz,
      curr: 'USD',
      addrLn1: `${randInt(100, 9999)} ${city.city} Ave`,
      addrLn2: city.city,
    };
    return {
      loc_ref: locRef,
      name: city.name,
      open_dt: extra.openDt,
      active: true,
      src_name: extra.srcName,
      src_ver: extra.srcVer,
      tz: city.tz,
      curr: 'USD',
      addr_ln1: extra.addrLn1,
      addr_ln2: extra.addrLn2,
      extra,
    };
  });
}

export function generateRvcs(locRef: string): RvcRow[] {
  const count = randInt(2, 4);
  return pick(RVC_NAMES, count).map((name, i) => {
    const rvcNum = i + 1;
    const extra = { rvcNum, name, rvcName: name, active: true };
    return { loc_ref: locRef, rvc_num: rvcNum, name, active: true, extra };
  });
}

export function generateDimensionItems(locRef: string): DimItem[] {
  const items: DimItem[] = [];
  const menuCount = randInt(8, 12);
  const menus = pick(MENU_ITEMS, menuCount).map((name, i) => {
    const miNum = 1000 + i + 1;
    return {
      kind: 'menu_item',
      loc_ref: locRef,
      item_num: String(miNum),
      name,
      extra: {
        miNum,
        name,
        miName: name,
        majGrpNum: randInt(1, 6),
        famGrpNum: randInt(1, 12),
        active: true,
      },
    };
  });
  items.push(...menus);

  for (const menu of menus) {
    const miNum = Number(menu.item_num);
    items.push({
      kind: 'price',
      loc_ref: locRef,
      item_num: `${miNum}-1`,
      name: menu.name,
      extra: {
        miNum,
        priceSeq: 1,
        seq: 1,
        price: money(4, 38),
        effectiveFrom: '2020-01-01',
        effFrom: '2020-01-01',
        effectiveTo: null,
        effTo: null,
      },
    });
  }

  for (const menu of pick(menus, Math.min(4, menus.length))) {
    items.push({
      kind: 'combo',
      loc_ref: locRef,
      item_num: menu.item_num,
      name: `${menu.name} Combo`,
      extra: { comboMiNum: Number(menu.item_num), miNum: Number(menu.item_num), name: `${menu.name} Combo` },
    });
  }

  pick(DISCOUNTS, randInt(3, 5)).forEach((name, i) => {
    const dscNum = 200 + i + 1;
    items.push({
      kind: 'discount',
      loc_ref: locRef,
      item_num: String(dscNum),
      name,
      extra: { dscNum, name, active: true },
    });
  });

  const employees = Array.from({ length: randInt(5, 8) }, (_, i) => {
    const empNum = 3000 + i + 1;
    const fName = FIRST_NAMES[randInt(0, FIRST_NAMES.length - 1)];
    const lName = LAST_NAMES[randInt(0, LAST_NAMES.length - 1)];
    return {
      kind: 'employee',
      loc_ref: locRef,
      item_num: String(empNum),
      name: `${fName} ${lName}`,
      extra: {
        empNum,
        fName,
        firstName: fName,
        lName,
        lastName: lName,
        payrollID: `PR${empNum}`,
        payrollId: `PR${empNum}`,
        active: true,
      },
    };
  });
  items.push(...employees);

  pick(JOB_CODES, randInt(3, 5)).forEach((job, i) => {
    const jcNum = 10 + i + 1;
    items.push({
      kind: 'job_code',
      loc_ref: locRef,
      item_num: String(jcNum),
      name: job.name,
      extra: { jcNum, jobCodeNum: jcNum, name: job.name, laborCat: job.laborCat, labCat: job.laborCat },
    });
  });

  pick(ORDER_CHANNELS, randInt(2, 4)).forEach((name, i) => {
    const ocNum = i + 1;
    items.push({ kind: 'order_channel', loc_ref: locRef, item_num: String(ocNum), name, extra: { ocNum, name } });
  });

  pick(ORDER_TYPES, randInt(3, 4)).forEach((name, i) => {
    const otNum = i + 1;
    items.push({ kind: 'order_type', loc_ref: locRef, item_num: String(otNum), name, extra: { otNum, name } });
  });

  pick(REASON_CODES, randInt(3, 4)).forEach((name, i) => {
    const rsnNum = i + 1;
    items.push({
      kind: 'reason_code',
      loc_ref: locRef,
      item_num: String(rsnNum),
      name,
      extra: { rsnCodeNum: rsnNum, rsnNum, name },
    });
  });

  pick(SERVICE_CHARGES, randInt(2, 3)).forEach((name, i) => {
    const svcNum = i + 1;
    items.push({ kind: 'service_charge', loc_ref: locRef, item_num: String(svcNum), name, extra: { svcNum, name } });
  });

  pick(TAXES, randInt(2, 3)).forEach((name, i) => {
    const taxNum = i + 1;
    items.push({ kind: 'tax', loc_ref: locRef, item_num: String(taxNum), name, extra: { taxNum, name } });
  });

  pick(TENDERS, randInt(3, 5)).forEach((name, i) => {
    const tmNum = i + 1;
    items.push({ kind: 'tender_media', loc_ref: locRef, item_num: String(tmNum), name, extra: { tmNum, name } });
  });

  for (const emp of pick(employees, Math.min(4, employees.length))) {
    items.push({
      kind: 'cashier',
      loc_ref: locRef,
      item_num: emp.item_num,
      name: emp.name,
      extra: { cashierNum: Number(emp.item_num), empNum: Number(emp.item_num), name: emp.name },
    });
  }

  pick(CM_ITEMS, randInt(3, 4)).forEach((name, i) => {
    const cmItemNum = i + 1;
    items.push({ kind: 'cm_item', loc_ref: locRef, item_num: String(cmItemNum), name, extra: { cmItemNum, name } });
  });

  const holderCount = randInt(2, 3);
  for (let i = 0; i < holderCount; i += 1) {
    const id = `AH-${locRef}-${i + 1}`;
    const name = `${LAST_NAMES[randInt(0, LAST_NAMES.length - 1)]} Holdings`;
    items.push({
      kind: 'payment_account_holder',
      loc_ref: locRef,
      item_num: id,
      name,
      extra: { acctHolderId: id, id, name },
    });
  }

  for (let i = 0; i < holderCount; i += 1) {
    const id = `ACCT-${locRef}-${i + 1}`;
    const name = i === 0 ? 'House Account' : `Banquet Account ${i}`;
    items.push({
      kind: 'payment_account',
      loc_ref: locRef,
      item_num: id,
      name,
      extra: { acctId: id, id, name },
    });
  }

  pick(CONTROLS, randInt(3, 4)).forEach((name, i) => {
    items.push({
      kind: 'control',
      loc_ref: locRef,
      item_num: String(i + 1),
      name,
      extra: { ctrlName: name, name, ctrlTtl: 0, ctrlCnt: 0 },
    });
  });

  return items;
}

export const KIND_BY_COLUMN: Record<string, ItemKind> = {
  combo_mi_num: 'combo',
  mi_num: 'menu_item',
  dsc_num: 'discount',
  emp_num: 'employee',
  jc_num: 'job_code',
  oc_num: 'order_channel',
  ot_num: 'order_type',
  svc_num: 'service_charge',
  tax_num: 'tax',
  tm_num: 'tender_media',
  ctrl_name: 'control',
  cashier_num: 'cashier',
  cm_item_num: 'cm_item',
  acct_holder_id: 'payment_account_holder',
  acct_id: 'payment_account',
  rsn_code_num: 'reason_code',
};

const CONTEXT_COLUMNS = new Set(['loc_ref', 'bus_dt', 'rvc_num', 'clsd_bus_prd']);

function primarySource(field: FieldMap) {
  return field.sources[0];
}

function isMoneyField(column: string) {
  return /ttl|price|fcst|cost|over_short/.test(column);
}

function isCountField(column: string) {
  return /cnt|qty|num_tbl|wait_|dine_|park_|drv_/.test(column);
}

export function itemKeyField(endpoint: EndpointDef): FieldMap | undefined {
  return endpoint.fields.find((field) => KIND_BY_COLUMN[field.column]);
}

export function buildMetricFields(endpoint: EndpointDef, scale: 'daily' | 'quarterHour') {
  const out: Record<string, unknown> = {};
  const moneyMax = scale === 'daily' ? 2400 : 180;
  const countMax = scale === 'daily' ? 90 : 12;
  for (const field of endpoint.fields) {
    if (CONTEXT_COLUMNS.has(field.column) || KIND_BY_COLUMN[field.column]) continue;
    if (isMoneyField(field.column)) out[primarySource(field)] = money(0, moneyMax);
    else if (isCountField(field.column)) out[primarySource(field)] = randInt(0, countMax);
  }
  return out;
}

export function itemIdentity(field: FieldMap, item: DimItem) {
  const key = primarySource(field);
  if (field.column === 'ctrl_name') return { [key]: item.name, name: item.name };
  if (field.column.endsWith('_id')) return { [key]: item.item_num, id: item.item_num };
  const numeric = Number(item.item_num);
  return { [key]: Number.isNaN(numeric) ? item.item_num : numeric };
}

export function todayInTz(tz: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function completedQuarterHours(busDt: string, tz: string) {
  const today = todayInTz(tz);
  if (busDt < today) return Array.from({ length: 96 }, (_, i) => i + 1);
  if (busDt > today) return [];
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  const completed = Math.floor((hour * 60 + minute) / 15);
  return Array.from({ length: completed }, (_, i) => i + 1);
}

export function utcNowIso() {
  return new Date().toISOString();
}
