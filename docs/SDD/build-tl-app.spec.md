# Build TL App

> Ticket: [#1 — Build TL App](https://github.com/SonjaPavlovic/timeloggingapp/issues/1)
> Status: Decisions recorded — ready for spec gate sign-off
> Slug: `build-tl-app`

## Overview

This delivers the first working version of the Time Logging App: an Angular front-end plus a SQLite-backed API that lets a user record activities by date, start time, and end time, classify each one by activity type and description, and see how much time was spent — per entry, per day, and per activity type. Today the repository is empty (only `LICENSE`, `.gitignore`, and `.dev-its/` config), so this is a greenfield build that establishes the project skeleton, the data model, the CRUD surface, and the totals/reporting behaviour that everything later builds on. It matters because the whole point of the product is answering "where did my time go" — an app that stores entries but cannot total them delivers none of the value.

The authoritative statement of intent is the repository description: *"Application must allow us to enter start and end time of the activity. Activity can be made out of type and description. It must calc time spent per entry. Also give totals per day and activity."* This spec is written against that description; the time-logging interpretation has been confirmed (see [Decisions Record](#decisions-record)).

## Goals

- [ ] Stand up a runnable project skeleton: Angular front-end, HTTP API backend, SQLite database, all startable with documented commands from a clean clone.
- [ ] Persist time entries in SQLite with date, start time, end time, activity type, and description.
- [ ] Provide full CRUD over time entries from the Angular UI (create, list, view, update, delete).
- [ ] Provide full CRUD over activity types from the Angular UI, so types are a managed list rather than free text.
- [ ] Compute and display duration (time spent) per entry.
- [ ] Compute and display totals grouped per day and per activity type.
- [ ] Validate input so an entry cannot be saved with a missing/invalid date or time, a zero-length span, a missing description, or a non-existent activity type, with errors surfaced in the UI.
- [ ] Cover the above with automated unit and integration tests that run in one command.

## Non-Goals

These are explicitly out of scope for this ticket. Each may be a follow-up ticket.

- **Authentication, authorisation, users, and multi-tenancy.** The ticket names no users. The app is single-user; there is no `user` table and no login. Every entry belongs to the one implicit local user.
- **Running timers / "start now, stop later" stopwatch behaviour.** The requirement is to *enter* a start and end time. A live ticking timer, a "clock in" button, or entries with a null end time are not in scope.
- **Billing, rates, invoicing, cost calculation, or currency of any kind.**
- **Projects, clients, tasks, tags, or any grouping dimension beyond activity type.**
- **Export (CSV/PDF/Excel), printing, or e-mail reporting.**
- **Charts and graphical visualisation.** Totals are delivered as numbers in tables.
- **Deployment, hosting, CI/CD pipelines, containerisation, cloud infrastructure.** Local development only.
- **Time zone conversion and multi-time-zone support.** Storage is local wall-clock time with no offset (confirmed — see Decisions Record); there is exactly one implicit time zone (the user's) and no conversion between zones.
- **Overlap detection / double-booking prevention.** Confirmed out of scope — overlapping entries are allowed silently.
- **Recurring entries, templates, bulk import, duplicating entries.**
- **Editing history, audit trail, soft delete, undo, or archiving.**
- **Offline support, PWA behaviour, local caching, or optimistic UI sync.**
- **Mobile-native apps.** The web UI should be usable at small widths, but no native client.
- **Internationalisation / localisation of UI copy.**
- **Accessibility beyond baseline semantic HTML and keyboard-operable forms** (baseline is in scope; a full WCAG audit is not).
- **Pagination, infinite scroll, and performance work for very large datasets.** See Risks.
- **A specific visual design.** No mockup, wireframe, or style guide exists (confirmed — see Decisions Record). The UI is plain, functional Angular; acceptance criteria below describe behaviour, not appearance.

## User Stories & Acceptance Criteria

Every criterion below is written to be individually testable and maps to at least one automated test (see [Testing Strategy](#testing-strategy)). Dates use `YYYY-MM-DD`; times use `HH:MM:SS` 24-hour local wall-clock time, with no time zone offset (see [Data Model](#data-model)).

### As a time logger, I want to record an activity with its date, start time, and end time so that I have a permanent record of what I did

- [ ] `POST /api/time-entries` with a body containing valid `activityTypeId`, `description`, `date`, `startTime`, and `endTime` returns `201 Created` with a `Location` header pointing at `/api/time-entries/{id}` and a body containing the created entry including its generated `id`, its `durationMinutes`, and the `activityType` object (`{ id, name }`).
- [ ] After a successful create, the row is present in the SQLite `time_entry` table and a subsequent `GET /api/time-entries/{id}` returns `200 OK` with the same field values that were submitted.
- [ ] `POST /api/time-entries` omitting any of `activityTypeId`, `date`, `startTime`, `endTime`, or `description` returns `400 Bad Request` with a body of shape `{ "error": { "code": "VALIDATION_FAILED", "message": string, "details": [{ "field": string, "message": string }] }}` naming each missing field in `details`.
- [ ] `POST /api/time-entries` where `endTime` equals `startTime` returns `400` with a `details` entry for field `endTime` (a zero-length entry is rejected) and does not insert a row.
- [ ] `POST /api/time-entries` where `endTime` is earlier than `startTime` is **accepted** — this represents an entry that spans past midnight (see Duration rules below), not an error.
- [ ] `POST /api/time-entries` where `date` is not a valid `YYYY-MM-DD` value, or `startTime`/`endTime` is not a valid `HH:MM:SS` value, returns `400` naming the offending field.
- [ ] `POST /api/time-entries` with an `activityTypeId` that does not exist in `activity_type` returns `400` with a `details` entry for field `activityTypeId` and does not insert a row.
- [ ] `POST /api/time-entries` with a `description` longer than 500 characters returns `400`; a description of exactly 500 characters is accepted.
- [ ] `description` is required: `POST` with `description` absent, `null`, or `""`/whitespace-only returns `400` naming the field.
- [ ] In the Angular UI, submitting the "New entry" form with valid values adds the entry to the list without a full page reload, and the form resets to empty.
- [ ] In the Angular UI, submitting the form with an end time equal to the start time shows an inline validation message next to the end-time field, keeps the entered values in the form, and issues no HTTP request.
- [ ] In the Angular UI, the submit button is disabled while the form is invalid and while a submit request is in flight.

### As a time logger, I want to see the time spent on each entry so that I don't have to do arithmetic myself

- [ ] `durationMinutes` is present on every time entry returned by the API and equals the whole number of minutes between `startTime` and `endTime`.
- [ ] Duration is **derived, never stored** — no `duration` column exists in `time_entry`; changing `date`, `startTime`, or `endTime` via `PUT` changes the returned `durationMinutes` accordingly with no separate update step.
- [ ] **Same-day rule:** when `endTime` is later than `startTime`, duration is simply `endTime - startTime`. Given `startTime` `09:00:00` and `endTime` `10:30:00`, `durationMinutes` is `90`.
- [ ] **Rollover rule:** when `endTime` is earlier than `startTime`, the entry is treated as ending on the calendar day after `date`; duration is the time remaining until midnight plus the time from midnight to `endTime`. Given `startTime` `23:30:00` and `endTime` `00:15:00`, `durationMinutes` is `45`.
- [ ] Duration truncates to whole minutes: a 90-second span (e.g. `09:00:00` to `09:01:30`) yields `durationMinutes` of `1`.
- [ ] The UI renders each entry's duration in `Hh Mm` form (e.g. `1h 30m`), rendering `0h 45m` for a 45-minute entry and `2h 00m` for a 120-minute entry.

### As a time logger, I want to browse, correct, and remove my entries so that my log stays accurate

- [ ] `GET /api/time-entries` returns `200` with a body of shape `{ "items": TimeEntry[], "count": number }`, sorted by `date` descending, then `startTime` descending.
- [ ] `GET /api/time-entries` on an empty database returns `200` with `{ "items": [], "count": 0 }` — not `404`.
- [ ] `GET /api/time-entries?from=2026-01-15&to=2026-01-16` returns only entries whose `date` falls within that inclusive range, and excludes entries outside it.
- [ ] `GET /api/time-entries?activityTypeId={id}` returns only entries with that activity type.
- [ ] `from`/`to`/`activityTypeId` filters combine with AND when supplied together.
- [ ] A malformed `from` or `to` (not `YYYY-MM-DD`) returns `400` naming the field.
- [ ] A `from` later than `to` returns `400`.
- [ ] `GET /api/time-entries/{id}` for an unknown id returns `404` with body `{ "error": { "code": "NOT_FOUND", "message": string } }`.
- [ ] `PUT /api/time-entries/{id}` with a full valid body returns `200` with the updated entry; the changed values are persisted and visible on a subsequent `GET`.
- [ ] `PUT /api/time-entries/{id}` applies the same validation rules as `POST` (zero-length rejection, date/time format, activity type existence, description required and length bounds), returning `400` on breach and leaving the stored row unchanged.
- [ ] `PUT /api/time-entries/{id}` for an unknown id returns `404` and creates nothing.
- [ ] `DELETE /api/time-entries/{id}` returns `204 No Content` with an empty body, and the row is gone from the database.
- [ ] `DELETE /api/time-entries/{id}` for an unknown id returns `404`.
- [ ] In the UI, the entry list shows for each entry: date, start time, end time, activity type name, description, and duration.
- [ ] In the UI, editing an entry pre-populates the form with that entry's current values and saving updates the row in place in the list.
- [ ] In the UI, deleting an entry asks for confirmation first, and on confirm removes the row from the list; on cancel nothing is deleted and no request is sent.
- [ ] When any API call fails, the UI shows an error message to the user and does not leave the list showing stale or partially-applied data.

### As a time logger, I want to manage the list of activity types so that I can classify entries consistently

- [ ] `GET /api/activity-types` returns `200` with `{ "items": ActivityType[], "count": number }` sorted by `name` ascending.
- [ ] `POST /api/activity-types` with `{ "name": "Development" }` returns `201` with the created object including its `id`.
- [ ] `POST /api/activity-types` with a missing or empty/whitespace-only `name` returns `400`.
- [ ] `POST /api/activity-types` with a `name` longer than 100 characters returns `400`.
- [ ] `POST /api/activity-types` with a `name` that already exists returns `409 Conflict` with body `{ "error": { "code": "DUPLICATE_NAME", ... } }` and inserts nothing.
- [ ] Duplicate detection is case-insensitive and ignores surrounding whitespace: with `Development` present, `  development  ` returns `409`.
- [ ] Names are stored trimmed: `POST` with `"  Meetings  "` stores and returns `"Meetings"`.
- [ ] `PUT /api/activity-types/{id}` renames the type, returns `200`, and the new name is reflected in subsequent `GET /api/time-entries` responses for entries using it; renaming to a name held by a *different* type returns `409`; renaming a type to its own current name returns `200`.
- [ ] `DELETE /api/activity-types/{id}` with no time entries referencing it returns `204` and removes the row.
- [ ] `DELETE /api/activity-types/{id}` while at least one time entry references it returns `409` with body code `IN_USE`, deletes nothing, and leaves the referencing entries intact.
- [ ] `GET`/`PUT`/`DELETE /api/activity-types/{id}` for an unknown id returns `404`.
- [ ] In the UI, the activity type field on the entry form is a select populated from `GET /api/activity-types`, not a free-text input.
- [ ] In the UI, an activity type can be created, renamed, and deleted from a manage-types view, and the `409 IN_USE` case shows an explanatory message rather than a generic failure.

### As a time logger, I want totals per day so that I can see how much I logged on a given date

- [ ] `GET /api/totals/by-day` returns `200` with `{ "items": [{ "date": "YYYY-MM-DD", "totalMinutes": number, "entryCount": number }], "grandTotalMinutes": number }`, sorted by `date` descending.
- [ ] `totalMinutes` for a date equals the sum of `durationMinutes` of all entries whose `date` field is that date, and `grandTotalMinutes` equals the sum of all returned `totalMinutes`.
- [ ] Given three entries on `2026-01-15` of 60, 30, and 15 minutes, the item for that date reports `totalMinutes` `105` and `entryCount` `3`.
- [ ] Dates with no entries are absent from `items` (no zero-filled rows).
- [ ] `GET /api/totals/by-day?from=&to=` restricts the result to the inclusive date range and recomputes `grandTotalMinutes` over only the included entries.
- [ ] On an empty database the endpoint returns `200` with `{ "items": [], "grandTotalMinutes": 0 }`.
- [ ] A rollover entry (e.g. `date` `2026-01-15`, `startTime` `23:30:00`, `endTime` `00:15:00`) is attributed wholly to its `date` field (`2026-01-15`) — its minutes are not split across two dates. This attribution rule is asserted by a dedicated test.
- [ ] The UI shows a per-day totals view listing each date with its total formatted as `Hh Mm`, plus a grand total.

### As a time logger, I want totals per activity so that I can see where my time is going by category

- [ ] `GET /api/totals/by-activity` returns `200` with `{ "items": [{ "activityTypeId": number, "activityTypeName": string, "totalMinutes": number, "entryCount": number }], "grandTotalMinutes": number }`, sorted by `totalMinutes` descending.
- [ ] `totalMinutes` per activity type equals the sum of `durationMinutes` of all its entries; `grandTotalMinutes` equals the sum across all returned types.
- [ ] Activity types with no entries in range are absent from `items`.
- [ ] `GET /api/totals/by-activity?from=&to=` restricts the result to the inclusive date range.
- [ ] On an empty database the endpoint returns `200` with `{ "items": [], "grandTotalMinutes": 0 }`.
- [ ] For the same filter range, `grandTotalMinutes` from `by-activity` equals `grandTotalMinutes` from `by-day` — asserted by a cross-check test.
- [ ] The UI shows a per-activity totals view listing each type with its total formatted as `Hh Mm`, plus a grand total.

### As a time logger, I want the app to open on my full log so that nothing is hidden from me by default

- [ ] On first load, the entry list (and totals views) show all entries unfiltered — no implicit date range is applied. Date filters are available in the UI but start cleared.

### As a developer, I want the project to be runnable and testable from a clean clone so that I can contribute without tribal knowledge

- [ ] A `README.md` documents prerequisites and the exact commands to install dependencies, create/migrate the database, seed it, start the backend, start the front-end, and run the tests.
- [ ] Following the README on a clean clone produces a working app: the front-end loads, lists entries, and can create one.
- [ ] The database schema is created by a checked-in migration/schema script, not by hand — running it against an empty file produces the full schema, and running it twice is safe (idempotent).
- [ ] A seed script inserts the starter set of activity types (`Development`, `Meetings`, `Support`, `Admin`, `Research`) so the entry form is usable immediately on first run.
- [ ] A single documented command runs the whole automated test suite, and it passes on a clean clone.
- [ ] The SQLite database file and `node_modules` are git-ignored; no database binary is committed.
- [ ] The API rejects unknown routes with `404` and returns JSON (not an HTML error page) for all error responses.
- [ ] An unhandled server error returns `500` with the standard `{ "error": { code, message } }` shape and does not leak a stack trace in the response body.

## Technical Design

### Architecture

Three layers, developed in one repository.

```
┌──────────────────────────────┐
│ Angular front-end (browser)  │
│  · entry list + entry form   │
│  · activity-type management  │
│  · totals views (day/activity)│
│  · typed HTTP services       │
└──────────────┬───────────────┘
               │ JSON over HTTP, /api/*
┌──────────────▼───────────────┐
│ Backend API (Node/Express/TS)│
│  routes → validation →       │
│  service → repository        │
└──────────────┬───────────────┘
               │ SQL
┌──────────────▼───────────────┐
│ SQLite file (single .db)     │
│  activity_type, time_entry   │
└──────────────────────────────┘
```

Proposed layout — the repo is empty, so this establishes the convention:

```
/frontend        Angular application
/backend         API + data access
  /src
    /routes      HTTP route definitions, request/response mapping
    /services    business rules: validation, duration, totals
    /repositories  SQL against SQLite
    /db          schema migration + seed scripts
/docs/SDD        specs (this file)
```

Design decisions:

- **Duration is computed, never persisted.** There is no `duration` column. It is derived from `date`/`startTime`/`endTime` on read, so it can never drift out of sync with the times it describes. The pure duration function (including the rollover rule) lives in the service layer and is unit-tested directly.
- **Totals are computed with the rollover rule applied per-row, then summed.** Because duration requires the same-day-vs-rollover branch as single-entry duration, the totals queries either replicate that branch in SQL (a `CASE` expression comparing `end_time` and `start_time`) or compute per-row durations in the service layer and `GROUP BY` in application code over a query that has already selected the relevant rows. Either approach is acceptable at implementation time; the requirement is that totals are **not** produced by loading the entire table into memory to compute a grand aggregate — filtering and grouping still happen at the query level, only the per-row duration math may need a small in-application step.
- **Layer separation is enforced by dependency direction:** routes know about HTTP and never about SQL; repositories know about SQL and never about HTTP. Business rules (validation, duration, grouping) live in services and are therefore testable without a server.
- **The API is the only writer to the database.** The Angular app never touches SQLite directly; "Allow Angular CRUD access" from the ticket is satisfied through the HTTP API.
- **Validation happens server-side regardless of client-side validation.** The Angular form validates for usability; the API validates for correctness. Client validation is never the enforcement point.

### Data Model

Two tables. SQLite, foreign keys enforced (`PRAGMA foreign_keys = ON` on every connection — SQLite defaults this **off**, which would silently void the referential guarantees below).

**`activity_type`**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `name` | TEXT | NOT NULL, length 1–100, UNIQUE (case-insensitive) | stored trimmed |
| `created_at` | TEXT | NOT NULL, default current timestamp | ISO 8601 UTC (internal bookkeeping column only — not user-facing local time) |

- Case-insensitive uniqueness is enforced in the schema via `name TEXT NOT NULL COLLATE NOCASE UNIQUE`, so the guarantee survives even if application-level checking is bypassed. The service also pre-checks in order to return a clean `409` rather than surfacing a raw constraint error.

**`time_entry`**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `activity_type_id` | INTEGER | NOT NULL, FK → `activity_type(id)` ON DELETE RESTRICT | RESTRICT is what makes the `409 IN_USE` guarantee real |
| `description` | TEXT | NOT NULL, length 1–500 | required (confirmed) |
| `entry_date` | TEXT | NOT NULL | `YYYY-MM-DD`, local wall-clock date as entered — this is the sole day-attribution field, so per-day totals need no derivation |
| `start_time` | TEXT | NOT NULL | `HH:MM:SS`, local wall-clock time, no offset |
| `end_time` | TEXT | NOT NULL, CHECK (`end_time` <> `start_time`) | strict inequality rejects zero-length entries; `end_time` **may** be earlier than `start_time` — that represents a rollover past midnight, not an error |
| `created_at` | TEXT | NOT NULL, default current timestamp | |
| `updated_at` | TEXT | NOT NULL, maintained on update | |

Indexes:

- `idx_time_entry_entry_date` on `entry_date` — serves date-range filtering and per-day grouping.
- `idx_time_entry_activity_type_id` on `activity_type_id` — serves per-activity filtering, grouping, and the in-use check on type delete.

Relationships and derived values:

- `activity_type` 1 ─── * `time_entry`. Every entry has exactly one type; a type may have zero or many entries.
- **`durationMinutes`** — derived on read as whole minutes between `start_time` and `end_time`, applying the rollover rule below. No column.
- **Duration rule:**
  - If `end_time` > `start_time`: duration = `end_time − start_time` (same calendar day).
  - If `end_time` == `start_time`: rejected at validation (zero-length entry).
  - If `end_time` < `start_time`: the entry rolled past midnight; duration = (time from `start_time` to `24:00:00`) + (time from `00:00:00` to `end_time`).
- **Day attribution** — an entry belongs to its `entry_date` column, full stop. Because `entry_date` is stored explicitly (rather than derived from a combined timestamp), there is no UTC/local ambiguity and no derivation step: a rollover entry's minutes still count wholly against `entry_date`, matching the confirmed midnight-attribution rule.

Timestamp convention (confirmed — see Decisions Record):

- User-facing date/time fields (`entry_date`, `start_time`, `end_time`) are stored as **local wall-clock values with no time zone offset** — exactly what the user typed, split into a date field and two time fields rather than one combined ISO 8601 timestamp. There is no time zone conversion anywhere in the system; the app has exactly one implicit time zone (wherever the user is).
- `created_at`/`updated_at` remain internal bookkeeping columns (ISO 8601 UTC, default `CURRENT_TIMESTAMP`) — they are not shown to the user and are unrelated to entry date/time semantics.

Seed data (confirmed): `Development`, `Meetings`, `Support`, `Admin`, `Research`.

### API Design

Base path `/api`. All requests and responses are `application/json`. Errors use one shape throughout:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "…", "details": [ { "field": "endTime", "message": "…" } ] } }
```

`details` is present only for validation errors.

`TimeEntry` response shape:

```json
{
  "id": 1,
  "activityType": { "id": 3, "name": "Development" },
  "description": "Implemented totals endpoint",
  "date": "2026-01-15",
  "startTime": "09:00:00",
  "endTime": "10:30:00",
  "durationMinutes": 90
}
```

| Method | Path | Request | Response | Status codes |
|---|---|---|---|---|
| GET | `/api/time-entries` | query: `from`, `to` (`YYYY-MM-DD`), `activityTypeId` — all optional | `{ items: TimeEntry[], count }`, sorted `date` desc then `startTime` desc | 200, 400 |
| GET | `/api/time-entries/{id}` | — | `TimeEntry` | 200, 404 |
| POST | `/api/time-entries` | `{ activityTypeId, description, date, startTime, endTime }` | created `TimeEntry` + `Location` header | 201, 400 |
| PUT | `/api/time-entries/{id}` | `{ activityTypeId, description, date, startTime, endTime }` (full replace) | updated `TimeEntry` | 200, 400, 404 |
| DELETE | `/api/time-entries/{id}` | — | empty | 204, 404 |
| GET | `/api/activity-types` | — | `{ items: ActivityType[], count }`, sorted `name` asc | 200 |
| GET | `/api/activity-types/{id}` | — | `ActivityType` | 200, 404 |
| POST | `/api/activity-types` | `{ name }` | created `ActivityType` + `Location` header | 201, 400, 409 |
| PUT | `/api/activity-types/{id}` | `{ name }` | updated `ActivityType` | 200, 400, 404, 409 |
| DELETE | `/api/activity-types/{id}` | — | empty | 204, 404, 409 |
| GET | `/api/totals/by-day` | query: `from`, `to` optional | `{ items: [{ date, totalMinutes, entryCount }], grandTotalMinutes }`, `date` desc | 200, 400 |
| GET | `/api/totals/by-activity` | query: `from`, `to` optional | `{ items: [{ activityTypeId, activityTypeName, totalMinutes, entryCount }], grandTotalMinutes }`, `totalMinutes` desc | 200, 400 |

Status code semantics:

- `400 VALIDATION_FAILED` — malformed or semantically invalid input (bad date/time format, `endTime == startTime`, unknown `activityTypeId`, missing or over-length description, over-length name, bad date filter, `from > to`). Note: `endTime < startTime` is **not** a validation failure — it denotes a midnight rollover.
- `404 NOT_FOUND` — id does not exist; also unknown routes.
- `409 DUPLICATE_NAME` — activity type name collision (case-insensitive).
- `409 IN_USE` — attempt to delete an activity type still referenced by time entries.
- `500 INTERNAL_ERROR` — unexpected failure; standard error shape, no stack trace in the body.

Non-existent `activityTypeId` is deliberately `400` rather than `404`: the missing thing is a *field value in the submitted body*, not the resource addressed by the URL, so it belongs with the other body-validation failures in `details`.

### Stack (confirmed)

- **Front-end:** Angular with standalone components, typed `HttpClient` services, reactive forms for validation.
- **Backend:** Node.js + Express + TypeScript — shares one language and toolchain with the Angular side, so one `npm test` covers both.
- **Database access:** `better-sqlite3` — synchronous API, no separate server process, straightforward to point at an in-memory database for integration tests.
- **Tests:** Jest (or Vitest) for backend unit/integration; Angular's default runner for front-end unit tests.

## Testing Strategy

- **Unit** (no database, no HTTP — pure functions and isolated logic):
  - Duration calculation: whole-hour, part-hour, midnight rollover, and the invalid `end == start` case.
  - Duration formatting for display (`90 → "1h 30m"`, `45 → "0h 45m"`, `120 → "2h 00m"`).
  - Request validators: each required field (including `description`), date/time format, zero-length rejection, description and name length bounds, name trimming, date-filter format, `from > to`.
  - Totals grouping and summing given a fixed in-memory list of entries, including the rollover-entry day-attribution rule.
  - Angular: entry-form validity states, submit-button disabled logic, and that an invalid form issues no HTTP request (mocked service).

- **Integration** (real SQLite — an in-memory or temp-file database per test, migrated and seeded fresh so tests cannot leak state into one another; through the HTTP layer so status codes and bodies are asserted as clients see them):
  - Full CRUD round-trips for time entries and activity types, asserting status codes, response bodies, `Location` headers, and resulting database state.
  - Every error path in the API table: `400` for each validation breach, `404` for unknown ids and unknown routes, `409 DUPLICATE_NAME` (including the case-insensitive and whitespace variants), `409 IN_USE` on deleting a referenced type.
  - That rejected writes leave the database unchanged — a failed `POST` inserts nothing, a failed `PUT` leaves the stored row byte-identical.
  - Foreign-key enforcement genuinely active: deleting a referenced activity type is refused at the database level, not merely by the application pre-check.
  - Filtering: `from`/`to` boundary inclusivity, `activityTypeId`, and the three combined.
  - Totals endpoints against seeded fixtures: known sums per day and per activity, `entryCount` values, empty-database `{ items: [], grandTotalMinutes: 0 }`, a rollover-entry fixture, and the cross-check that `by-day` and `by-activity` grand totals agree for the same range.
  - Migration idempotency: running the schema script twice against the same file succeeds.

- **E2E** (through the running stack — worth it for the create-and-see-the-total path, since that is the product's core promise and it crosses every layer):
  - Create an activity type, create an entry using it, see the entry appear in the list with the right duration, and see the per-day and per-activity totals update to match.
  - Edit the entry's end time and confirm both the displayed duration and the totals change.
  - Delete the entry and confirm it leaves the list and the totals.
  - Attempt to delete an in-use activity type and see the explanatory message rather than a generic failure.

- **Manual** (human judgement, not automatable here):
  - Clean-clone walkthrough: follow the README on a fresh checkout and confirm every documented command works as written and the app comes up.
  - Usability of the entry form for logging several entries in a row — is the flow actually pleasant to use repeatedly.
  - Readability of totals views, and layout sanity at a narrow browser width.

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Rollover duration/totals logic (end time earlier than start time means "next day") is easy to get subtly wrong, especially in SQL aggregation | Medium — quietly wrong numbers are worse than an error, because nobody notices | Duration is a pure, directly unit-tested function covering same-day, rollover, and zero-length cases; totals are cross-checked between the two endpoints; a rollover fixture is a named integration test, not left implicit. |
| Backend framework unspecified in the original ticket; now confirmed as Node/Express/TypeScript | Low — resolved | Confirmed in Decisions Record; no further action needed. |
| SQLite foreign keys are OFF by default — if `PRAGMA foreign_keys = ON` is missed on any connection, the `ON DELETE RESTRICT` guarantee silently does nothing | Medium — orphaned entries, and a passing-looking app that has lost its referential integrity | Set the pragma in one shared connection factory rather than per call site; add an integration test that asserts the constraint actually refuses the delete. |
| Scope creep — timers, projects, exports, charts, and auth are all natural "while we're here" additions | Medium — a first deliverable that never lands | Non-Goals list is deliberately long and explicit; anything not listed in Goals is a follow-up ticket. |
| Greenfield conventions get set badly and everything later inherits them | Medium — compounding cost | Layered structure and dependency direction fixed in Architecture; migration/seed scripts checked in from the first commit. |
| No pagination; the entry list loads every row | Low now, grows over time | Accepted for this ticket (explicit Non-Goal). Indexes on `entry_date` and `activity_type_id` are in place, so the query side is already prepared for growth. |
| Single local SQLite file, no backup — deleting it loses all data | Low for local single-user development | Accepted; schema and seed are reproducible from checked-in scripts. Out of scope to solve here. |

## Decisions Record

All previously blocking and non-blocking open questions have been answered. Recorded here for the audit trail; implementation may proceed on these decisions.

1. **Backend language/framework:** Node.js + Express + TypeScript, with `better-sqlite3` for database access.
2. **Time-logging interpretation:** Confirmed correct. The issue body's generic template text ("store design structures") does not describe this app; the repository description (start/end time, activity type + description, per-entry duration, per-day/per-activity totals) is authoritative.
3. **Design artefact:** None exists. The front-end is plain, functional Angular with no specific visual design; acceptance criteria describe behaviour only.
4. **Date/time storage:** Local wall-clock time, no offset, split into three fields — `entry_date` (`YYYY-MM-DD`), `start_time` (`HH:MM:SS`), `end_time` (`HH:MM:SS`) — rather than one combined ISO 8601 timestamp. This removes the UTC/local-day ambiguity entirely, since day attribution is a stored field rather than derived.
5. **Midnight-spanning entries:** Represented by `end_time` being numerically earlier than `start_time` on the same `entry_date` row — this denotes a rollover past midnight, not a validation error. Duration adds the time-to-midnight and time-from-midnight segments. The entry is attributed wholly to `entry_date` (its start date) for totals.
6. **Activity types:** User-managed CRUD (create, rename, delete), not a fixed enum.
7. **Overlapping entries:** Allowed silently. No overlap detection is built.
8. **Seed data:** `Development`, `Meetings`, `Support`, `Admin`, `Research`.
9. **Description field:** Required (not optional) — 1–500 characters, trimmed/validated non-empty.
10. **Default landing view:** The entry list and totals views open unfiltered (all entries), with date filters available but not pre-applied.

## Success Criteria

This ticket is done when all of the following hold:

1. Every acceptance criterion above is met, and each is covered by at least one passing automated test.
2. The full test suite passes from a clean clone with the single documented command, with no skipped or pending tests among those covering the criteria above.
3. Following the README on a clean checkout produces a running app: the front-end loads, lists entries, and can create, edit, and delete both entries and activity types.
4. A user can complete the core loop end to end in the UI without touching the database or an API client directly: create an activity type → log an entry with date, start time, and end time → see that entry's duration → see it reflected in both the per-day and per-activity totals.
5. Duration and totals are arithmetically correct against a hand-checked fixture, including the midnight-rollover case, and the two totals endpoints agree on their grand total for the same date range.
6. Every error path in the API table returns the documented status code and the documented error body shape; no error path returns HTML or leaks a stack trace.
7. A rejected write leaves the database unchanged — verified by test for both `POST` and `PUT` validation failures.
8. Deleting an activity type that is in use is refused with `409 IN_USE`, and no orphaned time entry can exist in the database.
9. The SQLite schema is created solely by the checked-in migration script, running it twice is safe, and no database binary is committed to the repository.
10. All decisions in the Decisions Record are reflected consistently across the data model, API contract, and acceptance criteria in this document.
