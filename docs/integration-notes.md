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

Environment variables are documented in `.env.example`. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are intentionally public; `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only.

Remaining frontend integration: supply Supabase session cookies or a Bearer access token; implement parsed-assignment review; upload calendars as multipart; render unscheduled reason codes; and drive timers from persisted timestamps.
