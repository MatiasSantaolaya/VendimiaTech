import type { Metadata } from "next";
import Link from "next/link";
import RegisterSW from "@/components/RegisterSW";
import "./globals.css";

export const metadata: Metadata = {
  title: "PLANe",
  description: "Un evento, un sistema operativo completo.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <RegisterSW />
        <header className="topbar">
          <Link className="brand-lockup" href="/">PLANe<small>Event OS</small></Link>
          <nav className="inline">
            <Link href="/demo">Demo</Link>
            <Link href="/login">Entrar</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
