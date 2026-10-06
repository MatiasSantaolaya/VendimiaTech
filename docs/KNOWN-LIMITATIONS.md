# Known limitations

Honest list for this checkout. Items here are missing or unverified, not “almost done”.

## Application

- No `app/` routes, layouts, or API handlers.
- `lib/prisma.ts` and `lib/auth.ts` are imported by uploaded services and do not exist. Typecheck cannot pass.
- `npm install` has not been run here. Prisma Client is not generated.
- No unit tests, API tests, or Playwright tests. `npm test` and `npm run e2e` have not been run.
- `npm run build` has not been run. It cannot succeed without an App Router tree.
- No organizer login, sessions, invitations, CSRF, or brute-force protection.
- Command center, planning, finance, portals, attendee experience, analytics, and AI screens are not pages. `ModuleShell` only lists links.
- Event health, graph, finance, matchmaking, and forecast functions are not connected to data or UI.
- `calculateEventHealth` in `lib/services/event-health.ts` is the only health implementation that talks to Prisma, and it cannot run.
- Notifications, jobs, and the worker endpoint are not implemented. `scripts/worker.mjs` will fail closed without `WORKER_SECRET`, and fail the HTTP call even with it.
- `prisma/seed.ts` and `prisma/seed-demo.ts` are named in `package.json` and are missing.
- No SQL migration. The README name `20261006_product_completion` is not in the repo.

## Abra

- Sync paths inside `lib/ticketing/abra.ts` are unverified against Abra documentation.
- Webhook header name is not specified by Abra in this repo. The verifier only compares an HMAC to the string it is given.
- Checkout embed URL is the one in `PublicEventPage.tsx` (`https://sdk.abratickets.com/v2/checkout.js`). It has not been loaded in a browser from this environment.

## Security and runtime

- CSP allows `'unsafe-inline'` scripts.
- `public/sw.js` caches every same-origin GET and can serve stale HTML.
- Demo state cannot be process-local yet because there is no demo store. Serverless persistence is therefore unsolved, not solved.
- `Dockerfile` installs with `--omit=dev` while `typescript` and `prisma` are devDependencies. Docker build has not been verified.
- Rate-limit and monitoring env vars are not in `.env.example`.

## Product data

- No Vendimia Tech records.
- Official landing copy could not be read (GitHub 404). Do not treat fixture copy as brand fact.
- Incident and run-of-show status strings expected by the health query are lowercase (`open`, `done`). Task statuses are uppercase. A UI that writes `OPEN` will not move the health score.

## P2

Gamification, polls, surveys, and matchmaking have schema fields and/or pure functions only. There is no attendee product.
