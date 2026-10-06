# Known limitations

Verified on 2026-10-06. Executed here: `npm run lint` passed, `npm run typecheck` passed, `npm test` passed (8 files, 21 tests), and `npm run test:e2e` passed (3 tests). Items below that are still open were not run.

## Data plane

- With `DATABASE_URL` set and no `plane_demo` cookie, pages and `/api/*` use Prisma. `/demo` and `plane_demo=1` stay on the memory store. Password login sets `plane_demo` only when there is no database.
- Local PostgreSQL 16.15, database `plane`, has `20261006153000_init` applied. Login of `ana.organizer@vendimiatech.demo` returned `demo: false` and cleared `plane_demo`. `POST /api/events/evt_vendimia/modules` created task `tas_16ee932ae2b1fac5` (`Tarea postgres`). Prisma read it back with audit action `task.create` and actor `usr_ana`. The rest of the module API was not replayed against Postgres.
- `npm run db:seed:demo` twice printed `tasks=12 incidents=3 sponsors=3 expenses=4 tickets=135 sessions=3 vendors=2 speakers=3 runOfShow=3`. The seed does not insert shifts or polls. `npm run db:seed` was not run.
- `plane-event-os:latest` (`fadce627b2a9`) was started with host networking and `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/plane`. `GET /api/health` returned `{"ok":true,"service":"plane","mode":"database","demoReady":true}`. The container was stopped and removed. The image remains.
- Vercel deploy is not done. `vercel --prod` was not run. No Vercel project is linked.
- `getManagerEvent` in `event-by-slug.ts` is still unused, because it refuses every role except management and would block staff and portal pages.

## Product depth

- Planning UI is a list, a status kanban, a due-date list, and a month calendar of tasks that already have `dueAt`. It is not a drag-and-drop timeline.
- Finance formulas run on the fixture. There is no invoice payment flow in the UI beyond displaying the rows the fixture already has.
- `/attendee/[eventId]` posts the fixture token to `POST /api/auth/attendee` and sets `plane_attendee_session`. The uploaded helper still revokes that token on use. There is no mailer, so the screen does not send a link.
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

Abra is not done. The four relative paths in `lib/ticketing/abra.ts` are the uploaded contract. They were not confirmed, and no endpoints were added. See `docs/INTEGRATIONS.md`.

## Dependency pins

`prisma` and `@prisma/client` are `6.19.3` because `latest` on this date was Prisma 8 RC without `prisma generate`. `npm run lint` is `eslint .` because Next.js 16.3.8 removed `next lint`.
