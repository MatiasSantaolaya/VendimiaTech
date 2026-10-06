import { notFound } from "next/navigation";
import { PublicEventView } from "@/components/PublicEventPage";
import { ModuleShell } from "@/components/ModuleShell";
import { DemoBar } from "@/components/actions";
import { AiScreen, AnalyticsScreen, CommandCenter, Commercial, ContentScreen, Denied, Experience, FinanceScreen, Integrations, Operations, Planning, WebsiteScreen } from "@/components/EventScreens";
import { loadWorkspace } from "@/lib/server/load";

export const dynamic = "force-dynamic";

const SECTIONS = ["control-center", "planning", "finance", "commercial", "content", "operations", "experience", "analytics", "ai", "website", "integrations"] as const;

export default async function EventPage({ params }: { params: Promise<{ slug: string; module?: string[] }> }) {
  const { slug, module } = await params;
  const section = module?.[0];
  const { event, view, current, demo, state } = await loadWorkspace(slug);
  if (!event || !state) notFound();
  if (!section) {
    const speakerName = new Map(state.speakers.map((row) => [row.id, row.personName]));
    const agenda = state.sessionsProgram.filter((row) => row.eventId === event.id).map((row) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      startAt: row.startAt,
      stage: { name: state.stages.find((stage) => stage.id === row.stageId)?.name || "Escenario" },
      speakers: row.speakerIds.map((id) => ({ speaker: { id, personName: speakerName.get(id) || "Orador" } })),
    }));
    const venue = state.venues.find((row) => row.eventId === event.id);
    const spaces = venue ? state.spaces.filter((row) => row.venueId === venue.id) : [];
    const page = state.publicPages.find((row) => row.eventId === event.id);
    return <PublicEventView event={{ ...event, venue: venue ? { ...venue, spaces } : null }} page={page} agenda={agenda} stages={[{ id: "stg", name: "Escenario" }]} checkoutEvent={event.abraCheckoutEvent || undefined} />;
  }
  if (!SECTIONS.includes(section as (typeof SECTIONS)[number])) notFound();
  if (!current || !view) {
    return <main className="hero"><h1>Necesitás sesión</h1><a href="/login">Entrar</a></main>;
  }
  if (view.forbidden) return <main className="hero"><Denied /></main>;
  const screen = {
    "control-center": <CommandCenter view={view} />,
    planning: <Planning view={view} />,
    finance: <FinanceScreen view={view} />,
    commercial: <Commercial view={view} />,
    content: <ContentScreen view={view} />,
    operations: <Operations view={view} />,
    experience: <Experience view={view} />,
    analytics: <AnalyticsScreen view={view} />,
    ai: <AiScreen view={view} />,
    website: <WebsiteScreen view={view} />,
    integrations: <Integrations view={view} />,
  }[section];
  return (
    <>
      {demo ? <DemoBar userId={current.actor.userId} eventSlug={event.slug} /> : null}
      <ModuleShell event={event} active={section}>{screen}</ModuleShell>
    </>
  );
}
