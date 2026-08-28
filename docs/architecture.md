# Backend architecture

## Boundaries

`src/lib/contracts` is the frontend-safe import boundary. It contains Zod schemas, inferred DTO types, and the typed API envelope; it imports no Supabase, filesystem, Node-only, or OpenAI code.

`src/lib/brain-dump` converts unstructured text to reviewable `ParsedAssignment` records. The OpenAI adapter calls the server-side Responses API with strict JSON Schema Structured Outputs. Missing deadlines remain `null`; ambiguous phrases are preserved with warnings. Parsing creates a `brain_dumps` audit row but never creates `assignments`.

`src/lib/calendar` validates and normalizes `.ics` files, registers supplied `VTIMEZONE` definitions, expands recurrence rules, exclusions, and recurrence exceptions inside a bounded horizon, skips cancelled events, preserves source UIDs, and emits UTC instants. Source name identifies an import feed, a content hash audits its current version, and `(calendar_import_id, source_uid, recurrence_id)` makes occurrences unique within that source.

`src/lib/scheduling` is a pure, stable scheduling engine. It clips availability to the requested range, subtracts busy events and locked blocks, applies dependency rank and deterministic urgency/priority/duration scoring, splits work, inserts bounded breaks, and reports unscheduled remainders. It never asks a language model for clock times.

`src/lib/focus` owns the focus-session state machine. The database stores timestamps and accumulated pause seconds; clients derive the displayed countdown instead of relying on a server tick.

## Security model

Route handlers authenticate with `supabase.auth.getUser()`, which validates the JWT. The request body never controls `user_id`. Every user-owned table has RLS enabled and an owner-only policy based on `auth.uid()`. Foreign-key ownership is additionally bounded by RLS during normal authenticated access.

The OpenAI key is read only in server code. Parser input is capped at 12,000 characters, calendar uploads at 1 MB/5,000 expanded events, OpenAI calls at 30 seconds maximum, and parser calls are rate-limited per authenticated user. API errors expose stable codes and sanitized messages, while details are logged server-side.

## Scheduling flow

1. Load confirmed/in-progress assignments, explicit windows, busy events, locked blocks, and preferences under the user's RLS session.
2. Run `generateSchedule` without database access.
3. Create a draft plan and persist generated blocks.
4. Move existing locked blocks to the regenerated plan so their IDs and times remain stable.
5. Return blocks plus machine-readable unscheduled reasons.

Absolute instants are stored as `timestamptz`; IANA timezone names are retained on plans/preferences for local-day boundaries and display.
