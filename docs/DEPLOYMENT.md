# Deployment

Target: Vercel, Next.js, PostgreSQL. Do not run `vercel --prod` from this branch until the Prisma request path exists. It was not run here.

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

Required for a database-backed process (the UI still uses memory today):

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

The only migration in the tree is `prisma/migrations/20261006000000_init`. It was generated with `prisma migrate diff --from-empty --to-schema-datamodel` and was not applied to a running Postgres in this session. The README name `20261006_product_completion` is an upstream instruction. That migration file is not in this checkout.

`npm run db:seed` upserts one owner when the `SEED_*` variables are set. Otherwise it prints a no-op. It does not load Vendimia Tech.

`npm run db:seed:demo` upserts organizations, users, memberships, and events only. Tasks, tickets, sponsors, and the rest of the graph stay in the memory store used by `/demo`.

## Docker

`docker-compose.yml` starts Postgres 17 and the app. `Dockerfile` uses `node:22-alpine`, installs production dependencies with `--omit=dev`, then generates the client and runs `npm run build` in the builder stage. This image was not built here. Because `typescript` and `prisma` are devDependencies, `npm install --omit=dev` can skip the CLI the builder later expects. Treat a green `docker build` as unverified.

## Vercel

A Vercel project was not created and production was not deployed. A preview deploy can serve `/demo` without `DATABASE_URL`. Do not describe that as production tenancy: login and event reads still use the in-memory store.

## Lint script

Next.js 16 removed the `next lint` command (`next lint` is parsed as a project directory and exits with "Invalid project directory"). `npm run lint` runs `eslint .` with `eslint-config-next` 16.3.8.
