import Link from "next/link";
import { Experience } from "@/components/EventScreens";
import { getDemoState, actorFromToken } from "@/lib/demo/store";
import { cookies } from "next/headers";
import { buildEventView } from "@/lib/server/view";

export const dynamic = "force-dynamic";

export default async function AttendeePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const state = getDemoState();
  const token = (await cookies()).get("plane_session")?.value ?? null;
  const current = actorFromToken(state, token);
  const event = state.events.find((row) => row.id === eventId);
  if (!event || !current) return <main className="hero"><h1>Entrá a la demo</h1><Link href="/demo">Demo</Link></main>;
  const view = buildEventView(state, current.actor, event.id);
  if (!view || view.forbidden) return <main className="hero">Sin acceso</main>;
  return <main className="hero"><Experience view={view} /><p><Link href={`/events/${event.slug}/experience`}>Volver al evento</Link></p></main>;
}
