import { buildDemoState, DEMO_INVITE, DEMO_PERSONAS, type DemoState } from "@/lib/demo/build";
import { createId, newSecret, sha256 } from "@/lib/domain/ids";
import { hashPassword, verifyPassword } from "@/lib/domain/password";
import { canAccessEvent, canManageRole, canOperateRole, canReadFinance, roleForEvent, type Actor, type Role } from "@/lib/domain/rbac";

const globalState = globalThis as unknown as { planeDemo?: DemoState };

export function getDemoState() {
  if (!globalState.planeDemo) globalState.planeDemo = buildDemoState();
  return globalState.planeDemo;
}

export function resetDemoStore() {
  globalState.planeDemo = buildDemoState();
  return globalState.planeDemo;
}

export function actorFor(state: DemoState, userId: string): Actor | null {
  const user = state.users.find((row) => row.id === userId);
  if (!user) return null;
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    memberships: state.memberships.filter((row) => row.userId === userId).map((row) => ({ organizationId: row.organizationId, role: row.role })),
    eventRoles: state.eventMembers.filter((row) => row.userId === userId).map((row) => ({ eventId: row.eventId, role: row.role })),
    access: state.access.filter((row) => row.userId === userId),
  };
}

export function actorFromToken(state: DemoState, token: string | null) {
  if (!token) return null;
  const session = state.sessions.find((row) => row.tokenHash === sha256(token) && !row.revokedAt && new Date(row.expiresAt).getTime() > Date.now());
  if (!session) return null;
  const actor = actorFor(state, session.userId);
  return actor ? { actor, session } : null;
}

export function openSession(state: DemoState, userId: string) {
  const token = newSecret();
  const csrfToken = newSecret();
  state.sessions.push({
    id: createId("ses"),
    userId,
    tokenHash: sha256(token),
    csrfToken,
    expiresAt: new Date(Date.now() + 14 * 864e5).toISOString(),
    revokedAt: null,
  });
  return { token, csrfToken };
}

export function revokeToken(state: DemoState, token: string) {
  const session = state.sessions.find((row) => row.tokenHash === sha256(token));
  if (session) session.revokedAt = new Date().toISOString();
}

function audit(state: DemoState, eventId: string, actorId: string, action: string, entityType: string, entityId: string, metadata?: unknown) {
  state.audits.unshift({ id: createId("aud"), eventId, actorId, action, entityType, entityId, metadata: metadata && typeof metadata === "object" ? metadata as Record<string, unknown> : null, createdAt: new Date().toISOString() });
}

function notify(state: DemoState, eventId: string, userId: string, type: string, title: string, body: string, entityType: string, entityId: string) {
  state.notifications.unshift({ id: createId("nt"), eventId, userId, type, title, body, readAt: null, createdAt: new Date().toISOString(), entityType, entityId });
  state.jobs.push({
    id: createId("job"),
    eventId,
    organizationId: state.events.find((event) => event.id === eventId)?.organizationId ?? null,
    type: "EMAIL",
    payload: { to: state.users.find((user) => user.id === userId)?.email ?? "", subject: title, body },
    status: "PENDING",
    runAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
    createdAt: new Date().toISOString(),
  });
}

export function recentFailures(state: DemoState, key: string, sinceMs: number) {
  const cutoff = Date.now() - sinceMs;
  return state.loginFailures.filter((row) => row.key === key && new Date(row.at).getTime() >= cutoff).length;
}

export function loginDemo(state: DemoState, email: string, password: string, ip: string) {
  const key = `${email.toLowerCase()}|${ip}`;
  if (recentFailures(state, key, 15 * 60 * 1000) >= 5) return { ok: false as const, status: 429, error: "Demasiados intentos. Esperá unos minutos." };
  const user = state.users.find((row) => row.email === email.toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) {
    state.loginFailures.push({ id: createId("lf"), key, at: new Date().toISOString() });
    return { ok: false as const, status: 401, error: "Credenciales inválidas." };
  }
  state.loginFailures = state.loginFailures.filter((row) => row.key !== key);
  const session = openSession(state, user.id);
  return { ok: true as const, ...session, userId: user.id };
}

export function requireEvent(state: DemoState, actor: Actor, eventId: string) {
  const event = state.events.find((row) => row.id === eventId);
  if (!event) return { error: { status: 404, message: "Evento no encontrado" } };
  if (!canAccessEvent(actor, event)) return { error: { status: 403, message: "No tenés acceso a este evento." } };
  return { event, role: roleForEvent(actor, event) as Role };
}

export function createModule(state: DemoState, actor: Actor, eventId: string, resource: string, data: Record<string, string>) {
  const gate = requireEvent(state, actor, eventId);
  if (gate.error || !gate.role) return gate;
  const manage = canManageRole(gate.role);
  const operate = canOperateRole(gate.role);
  const now = new Date().toISOString();
  const pesos = (value?: string) => {
    const n = Number(String(value ?? "").replace(",", "."));
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  };
  if (resource === "task") {
    if (!operate) return { error: { status: 403, message: "No podés crear tareas." } };
    const row = { id: createId("tsk"), eventId, parentId: null, title: data.title || "Sin título", description: "", status: "TODO", priority: "MEDIUM", assigneeId: data.assigneeId || null, dueAt: data.dueAt || null, checklist: [], approvalStatus: null, createdAt: now };
    state.tasks.unshift(row);
    audit(state, eventId, actor.userId, "task.create", "Task", row.id, { title: row.title });
    if (row.assigneeId) notify(state, eventId, row.assigneeId, "TASK_ASSIGNED", "Tarea asignada", row.title, "Task", row.id);
    return { row };
  }
  if (resource === "incident") {
    if (!operate) return { error: { status: 403, message: "No podés crear incidentes." } };
    const severity = (data.severity || "medium").toLowerCase();
    const row = { id: createId("inc"), eventId, title: data.title || "Incidente", description: "", status: "open", severity, zoneId: null, assigneeId: actor.userId, createdAt: now, resolvedAt: null };
    state.incidents.unshift(row);
    audit(state, eventId, actor.userId, "incident.create", "Incident", row.id, { title: row.title });
    notify(state, eventId, actor.userId, severity === "critical" ? "INCIDENT_CRITICAL" : "INCIDENT_CREATED", "Incidente", row.title, "Incident", row.id);
    return { row };
  }
  if (!manage) return { error: { status: 403, message: "No podés crear este recurso." } };
  if (resource === "expense") {
    const row = { id: createId("exp"), eventId, categoryId: null, vendorId: null, description: data.description || "Gasto", amountCents: pesos(data.amount), status: "PLANNED", direct: false, incurredAt: now };
    state.expenses.unshift(row);
    audit(state, eventId, actor.userId, "expense.create", "Expense", row.id, row);
    return { row };
  }
  if (resource === "revenue") {
    const row = { id: createId("rev"), eventId, type: (data.type || "OTHER").toUpperCase(), description: data.description || "", amountCents: pesos(data.amount), sponsorId: null, receivedAt: now };
    state.revenues.unshift(row);
    audit(state, eventId, actor.userId, "revenue.create", "Revenue", row.id, row);
    return { row };
  }
  if (resource === "sponsor") {
    const row = { id: createId("spo"), eventId, companyName: data.companyName || "Sponsor", tier: "PLATA", status: "PROSPECT", contactEmail: "", amountCents: pesos(data.amount), notes: "" };
    state.deals.unshift(row);
    audit(state, eventId, actor.userId, "sponsor.create", "Sponsor", row.id, row);
    return { row };
  }
  if (resource === "speaker") {
    const row = { id: createId("spk"), eventId, personName: data.personName || "Speaker", email: data.email || "", company: data.company || "", bio: "", status: "INVITED", topics: [] as string[] };
    state.speakers.unshift(row);
    audit(state, eventId, actor.userId, "speaker.create", "Speaker", row.id, row);
    notify(state, eventId, actor.userId, "SPEAKER_ACTION_REQUIRED", "Speaker invitado", row.personName, "Speaker", row.id);
    return { row };
  }
  if (resource === "vendor") {
    const row = { id: createId("ven"), eventId, name: data.name || "Vendor", category: data.category || "", amountCents: pesos(data.amount), contactEmail: "", status: "PROSPECT", notes: "" };
    state.vendors.unshift(row);
    audit(state, eventId, actor.userId, "vendor.create", "Vendor", row.id, row);
    return { row };
  }
  if (resource === "session") {
    const row = { id: createId("ses"), eventId, title: data.title || "Sesión", description: "", startAt: data.startAt || null, endAt: null, type: "Sesión", status: "DRAFT", stageId: null, roomId: null, speakerIds: [] as string[] };
    state.sessionsProgram.unshift(row);
    audit(state, eventId, actor.userId, "session.create", "Session", row.id, row);
    return { row };
  }
  if (resource === "campaign") {
    const row = { id: createId("cmp"), eventId, name: data.name || "Campaña", channel: data.channel || "", budgetCents: pesos(data.budget), status: "DRAFT" };
    state.campaigns.unshift(row);
    audit(state, eventId, actor.userId, "campaign.create", "Campaign", row.id, row);
    return { row };
  }
  if (resource === "ros") {
    const row = { id: createId("ros"), eventId, title: data.title || "Hito", startAt: data.startAt || null, endAt: null, area: data.area || "", location: data.location || "", stageId: null, ownerId: actor.userId, status: "planned", critical: false, notes: "", dependsOnTaskId: null };
    state.runOfShow.unshift(row);
    audit(state, eventId, actor.userId, "ros.create", "RunOfShowItem", row.id, row);
    return { row };
  }
  return { error: { status: 400, message: "Recurso desconocido." } };
}

export function patchTask(state: DemoState, actor: Actor, eventId: string, taskId: string, patch: Record<string, unknown>) {
  const gate = requireEvent(state, actor, eventId);
  if (gate.error || !gate.role || !canOperateRole(gate.role)) return { error: gate.error ?? { status: 403, message: "No podés editar tareas." } };
  const task = state.tasks.find((row) => row.id === taskId && row.eventId === eventId);
  if (!task) return { error: { status: 404, message: "Tarea no encontrada" } };
  const before = { status: task.status };
  if (typeof patch.status === "string") task.status = patch.status;
  if (typeof patch.priority === "string") task.priority = patch.priority;
  if (typeof patch.approvalStatus === "string") task.approvalStatus = patch.approvalStatus;
  audit(state, eventId, actor.userId, "task.update", "Task", task.id, { before, after: { status: task.status } });
  if (patch.approvalStatus === "APPROVED") notify(state, eventId, actor.userId, "APPROVAL_COMPLETED", "Aprobación lista", task.title, "Task", task.id);
  return { task };
}

export function patchIncident(state: DemoState, actor: Actor, eventId: string, incidentId: string, status: string) {
  const gate = requireEvent(state, actor, eventId);
  if (gate.error || !gate.role || !canOperateRole(gate.role)) return { error: gate.error ?? { status: 403, message: "No podés editar incidentes." } };
  const incident = state.incidents.find((row) => row.id === incidentId && row.eventId === eventId);
  if (!incident) return { error: { status: 404, message: "Incidente no encontrado" } };
  const before = incident.status;
  incident.status = status;
  if (status === "resolved" || status === "closed") incident.resolvedAt = new Date().toISOString();
  audit(state, eventId, actor.userId, "incident.update", "Incident", incident.id, { before, after: status });
  return { incident };
}

export function financeFor(state: DemoState, actor: Actor, eventId: string) {
  const gate = requireEvent(state, actor, eventId);
  if (gate.error || !gate.event) return gate;
  if (!canReadFinance(actor, gate.event)) return { error: { status: 403, message: "No tenés acceso a finanzas." } };
  return { event: gate.event };
}

export function acceptInvite(state: DemoState, token: string, name: string, password: string) {
  const row = state.invitations.find((item) => item.tokenHash === sha256(token) && !item.acceptedAt && new Date(item.expiresAt).getTime() > Date.now());
  if (!row) return { error: { status: 400, message: "La invitación no es válida." } };
  if (password.length < 8) return { error: { status: 400, message: "La contraseña necesita 8 caracteres." } };
  const id = createId("usr");
  state.users.push({ id, email: row.email.toLowerCase(), name, passwordHash: hashPassword(password), createdAt: new Date().toISOString() });
  state.memberships.push({ id: createId("mem"), organizationId: row.organizationId, userId: id, role: row.role });
  if (row.eventId) state.eventMembers.push({ id: createId("em"), eventId: row.eventId, userId: id, role: row.role });
  row.acceptedAt = new Date().toISOString();
  const session = openSession(state, id);
  return { ok: true as const, ...session, email: row.email };
}

export function viewAs(state: DemoState, actor: Actor, userId: string) {
  const allowed = DEMO_PERSONAS.some((row) => row.userId === userId);
  if (!allowed) return { error: { status: 403, message: "Ese perfil no está en la demo." } };
  if (!state.memberships.some((row) => row.userId === actor.userId && row.organizationId === "org_vendimia")) {
    return { error: { status: 403, message: "Solo la demo de Vendimia puede cambiar de perfil." } };
  }
  return openSession(state, userId);
}

export function runJobs(state: DemoState) {
  let done = 0;
  for (const job of state.jobs) {
    if (job.status !== "PENDING" || new Date(job.runAt).getTime() > Date.now()) continue;
    job.attempts += 1;
    if (job.type === "EMAIL") {
      const payload = job.payload as { to?: string; subject?: string; body?: string };
      state.emails.push({ id: createId("mail"), eventId: job.eventId, to: payload.to || "", subject: payload.subject || "", body: payload.body || "", createdAt: new Date().toISOString() });
      job.status = "DONE";
      done += 1;
    } else {
      job.status = "FAILED";
      job.lastError = "Tipo de job desconocido";
    }
  }
  return done;
}

export { DEMO_INVITE };
