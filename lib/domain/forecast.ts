import { clampScore } from "./health";

const DAY = 86_400_000;

export type Forecast = {
  taskDelayRisk: number;
  operationalRisk: number;
  forecastRevenueCents: number;
  forecastExpenseCents: number;
  forecastMarginCents: number;
  projectedTickets: number;
  capacityUsePercent: number;
  assumptions: string[];
};

export function forecast(input: {
  openTasks: number;
  overdueTasks: number;
  incidents: { severity: string }[];
  conflicts: number;
  totalRevenueCents: number;
  totalCostCents: number;
  budgetCents: number;
  ticketsSold: number;
  capacity: number;
  ticketRevenueCents: number;
  fallbackTicketPriceCents: number;
  onSaleDate: string;
  now: string;
  eventEnd: string;
}): Forecast {
  const now = new Date(input.now).getTime();
  const onSale = new Date(input.onSaleDate).getTime();
  const end = new Date(input.eventEnd).getTime();
  const taskDelayRisk = input.openTasks === 0 ? 0 : clampScore((input.overdueTasks / input.openTasks) * 100);
  const weight = input.incidents.reduce((sum, item) => {
    const severity = item.severity.toLowerCase();
    if (severity === "critical") return sum + 40;
    if (severity === "high") return sum + 25;
    if (severity === "medium") return sum + 12;
    return sum + 5;
  }, 0);
  const operationalRisk = clampScore(weight + input.conflicts * 15);
  const elapsedDays = Math.max(0, (now - onSale) / DAY);
  const daysOnSale = Math.max(1, elapsedDays);
  const daysLeft = Math.max(0, (end - now) / DAY);
  const pace = input.ticketsSold / daysOnSale;
  const additionalTickets = Math.round(pace * daysLeft * 0.35);
  const projectedTickets = Math.min(input.capacity, input.ticketsSold + Math.max(0, additionalTickets));
  const avg = input.ticketsSold > 0 ? input.ticketRevenueCents / input.ticketsSold : input.fallbackTicketPriceCents;
  const forecastRevenueCents = Math.round(input.totalRevenueCents + Math.max(0, projectedTickets - input.ticketsSold) * avg);
  const windowDays = Math.max(elapsedDays, (end - onSale) / DAY);
  const forecastExpenseCents = elapsedDays <= 0 ? Math.max(input.budgetCents, input.totalCostCents) : Math.max(input.totalCostCents, Math.round((input.totalCostCents / elapsedDays) * windowDays));
  return {
    taskDelayRisk,
    operationalRisk,
    forecastRevenueCents,
    forecastExpenseCents,
    forecastMarginCents: forecastRevenueCents - forecastExpenseCents,
    projectedTickets,
    capacityUsePercent: input.capacity <= 0 ? 0 : clampScore((projectedTickets / input.capacity) * 100),
    assumptions: [
      "Sin historial de ediciones anteriores: la conversión futura usa el factor 0.35 sobre el ritmo observado desde el inicio de venta.",
      "El gasto proyectado es el mayor entre lo ya comprometido y la tasa de quema en esa ventana.",
      "No es un modelo de aprendizaje automático.",
    ],
  };
}
