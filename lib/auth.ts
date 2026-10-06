import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const COOKIE = "plane_session";

export async function getCurrentUser() {
  if (!process.env.DATABASE_URL) return null;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const session = await prisma.session.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
  return session.user;
}
