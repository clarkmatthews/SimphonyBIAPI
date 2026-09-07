# Simphony BI Scheduler

Next.js app (port **3005**) — **Integration Manager** for scheduling Oracle Simphony BI **daily totals**, **quarter-hour totals**, and **definition/dimension** syncs into local Postgres (`biapi` / `biapiUser`).

Scheduler/UI tables are prefixed `jobui_`. Oracle warehouse tables are unprefixed.

## Prerequisites

- Node.js 20+
- PostgreSQL (`biapi` database already created)
- Oracle MICROS BI API account (Sales and Operations access)

## Setup

```powershell
copy .env.example .env
npm install
npm run migrate
npm run dev
```

Open [http://localhost:3005](http://localhost:3005).

1. Save Oracle hosts, client ID, API user/password, and org names on **Settings**
2. Enable a seeded event on **Schedule**, or click **Run Now**
3. Watch **Home** (active/upcoming), **History** (run logs), and **Activity**

## Schedules

- Interval: every N minutes, minimum 15
- Daily: once a day at a time
- Weekly: selected days of week plus a time

Totals jobs resolve locations from `getLocationDimensions` (or a locRef list) and the business date from `getLatestBusDt` unless a fixed date is set.

## Docs

- [Authenticate](https://docs.oracle.com/en/industries/food-beverage/back-office/20.1/biapi/authenticate.html)
- [REST endpoints](https://docs.oracle.com/en/industries/food-beverage/back-office/20.1/biapi/rest-endpoints.html)
- [Cronicle Web UI](https://github.com/jhuckaby/Cronicle/blob/master/docs/WebUI.md)
