import { PrismaClient, type EventStatus, type MembershipRole } from "@prisma/client";
import { buildDemoState } from "../lib/demo/build";

const prisma = new PrismaClient();
const data = buildDemoState();

async function main() {
  for (const org of data.organizations) {
    await prisma.organization.upsert({ where: { id: org.id }, update: { name: org.name, slug: org.slug }, create: org });
  }
  for (const user of data.users) {
    await prisma.user.upsert({ where: { id: user.id }, update: { email: user.email, name: user.name, passwordHash: user.passwordHash }, create: user });
  }
  for (const row of data.memberships) {
    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: row.organizationId, userId: row.userId } },
      update: { role: row.role as MembershipRole },
      create: { ...row, role: row.role as MembershipRole },
    });
  }
  for (const event of data.events) {
    await prisma.event.upsert({
      where: { id: event.id },
      update: { name: event.name, status: event.status as EventStatus, healthScore: event.healthScore },
      create: { ...event, status: event.status as EventStatus, branding: event.branding, configuration: event.configuration, objectives: event.objectives, metadata: event.metadata },
    });
  }
  for (const row of data.eventMembers) {
    await prisma.eventMember.upsert({
      where: { eventId_userId: { eventId: row.eventId, userId: row.userId } },
      update: { role: row.role as MembershipRole },
      create: { ...row, role: row.role as MembershipRole },
    });
  }
  console.log("Demo fixture upserted for", data.events.map((event) => event.slug).join(", "));
  console.log("This seed writes organizations, users, memberships, and events. Run the app demo route for the full in-memory graph without Postgres.");
}

main().finally(() => prisma.$disconnect());
