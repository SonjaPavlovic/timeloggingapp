# Time Logging App

Record activities by start and end time, classify them by activity type and
description, and see time spent per entry, per day, and per activity.

- **Front-end:** Angular (standalone components)
- **Backend:** Node.js + Express + TypeScript
- **Database:** SQLite, via Node's built-in [`node:sqlite`](https://nodejs.org/api/sqlite.html) module

See [`docs/SDD/build-tl-app.spec.md`](docs/SDD/build-tl-app.spec.md) for the full spec (data model, API contract,
acceptance criteria) and [`docs/SDD/build-tl-app.plan.md`](docs/SDD/build-tl-app.plan.md) for the implementation plan.

## Prerequisites

- **Node.js 22.5+** (the backend uses the built-in `node:sqlite` module, which requires this). Verified against
  Node v24.19.0.
- npm (bundled with Node)

No Python, no C++ build toolchain, and no separate database server are required — `node:sqlite` is built into
Node, so there is nothing to compile.

## Setup (clean clone)

From the repository root:

```bash
# 1. Install dependencies for both the backend and the frontend
npm run install:all

# 2. Create the database schema (idempotent — safe to run again later)
npm run migrate

# 3. Seed the starter activity types (Development, Meetings, Support, Admin, Research)
npm run seed
```

This creates `backend/data/timelog.db` (git-ignored — safe to delete to start over; re-run `migrate`/`seed` to
recreate it).

## Running the app

Two servers, in two terminals:

```bash
# Terminal 1 — backend API on http://localhost:3000
npm run dev:backend

# Terminal 2 — frontend on http://localhost:4200, proxying /api/* to the backend
npm run dev:frontend
```

Open http://localhost:4200. The Angular dev server proxies every `/api/*` request to the backend
(see `frontend/proxy.conf.json`), so no CORS configuration is needed in normal use — the backend also
sends permissive CORS headers as a fallback for running the two independently.

## Running the tests

```bash
# From the repository root — runs the backend suite (unit + integration) then the frontend suite
npm test
```

This runs 91 backend tests (unit: duration/validation logic; integration: full CRUD, every documented
error path, foreign-key enforcement, migration/seed idempotency) and 16 frontend tests (form validity,
submit-disabled logic, error-message mapping, totals rendering) — 107 tests total, all passing on a clean
clone.

Individual suites:

```bash
npm test --prefix backend              # backend only (unit + integration)
npm test --prefix backend -- test/unit        # backend unit tests only
npm test --prefix backend -- test/integration  # backend integration tests only
npm test --prefix frontend -- --watch=false    # frontend only
```

## Building for production

```bash
npm run build
```

Builds the backend to `backend/dist` (run with `node backend/dist/server.js`) and the frontend to
`frontend/dist/frontend` (serve as static files behind any web server, with `/api/*` reverse-proxied to
the backend).

## Project layout

```
/backend
  /src
    /routes        HTTP route definitions, request/response mapping
    /services       business rules: validation, duration, totals
    /repositories    SQL against SQLite
    /db             schema migration + seed scripts
  /test
    /unit           pure-function tests (no DB, no HTTP)
    /integration     full-stack API tests against a fresh in-memory DB per test
/frontend           Angular application (standalone components)
  /src/app
    /pages           routed views: entries, activity-types, totals
    /services        typed HttpClient services
    /shell           app shell / navigation
/docs/SDD            spec and implementation plan
```

## Notes on implementation decisions

- **Dates and times are stored as local wall-clock values with no time zone offset** — three separate fields
  (`entry_date`, `start_time`, `end_time`) rather than one combined timestamp. There is no time zone
  conversion anywhere in the app.
- **An end time earlier than the start time is valid** and represents an entry that spans past midnight
  (e.g. 23:30 → 00:15); duration accounts for the rollover. Only an end time *equal to* the start time is
  rejected (a zero-length entry).
- **Duration is never stored** — it's computed from the stored date/time fields on every read, so it can
  never drift out of sync.
- The database driver is Node's built-in `node:sqlite` rather than a third-party native module, so there is
  no compilation step and no native-toolchain prerequisite.

Full rationale for these and all other decisions is recorded in the spec's
[Decisions Record](docs/SDD/build-tl-app.spec.md#decisions-record).
