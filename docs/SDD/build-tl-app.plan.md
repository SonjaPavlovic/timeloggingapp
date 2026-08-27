# Build TL App — Implementation Plan

> Ticket: [#1 — Build TL App](https://github.com/SonjaPavlovic/timeloggingapp/issues/1)
> Spec: [build-tl-app.spec.md](./build-tl-app.spec.md) (approved)
> Status: Draft — awaiting plan gate approval
> Slug: `build-tl-app`

## Summary

Greenfield build. The repo currently contains only `LICENSE`, `.gitignore`, and `.dev-its/` — nothing to integrate with, no existing conventions to conform to except the ones this plan establishes. Work proceeds bottom-up on the backend (schema → repositories → services → routes), then the frontend (services → components → views), then wiring and full-suite verification. Each layer is testable in isolation per the spec's Testing Strategy, so tests are written alongside each layer rather than bolted on at the end.

## Branch

`dev-its/build-tl-app` off `origin/main` (per `.dev-its/config.json` branch prefix).

## Build Order

### Phase 1 — Repo scaffold

- `/backend` — Node.js + Express + TypeScript project (`package.json`, `tsconfig.json`)
- `/frontend` — Angular project (standalone components), generated via Angular CLI
- Root `README.md` stub (filled in fully at the end of Phase 6)
- Root-level `package.json` scripts (or a simple `npm run` wrapper) to install/test both sides with one command, satisfying the spec's "single documented command" acceptance criteria
- `.gitignore` updated for `node_modules/`, build output, and the SQLite `.db` file

### Phase 2 — Database layer (`/backend/src/db`)

- `schema.sql` (or a migration runner script) creating `activity_type` and `time_entry` exactly as specified in the spec's Data Model, including:
  - `PRAGMA foreign_keys = ON` set in the shared connection factory (not per call site)
  - `activity_type.name` with `COLLATE NOCASE UNIQUE`
  - `time_entry` with `entry_date`, `start_time`, `end_time` as three separate `TEXT NOT NULL` columns, `CHECK (end_time <> start_time)`, `description TEXT NOT NULL`
  - Indexes: `idx_time_entry_entry_date`, `idx_time_entry_activity_type_id`
- Migration script must be idempotent (safe to run twice against the same file) — use `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`
- `seed.ts` inserting the five starter activity types (`Development`, `Meetings`, `Support`, `Admin`, `Research`)
- Connection factory module (`db.ts`) — single place that opens the `better-sqlite3` connection and sets the foreign-key pragma; both the app and tests import this
- **Test:** migration idempotency test (run twice, assert no error and correct schema)

### Phase 3 — Backend services (pure logic, no DB/HTTP)

- `duration.ts` — pure function implementing the same-day and rollover duration rules from the spec, plus the `Hh Mm` formatter used by the frontend (shared or duplicated — see Open Implementation Note below)
- `validators.ts` — request validation: required fields, date/time format (`YYYY-MM-DD`, `HH:MM:SS`), zero-length rejection, description length (1–500), activity-type name length (1–100) and trim/whitespace rules
- **Test:** unit tests for every duration case (same-day, rollover, sub-minute truncation, zero-length rejection) and every validator rule — written first, against the pure functions, before any repository/route code exists (spec requires these as directly unit-tested)

### Phase 4 — Repositories + services + routes (per resource, backend)

Built resource-by-resource so each is independently testable end-to-end through the HTTP layer before moving to the next:

1. **Activity types** — repository (SQL) → service (validation + duplicate/in-use checks) → routes (`GET/POST/PUT/DELETE /api/activity-types[/:id]`)
   - **Test:** integration tests for full CRUD + every error path (`400`, `404`, `409 DUPLICATE_NAME`, `409 IN_USE`) against a temp-file/in-memory DB, migrated and seeded fresh per test
2. **Time entries** — repository → service (wires in the Phase 3 duration/validators, activity-type existence check) → routes (`GET/POST/PUT/DELETE /api/time-entries[/:id]`, filtering by `from`/`to`/`activityTypeId`)
   - **Test:** integration tests for full CRUD, all validation error paths, rollover-entry fixture, filter combinations, sort order, rejected-write-leaves-DB-unchanged
3. **Totals** — repository/service (`GET /api/totals/by-day`, `GET /api/totals/by-activity`), applying the rollover-aware per-row duration before grouping (per the spec's Technical Design note — either a SQL `CASE` expression or in-application grouping over a pre-filtered query)
   - **Test:** integration tests against seeded fixtures — known sums, empty-DB shape, rollover-entry attribution, and the `by-day`/`by-activity` grand-total cross-check
- Cross-cutting: global error handler (standard `{ error: { code, message } }` shape, no stack traces, JSON 404 for unknown routes, 500 fallback)
- **Test:** integration tests for the unknown-route `404` and an injected-failure `500` path

### Phase 5 — Frontend (Angular)

Built after the API is functional, since the UI is a thin client over it:

1. Typed `HttpClient` services (`TimeEntryService`, `ActivityTypeService`, `TotalsService`) — one per resource, matching the API contract in the spec
2. Activity-type management view: list, create, rename, delete, with the `409 IN_USE` case shown as an explanatory message
3. Entry list view: table with date/start/end/type/description/duration, edit and delete (with confirm) actions, error-state handling (no stale/partial data on failure)
4. Entry form (reactive forms): create + edit, client-side validation mirroring the server rules (zero-length rejection, required fields), submit-button disabled while invalid or in-flight, unfiltered by default
5. Totals views: per-day and per-activity, `Hh Mm` formatting, grand totals
6. Routing/shell wiring all views together
- **Test:** Angular unit tests for form validity states, submit-disabled logic, duration formatting pipe/util, and that an invalid form issues no HTTP request (mocked service)

### Phase 6 — Wiring, E2E, docs

- Wire frontend dev server to backend API (proxy config or CORS, whichever is simpler for local dev)
- E2E tests per the spec's E2E list (create type → create entry → see duration/totals → edit → delete → delete-in-use-type message)
- `README.md`: prerequisites, install/migrate/seed/start-backend/start-frontend/test commands, verified by literally following it on a clean clone
- Confirm single documented test command runs the whole suite (backend unit+integration, frontend unit, e2e) and passes

## Open Implementation Note (not spec-blocking, flagged for Develop stage)

The duration/formatting logic is needed on both backend (compute `durationMinutes`) and frontend (render `Hh Mm`). Two reasonable approaches: (a) small duplicated pure function on each side (simplest, no shared-package tooling), or (b) a shared `/shared` TypeScript package imported by both. Given this is a from-scratch two-`package.json` repo, (a) is recommended to avoid workspace/build-tooling overhead for a ~10-line function; revisit only if more shared logic emerges later.

## Rollback Plan

- All work happens on `dev-its/build-tl-app`; `main` is untouched until the PR merges.
- If the branch needs to be abandoned: delete the local and remote branch (`git branch -D dev-its/build-tl-app`, `git push origin --delete dev-its/build-tl-app`); no migration has touched any shared/deployed database since this is local-dev-only and the `.db` file is git-ignored and never committed.
- If a problem is found **after** merge to `main`: `git revert` the merge commit. No data migration rollback is needed beyond re-running the (idempotent) schema script, since there is no production database — the SQLite file is local and disposable per the spec's Non-Goals/Risks.
- No feature flags are needed; the app is not deployed anywhere by this ticket (deployment is an explicit Non-Goal), so "rollback" is purely a git-history and local-file concern.

## Test Plan Summary

| Layer | Type | When written |
|---|---|---|
| Duration + validators | Unit | Phase 3, before any DB/HTTP code |
| Activity-type CRUD | Integration | Phase 4.1 |
| Time-entry CRUD | Integration | Phase 4.2 |
| Totals | Integration | Phase 4.3 |
| Error handling (404/500) | Integration | Phase 4 |
| Angular forms/validity | Unit | Phase 5 |
| Full core loop | E2E | Phase 6 |

Matches the spec's Testing Strategy 1:1 — see spec §Testing Strategy for the full criterion-level list. Stage 5 of the workflow (spec-test-suite) re-derives this mapping automatically from the spec at test time; this table is the plan-time summary for reviewers.

## Risks Specific to This Plan

| Risk | Mitigation |
|---|---|
| Building resource-by-resource (Phase 4) could let activity-types and time-entries drift out of sync if built too far apart | Both share the same connection factory and error-handling middleware from Phase 2; integration tests for time-entries include the activity-type FK check, forcing the two to be exercised together before Phase 4 is considered done |
| Frontend built only after backend is "done" risks late discovery of an API shape mismatch | The spec's API Design section is contract-first and detailed enough (exact JSON shapes) that this is low-risk; Phase 5 services are typed directly against that contract |
| Rollover duration logic (Phase 3) is the single trickiest piece of business logic in the app | Isolated as a pure function, unit-tested first and exhaustively, before any other code depends on it |

## Gate B Checklist

- [ ] File/directory layout matches spec's proposed layout
- [ ] Build order respects layer dependency direction (routes never import SQL directly, etc.)
- [ ] Every spec acceptance-criteria section has a corresponding phase/test row above
- [ ] Rollback plan is adequate given "no deployment, no shared DB" (Non-Goal)
- [ ] Ready to proceed to Stage 3.5 (Architecture Review) then Stage 4 (Develop) on approval
