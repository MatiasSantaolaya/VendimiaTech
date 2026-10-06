"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  return (
    <main className="hero">
      <h1>Aceptar invitación</h1>
      <form className="stack" onSubmit={async (event) => {
        event.preventDefault();
        const token = (await params).token;
        const form = new FormData(event.currentTarget);
        const response = await fetch("/api/auth/invitations/accept", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, name: form.get("name"), password: form.get("password") }) });
        const data = await response.json();
        setMessage(response.ok ? "Listo" : data?.error?.message || "Error");
        if (response.ok) { router.push("/demo"); router.refresh(); }
      }}>
        <input className="input" name="name" placeholder="Nombre" required />
        <input className="input" name="password" type="password" placeholder="Contraseña" required />
        <button className="btn primary" type="submit">Aceptar</button>
        {message ? <p>{message}</p> : null}
      </form>
    </main>
  );
}
