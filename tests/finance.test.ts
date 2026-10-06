import { describe, expect, it } from "vitest";
import { computeFinance } from "@/lib/domain/finance";
import { FIXTURE, buildDemoState } from "@/lib/demo/build";

describe("finance", () => {
  it("computes margin, ROI, and variance from cents", () => {
    const report = computeFinance({
      budgetCents: 400_000_000,
      revenues: [
        { source: "TICKET", amountCents: 330_000_000 },
        { source: "SPONSOR", amountCents: 230_000_000 },
      ],
      expenses: [
        { amountCents: 120_000_000, status: "PAID", direct: true },
        { amountCents: 80_000_000, status: "PAID", direct: true },
        { amountCents: 40_000_000, status: "PAID", direct: false },
        { amountCents: 35_000_000, status: "APPROVED", direct: false },
        { amountCents: 10_000_000, status: "CANCELLED", direct: true },
      ],
    });
    expect(report.totalRevenueCents).toBe(560_000_000);
    expect(report.directCostCents).toBe(200_000_000);
    expect(report.totalCostCents).toBe(275_000_000);
    expect(report.grossMarginCents).toBe(360_000_000);
    expect(report.netMarginCents).toBe(285_000_000);
    expect(report.roi).toBe(1.0364);
    expect(report.budgetVarianceCents).toBe(125_000_000);
  });

  it("matches the Vendimia demo fixture", () => {
    const state = buildDemoState();
    const report = computeFinance({
      budgetCents: FIXTURE.budgetCents,
      revenues: state.revenues.filter((row) => row.eventId === "evt_vendimia").map((row) => ({ source: row.type === "TICKET" || row.type === "SPONSOR" ? row.type : "OTHER" as const, amountCents: row.amountCents })),
      expenses: state.expenses.map((row) => ({ amountCents: row.amountCents, status: row.status, direct: row.direct })),
    });
    expect(report.ticketRevenueCents).toBe(330_000_000);
    expect(report.sponsorRevenueCents).toBe(230_000_000);
    expect(report.netMarginCents).toBe(285_000_000);
  });
});
