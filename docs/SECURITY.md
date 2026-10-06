# Security

## Sessions

Organizer sessions use cookie `plane_session` (HttpOnly, SameSite=Lax, 14 days). The CSRF token is `plane_csrf` and is readable by the page so the client can send `x-csrf-token`. `plane_demo` marks a demo session. Cookies are `Secure` only when `NODE_ENV=production` and the request is HTTPS, so local HTTP tests can log in.

Attendee magic links are a separate cookie, `plane_attendee_session`, implemented in the uploaded `lib/services/attendee-auth.ts`. The demo page does not call that helper. The demo attendee persona is a normal user session (`usr_ines`) plus `EntityAccess` for `att_ines`.

Passwords in the demo store are scrypt hashes (`lib/domain/password.ts`), not plaintext.

## CSRF and origin

Mutations require a same-origin `Origin` that matches the `Host` header (or `x-forwarded-host`). CSRF is required except:

- `POST /api/auth/login`
- `POST /api/auth/invitations/accept`
- `POST /api/events/:id/modules` (the uploaded `QuickCreate` client does not send a CSRF header; the origin check still applies)
- `POST /api/ticketing/webhook` (HMAC signature)
- `POST /api/internal/worker` (`x-plane-worker-secret` must equal `WORKER_SECRET`)

## Brute force and rate limit

Login records failures per `email|ip`. Five failures in 15 minutes return 429. The API allows 180 requests per minute per IP on the memory limiter. The Upstash adapter is unused unless `RATE_LIMIT_DRIVER=upstash` and both Upstash variables are set. The memory limiter is per process and resets on cold start.

## Tenancy

`requireEvent` returns 404 when the event id is unknown and 403 when the actor has no membership on that event's organization or event. A Vendimia user requesting `evt_bodega` gets 403. Authorization uses membership and `EntityAccess`, not the email address. `rio@sponsors.demo` is both a sponsor contact and the login of `usr_snoop`, who has no sponsor entity access.

## Headers

`next.config.ts` sends `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and a Content-Security-Policy that allows `https://sdk.abratickets.com` for the uploaded checkout script. Development adds `'unsafe-eval'` because the Next.js dev client needs it. Production CSP does not include `unsafe-eval`.

## What is not production-hardened yet

- Demo mode (`/demo` or `plane_demo=1`) shares one in-memory graph per process. A database session does not.
- Login sets `plane_demo=1` only when `DATABASE_URL` is unset. A database login clears that cookie.
- There is no storage adapter that writes to disk, and uploaded files are not implemented in the UI.
- Webhook signature comparison uses `timingSafeEqual` after a length check. Abra verification returns false when `ABRA_WEBHOOK_SECRET` is empty.
- Service worker caches GET responses, including HTML. That can serve a stale demo page after a deploy. Playwright blocks service workers; a browser does not.
