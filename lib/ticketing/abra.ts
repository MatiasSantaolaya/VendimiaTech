import crypto from "node:crypto";
import type {
  ExternalAttendee,
  ExternalOrder,
  ExternalTicket,
  ExternalTicketingEvent,
  TicketingProvider,
  TicketingWebhookEvent,
} from "./types";

/**
 * Abra adapter contract. Endpoint paths intentionally remain configurable:
 * PlanE must not hard-code undocumented Abra API routes.
 */
export class AbraTicketsProvider implements TicketingProvider {
  readonly name = "abra_tickets";
  private readonly baseUrl = process.env.ABRA_API_BASE_URL?.replace(/\/$/, "") ?? "";
  private readonly apiKey = process.env.ABRA_API_KEY ?? "";
  private readonly webhookSecret = process.env.ABRA_WEBHOOK_SECRET ?? "";

  private async request<T>(path: string): Promise<T> {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error("Abra Tickets integration is not configured (ABRA_API_BASE_URL / ABRA_API_KEY).");
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Abra API error ${response.status}`);
    return response.json() as Promise<T>;
  }

  verifyWebhook(rawBody: string, signature: string | null): boolean {
    if (!this.webhookSecret || !signature) return false;
    const digest = crypto.createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
    const a = Buffer.from(digest);
    const b = Buffer.from(signature.replace(/^sha256=/, ""));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  parseWebhook(rawBody: string): TicketingWebhookEvent {
    const payload = JSON.parse(rawBody) as TicketingWebhookEvent;
    if (!payload?.id || !payload?.type || !payload?.data) throw new Error("Invalid Abra webhook payload");
    return payload;
  }

  syncEvent(id: string) { return this.request<ExternalTicketingEvent>(`/events/${encodeURIComponent(id)}`); }
  syncTickets(id: string) { return this.request<ExternalTicket[]>(`/events/${encodeURIComponent(id)}/tickets`); }
  syncAttendees(id: string) { return this.request<ExternalAttendee[]>(`/events/${encodeURIComponent(id)}/attendees`); }
  syncOrders(id: string) { return this.request<ExternalOrder[]>(`/events/${encodeURIComponent(id)}/orders`); }
}

export const abraTickets = new AbraTicketsProvider();
