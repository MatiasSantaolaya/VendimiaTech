# API

All routes are handled by `app/api/[[...path]]/route.ts`. Responses are JSON unless noted. Errors look like `{ "error": { "code": "...", "message": "..." } }`.

Demo requests (no `DATABASE_URL`, or cookie `plane_demo=1`) read and write the in-memory store. Any other request uses Prisma. `POST /api/auth/login` with `DATABASE_URL` set does not set `plane_demo`. `POST /api/auth/attendee` calls `signInWithMagicToken` on that database path.

## Public

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/health` | `{ ok, service: "plane", mode, demoReady: true }`. `mode` is `database-or-demo` when `DATABASE_URL` is set, otherwise `demo`. The mode string does not switch the data source. |
| POST | `/api/auth/login` | Body `{ email, password }`. Sets session, CSRF, and `plane_demo=1`. 401 on bad credentials, 429 after 5 failures. |
| POST | `/api/auth/logout` | Revokes the session cookie. |
| GET | `/api/auth/session` | Current user or 401. |
| POST | `/api/auth/invitations/accept` | Body `{ token, name, password }`. Demo token: `demo-invite-token`. |
| POST | `/api/ticketing/webhook` | `x-ticketing-provider: mock` uses the mock HMAC secret `demo-abra-webhook-secret`. Any other provider uses `AbraTicketsProvider.verifyWebhook`. Signature header: `x-signature` or `x-abra-signature`. |
| POST | `/api/internal/worker` | Header `x-plane-worker-secret`. Drains in-memory EMAIL jobs into the email outbox. 401 without `WORKER_SECRET`. |

`GET /demo` is a page route, not under `/api`. It sets the same cookies and redirects to the command center.

## Authenticated event routes

Prefix: `/api/events/:eventId`. Cross-tenant and missing membership return 403 with code `TENANT_FORBIDDEN`. Unknown id returns 404.

| Method | Path | Who |
| --- | --- | --- |
| GET | `/api/events/:eventId` | Any member. Returns id, name, slug, organizationId. |
| GET | `/api/events/:eventId/finance` | Roles allowed to read finance. |
| POST | `/api/events/:eventId/modules` | Body `{ resource, ...fields }`. Resources match `QuickCreate`: task, expense, revenue, sponsor, speaker, vendor, session, campaign, incident, ros. |
| PATCH | `/api/events/:eventId/tasks/:taskId` | Operate roles. Body `{ status?, priority?, approvalStatus? }`. |
| POST | `/api/events/:eventId/tasks/bulk` | Body `{ ids, status }`. |
| PATCH | `/api/events/:eventId/incidents/:incidentId` | Operate roles. Body `{ status }`. Resolving uses the lowercase status `resolved` so the health query for `open` drops it. |
| POST | `/api/events/:eventId/brain` | Manage or operate. Body `{ question }`. Does not mutate. Imperative answers include `requiresConfirmation`. |
| POST | `/api/events/:eventId/brain/confirm` | Operate. Body `{ type, taskId?, incidentId?, confirm: true }`. |
| POST | `/api/events/:eventId/ticketing/sync` | Manage. Marks the mock connection `CONNECTED` and writes a sync log that mentions remote code `ABRA-EXTRA-1`. |
| POST | `/api/events/:eventId/ticketing/probe` | Calls `abraTickets.syncEvent`. Without Abra env this returns 409. |
| GET | `/api/events/:eventId/export?kind=tasks\|finance` | Manage. `text/csv`. |
| GET | `/api/events/:eventId/report` | Manage. `text/plain` summary. |
| POST | `/api/events/:eventId/check-in` | Operate. Body `{ code }`. |
| POST | `/api/events/:eventId/networking` | Attendee entity access. Body `{ toAttendeeId }`. |
| POST | `/api/events/:eventId/polls/:pollId/vote` | Attendee entity access. Body `{ optionIndex }`. |

## Demo only

| Method | Path | Behavior |
| --- | --- | --- |
| POST | `/api/demo/view-as` | Requires cookie `plane_demo=1`. Body `{ userId }` limited to the six personas. Replaces the session cookie. |

## Pages

| Path | Notes |
| --- | --- |
| `/` | Links to `/demo` and `/login`. |
| `/login` | Spanish form. Demo hint shows the password. |
| `/demo` | Zero-config organizer session. |
| `/events/[slug]` | Public page. Agenda speaker names come from the demo speakers, not from ids. |
| `/events/[slug]/[module]` | Authenticated module. Missing session renders "Necesitás sesión". |
| `/attendee/[eventId]` | Attendee link target from the public page. |
| `/invite/[token]` | Accept-invite form. |
