import Link from "next/link";
import { cookies } from "next/headers";
import { Experience } from "@/components/EventScreens";
import { findActiveSession } from "@/lib/auth";
import { actorFromToken, getDemoState } from "@/lib/demo/store";
import type { Actor } from "@/lib/domain/rbac";
import { getCurrentAttendee } from "@/lib/services/attendee-auth";
import { getEventAccess } from "@/lib/services/event-access";
import { calculateEventHealth } from "@/lib/services/event-health";
import { isDemoMode } from "@/lib/server/mode";
import { actorForDatabaseUser, databaseView, snapshotEvent } from "@/lib/server/prisma-snapshot";
import { buildEventView } from "@/lib/server/view";

export const dynamic = "force-dynamic";

export default async function AttendeePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const jar = await cookies();
  if (isDemoMode(jar.get("plane_demo")?.value)) {
    const state = getDemoState();
    const token = jar.get("plane_session")?.value ?? null;
    const current = actorFromToken(state, token);
    const event = state.events.find((row) => row.id === eventId);
    if (!event || !current) return <main className="hero"><h1>Entrá a la demo</h1><Link href="/demo">Demo</Link></main>;
    const view = buildEventView(state, current.actor, event.id);
    if (!view || view.forbidden) return <main className="hero">Sin acceso</main>;
    return <main className="hero"><Experience view={view} /><p><Link href={`/events/${event.slug}/experience`}>Volver al evento</Link></p></main>;
  }
  const attendee = await getCurrentAttendee();
  const session = await findActiveSession(jar.get("plane_session")?.value);
  if (!session && !(attendee && attendee.eventId === eventId)) {
    return <main className="hero"><h1>Entrá como asistente</h1><Link href="/login">Entrar</Link></main>;
  }
  const userId = session?.user.id ?? attendee?.userId ?? null;
  const access = userId ? await getEventAccess(eventId, userId) : null;
  const actor = userId ? await actorForDatabaseUser(userId) : null;
  if (access && actor) {
    const loaded = await databaseView(actor, eventId);
    if (loaded.status === 200) {
      return <main className="hero"><Experience view={loaded.view} /><p><Link href={`/events/${loaded.view.event.slug}/experience`}>Volver al evento</Link></p></main>;
    }
  }
  if (!attendee || attendee.eventId !== eventId) return <main className="hero">Sin acceso</main>;
  const fallback: Actor = {
    userId: userId || attendee.id,
    email: attendee.email,
    name: attendee.name,
    memberships: [],
    eventRoles: [{ eventId, role: "ATTENDEE" }],
    access: [{ eventId, role: "ATTENDEE", entityType: "ATTENDEE", entityId: attendee.id }],
  };
  const state = await snapshotEvent(eventId);
  const built = state ? buildEventView(state, fallback, eventId) : null;
  if (!state || !built || built.forbidden) return <main className="hero">Sin acceso</main>;
  const official = await calculateEventHealth(eventId);
  const view = { ...built, official, brainContext: { ...built.brainContext, healthScore: official } };
  return <main className="hero"><Experience view={view} /><p><Link href={`/events/${view.event.slug}/experience`}>Volver al evento</Link></p></main>;
}
