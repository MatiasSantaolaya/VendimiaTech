export function findTimeConflicts(items: { id: string; location: string; startAt: string | null; endAt: string | null; status: string }[]) {
  const conflicts: { a: string; b: string }[] = [];
  const active = items.filter((item) => item.status !== "done" && item.startAt && item.endAt && item.location);
  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const a = active[i];
      const b = active[j];
      if (a.location !== b.location) continue;
      const a0 = new Date(a.startAt as string).getTime();
      const a1 = new Date(a.endAt as string).getTime();
      const b0 = new Date(b.startAt as string).getTime();
      const b1 = new Date(b.endAt as string).getTime();
      if (a0 < b1 && b0 < a1) conflicts.push({ a: a.id, b: b.id });
    }
  }
  return conflicts;
}
