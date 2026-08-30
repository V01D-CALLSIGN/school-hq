# School HQ

School HQ is maintained as a single monorepo so the web/iOS client and API can
change together without duplicating deployment or integration work.

## Repository layout

- `frontend/` — Next.js client and Capacitor iOS project
- `backend/` — persistent API, Supabase integration, and planning services

Each application keeps its own dependencies, environment template, tests, and
deployment configuration. Local `.env` files, Vercel links, build output, Xcode
user data, signing material, and generated Capacitor assets remain ignored.

## Common commands

Run these from the repository root:

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run build:ios
npm run sync:ios
```

The existing Vercel projects deploy independently with `frontend` and `backend`
configured as their respective root directories. Run Capacitor and Xcode work
from `frontend/`.

## Preserved history

The complete active histories of the former frontend and backend repositories
were imported without squashing. Their previous branch tips are also retained
as `legacy/frontend/*` and `legacy/backend/*` tags for audit and rollback.
