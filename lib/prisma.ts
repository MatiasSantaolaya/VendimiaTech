import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  return new PrismaClient();
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
    const value = Reflect.get(globalForPrisma.prisma, prop, receiver);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(globalForPrisma.prisma) : value;
  },
});
