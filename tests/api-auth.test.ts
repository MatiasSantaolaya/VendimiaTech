import { beforeEach, describe, expect, it } from "vitest";
import { handleApi } from "@/lib/server/api";
import { DEMO_PASSWORD, EVENT_ID, OTHER_EVENT_ID } from "@/lib/demo/build";
import { resetDemoStore } from "@/lib/demo/store";
import { createHmac } from "node:crypto";
import { MOCK_WEBHOOK_SECRET } from "@/lib/ticketing/mock";

beforeEach(() => {
  resetDemoStore();
});

async function login(email: string, password = DEMO_PASSWORD) {
  const response = await handleApi(new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({ email, password }),
  }));
  const cookies = response.headers.getSetCookie?.() ?? [];
  const session = cookies.find((cookie) => cookie.startsWith("plane_session="))?.split(";")[0]?.split("=")[1];
  const csrf = cookies.find((cookie) => cookie.startsWith("plane_csrf="))?.split(";")[0]?.split("=")[1];
  return { response, session: session ? decodeURIComponent(session) : "", csrf: csrf ? decodeURIComponent(csrf) : "" };
}

function authed(url: string, session: string, csrf: string, method = "GET", body?: unknown) {
  return handleApi(new Request(url, {
    method,
    headers: {
      origin: "http://localhost",
      cookie: `plane_session=${encodeURIComponent(session)}; plane_csrf=${encodeURIComponent(csrf)}; plane_demo=1`,
      "content-type": "application/json",
      "x-csrf-token": csrf,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }));
}

describe("auth and tenancy", () => {
  it("rejects anonymous reads and logs in", async () => {
    const anon = await handleApi(new Request("http://localhost/api/events/evt_vendimia"));
    expect(anon.status).toBe(401);
    const { response, session } = await login("ana.organizer@vendimiatech.demo");
    expect(response.status).toBe(200);
    expect(session).toBeTruthy();
  });

  it("denies the other organization", async () => {
    const ana = await login("ana.organizer@vendimiatech.demo");
    const denied = await authed(`http://localhost/api/events/${OTHER_EVENT_ID}`, ana.session, ana.csrf);
    expect(denied.status).toBe(403);
    const allowed = await authed(`http://localhost/api/events/${EVENT_ID}`, ana.session, ana.csrf);
    expect(allowed.status).toBe(200);
    const karen = await login("karen.owner@bodegasur.demo");
    const cross = await authed(`http://localhost/api/events/${EVENT_ID}`, karen.session, karen.csrf);
    expect(cross.status).toBe(403);
  });

  it("hides finance from a sponsor", async () => {
    const elena = await login("elena.sponsor@vendimiatech.demo");
    const response = await authed(`http://localhost/api/events/${EVENT_ID}/finance`, elena.session, elena.csrf);
    expect(response.status).toBe(403);
  });

  it("rate-limits bad passwords", async () => {
    for (let i = 0; i < 5; i += 1) {
      const response = await login("ana.organizer@vendimiatech.demo", "wrong-password");
      expect(response.response.status).toBe(401);
    }
    const blocked = await login("ana.organizer@vendimiatech.demo", "wrong-password");
    expect(blocked.response.status).toBe(429);
  });

  it("revokes the session on logout", async () => {
    const ana = await login("ana.organizer@vendimiatech.demo");
    const out = await authed("http://localhost/api/auth/logout", ana.session, ana.csrf, "POST", {});
    expect(out.status).toBe(200);
    const again = await authed(`http://localhost/api/events/${EVENT_ID}`, ana.session, ana.csrf);
    expect(again.status).toBe(401);
  });

  it("rejects a mock webhook with a bad signature and accepts a good one", async () => {
    const raw = JSON.stringify({ id: "wh1", type: "order.paid", data: { code: "G-0001" } });
    const bad = await handleApi(new Request("http://localhost/api/ticketing/webhook", { method: "POST", headers: { "x-ticketing-provider": "mock", "x-signature": "nope" }, body: raw }));
    expect(bad.status).toBe(401);
    const signature = createHmac("sha256", MOCK_WEBHOOK_SECRET).update(raw).digest("hex");
    const good = await handleApi(new Request("http://localhost/api/ticketing/webhook", { method: "POST", headers: { "x-ticketing-provider": "mock", "x-signature": signature }, body: raw }));
    expect(good.status).toBe(200);
  });

  it("does not mutate when the brain is asked to complete a task", async () => {
    const ana = await login("ana.organizer@vendimiatech.demo");
    const response = await authed(`http://localhost/api/events/${EVENT_ID}/brain`, ana.session, ana.csrf, "POST", { question: "completar tarea tsk_overdue" });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.requiresConfirmation).toBe(true);
    expect(body.mutated).toBe(false);
    const state = (await import("@/lib/demo/store")).getDemoState();
    expect(state.tasks.find((row) => row.id === "tsk_overdue")?.status).toBe("TODO");
  });
});
