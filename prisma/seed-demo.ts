import { Prisma, PrismaClient, type EventStatus, type MembershipRole } from "@prisma/client";
import { buildDemoState } from "../lib/demo/build";

const prisma = new PrismaClient();
const data = buildDemoState();

const at = (value: string | null | undefined) => (value ? new Date(value) : null);
const json = (value: unknown) => value as Prisma.InputJsonValue;

async function main() {
  for (const org of data.organizations) {
    await prisma.organization.upsert({ where: { id: org.id }, update: { name: org.name, slug: org.slug }, create: org });
  }
  for (const user of data.users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { email: user.email, name: user.name, passwordHash: user.passwordHash },
      create: user,
    });
  }
  for (const row of data.memberships) {
    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: row.organizationId, userId: row.userId } },
      update: { role: row.role as MembershipRole },
      create: { ...row, role: row.role as MembershipRole },
    });
  }
  for (const event of data.events) {
    const fields = {
      name: event.name,
      slug: event.slug,
      description: event.description,
      startAt: at(event.startAt),
      endAt: at(event.endAt),
      timezone: event.timezone,
      city: event.city,
      country: event.country,
      status: event.status as EventStatus,
      capacity: event.capacity,
      objectiveAttendees: event.objectiveAttendees,
      budgetCents: event.budgetCents,
      healthScore: event.healthScore,
      branding: json(event.branding),
      configuration: json(event.configuration),
      objectives: json(event.objectives),
      metadata: json(event.metadata),
      abraCheckoutEvent: event.abraCheckoutEvent,
    };
    await prisma.event.upsert({
      where: { id: event.id },
      update: fields,
      create: { id: event.id, organizationId: event.organizationId, ...fields },
    });
  }
  for (const row of data.eventMembers) {
    await prisma.eventMember.upsert({
      where: { eventId_userId: { eventId: row.eventId, userId: row.userId } },
      update: { role: row.role as MembershipRole },
      create: { ...row, role: row.role as MembershipRole },
    });
  }
  for (const row of data.access) {
    await prisma.entityAccess.upsert({
      where: { id: row.id },
      update: { role: row.role as MembershipRole, entityType: row.entityType, entityId: row.entityId },
      create: { ...row, role: row.role as MembershipRole },
    });
  }
  for (const row of data.categories) {
    await prisma.budgetCategory.upsert({ where: { id: row.id }, update: row, create: row });
  }
  for (const row of data.deals) {
    await prisma.sponsorDeal.upsert({ where: { id: row.id }, update: row, create: row });
  }
  for (const row of data.deliverables) {
    await prisma.sponsorDeliverable.upsert({
      where: { id: row.id },
      update: { title: row.title, status: row.status, dueAt: at(row.dueAt), dealId: row.dealId },
      create: { id: row.id, dealId: row.dealId, title: row.title, status: row.status, dueAt: at(row.dueAt) },
    });
  }
  for (const row of data.tasks) {
    const fields = {
      eventId: row.eventId,
      parentId: row.parentId,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      assigneeId: row.assigneeId,
      dueAt: at(row.dueAt),
      checklist: json(row.checklist),
      approvalStatus: row.approvalStatus,
    };
    await prisma.task.upsert({
      where: { id: row.id },
      update: fields,
      create: { id: row.id, ...fields },
    });
  }
  for (const row of data.incidents) {
    const fields = {
      eventId: row.eventId,
      title: row.title,
      description: row.description,
      status: row.status,
      severity: row.severity,
      zoneId: row.zoneId,
      assigneeId: row.assigneeId,
      resolvedAt: at(row.resolvedAt),
    };
    await prisma.incident.upsert({
      where: { id: row.id },
      update: fields,
      create: { id: row.id, ...fields },
    });
  }
  for (const row of data.expenses) {
    const fields = {
      eventId: row.eventId,
      categoryId: row.categoryId,
      vendorId: row.vendorId,
      description: row.description,
      amountCents: row.amountCents,
      status: row.status,
      direct: row.direct,
      incurredAt: new Date(row.incurredAt),
    };
    await prisma.expense.upsert({ where: { id: row.id }, update: fields, create: { id: row.id, ...fields } });
  }
  for (const row of data.revenues) {
    const fields = {
      eventId: row.eventId,
      type: row.type,
      description: row.description,
      amountCents: row.amountCents,
      sponsorId: row.sponsorId,
      receivedAt: new Date(row.receivedAt),
    };
    await prisma.revenue.upsert({ where: { id: row.id }, update: fields, create: { id: row.id, ...fields } });
  }
  for (const row of data.invoices) {
    const fields = {
      eventId: row.eventId,
      sponsorId: row.sponsorId,
      number: row.number,
      amountCents: row.amountCents,
      status: row.status,
      dueAt: new Date(row.dueAt),
    };
    await prisma.invoice.upsert({ where: { id: row.id }, update: fields, create: { id: row.id, ...fields } });
  }
  for (const row of data.payments) {
    const fields = {
      eventId: row.eventId,
      invoiceId: row.invoiceId,
      amountCents: row.amountCents,
      method: row.method,
      status: row.status,
      paidAt: at(row.paidAt),
    };
    await prisma.payment.upsert({ where: { id: row.id }, update: fields, create: { id: row.id, ...fields } });
  }
  const [tasks, incidents, sponsors, expenses] = await Promise.all([
    prisma.task.count(),
    prisma.incident.count(),
    prisma.sponsorDeal.count(),
    prisma.expense.count(),
  ]);
  console.log("Demo fixture upserted for", data.events.map((event) => event.slug).join(", "));
  console.log(`Rows: tasks=${tasks} incidents=${incidents} sponsors=${sponsors} expenses=${expenses}`);
}

main().finally(() => prisma.$disconnect());
