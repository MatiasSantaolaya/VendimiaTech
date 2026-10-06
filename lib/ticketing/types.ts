export type ExternalTicketingEvent = {
  id: string;
  name: string;
  slug?: string;
  startsAt?: string;
  endsAt?: string;
};

export type ExternalTicket = {
  id: string;
  eventId: string;
  name: string;
  priceCents?: bigint;
  currency?: string;
  capacity?: number;
  sold?: number;
  status?: string;
};

export type ExternalAttendee = {
  id: string;
  eventId: string;
  name: string;
  email?: string;
  ticketId?: string;
  status?: string;
  checkedInAt?: string;
};

export type ExternalOrder = {
  id: string;
  eventId: string;
  buyerName: string;
  buyerEmail: string;
  totalCents: bigint;
  currency: string;
  status: string;
  createdAt?: string;
};

export type TicketingWebhookEvent = {
  id: string;
  type: string;
  occurredAt?: string;
  data: Record<string, unknown>;
};

export interface TicketingProvider {
  readonly name: string;
  verifyWebhook(rawBody: string, signature: string | null): boolean;
  parseWebhook(rawBody: string): TicketingWebhookEvent;
  syncEvent(externalEventId: string): Promise<ExternalTicketingEvent>;
  syncTickets(externalEventId: string): Promise<ExternalTicket[]>;
  syncAttendees(externalEventId: string): Promise<ExternalAttendee[]>;
  syncOrders(externalEventId: string): Promise<ExternalOrder[]>;
}
