# Repository audit — PLANe (PlanE)

Audit date: 2026-10-06. Auditor: implementation agent on branch `feat/plane-event-os`.
Repository: `https://github.com/MatiasSantaolaya/VendimiaTech`. Base commit on `main`: `5ad912f` ("Initial commit").

## Architecture found

The working tree contained a single file:

- `README.md` — one line: `# VendimiaTech`

No application source, package manifest, framework, database schema, authentication, tests, CI, or deployment configuration existed. There is no prior PlaneE / PlanE module to extend. This is a greenfield build inside the existing git history (the initial commit stays intact; README content is replaced in a normal commit).

Related repositories were not used as source:

- `MatiasSantaolaya/plane-event-os` and `MatiasSantaolaya/plane-event` were described as empty or non-product.
- `MatiasSantaolaya/vendimia-tech` (static landing) returned HTTP 404 to both unauthenticated fetch and the GitHub API from this environment. It was not modified. No brand facts were copied from it because none could be read.

Brand facts used, and only these, come from the product assignment:

- Product name: PLANe / PlanE
- Positioning: "Un evento = un sistema operativo completo."
- Demo event name: Vendimia Tech 2027
- Place: Mendoza, Argentina

Dates, venue name, sponsors, speakers, vendors, ticket prices, and budget figures in the demo seed are **operating fixtures**, not official landing-page facts. They are labeled as such in `docs/DEMO.md` and `docs/KNOWN-LIMITATIONS.md`.

## Problems

1. No runtime, schema, or domain model.
2. No tenancy boundary, so any future feature would be at risk of becoming a single-tenant script.
3. No session, invitation, CSRF, or audit trail.
4. No Event Graph, so modules would ship as silos.
5. Ticketing could accidentally become a second product. The real vendor for Vendimia Tech is Abra, and Abra's HTTP contract is not in this repo.
6. No demo path that runs without PostgreSQL.
7. No test harness, lint, typecheck, or production build.
8. No Vercel project, environment contract, or security headers.

## Risks

| Risk | Mitigation in this build |
| --- | --- |
| Scope is an entire operating system | Shared domain functions, one repository interface, one API router, one app shell. P2 depth is thinner than P0/P1; screens are still wired. |
| Abra contract unknown | `TicketingProvider` + `MockAbraTicketsProvider` + `AbraTicketsProvider` that fails closed. No invented Abra URLs. |
| Serverless demo memory | Demo state is process-local. Documented. E2E uses one Node server. |
| Brand invention | Fixtures are explicit demo data. |
| Auth bypass via UI | Every mutation checks actor → organization → event → role → entity on the server. |
| Secrets in git | `.env.example` only. Adapters read `process.env`. |

## Missing features (before this branch)

Everything in the product spec: auth, RBAC, event core, command center, health, graph, planning, operations, finance, portals, attendees, networking, analytics, notifications, Event Brain, ticketing abstraction, demo mode, tests, and deployment docs.

## Execution plan

1. Land this audit on `feat/plane-event-os` (no commits to `main`).
2. Add the domain layer (health, graph, finance, matchmaking, forecast, RBAC) as pure functions.
3. Add a memory repository and a Prisma repository behind one interface. Demo route never opens PostgreSQL.
4. Add session auth, invitations, CSRF, rate limit, audit log.
5. Add provider interfaces (storage, email, payments, jobs, AI, ticketing, monitoring, rate limit) with a local adapter and a real adapter that stays inactive until env is set.
6. Add the API and the Spanish UI shell: command center, planning, operations, finance, portals, networking, analytics, brain, ticketing.
7. Seed Vendimia Tech 2027 demo data plus a second organization used only to prove cross-tenant denial.
8. Add unit tests, API tests, and Playwright coverage against `/demo`.
9. Run lint, typecheck, unit tests, and production build. Run E2E if Chromium installs.
10. Document deployment, security, API, integrations, demo, limitations, and the production checklist. Do not deploy to Vercel production.

## Definition of done

A feature is done only when persistence (memory and/or Prisma), API, permission check, UI, graph/health/audit hook where it applies, and error handling exist. Tests cover the domain rules and the tenant boundary. Items that stay thinner are listed honestly in `docs/KNOWN-LIMITATIONS.md` and the release report, not marked complete.

## Uploaded baseline (second and third drops)

The empty-repo finding above was true at the start of the branch. The user then uploaded the real PlanE root and a partial source drop. Those files are the stack baseline and are preserved.

### Root contract

| File | What it specifies |
| --- | --- |
| `package.json` | `plane-event-os` `5.0.0-rc.1`. Scripts: `dev`, `build` (`next build`), `start`, `db:generate`, `db:migrate`, `db:validate`, `lint` (`next lint`), `db:seed` (`tsx prisma/seed.ts`), `typecheck`, `e2e` (`playwright test`), `worker` (`node scripts/worker.mjs`). Dependencies: `next`, `react`, `react-dom`, `@prisma/client` at `latest`. Dev: `prisma`, `typescript`, `tsx`, `@playwright/test` at `latest`. |
| `tsconfig.json` | `strict`, `allowJs: false`, `baseUrl` `.`, `@/*` → `./*` (repo root, not `src/`). |
| `vercel.json` | `framework: nextjs`, `buildCommand: next build`, `installCommand: npm install --no-audit --no-fund`. |
| `Dockerfile` | Node 22 Alpine. Deps stage `npm install --omit=dev`. Builder runs `npx prisma generate` then `npm run build`. Runner copies `.next`, `public`, `prisma`. |
| `docker-compose.yml` | Postgres 17 Alpine (`plane` / `postgres` / `postgres`) and app on port 3000 with `DATABASE_URL` pointing at the `postgres` service. |
| `.env.example` | `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, Abra (`ABRA_API_BASE_URL`, `ABRA_API_KEY`, `ABRA_WEBHOOK_SECRET`), email (`EMAIL_API_BASE_URL`, `EMAIL_API_KEY`, `EMAIL_FROM`), storage presign (`STORAGE_SIGNING_URL`, `STORAGE_API_KEY`), payments (`PAYMENT_PROVIDER_NAME`, `PAYMENT_API_BASE_URL`, `PAYMENT_API_KEY`, `PAYMENT_WEBHOOK_SECRET`), AI (`AI_API_BASE_URL`, `AI_API_KEY`, `AI_MODEL`), `WORKER_SECRET`. |
| `README.md` | Multi-actor PlanE surface, App Router + Prisma, Abra embed without duplicating ticketing, externalized production dependencies. Mentions an incremental `20261006_product_completion` migration that was **not** in the upload. |
| `VERCEL-DEMO.md` | `/demo` is zero-config and isolated from the production data layer. |

Added on top of that contract, without removing it: `test`, `test:e2e`, `db:seed:demo`, a postinstall that runs `prisma generate` when the CLI is present, `zod`, Vitest, ESLint, and TypeScript DOM types. `build` stays `next build`.

### Source placement

Imports decided the directories. Duplicate names were not merged.

| Upload | Path | Why |
| --- | --- | --- |
| `sw_8a75.js` | `public/sw.js` | `RegisterSW` registers `/sw.js`. |
| `worker_51d7.mjs` | `scripts/worker.mjs` | `package.json` `worker` script. POSTs `/api/internal/worker` with `x-plane-worker-secret`. |
| `provider_c822.ts` | `lib/ai/provider.ts` | `AiProvider` / `AI_API_BASE_URL` `/chat/completions`. |
| `provider_d601.ts` + `types_1346.ts` | `lib/email/provider.ts`, `lib/email/types.ts` | `./types` plus `EMAIL_API_BASE_URL`. |
| `provider_2930.ts` + `types_468a.ts` | `lib/payment/provider.ts`, `lib/payment/types.ts` | `./types` plus `PAYMENT_*`. |
| `provider_84ea.ts` + `types_841c.ts` | `lib/storage/provider.ts`, `lib/storage/types.ts` | `./types` plus `STORAGE_SIGNING_URL`. |
| `abra_9a5a.ts` + `types_3523.ts` | `lib/ticketing/abra.ts`, `lib/ticketing/types.ts` | `./types`. Relative paths under `ABRA_API_BASE_URL`. Fail closed without credentials. |
| `attendee-auth_d6b8.ts`, `audit_c2b0.ts`, `event-access_a53d.ts`, `event-by-slug_0c5c.ts`, `event-health_1578.ts` | `lib/services/*` | `../../lib/prisma` and `../../lib/auth` resolve from `lib/services/`. |
| `ModuleShell_8bec.tsx`, `PublicEventPage_9915.tsx`, `QuickCreate_e840.tsx`, `RegisterSW_2ac3.tsx` | `components/*` | UI shell. Routes are `/events/[slug]/...`. Quick create posts `/api/events/[eventId]/modules`. |

### Behavior that later code must keep

- Roles that can manage: `OWNER`, `ADMIN`, `EVENT_MANAGER`, `FUNCTIONAL_LEAD`. Staff can operate. `getEventAccess` is membership-based (`OrganizationMember` or `EventMember`), not email-based.
- Health query strings are exact: task statuses `DONE` / `CANCELLED` / `BLOCKED`; incidents `open`; run-of-show `done` with `critical`; deliverables via `deal.eventId` and status `done`.
- Attendee auth is a separate cookie, `plane_attendee_session`, with hashed magic tokens.
- Audit rows use `metadata`, not a before/after pair, in the uploaded helper.
- Public checkout embed is the uploaded `<abra-checkout>` plus `https://sdk.abratickets.com/v2/checkout.js`. No extra Abra routes were added.
- AI, email, storage, and payments throw clear not-configured errors. The local/demo brain is a separate rule engine so the HTTP provider stays unchanged.
- The service worker file is unchanged. Playwright blocks service workers so that cache cannot freeze `/demo` during E2E.

### Schema gap

The upload names `20261006_product_completion` but does not include a previous baseline schema. `prisma/schema.prisma` is in the repo. `prisma/migrations/` is not. Fresh Postgres cannot be migrated yet.

## Docs pass (this revision)

`START-HERE.md` and `docs/*.md` were written from the tree as it sits: uploaded adapters and components, domain helpers, and a Prisma schema, with no `app/` routes and no `lib/prisma.ts` or `lib/auth.ts`. README and `VERCEL-DEMO.md` were corrected where they said `/demo` and the seed scripts already run. Those docs must be updated again when routes exist. Unbuilt screens are not marked done.
