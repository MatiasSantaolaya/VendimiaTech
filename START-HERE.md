# Start here

PlanE (`plane-event-os` `5.0.0-rc.1`) is the event operating system in this repository. The project root is the git root. There is no `production/` directory and no Desktop `PlanE` folder.

## Run the demo

The demo does not need PostgreSQL, Abra, or API keys.

```bash
npm install
npm run dev
```

Open `http://localhost:3000/demo`. That route signs in Ana Organizer on Vendimia Tech 2027 and redirects to the command center. Password for every demo user: `vendimia-demo`.

## What was executed on 2026-10-06

| Command | Result |
| --- | --- |
| `npm install` | Completed. `prisma@latest` resolved to Prisma 8.0.0-rc.20, which has no `prisma generate`. `@prisma/client` and `prisma` are pinned to `6.19.3`. |
| `npx prisma generate` | Completed with `DATABASE_URL` set to the example local URL. |
| `npm run typecheck` | Passed after the pin and the type fixes in this branch. |
| `npm run lint` | Passed with 0 errors. Next.js 16.3.8 removed `next lint`, so the script runs `eslint .`. |
| `npm test` | Later pass: 8 files, 21 tests, passed. |
| `npm run build` | Passed. Next.js 16.3.8, compiled successfully. |
| `npm run test:e2e` | 3 Playwright tests passed on the later pass (login, demo flows, cross-tenant). |

PostgreSQL 16.15 is running on this machine at `127.0.0.1:5432`. `npx prisma migrate deploy` applied `20261006153000_init`. `npm run db:seed:demo` upserts organizations, users, memberships, events, tasks, incidents, sponsors, and finance rows. A database login of `ana.organizer@vendimiatech.demo` returned `demo: false` and cleared `plane_demo` (`Max-Age=0`). `POST /api/events/evt_vendimia/modules` created task `tas_16ee932ae2b1fac5`, and Prisma read that row back. `vercel --prod` was not run. The Docker image build is recorded in `docs/DEPLOYMENT.md`.

## Read next

- `docs/DEMO.md` — fixture, personas, and what `/demo` does.
- `docs/ARCHITECTURE.md` — how the demo store and the Prisma schema relate.
- `docs/KNOWN-LIMITATIONS.md` — what is still partial.
- `docs/API.md` — routes that exist today.
