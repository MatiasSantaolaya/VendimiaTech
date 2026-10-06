import { describe, expect, it } from "vitest";
import { forecast } from "@/lib/domain/forecast";

describe("forecast heuristic", () => {
  it("uses the documented 0.35 pace factor", () => {
    const result = forecast({
      openTasks: 4,
      overdueTasks: 2,
      incidents: [{ severity: "high" }],
      conflicts: 1,
      totalRevenueCents: 1000,
      totalCostCents: 500,
      budgetCents: 800,
      ticketsSold: 10,
      capacity: 100,
      ticketRevenueCents: 1000,
      fallbackTicketPriceCents: 100,
      onSaleDate: "2027-02-01T00:00:00.000Z",
      now: "2027-02-11T00:00:00.000Z",
      eventEnd: "2027-02-21T00:00:00.000Z",
    });
    expect(result.projectedTickets).toBe(14);
    expect(result.forecastRevenueCents).toBe(1400);
    expect(result.forecastExpenseCents).toBe(1000);
    expect(result.forecastMarginCents).toBe(400);
    expect(result.taskDelayRisk).toBe(50);
    expect(result.operationalRisk).toBe(40);
    expect(result.assumptions[2]).toMatch(/aprendizaje automático/);
  });
});
