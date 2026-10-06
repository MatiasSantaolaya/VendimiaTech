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
  for (const row of data.stages) {
    await prisma.stage.upsert({ where: { id: row.id }, update: { name: row.name, eventId: row.eventId }, create: row });
  }
  for (const row of data.speakers) {
    const fields = {
      eventId: row.eventId,
      personName: row.personName,
      email: row.email,
      company: row.company,
      bio: row.bio,
      status: row.status,
      topics: row.topics,
    };
    await prisma.speaker.upsert({ where: { id: row.id }, update: fields, create: { id: row.id, ...fields } });
  }
  for (const row of data.sessionsProgram) {
    const fields = {
      eventId: row.eventId,
      title: row.title,
      description: row.description,
      startAt: at(row.startAt),
      endAt: at(row.endAt),
      type: row.type,
      status: row.status,
      stageId: row.stageId,
      roomId: row.roomId,
    };
    await prisma.programSession.upsert({ where: { id: row.id }, update: fields, create: { id: row.id, ...fields } });
    for (const speakerId of row.speakerIds) {
      await prisma.sessionSpeaker.upsert({
        where: { sessionId_speakerId: { sessionId: row.id, speakerId } },
        update: {},
        create: { id: `ss_${row.id}_${speakerId}`, sessionId: row.id, speakerId },
      });
    }
  }
  for (const row of data.vendors) {
    await prisma.vendor.upsert({ where: { id: row.id }, update: row, create: row });
  }
  for (const row of data.runOfShow) {
    const fields = {
      eventId: row.eventId,
      title: row.title,
      startAt: at(row.startAt),
      endAt: at(row.endAt),
      area: row.area,
      location: row.location,
      stageId: row.stageId,
      ownerId: row.ownerId,
      status: row.status,
      critical: row.critical,
      notes: row.notes,
      dependsOnTaskId: row.dependsOnTaskId,
    };
    await prisma.runOfShowItem.upsert({ where: { id: row.id }, update: fields, create: { id: row.id, ...fields } });
  }
  for (const row of data.ticketTypes) {
    await prisma.ticketType.upsert({ where: { id: row.id }, update: row, create: row });
  }
  for (const row of data.orders) {
    const fields = {
      eventId: row.eventId,
      attendeeId: row.attendeeId,
      externalId: row.externalId,
      status: row.status,
      totalCents: row.totalCents,
      buyerName: row.buyerName,
      buyerEmail: row.buyerEmail,
      createdAt: new Date(row.createdAt),
    };
    await prisma.ticketOrder.upsert({ where: { id: row.id }, update: fields, create: { id: row.id, ...fields } });
  }
  for (const row of data.attendees) {
    const fields = {
      eventId: row.eventId,
      name: row.name,
      email: row.email,
      company: row.company,
      title: row.title,
      interests: row.interests,
      goals: row.goals,
      tags: row.tags,
      userId: row.userId,
    };
    await prisma.attendee.upsert({ where: { id: row.id }, update: fields, create: { id: row.id, ...fields } });
  }
  for (const row of data.tickets) {
    const fields = {
      eventId: row.eventId,
      orderId: row.orderId,
      attendeeId: row.attendeeId,
      typeId: row.typeId,
      status: row.status,
      code: row.code,
      checkedInAt: at(row.checkedInAt),
    };
    await prisma.ticket.upsert({ where: { id: row.id }, update: fields, create: { id: row.id, ...fields } });
  }
  for (const row of data.attendeeSessions) {
    const fields = {
      attendeeId: row.attendeeId,
      tokenHash: row.tokenHash,
      expiresAt: new Date(row.expiresAt),
      revokedAt: at(row.revokedAt),
    };
    await prisma.attendeeSession.upsert({ where: { id: row.id }, update: fields, create: { id: row.id, ...fields } });
  }
  const [tasks, incidents, sponsors, expenses, tickets, sessions, vendors, speakers, runOfShow] = await Promise.all([
    prisma.task.count(),
    prisma.incident.count(),
    prisma.sponsorDeal.count(),
    prisma.expense.count(),
    prisma.ticket.count(),
    prisma.programSession.count(),
    prisma.vendor.count(),
    prisma.speaker.count(),
    prisma.runOfShowItem.count(),
  ]);
  console.log("Demo fixture upserted for", data.events.map((event) => event.slug).join(", "));
  console.log(`Rows: tasks=${tasks} incidents=${incidents} sponsors=${sponsors} expenses=${expenses} tickets=${tickets} sessions=${sessions} vendors=${vendors} speakers=${speakers} runOfShow=${runOfShow}`);
}

main().finally(() => prisma.$disconnect());
