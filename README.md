# School HQ backend

Secure application logic and API routes for the School HQ planning PWA. This repository intentionally contains only a minimal root page; product UI belongs to the frontend worktree.

## Stack and architecture

- Next.js App Router route handlers and TypeScript
- Supabase Auth/Postgres with Row Level Security
- Zod contracts shared from `src/lib/contracts`
- Local Ollama Structured Outputs by default, optional OpenAI Responses API support, and a deterministic mock adapter
- `ical.js` parsing and recurrence expansion
- Pure deterministic scheduling engine
- Vitest

The language model extracts reviewable assignment candidates. Only deterministic code in `src/lib/scheduling/engine.ts` chooses clock times.

## Local setup

1. Install Node.js 22+, Docker, and the Supabase CLI.
2. Copy `.env.example` to `.env.local` and fill in the local Supabase URL and anon key.
3. Run `npm install`.
4. Run `supabase start`, then `supabase db reset` to apply migrations. The default seed is intentionally empty, so this produces an empty application database.
5. Create your local auth user normally. Never substitute its UUID into demo SQL.
6. Run `npm run dev`.

No demo data is included. Database resets and new accounts start empty.

Tests default to `BRAIN_DUMP_PARSER=mock`. For real local parsing, install [Ollama](https://ollama.com/), then run:

```sh
ollama pull qwen3.5:4b
ollama serve
```

Set `BRAIN_DUMP_PARSER=ollama`, `OLLAMA_BASE_URL=http://127.0.0.1:11434`, and `OLLAMA_MODEL=qwen3.5:4b` (the values already shown in `.env.example`). The Next.js server performs a short `/api/tags` health/model check and calls Ollama's native `/api/chat` endpoint with a strict JSON Schema. Browser code never contacts Ollama.

For a deployed backend, Ollama Cloud can be used without an always-on local machine. Set `OLLAMA_BASE_URL=https://ollama.com`, `OLLAMA_API_KEY` to a server-side Ollama API key, and `OLLAMA_MODEL` to a model available to the account (for example `gpt-oss:20b`). The key is sent only as a bearer token from the backend to Ollama.

OpenAI remains optional: set `BRAIN_DUMP_PARSER=openai`, `OPENAI_API_KEY`, and `OPENAI_MODEL` only when that hosted provider is desired. Use `mock` for deterministic development or automated tests.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run build
supabase db reset
```

After applying migrations, verify RLS is enabled:

```sql
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('profiles','courses','assignments','brain_dumps','calendar_imports','calendar_events','study_windows','study_plans','plan_blocks','focus_sessions','scheduling_preferences');
```

Every listed row must report `relrowsecurity = true`. Requests use the authenticated user's JWT; route handlers never accept `user_id` from request bodies.

### Native client access

The Capacitor iOS app calls this API directly instead of going through the frontend's same-origin rewrite. `src/proxy.ts` handles API preflight requests and permits the native `capacitor://localhost` origin by default. Set `CORS_ALLOWED_ORIGINS` to a comma-separated allow list when additional native or web clients need direct access. CORS does not replace API authentication; protected routes still require the Supabase bearer token.

## API

All endpoints return either `{ ok: true, data }` or `{ ok: false, error: { code, message, fields? } }`.

- `POST /api/brain-dumps/parse`
- `GET|POST|PATCH|DELETE /api/assignments`
- `GET|POST|PATCH|DELETE /api/courses`
- `GET|PATCH /api/scheduling-preferences`
- `POST /api/calendar/import`
- `GET /api/calendar/week`
- `POST|PATCH|DELETE /api/calendar/events`
- `GET|POST|PATCH|DELETE /api/study-windows`
- `POST /api/plans/generate`
- `GET|PATCH /api/plans/:id`
- `GET|POST|PATCH /api/focus-sessions`
- `GET /api/stats/summary`

Calendar import uses `multipart/form-data` with an `.ics` field named `file`; optional `classification` is `busy`, `study_available`, or `ignored`.

## Deployment

Create the Supabase project, apply `supabase/migrations`, configure the environment variables in Vercel, and deploy the Next.js project. A Vercel deployment cannot reach Ollama running on a developer's loopback address; production must use authenticated Ollama Cloud, point `OLLAMA_BASE_URL` at a private server-reachable Ollama deployment, or select optional OpenAI. Never expose Ollama directly to browser code, and do not expose `OLLAMA_API_KEY`, `OPENAI_API_KEY`, or the service-role key. The current in-memory parser rate limiter is process-local; production deployments requiring a globally strict quota should replace it with a shared Redis/KV limiter.
