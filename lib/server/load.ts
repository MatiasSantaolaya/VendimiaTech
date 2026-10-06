import { cookies } from "next/headers";
import { actorFromToken, getDemoState } from "@/lib/demo/store";
import { buildEventView } from "@/lib/server/view";

export async function loadWorkspace(slug: string) {
  const jar = await cookies();
  const state = getDemoState();
  const current = actorFromToken(state, jar.get("plane_session")?.value ?? null);
  const event = state.events.find((row) => row.slug === slug) ?? null;
  const view = event && current ? buildEventView(state, current.actor, event.id) : null;
  return { state, current, event, view, demo: jar.get("plane_demo")?.value === "1" || !process.env.DATABASE_URL };
}
