# Known limitations

Verified against the tree on 2026-10-06 after `npm test`, `npm run build`, and `npm run test:e2e`. Items below are not done.

## Data plane

- Pages and `/api/*` always use the memory demo store. `DATABASE_URL` does not switch reads or writes to Prisma.
- Login and invitation accept always set `plane_demo=1`.
- `lib/services/event-access.ts`, `event-by-slug.ts`, `event-health.ts`, `audit.ts`, and `attendee-auth.ts` are the uploaded Prisma helpers. The UI does not call them.
- `prisma/seed-demo.ts` upserts organizations, users, memberships, and events only. It does not insert tasks, tickets, sponsors, sessions, or incidents.
- `prisma/migrations/20261006000000_init` was generated from an empty database. It was not applied to Postgres. There is no `20261006_product_completion` migration.
- Docker image build was not run. `npm install --omit=dev` in the Dockerfile may omit the Prisma CLI and TypeScript that the builder stage needs.
- Vercel production was not deployed. No Vercel project is linked.

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
