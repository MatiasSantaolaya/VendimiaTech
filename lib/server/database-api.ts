import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { findActiveSession } from "@/lib/auth";
import { answerQuestion } from "@/lib/domain/brain";
import { toCsv } from "@/lib/domain/csv";
import { hashPassword, verifyPassword } from "@/lib/domain/password";
import type { Actor, Role } from "@/lib/domain/rbac";
import { createId, newSecret, sha256 } from "@/lib/domain/ids";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/services/audit";
import { signInWithMagicToken } from "@/lib/services/attendee-auth";
import { canManage, canOperate } from "@/lib/services/event-access";
import { refreshEventHealth } from "@/lib/services/event-health";
import { actorForDatabaseUser, databaseView } from "@/lib/server/prisma-snapshot";
import { abraTickets } from "@/lib/ticketing/abra";
import { verifyMockSignature } from "@/lib/ticketing/mock";
import { authCookieList, clientIp, cookieHeader, HttpError, json, readCookie, withCookies } from "@/lib/server/http";

const WINDOW_MS = 15 * 60 * 1000;

function pesos(value?: string) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

async function openDatabaseSession(userId: string) {
  const token = newSecret();
  const csrfToken = newSecret();
  const id = createId("ses");
  await prisma.session.create({
    data: { id, userId, tokenHash: sha256(token), csrfToken, expiresAt: new Date(Date.now() + 14 * 864e5) },
  });
  return { token, csrfToken, id };
}

async function firstSlug(userId: string) {
  const member = await prisma.eventMember.findFirst({ where: { userId }, include: { event: { select: { slug: true } } } });
  if (member) return member.event.slug;
  const org = await prisma.organizationMember.findFirst({ where: { userId } });
  if (!org) return null;
  const event = await prisma.event.findFirst({ where: { organizationId: org.organizationId }, select: { slug: true } });
  return event?.slug ?? null;
}

export async function databaseLogin(request: Request) {
  const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(await request.json());
  const email = body.email.toLowerCase();
  const key = `${email}|${clientIp(request)}`;
  const since = new Date(Date.now() - WINDOW_MS);
  const failures = await prisma.loginFailure.count({ where: { key, at: { gte: since } } });
  if (failures >= 5) return json(429, { error: { code: "RATE_LIMIT", message: "Demasiados intentos. Esperá unos minutos." } });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(body.password, user.passwordHash)) {
    await prisma.loginFailure.create({ data: { id: createId("lf"), key, at: new Date() } });
    return json(401, { error: { code: "INVALID_LOGIN", message: "Credenciales inválidas." } });
  }
  await prisma.loginFailure.deleteMany({ where: { key } });
  const session = await openDatabaseSession(user.id);
  await audit(null, user.id, "auth.login", "Session", session.id, { email });
  const slug = await firstSlug(user.id);
  return withCookies(json(200, { ok: true, slug, demo: false }), authCookieList(request, session.token, session.csrfToken, false));
}

export async function databaseAccept(request: Request) {
  const body = z.object({ token: z.string().min(4), name: z.string().min(1), password: z.string().min(8) }).parse(await request.json());
  const invite = await prisma.invitation.findUnique({ where: { tokenHash: sha256(body.token) } });
  if (!invite || invite.acceptedAt || invite.expiresAt.getTime() <= Date.now()) {
    return json(400, { error: { code: "INVITE", message: "La invitación no es válida." } });
  }
  const email = invite.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  const user = existing ?? await prisma.user.create({
    data: { id: createId("usr"), email, name: body.name, passwordHash: hashPassword(body.password) },
  });
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: invite.organizationId, userId: user.id } },
    update: { role: invite.role },
    create: { id: createId("mem"), organizationId: invite.organizationId, userId: user.id, role: invite.role },
  });
  if (invite.eventId) {
    await prisma.eventMember.upsert({
      where: { eventId_userId: { eventId: invite.eventId, userId: user.id } },
      update: { role: invite.role },
      create: { id: createId("em"), eventId: invite.eventId, userId: user.id, role: invite.role },
    });
  }
  if (invite.eventId && invite.entityType && invite.entityId) {
    await prisma.entityAccess.create({
      data: { id: createId("acc"), userId: user.id, eventId: invite.eventId, role: invite.role, entityType: invite.entityType, entityId: invite.entityId },
    });
  }
  await prisma.invitation.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
  const session = await openDatabaseSession(user.id);
  await audit(invite.eventId, user.id, "invitation.accept", "Invitation", invite.id, { email, role: invite.role });
  return withCookies(json(200, { ok: true, email, demo: false }), authCookieList(request, session.token, session.csrfToken, false));
}

export async function databaseAttendeeSignIn(request: Request) {
  const body = z.object({ token: z.string().min(4), eventId: z.string().min(1) }).parse(await request.json());
  const raw = await signInWithMagicToken(body.token, body.eventId);
  if (!raw) return json(400, { error: { code: "ATTENDEE", message: "El enlace no es válido." } });
  await audit(body.eventId, null, "attendee.signin", "AttendeeSession", sha256(body.token), {});
  return json(200, { ok: true });
}

export async function databaseWebhook(request: Request) {
  const raw = await request.text();
  const provider = request.headers.get("x-ticketing-provider") || "abra";
  const signature = request.headers.get("x-signature") || request.headers.get("x-abra-signature");
  const ok = provider === "mock" ? verifyMockSignature(raw, signature) : abraTickets.verifyWebhook(raw, signature);
  let payload: Record<string, unknown> = { raw };
  try {
    const value = JSON.parse(raw) as unknown;
    if (value && typeof value === "object") payload = value as Record<string, unknown>;
  } catch {
    payload = { raw };
  }
  await prisma.webhookEvent.create({
    data: {
      id: createId("wh"),
      provider,
      signatureValid: ok,
      payload: payload as Prisma.InputJsonValue,
      status: ok ? "ACCEPTED" : "REJECTED",
    },
  });
  if (!ok) return json(401, { error: { code: provider === "mock" ? "BAD_SIGNATURE" : "ABRA_SIGNATURE", message: "Firma inválida." } });
  return json(200, { ok: true });
}

export async function databaseWorker(request: Request) {
  const secret = process.env.WORKER_SECRET;
  if (!secret || request.headers.get("x-plane-worker-secret") !== secret) return json(401, { error: { code: "WORKER_UNAUTHORIZED", message: "Worker no autorizado." } });
  const jobs = await prisma.job.findMany({ where: { status: "PENDING", runAt: { lte: new Date() } }, take: 20, orderBy: { runAt: "asc" } });
  for (const job of jobs) {
    const payload = job.payload && typeof job.payload === "object" && !Array.isArray(job.payload) ? job.payload as Record<string, unknown> : {};
    if (job.type === "EMAIL") {
      await prisma.outboundEmail.create({
        data: {
          id: createId("em"),
          eventId: job.eventId,
          toAddress: typeof payload.to === "string" ? payload.to : "",
          subject: typeof payload.subject === "string" ? payload.subject : "",
          body: typeof payload.body === "string" ? payload.body : "",
        },
      });
    }
    await prisma.job.update({ where: { id: job.id }, data: { status: "DONE", attempts: { increment: 1 }, lastError: null } });
  }
  return json(200, { ok: true, processed: jobs.length });
}

async function createModule(actorId: string, eventId: string, role: Role, resource: string, data: Record<string, string>) {
  const manage = canManage(role);
  const operate = canOperate(role);
  if (resource === "task" || resource === "incident") {
    if (!operate) return { error: "No podés crear este recurso." };
  } else if (!manage) return { error: "No podés crear este recurso." };
  const id = createId(resource.slice(0, 3));
  if (resource === "task") {
    const row = await prisma.task.create({ data: { id, eventId, title: data.title || "Sin título", assigneeId: data.assigneeId || null, dueAt: data.dueAt ? new Date(data.dueAt) : null } });
    await audit(eventId, actorId, "task.create", "Task", row.id, { title: row.title });
  } else if (resource === "incident") {
    const row = await prisma.incident.create({ data: { id, eventId, title: data.title || "Incidente", severity: (data.severity || "medium").toLowerCase(), assigneeId: actorId } });
    await audit(eventId, actorId, "incident.create", "Incident", row.id, { title: row.title });
  } else if (resource === "expense") {
    const row = await prisma.expense.create({ data: { id, eventId, description: data.description || "Gasto", amountCents: pesos(data.amount) } });
    await audit(eventId, actorId, "expense.create", "Expense", row.id, { description: row.description });
  } else if (resource === "revenue") {
    const row = await prisma.revenue.create({ data: { id, eventId, type: (data.type || "OTHER").toUpperCase(), description: data.description || "", amountCents: pesos(data.amount) } });
    await audit(eventId, actorId, "revenue.create", "Revenue", row.id, { type: row.type });
  } else if (resource === "sponsor") {
    const row = await prisma.sponsorDeal.create({ data: { id, eventId, companyName: data.companyName || "Sponsor", amountCents: pesos(data.amount) } });
    await audit(eventId, actorId, "sponsor.create", "Sponsor", row.id, { companyName: row.companyName });
  } else if (resource === "speaker") {
    const row = await prisma.speaker.create({ data: { id, eventId, personName: data.personName || "Speaker", email: data.email || "", company: data.company || "" } });
    await audit(eventId, actorId, "speaker.create", "Speaker", row.id, { personName: row.personName });
  } else if (resource === "vendor") {
    const row = await prisma.vendor.create({ data: { id, eventId, name: data.name || "Vendor", category: data.category || "", amountCents: pesos(data.amount) } });
    await audit(eventId, actorId, "vendor.create", "Vendor", row.id, { name: row.name });
  } else if (resource === "session") {
    const row = await prisma.programSession.create({ data: { id, eventId, title: data.title || "Sesión", startAt: data.startAt ? new Date(data.startAt) : null, status: "DRAFT" } });
    await audit(eventId, actorId, "session.create", "ProgramSession", row.id, { title: row.title });
  } else if (resource === "campaign") {
    const row = await prisma.campaign.create({ data: { id, eventId, name: data.name || "Campaña", channel: data.channel || "", budgetCents: pesos(data.budget) } });
    await audit(eventId, actorId, "campaign.create", "Campaign", row.id, { name: row.name });
  } else if (resource === "ros") {
    const row = await prisma.runOfShowItem.create({ data: { id, eventId, title: data.title || "Hito", startAt: data.startAt ? new Date(data.startAt) : null, area: data.area || "", location: data.location || "", ownerId: actorId } });
    await audit(eventId, actorId, "ros.create", "RunOfShowItem", row.id, { title: row.title });
  } else return { error: "Recurso desconocido." };
  await refreshEventHealth(eventId);
  return { id };
}

export async function handleDatabaseApi(request: Request, parts: string[], method: string) {
  if (parts[0] === "auth" && parts[1] === "attendee" && method === "POST") return databaseAttendeeSignIn(request);
  const token = readCookie(request, "plane_session");
  const current = await findActiveSession(token);
  if (parts[0] === "auth" && parts[1] === "logout" && method === "POST") {
    if (current) await prisma.session.update({ where: { id: current.id }, data: { revokedAt: new Date() } });
    return withCookies(json(200, { ok: true }), [cookieHeader("plane_session", "", request, true, 0), cookieHeader("plane_csrf", "", request, false, 0)]);
  }
  if (parts[0] === "auth" && parts[1] === "session" && method === "GET") {
    if (!current) return json(401, { error: { code: "UNAUTHENTICATED", message: "No hay sesión." } });
    return json(200, { user: { id: current.user.id, name: current.user.name, email: current.user.email }, demo: false });
  }
  if (!current) return json(401, { error: { code: "UNAUTHENTICATED", message: "No hay sesión." } });
  if (method !== "GET" && parts[0] !== "demo") {
    const modules = parts[0] === "events" && parts[2] === "modules";
    if (!modules && request.headers.get("x-csrf-token") !== current.csrfToken) throw new HttpError(403, "CSRF", "Token CSRF inválido.");
  }
  if (parts[0] === "demo") return json(403, { error: { code: "DEMO_ONLY", message: "El cambio de perfil es solo de la demo." } });
  if (parts[0] !== "events" || !parts[1]) return json(404, { error: { code: "NOT_FOUND", message: "Ruta no encontrada" } });
  const actor = await actorForDatabaseUser(current.user.id);
  if (!actor) return json(401, { error: { code: "UNAUTHENTICATED", message: "No hay sesión." } });
  return databaseEventRoute(request, actor, parts.slice(1), method);
}

async function databaseEventRoute(request: Request, actor: Actor, parts: string[], method: string) {
  const eventId = parts[0];
  const loaded = await databaseView(actor, eventId);
  if (loaded.status !== 200) return json(loaded.status, { error: { code: loaded.status === 404 ? "NOT_FOUND" : "TENANT_FORBIDDEN", message: loaded.message } });
  const { access, view } = loaded;
  const sub = parts[1];
  const id = parts[2];
  const role = access.role as Role;
  if (!sub && method === "GET") {
    return json(200, { event: { id: view.event.id, name: view.event.name, slug: view.event.slug, organizationId: view.event.organizationId } });
  }
  if (sub === "finance" && method === "GET") {
    if (!canManage(access.role)) return json(403, { error: { code: "FORBIDDEN", message: "No tenés acceso a finanzas." } });
    return json(200, { finance: view.finance });
  }
  if (sub === "modules" && method === "POST") {
    const body = z.object({ resource: z.string() }).passthrough().parse(await request.json()) as { resource: string } & Record<string, string>;
    const { resource, ...rest } = body;
    const created = await createModule(actor.userId, eventId, role, resource, rest);
    if ("error" in created) return json(403, { error: { code: "FORBIDDEN", message: created.error } });
    return json(201, { ok: true, id: created.id });
  }
  if (sub === "tasks" && id && method === "PATCH") {
    if (!canOperate(access.role)) return json(403, { error: { code: "FORBIDDEN", message: "No podés editar tareas." } });
    const task = await prisma.task.findFirst({ where: { id, eventId } });
    if (!task) return json(404, { error: { code: "NOT_FOUND", message: "Tarea no encontrada" } });
    const body = z.object({ status: z.string().optional(), priority: z.string().optional(), approvalStatus: z.string().optional() }).parse(await request.json());
    await prisma.task.update({ where: { id }, data: body });
    await audit(eventId, actor.userId, "task.update", "Task", id, { before: task.status, after: body.status ?? task.status });
    await refreshEventHealth(eventId);
    return json(200, { ok: true });
  }
  if (sub === "tasks" && id === "bulk" && method === "POST") {
    if (!canOperate(access.role)) return json(403, { error: { code: "FORBIDDEN", message: "No podés editar tareas." } });
    const body = z.object({ ids: z.array(z.string()), status: z.string() }).parse(await request.json());
    await prisma.task.updateMany({ where: { eventId, id: { in: body.ids } }, data: { status: body.status } });
    await audit(eventId, actor.userId, "task.bulk", "Task", eventId, { ids: body.ids, status: body.status });
    await refreshEventHealth(eventId);
    return json(200, { ok: true });
  }
  if (sub === "incidents" && id && method === "PATCH") {
    if (!canOperate(access.role)) return json(403, { error: { code: "FORBIDDEN", message: "No podés editar incidentes." } });
    const incident = await prisma.incident.findFirst({ where: { id, eventId } });
    if (!incident) return json(404, { error: { code: "NOT_FOUND", message: "Incidente no encontrado" } });
    const body = z.object({ status: z.string() }).parse(await request.json());
    const resolved = body.status === "resolved" || body.status === "closed";
    await prisma.incident.update({ where: { id }, data: { status: body.status, resolvedAt: resolved ? new Date() : incident.resolvedAt } });
    await audit(eventId, actor.userId, "incident.update", "Incident", id, { before: incident.status, after: body.status });
    await refreshEventHealth(eventId);
    return json(200, { ok: true });
  }
  if (sub === "brain" && id === "confirm" && method === "POST") {
    if (!canOperate(access.role)) return json(403, { error: { code: "FORBIDDEN", message: "No podés confirmar cambios." } });
    const body = z.object({ type: z.enum(["COMPLETE_TASK", "RESOLVE_INCIDENT"]), taskId: z.string().optional(), incidentId: z.string().optional(), confirm: z.literal(true) }).parse(await request.json());
    if (body.type === "COMPLETE_TASK" && body.taskId) {
      await prisma.task.updateMany({ where: { id: body.taskId, eventId }, data: { status: "DONE" } });
      await audit(eventId, actor.userId, "task.update", "Task", body.taskId, { after: "DONE", confirmed: true });
    }
    if (body.type === "RESOLVE_INCIDENT" && body.incidentId) {
      await prisma.incident.updateMany({ where: { id: body.incidentId, eventId }, data: { status: "resolved", resolvedAt: new Date() } });
      await audit(eventId, actor.userId, "incident.update", "Incident", body.incidentId, { after: "resolved", confirmed: true });
    }
    await refreshEventHealth(eventId);
    return json(200, { ok: true });
  }
  if (sub === "brain" && method === "POST") {
    if (!canManage(access.role) && !canOperate(access.role)) return json(403, { error: { code: "FORBIDDEN", message: "No podés consultar el cerebro del evento." } });
    const body = z.object({ question: z.string().min(1) }).parse(await request.json());
    const answer = answerQuestion(body.question, view.brainContext);
    return json(200, { ...answer, mutated: false });
  }
  if (sub === "ticketing" && id === "sync" && method === "POST") {
    if (!canManage(access.role)) return json(403, { error: { code: "FORBIDDEN", message: "No podés sincronizar." } });
    const connection = await prisma.ticketingConnection.findUnique({ where: { eventId } });
    if (connection) {
      await prisma.ticketingConnection.update({ where: { id: connection.id }, data: { status: "CONNECTED", lastError: null, lastSyncAt: new Date() } });
      await prisma.syncLog.create({ data: { id: createId("sl"), eventId, connectionId: connection.id, direction: "PULL", status: "OK", message: "Mock Abra reconcilió con un código remoto extra (ABRA-EXTRA-1).", attempt: 1 } });
    }
    await audit(eventId, actor.userId, "ticketing.sync", "TicketingConnection", connection?.id ?? eventId, { provider: "mock" });
    return json(200, { ok: true, provider: "mock" });
  }
  if (sub === "ticketing" && id === "probe" && method === "POST") {
    try {
      await abraTickets.syncEvent("unconfigured");
      return json(200, { ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Abra no configurado";
      return json(409, { error: { code: "ABRA_NOT_CONFIGURED", message } });
    }
  }
  if (sub === "export" && method === "GET") {
    if (!canManage(access.role)) return json(403, { error: { code: "FORBIDDEN", message: "No podés exportar." } });
    const kind = new URL(request.url).searchParams.get("kind") || "tasks";
    const rows = kind === "finance" ? view.expenses.map((row) => ({ description: row.description, amountCents: row.amountCents, status: row.status })) : view.tasks.map((row) => ({ title: row.title, status: row.status, priority: row.priority }));
    return new Response(toCsv(rows), { status: 200, headers: { "content-type": "text/csv; charset=utf-8" } });
  }
  if (sub === "report" && method === "GET") {
    if (!canManage(access.role)) return json(403, { error: { code: "FORBIDDEN", message: "No podés ver el informe." } });
    const text = [`# ${view.event.name}`, `Salud oficial: ${view.official}`, `Entradas: ${view.kpis.ticketsSold}`, `Margen neto (centavos): ${view.finance?.netMarginCents ?? "s/d"}`, `Bloqueos: ${view.graph.blockers.length}`].join("\n");
    return new Response(text, { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  if (sub === "check-in" && method === "POST") {
    if (!canOperate(access.role)) return json(403, { error: { code: "FORBIDDEN", message: "No podés acreditar." } });
    const body = z.object({ code: z.string() }).parse(await request.json());
    const ticket = await prisma.ticket.findFirst({ where: { eventId, code: body.code } });
    if (!ticket) return json(404, { error: { code: "NOT_FOUND", message: "Entrada no encontrada" } });
    await prisma.ticket.update({ where: { id: ticket.id }, data: { status: "CHECKED_IN", checkedInAt: new Date() } });
    await audit(eventId, actor.userId, "ticket.checkin", "Ticket", ticket.id, { code: body.code });
    return json(200, { ok: true });
  }
  if (sub === "networking" && method === "POST") {
    const from = actor.access.find((row) => row.entityType === "ATTENDEE" && row.eventId === eventId);
    if (!from) return json(403, { error: { code: "FORBIDDEN", message: "Solo un asistente puede pedir conexión." } });
    const body = z.object({ toAttendeeId: z.string() }).parse(await request.json());
    const row = await prisma.connectionRequest.create({ data: { id: createId("con"), eventId, fromAttendeeId: from.entityId, toAttendeeId: body.toAttendeeId, status: "PENDING" } });
    await audit(eventId, actor.userId, "connection.request", "ConnectionRequest", row.id, {});
    return json(201, { ok: true });
  }
  if (sub === "polls" && id && parts[3] === "vote" && method === "POST") {
    const from = actor.access.find((row) => row.entityType === "ATTENDEE" && row.eventId === eventId);
    if (!from) return json(403, { error: { code: "FORBIDDEN", message: "Solo un asistente vota." } });
    const body = z.object({ optionIndex: z.number().int().min(0) }).parse(await request.json());
    const vote = await prisma.pollVote.create({ data: { id: createId("vote"), eventId, pollId: id, attendeeId: from.entityId, optionIndex: body.optionIndex } });
    await prisma.gamificationPoint.create({ data: { id: createId("pt"), eventId, attendeeId: from.entityId, reason: "Voto en encuesta", points: 2 } });
    await audit(eventId, actor.userId, "poll.vote", "PollVote", vote.id, { pollId: id });
    return json(201, { ok: true });
  }
  return json(404, { error: { code: "NOT_FOUND", message: "Ruta no encontrada" } });
}
