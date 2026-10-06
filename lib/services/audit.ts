import { prisma } from '../../lib/prisma';

export async function audit(eventId: string | null, actorId: string | null, action: string, entityType: string, entityId: string, metadata?: unknown) {
  return prisma.auditLog.create({
    data: { eventId, actorId, action, entityType, entityId, metadata: metadata as any },
  });
}
