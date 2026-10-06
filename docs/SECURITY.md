# Security

This describes controls that exist as code, and the holes where no request handler is mounted.

## Present in code

- `next.config.ts` sets `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and a Content-Security-Policy. `script-src` allows `'self'`, `'unsafe-inline'`, and `https://sdk.abratickets.com` because `PublicEventPage.tsx` loads that script. `'unsafe-inline'` is there so the App Router can hydrate; it is a real weakness.
- `lib/payment/provider.ts` and `lib/ticketing/abra.ts` verify HMAC-SHA256 hex digests (`sha256=` prefix stripped) with `timingSafeEqual` and reject when the secret or signature is missing.
- `lib/ticketing/mock.ts` can verify a mock HMAC with the constant `demo-abra-webhook-secret`. No route calls it.
- `lib/services/attendee-auth.ts` sets `plane_attendee_session` as `HttpOnly`, `SameSite=Lax`, and `Secure` when `NODE_ENV===production`. The raw token is stored only as SHA-256. The module cannot run until `lib/prisma` exists.
- `lib/domain/password.ts` hashes with scrypt. Nothing calls it.
- `lib/domain/rbac.ts` and `lib/services/event-access.ts` authorize by membership role, not by email. `canReadSponsor` in the domain helper returns false when the actor’s email equals `contactEmail` but there is no `EntityAccess` row. No API uses that helper yet.
- `scripts/worker.mjs` sends `WORKER_SECRET` in `x-plane-worker-secret`. There is no server check because the route is missing.
- `lib/rate-limit.ts` implements an in-memory limiter and an Upstash REST limiter. Nothing calls `createRateLimiter()`.

## Not present

- No login, logout, session cookie for organizers, CSRF token, invitation accept route, or brute-force counter wired to a request.
- No server authorization on `/api/events/:id/modules`. `QuickCreate.tsx` posts JSON with no CSRF header. The endpoint does not exist, so this is not exploitable yet and is also not protected.
- No tenant guard in front of a handler. Cross-organization denial is not testable.
- No audit write on a user action. `audit()` only inserts a row when called.
- Webhook routes are not mounted, so the signature helpers are unused.
- Secrets are read from `process.env` in the adapters. `.env` is gitignored. `.env.example` has empty values. No secret scanning has been run.
- `public/sw.js` caches same-origin GET responses, including HTML, and falls back to `/`. That can replay a stale authenticated page. Playwright is configured with `serviceWorkers: "block"`, but there is no E2E suite yet.

## Cookies that the uploaded attendee module sets

| Cookie | HttpOnly | Secure | SameSite |
| --- | --- | --- | --- |
| `plane_attendee_session` | yes | production only | Lax |

Organizer session cookies are not implemented.
