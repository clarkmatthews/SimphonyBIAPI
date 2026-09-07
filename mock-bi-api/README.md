# Mock Simphony BI API

Fake Oracle Simphony BI host for Integration Manager. It implements the same OpenID PKCE paths and BI POST operations the client already calls, and stores generated data in `apitestdata_*` tables in the shared `biapi` Postgres database.

Listen port: **3006**.

## Setup

```powershell
cd mock-bi-api
copy .env.example .env
npm install
npm run migrate
npm run dev
```

From the repo root you can also run `npm run mock`.

Postgres settings can stay blank in `mock-bi-api/.env` so they inherit from the repo-root `.env`.

## Point Integration Manager at it

On **Settings** (http://localhost:3005/settings):

- Auth host: `http://localhost:3006`
- App host: `http://localhost:3006`
- Client ID: `mock-client`
- API username: `mockuser`
- API password: `mockpass`
- Org name / org identifier: `DEMOORG`

Then run daily, quarter-hour, or definition jobs as usual.

## Persistence rules

- Definition rows (locations, RVCs, menu items, employees, and every other dimension) are generated once at random and reused forever.
- Totals always use those persisted IDs. They never invent keys that are not in the definition tables.
- Daily totals for a location + business date freeze on first request.
- Quarter-hour totals generate a period only after that 15-minute increment has ended, then freeze that period.

## Admin (localhost only)

- `POST /admin/reset` — wipe totals snapshots; keep definitions
- `POST /admin/reset-definitions` — wipe definitions and totals so the next call builds a new random world
