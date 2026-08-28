# Backend integration notes

## 2026-08-28 — contract-aligned frontend

The frontend contract in `src/types/api.ts` mirrors the backend Zod schemas and response envelope inspected in `../backend/src/lib/contracts`, `../backend/src/app/api`, and `../backend/docs/integration-notes.md`.

All browser traffic is same-origin under `/api`. Next rewrites it server-side to `BACKEND_INTERNAL_URL` (default `http://127.0.0.1:3001`). The internal backend and Ollama origins are never public environment variables. Real mode obtains the active Supabase access token and sends `Authorization: Bearer <token>`.

| Method | Endpoint | Convention |
| --- | --- | --- |
| POST | `/api/brain-dumps/parse` | returns persisted `BrainDump.parsedAssignments` |
| GET/POST/PATCH/DELETE | `/api/assignments` | PATCH and DELETE put `id` in JSON |
| POST | `/api/calendar/import` | multipart `file` plus `classification`; browser sets boundary |
| GET | `/api/calendar/week?start=&timezone=` | explicit week anchor and IANA zone |
| GET/POST/PATCH/DELETE | `/api/study-windows` | PATCH and DELETE put `id` in JSON |
| POST | `/api/plans/generate` | explicit `rangeStart`, `rangeEnd`, and `timezone` |
| GET/PATCH | `/api/plans/:id` | plan read/status and block-lock updates |
| POST/PATCH | `/api/focus-sessions` | PATCH uses `{ id, action, occurredAt? }` |
| GET | `/api/stats/summary?timezone=` | current aggregate summary |

Every response is unwrapped from `{ ok: true, data }` or mapped from `{ ok: false, error }`. Backend codes, field issues, and request IDs are retained on `ApiError`; network failure is the only client-generated `OFFLINE` error.

## School and extracurricular areas

The frontend uses `area: "school" | "extracurricular"`, persisted UI filtering, compact badges, area-aware review/quick-add/import controls, combined plan styling, dashboard lanes, and split assignment totals. Mock EC content exists only in `src/mocks`.

The inspected backend does **not yet define or persist `area`**. It also lacks `activityName` (or an equivalent context field). These frontend fields are optional on response DTOs so current backend payloads remain valid and are treated as school items for display compatibility. Inputs include the proposed final field name, but current Zod schemas strip it.

Backend work still required for complete real-mode area behavior:

- Add `area` to assignments, parsed assignments/brain dumps, calendar imports/events, and the database.
- Add an EC context field such as `activityName`, or document a normalized activity entity.
- Let plan generation select `school`, `extracurricular`, or combined assignments on the server. The current endpoint always schedules every confirmed/in-progress assignment.
- Return enough assignment context with plan blocks (or expose efficient lookup endpoints) for course/activity labels.
- Split focus/planning statistics by area; current stats are aggregate only.
- Add a manual calendar-event mutation endpoint and a calendar-import listing endpoint.
- Add a course listing endpoint. Current assignments expose `courseId`, but the frontend cannot resolve real course names.

## Modes and verification

`NEXT_PUBLIC_USE_MOCK_API=true` keeps deterministic isolated UI tests. Set it to `false` with public Supabase credentials and the server-only backend URL for live integration. Contract tests cover envelope unwrapping, bearer auth, multipart upload, generation input, assignment collection PATCH, focus transitions, and backend error mapping.
