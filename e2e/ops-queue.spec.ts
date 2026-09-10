import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";
import postgres from "postgres";

import { seedTheme } from "./helpers/theme";

const E2E_PORT = process.env.FITOUT_OPS_E2E_PORT ?? "3000";
const OPS_HOST = `ops.localhost:${E2E_PORT}`;
const OPS_ORIGIN = `http://${OPS_HOST}`;
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";
const PASSWORD = "averylongpassword";
const THEMES = ["court", "grove"] as const;
const WIDTHS = [320, 1280] as const;
const LONG_DESCRIPTION =
  "A complete staff-review description with enough practical detail to wrap across narrow evidence " +
  "layouts without asking an operator to navigate away from the decision they need to make. ".repeat(5);

function assertLocalDatabase(): void {
  const hostname = new URL(DATABASE_URL).hostname.toLowerCase().replace(/^\[|\]$/g, "");
  expect(
    ["localhost", "127.0.0.1", "::1"],
    "the ops queue tracer must never seed a non-local database",
  ).toContain(hostname);
}

test("staff can inspect a complete pending listing across the Court/Grove queue matrix", async ({ browser }) => {
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
          (${listingId}, ${hostId}, ${listingTitle}, ${LONG_DESCRIPTION},
           ${"home_private_gym"}::space_type, ${"101 Evidence Street"}, ${"Quezon City"}, ${"Metro Manila"}, ${"PH"},
           12, 250000, ${"php"}, ${"published"}::listing_status, ${"pending"}::listing_review_state, now(), now())
      `;
      await tx`
        INSERT INTO listing_photo (id, listing_id, public_id, url, position)
        VALUES
          (${`e2e_ops_queue_photo_a_${suffix}`}, ${listingId}, ${`e2e_ops_queue_photo_a_${suffix}`}, ${"https://example.test/evidence-a.jpg"}, 0),
          (${`e2e_ops_queue_photo_b_${suffix}`}, ${listingId}, ${`e2e_ops_queue_photo_b_${suffix}`}, ${"https://example.test/evidence-b.jpg"}, 1),
          (${`e2e_ops_queue_photo_c_${suffix}`}, ${listingId}, ${`e2e_ops_queue_photo_c_${suffix}`}, ${"https://example.test/evidence-c.jpg"}, 2),
          (${`e2e_ops_queue_photo_d_${suffix}`}, ${listingId}, ${`e2e_ops_queue_photo_d_${suffix}`}, ${"https://example.test/evidence-d.jpg"}, 3),
          (${`e2e_ops_queue_photo_e_${suffix}`}, ${listingId}, ${`e2e_ops_queue_photo_e_${suffix}`}, ${"https://example.test/evidence-e.jpg"}, 4),
          (${`e2e_ops_queue_photo_f_${suffix}`}, ${listingId}, ${`e2e_ops_queue_photo_f_${suffix}`}, ${"https://example.test/evidence-f.jpg"}, 5)
      `;
      await tx`
        INSERT INTO listing_amenity (listing_id, amenity)
        VALUES
          (${listingId}, ${"showers"}), (${listingId}, ${"lockers_changing"}),
          (${listingId}, ${"restrooms"}), (${listingId}, ${"parking"}),
          (${listingId}, ${"equipment_provided"}), (${listingId}, ${"climate_control"}),
          (${listingId}, ${"wifi"}), (${listingId}, ${"drinking_water"}),
          (${listingId}, ${"sound_system"}), (${listingId}, ${"mirrors"}),
          (${listingId}, ${"accessible_step_free"}), (${listingId}, ${"towels"}),
          (${listingId}, ${"first_aid_aed"})
      `;
      await tx`
        INSERT INTO operating_hours (id, listing_id, day_of_week, open_time, close_time)
        VALUES
          (${`e2e_ops_queue_hours_late_${suffix}`}, ${listingId}, 1, ${"16:00"}, ${"21:00"}),
          (${`e2e_ops_queue_hours_early_${suffix}`}, ${listingId}, 1, ${"06:00"}, ${"10:00"})
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
    for (const theme of THEMES) {
      await seedTheme(context, theme);
      for (const width of WIDTHS) {
        const where = `${theme} · ${width}px`;
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${OPS_ORIGIN}/ops`, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);

        const card = page.getByTestId("row-card").filter({ hasText: listingTitle });
        const disclosure = card.getByRole("button", { name: "Show listing evidence" });
        await expect(disclosure, `${where}: the listing lost its native disclosure`).toHaveCount(1);
        await expect(card.locator("a"), `${where}: a terminal collapsed row grew an anchor`).toHaveCount(0);
        await expect(card.locator('[role="link"]'), `${where}: a terminal collapsed row grew a link role`).toHaveCount(0);

        await disclosure.focus();
        await disclosure.click();
        const expandedDisclosure = card.getByRole("button", { name: "Hide listing evidence" });
        await expect(expandedDisclosure).toHaveCount(1);
        await expect(expandedDisclosure).toHaveAttribute("aria-expanded", "true");
        await expect(page).toHaveURL(`${OPS_ORIGIN}/ops`);

        const evidence = card.getByRole("region", { name: "Listing evidence" });
        await expect(evidence, `${where}: expansion mounted the wrong evidence count`).toHaveCount(1);
        await expect(evidence).toContainText(LONG_DESCRIPTION);
        await expect(evidence.getByLabel(`Photos of ${listingTitle}`)).toHaveCount(1);
        await expect(evidence, `${where}: the canonical Monday schedule is missing`).toContainText(
          "Monday: 6:00 AM to 10:00 AM, and 4:00 PM to 9:00 PM",
        );
        await expect(evidence, `${where}: the explicit closed Sunday is missing`).toContainText(
          "Sunday: closed",
        );
        await expect(
          card.getByRole("button", { name: `Show contact for Evidence Host` }),
          `${where}: the existing contact reveal disappeared from evidence`,
        ).toHaveCount(1);
        await expect(card.locator("a"), `${where}: expanded evidence grew an anchor`).toHaveCount(0);
        await expect(card.locator('[role="link"]'), `${where}: expanded evidence grew a link role`).toHaveCount(0);

        const approve = card.getByRole("button", { name: `Approve ${listingTitle}` });
        const reject = card.getByRole("button", { name: `Reject ${listingTitle}` });
        await expect(approve, `${where}: the sole approve control is missing`).toHaveCount(1);
        await expect(reject, `${where}: the sole reject control is missing`).toHaveCount(1);

        const geometry = await card.evaluate((row, viewportWidth) => {
          const rect = (element: Element) => {
            const bounds = element.getBoundingClientRect();
            return { top: bounds.top, bottom: bounds.bottom, left: bounds.left, right: bounds.right, height: bounds.height };
          };
          const controls = Array.from(row.querySelectorAll<HTMLElement>("button"))
            .filter((button) => /^Approve |^Reject /.test(button.getAttribute("aria-label") ?? ""))
            .map(rect);
          const evidence = row.querySelector<HTMLElement>('[aria-label="Listing evidence"]');
          return {
            viewport: { width: viewportWidth, height: window.innerHeight },
            document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth },
            row: { clientWidth: (row as HTMLElement).clientWidth, scrollWidth: (row as HTMLElement).scrollWidth },
            controls,
            evidence: evidence ? rect(evidence) : null,
          };
        }, width);

        expect(geometry.document.scrollWidth, `${where}: the document has horizontal overflow`).toBeLessThanOrEqual(geometry.document.clientWidth);
        expect(geometry.row.scrollWidth, `${where}: the evidence row has horizontal overflow`).toBeLessThanOrEqual(geometry.row.clientWidth);
        expect(geometry.controls, `${where}: exactly two decision controls must remain`).toHaveLength(2);
        for (const [index, control] of geometry.controls.entries()) {
          expect(control.height, `${where}: control ${index} is below the 44px touch floor`).toBeGreaterThanOrEqual(44);
          expect(control.top, `${where}: control ${index} scrolled above the viewport after expansion`).toBeGreaterThanOrEqual(0);
          expect(control.bottom, `${where}: control ${index} falls below the viewport after expansion`).toBeLessThanOrEqual(geometry.viewport.height);
          expect(control.left, `${where}: control ${index} escapes left of the viewport`).toBeGreaterThanOrEqual(0);
          expect(control.right, `${where}: control ${index} escapes right of the viewport`).toBeLessThanOrEqual(geometry.viewport.width);
        }
        expect(geometry.evidence?.top, `${where}: evidence does not follow the decision controls`).toBeGreaterThanOrEqual(
          Math.max(...geometry.controls.map((control) => control.bottom)),
        );
      }
    }
  } finally {
    await context.close();
    await sql`DELETE FROM "user" WHERE id IN (${staffId}, ${hostId})`;
    await sql.end({ timeout: 5 });
  }
});
