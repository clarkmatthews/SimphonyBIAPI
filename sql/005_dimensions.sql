CREATE TABLE IF NOT EXISTS location_dimensions (
    loc_ref text PRIMARY KEY,
    name text,
    open_dt date,
    active boolean,
    src_name text,
    src_ver text,
    tz text,
    curr text,
    addr_ln1 text,
    addr_ln2 text,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS latest_business_dates (
    loc_ref text PRIMARY KEY,
    latest_bus_dt date,
    cur_utc timestamptz,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revenue_center_dimensions (
    loc_ref text NOT NULL,
    rvc_num integer NOT NULL,
    name text,
    active boolean,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, rvc_num)
);

CREATE TABLE IF NOT EXISTS menu_item_dimensions (
    loc_ref text NOT NULL,
    mi_num integer NOT NULL,
    name text,
    maj_grp_num integer,
    fam_grp_num integer,
    active boolean,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, mi_num)
);

CREATE TABLE IF NOT EXISTS menu_item_prices (
    loc_ref text NOT NULL,
    mi_num integer NOT NULL,
    price_seq integer NOT NULL DEFAULT 1,
    price numeric,
    effective_from date,
    effective_to date,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, mi_num, price_seq)
);

CREATE TABLE IF NOT EXISTS discount_dimensions (
    loc_ref text NOT NULL,
    dsc_num integer NOT NULL,
    name text,
    active boolean,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, dsc_num)
);

CREATE TABLE IF NOT EXISTS employee_dimensions (
    loc_ref text NOT NULL,
    emp_num integer NOT NULL,
    first_name text,
    last_name text,
    payroll_id text,
    active boolean,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, emp_num)
);

CREATE TABLE IF NOT EXISTS job_code_dimensions (
    loc_ref text NOT NULL,
    jc_num integer NOT NULL,
    name text,
    labor_cat text,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, jc_num)
);

CREATE TABLE IF NOT EXISTS order_channel_dimensions (
    loc_ref text NOT NULL,
    oc_num integer NOT NULL,
    name text,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, oc_num)
);

CREATE TABLE IF NOT EXISTS order_type_dimensions (
    loc_ref text NOT NULL,
    ot_num integer NOT NULL,
    name text,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, ot_num)
);

CREATE TABLE IF NOT EXISTS reason_code_dimensions (
    loc_ref text NOT NULL,
    rsn_code_num integer NOT NULL,
    name text,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, rsn_code_num)
);

CREATE TABLE IF NOT EXISTS service_charge_dimensions (
    loc_ref text NOT NULL,
    svc_num integer NOT NULL,
    name text,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, svc_num)
);

CREATE TABLE IF NOT EXISTS tax_dimensions (
    loc_ref text NOT NULL,
    tax_num integer NOT NULL,
    name text,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, tax_num)
);

CREATE TABLE IF NOT EXISTS tender_media_dimensions (
    loc_ref text NOT NULL,
    tm_num integer NOT NULL,
    name text,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, tm_num)
);

CREATE TABLE IF NOT EXISTS cashier_dimensions (
    loc_ref text NOT NULL,
    cashier_num integer NOT NULL,
    name text,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, cashier_num)
);

CREATE TABLE IF NOT EXISTS cash_management_item_dimensions (
    loc_ref text NOT NULL,
    cm_item_num integer NOT NULL,
    name text,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, cm_item_num)
);

CREATE TABLE IF NOT EXISTS payment_account_holder_dimensions (
    loc_ref text NOT NULL,
    acct_holder_id text NOT NULL,
    name text,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, acct_holder_id)
);

CREATE TABLE IF NOT EXISTS payment_account_dimensions (
    loc_ref text NOT NULL,
    acct_id text NOT NULL,
    name text,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, acct_id)
);
