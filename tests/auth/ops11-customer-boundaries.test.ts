import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user } from "@/lib/db/schema";

const sessionState = vi.hoisted(() => ({ id: "", role: "user", effects: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); }, notFound: () => { throw new Error("OPS11_NOT_FOUND"); } }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: async () => sessionState.id ? { user: { id: sessionState.id, role: sessionState.role, canBook: true, canHost: true, email: "guard@example.test", name: "Guard" } } : null } } }));
vi.mock("@/lib/inngest", () => ({ inngest: { send: sessionState.effects } }));
vi.mock("@/lib/paymongo", () => ({ createCheckoutSession: sessionState.effects, retrieveCheckoutSession: sessionState.effects, expireCheckoutSession: sessionState.effects, refundPayment: sessionState.effects, listReceivingInstitutions: sessionState.effects }));
vi.mock("@/lib/didit", () => ({ createVerificationSession: sessionState.effects, retrieveVerificationSession: sessionState.effects }));
vi.mock("@/lib/cloudinary", () => ({ destroyListingPhoto: sessionState.effects }));

let database: TestDb;
let readCustomerUserId: typeof import("@/lib/customer-access")["readCustomerUserId"];
type Probe = { name: string; invoke: () => Promise<unknown> };
const probes: Probe[] = [];
const pageProbes: Probe[] = [];
let upload: typeof import("@/app/api/cloudinary/sign/route")["POST"];

beforeAll(async () => {
  database = await setupTestDb();
  vi.doMock("@/lib/db", () => ({ db: database.db }));
  vi.resetModules();
  ({ readCustomerUserId } = await import("@/lib/customer-access"));
  const booking = await import("@/app/actions/booking");
  const cancellations = await import("@/app/actions/cancel-booking");
  const listing = await import("@/app/actions/listing");
  const photos = await import("@/app/actions/listing-photo");
  const blocks = await import("@/app/actions/blocks");
  const requests = await import("@/app/actions/host-requests");
  const verify = await import("@/app/actions/host-verification");
  const payouts = await import("@/app/actions/payout-destination");
  const hours = await import("@/app/actions/operating-hours");
  const rerequest = await import("@/app/actions/re-request");
  const reconcile = await import("@/app/actions/reconcile-payment");
  const group = await import("@/app/actions/group");
  ({ POST: upload } = await import("@/app/api/cloudinary/sign/route"));
  probes.push(
    { name: "placeHold", invoke: () => booking.placeHold({}) },
    { name: "placeOpenHold", invoke: () => booking.placeOpenHold({}) },
    { name: "updateDeclaredPax", invoke: () => booking.updateDeclaredPax("b1234567-1234-4234-8234-123456789abc", 2) },
    { name: "confirmBooking", invoke: () => booking.confirmBooking("b1234567-1234-4234-8234-123456789abc") },
    { name: "cancelBookingAsBooker", invoke: () => cancellations.cancelBookingAsBooker("b1234567-1234-4234-8234-123456789abc") },
    { name: "cancelUnpaidHold", invoke: () => cancellations.cancelUnpaidHold("b1234567-1234-4234-8234-123456789abc") },
    { name: "previewHostCancelFee", invoke: () => cancellations.previewHostCancelFee("b1234567-1234-4234-8234-123456789abc") },
    { name: "cancelBookingAsHost", invoke: () => cancellations.cancelBookingAsHost("b1234567-1234-4234-8234-123456789abc", "other") },
    { name: "createDraftListing", invoke: () => listing.createDraftListing() },
    { name: "saveListingStep", invoke: () => listing.saveListingStep("b1234567-1234-4234-8234-123456789abc", {}) },
    { name: "publishListing", invoke: () => listing.publishListing("b1234567-1234-4234-8234-123456789abc") },
    { name: "unlistListing", invoke: () => listing.unlistListing("b1234567-1234-4234-8234-123456789abc") },
    { name: "softDeleteListing", invoke: () => listing.softDeleteListing("b1234567-1234-4234-8234-123456789abc") },
    { name: "persistPhoto", invoke: () => photos.persistPhoto("b1234567-1234-4234-8234-123456789abc", {} as never) },
    { name: "reorderPhotos", invoke: () => photos.reorderPhotos("b1234567-1234-4234-8234-123456789abc", []) },
    { name: "removePhoto", invoke: () => photos.removePhoto("b1234567-1234-4234-8234-123456789abc", "owned-photo") },
    { name: "addBlock", invoke: () => blocks.addBlock("b1234567-1234-4234-8234-123456789abc", {} as never) },
    { name: "removeBlock", invoke: () => blocks.removeBlock("b1234567-1234-4234-8234-123456789abc", "owned-block") },
    { name: "approveRequest", invoke: () => requests.approveRequest("b1234567-1234-4234-8234-123456789abc") },
    { name: "declineRequest", invoke: () => requests.declineRequest("b1234567-1234-4234-8234-123456789abc") },
    { name: "requestHostVerification", invoke: () => verify.requestHostVerification({ phone: "09171234567" }) },
    { name: "savePayoutDestination", invoke: () => payouts.savePayoutDestination({} as never) },
    { name: "attestPayoutDestination", invoke: () => payouts.attestPayoutDestination({} as never) },
    { name: "saveOperatingHours", invoke: () => hours.saveOperatingHours("b1234567-1234-4234-8234-123456789abc", { windows: [] }) },
    { name: "reRequestSameWindow", invoke: () => rerequest.reRequestSameWindow("b1234567-1234-4234-8234-123456789abc") },
    { name: "reconcilePaymentNow", invoke: () => reconcile.reconcilePaymentNow("b1234567-1234-4234-8234-123456789abc") },
    { name: "createGroup", invoke: () => group.createGroup("b1234567-1234-4234-8234-123456789abc") },
    { name: "removeAttendee", invoke: () => group.removeAttendee("b1234567-1234-4234-8234-123456789abc") },
    { name: "regenerateLink", invoke: () => group.regenerateLink("b1234567-1234-4234-8234-123456789abc") },
  );
  const pages = [
    "@/app/(host)/host/layout", "@/app/(host)/host/page", "@/app/(host)/host/listings/page",
    "@/app/(host)/host/listings/new/page", "@/app/(host)/host/listings/[id]/edit/page",
    "@/app/(host)/host/listings/[id]/availability/page", "@/app/(host)/host/bookings/page",
    "@/app/(host)/host/bookings/[id]/page", "@/app/(host)/host/requests/page",
    "@/app/(host)/host/verify/page", "@/app/(host)/host/earnings/page", "@/app/(host)/host/payouts/page",
    "@/app/(host)/host/payouts/refresh/page", "@/app/(host)/host/payouts/return/page",
    "@/app/(app)/bookings/page", "@/app/(app)/bookings/[id]/page", "@/app/(app)/bookings/[id]/cancel/page",
    "@/app/(app)/bookings/[id]/group/page", "@/app/(app)/bookings/[id]/receipt/page", "@/app/listings/[id]/book/page",
  ];
  for (const name of pages) {
    const component = (await import(/* @vite-ignore */ name)).default as (props: unknown) => Promise<unknown>;
    pageProbes.push({ name, invoke: () => component({ children: null, params: Promise.resolve({ id: "b1234567-1234-4234-8234-123456789abc" }), searchParams: Promise.resolve({ hold: "b1234567-1234-4234-8234-123456789abc" }) }) });
  }
});
afterAll(async () => { vi.doUnmock("@/lib/db"); await teardownTestDb(database); });
beforeEach(() => { sessionState.id = ""; sessionState.role = "user"; sessionState.effects.mockClear(); });
async function seed(role: string | null) {
  const id = randomUUID();
  await database.db.insert(user).values({ id, name: "Policy", firstName: "Policy", email: `${id}@example.test`, role, canHost: true, canBook: true });
  sessionState.id = id;
  return id;
}

describe("OPS-11 flags-on staff authorization", () => {
  it.each(["staff", null, "admin", "unknown"])("denies current database role %s despite customer session and both flags", async role => {
    await seed(role);
    expect(await readCustomerUserId()).toBeNull();
  });
  it("denies a deleted identity despite a remaining session", async () => {
    sessionState.id = randomUUID(); expect(await readCustomerUserId()).toBeNull();
  });
  it("admits the current customer row despite a stale staff session role", async () => {
    const id = await seed("user"); sessionState.role = "staff";
    expect(await readCustomerUserId()).toBe(id);
  });
  it("denies every direct booking/hosting mutation before parsing, writes or provider calls", async () => {
    const id = await seed("staff");
    for (const probe of probes) {
      sessionState.id = "";
      const anonymous = await probe.invoke();
      sessionState.id = id;
      expect(await probe.invoke(), probe.name).toEqual(anonymous);
    }
    expect(probes).toHaveLength(29);
    expect(sessionState.effects).not.toHaveBeenCalled();
    const [row] = await database.db.select().from(user).where(eq(user.id, id));
    expect(row).toMatchObject({ role: "staff", canBook: true, canHost: true });
    const rows = await database.db.execute(sql`SELECT (SELECT count(*) FROM booking) AS bookings, (SELECT count(*) FROM listing) AS listings, (SELECT count(*) FROM host_verification) AS verifications, (SELECT count(*) FROM host_payout_destination) AS destinations`);
    expect(rows[0]).toMatchObject({ bookings: "0", listings: "0", verifications: "0", destinations: "0" });
  });
  it("denies the upload signature before input parsing despite a stale customer session", async () => {
    await seed("staff");
    const response = await upload(new Request("http://localhost/api/cloudinary/sign", { method: "POST", body: "{}" }));
    expect(response.status).toBe(403);
    expect(sessionState.effects).not.toHaveBeenCalled();
  });
  it("customer uploads still reach ordinary input validation", async () => {
    await seed("user");
    const response = await upload(new Request("http://localhost/api/cloudinary/sign", { method: "POST", body: "{}" }));
    expect(response.status).toBe(400);
    expect(sessionState.effects).not.toHaveBeenCalled();
  });
  it("each directly invoked page denies flags-on staff before reading protected data", async () => {
    await seed("staff"); sessionState.role = "staff";
    for (const probe of pageProbes) await expect(probe.invoke(), probe.name).rejects.toThrow("OPS11_NOT_FOUND");
    expect(pageProbes).toHaveLength(20);
    expect(sessionState.effects).not.toHaveBeenCalled();
  });
});
