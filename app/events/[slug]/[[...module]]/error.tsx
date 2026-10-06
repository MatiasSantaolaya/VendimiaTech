"use client";

export default function EventError({ error }: { error: Error }) {
  return <main className="hero"><h1>No se pudo abrir el evento</h1><p>{error.message || "Error interno"}</p></main>;
}
