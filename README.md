# School HQ frontend

A responsive personal command center for schoolwork, extracurricular commitments, planning, and focused work. Built with Next.js 16 App Router, TypeScript, Tailwind CSS 4, editable shadcn/ui source, Supabase Auth, and a safe offline shell.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

School HQ always uses the authenticated backend. Configure Supabase and the local backend rewrite:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
BACKEND_INTERNAL_URL=http://127.0.0.1:3001
```

`BACKEND_INTERNAL_URL` is server-only. Browser requests always use same-origin `/api`; do not create public backend or Ollama URL variables.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

The Playwright suite includes mobile, tablet, desktop, and visual baselines for dashboard, planner, calendar, and focus at 390px and desktop widths. See `docs/integration-notes.md` for the current backend conventions.

## iPhone / Xcode

School HQ includes a Capacitor iOS project at `ios/App/App.xcodeproj`. The native build keeps the existing responsive interface and adds iPhone safe-area, status-bar, keyboard, splash-screen, and Supabase deep-link handling.

Build the static web bundle, sync it into Xcode, and open the project:

```bash
npm install
cp .env.example .env.local
npm run ios:sync
npm run ios:open
```

Set these values before `npm run ios:sync` so the native bundle can use your account and deployed API:

```dotenv
NEXT_PUBLIC_API_URL=https://your-school-hq-backend.example.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

The native client calls `NEXT_PUBLIC_API_URL` directly, so the backend must be deployed over HTTPS with native CORS enabled. In Supabase Authentication URL Configuration, add `schoolhq://auth/callback` to the redirect allow list for passwordless sign-in.

In Xcode, select the `App` target, choose a Team under **Signing & Capabilities**, select a connected iPhone, and press Run. After changing frontend code or environment values, run `npm run ios:sync` again before rebuilding in Xcode.
