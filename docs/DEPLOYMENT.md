# Deployment

Target: Vercel, Next.js, PostgreSQL. `vercel --prod` was not run.

## Versions resolved on 2026-10-06

| Package | Resolved |
| --- | --- |
| next | 16.3.8 |
| prisma / @prisma/client | 6.19.3 (pinned). `latest` was Prisma 8.0.0-rc.20, whose CLI has no `generate` or `migrate`. |
| Node on this machine | v22.14.0 |

`package.json` `build` remains `next build`. `postinstall` runs `scripts/postinstall.mjs`, which calls `prisma generate` and warns instead of failing if generate cannot run (the Docker deps stage uses `--omit=dev`, and the Prisma CLI is a devDependency).

`vercel.json` is unchanged: framework `nextjs`, `buildCommand` `next build`, `installCommand` `npm install --no-audit --no-fund`.

## Environment

Copy `.env.example`. No real secrets belong in git.

Required for a database-backed process (`/demo` still uses memory):

- `DATABASE_URL` — example `postgresql://postgres:postgres@localhost:5432/plane`

Used by the demo and by absolute links:

- `NEXT_PUBLIC_APP_URL`

Abra, email, storage, payments, and AI stay empty for the demo. The adapters throw or no-op until they are set. See `docs/INTEGRATIONS.md`.

Also read by code, optional:

- `WORKER_SECRET` — required by `scripts/worker.mjs` and by `POST /api/internal/worker`
- `RATE_LIMIT_DRIVER`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `MONITORING_DRIVER`, `MONITORING_WEBHOOK_URL`
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ORG_NAME`, `SEED_ADMIN_NAME` — production seed only

## Database

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/plane"
npx prisma generate
npx prisma migrate deploy
```

The only migration in the tree is `prisma/migrations/20261006153000_init`. It was generated with `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`. On this machine it was applied to local PostgreSQL 16.15 (`postgresql://postgres:postgres@127.0.0.1:5432/plane`). `SELECT version()` returned `PostgreSQL 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)`. `_prisma_migrations` has one finished row, `20261006153000_init`. The README name `20261006_product_completion` is an upstream instruction. That migration file is not in this checkout. Postgres was started with `sudo pg_ctlcluster 16 main start` after `service postgresql start` was denied by `policy-rc.d`.

`npm run db:seed` upserts one owner when the `SEED_*` variables are set. Otherwise it prints a no-op. It does not load Vendimia Tech. That production seed was not run here.

`npm run db:seed:demo` upserts organizations, users, memberships, events, tasks, incidents, sponsor deals, deliverables, and finance rows (expenses, revenues, invoices, payments). It does not load tickets or program sessions. `/demo` still uses the memory store.

## Docker

`docker-compose.yml` starts Postgres 17 and the app. It was not used here. `Dockerfile` keeps `npm install --omit=dev` for the runner. The builder stage runs a full `npm install` so `prisma` and `typescript` exist, then `npx prisma generate` and `npm run build`. The generated `.prisma` client is copied into the runner. Both install stages copy `scripts/postinstall.mjs` first, because `npm install` runs that script. The builder also copies `prisma/` before install and sets a placeholder `DATABASE_URL` so `prisma generate` can run.

`docker.io` 29.1.3 is installed. `sudo service docker start` printed `docker: unrecognized service`. There is no `/var/run/docker.sock`. The engine that answered was Docker Engine Community 29.1.4 on `tcp://127.0.0.1:2375`.

First `DOCKER_HOST=tcp://127.0.0.1:2375 docker build -t plane-event-os /workspace` exited 1 at `RUN npm install --omit=dev`: `Error: Cannot find module '/app/scripts/postinstall.mjs'`. After the Dockerfile copy fix, the same command exited 0: `Successfully built fadce627b2a9` and `Successfully tagged plane-event-os:latest`. The container was not started.

## Vercel

A Vercel project was not created and production was not deployed. A preview deploy can serve `/demo` without `DATABASE_URL`. Do not describe that as production tenancy: login and event reads still use the in-memory store.

## Lint script

Next.js 16 removed the `next lint` command (`next lint` is parsed as a project directory and exits with "Invalid project directory"). `npm run lint` runs `eslint .` with `eslint-config-next` 16.3.8.
