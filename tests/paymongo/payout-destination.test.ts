import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { hostPayout, hostPayoutDestination, hostVerification } from "@/lib/db/schema";

let testDb: TestDb;
let testAuth: TestAuth;
let savePayoutDestination: (typeof import("@/app/actions/payout-destination"))["savePayoutDestination"];
let attestPayoutDestination: (typeof import("@/app/actions/payout-destination"))["attestPayoutDestination"];
const sessionHeaders: { cookie: string } = { cookie: "" };
const listReceivingInstitutions = vi.fn(async () => [{ name: "Test Bank", bic: "TESTPHM2XXX" }]);

vi.mock("next/headers", () => ({ headers: async () => new Headers({ cookie: sessionHeaders.cookie }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);
  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("@/lib/paymongo", () => ({ listReceivingInstitutions }));
  vi.doMock("@/lib/audit", () => ({ recordAudit: vi.fn(async () => {}) }));
  vi.resetModules();
  ({ savePayoutDestination, attestPayoutDestination } = await import("@/app/actions/payout-destination"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/paymongo");
  vi.doUnmock("@/lib/audit");
  await teardownTestDb(testDb);
});

async function signInHost(email: string): Promise<string> {
  const created = (await signUp(testAuth, {
    email,
    password: "averylongpassword",
    name: "Host",
    firstName: "Host",
    intent: "host",
  })) as { user: { id: string } };
  const response = await testAuth.api.signInEmail({ body: { email, password: "averylongpassword" }, asResponse: true });
  sessionHeaders.cookie = response.headers.get("set-cookie")?.split(";")[0] ?? "";
  return created.user.id;
}

describe("savePayoutDestination", () => {
  it("stores only encrypted recipient values and immediately disables bookings pending host confirmation", async () => {
    const hostId = await signInHost("payout.destination@example.com");
    const result = await savePayoutDestination({
      institutionBic: "TESTPHM2XXX",
      accountName: "Francis Silva",
      accountNumber: "09171234567",
    });
    expect(result).toEqual({ ok: true });

    const [destination] = await testDb.db.select().from(hostPayoutDestination).where(eq(hostPayoutDestination.userId, hostId));
    expect(destination?.accountNameCiphertext).not.toContain("Francis Silva");
    expect(destination?.accountNumberCiphertext).not.toContain("09171234567");
    expect(destination?.accountLast4).toBe("4567");
    expect(destination?.verificationStatus).toBe("pending");
    const [payout] = await testDb.db.select().from(hostPayout).where(eq(hostPayout.userId, hostId));
    expect(payout?.payoutsEnabled).toBe(false);
  });

  it("enables an approved host after exact-value attestation without claiming staff verification", async () => {
    const hostId = await signInHost("payout.destination.attest@example.com");
    await testDb.db.insert(hostVerification).values({ userId: hostId, status: "approved", provider: "manual" });
    await savePayoutDestination({ institutionBic: "TESTPHM2XXX", accountName: "Host", accountNumber: "09171234567" });

    await expect(attestPayoutDestination({ institutionBic: "TESTPHM2XXX", accountName: "Host", accountNumber: "09171234567" })).resolves.toEqual({ ok: true });

    const [destination] = await testDb.db.select().from(hostPayoutDestination).where(eq(hostPayoutDestination.userId, hostId));
    expect(destination?.verificationStatus).toBe("host_attested");
    expect(destination?.verificationReference).toBe("host_attestation");
    expect(destination?.verifiedAt).toBeNull();
    expect(destination?.verifiedBy).toBeNull();
    const [payout] = await testDb.db.select().from(hostPayout).where(eq(hostPayout.userId, hostId));
    expect(payout?.payoutsEnabled).toBe(true);
    expect(payout?.onboardingComplete).toBe(true);
  });

  it("does not enable a payout from mismatched details or an unapproved host", async () => {
    const hostId = await signInHost("payout.destination.unapproved@example.com");
    await savePayoutDestination({ institutionBic: "TESTPHM2XXX", accountName: "Host", accountNumber: "09171234567" });

    const details = { institutionBic: "TESTPHM2XXX", accountName: "Host", accountNumber: "09171234567" };
    expect((await attestPayoutDestination({ ...details, accountNumber: "09171234568" })).ok).toBe(false);
    expect((await attestPayoutDestination(details)).ok).toBe(false);
    const [destination] = await testDb.db.select().from(hostPayoutDestination).where(eq(hostPayoutDestination.userId, hostId));
    const [payout] = await testDb.db.select().from(hostPayout).where(eq(hostPayout.userId, hostId));
    expect(destination?.verificationStatus).toBe("pending");
    expect(payout?.payoutsEnabled).toBe(false);
  });

  it("a replacement destination disables payouts until the approved host confirms its exact new values", async () => {
    const hostId = await signInHost("payout.destination.replace@example.com");
    await testDb.db.insert(hostVerification).values({ userId: hostId, status: "approved", provider: "manual" });
    const first = { institutionBic: "TESTPHM2XXX", accountName: "Host", accountNumber: "09171234567" };
    const replacement = { ...first, accountNumber: "09171234568" };
    await savePayoutDestination(first);
    await attestPayoutDestination(first);
    await savePayoutDestination(replacement);
    expect((await attestPayoutDestination(first)).ok).toBe(false);
    const [before] = await testDb.db.select().from(hostPayout).where(eq(hostPayout.userId, hostId));
    expect(before?.payoutsEnabled).toBe(false);
    await expect(attestPayoutDestination(replacement)).resolves.toEqual({ ok: true });
    const [after] = await testDb.db.select().from(hostPayout).where(eq(hostPayout.userId, hostId));
    expect(after?.payoutsEnabled).toBe(true);
  });

  it("does not override a provider-declined payout state when a host resaves and confirms", async () => {
    const hostId = await signInHost("payout.destination.declined@example.com");
    await testDb.db.insert(hostVerification).values({ userId: hostId, status: "approved", provider: "manual" });
    const details = { institutionBic: "TESTPHM2XXX", accountName: "Host", accountNumber: "09171234567" };
    await savePayoutDestination(details);
    await testDb.db.update(hostPayout).set({ activationStatus: "declined" }).where(eq(hostPayout.userId, hostId));
    await savePayoutDestination(details);
    expect((await attestPayoutDestination(details)).ok).toBe(false);
    const [payout] = await testDb.db.select().from(hostPayout).where(eq(hostPayout.userId, hostId));
    expect(payout?.activationStatus).toBe("declined");
    expect(payout?.payoutsEnabled).toBe(false);
  });

  it("rejects a client-supplied institution outside the live provider directory before writing", async () => {
    const hostId = await signInHost("payout.destination.unknown@example.com");
    const result = await savePayoutDestination({ institutionBic: "NOTREAL", accountName: "Host", accountNumber: "09171234567" });
    expect(result.ok).toBe(false);
    expect(await testDb.db.select().from(hostPayoutDestination).where(eq(hostPayoutDestination.userId, hostId))).toEqual([]);
  });
});
