// BOOK-07 / PAY-06 · ROADMAP SC#2 — the cancellation journey, end to end, against the REAL app.
//
// THE POINT OF THIS SPEC, in one sentence: the number the booker READS on the review screen is the number
// they GET. Asserting only that the status flipped to Cancelled would pass against an implementation that
// refunded the wrong amount, which is the single failure this phase exists to prevent — so the previewed
// total is captured off the rendered page and then asserted against the persisted refund.
//
// It drives the dev app against the dev Postgres (public schema), cloning e2e/search-and-book.spec.ts for
// the seed/teardown shape and the signed-in-booker storageState idiom.
//
// ⚠️ NAVIGATION NOTE — RESOLVED BY PLAN 12. This spec used to deep-link to /bookings/[id]/cancel because the
// `Cancel booking` entry point on the detail page did not exist yet (07-09 is Wave 3; the page is Plan 12's
// file, Wave 4). That entry now exists, so the spec reaches the review screen the way a booker does: it lands
// on the booking detail page and CLICKS the entry. The journey is therefore whole — entry included — and the
// coverage gap 07-09 documented is closed.
//
// The entry is a LINK (role=link) and the review screen's confirm is a BUTTON (role=button); both are named
// `Cancel booking`, so every locator below is role-qualified. That is not incidental — D-104 requires the
// entry to route to the disclosure rather than act, and the role difference is what proves it still does.
//
// The booking is seeded directly as `confirmed` rather than paid through PayMongo: a hosted checkout cannot
// be driven from Playwright, and the payment path already has its own coverage (tests/paymongo). The rail is
// seeded as `gcash` so the action takes the API-refundable branch — no live PayMongo call fires because the
// action's refund POST is the ONLY outbound call and it is exercised against test credentials that fail
// closed into the audited operator-alert path, which never affects the durable flip this spec asserts.

import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

// THE FOUR ATTENTION-NEEDING AUDIT ACTIONS ARE IMPORTED, NEVER TYPED. `src/lib/booking/refund-dispatch.ts`
// declares the closed set that means "money is owed and nothing was dispatched", and it is the same
// declaration `refundNeedsManualReturn` queries with — so the assertion at the foot of this file is
// asserting against the product's own list rather than a copy of it that can drift. A literal list here
// would be a second source of truth wearing the costume of a constant, which is the failure
// `scripts/verify-workflows.mjs:118-133` states the rule against. Relative-path import: the established
// idiom for a spec reading a source constant in this suite (`e2e/overflow-320.spec.ts:32`,
// `e2e/one-tree.spec.ts:117`, `e2e/host-verification.spec.ts:74`). If the export is ever renamed, this
// file stops compiling — which is the strongest form the link can take.
import { REFUND_NOT_DISPATCHED_ACTIONS } from "../src/lib/booking/refund-dispatch";

const BASE = "http://localhost:3000";
const VENUE_TZ = "Asia/Manila";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });

const hostId = `e2e_cx_host_${randomUUID()}`;
const listingId = `e2e_cx_listing_${randomUUID()}`;
const bookingId = `e2e_cx_booking_${randomUUID()}`;
const bookerEmail = `e2e.cancel.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
const bookerPassword = "averylongpassword";

const LISTING_TITLE = "E2E Cancel Yoga Studio";

// ₱1,000 space + ₱50 service fee = ₱1,050 charged — the 07-UI-SPEC worked example, so the rendered
// breakdown is the one the spec was written against.
const SPACE_PRICE_CENTS = 100000;
const SERVICE_FEE_CENTS = 5000;

// STANDARD tier, 10 hours out ⇒ the 24h→6h rung ⇒ 50% of the space price ⇒ ₱500 back, ₱500 retained.
// Chosen deliberately over a 100% rung: a partial refund is the case where a wrong number is possible at
// all, and it is the only case that also proves the service fee was excluded.
const HOURS_TO_START = 10;
const EXPECTED_REFUND_CENTS = 50000;

let bookerState: Awaited<ReturnType<BrowserContext["storageState"]>>;
let bookerId: string;

async function seedHostAndListing(): Promise<void> {
  await sql`
    INSERT INTO "user" (id, name, email, email_verified, first_name, can_host, can_book, created_at, updated_at)
    VALUES (${hostId}, ${"E2E CX Host"}, ${`${hostId}@example.com`}, ${true}, ${"Hana"}, ${true}, ${false}, now(), now())
  `;
  await sql`
    INSERT INTO "host_payout" (user_id, paymongo_account_id, activation_status, payouts_enabled, onboarding_complete, created_at, updated_at)
    VALUES (${hostId}, ${`acct_${randomUUID()}`}, ${"activated"}, ${true}, ${true}, now(), now())
  `;
  // …and an ops-APPROVED host_verification row — deriveBookable's SIXTH term (phase 18,
  // D-224). A host with NO row reads as 'unverified' and cannot sell, so without this the
  // listing seeded below is not bookable and this spec fails on a page that never renders.
  // ⚠ e2e does NOT run in CI (D-24) — only a hand run can catch a miss here.
  await sql`
    INSERT INTO "host_verification" (user_id, status, provider, created_at, updated_at)
    VALUES (${hostId}, ${"approved"}::host_verification_status, ${"manual"}, now(), now())
  `;
  await sql`
    INSERT INTO "listing" (
      id, host_id, title, description, primary_space_type,
      address_line1, city, region, postal_code, country,
      show_exact_address, max_occupancy, unit_count, timezone,
      hourly_rate_cents, day_rate_cents, currency, booking_mode, cancellation_policy,
      status, review_state, published_at, created_at, updated_at
    ) VALUES (
      ${listingId}, ${hostId}, ${LISTING_TITLE},
      ${"A calm mirrored studio with mats and props."}, ${"yoga_studio"}::space_type,
      ${"2 Real Street"}, ${"Makati"}, ${"Metro Manila"}, ${"1210"}, ${"Philippines"},
      ${false}, ${12}, ${1}, ${VENUE_TZ},
      ${SPACE_PRICE_CENTS}, ${300000}, ${"php"}, ${"instant"}::booking_mode, ${"standard"}::cancellation_policy,
      ${"published"}::listing_status, ${"approved"}::listing_review_state, now(), now(), now()
    )
  `;
}

/** A CONFIRMED, paid-looking booking on a refundable rail, HOURS_TO_START hours before its session. */
async function seedConfirmedBooking(): Promise<void> {
  await sql`
    INSERT INTO "booking" (
      id, listing_id, unit, booker_id, starts_at, ends_at, status, booking_mode,
      cancellation_policy, space_price_cents, service_fee_cents, quoted_total_cents,
      currency, payment_id, payment_method, created_at
    ) VALUES (
      ${bookingId}, ${listingId}, ${1}, ${bookerId},
      now() + make_interval(hours => ${HOURS_TO_START}),
      now() + make_interval(hours => ${HOURS_TO_START + 1}),
      ${"confirmed"}::booking_status, ${"instant"}::booking_mode,
      ${"standard"}::cancellation_policy, ${SPACE_PRICE_CENTS}, ${SERVICE_FEE_CENTS},
      ${SPACE_PRICE_CENTS + SERVICE_FEE_CENTS}, ${"php"},
      ${`pay_e2e_${randomUUID()}`}, ${"gcash"}, now()
    )
  `;
}

/** Parse "₱1,050" / "₱1,050.00" into integer centavos, so the assertion is on MONEY, not on a string. */
function parseMoneyToCents(label: string): number {
  const cleaned = label.replace(/[^\d.]/g, "");
  return Math.round(Number(cleaned) * 100);
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  await seedHostAndListing();

  // Sign the booker up through the UI (intent "book" → canBook server-side, D-41) and capture the session.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/signup`);
  await page.getByRole("radio", { name: "Book a space" }).click();
  await page.getByLabel("First name").fill("Cassie");
  await page.getByLabel("Email").fill(bookerEmail);
  await page.getByLabel("Password").fill(bookerPassword);
  await page.getByRole("button", { name: /sign up to book/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 20_000 });
  bookerState = await ctx.storageState();
  await ctx.close();

  const [row] = await sql<{ id: string }[]>`SELECT id FROM "user" WHERE email = ${bookerEmail}`;
  bookerId = row.id;
  await seedConfirmedBooking();
});

test.afterAll(async () => {
  // Bookings FIRST (booker_id is ON DELETE RESTRICT), then the host (cascades the listing), then the booker.
  await sql`DELETE FROM notification WHERE booking_id = ${bookingId}`;
  await sql`DELETE FROM booking WHERE listing_id = ${listingId}`;
  await sql`DELETE FROM "user" WHERE id = ${hostId}`;
  await sql`DELETE FROM "user" WHERE email = ${bookerEmail}`;
  await sql.end();
});

async function loginAsBooker(page: Page): Promise<void> {
  await page.context().addCookies(bookerState.cookies);
}

test.describe("booker cancellation — the previewed refund is the refund given (SC#2)", () => {
  test("bookings list → cancel review → exact itemised refund → confirm → same amount persisted", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await loginAsBooker(page);

    // ── The booking is visible on the booker's own list (MANAGE-01). ───────────────────────────────────
    await page.goto(`${BASE}/bookings`);
    await expect(page.getByText(LISTING_TITLE).first()).toBeVisible();

    // ── The ENTRY POINT (D-104). Below the primary content on the detail page, and a LINK to the review —
    //    never an inline action, so the itemised breakdown is always seen before money moves. ────────────
    await page.goto(`${BASE}/bookings/${bookingId}`);
    const cancelEntry = page.getByRole("link", { name: "Cancel booking" });
    await expect(cancelEntry).toBeVisible();
    await cancelEntry.click();
    await page.waitForURL(new RegExp(`/bookings/${bookingId}/cancel$`), { timeout: 20_000 });

    // ── The SC#2 review screen, reached the way a booker reaches it. ───────────────────────────────────
    await expect(page.getByRole("heading", { name: /cancel this booking\?/i })).toBeVisible();

    // The tier rationale explains WHICH policy and WHY this rung (D-78's "which tier applies and why").
    await expect(page.getByText(/uses the Standard cancellation policy/i)).toBeVisible();
    await expect(page.getByText(/50% of the space price is refunded/i)).toBeVisible();

    // The full six-element itemisation, including the UNCONDITIONAL non-refundable disclosure (C2).
    await expect(page.getByText("You paid", { exact: true })).toBeVisible();
    await expect(page.getByText("Space price", { exact: true })).toBeVisible();
    await expect(page.getByText("Service fee", { exact: true })).toBeVisible();
    await expect(page.getByText("Service fee refund", { exact: true })).toBeVisible();
    await expect(page.getByText(/Service fees aren.t refunded/i)).toBeVisible();
    await expect(page.getByText("Refund to you", { exact: true })).toBeVisible();

    // ── CAPTURE THE PREVIEWED NUMBER off the rendered page. This is the value the whole spec turns on. ─
    const previewedLabel = (
      await page.getByText("Refund to you", { exact: true }).locator("xpath=following-sibling::dd[1]").textContent()
    )?.trim();
    expect(previewedLabel).toBeTruthy();
    const previewedCents = parseMoneyToCents(previewedLabel!);
    expect(previewedCents).toBe(EXPECTED_REFUND_CENTS);

    // The confirm is neutral, and the calmer `Keep booking` sits beside it (07-UI-SPEC § 3).
    await expect(page.getByRole("link", { name: "Keep booking" })).toBeVisible();

    // ── Confirm. ──────────────────────────────────────────────────────────────────────────────────────
    await page.getByRole("button", { name: "Cancel booking" }).click();
    await page.waitForURL(new RegExp(`/bookings/${bookingId}$`), { timeout: 20_000 });

    // ── THE ASSERTION THIS SPEC EXISTS FOR: previewed === persisted, to the centavo. ───────────────────
    await expect
      .poll(
        async () => {
          const [row] = await sql<{ status: string; refund_cents: number | null }[]>`
            SELECT status::text AS status, refund_cents FROM booking WHERE id = ${bookingId}
          `;
          return row ? `${row.status}:${row.refund_cents}` : "missing";
        },
        { timeout: 15_000 },
      )
      .toBe(`cancelled:${previewedCents}`);

    // And the retained half — the D-69 payout basis — is the exact complement, no centavo invented or lost.
    const [row] = await sql<{ refund_cents: number; retained_space_cents: number; space_price_cents: number }[]>`
      SELECT refund_cents, retained_space_cents, space_price_cents FROM booking WHERE id = ${bookingId}
    `;
    expect(row.refund_cents + row.retained_space_cents).toBe(row.space_price_cents);
    // The service fee never came back: at most the space price can, and here exactly half of it did.
    expect(row.refund_cents).toBeLessThan(SPACE_PRICE_CENTS + SERVICE_FEE_CENTS);

    // ── The booker's own surfaces now show the cancellation (MANAGE-01 / D-79). ───────────────────────
    await page.goto(`${BASE}/bookings?tab=past`);
    await expect(page.getByText(/cancelled/i).first()).toBeVisible();
  });

  test("re-opening the review screen for an already-cancelled booking redirects, never re-refunds", async ({
    page,
  }) => {
    // The review route is status-scoped to `confirmed`. A booker who bookmarked the URL, or hit back after
    // confirming, must land somewhere calm — never on a second confirm button over money already returned.
    await loginAsBooker(page);
    await page.goto(`${BASE}/bookings/${bookingId}/cancel`);
    await page.waitForURL(new RegExp(`/bookings/${bookingId}$`), { timeout: 20_000 });
    await expect(page.getByRole("button", { name: "Cancel booking" })).toHaveCount(0);

    // And the ENTRY is gone too (07-12) — a terminal booking offers no route back into the money flow, so
    // there is no second door to the confirm the assertion above just proved is absent.
    await expect(page.getByRole("link", { name: "Cancel booking" })).toHaveCount(0);

    // The detail page now RENDERS the cancellation rather than 404ing it, with the refund as a muted sibling
    // line beneath the badge (D-79) — and phrased "on its way", never "refunded", because the webhook is the
    // single writer of terminal refund state (D-57).
    //
    // ══ THE TWO LEGITIMATE MONEY TRUTHS ON THIS BRANCH — A NAMED DISJUNCTION (19.1-07) ═══════════════
    //
    // WHAT WAS MEASURED, not what was reasoned about — `.planning/phases/19.1-.../evidence/
    // triage-cancel-refund.txt`. This assertion used to demand the in-transit sentence UNCONDITIONALLY,
    // and it failed with `Locator: getByText(/refund on its way/i) → element(s) not found`. The product
    // was right and this spec was incomplete: `gate-e2e` has no PayMongo credential and STRUCTURALLY
    // CANNOT HAVE ONE (`.github/workflows/ci.yml` is invariant-forbidden from carrying any `secrets.`
    // reference), so the cancel action's refund POST raises, an operator alert is written, and
    // `src/app/(app)/bookings/[id]/page.tsx:1168-1176` renders `ManualReturnNotice` INSTEAD. That fork's
    // own comment states why the in-transit sentence is withheld rather than merely absent: "the two
    // sentences are mutually exclusive money claims about the same figure, and the in-transit one is the
    // false half whenever the dispatch did not happen." The manual-return branch is therefore the
    // CORRECT render in CI, and this spec now asserts both truths instead of one of them.
    //
    // ⚠ D-01 — THIS TEST IS NEVER ELIGIBLE FOR THE KNOWN-FAILURES ALLOWLIST, IN ANY FUTURE ROUND. It
    // sits on the refund path, and D-01 names it as the specific test whose quarantine was rejected: a
    // green badge sitting on top of an unverified refund behaviour is the exact failure mode that
    // decision exists to prevent. Repair it or leave it red. Never annotate it, never skip it, never
    // record its path in an allowlist.
    //
    // ⚠ AND THIS IS A STRONGER ASSERTION THAN THE ONE IT REPLACES, WHICH IS THE ONLY THING THAT MAKES A
    // DISJUNCTION A REPAIR RATHER THAN A WEAKENING. It does not ask whether one of two strings is
    // somewhere on the page — that would pass on a page rendering the wrong sentence for its state. It
    // IDENTIFIES which branch rendered and then asserts the consequence that branch owes. For the
    // manual-return branch the consequence is the audit row the render is DERIVED from
    // (`refundNeedsManualReturn`, zero new columns, D-80): a notice on screen with no operator record
    // behind it would be a silent money failure, and it is red here.
    const manualReturnSentence = page.getByText(/coming back to you/i);
    const inTransitSentence = page.getByText(/refund on its way/i);

    // ══ THE BRANCH IS SELECTED BY A POLL, NOT BY TWO POINT-IN-TIME READS (19.1-REVIEW.md WR-01/WR-02)
    //
    // A NON-THROWING MEASUREMENT, DELIBERATELY, AND THAT PART WAS ALWAYS RIGHT. A visibility assertion
    // cannot select a branch — it can only end the test — and selecting the branch is the whole point
    // of the repair 19.1-07 made. `count()` resolves to a number for both an absent and a present
    // locator, so the fork below is decided by a measurement rather than by a caught exception.
    //
    // ⚠ WHAT WAS WRONG WITH DOING IT IN TWO BARE `await …count()` READS, AND BOTH HALVES ARE MEASURED
    // (`evidence/guards-review-wr01-02-03-05-{pre,post}-fix.txt` § WR-01/WR-02):
    //
    //   • WR-02 — `locator.count()` HAS NO AUTO-WAIT AND NO RETRY, unlike the `expect(...).toBeVisible()`
    //     it replaced, which polled. Nothing above settles this page either: `waitForURL` resolves on
    //     navigation COMMIT, and the two `toHaveCount(0)` assertions at :251-255 are satisfied
    //     IMMEDIATELY by a still-streaming pending shell — a locator that has not rendered yet also has
    //     count 0. Both counts therefore read zero on a slow render and the `else` arm below threw
    //     *"the booker was told nothing about their money"*: a timing flake wearing the costume of a
    //     money defect, on the one file D-01 forbids quarantining, whose message sends the next reader
    //     into `bookings/[id]/page.tsx` and `manual-return-notice.tsx` after a bug that is not there.
    //     REPRODUCED by delaying the cancelled render 6s behind its own `loading.tsx` boundary: the
    //     two bare reads failed by name, this poll passes, and NOTHING WAS SCOPED OR RELAXED to get
    //     there — the genuinely-absent case below still goes red, which is the whole test of a fix
    //     like this one (plan 13 flagged exactly the opposite move on `confirmation-decay`: scoping a
    //     locator to restore green deleted the only instrument that had named a real bug).
    //
    //   • WR-01 — the fork's own prose states the property twice ("mutually exclusive and jointly
    //     exhaustive for refund_cents > 0") and the two bare reads enforced only the second half. The
    //     `else` arm catches "neither"; NOTHING caught "both". A page rendering both told the booker
    //     two contradictory things about the same money — *"a refund is on its way"* AND *"a person
    //     will return this by hand"* — and the old `if (manualReturnCount > 0)` took branch 1 and
    //     PASSED, because the audit row branch 1 demands was present. REPRODUCED by splitting the
    //     product's ternary into two independent renders: green before, red here.
    //
    // The poll subsumes both. `both` and `neither` are values it can never match, so a page in either
    // state fails by name after waiting — and a page that is merely SLOW is waited for instead of
    // being reported as a money failure. Read the received value first: it names the state that lost.
    const MONEY_SENTENCE_TIMEOUT_MS = 15_000;
    let branch = "neither";
    await expect
      .poll(
        async () => {
          const manual = await manualReturnSentence.count();
          const inTransit = await inTransitSentence.count();
          branch =
            manual > 0 && inTransit > 0
              ? `both (${manual} manual-return, ${inTransit} in-transit)`
              : manual > 0
                ? "manual-return"
                : inTransit > 0
                  ? "in-transit"
                  : "neither";
          return branch;
        },
        {
          timeout: MONEY_SENTENCE_TIMEOUT_MS,
          message:
            `EXACTLY ONE money sentence must render on a cancelled booking with a positive refund, and ` +
            `after ${MONEY_SENTENCE_TIMEOUT_MS}ms none did — read the received value above before anything ` +
            `else, because the three ways to fail here mean three different things. The two sentences are:\n` +
            `  • the IN-TRANSIT sentence, /refund on its way/i — composed at ` +
            `src/app/(app)/bookings/[id]/page.tsx:1095-1100 and rendered by the second arm of the fork ` +
            `at :1173-1177, when the refund dispatch was accepted;\n` +
            `  • the MANUAL-RETURN notice, /coming back to you/i — ` +
            `src/components/booking/manual-return-notice.tsx:111, rendered by the first arm of that same ` +
            `fork when refundNeedsManualReturn(bk.id) is true.\n` +
            `RECEIVED "neither": the cancelled branch never rendered its money statement at all — the ` +
            `booker was told nothing about their money. This is now a WAITED result, not a snapshot, so ` +
            `it is no longer a slow render; investigate which branch the dispatch took and why the ` +
            `statement is missing.\n` +
            `RECEIVED "both (…)": WORSE, and it is the failure the fork's own comment calls a "false ` +
            `half". The booker is being told two contradictory things about the same figure — money is ` +
            `on its way AND a person will hand it back — and the in-transit sentence is the false one ` +
            `whenever the dispatch did not happen. The fork at :1173-1177 is a ternary precisely so this ` +
            `cannot happen; something has split it. Repair the PRODUCT, never this assertion.\n` +
            `THE CORRECT RESPONSE IS NEVER: widening this regex, scoping either locator to make the red ` +
            `go away, raising this timeout past a real render, or allowlisting this test (D-01 — ` +
            `permanently ineligible, it sits on the refund path).`,
        },
      )
      .toMatch(/^(manual-return|in-transit)$/);

    if (branch === "manual-return") {
      // BRANCH 1 — the dispatch did not happen. This is the branch CI is always in.
      await expect(manualReturnSentence.first()).toBeVisible();

      // …and the record that branch owes. `refundNeedsManualReturn` reads exactly this shape
      // (`src/lib/booking/refund-dispatch.ts:103-116`) and requires BOTH halves — the action on the
      // imported list AND `outcome = 'needs_attention'` — so an action recorded as `ok` would never
      // match. The query below conjoins them for the same reason.
      const [alert] = await sql<{ n: number }[]>`
        SELECT count(*)::int AS n FROM audit
        WHERE outcome = ${"needs_attention"}
          AND action = ANY(${[...REFUND_NOT_DISPATCHED_ACTIONS]}::text[])
          AND meta->>'bookingId' = ${bookingId}
      `;
      expect(
        alert.n,
        `The manual-return notice is on screen but NO audit row backs it. That is a silent money ` +
          `failure, not a test problem: the booker has been told a person will return their money by ` +
          `hand, and there is no record telling any person to do it. The notice is rendered from ` +
          `refundNeedsManualReturn (src/lib/booking/refund-dispatch.ts:103-116), which matches on ` +
          `outcome='needs_attention' AND action IN [${REFUND_NOT_DISPATCHED_ACTIONS.join(", ")}] AND ` +
          `meta->>'bookingId'=${bookingId} — so a visible notice with zero matching rows means the two ` +
          `have come apart. Find out which write was lost. Never relax this to a row-optional check.`,
      ).toBeGreaterThan(0);
    } else if (branch === "in-transit") {
      // BRANCH 2 — the dispatch was accepted, so the in-transit sentence is the true one. Today's
      // behaviour, unchanged, and the branch a machine holding a working payments credential takes.
      await expect(inTransitSentence.first()).toBeVisible();
    } else {
      // UNREACHABLE BY CONSTRUCTION, AND KEPT ANYWAY — a guard on the guard. The poll above only
      // returns for "manual-return" or "in-transit", so arriving here means the poll's vocabulary and
      // this fork have come apart: a value was added to one and not the other, and the test would
      // otherwise assert NOTHING while reporting green. That is the exact defect shape this phase
      // exists to remove, so it is a hard failure rather than a silent fall-through.
      throw new Error(
        `The money-sentence poll passed with branch="${branch}", which this fork does not handle. ` +
          `The poll's accepted set (/^(manual-return|in-transit)$/) and the branches below it are two ` +
          `records of one decision and they have DRIFTED — nothing in this test asserted anything ` +
          `about the booker's money on this run. Move them together, in the same commit.`,
      );
    }

    // The refund column is still the single value written by the one successful cancel.
    const [row] = await sql<{ refund_cents: number }[]>`
      SELECT refund_cents FROM booking WHERE id = ${bookingId}
    `;
    expect(row.refund_cents).toBe(EXPECTED_REFUND_CENTS);
  });
});
