import type { DemoState } from "@/lib/demo/build";
import type { Actor, Role } from "@/lib/domain/rbac";
import { prisma } from "@/lib/prisma";
import { calculateEventHealth } from "@/lib/services/event-health";
import { getEventAccess } from "@/lib/services/event-access";
import { buildEventView } from "@/lib/server/view";

const iso = (value: Date | null | undefined) => (value ? value.toISOString() : null);

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function objectRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function configuration(value: unknown) {
  const row = objectRecord(value);
  return {
    currency: typeof row.currency === "string" ? row.currency : "ARS",
    onSaleDate: typeof row.onSaleDate === "string" ? row.onSaleDate : new Date(0).toISOString(),
    fallbackTicketPriceCents: typeof row.fallbackTicketPriceCents === "number" ? row.fallbackTicketPriceCents : 0,
  };
}

function checklist(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object").map((item) => {
    const row = item as { id?: string; label?: string; done?: boolean };
    return { id: String(row.id ?? ""), label: String(row.label ?? ""), done: Boolean(row.done) };
  });
}

export async function actorForDatabaseUser(userId: string): Promise<Actor | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  const [memberships, eventMembers, access] = await Promise.all([
    prisma.organizationMember.findMany({ where: { userId } }),
    prisma.eventMember.findMany({ where: { userId } }),
    prisma.entityAccess.findMany({ where: { userId } }),
  ]);
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    memberships: memberships.map((row) => ({ organizationId: row.organizationId, role: row.role as Role })),
    eventRoles: eventMembers.map((row) => ({ eventId: row.eventId, role: row.role as Role })),
    access: access.map((row) => ({ eventId: row.eventId, role: row.role as Role, entityType: row.entityType, entityId: row.entityId })),
  };
}

export async function snapshotEvent(eventId: string): Promise<DemoState | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      organization: true,
      publicPage: true,
      venue: { include: { spaces: true } },
      stages: true,
      tasks: true,
      deals: { include: { deliverables: true } },
      speakers: true,
      programSessions: { include: { speakers: true } },
      vendors: true,
      attendees: true,
      incidents: true,
      runOfShow: true,
      campaigns: true,
      expenses: true,
      revenues: true,
      categories: true,
      invoices: true,
      payments: true,
      ticketTypes: true,
      orders: { include: { tickets: true } },
      shifts: true,
      notifications: true,
      connectionRequests: true,
      meetings: true,
      polls: { include: { votes: true } },
      questions: true,
      surveys: true,
      surveyResponses: true,
      points: true,
      auditLogs: { orderBy: { createdAt: "desc" }, take: 30 },
      ticketing: { include: { logs: true } },
      members: { include: { user: true } },
    },
  });
  if (!event) return null;
  const [dependencies, comments, orgMembers] = await Promise.all([
    prisma.taskDependency.findMany({ where: { eventId } }),
    prisma.comment.findMany({ where: { eventId } }),
    prisma.organizationMember.findMany({ where: { organizationId: event.organizationId }, include: { user: true } }),
  ]);
  const users = new Map<string, { id: string; email: string; name: string; passwordHash: string; createdAt: string }>();
  for (const row of [...orgMembers, ...event.members]) {
    users.set(row.user.id, { id: row.user.id, email: row.user.email, name: row.user.name, passwordHash: "", createdAt: row.user.createdAt.toISOString() });
  }
  const tickets = event.orders.flatMap((order) => order.tickets.map((ticket) => ({
    id: ticket.id,
    eventId: ticket.eventId,
    orderId: ticket.orderId,
    attendeeId: ticket.attendeeId,
    typeId: ticket.typeId,
    status: ticket.status,
    code: ticket.code,
    checkedInAt: iso(ticket.checkedInAt),
  })));
  return {
    organizations: [{ id: event.organization.id, name: event.organization.name, slug: event.organization.slug, createdAt: event.organization.createdAt.toISOString() }],
    users: [...users.values()],
    memberships: orgMembers.map((row) => ({ id: row.id, organizationId: row.organizationId, userId: row.userId, role: row.role as Role })),
    eventMembers: event.members.map((row) => ({ id: row.id, eventId: row.eventId, userId: row.userId, role: row.role as Role })),
    access: [],
    sessions: [],
    attendeeSessions: [],
    invitations: [],
    events: [{
      id: event.id,
      organizationId: event.organizationId,
      name: event.name,
      slug: event.slug,
      description: event.description,
      startAt: iso(event.startAt),
      endAt: iso(event.endAt),
      timezone: event.timezone,
      city: event.city,
      country: event.country,
      status: event.status,
      capacity: event.capacity,
      objectiveAttendees: event.objectiveAttendees,
      budgetCents: event.budgetCents,
      healthScore: event.healthScore,
      branding: {
        accent: typeof objectRecord(event.branding).accent === "string" ? String(objectRecord(event.branding).accent) : "#6f2436",
        primary: typeof objectRecord(event.branding).primary === "string" ? String(objectRecord(event.branding).primary) : "#1c1412",
        logoText: typeof objectRecord(event.branding).logoText === "string" ? String(objectRecord(event.branding).logoText) : "",
      },
      configuration: configuration(event.configuration),
      objectives: stringList(event.objectives),
      metadata: objectRecord(event.metadata),
      abraCheckoutEvent: event.abraCheckoutEvent,
    }],
    publicPages: event.publicPage ? [event.publicPage] : [],
    venues: event.venue ? [{ id: event.venue.id, eventId: event.venue.eventId, name: event.venue.name, address: event.venue.address, notes: event.venue.notes }] : [],
    spaces: event.venue?.spaces ?? [],
    stages: event.stages,
    tasks: event.tasks.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      parentId: row.parentId,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      assigneeId: row.assigneeId,
      dueAt: iso(row.dueAt),
      checklist: checklist(row.checklist),
      approvalStatus: row.approvalStatus,
      createdAt: row.createdAt.toISOString(),
    })),
    dependencies,
    comments: comments.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    deals: event.deals.map((row) => ({ id: row.id, eventId: row.eventId, companyName: row.companyName, tier: row.tier, status: row.status, contactEmail: row.contactEmail, amountCents: row.amountCents, notes: row.notes })),
    deliverables: event.deals.flatMap((deal) => deal.deliverables.map((row) => ({ id: row.id, dealId: row.dealId, title: row.title, status: row.status, dueAt: iso(row.dueAt) }))),
    speakers: event.speakers,
    sessionsProgram: event.programSessions.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      title: row.title,
      description: row.description,
      startAt: iso(row.startAt),
      endAt: iso(row.endAt),
      type: row.type,
      status: row.status,
      stageId: row.stageId,
      roomId: row.roomId,
      speakerIds: row.speakers.map((speaker) => speaker.speakerId),
    })),
    vendors: event.vendors,
    attendees: event.attendees,
    ticketTypes: event.ticketTypes,
    orders: event.orders.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      attendeeId: row.attendeeId,
      externalId: row.externalId,
      status: row.status,
      totalCents: row.totalCents,
      buyerName: row.buyerName,
      buyerEmail: row.buyerEmail,
      createdAt: row.createdAt.toISOString(),
    })),
    tickets,
    incidents: event.incidents.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      title: row.title,
      description: row.description,
      status: row.status,
      severity: row.severity,
      zoneId: row.zoneId,
      assigneeId: row.assigneeId,
      createdAt: row.createdAt.toISOString(),
      resolvedAt: iso(row.resolvedAt),
    })),
    runOfShow: event.runOfShow.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      title: row.title,
      startAt: iso(row.startAt),
      endAt: iso(row.endAt),
      area: row.area,
      location: row.location,
      stageId: row.stageId,
      ownerId: row.ownerId,
      status: row.status,
      critical: row.critical,
      notes: row.notes,
      dependsOnTaskId: row.dependsOnTaskId,
    })),
    campaigns: event.campaigns,
    expenses: event.expenses.map((row) => ({ ...row, incurredAt: row.incurredAt.toISOString() })),
    revenues: event.revenues.map((row) => ({ ...row, receivedAt: row.receivedAt.toISOString() })),
    categories: event.categories,
    invoices: event.invoices.map((row) => ({ ...row, dueAt: row.dueAt.toISOString() })),
    payments: event.payments.map((row) => ({ ...row, paidAt: iso(row.paidAt) })),
    shifts: event.shifts.map((row) => ({ ...row, startAt: row.startAt.toISOString(), endAt: row.endAt.toISOString() })),
    notifications: event.notifications.map((row) => ({ ...row, readAt: iso(row.readAt), createdAt: row.createdAt.toISOString() })),
    connections: event.connectionRequests.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    meetings: event.meetings.map((row) => ({ ...row, startAt: row.startAt.toISOString(), endAt: row.endAt.toISOString() })),
    polls: event.polls.map((row) => ({ id: row.id, eventId: row.eventId, sessionId: row.sessionId, question: row.question, options: row.options, status: row.status })),
    pollVotes: event.polls.flatMap((poll) => poll.votes),
    questions: event.questions.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    surveys: event.surveys,
    surveyResponses: event.surveyResponses,
    points: event.points.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    audits: event.auditLogs.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      actorId: row.actorId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      metadata: objectRecord(row.metadata),
      createdAt: row.createdAt.toISOString(),
    })),
    ticketing: event.ticketing ? [{
      id: event.ticketing.id,
      eventId: event.ticketing.eventId,
      provider: event.ticketing.provider,
      status: event.ticketing.status,
      externalEventId: event.ticketing.externalEventId,
      lastSyncAt: iso(event.ticketing.lastSyncAt),
      lastError: event.ticketing.lastError,
    }] : [],
    syncLogs: (event.ticketing?.logs ?? []).map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    webhooks: [],
    jobs: [],
    emails: [],
    loginFailures: [],
  } as unknown as DemoState;
}

export async function databaseView(actor: Actor, eventId: string) {
  const exists = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!exists) return { status: 404 as const, message: "Evento no encontrado" };
  const access = await getEventAccess(eventId, actor.userId);
  if (!access) return { status: 403 as const, message: "No tenés acceso a este evento." };
  const state = await snapshotEvent(eventId);
  const built = state ? buildEventView(state, actor, eventId) : null;
  if (!state || !built || built.forbidden) return { status: 403 as const, message: "No tenés acceso a este evento." };
  const official = await calculateEventHealth(eventId);
  const view = {
    ...built,
    official,
    brainContext: { ...built.brainContext, healthScore: official, riskScore: Math.max(0, Math.min(100, 100 - official)) },
  };
  return { status: 200 as const, access, view, state };
}
