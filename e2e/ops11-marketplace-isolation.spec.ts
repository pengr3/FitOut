import { expect, test } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import { marketingFixture, assertMarketingSafety } from "./helpers/marketing-fixtures";

test("flags-on staff cannot read customer business pages over HTML or Flight", async ({ browser }, testInfo) => {
  test.setTimeout(120_000);
  assertMarketingSafety();
  const fixture = await marketingFixture();
  const app = "http://localhost:3000";
  const context = await browser.newContext({ baseURL: app });
  const email = `${fixture.hostId}@example.com`;
  const password = "OPS11LocalPassword123!";
  const sentinel = "OPS11 protected listing sentinel";
  const observations: Array<{ path: string; flight: boolean; status: number; neutralBody: boolean }> = [];
  try {
    await fixture.sql`UPDATE "user" SET role='staff', can_book=true, can_host=true WHERE id=${fixture.hostId}`;
    await fixture.sql`UPDATE listing SET title=${sentinel} WHERE id=${fixture.listingId}`;
    const hash = await hashPassword(password);
    await fixture.sql`INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at) VALUES (${randomUUID()}, ${fixture.hostId}, 'credential', ${fixture.hostId}, ${hash}, now(), now())`;
    const login = await context.request.post(`${app}/api/auth/sign-in/email`, { headers: { origin: app }, data: { email, password } });
    expect(login.status()).toBe(200);
    const session = await (await context.request.get(`${app}/api/auth/get-session`)).json();
    expect(session.user).toMatchObject({ id: fixture.hostId, role: "staff", canBook: true, canHost: true });
    const id = randomUUID();
    const paths = ["/host", "/host/listings", "/host/listings/new", `/host/listings/${fixture.listingId}/edit`, `/host/listings/${fixture.listingId}/availability`, "/host/requests", "/host/bookings", `/host/bookings/${id}`, "/host/verify", "/host/earnings", "/host/payouts", "/host/payouts/return", "/host/payouts/refresh", "/bookings", `/bookings/${id}`, `/bookings/${id}/cancel`, `/bookings/${id}/receipt`, `/bookings/${id}/group`, `/listings/${fixture.listingId}/book?hold=${id}`];
    for (const flight of [false, true]) for (const path of paths) {
      const response = await context.request.get(`${app}${path}`, { headers: flight ? { RSC: "1" } : {}, maxRedirects: 0 });
      const body = await response.text();
      expect([200, 404], path).toContain(response.status());
      expect(body, path).toContain("find that page");
      expect(body, path).not.toContain(sentinel);
      observations.push({ path, flight, status: response.status(), neutralBody: true });
    }
    const upload = await context.request.post(`${app}/api/cloudinary/sign`, { headers: { origin: app }, data: { listingId: fixture.listingId, paramsToSign: {} } });
    expect(upload.status()).toBe(403);
    const [unchanged] = await fixture.sql`SELECT role, can_book, can_host FROM "user" WHERE id=${fixture.hostId}`;
    expect(unchanged).toEqual({ role: "staff", can_book: true, can_host: true });
    const [counts] = await fixture.sql`SELECT (SELECT count(*) FROM booking WHERE booker_id=${fixture.hostId}) AS bookings, (SELECT count(*) FROM listing WHERE host_id=${fixture.hostId}) AS listings`;
    expect(counts).toEqual({ bookings: "0", listings: "1" });
    await testInfo.attach("OPS11 runtime denials", { contentType: "application/json", body: Buffer.from(JSON.stringify({ observations, uploadStatus: 403, noBusinessWrites: true, noProductionActions: true })) });
  } finally {
    await context.close();
    await fixture.cleanup();
  }
});
