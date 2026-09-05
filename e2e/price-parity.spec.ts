// GATE-05 · D-35 — THE DB-vs-DOM PRICE PARITY SPEC. The number the booker sees IS the number the
// database froze, asserted as integer centavos on every push.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS ONE SPEC RUNS IN CI WHEN THE OTHER TWELVE DO NOT (D-35 against D-24)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-24 keeps `e2e/**` out of CI on purpose, and the reason is written into `.github/workflows/ci.yml`:
// each spec boots a dev server and seeds real data, which is the largest flake surface and the largest
// secret surface this repository has, and a flaky gate is not a gate — it gets retried until green.
//
// D-35 re-opens EXACTLY ONE slice of that surface, because GATE-05's other half cannot cover this one.
// Plan 11-01's AST/`server-only` build check proves no money COMPUTATION crosses the client boundary;
// it is completely silent on whether the figure that reaches the DOM is the figure that was frozen. A
// restyle that moved, reformatted or re-derived the total would pass every gate in the tree and charge
// a real card a number the booker never agreed to. This spec is the single assertion standing in that
// gap, so it is worth one job.
//
// THE PROPERTY THAT KEEPS IT CHEAP, AND WHICH ANY FUTURE EDIT MUST PRESERVE: the flow STOPS at the
// reserve page, where the breakdown renders. It never reaches `Confirm & pay`, so it needs no PayMongo
// key, no Resend key, no Cloudinary key and no OAuth credential — its ONLY environment input is
// `DATABASE_URL`. (`e2e/search-and-book.spec.ts`'s header documents the tail past the reserve page as
// un-automatable from Playwright anyway: `Confirm & pay` opens a PayMongo HOSTED CHECKOUT.) If this
// spec ever grows to need a second secret, it has left D-35's boundary and must be SPLIT — the CI job
// must not be granted the secret. That contract is restated as a comment in the workflow.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// SHAPE — copied from `e2e/search-and-book.spec.ts`, narrowed to one assertion
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// Seed a payouts-enabled host + an `instant`, published listing with hours on all 7 days, three photos
// and one activity tag, all under `randomUUID` ids. Sign a booker up through the UI with intent "book"
// (D-41 → `canBook`, and Book is gated on it). Search → listing → pick a venue-tz window → `Book this
// space` → the reserve page. Then read the rendered total and the persisted one and compare integers.
//
// The listing is a `martial_arts_boxing` gym — a space type NO other e2e seed and no dev seed uses — so
// the category filter narrows to exactly this listing whatever else is in the dev database.
//
// The hourly rate is deliberately NOT a round number. 5% of a 2-hour run at ₱473.33/hr is 4733.3
// centavos, so the frozen fee is a ROUNDED figure (`computeServiceFee` rounds once, over the whole
// space price). A client that re-derived the total by multiplying or by summing per-line rounded parts
// would drift from the frozen quote by a centavo or two — which is exactly the failure this asserts
// against, and a round rate would hide it.
//
// ⚠️ `pickWindow` / `selectTargetDay` and the venue-local target-day math below are a DELIBERATE
// VERBATIM COPY of `e2e/search-and-book.spec.ts:73-88,209-232`, not a re-derivation. Timezone/DST math
// re-derived per spec is the top booking-app failure mode (CLAUDE.md), so the rule is "same math or
// none". They are copied rather than hoisted into `e2e/helpers/` because that would edit a shipped,
// UAT-relevant money spec from a plan whose declared surface is one new file; the hoist is a clean
// follow-up, and the SUMMARY records it as one.

import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { format } from "date-fns";
import { tz } from "@date-fns/tz";

const BASE = "http://localhost:3000";
const VENUE_TZ = "Asia/Manila";

// The Playwright process doesn't load .env; fall back to the deterministic dev URL (as tests/helpers/db.ts).
// In CI job 3 this variable IS set — and, because that job runs INSIDE the Playwright container, its host
// is the service LABEL `postgres`, never `localhost`. See the workflow comment.
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });

// ---- Unique ids per run — never fixed, so two runs (or a CI retry in a fresh worker) never collide ----
const hostId = `e2e_pp_host_${randomUUID()}`;
const listingId = `e2e_pp_listing_${randomUUID()}`;
const bookerEmail = `e2e.priceparity.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
const bookerPassword = "averylongpassword";

const LISTING_TITLE = "E2E PriceParity Boxing Gym";
const LISTING_CITY = "Makati";
/** No other e2e seed and no dev seed uses this type, so the category filter isolates this listing. */
const SPACE_TYPE = "martial_arts_boxing";
const SPACE_TYPE_LABEL = "Martial arts / boxing gym";
const ACTIVITY_TAG = "boxing_mma";
/** Deliberately not round — see the header: it forces a rounded service fee. */
const HOURLY_RATE_CENTS = 47333;
const DAY_RATE_CENTS = 288888;

const LISTING_LAT = 14.5547;
const LISTING_LNG = 121.0244;

// ---- Target day: +3 days out (future, within the 90-day horizon), venue-local ----------------
// VERBATIM from search-and-book.spec.ts:73-88 — see the header's copy note.
const inTz = tz(VENUE_TZ);
const now = new Date();
const initMonth = Number(format(now, "M", { in: inTz }));
const initYear = Number(format(now, "yyyy", { in: inTz }));
const base = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
const targetYear = Number(format(base, "yyyy", { in: inTz }));
const targetMonth = Number(format(base, "M", { in: inTz })); // 1-based
const targetDay = Number(format(base, "d", { in: inTz }));
const targetMonthName = format(base, "MMMM", { in: inTz });
const crossesMonth = targetMonth !== initMonth || targetYear !== initYear;

/** react-day-picker default day-button aria-label is "EEEE, MMMM do, yyyy" — match by month/day/year. */
const targetDayLabel = new RegExp(
  `${targetMonthName}\\s+${targetDay}(st|nd|rd|th)?,?\\s+${targetYear}`,
);

async function seedHost(): Promise<void> {
  await sql`
    INSERT INTO "user" (id, name, email, email_verified, first_name, can_host, can_book, created_at, updated_at)
    VALUES (
      ${hostId}, ${"E2E PP Host"}, ${`${hostId}@example.com`}, ${true},
      ${"Ezra"}, ${true}, ${false}, now(), now()
    )
  `;
  // An ACTIVATED payout wallet is what makes the listing bookable (deriveBookable / the `payouts_enabled`
  // gate). Seeded directly, as availability.spec.ts does — the merchant.activated webhook is Phase 2.
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
}

async function seedListing(): Promise<void> {
  await sql`
    INSERT INTO "listing" (
      id, host_id, title, description, primary_space_type,
      address_line1, city, region, postal_code, country, neighborhood,
      location, show_exact_address, max_occupancy, unit_count, timezone,
      hourly_rate_cents, day_rate_cents, currency, booking_mode, status, review_state, published_at, created_at, updated_at
    ) VALUES (
      ${listingId}, ${hostId}, ${LISTING_TITLE},
      ${"A matted boxing gym with heavy bags, a ring and wraps."}, ${SPACE_TYPE}::space_type,
      ${"2 Real Street"}, ${LISTING_CITY}, ${"Metro Manila"}, ${"1210"}, ${"Philippines"}, ${"Poblacion"},
      ST_SetSRID(ST_MakePoint(${LISTING_LNG}, ${LISTING_LAT}), 4326), ${false}, ${8}, ${1}, ${VENUE_TZ},
      ${HOURLY_RATE_CENTS}, ${DAY_RATE_CENTS}, ${"php"}, ${"instant"}::booking_mode, ${"published"}::listing_status, ${"approved"}::listing_review_state,
      now(), now(), now()
    )
  `;
  // Three cover-first photos so the search + listing cards render (broken src is fine — the <img> exists).
  await sql`
    INSERT INTO "listing_photo" (id, listing_id, public_id, url, position) VALUES
      (${randomUUID()}, ${listingId}, ${"fitout/e2e-pp/0"}, ${"https://example.com/e2e-pp-0.jpg"}, ${0}),
      (${randomUUID()}, ${listingId}, ${"fitout/e2e-pp/1"}, ${"https://example.com/e2e-pp-1.jpg"}, ${1}),
      (${randomUUID()}, ${listingId}, ${"fitout/e2e-pp/2"}, ${"https://example.com/e2e-pp-2.jpg"}, ${2})
  `;
  // Weekly hours 06:00–21:00 every day so the target day is bookable whatever weekday it lands on.
  for (let dow = 0; dow < 7; dow++) {
    await sql`
      INSERT INTO "operating_hours" (id, listing_id, day_of_week, open_time, close_time, created_at)
      VALUES (${randomUUID()}, ${listingId}, ${dow}, ${"06:00"}, ${"21:00"}, now())
    `;
  }
  await sql`INSERT INTO "listing_activity_tag" (listing_id, tag) VALUES (${listingId}, ${ACTIVITY_TAG})`;
}

test.beforeAll(async () => {
  await seedHost();
  await seedListing();
});

test.afterAll(async () => {
  // Order is LOAD-BEARING (mirrors search-and-book.spec.ts:198-207): booking rows first, because
  // booking.booker_id is ON DELETE RESTRICT and would refuse the booker's deletion; then the host,
  // which cascades listing → photos → hours → tags; then the signed-up booker.
  await sql`DELETE FROM notification WHERE booking_id IN (SELECT id FROM booking WHERE listing_id = ${listingId})`;
  await sql`DELETE FROM booking WHERE listing_id = ${listingId}`;
  await sql`DELETE FROM "user" WHERE id = ${hostId}`;
  await sql`DELETE FROM "user" WHERE email = ${bookerEmail}`;
  await sql.end();
});

/** Navigate the venue-tz calendar to the seeded target day (advancing one month if it's next month). */
// VERBATIM from search-and-book.spec.ts:214-225 — see the header's copy note.
async function selectTargetDay(page: Page): Promise<void> {
  if (crossesMonth) {
    await page.getByRole("button", { name: /next month/i }).click();
  }
  // Scope to the enabled, in-month occurrence so the click never lands on a showOutsideDays duplicate.
  const day = page
    .getByRole("button", { name: targetDayLabel })
    .and(page.locator("td:not([data-outside='true']) button"))
    .and(page.locator("button:not([disabled])"));
  await day.first().click();
}

/** Open the listing, navigate to the target day, and pick the [startLabel, endLabel] hourly run. */
// VERBATIM from search-and-book.spec.ts:227-233 — see the header's copy note.
async function pickWindow(page: Page, startLabel: string, endLabel: string): Promise<void> {
  await expect(page.getByText(/Times shown in .*Makati.*\(GMT\+8\)/i)).toBeVisible();
  await selectTargetDay(page);
  await page.getByRole("button", { name: startLabel, exact: true }).click(); // start anchor
  await page.getByRole("button", { name: endLabel, exact: true }).click(); // end → fills the run
}

/**
 * TRAP 1 — assert the page rendered the thing under test BEFORE asserting anything about it
 * (`e2e/scroll-area-overflow.spec.ts:215-223`).
 *
 * Without this, a restyle that renames or moves the hook makes `getByTestId(...).textContent()` throw
 * on a timeout that reads like a slow page — or, worse, a future refactor that guards the read makes
 * the equality assertion silently unreachable. Both are the GATE-04 regression arriving from the other
 * side: the gate goes green because nothing was measured.
 *
 * Exactly ONE, not "at least one": two matching elements would make "the rendered total" ambiguous, and
 * `textContent()` would fail Playwright's strict mode with an error about selectors rather than about
 * money. `ReserveView` renders the breakdown once, so anything else is a real structural change.
 */
async function countHook(page: Page): Promise<number> {
  // A BOUNDED poll rather than a locator auto-wait, so the two failure modes stay distinguishable: a
  // slow render is waited out, and a hook that is genuinely absent returns 0 and lands on the guard's
  // own message instead of on a generic "locator resolved to 0 elements" timeout that says nothing
  // about which invariant broke. Measured: on a warm dev server the first poll already returns 1.
  const hook = page.getByTestId("price-total");
  const deadline = Date.now() + 10_000;
  let count = await hook.count();
  while (count === 0 && Date.now() < deadline) {
    await page.waitForTimeout(250);
    count = await hook.count();
  }
  return count;
}

function expectReachable(count: number): void {
  expect(
    count,
    `the reserve page rendered ${count} elements carrying the price-total hook; expected exactly 1. ` +
      `0 means the hook was renamed or moved off the total (the GATE-05 regression this spec exists ` +
      `for — the equality below would then never run, and this gate would be green for no reason). ` +
      `More than 1 means the breakdown is rendered twice and "the rendered total" is ambiguous. ` +
      `The hook is declared in src/lib/design/selector-contract.ts and lives in ` +
      `src/components/booking/price-breakdown.tsx.`,
  ).toBe(1);
}

/**
 * Invert `formatMoney` back to INTEGER CENTAVOS.
 *
 * The comparison is integer-to-integer on purpose. Formatting the DB value and string-comparing would
 * turn a currency-symbol, locale or separator change into a RED on a money gate — a false alarm on the
 * one gate that must never be ignored. `formatMoney` pins min/max fraction digits to 2, so every digit
 * in the rendered string is a digit of the centavo amount and stripping non-digits is exact, whatever
 * the runner's ICU chooses for the symbol (`₱` vs `PHP`), the group separator or the space between them
 * (Intl often emits U+00A0).
 *
 * The 2-decimal shape is asserted FIRST, so a formatter that ever dropped its fraction digits fails
 * here, naming the cause, instead of silently producing a number 100× too small at the equality.
 */
function toCentavos(rendered: string): number {
  const text = rendered.trim();
  expect(
    text,
    `the rendered total "${text}" does not end in a 2-digit fraction. formatMoney pins ` +
      `minimum/maximumFractionDigits to 2, so this means the money formatter changed shape — fix that ` +
      `or fix this inverse, but do NOT relax it: without the 2 decimals, stripping non-digits yields a ` +
      `number 100x too small and the equality below would be comparing pesos to centavos.`,
  ).toMatch(/\d[.,]\d{2}$/);

  const digits = text.replace(/\D/g, "");
  expect(digits, `the rendered total "${text}" contains no digits`).not.toBe("");
  return Number(digits);
}

test("the total rendered on the reserve page IS the total the database froze (GATE-05 · D-35)", async ({
  page,
}) => {
  test.setTimeout(120_000);

  // ── Sign the booker up through the UI. Intent "book" maps to canBook=true server-side (D-41), which
  //    is what `Book this space` is gated on. No env var, no seeded session, no auth secret.
  await page.goto(`${BASE}/signup`);
  await page.getByRole("radio", { name: "Book a space" }).click();
  await page.getByLabel("First name").fill("Parity");
  await page.getByLabel("Email").fill(bookerEmail);
  await page.getByLabel("Password").fill(bookerPassword);
  await page.getByRole("button", { name: /sign up to book/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 30_000 });

  // ── Search → the seeded listing. The category is this listing's alone, so the filter is deterministic.
  await page.goto(`${BASE}/`);

  // ⚠ THE COUNT SETTLE IS `openSeededListing`'s IDIOM (`e2e/helpers/booker-seed.ts:481-495`), AND THIS
  // FILE IS THE ONE ITS NOTE WAS ABOUT. `/` streams, and its own `loading.tsx` renders a SECOND
  // `SearchBar`: measured 2026-08-18, the served document holds `id="search-category"` at byte 11,713
  // (the pending fallback) and again at 84,158 (the resolved page). While the boundary is resolving
  // BOTH are in the DOM and a bare `.click()` fails strict mode with "resolved to 2 elements" — an
  // error that reads like a duplicate id and is a race. That note's own words are "the shipped specs
  // get away with it only because they happen to arrive late", and `zero-result-relax.spec.ts:27`
  // names THIS file as the analog whose idiom it copied — while this file never took the settle.
  //
  // It stopped arriving late on 2026-09-05. Run 33972688199, `gate-e2e`, one worker, full-suite load:
  //     locator.click: Error: strict mode violation: locator('#search-category') resolved to 2 elements
  //       1) aria-controls="radix-_r_7_"          aka getByRole('combobox', { name: 'Activity or type Activity or' })
  //       2) aria-controls="radix-_R_haatqitulb_" aka locator('#search-category').nth(1)
  // Element 1's accessible name is DOUBLED, which is what two `<label for="search-category">` produce
  // — the two SearchBars, not a duplicated control inside one.
  //
  // THIS IS A WAIT, NOT A WIDENED TIMEOUT AND NOT A WEAKENED LOCATOR: `toHaveCount(1)` retries until
  // the fallback is gone, asserts the observable state the click depends on, and a PERSISTENT 2 still
  // fails — by name, at this line, instead of as a strict-mode error 60 lines downstream. Nothing
  // about the money assertion this spec exists for is touched.
  const category = page.locator("#search-category");
  await expect(
    category,
    "`/` still holds two #search-category controls — the pending shell's SearchBar and the resolved " +
      "page's. This waits for the streamed boundary to resolve; a persistent 2 means the fallback " +
      "stopped being replaced.",
  ).toHaveCount(1);
  await category.click();
  await page.getByRole("option", { name: SPACE_TYPE_LABEL }).click();
  await page.locator("#search-submit").click();
  await page.waitForURL(new RegExp(`category=${SPACE_TYPE}`));

  await page.getByRole("link", { name: new RegExp(LISTING_TITLE) }).click();
  await page.waitForURL(new RegExp(`/listings/${listingId}`));

  // ── Pick a venue-tz window (5–7 PM: the 6 PM slot's END closes the run) and place the instant hold.
  await pickWindow(page, "5:00 PM", "6:00 PM");
  const bookBtn = page.getByRole("button", { name: "Book this space" });
  await expect(bookBtn).toBeEnabled();
  await bookBtn.click();

  // ── The reserve page. This is where the flow STOPS — see the header: the tail is a hosted checkout.
  await page.waitForURL(/\/book\?hold=/);
  // ⚠ THE HEADING MOVED IN PLAN 12-11 (BFLOW-07): `Review and book` -> `Confirm and pay`, in the same
  // commit as the page and `book/loading.tsx`. This line is the ONLY byte of this file that plan
  // touched; its env surface is still `DATABASE_URL` alone. Note what this assertion cannot do —
  // `book/loading.tsx` renders the SAME heading, so it is satisfied by the skeleton; the reachability
  // guard that is not is the `price-total` read below, which exists only in the resolved body.
  await expect(page.getByRole("heading", { name: /confirm and pay/i })).toBeVisible();

  const holdId = new URL(page.url()).searchParams.get("hold");
  expect(holdId, "placeHold redirected without a ?hold= id").toBeTruthy();

  // ── THE ASSERTION ────────────────────────────────────────────────────────────────────────────────
  // The guard runs BEFORE any assertion about the element, and before the visibility check, so a
  // renamed or moved hook fails HERE — naming the invariant — rather than on a locator timeout.
  expectReachable(await countHook(page));

  const totalHook = page.getByTestId("price-total");
  // Present is not the same as shown: a hook on a display:none node would still yield textContent, and
  // a total the booker cannot see is not a total the booker agreed to.
  await expect(totalHook).toBeVisible();

  const renderedCentavos = toCentavos((await totalHook.textContent()) ?? "");

  const [row] = await sql<{ quoted_total_cents: number | null }[]>`
    SELECT quoted_total_cents FROM booking WHERE id = ${holdId!} AND listing_id = ${listingId}
  `;
  expect(
    row,
    `no booking row for hold ${holdId} on listing ${listingId} — the hold the UI just placed is not ` +
      `in the database, so there is no frozen figure to compare against.`,
  ).toBeTruthy();

  expect(
    renderedCentavos,
    `PRICE PARITY BROKEN. The reserve page rendered ${renderedCentavos} centavos; ` +
      `booking.quoted_total_cents for hold ${holdId} is ${row.quoted_total_cents}. The rendered total ` +
      `is what the booker consents to and the frozen column is what PayMongo charges — a difference ` +
      `here is a wrong number on a real card, not a display bug. Do NOT "fix" this by re-deriving the ` +
      `total in the browser (src/components/booking/price-breakdown.tsx does zero arithmetic by ` +
      `contract, D-49/D-74): find which of the two moved.`,
  ).toBe(row.quoted_total_cents);
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this spec
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • ONE listing, ONE window, ONE mode. An `instant`, EXCLUSIVE, hourly booking at a flat rate. It says
//     nothing about the full-day line, and nothing about a listing with an extra-guest surcharge.
//   • OPEN-CAPACITY (drop-in) per-head totals are NOT covered. That run line has its own grammar
//     (`{rate}/person × N passes`, OC-08) and its own pricing function (`quoteOpenCapacity`), and a
//     parity break there would be invisible here.
//   • REQUEST-TO-BOOK is NOT covered. Its quote is frozen at request time and re-read on approval —
//     one more place the two figures can drift, exercised only by the vitest suite.
//   • NOTHING PAST THE RESERVE PAGE. No charge, no confirmation, no refund, no partially-granted or
//     cancelled figure. That is D-35's boundary, not an oversight: the tail needs a hosted checkout and
//     therefore a production secret, and this job is allowed neither.
//   • This proves the DISPLAYED total equals the PERSISTED total. It does not prove either is the
//     CORRECT total — `computeServiceFee` / `quoteWindow` own that, under the vitest suite in job 2.
