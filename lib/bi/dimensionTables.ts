import type { EndpointDef, FieldMap } from '../types';

export type PgType = 'text' | 'integer' | 'numeric' | 'boolean' | 'date' | 'timestamptz';

export type DimColumn = {
  api: string;
  pg: PgType;
  sources?: string[];
};

export type DimensionTable = {
  id: string;
  name: string;
  operation: string;
  table: string;
  kind: 'definition' | 'latestBusDt';
  rootArray?: string;
  uniqueKey: string[];
  columns: DimColumn[];
};

export function apiColumn(api: string) {
  return api
    .replace(/ID$/g, 'Id')
    .replace(/([a-z0-9])([A-Z])/g, (_match, left: string, right: string) => `${left}_${right}`)
    .toLowerCase();
}

function col(api: string, pg: PgType, sources?: string[]): DimColumn {
  return { api, pg, sources };
}

function groups(prefix = ''): DimColumn[] {
  const hier = prefix ? `${prefix}CatGrpHierName` : 'catGrpHierName';
  const name = prefix ? `${prefix}CatGrpName` : 'catGrpName';
  const out: DimColumn[] = [];
  for (let i = 1; i <= 4; i += 1) {
    out.push(col(`${hier}${i}`, 'text'));
    out.push(col(`${name}${i}`, 'text'));
  }
  return out;
}

const master: DimColumn[] = [col('mstrNum', 'integer'), col('mstrName', 'text')];
const extRefs: DimColumn[] = [col('extRef1', 'text'), col('extRef2', 'text')];
const loc: DimColumn[] = [col('locRef', 'text')];

export const DIMENSION_TABLES: DimensionTable[] = [
  {
    id: 'getLocationDimensions',
    name: 'Location Dimensions',
    operation: 'getLocationDimensions',
    table: 'location_dimensions',
    kind: 'definition',
    rootArray: 'locations',
    uniqueKey: ['loc_ref'],
    columns: [
      ...loc,
      col('name', 'text'),
      col('openDt', 'date'),
      col('active', 'boolean'),
      col('srcName', 'text'),
      col('srcVer', 'text'),
      col('tz', 'text'),
      col('curr', 'text'),
      col('addrLn1', 'text'),
      col('addrLn2', 'text'),
      col('addrLn3', 'text'),
      col('postalCode', 'text'),
      col('phone', 'text'),
      col('phoneCountryCode', 'text'),
      col('countryCode', 'text'),
      col('countryName', 'text'),
      col('regionCode', 'text'),
      col('regionName', 'text'),
    ],
  },
  {
    id: 'getLatestBusDt',
    name: 'Latest Business Date',
    operation: 'getLatestBusDt',
    table: 'latest_business_dates',
    kind: 'latestBusDt',
    uniqueKey: ['loc_ref'],
    columns: [...loc, col('latestBusDt', 'date'), col('curUTC', 'timestamptz'), col('softwareVersion', 'text')],
  },
  {
    id: 'getRevenueCenterDimensions',
    name: 'Revenue Center Dimensions',
    operation: 'getRevenueCenterDimensions',
    table: 'revenue_center_dimensions',
    kind: 'definition',
    rootArray: 'revenueCenters',
    uniqueKey: ['loc_ref', 'num'],
    columns: [
      ...loc,
      col('num', 'integer'),
      col('name', 'text'),
      ...master,
      ...groups(),
      col('addrLn1', 'text'),
      col('addrLn2', 'text'),
      col('addrLn3', 'text'),
      col('postalCode', 'text'),
      col('phone', 'text'),
      col('phoneCountryCode', 'text'),
      col('countryCode', 'text'),
      col('countryName', 'text'),
      col('regionCode', 'text'),
      col('regionName', 'text'),
    ],
  },
  {
    id: 'getMenuItemDimensions',
    name: 'Menu Item Dimensions',
    operation: 'getMenuItemDimensions',
    table: 'menu_item_dimensions',
    kind: 'definition',
    rootArray: 'menuItems',
    uniqueKey: ['loc_ref', 'num'],
    columns: [
      ...loc,
      col('num', 'integer'),
      col('name', 'text'),
      ...master,
      col('name2', 'text'),
      col('name2MstrNum', 'integer'),
      col('name2MstrName', 'text'),
      col('majGrpNum', 'integer'),
      col('majGrpName', 'text'),
      col('famGrpNum', 'integer'),
      col('famGrpName', 'text'),
      col('majGrpMstrNum', 'integer'),
      col('majGrpMstrName', 'text'),
      col('famGrpMstrNum', 'integer'),
      col('famGrpMstrName', 'text'),
      col('doNotIncludeInSales', 'boolean'),
      col('category', 'text'),
      col('revFlag', 'boolean'),
      ...groups(),
      ...groups('mg'),
      ...groups('fg'),
      ...extRefs,
    ],
  },
  {
    id: 'getMenuItemPrices',
    name: 'Menu Item Prices',
    operation: 'getMenuItemPrices',
    table: 'menu_item_prices',
    kind: 'definition',
    rootArray: 'menuItemPrices',
    uniqueKey: ['loc_ref', 'num', 'rvc_num', 'prc_lvl_num', 'eff_fr_dt'],
    columns: [
      ...loc,
      col('num', 'integer'),
      col('rvcNum', 'integer'),
      col('prcLvlNum', 'integer'),
      col('prcLvlName', 'text'),
      col('price', 'numeric'),
      col('cost', 'numeric'),
      col('effFrDt', 'timestamptz'),
      col('effToDt', 'timestamptz'),
      ...extRefs,
    ],
  },
  {
    id: 'getDiscountDimensions',
    name: 'Discount Dimensions',
    operation: 'getDiscountDimensions',
    table: 'discount_dimensions',
    kind: 'definition',
    rootArray: 'discounts',
    uniqueKey: ['loc_ref', 'num'],
    columns: [
      ...loc,
      col('num', 'integer'),
      col('name', 'text'),
      ...master,
      col('posPercent', 'numeric'),
      ...groups(),
      col('rptGrpNum', 'integer'),
      col('rptGrpName', 'text'),
      ...extRefs,
    ],
  },
  {
    id: 'getEmployeeDimensions',
    name: 'Employee Dimensions',
    operation: 'getEmployeeDimensions',
    table: 'employee_dimensions',
    kind: 'definition',
    rootArray: 'employees',
    uniqueKey: ['loc_ref', 'num'],
    columns: [
      ...loc,
      col('num', 'integer'),
      col('uuid', 'integer', ['uuid', 'uuId']),
      col('employeeId', 'integer'),
      col('fName', 'text'),
      col('lName', 'text'),
      col('payrollId', 'integer'),
      col('externalPayrollID', 'integer'),
      col('homeLocRef', 'text'),
      col('className', 'text'),
      col('classNum', 'integer'),
      col('classMstrName', 'text'),
      col('classMstrNum', 'integer'),
    ],
  },
  {
    id: 'getJobCodeDimensions',
    name: 'Job Code Dimensions',
    operation: 'getJobCodeDimensions',
    table: 'job_code_dimensions',
    kind: 'definition',
    rootArray: 'jobCodes',
    uniqueKey: ['loc_ref', 'num'],
    columns: [
      ...loc,
      col('num', 'integer'),
      col('name', 'text'),
      ...master,
      col('lbrCatNum', 'integer'),
      col('lbrCatName', 'text'),
      col('lbrCatMstrNum', 'integer'),
      col('lbrCatMstrName', 'text'),
    ],
  },
  {
    id: 'getOrderChannelDimensions',
    name: 'Order Channel Dimensions',
    operation: 'getOrderChannelDimensions',
    table: 'order_channel_dimensions',
    kind: 'definition',
    rootArray: 'orderChannels',
    uniqueKey: ['loc_ref', 'num'],
    columns: [...loc, col('num', 'integer'), col('name', 'text'), ...master],
  },
  {
    id: 'getOrderTypeDimensions',
    name: 'Order Type Dimensions',
    operation: 'getOrderTypeDimensions',
    table: 'order_type_dimensions',
    kind: 'definition',
    rootArray: 'orderTypes',
    uniqueKey: ['loc_ref', 'num'],
    columns: [...loc, col('num', 'integer'), col('name', 'text'), ...master, ...groups()],
  },
  {
    id: 'getReasonCodeDimensions',
    name: 'Reason Code Dimensions',
    operation: 'getReasonCodeDimensions',
    table: 'reason_code_dimensions',
    kind: 'definition',
    rootArray: 'reasonCodes',
    uniqueKey: ['loc_ref', 'num'],
    columns: [
      ...loc,
      col('num', 'integer'),
      col('name', 'text'),
      ...master,
      col('posRef', 'integer'),
      col('mstrPosRef', 'integer'),
      col('type', 'integer'),
    ],
  },
  {
    id: 'getServiceChargeDimensions',
    name: 'Service Charge Dimensions',
    operation: 'getServiceChargeDimensions',
    table: 'service_charge_dimensions',
    kind: 'definition',
    rootArray: 'serviceCharges',
    uniqueKey: ['loc_ref', 'num'],
    columns: [
      ...loc,
      col('num', 'integer'),
      col('name', 'text'),
      ...master,
      col('posPercent', 'numeric'),
      col('revFlag', 'boolean'),
      col('chrgTipsFlag', 'boolean'),
      col('category', 'text'),
      ...groups(),
      ...extRefs,
    ],
  },
  {
    id: 'getTaxDimensions',
    name: 'Tax Dimensions',
    operation: 'getTaxDimensions',
    table: 'tax_dimensions',
    kind: 'definition',
    rootArray: 'taxes',
    uniqueKey: ['loc_ref', 'num', 'eff_fr_dt'],
    columns: [
      ...loc,
      col('num', 'integer'),
      col('name', 'text'),
      ...master,
      col('type', 'integer'),
      col('taxRate', 'numeric'),
      col('effFrDt', 'timestamptz'),
      col('effToDt', 'timestamptz'),
      ...groups(),
    ],
  },
  {
    id: 'getTenderMediaDimensions',
    name: 'Tender Media Dimensions',
    operation: 'getTenderMediaDimensions',
    table: 'tender_media_dimensions',
    kind: 'definition',
    rootArray: 'tenderMedias',
    uniqueKey: ['loc_ref', 'num'],
    columns: [
      ...loc,
      col('num', 'integer'),
      col('name', 'text'),
      ...master,
      col('type', 'integer'),
      col('subType', 'numeric'),
      col('cat', 'numeric'),
      ...groups(),
      col('autoClsdTnd', 'boolean'),
      ...extRefs,
    ],
  },
  {
    id: 'getCashierDimensions',
    name: 'Cashier Dimensions',
    operation: 'getCashierDimensions',
    table: 'cashier_dimensions',
    kind: 'definition',
    rootArray: 'cashiers',
    uniqueKey: ['loc_ref', 'num'],
    columns: [...loc, col('num', 'integer'), col('name', 'text'), ...master],
  },
  {
    id: 'getCashManagementItemDimensions',
    name: 'Cash Management Item Dimensions',
    operation: 'getCashManagementItemDimensions',
    table: 'cash_management_item_dimensions',
    kind: 'definition',
    rootArray: 'cashMgmtItems',
    uniqueKey: ['loc_ref', 'num'],
    columns: [
      ...loc,
      col('num', 'integer'),
      col('name', 'text'),
      ...master,
      col('type', 'integer'),
      col('recordNum', 'integer'),
      ...groups(),
    ],
  },
  {
    id: 'getPaymentAccountHolderDimensions',
    name: 'Payment Account Holders',
    operation: 'getPaymentAccountHolderDimensions',
    table: 'payment_account_holder_dimensions',
    kind: 'definition',
    rootArray: 'accountHolders',
    uniqueKey: ['acct_hldr_code'],
    columns: [
      col('acctHldrCode', 'text'),
      col('acctHldrName', 'text'),
      col('stlmtCur', 'text'),
      col('acctHldrStatus', 'integer'),
      col('verification', 'integer'),
      col('busEmail', 'text'),
      col('phoneNum', 'text'),
      col('webAddr', 'text'),
      col('streetNum', 'text'),
      col('streetName', 'text'),
      col('city', 'text'),
      col('state', 'text'),
      col('zip', 'text'),
      col('countryCode', 'text'),
      col('createdDt', 'date'),
    ],
  },
  {
    id: 'getPaymentAccountDimensions',
    name: 'Payment Account Dimensions',
    operation: 'getPaymentAccountDimensions',
    table: 'payment_account_dimensions',
    kind: 'definition',
    rootArray: 'accounts',
    uniqueKey: ['loc_ref', 'acct_code'],
    columns: [
      ...loc,
      col('acctHldrCode', 'text'),
      col('acctCode', 'text'),
      col('acctName', 'text'),
      col('createdDt', 'date'),
      col('acctStatus', 'integer'),
      col('ccStmtName', 'text'),
    ],
  },
];

export function dimensionFields(table: DimensionTable): FieldMap[] {
  return table.columns.map((column) => ({
    column: apiColumn(column.api),
    sources: column.sources ?? [column.api],
  }));
}

export function dimensionEndpoints(): EndpointDef[] {
  return DIMENSION_TABLES.map((table) => ({
    id: table.id,
    name: table.name,
    operation: table.operation,
    category: 'definition',
    table: table.table,
    kind: table.kind,
    rootArray: table.rootArray,
    uniqueKey: table.uniqueKey,
    fields: dimensionFields(table),
  }));
}

function quoteIdent(name: string) {
  return `"${name}"`;
}

export function dimensionCreateSql() {
  return DIMENSION_TABLES.map((table) => {
    const columns = table.columns
      .map((column) => {
        const name = apiColumn(column.api);
        const notNull = table.uniqueKey.includes(name) ? ' NOT NULL' : '';
        return `    ${quoteIdent(name)} ${column.pg}${notNull}`;
      })
      .join(',\n');
    const pk = table.uniqueKey.map(quoteIdent).join(', ');
    return `CREATE TABLE ${quoteIdent(table.table)} (
${columns},
    "extra" jsonb,
    "synced_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (${pk})
);`;
  }).join('\n\n');
}
