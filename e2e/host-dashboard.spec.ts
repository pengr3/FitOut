import { expect, test, type BrowserContext, type Frame, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

import { expectRing, readFocus } from "./helpers/focus";
import { seedTheme } from "./helpers/theme";

// HFLOW-03 / 14-CONTEXT D-140…D-143 / 14-UI-SPEC § The Dashboard —
// THE TWO CLAIMS THE DASHBOARD CANNOT MAKE IN PROSE.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE SILENT FAILURE THIS FILE CATCHES (1): ONE PREDICATE, THREE WRITINGS
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// The pending-request count is written THREE times in this repository, deliberately and with the
// duplication recorded in all three places: the `(host)` shell's streamed nav badge
// (`patterns/ambient-notifications.tsx`), the dashboard's requests signal row (`(host)/host/page.tsx`),
// and the `/host/requests` inbox's own list. Three writings of one predicate is three chances to
// disagree, and the disagreement is invisible from any one of them: a host who sees a nav badge saying
// two and an inbox holding three has no way to know which is lying, and neither number looks broken on
// its own. Nothing in the unit suites can catch it either — each consumer is correct in isolation, and
// the defect is the RELATION between them.
//
// Case 4 below seeds a host with a known number of pending requests and asserts all three report the
// same N, then moves the number and asserts all three moved together. A FOURTH consumer written by a
// later plan fails this file the moment its N is different, which is the whole point of asserting the
// relation rather than the value.
//
// ⚠ OBSERVED FAILING. `ambient-notifications.tsx`'s predicate was temporarily widened from
// `booking.status = 'requested'` to `status <> 'cancelled'`, this spec was run ALONE, and case 4 went
// red with the message recorded in the plan summary — the nav badge reporting a different N from the
// signal row and the inbox. Reverted; green.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE SILENT FAILURE THIS FILE CATCHES (2): "WHO IS COMING", WITHOUT A SECOND CLICK
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-140's argument is one sentence: a host with three sessions today must be able to answer *who is
// coming and when* without leaving `/host`, and a grid of counts and links is the one shape that cannot
// answer it. That is a claim about a rendered page, and every way of writing it down short of a browser
// is an adjective. Case 3 seeds three sessions today with three different bookers and asserts all three
// first names and all three venue-local window labels are readable on `/host` with ZERO navigations —
// counted, not assumed: a listener counts main-frame navigations for the duration of the assertions, so
// a future "improvement" that renders the names behind a link or a tab goes red instead of passing.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// HOW TO RUN THIS FILE — NAME IT, AND RUN IT ALONE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//     npx playwright test e2e/host-dashboard.spec.ts --project=chromium
//
// NEVER a bare `npx playwright test`, and never more than three DB-seeding spec files in one invocation.
// 14-RESEARCH § The DB-contention flake pattern measures why: each seeding spec opens its own
// `postgres({ max: 1 })` client under `fullyParallel: true`, and the connection ceiling has been hit
// twice with `sorry, too many clients already`. The symptoms are timing-shaped — `write
// CONNECTION_ENDED`, `toBeVisible` timeouts in untouched specs — so they read like product defects. This
// file is a SEVENTH seeding spec, stated here rather than discovered: a failure in a spec this one did
// not touch is a FLAKE until it fails ALONE, and `e2e/availability.spec.ts:261` is a PRE-EXISTING
// standing red that this file neither causes nor fixes.
//
// `--project=visual` does not exist off Linux (`playwright.config.ts` skips the project entirely), so the
// chromium project is the only one that collects this file.
//
// THE CASES ARE SERIAL AND THEY BUILD ON EACH OTHER, on purpose. The agenda's three states are three
// states of ONE host — nothing booked, then a quiet day, then a busy one — and walking one host through
// them in order is both cheaper than three sign-up drives and a stronger claim: each state is reached by
// adding a row to the state before it, which is how a real host reaches them.
//
// THE ENVIRONMENT BOUNDARY (D-35): `DATABASE_URL` and nothing else. No provider call, no key.

const BASE = "http://localhost:3000";

// The Playwright process doesn't load .env; fall back to the deterministic dev URL (as booker-seed.ts).
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

/** The seeded listing's venue timezone. "Today" is resolved in THIS zone, never in the runner's (D-141). */
const VENUE_TZ = "Asia/Manila";

/**
 * The venue city — `composeWhenLabelShort` renders it as the window label's ` ({City} time)` suffix
 * ONLY when the rendered rows span more than one venue clock (PM ruling on UAT finding F-2,
 * 2026-08-24; the rule is `src/lib/booking/venue-clock-scope.ts`).
 *
 * This host owns ONE listing for cases (1)-(6), so the suffix is correctly absent there and case (4)
 * asserts that absence. Case (7) gives the host a SECOND listing in a second zone and asserts the
 * suffix comes back on every row — which is Walk A of the Phase 14 UAT, the walk the PM passed
 * precisely because the city name on each line did the work.
 */
const VENUE_CITY = "Makati";

/** Walk A's second venue: a genuinely different clock, so the rendered set VARIES. */
const SECOND_VENUE_TZ = "America/Los_Angeles";
const SECOND_VENUE_CITY = "Los Angeles";

/** The three widths 14-UI-SPEC names: the declared 320px floor (D-131), the tablet, the desktop. */
const WIDTHS = [320, 768, 1280] as const;

/** The password every UI signup in this repo uses (`shell.spec.ts`, `mode-switch.spec.ts`). */
const PASSWORD = "averylongpassword";

/** Frozen money on every seeded booking. The dashboard renders none of it — see case 3's note. */
const SPACE_PRICE_CENTS = 100_000;
const SERVICE_FEE_CENTS = 5_000;
const QUOTED_TOTAL_CENTS = SPACE_PRICE_CENTS + SERVICE_FEE_CENTS;

/**
 * The three bookers on today's agenda, and their names are chosen rather than arbitrary.
 *
 * Each assertion addresses a booker by TEXT, so the strings must not collide with anything else the
 * dashboard renders: not the greeting, not a control label, not the space title, not a word inside a
 * venue-local window label. Three names that appear nowhere else on the surface, and whose START HOURS
 * are distinct so the three window labels are distinguishable from one another too.
 */
const TODAY_SESSIONS = [
  { firstName: "Marisol", startHour: 8, endHour: 10, timeRange: "8:00 AM – 10:00 AM" },
  { firstName: "Teodoro", startHour: 12, endHour: 14, timeRange: "12:00 PM – 2:00 PM" },
  { firstName: "Corazon", startHour: 16, endHour: 18, timeRange: "4:00 PM – 6:00 PM" },
] as const;

/** The quiet-day fallback's session — tomorrow, so it is the soonest FUTURE row and not a today row. */
const NEXT_SESSION = { firstName: "Rosalind", startHour: 10, endHour: 12, timeLabel: "10:00 AM" };

type Seeded = {
  readonly hostEmail: string;
  readonly hostId: string;
  readonly listingId: string;
  readonly listingTitle: string;
  readonly sql: ReturnType<typeof postgres>;
  readonly bookerIds: string[];
  /**
   * EVERY listing this fixture creates, `listingId` included.
   *
   * Teardown deletes bookings by listing, and `booking.booker_id` is ON DELETE RESTRICT — so a second
   * listing whose bookings were not swept first makes the BOOKER delete fail with a foreign-key
   * error that says nothing about ordering. The array exists so the order stays load-bearing rather
   * than accidentally correct for one listing.
   */
  readonly listingIds: string[];
  teardown(): Promise<void>;
};

/**
 * Sign a host up through the UI — the shipped idiom, copied from `e2e/mode-switch.spec.ts:20-37` and
 * `e2e/shell.spec.ts:168-182` rather than authored a third time.
 *
 * The UI rather than a seeded session, for the reason those two files give: email/password needs no
 * external credentials, and a unique address per run means repeated runs never collide on the unique
 * email constraint. The intent radio maps to the `canHost` capability (D-02), which is what makes
 * `/host` reachable at all — the page re-checks it itself, not only in the layout.
 */
async function signUpHost(page: Page, tag: string): Promise<string> {
  const email = `e2e.dash.${tag}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto(`${BASE}/signup`);
  await page.getByRole("radio", { name: "Host a space" }).click();
  await page.getByLabel("First name").fill("Hosty");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign up to host/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 30_000 });
  return email;
}

/** The cookies that carry a session. Captured once, replayed for every case after the first. */
type SessionCookies = Awaited<ReturnType<BrowserContext["cookies"]>>;

/**
 * ⚠ THE SESSION IS CAPTURED AND REPLAYED, NOT RE-ENTERED — AND THAT IS A MEASUREMENT, NOT A STYLE CHOICE.
 *
 * Playwright gives every test its own browser context, so a session does not cross a test boundary and
 * the obvious spelling is a `logInAs` helper at the top of each case (which is what
 * `host-inbox-hierarchy.spec.ts` does — it needs two). Written that way, THIS file drove
 * `POST /api/auth/sign-in/email` seven times inside one minute, and `src/lib/auth.ts:167` rate-limits
 * that route to **5 per 60 seconds**. Observed: case 6 timed out in `waitForURL` after the login form
 * silently refused, with nothing in the failure naming a rate limit — it read exactly like a product
 * bug on the page under test.
 *
 * So the host signs in ONCE, implicitly, by signing up, and every later case replays those cookies.
 * That is one round trip per case instead of a form drive, it keeps the file clear of a limiter that
 * protects a real endpoint, and it removes an authentication flow this file is not about from six cases
 * that are about the dashboard. The limiter is correct and stays; the spec stops leaning on it.
 */
async function resumeSession(page: Page, cookies: SessionCookies): Promise<void> {
  await page.context().clearCookies();
  await page.context().addCookies(cookies);
}

/**
 * One published listing owned by the signed-up host, and NO bookings — the agenda's state C.
 *
 * Every value goes through postgres.js's tagged template; nothing below is concatenated into SQL.
 */
async function seedHostWithListing(hostEmail: string): Promise<Seeded> {
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
  const listingId = `e2e_dash_listing_${runId}`;
  // Short, and it carries the run id so two concurrent runs can never make a text query ambiguous.
  const listingTitle = `Dash Court ${runId.slice(0, 6)}`;

  // An ACTIVATED payout wallet is what makes a listing bookable (the `payouts_enabled` gate). Seeded
  // directly, exactly as `booker-seed.ts` does — the `merchant.activated` webhook is a Phase 2 concern.
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
      address_line1, city, region, postal_code, country, neighborhood,
      location, show_exact_address, max_occupancy, unit_count, timezone,
      hourly_rate_cents, day_rate_cents, occupancy_mode,
      currency, booking_mode, status, review_state, published_at, created_at, updated_at
    ) VALUES (
      ${listingId}, ${hostId}, ${listingTitle},
      ${"A covered court with two hoops and a scoreboard."}, ${"multi_sport_court"}::space_type,
      ${"3 Real Street"}, ${VENUE_CITY}, ${"Metro Manila"}, ${"1210"}, ${"Philippines"}, ${"Poblacion"},
      ST_SetSRID(ST_MakePoint(${121.0244}, ${14.5547}), 4326), ${false}, ${10}, ${1}, ${VENUE_TZ},
      ${47333}, ${288888}, ${"exclusive"}::occupancy_mode,
      ${"php"}, ${"request"}::booking_mode, ${"published"}::listing_status, ${"approved"}::listing_review_state,
      now(), now(), now()
    )
  `;

  const bookerIds: string[] = [];
  const listingIds: string[] = [listingId];

  return {
    hostEmail,
    hostId,
    listingId,
    listingTitle,
    sql,
    bookerIds,
    listingIds,
    async teardown() {
      // ORDER IS LOAD-BEARING (`booker-seed.ts`'s header): `booking.booker_id` is ON DELETE RESTRICT,
      // so the booking rows and their notifications go first, then the bookers, then the host — whose
      // deletion cascades to the listing. Deleting a user first fails with a foreign-key error that
      // says nothing about ordering. EVERY listing, not just the first: case (7) adds a second one.
      await sql`DELETE FROM notification WHERE booking_id IN (SELECT id FROM booking WHERE listing_id = ANY(${listingIds}))`;
      await sql`DELETE FROM booking WHERE listing_id = ANY(${listingIds})`;
      for (const id of bookerIds) {
        await sql`DELETE FROM "user" WHERE id = ${id}`;
      }
      await sql`DELETE FROM "user" WHERE email = ${hostEmail}`;
      await sql.end();
    },
  };
}

/** A booker with a known first name — the string the agenda row's TITLE has to resolve to (D-140). */
async function addBooker(seed: Seeded, firstName: string): Promise<string> {
  const id = `e2e_dash_booker_${randomUUID()}`;
  await seed.sql`
    INSERT INTO "user" (id, name, email, email_verified, first_name, can_host, can_book, created_at, updated_at)
    VALUES (
      ${id}, ${`E2E ${firstName}`}, ${`${id}@example.com`}, ${true},
      ${firstName}, ${false}, ${true}, now(), now()
    )
  `;
  seed.bookerIds.push(id);
  return id;
}

/**
 * One booking, positioned by VENUE-LOCAL day offset and hour.
 *
 * ⚠ THE INSTANTS ARE BUILT BY POSTGRES, IN THE VENUE'S OWN ZONE, and that is the whole reason this
 * helper exists. "Today at 08:00 in Manila" is a property of a venue's local day, not of any instant
 * this Node process can name — computing it in JavaScript would mean re-implementing D-141's day rule
 * inside the test that exists to check it, and a run started at 23:50 UTC would seed rows on the wrong
 * side of a boundary while looking perfectly deliberate. `date_trunc('day', now() AT TIME ZONE $tz)`
 * asks the engine that will evaluate the predicate, in the zone that owns the day, on every run.
 * This is `agenda-query.test.ts`'s `venueInstant` idiom, at browser scale.
 */
async function addBooking(
  seed: Seeded,
  args: {
    bookerId: string;
    dayOffset: number;
    startHour: number;
    endHour: number;
    status: "confirmed" | "requested";
    /** Defaults to the fixture's first listing; case (7) passes the second-zone one. */
    listingId?: string;
    /** MUST be the listing's own zone — the venue-local day is resolved in it. Defaults to Makati's. */
    timezone?: string;
  },
): Promise<string> {
  const id = `e2e_dash_booking_${randomUUID()}`;
  const listingId = args.listingId ?? seed.listingId;
  const tz = args.timezone ?? VENUE_TZ;
  await seed.sql`
    INSERT INTO "booking" (
      id, listing_id, unit, booker_id, starts_at, ends_at, status, booking_mode,
      cancellation_policy, space_price_cents, service_fee_cents, quoted_total_cents,
      currency, payment_id, payment_method, expires_at, checkout_session_id,
      refund_cents, cancelled_by, cancelled_at, open_capacity, declared_pax, created_at
    ) VALUES (
      ${id}, ${listingId}, ${1}, ${args.bookerId},
      (date_trunc('day', now() AT TIME ZONE ${tz})
        + make_interval(days => ${args.dayOffset}, hours => ${args.startHour})) AT TIME ZONE ${tz},
      (date_trunc('day', now() AT TIME ZONE ${tz})
        + make_interval(days => ${args.dayOffset}, hours => ${args.endHour})) AT TIME ZONE ${tz},
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
    // A live approval deadline, comfortably clear of the one-hour alarm threshold so the inbox row
    // renders its ordinary shape. The count is what this file asserts on; the countdown is 14-06's.
    await seed.sql`
      UPDATE "booking" SET expires_at = now() + make_interval(hours => ${20}) WHERE id = ${id}
    `;
  }
  return id;
}

/**
 * A SECOND published listing for the same host, in a genuinely different timezone — Walk A's shape.
 *
 * The Phase 14 UAT set exactly this up: one host owning a Makati court and a Venice Beach studio,
 * with a session on each venue's own local today. At the hours it ran the two venues were on
 * different CALENDAR DATES, so the two rows ran backwards down one list headed *Today*, and the PM
 * passed the walk because each line named its city.
 *
 * It exists here so that verdict is a GATE rather than a memory. Since the 24 August 2026 F-2 ruling
 * the suffix is conditional, and the condition is exactly this fixture: two rendered rows, two venue
 * clocks. The listing is published with an activated wallet like the first one — the host's payout
 * row is already seeded and is per-user, not per-listing.
 */
async function addSecondZoneListing(seed: Seeded): Promise<string> {
  const listingId = `e2e_dash_listing2_${randomUUID()}`;
  await seed.sql`
    INSERT INTO "listing" (
      id, host_id, title, description, primary_space_type,
      address_line1, city, region, postal_code, country, neighborhood,
      location, show_exact_address, max_occupancy, unit_count, timezone,
      hourly_rate_cents, day_rate_cents, occupancy_mode,
      currency, booking_mode, status, review_state, published_at, created_at, updated_at
    ) VALUES (
      ${listingId}, ${seed.hostId}, ${"Venice Beach Yoga Studio"},
      ${"A studio two blocks from the boardwalk."}, ${"yoga_studio"}::space_type,
      ${"11 Ocean Front Walk"}, ${SECOND_VENUE_CITY}, ${"California"}, ${"90291"}, ${"United States"}, ${"Venice"},
      ST_SetSRID(ST_MakePoint(${-118.4695}, ${33.985}), 4326), ${false}, ${10}, ${1}, ${SECOND_VENUE_TZ},
      ${47333}, ${288888}, ${"exclusive"}::occupancy_mode,
      ${"php"}, ${"request"}::booking_mode, ${"published"}::listing_status, ${"approved"}::listing_review_state,
      now(), now(), now()
    )
  `;
  seed.listingIds.push(listingId);
  return listingId;
}

/**
 * Every ACCENT-FILLED element in the viewport, with what it says.
 *
 * "Accent-filled" is resolved against the RENDERED token rather than against a class name: a probe node
 * is given `background-color: var(--brand)`, its computed value read, and every visible element whose
 * own computed background matches exactly is collected. That catches the accent however it arrived —
 * the `brand` button variant, a raw utility, an inline style — and it deliberately does NOT match the
 * tinted `bg-brand/10` surfaces, which compute to a mixed colour and are not a filled accent.
 *
 * The full list comes back rather than a count, because when this goes red the first question is always
 * *which second element became coral*, and a bare number cannot answer it.
 */
async function accentFilledElements(page: Page): Promise<{ tag: string; text: string }[]> {
  return page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.backgroundColor = "var(--brand)";
    probe.style.position = "absolute";
    probe.style.opacity = "0";
    document.body.appendChild(probe);
    const brand = getComputedStyle(probe).backgroundColor;
    probe.remove();

    const out: { tag: string; text: string }[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
      const style = getComputedStyle(el);
      if (style.backgroundColor !== brand) continue;
      if (style.visibility === "hidden" || style.display === "none") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      out.push({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
      });
    }
    return out;
  });
}

/** The nav badge's N — the FIRST of the three consumers. Hidden at zero (D-65), so absence means 0. */
async function navBadgeCount(page: Page): Promise<number> {
  const badge = page.getByLabel(/^\d+ requests to review$/).filter({ visible: true });
  const n = await badge.count();
  if (n === 0) return 0;
  expect(
    n,
    `the host shell rendered ${n} visible pending-request badges. The nav inventory has ONE requests ` +
      `slot and both placements are mutually exclusive by breakpoint, so more than one visible badge ` +
      `means the drawer and the inline nav are rendering at the same time.`,
  ).toBe(1);
  return Number(((await badge.textContent()) ?? "").trim());
}

/** The dashboard signal row's N — the SECOND consumer. The attribute IS the count, not a rendering of it. */
async function signalRowCount(page: Page): Promise<number> {
  const row = page.locator("[data-requests-waiting]");
  if ((await row.count()) === 0) return 0;
  return Number((await row.first().getAttribute("data-requests-waiting")) ?? "0");
}

/** The inbox's own row count — the THIRD consumer. Read at a desktop width, where the table renders. */
async function inboxRowCount(page: Page): Promise<number> {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/host/requests`, { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { level: 1, name: "Requests" }),
    "the requests inbox did not render its own heading, so the row count below would be counting a " +
      "loading plate or a redirect rather than the inbox.",
  ).toBeVisible({ timeout: 30_000 });
  return page.locator("table tbody tr").count();
}

/**
 * Open `/host` at a width and wait for the REAL page rather than its plate.
 *
 * `host/loading.tsx` renders the same `PageHeader` component with the static half of the same title
 * (14-08 made that literally true), so waiting for the `<h1>` would be satisfied by the fallback and
 * every assertion below would run against a skeleton. The dashboard's own marker attribute is on the
 * resolved page only, which is what makes it the right thing to wait for.
 */
async function openDashboard(page: Page, width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${BASE}/host`, { waitUntil: "networkidle" });
  await expect(
    page.locator("[data-host-dashboard]"),
    `${width}px: /host rendered no dashboard. Either the page gate redirected (the session is not ` +
      `host-capable), or the loading plate is still up.`,
  ).toBeVisible({ timeout: 30_000 });
}

test.describe.serial("HFLOW-03 — the host dashboard is a today view", () => {
  let seed: Seeded | null = null;
  let hostSession: SessionCookies = [];
  let secondHostEmail: string | null = null;
  let secondHostSql: ReturnType<typeof postgres> | null = null;

  test.afterAll(async () => {
    await seed?.teardown();
    if (secondHostSql) {
      if (secondHostEmail) {
        await secondHostSql`DELETE FROM "user" WHERE email = ${secondHostEmail}`;
      }
      await secondHostSql.end();
    }
  });

  test("(1) the shipped pins survive D-143, and a host with no bookings gets an absence rather than a failure", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const hostEmail = await signUpHost(page, "main");
    seed = await seedHostWithListing(hostEmail);
    // Signing up IS signing in, so the session already exists — captured here and replayed by every
    // case below rather than re-entered through the login form. See `resumeSession`'s note.
    hostSession = await page.context().cookies();
    await openDashboard(page);

    // ─── THE TWO ASSERTIONS `e2e/mode-switch.spec.ts:51-52` ALREADY MAKES, RESTATED HERE. ───────────
    // Not redundant: they are the two things D-143's restructure could most plausibly have dropped —
    // the dashboard's marker attribute and a level-one heading carrying the greeting — and they now
    // live in two files, so a future edit to either one cannot silently take both with it.
    await expect(page.locator("[data-host-dashboard]")).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: /your hosting/i }),
      "the greeting is no longer a level-one heading. D-143 demotes it to the header pattern's TITLE, " +
        "which is still an <h1>; losing the heading entirely is a different change and breaks the " +
        "shipped mode-switch spec too.",
    ).toBeVisible();

    // ─── THE AGENDA IS PRESENT IN EVERY STATE, AND ITS HEADING CARRIES NO DATE (D-141). ────────────
    const agenda = page.getByTestId("host-agenda");
    await expect(
      agenda,
      "the agenda section is absent. It renders in ALL THREE booking states and is distinguished by " +
        "which child it holds — an assertion of the form \"the agenda renders\" that an absent " +
        "section satisfies is the vacuity shape this repo has recorded a dozen times.",
    ).toBeVisible();
    await expect(
      agenda.getByRole("heading", { level: 2 }),
      "the agenda's heading is not the single word. A date beside it would be FALSE for one venue of " +
        "a two-zone host at exactly the hours the distinction matters, and false silently (D-141).",
    ).toHaveText(/^Today$/);

    // ─── STATE C: NOTHING BOOKED. An absence, never a failure (T-14-08-FALSEALARM). ────────────────
    const none = page.getByTestId("agenda-none");
    await expect(none).toBeVisible();
    await expect(page.getByTestId("agenda-rows")).toHaveCount(0);
    await expect(page.getByTestId("agenda-next")).toHaveCount(0);

    // Scoped INSIDE the branch's own hook, deliberately. Scoped to the document these two would pass
    // on a render that produced nothing at all — and would also go red on the payout banner, which is
    // an alerting composition on purpose and is not this branch's business.
    await expect(
      none.getByRole("button", { name: /try again|retry|reload/i }),
      "the nothing-booked state offers a retry. A host who has simply not been booked yet has nothing " +
        "to recover from, and a retry affordance tells them something went wrong.",
    ).toHaveCount(0);
    await expect(
      none.locator('[role="alert"]'),
      "the nothing-booked state carries an alerting role. An absence is never dressed as a failure.",
    ).toHaveCount(0);

    // ─── D-143's `iff`, HALF ONE: this host HAS a listing, so the explainer is gone. ───────────────
    await expect(
      page.getByText(/This is your hosting space, separate from booking\./),
      "the two-sentence product explainer is still on the page for a host who HAS listings. D-143 " +
        "retains it in the no-listings state ONLY — for everyone else it explains the page they are " +
        "standing on, which is what stopped the agenda being the subject.",
    ).toHaveCount(0);
  });

  test("(2) exactly one accent-filled element at 320 / 768 / 1280, and the bookings list is reachable by name", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await resumeSession(page, hostSession);

    for (const width of WIDTHS) {
      await openDashboard(page, width);
      const accents = await accentFilledElements(page);
      const shown = accents.map((a) => `<${a.tag}> "${a.text}"`).join(" · ") || "(none)";

      expect(
        accents.length,
        `${width}px: the dashboard shows ${accents.length} accent-filled elements, not one. The one ` +
          `accent is the create action; the header cluster dropped Earnings and Requests precisely ` +
          `because two buttons duplicating permanent nav slots are two competitors for it. Found: ${shown}`,
      ).toBe(1);

      expect(
        accents[0].text,
        `${width}px: the one accent-filled element is "${accents[0].text}", which is not the create ` +
          `action. Whatever else moves on this surface, the accent belongs to the one thing the ` +
          `product is asking a host to do.`,
      ).toBe("Create listing");
    }

    // ─── THE ROUTE-OUT THE DASHBOARD DID NOT HAVE AT ALL BEFORE THIS PLAN. ─────────────────────────
    // An accessible-name query, not a structural one: `/host/listings` and `/host/bookings` are the two
    // host destinations that are NOT permanent nav slots, and this is how the second one is reached.
    await openDashboard(page, 1280);
    const routeOut = page.getByRole("link", { name: "View all bookings" });
    await expect(
      routeOut,
      "the agenda's heading row has no link to the host bookings list. `/host/bookings` is not in the " +
        "host nav, so without this link the dashboard is a dead end for every session that is not today.",
    ).toBeVisible();
    await routeOut.click();
    await page.waitForURL((u) => u.pathname === "/host/bookings", { timeout: 30_000 });
  });

  test("(3) a quiet day names the next session instead of showing a dead screen (D-142)", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const s = seed!;

    const booker = await addBooker(s, NEXT_SESSION.firstName);
    await addBooking(s, {
      bookerId: booker,
      dayOffset: 1,
      startHour: NEXT_SESSION.startHour,
      endHour: NEXT_SESSION.endHour,
      status: "confirmed",
    });

    await resumeSession(page, hostSession);
    await openDashboard(page);

    const next = page.getByTestId("agenda-next");
    await expect(
      next,
      "with nothing today and one session upcoming, the agenda still rendered its nothing-booked " +
        "branch. D-142 exists so a quiet day is useful rather than a dead screen.",
    ).toBeVisible();
    await expect(page.getByTestId("agenda-none")).toHaveCount(0);
    await expect(page.getByTestId("agenda-rows")).toHaveCount(0);

    const sentence = ((await next.textContent()) ?? "").replace(/\s+/g, " ").trim();
    expect(
      sentence,
      `the quiet-day sentence is "${sentence}". It must name the next session's venue-local time and ` +
        `the space it is in — a sentence that says only "nothing today" is the dead screen D-142 rejects.`,
    ).toContain(NEXT_SESSION.timeLabel);
    expect(sentence).toContain(s.listingTitle);
    expect(sentence).toMatch(/^Nothing today/);
  });

  test("(4) the agenda answers WHO IS COMING with zero navigations — D-140's acceptance test", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const s = seed!;

    for (const session of TODAY_SESSIONS) {
      const booker = await addBooker(s, session.firstName);
      await addBooking(s, {
        bookerId: booker,
        dayOffset: 0,
        startHour: session.startHour,
        endHour: session.endHour,
        status: "confirmed",
      });
    }

    await resumeSession(page, hostSession);
    await openDashboard(page, 1280);

    // ─── THE NAVIGATION COUNTER. Registered AFTER the page is up, so the arriving load is not counted
    // and every navigation from here on is one this surface caused. Same-document (client-side) route
    // changes fire this too, which is what makes it a real answer to "without a second click" rather
    // than an assertion about full page loads.
    let navigations = 0;
    const onNavigated = (frame: Frame) => {
      if (frame.parentFrame() === null) navigations += 1;
    };
    page.on("framenavigated", onNavigated);

    const rows = page.getByTestId("agenda-rows");
    await expect(
      rows,
      "the agenda rendered no row list for a host with three sessions today.",
    ).toBeVisible();
    await expect(
      rows.locator("li"),
      "the agenda is not showing three sessions. D-140 chose a LIST over a tile grid precisely so " +
        "every one of today's sessions is on the page rather than behind a count.",
    ).toHaveCount(3);

    for (const session of TODAY_SESSIONS) {
      // THE BOOKER'S FIRST NAME IS THE ROW TITLE, resolved BY ROLE — a host already knows which spaces
      // they own; what they cannot see is who is arriving. A dashboard that quietly reverted to
      // space-first still renders the name somewhere, and this query is what tells the two apart.
      await expect(
        rows.getByRole("link", { name: session.firstName }),
        `"${session.firstName}" is not the title of any agenda row. D-140's whole argument is that the ` +
          `booker's first name is what a host cannot see and the space title is what they already know.`,
      ).toBeVisible();

      // …and the venue-local window beside it, from the one shared formatter, naming the city.
      await expect(
        rows.getByText(new RegExp(session.timeRange.replace(/[–-]/, "[–-]"))),
        `no agenda row shows the window "${session.timeRange}". The three sessions are seeded at ` +
          `distinct venue-local hours, so three distinct labels must be readable without a click.`,
      ).toBeVisible();
    }

    // ─── NO CITY SUFFIX HERE, AND ITS ABSENCE IS THE ASSERTION (PM ruling on F-2, 2026-08-24).
    //
    // This used to read the other way: *the city suffix, once* — proof the labels came through the
    // venue-local composer. That proof was retired with the rule it rested on. This host owns ONE
    // listing, so every row on this agenda sits on one venue clock, and naming a city on each of them
    // disambiguated nothing while costing the widest column on `/host/bookings` (finding F-2). The
    // suffix now appears only when the rendered rows VARY — asserted from the other side in case (7),
    // which gives this same host a second listing in a second zone and watches it come back.
    //
    // ⚠ WHAT REPLACES THE RETIRED PROOF. "The labels are venue-local" is still checked, and by
    // something stronger than a city name: the three window labels above are seeded at three distinct
    // VENUE-LOCAL hours and are asserted verbatim. A page rendering in the runner's zone would show
    // three different hours and fail there, by name.
    await expect(
      rows.getByText(new RegExp(`\\(${VENUE_CITY} time\\)`)),
      "an agenda row named its venue's city on a single-zone host's dashboard. Since 2026-08-24 the " +
        "suffix appears only when the rendered rows span more than one venue clock — see " +
        "`src/lib/booking/venue-clock-scope.ts`. If this is red because the rule was reverted, the " +
        "F-2 clip on /host/bookings is back with it.",
    ).toHaveCount(0);

    page.off("framenavigated", onNavigated);
    expect(
      navigations,
      `reading who is coming today took ${navigations} navigation(s). D-140's acceptance test is that ` +
        `a host with three sessions today answers "who is coming and when" WITHOUT a second click, ` +
        `and this counter is what stops that being an adjective.`,
    ).toBe(0);
  });

  test("(5) the nav badge, the signal row and the inbox all report the SAME N — and move together", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const s = seed!;

    /** Read all three consumers for the current DB state, in one pass. */
    async function readAllThree(): Promise<{ nav: number; signal: number; inbox: number }> {
      await openDashboard(page, 1280);
      const nav = await navBadgeCount(page);
      const signal = await signalRowCount(page);
      const inbox = await inboxRowCount(page);
      return { nav, signal, inbox };
    }

    await resumeSession(page, hostSession);

    // ─── TWO PENDING REQUESTS. Seeded on days the agenda does not read, so this case measures the
    // COUNT and nothing else. They are `requested`, which is the one status all three consumers filter on.
    const first = await addBooker(s, "Adelina");
    const second = await addBooker(s, "Bernabe");
    await addBooking(s, { bookerId: first, dayOffset: 3, startHour: 9, endHour: 11, status: "requested" });
    await addBooking(s, { bookerId: second, dayOffset: 4, startHour: 9, endHour: 11, status: "requested" });

    const two = await readAllThree();
    expect(
      [two.nav, two.signal, two.inbox],
      `the three consumers of ONE pending-request predicate disagree: nav badge ${two.nav}, signal ` +
        `row ${two.signal}, inbox ${two.inbox}. A host who sees one number in the shell and another ` +
        `in the inbox has no way to know which is lying, and neither looks broken on its own.`,
    ).toEqual([2, 2, 2]);

    // ─── AND THEY MOVE TOGETHER. Three consumers agreeing on one seeded number could be three
    // constants; agreeing again after the number moves cannot be.
    const third = await addBooker(s, "Consuelo");
    await addBooking(s, { bookerId: third, dayOffset: 5, startHour: 9, endHour: 11, status: "requested" });

    const three = await readAllThree();
    expect(
      [three.nav, three.signal, three.inbox],
      `a third pending request was seeded and the three consumers landed on nav badge ${three.nav}, ` +
        `signal row ${three.signal}, inbox ${three.inbox}. All three read the same owner-scoped ` +
        `predicate; one that did not move is one that is no longer reading it.`,
    ).toEqual([3, 3, 3]);

    // The signal row says something, not just carries an attribute — the state, and the way out (O7).
    await openDashboard(page, 1280);
    await expect(page.getByText(/3 requests are waiting on your yes\./)).toBeVisible();
    await expect(page.getByRole("link", { name: "Review requests" })).toBeVisible();
  });

  test("(6) the explainer appears if and only if the host's non-deleted listing count is zero (D-143)", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const explainer = /This is your hosting space, separate from booking\./;

    // ─── HALF ONE: a host with NO listings. The one state where the explainer is genuinely orienting.
    secondHostEmail = await signUpHost(page, "nolistings");
    secondHostSql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
    // The signup drive left this context holding the SECOND host's session already.
    await openDashboard(page, 1280);

    await expect(
      page.getByText(explainer),
      "a host with no listings gets no explainer. This is the ONE state where those two sentences are " +
        "the page's only orientation — there is no agenda to read and nothing else to look at.",
    ).toBeVisible();
    await expect(
      page.getByTestId("host-agenda"),
      "a host with no listings was given an agenda section. There is nothing to have an agenda about, " +
        "and an empty \"Today\" is an absence dressed up as a state.",
    ).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "No listings yet" })).toBeVisible();

    // The accent survives in this state too — it is the SECOND of the two call sites, and the two are
    // arms of one runtime conditional, so exactly one of them is ever an element in the document.
    const accents = await accentFilledElements(page);
    expect(
      accents.map((a) => a.text),
      "the no-listings state does not show exactly one accent-filled create action.",
    ).toEqual(["Create listing"]);

    // ─── HALF TWO: the same page, for a host who HAS a listing. An `iff` needs both sides asked; a
    // one-sided check passes just as happily on a page that never renders the string at all.
    await resumeSession(page, hostSession);
    await openDashboard(page, 1280);
    await expect(
      page.getByText(explainer),
      "the explainer is on the page for a host who has listings, so it is not an `iff` — it is a " +
        "paragraph that happens to also render in the empty state.",
    ).toHaveCount(0);
    await expect(page.getByTestId("host-agenda")).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // (7) WALK A, AS A GATE — the two-timezone dashboard the PM passed on 2026-08-24
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  //
  // WHAT THE WALK WAS. A host owning a Makati court and a Venice Beach studio, with a session on each
  // venue's own local today. At the hour it ran the two venues were on different calendar dates, so
  // the two rows ran BACKWARDS down one list headed *Today* — Mon, Aug 24 above Sun, Aug 23. The PM
  // was asked whether that reads as two real sessions or as a page that has got its dates confused,
  // and passed it: *"the city name on each line does the work."* D-141's no-date heading stands
  // because of that sentence.
  //
  // WHY IT NEEDS A GATE NOW AND DID NOT BEFORE. Until 2026-08-24 every host time named its venue's
  // zone unconditionally, so the walk's verdict could not be broken by a change to a rule that did
  // not exist. The F-2 ruling makes the suffix CONDITIONAL, and this fixture is exactly the condition
  // — so the walk's verdict is now one boolean away from being false, and a human passed it once,
  // months ago, in a screenshot. This case is that verdict, restated as something that fails.
  //
  // ⚠ IT ASSERTS THE CHANGE, NOT JUST THE STATE. Case (4) has already established that these same
  // Makati rows carry NO suffix while this host has one listing. Here the ONLY thing that changes is
  // that a second listing in a second zone gains a session — no row is edited, no label recomposed by
  // hand — and the suffix appears on the Makati rows too. That is the rule's actual claim: it depends
  // on the SET, not on the row.
  //
  // ── WATCHED RED — BOTH DIRECTIONS, run and reverted, 24 August 2026 ────────────────────────────
  // `resolveListCity`'s projector was forced to each of its two constant answers, and each direction
  // reddens exactly one of the two cases while leaving the other green — which is what says the pair
  // measures the RULE rather than a state:
  //
  //   • ALWAYS OMIT (`varies && false`) — 1 failed / 6 passed, this case:
  //       Error: no agenda row names Los Angeles. Two rendered rows on two venue clocks is precisely
  //       the case the suffix exists for, and Walk A of the Phase 14 UAT passed BECAUSE of it.
  //       Expected: 1   Received: 0
  //     Case (4) stayed green — an always-omit rule keeps a single-zone list correct and quietly
  //     breaks the walk the PM passed, which is the failure mode this case exists for.
  //
  //   • ALWAYS SHOW (`varies || true`) — case (4) red, this one green:
  //       Error: an agenda row named its venue's city on a single-zone host's dashboard. …
  //       Expected: 0   Received: 3
  test("(7) WALK A: a second venue in a second timezone brings the city suffix back — on every row", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const s = seed!;

    const secondListing = await addSecondZoneListing(s);
    const booker = await addBooker(s, "Rosalinda");
    await addBooking(s, {
      bookerId: booker,
      listingId: secondListing,
      timezone: SECOND_VENUE_TZ,
      // Venue-local, in the STUDIO's own zone — the whole point of D-141 and of this walk. Built by
      // Postgres in that zone, so "today in Venice Beach" is a property of the venue's local day and
      // not of the runner's clock. Mid-afternoon, so it is an ordinary hour a human reads without
      // effort whatever time the suite runs at.
      dayOffset: 0,
      startHour: 14,
      endHour: 16,
      status: "confirmed",
    });

    await resumeSession(page, hostSession);
    await openDashboard(page, 1280);

    const rows = page.getByTestId("agenda-rows");
    await expect(
      rows,
      "the agenda rendered no row list for a host with sessions in two zones today.",
    ).toBeVisible();

    // The new row is on the page at all — otherwise the two assertions below are about one zone.
    await expect(
      rows.getByRole("link", { name: "Rosalinda" }),
      "the second venue's session is not on the agenda, so this case is not testing two zones. The " +
        "booking is seeded at the STUDIO's own venue-local today; if it is missing, the day-boundary " +
        "predicate resolved it in the wrong zone.",
    ).toBeVisible();

    // ─── THE WALK'S OWN CLAIM. Both cities named, each on its own line.
    await expect(
      rows.getByText(new RegExp(`\\(${SECOND_VENUE_CITY} time\\)`)),
      `no agenda row names ${SECOND_VENUE_CITY}. Two rendered rows on two venue clocks is precisely ` +
        "the case the suffix exists for, and Walk A of the Phase 14 UAT passed BECAUSE of it.",
    ).toHaveCount(1);
    await expect(
      rows.getByText(new RegExp(`\\(${VENUE_CITY} time\\)`)).first(),
      `the ${SECOND_VENUE_CITY} row names its city but the ${VENUE_CITY} rows do not. A rule that ` +
        "suffixes only the odd one out is worse than either alternative: the reader is told which " +
        "row is different rather than what each row's clock is. The decision is a property of the " +
        "rendered SET and must reach every row in it.",
    ).toBeVisible();
  });
});

const ROADMAP_THEMES = ["court", "grove"] as const;
const ROADMAP_WIDTHS = [320, 1280] as const;
const LONG_REJECTION_REASON =
  "The identity record did not match the submitted details: <b>" + "identitymismatch".repeat(32) + "</b>";

type RoadmapSnapshot = {
  readonly name: string;
  readonly owed: "unverified" | "pending" | "rejected" | "grandfathered";
  readonly state: "Current" | "Waiting" | "Not passed" | "Done";
  readonly action:
    | "Create listing"
    | "Your listings"
    | "Finish the check"
    | "Ask for another check"
    | "Set up payouts";
  readonly identityTitle?: "Get your account checked" | "Account ready";
  readonly includes?: string;
};

async function assertNoHorizontalOverflow(page: Page, where: string): Promise<void> {
  const measurement = await page.evaluate(() => ({
    document: {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    },
    cards: Array.from(document.querySelectorAll<HTMLElement>('[data-testid="panel-card"]'))
      .map((card, index) => ({
        index,
        clientWidth: card.clientWidth,
        scrollWidth: card.scrollWidth,
      }))
      .filter((card) => card.scrollWidth > card.clientWidth + 1),
  }));

  expect(
    measurement.document.scrollWidth,
    `${where}: the dashboard scrolls horizontally (${measurement.document.scrollWidth}px against ` +
      `${measurement.document.clientWidth}px).`,
  ).toBeLessThanOrEqual(measurement.document.clientWidth);
  expect(
    measurement.cards,
    `${where}: one or more PanelCards have internal horizontal overflow.`,
  ).toEqual([]);
}

async function assertRoadmapSnapshot(
  page: Page,
  width: (typeof ROADMAP_WIDTHS)[number],
  snapshot: RoadmapSnapshot,
): Promise<void> {
  const where = `${snapshot.name} · ${width}px`;
  await openDashboard(page, width);

  const heading = page.getByRole("heading", {
    level: 2,
    name: "Get ready to take bookings",
  });
  await expect(heading, `${where}: the headed roadmap is absent.`).toBeVisible();
  const roadmap = heading.locator("xpath=ancestor::section[1]");
  const list = roadmap.getByRole("list");
  const steps = list.getByRole("listitem");
  await expect(steps, `${where}: the roadmap does not contain exactly four steps.`).toHaveCount(4);

  const titles = await steps.getByRole("heading", { level: 3 }).allTextContents();
  expect(titles, `${where}: the fixed semantic step order changed.`).toEqual([
    snapshot.identityTitle ?? "Get your account checked",
    "Set up payouts",
    "List a space",
    "FitOut checks your space",
  ]);
  await expect(
    steps.nth(0).locator(`[data-verification-owed="${snapshot.owed}"]`),
    `${where}: the identity card lost its owed-state hook.`,
  ).toHaveCount(1);
  await expect(steps.nth(0)).toContainText(snapshot.state);

  const actions = roadmap.locator("a[href], button");
  await expect(actions, `${where}: the roadmap must expose exactly one advancing action.`).toHaveCount(1);
  await expect(actions.first()).toHaveText(snapshot.action);
  const actionHeight = await actions.first().evaluate((node) => node.getBoundingClientRect().height);
  expect(actionHeight, `${where}: the advancing action is shorter than the 44px touch target.`).toBeGreaterThanOrEqual(
    44,
  );

  await expect(roadmap.getByRole("progressbar"), `${where}: progress bars are prohibited.`).toHaveCount(0);
  await expect(roadmap).not.toContainText(/\b\d+%\b|countdown|queue position|\bETA\b/i);
  await expect(roadmap.locator("svg:not([aria-hidden='true'])")).toHaveCount(0);
  if (snapshot.includes) {
    await expect(roadmap).toContainText(snapshot.includes);
  }

  const columnCount = await list.evaluate((node) =>
    getComputedStyle(node).gridTemplateColumns.split(" ").filter(Boolean).length,
  );
  expect(columnCount, `${where}: the one DOM tree reflowed to the wrong column count.`).toBe(
    width === 320 ? 1 : 2,
  );

  if (width === 1280) {
    const heights = await roadmap
      .locator('[data-testid="panel-card"]')
      .evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().height));
    expect(heights).toHaveLength(4);
    expect(Math.abs(heights[0] - heights[1]), `${where}: the first desktop row is uneven.`).toBeLessThanOrEqual(1);
    expect(Math.abs(heights[2] - heights[3]), `${where}: the second desktop row is uneven.`).toBeLessThanOrEqual(1);
  }

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  let reachedAction = false;
  for (let press = 0; press < 40; press += 1) {
    await page.keyboard.press("Tab");
    reachedAction = await actions.first().evaluate((node) => node === document.activeElement);
    if (reachedAction) break;
  }
  expect(reachedAction, `${where}: the advancing action is absent from the keyboard order.`).toBe(true);
  const focusReading = await readFocus(page);
  expect(focusReading, `${where}: the advancing action did not retain keyboard focus.`).not.toBeNull();
  if (focusReading === null) throw new Error(`${where}: the advancing action focus reading was null.`);
  expectRing(focusReading, `${where}: the advancing action`);
  await assertNoHorizontalOverflow(page, where);
}

async function insertRoadmapListing(
  sql: ReturnType<typeof postgres>,
  args: {
    id: string;
    hostId: string;
    title: string;
    status: "draft" | "published";
    reviewState: "pending" | "approved" | "rejected";
    withHours?: boolean;
  },
): Promise<void> {
  await sql`
    INSERT INTO "listing" (
      id, host_id, title, description, primary_space_type,
      address_line1, city, region, postal_code, country, neighborhood,
      location, show_exact_address, max_occupancy, unit_count, timezone,
      hourly_rate_cents, day_rate_cents, occupancy_mode,
      currency, booking_mode, status, review_state, published_at, created_at, updated_at
    ) VALUES (
      ${args.id}, ${args.hostId}, ${args.title},
      ${"A layout-proof court with wrapping explanatory content."}, ${"multi_sport_court"}::space_type,
      ${"3 Real Street"}, ${VENUE_CITY}, ${"Metro Manila"}, ${"1210"}, ${"Philippines"}, ${"Poblacion"},
      ST_SetSRID(ST_MakePoint(${121.0244}, ${14.5547}), 4326), ${false}, ${10}, ${1}, ${VENUE_TZ},
      ${47333}, ${288888}, ${"exclusive"}::occupancy_mode,
      ${"php"}, ${"request"}::booking_mode, ${args.status}::listing_status,
      ${args.reviewState}::listing_review_state,
      ${args.status === "published" ? new Date() : null}, now(), now()
    )
  `;
  if (args.withHours) {
    await sql`
      INSERT INTO operating_hours (id, listing_id, day_of_week, open_time, close_time)
      VALUES (${`hours_${randomUUID()}`}, ${args.id}, ${1}, ${"08:00:00"}, ${"18:00:00"})
    `;
  }
}

for (const theme of ROADMAP_THEMES) {
  test(`${theme} · the roadmap and receipt state matrix reflows at 320px/1280px without overflow`, async ({
    page,
  }) => {
    test.setTimeout(360_000);
    await seedTheme(page.context(), theme);

    const email = await signUpHost(page, `roadmap-${theme}`);
    const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
    const [host] = await sql<{ id: string }[]>`
      SELECT id FROM "user" WHERE email = ${email}
    `;
    if (!host) {
      await sql.end();
      throw new Error(`the ${theme} roadmap host did not persist after signup`);
    }

    const primaryId = `e2e_roadmap_primary_${randomUUID()}`;
    const siblingId = `e2e_roadmap_sibling_${randomUUID()}`;
    const setVerification = async (
      status: "pending" | "rejected" | "grandfathered" | "approved",
      reason: string | null,
      minutesAgo: number,
    ) => {
      await sql`
        INSERT INTO host_verification (user_id, status, provider, reason, created_at, updated_at)
        VALUES (${host.id}, ${status}::host_verification_status, ${"manual"}, ${reason}, now(), now() - make_interval(mins => ${minutesAgo}))
        ON CONFLICT (user_id) DO UPDATE SET
          status = EXCLUDED.status,
          provider = EXCLUDED.provider,
          reason = EXCLUDED.reason,
          updated_at = EXCLUDED.updated_at
      `;
    };

    try {
      await sql`UPDATE "user" SET email_verified = ${true} WHERE id = ${host.id}`;

      const zero: RoadmapSnapshot = {
        name: "zero-listing",
        owed: "unverified",
        state: "Current",
        action: "Create listing",
      };
      for (const width of ROADMAP_WIDTHS) await assertRoadmapSnapshot(page, width, zero);

      await insertRoadmapListing(sql, {
        id: primaryId,
        hostId: host.id,
        title: `A deliberately long dashboard title ${"wrapping-title-".repeat(18)}`,
        status: "draft",
        reviewState: "pending",
      });
      await setVerification("pending", null, 5);
      const waiting: RoadmapSnapshot = {
        name: "waiting",
        owed: "pending",
        state: "Waiting",
        action: "Your listings",
      };
      for (const width of ROADMAP_WIDTHS) await assertRoadmapSnapshot(page, width, waiting);

      await setVerification("pending", null, 31);
      const stale: RoadmapSnapshot = {
        name: "stale-pending",
        owed: "pending",
        state: "Waiting",
        action: "Finish the check",
        includes: "Your check has been waiting for a result for more than 30 minutes.",
      };
      for (const width of ROADMAP_WIDTHS) await assertRoadmapSnapshot(page, width, stale);

      await setVerification("rejected", LONG_REJECTION_REASON, 25 * 60);
      const rejected: RoadmapSnapshot = {
        name: "rejected-long-reason",
        owed: "rejected",
        state: "Not passed",
        action: "Ask for another check",
        includes: LONG_REJECTION_REASON,
      };
      for (const width of ROADMAP_WIDTHS) await assertRoadmapSnapshot(page, width, rejected);

      await setVerification("grandfathered", null, 0);
      const grandfathered: RoadmapSnapshot = {
        name: "grandfathered",
        owed: "grandfathered",
        state: "Done",
        action: "Set up payouts",
        identityTitle: "Account ready",
        includes: "Your account can create and publish listings.",
      };
      for (const width of ROADMAP_WIDTHS) await assertRoadmapSnapshot(page, width, grandfathered);

      await setVerification("approved", null, 0);
      await sql`
        INSERT INTO host_payout (
          user_id, paymongo_account_id, activation_status, payouts_enabled,
          onboarding_complete, created_at, updated_at
        ) VALUES (${host.id}, ${`acct_${randomUUID()}`}, ${"activated"}, ${true}, ${true}, now(), now())
      `;
      await sql`
        UPDATE listing
        SET status = ${"published"}::listing_status,
            review_state = ${"approved"}::listing_review_state,
            published_at = now(),
            updated_at = now()
        WHERE id = ${primaryId}
      `;
      await sql`
        INSERT INTO operating_hours (id, listing_id, day_of_week, open_time, close_time)
        VALUES (${`hours_${randomUUID()}`}, ${primaryId}, ${1}, ${"08:00:00"}, ${"18:00:00"})
      `;

      for (const width of ROADMAP_WIDTHS) {
        await openDashboard(page, width);
        const where = `${theme} · ready · ${width}px`;
        const ready = page.getByRole("heading", { level: 2, name: "Ready to take bookings" });
        await expect(ready, `${where}: the first-bookable receipt is absent.`).toBeVisible();
        const section = ready.locator("xpath=ancestor::section[1]");
        await expect(section).toContainText("You have a listing that guests can book.");
        await expect(section.getByRole("list")).toHaveCount(0);
        await expect(section.locator("a[href], button")).toHaveCount(0);
        await assertNoHorizontalOverflow(page, where);
      }

      await insertRoadmapListing(sql, {
        id: siblingId,
        hostId: host.id,
        title: `Rejected sibling ${"wrapping-title-".repeat(18)}`,
        status: "published",
        reviewState: "rejected",
        withHours: true,
      });
      for (const width of ROADMAP_WIDTHS) {
        await openDashboard(page, width);
        const where = `${theme} · mixed-portfolio · ${width}px`;
        await expect(
          page.getByRole("heading", { level: 2, name: "Ready to take bookings" }),
          `${where}: a rejected sibling incorrectly reopened the account roadmap.`,
        ).toBeVisible();
        await expect(
          page.getByRole("heading", { level: 2, name: "Get ready to take bookings" }),
        ).toHaveCount(0);
        await assertNoHorizontalOverflow(page, where);
      }
    } finally {
      await sql`DELETE FROM "user" WHERE id = ${host.id}`;
      await sql.end();
    }
  });
}
