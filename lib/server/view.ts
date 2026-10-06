import { findTimeConflicts } from "@/lib/domain/conflicts";
import { computeFinance } from "@/lib/domain/finance";
import { forecast } from "@/lib/domain/forecast";
import { analyzeDependencies, buildGraph } from "@/lib/domain/graph";
import { areaScores, officialHealthScore, weightedHealth, type HealthAreaKey } from "@/lib/domain/health";
import { MATCH_RULES, matchScore } from "@/lib/domain/matchmaking";
import { canManageRole, canOperateRole, canReadSpeaker, canReadSponsor, canReadVendor, roleForEvent, type Actor } from "@/lib/domain/rbac";
import type { DemoState } from "@/lib/demo/build";
import { reconcileCodes } from "@/lib/ticketing/mock";

const AREA_LABEL: Record<HealthAreaKey, string> = {
  planning: "Planificación",
  operations: "Operaciones",
  finance: "Finanzas",
  commercial: "Comercial",
  audience: "Audiencia",
  content: "Contenido",
  ticketing: "Ticketing",
  incidents: "Incidentes",
};

export function buildEventView(state: DemoState, actor: Actor, eventId: string) {
  const event = state.events.find((row) => row.id === eventId);
  if (!event) return null;
  const role = roleForEvent(actor, event);
  if (!role) return { forbidden: true as const, event };
  const manage = canManageRole(role);
  const operate = canOperateRole(role);
  const tasks = state.tasks.filter((row) => row.eventId === eventId);
  const deps = state.dependencies.filter((row) => row.eventId === eventId);
  const deals = state.deals.filter((row) => row.eventId === eventId).filter((row) => canReadSponsor(actor, event, row));
  const dealIds = new Set(deals.map((row) => row.id));
  const deliverables = state.deliverables.filter((row) => dealIds.has(row.dealId));
  const speakers = state.speakers.filter((row) => row.eventId === eventId).filter((row) => manage || canReadSpeaker(actor, event, row.id) || role === "ATTENDEE" || role === "STAFF");
  const sessions = state.sessionsProgram.filter((row) => row.eventId === eventId);
  const vendors = state.vendors.filter((row) => row.eventId === eventId).filter((row) => manage || operate || canReadVendor(actor, event, row.id));
  const attendees = state.attendees.filter((row) => row.eventId === eventId);
  const visibleAttendees = manage || operate ? attendees : attendees.filter((row) => actor.access.some((item) => item.entityId === row.id) || role === "ATTENDEE");
  const tickets = state.tickets.filter((row) => row.eventId === eventId);
  const incidents = state.incidents.filter((row) => row.eventId === eventId);
  const runOfShow = state.runOfShow.filter((row) => row.eventId === eventId);
  const expenses = state.expenses.filter((row) => row.eventId === eventId);
  const revenues = state.revenues.filter((row) => row.eventId === eventId);
  const finance = manage ? computeFinance({
    budgetCents: event.budgetCents,
    revenues: revenues.map((row) => ({ source: row.type === "TICKET" || row.type === "SPONSOR" ? row.type : "OTHER", amountCents: row.amountCents })),
    expenses: expenses.map((row) => ({ amountCents: row.amountCents, status: row.status, direct: row.direct })),
  }) : null;
  const now = new Date();
  const openTasks = tasks.filter((row) => row.status !== "DONE" && row.status !== "CANCELLED");
  const done = tasks.filter((row) => row.status === "DONE").length;
  const overdue = openTasks.filter((row) => row.dueAt && new Date(row.dueAt) < now);
  const blockedTasks = openTasks.filter((row) => row.status === "BLOCKED");
  const openIncidents = incidents.filter((row) => row.status !== "resolved" && row.status !== "closed");
  const criticalIncidents = openIncidents.filter((row) => row.severity === "critical");
  const conflicts = findTimeConflicts(runOfShow);
  const pendingDeliverables = deliverables.filter((row) => row.status !== "done");
  const overdueDeliverables = pendingDeliverables.filter((row) => row.dueAt && new Date(row.dueAt) < now);
  const criticalRos = runOfShow.filter((row) => row.critical && row.status !== "done");
  const syncErrors = state.syncLogs.filter((row) => row.eventId === eventId && row.status === "ERROR").length;
  const sold = tickets.filter((row) => row.status === "ISSUED" || row.status === "CHECKED_IN").length;
  const sessionsWithoutSpeaker = sessions.filter((row) => row.status !== "CANCELLED" && row.speakerIds.length === 0).length;
  const speakersPending = speakers.filter((row) => row.status === "INVITED").length;
  const negotiating = deals.filter((row) => row.status === "NEGOTIATING" || row.status === "PROSPECT").length;
  const official = officialHealthScore({
    tasks: tasks.length,
    done,
    overdue: overdue.length,
    blocked: blockedTasks.length,
    openIncidents: openIncidents.filter((row) => row.status === "open").length,
    criticalRunOfShow: criticalRos.length,
    overdueDeliverables: overdueDeliverables.length,
  });
  const areas = areaScores({
    tasks: tasks.length,
    done,
    overdue: overdue.length,
    blocked: blockedTasks.length,
    openIncidents: openIncidents.length,
    criticalIncidents: criticalIncidents.length,
    conflicts: conflicts.length,
    budgetCents: event.budgetCents,
    totalCostCents: finance?.totalCostCents ?? 0,
    netMarginCents: finance?.netMarginCents ?? 0,
    pendingDeliverables: pendingDeliverables.length,
    negotiatingSponsors: negotiating,
    ticketsSold: sold,
    capacity: event.capacity,
    sessionsWithoutSpeaker,
    speakersPending,
    syncErrors,
  });
  const weighted = weightedHealth(areas);
  const analysis = analyzeDependencies(tasks, deps);
  const graph = buildGraph({
    eventId: event.id,
    eventName: event.name,
    tasks,
    deps,
    deals,
    deliverables,
    speakers,
    sessions: sessions.map((row) => ({ id: row.id, title: row.title, speakerIds: row.speakerIds })),
    incidents: openIncidents,
    runOfShow,
  });
  const ticketRevenue = revenues.filter((row) => row.type === "TICKET").reduce((sum, row) => sum + row.amountCents, 0);
  const projection = forecast({
    openTasks: openTasks.length,
    overdueTasks: overdue.length,
    incidents: openIncidents,
    conflicts: conflicts.length,
    totalRevenueCents: finance?.totalRevenueCents ?? ticketRevenue,
    totalCostCents: finance?.totalCostCents ?? 0,
    budgetCents: event.budgetCents,
    ticketsSold: sold,
    capacity: event.capacity,
    ticketRevenueCents: ticketRevenue,
    fallbackTicketPriceCents: event.configuration.fallbackTicketPriceCents,
    onSaleDate: event.configuration.onSaleDate,
    now: now.toISOString(),
    eventEnd: event.endAt ?? now.toISOString(),
  });
  const self = attendees.find((row) => actor.access.some((item) => item.entityType === "ATTENDEE" && item.entityId === row.id));
  const recommendations = (self ? attendees.filter((row) => row.id !== self.id) : []).map((row) => ({ attendee: row, ...matchScore(self!, row) })).sort((a, b) => b.score - a.score);
  const weekRisks = [
    overdue.length ? `${overdue.length} tarea(s) vencida(s).` : "",
    blockedTasks.length ? `${blockedTasks.length} tarea(s) bloqueada(s).` : "",
    criticalIncidents.length ? `${criticalIncidents.length} incidente(s) crítico(s).` : "",
    conflicts.length ? `${conflicts.length} solape(s) en la hoja de ruta.` : "",
    pendingDeliverables.length ? `${pendingDeliverables.length} entregable(s) de sponsor pendientes.` : "",
  ].filter(Boolean);
  const brainContext = {
    eventName: event.name,
    healthScore: official,
    riskScore: Math.max(0, Math.min(100, 100 - official + (criticalIncidents.length ? 8 : 0))),
    ticketsSold: sold,
    revenueCents: finance?.totalRevenueCents ?? 0,
    expenseCents: finance?.totalCostCents ?? 0,
    netMarginCents: finance?.netMarginCents ?? 0,
    blocked: blockedTasks.map((row) => ({ id: row.id, title: row.title })),
    overdue: overdue.map((row) => ({ id: row.id, title: row.title })),
    pendingDeliverables: pendingDeliverables.map((row) => ({ sponsor: deals.find((deal) => deal.id === row.dealId)?.companyName ?? "", title: row.title })),
    openIncidents: openIncidents.map((row) => ({ title: row.title, severity: row.severity })),
    weekRisks,
  };
  const users = state.users.map((row) => ({ id: row.id, name: row.name, email: row.email }));
  return {
    forbidden: false as const,
    role,
    manage,
    operate,
    showFinance: Boolean(finance),
    event,
    page: state.publicPages.find((row) => row.eventId === eventId) ?? null,
    venue: state.venues.find((row) => row.eventId === eventId) ?? null,
    spaces: state.spaces.filter((row) => state.venues.some((venue) => venue.id === row.venueId && venue.eventId === eventId)),
    stages: state.stages.filter((row) => row.eventId === eventId),
    tasks: manage || operate ? tasks : [],
    dependencies: manage || operate ? deps : [],
    comments: state.comments.filter((row) => row.eventId === eventId),
    deals: manage ? deals : deals.map((row) => ({ ...row, amountCents: role === "SPONSOR" ? row.amountCents : 0, notes: role === "SPONSOR" ? row.notes : "" })),
    deliverables,
    speakers,
    sessions,
    vendors: manage ? vendors : vendors.map((row) => ({ ...row, amountCents: role === "VENDOR" ? row.amountCents : 0 })),
    attendees: role === "ATTENDEE" || manage || operate ? attendees : visibleAttendees,
    tickets: manage || operate || role === "ATTENDEE" ? tickets.filter((row) => manage || operate || actor.access.some((item) => item.entityId === row.attendeeId)) : [],
    ticketTypes: state.ticketTypes.filter((row) => row.eventId === eventId),
    orders: manage ? state.orders.filter((row) => row.eventId === eventId) : [],
    incidents: manage || operate ? incidents : [],
    runOfShow: manage || operate || role === "VENDOR" || role === "STAFF" ? runOfShow : [],
    conflicts,
    campaigns: manage ? state.campaigns.filter((row) => row.eventId === eventId) : [],
    expenses: finance ? expenses : [],
    revenues: finance ? revenues : [],
    categories: finance ? state.categories.filter((row) => row.eventId === eventId) : [],
    invoices: (manage ? state.invoices.filter((row) => row.eventId === eventId) : state.invoices.filter((row) => row.eventId === eventId && row.sponsorId && dealIds.has(row.sponsorId))),
    payments: manage ? state.payments.filter((row) => row.eventId === eventId) : [],
    shifts: state.shifts.filter((row) => row.eventId === eventId && (manage || row.userId === actor.userId)),
    notifications: state.notifications.filter((row) => row.eventId === eventId && (manage || row.userId === actor.userId)),
    connections: state.connections.filter((row) => row.eventId === eventId),
    meetings: state.meetings.filter((row) => row.eventId === eventId),
    polls: state.polls.filter((row) => row.eventId === eventId),
    questions: state.questions.filter((row) => row.eventId === eventId),
    surveys: state.surveys.filter((row) => row.eventId === eventId),
    points: state.points.filter((row) => row.eventId === eventId),
    audits: manage ? state.audits.filter((row) => row.eventId === eventId).slice(0, 30) : [],
    ticketing: manage ? state.ticketing.find((row) => row.eventId === eventId) ?? null : null,
    syncLogs: manage ? state.syncLogs.filter((row) => row.eventId === eventId) : [],
    reconcile: manage ? reconcileCodes(tickets.map((row) => ({ code: row.code, status: row.status })), [...tickets.map((row) => ({ code: row.code, status: row.status })), { code: "ABRA-EXTRA-1", status: "ISSUED" }]) : null,
    users,
    official,
    weighted,
    areas: (Object.keys(AREA_LABEL) as HealthAreaKey[]).map((key) => ({ key, label: AREA_LABEL[key], score: areas[key] })),
    riskScore: brainContext.riskScore,
    analysis,
    graph: { nodes: graph.nodes.length, edges: graph.edges.length, blockers: analysis.blockers, criticalTasks: analysis.criticalTasks },
    finance,
    projection: manage ? projection : null,
    recommendations,
    rules: MATCH_RULES,
    kpis: {
      registrations: attendees.length,
      ticketsSold: sold,
      checkIns: tickets.filter((row) => row.status === "CHECKED_IN").length,
      revenueCents: finance?.totalRevenueCents ?? null,
      expensesCents: finance?.totalCostCents ?? null,
      marginCents: finance?.netMarginCents ?? null,
      sponsors: deals.filter((row) => row.status === "CONFIRMED").length,
      speakers: speakers.filter((row) => row.status === "CONFIRMED").length,
      tasksOpen: openTasks.length,
      incidentsOpen: openIncidents.length,
    },
    actions: [
      ...overdue.map((row) => ({ href: "planning", title: row.title, kind: "Tarea vencida" })),
      ...analysis.blockers.map((row) => ({ href: "planning", title: tasks.find((task) => task.id === row.taskId)?.title ?? row.taskId, kind: row.reason })),
      ...criticalIncidents.map((row) => ({ href: "operations", title: row.title, kind: "Incidente crítico" })),
      ...deals.filter((row) => row.status === "NEGOTIATING" || row.status === "PROSPECT").map((row) => ({ href: "commercial", title: row.companyName, kind: "Sponsor pendiente" })),
      ...speakers.filter((row) => row.status === "INVITED").map((row) => ({ href: "content", title: row.personName, kind: "Speaker pendiente" })),
      ...conflicts.map((row) => ({ href: "operations", title: `${row.a} / ${row.b}`, kind: "Solape de horario" })),
    ],
    brainContext,
  };
}
