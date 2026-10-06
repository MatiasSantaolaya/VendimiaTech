import { createHmac, timingSafeEqual } from "node:crypto";
import type { ExternalAttendee, ExternalOrder, ExternalTicket, ExternalTicketingEvent, TicketingProvider, TicketingWebhookEvent } from "./types";

export const MOCK_WEBHOOK_SECRET = "demo-abra-webhook-secret";

export function verifyMockSignature(rawBody: string, signature: string | null, secret = MOCK_WEBHOOK_SECRET) {
  if (!signature) return false;
  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  const actual = signature.replace(/^sha256=/, "");
  const a = Buffer.from(digest);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}

export class MockAbraTicketsProvider implements TicketingProvider {
  readonly name = "mock_abra";
  constructor(private readonly snapshot: { event: ExternalTicketingEvent; tickets: ExternalTicket[]; attendees: ExternalAttendee[]; orders: ExternalOrder[] }) {}
  verifyWebhook(rawBody: string, signature: string | null) {
    return verifyMockSignature(rawBody, signature);
  }
  parseWebhook(rawBody: string): TicketingWebhookEvent {
    const payload = JSON.parse(rawBody) as TicketingWebhookEvent;
    if (!payload?.id || !payload?.type || !payload?.data) throw new Error("Invalid mock webhook payload");
    return payload;
  }
  async syncEvent() { return this.snapshot.event; }
  async syncTickets() { return this.snapshot.tickets; }
  async syncAttendees() { return this.snapshot.attendees; }
  async syncOrders() { return this.snapshot.orders; }
}

export function reconcileCodes(local: { code: string; status: string }[], remote: { code: string; status: string }[]) {
  const missingLocal = remote.filter((row) => !local.some((item) => item.code === row.code)).map((row) => row.code);
  const missingRemote = local.filter((row) => !remote.some((item) => item.code === row.code)).map((row) => row.code);
  const statusMismatch = local.filter((row) => {
    const other = remote.find((item) => item.code === row.code);
    return other && other.status !== row.status;
  }).map((row) => row.code);
  return { missingLocal, missingRemote, statusMismatch };
}
