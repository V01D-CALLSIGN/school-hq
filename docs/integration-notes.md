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
