import { createHash, randomBytes } from "node:crypto";

export function createId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function newSecret() {
  return randomBytes(32).toString("hex");
}
