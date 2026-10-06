# Production checklist

Status after the 2026-10-06 verification on branch `feat/plane-event-os`. Checked means the command was run here or the control is present in code. Unchecked means it is still open.

## Done in this checkout

- [x] `/demo` serves Vendimia Tech 2027 with no database and no API keys.
- [x] Session cookie is HttpOnly. CSRF cookie is separate. Demo mutations check origin.
- [x] Login lockout after 5 failures (covered by the API test).
- [x] Cross-tenant read of `evt_bodega` returns 403 (API test and Playwright).
- [x] Roles are membership and entity access, not email.
- [x] Health, finance, graph blockers, matchmaking, and forecast have unit tests.
- [x] Playwright covers command center, task complete, incident resolve, five portals, ticketing probe, analytics, brain ticket count, and finance denial.
- [x] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` passed.
- [x] Initial SQL migration file exists (`20261006000000_init`).
- [x] `.env.example` lists variables. No live secrets are committed.
- [x] Security headers and a CSP that allows the Abra checkout host.
- [x] Abra sync fails closed when credentials are absent.

## Still required before production

- [ ] Route pages and `handleApi` through Prisma when `plane_demo` is not set, and stop forcing `plane_demo=1` on password login.
- [ ] Apply `20261006000000_init` to a real Postgres and run `npm run db:seed` with a non-demo owner.
- [ ] Extend `db:seed:demo` if a Postgres demo must contain the full graph. Today only identity rows are upserted.
- [ ] Confirm Abra's real paths, auth, and webhook shape. See `docs/INTEGRATIONS.md`.
- [ ] Set `WORKER_SECRET` and run the worker against the same data store the API uses. Today the worker drains memory jobs only.
- [ ] Move rate limiting off process memory (Upstash adapter exists, unused by default).
- [ ] Decide a storage provider. There is no local fallback.
- [ ] Build and run the Docker image. Not executed.
- [ ] Create the Vercel project, set env vars, and deploy a preview. `vercel --prod` was not run and should wait until the database path is real.
- [ ] Review the service worker so it does not cache authenticated HTML in production.
- [ ] Replace fixture dates, venue, and sponsor names before any public Vendimia Tech launch. They are demo data.
