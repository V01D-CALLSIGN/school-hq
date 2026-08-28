# School HQ frontend

A responsive personal command center for schoolwork, extracurricular commitments, planning, and focused work. Built with Next.js 16 App Router, TypeScript, Tailwind CSS 4, editable shadcn/ui source, Supabase Auth, and a safe offline shell.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Mock mode is enabled by default for isolated UI and screenshot tests. For live integration:

```dotenv
NEXT_PUBLIC_USE_MOCK_API=false
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

The Playwright suite includes mobile, tablet, desktop, and visual baselines for dashboard, planner, calendar, and focus at 390px and desktop widths. See `docs/integration-notes.md` for exact backend conventions and currently missing area capabilities.
