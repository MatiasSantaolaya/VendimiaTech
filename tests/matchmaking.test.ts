import { describe, expect, it } from "vitest";
import { matchScore } from "@/lib/domain/matchmaking";

describe("matchmaking", () => {
  it("explains complementary goals and a shared interest", () => {
    const result = matchScore(
      { interests: ["vino", "ia", "producto"], goals: ["contratar"], tags: ["producto"], company: "Finca Norte" },
      { interests: ["ia", "datos"], goals: ["busco-trabajo"], tags: ["busco-trabajo", "datos"], company: "Independiente" },
    );
    expect(result.score).toBe(27);
    expect(result.reasons.join(" ")).toMatch(/interés/);
    expect(result.reasons.join(" ")).toMatch(/Complemento/);
  });

  it("penalizes the same company", () => {
    const result = matchScore(
      { interests: ["ia"], goals: [], tags: [], company: "Finca Norte" },
      { interests: ["ia"], goals: [], tags: [], company: "finca norte" },
    );
    expect(result.score).toBe(2);
    expect(result.reasons.some((row) => row.includes("Misma empresa"))).toBe(true);
  });
});
