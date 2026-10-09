import { expect, type Page } from "@playwright/test";
import { createHmac, randomUUID } from "node:crypto";
import { assertTestDatabase } from "../../tests/helpers/test-db-url";
import postgres from "postgres";

export const MARKETING_TEST_DATABASE = "postgresql://fitout:fitout@localhost:5432/fitout_test";

export function assertMarketingSafety() {
  const raw = process.env.DATABASE_URL ?? MARKETING_TEST_DATABASE;
  if (raw !== MARKETING_TEST_DATABASE || Boolean(process.env.RESEND_API_KEY) || process.env.FITOUT_E2E_REAL_EMAIL === "1") {
    throw new Error("Marketing fixtures require the explicit local fitout_test database and disabled real mail.");
  }
  assertTestDatabase(raw, "marketing capture database");
}

export async function marketingFixture() {
  assertMarketingSafety();
  // Same approved synthetic fixture SQL/gates as booker-seed, with a connection
  // bound here to the guarded test database (never its module-level dev fallback).
  const sql = postgres(MARKETING_TEST_DATABASE, { max: 1, onnotice: () => {} });
  const hostId = `marketing_host_${randomUUID()}`;
  const listingId = `marketing_listing_${randomUUID()}`;
  const seed = { sql, hostId, listingId, spaceTypeLabel: "Martial arts / boxing gym" };
  try {
    await sql`INSERT INTO "user" (id, name, email, email_verified, first_name, can_host, can_book, created_at, updated_at) VALUES (${hostId}, 'FitOut Demo', ${`${hostId}@example.com`}, true, 'FitOut', true, false, now(), now())`;
    await sql`INSERT INTO host_payout (user_id, paymongo_account_id, activation_status, payouts_enabled, onboarding_complete, created_at, updated_at) VALUES (${hostId}, ${`demo_${randomUUID()}`}, 'activated', true, true, now(), now())`;
    await sql`INSERT INTO host_verification (user_id, status, provider, created_at, updated_at) VALUES (${hostId}, 'approved', 'manual', now(), now())`;
    await sql`INSERT INTO listing (id, host_id, title, description, primary_space_type, address_line1, city, region, postal_code, country, neighborhood, location, show_exact_address, max_occupancy, unit_count, timezone, hourly_rate_cents, day_rate_cents, occupancy_mode, currency, booking_mode, status, review_state, published_at, created_at, updated_at) VALUES (${listingId}, ${hostId}, 'FitOut Demo Court', 'A demo space for your next session.', 'martial_arts_boxing', 'Demo venue address', 'Makati', 'Metro Manila', '1210', 'Philippines', 'Poblacion', ST_SetSRID(ST_MakePoint(121.03076, 14.56546), 4326), false, 8, 1, 'Asia/Manila', 47333, 288888, 'exclusive', 'php', 'instant', 'published', 'approved', now(), now(), now())`;
    for (let day = 0; day < 7; day++) await sql`INSERT INTO operating_hours (id, listing_id, day_of_week, open_time, close_time, created_at) VALUES (${randomUUID()}, ${listingId}, ${day}, '06:00', '21:00', now())`;
    await sql`INSERT INTO listing_activity_tag (listing_id, tag) VALUES (${listingId}, 'boxing_mma')`;
  } catch (error) {
    await sql`DELETE FROM "user" WHERE id = ${hostId}`;
    await sql.end();
    throw error;
  }
  const accounts: string[] = [];
  await seed.sql`UPDATE "user" SET name = 'FitOut Demo', first_name = 'FitOut' WHERE id = ${seed.hostId}`;
  await seed.sql`UPDATE listing SET title = 'FitOut Demo Court', description = 'A demo space for your next session.' WHERE id = ${seed.listingId}`;
  return {
    ...seed,
    title: "FitOut Demo Court",
    // Listing/stream tests need a local signed session, not another signup test.
    // Actual signup/password/return journeys still use the shipped auth endpoints.
    async session(page: Page, intent: "book" | "host") {
      assertMarketingSafety();
      const secret = "phase27-inert-auth-marker-not-a-real-credential";
      const origin = new URL(process.env.BETTER_AUTH_URL ?? "");
      if (process.env.BETTER_AUTH_SECRET !== secret || origin.hostname !== "localhost" || origin.protocol !== "http:") {
        throw new Error("Synthetic sessions require the explicit inert secret and local HTTP origin.");
      }
      const userId = `marketing_session_${randomUUID()}`;
      const email = `${userId}@example.com`;
      accounts.push(email);
      await seed.sql`INSERT INTO "user" (id, name, email, email_verified, first_name, can_host, can_book, created_at, updated_at) VALUES (${userId}, 'FitOut Demo', ${email}, false, 'FitOut', ${intent === "host"}, ${intent === "book"}, now(), now())`;
      const token = randomUUID();
      await seed.sql`INSERT INTO session (id, token, user_id, expires_at, created_at, updated_at) VALUES (${randomUUID()}, ${token}, ${userId}, now() + interval '1 hour', now(), now())`;
      // Installed better-call uses encoded token.HMAC-SHA256(base64).
      const signature = createHmac("sha256", secret).update(token).digest("base64");
      await page.context().addCookies([{ name: "better-auth.session_token", value: encodeURIComponent(`${token}.${signature}`), url: origin.origin, httpOnly: true, sameSite: "Lax", secure: false }]);
      const response = await page.request.get(`${origin.origin}/api/auth/get-session`);
      expect(response.ok(), "real session reader accepts the guarded local fixture").toBe(true);
      expect((await response.json())?.user?.id).toBe(userId);
      return userId;
    },
    async account(page: Page, intent: "book" | "host") {
      const email = `marketing.${randomUUID()}@example.com`;
      accounts.push(email);
      const response = await page.request.post("/api/auth/sign-up/email", {
        data: { email, password: "FitOutDemoPassword123!", name: "FitOut Demo", firstName: "FitOut", intent },
      });
      expect(response.ok(), "real local account signup succeeds").toBe(true);
      const [user] = await seed.sql`SELECT id FROM "user" WHERE email = ${email}`;
      expect(user).toBeTruthy();
      return user.id as string;
    },
    async readyHost(userId: string) {
      await seed.sql`UPDATE "user" SET email_verified = true WHERE id = ${userId}`;
      await seed.sql`INSERT INTO host_verification (user_id, status, provider, created_at, updated_at) VALUES (${userId}, 'approved', 'manual', now(), now())`;
      await seed.sql`INSERT INTO host_payout (user_id, paymongo_account_id, activation_status, payouts_enabled, onboarding_complete, created_at, updated_at) VALUES (${userId}, ${`demo_${randomUUID()}`}, 'activated', true, true, now(), now())`;
      await seed.sql`UPDATE listing SET host_id = ${userId} WHERE id = ${seed.listingId}`;
      const [gates] = await seed.sql`SELECT u.email_verified, p.payouts_enabled, v.status AS verification_status, l.status, l.review_state, EXISTS (SELECT 1 FROM operating_hours h WHERE h.listing_id = l.id) AS has_hours FROM listing l JOIN "user" u ON u.id = l.host_id JOIN host_payout p ON p.user_id = u.id JOIN host_verification v ON v.user_id = u.id WHERE l.id = ${seed.listingId}`;
      expect(gates).toMatchObject({ email_verified: true, payouts_enabled: true, verification_status: "approved", status: "published", review_state: "approved", has_hours: true });
    },
    async cleanup() {
      assertMarketingSafety();
      await seed.sql`DELETE FROM notification WHERE booking_id IN (SELECT id FROM booking WHERE listing_id = ${seed.listingId})`;
      await seed.sql`DELETE FROM booking WHERE listing_id = ${seed.listingId}`;
      await seed.sql`DELETE FROM listing WHERE id = ${seed.listingId}`;
      for (const email of accounts) {
        await seed.sql`DELETE FROM audit WHERE actor_id IN (SELECT id FROM "user" WHERE email = ${email})`;
        await seed.sql`DELETE FROM "user" WHERE email = ${email}`;
        expect(await seed.sql`SELECT id FROM "user" WHERE email = ${email}`).toHaveLength(0);
      }
      await seed.sql`DELETE FROM "user" WHERE id = ${seed.hostId}`;
      expect(await seed.sql`SELECT id FROM listing WHERE id = ${seed.listingId}`).toHaveLength(0);
      expect(await seed.sql`SELECT id FROM "user" WHERE id = ${seed.hostId}`).toHaveLength(0);
      await seed.sql.end();
    },
  };
}
