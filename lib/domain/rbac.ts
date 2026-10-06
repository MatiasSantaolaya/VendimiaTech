export const ROLES = ["OWNER", "ADMIN", "EVENT_MANAGER", "FUNCTIONAL_LEAD", "STAFF", "SPONSOR", "SPEAKER", "VENDOR", "ATTENDEE"] as const;
export type Role = (typeof ROLES)[number];

export const MANAGEMENT_ROLES: Role[] = ["OWNER", "ADMIN", "EVENT_MANAGER", "FUNCTIONAL_LEAD"];

export function canManageRole(role: Role) {
  return MANAGEMENT_ROLES.includes(role);
}

export function canOperateRole(role: Role) {
  return canManageRole(role) || role === "STAFF";
}

export type Actor = {
  userId: string;
  email: string;
  name: string;
  memberships: { organizationId: string; role: Role }[];
  eventRoles: { eventId: string; role: Role }[];
  access: { eventId: string; role: Role; entityType: string; entityId: string }[];
};

export function roleForEvent(actor: Actor, event: { id: string; organizationId: string }): Role | null {
  const eventRole = actor.eventRoles.find((row) => row.eventId === event.id);
  if (eventRole) return eventRole.role;
  const org = actor.memberships.find((row) => row.organizationId === event.organizationId);
  return org?.role ?? null;
}

export function canAccessEvent(actor: Actor, event: { id: string; organizationId: string }) {
  return roleForEvent(actor, event) !== null;
}

export function canReadSponsor(actor: Actor, event: { id: string; organizationId: string }, sponsor: { id: string; contactEmail?: string }) {
  const role = roleForEvent(actor, event);
  if (!role || !canAccessEvent(actor, event)) return false;
  if (canManageRole(role)) return true;
  if (role !== "SPONSOR") return false;
  return actor.access.some((row) => row.eventId === event.id && row.entityType === "SPONSOR" && row.entityId === sponsor.id);
}

export function canReadSpeaker(actor: Actor, event: { id: string; organizationId: string }, speakerId: string) {
  const role = roleForEvent(actor, event);
  if (!role) return false;
  if (canManageRole(role)) return true;
  if (role !== "SPEAKER") return false;
  return actor.access.some((row) => row.eventId === event.id && row.entityType === "SPEAKER" && row.entityId === speakerId);
}

export function canReadVendor(actor: Actor, event: { id: string; organizationId: string }, vendorId: string) {
  const role = roleForEvent(actor, event);
  if (!role) return false;
  if (canManageRole(role)) return true;
  if (role !== "VENDOR") return false;
  return actor.access.some((row) => row.eventId === event.id && row.entityType === "VENDOR" && row.entityId === vendorId);
}

export function canReadFinance(actor: Actor, event: { id: string; organizationId: string }) {
  const role = roleForEvent(actor, event);
  return !!role && canManageRole(role);
}

export function canOperateEvent(actor: Actor, event: { id: string; organizationId: string }) {
  const role = roleForEvent(actor, event);
  return !!role && canOperateRole(role);
}
