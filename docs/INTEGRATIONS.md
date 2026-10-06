# Integrations

Adapters are libraries. No screen or route calls them yet.

## Abra Tickets

`components/PublicEventPage.tsx` embeds checkout without API credentials when `checkoutEvent` is passed:

- Script: `https://sdk.abratickets.com/v2/checkout.js`
- Element: `<abra-checkout event={checkoutEvent} theme="light">`

That identifier is an argument. No page passes one, because the public route is not mounted.

`lib/ticketing/abra.ts` is the sync adapter. It does not run unless `ABRA_API_BASE_URL` and `ABRA_API_KEY` are set. Webhooks verify only when `ABRA_WEBHOOK_SECRET` is set. The signature is HMAC-SHA256 of the raw body, hex, optional `sha256=` prefix.

Relative paths compiled into the adapter (joined onto `ABRA_API_BASE_URL`, not a hard-coded host):

- `GET /events/:id`
- `GET /events/:id/tickets`
- `GET /events/:id/attendees`
- `GET /events/:id/orders`

The file comment says paths should stay configurable. The methods still concatenate those four paths. Treat them as the current client, not as a published Abra contract. If Abra’s real paths differ, this adapter will 404 until it is changed to match their documentation.

Webhook JSON expected by `parseWebhook`: `{ id, type, data }`.

`lib/ticketing/mock.ts` implements the same `TicketingProvider` interface with caller-supplied arrays and `verifyMockSignature`. Default mock secret: `demo-abra-webhook-secret`. It is not selected anywhere.

### What Abra still has to provide

1. Confirmation of the four relative paths, or the real paths to replace them.
2. Webhook signing algorithm and header name. This repo assumes hex HMAC-SHA256 of the raw body.
3. Webhook event types and the `data` shape for orders, tickets, and check-ins.
4. The public checkout attribute (`event`) value for Vendimia Tech, so the existing `<abra-checkout>` tag can be given a real id.
5. Organizer `ABRA_API_BASE_URL`, `ABRA_API_KEY`, and `ABRA_WEBHOOK_SECRET`.

Until that exists, do not point the adapter at a guessed host.

## Email

`lib/email/provider.ts`: if `EMAIL_API_BASE_URL` is unset, `ConsoleEmailProvider` returns a fake id and logs outside production. If set, `POST {base}/send` with `Authorization: Bearer EMAIL_API_KEY` and `EMAIL_FROM` as the default from-address (`PlanE <noreply@plane.events>`).

## Storage

`lib/storage/provider.ts`: `POST STORAGE_SIGNING_URL` with `STORAGE_API_KEY`. Throws `STORAGE_PROVIDER_NOT_CONFIGURED` when either is missing. There is no local disk adapter.

## Payments

`lib/payment/provider.ts`: `POST {PAYMENT_API_BASE_URL}/checkout`. Throws `PAYMENT_PROVIDER_NOT_CONFIGURED` without URL and key. `verifyWebhook` uses `PAYMENT_WEBHOOK_SECRET`. There is no local payment adapter. Ticket sales stay on Abra; this adapter is for non-ticket payments only.

## AI

`lib/ai/provider.ts`: `POST {AI_API_BASE_URL}/chat/completions` with `AI_MODEL` (default `event-copilot`). Throws `AI_PROVIDER_NOT_CONFIGURED` without URL and key. `lib/domain/brain.ts` can answer from a `BrainContext` object and refuses to apply complete/resolve wording without a proposal. Nothing connects the two, and nothing fills `BrainContext` from the database.

## Rate limit and monitoring

Implemented and uncalled. See `docs/DEPLOYMENT.md` for the extra env names, which are not in `.env.example`.
