// WR-06 (Phase-1 deferred, closed in Phase-2 Plan 02): audit trail on privileged escalations.
//
// This drives the REAL exported server actions (activateHosting/activateBooking) — the exact gap
// 01-REVIEW.md § WR-06/WR-07 flagged: the prior capability-activate test reproduced a bare
// db.update instead of invoking the shipped action, so a regression inside the action went
// uncaught. Here we mock the action's edges (next/headers, auth.api.getSession, the db update) and
// assert the OBSERVABLE audit behavior via the src/lib/audit.ts console sink:
//   - a successful activation records an audit entry with actorId + action + outcome:"ok"
//   - an unauthenticated call is rejected and records NOTHING privileged (no audit, no db write)

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

// Hoisted mock fns so the vi.mock factories (hoisted above imports) can close over them.
const h = vi.hoisted(() => {
  const whereMock = vi.fn(async () => undefined);
  const setMock = vi.fn(() => ({ where: whereMock }));
  const updateMock = vi.fn(() => ({ set: setMock }));
  const getSessionMock = vi.fn();
  const headersMock = vi.fn(async () => new Headers());
  return { whereMock, setMock, updateMock, getSessionMock, headersMock };
});

vi.mock("next/headers", () => ({ headers: h.headersMock }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: h.getSessionMock } } }));
vi.mock("@/lib/db", () => ({ db: { update: h.updateMock } }));

// Import the REAL actions AFTER the mocks are registered. rate-limit + audit run for real.
import { activateHosting, activateBooking } from "@/app/actions/capability";

/** Pull the parsed payloads of every console.info("[audit]", json) call from a spy. */
function auditEntries(spy: Mock) {
  return spy.mock.calls
    .filter((c) => c[0] === "[audit]")
    .map((c) => JSON.parse(c[1] as string) as Record<string, unknown>);
}

let infoSpy: Mock;

beforeEach(() => {
  h.updateMock.mockClear();
  h.setMock.mockClear();
  h.whereMock.mockClear();
  h.getSessionMock.mockReset();
  infoSpy = vi.spyOn(console, "info").mockImplementation(() => {}) as unknown as Mock;
});

afterEach(() => {
  (infoSpy as unknown as { mockRestore: () => void }).mockRestore();
});

describe("recordAudit on privileged escalations (WR-06)", () => {
  it("activateHosting records an audit entry with actor id, action, and outcome:ok", async () => {
    h.getSessionMock.mockResolvedValue({ user: { id: "audit-host-ok" } });

    const res = await activateHosting();
    expect(res).toEqual({ ok: true, redirectTo: "/host" });

    // The privileged flip happened.
    expect(h.updateMock).toHaveBeenCalledTimes(1);

    // Exactly one audit entry, carrying the actor, action, and successful outcome.
    const entries = auditEntries(infoSpy);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      actorId: "audit-host-ok",
      action: "activateHosting",
      outcome: "ok",
    });
    // Non-repudiable: the entry is timestamped.
    expect(typeof entries[0].ts).toBe("string");
  });

  it("activateBooking records an audit entry with outcome:ok", async () => {
    h.getSessionMock.mockResolvedValue({ user: { id: "audit-book-ok" } });

    const res = await activateBooking();
    expect(res).toEqual({ ok: true, redirectTo: "/" });

    const entries = auditEntries(infoSpy);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      actorId: "audit-book-ok",
      action: "activateBooking",
      outcome: "ok",
    });
  });

  it("an unauthenticated activateHosting call records NOTHING privileged", async () => {
    h.getSessionMock.mockResolvedValue(null);

    const res = await activateHosting();
    expect(res.ok).toBe(false);

    // No privileged db write and no audit entry for a call that never passed the session gate.
    expect(h.updateMock).not.toHaveBeenCalled();
    expect(auditEntries(infoSpy)).toHaveLength(0);
  });
});
