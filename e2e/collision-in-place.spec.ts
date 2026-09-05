import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { TZDate } from "@date-fns/tz";

import {
  BASE,
  VENUE_TZ,
  pickWindow,
  seedBookableListing,
  signUpBooker,
  targetDay,
  targetMonth,
  targetYear,
  type SeededListing,
} from "./helpers/booker-seed";
import { seedTheme } from "./helpers/theme";

// STATE-07 in a real browser (D-55 · 12-UI-SPEC AC#34–AC#37) — a booker who loses a race FAIRLY is told
// what happened, sees the corrected grid in the SAME PAINT, and has free windows outlined to take
// instead. Proved by a seeded conflict rather than asserted.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ THE MID-TEST SEEDING MECHANISM — THE ORDERING IS THE WHOLE FIXTURE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// The conflicting booking is inserted BETWEEN the booker's window selection and their `Book` click.
// That is the only ordering that actually races, and no other spec in this repository does it:
//
//   1. `pickWindow(page, …)` — the booker selects hours the grid currently shows as FREE;
//   2. `INSERT INTO booking (…) VALUES (…, 'confirmed')` over exactly those hours, from a SECOND seeded
//      booker, on this single-unit listing;
//   3. THEN the `Book` click.
//
// ⚠ IF THE INSERT RUNS BEFORE STEP 1 THE COLLISION NEVER HAPPENS, AND THE RED IT PRODUCES NAMES
// NOTHING. Probed rather than reasoned about (V1, plan 12-13): the INSERT was moved above `pickWindow`
// with a reload, and the run failed at **`locator.click: Test timeout of 120000ms exceeded`** — two
// minutes of waiting on a chip that renders struck-through and `disabled` on first paint, with no
// message anywhere naming the ordering as the cause. The spec would then be measuring
// `e2e/availability.spec.ts`'s fixture with extra steps. Reverted; 2 passed. This paragraph is the only
// warning a reader gets, which is why it is here rather than in a commit message.
//
// The `postgres.js` client stays OPEN for the whole file — `seedBookableListing()`'s `sql` handle is not
// closed until `teardown()` — precisely so step 2 can run from inside a test body. The INSERT statement
// itself is COPIED from `e2e/availability.spec.ts:124-127` (same columns, same `unit`, same
// `::booking_status` cast) rather than composed fresh: that spec is the only one that seeds a confirmed
// booking over a specific hour on a single-unit listing, and re-deriving the statement is how a fixture
// quietly stops occupying the hour it claims to.
//
// ONE CASE PER THEME, AND THE TWO USE DIFFERENT HOURS. Two confirmed bookings over the same window on
// the same single-unit listing is a `booking_no_overlap` violation, so the second theme's seed would
// throw inside `beforeAll`-less test code and read as a spec bug. Court takes 9–11 AM, grove takes
// 1–3 PM; both are inside the fixture's 06:00–21:00 hours and neither touches the other.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// TWO MEASURED CARVE-OUTS IN THE "EXACTLY ONE LIVE REGION" COUNT, BOTH NAMED AND BOTH NON-VACUOUS
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// 12-UI-SPEC AC#37 says "exactly ONE live region is mounted during the collision", counted as `status`
// PLUS `alert` across the whole document. Taken literally that is false of the shipped tree, for two
// reasons that predate this plan and have nothing to do with it:
//
//   1. `react-day-picker@9` RENDERS ITS MONTH CAPTION AS A LIVE REGION. Measured (plan 12-13):
//      `<span role="status" aria-live="polite">August 2026</span>`, `dist/esm/DayPicker.js:293`, on the
//      `CaptionLabel` element itself. It is mounted permanently on `/listings/[id]`, it is invisible to
//      GATE-03's source scan (that role is written inside a library), and `src/components/ui/calendar.tsx`
//      is byte-unchanged by contract (T-12-09-VENDORFORK) so there is nothing to edit even if it were
//      ours. It reports the MONTH and changes only when the month does.
//   2. THE NEXT DEV OVERLAY CARRIES ITS OWN `role="alert"`, inside `<nextjs-portal>`'s shadow root, and
//      Playwright's role queries PIERCE SHADOW DOM — so an unscoped `getByRole("alert")` returns 1 on
//      every page under `next dev`. Measured and recorded by plan 12-02 (`e2e/public-listing.spec.ts`
//      case (5)); the fix there was the same one used here, scoping to the `<main>` this route renders.
//
// So the count below is `status + alert` inside `main`, MINUS the named caption — and both exclusions
// are asserted to be non-vacuous (`main` resolves to exactly one element; the caption resolves to
// exactly one region) so the subtraction can never be zeros agreeing. The property that survives the
// narrowing is the one that was load-bearing all along: EXACTLY ONE LIVE REGION REPORTS THE COLLISION.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED REDS — both run against this spec, both reverted, `git diff --exit-code src/` clean after each
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// ⚠ BOTH REDS REPORT "1 failed / 1 did not run" RATHER THAN "2 failed", AND THAT IS THE `serial`
// MODE WORKING: the court case fails, and Playwright skips the grove case declared after it. Recorded
// so a reader does not mistake the missing second failure for a theme-specific defect.
//
// R1 — THE PROOF FOR PITFALL 3, AND THE REASON THIS FILE EXISTS AT ALL.
//      `src/components/booking/book-cta.tsx`: `await refreshDay();` REMOVED from the taken/sold-out
//      branch, leaving the shipped `router.refresh()` alone as the mechanism.
//      PREDICTED: case (a) red, because the notice appears over a grid that still shows the hours free.
//      OBSERVED: exactly that — 1 failed / 1 did not run. VERBATIM (court), the received side:
//
//        × the collision lands in place · court
//        Error: the notice is on screen but the grid under it has NOT caught up: the hours the booker
//        just lost are still selectable. `router.refresh()` merges the RSC payload without losing
//        client `useState`, and the day's slots ARE that state — so the grid it updates is not this
//        one (12-RESEARCH Pitfall 3). AC#34 asks for both in the SAME paint, which is why both are
//        read in one evaluate.
//        - Expected  - 6      + Received  + 6
//          "chips": Array [
//            Object {
//        -     "ariaDisabled": "true",      +     "ariaDisabled": null,
//        -     "disabled": true,            +     "disabled": false,
//              "found": true,   "label": "9:00 AM",
//        -     "lineThrough": "line-through",  +     "lineThrough": "none",
//            },   … the same six lines again for "10:00 AM" …
//          "notice": Object { "focused": true, "present": true, "visible": true }
//
//      READ THE `notice` HALF: present, visible AND FOCUSED. The notice was perfect and the grid under
//      it was a lie — which is exactly why the assertion reads both in ONE `page.evaluate`. Two awaited
//      Playwright assertions would each have retried until true and both would have been green.
//
//      THE BLAST RADIUS, MEASURED RATHER THAN ASSUMED. `npx playwright test
//      e2e/collision-in-place.spec.ts e2e/availability.spec.ts e2e/price-parity.spec.ts
//      --project=chromium` under R1: **5 passed / 1 failed / 1 did not run** — the failure is this
//      file's court case and the skip is its grove case. All four `availability.spec.ts` cases and the
//      CI-gated `price-parity.spec.ts` stayed GREEN under the mutation. Nothing else in the suite can
//      see the difference between `refreshDay()` and `router.refresh()`, which is the whole argument
//      for this file existing.
//      Reverted (`git diff --exit-code src/` clean) → 2 passed.
//
// R2 — RULE 6. `book-cta.tsx`'s plain notice rendered ALONGSIDE the collision notice
//      (`{notice && collision === null && (` → `{notice && (`), plus `setNotice(result.error)` moved
//      above the branch guard so there is something for it to render.
//      PREDICTED: case (c) red with a total of 2.
//      OBSERVED, SECOND INVOCATION: exactly that — 1 failed / 1 did not run, in 6.2s. VERBATIM:
//
//        × the collision lands in place · court
//        Error: 2 live regions are reporting ONE outcome. `book-cta`'s plain notice must UNMOUNT when
//        the collision notice mounts — the vendored month caption is already excluded by name, so this
//        number is regions that are ABOUT THE COLLISION (rule 6 / AC#37).
//        expect(received).toBe(expected)
//        Expected: 1
//        Received: 2
//
//      ⚠ THE FIRST INVOCATION OF R2 FAILED SOMEWHERE ELSE, AND THAT IS A FINDING ABOUT THIS SPEC
//      RATHER THAN ABOUT THE MUTATION. It timed out at step 3 with the notice at 0 elements, after
//      36.6s — a 30s wait — on a run otherwise identical to one that had just taken 6.2s. The `Book`
//      click had been LOST: the listing page is server-rendered, so that control is clickable before
//      React attaches its handler. The retry now wrapped around step 3 is the fix, and the reason it
//      is written as a poll is recorded there. Without it this spec is an intermittent red in the full
//      suite whose failure reads as a product defect.
//      Reverted (`git diff --exit-code src/` clean) → 2 passed.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — read this before trusting a green run
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • WHETHER THE NOTICE READS AS **CALM** RATHER THAN AS A FAILURE. That is the one thing this file
//     cannot decide. It asserts the mechanical half — no error token in the class list, no alert role,
//     no constraint code anywhere in the document, a coral edge rather than a red one — and every one
//     of those is satisfiable by markup that still feels like a telling-off. The calibration artefact is
//     `.planning/sketches/006-collision-in-place/`'s "What it must never become" section, which renders
//     the red version WITH the real constraint text, and comparing against it is a HUMAN act. Routed to
//     UAT; do not add a fake assertion here that claims to have done it.
//   • WHETHER A SCREEN READER SPEAKS THE NOTICE ONCE, AND BEFORE THE MOVED FOCUS. Announcement is
//     browser + AT behaviour, not a DOM property. What is checkable is the region COUNT and the focus
//     target, and that is what is checked. The listening test is Phase 17's.
//   • THE DROP-IN TWIN (`sold-out`) IS NOT DRIVEN HERE. It shares one component, one grammar and one
//     live region, and it is asserted in jsdom by `tests/availability/date-pass-picker.test.tsx` case
//     (7). Driving it in a browser needs a seeded `open_capacity` listing whose day is one pass from
//     full, which is `e2e/open-capacity.spec.ts`'s fixture and not this one's.
//   • ONE VIEWPORT. Both cases run at the project's default width, where the RAIL is the surface that
//     holds the price. At 375px that surface is the sticky bar and the sheet, and whether the collision
//     notice is reachable from there is `e2e/mobile-booker-path.spec.ts`'s question.

const THEMES = ["court", "grove"] as const;

/** The two-hour windows each theme's case books and then loses. Disjoint — see the header. */
const WINDOWS = {
  court: { startLabel: "9:00 AM", endLabel: "10:00 AM", from: 9, to: 11, named: "9:00–11:00 AM" },
  grove: { startLabel: "1:00 PM", endLabel: "2:00 PM", from: 13, to: 15, named: "1:00–3:00 PM" },
} as const;

const NOTICE = '[data-testid="collision-notice"]';
const RAIL_TOTAL = '[data-testid="rail-price-total"]';

/** The vendored month caption's own class — the named carve-out, never a blanket "ignore some". */
const VENDORED_CAPTION = 'main .rdp-caption_label[role="status"]';

/** The exclusion-constraint SQLSTATE, assembled rather than written, so this file is not itself a hit. */
const CONSTRAINT_CODE = `23P${"0"}1`;

/** A UTC instant for `hour:00` venue-local on the fixture's target day, normalised through the epoch. */
function utcAt(hour: number): Date {
  return new Date(new TZDate(targetYear, targetMonth - 1, targetDay, hour, 0, 0, VENUE_TZ).getTime());
}

let seed: SeededListing;
/** The RIVAL booker — the person who gets the slot. A real `user` row, because `booker_id` is a FK. */
const rivalId = `e2e_collide_rival_${randomUUID()}`;

test.beforeAll(async () => {
  seed = await seedBookableListing({ titlePrefix: "E2E Collision", photos: 1, unitCount: 1 });
  await seed.sql`
    INSERT INTO "user" (id, name, email, email_verified, first_name, can_host, can_book, created_at, updated_at)
    VALUES (
      ${rivalId}, ${"E2E Collision Rival"}, ${`${rivalId}@example.com`}, ${true},
      ${"Rival"}, ${false}, ${true}, now(), now()
    )
  `;
});

test.afterAll(async () => {
  // ORDER IS LOAD-BEARING, and this file needs one more step than the shared fixture's teardown does.
  // `booking.booker_id` is `ON DELETE RESTRICT`, so the mid-test conflict rows must go BEFORE the rival
  // user that owns them — and `notification.booking_id` references the bookings, so those go first
  // again. `teardown()` then removes the host (cascading to the listing, its photos and its hours) and
  // the booker signed up through the UI, and ends the connection.
  await seed.sql`DELETE FROM notification WHERE booking_id IN (SELECT id FROM booking WHERE listing_id = ${seed.listingId})`;
  await seed.sql`DELETE FROM booking WHERE listing_id = ${seed.listingId}`;
  await seed.sql`DELETE FROM "user" WHERE id = ${rivalId}`;
  await seed.teardown();
});

/**
 * TRAP 1, the shared spine's: assert the route rendered ITS OWN surface before asserting anything about
 * it. Every assertion below is also satisfied by a blank page, a redirect to `/login` or a 404 — and
 * three of them are ABSENCES, which such a page satisfies perfectly and permanently.
 *
 * The month grid is the tell rather than the `<h1>`, because the grid is the control this whole spec is
 * about and `(detail)/loading.tsx` renders a plate in its place while the route is still resolving.
 */
async function expectListingReachable(page: Page, where: string): Promise<void> {
  await expect(
    page.locator('main [data-slot="calendar"]'),
    `${where}: /listings/[id] rendered no resolved month grid. Every absence asserted in this spec ` +
      "passes against a page with nothing on it, which is why this runs first and is a failure rather " +
      "than a skip.",
  ).toHaveCount(1, { timeout: 15_000 });
}

test.describe("STATE-07 — a lost race becomes a result, in place", () => {
  // Serial: the two cases share one seeded listing and one signed-up booker, and each drives the whole
  // booker path. 120s rather than the default because the dev server compiles this route on demand.
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  for (const theme of THEMES) {
    const win = WINDOWS[theme];

    test(`the collision lands in place · ${theme}`, async ({ page }) => {
      await seedTheme(page.context(), theme);
      await signUpBooker(page, seed);

      await page.goto(`${BASE}/listings/${seed.listingId}`);
      await expectListingReachable(page, "the listing before the race");

      // ── STEP 1: THE BOOKER SELECTS HOURS THE GRID SHOWS AS FREE ────────────────────────────────
      await pickWindow(page, win.startLabel, win.endLabel);
      const bookButton = page.getByRole("button", { name: /^Book(?: this space| · )/ });
      await expect(bookButton).toHaveCount(1);
      await expect(
        bookButton,
        "the hold CTA is disabled, so the window never registered and there is nothing to lose. The " +
          "seeded conflict below would then be inserted over hours nobody selected.",
      ).toBeEnabled();
      // GUARD THE GUARD: the price the collision has to remove really is on the rail first. Without
      // this, case (e)'s absence assertion is also true of a rail that never priced anything.
      await expect(page.locator(RAIL_TOTAL)).toHaveCount(1);

      // ── STEP 2: SOMEBODY ELSE TAKES IT, MID-TEST ──────────────────────────────────────────────
      // Copied from `e2e/availability.spec.ts:124-127` — same columns, same `unit`, same cast. On a
      // single-unit listing a `confirmed` booking over these instants makes the hours fully booked, and
      // the GiST `EXCLUDE` will refuse the booker's hold a moment from now.
      await seed.sql`
        INSERT INTO "booking" (id, listing_id, unit, booker_id, starts_at, ends_at, status, created_at)
        VALUES (${randomUUID()}, ${seed.listingId}, ${1}, ${rivalId}, ${utcAt(win.from)}, ${utcAt(win.to)}, ${"confirmed"}::booking_status, now())
      `;

      // ── STEP 3: THE CLICK THAT LOSES — RETRIED ────────────────────────────────────────────────
      // ⚠ THE RETRY IS A MEASURED REQUIREMENT, NOT A HEDGE, AND IT IS THIS REPOSITORY'S FOURTH
      // SIGHTING OF THE SAME SHAPE (`openBookingSheet`, `reduced-motion.spec.ts`'s `advanceMonth`,
      // `shell.spec.ts:558`). The listing page is server-rendered, so `Book this space` EXISTS and is
      // clickable well before React has attached its handler; under load the click lands on a node
      // that is not yet interactive and the event is LOST, NOT QUEUED — so waiting for the notice
      // afterwards hangs until the timeout on a page with nothing wrong with it.
      //
      // MEASURED HERE, on watched red R2's first invocation: 36.6s (a 30s timeout) with the notice at
      // 0 elements and the run otherwise identical to one that had just taken 6.2s. Re-run with no
      // change, the same mutation reddened at case (c) in 6.2s as predicted. Without this retry the
      // spec is an intermittent red in the full suite, and its failure would read as a product defect.
      //
      // RETRYING IS SAFE HERE AND WOULD NOT BE ON A GREEN PATH: every submit in this case is REFUSED,
      // so no click can mint a hold. The poll bails out the moment the URL leaves the listing, which
      // is what a granted hold looks like — and that is a fixture failure, not something to retry
      // through.
      await expect
        .poll(
          async () => {
            if ((await page.locator(NOTICE).count()) > 0) return "notice";
            if (!page.url().includes(`/listings/${seed.listingId}`)) return "navigated";
            await bookButton.click({ timeout: 5_000 }).catch(() => {});
            return (await page.locator(NOTICE).count()) > 0 ? "notice" : "pending";
          },
          {
            timeout: 45_000,
            message:
              "no collision notice. Either the hold SUCCEEDED — in which case the mid-test insert " +
              "did not occupy the hours the booker picked, and the fixture is measuring nothing — " +
              "or the refusal took the plain-notice branch instead of D-55's. The click is retried " +
              "because a server-rendered control is clickable before it is interactive (see the note " +
              "above); a persistent failure here is not a lost click.",
          },
        )
        .toBe("notice");

      // The URL must not have moved: a successful hold redirects to checkout, and every assertion
      // below would then be about the wrong page. Asserted separately from the poll so a granted hold
      // reports itself rather than reading as a missing element.
      expect(page.url(), "the hold was granted — the seeded conflict did not take").toContain(
        `/listings/${seed.listingId}`,
      );

      // ── POST-CONDITION: THE DAY PANEL HAS RE-RENDERED ITS CHIPS ──────────────────────────────
      // ⚠ THIS WAIT IS A MEASURED REQUIREMENT, NOT A HEDGE, AND IT ASSERTS PRESENCE ONLY — never
      // state. It is the fifth sighting in this repository of "the observable state the next step
      // depends on, asserted before proceeding" (`openBookingSheet`, `reduced-motion.spec.ts`'s
      // `advanceMonth`, `shell.spec.ts:558`, and step 3's own retry above).
      //
      // MEASURED, 19.1-04 Task 3, recorded verbatim in
      // `.planning/phases/19.1-…/evidence/triage-collision-in-place.txt` section 6. The court variant
      // failed at the evaluate below with the SAME message CI recorded for this spec — "the hours the
      // booker just lost are still selectable" — and then passed on retry. But the RECEIVED value
      // refutes that message: both chips came back `found: false`, not `found: true, disabled:
      // false`. They were ABSENT, not stale. `router.refresh()` puts the day panel through its
      // loading state and remounts the picker (the `pickerKey` collision suffix in
      // `availability-calendar.tsx`), so for a beat after the notice mounts the grid holds no hour
      // chips at all — and the one synchronous evaluate below can land in that beat.
      //
      // THIS DOES NOT WEAKEN AC#34, AND THE DISTINCTION IS THE WHOLE POINT. The defect the evaluate
      // exists to catch is a grid that CAME BACK still offering the lost hours; that grid mounts its
      // chips, so it satisfies this post-condition and is then failed by the evaluate exactly as
      // before. What this removes is only the race against an empty intermediate frame, which is a
      // loading state rather than a claim about availability. A grid that never re-mounts its chips
      // fails HERE, with this sentence, instead of one floor down wearing a message about staleness
      // that its own received value contradicts.
      await expect(
        page.getByRole("button", { name: new RegExp(`^${win.startLabel}`) }),
        `the day panel never re-rendered its hour chips after the refusal: no \`${win.startLabel}\` ` +
          "chip is mounted at all. That is NOT the stale-grid defect the assertion below is about — " +
          "a stale grid still mounts its chips — it is a grid that emptied and did not come back, " +
          "which would mean the collision refresh left the booker with no hours on a day that has " +
          "them. Read the trace before touching the evaluate below.",
      ).toHaveCount(1, { timeout: 15_000 });

      // ── (a) SAME PAINT + (b) FOCUS, READ IN ONE `page.evaluate` ───────────────────────────────
      // ⚠ ONE EVALUATE IS THE ASSERTION. Two awaited Playwright expectations would each retry until
      // true and would be perfectly green against a notice that arrived a beat BEFORE the grid caught
      // up — which is the exact defect `router.refresh()` produces (12-RESEARCH Pitfall 3, watched red
      // R1). A single synchronous read of the live DOM cannot be satisfied by a later frame.
      const paint = await page.evaluate((labels) => {
        const notice = document.querySelector('[data-testid="collision-notice"]');
        const buttons = Array.from(document.querySelectorAll("main button"));
        return {
          notice: {
            present: notice !== null,
            visible: notice !== null && notice.getBoundingClientRect().height > 0,
            focused: notice !== null && document.activeElement === notice,
          },
          chips: labels.map((label) => {
            const el = buttons.find((b) => (b.getAttribute("aria-label") ?? "").startsWith(label));
            return {
              label,
              found: el !== undefined,
              disabled: el instanceof HTMLButtonElement ? el.disabled : false,
              ariaDisabled: el?.getAttribute("aria-disabled") ?? null,
              lineThrough: el === undefined ? "none" : getComputedStyle(el).textDecorationLine,
            };
          }),
        };
      }, [win.startLabel, win.endLabel]);

      expect(
        paint,
        "the notice is on screen but the grid under it has NOT caught up: the hours the booker just " +
          "lost are still selectable. `router.refresh()` merges the RSC payload without losing client " +
          "`useState`, and the day's slots ARE that state — so the grid it updates is not this one " +
          "(12-RESEARCH Pitfall 3). AC#34 asks for both in the SAME paint, which is why both are read " +
          "in one evaluate.",
      ).toEqual({
        // (b) FOCUS — the mechanism that earns the absence of `assertive` (GATE-03 rule 7).
        notice: { present: true, visible: true, focused: true },
        chips: [win.startLabel, win.endLabel].map((label) => ({
          label,
          found: true,
          disabled: true,
          ariaDisabled: "true",
          lineThrough: "line-through",
        })),
      });

      // ── (c) EXACTLY ONE LIVE REGION REPORTS THE COLLISION ─────────────────────────────────────
      // Summed across BOTH roles, not counted per selector. The two carve-outs and their measurements
      // are in this file's header; both are asserted non-vacuous first.
      await expect(page.locator("main"), "no <main> to scope the region count to").toHaveCount(1);
      await expect(
        page.locator(VENDORED_CAPTION),
        "the vendored month caption is no longer a `role=\"status\"` region, so the subtraction below " +
          "is excluding nothing and the number it produces means something different from what it says.",
      ).toHaveCount(1);

      const statuses = await page.locator("main").getByRole("status").count();
      const alerts = await page.locator("main").getByRole("alert").count();
      const captions = await page.locator(VENDORED_CAPTION).count();
      expect(
        statuses + alerts - captions,
        `${statuses + alerts - captions} live regions are reporting ONE outcome. \`book-cta\`'s plain ` +
          "notice must UNMOUNT when the collision notice mounts — the vendored month caption is " +
          "already excluded by name, so this number is regions that are ABOUT THE COLLISION " +
          "(rule 6 / AC#37).",
      ).toBe(1);

      // ── (d) CALM — no error token, no alert role, and no constraint code ANYWHERE ─────────────
      const notice = page.locator(NOTICE);
      const noticeClass = (await notice.getAttribute("class")) ?? "";
      expect(
        noticeClass,
        "the collision notice is wearing the error recipe. Occupancy is a normal state: losing a race " +
          "fairly is not this booker's fault and must never be painted as a failure (12-UI-SPEC AC#35).",
      ).not.toContain("destructive");
      expect(await notice.getAttribute("role")).toBe("status");

      // `e2e/error-leak.spec.ts`'s idiom, borrowed rather than re-invented: the document split into
      // what a person receives and what the framework's dev instrumentation carries, measured IN the
      // page. The claim here is STRONGER than that spec's — the constraint code is mapped to a sentence
      // inside `units.ts` and never crosses the server boundary at all, so its count is zero in EVERY
      // channel, including the flight payload that legitimately carries dev-only error text.
      const doc = await page.evaluate(() => {
        const clone = document.documentElement.cloneNode(true) as HTMLElement;
        let scriptText = "";
        for (const el of Array.from(clone.querySelectorAll("script"))) {
          scriptText += el.textContent ?? "";
          el.remove();
        }
        for (const el of Array.from(clone.querySelectorAll("nextjs-portal"))) el.remove();
        return {
          whole: document.documentElement.outerHTML,
          rendered: clone.outerHTML,
          scriptText,
          innerText: document.body.innerText,
        };
      });
      const occurrences = (haystack: string) => haystack.split(CONSTRAINT_CODE).length - 1;
      expect(
        occurrences(doc.rendered),
        "the exclusion-constraint SQLSTATE reached the rendered document. `mapBookingError` exists to " +
          "turn it into a calm sentence precisely so it never travels; an internal constraint name in " +
          "front of a booker is an information leak AND a blame-the-user calibration failure " +
          "(T-12-13-CONSTRAINTLEAK).",
      ).toBe(0);
      expect(occurrences(doc.innerText), "the visible text carries the constraint code").toBe(0);
      expect(
        occurrences(doc.whole),
        "the constraint code is somewhere in the document but outside the rendered markup — a script, " +
          "an attribute, the framework's flight payload. It never crosses the server boundary at all, " +
          "so every channel's count is zero.",
      ).toBe(0);
      expect(occurrences(doc.scriptText)).toBe(0);

      // The named line restates the BOOKER'S OWN selection, in the VENUE's zone (D-55's departure).
      await expect(notice).toContainText(`${win.named} was just taken`);

      // ── (e) THE RAIL DROPPED ITS SELECTION AND ITS PRICE ──────────────────────────────────────
      await expect(
        page.getByText("No time selected"),
        "the rail did not fall back to the contract's no-selection line after the collision.",
      ).toBeVisible();
      await expect(
        page.locator(RAIL_TOTAL),
        "the rail is still showing a total for a window the server just refused. A stale price beside " +
          "an unbookable window is a number the system cannot stand behind (T-12-13-STALEPRICE / AC#36).",
      ).toHaveCount(0);

      // ── (f) THE ALTERNATIVES ARE OUTLINED IN THE GRID THE BOOKER IS ALREADY LOOKING AT ────────
      // Read as a COMPUTED colour rather than as a class string: a class review passes on a rule that
      // never made it into the compiled stylesheet, which is the shape 12-09 measured at 25.08px.
      const outline = await page.evaluate(() => {
        const chips = Array.from(document.querySelectorAll<HTMLButtonElement>("main button")).filter(
          (b) => /^\d{1,2}:\d{2} (AM|PM)$/.test(b.getAttribute("aria-label") ?? ""),
        );
        const marked = chips.filter((b) => b.classList.contains("border-brand"));
        const plain = chips.find((b) => !b.classList.contains("border-brand"));
        return {
          free: chips.length,
          marked: marked.length,
          markedColour: marked[0] === undefined ? null : getComputedStyle(marked[0]).borderTopColor,
          plainColour: plain === undefined ? null : getComputedStyle(plain).borderTopColor,
        };
      });
      expect(
        outline.free,
        "no selectable hours left on this day at all, so there is nothing for the notice's `the " +
          "closest free windows are outlined` to point at and case (f) proves nothing.",
      ).toBeGreaterThan(0);
      expect(
        outline.marked,
        "the refreshed grid outlines no free window. The notice tells the booker the closest free " +
          "windows are outlined; a notice that names an affordance the grid does not render is the " +
          "fabricated-fact failure the copy rules forbid.",
      ).toBeGreaterThanOrEqual(1);
      expect(
        outline.marked,
        "more than two windows are outlined. Two is the whole of accent item 10 — an accent on every " +
          "free hour is not a pointer, it is a repaint.",
      ).toBeLessThanOrEqual(2);
      expect(
        outline.markedColour,
        "the outlined window's border resolves to the same colour as an ordinary chip's, so the " +
          "highlight is in the class string and not in the compiled stylesheet.",
      ).not.toBe(outline.plainColour);
    });
  }
});
