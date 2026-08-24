import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

// AC#35 / 14-UI-SPEC § Typography rules 1 and 4 — EXACTLY ONE FIRST-LEVEL HEADING PER DOCUMENT ON ALL
// FIVE PHASE-14 SURFACES, IN EVERY STATE AND BOTH OCCUPANCY MODES, AND ALL OF THEM THE SAME SIZE.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE TWO SILENT FAILURES THIS FILE CATCHES, AND WHY NO SINGLE-SURFACE TEST CAN SEE EITHER
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   (1) TWO FIRST-LEVEL HEADINGS ON ONE DOCUMENT GIVE A SCREEN-READER USER TWO ANSWERS TO "WHAT PAGE
//       IS THIS". The heading outline is the only structural answer to that question, and a document
//       with two roots has no answer at all — it has a disagreement. Nothing about the page LOOKS
//       wrong when this happens: a second level-one heading in a panel renders at whatever size its
//       class says, and a sighted reviewer sees a title and a subtitle.
//
//   (2) TWO DIFFERENT FIRST-LEVEL SIZES ACROSS ONE PRODUCT IS DRIFT NO SINGLE-SURFACE TEST CAN SEE.
//       This is not hypothetical here — it is the defect 14-UI-SPEC § Typography rule 1 was written
//       about. The wizard shipped its step question at the next ladder step up while every other host
//       page's title sat one step below it, and every surface was individually correct: each one
//       rendered the size its own file asked for. The disagreement only exists BETWEEN files, so the
//       only instrument that can see it is one that measures all five and compares.
//
// So the size is not asserted against a literal. Every heading's computed size is RECORDED, and the
// final case asserts the whole recorded set collapses to one value — printing the full set on failure,
// so a red names the outlier instead of reporting that a number moved.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// A ROUTE TABLE, NOT A COPY OF ITSELF — the shape `e2e/overflow-320.spec.ts` uses
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// Each state below is a ROW: a name, the path, the DB state it needs, and a `tell` that proves the
// route rendered ITS OWN surface. A sixth Phase-N surface is a row here, never a second file. The two
// wizard walks are the one exception to "a row is a navigation", and they are exceptions because a
// wizard step is not a URL: the component holds its position in React state and the only way to the
// next question is to press the button a host presses. Those two cases walk, and record one heading
// per step.
//
// ⚠ EVERY ASSERTION IN THIS FILE IS TRUE OF A BLANK PAGE. "Exactly one level-one heading" is satisfied
// by a redirect to `/login` (which renders one), by a 404 (which renders one) and by the route's own
// `loading.tsx` plate (which renders one, deliberately, because the plate composes the same
// `PageHeader`). Every row therefore names a `tell` only its own resolved surface produces, and the
// tell is asserted BEFORE the heading is measured.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THREE WIDTHS PER STATE, AND THE RESIZE IS NOT A SECOND NAVIGATION
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// 14-UI-SPEC rule 1's falsifiable is stated at 320 / 768 / 1280, because a type role with a responsive
// variant on ONE surface is exactly the shape that agrees at the width somebody checked and disagrees
// at the other two. The heading is server-rendered and its text does not depend on the viewport, so
// each state is loaded once and measured three times with only the viewport moving between reads. That
// is what makes 28 states cost 28 navigations rather than 84.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE WIZARD ALREADY HAS AN INDEPENDENT SECOND READING, AND IT IS NOT THIS FILE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `tests/listing/wizard-occupancy.test.tsx`'s `heading()` helper is `getByRole("heading", { level: 1 })`
// — which THROWS on more than one match — and all ten of its cases route every assertion through it.
// So the wizard's one-heading claim is already proved in the rendered tree, in both occupancy modes,
// without a browser. That file is deliberately NOT edited by this plan: two independent readings of one
// rule are worth more than one reading asserted twice, and an edit to it would collapse them into one.
// What it cannot do is compare the wizard's size against the other four surfaces, which is (2) above.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// VERIFICATION DISCIPLINE (14-RESEARCH § The DB-contention flake pattern)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// THIS FILE SEEDS A DATABASE. Run it ALONE:
//
//     npx playwright test e2e/host-headings.spec.ts --project=chromium
//
// Never bare `npx playwright test`, and never more than three DB-seeding spec files in one invocation.
// Five e2e specs already seed into one Postgres with a `postgres({ max: 1 })` client apiece under
// `fullyParallel: true`, and the `sorry, too many clients already` ceiling has been hit twice. A
// failure in a spec this plan did not touch is a flake until it fails ALONE.
//
// ⚠ `e2e/availability.spec.ts:261` is a PRE-EXISTING STANDING RED — `[12-06]` measured it failing on
// three consecutive ISOLATED invocations and `[12-08]` concluded it is a dev-mode artefact the
// production build does not have. It is not this phase's and must never be reported as one.
//
// ⚠ `--project=visual` DOES NOT EXIST ON THIS PLATFORM (`playwright.config.ts:39` constructs it only
// on Linux). Nothing in this file is a screenshot and nothing here may claim to have run there.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//   • IT MEASURES `font-size` AND NOTHING ELSE. Two headings at 20px in different weights, colours,
//     families or letter-spacings satisfy every assertion here. `tests/design/type-scale.test.ts` is
//     what pins the roles themselves; this proves the five surfaces all reach for the same one.
//   • IT SAYS NOTHING ABOUT `<h2>` AND BELOW. A surface whose sections skip from level one to level
//     three has a broken outline and passes this file completely.
//   • THE TWO PAYOUT ROUTES AND `/host/listings` ARE NOT PHASE-14 SURFACES and are not measured. Two
//     of them render a first-level heading one ladder step ABOVE the five below; that is a real
//     product-wide inconsistency, it is outside this phase's five surfaces, and it is recorded in
//     `deferred-items.md` rather than smuggled into this file's set.
//   • IT RUNS AGAINST `npm run dev`, not a production build, and it is not in CI (D-24).

const BASE = "http://localhost:3000";

// The Playwright process doesn't load .env; fall back to the deterministic dev URL (as booker-seed.ts).
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

/** The seeded listing's venue timezone. "Today" is resolved in THIS zone, never in the runner's (D-141). */
const VENUE_TZ = "Asia/Manila";

/**
 * The venue city — stored on the listing, and NOT rendered in this fixture's window labels.
 *
 * `composeWhenLabelShort` renders a ` ({City} time)` suffix from it, but since the PM's ruling on UAT
 * finding F-2 (2026-08-24) the host LIST surfaces only pass the city through when the rendered rows
 * span more than one venue clock — see `src/lib/booking/venue-clock-scope.ts`. This fixture's host
 * owns one listing, so the suffix is correctly absent everywhere in this file. Nothing here asserts
 * on it either way; the note is here so the next reader does not go looking for it.
 */
const VENUE_CITY = "Makati";

/** The password every UI signup in this repo uses (`shell.spec.ts`, `mode-switch.spec.ts`). */
const PASSWORD = "averylongpassword";

/** The three widths 14-UI-SPEC rule 1 names: the declared 320px floor (D-131), the tablet, the desktop. */
const WIDTHS = [320, 768, 1280] as const;

/** Frozen money on every seeded booking. No assertion here reads it; it exists so a row is legal. */
const SPACE_PRICE_CENTS = 100_000;
const SERVICE_FEE_CENTS = 5_000;
const QUOTED_TOTAL_CENTS = SPACE_PRICE_CENTS + SERVICE_FEE_CENTS;

/**
 * The two walked step counts, from D-151 — and they are declared here as EXPECTATIONS rather than read
 * off the page, because the walk asserting how far it got is half of what makes the wizard rows a
 * measurement of both modes rather than of one mode twice.
 *
 * Whole space walks nine questions. Drop-in walks eight: OC-10 removes the booking-mode step from the
 * LIST (not merely skips it), because drop-in passes are instant-only and a control that cannot apply
 * must not be shown and ignored.
 */
const WHOLE_SPACE_STEPS = 9;
const DROP_IN_STEPS = 8;

/**
 * The flat (one-navigation) states: the dashboard's four, the inbox's two, the bookings table's two
 * tabs times its two states, and the availability route.
 *
 * Declared as a number rather than counted from an array because the vacuity guard below has to be
 * able to fail when a case SKIPS, and a count derived from the cases that ran cannot.
 */
const FLAT_STATES = 4 + 2 + 4 + 1;

/** Every heading this file must have measured before the equality assertion means anything. */
const EXPECTED_MEASUREMENTS = (FLAT_STATES + WHOLE_SPACE_STEPS + DROP_IN_STEPS) * WIDTHS.length;

type SessionCookies = Awaited<ReturnType<BrowserContext["cookies"]>>;

type Seeded = {
  readonly hostEmail: string;
  readonly hostId: string;
  readonly listingId: string;
  readonly listingTitle: string;
  readonly bookerId: string;
  readonly sql: ReturnType<typeof postgres>;
  teardown(): Promise<void>;
};

/**
 * Sign a host up through the UI — the shipped idiom (`e2e/mode-switch.spec.ts:20-37`,
 * `e2e/shell.spec.ts:168-182`, `e2e/host-dashboard.spec.ts:127-137`), NOT a third sign-up path.
 *
 * The UI rather than a seeded session, for the reason those files give: email/password needs no
 * external credentials, and a unique address per run means repeated runs never collide on the unique
 * email constraint. The intent radio maps to the `canHost` capability (D-02), which is what makes
 * `/host` reachable at all — every page below re-checks it itself, not only in the layout.
 */
async function signUpHost(page: Page, tag: string): Promise<string> {
  const email = `e2e.head.${tag}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto(`${BASE}/signup`);
  await page.getByRole("radio", { name: "Host a space" }).click();
  await page.getByLabel("First name").fill("Hedwig");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign up to host/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 30_000 });
  return email;
}

/**
 * ⚠ THE SESSION IS CAPTURED AND REPLAYED, NEVER RE-ENTERED, and that is a measurement rather than a
 * style choice — `e2e/host-dashboard.spec.ts:142-155` records it. Playwright gives every test its own
 * context, so the obvious spelling is a `logInAs` at the top of each case; written that way, a file
 * with this many cases drives `POST /api/auth/sign-in/email` well past `src/lib/auth.ts:167`'s limit of
 * FIVE PER SIXTY SECONDS, and the resulting failure reads exactly like a product bug on the page under
 * test. The host signs in once, implicitly, by signing up.
 */
async function resumeSession(page: Page, cookies: SessionCookies): Promise<void> {
  await page.context().clearCookies();
  await page.context().addCookies(cookies);
}

/** One published listing owned by the signed-up host, one booker to hang bookings on, no bookings yet. */
async function seedHost(hostEmail: string): Promise<Seeded> {
  const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
  const runId = randomUUID();

  const [host] = await sql<{ id: string }[]>`
    SELECT id FROM "user" WHERE email = ${hostEmail}
  `;
  if (!host) {
    await sql.end();
    throw new Error(
      `the host signed up as ${hostEmail} is not in the database, so there is no owner to hang a ` +
        `listing on. The signup drive above did not persist a user.`,
    );
  }

  const hostId = host.id;
  const listingId = `e2e_head_listing_${runId}`;
  const bookerId = `e2e_head_booker_${runId}`;
  // Short, and it carries the run id so two concurrent runs can never make a text query ambiguous.
  const listingTitle = `Heading Court ${runId.slice(0, 6)}`;

  // An ACTIVATED payout wallet is what makes a listing bookable (the `payouts_enabled` gate). Seeded
  // directly, exactly as `booker-seed.ts` does — the `merchant.activated` webhook is a Phase 2 concern.
  await sql`
    INSERT INTO "host_payout" (user_id, paymongo_account_id, activation_status, payouts_enabled, onboarding_complete, created_at, updated_at)
    VALUES (${hostId}, ${`acct_${randomUUID()}`}, ${"activated"}, ${true}, ${true}, now(), now())
  `;

  await sql`
    INSERT INTO "user" (id, name, email, email_verified, first_name, can_host, can_book, created_at, updated_at)
    VALUES (
      ${bookerId}, ${"E2E Heading Booker"}, ${`${bookerId}@example.com`}, ${true},
      ${"Rosalind"}, ${false}, ${true}, now(), now()
    )
  `;

  // ⚠ BOTH RATES AND A PER-HEAD PRICE ARE SET, and the third one is not decoration. The wizard walk
  // below drives this listing through its pricing step in BOTH occupancy modes, and the two modes read
  // different fields — whole space prices by the hour and by the day, drop-in prices per head. A
  // listing missing the drop-in field would refuse to advance in the second walk and the failure would
  // read as a wizard defect rather than as a fixture gap.
  await sql`
    INSERT INTO "listing" (
      id, host_id, title, description, primary_space_type,
      address_line1, city, region, postal_code, country, neighborhood,
      location, show_exact_address, max_occupancy, unit_count, timezone,
      hourly_rate_cents, day_rate_cents, per_head_price_cents, occupancy_mode,
      currency, booking_mode, status, cancellation_policy, published_at, created_at, updated_at
    ) VALUES (
      ${listingId}, ${hostId}, ${listingTitle},
      ${"A covered court with two hoops, a scoreboard and a water station."},
      ${"multi_sport_court"}::space_type,
      ${"7 Real Street"}, ${VENUE_CITY}, ${"Metro Manila"}, ${"1210"}, ${"Philippines"}, ${"Poblacion"},
      ST_SetSRID(ST_MakePoint(${121.0244}, ${14.5547}), 4326), ${false}, ${10}, ${1}, ${VENUE_TZ},
      ${47333}, ${288888}, ${25000}, ${"exclusive"}::occupancy_mode,
      ${"php"}, ${"request"}::booking_mode, ${"published"}::listing_status,
      ${"standard"}::cancellation_policy,
      now(), now(), now()
    )
  `;

  return {
    hostEmail,
    hostId,
    listingId,
    listingTitle,
    bookerId,
    sql,
    async teardown() {
      // ORDER IS LOAD-BEARING (`booker-seed.ts`'s header): `booking.booker_id` is ON DELETE RESTRICT,
      // so the booking rows and their notifications go first, then the booker, then the host — whose
      // deletion cascades to the listing. Deleting a user first fails with a foreign-key error that
      // says nothing about ordering.
      await sql`DELETE FROM notification WHERE booking_id IN (SELECT id FROM booking WHERE listing_id = ${listingId})`;
      await sql`DELETE FROM booking WHERE listing_id = ${listingId}`;
      await sql`DELETE FROM "user" WHERE id = ${bookerId}`;
      await sql`DELETE FROM "user" WHERE email = ${hostEmail}`;
      await sql.end();
    },
  };
}

/** Every booking on the fixture's listing, removed. The starting point of each state below. */
async function clearBookings(seed: Seeded): Promise<void> {
  await seed.sql`DELETE FROM notification WHERE booking_id IN (SELECT id FROM booking WHERE listing_id = ${seed.listingId})`;
  await seed.sql`DELETE FROM booking WHERE listing_id = ${seed.listingId}`;
}

/**
 * One booking, positioned by VENUE-LOCAL day offset and hour.
 *
 * ⚠ THE INSTANTS ARE BUILT BY POSTGRES, IN THE VENUE'S OWN ZONE (`e2e/host-dashboard.spec.ts:263-280`).
 * "Today at 08:00 in Manila" is a property of a venue's local day, not of any instant this Node process
 * can name — computing it in JavaScript would re-implement D-141's day rule inside a test that depends
 * on it, and a run started at 23:50 UTC would seed rows on the wrong side of a boundary while looking
 * perfectly deliberate.
 */
async function addBooking(
  seed: Seeded,
  args: {
    dayOffset: number;
    startHour: number;
    endHour: number;
    status: "confirmed" | "requested" | "cancelled";
  },
): Promise<string> {
  const id = `e2e_head_booking_${randomUUID()}`;
  await seed.sql`
    INSERT INTO "booking" (
      id, listing_id, unit, booker_id, starts_at, ends_at, status, booking_mode,
      cancellation_policy, space_price_cents, service_fee_cents, quoted_total_cents,
      currency, payment_id, payment_method, expires_at, checkout_session_id,
      refund_cents, cancelled_by, cancelled_at, open_capacity, declared_pax, created_at
    ) VALUES (
      ${id}, ${seed.listingId}, ${1}, ${seed.bookerId},
      (date_trunc('day', now() AT TIME ZONE ${VENUE_TZ})
        + make_interval(days => ${args.dayOffset}, hours => ${args.startHour})) AT TIME ZONE ${VENUE_TZ},
      (date_trunc('day', now() AT TIME ZONE ${VENUE_TZ})
        + make_interval(days => ${args.dayOffset}, hours => ${args.endHour})) AT TIME ZONE ${VENUE_TZ},
      ${args.status}::booking_status, ${"request"}::booking_mode,
      ${"standard"}::cancellation_policy,
      ${SPACE_PRICE_CENTS}, ${SERVICE_FEE_CENTS}, ${QUOTED_TOTAL_CENTS}, ${"php"},
      ${null}, ${null},
      ${null},
      ${null}, ${null}, ${null}::cancelled_by, ${null},
      ${false}, ${null},
      now()
    )
  `;
  if (args.status === "requested") {
    // A live approval deadline, comfortably clear of the one-hour alarm threshold so the row renders
    // its ordinary shape. Nothing here reads the countdown; it exists so the row is a legal request.
    await seed.sql`
      UPDATE "booking" SET expires_at = now() + make_interval(hours => ${20}) WHERE id = ${id}
    `;
  }
  if (args.status === "cancelled") {
    await seed.sql`
      UPDATE "booking"
      SET cancelled_at = now(), cancelled_by = ${"host"}::cancelled_by, refund_cents = ${QUOTED_TOTAL_CENTS}
      WHERE id = ${id}
    `;
  }
  return id;
}

/** One measured heading: where it was read, at what width, what it said and how big it was. */
type Measurement = {
  readonly where: string;
  readonly width: number;
  readonly text: string;
  readonly fontSizePx: number;
};

const measurements: Measurement[] = [];

/**
 * THE MEASUREMENT. Exactly one first-level heading resolves, and its computed size is recorded — at
 * each of the three declared widths, from ONE navigation.
 *
 * `getByRole("heading", { level: 1 })` rather than a CSS selector, and the difference is the whole
 * claim: the role query reads the ACCESSIBILITY TREE, so a heading inside a `display: none` subtree
 * (the `hidden md:block` desktop tables these routes render, for instance) does not count — which is
 * correct, because a screen-reader user is never offered it. A `document.querySelectorAll("h1")` count
 * would report two on a responsive surface that only ever shows one, and "fixing" that would mean
 * deleting a tree the sighted layout needs.
 */
async function recordHeading(page: Page, where: string): Promise<void> {
  const h1 = page.getByRole("heading", { level: 1 });

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });

    await expect(
      h1,
      `${where} · ${width}px: this document offers a number of first-level headings other than ONE. ` +
        "Two roots give a screen-reader user two answers to 'what page is this' and none gives them " +
        "no answer at all. `PageHeader` supplies exactly one on every Phase-14 surface; a second " +
        "means a panel, a state or a dialog reached for `<h1>` where `<h2>` belongs.",
    ).toHaveCount(1);

    const size = await h1.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    const text = ((await h1.textContent()) ?? "").replace(/\s+/g, " ").trim();

    expect(
      Number.isFinite(size) && size > 0,
      `${where} · ${width}px: the heading's computed font-size read back as ${String(size)}. A size ` +
        "of zero or NaN is a measurement failure, not a small heading — and it would satisfy the " +
        "equality assertion below perfectly if every other read were also zero.",
    ).toBe(true);

    measurements.push({ where, width, text, fontSizePx: size });
  }
}

/**
 * How long a `tell` is given to appear, and it is a MEASURED allowance rather than a hedge.
 *
 * `overflow-320.spec.ts:213-219` already carries the smaller version of this reason: the dev server
 * compiles routes on demand, so a reachability guard racing a compile flakes, and a guard that flakes
 * is one people learn to ignore. MEASURED HERE, 23 August 2026: on the run that COMPILED
 * `/host/listings/[id]/availability` — the heaviest route in this file, a client hours editor, a
 * blocks editor with a month grid and a PostGIS-backed listing read — the tell did not resolve inside
 * 20s (43 polls, 0 elements), and the very next invocation of the same case against the warm route
 * passed in 3.8s. The failure named the surface and read exactly like a product defect.
 *
 * 60s is above the observed compile and below the per-test budget, so a genuinely absent tell still
 * fails inside the case rather than by timing the whole test out with no message.
 */
const TELL_TIMEOUT_MS = 60_000;

/**
 * TRAP 1 (`e2e/scroll-area-overflow.spec.ts:215-223`): assert the route rendered ITS OWN surface before
 * asserting anything about its heading.
 *
 * Every claim in this file is perfectly true of `/login`, of a 404 and of the route's own `loading.tsx`
 * plate — the plate especially, because it composes the SAME `PageHeader` with the SAME strings by
 * design. So each state names something only its own resolved surface produces, and a miss here is a
 * failure rather than a skip.
 */
async function expectSurface(page: Page, where: string, tell: string): Promise<void> {
  await expect(
    page.locator(tell),
    `${where}: the route rendered no \`${tell}\`, so this is not the surface — or not the STATE — this ` +
      "row names. Every heading assertion below passes against a redirect, a not-found body and the " +
      "route's own loading plate, which is why this runs first. If this is the FIRST run since a " +
      "restart, check the dev server's log before reading it as a defect — see `TELL_TIMEOUT_MS`.",
  ).not.toHaveCount(0, { timeout: TELL_TIMEOUT_MS });
}

/** Load a host route with the fixture's session and wait for fonts, so a size read is a settled one. */
async function open(page: Page, cookies: SessionCookies, path: string): Promise<void> {
  await resumeSession(page, cookies);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}${path}`);
  await page.evaluate(() => document.fonts.ready);
}

test.describe("AC#35 — one first-level heading per document, one size across five surfaces", () => {
  // SERIAL, and it is not a performance setting. Every case below reads or writes the SAME seeded
  // listing's booking rows to reach its state, and `beforeAll` runs once per WORKER — so a parallel
  // block would sign up one host per worker and tear down another worker's rows from under it. The
  // final equality case additionally depends on every earlier case having recorded.
  test.describe.configure({ mode: "serial", timeout: 240_000 });

  let seed: Seeded;
  /** The host who owns the fixture listing. Every state except the no-listings one uses this session. */
  let hostCookies: SessionCookies;
  /** A SECOND host with no listings at all — the only way to reach the dashboard's fourth state. */
  let emptyHostCookies: SessionCookies;
  let emptyHostEmail: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ baseURL: BASE });
    const page = await context.newPage();
    const hostEmail = await signUpHost(page, "owner");
    hostCookies = await context.cookies();
    await context.close();

    seed = await seedHost(hostEmail);

    // ⚠ A SECOND SIGN-UP, NOT A SECOND SIGN-IN. D-143's no-listings state is a property of a host's
    // listing count, and the fixture host has one — deleting and restoring it between cases would
    // cascade the bookings and the payout row with it. A brand-new host reaches the state by being
    // what the state is about. Sign-UP is not the rate-limited route; sign-IN is.
    const emptyContext = await browser.newContext({ baseURL: BASE });
    const emptyPage = await emptyContext.newPage();
    emptyHostEmail = await signUpHost(emptyPage, "nolistings");
    emptyHostCookies = await emptyContext.cookies();
    await emptyContext.close();
  });

  test.afterAll(async () => {
    if (seed !== undefined) {
      await seed.sql`DELETE FROM "user" WHERE email = ${emptyHostEmail}`;
      await seed.teardown();
    }
  });

  // ─── /host — the dashboard's four states ────────────────────────────────────────────────────────

  test("dashboard · today's sessions", async ({ page }) => {
    await clearBookings(seed);
    await addBooking(seed, { dayOffset: 0, startHour: 8, endHour: 10, status: "confirmed" });
    await addBooking(seed, { dayOffset: 0, startHour: 16, endHour: 18, status: "confirmed" });

    const where = "dashboard · today's sessions · /host";
    await open(page, hostCookies, "/host");
    await expectSurface(page, where, '[data-testid="agenda-rows"]');
    await recordHeading(page, where);
  });

  test("dashboard · quiet day, next up", async ({ page }) => {
    await clearBookings(seed);
    // Tomorrow, so it is the soonest FUTURE session and not a today row (D-142's fallback).
    await addBooking(seed, { dayOffset: 1, startHour: 10, endHour: 12, status: "confirmed" });

    const where = "dashboard · quiet day, next up · /host";
    await open(page, hostCookies, "/host");
    await expectSurface(page, where, '[data-testid="agenda-next"]');
    await recordHeading(page, where);
  });

  test("dashboard · nothing booked", async ({ page }) => {
    await clearBookings(seed);

    const where = "dashboard · nothing booked · /host";
    await open(page, hostCookies, "/host");
    await expectSurface(page, where, '[data-testid="agenda-none"]');
    await recordHeading(page, where);
  });

  test("dashboard · no listings (D-143)", async ({ page }) => {
    const where = "dashboard · no listings · /host";
    await open(page, emptyHostCookies, "/host");
    // The agenda is ABSENT in this state by design — a host with no listings has nothing to have an
    // agenda about — so the tell is the empty state that stands where it would be, and the absence of
    // all three agenda hooks is asserted beside it so this row cannot be satisfied by the state above.
    await expectSurface(page, where, '[data-testid="empty-state"]');
    await expect(
      page.locator('[data-testid="agenda-rows"], [data-testid="agenda-next"], [data-testid="agenda-none"]'),
      `${where}: an agenda rendered. This state is reached only by a host with ZERO listings, and the ` +
        "page renders the empty state INSTEAD of the agenda there — so an agenda here means the " +
        "session belongs to the fixture host and this row measured the state above it a second time.",
    ).toHaveCount(0);
    await recordHeading(page, where);
  });

  // ─── /host/requests — the inbox's two states ────────────────────────────────────────────────────

  test("requests · rows", async ({ page }) => {
    await clearBookings(seed);
    await addBooking(seed, { dayOffset: 2, startHour: 9, endHour: 11, status: "requested" });

    const where = "requests · rows · /host/requests";
    await open(page, hostCookies, "/host/requests");
    await expectSurface(page, where, '[data-testid="row-card"]');
    await recordHeading(page, where);
  });

  test("requests · inbox zero", async ({ page }) => {
    await clearBookings(seed);

    const where = "requests · inbox zero · /host/requests";
    await open(page, hostCookies, "/host/requests");
    await expectSurface(page, where, '[data-testid="empty-state"]');
    await recordHeading(page, where);
  });

  // ─── /host/bookings — two tabs times two states ─────────────────────────────────────────────────

  test("bookings · upcoming · rows", async ({ page }) => {
    await clearBookings(seed);
    await addBooking(seed, { dayOffset: 3, startHour: 9, endHour: 11, status: "confirmed" });

    const where = "bookings · upcoming · rows · /host/bookings?tab=upcoming";
    await open(page, hostCookies, "/host/bookings?tab=upcoming");
    await expectSurface(page, where, '[data-testid="row-card"]');
    await recordHeading(page, where);
  });

  test("bookings · upcoming · empty", async ({ page }) => {
    await clearBookings(seed);

    const where = "bookings · upcoming · empty · /host/bookings?tab=upcoming";
    await open(page, hostCookies, "/host/bookings?tab=upcoming");
    await expectSurface(page, where, '[data-testid="empty-state"]');
    await recordHeading(page, where);
  });

  test("bookings · past · rows", async ({ page }) => {
    await clearBookings(seed);
    // D-103's Past predicate is the exact logical COMPLEMENT of Upcoming's, so a CANCELLED booking
    // lands here even with its window still in the future — which is what this row seeds, because a
    // past-dated window would additionally have to clear the double-booking constraint against a day
    // the fixture has already used.
    await addBooking(seed, { dayOffset: 4, startHour: 9, endHour: 11, status: "cancelled" });

    const where = "bookings · past · rows · /host/bookings?tab=past";
    await open(page, hostCookies, "/host/bookings?tab=past");
    await expectSurface(page, where, '[data-testid="row-card"]');
    await recordHeading(page, where);
  });

  test("bookings · past · empty", async ({ page }) => {
    await clearBookings(seed);

    const where = "bookings · past · empty · /host/bookings?tab=past";
    await open(page, hostCookies, "/host/bookings?tab=past");
    await expectSurface(page, where, '[data-testid="empty-state"]');
    await recordHeading(page, where);
  });

  // ─── /host/listings/[id]/availability ───────────────────────────────────────────────────────────

  test("availability", async ({ page }) => {
    const where = `availability · /host/listings/{id}/availability`;
    await open(page, hostCookies, `/host/listings/${seed.listingId}/availability`);
    await expectSurface(page, where, '[data-testid="week-strip"]');
    await recordHeading(page, where);
  });

  // ─── the wizard — every step, both occupancy modes ──────────────────────────────────────────────
  //
  // A WALK RATHER THAN A NAVIGATION, and the reason is structural: `wizard.tsx` holds its position in
  // React state (`useState(0)`), there is no `?step=` and the rail only moves BACKWARD (D-148). The
  // only way to the next question is the button a host presses, so that is what this does.
  //
  // THE MODE IS SET IN THE DATABASE, not by driving the occupancy radio, and that is deliberate: the
  // radio's own behaviour is `tests/listing/wizard-occupancy.test.tsx`'s subject and is proved there
  // ten ways. What this file needs is the OTHER walked list, and the shortest honest way to it is the
  // column the component derives the fork from.

  async function walkWizard(
    page: Page,
    mode: "exclusive" | "open_capacity",
    label: string,
    expectedSteps: number,
  ): Promise<void> {
    await clearBookings(seed);
    // ⚠ THE BOOKING MODE MOVES WITH THE OCCUPANCY MODE, AND THAT IS THE PRODUCT'S RULE RATHER THAN A
    // FIXTURE CONVENIENCE. `saveListingStep`'s CR-04 guard re-runs the publish gate's open branch on
    // every autosave against a PUBLISHED row: a drop-in listing must carry a per-head price, a positive
    // people cap, a single space and INSTANT booking (OC-10 — approval on a shared daily counter would
    // need a held-seat-pending-approval lifecycle that does not exist). MEASURED, 23 August 2026: with
    // the fixture left on request-to-book, the drop-in walk was refused at step 1 with
    // `DROP_IN_INSTANT_ONLY_MESSAGE` and the walk correctly refused to move. The fixture is what was
    // wrong, so the fixture is what changed — the guard is untouched and must stay that way.
    await seed.sql`
      UPDATE "listing"
      SET occupancy_mode = ${mode}::occupancy_mode,
          booking_mode = ${mode === "open_capacity" ? "instant" : "request"}::booking_mode
      WHERE id = ${seed.listingId}
    `;

    await open(page, hostCookies, `/host/listings/${seed.listingId}/edit`);

    const where0 = `wizard · ${label} · step 1`;
    await expectSurface(page, where0, '[data-testid="wizard-step-rail"]');

    // THE STEP COUNTER IS THIS WALK'S PROOF THAT IT IS IN THE MODE IT CLAIMS (D-151 / GATE-NOREG 2).
    // Without it, a walk that silently ran the whole-space list twice would record eighteen headings,
    // all of them one, all of them the same size, and report a green wall over one mode.
    await expect(
      page.getByText(`Step 1 of ${expectedSteps}`),
      `${where0}: the wizard does not report a ${expectedSteps}-step walk. D-151 makes the count ` +
        "truthful across the occupancy fork — nine questions for whole space, eight for drop-in, " +
        "because OC-10 removes the booking-mode step from the LIST rather than skipping it. A wrong " +
        "count here means this walk is in the other mode and is about to measure it twice.",
    ).toHaveCount(1);

    const h1 = page.getByRole("heading", { level: 1 });

    for (let step = 1; step <= expectedSteps; step += 1) {
      const where = `wizard · ${label} · step ${step} of ${expectedSteps}`;
      await recordHeading(page, where);

      if (step === expectedSteps) break;

      const before = ((await h1.textContent()) ?? "").trim();
      // The advance control is `Get started` on the first question and `Save and continue` on every
      // one after it — the shipped labels, queried by accessible name the way
      // `tests/listing/wizard-occupancy.test.tsx:161-166` does.
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.getByRole("button", { name: /^(Get started|Save and continue)$/ }).click();

      try {
        await expect(h1).not.toHaveText(before, { timeout: 30_000 });
      } catch (cause) {
        // ⚠ THE SERVER'S OWN SENTENCE IS READ AND PUT IN THE MESSAGE, rather than the reader being sent
        // to look for it. D-150 put the refusal in a persistent `role="status"` region beside the
        // button precisely so it is legible; a walk that stalls and reports only "the heading did not
        // change" throws that away and sends the next person to the wrong file. This is the diagnostic
        // that turned a stuck drop-in walk into `DROP_IN_INSTANT_ONLY_MESSAGE` in one run.
        const said = (await page.getByRole("status").allTextContents())
          .map((s) => s.replace(/\s+/g, " ").trim())
          .filter((s) => s.length > 0);
        throw new Error(
          `${where}: pressing the advance control did not change the question — it is still ` +
            `"${before}". The wizard autosaves and then advances ONLY when the server accepts the ` +
            "draft (`saveAndContinue`), so a stuck walk means the draft was REFUSED at this step. " +
            `The save-state region says: ${said.length > 0 ? said.join(" · ") : "(nothing)"}. ` +
            "That is a fixture failure or a real refusal — never a reason to lower the step count or " +
            "to weaken the guard that refused.\n" +
            String(cause),
        );
      }
    }
  }

  test("wizard · whole space, every step", async ({ page }) => {
    await walkWizard(page, "exclusive", "whole space", WHOLE_SPACE_STEPS);
  });

  test("wizard · drop-in, every step", async ({ page }) => {
    await walkWizard(page, "open_capacity", "drop-in", DROP_IN_STEPS);
  });

  // ─── THE CROSS-SURFACE CLAIM ────────────────────────────────────────────────────────────────────

  test("all five surfaces' first-level headings compute the SAME size", () => {
    // VACUITY FIRST. Every assertion below is perfectly satisfied by an empty set, and a single
    // renamed case would silently shrink it. Playwright's serial mode already skips the rest of the
    // block after a failure — so this number failing means a case was REMOVED or renamed, not that one
    // went red, and those are two different conversations.
    expect(
      measurements.length,
      `this file recorded ${measurements.length} headings and the declared set is ` +
        `${EXPECTED_MEASUREMENTS} — ${FLAT_STATES} flat states plus a ${WHOLE_SPACE_STEPS}-step and an ` +
        `${DROP_IN_STEPS}-step wizard walk, each measured at ${WIDTHS.length} widths. The equality ` +
        "assertion below is true of an empty set and of any subset, so this count is what makes it " +
        "mean anything. If a state was deliberately removed, move this arithmetic with it.",
    ).toBe(EXPECTED_MEASUREMENTS);

    const sizes = [...new Set(measurements.map((m) => m.fontSizePx))].sort((a, b) => a - b);

    // THE FULL SET IS IN THE MESSAGE, GROUPED BY SIZE — because when this goes red the only question
    // that matters is WHICH surface is the outlier, and a bare "expected 1 to be 2" cannot answer it.
    const report = sizes
      .map((size) => {
        const rows = measurements.filter((m) => m.fontSizePx === size);
        const names = [...new Set(rows.map((m) => `${m.where} @${m.width}px — "${m.text}"`))];
        return `  ${size}px  (${rows.length} reading(s))\n${names.map((n) => `      ${n}`).join("\n")}`;
      })
      .join("\n");

    expect(
      sizes.length,
      "the five Phase-14 surfaces do NOT all render their first-level heading at one size. This is " +
        "the drift 14-UI-SPEC § Typography rule 1 exists to end, and it is invisible to every " +
        "single-surface test because each surface is individually rendering exactly the size its own " +
        "file asks for — the disagreement lives BETWEEN the files. Measured:\n" +
        `${report}\n` +
        "The fix is the outlying surface's own heading, never this assertion.",
    ).toBe(1);
  });
});
