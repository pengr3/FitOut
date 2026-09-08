import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";

import { account, audit, user, verification } from "@/lib/db/schema";
import {
  acceptStaffInvitation,
  cancelStaffInvitation,
  inspectStaffInvitation,
  issueStaffInvitation,
  resendStaffInvitation,
  type StaffInvitationRef,
} from "@/lib/ops/invitations";
import {
  acceptStaffInvitationInput,
  issueStaffInvitationInput,
} from "@/lib/validation/ops-staff";
import { makeTestAuth } from "../helpers/auth";
import { makeRacingClients, setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { mockResend } from "../helpers/mocks";

let testDb: TestDb;

beforeAll(async () => {
  testDb = await setupTestDb();
});

beforeEach(async () => {
  await testDb.db.execute(sql`DELETE FROM audit`);
  await testDb.db.execute(sql`DELETE FROM verification`);
  await testDb.db.execute(sql`DELETE FROM account`);
  await testDb.db.execute(sql`DELETE FROM "user"`);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

async function seedUser(input: {
  id: string;
  email: string;
  role?: string | null;
  canBook?: boolean;
  canHost?: boolean;
}) {
  await testDb.db.insert(user).values({
    id: input.id,
    name: input.id,
    firstName: input.id,
    email: input.email,
    emailVerified: true,
    role: input.role ?? "user",
    canBook: input.canBook ?? false,
    canHost: input.canHost ?? false,
  });
}

async function issue(email = "new.staff@example.com") {
  const result = await issueStaffInvitation({ email }, "staff-inviter", testDb.db);
  expect(result.outcome === "sent" || result.outcome === "pending-delivery-failed").toBe(true);
  if (!("invitation" in result)) throw new Error("issue returned no invitation");
  const link = mockResend.lastLink();
  if (!link) throw new Error("issue returned no email link");
  const token = new URL(link).pathname.split("/").filter(Boolean).at(-1) ?? "";
  return { result, token, ref: result.invitation.ref as StaffInvitationRef };
}

async function rowsForInvite() {
  return testDb.db.select().from(verification);
}

async function audits() {
  return testDb.db.select().from(audit).orderBy(audit.createdAt);
}

describe("staff invitation issue, resend, cancel, conflict, and delivery (OPS-09)", () => {
  it("normalizes issue email and rejects empty acceptance fields", () => {
    expect(issueStaffInvitationInput.parse({ email: "  New.Staff@Example.COM  " })).toEqual({
      email: "new.staff@example.com",
    });
    expect(acceptStaffInvitationInput.safeParse({ token: "", name: "", password: "" }).success).toBe(
      false,
    );
  });

  it("issues one hash-only invitation for exactly 24 database hours and sends an ops-host link", async () => {
    const { token, result } = await issue("  New.Staff@Example.COM  ");
    expect(result.outcome).toBe("sent");
    expect(token).toMatch(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{20}$/);

    const [row] = await rowsForInvite();
    expect(row.id).not.toContain("new.staff@example.com");
    expect(row.identifier).toMatch(/^staff-invite-token:[a-f0-9]{64}$/);
    expect(row.identifier).not.toContain(token);
    expect(row.value).not.toContain(token);
    const metadata = JSON.parse(row.value) as Record<string, unknown>;
    expect(metadata).toMatchObject({
      version: 1,
      email: "new.staff@example.com",
      inviterUserId: "staff-inviter",
    });
    expect(new Date(String(metadata.sentAt)).toISOString()).toBe(String(metadata.sentAt));
    expect(row.expiresAt.getTime() - new Date(String(metadata.sentAt)).getTime()).toBe(86_400_000);
    expect(mockResend.lastLink()).toMatch(/^http:\/\/ops\.localhost:3000\/invite\//);

    const [event] = await audits();
    expect(event.action).toBe("staff_invitation_issued");
    expect(JSON.stringify(event.meta)).not.toContain("new.staff@example.com");
    expect(JSON.stringify(event.meta)).not.toContain(token);
  });

  it("refuses active duplicate, marketplace, and existing-staff conflicts before sending", async () => {
    const first = await issue("pending@example.com");
    const rowBefore = (await rowsForInvite())[0];
    mockResend.reset();

    await expect(
      issueStaffInvitation({ email: "PENDING@example.com" }, "staff-inviter", testDb.db),
    ).resolves.toEqual({ outcome: "refused", reason: "active-invitation-exists" });
    expect(await rowsForInvite()).toEqual([rowBefore]);
    expect(mockResend.sent()).toHaveLength(0);
    expect((await inspectStaffInvitation(first.token, testDb.db)).state).toBe("active");

    await seedUser({ id: "booker", email: "booker@example.com", canBook: true });
    await seedUser({ id: "existing-staff", email: "staff@example.com", role: "staff" });
    await expect(
      issueStaffInvitation({ email: "booker@example.com" }, "staff-inviter", testDb.db),
    ).resolves.toEqual({ outcome: "refused", reason: "separate-staff-email" });
    await expect(
      issueStaffInvitation({ email: "staff@example.com" }, "staff-inviter", testDb.db),
    ).resolves.toEqual({ outcome: "refused", reason: "already-staff-member" });
    expect(mockResend.sent()).toHaveLength(0);
  });

  it("rotates once, invalidates the prior link immediately, rejects stale versions, and cancels", async () => {
    const first = await issue("rotate@example.com");
    mockResend.reset();

    const resend = await resendStaffInvitation(first.ref, "staff-inviter", testDb.db);
    expect(resend.outcome).toBe("sent");
    if (!("invitation" in resend)) throw new Error("resend returned no invitation");
    const secondLink = mockResend.lastLink();
    if (!secondLink) throw new Error("resend returned no email link");
    const secondToken = new URL(secondLink).pathname.split("/").filter(Boolean).at(-1) ?? "";
    expect(secondToken).not.toBe(first.token);
    expect(await inspectStaffInvitation(first.token, testDb.db)).toEqual({ state: "inactive" });
    expect((await inspectStaffInvitation(secondToken, testDb.db)).state).toBe("active");

    await expect(
      resendStaffInvitation(first.ref, "staff-inviter", testDb.db),
    ).resolves.toEqual({ outcome: "stale" });
    await expect(
      cancelStaffInvitation(first.ref, "staff-inviter", testDb.db),
    ).resolves.toEqual({ outcome: "stale" });

    mockResend.reset();
    await expect(
      cancelStaffInvitation(resend.invitation.ref, "staff-inviter", testDb.db),
    ).resolves.toEqual({ outcome: "cancelled" });
    expect(mockResend.sent()).toHaveLength(0);
    expect(await inspectStaffInvitation(secondToken, testDb.db)).toEqual({ state: "inactive" });
    expect((await audits()).map((row) => row.action)).toEqual([
      "staff_invitation_issued",
      "staff_invitation_resent",
      "staff_invitation_cancelled",
    ]);
  });

  it("keeps the row pending after a delivery failure without logging recipient or credential", async () => {
    mockResend.failNext({ message: "provider rejected recipient@secret.example token=secret" });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await issueStaffInvitation(
      { email: "recipient@secret.example" },
      "staff-inviter",
      testDb.db,
    );
    expect(result.outcome).toBe("pending-delivery-failed");
    expect(await rowsForInvite()).toHaveLength(1);
    expect(error.mock.calls.flat().join(" ")).not.toContain("recipient@secret.example");
    expect(error.mock.calls.flat().join(" ")).not.toContain("token=secret");
    error.mockRestore();
  });

  it("treats equality at expiry as inactive and atomically audits pruning before replacement", async () => {
    const first = await issue("expired@example.com");
    await testDb.db.execute(
      sql`UPDATE verification SET expires_at = now(), updated_at = now() WHERE id = ${first.ref.id}`,
    );
    expect(await inspectStaffInvitation(first.token, testDb.db)).toEqual({ state: "inactive" });
    mockResend.reset();

    const replacement = await issueStaffInvitation(
      { email: "expired@example.com" },
      "staff-inviter",
      testDb.db,
    );
    expect(replacement.outcome).toBe("sent");
    expect(await rowsForInvite()).toHaveLength(1);
    expect((await audits()).map((row) => row.action)).toEqual([
      "staff_invitation_issued",
      "staff_invitation_expired",
      "staff_invitation_issued",
    ]);
  });

  it("allows exactly one equal-version resend/cancel mutation to win", async () => {
    const first = await issue("race-lifecycle@example.com");
    const clients = makeRacingClients(testDb.schema, 2);
    const [dbA, dbB] = clients.map((client) => drizzle(client));
    try {
      const results = await Promise.all([
        resendStaffInvitation(first.ref, "staff-inviter", dbA),
        cancelStaffInvitation(first.ref, "staff-inviter", dbB),
      ]);
      expect(results.filter((result) => result.outcome === "sent")).toHaveLength(
        results.some((result) => result.outcome === "cancelled") ? 0 : 1,
      );
      expect(results.filter((result) => result.outcome === "cancelled").length).toBeLessThanOrEqual(1);
      expect(results.filter((result) => result.outcome === "stale")).toHaveLength(1);
    } finally {
      await Promise.all(clients.map((client) => client.end()));
    }
  });
});

describe("inspect, accept, concurrent, and inactive staff invitations (OPS-09)", () => {
  it("inspection is read-only and missing, malformed, null, and unknown credentials are identical", async () => {
    const issued = await issue("inspect@example.com");
    const before = (await rowsForInvite())[0];
    await expect(inspectStaffInvitation(issued.token, testDb.db)).resolves.toEqual({
      state: "active",
      email: "inspect@example.com",
    });
    expect((await rowsForInvite())[0]).toEqual(before);

    for (const token of [null, undefined, "", "malformed", "00000000000000000000"]) {
      await expect(inspectStaffInvitation(token, testDb.db)).resolves.toEqual({ state: "inactive" });
    }
  });

  it("empty name/password never consumes or creates an account", async () => {
    const issued = await issue("empty@example.com");
    await expect(
      acceptStaffInvitation({ token: issued.token, name: "", password: "" }, testDb.db),
    ).resolves.toEqual({ outcome: "invalid" });
    expect(await rowsForInvite()).toHaveLength(1);
    expect(await testDb.db.select().from(user)).toHaveLength(0);
  });

  it("accepts once into a verified staff-only Better Auth credential", async () => {
    const issued = await issue("accepted@example.com");
    const result = await acceptStaffInvitation(
      { token: issued.token, name: "Accepted Staff", password: "long-enough-password" },
      testDb.db,
    );
    expect(result.outcome).toBe("accepted");
    expect(await rowsForInvite()).toHaveLength(0);

    const [created] = await testDb.db.select().from(user).where(eq(user.email, "accepted@example.com"));
    expect(created).toMatchObject({
      emailVerified: true,
      canBook: false,
      canHost: false,
      role: "staff",
    });
    const [credential] = await testDb.db.select().from(account).where(eq(account.userId, created.id));
    expect(credential).toMatchObject({
      accountId: created.id,
      providerId: "credential",
    });
    expect(credential.password).not.toBe("long-enough-password");

    const auth = makeTestAuth(testDb);
    const response = await auth.api.signInEmail({
      body: { email: "accepted@example.com", password: "long-enough-password" },
      asResponse: true,
    });
    expect(response.status).toBeLessThan(400);
    expect((await audits()).map((row) => row.action)).toEqual([
      "staff_invitation_issued",
      "ops_grant_staff",
      "staff_invitation_accepted",
    ]);
    for (const event of await audits()) {
      const serialized = JSON.stringify(event.meta);
      expect(serialized).not.toContain("accepted@example.com");
      expect(serialized).not.toContain(issued.token);
      expect(serialized).not.toContain("long-enough-password");
    }
  });

  it("allows exactly one of two concurrent accepts to create the staff identity", async () => {
    const issued = await issue("concurrent@example.com");
    const clients = makeRacingClients(testDb.schema, 2);
    const [dbA, dbB] = clients.map((client) => drizzle(client));
    try {
      const input = {
        token: issued.token,
        name: "Concurrent Staff",
        password: "long-enough-password",
      };
      const results = await Promise.all([
        acceptStaffInvitation(input, dbA),
        acceptStaffInvitation(input, dbB),
      ]);
      expect(results.filter((result) => result.outcome === "accepted")).toHaveLength(1);
      expect(results.filter((result) => result.outcome === "inactive")).toHaveLength(1);
      expect(
        await testDb.db.select().from(user).where(eq(user.email, "concurrent@example.com")),
      ).toHaveLength(1);
    } finally {
      await Promise.all(clients.map((client) => client.end()));
    }
  });

  it("consumes a newly conflicting account with one nonsecret refusal audit and no mutation", async () => {
    const issued = await issue("late-booker@example.com");
    await seedUser({ id: "late-booker", email: "late-booker@example.com", canBook: true });
    await expect(
      acceptStaffInvitation(
        { token: issued.token, name: "No Upgrade", password: "long-enough-password" },
        testDb.db,
      ),
    ).resolves.toEqual({ outcome: "refused", reason: "separate-staff-email" });
    expect(await rowsForInvite()).toHaveLength(0);
    const [unchanged] = await testDb.db.select().from(user).where(eq(user.id, "late-booker"));
    expect(unchanged).toMatchObject({ role: "user", canBook: true, canHost: false });
    const event = (await audits()).at(-1);
    expect(event?.action).toBe("staff_invitation_accept_refused");
    expect(JSON.stringify(event?.meta)).not.toContain("late-booker@example.com");
  });

  it("rolls back consume, user, account, role, and audits when the final audit write fails", async () => {
    const issued = await issue("rollback@example.com");
    await testDb.db.execute(sql.raw(`
      CREATE FUNCTION fail_invitation_accept_audit() RETURNS trigger AS $$
      BEGIN
        IF NEW.action = 'staff_invitation_accepted' THEN
          RAISE EXCEPTION 'forced invitation acceptance failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER fail_invitation_accept_audit_trigger
      BEFORE INSERT ON audit
      FOR EACH ROW EXECUTE FUNCTION fail_invitation_accept_audit();
    `));
    await expect(
      acceptStaffInvitation(
        { token: issued.token, name: "Rollback Staff", password: "long-enough-password" },
        testDb.db,
      ),
    ).rejects.toThrow();
    await testDb.db.execute(sql.raw(`DROP TRIGGER fail_invitation_accept_audit_trigger ON audit`));
    await testDb.db.execute(sql.raw(`DROP FUNCTION fail_invitation_accept_audit()`));

    expect(await rowsForInvite()).toHaveLength(1);
    expect(await testDb.db.select().from(user).where(eq(user.email, "rollback@example.com"))).toHaveLength(
      0,
    );
    expect(await testDb.db.select().from(account)).toHaveLength(0);
    expect((await audits()).map((row) => row.action)).toEqual(["staff_invitation_issued"]);
  });
});
