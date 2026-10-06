import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/domain/password";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const orgName = process.env.SEED_ORG_NAME;
  if (!email || !password || !orgName) {
    console.log("Production seed is a no-op. Set SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, and SEED_ORG_NAME to create an owner. Demo fixtures are not loaded here.");
    return;
  }
  if (password.length < 8) throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters");
  const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "org";
  const org = await prisma.organization.upsert({
    where: { slug },
    update: { name: orgName },
    create: { id: `org_${slug}`, name: orgName, slug },
  });
  const user = await prisma.user.upsert({
    where: { email },
    update: { name: process.env.SEED_ADMIN_NAME || "Admin" },
    create: { id: `usr_${slug}_admin`, email, name: process.env.SEED_ADMIN_NAME || "Admin", passwordHash: hashPassword(password) },
  });
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
    update: { role: "OWNER" },
    create: { id: `mem_${user.id}`, organizationId: org.id, userId: user.id, role: "OWNER" },
  });
  console.log("Production owner ensured for", email);
}

main().finally(() => prisma.$disconnect());
