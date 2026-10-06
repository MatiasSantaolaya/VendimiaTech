# Integrations

PlanE does not sell tickets itself. Real ticketing is Abra, behind `TicketingProvider`. The demo uses `MockAbraTicketsProvider`. The public page embeds the uploaded checkout snippet and does not call the Abra API.

## What the uploaded Abra adapter already calls

`lib/ticketing/abra.ts` was not given new routes. If `ABRA_API_BASE_URL` or `ABRA_API_KEY` is missing, every sync throws:

`Abra Tickets integration is not configured (ABRA_API_BASE_URL / ABRA_API_KEY).`

When both are set, it sends `Authorization: Bearer <ABRA_API_KEY>` and `Accept: application/json` to these relative paths. They are hardcoded even though the file comment says paths should stay configurable. They are not verified against Abra's documentation:

- `GET {ABRA_API_BASE_URL}/events/:id`
- `GET {ABRA_API_BASE_URL}/events/:id/tickets`
- `GET {ABRA_API_BASE_URL}/events/:id/attendees`
- `GET {ABRA_API_BASE_URL}/events/:id/orders`

Webhook verification: HMAC-SHA256 of the raw body, hex digest, optional `sha256=` prefix, header `x-signature` or `x-abra-signature`, secret `ABRA_WEBHOOK_SECRET`. Empty secret returns false. `parseWebhook` expects JSON `{ id, type, data }`.

`POST /api/events/:id/ticketing/probe` calls `syncEvent("unconfigured")` and surfaces that error as HTTP 409. Playwright checked that the UI shows a message matching `/Abra|configur/i`.

## What Abra still has to provide

Before a production sync can be trusted, Abra (or the organizer's contract with Abra) needs to confirm:

1. The real base URL and whether the four paths above exist. If they differ, `abra.ts` has to change to those documented paths. Do not guess replacements.
2. Auth scheme. The adapter assumes a bearer API key.
3. Webhook signing algorithm, header name, and the payload fields `id`, `type`, and `data`.
4. Identifiers that map an Abra event to `Event.abraCheckoutEvent` (the public embed attribute) and to `TicketingConnection.externalEventId`.
5. Ticket, order, attendee, and check-in status enums so reconciliation can do more than string-compare codes.
6. A sandbox key. None is in this repo.

The public embed, already in `components/PublicEventPage.tsx`, is separate from that API:

- script `https://sdk.abratickets.com/v2/checkout.js`
- element `<abra-checkout event="{abraCheckoutEvent}" theme="light">`

The demo attribute is the string `vendimia-tech-2027`. Whether that slug exists in Abra was not checked.

## Mock provider

`lib/ticketing/mock.ts` signs webhooks with `demo-abra-webhook-secret`. Sync from the UI marks the fixture connection `CONNECTED`, clears `lastError`, and logs that remote code `ABRA-EXTRA-1` is missing locally. The seed starts that connection in `ERROR` with message `Timeout talking to mock provider`.

## Other adapters

| Adapter | Real call | When unset |
| --- | --- | --- |
| Email | `POST {EMAIL_API_BASE_URL}/send` | Console provider |
| Storage | `POST {STORAGE_SIGNING_URL}` | Throws; no local disk adapter |
| Payments | `POST {PAYMENT_API_BASE_URL}/checkout`, HMAC via `PAYMENT_WEBHOOK_SECRET` | Unused by demo finance |
| AI | `POST {AI_API_BASE_URL}/chat/completions` with `AI_MODEL` or `event-copilot` | Event Brain uses `lib/domain/brain.ts` on demo numbers. No API key required. Mutations wait for confirm. |
| Worker | `POST {APP_URL or NEXT_PUBLIC_APP_URL}/api/internal/worker` | Script throws if `WORKER_SECRET` is missing |
| Rate limit | Upstash REST pipeline | Memory limiter |
| Monitoring | `POST {MONITORING_WEBHOOK_URL}` when `MONITORING_DRIVER=webhook` | `console.error` on errors |

No provider credentials were created or tested against a live vendor.
