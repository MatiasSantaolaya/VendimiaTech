# Production checklist

Nothing below is done. Do not check an item without a command log or a deployed URL.

## Blockers before any production traffic

- [ ] Add `app/` routes, `lib/prisma.ts`, and `lib/auth.ts` so the uploaded services compile.
- [ ] Generate Prisma Client and add a migration that creates the schema on empty Postgres 17.
- [ ] Add `prisma/seed.ts` (production, no demo fixture) and keep demo data out of it.
- [ ] Set `DATABASE_URL` to managed Postgres. The compose password `postgres` is local only.
- [ ] Confirm `next build` on Vercel (`buildCommand` is `next build`).
- [ ] Run `docker build` and fix the `--omit=dev` gap if TypeScript or Prisma CLI is missing in the builder.
- [ ] Put `WORKER_SECRET` in the host and confirm `POST /api/internal/worker` rejects a bad secret.
- [ ] Do not set Abra variables until `docs/INTEGRATIONS.md` matches Abra’s real contract.
- [ ] Set `EMAIL_API_BASE_URL` and `EMAIL_API_KEY` or accept console-only mail.
- [ ] Set `STORAGE_SIGNING_URL` and `STORAGE_API_KEY` before any upload.
- [ ] Set payment variables only for non-ticket charges. Ticket checkout stays on Abra.
- [ ] Set `AI_API_BASE_URL` and `AI_API_KEY` only if the HTTP copilot should replace a local rules path.
- [ ] Serve the site on HTTPS so the attendee cookie `Secure` flag sticks.
- [ ] Replace or narrow the service worker so it does not cache authenticated HTML.
- [ ] Revisit CSP `'unsafe-inline'`.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` and keep the logs.
- [ ] Run Playwright against a real server.
- [ ] Prove organization A cannot read organization B.
- [ ] Do not run `vercel --prod` until the items above are true.

## Explicitly out of scope until Abra publishes a contract

- [ ] Live ticket sync, webhook acceptance, and reconciliation against production Abra.
