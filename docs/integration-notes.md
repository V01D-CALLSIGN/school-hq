# Integration notes

## 2026-08-28 — Initial backend contract

The initial frontend-safe contract lives at `src/lib/contracts/index.ts`. The frontend may import DTOs and Zod schemas from that module; it must not import from `src/lib/server`.

Decisions:

- JSON fields use camelCase at the HTTP boundary; Postgres columns use snake_case.
- Every response uses the discriminated `ApiResponse<T>` envelope.
- PATCH and DELETE collection endpoints identify their target with an `id` UUID in the JSON body.
- Parsed brain-dump assignments are review candidates. The frontend must show review/edit UI and explicitly POST confirmed assignments afterward.
- An unknown or ambiguous deadline is `dueAt: null`, with original wording in `ambiguousDateText` and details in `warnings`/`missingFields`.
- Assignment `pending_review` records are never scheduled. Only `confirmed` and `in_progress` assignments enter plan generation.
- Calendar imports are multipart uploads under 1 MB. Events default to `busy`; callers may classify an entire import as `study_available` or `ignored`. Explicitly `study_available` occurrences participate in planning but do not create `StudyWindow` rows.
- Calendar occurrences are stored in UTC but preserve `originalTimezone`, `sourceUid`, and a nullable API `recurrenceId`. The uploaded filename identifies the source feed; importing that source again atomically replaces its occurrence set. The database represents a non-recurring null recurrence key as an empty string to support uniqueness.
- Plan generation requires an explicit ISO `rangeStart`, `rangeEnd`, and IANA `timezone`. Break blocks have `assignmentId: null`; work blocks have an assignment UUID.
- Locked blocks retain their IDs and timestamps during regeneration and are moved to the new draft plan.
- Focus-session PATCH accepts `{ id, action, occurredAt? }`, where action is `pause`, `resume`, `complete`, or `cancel`. The client computes countdown state from timestamps and `accumulatedPauseSeconds`.
- Stats currently summarize all-time assignment counts and current-week focus/planning totals. Week boundaries use the requested `timezone`.

Environment variables are documented in `.env.example`. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are intentionally public; `OLLAMA_BASE_URL`, `OPENAI_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are server-only configuration.

Remaining frontend integration: supply Supabase session cookies or a Bearer access token; implement parsed-assignment review; upload calendars as multipart; render unscheduled reason codes; and drive timers from persisted timestamps.

## 2026-08-28 — Ollama becomes the primary real-use parser

- `BrainDump.parser` now accepts `mock | ollama | openai`.
- Tests use `mock` when no provider is specified. Non-test server environments default to `ollama`; `.env.example` makes that choice explicit.
- Default Ollama configuration is `http://127.0.0.1:11434` with `qwen3.5:4b`.
- Ollama is contacted exclusively by the Next.js route handler. Frontend code must continue calling `POST /api/brain-dumps/parse` and must never call the Ollama URL.
- The Ollama adapter checks server/model health, applies the existing timeout and Zod/JSON Schema validation, and retries one complete attempt for transient, timeout, or malformed-output failures. A confirmed missing model is not retried.
- Stable errors added: `OLLAMA_UNAVAILABLE`, `OLLAMA_MODEL_UNAVAILABLE`, `PARSER_TIMEOUT`, and `PARSER_INVALID_RESPONSE`.
- OpenAI remains supported but optional; no OpenAI environment variable is required unless `BRAIN_DUMP_PARSER=openai` is selected.

## 2026-08-28 — Persistence completeness and work areas

The copy-safe TypeScript snapshot is `docs/frontend-contract.ts`. It contains types only and has no Zod, Supabase, Node, or server imports. `src/lib/contracts` remains the canonical runtime/Zod source.

Every JSON endpoint returns exactly one envelope:

```ts
{ ok: true, data: T, meta?: Record<string, unknown> }
{ ok: false, error: { code: string, message: string, fields?: { path: string; message: string }[], requestId?: string } }
```

Malformed JSON returns HTTP 400 `INVALID_JSON`; unauthenticated calls return 401 `UNAUTHORIZED`; Zod failures return 422 `VALIDATION_ERROR` with `fields`; RLS-hidden IDs return 404 `NOT_FOUND`; duplicate resources return 409 `CONFLICT`; plan collisions return 409 `BLOCK_OVERLAP` (application preflight) or `OVERLAP` (database race protection). Unexpected database/provider details are never exposed.

Collection endpoint wire contracts:

| Endpoint | Request | Success `data` |
| --- | --- | --- |
| `GET /api/courses` | none | `Course[]` |
| `POST /api/courses` | `{ name, code, color }` | `Course` (201) |
| `PATCH /api/courses` | `{ id, name?, code?, color? }` | `Course` |
| `DELETE /api/courses` | `{ id }` | `{ id }` |
| `GET /api/assignments?area=school\|extracurricular&status=...` | none | `Assignment[]` |
| `POST /api/assignments` | `CreateAssignmentBody` (`area` defaults to `school`; `activityLabel` defaults to `null`) | `Assignment` (201) |
| `PATCH /api/assignments` | `{ id, ...changedAssignmentFields }` | `Assignment` |
| `DELETE /api/assignments` | `{ id }` | `{ id }` |
| `GET /api/scheduling-preferences` | none | `SchedulingPreferences` |
| `PATCH /api/scheduling-preferences` | any non-empty subset of `SchedulingPreferences` | `SchedulingPreferences` |
| `PATCH /api/calendar/events` | `{ id, classification: "busy" \| "study_available" \| "ignored" }` | `CalendarEvent` |

School assignments may use `courseId` and must have `activityLabel: null`. Extracurricular assignments use `courseId: null` and may provide `activityLabel`; no placeholder course is required. Existing and omitted-area records safely resolve to `school`. Assignment/course/dependency/focus targets and calendar event IDs are all resolved under the authenticated user's RLS session.

Calendar import remains multipart. Alongside required `file` and optional `classification`, it accepts optional `area=school|extracurricular` (default `school`). `GET /api/calendar/week` accepts the same optional `area` query filter. `PATCH /api/calendar/events` changes classification only; it does not rewrite imported event identity or timestamps.

Plan generation body is `{ rangeStart, rangeEnd, timezone, area? }`. Omitting `area` is combined mode and persists `areaFilter: "combined"`; supplying an area filters assignment candidates and persists that value. Both areas use the same availability/collision engine in combined mode. Busy events and locked blocks remain global constraints regardless of the assignment filter. Locked blocks keep their IDs/times and move to the regenerated draft as before.

`PATCH /api/plans/:id` accepts `{ status?, blocks?: [{ id, startsAt?, endsAt?, locked? }] }`. At least one top-level update and one changed field per block are required. The final block set must have positive durations, stay within `rangeStart`/`rangeEnd`, contain no duplicate IDs, and not overlap. The edit is applied atomically; inaccessible plan/block IDs are 404.

Parsed assignments now include `area`, `areaConfidence`, and `activityLabel`. The Structured Output schema and extraction prompt require low confidence plus an `area` missing-field/review warning when classification is uncertain. Parsing still creates review candidates only.

`GET /api/stats/summary?timezone=...` returns `{ school, extracurricular, combined, generatedAt, timezone }`. Each slice contains assignment, focus, and plan totals. Focus and scheduled minutes inherit area through the related assignment/plan block; combined totals include both areas (and retain unattributed focus time only in combined totals).
