import { createHash } from "node:crypto";
import { demoPasswordHash } from "@/lib/domain/password";
import type { Role } from "@/lib/domain/rbac";

export const DEMO_PASSWORD = "vendimia-demo";
export const DEMO_MAGIC = "demo-magic-ines";
export const DEMO_INVITE = "demo-invite-token";
export const EVENT_ID = "evt_vendimia";
export const OTHER_EVENT_ID = "evt_bodega";
export const EVENT_SLUG = "vendimia-tech-2027";

export const FIXTURE = {
  budgetCents: 400_000_000,
  generalPrice: 2_500_000,
  generalSold: 100,
  generalCheckedIn: 20,
  studentPrice: 800_000,
  studentSold: 25,
  vipPrice: 6_000_000,
  vipSold: 10,
  sponsorAndes: 150_000_000,
  sponsorRio: 80_000_000,
  directVenue: 120_000_000,
  directProduction: 80_000_000,
  marketing: 40_000_000,
  staff: 35_000_000,
};

export type TaskRow = {
  id: string;
  eventId: string;
  parentId: string | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  dueAt: string | null;
  checklist: { id: string; label: string; done: boolean }[];
  approvalStatus: string | null;
  createdAt: string;
};

export type IncidentRow = {
  id: string;
  eventId: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  zoneId: string | null;
  assigneeId: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type ExpenseRow = {
  id: string;
  eventId: string;
  categoryId: string | null;
  vendorId: string | null;
  description: string;
  amountCents: number;
  status: string;
  direct: boolean;
  incurredAt: string;
};

export type ProgramSessionRow = {
  id: string;
  eventId: string;
  title: string;
  description: string;
  startAt: string | null;
  endAt: string | null;
  type: string;
  status: string;
  stageId: string | null;
  roomId: string | null;
  speakerIds: string[];
};

export type RunOfShowRow = {
  id: string;
  eventId: string;
  title: string;
  startAt: string | null;
  endAt: string | null;
  area: string;
  location: string;
  stageId: string | null;
  ownerId: string | null;
  status: string;
  critical: boolean;
  notes: string;
  dependsOnTaskId: string | null;
};

export type AuditRow = {
  id: string;
  eventId: string | null;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type TicketingRow = {
  id: string;
  eventId: string;
  provider: string;
  status: string;
  externalEventId: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
};

export type DemoState = ReturnType<typeof buildDemoState>;

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

function user(id: string, email: string, name: string) {
  return { id, email, name, passwordHash: demoPasswordHash(), createdAt: "2026-08-01T12:00:00.000Z" };
}

function member(id: string, organizationId: string, userId: string, role: Role) {
  return { id, organizationId, userId, role };
}

function eventMember(id: string, eventId: string, userId: string, role: Role) {
  return { id, eventId, userId, role };
}

export function buildDemoState() {
  const passwordHash = demoPasswordHash();
  void passwordHash;
  const tickets: {
    id: string; eventId: string; orderId: string; attendeeId: string | null; typeId: string; status: string; code: string; checkedInAt: string | null;
  }[] = [];
  const pushTickets = (typeId: string, orderId: string, prefix: string, sold: number, checkedIn: number) => {
    for (let i = 0; i < sold; i += 1) {
      const checked = i < checkedIn;
      tickets.push({
        id: `tkt_${prefix}_${i}`,
        eventId: EVENT_ID,
        orderId,
        attendeeId: i === 0 && prefix === "g" ? "att_ines" : i === 1 && prefix === "g" ? "att_juan" : null,
        typeId,
        status: checked ? "CHECKED_IN" : "ISSUED",
        code: `${prefix.toUpperCase()}-${String(i + 1).padStart(4, "0")}`,
        checkedInAt: checked ? "2027-03-04T14:00:00.000Z" : null,
      });
    }
  };
  pushTickets("tt_general", "ord_general", "g", FIXTURE.generalSold, FIXTURE.generalCheckedIn);
  pushTickets("tt_student", "ord_student", "s", FIXTURE.studentSold, 0);
  pushTickets("tt_vip", "ord_vip", "v", FIXTURE.vipSold, 0);

  return {
    organizations: [
      { id: "org_vendimia", name: "Vendimia Tech", slug: "vendimia-tech", createdAt: "2026-08-01T12:00:00.000Z" },
      { id: "org_bodega", name: "Bodega Sur Eventos", slug: "bodega-sur", createdAt: "2026-08-01T12:00:00.000Z" },
    ],
    users: [
      user("usr_ana", "ana.organizer@vendimiatech.demo", "Ana Organizer"),
      user("usr_bruno", "bruno.admin@vendimiatech.demo", "Bruno Admin"),
      user("usr_camila", "camila.manager@vendimiatech.demo", "Camila Manager"),
      user("usr_flor", "flor.lead@vendimiatech.demo", "Flor Lead"),
      user("usr_diego", "diego.staff@vendimiatech.demo", "Diego Staff"),
      user("usr_elena", "elena.sponsor@vendimiatech.demo", "Elena Sponsor"),
      user("usr_facundo", "facundo.sponsor@vendimiatech.demo", "Facundo Sponsor"),
      user("usr_gracia", "gracia.speaker@vendimiatech.demo", "Gracia Speaker"),
      user("usr_hugo", "hugo.vendor@vendimiatech.demo", "Hugo Vendor"),
      user("usr_ines", "ines.attendee@vendimiatech.demo", "Inés Attendee"),
      user("usr_juan", "juan.attendee@vendimiatech.demo", "Juan Attendee"),
      user("usr_snoop", "rio@sponsors.demo", "Snoop Email"),
      user("usr_karen", "karen.owner@bodegasur.demo", "Karen Bodega"),
    ],
    memberships: [
      member("mem_ana", "org_vendimia", "usr_ana", "OWNER"),
      member("mem_bruno", "org_vendimia", "usr_bruno", "ADMIN"),
      member("mem_camila", "org_vendimia", "usr_camila", "EVENT_MANAGER"),
      member("mem_flor", "org_vendimia", "usr_flor", "FUNCTIONAL_LEAD"),
      member("mem_diego", "org_vendimia", "usr_diego", "STAFF"),
      member("mem_elena", "org_vendimia", "usr_elena", "SPONSOR"),
      member("mem_facundo", "org_vendimia", "usr_facundo", "SPONSOR"),
      member("mem_gracia", "org_vendimia", "usr_gracia", "SPEAKER"),
      member("mem_hugo", "org_vendimia", "usr_hugo", "VENDOR"),
      member("mem_ines", "org_vendimia", "usr_ines", "ATTENDEE"),
      member("mem_juan", "org_vendimia", "usr_juan", "ATTENDEE"),
      member("mem_snoop", "org_vendimia", "usr_snoop", "ATTENDEE"),
      member("mem_karen", "org_bodega", "usr_karen", "OWNER"),
    ],
    eventMembers: [
      eventMember("em_ana", EVENT_ID, "usr_ana", "OWNER"),
      eventMember("em_diego", EVENT_ID, "usr_diego", "STAFF"),
      eventMember("em_elena", EVENT_ID, "usr_elena", "SPONSOR"),
      eventMember("em_facundo", EVENT_ID, "usr_facundo", "SPONSOR"),
      eventMember("em_gracia", EVENT_ID, "usr_gracia", "SPEAKER"),
      eventMember("em_hugo", EVENT_ID, "usr_hugo", "VENDOR"),
      eventMember("em_ines", EVENT_ID, "usr_ines", "ATTENDEE"),
      eventMember("em_juan", EVENT_ID, "usr_juan", "ATTENDEE"),
      eventMember("em_snoop", EVENT_ID, "usr_snoop", "ATTENDEE"),
      eventMember("em_karen", OTHER_EVENT_ID, "usr_karen", "OWNER"),
    ],
    access: [
      { id: "acc_elena", userId: "usr_elena", eventId: EVENT_ID, role: "SPONSOR" as Role, entityType: "SPONSOR", entityId: "spo_andes" },
      { id: "acc_facundo", userId: "usr_facundo", eventId: EVENT_ID, role: "SPONSOR" as Role, entityType: "SPONSOR", entityId: "spo_andes" },
      { id: "acc_gracia", userId: "usr_gracia", eventId: EVENT_ID, role: "SPEAKER" as Role, entityType: "SPEAKER", entityId: "spk_gracia" },
      { id: "acc_hugo", userId: "usr_hugo", eventId: EVENT_ID, role: "VENDOR" as Role, entityType: "VENDOR", entityId: "ven_sonido" },
      { id: "acc_ines", userId: "usr_ines", eventId: EVENT_ID, role: "ATTENDEE" as Role, entityType: "ATTENDEE", entityId: "att_ines" },
      { id: "acc_juan", userId: "usr_juan", eventId: EVENT_ID, role: "ATTENDEE" as Role, entityType: "ATTENDEE", entityId: "att_juan" },
    ],
    sessions: [] as { id: string; userId: string; tokenHash: string; csrfToken: string; expiresAt: string; revokedAt: string | null }[],
    attendeeSessions: [
      { id: "as_magic", attendeeId: "att_ines", tokenHash: hash(DEMO_MAGIC), expiresAt: "2027-04-01T00:00:00.000Z", revokedAt: null as string | null },
    ],
    invitations: [
      {
        id: "inv_demo",
        organizationId: "org_vendimia",
        eventId: EVENT_ID,
        email: "nuevo.staff@vendimiatech.demo",
        role: "STAFF" as Role,
        entityType: null,
        entityId: null,
        tokenHash: hash(DEMO_INVITE),
        expiresAt: "2027-03-01T00:00:00.000Z",
        acceptedAt: null as string | null,
        createdById: "usr_ana",
      },
    ],
    events: [
      {
        id: EVENT_ID,
        organizationId: "org_vendimia",
        name: "Vendimia Tech 2027",
        slug: EVENT_SLUG,
        description: "Fixture de demostración. La fecha no sale de un sitio oficial.",
        startAt: "2027-03-04T13:00:00.000Z",
        endAt: "2027-03-06T23:00:00.000Z",
        timezone: "America/Argentina/Mendoza",
        city: "Mendoza",
        country: "Argentina",
        status: "PLANNING",
        capacity: 400,
        objectiveAttendees: 350,
        budgetCents: FIXTURE.budgetCents,
        healthScore: 0,
        branding: { accent: "#6f2436", primary: "#2a1219", logoText: "Vendimia Tech" },
        configuration: { currency: "ARS", onSaleDate: "2026-11-01T00:00:00.000Z", fallbackTicketPriceCents: FIXTURE.generalPrice },
        objectives: ["Llenar la nave demo", "Cerrar sponsors confirmados", "Dejar la hoja de ruta sin solapes"],
        metadata: { dateSource: "demo-fixture", venueLabel: "Nave Demo" },
        abraCheckoutEvent: "vendimia-tech-2027",
      },
      {
        id: OTHER_EVENT_ID,
        organizationId: "org_bodega",
        name: "Cata privada",
        slug: "cata-bodega-sur",
        description: "Evento de otra organización. Sirve para probar el aislamiento.",
        startAt: "2027-04-02T18:00:00.000Z",
        endAt: "2027-04-02T23:00:00.000Z",
        timezone: "America/Argentina/Mendoza",
        city: "Mendoza",
        country: "Argentina",
        status: "DRAFT",
        capacity: 40,
        objectiveAttendees: 40,
        budgetCents: 1_000_000,
        healthScore: 0,
        branding: { accent: "#3d5344", primary: "#1c1412", logoText: "Bodega Sur" },
        configuration: { currency: "ARS", onSaleDate: "2027-01-01T00:00:00.000Z", fallbackTicketPriceCents: 100 },
        objectives: [],
        metadata: { dateSource: "demo-fixture" },
        abraCheckoutEvent: null as string | null,
      },
    ],
    publicPages: [
      {
        id: "page_vendimia",
        eventId: EVENT_ID,
        headline: "Vendimia Tech 2027",
        subheadline: "Fixture de producto en Mendoza. No es la pieza oficial del sitio público.",
        description: "Charlas, sponsors y operación en un solo sistema.",
        heroImageUrl: null as string | null,
        logoUrl: null as string | null,
        ctaLabel: "Conseguí tu entrada",
        ctaUrl: null as string | null,
      },
    ],
    venues: [{ id: "ven_place", eventId: EVENT_ID, name: "Nave Demo", address: "Mendoza, Argentina", notes: "Nombre de fixture, no un venue oficial." }],
    spaces: [
      { id: "spc_sala", venueId: "ven_place", name: "Sala principal", capacity: 400, kind: "room" },
      { id: "spc_patio", venueId: "ven_place", name: "Patio", capacity: 120, kind: "zone" },
    ],
    stages: [
      { id: "stg_main", eventId: EVENT_ID, name: "Escenario principal" },
      { id: "stg_side", eventId: EVENT_ID, name: "Sala lateral" },
    ],
    tasks: [
      { id: "tsk_venue", eventId: EVENT_ID, parentId: null, title: "Cerrar nave", description: "", status: "DONE", priority: "HIGH", assigneeId: "usr_ana", dueAt: "2026-08-01T12:00:00.000Z", checklist: [], approvalStatus: null, createdAt: "2026-08-01T12:00:00.000Z" },
      { id: "tsk_stage", eventId: EVENT_ID, parentId: null, title: "Montar escenario", description: "", status: "IN_PROGRESS", priority: "HIGH", assigneeId: "usr_diego", dueAt: "2027-02-28T12:00:00.000Z", checklist: [], approvalStatus: null, createdAt: "2026-08-02T12:00:00.000Z" },
      { id: "tsk_audio", eventId: EVENT_ID, parentId: null, title: "Prueba de audio", description: "Bloqueada por el escenario.", status: "BLOCKED", priority: "HIGH", assigneeId: "usr_diego", dueAt: "2027-03-01T12:00:00.000Z", checklist: [], approvalStatus: null, createdAt: "2026-08-03T12:00:00.000Z" },
      { id: "tsk_runbook", eventId: EVENT_ID, parentId: null, title: "Cerrar runbook", description: "", status: "TODO", priority: "MEDIUM", assigneeId: "usr_camila", dueAt: "2027-03-02T12:00:00.000Z", checklist: [], approvalStatus: null, createdAt: "2026-08-04T12:00:00.000Z" },
      { id: "tsk_overdue", eventId: EVENT_ID, parentId: null, title: "Kit de sponsor vencido", description: "", status: "TODO", priority: "CRITICAL", assigneeId: "usr_ana", dueAt: "2026-09-15T12:00:00.000Z", checklist: [], approvalStatus: null, createdAt: "2026-08-05T12:00:00.000Z" },
      { id: "tsk_staffing", eventId: EVENT_ID, parentId: null, title: "Turnos de staff", description: "", status: "IN_PROGRESS", priority: "MEDIUM", assigneeId: "usr_diego", dueAt: "2027-02-25T12:00:00.000Z", checklist: [{ id: "ck1", label: "Confirmar radios", done: true }, { id: "ck2", label: "Publicar grilla", done: false }], approvalStatus: null, createdAt: "2026-08-06T12:00:00.000Z" },
      { id: "tsk_web", eventId: EVENT_ID, parentId: null, title: "Publicar web", description: "", status: "DONE", priority: "MEDIUM", assigneeId: "usr_ana", dueAt: "2026-10-01T12:00:00.000Z", checklist: [], approvalStatus: "APPROVED", createdAt: "2026-08-07T12:00:00.000Z" },
      { id: "tsk_checkin", eventId: EVENT_ID, parentId: null, title: "Operación de acreditación", description: "", status: "TODO", priority: "HIGH", assigneeId: "usr_diego", dueAt: "2027-03-03T12:00:00.000Z", checklist: [], approvalStatus: null, createdAt: "2026-08-08T12:00:00.000Z" },
      { id: "tsk_badges", eventId: EVENT_ID, parentId: "tsk_checkin", title: "Imprimir acreditaciones", description: "Subtarea", status: "TODO", priority: "MEDIUM", assigneeId: "usr_diego", dueAt: "2027-03-03T15:00:00.000Z", checklist: [], approvalStatus: null, createdAt: "2026-08-09T12:00:00.000Z" },
      { id: "tsk_approval", eventId: EVENT_ID, parentId: null, title: "Aprobar pieza de Andes", description: "", status: "TODO", priority: "CRITICAL", assigneeId: "usr_ana", dueAt: "2027-02-18T12:00:00.000Z", checklist: [], approvalStatus: "PENDING", createdAt: "2026-08-10T12:00:00.000Z" },
      { id: "tsk_other", eventId: OTHER_EVENT_ID, parentId: null, title: "Tarea ajena", description: "", status: "TODO", priority: "LOW", assigneeId: "usr_karen", dueAt: null, checklist: [], approvalStatus: null, createdAt: "2026-08-11T12:00:00.000Z" },
    ] as TaskRow[],
    dependencies: [
      { id: "dep_stage", eventId: EVENT_ID, taskId: "tsk_stage", dependsOnId: "tsk_venue" },
      { id: "dep_audio", eventId: EVENT_ID, taskId: "tsk_audio", dependsOnId: "tsk_stage" },
      { id: "dep_runbook", eventId: EVENT_ID, taskId: "tsk_runbook", dependsOnId: "tsk_audio" },
    ],
    comments: [{ id: "cmt_1", eventId: EVENT_ID, taskId: "tsk_audio", authorId: "usr_diego", body: "Falta el patch del escenario.", createdAt: "2027-02-01T12:00:00.000Z" }],
    deals: [
      { id: "spo_andes", eventId: EVENT_ID, companyName: "Andes Demo", tier: "ORO", status: "CONFIRMED", contactEmail: "elena.sponsor@vendimiatech.demo", amountCents: FIXTURE.sponsorAndes, notes: "Dos usuarios del mismo sponsor." },
      { id: "spo_rio", eventId: EVENT_ID, companyName: "Río Demo", tier: "PLATA", status: "CONFIRMED", contactEmail: "rio@sponsors.demo", amountCents: FIXTURE.sponsorRio, notes: "El email de contacto no autoriza solo." },
      { id: "spo_nube", eventId: EVENT_ID, companyName: "Nube Demo", tier: "PLATA", status: "NEGOTIATING", contactEmail: "nube@sponsors.demo", amountCents: 80_000_000, notes: "" },
    ],
    deliverables: [
      { id: "del_logo", dealId: "spo_andes", title: "Logo en escenario", status: "pending", dueAt: "2026-09-20T12:00:00.000Z" },
      { id: "del_banner", dealId: "spo_andes", title: "Banner digital", status: "done", dueAt: "2026-08-01T12:00:00.000Z" },
      { id: "del_talk", dealId: "spo_rio", title: "Mención en apertura", status: "pending", dueAt: "2027-03-01T12:00:00.000Z" },
    ],
    speakers: [
      { id: "spk_gracia", eventId: EVENT_ID, personName: "Gracia Speaker", email: "gracia.speaker@vendimiatech.demo", company: "Finca Norte", bio: "Fixture.", status: "CONFIRMED", topics: ["producto"] },
      { id: "spk_lucia", eventId: EVENT_ID, personName: "Lucía Demo", email: "lucia@speakers.demo", company: "Taller Sur", bio: "Fixture.", status: "CONFIRMED", topics: ["datos"] },
      { id: "spk_omar", eventId: EVENT_ID, personName: "Omar Invitado", email: "omar@speakers.demo", company: "Independiente", bio: "Fixture.", status: "INVITED", topics: ["ia"] },
    ],
    sessionsProgram: [
      { id: "ses_open", eventId: EVENT_ID, title: "Apertura", description: "", startAt: "2027-03-05T13:00:00.000Z", endAt: "2027-03-05T13:30:00.000Z", type: "Keynote", status: "CONFIRMED", stageId: "stg_main", roomId: "spc_sala", speakerIds: ["spk_gracia"] },
      { id: "ses_ia", eventId: EVENT_ID, title: "Datos en la cosecha", description: "", startAt: "2027-03-05T14:00:00.000Z", endAt: "2027-03-05T14:40:00.000Z", type: "Charla", status: "CONFIRMED", stageId: "stg_main", roomId: "spc_sala", speakerIds: ["spk_lucia"] },
      { id: "ses_gap", eventId: EVENT_ID, title: "Mesa sin orador", description: "", startAt: "2027-03-05T16:00:00.000Z", endAt: "2027-03-05T16:40:00.000Z", type: "Mesa", status: "DRAFT", stageId: "stg_side", roomId: "spc_patio", speakerIds: [] as string[] },
    ] as ProgramSessionRow[],
    vendors: [
      { id: "ven_sonido", eventId: EVENT_ID, name: "Sonido Demo", category: "Audio", amountCents: 20_000_000, contactEmail: "hugo.vendor@vendimiatech.demo", status: "CONFIRMED", notes: "" },
      { id: "ven_cafe", eventId: EVENT_ID, name: "Café Demo", category: "Catering", amountCents: 8_000_000, contactEmail: "cafe@vendors.demo", status: "CONFIRMED", notes: "" },
    ],
    attendees: [
      { id: "att_ines", eventId: EVENT_ID, userId: "usr_ines", name: "Inés Attendee", email: "ines.attendee@vendimiatech.demo", company: "Finca Norte", title: "Producto", interests: ["vino", "ia", "producto"], goals: ["contratar"], tags: ["producto"] },
      { id: "att_juan", eventId: EVENT_ID, userId: "usr_juan", name: "Juan Attendee", email: "juan.attendee@vendimiatech.demo", company: "Independiente", title: "Datos", interests: ["ia", "datos"], goals: ["busco-trabajo"], tags: ["busco-trabajo", "datos"] },
      { id: "att_lara", eventId: EVENT_ID, userId: null, name: "Lara Demo", email: "lara@attendees.demo", company: "Río Events", title: "Partnerships", interests: ["vino", "turismo"], goals: ["sponsors"], tags: ["oferta-patrocinio"] },
      { id: "att_mateo", eventId: EVENT_ID, userId: null, name: "Mateo Demo", email: "mateo@attendees.demo", company: "Finca Norte", title: "Ingeniería", interests: ["ia", "producto"], goals: ["mentoria"], tags: ["busco-mentor"] },
    ],
    ticketTypes: [
      { id: "tt_general", eventId: EVENT_ID, name: "General", priceCents: FIXTURE.generalPrice, quantity: 250, externalId: "mock-general" },
      { id: "tt_student", eventId: EVENT_ID, name: "Estudiante", priceCents: FIXTURE.studentPrice, quantity: 80, externalId: "mock-student" },
      { id: "tt_vip", eventId: EVENT_ID, name: "VIP", priceCents: FIXTURE.vipPrice, quantity: 30, externalId: "mock-vip" },
    ],
    orders: [
      { id: "ord_general", eventId: EVENT_ID, attendeeId: null, externalId: "mock-ord-g", status: "PAID", totalCents: FIXTURE.generalPrice * FIXTURE.generalSold, buyerName: "Varios", buyerEmail: "caja@vendimiatech.demo", createdAt: "2027-01-15T12:00:00.000Z" },
      { id: "ord_student", eventId: EVENT_ID, attendeeId: null, externalId: "mock-ord-s", status: "PAID", totalCents: FIXTURE.studentPrice * FIXTURE.studentSold, buyerName: "Varios", buyerEmail: "caja@vendimiatech.demo", createdAt: "2027-01-20T12:00:00.000Z" },
      { id: "ord_vip", eventId: EVENT_ID, attendeeId: null, externalId: "mock-ord-v", status: "PAID", totalCents: FIXTURE.vipPrice * FIXTURE.vipSold, buyerName: "Varios", buyerEmail: "caja@vendimiatech.demo", createdAt: "2027-02-01T12:00:00.000Z" },
    ],
    tickets,
    incidents: [
      { id: "inc_audio", eventId: EVENT_ID, title: "Falla de audio", description: "Fixture crítico abierto.", status: "open", severity: "critical", zoneId: "spc_sala", assigneeId: "usr_diego", createdAt: "2027-02-18T12:00:00.000Z", resolvedAt: null as string | null },
      { id: "inc_power", eventId: EVENT_ID, title: "Luz de patio", description: "", status: "acknowledged", severity: "low", zoneId: "spc_patio", assigneeId: "usr_diego", createdAt: "2027-02-10T12:00:00.000Z", resolvedAt: null },
      { id: "inc_badge", eventId: EVENT_ID, title: "Cola de acreditación", description: "", status: "resolved", severity: "medium", zoneId: "spc_sala", assigneeId: null, createdAt: "2027-01-10T12:00:00.000Z", resolvedAt: "2027-01-11T12:00:00.000Z" },
    ] as IncidentRow[],
    runOfShow: [
      { id: "ros_a", eventId: EVENT_ID, title: "Apertura de puertas", startAt: "2027-03-05T12:30:00.000Z", endAt: "2027-03-05T13:10:00.000Z", area: "Acceso", location: "Escenario principal", stageId: "stg_main", ownerId: "usr_diego", status: "planned", critical: true, notes: "", dependsOnTaskId: "tsk_checkin" },
      { id: "ros_b", eventId: EVENT_ID, title: "Prueba que pisa la apertura", startAt: "2027-03-05T13:00:00.000Z", endAt: "2027-03-05T13:20:00.000Z", area: "Escenario", location: "Escenario principal", stageId: "stg_main", ownerId: "usr_hugo", status: "planned", critical: false, notes: "Solapa con la apertura.", dependsOnTaskId: "tsk_audio" },
      { id: "ros_c", eventId: EVENT_ID, title: "Cierre", startAt: "2027-03-05T18:00:00.000Z", endAt: "2027-03-05T18:20:00.000Z", area: "Escenario", location: "Escenario principal", stageId: "stg_main", ownerId: "usr_ana", status: "done", critical: false, notes: "", dependsOnTaskId: null },
    ] as RunOfShowRow[],
    campaigns: [{ id: "cmp_1", eventId: EVENT_ID, name: "Campaña cosecha", channel: "Instagram", budgetCents: FIXTURE.marketing, status: "LIVE" }],
    expenses: [
      { id: "exp_venue", eventId: EVENT_ID, categoryId: "cat_venue", vendorId: null, description: "Nave", amountCents: FIXTURE.directVenue, status: "PAID", direct: true, incurredAt: "2026-12-01T12:00:00.000Z" },
      { id: "exp_prod", eventId: EVENT_ID, categoryId: "cat_prod", vendorId: "ven_sonido", description: "Producción", amountCents: FIXTURE.directProduction, status: "PAID", direct: true, incurredAt: "2027-01-10T12:00:00.000Z" },
      { id: "exp_mkt", eventId: EVENT_ID, categoryId: "cat_mkt", vendorId: null, description: "Medios", amountCents: FIXTURE.marketing, status: "PAID", direct: false, incurredAt: "2027-01-20T12:00:00.000Z" },
      { id: "exp_staff", eventId: EVENT_ID, categoryId: "cat_staff", vendorId: null, description: "Staff", amountCents: FIXTURE.staff, status: "APPROVED", direct: false, incurredAt: "2027-02-01T12:00:00.000Z" },
    ] as ExpenseRow[],
    revenues: [
      { id: "rev_tickets", eventId: EVENT_ID, type: "TICKET", description: "Entradas mock", amountCents: FIXTURE.generalPrice * FIXTURE.generalSold + FIXTURE.studentPrice * FIXTURE.studentSold + FIXTURE.vipPrice * FIXTURE.vipSold, sponsorId: null, receivedAt: "2027-02-15T12:00:00.000Z" },
      { id: "rev_andes", eventId: EVENT_ID, type: "SPONSOR", description: "Andes Demo", amountCents: FIXTURE.sponsorAndes, sponsorId: "spo_andes", receivedAt: "2027-01-05T12:00:00.000Z" },
      { id: "rev_rio", eventId: EVENT_ID, type: "SPONSOR", description: "Río Demo", amountCents: FIXTURE.sponsorRio, sponsorId: "spo_rio", receivedAt: "2027-01-08T12:00:00.000Z" },
    ],
    categories: [
      { id: "cat_venue", eventId: EVENT_ID, name: "Venue", plannedCents: 130_000_000, kind: "EXPENSE" },
      { id: "cat_prod", eventId: EVENT_ID, name: "Producción", plannedCents: 90_000_000, kind: "EXPENSE" },
      { id: "cat_mkt", eventId: EVENT_ID, name: "Marketing", plannedCents: 50_000_000, kind: "EXPENSE" },
      { id: "cat_staff", eventId: EVENT_ID, name: "Staff", plannedCents: 40_000_000, kind: "EXPENSE" },
    ],
    invoices: [
      { id: "inv_andes", eventId: EVENT_ID, sponsorId: "spo_andes", number: "VT-001", amountCents: FIXTURE.sponsorAndes, status: "PAID", dueAt: "2027-01-15T12:00:00.000Z" },
      { id: "inv_rio", eventId: EVENT_ID, sponsorId: "spo_rio", number: "VT-002", amountCents: FIXTURE.sponsorRio, status: "SENT", dueAt: "2027-02-15T12:00:00.000Z" },
    ],
    payments: [{ id: "pay_andes", eventId: EVENT_ID, invoiceId: "inv_andes", amountCents: FIXTURE.sponsorAndes, method: "transfer", status: "SETTLED", paidAt: "2027-01-05T12:00:00.000Z" }],
    shifts: [
      { id: "sh_diego", eventId: EVENT_ID, userId: "usr_diego", roleLabel: "Piso", location: "Sala principal", startAt: "2027-03-05T12:00:00.000Z", endAt: "2027-03-05T18:00:00.000Z", notes: "" },
    ],
    notifications: [
      { id: "nt_1", eventId: EVENT_ID, userId: "usr_diego", type: "TASK_ASSIGNED", title: "Tarea asignada", body: "Prueba de audio", readAt: null, createdAt: "2027-02-01T12:00:00.000Z", entityType: "Task", entityId: "tsk_audio" },
      { id: "nt_2", eventId: EVENT_ID, userId: "usr_ana", type: "TASK_OVERDUE", title: "Tarea vencida", body: "Kit de sponsor vencido", readAt: null, createdAt: "2026-09-16T12:00:00.000Z", entityType: "Task", entityId: "tsk_overdue" },
      { id: "nt_3", eventId: EVENT_ID, userId: "usr_ana", type: "INCIDENT_CRITICAL", title: "Incidente crítico", body: "Falla de audio", readAt: null, createdAt: "2027-02-18T12:00:00.000Z", entityType: "Incident", entityId: "inc_audio" },
      { id: "nt_4", eventId: EVENT_ID, userId: "usr_ana", type: "APPROVAL_REQUIRED", title: "Aprobación", body: "Pieza de Andes", readAt: null, createdAt: "2027-02-10T12:00:00.000Z", entityType: "Task", entityId: "tsk_approval" },
      { id: "nt_5", eventId: EVENT_ID, userId: "usr_elena", type: "SPONSOR_DELIVERABLE_DUE", title: "Entregable", body: "Logo en escenario", readAt: null, createdAt: "2026-09-18T12:00:00.000Z", entityType: "Deliverable", entityId: "del_logo" },
      { id: "nt_6", eventId: EVENT_ID, userId: "usr_omar_missing", type: "SPEAKER_ACTION_REQUIRED", title: "Speaker", body: "Omar sigue invitado", readAt: null, createdAt: "2027-02-12T12:00:00.000Z", entityType: "Speaker", entityId: "spk_omar" },
      { id: "nt_7", eventId: EVENT_ID, userId: "usr_ana", type: "TICKET_SYNC_ERROR", title: "Sync", body: "El último pull del mock falló", readAt: null, createdAt: "2027-02-19T12:00:00.000Z", entityType: "TicketingConnection", entityId: "tc_vendimia" },
      { id: "nt_8", eventId: EVENT_ID, userId: "usr_ana", type: "EVENT_RISK_ALERT", title: "Riesgo", body: "Hay incidente crítico y tareas bloqueadas", readAt: null, createdAt: "2027-02-19T12:00:00.000Z", entityType: "Event", entityId: EVENT_ID },
      { id: "nt_9", eventId: EVENT_ID, userId: "usr_diego", type: "INCIDENT_CREATED", title: "Incidente", body: "Falla de audio", readAt: null, createdAt: "2027-02-18T12:00:00.000Z", entityType: "Incident", entityId: "inc_audio" },
      { id: "nt_10", eventId: EVENT_ID, userId: "usr_ana", type: "APPROVAL_COMPLETED", title: "Aprobación lista", body: "Web publicada", readAt: "2027-02-02T12:00:00.000Z", createdAt: "2027-02-02T12:00:00.000Z", entityType: "Task", entityId: "tsk_web" },
    ],
    connections: [{ id: "con_1", eventId: EVENT_ID, fromAttendeeId: "att_juan", toAttendeeId: "att_ines", status: "PENDING", createdAt: "2027-02-11T12:00:00.000Z" }],
    meetings: [{ id: "mt_1", eventId: EVENT_ID, attendeeAId: "att_ines", attendeeBId: "att_lara", startAt: "2027-03-05T17:00:00.000Z", endAt: "2027-03-05T17:20:00.000Z", location: "Patio", status: "PROPOSED" }],
    polls: [{ id: "poll_1", eventId: EVENT_ID, sessionId: "ses_ia", question: "¿Qué tema sigue?", options: ["Riego", "Exportación"], status: "OPEN" }],
    pollVotes: [] as { id: string; eventId: string; pollId: string; attendeeId: string; optionIndex: number }[],
    questions: [{ id: "q_1", eventId: EVENT_ID, sessionId: "ses_open", attendeeId: "att_juan", body: "¿Habrá repetidora?", upvotes: 3, answered: false, createdAt: "2027-02-12T12:00:00.000Z" }],
    surveys: [{ id: "sv_1", eventId: EVENT_ID, title: "Pulso de venue", questions: ["¿El acceso fue claro?"] }],
    surveyResponses: [] as { id: string; eventId: string; surveyId: string; attendeeId: string; answers: string[] }[],
    points: [
      { id: "pt_1", eventId: EVENT_ID, attendeeId: "att_ines", reason: "Perfil completo", points: 10, createdAt: "2027-02-01T12:00:00.000Z" },
      { id: "pt_2", eventId: EVENT_ID, attendeeId: "att_juan", reason: "Pregunta en sala", points: 5, createdAt: "2027-02-12T12:00:00.000Z" },
    ],
    audits: [
      { id: "aud_1", eventId: EVENT_ID, actorId: "usr_ana", action: "event.seed", entityType: "Event", entityId: EVENT_ID, metadata: { note: "fixture" }, createdAt: "2026-08-01T12:00:00.000Z" },
    ] as AuditRow[],
    ticketing: [{ id: "tc_vendimia", eventId: EVENT_ID, provider: "MOCK", status: "ERROR", externalEventId: "vendimia-tech-2027", lastSyncAt: "2027-02-19T12:00:00.000Z", lastError: "Timeout talking to mock provider" }] as TicketingRow[],
    syncLogs: [{ id: "sl_1", eventId: EVENT_ID, connectionId: "tc_vendimia", direction: "PULL", status: "ERROR", message: "Timeout talking to mock provider", attempt: 1, createdAt: "2027-02-19T12:00:00.000Z" }],
    webhooks: [] as { id: string; eventId: string | null; provider: string; signatureValid: boolean; payload: Record<string, unknown>; status: string; createdAt: string }[],
    jobs: [] as { id: string; eventId: string | null; organizationId: string | null; type: string; payload: Record<string, unknown>; status: string; runAt: string; attempts: number; lastError: string | null; createdAt: string }[],
    emails: [] as { id: string; eventId: string | null; to: string; subject: string; body: string; createdAt: string }[],
    loginFailures: [] as { id: string; key: string; at: string }[],
  };
}

export const DEMO_PERSONAS = [
  { userId: "usr_ana", label: "Organizador", role: "OWNER" as Role },
  { userId: "usr_diego", label: "Staff", role: "STAFF" as Role },
  { userId: "usr_elena", label: "Sponsor", role: "SPONSOR" as Role },
  { userId: "usr_gracia", label: "Speaker", role: "SPEAKER" as Role },
  { userId: "usr_hugo", label: "Vendor", role: "VENDOR" as Role },
  { userId: "usr_ines", label: "Asistente", role: "ATTENDEE" as Role },
];
