"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_PERSONAS } from "@/lib/demo/build";

function csrf() {
  const match = document.cookie.match(/(?:^|; )plane_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function send(path: string, body?: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": csrf() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "No se pudo completar");
  return data;
}

export function DemoBar({ userId, eventSlug }: { userId: string; eventSlug: string }) {
  const router = useRouter();
  const homes: Record<string, string> = {
    usr_ana: "control-center",
    usr_diego: "operations",
    usr_elena: "commercial",
    usr_gracia: "content",
    usr_hugo: "operations",
    usr_ines: "experience",
  };
  return (
    <form className="demo-bar" data-testid="demo-bar">
      <span>Demo Vendimia Tech</span>
      <label>
        Ver como
        <select
          data-testid="view-as"
          value={userId}
          onChange={async (event) => {
            const next = event.target.value;
            await send("/api/demo/view-as", { userId: next });
            router.push(`/events/${eventSlug}/${homes[next] || "control-center"}`);
            router.refresh();
          }}
        >
          {DEMO_PERSONAS.map((row) => (
            <option key={row.userId} value={row.userId}>{row.label}</option>
          ))}
        </select>
      </label>
    </form>
  );
}

export function TaskActions({ eventId, taskId, status }: { eventId: string; taskId: string; status: string }) {
  if (status === "DONE" || status === "CANCELLED") return <span className="pill">{status === "DONE" ? "Hecha" : "Cancelada"}</span>;
  return (
    <button
      className="btn"
      data-testid="task-complete"
      onClick={async () => {
        await fetch(`/api/events/${eventId}/tasks/${taskId}`, { method: "PATCH", headers: { "content-type": "application/json", "x-csrf-token": csrf() }, body: JSON.stringify({ status: "DONE" }) });
        window.location.reload();
      }}
    >
      Completar
    </button>
  );
}

export function IncidentActions({ eventId, incidentId, status }: { eventId: string; incidentId: string; status: string }) {
  if (status === "resolved" || status === "closed") return <span className="pill">Resuelto</span>;
  return (
    <button
      className="btn"
      data-testid="incident-resolve"
      onClick={async () => {
        await fetch(`/api/events/${eventId}/incidents/${incidentId}`, { method: "PATCH", headers: { "content-type": "application/json", "x-csrf-token": csrf() }, body: JSON.stringify({ status: "resolved" }) });
        window.location.reload();
      }}
    >
      Resolver
    </button>
  );
}

export function BrainPanel({ eventId }: { eventId: string }) {
  const [text, setText] = useState("Preguntá por riesgo, entradas, sponsors o margen.");
  const [pending, setPending] = useState<{ type: "COMPLETE_TASK" | "RESOLVE_INCIDENT"; taskId?: string; incidentId?: string } | null>(null);
  async function ask(question: string) {
    const data = await send(`/api/events/${eventId}/brain`, { question });
    setText(data.text || "");
    setPending(data.requiresConfirmation ? data.proposal : null);
  }
  return (
    <div data-testid="brain-panel">
      <div className="inline">
        <button className="btn" data-testid="brain-q-risk" onClick={() => ask("qué está en riesgo esta semana")}>Riesgo</button>
        <button className="btn" data-testid="brain-q-tickets" onClick={() => ask("cuántas entradas se vendieron")}>Entradas</button>
        <button className="btn" data-testid="brain-q-sponsors" onClick={() => ask("sponsors con entregables pendientes")}>Sponsors</button>
        <button className="btn" data-testid="brain-q-margin" onClick={() => ask("cuál es el margen")}>Margen</button>
      </div>
      <p data-testid="brain-answer">{text}</p>
      {pending ? (
        <button className="btn primary" onClick={async () => { await send(`/api/events/${eventId}/brain/confirm`, { ...pending, confirm: true }); window.location.reload(); }}>
          Confirmar cambio
        </button>
      ) : null}
    </div>
  );
}

export function TicketingActions({ eventId }: { eventId: string }) {
  const [message, setMessage] = useState("");
  return (
    <div className="inline">
      <button className="btn primary" onClick={async () => { await send(`/api/events/${eventId}/ticketing/sync`, {}); window.location.reload(); }}>Reintentar sync</button>
      <button className="btn" data-testid="abra-probe" onClick={async () => {
        const response = await fetch(`/api/events/${eventId}/ticketing/probe`, { method: "POST", headers: { "content-type": "application/json", "x-csrf-token": csrf() }, body: "{}" });
        const data = await response.json();
        setMessage(data?.error?.message || "Abra respondió");
      }}>Probar Abra</button>
      {message ? <p data-testid="abra-message">{message}</p> : null}
    </div>
  );
}

export function ConnectButton({ eventId, toAttendeeId }: { eventId: string; toAttendeeId: string }) {
  return <button className="btn" onClick={async () => { await send(`/api/events/${eventId}/networking`, { toAttendeeId }); window.location.reload(); }}>Pedir conexión</button>;
}

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <form className="card stack" onSubmit={async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
      const data = await response.json();
      if (!response.ok) { setError(data?.error?.message || "Error"); return; }
      router.push(`/events/${data.slug}/control-center`);
      router.refresh();
    }}>
      <label>Email<input className="input" data-testid="email" name="email" type="email" required /></label>
      <label>Contraseña<input className="input" data-testid="password" name="password" type="password" required /></label>
      {error ? <p>{error}</p> : null}
      <button className="btn primary" data-testid="login-submit" type="submit">Entrar</button>
    </form>
  );
}
