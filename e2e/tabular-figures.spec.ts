import { expect, test, type Page } from "@playwright/test";

import { BASE, seedBookableListing, signUpBooker, type SeededListing } from "./helpers/booker-seed";
import { seedPaymentStates, type SeededPaymentStates } from "./helpers/seed-payment-states";
import { seedTheme } from "./helpers/theme";
import { type ThemeName } from "../src/components/theme/theme-provider";

// TRUST-02 / 13-UI-SPEC § Typography rule 1 / 13-RESEARCH Open Question 1 + Assumption A1 —
// THE GLYPH-ADVANCE MEASUREMENT. The repo measures box geometry (`skeleton-geometry.spec.ts`); it has
// never measured the width of TEXT.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// (b) IS THE ASSERTION TRUST-02 ACTUALLY NEEDS. (a) AND (c) EXIST TO MAKE IT FALSIFIABLE.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// TRUST-02 asks for "tabular figures", and the reason is behavioural rather than aesthetic: a booker reads
// the reference back down a phone, or lines it up against an email subject, or scans a column of them. All
// three want a FIXED ADVANCE WIDTH — two references of the same length occupying the same horizontal
// space, so a mis-keyed character is visible as a ragged edge rather than invisible.
//
// `tabular-nums` alone does not deliver that, and this is the substance of Open Question 1:
// `font-variant-numeric: tabular-nums` normalises DIGITS ONLY, and a `FIT-XXXXXXXX` reference drawn from
// Crockford base32 is mostly LETTERS. So the phase decided `font-mono tabular-nums` on the reference —
// `font-mono` fixes every glyph's advance, letters included; `tabular-nums` is retained so the
// requirement's literal wording holds and an all-digit reference still aligns with the money column.
//
//   (a) the reference's computed `font-family` IS the declared mono stack — so the decision is live rather
//       than a class that a later theme edit silently detached from a font;
//   (b) two DIFFERENT references of equal length render to EQUAL WIDTH — the property itself;
//   (c) a money pair in the app's SANS treatment renders to equal width — a question about the whole app,
//       not about this surface, and the reason it is here rather than in its own file is that it needs the
//       same loaded page and the same rendered money element.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE WIDTH IS MEASURED WITH A RANGE AND NOT ONLY WITH `boundingBox()`
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// The reference is a `<p>`. A block-level box's width is its CONTAINER's width, and comparing two
// container widths is satisfied by any font in the world — a perfectly green assertion measuring nothing.
// It happens to hug its text today because it is a flex item in `BookingReference`'s row, but "happens to"
// is not a property a gate may rest on.
//
// So the primary measurement is `Range.getBoundingClientRect()` over the element's text contents: the sum
// of the glyph advances the browser actually laid out, independent of the box around them. The element box
// is measured too, and the two are asserted to AGREE — which is how "the box hugs its text" becomes a
// checked fact rather than an assumption, and is what would catch the `<p>` becoming block-level again.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// (c) — WHAT IT CAN AND CANNOT SETTLE, STATED BEFORE THE NUMBERS
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// A1 asks whether the `next/font/google` build of Geist actually ships a `tnum` table; one source says the
// Google Fonts build "does not ship the complete OT table". A single equal-width measurement CANNOT answer
// that on its own, and pretending otherwise would be the vacuity this phase keeps finding: if a font's
// default figures are ALREADY tabular at the OS/2 level — which the same source says Geist's are — then
// the pair renders equal whether or not `tnum` exists, and a green (c) would have proved nothing about the
// table while reading as though it had.
//
// The pair is therefore measured TWICE: once in the money surfaces' real treatment, and once with
// `font-variant-numeric` forced back to `normal` on the same cloned element. That gives a three-way
// discriminator, and every outcome is a finding rather than a pass/fail:
//
//   equal WITH tnum, unequal WITHOUT   → `tnum` is live and doing the work.
//   equal WITH tnum, equal WITHOUT     → the default figures are already tabular; `tnum` is a harmless
//                                        no-op here and the PROPERTY THE APP NEEDS holds regardless.
//   unequal WITH tnum                  → the property does not hold. `tabular-nums` is a silent no-op on
//                                        every money figure in the app — A1's bad branch, and a FINDING
//                                        FOR PHASE 17, not something to fix in this phase.
//
// The assertion is on the property the app needs (equal WITH the real treatment). The second measurement
// is reported, not asserted, because "does the OT table exist" is not a requirement of this product.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE MEASURED OUTCOME — A1 IS SETTLED, AND ITS GOOD BRANCH IS LIVE (13-13, 21 Aug 2026, Chromium)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   theme   reference pair             money WITH tabular-nums    money WITHOUT
//   ─────── ────────────────────────── ────────────────────────── ──────────────────────────────
//   court   115.203 / 115.203  (0px)   108.922 / 108.922  (0px)   75.266 / 117.984  (42.719px)
//   grove   122.406 / 122.406  (0px)   136.234 / 136.234  (0px)   97.719 / 146.766  (49.047px)
//
// The first branch, in both themes: **the `next/font/google` build of Geist DOES ship a working `tnum`
// table, and `tabular-nums` is load-bearing rather than decorative.** Geist Sans's default figures are
// strongly PROPORTIONAL — `1` is roughly half the advance of `0` — so a ten-character money string swings
// 42–49px between its narrowest and widest digits with the utility off. Every money column in the app
// would be ragged without it, and a `tabular-nums` deleted "because it does nothing" would be a visible
// regression on the reserve page, the listing rail, the booking sheet and this receipt at once.
//
// A1's bad branch is therefore CLOSED and there is no Phase-17 finding to hand forward from it. The
// assertion stays, because what was measured once on one Chromium build is not a permanent property of a
// font pipeline; the numbers above are what a future red should be read against.
//
// ⚠ AND THE SAME RUN MEASURED WHY RULE 1 IS NOT A PREFERENCE. With `font-mono` removed from the reference
// and `tabular-nums` LEFT IN PLACE, two equal-length references laid out at 116.156px and 104.469px — an
// 11.69px spread. Tabular figures normalised the digits and did nothing for the letters, which is exactly
// the argument 13-UI-SPEC rule 1 makes, now with a number attached.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE ENVIRONMENT BOUNDARY (D-35): `DATABASE_URL` and nothing else. No provider call, no key.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════

/** The money pair from 13-UI-SPEC, verbatim. Same character count, maximally different digits. */
const MONEY_WIDE = "₱11,111.11";
const MONEY_NARROW = "₱00,000.00";

/**
 * Sub-pixel tolerance for two widths that must be "the same".
 *
 * Not a fudge factor for a font that nearly lines up: layout accumulates float error across a dozen glyph
 * advances, and a browser that lays out two identical-metric strings can land 0.01px apart. A proportional
 * font's difference on these strings is ORDERS of magnitude larger — the measured spread is reported in
 * every failure message so a reader can see which side of that line a red fell on.
 */
const EPSILON_PX = 0.05;

type TextWidth = { readonly text: string; readonly rangeWidth: number; readonly boxWidth: number };

test.describe("TRUST-02 — the reference is fixed-advance-width, measured rather than assumed", () => {
  test.describe.configure({ mode: "serial" });

  let seed: SeededListing;
  let payStates: SeededPaymentStates | null = null;
  let ownerEmail: string;

  test.beforeAll(async () => {
    seed = await seedBookableListing({ titlePrefix: "E2E Tabular" });
  });

  test.afterAll(async () => {
    await payStates?.teardown();
    await seed.teardown();
  });

  /** See `receipt-parity.spec.ts` — the session does not cross a test boundary. */
  async function logInAs(page: Page, email: string): Promise<void> {
    await page.goto(`${BASE}/login`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("averylongpassword");
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 });
  }

  /** The theme seam is a silent no-op when it misses — `helpers/theme.ts`'s own warning. */
  async function expectTheme(page: Page, theme: ThemeName): Promise<void> {
    const applied = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    expect(
      applied,
      `the theme seam seeded "${theme}" and the document resolved "${applied}". Two runs of one theme ` +
        `reported as two-theme coverage is the failure this line exists to make loud.`,
    ).toBe(theme);
  }

  /** Family lists compared as SETS OF NAMES, so quoting and spacing cannot decide a font question. */
  function normaliseFamilies(raw: string): string[] {
    return raw
      .split(",")
      .map((f) => f.trim().replace(/^['"]|['"]$/g, "").toLowerCase())
      .filter((f) => f !== "");
  }

  /**
   * Measure the reference on a given booking's receipt: the laid-out text width AND the element box.
   */
  async function measureReference(page: Page, bookingId: string): Promise<TextWidth> {
    await page.goto(`${BASE}/bookings/${bookingId}/receipt`, { waitUntil: "networkidle" });
    const el = page.getByTestId("booking-reference");
    await expect(
      el,
      `no booking-reference on ${bookingId}'s receipt — either the receipt did not render or the hook ` +
        `moved off the string element.`,
    ).toHaveCount(1);

    const measured = await el.evaluate((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return {
        text: (node.textContent ?? "").trim(),
        rangeWidth: range.getBoundingClientRect().width,
        boxWidth: node.getBoundingClientRect().width,
      };
    });

    expect(measured.rangeWidth, `the reference on ${bookingId} laid out at zero width`).toBeGreaterThan(0);
    // THE VACUITY GUARD FOR (b). If the box does not hug the text, the box comparison would be a
    // comparison of container widths and would pass for any font at all. Asserted rather than assumed.
    expect(
      Math.abs(measured.boxWidth - measured.rangeWidth),
      `the reference's element box (${measured.boxWidth}px) is wider than the text it contains ` +
        `(${measured.rangeWidth}px), so it is no longer hugging its own string. Any width comparison on ` +
        `the BOX is then a comparison of container widths and passes for every font — which is why the ` +
        `assertions below use the range. Fix the guard, do not delete it.`,
    ).toBeLessThanOrEqual(1);
    return measured;
  }

  /**
   * (c)'s probe: the money pair, rendered in the SAME element treatment the money surfaces use.
   *
   * The element is CLONED from the live `receipt-total` rather than built from a class string, so the probe
   * inherits the real treatment (`text-heading tabular-nums`, the sans family from `body`) instead of a
   * second author's guess at it. The clone is detached from the receipt's flex row and laid out as an
   * inline-block off-screen, so its box is its text and nothing stretches it.
   *
   * `variant: "normal"` forces `font-variant-numeric: normal` INLINE, which overrides the utility class
   * without editing it — the only way to ask "did tabular-nums do anything" on the same glyphs.
   */
  async function measureMoneyPair(
    page: Page,
    variant: "tabular" | "normal",
  ): Promise<{ wide: number; narrow: number }> {
    return page.evaluate(
      ([wideText, narrowText, mode]) => {
        const source = document.querySelector('[data-testid="receipt-total"]');
        if (!source) throw new Error("receipt-total is absent, so the money probe has nothing to clone");

        const measure = (text: string): number => {
          const probe = source.cloneNode(false) as HTMLElement;
          probe.removeAttribute("data-testid"); // never a second element carrying the money hook
          probe.textContent = text;
          probe.style.position = "absolute";
          probe.style.left = "-10000px";
          probe.style.top = "0";
          probe.style.display = "inline-block";
          probe.style.whiteSpace = "pre";
          if (mode === "normal") probe.style.fontVariantNumeric = "normal";
          document.body.appendChild(probe);
          const range = document.createRange();
          range.selectNodeContents(probe);
          const width = range.getBoundingClientRect().width;
          probe.remove();
          return width;
        };

        return { wide: measure(wideText), narrow: measure(narrowText) };
      },
      [MONEY_WIDE, MONEY_NARROW, variant] as const,
    );
  }

  async function runMeasurements(page: Page, theme: ThemeName, bookingIds: readonly string[]) {
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    // (a) THE REFERENCE RESOLVES TO THE DECLARED MONO STACK
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    const first = await measureReference(page, bookingIds[0]);
    await expectTheme(page, theme);

    const stacks = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const el = document.querySelector('[data-testid="booking-reference"]')!;
      return {
        declaredMono: root.getPropertyValue("--font-mono").trim(),
        declaredSans: root.getPropertyValue("--font-sans").trim(),
        rendered: getComputedStyle(el).fontFamily,
      };
    });

    // Compared against the declared custom property rather than a hard-coded family string, so swapping
    // the font swaps BOTH sides and this stays a statement about the class doing its job.
    expect(
      stacks.declaredMono,
      `${theme}: --font-mono resolved to the empty string, so the comparison below would be against ` +
        `nothing and would pass for any font. Tailwind's @theme must be emitting it.`,
    ).not.toBe("");
    // …and the two declared stacks must actually DIFFER, or "the reference is mono" is satisfied by the
    // body font and this assertion says nothing at all.
    expect(
      normaliseFamilies(stacks.declaredMono),
      `${theme}: --font-mono and --font-sans resolve to the SAME stack (${stacks.declaredMono}), so ` +
        `asserting the reference is mono is indistinguishable from asserting it is the body font. The ` +
        `whole decision in 13-UI-SPEC rule 1 would be inert.`,
    ).not.toEqual(normaliseFamilies(stacks.declaredSans));

    expect(
      normaliseFamilies(stacks.rendered),
      `${theme}: the reference renders in ${stacks.rendered}; --font-mono declares ` +
        `${stacks.declaredMono}. TRUST-02's fixed-advance-width property comes from the MONO family — ` +
        `tabular figures normalise digits only, and a FIT- reference is mostly letters — so a reference ` +
        `that has drifted off this stack has lost the property whatever classes it still carries.`,
    ).toEqual(normaliseFamilies(stacks.declaredMono));

    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    // (b) TWO DIFFERENT REFERENCES OF EQUAL LENGTH RENDER TO EQUAL WIDTH
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    const second = await measureReference(page, bookingIds[1]);

    // The two strings must be DIFFERENT and the SAME LENGTH, or the width comparison is a tautology: two
    // renderings of one string are equal in every font ever made. The reference is a deterministic
    // SHA-256 over the booking id and the format is `FIT-` + 8 symbols, so equal length is guaranteed by
    // construction and difference is guaranteed by two different ids — both are asserted anyway, because
    // "guaranteed by construction" is what a fixture change quietly breaks.
    expect(first.text, `${theme}: the first reference is not in FIT- form: "${first.text}"`).toMatch(
      /^FIT-[0-9A-Z]{8}$/,
    );
    expect(second.text, `${theme}: the second reference is not in FIT- form: "${second.text}"`).toMatch(
      /^FIT-[0-9A-Z]{8}$/,
    );
    expect(
      second.text,
      `${theme}: both receipts rendered the SAME reference (${first.text}). Two renderings of one string ` +
        `are equal in width in any font, so the assertion below would be a tautology. Two different ` +
        `bookings must produce two different references — if they do not, that is a far bigger finding ` +
        `than typography.`,
    ).not.toBe(first.text);
    expect(
      second.text.length,
      `${theme}: the two references differ in LENGTH (${first.text} / ${second.text}), so unequal width ` +
        `would be correct and this assertion is asking the wrong question.`,
    ).toBe(first.text.length);

    const referenceSpread = Math.abs(first.rangeWidth - second.rangeWidth);
    expect(
      referenceSpread,
      `${theme}: TWO EQUAL-LENGTH REFERENCES DO NOT LINE UP. "${first.text}" laid out at ` +
        `${first.rangeWidth}px and "${second.text}" at ${second.rangeWidth}px — a spread of ` +
        `${referenceSpread}px. This is the property TRUST-02 asks for, and it is the one a booker uses: ` +
        `a reference read back down a phone or lined up against an email subject. The cause is almost ` +
        `never "tabular-nums stopped working" — tabular figures normalise digits only and this string is ` +
        `mostly letters — it is that the element is no longer rendering in the mono family, or that the ` +
        `mono font failed to load and fell back to a proportional face.`,
    ).toBeLessThanOrEqual(EPSILON_PX);

    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    // (c) THE APP-WIDE QUESTION — A1 / OPEN QUESTION 1
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    const withTnum = await measureMoneyPair(page, "tabular");
    const withoutTnum = await measureMoneyPair(page, "normal");
    const spreadWith = Math.abs(withTnum.wide - withTnum.narrow);
    const spreadWithout = Math.abs(withoutTnum.wide - withoutTnum.narrow);

    // Reported on stdout so the numbers land in the run's output and can be carried into the plan's
    // summary as a measurement rather than as a recollection.
    console.log(
      `[MEASUREMENT ${theme}] reference widths: ${first.rangeWidth} / ${second.rangeWidth} ` +
        `(spread ${referenceSpread}px) · money pair WITH tabular-nums: ${withTnum.wide} / ` +
        `${withTnum.narrow} (spread ${spreadWith}px) · WITHOUT: ${withoutTnum.wide} / ` +
        `${withoutTnum.narrow} (spread ${spreadWithout}px)`,
    );

    expect(
      withTnum.wide,
      `${theme}: the money probe laid out at zero width, so both spreads are zero and every conclusion ` +
        `below is drawn from a measurement that did not happen.`,
    ).toBeGreaterThan(0);

    expect(
      spreadWith,
      `${theme}: A1's BAD BRANCH IS LIVE — AND THIS IS A FINDING FOR PHASE 17, NOT A DEFECT IN THIS ` +
        `PHASE'S WORK. "${MONEY_WIDE}" rendered at ${withTnum.wide}px and "${MONEY_NARROW}" at ` +
        `${withTnum.narrow}px in the money surfaces' own treatment — a spread of ${spreadWith}px, where ` +
        `equal width is what tabular figures mean. The same pair with font-variant-numeric forced to ` +
        `normal spread ${spreadWithout}px, so the utility is ${
          Math.abs(spreadWith - spreadWithout) <= EPSILON_PX ? "changing NOTHING" : "changing something"
        }. Read that as: the Google Fonts build of Geist ships no usable tnum table (13-RESEARCH ` +
        `Assumption A1), so \`tabular-nums\` is a silent no-op on every money figure in the app — not ` +
        `only here. DO NOT respond by stripping tabular-nums anywhere, and DO NOT change the reference's ` +
        `font-mono decision: (b) above is what carries TRUST-02 and it does not depend on this. Record ` +
        `the measurement, hand it to Phase 17, and leave the classes alone.`,
    ).toBeLessThanOrEqual(EPSILON_PX);
  }

  test("(1) court — the reference lines up, and the money pair is measured", async ({ page }) => {
    test.setTimeout(120_000);

    await seedTheme(page.context(), "court");
    ownerEmail = await signUpBooker(page, seed);
    const [{ id: bookerId }] = await seed.sql<{ id: string }[]>`
      SELECT id FROM "user" WHERE email = ${ownerEmail}
    `;
    payStates = await seedPaymentStates(seed, bookerId, { idPrefix: "e2e_tabular" });

    await runMeasurements(page, "court", [
      payStates.bookingIds.confirmed,
      payStates.bookingIds.cancelledRefunded,
    ]);
  });

  test("(2) grove — the same measurements, the other theme", async ({ page }) => {
    test.setTimeout(120_000);

    expect(
      payStates,
      "the payment-state fixture is null, so case 1 did not reach its seed. A null here is a failure of " +
        "that case, not of this one.",
    ).not.toBeNull();

    await seedTheme(page.context(), "grove");
    await logInAs(page, ownerEmail);
    await runMeasurements(page, "grove", [
      payStates!.bookingIds.confirmed,
      payStates!.bookingIds.cancelledRefunded,
    ]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE TWO REFERENCES COME FROM TWO NAVIGATIONS
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// No surface in the product renders two references at once, and inventing one to measure would be measuring
// a page that does not ship. The two receipts are the same component, in the same PanelCard, at the same
// viewport, in the same theme, in the same browser session — everything that could change the advance
// width is held fixed, and the only difference is the eight symbols. The seeded pair is `confirmed` and
// `cancelledRefunded`, the two shapes `receipt/page.tsx`'s D-76 predicate admits with no provider probe.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • WHETHER THE `tnum` OT TABLE EXISTS. See the header: this file measures the OUTCOME the product
//     needs. A green (c) with an equal `normal` spread means the default figures are already tabular and
//     the table's presence is undetermined — that distinction is recorded rather than papered over.
//   • THE REFERENCE ON ITS OTHER THREE SURFACES. It also renders on the confirmation moment (at
//     `text-heading`), the booking detail page and the group page. The family and the advance are
//     properties of the component, which is mounted rather than re-implemented on each (13-02), so
//     measuring one surface measures the decision; measuring four would measure the same component four
//     times at two sizes.
