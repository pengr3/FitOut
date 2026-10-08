import { expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { assertTestDatabase } from "../../tests/helpers/test-db-url";
import { seedBookableListing } from "./booker-seed";

export const MARKETING_TEST_DATABASE = "postgresql://fitout:fitout@localhost:5432/fitout_test";

export function assertMarketingSafety() {
  const raw = process.env.DATABASE_URL;
  if (raw !== MARKETING_TEST_DATABASE || process.env.RESEND_API_KEY !== "" || process.env.FITOUT_E2E_REAL_EMAIL === "1") {
    throw new Error("Marketing fixtures require the explicit local fitout_test database and disabled real mail.");
  }
  assertTestDatabase(raw, "marketing capture database");
}

export async function marketingFixture() {
  assertMarketingSafety();
  // Existing approved local fixture mechanism; no photo can enter the capture.
  const seed = await seedBookableListing({ photos: 0, titlePrefix: "FitOut Demo" });
  const accounts: string[] = [];
  await seed.sql`UPDATE "user" SET name = 'FitOut Demo', first_name = 'FitOut' WHERE id = ${seed.hostId}`;
  await seed.sql`UPDATE listing SET title = 'FitOut Demo Court', description = 'A demo space for your next session.' WHERE id = ${seed.listingId}`;
  return {
    ...seed,
    title: "FitOut Demo Court",
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
      await seed.teardown();
    },
  };
}
