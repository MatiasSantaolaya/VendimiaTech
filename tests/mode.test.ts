import { describe, expect, it } from "vitest";
import { authCookieList } from "@/lib/server/http";
import { isDemoMode } from "@/lib/server/mode";

describe("demo versus database mode", () => {
  it("keeps memory mode without a database or with the demo cookie", () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    expect(isDemoMode(null)).toBe(true);
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/plane";
    expect(isDemoMode(null)).toBe(false);
    expect(isDemoMode("1")).toBe(true);
    if (previous) process.env.DATABASE_URL = previous;
    else delete process.env.DATABASE_URL;
  });

  it("does not mark a database login as demo", () => {
    const request = new Request("http://localhost/api/auth/login");
    const cookies = authCookieList(request, "token", "csrf", false).join("\n");
    expect(cookies).toContain("plane_session=");
    expect(cookies).toContain("plane_csrf=");
    expect(cookies).toContain("plane_demo=; Path=/; SameSite=Lax; Max-Age=0");
    expect(cookies).not.toContain("plane_demo=1");
  });
});