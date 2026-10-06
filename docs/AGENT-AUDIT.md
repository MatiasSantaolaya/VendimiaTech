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
