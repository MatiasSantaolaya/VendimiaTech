import { cookies } from "next/headers";
import { sha256 } from "./domain/ids";
import { prisma } from "./prisma";

const COOKIE = "plane_session";

export async function findActiveSession(raw: string | null | undefined) {
  if (!raw || !process.env.DATABASE_URL) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: sha256(raw) }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
  return session;
}

export async function getCurrentUser() {
  if (!process.env.DATABASE_URL) return null;
  const raw = (await cookies()).get(COOKIE)?.value;
  const session = await findActiveSession(raw);
  return session?.user ?? null;
}
