import { existsSync } from "node:fs";

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";

import { user, verification } from "@/lib/db/schema";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";

const calls = vi.hoisted(() => [] as string[]);
const originGate = vi.hoisted(() =>
  vi.fn(async () => {
    calls.push("origin");
  }),
);
const staffGate = vi.hoisted(() =>
  vi.fn(async () => {
    calls.push("staff");
    return { id: "staff-b" };
  }),
);
const writeRole = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());
const issueInvitation = vi.hoisted(() => vi.fn());
const resendInvitation = vi.hoisted(() => vi.fn());
const cancelInvitation = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ops/staff", () => ({
  requireOpsMutationOrigin: originGate,
  requireStaff: staffGate,
}));

vi.mock("@/lib/ops/grant", () => ({
  DEFAULT_ROLE: "user",
  STAFF_ROLE: "staff",
  SELF_REVOKE_REASON: "You can't revoke your own staff access.",
  LAST_STAFF_REVOKE_REASON: "You can't revoke the last staff account.",
  writeRole,
}));

vi.mock("@/lib/ops/invitations", () => ({
  issueStaffInvitation: issueInvitation,
  resendStaffInvitation: resendInvitation,
  cancelStaffInvitation: cancelInvitation,
}));

vi.mock("next/cache", () => ({ revalidatePath }));

type SnapshotModule = typeof import("@/lib/ops/staff-management");
type StaffActionModule = typeof import("@/app/actions/ops-staff");

const snapshotPath = "src/lib/ops/staff-management.ts";
const snapshotExists = existsSync(snapshotPath);

let testDb: TestDb;

beforeAll(async () => {
  testDb = await setupTestDb();
});

beforeEach(async () => {
  calls.length = 0;
  vi.clearAllMocks();
  originGate.mockImplementation(async () => {
    calls.push("origin");
  });
  staffGate.mockImplementation(async () => {
    calls.push("staff");
    return { id: "staff-b" };
  });
  writeRole.mockResolvedValue({
    outcome: "written",
    userId: "staff-a",
    previousRole: "staff",
    role: "user",
  });
  await testDb.db.execute(sql`DELETE FROM audit`);
  await testDb.db.execute(sql`DELETE FROM verification`);
  await testDb.db.execute(sql`DELETE FROM session`);
  await testDb.db.execute(sql`DELETE FROM account`);
  await testDb.db.execute(sql`DELETE FROM "user"`);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

async function seedUser(input: {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
}): Promise<void> {
  await testDb.db.insert(user).values({
    ...input,
    firstName: input.name,
    emailVerified: true,
  });
}

async function seedInvitation(input: {
  id: string;
  email: string;
  inviterUserId: string;
  sentAt: string;
  expiresAt: Date;
}): Promise<void> {
  await testDb.db.insert(verification).values({
    id: input.id,
    identifier: `${input.id}-version`,
    value: JSON.stringify({
      version: 1,
      email: input.email,
      inviterUserId: input.inviterUserId,
      sentAt: input.sentAt,
    }),
    expiresAt: input.expiresAt,
  });
}

describe("OPS-09/10 protected staff-management snapshot", () => {
  it("exports the protected snapshot module", () => {
    expect(snapshotExists, `${snapshotPath} must exist`).toBe(true);
  });

  it.skipIf(!snapshotExists)(
    "returns stable active/pending ordering and server-derived action eligibility",
    async () => {
      const snapshotModule = (await vi.importActual(
        "@/lib/ops/staff-management",
      )) as SnapshotModule;
      const sameCreatedAt = new Date("2026-09-08T00:00:00.000Z");
      await seedUser({
        id: "staff-z",
        email: "z@example.com",
        name: "Staff Z",
        role: "staff",
        createdAt: sameCreatedAt,
      });
      await seedUser({
        id: "staff-a",
        email: "a@example.com",
        name: "Staff A",
        role: "staff",
        createdAt: sameCreatedAt,
      });
      await seedUser({
        id: "staff-b",
        email: "b@example.com",
        name: "Staff B",
        role: "staff",
        createdAt: new Date("2026-09-08T01:00:00.000Z"),
      });

      const sameSentAt = "2026-09-08T02:00:00.000Z";
      await seedInvitation({
        id: "staff-invite:a",
        email: "pending-a@example.com",
        inviterUserId: "staff-a",
        sentAt: sameSentAt,
        expiresAt: new Date("2099-09-09T02:00:00.000Z"),
      });
      await seedInvitation({
        id: "staff-invite:z",
        email: "pending-z@example.com",
        inviterUserId: "staff-z",
        sentAt: sameSentAt,
        expiresAt: new Date("2099-09-09T02:00:00.000Z"),
      });

      const snapshot = await snapshotModule.readStaffManagementSnapshot(testDb.db);

      expect(staffGate).toHaveBeenCalledTimes(1);
      expect(snapshot.activeStaff.map((row) => row.actionRef.targetUserId)).toEqual([
        "staff-a",
        "staff-z",
        "staff-b",
      ]);
      expect(snapshot.pendingInvitations.map((row) => row.actionRef.id)).toEqual([
        "staff-invite:z",
        "staff-invite:a",
      ]);
      expect(snapshot.activeStaff[2]).toMatchObject({
        email: "b@example.com",
        isCurrentActor: true,
        canRevoke: false,
        revokeDisabledReason: "You can't revoke your own staff access.",
      });
      expect(snapshot.activeStaff[0]).toMatchObject({
        email: "a@example.com",
        isCurrentActor: false,
        canRevoke: true,
        revokeDisabledReason: null,
      });
      expect(snapshot.pendingInvitations[0]).toMatchObject({
        email: "pending-z@example.com",
        inviterLabel: "Staff Z",
        actionRef: {
          id: "staff-invite:z",
          version: "staff-invite:z-version",
        },
      });
      expect(Object.keys(snapshot.activeStaff[0]).sort()).toEqual([
        "actionRef",
        "canRevoke",
        "email",
        "isCurrentActor",
        "revokeDisabledReason",
        "staffSinceLabel",
      ]);
    },
  );

  it.skipIf(!snapshotExists)("refuses an impossible zero-active-staff snapshot", async () => {
    const snapshotModule = (await vi.importActual(
      "@/lib/ops/staff-management",
    )) as SnapshotModule;

    await expect(snapshotModule.readStaffManagementSnapshot(testDb.db)).rejects.toThrow(
      "STAFF_MANAGEMENT_INVARIANT_EMPTY",
    );
  });
});

describe("OPS-10 revokeStaffAction", () => {
  it("guards origin first, staff second, and ignores forged form identity", async () => {
    const actions = (await vi.importActual("@/app/actions/ops-staff")) as StaffActionModule;
    expect(actions.revokeStaffAction, "revokeStaffAction must exist").toBeTypeOf("function");
    const forged = new FormData();
    forged.set("actorId", "attacker");
    forged.set("targetUserId", "different-target");
    forged.set("staffCount", "99");
    forged.set("canRevoke", "true");

    await actions.revokeStaffAction(
      "staff-a",
      { status: "idle" },
      forged,
    );

    expect(calls).toEqual(["origin", "staff"]);
    expect(writeRole).toHaveBeenCalledWith(
      { target: "staff-a", actorId: "staff-b", role: "user" },
      expect.anything(),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/ops");
  });

  it("stops a marketplace-host dispatch before staff lookup or mutation", async () => {
    const actions = (await vi.importActual("@/app/actions/ops-staff")) as StaffActionModule;
    expect(actions.revokeStaffAction).toBeTypeOf("function");
    originGate.mockRejectedValueOnce(new Error("NEXT_HTTP_ERROR_FALLBACK;404"));

    await expect(
      actions.revokeStaffAction("staff-a", { status: "idle" }, new FormData()),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");

    expect(staffGate).not.toHaveBeenCalled();
    expect(writeRole).not.toHaveBeenCalled();
  });

  it.each([
    ["self_revoke", "You can't revoke your own staff access."],
    ["last_staff", "You can't revoke the last staff account."],
  ] as const)("returns the shared %s refusal as persistent state", async (reason, message) => {
    const actions = (await vi.importActual("@/app/actions/ops-staff")) as StaffActionModule;
    expect(actions.revokeStaffAction).toBeTypeOf("function");
    writeRole.mockResolvedValueOnce({ outcome: "refused", reason });

    await expect(
      actions.revokeStaffAction("staff-a", { status: "idle" }, new FormData()),
    ).resolves.toEqual({ status: "error", action: "revoke", message });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
