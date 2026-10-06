import Link from "next/link";

export default function HomePage() {
  return (
    <main className="hero">
      <div className="eyebrow">Mendoza · Vendimia Tech 2027</div>
      <h1>Un evento, un sistema operativo completo.</h1>
      <p>PLANe conecta planificación, operación, sponsors, escenario y asistentes sobre el mismo grafo. La demo no pide base de datos.</p>
      <div className="inline">
        <Link className="btn primary" href="/demo">Abrir demo</Link>
        <Link className="btn" href="/login">Entrar con usuario</Link>
      </div>
    </main>
  );
}
