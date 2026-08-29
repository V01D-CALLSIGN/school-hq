# Backend integration notes

School HQ has one runtime mode: authenticated API-backed persistence. The frontend sends the active Supabase bearer token to the backend and starts with empty states for a new account. There is no bundled sample dataset or mock API switch.

Browser traffic uses same-origin `/api` routes rewritten to `BACKEND_INTERNAL_URL`. Capacitor builds call the public HTTPS `NEXT_PUBLIC_API_URL` directly.

The frontend supports persistent courses, assignments, brain-dump review, calendar imports and manual events, study windows, plan generation and activation, focus sessions, area-split statistics, and scheduling preferences. HTTP response envelopes and DTOs mirror `../backend/src/lib/contracts`.

For local development, configure the public Supabase URL and anon key in both projects, run the backend on port 3001, and run the frontend on port 3000. For iOS, set the deployed backend origin in `NEXT_PUBLIC_API_URL` before `npm run ios:sync`.
