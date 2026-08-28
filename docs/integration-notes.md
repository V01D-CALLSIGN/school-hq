# Integration notes

## 2026-08-28 — initial frontend contract

No backend contract or shared package existed in the initialized repository. The frontend therefore defines the proposed contract in `src/types/api.ts` and consumes it exclusively through `src/lib/api-client.ts`. This is a new contract proposal, not a backend modification.

Expected endpoints:

| Method | Endpoint | Frontend return type |
| --- | --- | --- |
| POST | `/api/brain-dumps/parse` | `BrainDumpParseResponse` |
| GET/POST | `/api/assignments` | `Assignment[]` / `Assignment` |
| PATCH | `/api/assignments/:id` | `Assignment` |
| POST | `/api/calendar/import` | `CalendarImportResponse` |
| GET | `/api/calendar/week` | `CalendarEvent[]` |
| GET/POST | `/api/study-windows` | `StudyWindow[]` / `StudyWindow` |
| POST | `/api/plans/generate` | `StudyPlan` |
| GET/PATCH | `/api/plans/:id` | `StudyPlan` |
| POST | `/api/focus-sessions` | `FocusSession` |
| PATCH | `/api/focus-sessions/:id` | `FocusSession` |

Contract assumptions requiring backend confirmation:

- All timestamps are ISO-8601 strings with an offset; the parse request includes the browser IANA timezone.
- Assignment confidence is per field on a 0–1 scale. The frontend flags values below `0.75`.
- Calendar event classification is represented by `kind`; recurring source rows may carry `recurrenceId`.
- Focus sessions accept absolute `startedAt`/`endsAt` timestamps plus paused remaining milliseconds. The browser never sends a secret.
- Error responses should use `ApiErrorBody` with codes `UNAUTHORIZED`, `OFFLINE`, `VALIDATION_ERROR`, `RATE_LIMITED`, or `SERVER_ERROR`. Rate-limit responses may include `retryAfterSeconds`.
- The mock switch is `NEXT_PUBLIC_USE_MOCK_API`; production should set it to `false` only after all endpoints conform.

Remaining integration work:

- Replace fixture-backed reads with authenticated endpoint calls and map Supabase session handling into the client request headers/cookies.
- Upload `.ics` content as multipart/form-data when the backend finalizes its import body. The current mock sends only the filename.
- Persist calendar classifications, planner review edits, plan block edits, and settings when their write endpoints are confirmed.
- Provide a shared generated TypeScript contract package to remove this temporary frontend-owned definition.
