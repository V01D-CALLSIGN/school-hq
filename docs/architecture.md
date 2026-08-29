# Frontend architecture

School HQ is a Next.js App Router PWA with a customized editable shadcn/ui layer and a “retro-futurist academic cockpit” visual system.

## Boundaries

- `src/app`: routes, metadata, manifest, and global theme tokens.
- `src/features`: authenticated product surfaces and Supabase login/session flow.
- `src/components/ui`: genuine local shadcn/Radix source components configured by `components.json`.
- `src/components/area-filter.tsx`: persisted All/School/EC filtering and compact area badges.
- `src/types/api.ts`: frontend-safe copy of the inspected backend DTOs, plus isolated optional area extensions pending backend support.
- `src/lib/api-client.ts`: same-origin HTTP boundary, response-envelope unwrapping, bearer auth, and deterministic mock adapter.
- `src/mocks`: all fabricated assignments, EC activities, calendar events, plans, parser output, and stats.

Authenticated routes are protected by the Supabase session provider in real mode. API authorization is enforced independently by the backend. Sign-out terminates the local Supabase session, clears timer state, and instructs the service worker to clear its caches.

The Capacitor build sets `CAPACITOR_BUILD=true`, exports every route into `out`, and copies that static bundle into the generated iOS project. Native requests use the public HTTPS `NEXT_PUBLIC_API_URL` instead of the web deployment's server-side rewrite. The iOS URL scheme `schoolhq://auth/callback` returns Supabase PKCE magic-link authentication to the app; the native runtime exchanges the one-time code using the verifier held by the originating WebView.

The service worker bypasses API/auth requests, non-GET and cross-origin requests, and never stores failed responses. Static assets are cache-first; safe shell navigation is network-first.

## Visual system

Space Grotesk provides display/body character and IBM Plex Mono carries timestamps, durations, labels, and system telemetry. Cyan marks school, amber marks extracurriculars, violet marks active focus, lime marks completion, coral marks urgency, and slate carries neutral planning state. Cards use a tighter radius scale, selective corner cuts, rails, inset panels, and restrained state glows.
