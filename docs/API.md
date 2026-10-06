# API

No file under `app/api` exists. The handlers below are what current clients already call. They return connection errors, not JSON.

## Called by code in the repo, not implemented

### `POST /api/internal/worker`

`scripts/worker.mjs`

- Header: `x-plane-worker-secret: $WORKER_SECRET`
- Body: empty
- Success: process prints the response text and exits 0
- Failure: prints the body and exits 1
- If `WORKER_SECRET` is unset, the script throws before the request

### `POST /api/events/:eventId/modules`

`components/QuickCreate.tsx`

```json
{ "resource": "task|expense|revenue|sponsor|speaker|vendor|session|campaign|incident|ros", "...fields": "..." }
```

Field names by resource:

| resource | fields |
| --- | --- |
| task | `title` |
| expense | `description`, `amount` (ARS, not cents) |
| revenue | `type`, `description`, `amount` |
| sponsor | `companyName`, `amount` |
| speaker | `personName`, `email`, `company` |
| vendor | `name`, `category`, `amount` |
| session | `title`, `startAt` (ISO) |
| campaign | `name`, `channel`, `budget` |
| incident | `title`, `severity` |
| ros | `title`, `startAt`, `area`, `location` |

The client reloads the page on HTTP 200. It does not send a CSRF header.

## Provider HTTP, outbound only

These are clients, not PlanE routes.

| Adapter | Request |
| --- | --- |
| `lib/ai/provider.ts` | `POST {AI_API_BASE_URL}/chat/completions` |
| `lib/email/provider.ts` | `POST {EMAIL_API_BASE_URL}/send` when the base URL is set; otherwise logs in non-production |
| `lib/payment/provider.ts` | `POST {PAYMENT_API_BASE_URL}/checkout` |
| `lib/storage/provider.ts` | `POST STORAGE_SIGNING_URL` |
| `lib/ticketing/abra.ts` | `GET {ABRA_API_BASE_URL}/events/:id`, `/tickets`, `/attendees`, `/orders` |

Abra calls throw `Abra Tickets integration is not configured` when the base URL or API key is empty. Relative paths are fixed in that file. See `docs/INTEGRATIONS.md`.

## Not implemented, and not called by current UI

Auth, health, finance, graph, brain, exports, webhooks, check-in, networking, invitations, and demo view-as. Do not document them as available.
