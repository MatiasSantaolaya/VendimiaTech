import { prisma } from '../../lib/prisma';
import type { MembershipRole } from '@prisma/client';

export const MANAGEMENT_ROLES: MembershipRole[] = ['OWNER','ADMIN','EVENT_MANAGER','FUNCTIONAL_LEAD'];

export async function getEventAccess(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, slug: true, organizationId: true, status: true, timezone: true, startAt: true, endAt: true, capacity: true, objectiveAttendees: true },
  });
  if (!event) return null;
  const [orgMembership, eventMembership] = await Promise.all([
    prisma.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: event.organizationId, userId } } }),
    prisma.eventMember.findUnique({ where: { eventId_userId: { eventId, userId } } }),
  ]);
  if (!orgMembership && !eventMembership) return null;
  const role = (eventMembership?.role ?? orgMembership?.role ?? 'STAFF') as MembershipRole;
  return { event, role, orgMembership, eventMembership };
}

export function canManage(role: MembershipRole) { return MANAGEMENT_ROLES.includes(role); }
export function canOperate(role: MembershipRole) { return canManage(role) || role === 'STAFF'; }

export async function requireEventAccess(eventId: string, userId: string) {
  const access = await getEventAccess(eventId, userId);
  if (!access) throw new Error('FORBIDDEN');
  return access;
}
