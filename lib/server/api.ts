import { z } from "zod";
import { answerQuestion } from "@/lib/domain/brain";
import { toCsv } from "@/lib/domain/csv";
import { EVENT_SLUG } from "@/lib/demo/build";
import type { Actor } from "@/lib/domain/rbac";
import { acceptInvite, actorFromToken, createModule, financeFor, getDemoState, loginDemo, openSession, patchIncident, patchTask, requireEvent, revokeToken, runJobs, viewAs } from "@/lib/demo/store";
import { buildEventView } from "@/lib/server/view";
import { abraTickets } from "@/lib/ticketing/abra";
import { verifyMockSignature } from "@/lib/ticketing/mock";
import { createMonitoring } from "@/lib/monitoring";
import { createRateLimiter } from "@/lib/rate-limit";
import { databaseAccept, databaseLogin, databaseWebhook, databaseWorker, handleDatabaseApi } from "@/lib/server/database-api";
import { authCookieList, assertSameOrigin, clientIp, cookieHeader, HttpError, json, readCookie, withCookies } from "@/lib/server/http";
import { hasDatabase, isDemoMode } from "@/lib/server/mode";

const limiter = createRateLimiter();
const monitor = createMonitoring();

function fail(error: unknown) {
  if (error instanceof HttpError) return json(error.status, { error: { code: error.code, message: error.message } });
  if (error instanceof z.ZodError) return json(400, { error: { code: "VALIDATION", message: "Datos inválidos" } });
  const message = error instanceof Error ? error.message : "Error interno";
  if (message.startsWith("Abra") || message.includes("NOT_CONFIGURED") || message.includes("not configured")) {
    return json(409, { error: { code: "NOT_CONFIGURED", message } });
  }
  void monitor.capture({ level: "error", message });
  return json(500, { error: { code: "INTERNAL", message: "Error interno" } });
}

export async function handleApi(request: Request) {
  try {
    const ip = clientIp(request);
    const limit = await limiter.hit(`api:${ip}`, 180, 60_000);
    if (!limit.ok) return json(429, { error: { code: "RATE_LIMIT", message: "Demasiadas solicitudes." } });
    const url = new URL(request.url);
    const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
    const method = request.method.toUpperCase();
    const demo = isDemoMode(readCookie(request, "plane_demo"));
    if (method === "GET" && parts[0] === "health") {
      return json(200, { ok: true, service: "plane", mode: demo ? "demo" : "database", demoReady: true });
    }
    if (parts[0] === "ticketing" && parts[1] === "webhook" && method === "POST") return demo ? webhook(request) : databaseWebhook(request);
    if (parts[0] === "internal" && parts[1] === "worker" && method === "POST") return demo ? worker(request) : databaseWorker(request);
    if (method !== "GET" && method !== "HEAD") assertSameOrigin(request);
    if (parts[0] === "auth" && parts[1] === "login" && method === "POST") {
      if (!hasDatabase()) return login(request, getDemoState(), ip);
      return databaseLogin(request);
    }
    if (parts[0] === "auth" && parts[1] === "invitations" && parts[2] === "accept" && method === "POST") {
      if (!hasDatabase()) return accept(request, getDemoState());
      return databaseAccept(request);
    }
    if (!demo) return handleDatabaseApi(request, parts, method);
    const state = getDemoState();
    const token = readCookie(request, "plane_session");
    const current = actorFromToken(state, token);
    if (parts[0] === "auth" && parts[1] === "logout" && method === "POST") {
      if (token) revokeToken(state, token);
      return withCookies(json(200, { ok: true }), [cookieHeader("plane_session", "", request, true), cookieHeader("plane_csrf", "", request, false)]);
    }
    if (parts[0] === "auth" && parts[1] === "session" && method === "GET") {
      if (!current) return json(401, { error: { code: "UNAUTHENTICATED", message: "No hay sesión." } });
      return json(200, { user: { id: current.actor.userId, name: current.actor.name, email: current.actor.email } });
    }
    if (!current) return json(401, { error: { code: "UNAUTHENTICATED", message: "No hay sesión." } });
    if (method !== "GET" && parts[0] !== "demo") {
      const csrf = request.headers.get("x-csrf-token");
      const modules = parts[0] === "events" && parts[2] === "modules";
      if (!modules && csrf !== current.session.csrfToken) throw new HttpError(403, "CSRF", "Token CSRF inválido.");
    }
    if (parts[0] === "demo" && parts[1] === "view-as" && method === "POST") {
      if (readCookie(request, "plane_demo") !== "1") throw new HttpError(403, "DEMO_ONLY", "El cambio de perfil es solo de la demo.");
      const body = z.object({ userId: z.string() }).parse(await request.json());
      const next = viewAs(state, current.actor, body.userId);
      if ("error" in next && next.error) return json(next.error.status, { error: { code: "FORBIDDEN", message: next.error.message } });
      if (!("token" in next)) return json(403, { error: { code: "FORBIDDEN", message: "No se pudo cambiar el perfil." } });
      return withCookies(json(200, { ok: true }), [cookieHeader("plane_session", next.token, request, true), cookieHeader("plane_csrf", next.csrfToken, request, false), cookieHeader("plane_demo", "1", request, true)]);
    }
    if (parts[0] === "events" && parts[1]) return eventRoute(request, state, current.actor, current.session.csrfToken, parts.slice(1), method);
    return json(404, { error: { code: "NOT_FOUND", message: "Ruta no encontrada" } });
  } catch (error) {
    return fail(error);
  }
}

async function login(request: Request, state: ReturnType<typeof getDemoState>, ip: string) {
  const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(await request.json());
  const result = loginDemo(state, body.email, body.password, ip);
  if (!result.ok) return json(result.status, { error: { code: result.status === 429 ? "RATE_LIMIT" : "INVALID_LOGIN", message: result.error } });
  const event = state.events.find((row) => row.organizationId === "org_vendimia") ?? state.events[0];
  return withCookies(json(200, { ok: true, slug: event?.slug ?? EVENT_SLUG, demo: true }), authCookieList(request, result.token, result.csrfToken, true));
}

async function accept(request: Request, state: ReturnType<typeof getDemoState>) {
  const body = z.object({ token: z.string().min(4), name: z.string().min(1), password: z.string().min(8) }).parse(await request.json());
  const result = acceptInvite(state, body.token, body.name, body.password);
  if ("error" in result && result.error) return json(result.error.status, { error: { code: "INVITE", message: result.error.message } });
  if (!("token" in result)) return json(400, { error: { code: "INVITE", message: "No se pudo aceptar." } });
  return withCookies(json(200, { ok: true, email: result.email, demo: true }), authCookieList(request, result.token, result.csrfToken, true));
}

function worker(request: Request) {
  const secret = process.env.WORKER_SECRET;
  if (!secret || request.headers.get("x-plane-worker-secret") !== secret) return json(401, { error: { code: "WORKER_UNAUTHORIZED", message: "Worker no autorizado." } });
  const count = runJobs(getDemoState());
  return json(200, { ok: true, processed: count });
}

async function webhook(request: Request) {
  const raw = await request.text();
  const provider = request.headers.get("x-ticketing-provider") || "abra";
  const signature = request.headers.get("x-signature") || request.headers.get("x-abra-signature");
  const state = getDemoState();
  if (provider === "mock") {
    const ok = verifyMockSignature(raw, signature);
    state.webhooks.push({ id: `wh_${Date.now()}`, eventId: null, provider: "mock", signatureValid: ok, payload: safeJson(raw), status: ok ? "ACCEPTED" : "REJECTED", createdAt: new Date().toISOString() });
    if (!ok) return json(401, { error: { code: "BAD_SIGNATURE", message: "Firma inválida." } });
    return json(200, { ok: true });
  }
  const ok = abraTickets.verifyWebhook(raw, signature);
  state.webhooks.push({ id: `wh_${Date.now()}`, eventId: null, provider: "abra", signatureValid: ok, payload: safeJson(raw), status: ok ? "ACCEPTED" : "REJECTED", createdAt: new Date().toISOString() });
  if (!ok) return json(401, { error: { code: "ABRA_SIGNATURE", message: "Firma de Abra rechazada. El secreto no está configurado o no coincide. Ver docs/INTEGRATIONS.md." } });
  return json(200, { ok: true });
}

function safeJson(raw: string): Record<string, unknown> {
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === "object" ? (value as Record<string, unknown>) : { raw };
  } catch {
    return { raw };
  }
}

async function eventRoute(request: Request, state: ReturnType<typeof getDemoState>, actor: Actor, csrf: string, parts: string[], method: string) {
  void csrf;
  const eventId = parts[0];
  const gate = requireEvent(state, actor, eventId);
  if (gate.error) return json(gate.error.status, { error: { code: gate.error.status === 403 ? "TENANT_FORBIDDEN" : "NOT_FOUND", message: gate.error.message } });
  const sub = parts[1];
  const id = parts[2];
  if (!sub && method === "GET") return json(200, { event: { id: gate.event?.id, name: gate.event?.name, slug: gate.event?.slug, organizationId: gate.event?.organizationId } });
  if (sub === "finance" && method === "GET") {
    const money = financeFor(state, actor, eventId);
    if ("error" in money && money.error) return json(money.error.status, { error: { code: "FORBIDDEN", message: money.error.message } });
    const view = buildEventView(state, actor, eventId);
    return json(200, { finance: view && !view.forbidden ? view.finance : null });
  }
  if (sub === "modules" && method === "POST") {
    const body = z.object({ resource: z.string() }).passthrough().parse(await request.json()) as { resource: string } & Record<string, string>;
    const { resource, ...rest } = body;
    const created = createModule(state, actor, eventId, resource, rest);
    if ("error" in created && created.error) return json(created.error.status, { error: { code: "FORBIDDEN", message: created.error.message } });
    return json(201, { ok: true, id: "row" in created ? created.row.id : null });
  }
  if (sub === "tasks" && id && method === "PATCH") {
    const body = z.object({ status: z.string().optional(), priority: z.string().optional(), approvalStatus: z.string().optional() }).parse(await request.json());
    const updated = patchTask(state, actor, eventId, id, body);
    if ("error" in updated && updated.error) return json(updated.error.status, { error: { code: "FORBIDDEN", message: updated.error.message } });
    return json(200, { ok: true });
  }
  if (sub === "tasks" && id === "bulk" && method === "POST") {
    const body = z.object({ ids: z.array(z.string()), status: z.string() }).parse(await request.json());
    for (const taskId of body.ids) patchTask(state, actor, eventId, taskId, { status: body.status });
    return json(200, { ok: true });
  }
  if (sub === "incidents" && id && method === "PATCH") {
    const body = z.object({ status: z.string() }).parse(await request.json());
    const updated = patchIncident(state, actor, eventId, id, body.status);
    if ("error" in updated && updated.error) return json(updated.error.status, { error: { code: "FORBIDDEN", message: updated.error.message } });
    return json(200, { ok: true });
  }
  if (sub === "brain" && id === "confirm" && method === "POST") {
    const view = buildEventView(state, actor, eventId);
    if (!view || view.forbidden || !view.operate) return json(403, { error: { code: "FORBIDDEN", message: "No podés confirmar cambios." } });
    const body = z.object({ type: z.enum(["COMPLETE_TASK", "RESOLVE_INCIDENT"]), taskId: z.string().optional(), incidentId: z.string().optional(), confirm: z.literal(true) }).parse(await request.json());
    if (body.type === "COMPLETE_TASK" && body.taskId) patchTask(state, actor, eventId, body.taskId, { status: "DONE" });
    if (body.type === "RESOLVE_INCIDENT" && body.incidentId) patchIncident(state, actor, eventId, body.incidentId, "resolved");
    return json(200, { ok: true });
  }
  if (sub === "brain" && method === "POST") {
    const view = buildEventView(state, actor, eventId);
    if (!view || view.forbidden || !view.manage && !view.operate) return json(403, { error: { code: "FORBIDDEN", message: "No podés consultar el cerebro del evento." } });
    const body = z.object({ question: z.string().min(1) }).parse(await request.json());
    const before = state.tasks.map((row) => row.status).join(",");
    const answer = answerQuestion(body.question, view.brainContext);
    const after = state.tasks.map((row) => row.status).join(",");
    return json(200, { ...answer, mutated: before !== after });
  }
  if (sub === "ticketing" && id === "sync" && method === "POST") {
    if (!buildEventView(state, actor, eventId)?.manage) return json(403, { error: { code: "FORBIDDEN", message: "No podés sincronizar." } });
    const connection = state.ticketing.find((row) => row.eventId === eventId);
    if (connection) {
      connection.status = "CONNECTED";
      connection.lastError = null;
      connection.lastSyncAt = new Date().toISOString();
      state.syncLogs.unshift({ id: `sl_${Date.now()}`, eventId, connectionId: connection.id, direction: "PULL", status: "OK", message: "Mock Abra reconcilió con un código remoto extra (ABRA-EXTRA-1).", attempt: 1, createdAt: new Date().toISOString() });
    }
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
    const view = buildEventView(state, actor, eventId);
    if (!view || view.forbidden || !view.manage) return json(403, { error: { code: "FORBIDDEN", message: "No podés exportar." } });
    const kind = new URL(request.url).searchParams.get("kind") || "tasks";
    const rows = kind === "finance" ? view.expenses.map((row) => ({ description: row.description, amountCents: row.amountCents, status: row.status })) : view.tasks.map((row) => ({ title: row.title, status: row.status, priority: row.priority }));
    return new Response(toCsv(rows), { status: 200, headers: { "content-type": "text/csv; charset=utf-8" } });
  }
  if (sub === "report" && method === "GET") {
    const view = buildEventView(state, actor, eventId);
    if (!view || view.forbidden || !view.manage) return json(403, { error: { code: "FORBIDDEN", message: "No podés ver el informe." } });
    const text = [`# ${view.event.name}`, `Salud oficial: ${view.official}`, `Entradas: ${view.kpis.ticketsSold}`, `Margen neto (centavos): ${view.finance?.netMarginCents ?? "s/d"}`, `Bloqueos: ${view.graph.blockers.length}`].join("\n");
    return new Response(text, { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  if (sub === "check-in" && method === "POST") {
    const view = buildEventView(state, actor, eventId);
    if (!view || view.forbidden || !view.operate) return json(403, { error: { code: "FORBIDDEN", message: "No podés acreditar." } });
    const body = z.object({ code: z.string() }).parse(await request.json());
    const ticket = state.tickets.find((row) => row.eventId === eventId && row.code === body.code);
    if (!ticket) return json(404, { error: { code: "NOT_FOUND", message: "Entrada no encontrada" } });
    ticket.status = "CHECKED_IN";
    ticket.checkedInAt = new Date().toISOString();
    return json(200, { ok: true });
  }
  if (sub === "networking" && method === "POST") {
    const body = z.object({ toAttendeeId: z.string() }).parse(await request.json());
    const from = actor.access.find((row) => row.entityType === "ATTENDEE" && row.eventId === eventId);
    if (!from) return json(403, { error: { code: "FORBIDDEN", message: "Solo un asistente puede pedir conexión." } });
    state.connections.unshift({ id: `con_${Date.now()}`, eventId, fromAttendeeId: from.entityId, toAttendeeId: body.toAttendeeId, status: "PENDING", createdAt: new Date().toISOString() });
    return json(201, { ok: true });
  }
  if (sub === "polls" && id && parts[3] === "vote" && method === "POST") {
    const from = actor.access.find((row) => row.entityType === "ATTENDEE" && row.eventId === eventId);
    if (!from) return json(403, { error: { code: "FORBIDDEN", message: "Solo un asistente vota." } });
    const body = z.object({ optionIndex: z.number().int().min(0) }).parse(await request.json());
    state.pollVotes.push({ id: `vote_${Date.now()}`, eventId, pollId: id, attendeeId: from.entityId, optionIndex: body.optionIndex });
    state.points.push({ id: `pt_${Date.now()}`, eventId, attendeeId: from.entityId, reason: "Voto en encuesta", points: 2, createdAt: new Date().toISOString() });
    return json(201, { ok: true });
  }
  return json(404, { error: { code: "NOT_FOUND", message: "Ruta no encontrada" } });
}

export function enterDemo(request: Request) {
  const state = getDemoState();
  const session = openSession(state, "usr_ana");
  return { session, slug: EVENT_SLUG, request };
}
