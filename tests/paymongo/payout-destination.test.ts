import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { hostPayout, hostPayoutDestination } from "@/lib/db/schema";

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

  it("records the host's attestation without enabling bookings or claiming staff verification", async () => {
    const hostId = await signInHost("payout.destination.attest@example.com");
    await savePayoutDestination({ institutionBic: "TESTPHM2XXX", accountName: "Host", accountNumber: "09171234567" });

    await expect(attestPayoutDestination()).resolves.toEqual({ ok: true });

    const [destination] = await testDb.db.select().from(hostPayoutDestination).where(eq(hostPayoutDestination.userId, hostId));
    expect(destination?.verificationStatus).toBe("host_attested");
    expect(destination?.verificationReference).toBe("host_attestation");
    expect(destination?.verifiedAt).toBeNull();
    expect(destination?.verifiedBy).toBeNull();
    const [payout] = await testDb.db.select().from(hostPayout).where(eq(hostPayout.userId, hostId));
    expect(payout?.payoutsEnabled).toBe(false);
  });

  it("rejects a client-supplied institution outside the live provider directory before writing", async () => {
    const hostId = await signInHost("payout.destination.unknown@example.com");
    const result = await savePayoutDestination({ institutionBic: "NOTREAL", accountName: "Host", accountNumber: "09171234567" });
    expect(result.ok).toBe(false);
    expect(await testDb.db.select().from(hostPayoutDestination).where(eq(hostPayoutDestination.userId, hostId))).toEqual([]);
  });
});
