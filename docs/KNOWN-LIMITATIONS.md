# Known limitations

Verified against the tree on 2026-10-06 after `npm test`, `npm run build`, and `npm run test:e2e`. Items below are not done.

## Data plane

- With `DATABASE_URL` set and no `plane_demo` cookie, pages and `/api/*` use Prisma. `/demo` and `plane_demo=1` stay on the memory store. Password login sets `plane_demo` only when there is no database.
- `getEventAccess`, `calculateEventHealth`, `refreshEventHealth`, `audit`, `getCurrentAttendee`, and `signInWithMagicToken` run on that Prisma path. `getManagerEvent` in `event-by-slug.ts` is still unused, because it refuses every role except management and would block staff and portal pages.
- `prisma/seed-demo.ts` upserts organizations, users, memberships, events, budget categories, sponsor deals, deliverables, tasks, incidents, expenses, revenues, invoices, and payments. It does not insert tickets, program sessions, vendors, speakers, or run-of-show rows. A second run keeps the same fixture rows.
- `prisma/migrations/20261006153000_init` is the full schema SQL from `prisma migrate diff --from-empty --to-schema-datamodel` (987 lines). It was applied on this machine to PostgreSQL 16.15, database `plane`, with `npx prisma migrate deploy`. There is no `20261006_product_completion` migration. docker-compose was not used to start Postgres; `pg_ctlcluster 16 main start` was.
- The Docker image outcome is in `docs/DEPLOYMENT.md`. `vercel --prod` was not run. No Vercel project is linked.
- One database request was exercised: login without `plane_demo=1`, create task `tas_16ee932ae2b1fac5` (`Tarea postgres`), and read it back with Prisma (`audit` action `task.create`, actor `usr_ana`). The rest of the module API was not replayed against Postgres.

## Product depth

- Planning UI is a list, a status kanban, and a due-date list. It is not a calendar grid or a drag-and-drop timeline.
- Finance formulas run on the fixture. There is no invoice payment flow in the UI beyond displaying the rows the fixture already has.
- Attendee magic-link login (`plane_attendee_session`) is implemented in the uploaded service and not wired to a page.
- Networking creates a pending connection row. It does not schedule meetings from the UI, and matchmaking is a transparent score, not a learned model.
- Forecasting is a heuristic (`lib/domain/forecast.ts`). It is not a trained model.
- Gamification adds points for a poll vote and shows fixture points. There is no broader rules engine.
- Event Brain answers from the demo view. It does not call `AI_API_BASE_URL` unless something else invokes `lib/ai/provider.ts`. Confirm is required before a task or incident mutation. Other mutations are not proposed.
- Storage has no local adapter. The UI does not upload files.
- Payments are not used for the demo ticket totals. Those totals are fixture cents.
- Incident and deliverable statuses that the health query understands are lowercase `open` and `done`. Task statuses are uppercase (`TODO`, `DONE`, `BLOCKED`, `CANCELLED`). The UI labels incidents in Spanish ("Resuelto") while the stored status is `resolved`.
- The service worker caches HTML. A repeat visit can show a stale shell until the cache is cleared.
- Public checkout depends on Abra's hosted script. This environment did not load that script in a browser outside Playwright, and Playwright blocks service workers and does not assert the third-party script.

## Abra

The four relative paths in `lib/ticketing/abra.ts` are the uploaded contract, not a confirmed Abra API. See `docs/INTEGRATIONS.md`.

## Dependency pins

`prisma` and `@prisma/client` are `6.19.3` because `latest` on this date was Prisma 8 RC without `prisma generate`. `npm run lint` is `eslint .` because Next.js 16.3.8 removed `next lint`.
