import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";
import postgres from "postgres";

const E2E_PORT = process.env.FITOUT_OPS_E2E_PORT ?? "3000";
const OPS_HOST = `ops.localhost:${E2E_PORT}`;
const OPS_ORIGIN = `http://${OPS_HOST}`;
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";
const PASSWORD = "averylongpassword";

function assertLocalDatabase(): void {
  const hostname = new URL(DATABASE_URL).hostname.toLowerCase();
  expect(
    ["localhost", "127.0.0.1", "::1", "db"],
    "the ops queue tracer must never seed a non-local database",
  ).toContain(hostname);
}

test("staff can inspect a complete pending listing without leaving the ops queue", async ({ browser }) => {
  test.setTimeout(180_000);
  assertLocalDatabase();

  const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
  const suffix = randomUUID();
  const staffId = `e2e_ops_queue_staff_${suffix}`;
  const hostId = `e2e_ops_queue_host_${suffix}`;
  const listingId = `e2e_ops_queue_listing_${suffix}`;
  const staffEmail = `e2e.ops.queue.staff.${suffix}@example.test`;
  const listingTitle = `Queue evidence ${suffix.slice(0, 8)}`;
  const context = await browser.newContext({ baseURL: OPS_ORIGIN });

  try {
    const passwordHash = await hashPassword(PASSWORD);
    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO "user"
          (id, name, first_name, email, email_verified, can_book, can_host, role, created_at, updated_at)
        VALUES
          (${staffId}, ${"Ops Queue Staff"}, ${"Ops"}, ${staffEmail}, true, false, false, ${"staff"}, now(), now()),
          (${hostId}, ${"Evidence Host"}, ${"Evidence"}, ${`e2e.ops.queue.host.${suffix}@example.test`}, true, false, true, ${"user"}, now(), now())
      `;
      await tx`
        INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
        VALUES (${randomUUID()}, ${staffId}, ${"credential"}, ${staffId}, ${passwordHash}, now(), now())
      `;
      await tx`
        INSERT INTO host_verification (user_id, status, provider, created_at, updated_at)
        VALUES (${hostId}, ${"approved"}::host_verification_status, ${"manual"}, now(), now())
      `;
      await tx`
        INSERT INTO listing
          (id, host_id, title, description, primary_space_type, address_line1, city, region, country,
           max_occupancy, hourly_rate_cents, currency, status, review_state, created_at, updated_at)
        VALUES
          (${listingId}, ${hostId}, ${listingTitle}, ${"A complete description for the staff review."},
           ${"home_private_gym"}::space_type, ${"101 Evidence Street"}, ${"Quezon City"}, ${"Metro Manila"}, ${"PH"},
           12, 250000, ${"php"}, ${"published"}::listing_status, ${"pending"}::listing_review_state, now(), now())
      `;
      await tx`
        INSERT INTO listing_photo (id, listing_id, public_id, url, position)
        VALUES
          (${`e2e_ops_queue_photo_b_${suffix}`}, ${listingId}, ${`e2e_ops_queue_photo_b_${suffix}`}, ${"https://example.test/evidence-b.jpg"}, 1),
          (${`e2e_ops_queue_photo_a_${suffix}`}, ${listingId}, ${`e2e_ops_queue_photo_a_${suffix}`}, ${"https://example.test/evidence-a.jpg"}, 0)
      `;
      await tx`
        INSERT INTO listing_amenity (listing_id, amenity)
        VALUES (${listingId}, ${"wifi"}), (${listingId}, ${"kitchen"})
      `;
      await tx`
        INSERT INTO listing_review (id, listing_id, state, submitted_at)
        VALUES (${`e2e_ops_queue_review_${suffix}`}, ${listingId}, ${"pending"}::listing_review_state, now())
      `;
    });

    const signIn = await context.request.post(`${OPS_ORIGIN}/api/auth/sign-in/email`, {
      headers: { host: OPS_HOST, origin: OPS_ORIGIN },
      data: { email: staffEmail, password: PASSWORD },
      failOnStatusCode: false,
    });
    expect(signIn.status(), "ops-host Better Auth sign-in failed").toBe(200);

    const page = await context.newPage();
    await page.goto(`${OPS_ORIGIN}/ops`);
    const card = page.getByTestId("row-card").filter({ hasText: listingTitle });
    const disclosure = card.getByRole("button", { name: "Show listing evidence" });
    await expect(disclosure).toBeVisible();
    await disclosure.click();
    await expect(disclosure).toHaveAccessibleName("Hide listing evidence");
    await expect(disclosure).toHaveAttribute("aria-expanded", "true");
    await expect(page).toHaveURL(`${OPS_ORIGIN}/ops`);
    await expect(card.getByRole("region", { name: "Listing evidence" })).toContainText(
      "A complete description for the staff review.",
    );
    await expect(card.getByRole("button", { name: `Approve ${listingTitle}` })).toBeVisible();
    expect(await card.locator("a").count()).toBe(0);
    expect(await card.locator('[role="link"]').count()).toBe(0);
  } finally {
    await context.close();
    await sql`DELETE FROM "user" WHERE id IN (${staffId}, ${hostId})`;
    await sql.end({ timeout: 5 });
  }
});
