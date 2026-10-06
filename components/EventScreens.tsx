import Link from "next/link";
import QuickCreate from "@/components/QuickCreate";
import { BrainPanel, ConnectButton, IncidentActions, TaskActions, TicketingActions } from "@/components/actions";
import { formatArs } from "@/lib/domain/money";
import type { buildEventView } from "@/lib/server/view";

type Dash = Extract<NonNullable<ReturnType<typeof buildEventView>>, { forbidden: false }>;

export function Denied() {
  return <div className="card" data-testid="denied"><h2>Sin permiso</h2><p>Tu rol no puede ver esta sección.</p></div>;
}

export function CommandCenter({ view }: { view: Dash }) {
  if (!view.manage && !view.operate) return <Denied />;
  return (
    <div data-testid="command-center" className="stack">
      <div className="inline">
        <div className="health" style={{ ["--p" as string]: view.official }} data-testid="health-score"><span>{view.official}</span></div>
        <div>
          <div className="eyebrow">Salud calculada</div>
          <h2>Riesgo {view.riskScore}</h2>
          <p className="muted">La cifra sale de tareas, incidentes, hoja de ruta y entregables. No está escrita a mano.</p>
        </div>
      </div>
      <div className="grid kpis">
        <Kpi id="kpi-registrations" label="Registros" value={String(view.kpis.registrations)} />
        <Kpi id="kpi-tickets" label="Entradas" value={String(view.kpis.ticketsSold)} />
        <Kpi id="kpi-checkins" label="Check-ins" value={String(view.kpis.checkIns)} />
        <Kpi id="kpi-revenue" label="Ingresos" value={view.kpis.revenueCents == null ? "—" : formatArs(view.kpis.revenueCents)} />
        <Kpi id="kpi-expenses" label="Gastos" value={view.kpis.expensesCents == null ? "—" : formatArs(view.kpis.expensesCents)} />
        <Kpi id="kpi-margin" label="Margen" value={view.kpis.marginCents == null ? "—" : formatArs(view.kpis.marginCents)} />
        <Kpi id="kpi-sponsors" label="Sponsors" value={String(view.kpis.sponsors)} />
        <Kpi id="kpi-speakers" label="Speakers" value={String(view.kpis.speakers)} />
        <Kpi id="kpi-tasks" label="Tareas abiertas" value={String(view.kpis.tasksOpen)} />
        <Kpi id="kpi-incidents" label="Incidentes" value={String(view.kpis.incidentsOpen)} />
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1.2fr .8fr" }}>
        <section className="card">
          <h3>Action center</h3>
          {view.actions.length === 0 ? <p className="empty">Sin pendientes críticos.</p> : view.actions.slice(0, 8).map((item) => (
            <Link key={`${item.kind}-${item.title}`} href={`/events/${view.event.slug}/${item.href}`}>{item.kind}: {item.title}</Link>
          ))}
        </section>
        <section className="card">
          <h3>Áreas</h3>
          {view.areas.map((area) => <div key={area.key} className="inline"><span>{area.label}</span><strong>{area.score}</strong></div>)}
          <p className="muted">Grafo: {view.graph.nodes} nodos, {view.graph.edges} relaciones, {view.graph.blockers.length} bloqueos.</p>
        </section>
      </div>
      <section className="card">
        <h3>Actividad</h3>
        {view.audits.length === 0 ? <p className="empty">Sin actividad.</p> : view.audits.slice(0, 6).map((row) => <div key={row.id}>{row.action} · {row.entityType} · {row.createdAt}</div>)}
      </section>
    </div>
  );
}

function Kpi({ id, label, value }: { id: string; label: string; value: string }) {
  return <article className="card" data-testid={id}><div className="eyebrow">{label}</div><strong>{value}</strong></article>;
}

export function Planning({ view }: { view: Dash }) {
  if (!view.operate) return <Denied />;
  const columns = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"];
  return (
    <div className="stack" data-testid="planning">
      <QuickCreate eventId={view.event.id} resource="task" />
      <div className="card" style={{ overflow: "auto" }}>
        <table className="table">
          <thead><tr><th>Tarea</th><th>Estado</th><th>Prioridad</th><th></th></tr></thead>
          <tbody>
            {view.tasks.map((task) => (
              <tr key={task.id} data-testid="task-row">
                <td>{task.title}{task.parentId ? " · subtarea" : ""}{task.approvalStatus === "PENDING" ? " · aprobación" : ""}</td>
                <td>{task.status}</td>
                <td>{task.priority}</td>
                <td><TaskActions eventId={view.event.id} taskId={task.id} status={task.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="kanban" data-testid="kanban">
        {columns.map((status) => (
          <div key={status} className="col"><strong>{status}</strong>{view.tasks.filter((task) => task.status === status).map((task) => <div key={task.id}>{task.title}</div>)}</div>
        ))}
      </div>
      <div className="card" data-testid="timeline">
        <h3>Línea de tiempo</h3>
        {view.tasks.filter((task) => task.dueAt).sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt))).map((task) => <div key={task.id}>{task.dueAt} · {task.title}</div>)}
      </div>
    </div>
  );
}

export function FinanceScreen({ view }: { view: Dash }) {
  if (!view.finance || !view.projection) return <Denied />;
  const money = view.finance;
  return (
    <div className="stack" data-testid="finance-panel">
      <div className="grid kpis">
        <Kpi id="fin-revenue" label="Ingresos" value={formatArs(money.totalRevenueCents)} />
        <Kpi id="fin-cost" label="Costos" value={formatArs(money.totalCostCents)} />
        <Kpi id="fin-gross" label="Margen bruto" value={formatArs(money.grossMarginCents)} />
        <Kpi id="fin-net" label="Margen neto" value={formatArs(money.netMarginCents)} />
        <Kpi id="fin-roi" label="ROI" value={money.roi == null ? "—" : String(money.roi)} />
        <Kpi id="fin-var" label="Variación presupuesto" value={formatArs(money.budgetVarianceCents)} />
      </div>
      <QuickCreate eventId={view.event.id} resource="expense" />
      <div className="card">
        <h3>Pronóstico heurístico</h3>
        <p>Ingresos proyectados {formatArs(view.projection.forecastRevenueCents)} · gastos {formatArs(view.projection.forecastExpenseCents)} · margen {formatArs(view.projection.forecastMarginCents)}</p>
        <ul>{view.projection.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
    </div>
  );
}

export function Commercial({ view }: { view: Dash }) {
  return (
    <div className="stack" data-testid="sponsor-portal">
      {view.manage ? <QuickCreate eventId={view.event.id} resource="sponsor" /> : null}
      {view.deals.length === 0 ? <p className="empty">No tenés sponsors asignados.</p> : view.deals.map((deal) => (
        <article className="card" key={deal.id}>
          <h3>{deal.companyName}</h3>
          <p>{deal.tier} · {deal.status}{view.manage || view.role === "SPONSOR" ? ` · ${formatArs(deal.amountCents)}` : ""}</p>
          <ul>{view.deliverables.filter((item) => item.dealId === deal.id).map((item) => <li key={item.id}>{item.title} · {item.status}</li>)}</ul>
        </article>
      ))}
      {view.manage ? <><h3>Campañas</h3><QuickCreate eventId={view.event.id} resource="campaign" />{view.campaigns.map((row) => <div key={row.id}>{row.name} · {row.channel}</div>)}</> : null}
    </div>
  );
}

export function ContentScreen({ view }: { view: Dash }) {
  return (
    <div className="stack" data-testid="speaker-portal">
      {view.manage ? <QuickCreate eventId={view.event.id} resource="speaker" /> : null}
      {view.speakers.map((speaker) => <article className="card" key={speaker.id}><h3>{speaker.personName}</h3><p>{speaker.status} · {speaker.company}</p></article>)}
      <h3>Agenda</h3>
      {view.sessions.map((session) => <div key={session.id}>{session.title} · {session.type} · {session.speakerIds.length ? "con orador" : "sin orador"}</div>)}
    </div>
  );
}

export function Operations({ view }: { view: Dash }) {
  if (!view.operate && view.role !== "VENDOR") return <Denied />;
  return (
    <div className="stack" data-testid={view.role === "VENDOR" ? "vendor-portal" : "staff-portal"}>
      <div className="card"><h3>{view.venue?.name}</h3><p>{view.venue?.address}</p>{view.spaces.map((space) => <div key={space.id}>{space.name} · {space.capacity}</div>)}</div>
      {view.operate ? <QuickCreate eventId={view.event.id} resource="incident" /> : null}
      {view.incidents.map((incident) => (
        <div className="card inline" key={incident.id} data-testid="incident-row">
          <div><strong>{incident.title}</strong><div className="muted">{incident.status} · {incident.severity}</div></div>
          {view.operate ? <IncidentActions eventId={view.event.id} incidentId={incident.id} status={incident.status} /> : null}
        </div>
      ))}
      <h3>Hoja de ruta</h3>
      {view.conflicts.length ? <p>Hay {view.conflicts.length} solape(s) de horario.</p> : <p>Sin solapes.</p>}
      {view.runOfShow.map((item) => <div key={item.id}>{item.startAt} · {item.title} · {item.location} · {item.status}</div>)}
      <h3>Turnos</h3>
      {view.shifts.length === 0 ? <p className="empty">Sin turnos para vos.</p> : view.shifts.map((shift) => <div key={shift.id}>{shift.roleLabel} · {shift.location}</div>)}
      {view.role === "VENDOR" ? view.vendors.map((vendor) => <article className="card" key={vendor.id}><h3>{vendor.name}</h3><p>{vendor.category}</p></article>) : null}
    </div>
  );
}

export function Experience({ view }: { view: Dash }) {
  return (
    <div className="stack" data-testid="attendee-portal">
      <h3>Agenda</h3>
      {view.sessions.map((session) => <div key={session.id}>{session.title}</div>)}
      <h3>Networking</h3>
      <p className="muted">{view.rules.map((rule) => rule.text).join(" ")}</p>
      {view.recommendations.map((row) => (
        <article className="card" key={row.attendee.id}>
          <strong>{row.attendee.name}</strong> · {row.score}
          <div>{row.reasons.join(" · ")}</div>
          {view.role === "ATTENDEE" ? <ConnectButton eventId={view.event.id} toAttendeeId={row.attendee.id} /> : null}
        </article>
      ))}
      <h3>Encuestas y puntos</h3>
      {view.polls.map((poll) => <div key={poll.id}>{poll.question}</div>)}
      {view.points.map((point) => <div key={point.id}>{point.reason} · {point.points}</div>)}
    </div>
  );
}

export function AnalyticsScreen({ view }: { view: Dash }) {
  if (!view.manage) return <Denied />;
  return (
    <div className="stack" data-testid="analytics-panel">
      <p>Entradas {view.kpis.ticketsSold} · check-in {view.kpis.checkIns} · tareas abiertas {view.kpis.tasksOpen}</p>
      <a href={`/api/events/${view.event.id}/export?kind=tasks`}>Exportar tareas CSV</a>
      <a href={`/api/events/${view.event.id}/report`}>Informe del evento</a>
    </div>
  );
}

export function AiScreen({ view }: { view: Dash }) {
  if (!view.manage && !view.operate) return <Denied />;
  return <BrainPanel eventId={view.event.id} />;
}

export function WebsiteScreen({ view }: { view: Dash }) {
  if (!view.manage) return <Denied />;
  return <div className="card"><h3>{view.page?.headline}</h3><p>{view.page?.subheadline}</p><Link href={`/events/${view.event.slug}`}>Ver sitio público</Link></div>;
}

export function Integrations({ view }: { view: Dash }) {
  if (!view.manage) return <Denied />;
  return (
    <div className="stack" data-testid="ticketing-panel">
      <div className="card">
        <h3>Ticketing · {view.ticketing?.provider}</h3>
        <p>Estado {view.ticketing?.status}. {view.ticketing?.lastError || "Sin error activo."}</p>
        <ul>{view.syncLogs.map((log) => <li key={log.id}>{log.status}: {log.message}</li>)}</ul>
        {view.reconcile ? <p>Faltan en PlanE: {view.reconcile.missingLocal.join(", ") || "nada"}.</p> : null}
        <TicketingActions eventId={view.event.id} />
      </div>
    </div>
  );
}

export function Notifications({ view }: { view: Dash }) {
  return <div className="stack">{view.notifications.map((row) => <article className="card" key={row.id}><strong>{row.type}</strong><div>{row.title}</div></article>)}</div>;
}
