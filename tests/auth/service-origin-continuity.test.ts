import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { user, listing, booking } from "@/lib/db/schema";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { mockPayMongo } from "../helpers/mocks";

const APP = "https://app.example.test";
const APEX = "https://example.test";
let testDb: TestDb;
let proxy: typeof import("@/proxy")["proxy"];
let confirmBooking: typeof import("@/app/actions/booking")["confirmBooking"];

beforeAll(async () => {
  for (const [key, value] of Object.entries({ BETTER_AUTH_URL: APP, NEXT_PUBLIC_APP_URL: APP, MARKETING_APP_URL: APEX, OPS_APP_URL: "https://ops.example.test", VERCEL_URL: "", DIDIT_API_KEY: "test-key", DIDIT_WORKFLOW_ID: "test-workflow", DIDIT_WEBHOOK_SECRET: "test-secret", PAYMONGO_WEBHOOK_SECRET: "test-secret", INNGEST_DEV: "0", INNGEST_SIGNING_KEY: "signkey-test-" + "ab".repeat(32) })) vi.stubEnv(key, value);
  testDb = await setupTestDb();
  await testDb.db.insert(user).values([
    { id: "origin-host", name: "Host", email: "origin-host@example.test", firstName: "Host" },
    { id: "origin-booker", name: "Booker", email: "origin-booker@example.test", firstName: "Booker" },
  ]);
  await testDb.db.insert(listing).values({ id: "origin-listing", hostId: "origin-host", title: "Origin Court", status: "published", unitCount: 1, timezone: "Asia/Manila", hourlyRateCents: 150000, dayRateCents: 300000 });
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("@/lib/auth", () => ({ auth: { api: { getSession: async () => ({ user: { id: "origin-booker" } }) } } }));
  vi.doMock("@/lib/audit", () => ({ recordAudit: vi.fn() }));
  vi.doMock("@/lib/paymongo", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/paymongo")>()), createCheckoutSession: mockPayMongo.createCheckoutSession, expireCheckoutSession: mockPayMongo.expireCheckoutSession, createRefund: mockPayMongo.createRefund }));
  vi.doMock("next/headers", () => ({ headers: async () => new Headers() }));
  vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
  vi.doMock("next/navigation", () => ({ redirect: (url: string) => { throw new Error("REDIRECT:" + url); }, notFound: () => { throw new Error("NOT_FOUND"); } }));
  vi.resetModules();
  ({ proxy } = await import("@/proxy"));
  ({ confirmBooking } = await import("@/app/actions/booking"));
});
afterAll(async () => {
  for (const path of ["@/lib/db", "@/lib/auth", "@/lib/audit", "@/lib/paymongo", "next/headers", "next/cache", "next/navigation"]) vi.doUnmock(path);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  if (testDb) await teardownTestDb(testDb);
});

function direct(path: string, method: string, origin: string, body?: string, headers: Record<string, string> = {}) {
  const request = new NextRequest(origin + path, { method, headers: { host: new URL(origin).host, ...headers }, ...(body === undefined ? {} : { body }) });
  const response = proxy(request);
  expect(response.headers.get("x-middleware-next")).toBe("1");
  expect(response.headers.get("location")).toBeNull();
  expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  return request;
}

describe("actual provider returns and direct receivers", () => {
  it("constructs the Didit browser return on app using the real adapter", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ session_id: "session-test", url: "https://verify.didit.test/session-test" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const { beginDiditVerification } = await import("@/lib/verification/providers/didit");
    await beginDiditVerification("origin-host");
    const request = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(request[1].body as string)).toMatchObject({ callback: APP + "/host/verify", vendor_data: "origin-host" });
    vi.unstubAllGlobals();
  });
  it("creates real checkout return URLs while forged paid queries leave payment pending", async () => {
    const startsAt = new Date(Date.now() + 86400000 * 3);
    await testDb.db.insert(booking).values({ id: "origin-hold", listingId: "origin-listing", bookerId: "origin-booker", unit: 1, startsAt, endsAt: new Date(startsAt.getTime() + 3600000), status: "pending", quotedTotalCents: 150000, currency: "php", expiresAt: new Date(Date.now() + 600000) });
    await expect(confirmBooking("origin-hold")).rejects.toThrow("REDIRECT:https://checkout.paymongo.test/cs_test_123");
    expect(mockPayMongo.createCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({ successUrl: APP + "/bookings/origin-hold?paid=1", cancelUrl: APP + "/listings/origin-listing/book?hold=origin-hold", referenceNumber: "origin-hold" }));
    const moved = proxy(new NextRequest(APEX + "/bookings/origin-hold?paid=1", { headers: { host: "example.test" } }));
    expect(moved.headers.get("location")).toBe(APP + "/bookings/origin-hold?paid=1");
    const [row] = await testDb.db.select({ status: booking.status, paymentId: booking.paymentId }).from(booking).where(eq(booking.id, "origin-hold"));
    expect(row).toEqual({ status: "pending", paymentId: null });
  });
  it.each(["/host/verify", "/host/payouts/return", "/host/payouts/refresh", "/listings/id/book?hold=opaque"])("retains old browser return %s", (path) => {
    expect(proxy(new NextRequest(APEX + path, { headers: { host: "example.test" } })).headers.get("location")).toBe(APP + path);
  });
  it.each([APP, APEX])("passes original raw signed bytes and rejects invalid signatures on %s", async (origin) => {
    const paymongo = await import("@/app/api/paymongo/webhook/route");
    const didit = await import("@/app/api/didit/webhook/route");
    // Invalid JSON deliberately proves valid signatures reached parsing with the original whitespace.
    const raw = "  { invalid json\n";
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const paySignature = `t=${timestamp},te=${createHmac("sha256", "test-secret").update(timestamp + "." + raw).digest("hex")},li=`;
    const diditSignature = createHmac("sha256", "test-secret").update(raw).digest("hex");
    for (const [path, handler, headers] of [
      ["/api/paymongo/webhook", paymongo.POST, { "paymongo-signature": paySignature }],
      ["/api/didit/webhook", didit.POST, { "x-signature": diditSignature, "x-timestamp": timestamp }],
    ] as const) {
      const valid = await handler(direct(path, "POST", origin, raw, headers));
      expect(valid.status).toBe(400);
      expect(await valid.text()).toBe("Invalid payload");
      const forged = await handler(direct(path, "POST", origin, raw, {}));
      expect(forged.status).toBe(400);
      expect(await forged.text()).toBe("Invalid signature");
    }
  });
  it.each([APP, APEX])("keeps supported Inngest methods direct and refuses unsigned cloud execution on %s", async (origin) => {
    const receiver = await import("@/app/api/inngest/route");
    const network = vi.fn(() => { throw new Error("No external registration in continuity tests"); });
    vi.stubGlobal("fetch", network);
    for (const method of ["GET", "HEAD", "POST", "PUT"]) {
      const request = direct("/api/inngest", method, origin, method === "POST" || method === "PUT" ? "{}" : undefined, { "content-type": "application/json", "x-inngest-sync-kind": "in_band" });
      const handler = method === "HEAD" ? receiver.GET : receiver[method as "GET" | "POST" | "PUT"];
      const response = await handler(request, { params: Promise.resolve({}) });
      expect(response.status).toBe(401);
    }
    expect(network).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
