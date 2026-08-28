# School HQ frontend

A mobile-first school planning PWA built with Next.js App Router, TypeScript, Tailwind CSS, customized shadcn-style source components, and Lucide icons.

## Routes

- `/` dashboard command center
- `/assignments` searchable assignment manager
- `/calendar` weekly grid, mobile agenda, and `.ics` classification flow
- `/planner` brain dump, human review, and generated timeline
- `/focus` persistent timestamp-based countdown
- `/stats` weekly progress and course breakdown
- `/settings` theme, notifications, calendar, and profile controls
- `/login` passwordless sign-in shell

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Mocks are on by default. Set `NEXT_PUBLIC_USE_MOCK_API=false` when the backend implements the contract in `docs/integration-notes.md`.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

The Playwright suite runs mobile and desktop smoke coverage. Install its Chromium runtime with `npx playwright install chromium` if it is not already available.

## Environment

- `NEXT_PUBLIC_USE_MOCK_API`: use the exact-type mock adapter (`true` by default).
- `NEXT_PUBLIC_API_BASE_URL`: optional API origin when endpoints are not same-origin.
- `NEXT_PUBLIC_SITE_URL`: trusted absolute origin used for social-preview metadata.
- `NEXT_PUBLIC_SUPABASE_URL`: reserved for backend-auth integration.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: publishable Supabase anon key only; never use a service-role key in the browser.

See `docs/architecture.md` for code boundaries and `docs/integration-notes.md` for backend assumptions.
