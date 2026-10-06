# Deployment

No deployment has been run from this checkout. `vercel --prod` has not been executed.

## Vercel

`vercel.json`:

- `framework`: `nextjs`
- `buildCommand`: `next build`
- `installCommand`: `npm install --no-audit --no-fund`

`scripts/postinstall.mjs` tries `prisma generate` and warns if the CLI is missing. Vercel’s install includes devDependencies, so generate can run there. The build command itself is `next build`, not `npm run build`, so it does not run npm’s `prebuild` hook. There is no Next.js `app/` or `pages/` directory, so `next build` cannot succeed until routes exist.

`VERCEL-DEMO.md` says `/demo` needs no Postgres. That route is not implemented.

## Docker

`Dockerfile` (unchanged from the upload):

1. `npm install --omit=dev` in the deps stage.
2. Builder copies those `node_modules`, then `npx prisma generate` and `npm run build`.
3. Runner starts `npm start` and copies `.next`, `public`, and `prisma`.

`typescript` and `prisma` are devDependencies. The deps stage omits them. `postinstall` catches a failed `prisma generate` so the deps stage can finish; the builder then relies on `npx prisma generate`. `next build` also needs TypeScript when `tsconfig.json` is present. That combination has not been executed here. Do not treat the image as buildable until `docker build` is run.

`docker-compose.yml` starts Postgres 17 (`plane` / `postgres` / `postgres` on port 5432) and the app with:

`DATABASE_URL=postgresql://postgres:postgres@postgres:5432/plane`

The compose app service does not set `WORKER_SECRET` or provider keys.

## Database

```bash
cp .env.example .env
npx prisma generate
npx prisma migrate dev
```

There is no `prisma/migrations` directory. `README.md` mentions `20261006_product_completion` as an incremental migration on top of an older schema. That SQL was not in the upload. A fresh database cannot be migrated until a migration is added.

`npm run db:seed` is `tsx prisma/seed.ts`. `npm run db:seed:demo` is `tsx prisma/seed-demo.ts`. Neither file exists.

## Environment variables

From `.env.example` only:

| Variable | Used by code that exists |
| --- | --- |
| `DATABASE_URL` | Prisma schema. No client wrapper yet. |
| `NEXT_PUBLIC_APP_URL` | `scripts/worker.mjs` (fallback `APP_URL`, then `http://127.0.0.1:3000`). |
| `ABRA_API_BASE_URL`, `ABRA_API_KEY`, `ABRA_WEBHOOK_SECRET` | `lib/ticketing/abra.ts` |
| `EMAIL_API_BASE_URL`, `EMAIL_API_KEY`, `EMAIL_FROM` | `lib/email/provider.ts` |
| `STORAGE_SIGNING_URL`, `STORAGE_API_KEY` | `lib/storage/provider.ts` |
| `PAYMENT_PROVIDER_NAME`, `PAYMENT_API_BASE_URL`, `PAYMENT_API_KEY`, `PAYMENT_WEBHOOK_SECRET` | `lib/payment/provider.ts` |
| `AI_API_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | `lib/ai/provider.ts` |
| `WORKER_SECRET` | `scripts/worker.mjs` only. The API it calls does not exist. |

`lib/rate-limit.ts` also reads `RATE_LIMIT_DRIVER`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN` if someone constructs `UpstashRateLimiter`. Those names are not in `.env.example`. `lib/monitoring.ts` reads `MONITORING_DRIVER` and `MONITORING_WEBHOOK_URL`, also absent from `.env.example`. Nothing calls either factory.

## Worker

`npm run worker` throws immediately when `WORKER_SECRET` is unset. With the secret set, it POSTs to `/api/internal/worker`. That route is not implemented, so the process exits non-zero.
