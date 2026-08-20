import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

import {
  BASE,
  seedBookableListing,
  signUpBooker,
  type SeededListing,
} from "./helpers/booker-seed";
import { seedPaymentStates, type SeededPaymentStates } from "./helpers/seed-payment-states";

// TRUST-05 / D-74 / D-76 — WHO CAN REACH `/bookings/[id]/receipt`, AND WHAT THE TOTAL ON IT SAYS.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THESE THREE PROPERTIES ARE E2E AND NOT COMPONENT TESTS
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// Every one of them is a property of the RESPONSE rather than of a component, and a component suite is
// handed the branch instead of choosing it:
//
//   1. THE OWNER CAN READ IT, AND THE FIGURE IS THE DATABASE'S. `receipt-total`'s DOM text, normalised
//      back to integer centavos, must equal `booking.quoted_total_cents` READ FROM POSTGRES. jsdom can
//      only ever compare the page against the fixture the test itself wrote; this compares the rendered
//      document against the row the app actually froze. It is the receipt's half of GATE-05.
//   2. A STRANGER AND A GHOST GET THE SAME ANSWER. Two requests, two status codes, two rendered
//      documents, compared. Identical markup is not an identical RESPONSE (08-06's finding), and only a
//      real request can tell you what the response was.
//   3. AN UNPAID HOLD HAS NO RECEIPT. D-76's predicate is evaluated inside the RSC, above the render,
//      and its answer is a `notFound()` — there is no component to hand a prop to.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY IT IS ITS OWN FILE RATHER THAN A DESCRIBE INSIDE `shell.spec.ts`
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// That file's booking describe is `mode: "serial"` and its cases read the LAST entry of
// `seed.bookerEmails` to log the fixture's owner back in — its own header warns, at length, that moving
// a case which calls `signUpBooker` changes which booker every later case is signed in as. This spec
// signs up a second booker by design (case 2 is meaningless otherwise), so appending it there would put
// exactly that trap one edit away. A separate file seeds its own listing and owns its own ordering.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE PROBE IS EXPECTED TO LEARN NOTHING HERE, AND THAT IS AN ASSERTION RATHER THAN AN ACCIDENT
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// The `confirmed` fixture carries a SYNTHETIC `checkout_session_id` (`cs_e2e_…`). With no PayMongo key
// configured `probeCheckoutSession` returns `null` without making a request (D-35's CI secret boundary);
// with a key configured it asks PayMongo about a session that does not exist, collects a non-2xx, and
// returns `null` anyway. Both paths land on the same branch, so this spec is stable on a developer's
// machine and in CI — and case 1 asserts the CONSEQUENCE: D-85's fallback line reads `Booked` and never
// `Date paid`. A receipt that misstates a payment date is the looks-official-but-isn't failure D-75
// guards against, and this is the assertion that it does not.

test.describe("TRUST-05 — the receipt route's owner gate and its money", () => {
  test.describe.configure({ mode: "serial" });

  let seed: SeededListing;
  let payStates: SeededPaymentStates | null = null;
  let ownerEmail: string;

  test.beforeAll(async () => {
    seed = await seedBookableListing({ titlePrefix: "E2E Receipt" });
  });

  test.afterAll(async () => {
    await payStates?.teardown();
    await seed.teardown();
  });

  /**
   * Invert `formatMoney` back to INTEGER CENTAVOS — `price-parity.spec.ts`'s normaliser, verbatim in
   * substance and for its stated reason.
   *
   * The comparison is integer-to-integer on purpose. Formatting the DB value and string-comparing would
   * turn a currency-symbol, locale or separator change into a RED on a money gate — a false alarm on the
   * one gate that must never be ignored. The 2-decimal shape is asserted FIRST, because without it
   * stripping non-digits yields a number 100× too small and the equality would compare pesos to centavos
   * while looking perfectly healthy.
   */
  /**
   * Log a recorded booker back in.
   *
   * ⚠ THE SESSION DOES NOT CROSS A TEST BOUNDARY, and this helper exists because the first run of this
   * file proved it rather than because anyone remembered. Playwright's `page` fixture is per-TEST — a
   * fresh context, a fresh cookie jar — so case 2 ran signed OUT, `(app)/layout.tsx` redirected it to
   * `/login`, and the assertion failed with `getByTestId('empty-state')` resolving to 0 elements. That
   * failure reads EXACTLY like the regression the case exists to catch (a receipt rendered for an
   * unpaid hold would also produce no not-found panel), which is what makes the trap worth a named
   * helper instead of an inline block. `shell.spec.ts:733-742` records the same mechanism from its own
   * first draft; the password is `signUpBooker`'s own constant.
   */
  async function logInAs(page: Page, email: string): Promise<void> {
    await page.goto(`${BASE}/login`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("averylongpassword");
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 });
  }

  function toCentavos(rendered: string): number {
    const text = rendered.trim();
    expect(
      text,
      `the rendered total "${text}" does not end in a 2-digit fraction. formatMoney pins ` +
        `minimum/maximumFractionDigits to 2, so this means the money formatter changed shape — fix ` +
        `that or fix this inverse, but do NOT relax it.`,
    ).toMatch(/\d[.,]\d{2}$/);
    const digits = text.replace(/\D/g, "");
    expect(digits, `the rendered total "${text}" contains no digits`).not.toBe("");
    return Number(digits);
  }

  test("(1) the owner reads the receipt, and its total IS the figure the database froze", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    ownerEmail = await signUpBooker(page, seed);
    const [{ id: bookerId }] = await seed.sql<{ id: string }[]>`
      SELECT id FROM "user" WHERE email = ${ownerEmail}
    `;
    payStates = await seedPaymentStates(seed, bookerId, { idPrefix: "e2e_receipt" });

    const bookingId = payStates.bookingIds.confirmed;
    await page.goto(`${BASE}/bookings/${bookingId}/receipt`, { waitUntil: "networkidle" });

    const article = page.getByTestId("receipt");
    await expect(
      article,
      "the owner did not get the receipt at all. Either the D-76 predicate refused a row whose " +
        "`payment_id` is populated — the one shape whose money columns the confirm UPDATE actually " +
        "wrote — or the owner gate 404'd its own booking.",
    ).toHaveCount(1);

    // ── THE MONEY. Read back from Postgres, not from the fixture's constants: the assertion is that
    // the DOCUMENT agrees with the ROW, and comparing the page to the value the test typed would only
    // prove the test agrees with itself.
    const [row] = await seed.sql<{ quoted_total_cents: number }[]>`
      SELECT quoted_total_cents FROM booking WHERE id = ${bookingId}
    `;

    const hook = page.getByTestId("receipt-total");
    await expect(
      hook,
      "the receipt rendered a number of elements other than one carrying the receipt-total hook. 0 " +
        "means the hook was renamed or moved off the total — the GATE-05 regression this case exists " +
        "for, and the equality below would then never run. More than 1 means the parity read is " +
        "ambiguous, which is the exact failure `price-breakdown.tsx:363-380` records for the three " +
        "sibling hooks and the reason this is a FOURTH literal rather than a reuse.",
    ).toHaveCount(1);

    const rendered = toCentavos((await hook.textContent()) ?? "");
    expect(
      rendered,
      `RECEIPT PARITY BROKEN. The document states ${rendered} centavos; the database froze ` +
        `${row.quoted_total_cents}. The receipt is the surface a booker holds beside a bank ` +
        `statement, so the number on it must be the number the server wrote (GATE-05 / D-130).`,
    ).toBe(Number(row.quoted_total_cents));

    // ── D-85. The probe learned nothing (see the header), so the date line is labelled for what it
    // actually is. This is the assertion the acceptance criterion names, made against the real route.
    const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    expect(
      body,
      "the receipt claims a payment DATE it never learned. `probeCheckoutSession` answered null here " +
        "and there is no `paid_at` column, no `updated_at`, and no join from `paymongo_event` to a " +
        "booking — so the only honest line is `Booked` against `created_at` (D-85).",
    ).not.toContain("Date paid");
    expect(body, "the fallback date line is missing entirely").toContain("Booked");

    // ── D-75. The document says what it is, on the screen, with no print emulation involved.
    expect(
      body,
      "the informal-record disclosure did not RENDER. `receipt-formality.test.ts` proves the sentence " +
        "is in the source; this proves it reached the page in screen media, which is the medium a " +
        "booker is most likely to draw the wrong conclusion in.",
    ).toContain("This is a booking record for your own reference.");
  });

  test("(2) an unpaid hold has no receipt (D-76)", async ({ page }) => {
    expect(
      payStates,
      "the payment-state fixture is null, so case 1 did not reach its seed. A null here is a failure " +
        "of that case, not of this one.",
    ).not.toBeNull();

    // The booker must be THE OWNER for this case to mean anything — see `logInAs`. A signed-out or
    // foreign visitor would 404 for a completely different and correct reason, and the case would pass
    // while proving nothing about D-76.
    await logInAs(page, ownerEmail);

    // The row is a live `pending` hold with a real checkout session and no payment: money has not moved,
    // so under D-76 the document does not exist. A receipt for something nobody paid for invites
    // *"was I charged?"*, which is the exact confusion this phase exists to remove.
    await page.goto(`${BASE}/bookings/${payStates!.bookingIds.pendingLiveHold}/receipt`, {
      waitUntil: "networkidle",
    });

    await expect(
      page.getByTestId("receipt"),
      "an UNPAID hold rendered a receipt. D-76 gates this route on money having moved, and the owner " +
        "gate is not the thing being tested here — this booker owns the row.",
    ).toHaveCount(0);
    await expect(
      page.getByTestId("empty-state"),
      "the unpaid hold did not land on the booking not-found boundary, so the refusal took some other " +
        "shape than the bare 404 a stranger gets. The two must be the same answer.",
    ).toHaveCount(1);
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════
  // T-13-12-RECEIPTIDOR — A FOREIGN BOOKING AND A MISSING ONE ARE ONE ANSWER
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════
  //
  // The shape is 13-10's T-13-10-NFORACLE case, applied to the route that carries MORE than the detail
  // page does: a host's first name, a full street address and paid amounts on one printable document.
  //
  // ⚠ IT RUNS LAST IN THIS SERIAL DESCRIBE ON PURPOSE. `signUpBooker` starts a new session in this
  // page context, so a case placed after it would run as a booker who owns none of the seeded rows and
  // would fail with the owner gate's 404 — indistinguishable from the regression it exists to catch.
  // 13-10's own case carries the same warning for the same mechanism.
  test("(3) a foreign booking and a missing one answer identically (T-13-12-RECEIPTIDOR)", async ({
    page,
  }) => {
    expect(payStates, "the payment-state fixture is null — see case 1").not.toBeNull();

    // A DIFFERENT signed-in booker. Signed in rather than anonymous, deliberately: an anonymous request
    // is turned away by `(app)/layout.tsx` before the gate is reached, so it would measure the layout.
    const stranger = await signUpBooker(page, seed);
    expect(stranger, "the second booker got the owner's email — the fixture is not isolating").not.toBe(
      ownerEmail,
    );

    const foreign = `/bookings/${payStates!.bookingIds.confirmed}/receipt`;
    // A well-formed UUID that names nothing. Deliberately not a malformed id: the route matches any
    // string, and a malformed one is a different and weaker question than the one being asked.
    const missing = `/bookings/${randomUUID()}/receipt`;

    const read = async (url: string) => {
      const response = await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
      const panel = page.getByTestId("empty-state");
      await expect(
        panel,
        `${url}: the owner gate did not land on the booking not-found boundary at all. Either the ` +
          "gate let the render through, or something else answered.",
      ).toHaveCount(1);
      return {
        status: response?.status() ?? null,
        // THE PANEL's markup, not the document's: the shell around it carries this booker's own chrome,
        // which is identical across the two requests only because both are made in one session.
        html: await panel.innerHTML(),
        text: (await page.locator("body").innerText()).replace(/\s+/g, " "),
      };
    };

    const notMine = await read(foreign);
    const notThere = await read(missing);

    // ── THE THREAT FIRST (13-11's ordering rule): the two answers must be the SAME answer. ──────────
    //
    // The status codes are asserted EQUAL TO EACH OTHER and not equal to 404, for 13-10's measured
    // reason: `(app)/layout.tsx` streams a Suspense shell for the header's auth slot, so by the time the
    // RSC reaches its gate the response headers are gone and Next renders the boundary into the open
    // stream — both answers are 200. The oracle is a DIFFERENCE; 200/200 tells a script walking the id
    // space nothing, and pinning the literal would go red on a framework change that altered nothing.
    expect(
      notMine.status,
      `${foreign} vs ${missing}: the two answers carry DIFFERENT status codes, which is an ownership ` +
        "oracle a script reads instantly whatever the page says.",
    ).toBe(notThere.status);
    expect(notMine.status, "no response status was captured at all").not.toBeNull();
    expect(
      notMine.html,
      "the two answers differ. Any difference at all — a sentence, an action, a glyph, a heading " +
        "level — lets somebody walking the id space learn which ids name real bookings.",
    ).toBe(notThere.html);

    // ── AND THE LEAK ITSELF, which parity alone does not cover: two identical pages that both rendered
    // somebody else's receipt would satisfy every assertion above perfectly. This route is where that
    // matters most — it is the one document carrying the venue, the street, the host's name and the
    // amount together.
    expect(
      notMine.text,
      `${foreign}: the venue of somebody else's booking reached the response.`,
    ).not.toContain(seed.title);
    expect(
      notMine.text,
      `${foreign}: the amount on somebody else's booking reached the response.`,
    ).not.toContain("1,050.00");
    expect(
      notMine.text,
      `${foreign}: the reference panel of somebody else's booking reached the response.`,
    ).not.toContain("FIT-");

    // GUARD THE GUARD. An equality between two empty strings is satisfied perfectly by a panel that
    // rendered nothing, and both `toHaveCount(1)` assertions above are just as happy with an empty box.
    expect(
      notMine.html.length,
      "the compared markup is empty, so the equality above proves nothing",
    ).toBeGreaterThan(50);
    expect(notMine.html).toContain("find that booking");
  });
});
