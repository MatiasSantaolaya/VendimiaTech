# Production checklist

Status after the 2026-10-06 verification on branch `feat/plane-event-os`. Checked means the command was run here or the control is present in code. Unchecked means it is still open.

## Done in this checkout

- [x] `/demo` serves Vendimia Tech 2027 with no database and no API keys.
- [x] Session cookie is HttpOnly. CSRF cookie is separate. Demo mutations check origin.
- [x] Login lockout after 5 failures (covered by the API test).
- [x] Cross-tenant read of `evt_bodega` returns 403 (API test and Playwright).
- [x] Roles are membership and entity access, not email.
- [x] Health, finance, graph blockers, matchmaking, and forecast have unit tests.
- [x] Playwright: 3 tests passed (login, organizer flow, cross-tenant 403). The organizer flow covers the command center, task complete, incident resolve, five portals, ticketing probe, analytics, brain ticket count, and finance denial.
- [x] `npm run lint` passed. `npm run typecheck` passed. `npm test` passed: 8 files, 21 tests. `npm run build` passed on an earlier pass (Next.js 16.3.8).
- [x] Initial SQL migration file exists (`20261006153000_init`) and was applied to local PostgreSQL 16.
- [x] `.env.example` lists variables. No live secrets are committed.
- [x] Security headers and a CSP that allows the Abra checkout host.
- [x] Abra sync fails closed when credentials are absent.

## Still required before production

- [x] Route pages and `handleApi` through Prisma when `DATABASE_URL` is set and `plane_demo` is not set. Password login does not set `plane_demo=1`. Verified against local Postgres: login returned `demo: false`, and task `tas_16ee932ae2b1fac5` was created and read back.
- [x] Apply `prisma/migrations/20261006153000_init` to local Postgres. `npm run db:seed` (the non-demo owner seed) was not run.
- [x] `npm run db:seed:demo` was run twice against the local database. Both printed `tasks=12 incidents=3 sponsors=3 expenses=4 tickets=135 sessions=3 vendors=2 speakers=3 runOfShow=3`. The 12th task is the API row `tas_16ee932ae2b1fac5`. `npm run db:seed` (non-demo owner) was not run.
- [ ] Abra is not done. The four paths in `lib/ticketing/abra.ts` are the uploaded contract. They were not confirmed against Abra, and no new Abra endpoints were added. See `docs/INTEGRATIONS.md`.
- [ ] Set `WORKER_SECRET` and run the worker against the same data store the API uses. Today the worker drains memory jobs only.
- [ ] Move rate limiting off process memory (Upstash adapter exists, unused by default).
- [ ] Decide a storage provider. There is no local fallback.
- [x] Build and start the Docker image. `DOCKER_HOST=tcp://127.0.0.1:2375 docker build -t plane-event-os /workspace` produced `plane-event-os:latest` (`fadce627b2a9`). That image was started with `--network host` and `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/plane`. `GET /api/health` returned `{"ok":true,"service":"plane","mode":"database","demoReady":true}`. A `SELECT 1` from the container returned `[{"ok":1}]`. The container `plane-event-os-health` was then stopped and removed. The image was left in place. There is no `/var/run/docker.sock`; the client used `tcp://127.0.0.1:2375`.
- [ ] Vercel deploy is not done. No Vercel project was created and `vercel --prod` was not run.
- [ ] Review the service worker so it does not cache authenticated HTML in production.
- [ ] Replace fixture dates, venue, and sponsor names before any public Vendimia Tech launch. They are demo data.
