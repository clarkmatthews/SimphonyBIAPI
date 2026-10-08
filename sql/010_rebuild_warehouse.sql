-- Drop warehouse totals and dimensions, then recreate them.
-- Dimension columns follow the Oracle BI API response names (camelCase stored as snake_case).
-- Dimension DDL is produced from lib/bi/dimensionTables.ts.
-- Totals tables are recreated from the existing totals definitions.
-- jobui_* scheduler tables are not touched.
-- Mock apitestdata rows are cleared so the local host regenerates API-shaped payloads.

DROP TABLE IF EXISTS location_dimensions CASCADE;
DROP TABLE IF EXISTS latest_business_dates CASCADE;
DROP TABLE IF EXISTS revenue_center_dimensions CASCADE;
DROP TABLE IF EXISTS menu_item_dimensions CASCADE;
DROP TABLE IF EXISTS menu_item_prices CASCADE;
DROP TABLE IF EXISTS discount_dimensions CASCADE;
DROP TABLE IF EXISTS employee_dimensions CASCADE;
DROP TABLE IF EXISTS job_code_dimensions CASCADE;
DROP TABLE IF EXISTS order_channel_dimensions CASCADE;
DROP TABLE IF EXISTS order_type_dimensions CASCADE;
DROP TABLE IF EXISTS reason_code_dimensions CASCADE;
DROP TABLE IF EXISTS service_charge_dimensions CASCADE;
DROP TABLE IF EXISTS tax_dimensions CASCADE;
DROP TABLE IF EXISTS tender_media_dimensions CASCADE;
DROP TABLE IF EXISTS cashier_dimensions CASCADE;
DROP TABLE IF EXISTS cash_management_item_dimensions CASCADE;
DROP TABLE IF EXISTS payment_account_holder_dimensions CASCADE;
DROP TABLE IF EXISTS payment_account_dimensions CASCADE;
DROP TABLE IF EXISTS operations_daily_totals CASCADE;
DROP TABLE IF EXISTS combo_item_daily_totals CASCADE;
DROP TABLE IF EXISTS control_daily_totals CASCADE;
DROP TABLE IF EXISTS discount_daily_totals CASCADE;
DROP TABLE IF EXISTS employee_daily_totals CASCADE;
DROP TABLE IF EXISTS job_code_daily_totals CASCADE;
DROP TABLE IF EXISTS menu_item_daily_totals CASCADE;
DROP TABLE IF EXISTS order_channel_daily_totals CASCADE;
DROP TABLE IF EXISTS order_type_daily_totals CASCADE;
DROP TABLE IF EXISTS service_charge_daily_totals CASCADE;
DROP TABLE IF EXISTS tax_daily_totals CASCADE;
DROP TABLE IF EXISTS tender_media_daily_totals CASCADE;
DROP TABLE IF EXISTS combo_item_qh_totals CASCADE;
DROP TABLE IF EXISTS discount_qh_totals CASCADE;
DROP TABLE IF EXISTS job_code_qh_totals CASCADE;
DROP TABLE IF EXISTS menu_item_qh_totals CASCADE;
DROP TABLE IF EXISTS operations_qh_totals CASCADE;
DROP TABLE IF EXISTS order_type_qh_totals CASCADE;
DROP TABLE IF EXISTS service_charge_qh_totals CASCADE;
DROP TABLE IF EXISTS tender_media_qh_totals CASCADE;

CREATE TABLE "location_dimensions" (
    "loc_ref" text NOT NULL,
    "name" text,
    "open_dt" date,
    "active" boolean,
    "src_name" text,
    "src_ver" text,
    "tz" text,
    "curr" text,
    "addr_ln1" text,
    "addr_ln2" text,
    "addr_ln3" text,
    "postal_code" text,
    "phone" text,
    "phone_country_code" text,
    "country_code" text,
    "country_name" text,
    "region_code" text,
    "region_name" text,
    "extra" jsonb,
    "synced_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("loc_ref")
);

CREATE TABLE "latest_business_dates" (
    "loc_ref" text NOT NULL,
    "latest_bus_dt" date,
    "cur_utc" timestamptz,
    "software_version" text,
    "extra" jsonb,
    "synced_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("loc_ref")
);

CREATE TABLE "revenue_center_dimensions" (
    "loc_ref" text NOT NULL,
    "num" integer NOT NULL,
    "name" text,
    "mstr_num" integer,
    "mstr_name" text,
    "cat_grp_hier_name1" text,
    "cat_grp_name1" text,
    "cat_grp_hier_name2" text,
    "cat_grp_name2" text,
    "cat_grp_hier_name3" text,
    "cat_grp_name3" text,
    "cat_grp_hier_name4" text,
    "cat_grp_name4" text,
    "addr_ln1" text,
    "addr_ln2" text,
    "addr_ln3" text,
    "postal_code" text,
    "phone" text,
    "phone_country_code" text,
    "country_code" text,
    "country_name" text,
    "region_code" text,
    "region_name" text,
    "extra" jsonb,
    "synced_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("loc_ref", "num")
);

CREATE TABLE "menu_item_dimensions" (
    "loc_ref" text NOT NULL,
    "num" integer NOT NULL,
    "name" text,
    "mstr_num" integer,
    "mstr_name" text,
    "name2" text,
    "name2_mstr_num" integer,
    "name2_mstr_name" text,
    "maj_grp_num" integer,
    "maj_grp_name" text,
    "fam_grp_num" integer,
    "fam_grp_name" text,
    "maj_grp_mstr_num" integer,
    "maj_grp_mstr_name" text,
    "fam_grp_mstr_num" integer,
    "fam_grp_mstr_name" text,
    "do_not_include_in_sales" boolean,
    "category" text,
    "rev_flag" boolean,
    "cat_grp_hier_name1" text,
    "cat_grp_name1" text,
    "cat_grp_hier_name2" text,
    "cat_grp_name2" text,
    "cat_grp_hier_name3" text,
    "cat_grp_name3" text,
    "cat_grp_hier_name4" text,
    "cat_grp_name4" text,
    "mg_cat_grp_hier_name1" text,
    "mg_cat_grp_name1" text,
    "mg_cat_grp_hier_name2" text,
    "mg_cat_grp_name2" text,
    "mg_cat_grp_hier_name3" text,
    "mg_cat_grp_name3" text,
    "mg_cat_grp_hier_name4" text,
    "mg_cat_grp_name4" text,
    "fg_cat_grp_hier_name1" text,
    "fg_cat_grp_name1" text,
    "fg_cat_grp_hier_name2" text,
    "fg_cat_grp_name2" text,
    "fg_cat_grp_hier_name3" text,
    "fg_cat_grp_name3" text,
    "fg_cat_grp_hier_name4" text,
    "fg_cat_grp_name4" text,
    "ext_ref1" text,
    "ext_ref2" text,
    "extra" jsonb,
    "synced_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("loc_ref", "num")
);

CREATE TABLE "menu_item_prices" (
    "loc_ref" text NOT NULL,
    "num" integer NOT NULL,
    "rvc_num" integer NOT NULL,
    "prc_lvl_num" integer NOT NULL,
    "prc_lvl_name" text,
    "price" numeric,
    "cost" numeric,
    "eff_fr_dt" timestamptz NOT NULL,
    "eff_to_dt" timestamptz,
    "ext_ref1" text,
    "ext_ref2" text,
    "extra" jsonb,
    "synced_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("loc_ref", "num", "rvc_num", "prc_lvl_num", "eff_fr_dt")
);

CREATE TABLE "discount_dimensions" (
    "loc_ref" text NOT NULL,
    "num" integer NOT NULL,
    "name" text,
    "mstr_num" integer,
    "mstr_name" text,
    "pos_percent" numeric,
    "cat_grp_hier_name1" text,
    "cat_grp_name1" text,
    "cat_grp_hier_name2" text,
    "cat_grp_name2" text,
    "cat_grp_hier_name3" text,
    "cat_grp_name3" text,
    "cat_grp_hier_name4" text,
    "cat_grp_name4" text,
    "rpt_grp_num" integer,
    "rpt_grp_name" text,
    "ext_ref1" text,
    "ext_ref2" text,
    "extra" jsonb,
    "synced_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("loc_ref", "num")
);

CREATE TABLE "employee_dimensions" (
    "loc_ref" text NOT NULL,
    "num" integer NOT NULL,
    "uuid" integer,
    "employee_id" integer,
    "f_name" text,
    "l_name" text,
    "payroll_id" integer,
    "external_payroll_id" integer,
    "home_loc_ref" text,
    "class_name" text,
    "class_num" integer,
    "class_mstr_name" text,
    "class_mstr_num" integer,
    "extra" jsonb,
    "synced_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("loc_ref", "num")
);

CREATE TABLE "job_code_dimensions" (
    "loc_ref" text NOT NULL,
    "num" integer NOT NULL,
    "name" text,
    "mstr_num" integer,
    "mstr_name" text,
    "lbr_cat_num" integer,
    "lbr_cat_name" text,
    "lbr_cat_mstr_num" integer,
    "lbr_cat_mstr_name" text,
    "extra" jsonb,
    "synced_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("loc_ref", "num")
);

CREATE TABLE "order_channel_dimensions" (
    "loc_ref" text NOT NULL,
    "num" integer NOT NULL,
    "name" text,
    "mstr_num" integer,
    "mstr_name" text,
    "extra" jsonb,
    "synced_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("loc_ref", "num")
);

CREATE TABLE "order_type_dimensions" (
    "loc_ref" text NOT NULL,
    "num" integer NOT NULL,
    "name" text,
    "mstr_num" integer,
    "mstr_name" text,
    "cat_grp_hier_name1" text,
    "cat_grp_name1" text,
    "cat_grp_hier_name2" text,
    "cat_grp_name2" text,
    "cat_grp_hier_name3" text,
    "cat_grp_name3" text,
    "cat_grp_hier_name4" text,
    "cat_grp_name4" text,
    "extra" jsonb,
    "synced_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("loc_ref", "num")
);

CREATE TABLE "reason_code_dimensions" (
    "loc_ref" text NOT NULL,
    "num" integer NOT NULL,
    "name" text,
    "mstr_num" integer,
    "mstr_name" text,
    "pos_ref" integer,
    "mstr_pos_ref" integer,
    "type" integer,
    "extra" jsonb,
    "synced_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("loc_ref", "num")
);

CREATE TABLE "service_charge_dimensions" (
    "loc_ref" text NOT NULL,
    "num" integer NOT NULL,
    "name" text,
    "mstr_num" integer,
    "mstr_name" text,
    "pos_percent" numeric,
    "rev_flag" boolean,
    "chrg_tips_flag" boolean,
    "category" text,
    "cat_grp_hier_name1" text,
    "cat_grp_name1" text,
    "cat_grp_hier_name2" text,
    "cat_grp_name2" text,
    "cat_grp_hier_name3" text,
    "cat_grp_name3" text,
    "cat_grp_hier_name4" text,
    "cat_grp_name4" text,
    "ext_ref1" text,
    "ext_ref2" text,
    "extra" jsonb,
    "synced_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("loc_ref", "num")
);

CREATE TABLE "tax_dimensions" (
    "loc_ref" text NOT NULL,
    "num" integer NOT NULL,
    "name" text,
    "mstr_num" integer,
    "mstr_name" text,
    "type" integer,
    "tax_rate" numeric,
    "eff_fr_dt" timestamptz NOT NULL,
    "eff_to_dt" timestamptz,
    "cat_grp_hier_name1" text,
    "cat_grp_name1" text,
    "cat_grp_hier_name2" text,
    "cat_grp_name2" text,
    "cat_grp_hier_name3" text,
    "cat_grp_name3" text,
    "cat_grp_hier_name4" text,
    "cat_grp_name4" text,
    "extra" jsonb,
    "synced_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("loc_ref", "num", "eff_fr_dt")
);

CREATE TABLE "tender_media_dimensions" (
    "loc_ref" text NOT NULL,
    "num" integer NOT NULL,
    "name" text,
    "mstr_num" integer,
    "mstr_name" text,
    "type" integer,
    "sub_type" numeric,
    "cat" numeric,
    "cat_grp_hier_name1" text,
    "cat_grp_name1" text,
    "cat_grp_hier_name2" text,
    "cat_grp_name2" text,
    "cat_grp_hier_name3" text,
    "cat_grp_name3" text,
    "cat_grp_hier_name4" text,
    "cat_grp_name4" text,
    "auto_clsd_tnd" boolean,
    "ext_ref1" text,
    "ext_ref2" text,
    "extra" jsonb,
    "synced_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("loc_ref", "num")
);

CREATE TABLE "cashier_dimensions" (
    "loc_ref" text NOT NULL,
    "num" integer NOT NULL,
    "name" text,
    "mstr_num" integer,
    "mstr_name" text,
    "extra" jsonb,
    "synced_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("loc_ref", "num")
);

CREATE TABLE "cash_management_item_dimensions" (
    "loc_ref" text NOT NULL,
    "num" integer NOT NULL,
    "name" text,
    "mstr_num" integer,
    "mstr_name" text,
    "type" integer,
    "record_num" integer,
    "cat_grp_hier_name1" text,
    "cat_grp_name1" text,
    "cat_grp_hier_name2" text,
    "cat_grp_name2" text,
    "cat_grp_hier_name3" text,
    "cat_grp_name3" text,
    "cat_grp_hier_name4" text,
    "cat_grp_name4" text,
    "extra" jsonb,
    "synced_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("loc_ref", "num")
);

CREATE TABLE "payment_account_holder_dimensions" (
    "acct_hldr_code" text NOT NULL,
    "acct_hldr_name" text,
    "stlmt_cur" text,
    "acct_hldr_status" integer,
    "verification" integer,
    "bus_email" text,
    "phone_num" text,
    "web_addr" text,
    "street_num" text,
    "street_name" text,
    "city" text,
    "state" text,
    "zip" text,
    "country_code" text,
    "created_dt" date,
    "extra" jsonb,
    "synced_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("acct_hldr_code")
);

CREATE TABLE "payment_account_dimensions" (
    "loc_ref" text NOT NULL,
    "acct_hldr_code" text,
    "acct_code" text NOT NULL,
    "acct_name" text,
    "created_dt" date,
    "acct_status" integer,
    "cc_stmt_name" text,
    "extra" jsonb,
    "synced_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("loc_ref", "acct_code")
);

-- Operations daily totals: one row per location, business date, and revenue center.
-- Source: POST /bi/v1/{orgIdentifier}/getOperationsDailyTotals

CREATE TABLE IF NOT EXISTS operations_daily_totals (
    loc_ref              text        NOT NULL,
    bus_dt               date        NOT NULL,
    rvc_num              integer     NOT NULL,
    net_sls_ttl          numeric,
    itm_dsc_ttl          numeric,
    sub_dsc_ttl          numeric,
    svc_ttl              numeric,
    non_rev_svc_ttl      numeric,
    rtn_cnt              integer,
    rtn_ttl              numeric,
    cred_ttl             numeric,
    rnd_ttl              numeric,
    chng_in_grnd_ttl     numeric,
    non_txbl_sls_ttl     numeric,
    txbl_sls_ttl         numeric,
    tax_exmpt_sls_ttl    numeric,
    tax_coll_ttl         numeric,
    sls_fcst             numeric,
    prep_cost_ttl        numeric,
    num_tbl              integer,
    tbl_turn_cnt         integer,
    chk_cnt              integer,
    wait_pty_cnt         integer,
    wait_time_in_mins    numeric,
    gst_cnt              integer,
    dine_time_in_mins    numeric,
    park_car_cnt         integer,
    drv_thru_time_in_mins numeric,
    vd_ttl               numeric,
    vd_cnt               integer,
    err_cor_ttl          numeric,
    err_cor_cnt          integer,
    mngr_vd_ttl          numeric,
    mngr_vd_cnt          integer,
    trans_cncl_ttl       numeric,
    trans_cncl_cnt       integer,
    carryover_ttl        numeric,
    carryover_cnt        integer,
    chk_opn_ttl          numeric,
    chk_opn_cnt          integer,
    chk_xfer_in_ttl      numeric,
    chk_xfer_in_cnt      integer,
    chk_xfer_out_ttl     numeric,
    chk_xfer_out_cnt     integer,
    chk_clsd_ttl         numeric,
    chk_clsd_cnt         integer,
    over_short_ttl       numeric,
    no_sales_cnt         integer,
    trn_chk_cnt          integer,
    trn_chk_ttl          numeric,
    synced_at            timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loc_ref, bus_dt, rvc_num)
);

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

DO $$
BEGIN
  IF to_regclass('public.apitestdata_locations') IS NOT NULL THEN
    TRUNCATE
      apitestdata_daily_snapshots,
      apitestdata_qh_snapshots,
      apitestdata_dimension_items,
      apitestdata_revenue_centers,
      apitestdata_locations
    CASCADE;
  END IF;
END $$;
