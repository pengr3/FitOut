import { expect, test, type Page } from "@playwright/test";

import { BASE, seedBookableListing, signUpBooker, type SeededListing } from "./helpers/booker-seed";
import { seedPaymentStates, type SeededPaymentStates } from "./helpers/seed-payment-states";

// TRUST-05 / GATE-05 / D-76 — THE NUMBER PRINTED ON THE RECEIPT IS THE NUMBER THE DATABASE FROZE.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE ENVIRONMENT BOUNDARY — `DATABASE_URL` AND NOTHING ELSE (D-35)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// This spec's ONLY environment input is `DATABASE_URL`. It calls no payment provider, reads no secret and
// asserts nothing that depends on one being present. That is a deliberate constraint carried over from
// `price-parity.spec.ts`, which 13-RESEARCH § Environment Availability describes as *deliberately scoped*
// for it: GATE-05 runs in a CI job that must never be granted a live key, so a money gate that needed one
// would either be excluded from that job or would drag the key into it. Both outcomes are worse than the
// gate.
//
// It is honoured MECHANICALLY rather than by intention. Both cases below drive rows whose money columns
// are written by the seed — a `confirmed` booking and a `cancelled` booking carrying a partial refund —
// and `receipt/page.tsx`'s D-76 predicate admits BOTH on the row's own columns, above and independent of
// `probeCheckoutSession`. The probe still runs, and on a machine with no key it returns `null` without
// making a request; on a machine WITH one it asks about a synthetic `cs_e2e_…` session, collects a
// non-2xx and returns `null` anyway. The two paths are indistinguishable here, which is what makes this
// file stable in both places.
//
// The visible consequence of that silence is asserted rather than left implicit: the payment line
// DEGRADES to `Booked` (D-85's honest fallback against `created_at`) and never claims `Date paid`. If a
// future edit made this spec's green depend on a probe answering, that assertion is where it would break.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE ADDS OVER `e2e/receipt-access.spec.ts`, WHICH ALSO ASSERTS PARITY
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// Plan 13-12 shipped a parity assertion inside `receipt-access.spec.ts` case (1), and that overlap is
// real and is recorded here rather than left for a reader to discover. Two things are new:
//
//   1. THE EXACTLY-ONE-HOOK GUARD IN `price-parity.spec.ts`'s SHAPE — a BOUNDED POLL that returns a
//      count, followed by a separate assertion with its own message naming that count. The sibling
//      spec's `toHaveCount(1)` is a locator auto-wait: correct, but it cannot distinguish "the hook is
//      absent" from "the page is slow", and the message it fails with is Playwright's. The receipt is
//      the FOURTH money literal in a codebase that already had three, and `price-breakdown.tsx:363-380`
//      records exactly what a shared id costs — *with two matches it would silently parse whichever came
//      first in the DOM*. A parity spec that reads the wrong element is green and means nothing.
//   2. THE REFUND CASE, WHICH IS ENTIRELY NEW. No row anywhere in `e2e/` carried a `refund_cents` before
//      plan 13-13 added the `cancelledRefunded` shape, so D-76's *refund is its own row, never netted
//      into the Total* had never been rendered by a real request. Case (2) is the assertion that catches
//      a receipt subtracting a refund from its total, and it is unmakeable without that fixture.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE COMPARISON IS INTEGER-TO-INTEGER
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `price-parity.spec.ts`'s reason, unchanged: formatting the DB value and string-comparing would turn a
// currency-symbol, locale or separator change into a RED on the one gate that must never be ignored. The
// rendered string is inverted back to centavos instead, and the 2-decimal shape is asserted FIRST —
// without it, stripping non-digits yields a number 100× too small and the equality would be comparing
// pesos to centavos while looking perfectly healthy.

test.describe("TRUST-05 — the receipt's total IS the database's, and a refund is not netted into it", () => {
  test.describe.configure({ mode: "serial" });

  let seed: SeededListing;
  let payStates: SeededPaymentStates | null = null;
  let ownerEmail: string;

  test.beforeAll(async () => {
    seed = await seedBookableListing({ titlePrefix: "E2E Receipt Parity" });
  });

  test.afterAll(async () => {
    await payStates?.teardown();
    await seed.teardown();
  });

  /**
   * Log a recorded booker back in.
   *
   * ⚠ THE SESSION DOES NOT CROSS A TEST BOUNDARY. Playwright's `page` fixture is per-TEST — a fresh
   * context, a fresh cookie jar — so a case that assumes the previous case's sign-in runs SIGNED OUT,
   * `(app)/layout.tsx` redirects it to `/login`, and every receipt assertion fails with zero elements.
   * That reads exactly like the regression the case exists to catch, which is why this is a named helper
   * rather than an inline block; `receipt-access.spec.ts` and `shell.spec.ts:733-742` both record the
   * same trap from their own first drafts. The password is `signUpBooker`'s own constant.
   */
  async function logInAs(page: Page, email: string): Promise<void> {
    await page.goto(`${BASE}/login`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("averylongpassword");
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 });
  }

  /**
   * THE GUARD — count the elements carrying the hook, with a BOUNDED POLL rather than a locator
   * auto-wait, so the two failure modes stay distinguishable.
   *
   * `price-parity.spec.ts:212-225`'s mechanism, for its stated reason: a slow render is waited out, and a
   * hook that is genuinely absent returns 0 and lands on `expectExactlyOneHook`'s own message instead of
   * on a generic "locator resolved to 0 elements" timeout that says nothing about which invariant broke.
   */
  async function countTotalHooks(page: Page): Promise<number> {
    const hook = page.getByTestId("receipt-total");
    const deadline = Date.now() + 10_000;
    let count = await hook.count();
    while (count === 0 && Date.now() < deadline) {
      await page.waitForTimeout(250);
      count = await hook.count();
    }
    return count;
  }

  /** Asserted BEFORE the equality, always, and with a message that names the count it saw. */
  function expectExactlyOneHook(count: number, where: string): void {
    expect(
      count,
      `${where}: the receipt rendered ${count} elements carrying the receipt-total hook; expected ` +
        `exactly 1. 0 means the hook was renamed or moved off the total — the GATE-05 regression this ` +
        `spec exists for, and the equality below would then never run, leaving this gate green for no ` +
        `reason. More than 1 means "the rendered total" is ambiguous and the parity read would silently ` +
        `parse whichever came first in the DOM, which is the failure ` +
        `src/components/booking/price-breakdown.tsx:363-380 records for the three sibling money hooks ` +
        `and the whole reason this is a FOURTH literal rather than a reuse. The hook is declared in ` +
        `src/lib/design/selector-contract.ts and lives in src/components/booking/receipt-lines.tsx.`,
    ).toBe(1);
  }

  /**
   * Invert `formatMoney` back to INTEGER CENTAVOS. See the header for why the comparison is integer to
   * integer and why the 2-decimal shape is asserted first.
   */
  function toCentavos(rendered: string, what: string): number {
    const text = rendered.trim();
    expect(
      text,
      `the rendered ${what} "${text}" does not end in a 2-digit fraction. formatMoney pins ` +
        `minimum/maximumFractionDigits to 2, so this means the money formatter changed shape — fix that ` +
        `or fix this inverse, but do NOT relax it: without the 2 decimals, stripping non-digits yields a ` +
        `number 100× too small and the equality below would be comparing pesos to centavos.`,
    ).toMatch(/\d[.,]\d{2}$/);
    const digits = text.replace(/\D/g, "");
    expect(digits, `the rendered ${what} "${text}" contains no digits`).not.toBe("");
    return Number(digits);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════
  // CASE 1 — the confirmed receipt
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════
  test("(1) the total on a confirmed receipt equals booking.quoted_total_cents (GATE-05)", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    ownerEmail = await signUpBooker(page, seed);
    const [{ id: bookerId }] = await seed.sql<{ id: string }[]>`
      SELECT id FROM "user" WHERE email = ${ownerEmail}
    `;
    payStates = await seedPaymentStates(seed, bookerId, { idPrefix: "e2e_parity" });

    const bookingId = payStates.bookingIds.confirmed;
    await page.goto(`${BASE}/bookings/${bookingId}/receipt`, { waitUntil: "networkidle" });

    // Reachability first: an assertion about a document that never rendered is an assertion about the
    // not-found boundary. (`scroll-area-overflow.spec.ts:215-223`'s rule, which the sibling money gate
    // carries as TRAP 1.)
    await expect(
      page.getByTestId("receipt"),
      `the owner did not get a receipt for ${bookingId} at all. Either D-76's predicate refused a row ` +
        `whose payment_id is populated — the one shape the confirm UPDATE actually wrote money columns ` +
        `on — or the owner gate 404'd its own booking.`,
    ).toHaveCount(1);

    // ── THE GUARD, BEFORE ANYTHING IS READ OFF THE ELEMENT. ────────────────────────────────────────
    expectExactlyOneHook(await countTotalHooks(page), "the confirmed receipt");

    const hook = page.getByTestId("receipt-total");
    // Present is not the same as shown. A hook on a `display:none` node still yields textContent, and a
    // total the booker cannot see is not a total the booker can check against a bank statement.
    await expect(hook).toBeVisible();

    const renderedCentavos = toCentavos((await hook.textContent()) ?? "", "total");

    // Read BACK from Postgres rather than compared against the fixture's constants: the assertion is
    // that the DOCUMENT agrees with the ROW. Comparing the page to a value this file typed would only
    // prove the file agrees with itself.
    const [row] = await seed.sql<{ quoted_total_cents: number | null }[]>`
      SELECT quoted_total_cents FROM booking WHERE id = ${bookingId}
    `;
    expect(
      row,
      `no booking row for ${bookingId} — the fixture did not write the row this case navigated to, so ` +
        `there is no frozen figure to compare against.`,
    ).toBeTruthy();
    expect(
      row.quoted_total_cents,
      `booking.quoted_total_cents is NULL for ${bookingId}. The comparison below would then be against ` +
        `nothing; a receipt for a row with no frozen quote should not exist.`,
    ).not.toBeNull();

    expect(
      renderedCentavos,
      `RECEIPT PARITY BROKEN. The receipt for booking ${bookingId} states ${renderedCentavos} centavos; ` +
        `booking.quoted_total_cents is ${row.quoted_total_cents}. The rendered figure is what a booker ` +
        `holds beside a bank statement and the frozen column is what PayMongo charged — a difference ` +
        `here is a wrong number on a real card, not a display bug. Do NOT "fix" it by re-deriving the ` +
        `total in the browser: ReceiptLines does zero arithmetic by contract (D-49/D-74). Find which of ` +
        `the two moved.`,
    ).toBe(Number(row.quoted_total_cents));

    // ── THE ENVIRONMENT BOUNDARY, ASSERTED AS A CONSEQUENCE (D-35 / D-85). See the header. ─────────
    const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    expect(
      body,
      `the receipt claims a payment DATE it never learned. The probe answers null here on BOTH paths — ` +
        `no key configured, or a key configured and a synthetic session that 404s — so the only honest ` +
        `line is "Booked" against created_at. A "Date paid" appearing here means this spec's green has ` +
        `started to depend on a PayMongo secret, which is the boundary D-35 draws.`,
    ).not.toContain("Date paid");
    expect(
      body,
      `the fallback payment line is missing entirely: neither "Date paid" nor "Booked" reached the ` +
        `page, so the assertion above passed against a document with no payment line at all.`,
    ).toContain("Booked");
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════
  // CASE 2 — D-76: THE REFUND IS ITS OWN ROW, AND THE TOTAL DOES NOT MOVE
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════
  //
  // The failure this catches is one line of arithmetic: `total - refund`, rendered into the Total. It
  // reads perfectly — the document would show what the booker "really" paid — and it is wrong, because
  // the Total states what was CHARGED and the charge is what appears on the card statement. A netted
  // total makes the receipt disagree with the bank in exactly the situation where somebody is comparing
  // the two.
  //
  // The fixture is a PARTIAL refund on purpose (`REFUND_CENTS`, ₱787.50 against a ₱1,050.00 quote): with
  // a full refund, "the Total is the quote" and "the Total is the refund" would be the same assertion
  // and a receipt that printed one in the other's place would pass.
  test("(2) a refunded booking shows the refund as its OWN row, and the total still equals the frozen quote (D-76)", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    expect(
      payStates,
      "the payment-state fixture is null, so case 1 did not reach its seed. A null here is a failure of " +
        "that case, not of this one.",
    ).not.toBeNull();

    await logInAs(page, ownerEmail);

    const bookingId = payStates!.bookingIds.cancelledRefunded;
    await page.goto(`${BASE}/bookings/${bookingId}/receipt`, { waitUntil: "networkidle" });

    await expect(
      page.getByTestId("receipt"),
      `the refunded booking ${bookingId} rendered no receipt. D-76 admits a cancelled row on ` +
        `(refundCents !== null || paymentId !== null) using the row's OWN columns — this fixture ` +
        `carries both — so a 404 here means that predicate narrowed, not that the probe stayed silent.`,
    ).toHaveCount(1);

    expectExactlyOneHook(await countTotalHooks(page), "the refunded receipt");

    const [row] = await seed.sql<{ quoted_total_cents: number | null; refund_cents: number | null }[]>`
      SELECT quoted_total_cents, refund_cents FROM booking WHERE id = ${bookingId}
    `;
    expect(row, `no booking row for ${bookingId}`).toBeTruthy();
    expect(
      row.refund_cents,
      `booking.refund_cents is NULL on the refunded fixture, so every assertion below is about a ` +
        `booking with no refund and the refund row is correctly absent. The fixture is broken, not the ` +
        `page.`,
    ).not.toBeNull();

    // ── THE THREAT FIRST (13-11's ordering rule): the Total must not have moved. ───────────────────
    const totalHook = page.getByTestId("receipt-total");
    await expect(totalHook).toBeVisible();
    const renderedTotal = toCentavos((await totalHook.textContent()) ?? "", "total");
    expect(
      renderedTotal,
      `THE REFUND WAS NETTED INTO THE TOTAL. The receipt for ${bookingId} states ${renderedTotal} ` +
        `centavos; booking.quoted_total_cents is ${row.quoted_total_cents} and booking.refund_cents is ` +
        `${row.refund_cents} — and ${Number(row.quoted_total_cents) - Number(row.refund_cents)} is what ` +
        `subtracting one from the other gives. The Total states what was CHARGED (it is the figure on ` +
        `the card statement); what came back is a separate movement and D-76 gives it its own row below.`,
    ).toBe(Number(row.quoted_total_cents));

    // ── AND THE REFUND IS ACTUALLY THERE, AS A ROW OF ITS OWN. ─────────────────────────────────────
    //
    // Located by its TERM rather than by its figure, and the term is accepted as either of D-83's two
    // words: the fixture's rail (`gcash`) is API-refundable so it resolves to `Refunded` today, but the
    // property under test is *the amount has a row and a word beside it*, not which word. Asserting the
    // word here would make this case fail when `REFUNDABLE_RAILS` changes — a red about refund dispatch
    // on a spec about receipt arithmetic.
    const receipt = page.getByTestId("receipt");
    const refundTerm = receipt.locator("dt", { hasText: /^(Refunded|Returned by hand)$/ });
    await expect(
      refundTerm,
      `no refund row on the receipt for ${bookingId}. booking.refund_cents is ${row.refund_cents}, so ` +
        `money came back and the document does not say so — which is the other half of D-76: a refund ` +
        `must never be netted into the Total AND must never be silently dropped.`,
    ).toHaveCount(1);

    const refundValue = refundTerm.locator("xpath=following-sibling::dd[1]");
    await expect(refundValue).toBeVisible();
    const renderedRefund = toCentavos((await refundValue.textContent()) ?? "", "refund");
    expect(
      renderedRefund,
      `the refund row states ${renderedRefund} centavos; booking.refund_cents is ${row.refund_cents}. ` +
        `The figure a booker is told came back must be the figure the cancellation actually computed ` +
        `and wrote (D-79).`,
    ).toBe(Number(row.refund_cents));

    // GUARD THE GUARD — the two figures must be DIFFERENT elements carrying DIFFERENT numbers. A
    // document that rendered one number twice would satisfy both equalities above if the fixture ever
    // drifted to a full refund, and this file would go on reporting that the refund is "separate".
    expect(
      renderedRefund,
      `the refund and the total render the same figure (${renderedRefund}), so "its own row" is not ` +
        `distinguishable from "the total repeated". The fixture's refund is deliberately PARTIAL — see ` +
        `REFUND_CENTS in e2e/helpers/seed-payment-states.ts — so this means the fixture moved.`,
    ).not.toBe(renderedTotal);
    expect(
      await refundValue.getAttribute("data-testid"),
      `the refund figure carries the receipt-total hook, so the "exactly one hook" guard above and the ` +
        `parity read are both resolving against a refund.`,
    ).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — stated so the next reader under-trusts this file by the right amount
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • THE PER-HEAD LINE (D-86). `seed-payment-states.ts` seeds EXCLUSIVE rows only, so the open-capacity
//     itemisation — `₱x/person × n passes`, gated on `openCapacity === true` and a positive match
//     against the frozen space price — is not exercised by any seeded request. It is proved at the
//     component level (`tests/booking/receipt-lines.test.tsx`), which proves the component renders what
//     it is handed and NOT that the RSC hands it correctly. Handed forward explicitly by 13-12 and again
//     by 13-13; it wants an open-capacity fixture, not another assertion here.
//   • THE `paid` HALF OF D-85. `Date paid` renders only from a real provider `paid_at`, which needs a
//     live PayMongo session — i.e. a secret. It is out of this file's environment boundary BY DESIGN,
//     and the assertion above is that the fallback is the honest one, not that the real path works.
//   • A REVERSED BOOKING'S RECEIPT. That shape is admitted only on a probe that confirms payment, so on
//     a machine with no key it has no receipt at all (13-12 decision 7). Asserting it here would make
//     this file's green depend on the secret this file exists to do without.
