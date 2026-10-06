export type FinanceRevenue = { source: "TICKET" | "SPONSOR" | "OTHER"; amountCents: number };
export type FinanceExpense = { amountCents: number; status: string; direct: boolean };

export type FinanceReport = {
  ticketRevenueCents: number;
  sponsorRevenueCents: number;
  otherRevenueCents: number;
  totalRevenueCents: number;
  directCostCents: number;
  totalCostCents: number;
  grossMarginCents: number;
  netMarginCents: number;
  roi: number | null;
  budgetVarianceCents: number;
};

export function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

function sum(rows: { amountCents: number }[]) {
  return rows.reduce((total, row) => total + row.amountCents, 0);
}

/** Cancelled expenses are excluded. Planned and approved expenses count as committed cost. */
export function computeFinance(input: { budgetCents: number; revenues: FinanceRevenue[]; expenses: FinanceExpense[] }): FinanceReport {
  const active = input.expenses.filter((row) => row.status !== "CANCELLED");
  const ticketRevenueCents = sum(input.revenues.filter((row) => row.source === "TICKET"));
  const sponsorRevenueCents = sum(input.revenues.filter((row) => row.source === "SPONSOR"));
  const otherRevenueCents = sum(input.revenues.filter((row) => row.source === "OTHER"));
  const totalRevenueCents = ticketRevenueCents + sponsorRevenueCents + otherRevenueCents;
  const directCostCents = sum(active.filter((row) => row.direct));
  const totalCostCents = sum(active);
  const grossMarginCents = totalRevenueCents - directCostCents;
  const netMarginCents = totalRevenueCents - totalCostCents;
  const roi = totalCostCents === 0 ? null : round4(netMarginCents / totalCostCents);
  return {
    ticketRevenueCents,
    sponsorRevenueCents,
    otherRevenueCents,
    totalRevenueCents,
    directCostCents,
    totalCostCents,
    grossMarginCents,
    netMarginCents,
    roi,
    budgetVarianceCents: input.budgetCents - totalCostCents,
  };
}
