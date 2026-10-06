import { describe, expect, it } from "vitest";
import { canManage, canOperate } from "@/lib/services/event-access";
import { canReadFinance, canReadSponsor, type Actor } from "@/lib/domain/rbac";

const event = { id: "evt_vendimia", organizationId: "org_vendimia" };

function actor(partial: Partial<Actor> & Pick<Actor, "userId" | "email">): Actor {
  return { name: partial.userId, memberships: [], eventRoles: [], access: [], ...partial };
}

describe("RBAC", () => {
  it("follows the uploaded management roles", () => {
    expect(canManage("FUNCTIONAL_LEAD")).toBe(true);
    expect(canManage("STAFF")).toBe(false);
    expect(canOperate("STAFF")).toBe(true);
    expect(canManage("SPONSOR")).toBe(false);
  });

  it("does not authorize a sponsor by contact email", () => {
    const snoop = actor({
      userId: "usr_snoop",
      email: "rio@sponsors.demo",
      eventRoles: [{ eventId: event.id, role: "ATTENDEE" }],
    });
    expect(canReadSponsor(snoop, event, { id: "spo_rio", contactEmail: "rio@sponsors.demo" })).toBe(false);
    const elena = actor({
      userId: "usr_elena",
      email: "elena.sponsor@vendimiatech.demo",
      eventRoles: [{ eventId: event.id, role: "SPONSOR" }],
      access: [{ eventId: event.id, role: "SPONSOR", entityType: "SPONSOR", entityId: "spo_andes" }],
    });
    expect(canReadSponsor(elena, event, { id: "spo_andes" })).toBe(true);
    expect(canReadSponsor(elena, event, { id: "spo_rio" })).toBe(false);
    expect(canReadFinance(elena, event)).toBe(false);
    expect(canReadFinance(actor({ userId: "usr_ana", email: "a@x", eventRoles: [{ eventId: event.id, role: "OWNER" }] }), event)).toBe(true);
  });
});
