# Simphony BI Scheduler

Next.js app (port **3005**) — **Integration Manager** for scheduling Oracle Simphony BI **daily totals**, **quarter-hour totals**, and **definition/dimension** syncs into local Postgres (`biapi` / `biapiUser`).

Scheduler/UI tables are prefixed `jobui_`. Oracle warehouse tables are unprefixed. apitestdata tables have that prefix.

Based on a simple Cronicle like UI schedule interface but purpose build to poll totals from Oracle Simphony POS into a postgres DB.

## Prerequisites

- Node.js 20+
- PostgreSQL (`biapi` database)
- Oracle MICROS BI API account

## Setup

copy .env.example .env
npm install
npm run migrate
npm run dev

Open [http://localhost:3005](http://localhost:3005).

1. Save Oracle hosts, client ID, API user/password, and org names on **Settings**
2. Enable a seeded event on **Schedule**, or click **Run Now**
3. Watch **Home** (active/upcoming), **History** (run logs), and **Activity**

## Schedules

- Interval: every N minutes, minimum 15
- Daily: once a day at a time
- Weekly: selected days of week plus a time

Totals jobs resolve locations from `getLocationDimensions` (or a locRef list) and the business date from `getLatestBusDt` unless a fixed date is set.

## Mock API host

[`mock-bi-api/`](mock-bi-api/) is a sister project that impersonates Oracle OpenID and BI POST APIs on port **3006**. Definitions are generated once and reused; daily totals freeze on first request; quarter-hour periods freeze after the increment ends.

```powershell
npm run mock
```

Or `cd mock-bi-api`, copy `.env.example` to `.env`, then `npm install`, `npm run migrate`, `npm run dev`.

On Integration Manager Settings use:

- Auth host / App host: `http://localhost:3006`
- Client ID: `mock-client`
- Username / password: `mockuser` / `mockpass`
- Org: `DEMOORG`

See [`mock-bi-api/README.md`](mock-bi-api/README.md).

## Docs

- [Authenticate](https://docs.oracle.com/en/industries/food-beverage/back-office/20.1/biapi/authenticate.html)
- [REST endpoints](https://docs.oracle.com/en/industries/food-beverage/back-office/20.1/biapi/rest-endpoints.html)

## Screenshots

Main
<img width="1232" height="606" alt="image" src="https://github.com/user-attachments/assets/df00dcdf-a183-46eb-9eac-ee5e82f98363" />

Schedule Items
<img width="1225" height="526" alt="image" src="https://github.com/user-attachments/assets/bf3b8d81-944c-4df7-b2e8-a668c3d0fd1f" />

Edit/Add Schedule Item
<img width="1224" height="721" alt="image" src="https://github.com/user-attachments/assets/a0f04662-2458-42cd-8e6d-590776231a69" />

Execution History
<img width="1041" height="354" alt="image" src="https://github.com/user-attachments/assets/db0eb82f-e224-4eac-82c1-087a7195d1a3" />

Settings
<img width="1221" height="563" alt="image" src="https://github.com/user-attachments/assets/459a801a-65dc-4d62-9482-285f35903d23" />





