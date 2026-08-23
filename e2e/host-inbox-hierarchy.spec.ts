import { expect, test, type Locator, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

// HFLOW-01 / D-144 / D-146 / 14-UI-SPEC § The SLA countdown is the loudest element —
// THE HIERARCHY MEASUREMENT. "Loudest" is a comparison, so it is written as one.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE SILENT FAILURE THIS FILE CATCHES
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// HFLOW-01's own words put the SLA countdown first: the host request inbox is a triage queue whose
// deadline outranks the money and the guest name. Everything written about that so far is an ADJECTIVE.
// `tests/host/request-row.test.tsx` (14-03) asserts the DOM order and the class names, and it says so in
// its own header — a class name is not a font size. A single edit that gives the money figure the heading
// role, or that drops the countdown back to the inline layout on one of the two surfaces the row renders
// on, changes no test in the repository and no reviewer's mind, and the requirement quietly stops being
// true. That is precisely what happened between 14-03 and 14-06: the mobile card asked for the `lead`
// layout and the desktop table did not, so above the `md:` breakpoint the deadline rendered at the same
// 14px as everything beside it and nothing anywhere went red.
//
// This file compares COMPUTED font sizes inside a real row, in a real browser, at three widths. It is
// the second TEXT-measurement spec in the repo; `e2e/tabular-figures.spec.ts` is the first, and the
// structure below is copied from it — (b) is the assertion the requirement needs, and the surrounding
// guards exist to make it falsifiable rather than vacuous.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE SIZES ARE COLLECTED RATHER THAN TWO ELEMENTS BEING NAMED
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// The obvious spelling is `expect(countdownSize).toBeGreaterThan(moneySize)`. It is the wrong assertion,
// and its wrongness is the whole reason this file is long: it pins the countdown against the ONE element
// somebody thought of, and a future edit that promotes the venue-local window, the guest name or the D-99
// reason line passes it untouched. Every text node inside the row is measured, the maximum is taken over
// all of them, and the failure message prints the FULL sorted list — so a red names the element that
// competed instead of reporting a number.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHICH ROW IS "THE ROW", AT EACH WIDTH — MEASURED, NOT ASSUMED
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `/host/requests` renders TWO trees: a `hidden md:block` desktop table and a `space-y-3 md:hidden`
// stack of `RowCard`s. `md:` is 768px, so at the 320px floor the visible row is the card and at 768px
// and 1280px it is the table row. Both are request rows and the hierarchy is a property of the ROW, not
// of the viewport, which is why the same three assertions run against both. A spec that measured the
// card at all three widths would be measuring `display: none` at two of them: `getBoundingClientRect`
// returns a zero box for a hidden subtree, every comparison would be 0-vs-0, and the file would be a
// green wall proving nothing. The visibility of the row under test is therefore asserted before anything
// is measured.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE `[14-03]` DEFERRED ITEM IS DISCHARGED HERE (case 3)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `deferred-items.md` `[14-03]` addressed 14-06 by name: `row-card.tsx`'s status column is `shrink-0`,
// and 14-03 moved the D-99 cap-shortened reason line — a full sentence — into it, so at the 320px floor
// a capped row's status column keeps its max-content width and the title column beside it absorbs the
// whole squeeze. The item asks for a MEASUREMENT rather than an opinion, and asks that it not be
// discovered as a Playwright failure. Case 3 below is that measurement: the seeded request is
// deliberately CAP-SHORTENED so the reason line renders, and the case reports the status column's width,
// the title column's width and the title text's natural width, then asserts the falsifiable
// 14-UI-SPEC states for this width — `scrollWidth <= clientWidth`, i.e. the card does not overflow the
// 320px floor.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// HOW TO RUN THIS FILE — NAME IT, AND RUN IT ALONE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//     npx playwright test e2e/host-inbox-hierarchy.spec.ts --project=chromium
//
// NEVER a bare `npx playwright test`, and never more than three DB-seeding spec files in one invocation.
// 14-RESEARCH § The DB-contention flake pattern measures why: five spec files seed into one Postgres,
// each with its own `postgres({ max: 1 })` client under `fullyParallel: true`, and the connection
// ceiling has been hit twice with `sorry, too many clients already`. The symptoms are timing-shaped —
// `write CONNECTION_ENDED`, `toBeVisible` timeouts in untouched specs — so they read like product
// defects. This file is a SIXTH seeding spec, which is stated here rather than discovered: a failure in
// a spec this one did not touch is a flake until it fails ALONE, and
// `e2e/availability.spec.ts:261` is a PRE-EXISTING standing red that this file neither causes nor fixes.
//
// `--project=visual` does not exist off Linux (`playwright.config.ts` skips the project entirely), so
// the chromium project above is the only one that collects this file.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE ENVIRONMENT BOUNDARY (D-35): `DATABASE_URL` and nothing else. No provider call, no key.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════

const BASE = "http://localhost:3000";

// The Playwright process doesn't load .env; fall back to the deterministic dev URL (as booker-seed.ts).
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

/** The seeded listing's venue timezone — every window label the row renders is venue-local. */
const VENUE_TZ = "Asia/Manila";

/** The three widths 14-UI-SPEC names: the declared 320px floor (D-131), the tablet, the desktop. */
const WIDTHS = [320, 768, 1280] as const;

/** `md:` in Tailwind v4. Below it the card is the visible row; at and above it, the table row. */
const MD_BREAKPOINT_PX = 768;

/** Frozen money on the seeded request — the quote the row renders, never re-derived by the page. */
const SPACE_PRICE_CENTS = 100_000;
const SERVICE_FEE_CENTS = 5_000;
const QUOTED_TOTAL_CENTS = SPACE_PRICE_CENTS + SERVICE_FEE_CENTS;

/**
 * The booker's first name, and it is chosen rather than arbitrary.
 *
 * The guest-name assertions address the node by its TEXT, so the string must not collide with anything
 * else the row renders: not a column header, not a control label, not a substring of the space title or
 * the venue-local window. Six letters that appear nowhere else on the surface.
 */
const GUEST_FIRST_NAME = "Marisol";

/** The password every UI signup in this repo uses (`shell.spec.ts`, `mode-switch.spec.ts`). */
const PASSWORD = "averylongpassword";

type SeededInbox = {
  readonly hostEmail: string;
  readonly hostId: string;
  readonly listingId: string;
  readonly listingTitle: string;
  readonly bookerId: string;
  readonly bookingId: string;
  readonly sql: ReturnType<typeof postgres>;
  teardown(): Promise<void>;
};

/**
 * Sign a host up through the UI — the shipped idiom, copied from `e2e/shell.spec.ts:168-182` and
 * `e2e/mode-switch.spec.ts:20-37`.
 *
 * The UI rather than a seeded session, for the reason those two files give: email/password needs no
 * external credentials, and a unique address per run means repeated runs never collide on the unique
 * email constraint. The intent radio maps to the `canHost` capability (D-02), which is what makes
 * `/host/requests` reachable at all — the page re-checks it itself, not only in the layout.
 */
async function signUpHost(page: Page): Promise<string> {
  const email = `e2e.inbox.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto(`${BASE}/signup`);
  await page.getByRole("radio", { name: "Host a space" }).click();
  await page.getByLabel("First name").fill("Hosty");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign up to host/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 30_000 });
  return email;
}

/** Log back in — the session does not cross a test boundary (`tabular-figures.spec.ts`'s note). */
async function logInAs(page: Page, email: string): Promise<void> {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 });
}

/**
 * One listing owned by the signed-up host, and ONE `requested` booking on it.
 *
 * ⚠ THE REQUEST IS DELIBERATELY CAP-SHORTENED (D-96/D-99), and that is the load-bearing property of this
 * fixture rather than a detail of it. `request-countdown-reason.tsx` renders its line ONLY when the row's
 * real `expires_at` is materially earlier than the flat `created_at + APPROVAL_SLA_HOURS` — i.e. when the
 * D-94 session-start cap bit — and only while the session is still in the future. A session four hours
 * out with a two-hour approval window satisfies both, so the row under test carries the WIDEST thing the
 * status slot can hold, which is exactly the row `[14-03]` asked to be measured at 320px. A fixture with
 * a comfortable 24-hour deadline would render no reason line and would measure the easy case while
 * reading as though it had measured the hard one.
 *
 * The two-hour deadline is also deliberately ABOVE the one-hour threshold, so `finalHourEmphasis` does
 * not fire: this file measures scale and position, and a fixture that also tripped the alarm treatment
 * would be measuring two decisions with one number.
 *
 * Every value goes through postgres.js's tagged template — nothing below is concatenated into SQL.
 */
async function seedInbox(hostEmail: string): Promise<SeededInbox> {
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
  const bookerId = `e2e_inbox_booker_${runId}`;
  const listingId = `e2e_inbox_listing_${runId}`;
  const bookingId = `e2e_inbox_request_${runId}`;
  // Short, and it carries the run id so two concurrent runs can never make a text query ambiguous.
  const listingTitle = `Inbox Gym ${runId.slice(0, 6)}`;

  // An ACTIVATED payout wallet is what makes a listing bookable (the `payouts_enabled` gate). Seeded
  // directly, exactly as `booker-seed.ts` does — the `merchant.activated` webhook is a Phase 2 concern.
  await sql`
    INSERT INTO "host_payout" (user_id, paymongo_account_id, activation_status, payouts_enabled, onboarding_complete, created_at, updated_at)
    VALUES (${hostId}, ${`acct_${randomUUID()}`}, ${"activated"}, ${true}, ${true}, now(), now())
  `;

  await sql`
    INSERT INTO "user" (id, name, email, email_verified, first_name, can_host, can_book, created_at, updated_at)
    VALUES (
      ${bookerId}, ${"E2E Inbox Booker"}, ${`${bookerId}@example.com`}, ${true},
      ${GUEST_FIRST_NAME}, ${false}, ${true}, now(), now()
    )
  `;

  await sql`
    INSERT INTO "listing" (
      id, host_id, title, description, primary_space_type,
      address_line1, city, region, postal_code, country, neighborhood,
      location, show_exact_address, max_occupancy, unit_count, timezone,
      hourly_rate_cents, day_rate_cents, occupancy_mode,
      currency, booking_mode, status, published_at, created_at, updated_at
    ) VALUES (
      ${listingId}, ${hostId}, ${listingTitle},
      ${"A matted gym with heavy bags and wraps."}, ${"martial_arts_boxing"}::space_type,
      ${"2 Real Street"}, ${"Makati"}, ${"Metro Manila"}, ${"1210"}, ${"Philippines"}, ${"Poblacion"},
      ST_SetSRID(ST_MakePoint(${121.0244}, ${14.5547}), 4326), ${false}, ${8}, ${1}, ${VENUE_TZ},
      ${47333}, ${288888}, ${"exclusive"}::occupancy_mode,
      ${"php"}, ${"request"}::booking_mode, ${"published"}::listing_status,
      now(), now(), now()
    )
  `;

  await sql`
    INSERT INTO "booking" (
      id, listing_id, unit, booker_id, starts_at, ends_at, status, booking_mode,
      cancellation_policy, space_price_cents, service_fee_cents, quoted_total_cents,
      currency, payment_id, payment_method, expires_at, checkout_session_id,
      refund_cents, cancelled_by, cancelled_at, open_capacity, declared_pax, created_at
    ) VALUES (
      ${bookingId}, ${listingId}, ${1}, ${bookerId},
      now() + make_interval(hours => ${4}),
      now() + make_interval(hours => ${6}),
      ${"requested"}::booking_status, ${"request"}::booking_mode,
      ${"standard"}::cancellation_policy,
      ${SPACE_PRICE_CENTS}, ${SERVICE_FEE_CENTS}, ${QUOTED_TOTAL_CENTS}, ${"php"},
      ${null}, ${null},
      now() + make_interval(hours => ${2}),
      ${null}, ${null}, ${null}::cancelled_by, ${null},
      ${false}, ${null},
      now()
    )
  `;

  return {
    hostEmail,
    hostId,
    listingId,
    listingTitle,
    bookerId,
    bookingId,
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

/**
 * One measured text node: what it says, how big it is, how heavy, and where its baseline box starts.
 *
 * The rect comes from a `Range` over the TEXT NODE rather than from the parent element's box, and the
 * reason is `tabular-figures.spec.ts`'s: a block-level element's box is its CONTAINER's width and its
 * top is the line box's top, so comparing element boxes would be comparing containers — satisfied by any
 * type scale in the world, and a perfectly green assertion measuring nothing. The range is the glyphs the
 * browser actually laid out.
 */
type MeasuredText = {
  readonly text: string;
  readonly fontSizePx: number;
  readonly fontWeight: number;
  readonly top: number;
  readonly textWidth: number;
  /** The parent element's own content box — how much room the text was GIVEN, vs. what it needed. */
  readonly boxWidth: number;
  readonly isCountdownDigits: boolean;
  readonly where: string;
};

/**
 * Every visible text node inside a row, measured.
 *
 * Zero-area nodes are dropped: an `sr-only` region is a 1×1 clipped box carrying no text on this row
 * (the countdown's threshold latch is empty until the final hour), and a `display: none` subtree
 * measures 0×0 — neither is text a host can read, and including them would let a hidden node win or
 * lose a size comparison it is not part of.
 */
async function measureRow(row: Locator): Promise<MeasuredText[]> {
  return row.evaluate((rowEl) => {
    const out: {
      text: string;
      fontSizePx: number;
      fontWeight: number;
      top: number;
      textWidth: number;
      boxWidth: number;
      isCountdownDigits: boolean;
      where: string;
    }[] = [];
    const walker = document.createTreeWalker(rowEl, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
      if (text === "") continue;
      const parent = node.parentElement;
      if (parent === null) continue;

      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const style = getComputedStyle(parent);
      out.push({
        text,
        fontSizePx: parseFloat(style.fontSize),
        fontWeight: Number(style.fontWeight),
        top: rect.top,
        textWidth: rect.width,
        boxWidth: parent.getBoundingClientRect().width,
        // The digits are identified STRUCTURALLY (inside the one `role="timer"`) *and* by their own
        // format, so neither the prefix beside them nor a stray figure elsewhere in the row can be
        // mistaken for them. `request-countdown.tsx` renders "{N}h {M}m", or "{M}m" under an hour.
        isCountdownDigits:
          parent.closest('[role="timer"]') !== null && /^(?:\d+h\s+)?\d+m$/.test(text),
        where: `<${parent.tagName.toLowerCase()} class="${parent.getAttribute("class") ?? ""}">`,
      });
    }
    return out;
  });
}

/** A stable, readable dump of everything measured — printed into every failure message. */
function report(nodes: readonly MeasuredText[]): string {
  return [...nodes]
    .sort((a, b) => b.fontSizePx - a.fontSizePx)
    .map(
      (n) =>
        `    ${String(n.fontSizePx).padStart(6)}px / ${String(n.fontWeight).padStart(3)} — ` +
        `"${n.text}"  ${n.where}`,
    )
    .join("\n");
}

/** Exactly one node whose text matches, or a failure that says which row was looked at. */
function only(
  nodes: readonly MeasuredText[],
  predicate: (n: MeasuredText) => boolean,
  what: string,
  where: string,
): MeasuredText {
  const hits = nodes.filter(predicate);
  expect(
    hits.length,
    `${where}: expected exactly ONE ${what} in the row and found ${hits.length}. Every comparison ` +
      `below addresses this node by what it SAYS, so a second one makes the comparison ambiguous and a ` +
      `zeroth makes it vacuous. The row measured:\n${report(nodes)}`,
  ).toBe(1);
  return hits[0];
}

test.describe("HFLOW-01 / D-146 — the SLA countdown is the loudest element, measured", () => {
  test.describe.configure({ mode: "serial" });

  let seed: SeededInbox | null = null;

  test.afterAll(async () => {
    await seed?.teardown();
  });

  /**
   * Open `/host/requests` at a width and return the row the host can actually see there.
   *
   * The route's own `loading.tsx` renders the SAME `PageHeader` with the SAME title as the page (14-06
   * made that literally true — one constant, one component, two files), so waiting for the `<h1>` would
   * be satisfied by the SKELETON and every measurement below would run against a plate. `booker-seed.ts`
   * records the same trap on the checkout route. Waiting for the ROW itself is waiting for the real page.
   */
  async function openInboxAt(page: Page, width: number): Promise<Locator> {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}/host/requests`, { waitUntil: "networkidle" });

    const desktop = width >= MD_BREAKPOINT_PX;
    const row = desktop
      ? page.locator("table tbody tr").first()
      : page.getByTestId("row-card").first();

    await expect(
      row,
      `${width}px: /host/requests rendered no ${desktop ? "table row" : "row card"}. Either the page ` +
        `gate redirected (the session is not host-capable), the owner-scoped read returned nothing, or ` +
        `the loading plate is still up.`,
    ).toBeVisible({ timeout: 30_000 });
    return row;
  }

  test("(1) the countdown digits are the largest type in the row at 320 / 768 / 1280", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const hostEmail = await signUpHost(page);
    seed = await seedInbox(hostEmail);

    for (const width of WIDTHS) {
      const where = `${width}px`;
      const row = await openInboxAt(page, width);
      const nodes = await measureRow(row);

      // ═══════════════════════════════════════════════════════════════════════════════════════════
      // THE VACUITY GUARDS — asserted BEFORE anything is compared
      // ═══════════════════════════════════════════════════════════════════════════════════════════
      //
      // Every assertion below is a comparison between numbers read out of the DOM, and an empty row
      // yields no numbers to disagree with each other. `scroll-area-overflow.spec.ts:215-223`'s rule:
      // assert the page rendered the thing under test before asserting anything about it.
      expect(
        nodes.length,
        `${where}: the row contains ${nodes.length} visible text nodes. A request row renders the ` +
          `deadline, its prefix, the D-99 reason, the space title, the venue-local window, the guest ` +
          `name, the money figure and two controls — far more than this. Measured:\n${report(nodes)}`,
      ).toBeGreaterThanOrEqual(8);

      // The fixture is CAP-SHORTENED on purpose, so the row under test is the one carrying the widest
      // thing the status slot can hold. If this line goes red the seed stopped being the hard case and
      // every measurement below quietly became the easy one.
      //
      // ⚠ THE SENTENCE IS THREE TEXT NODES, NOT ONE, and this walker deliberately does not glue them
      // back together. `request-countdown-reason.tsx` renders `Session starts in {startsIn} — respond
      // soon.`, so JSX splits it at the interpolation and the DOM holds "Session starts in", "3h" and
      // "— respond soon." as siblings. Measured, not predicted: the first draft of this file matched the
      // whole sentence against a single node and went red on a row that was rendering it perfectly. The
      // node-level split is CORRECT for every size comparison above and below — each fragment is really
      // a separate laid-out run and each is really measured — so the join happens here, in the one place
      // that asks a question about the sentence rather than about the glyphs.
      const rowText = nodes.map((n) => n.text).join(" ");
      expect(
        /Session starts in .* — respond soon\./.test(rowText),
        `${where}: the D-99 cap-shortened reason line did not render, so this row is not the capped ` +
          `row the fixture seeds and \`[14-03]\`'s 320px question is not being asked. Measured:` +
          `\n${report(nodes)}`,
      ).toBe(true);

      // ═══════════════════════════════════════════════════════════════════════════════════════════
      // (1) THE COUNTDOWN DIGITS ARE STRICTLY THE LARGEST TEXT IN THE ROW
      // ═══════════════════════════════════════════════════════════════════════════════════════════
      const digits = only(nodes, (n) => n.isCountdownDigits, "countdown digits node", where);
      const others = nodes.filter((n) => !n.isCountdownDigits);
      const largestOther = others.reduce((a, b) => (b.fontSizePx > a.fontSizePx ? b : a));

      expect(
        digits.fontSizePx,
        `${where}: THE COUNTDOWN IS NOT THE LOUDEST ELEMENT ON THE ROW. The digits ("${digits.text}") ` +
          `compute ${digits.fontSizePx}px, and "${largestOther.text}" computes ` +
          `${largestOther.fontSizePx}px in ${largestOther.where}. HFLOW-01 asks for a triage queue ` +
          `whose deadline outranks the money and the guest name, and D-146 is a HIERARCHY instruction — ` +
          `carried by scale and reading order, never by a hue. Do not fix this by shrinking the ` +
          `competitor if the competitor is the money: the money and the guest name are pinned to one ` +
          `role by assertion (3) below, so the fix is almost always that the countdown lost its \`lead\` ` +
          `layout on this surface. Every text node in the row, largest first:\n${report(nodes)}`,
      ).toBeGreaterThan(largestOther.fontSizePx);

      // ═══════════════════════════════════════════════════════════════════════════════════════════
      // (2) THE COUNTDOWN LEADS THE ROW VERTICALLY
      // ═══════════════════════════════════════════════════════════════════════════════════════════
      //
      // `<=` against the space title and `<` against the money, which is 14-UI-SPEC's own falsifiable
      // and not a softening of it: `RowCard` puts the countdown in the `status` slot, which SHARES the
      // row's first line with the title column. Below `md:` the two are top-aligned siblings and their
      // tops are equal; on the table they are cells in one `align-middle` row, and the countdown's
      // two-line block is the tallest content in it. The money is strictly beneath in both trees.
      const countdownBox = await row.locator('[role="timer"]').boundingBox();
      expect(
        countdownBox,
        `${where}: the row has no \`role="timer"\` box to measure. An EXPIRED countdown drops the role ` +
          `deliberately (rule 3 — an expired window counts nothing), so this most likely means the ` +
          `seeded deadline lapsed mid-run rather than that the role moved.`,
      ).not.toBeNull();

      const title = only(nodes, (n) => n.text === seed!.listingTitle, "space title", where);
      const money = only(nodes, (n) => n.text.startsWith("₱"), "money figure", where);
      const guest = only(nodes, (n) => n.text === GUEST_FIRST_NAME, "guest name", where);

      expect(
        countdownBox!.y,
        `${where}: the countdown starts at y=${countdownBox!.y} and the space title at y=${title.top} — ` +
          `the deadline has been pushed BELOW the row's first line. D-146's reading order is deadline, ` +
          `then who, then what.`,
      ).toBeLessThanOrEqual(title.top);

      expect(
        countdownBox!.y,
        `${where}: the countdown starts at y=${countdownBox!.y} and the money figure at y=${money.top}. ` +
          `The money must sit strictly beneath the deadline — a request row whose headline figure is a ` +
          `price is a receipt, not a triage queue.`,
      ).toBeLessThan(money.top);

      // ═══════════════════════════════════════════════════════════════════════════════════════════
      // (3) THE MONEY AND THE GUEST NAME ARE THE SAME ROLE — NEITHER IS PROMOTED TO COMPETE
      // ═══════════════════════════════════════════════════════════════════════════════════════════
      //
      // An EQUALITY, which is what makes (1) a hierarchy statement rather than an arms race: without it,
      // "the countdown is the largest" could be kept true by enlarging the countdown every time somebody
      // enlarged the money.
      expect(
        { size: money.fontSizePx, weight: money.fontWeight },
        `${where}: the money figure ("${money.text}", ${money.fontSizePx}px / ${money.fontWeight}) and ` +
          `the guest name ("${guest.text}", ${guest.fontSizePx}px / ${guest.fontWeight}) do not compute ` +
          `the same role. D-146's third falsifiable is this equality: the hierarchy is carried by the ` +
          `countdown, and promoting either of these two is the defect this file exists to catch. ` +
          `Measured:\n${report(nodes)}`,
      ).toEqual({ size: guest.fontSizePx, weight: guest.fontWeight });

      console.log(
        `[MEASUREMENT ${where}] digits ${digits.fontSizePx}px/${digits.fontWeight} · ` +
          `next largest "${largestOther.text}" ${largestOther.fontSizePx}px · ` +
          `guest ${guest.fontSizePx}px/${guest.fontWeight} · money ${money.fontSizePx}px/${money.fontWeight} · ` +
          `countdown y=${countdownBox!.y} title y=${title.top} money y=${money.top}`,
      );
    }
  });

  test("(2) D-144 — the row browses nowhere, and the table leads with the deadline", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    expect(
      seed,
      "the inbox fixture is null, so case 1 did not reach its seed. A null here is a failure of that " +
        "case, not of this one.",
    ).not.toBeNull();

    await logInAs(page, seed!.hostEmail);

    // ─── the mobile card, at the 320px floor ────────────────────────────────────────────────────────
    const card = await openInboxAt(page, 320);
    await expect(
      card.locator("a"),
      "D-144: an anchor is inside the request card. `RowCard`'s optional `href` stays UNUSED here — a " +
        "triage queue that browses is no longer a triage queue, and a second place carrying " +
        "approve/decline is a second place that has to be kept in agreement with this one. " +
        "`tests/host/request-row.test.tsx` asserts the same thing in jsdom; this is the browser half.",
    ).toHaveCount(0);
    await expect(
      card.getByRole("link"),
      "D-144: a link-role element is inside the request card.",
    ).toHaveCount(0);

    // ─── the desktop table ──────────────────────────────────────────────────────────────────────────
    const row = await openInboxAt(page, 1280);
    await expect(
      row.locator("a"),
      "D-144: an anchor is inside the desktop table's row.",
    ).toHaveCount(0);
    await expect(
      page.locator("table tbody").getByRole("link"),
      "D-144: a link-role element is inside the desktop table's body. No cell on this table becomes a " +
        "link; everything needed to decide is on the row.",
    ).toHaveCount(0);

    const headers = page.getByRole("columnheader");
    await expect(
      headers,
      "the inbox table does not render six column headers. The 14-06 reorder MOVED the cells with " +
        "their headers — it renamed none, added none and removed none, and `Actions` stays a real, " +
        "VISIBLE `<th scope=\"col\">`.",
    ).toHaveCount(6);
    await expect(
      headers.first(),
      "the FIRST column of the request inbox is not the deadline. HFLOW-01's own words put the SLA " +
        "countdown first, and the shipped order put it fifth of six. D-154's `no new information " +
        "architecture` rule is scoped to /host/bookings; this inbox is explicitly asked to lead with " +
        "the deadline.",
    ).toHaveAccessibleName("Expires");
  });

  test("(3) the 320px floor — what a capped row's status column costs the title", async ({ page }) => {
    test.setTimeout(120_000);

    expect(seed, "the inbox fixture is null — see case 2's note.").not.toBeNull();
    await logInAs(page, seed!.hostEmail);

    const card = await openInboxAt(page, 320);

    /**
     * A block's own box against the width its content WANTS.
     *
     * `scrollWidth` on an `overflow: hidden` block is the content's laid-out width, so the pair
     * (`box`, `natural`) reads directly as "how much room it got" against "how much it needed" — which
     * is the question `[14-03]` asks and the one a bare `boundingBox()` cannot answer. Measured on the
     * ELEMENT here rather than on a text node, deliberately: the reason line is three text nodes (see
     * case 1) and no single one of them is the sentence.
     */
    const box = (el: Locator) =>
      el.evaluate((node) => ({
        box: node.getBoundingClientRect().width,
        natural: (node as HTMLElement).scrollWidth,
      }));

    const titleEl = card.getByText(seed!.listingTitle, { exact: true });
    const reasonEl = card.getByText(/Session starts in .* — respond soon\./);
    await expect(titleEl, "320px: the card renders no space title").toHaveCount(1);
    await expect(
      reasonEl,
      "320px: the card renders no D-99 reason line, so this is not the capped row the fixture seeds " +
        "and `[14-03]`'s question is not being asked.",
    ).toHaveCount(1);

    /**
     * What an element would occupy if nothing squeezed it — its `max-content` width.
     *
     * `scrollWidth` cannot answer this for the countdown: its outer element is a BLOCK, so it already
     * fills its column and reports the column's width whatever its glyphs need. The element is cloned,
     * laid out off-screen at `width: max-content` with any inherited cap removed, measured and removed —
     * `tabular-figures.spec.ts`'s money probe, in miniature. The clone keeps its classes, so it is
     * measured in the real treatment rather than in a second author's guess at it.
     */
    const maxContentWidth = (el: Locator) =>
      el.evaluate((node) => {
        const probe = node.cloneNode(true) as HTMLElement;
        probe.style.position = "absolute";
        probe.style.left = "-10000px";
        probe.style.top = "0";
        probe.style.width = "max-content";
        probe.style.maxWidth = "none";
        document.body.appendChild(probe);
        const width = probe.getBoundingClientRect().width;
        probe.remove();
        return width;
      });

    const title = await box(titleEl);
    const reason = await box(reasonEl);
    const countdownEl = card.locator('[role="timer"]');
    const countdown = {
      box: (await box(countdownEl)).box,
      natural: await maxContentWidth(countdownEl),
    };
    const statusCol = await box(countdownEl.locator("xpath=../.."));

    // THE `[14-03]` MEASUREMENT, REPORTED. `row-card.tsx:200-210` renders the status/trailing column as
    // `shrink-0`, so it keeps its max-content width at every viewport and the `min-w-0 flex-1` title
    // column beside it absorbs the whole squeeze. The reason line is the widest thing that lands in that
    // column. These numbers are what the phase's deferred item asked for; they are printed rather than
    // pinned, because a pinned width would be an undeclared box measurement of exactly the kind
    // `measurements.ts` exists to prevent.
    console.log(
      `[MEASUREMENT 320px · deferred item 14-03] status column ${statusCol.box}px ` +
        `(content wants ${statusCol.natural}px) · countdown ${countdown.box}px ` +
        `(wants ${countdown.natural}px) · reason line ${reason.box}px ` +
        `(wants ${reason.natural}px) · space title ${title.box}px (wants ${title.natural}px)`,
    );

    // THE CAP DOES ITS JOB IN BOTH DIRECTIONS, and this is the half that stops "make the status column
    // narrower" being the answer to everything. The countdown is the one thing in that column that may
    // NOT wrap — a deadline broken across two lines is harder to read at a glance than the money it is
    // supposed to outrank — so the cap has to be at or above the countdown's own natural width. This
    // line is what a future tightening of `REQUEST_STATUS_CAP` fails on.
    expect(
      statusCol.box,
      `320px: the status column is ${statusCol.box}px and the countdown inside it needs ` +
        `${countdown.natural}px, so the deadline itself is now wrapping. \`REQUEST_STATUS_CAP\` has ` +
        `been tightened past the thing it exists to protect — the reason line is supporting text and ` +
        `may wrap; the countdown is the row's headline and may not.`,
    ).toBeGreaterThanOrEqual(countdown.natural);

    // The title must still be a title. A column squeezed to nothing is not "truncating hard" — it is
    // gone, and a row whose space cannot be identified is not a row a host can triage.
    expect(
      title.box,
      `320px: the space title's column was squeezed to ${title.box}px by the status column beside it — ` +
        `that column is ${statusCol.box}px and \`row-card.tsx\` makes it \`shrink-0\`, so the title ` +
        `pays for every pixel the D-99 reason line asks for. This is deferred item [14-03], and a ` +
        `title with no width is the outcome it asked to have measured rather than discovered.`,
    ).toBeGreaterThan(0);

    // 14-UI-SPEC's own falsifiable for this width: the table is `hidden md:block`, so the 320px
    // overflow claim is about the mobile cards. A status column that cannot shrink is exactly how a
    // card starts pushing the document sideways.
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(
      overflow.scrollWidth,
      `320px: the document scrolls horizontally (${overflow.scrollWidth} > ${overflow.clientWidth}). ` +
        `At the declared 320px floor (D-131) nothing on this surface may push the page sideways.`,
    ).toBeLessThanOrEqual(overflow.clientWidth);
  });
});
