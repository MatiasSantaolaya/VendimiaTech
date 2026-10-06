import { cookies } from "next/headers";
import { findActiveSession } from "@/lib/auth";
import { actorFromToken, getDemoState } from "@/lib/demo/store";
import { prisma } from "@/lib/prisma";
import { actorForDatabaseUser, databaseView, snapshotEvent } from "@/lib/server/prisma-snapshot";
import { isDemoMode } from "@/lib/server/mode";
import { buildEventView } from "@/lib/server/view";

export async function loadWorkspace(slug: string) {
  const jar = await cookies();
  const demo = isDemoMode(jar.get("plane_demo")?.value);
  if (demo) {
    const state = getDemoState();
    const current = actorFromToken(state, jar.get("plane_session")?.value ?? null);
    const event = state.events.find((row) => row.slug === slug) ?? null;
    const view = event && current ? buildEventView(state, current.actor, event.id) : null;
    return { state, current, event, view, demo: true };
  }
  const row = await prisma.event.findUnique({ where: { slug }, select: { id: true } });
  if (!row) return { state: null, current: null, event: null, view: null, demo: false };
  const session = await findActiveSession(jar.get("plane_session")?.value);
  const actor = session ? await actorForDatabaseUser(session.user.id) : null;
  if (!session || !actor) {
    const state = await snapshotEvent(row.id);
    return { state, current: null, event: state?.events[0] ?? null, view: null, demo: false };
  }
  const loaded = await databaseView(actor, row.id);
  const state = loaded.status === 200 ? loaded.state : await snapshotEvent(row.id);
  const event = state?.events[0] ?? null;
  if (loaded.status !== 200 || !event) {
    return { state, current: { actor, session }, event, view: event ? { forbidden: true as const, event } : null, demo: false };
  }
  return { state, current: { actor, session }, event, view: loaded.view, demo: false };
}
