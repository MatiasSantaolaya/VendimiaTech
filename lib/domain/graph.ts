export type GraphTask = { id: string; title: string; status: string; priority: string };
export type GraphDep = { taskId: string; dependsOnId: string };

export function analyzeDependencies(tasks: GraphTask[], deps: GraphDep[]) {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const blockers: { taskId: string; reason: string }[] = [];
  for (const task of tasks) {
    if (task.status === "DONE" || task.status === "CANCELLED") continue;
    if (task.status === "BLOCKED") blockers.push({ taskId: task.id, reason: "Estado BLOCKED" });
    const unfinished = deps.filter((dep) => dep.taskId === task.id).filter((dep) => {
      const other = byId.get(dep.dependsOnId);
      return !other || (other.status !== "DONE" && other.status !== "CANCELLED");
    });
    if (unfinished.length) blockers.push({ taskId: task.id, reason: `Depende de ${unfinished.length} tarea(s) sin cerrar` });
  }
  const dependents = new Map<string, string[]>();
  for (const dep of deps) {
    const list = dependents.get(dep.dependsOnId) ?? [];
    list.push(dep.taskId);
    dependents.set(dep.dependsOnId, list);
  }
  function downstream(id: string, seen = new Set<string>()): string[] {
    const kids = dependents.get(id) ?? [];
    const next: string[] = [];
    for (const kid of kids) {
      if (seen.has(kid)) continue;
      seen.add(kid);
      next.push(kid, ...downstream(kid, seen));
    }
    return next;
  }
  const criticalTasks = tasks.filter((task) => task.priority === "CRITICAL" && task.status !== "DONE" && task.status !== "CANCELLED").map((task) => task.id);
  return { blockers, criticalTasks, downstream };
}

export type GraphNode = { id: string; type: string; label: string };
export type GraphEdge = { from: string; to: string; type: string };

export function buildGraph(input: {
  eventId: string;
  eventName: string;
  tasks: { id: string; title: string }[];
  deps: GraphDep[];
  deals: { id: string; companyName: string }[];
  deliverables: { id: string; title: string; dealId: string }[];
  speakers: { id: string; personName: string }[];
  sessions: { id: string; title: string; speakerIds: string[] }[];
  incidents: { id: string; title: string }[];
  runOfShow: { id: string; title: string; dependsOnTaskId: string | null }[];
}) {
  const nodes: GraphNode[] = [{ id: input.eventId, type: "Event", label: input.eventName }];
  const edges: GraphEdge[] = [];
  for (const task of input.tasks) {
    nodes.push({ id: task.id, type: "Task", label: task.title });
    edges.push({ from: input.eventId, to: task.id, type: "HAS" });
  }
  for (const dep of input.deps) edges.push({ from: dep.taskId, to: dep.dependsOnId, type: "DEPENDS_ON" });
  for (const deal of input.deals) {
    nodes.push({ id: deal.id, type: "Sponsor", label: deal.companyName });
    edges.push({ from: input.eventId, to: deal.id, type: "HAS" });
  }
  for (const item of input.deliverables) {
    nodes.push({ id: item.id, type: "Deliverable", label: item.title });
    edges.push({ from: item.dealId, to: item.id, type: "DELIVERS" });
  }
  for (const speaker of input.speakers) nodes.push({ id: speaker.id, type: "Speaker", label: speaker.personName });
  for (const session of input.sessions) {
    nodes.push({ id: session.id, type: "Session", label: session.title });
    for (const speakerId of session.speakerIds) edges.push({ from: speakerId, to: session.id, type: "SPEAKS_AT" });
  }
  for (const incident of input.incidents) {
    nodes.push({ id: incident.id, type: "Incident", label: incident.title });
    edges.push({ from: input.eventId, to: incident.id, type: "HAS" });
  }
  for (const item of input.runOfShow) {
    nodes.push({ id: item.id, type: "RunOfShowItem", label: item.title });
    if (item.dependsOnTaskId) edges.push({ from: item.id, to: item.dependsOnTaskId, type: "DEPENDS_ON" });
  }
  return { nodes, edges };
}
