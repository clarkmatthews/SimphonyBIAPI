-- Daily aggregation tables. operations_daily_totals already exists in 001.

CREATE TABLE IF NOT EXISTS combo_item_daily_totals (
    loc_ref text NOT NULL,
    bus_dt date NOT NULL,
    rvc_num integer NOT NULL,
    combo_mi_num integer NOT NULL,
    net_sls_ttl numeric,
    sls_cnt integer,
    sls_qty numeric,
    itm_dsc_ttl numeric,
    sub_dsc_ttl numeric,
    dsc_ttl numeric,
    svc_ttl numeric,
    gst_cnt integer,
    prep_cost_ttl numeric,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, bus_dt, rvc_num, combo_mi_num)
);

CREATE TABLE IF NOT EXISTS control_daily_totals (
    loc_ref text NOT NULL,
    bus_dt date NOT NULL,
    rvc_num integer NOT NULL,
    ctrl_name text NOT NULL,
    ctrl_ttl numeric,
    ctrl_cnt integer,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, bus_dt, rvc_num, ctrl_name)
);

CREATE TABLE IF NOT EXISTS discount_daily_totals (
    loc_ref text NOT NULL,
    bus_dt date NOT NULL,
    rvc_num integer NOT NULL,
    dsc_num integer NOT NULL,
    dsc_cnt integer,
    dsc_ttl numeric,
    net_sls_ttl numeric,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, bus_dt, rvc_num, dsc_num)
);

CREATE TABLE IF NOT EXISTS employee_daily_totals (
    loc_ref text NOT NULL,
    bus_dt date NOT NULL,
    rvc_num integer NOT NULL,
    emp_num integer NOT NULL,
    net_sls_ttl numeric,
    chk_cnt integer,
    gst_cnt integer,
    itm_dsc_ttl numeric,
    sub_dsc_ttl numeric,
    svc_ttl numeric,
    vd_ttl numeric,
    vd_cnt integer,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, bus_dt, rvc_num, emp_num)
);

CREATE TABLE IF NOT EXISTS job_code_daily_totals (
    loc_ref text NOT NULL,
    bus_dt date NOT NULL,
    rvc_num integer NOT NULL,
    jc_num integer NOT NULL,
    net_sls_ttl numeric,
    chk_cnt integer,
    gst_cnt integer,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, bus_dt, rvc_num, jc_num)
);

CREATE TABLE IF NOT EXISTS menu_item_daily_totals (
    loc_ref text NOT NULL,
    bus_dt date NOT NULL,
    rvc_num integer NOT NULL,
    mi_num integer NOT NULL,
    sls_cnt integer,
    sls_qty numeric,
    net_sls_ttl numeric,
    itm_dsc_ttl numeric,
    sub_dsc_ttl numeric,
    dsc_ttl numeric,
    svc_ttl numeric,
    non_rev_svc_ttl numeric,
    rtn_cnt integer,
    rtn_ttl numeric,
    prep_cost_ttl numeric,
    gst_cnt integer,
    vd_cnt integer,
    vd_ttl numeric,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, bus_dt, rvc_num, mi_num)
);

CREATE TABLE IF NOT EXISTS order_channel_daily_totals (
    loc_ref text NOT NULL,
    bus_dt date NOT NULL,
    rvc_num integer NOT NULL,
    oc_num integer NOT NULL,
    ot_num integer,
    net_sls_ttl numeric,
    dsc_ttl numeric,
    svc_ttl numeric,
    non_rev_svc_ttl numeric,
    tax_coll_ttl numeric,
    prep_cost_ttl numeric,
    chk_cnt integer,
    gst_cnt integer,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, bus_dt, rvc_num, oc_num)
);

CREATE TABLE IF NOT EXISTS order_type_daily_totals (
    loc_ref text NOT NULL,
    bus_dt date NOT NULL,
    rvc_num integer NOT NULL,
    ot_num integer NOT NULL,
    net_sls_ttl numeric,
    dsc_ttl numeric,
    svc_ttl numeric,
    non_rev_svc_ttl numeric,
    tax_coll_ttl numeric,
    prep_cost_ttl numeric,
    chk_cnt integer,
    gst_cnt integer,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, bus_dt, rvc_num, ot_num)
);

CREATE TABLE IF NOT EXISTS service_charge_daily_totals (
    loc_ref text NOT NULL,
    bus_dt date NOT NULL,
    rvc_num integer NOT NULL,
    svc_num integer NOT NULL,
    svc_cnt integer,
    svc_ttl numeric,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, bus_dt, rvc_num, svc_num)
);

CREATE TABLE IF NOT EXISTS tax_daily_totals (
    loc_ref text NOT NULL,
    bus_dt date NOT NULL,
    rvc_num integer NOT NULL,
    tax_num integer NOT NULL,
    txbl_sls_ttl numeric,
    tax_coll_ttl numeric,
    tax_exmpt_sls_ttl numeric,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, bus_dt, rvc_num, tax_num)
);

CREATE TABLE IF NOT EXISTS tender_media_daily_totals (
    loc_ref text NOT NULL,
    bus_dt date NOT NULL,
    rvc_num integer NOT NULL,
    tm_num integer NOT NULL,
    tnd_cnt integer,
    tnd_ttl numeric,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, bus_dt, rvc_num, tm_num)
);
