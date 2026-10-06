import { LoginForm } from "@/components/actions";

export default function LoginPage() {
  return (
    <main className="hero" style={{ maxWidth: 460 }}>
      <h1>Entrar</h1>
      <p className="muted">En la demo, ana.organizer@vendimiatech.demo / vendimia-demo.</p>
      <LoginForm />
    </main>
  );
}
