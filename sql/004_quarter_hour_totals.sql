CREATE TABLE IF NOT EXISTS combo_item_qh_totals (
    loc_ref text NOT NULL,
    bus_dt date NOT NULL,
    clsd_bus_prd integer NOT NULL,
    rvc_num integer NOT NULL,
    combo_mi_num integer NOT NULL,
    net_sls_ttl numeric,
    sls_cnt integer,
    sls_qty numeric,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, bus_dt, clsd_bus_prd, rvc_num, combo_mi_num)
);

CREATE TABLE IF NOT EXISTS discount_qh_totals (
    loc_ref text NOT NULL,
    bus_dt date NOT NULL,
    clsd_bus_prd integer NOT NULL,
    rvc_num integer NOT NULL,
    dsc_num integer NOT NULL,
    dsc_cnt integer,
    dsc_ttl numeric,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, bus_dt, clsd_bus_prd, rvc_num, dsc_num)
);

CREATE TABLE IF NOT EXISTS job_code_qh_totals (
    loc_ref text NOT NULL,
    bus_dt date NOT NULL,
    clsd_bus_prd integer NOT NULL,
    rvc_num integer NOT NULL,
    jc_num integer NOT NULL,
    net_sls_ttl numeric,
    chk_cnt integer,
    gst_cnt integer,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, bus_dt, clsd_bus_prd, rvc_num, jc_num)
);

CREATE TABLE IF NOT EXISTS menu_item_qh_totals (
    loc_ref text NOT NULL,
    bus_dt date NOT NULL,
    clsd_bus_prd integer NOT NULL,
    rvc_num integer NOT NULL,
    mi_num integer NOT NULL,
    sls_cnt integer,
    sls_qty numeric,
    net_sls_ttl numeric,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, bus_dt, clsd_bus_prd, rvc_num, mi_num)
);

CREATE TABLE IF NOT EXISTS operations_qh_totals (
    loc_ref text NOT NULL,
    bus_dt date NOT NULL,
    clsd_bus_prd integer NOT NULL,
    rvc_num integer NOT NULL,
    net_sls_ttl numeric,
    itm_dsc_ttl numeric,
    sub_dsc_ttl numeric,
    svc_ttl numeric,
    non_rev_svc_ttl numeric,
    chk_cnt integer,
    gst_cnt integer,
    vd_ttl numeric,
    vd_cnt integer,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, bus_dt, clsd_bus_prd, rvc_num)
);

CREATE TABLE IF NOT EXISTS order_type_qh_totals (
    loc_ref text NOT NULL,
    bus_dt date NOT NULL,
    clsd_bus_prd integer NOT NULL,
    rvc_num integer NOT NULL,
    ot_num integer NOT NULL,
    net_sls_ttl numeric,
    chk_cnt integer,
    gst_cnt integer,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, bus_dt, clsd_bus_prd, rvc_num, ot_num)
);

CREATE TABLE IF NOT EXISTS service_charge_qh_totals (
    loc_ref text NOT NULL,
    bus_dt date NOT NULL,
    clsd_bus_prd integer NOT NULL,
    rvc_num integer NOT NULL,
    svc_num integer NOT NULL,
    svc_cnt integer,
    svc_ttl numeric,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, bus_dt, clsd_bus_prd, rvc_num, svc_num)
);

CREATE TABLE IF NOT EXISTS tender_media_qh_totals (
    loc_ref text NOT NULL,
    bus_dt date NOT NULL,
    clsd_bus_prd integer NOT NULL,
    rvc_num integer NOT NULL,
    tm_num integer NOT NULL,
    tnd_cnt integer,
    tnd_ttl numeric,
    extra jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, bus_dt, clsd_bus_prd, rvc_num, tm_num)
);
