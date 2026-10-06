import { execSync } from "node:child_process";

try {
  execSync("prisma generate", { stdio: "inherit" });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`prisma generate skipped: ${message}`);
}
