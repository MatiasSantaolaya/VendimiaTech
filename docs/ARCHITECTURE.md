# Architecture

Status: partial library tree. No running application.

## Stack that is actually declared

`package.json` `5.0.0-rc.1`: Next.js, React, Prisma Client, Zod. Dev: Prisma CLI, TypeScript, tsx, Playwright, Vitest, ESLint. `tsconfig.json` maps `@/*` to the repository root (`./*`), `allowJs: false`. `vercel.json` builds with `next build`.

## How the uploaded pieces fit

```
components/ModuleShell.tsx        links to /events/[slug]/...
components/PublicEventPage.tsx    public page + <abra-checkout>
components/QuickCreate.tsx        POST /api/events/:eventId/modules
components/RegisterSW.tsx         registers /sw.js
scripts/worker.mjs                POST /api/internal/worker  (x-plane-worker-secret)
lib/services/event-access.ts      Prisma membership lookup
lib/services/event-by-slug.ts     requires lib/auth getCurrentUser
lib/services/event-health.ts      writes Event.healthScore
lib/services/audit.ts             AuditLog.metadata
lib/services/attendee-auth.ts     cookie plane_attendee_session
lib/ticketing/abra.ts             fetch ABRA_API_BASE_URL + relative paths
lib/{ai,email,payment,storage}    HTTP adapters, fail if env is empty
```

None of those components or services are imported by a Next.js route. `app/` does not exist.

`lib/services/event-access.ts` imports `../../lib/prisma` and `@prisma/client`. From `lib/services/` that path is `lib/prisma`, and that file is missing. `lib/services/event-by-slug.ts` imports `../../lib/auth`, also missing. `MembershipRole` is used as a type but Prisma Client has not been generated in this workspace (`node_modules` is absent).

## Domain code that exists and is unused

| Module | Role |
| --- | --- |
| `lib/domain/health.ts` | Copy of the arithmetic in `event-health.ts`, plus separate area weights. Not called by `event-health.ts`. |
| `lib/domain/finance.ts` | Revenue, cost, margin, ROI, budget variance. |
| `lib/domain/graph.ts` | Dependency blockers and a node/edge builder. |
| `lib/domain/matchmaking.ts` | Transparent point rules. |
| `lib/domain/forecast.ts` | Heuristic projection, not a model. |
| `lib/domain/brain.ts` | Keyword answers and a confirmation gate. Not wired to `lib/ai/provider.ts`. |
| `lib/domain/rbac.ts` | Role helpers parallel to `canManage` / `canOperate`. Not used by the Prisma access module. |
| `lib/ticketing/mock.ts` | In-memory Abra stand-in and HMAC check. Not selected by any route. |
| `lib/rate-limit.ts`, `lib/monitoring.ts` | Adapters. Not referenced. |

## Data model

`prisma/schema.prisma` describes organizations, users, sessions, event membership, entity access, tasks, sponsors (`SponsorDeal` / `SponsorDeliverable`), speakers, sessions, vendors, attendees, tickets, incidents, run of show, finance, notifications, and ticketing sync tables.

The uploaded health query depends on specific stored strings: task status `DONE` | `CANCELLED` | `BLOCKED`, incident status `open`, run-of-show status `done`, deliverable status `done` through `deal.eventId`. The schema uses `String` for those fields so those queries can match. There is no migration SQL yet, so Postgres has nothing to apply.

## Intended request path (not built)

Browser → `app/` route → `getCurrentUser` (`lib/auth`) → `getEventAccess` → Prisma or, for `/demo`, an in-memory store that never constructs a client. That split is required by `VERCEL-DEMO.md` and is not implemented.

## Event graph

`lib/domain/graph.ts` can build nodes and dependency blockers from plain arrays. No screen reads it. `ModuleShell` is only a nav shell; it does not render a graph.
