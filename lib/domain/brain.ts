export type BrainProposal = { type: "COMPLETE_TASK"; taskId: string } | { type: "RESOLVE_INCIDENT"; incidentId: string };

export type BrainAnswer = {
  text: string;
  requiresConfirmation: boolean;
  proposal: BrainProposal | null;
  sources: string[];
};

export type BrainContext = {
  eventName: string;
  healthScore: number;
  riskScore: number;
  ticketsSold: number;
  revenueCents: number;
  expenseCents: number;
  netMarginCents: number;
  blocked: { id: string; title: string }[];
  overdue: { id: string; title: string }[];
  pendingDeliverables: { sponsor: string; title: string }[];
  openIncidents: { title: string; severity: string }[];
  weekRisks: string[];
};

function proposalFor(question: string, ctx: BrainContext): BrainProposal | null {
  const q = question.toLowerCase();
  const imperative = /(complet|resolv|cerr[aá]|marc[aá]|cancel)/.test(q);
  if (!imperative) return null;
  if (/incident/.test(q) && ctx.openIncidents.length) {
    const match = q.match(/inc_[a-z0-9_]+/);
    return { type: "RESOLVE_INCIDENT", incidentId: match?.[0] ?? "" };
  }
  if (/tarea|task/.test(q)) {
    const match = q.match(/tsk_[a-z0-9_]+/);
    return { type: "COMPLETE_TASK", taskId: match?.[0] ?? "" };
  }
  return null;
}

export function answerQuestion(question: string, ctx: BrainContext): BrainAnswer {
  const proposal = proposalFor(question, ctx);
  if (proposal && (proposal.type === "COMPLETE_TASK" ? proposal.taskId : proposal.incidentId)) {
    return {
      text: "Puedo proponer ese cambio, pero no lo aplico hasta que lo confirmes.",
      requiresConfirmation: true,
      proposal,
      sources: ["event-graph"],
    };
  }
  const q = question.toLowerCase();
  const sources = ["event-graph", "analytics", "event-health"];
  if (/entrada|ticket|vendid/.test(q)) {
    return { text: `Se vendieron ${ctx.ticketsSold} entradas en ${ctx.eventName}.`, requiresConfirmation: false, proposal: null, sources };
  }
  if (/margen|margin/.test(q)) {
    return { text: `El margen neto calculado es ${ctx.netMarginCents} centavos. Ingresos ${ctx.revenueCents}, gastos ${ctx.expenseCents}.`, requiresConfirmation: false, proposal: null, sources };
  }
  if (/sponsor|entregable|deliverable/.test(q)) {
    const lines = ctx.pendingDeliverables.map((row) => `${row.sponsor}: ${row.title}`);
    return { text: lines.length ? `Entregables pendientes: ${lines.join("; ")}.` : "No hay entregables de sponsors pendientes.", requiresConfirmation: false, proposal: null, sources };
  }
  if (/bloque/.test(q)) {
    const lines = ctx.blocked.map((row) => row.title);
    return { text: lines.length ? `Tareas bloqueadas: ${lines.join(", ")}.` : "No hay tareas bloqueadas.", requiresConfirmation: false, proposal: null, sources };
  }
  if (/semana|riesgo|risk|afect/.test(q)) {
    return {
      text: `Salud ${ctx.healthScore}/100, riesgo ${ctx.riskScore}/100. ${ctx.weekRisks.join(" ") || "Sin alertas adicionales esta semana."}`,
      requiresConfirmation: false,
      proposal: null,
      sources,
    };
  }
  return {
    text: `${ctx.eventName}: salud ${ctx.healthScore}, riesgo ${ctx.riskScore}, ${ctx.ticketsSold} entradas, margen neto ${ctx.netMarginCents} centavos, ${ctx.blocked.length} bloqueos, ${ctx.pendingDeliverables.length} entregables pendientes.`,
    requiresConfirmation: false,
    proposal: null,
    sources,
  };
}
