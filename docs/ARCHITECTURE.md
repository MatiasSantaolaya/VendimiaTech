# Architecture

PlanE is a Next.js App Router application. Code lives at the repository root (`app/`, `lib/`, `components/`). The path alias `@/*` maps to that root.

## Two persistence paths

| Path | Status |
| --- | --- |
| Demo memory store (`lib/demo/store.ts`, `globalThis.planeDemo`) | Used by every page and by `handleApi`. `/demo` sets `plane_demo=1` and a session cookie. |
| PostgreSQL via Prisma (`prisma/schema.prisma`, `lib/prisma.ts`, `lib/services/*`) | Schema, client, and an initial migration exist. Uploaded services (`event-access`, `event-health`, `audit`, `attendee-auth`, `event-by-slug`) query Prisma. The App Router and `lib/server/api.ts` do not call them. A request with `DATABASE_URL` set still reads and writes the memory store, and login still sets `plane_demo=1`. |

Domain rules (health, finance, graph, matchmaking, forecast, RBAC, brain) are pure functions in `lib/domain`. The demo view (`lib/server/view.ts`) calls those functions on the memory fixture. `lib/services/event-health.ts` is the uploaded Prisma query and is not invoked by the UI.

## Request flow

1. `app/demo/route.ts` opens a session for `usr_ana` and redirects to `/events/vendimia-tech-2027/control-center`. The redirect host is the incoming `Host` header so a browser on `127.0.0.1` does not jump to `localhost` and drop the cookie.
2. `app/events/[slug]/[[...module]]/page.tsx` loads the workspace from cookies and renders one module.
3. `components/ModuleShell.tsx` is the uploaded nav. It is not edited. Sections: control-center, planning, finance, commercial, content, operations, experience, analytics, ai, website, integrations.
4. Mutations go to `app/api/[[...path]]/route.ts` → `handleApi`.

## Tenancy and roles

`lib/domain/rbac.ts` mirrors the uploaded access rules. Management roles: `OWNER`, `ADMIN`, `EVENT_MANAGER`, `FUNCTIONAL_LEAD`. `STAFF` can operate. Portal roles (`SPONSOR`, `SPEAKER`, `VENDOR`, `ATTENDEE`) see only their entity when `EntityAccess` says so. Email is not an authorization key. Org Bodega Sur (`org_bodega`, event `evt_bodega`) exists so a Vendimia session cannot read it. The API test and the Playwright request both observed HTTP 403.

## Event graph

Tasks, dependencies, incidents, run-of-show items, sponsors, sessions, and deliverables are nodes in `lib/domain/graph.ts`. The command center prints node, edge, and blocker counts from that function. Blockers are computed from unfinished dependencies and from tasks whose status is `BLOCKED`.

## Health

`officialHealthScore` in `lib/domain/health.ts` copies the uploaded formula in `lib/services/event-health.ts`: start at 100, subtract task completion, overdue, blocked, open incidents (`status === "open"`), critical run-of-show items that are not `done`, and overdue deliverables that are not `done`. Area scores are an extra weighted view. The number on the command center is that calculation against the live fixture, not a constant.

## Agenda model name

The schema cannot have two models named `Session`. Auth sessions stay `Session`. Program items are `ProgramSession`. The demo store calls the array `sessionsProgram`.

## Providers

Each integration has an HTTP adapter that fails closed when its env vars are empty, plus a local stand-in:

| Concern | HTTP adapter | Local stand-in |
| --- | --- | --- |
| Ticketing | `lib/ticketing/abra.ts` | `lib/ticketing/mock.ts` |
| Email | `lib/email/provider.ts` | console provider when `EMAIL_API_BASE_URL` is empty |
| Payments | `lib/payment/provider.ts` | none beyond the HTTP client; demo finance does not charge cards |
| Storage | `lib/storage/provider.ts` | no disk adapter |
| AI | `lib/ai/provider.ts` | `lib/domain/brain.ts` answers from demo data |
| Jobs | `scripts/worker.mjs` → `POST /api/internal/worker` | in-memory job list |
| Rate limit | `UpstashRateLimiter` | `MemoryRateLimiter` |
| Monitoring | `WebhookMonitoringProvider` | `ConsoleMonitoringProvider` |

## Service worker

`public/sw.js` is the uploaded file. It caches same-origin GET responses. Playwright sets `serviceWorkers: "block"` so that cache does not freeze the demo during E2E. The manifest is `public/manifest.webmanifest`.
