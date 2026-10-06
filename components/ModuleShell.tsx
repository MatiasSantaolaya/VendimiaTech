import Link from 'next/link';

const nav=[['control-center','Control Center'],['planning','Planificación'],['finance','Finanzas'],['commercial','Comercial'],['content','Contenido'],['operations','Operaciones'],['experience','Experiencia'],['analytics','Analytics'],['ai','PlanE AI'],['website','Web'],['integrations','Integraciones']];
export function ModuleShell({event,active,children}:{event:any;active:string;children:React.ReactNode}){
 return <main className="main"><div className="module-head"><div><div className="eyebrow">{event.name}</div><h1>{nav.find(x=>x[0]===active)?.[1]||'Módulo'}</h1></div><div className="module-nav">{nav.map(([id,label])=><Link className={id===active?'active':''} key={id} href={id==='control-center'?`/events/${event.slug}/control-center`:`/events/${event.slug}/${id==='ai'?'ai':id}`}>{label}</Link>)}</div></div>{children}</main>
}
