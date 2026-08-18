// BFLOW-03 / D-45 — EVERY CLAIM THE LIGHTBOX MAKES, MEASURED IN A REAL BROWSER.
//
// Analog: `e2e/public-listing.spec.ts` — the smallest, cleanest seeded-listing spec in the repo. Same
// spine: serial mode with its recorded reason, `seedTheme` on the CONTEXT before the first `goto`, a
// reachability guard that runs before anything else, and a NOT-COVERED footer.
//
// The seed is the SHARED Phase-12 fixture (`e2e/helpers/booker-seed.ts`, plan 12-03) at EIGHT photos —
// the count that makes every assertion here non-vacuous. Eight is more than the wide mosaic's five, so
// `Show all 8 photos` renders; it is more than one, so the counter has somewhere to go; and it is the
// top of the range the seed data actually produces.
//
// Broken image `src` is fine and is not a shortcut: `e2e/price-parity.spec.ts:138` records that "the
// `<img>` exists" is all these assertions need. Nothing here reads a pixel of a photograph.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// HOW THE CONTROLS ARE ADDRESSED, AND WHY IT IS NEVER A DOM PATH
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// A mosaic cell's trigger has NO `aria-label`: its accessible name comes from the nested image's `alt`,
// which reads `{title} — photo {i} of 8`. That is the standard image-button pattern and it is what makes
// `getByRole("button", { name })` the right handle here — the query and the screen reader are reading
// the same string, so an assertion that passes is also evidence the control is announceable. The focus
// -return case leans on exactly that: `toBeFocused()` on a locator resolved BY NAME is the assertion
// "focus came back to the control the booker pressed", with no reference to where it sits in the tree.
//
// The counter is read as RENDERED TEXT (`3 / 8`), never as an attribute and never as an internal index.
// A test that asks the component which photo it thinks is active cannot fail when the component is
// wrong about it.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED REDS — both run against this spec, both reverted, tree clean after each
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   (1) THE CLOSE NAME REGRESSES TO THE VENDORED DEFAULT. `photo-lightbox.tsx`'s `Close photos` changed
//       back to `Close`, the string the vendored `DialogContent` ships. Run isolated to case (e) —
//       against the whole file the mutation first trips case (a), which CLOSES the dialog through that
//       control, and a timeout tells you much less than this does:
//
//         Error: the lightbox's close control is not named `Close photos`
//         expect(locator).toHaveCount(expected) failed
//         Locator:  getByTestId('photo-lightbox').getByRole('button', { name: 'Close photos', exact: true })
//         Expected: 1
//         Received: 0
//
//       Both the expected name and the actual count are in the message, and the locator line prints the
//       name that was looked for. Reverted → 14 passed.
//
//   (2) THE ARROW HANDLER MOVES TO `window`. The probe worth reading, because it caught the negative
//       case being VACUOUS and it took two corrections to make it real.
//
//       FIRST CORRECTION — the criterion's own spelling cannot fail. This plan asked for "arrows
//       pressed with the dialog CLOSED do not change the mosaic". The mosaic does not reflect
//       `activeIndex` in EITHER implementation, and `openAt(i)` sets the index explicitly on every open,
//       so a leaked index is overwritten before anything can observe it. The window listener really does
//       mutate state while the dialog is closed; that state is simply unobservable from the outside. So
//       case (b2) asks a different question: what the leak does to THE REST OF THE PAGE. A `window`
//       keydown handler calls `preventDefault()` on every arrow press anywhere on the route — with no
//       dialog open, on a page that also renders a month grid and a scrollable document.
//
//       SECOND CORRECTION, AND IT IS THE ONE WORTH THE WORDS — THE FIRST VERSION OF THAT WAS GREEN
//       AGAINST THE MUTATION TOO. `openListing()` then dispatch: 4 passed, with a `window` listener that
//       was demonstrably live, because case (b) was paging on it in the SAME RUN. The dispatch was
//       racing HYDRATION. Straight after `goto` the island's JavaScript has not run, so nothing is
//       listening for keys yet and the event comes back unprevented no matter where the handler was
//       written — a green that had nothing to do with the property. Opening and closing the dialog
//       first is the guard, because both halves require the island to be live. With it:
//
//         Error: an ArrowRight dispatched on the closed listing page came back defaultPrevented, which
//         means something is listening for arrow keys above the dialog content. The lightbox's handler
//         belongs on the dialog CONTENT, which is not mounted while it is closed (T-12-07-KEYLEAK).
//         Expected: false
//         Received: true
//
//       Reverted → 14 passed. The general lesson, and it is the third time this repository has recorded
//       this shape: an ABSENCE assertion on a hydrated page must first prove the page is hydrated, or it
//       measures the gap before hydration instead of the property.

import { test, expect, type Page } from "@playwright/test";

import { seedBookableListing, BASE, type SeededListing } from "./helpers/booker-seed";
import { seedTheme } from "./helpers/theme";
// Imported from the provider rather than retyped as `["court", "grove"]`, for `helpers/theme.ts`'s own
// reason: a locally-declared list that drifts from the provider's makes a two-theme run silently audit
// one theme twice while reporting full coverage.
import { THEMES } from "../src/components/theme/theme-provider";

/** Eight photos: more than the wide mosaic's five, so every assertion below has somewhere to go. */
const PHOTO_COUNT = 8;

let seed: SeededListing;

// Run this file's tests in ONE worker, sequentially. Copied from `public-listing.spec.ts:108-112` with
// its reason: with `fullyParallel` these fast tests distribute across workers, each re-running the seed
// and the teardown, and that open/close churn intermittently drops the postgres client mid-query.
test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  seed = await seedBookableListing({ photos: PHOTO_COUNT, titlePrefix: "E2E Lightbox" });
});

test.afterAll(async () => {
  await seed.teardown();
});

/**
 * TRAP 1, the shared spine's reachability guard (`e2e/overflow-320.spec.ts:341-353`).
 *
 * Every assertion in this file is "a thing is visible", "a thing reads X" or "a thing is absent", and a
 * blank page, a 404 and a redirect to /login all satisfy the third kind — and the first two fail in a
 * way that reads like a component defect rather than like a page that never arrived. This names a
 * selector only THIS route produces and runs before anything else. The 15s timeout is copied too: it is
 * a measured allowance for the dev server's on-demand compiles, not a hedge.
 */
async function openListing(page: Page): Promise<void> {
  await page.goto(`${BASE}/listings/${seed.listingId}`);
  await expect(
    page.getByRole("heading", { name: seed.title }),
    "the listing route rendered no title heading, so it is not the surface these cases assert about",
  ).toBeVisible({ timeout: 15_000 });
}

/** The lightbox itself. The hook exists because a role query cannot say WHICH dialog — see GATE-04. */
function lightbox(page: Page) {
  return page.getByTestId("photo-lightbox");
}

/**
 * A mosaic cell's trigger, addressed by the accessible name the booker's screen reader announces.
 *
 * `position` is 1-based, matching the string. Only the first five cells render in the mosaic; the rest
 * are reachable through the dialog, which is the whole point of the button.
 */
function cell(page: Page, position: number) {
  return page.getByRole("button", {
    name: `${seed.title} — photo ${position} of ${PHOTO_COUNT}`,
    exact: true,
  });
}

/**
 * The counter, read as RENDERED TEXT.
 *
 * The anchored regex is what keeps this on the counter itself rather than on an ancestor: the chrome
 * row's own text content also contains "3 / 8", but it contains the three `sr-only` control names
 * around it too, so it cannot match a pattern anchored at both ends.
 */
function counter(page: Page) {
  return lightbox(page).getByText(/^\d+ \/ \d+$/);
}

for (const theme of THEMES) {
  test.describe(`the photo lightbox · ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      // On the CONTEXT and before the first `goto`, so next-themes' pre-paint script applies the theme
      // on the very first paint rather than swapping it in after one.
      await seedTheme(page.context(), theme);
    });

    // ─────────────────────────────────────────────────────────────────────────────────────────────────
    // (a) IT OPENS ON THE PHOTO THAT WAS TAPPED — the whole of D-45's first clause.
    // ─────────────────────────────────────────────────────────────────────────────────────────────────
    test("(a) opens on the tapped photo, on the hero, and on photo 1 from the button", async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await openListing(page);

      // The mosaic is up before anything is clicked, and it is showing five of eight.
      await expect(cell(page, 1)).toBeVisible();
      await expect(lightbox(page)).toHaveCount(0);

      // CELL 3 → 3 / 8. This is the assertion the requirement is really about: a lightbox that always
      // opened on the cover would pass every other case in this file.
      await cell(page, 3).click();
      await expect(lightbox(page)).toBeVisible();
      await expect(
        counter(page),
        "the lightbox opened on a different photo than the one that was clicked",
      ).toHaveText(`3 / ${PHOTO_COUNT}`);

      await page.getByRole("button", { name: "Close photos", exact: true }).click();
      await expect(lightbox(page)).toHaveCount(0);

      // THE HERO → 1 / 8.
      await cell(page, 1).click();
      await expect(counter(page)).toHaveText(`1 / ${PHOTO_COUNT}`);
      await page.getByRole("button", { name: "Close photos", exact: true }).click();
      await expect(lightbox(page)).toHaveCount(0);

      // THE BUTTON → 1 / 8. It is a way INTO the set, not a jump to its end.
      await page
        .getByRole("button", { name: `Show all ${PHOTO_COUNT} photos`, exact: true })
        .click();
      await expect(counter(page)).toHaveText(`1 / ${PHOTO_COUNT}`);
    });

    // ─────────────────────────────────────────────────────────────────────────────────────────────────
    // (b) ARROW PAGING, and (b2) the leak that paging must not cause.
    // ─────────────────────────────────────────────────────────────────────────────────────────────────
    test("(b) ArrowRight advances the counter and ArrowLeft returns it", async ({ page }) => {
      test.setTimeout(90_000);
      await openListing(page);

      await cell(page, 3).click();
      await expect(counter(page)).toHaveText(`3 / ${PHOTO_COUNT}`);

      await page.keyboard.press("ArrowRight");
      await expect(counter(page)).toHaveText(`4 / ${PHOTO_COUNT}`);

      await page.keyboard.press("ArrowLeft");
      await expect(counter(page)).toHaveText(`3 / ${PHOTO_COUNT}`);

      // Past the five the mosaic can show. Photos 6, 7 and 8 have no cell of their own, so this is the
      // only route to them and the only thing that proves the dialog pages the WHOLE set.
      for (let i = 4; i <= PHOTO_COUNT; i++) {
        await page.keyboard.press("ArrowRight");
        await expect(counter(page)).toHaveText(`${i} / ${PHOTO_COUNT}`);
      }
    });

    test("(b2) with the lightbox CLOSED, an arrow key on the page is not intercepted", async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await openListing(page);

      // ── THE HYDRATION GUARD, AND IT IS THE WHOLE REASON THIS CASE IS WORTH ANYTHING ────────────────
      // Measured: without it this case is GREEN under the very mutation it exists to catch. Straight
      // after `goto` the island has not hydrated, so NOTHING is listening for keys yet and the dispatch
      // below comes back unprevented no matter where the handler was written. The case passed against a
      // `window` listener that was demonstrably live — case (b) was paging on it in the same run.
      //
      // Opening and closing the dialog is the guard, because both halves require the island's own
      // JavaScript. Once it has run, a `window` listener would be attached; a content listener would be
      // gone with the unmounted content. That is exactly the difference this case is about, and it can
      // only be asked after hydration.
      await cell(page, 1).click();
      await expect(lightbox(page)).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(lightbox(page)).toHaveCount(0);

      // Dispatched rather than typed, because the question is not "did anything move" but "did anything
      // CANCEL this". A `window` keydown handler calls preventDefault on every arrow press on the route
      // — with no dialog open, on a page that also renders a month grid and a scrollable document.
      const prevented = await page.evaluate(() => {
        const event = new KeyboardEvent("keydown", {
          key: "ArrowRight",
          bubbles: true,
          cancelable: true,
        });
        document.body.dispatchEvent(event);
        return event.defaultPrevented;
      });

      expect(
        prevented,
        "an ArrowRight dispatched on the closed listing page came back defaultPrevented, which means " +
          "something is listening for arrow keys above the dialog content. The lightbox's handler " +
          "belongs on the dialog CONTENT, which is not mounted while it is closed (T-12-07-KEYLEAK).",
      ).toBe(false);

      // And the page did not sprout a dialog from a keypress.
      await expect(lightbox(page)).toHaveCount(0);
    });

    // ─────────────────────────────────────────────────────────────────────────────────────────────────
    // (c) ESCAPE, AND FOCUS RETURNS TO THE CONTROL THAT OPENED IT (T-12-07-FOCUSTRAP).
    // ─────────────────────────────────────────────────────────────────────────────────────────────────
    test("(c) Escape closes it and focus returns to the trigger, by name", async ({ page }) => {
      test.setTimeout(90_000);
      await openListing(page);

      await cell(page, 3).click();
      await expect(lightbox(page)).toBeVisible();

      // ── THE VACUITY GUARD, AND IT TURNED INTO A MEASUREMENT ────────────────────────────────────────
      // "Focus returned to the trigger" is satisfied by focus having never left, so something has to
      // assert it left. The first spelling of that was `expect(cell(page, 3)).not.toBeFocused()`, and
      // it FAILED — with "element(s) not found" rather than with "is focused". That is not a defect: an
      // open Radix dialog marks everything outside its portal `aria-hidden`, so the mosaic trigger is
      // out of the accessibility tree entirely and a role query cannot see it. The background being
      // inert is the OTHER half of T-12-07-FOCUSTRAP — an overlay that leaves the page behind it
      // reachable is a keyboard trap in reverse — so it is asserted here rather than worked around.
      await expect(
        cell(page, 3),
        "the mosaic is still in the accessibility tree while the lightbox is open, so a screen-reader " +
          "user can walk out of the dialog into the page behind it",
      ).toHaveCount(0);

      // …and focus is INSIDE the dialog. Read through the hook rather than through a role query for the
      // same reason: everything outside the portal is hidden, so this is the half that can still be
      // asked. Together the two say focus moved in and nothing outside can be reached.
      const focusIsInsideDialog = await page.evaluate(() => {
        const box = document.querySelector('[data-testid="photo-lightbox"]');
        return (
          box !== null && document.activeElement !== null && box.contains(document.activeElement)
        );
      });
      expect(
        focusIsInsideDialog,
        "Radix did not move focus into the dialog, so the focus-return assertion below would pass by " +
          "focus having never left the trigger",
      ).toBe(true);

      await page.keyboard.press("Escape");
      await expect(lightbox(page)).toHaveCount(0);

      // The locator is resolved BY ACCESSIBLE NAME, so this is "focus came back to the control the
      // booker pressed" rather than a statement about the tree's shape. Cell 3 specifically — a
      // restore that always landed on the hero would pass a weaker spelling of this.
      await expect(
        cell(page, 3),
        "focus did not come back to the photo that opened the lightbox",
      ).toBeFocused();
    });

    // ─────────────────────────────────────────────────────────────────────────────────────────────────
    // (d) THE ACCESSIBLE NAME, AND WHICH OVERLAY MECHANISM RENDERED.
    // ─────────────────────────────────────────────────────────────────────────────────────────────────
    test("(d) the dialog has a computed name, and it is not the RESP-01 sheet", async ({ page }) => {
      test.setTimeout(90_000);
      await openListing(page);
      await cell(page, 2).click();

      // A dialog with no accessible name is a WCAG 4.1.2 failure that Radix only WARNS about at runtime
      // — `patterns/responsive-dialog.tsx:139-146` states the rule; this is where it becomes a
      // measurement for the lightbox. `.toBe(1)` and not `>= 1`.
      const named = page.getByRole("dialog", { name: /Photos of / });
      expect(
        await named.count(),
        "no dialog on this route computes an accessible name starting `Photos of`",
      ).toBe(1);
      await expect(named).toHaveAttribute("data-testid", "photo-lightbox");

      // D-45's other half, asserted on THE SAME ELEMENT: the lightbox is a raw full-screen `ui/dialog`,
      // not the RESP-01 pattern. `.and()` intersects the two locators, so this is a claim about one
      // element rather than about the document.
      await expect(
        named.and(page.locator('[data-testid="responsive-dialog"]')),
        "the named dialog IS the ResponsiveDialog pattern — D-45 makes the lightbox a raw full-screen " +
          "ui/dialog, because RESP-01's sheet is for panels and a photo viewer wants the whole screen",
      ).toHaveCount(0);
    });

    // ─────────────────────────────────────────────────────────────────────────────────────────────────
    // (e) THE TWO CLOSE NAMES — the assertion nobody would have written without being told why.
    // ─────────────────────────────────────────────────────────────────────────────────────────────────
    test("(e) the close control is `Close photos`, not the vendored `Close`", async ({ page }) => {
      test.setTimeout(90_000);
      await openListing(page);
      await cell(page, 1).click();

      await expect(
        lightbox(page).getByRole("button", { name: "Close photos", exact: true }),
        "the lightbox's close control is not named `Close photos`",
      ).toHaveCount(1);

      // The vendored default, asserted ABSENT. The booker path renders a second visible close control
      // (the booking sheet's `Close booking`), and two controls both announcing "Close" are
      // indistinguishable in a screen reader's element list. This half is also what catches the
      // `showCloseButton` default being left ON, which would render BOTH.
      await expect(
        lightbox(page).getByRole("button", { name: "Close", exact: true }),
        "the vendored `Close` is in the lightbox. Either the name regressed, or showCloseButton was " +
          "left at its default and the dialog now has two close buttons.",
      ).toHaveCount(0);

      // The nav controls carry their own distinct names for the same reason.
      await expect(
        lightbox(page).getByRole("button", { name: "Previous photo", exact: true }),
      ).toHaveCount(1);
      await expect(
        lightbox(page).getByRole("button", { name: "Next photo", exact: true }),
      ).toHaveCount(1);
    });

    // ─────────────────────────────────────────────────────────────────────────────────────────────────
    // (f) NO PHOTO TRANSITION — a falsifiable absence rather than a number to keep under a cap.
    // ─────────────────────────────────────────────────────────────────────────────────────────────────
    test("(f) paging swaps the src with no transition and no animation", async ({ page }) => {
      test.setTimeout(90_000);
      await openListing(page);
      await cell(page, 1).click();

      await page.keyboard.press("ArrowRight");
      await expect(counter(page)).toHaveText(`2 / ${PHOTO_COUNT}`);

      const photo = lightbox(page).getByRole("img");
      await expect(photo).toHaveCount(1);

      // Read AFTER paging, because a transition declared only on a state change would not be there
      // before one. Every comma-separated part is checked: `transition-duration` is a LIST, and a
      // check that read only the first would pass a `transition: opacity 0s, transform 200ms`.
      const durations = await photo.evaluate((el) => {
        const style = getComputedStyle(el);
        return [
          ...style.transitionDuration.split(","),
          ...style.animationDuration.split(","),
        ].map((value) => value.trim());
      });

      const moving = durations.filter((value) => Number.parseFloat(value) !== 0);
      expect(
        moving,
        `the lightbox photo carries a non-zero duration: ${moving.join(", ")}. Paging swaps the src ` +
          `and nothing else — a cross-fade between two arbitrary host photographs is visual noise and ` +
          `a second thing to keep inside the DS-04 motion budget.`,
      ).toEqual([]);
    });
  });
}

// =====================================================================================================
// NOT COVERED — real blind spots, stated so the next reader under-trusts this spec
// =====================================================================================================
//
//   - SWIPE PAGING IS ABSENT BY DESIGN, AND THIS SPEC CANNOT TELL THAT FROM BROKEN. Playwright can
//     synthesise a touch drag, but a lightbox that ignores it and a lightbox whose swipe handler is
//     broken produce byte-identical DOM. The distinction is the whole point — D-45 ships no gesture
//     handling, because drag needs a gesture library this milestone's dependency gate bars, and an
//     affordance that lies is worse than none. What a human has to check on a real touch device is that
//     the 44px chrome (prev / next / close) is reachable ONE-HANDED at 375px, which is the property the
//     absent swipe is standing in for. Routed to human UAT; faking it here would be worse than the gap.
//   - ONE VIEWPORT. These run at the project's default size, so the mosaic is measured in its WIDE
//     layout only. The `sm:hidden` half of the button predicate — the button appearing at two photos on
//     a phone — is asserted in jsdom by `tests/listing/photo-gallery.test.tsx` reading the class, and by
//     nothing that renders it. A rendered check belongs with the 375px pass in `mobile-booker-path`.
//   - NOTHING MEASURES THE MOSAIC'S GEOMETRY. That every shape fills its `MOSAIC_ASPECT` box with no
//     empty cell is asserted from the declared template's own arithmetic in the vitest file, not from a
//     `boundingBox()`. jsdom cannot see it (D-131) and this spec does not look.
//   - THE PHOTOS ARE BROKEN URLS. Nothing here proves a real Cloudinary `secure_url` renders, that the
//     lightbox's `object-contain` frames a portrait photo sensibly, or that a slow image does not shift
//     the chrome. `alt` and element identity are the whole surface under test.
//   - FOCUS RESTORE IS ASSERTED FOR THE CELL TRIGGERS ONLY. `Show all 8 photos` almost certainly
//     restores the same way — it is the same Radix mechanism — but "almost certainly" is not a
//     measurement and this file does not make one.
