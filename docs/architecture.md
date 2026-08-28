# Frontend architecture

School HQ is a Next.js App Router PWA. Route files remain server components where possible; stateful product surfaces live in `src/features` as narrow client components. Shared UI primitives live in `src/components/ui` and use customized shadcn-style source rather than an external component theme.

## Layers

- `src/app`: routes, metadata, loading/error boundaries, manifest.
- `src/features`: dashboard, planner, calendar, assignments, focus, stats, settings, and auth experiences.
- `src/components`: application shell, page framing, status states, and UI primitives.
- `src/types/api.ts`: the frontend-owned copy of the proposed HTTP contract until the backend publishes a shared package.
- `src/lib/api-client.ts`: the only browser-facing server boundary. It swaps between HTTP and mock responses without changing feature return types.
- `src/lib/mock-data.ts`: deterministic display fixtures only. Scheduling and parsing logic are not implemented here.

## State and persistence

Most display data is mock-adapter data and will be replaced by Supabase-backed endpoints. The focus timer stores only its device-local runtime state in `localStorage`. Its remaining time is always `endAt - Date.now()` while running; the interval triggers renders but is not the source of truth. Theme preference is also device-local.

## Responsive model

Desktop uses a collapsible sidebar. Phones use a five-item bottom navigation plus a menu drawer. Calendar switches from a seven-day grid to a single-day agenda below the medium breakpoint. Core controls use a minimum 44px touch target and visible `:focus-visible` treatment.

## PWA

`app/manifest.ts` declares standalone installation metadata. `public/sw.js` caches the application shell and uses network-first navigation with a cached fallback. The service worker registers only in production.
