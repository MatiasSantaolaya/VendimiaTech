/** Same arithmetic as lib/services/event-health.ts. Kept pure so tests and /demo do not open Prisma. */
export function officialHealthScore(input: {
  tasks: number;
  done: number;
  overdue: number;
  blocked: number;
  openIncidents: number;
  criticalRunOfShow: number;
  overdueDeliverables: number;
}) {
  let score = 100;
  if (input.tasks) score -= Math.round((1 - input.done / input.tasks) * 15);
  score -= Math.min(25, input.overdue * 4);
  score -= Math.min(25, input.blocked * 7);
  score -= Math.min(20, input.openIncidents * 8);
  score -= Math.min(10, input.criticalRunOfShow * 3);
  score -= Math.min(10, input.overdueDeliverables * 3);
  return Math.max(0, Math.min(100, score));
}

export function clampScore(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export type HealthAreaKey = "planning" | "operations" | "finance" | "commercial" | "audience" | "content" | "ticketing" | "incidents";

export function areaScores(input: {
  tasks: number;
  done: number;
  overdue: number;
  blocked: number;
  openIncidents: number;
  criticalIncidents: number;
  conflicts: number;
  budgetCents: number;
  totalCostCents: number;
  netMarginCents: number;
  pendingDeliverables: number;
  negotiatingSponsors: number;
  ticketsSold: number;
  capacity: number;
  sessionsWithoutSpeaker: number;
  speakersPending: number;
  syncErrors: number;
}) {
  const completion = input.tasks === 0 ? 0.5 : input.done / input.tasks;
  const planning = clampScore(100 * completion - input.overdue * 8 - input.blocked * 10);
  const operations = clampScore(100 - input.criticalIncidents * 25 - input.openIncidents * 4 - input.conflicts * 15);
  const over = input.budgetCents > 0 ? Math.max(0, input.totalCostCents - input.budgetCents) / input.budgetCents : 0;
  const finance = clampScore(100 - over * 100 - (input.netMarginCents < 0 ? 20 : 0));
  const commercial = clampScore(100 - input.pendingDeliverables * 12 - input.negotiatingSponsors * 8);
  const ratio = input.capacity <= 0 ? 0 : input.ticketsSold / input.capacity;
  const audience = ratio > 1 ? clampScore(100 - (ratio - 1) * 100) : clampScore(ratio * 100);
  const content = clampScore(100 - input.sessionsWithoutSpeaker * 18 - input.speakersPending * 10);
  const ticketing = clampScore(100 - input.syncErrors * 20 - (input.ticketsSold === 0 ? 15 : 0));
  const incidents = clampScore(100 - input.criticalIncidents * 30 - input.openIncidents * 5);
  return { planning, operations, finance, commercial, audience, content, ticketing, incidents };
}

export const AREA_WEIGHTS: Record<HealthAreaKey, number> = {
  planning: 18,
  operations: 14,
  finance: 14,
  commercial: 12,
  audience: 10,
  content: 10,
  ticketing: 12,
  incidents: 10,
};

export function weightedHealth(areas: Record<HealthAreaKey, number>) {
  const total = (Object.keys(AREA_WEIGHTS) as HealthAreaKey[]).reduce((sum, key) => sum + areas[key] * AREA_WEIGHTS[key], 0);
  return clampScore(total / 100);
}
