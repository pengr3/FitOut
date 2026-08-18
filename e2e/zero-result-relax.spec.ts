import { expect, test, type Page } from "@playwright/test";

import { BASE, seedBookableListing, SPACE_TYPE_LABEL, type SeededListing } from "./helpers/booker-seed";
import { seedTheme } from "./helpers/theme";

// STATE-03 in a real browser (D-52 / D-53 · 12-UI-SPEC AC#29–AC#32) — a booker whose search returns
// nothing gets REAL alternatives, is told WHICH SINGLE THING gave, sees the control agree with the
// results, and can put it back.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE FIXTURE, AND WHY THE ORIGIN IS THE INTERESTING HALF
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// The shared Phase-12 fixture seeds a bookable listing at the Makati CBD origin. This spec searches from
// ALABANG — ~15.3 km south of it, the distance `tests/helpers/seed.ts` derives and states — so the
// seeded listing is BEYOND the 10 km default radius and INSIDE the 25 km preset above it. That single
// geometric fact is what makes rung 1 the rung that gives, and it is why the band's changed-constraint
// value is a distance rather than a price.
//
// The category is the fixture's own space type, which no dev seed uses. It narrows the catalogue to this
// seed's listings, and — decisively for case (d) — it is the ONE constraint the ladder may never relax.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT "DRIVE THE REAL SEARCH BAR" MEANS HERE, AND WHY THE ORIGIN ARRIVES IN THE URL
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `price-parity.spec.ts` is the analog and its idiom is copied verbatim: click `#search-category`, click
// the option by role, click `#search-submit`, wait on the resulting URL. The LOCATION is the one field
// that cannot be driven that way — it is a Google-Places autocomplete, and typing an address into it in
// a test would be asserting on a third-party network response rather than on this product. So the origin
// arrives as `?lat=&lng=`, which `(public)/page.tsx` validates through the same `searchParamsSchema` as
// every other param and which the bar then carries in its own form state. The CATEGORY and the SUBMIT —
// the two gestures that actually produce the zero-result query — are real clicks on the real bar.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — read this before trusting a green run
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • WHICH RUNG RAN. This spec measures the OUTCOME of the ladder — a band, cards, an agreeing control,
//     a working Undo. It cannot see whether rung 1 fired because rung 1 was correct or because the other
//     three happened to be inapplicable. Rung ORDER, stop-at-first-hit and the four-rung cap are
//     measured by invocation count in `tests/search/relaxation-ladder.test.ts`, which is the only place
//     they are checkable.
//   • THE STRING EQUALITY IN CASE (b) IS EXACT FOR THE RADIUS RUNG AND ONLY FOR IT. The radius `<Select>`
//     renders `{r} km`, byte-identical to the band's changed value. The other three controls render a
//     sentence-INITIAL placeholder ("Any price", "Any time", "Any date") while the band renders the same
//     words mid-sentence, so they agree in value and differ in letter case. Asserting the radius case
//     exactly is stronger than asserting four cases case-insensitively.
//   • THE BAND'S SURFACE AND THE CONTROL'S TINT. Both themes are driven, but nothing here reads a
//     computed colour. `tests/design/contrast.test.ts` owns the pairings; this spec asserts the
//     `data-relaxed` attribute, which is what the tint is keyed on.
//   • ONE RUNG, ONE SHAPE. An exhausted ladder (the `EmptyState` with its widened-search body) is
//     asserted in jsdom by `tests/search/search-results-states.test.tsx`, not here.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED REDS — both run against this spec, both reverted, `git diff --exit-code src/` clean after each
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// R1 — `relax=0` REMOVED from Undo's `pushWith` (`search-results.tsx`: `p.set("relax", "0")` →
//      `p.delete("relax")`), i.e. Undo restores the booker's original query and nothing else.
//      PREDICTED: case (c) red on the `relax=0` URL assertion.
//      OBSERVED: case (c) red, ONE STEP EARLIER than predicted — on the `waitForURL` that precedes it,
//      because the navigation Undo produced never contained the flag to wait for. VERBATIM:
//
//        × (c) Undo restores the booker's filters, carries relax=0, and unmounts the band · court (17.2s)
//        TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
//        =========================== logs ===========================
//        waiting for navigation until "load"
//          navigated to "http://localhost:3000/?lat=14.418&lng=121.04&category=martial_arts_boxing"
//        ============================================================
//
//      The prediction is left standing as written rather than rewritten to match. What matters is that
//      the log line PRINTS THE URL UNDO ACTUALLY PRODUCED — the booker's query, restored perfectly,
//      with no suppression flag — which names the cause exactly as the assertion below it would have.
//      The 15s cost is the price of the wait being the correct green-path synchronisation.
//
// R2 — `category` ALLOWED INTO RUNG 4's TRANSFORM (`relaxation.ts`, the `date` rung:
//      `{ ...p, date: undefined }` → `{ ...p, date: undefined, category: undefined }`).
//      PREDICTED: a case red, naming a card of the wrong category.
//      OBSERVED, FIRST RUN: every case in this file STAYED GREEN — and that is the finding that changed
//      the spec. As first written, its only fixture reached the band through RUNG 1, so rung 4 never
//      ran and a defect planted in it was invisible here. The mutation was caught one layer down, by
//      name (`npx vitest run tests/search/relaxation-ladder.test.ts` → 2 failed / 13 passed):
//
//        × no rung's transform touches `category` — asserted over the LADDER, not over one query
//        AssertionError: rung "date" changed the category. Someone searching for a badminton court will
//        not take a yoga studio.: expected undefined to be 'yoga_studio'
//        × returns null when the category has no supply — four rungs run, none gives
//        AssertionError: the ladder produced results for a category nothing in the catalogue carries,
//        which can only mean a rung dropped it.: expected { rung: 'date', …(3) } to be null
//
//      CASE (f) EXISTS BECAUSE OF THAT RUN. A beyond-horizon date with the radius already at the max
//      preset leaves rungs 1-3 with nothing to give, so rung 4 — the only transform in the ladder that
//      REMOVES a param outright, and therefore the one where "…and category too" is a one-word edit
//      that reads harmlessly — is reachable in a browser. Re-run under the same mutation:
//
//        × (f) rung 4 — the date gives, and the activity still does not · court
//        Error: rung 4 returned a listing of another activity. Dropping the DATE is the whole of what
//        that rung may do; dropping the activity with it is the all-at-once broadening this plan
//        deleted, re-entering through the cheapest rung (D-52).
//        Expected substring: "Martial arts / boxing gym"
//        Received string:    "Alabang Multi-Sport Court·Multi-sport court·0.0 km away·₱735.00/hr …"
//
//      Reverted; `git diff --exit-code src/` clean; 8 passed in both themes.
//      The residual is still worth stating: rungs 2 and 3 are NOT reachable from this fixture, so the
//      activity-survives-EVERY-rung claim remains `tests/search/relaxation-ladder.test.ts`'s, which
//      asserts it over the transforms themselves rather than over whatever a seeded catalogue happens
//      to expose.

const THEMES = ["court", "grove"] as const;

/**
 * Alabang — ~15.3 km south of the seeded listing's Makati origin.
 *
 * The number is not a guess: `tests/helpers/seed.ts` derives the great-circle distance from these exact
 * coordinates and states the margin, "well over 10 km", precisely so a within/beyond assertion cannot be
 * flipped by the spheroid-vs-sphere gap between PostGIS and a haversine.
 */
const ORIGIN = { lat: 14.418, lng: 121.04 };

/** The default preset the search opens on, and the one the band relaxes away from. */
const DEFAULT_RADIUS_LABEL = "10 km";

/** The four changed-constraint phrases the band can render, for the "exactly one" count in case (a). */
const RELAXED_PHRASES = [/within \d+ km/, /at any price/, /at any time on /, /on other days/];

const BAND = '[data-testid="search-relax-band"]';
const CARD = '[data-testid="result-card"]';

/** The three escape-hatch labels. Their absence on a cold start is half of D-54. */
const HATCHES = ["Broaden radius", "Clear filters", "Show nearby spaces"] as const;

/**
 * A venue-local day BEYOND `BOOKING_HORIZON_DAYS` (90) — the lever case (f) uses to reach rung 4.
 *
 * Nothing is bookable that far out, so the seeded listing survives Stage-1 (it has hours on all seven
 * weekdays) and is dropped by Stage-2 for every hour of that day. With the radius already at the max
 * preset and no price ceiling in play, rungs 1 and 2 have nothing to relax and rung 3 — which keeps the
 * date — comes back just as empty. Rung 4 drops the date, Stage-2 is skipped entirely, and the listing
 * appears. That is the ONLY rung this spec can reach besides the first, and reaching it is what gives
 * case (d)'s category claim teeth against the transform R2 mutates.
 */
const BEYOND_HORIZON_DATE = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

let seed: SeededListing;

test.beforeAll(async () => {
  seed = await seedBookableListing({ titlePrefix: "E2E Relax", photos: 1 });
});

test.afterAll(async () => {
  await seed.teardown();
});

/**
 * TRAP 1, the shared spine's: assert the route rendered ITS OWN surface before asserting anything about
 * it. Every assertion below is satisfied by a blank page, a redirect to `/login` or a 404.
 *
 * `#search-radius` is the tell rather than the `h1`, and the `toHaveCount(1)` is not a nicety: `/`
 * STREAMS and `(public)/loading.tsx` renders its own `SearchBar`, so while the boundary is resolving the
 * document holds TWO of every `#search-…` control and a bare locator fails Playwright's strict mode with
 * "resolved to 2 elements" — an error that reads like a duplicate id and is actually a race. Measured
 * and recorded in `e2e/helpers/booker-seed.ts`; this waits for the same thing, for the same reason, and
 * doubles as the reachability guard.
 */
async function expectSearchReachable(page: Page, where: string): Promise<void> {
  await expect(
    page.locator("#search-radius"),
    `${where}: \`/\` rendered no resolved search bar (or is still holding the streamed fallback's ` +
      "copy of it). Every assertion in this spec passes against a page with nothing on it, which is " +
      "why this runs first and is a failure rather than a skip.",
  ).toHaveCount(1, { timeout: 15_000 });
}

/** The radius control's RENDERED value string — `25 km`. The thing AC#30 compares, read from the DOM. */
async function radiusValue(page: Page): Promise<string> {
  return (await page.locator('#search-radius [data-slot="select-value"]').innerText()).trim();
}

/** Drive the REAL bar to the zero-result query: origin in the URL, category and submit by click. */
async function searchForSeededCategory(page: Page): Promise<void> {
  await page.goto(`${BASE}/?lat=${ORIGIN.lat}&lng=${ORIGIN.lng}`);
  await expectSearchReachable(page, "the origin-only search");

  const category = page.locator("#search-category");
  await expect(category).toHaveCount(1);
  await category.click();
  await page.getByRole("option", { name: SPACE_TYPE_LABEL }).click();
  await page.locator("#search-submit").click();
  await page.waitForURL(/category=martial_arts_boxing/);
  await expectSearchReachable(page, "the zero-result search");
}

test.describe("STATE-03 — a zero-result search names the one constraint that gave", () => {
  // Serial: the cases share one seeded listing and each drives a multi-step search. 90s rather than the
  // default 30s because the dev server compiles `/` on demand and every case waits on that route.
  test.describe.configure({ mode: "serial", timeout: 90_000 });

  for (const theme of THEMES) {
    test(`(a)(b)(d) the band, the agreeing control, and the surviving activity · ${theme}`, async ({
      page,
    }) => {
      await seedTheme(page.context(), theme);
      await searchForSeededCategory(page);

      // ── (a) THE BAND AND THE CARDS ───────────────────────────────────────────────────────────────
      const band = page.locator(BAND);
      await expect(
        band,
        "no relaxation band. The seeded listing sits ~15.3 km from this origin, so the 10 km search " +
          "MUST return nothing and rung 1 MUST find it at 25 km. A missing band here means either the " +
          "ladder did not run or a stale listing of this category is sitting inside 10 km.",
      ).toBeVisible();
      await expect(
        page.locator(CARD),
        "the band rendered with no cards behind it. A band is a claim that alternatives exist; " +
          "without them it is a sentence about nothing.",
      ).not.toHaveCount(0);

      // EXACTLY ONE relaxed constraint (AC#29) — a COUNT, not a presence. Asserted structurally,
      // because the band's TEXT legitimately contains two "within N km" phrases: line 1 names the
      // booker's own 10 km and line 2 names the relaxed 25 km. A textual count sees two and would be
      // red on correct markup.
      await expect(
        band.locator("[data-relax-changed]"),
        "the band names more (or fewer) than one relaxed constraint. D-52 relaxes ONE thing at a " +
          "time; a band naming two is describing a query the ladder did not run.",
      ).toHaveCount(1);

      // …and the textual half, scoped to the phrase element so the two readings agree.
      const changedText = (await band.locator("[data-relax-changed]").innerText()).trim();
      const matched = RELAXED_PHRASES.filter((re) => re.test(changedText));
      expect(
        matched,
        `the band's changed-constraint phrase "${changedText}" matches ${matched.length} of the four ` +
          "declared rung phrasings. Exactly one is the requirement.",
      ).toHaveLength(1);

      // ── (b) AGREEMENT (AC#30) — both strings READ FROM THE DOM ───────────────────────────────────
      // A comparison against a hardcoded "25 km" would pass on a page whose control still said 10 km,
      // which is the precise failure D-53 exists to prevent: a page whose control and whose results
      // disagree.
      const control = await radiusValue(page);
      const bandValue = (await band.locator("[data-relax-value]").innerText()).trim();
      expect(
        bandValue,
        `the band says the radius is "${bandValue}" and the control says "${control}". The booker is ` +
          "looking at results for one radius while the filter claims another — which is the failure " +
          "the moving control exists to prevent (D-53).",
      ).toBe(control);
      expect(
        control,
        "the control did not move at all — it is still showing the booker's own radius while the " +
          "results come from a wider one.",
      ).not.toBe(DEFAULT_RADIUS_LABEL);

      // The control the system changed is MARKED, which is what the soft-accent tone is keyed on.
      await expect(page.locator("#search-radius")).toHaveAttribute("data-relaxed", "radius");
      // …and no OTHER control is marked: exactly one thing moved, on the page as well as in the copy.
      await expect(
        page.locator("[data-relaxed]"),
        "more than one control is marked as relaxed. One constraint at a time is the whole of D-52.",
      ).toHaveCount(1);

      // ── (d) THE CATEGORY SURVIVES ────────────────────────────────────────────────────────────────
      // Asserted over EVERY card, before the relaxation is undone. The label is the space type the
      // fixture seeds and the card renders; a card of another type would name another label.
      const before = await page.locator(CARD).allInnerTexts();
      expect(before.length).toBeGreaterThan(0);
      for (const text of before) {
        expect(
          text,
          "a relaxed result is not the activity that was searched for. Someone searching for a " +
            "boxing gym will not take a yoga studio, and a page that swaps it has stopped answering " +
            "the question it was asked (D-52).",
        ).toContain(SPACE_TYPE_LABEL);
      }
    });

    test(`(c) Undo restores the booker's filters, carries relax=0, and unmounts the band · ${theme}`, async ({
      page,
    }) => {
      await seedTheme(page.context(), theme);
      await searchForSeededCategory(page);
      await expect(page.locator(BAND)).toBeVisible();

      // The relaxed state, read BEFORE the press so the restoration is a measured change rather than a
      // coincidence.
      const relaxedRadius = await radiusValue(page);
      expect(relaxedRadius).not.toBe(DEFAULT_RADIUS_LABEL);

      await page.getByRole("button", { name: "Undo" }).click();
      await page.waitForURL(/relax=0/, { timeout: 15_000 });
      await expectSearchReachable(page, "after Undo");

      expect(
        page.url(),
        "Undo did not put `relax=0` in the URL. Without the suppression flag the RSC simply relaxes " +
          "the restored query again — the band re-renders and Undo is a button that visibly does " +
          "nothing (T-12-12-UNDOLOOP).",
      ).toContain("relax=0");

      // THE BAND IS GONE — a COUNT of zero, not a `toBeHidden`, because "not visible" is also true of
      // a band that is still mounted behind a transition.
      await expect(
        page.locator(BAND),
        "the band survived Undo. Either the flag is not being honoured by the RSC or the ladder ran " +
          "again on the restored query.",
      ).toHaveCount(0);

      // …and it did not simply re-relax: the control is back on the booker's own value, and nothing on
      // the page is marked as changed.
      expect(
        await radiusValue(page),
        `the radius control reads "${await radiusValue(page)}" after Undo. The booker asked for ` +
          `${DEFAULT_RADIUS_LABEL}; restoring their query means restoring the control that shows it.`,
      ).toBe(DEFAULT_RADIUS_LABEL);
      await expect(page.locator("[data-relaxed]")).toHaveCount(0);

      // The booker's OWN filters are intact — Undo restores a query, it does not clear one.
      expect(page.url()).toContain("category=martial_arts_boxing");
      expect(page.url()).toContain(`lat=${ORIGIN.lat}`);
    });

    test(`(f) rung 4 — the date gives, and the activity still does not · ${theme}`, async ({ page }) => {
      await seedTheme(page.context(), theme);

      // WHY THIS ONE IS DRIVEN ENTIRELY FROM THE URL. Reaching rung 4 needs a day four months out, and
      // the date control is a popover calendar — clicking `next month` four times to arrange a fixture
      // would be asserting on `react-day-picker`'s navigation rather than on the ladder. Every param
      // here goes through the same `searchParamsSchema` the bar's own submit goes through; the bar is
      // still the thing under assertion, because what is checked below is that IT MOVED.
      await page.goto(
        `${BASE}/?lat=${ORIGIN.lat}&lng=${ORIGIN.lng}&category=martial_arts_boxing&radius=25` +
          `&date=${BEYOND_HORIZON_DATE}&start=09:00&end=11:00`,
      );
      await expectSearchReachable(page, "the beyond-horizon search");

      const band = page.locator(BAND);
      await expect(
        band,
        "no band on a beyond-horizon search. The radius is already at the max preset and no price " +
          "ceiling is set, so rungs 1 and 2 have nothing to relax; rung 3 keeps the date and finds the " +
          "same nothing; rung 4 is the one that must give.",
      ).toBeVisible();

      const changed = (await band.locator("[data-relax-changed]").innerText()).trim();
      expect(
        changed,
        `the band's changed constraint is "${changed}". A beyond-horizon date can only be answered by ` +
          "the DATE rung — if this says anything else, an earlier rung returned rows it should not have.",
      ).toMatch(/on other days/);
      await expect(band.locator("[data-relax-changed]")).toHaveCount(1);

      // The DATE control is the one marked, and it is the only one.
      await expect(page.locator("#search-date")).toHaveAttribute("data-relaxed", "date");
      await expect(page.locator("[data-relaxed]")).toHaveCount(1);

      // (d) AGAIN, ON THE RUNG THAT ACTUALLY DROPS SOMETHING. This is the assertion R2 mutates: rung 4
      // is the only transform in the ladder that removes a param outright, so it is the one where
      // "…and category too" is a one-word edit that looks harmless in review.
      const texts = await page.locator(CARD).allInnerTexts();
      expect(texts.length).toBeGreaterThan(0);
      for (const text of texts) {
        expect(
          text,
          "rung 4 returned a listing of another activity. Dropping the DATE is the whole of what that " +
            "rung may do; dropping the activity with it is the all-at-once broadening this plan " +
            "deleted, re-entering through the cheapest rung (D-52).",
        ).toContain(SPACE_TYPE_LABEL);
      }
    });

    test(`(e) cold start renders neither the band nor any escape hatch · ${theme}`, async ({ page }) => {
      await seedTheme(page.context(), theme);
      await page.goto(`${BASE}/`);
      await expectSearchReachable(page, "cold start");

      // D-54. The DOUBLE absence, and the reason it is double: "no band" alone is true of a page that
      // rendered nothing, and so is "no hatches". The reachability guard above is what makes both mean
      // something.
      await expect(
        page.locator(BAND),
        "a first load with no query rendered the relaxation band. There is nothing to relax when " +
          "nothing was asked for, and a band naming a widened radius would be describing work nobody " +
          "did (D-54).",
      ).toHaveCount(0);

      for (const hatch of HATCHES) {
        await expect(
          page.getByRole("button", { name: hatch }),
          `a first load with no query offered "${hatch}". Every hatch is a filter control, and ` +
            "offering one to someone who has set no filters is a button that cannot work (D-30/D-54).",
        ).toHaveCount(0);
      }

      await expect(
        page.locator("[data-relaxed]"),
        "a control is marked as relaxed on a page where no ladder ran.",
      ).toHaveCount(0);
    });
  }
});
