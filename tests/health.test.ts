import { describe, expect, it } from "vitest";
import { areaScores, officialHealthScore, weightedHealth } from "@/lib/domain/health";

describe("official health score", () => {
  it("matches the uploaded arithmetic", () => {
    const score = officialHealthScore({ tasks: 4, done: 2, overdue: 1, blocked: 1, openIncidents: 1, criticalRunOfShow: 1, overdueDeliverables: 1 });
    expect(score).toBe(67);
  });

  it("clamps at zero", () => {
    expect(officialHealthScore({ tasks: 1, done: 0, overdue: 20, blocked: 20, openIncidents: 10, criticalRunOfShow: 10, overdueDeliverables: 10 })).toBe(0);
  });
});

describe("area scores", () => {
  it("weights areas instead of returning a constant", () => {
    const areas = areaScores({
      tasks: 4, done: 2, overdue: 1, blocked: 1, openIncidents: 1, criticalIncidents: 1, conflicts: 1,
      budgetCents: 100, totalCostCents: 40, netMarginCents: 10, pendingDeliverables: 1, negotiatingSponsors: 1,
      ticketsSold: 50, capacity: 100, sessionsWithoutSpeaker: 1, speakersPending: 1, syncErrors: 1,
    });
    const score = weightedHealth(areas);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
    expect(areas.planning).not.toBe(areas.incidents);
  });
});
