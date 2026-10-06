import Script from 'next/script';
import Link from 'next/link';

export function PublicEventView({event,page,agenda,stages,checkoutEvent}:{event:any,page:any,agenda:any[],stages:any[],checkoutEvent?:string}){
 const brand=event.branding||{};
 return <>
  {checkoutEvent && <Script src="https://sdk.abratickets.com/v2/checkout.js" strategy="afterInteractive" />}
  <main className="public-event" style={{'--accent':brand.accent||'var(--ink)'} as any}>
   <header className="public-hero" style={page?.heroImageUrl?{backgroundImage:`linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.55)),url(${page.heroImageUrl})`}:undefined}>
    <div className="public-nav"><div className="brand">{page?.logoUrl?<img src={page.logoUrl} alt={event.name}/>:event.name}</div><div className="public-nav-links"><a href="#agenda">Agenda</a><a href="#venue">Venue</a><a href="#networking">Networking</a></div></div>
    <div className="public-hero-content"><div className="eyebrow">{event.city||'Mendoza'} · {event.startAt?new Date(event.startAt).toLocaleDateString('es-AR',{day:'numeric',month:'long'}):'Próximamente'}</div><h1>{page?.headline||event.name}</h1><p>{page?.subheadline||'Una experiencia diseñada para conectar ideas, personas y oportunidades.'}</p>
      <div className="public-cta">{checkoutEvent?<abra-checkout event={checkoutEvent} theme="light"></abra-checkout>:<Link className="btn primary" href={page?.ctaUrl||'#agenda'}>{page?.ctaLabel||'Conseguí tu entrada'}</Link>}</div>
    </div>
   </header>
   <section className="public-section intro"><div><div className="eyebrow">SOBRE EL EVENTO</div><h2>{page?.description||'Todo lo que necesitás para vivir el evento en un solo lugar.'}</h2></div><div className="public-stats"><span><strong>{event.objectiveAttendees||event.capacity||0}</strong> asistentes objetivo</span><span><strong>{agenda.length}</strong> sesiones</span><span><strong>{stages.length}</strong> escenarios</span></div></section>
   <section id="agenda" className="public-section"><div className="eyebrow">AGENDA</div><h2>Programación</h2><div className="agenda-grid">{agenda.map((s:any)=><article className="session-card" key={s.id}><div className="eyebrow">{s.startAt?new Date(s.startAt).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}):'Horario TBD'} · {s.stage?.name||'General'}</div><h3>{s.title}</h3><p>{s.type||'Sesión'}</p><div className="speaker-inline">{s.speakers?.map((x:any)=><span key={x.speaker.id}>{x.speaker.personName}</span>)}</div></article>)}</div></section>
   <section id="venue" className="public-section dark"><div><div className="eyebrow">VENUE</div><h2>{event.venue?.name||'Próximamente'}</h2><p>{event.venue?.address||event.city||''}</p></div><div className="venue-spaces">{event.venue?.spaces?.map((x:any)=><div className="card" key={x.id}><strong>{x.name}</strong><small>{x.capacity||0} personas</small></div>)}</div></section>
   <section id="networking" className="public-section intro"><div><div className="eyebrow">NETWORKING</div><h2>Conectá antes, durante y después.</h2><p className="muted">Completá tu perfil de intereses y buscá personas con objetivos compatibles desde tu experiencia de asistente.</p></div><Link className="btn" href={`/attendee/${event.id}`}>Entrar a mi experiencia</Link></section>
   <footer className="public-footer"><strong>{event.name}</strong><span>Powered by PlanE</span></footer>
  </main>
 </>;
}
