import { describe, expect, it } from "vitest";
import { analyzeDependencies } from "@/lib/domain/graph";
import { findTimeConflicts } from "@/lib/domain/conflicts";

describe("event graph blockers", () => {
  const tasks = [
    { id: "a", title: "A", status: "DONE", priority: "MEDIUM" },
    { id: "b", title: "B", status: "IN_PROGRESS", priority: "HIGH" },
    { id: "c", title: "C", status: "TODO", priority: "CRITICAL" },
    { id: "d", title: "D", status: "BLOCKED", priority: "HIGH" },
  ];
  const deps = [
    { taskId: "b", dependsOnId: "a" },
    { taskId: "c", dependsOnId: "b" },
  ];

  it("flags unfinished dependencies and BLOCKED status", () => {
    const result = analyzeDependencies(tasks, deps);
    expect(result.blockers.find((row) => row.taskId === "b")).toBeUndefined();
    expect(result.blockers.some((row) => row.taskId === "c")).toBe(true);
    expect(result.blockers.some((row) => row.taskId === "d" && row.reason.includes("BLOCKED"))).toBe(true);
    expect(result.criticalTasks).toEqual(["c"]);
    expect(result.downstream("b")).toContain("c");
  });
});

describe("run of show conflicts", () => {
  it("detects overlap in the same location", () => {
    const conflicts = findTimeConflicts([
      { id: "a", location: "Main", startAt: "2027-03-05T13:00:00.000Z", endAt: "2027-03-05T14:00:00.000Z", status: "planned" },
      { id: "b", location: "Main", startAt: "2027-03-05T13:30:00.000Z", endAt: "2027-03-05T14:30:00.000Z", status: "planned" },
      { id: "c", location: "Main", startAt: "2027-03-05T15:00:00.000Z", endAt: "2027-03-05T16:00:00.000Z", status: "done" },
    ]);
    expect(conflicts).toEqual([{ a: "a", b: "b" }]);
  });
});
