// @vitest-environment jsdom

// The drop-in search card (OPEN-04 · OC-12 · 09-UI-SPEC § 4) — and O2 as an EXECUTABLE rule.
//
// The rule under test is not "the card looks right"; it is that a drop-in card can never advertise hours
// the pass does not reserve. `Available 9:00 AM–11:00 AM on Fri, Aug 8` for a day pass is a claim about a
// reservation the booker is not buying (§ Copywriting O2) — and because the searcher's own `start`/`end`
// params flow straight into `windowLine`, that lie was the DEFAULT behaviour until this card forked. So
// two cases assert the absence of a clock time over the WHOLE rendered text (`/\d:/`), one of them with a
// searched window deliberately supplied. A future edit that reintroduces the hour line fails here, not in
// a screenshot.
//
// The same reasoning covers the link: a `?start=&end=` window the listing page has no picker to resume is
// a dead link, so an open card's href is asserted to carry `date=` and NEITHER hour param.
//
// The last case is the regression guard: an EXCLUSIVE row with the identical searched window must still
// render the shipped "Available …" line, unchanged. (Byte-identity of the whole exclusive card was proven
// separately by hashing the rendered DOM against the pre-fork component — see 09-14-SUMMARY.md.)
//
// Fixtures deliberately KEEP `hourlyRateCents` / `dayRateCents` on the drop-in row (09-07's lesson: 09-06
// requires a per-head price but never clears the exclusive columns, and OC-17 permits the mode switch), so
// these cases can only pass by keying on the persisted MODE, never on a null rate column.
//
// `next/link` is stubbed to a plain anchor (App-Router context is absent in jsdom), mirroring
// tests/listing/listing-card.test.tsx.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// CASES (7)-(9) — quick task 260811-elm, the drop-in EXPLAINER line (v1.0 audit item #6, copy clause).
//
// Written FIRST against unchanged `src/` (the house confirm-then-fix discipline).
//
// Observed RED (pre-fix, 2026-08-11) — `npx vitest run tests/search/search-card-open.test.tsx`, VERBATIM:
//
//    ✓ … > (1) with NO date: badges Drop-in, prices per person, and shows no scarcity of any kind 192ms
//    ✓ … > (2) with a date in play: renders the date + venue tz and the server's chip, and NO clock time 31ms
//    ✓ … > (3) with a date AND a searched start/end: STILL no clock time (O2 — the default lie) 16ms
//    ✓ … > (4) renders the server's `low` state verbatim — the exact count, not a re-derivation 17ms
//    ✓ … > (5) links forward with the DATE ALONE — never a start/end window the listing page cannot resume 14ms
//    ✓ … > (6) REGRESSION: an exclusive card with the same searched window is unchanged 12ms
//    × … > (7) drop-in with NO date: the explainer renders, between the badge and the price 29ms
//      → Unable to find an element with the text: Day pass · shared space, any time they're open. This
//        could be because the text is broken up by multiple elements. In this case, you can provide a
//        function for your text matcher to make your matcher more flexible.
//
//    FAIL  tests/search/search-card-open.test.tsx > SearchResultCard — drop-in listings (OC-12 / O2) >
//    (7) drop-in with NO date: the explainer renders, between the badge and the price
//   TestingLibraryElementError: Unable to find an element with the text: Day pass · shared space, any time
//   they're open. This could be because the text is broken up by multiple elements. In this case, you can
//   provide a function for your text matcher to make your matcher more flexible.
//    ❯ tests/search/search-card-open.test.tsx:231:19
//
//    FAIL  tests/search/search-card-open.test.tsx > SearchResultCard — drop-in listings (OC-12 / O2) >
//    (8) drop-in with a date AND searched hours: the explainer coexists with O2
//   TestingLibraryElementError: Unable to find an element with the text: Day pass · shared space, any time
//   they're open. This could be because the text is broken up by multiple elements. In this case, you can
//   provide a function for your text matcher to make your matcher more flexible.
//    ❯ tests/search/search-card-open.test.tsx:253:19
//
//    Test Files  1 failed (1)
//         Tests  2 failed | 7 passed (9)
//
// THE CONTRAST IS THE EVIDENCE: cases (1)-(6) AND case (9) were GREEN in that same run. (9) is a
// REGRESSION PIN of today's exclusive card, not a restatement of the new assertions — if it had gone red
// alongside (7)/(8) it would be measuring the explainer rather than pinning the card it is meant to
// protect. See the block above the cases themselves for what each one carries.
//
// ── Mutations (each reverted; `git diff --exit-code src/` clean after all of them) ────────────────
//
// M1 — the `isDropIn` guard DELETED, so the explainer renders unconditionally.
//   PREDICTED: (9) red, (6) green.  OBSERVED: exactly that. VERBATIM:
//
//    ✓ … > (6) REGRESSION: an exclusive card with the same searched window is unchanged 15ms
//    × … > (9) REGRESSION: the exclusive card's whole rendered text is byte-identical to today 25ms
//
//    FAIL  … > (9) REGRESSION: the exclusive card's whole rendered text is byte-identical to today
//   AssertionError: expected 'No photos yetSunset CourtPickleball c…' to be 'No photos yetSunset CourtPickleball c…' // Object.is equality
//
//   Expected: "No photos yetSunset CourtPickleball court₱322.88/hrService fee includedAvailable 9:00 AM–11:00 AM on Fri, Aug 8 · Makati time"
//   Received: "No photos yetSunset CourtPickleball courtDay pass · shared space, any time they're open₱322.88/hrService fee includedAvailable 9:00 AM–11:00 AM on Fri, Aug 8 · Makati time"
//
//    Test Files  1 failed (1)
//         Tests  1 failed | 8 passed (9)
//
//   THE CONTRAST IS THE WHOLE POINT: (6) — which checks NAMED strings on the exclusive card — stayed
//   GREEN through a mutation that put a whole extra paragraph on it. (9) is the assertion actually
//   carrying the byte-identity claim; (6) would have missed this entirely.
//
// M2 — `Day pass` → `Open capacity` in the literal.
//   PREDICTED: (7) and (8) red ON `FORBIDDEN`.
//   OBSERVED AS OBSERVED, and the prediction was WRONG about WHICH assertion bit. VERBATIM:
//
//    × … > (7) drop-in with NO date: the explainer renders, between the badge and the price 30ms
//      → Unable to find an element with the text: Day pass · shared space, any time they're open. …
//    × … > (8) drop-in with a date AND searched hours: the explainer coexists with O2 19ms
//      → Unable to find an element with the text: Day pass · shared space, any time they're open. …
//    ✓ … > (9) REGRESSION: the exclusive card's whole rendered text is byte-identical to today 12ms
//         Tests  2 failed | 7 passed (9)
//
//   Both cases open with `getByText(BLURB)`, which THROWS — so execution never reaches
//   `not.toMatch(FORBIDDEN)` and M2 does NOT, on its own, discharge D-ELM-06. The literal pin is not
//   adjusted to fit the prediction (that would trade a stronger assertion for a tidier story); instead
//   the vacuity question is answered by a second mutation that isolates it:
//
// M2b — the shipped literal left EXACTLY as-is, and a separate drop-in-guarded node added after the
//   date line: `{isDropIn && <p className="text-sm">Sold in occupancy mode</p>}`. `getByText(BLURB)` and
//   the order/contiguity assertions all still pass, so `FORBIDDEN` is the only thing left to fail.
//   OBSERVED — and this is what makes the vocabulary assertion non-vacuous (D-ELM-06). VERBATIM:
//
//    × … > (7) drop-in with NO date: the explainer renders, between the badge and the price 25ms
//      → expected 'No photos yetIron RepublicGym / fitne…' not to match /open capacity|occupancy mode/i
//    × … > (8) drop-in with a date AND searched hours: the explainer coexists with O2 16ms
//      → expected 'No photos yetIron RepublicGym / fitne…' not to match /open capacity|occupancy mode/i
//    ✓ … > (9) REGRESSION: the exclusive card's whole rendered text is byte-identical to today 6ms
//         Tests  2 failed | 7 passed (9)
//
// M3 — `any time they're open` → `any time 6:00 AM – 10:00 PM` in the literal.
//   PREDICTED: (8) red on `CLOCK_TIME`.
//   OBSERVED: FOUR cases red, and the two that matter are ones the prediction did not name. VERBATIM:
//
//    × … > (2) with a date in play: renders the date + venue tz and the server's chip, and NO clock time 46ms
//      → expected 'No photos yetIron RepublicGym / fitne…' not to match /\d:/
//    × … > (3) with a date AND a searched start/end: STILL no clock time (O2 — the default lie) 15ms
//      → expected 'No photos yetIron RepublicGym / fitne…' not to match /\d:/
//    × … > (7) drop-in with NO date: the explainer renders, between the badge and the price 31ms
//      → Unable to find an element with the text: Day pass · shared space, any time they're open. …
//    × … > (8) drop-in with a date AND searched hours: the explainer coexists with O2 19ms
//      → Unable to find an element with the text: Day pass · shared space, any time they're open. …
//    ✓ … > (6) REGRESSION: an exclusive card with the same searched window is unchanged 15ms
//    ✓ … > (9) REGRESSION: the exclusive card's whole rendered text is byte-identical to today 12ms
//         Tests  4 failed | 5 passed (9)
//
//   (7) and (8) died on the literal pin again, as in M2. But cases (2) and (3) — SHIPPED since 09-14,
//   carrying no literal pin — reddened on exactly `/\d:/`. That is a STRONGER result than the plan
//   predicted and it is the claim M3 exists to establish: the new copy sits INSIDE O2's guard rather
//   than beside it, and the proof comes from assertions written before this line existed. A drop-in card
//   still cannot advertise hours the pass does not reserve, whichever line tries to.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// CASE (10) — plan 12-01, D-37 as an EXECUTABLE rule: the tile carries the all-in RATE and never a
// total computed from the searched window.
//
// It is GREEN on unchanged `src/` — 12-01 modifies no component this file renders, and a regression
// pin that reddens on its own plan is measuring that plan rather than protecting the card (the
// discipline case (9) states in its own note). So its teeth come from a mutation, not from a first red.
//
// M4 — a computed window total added to `search-result-card.tsx`'s `price` node, beside the existing
//   rate: a second `<span>` rendering `₱<rate × 2> total`, i.e. the two-hour window the props already
//   carry. This is the exact one-line edit Phase 12 makes tempting — the listing page and the checkout
//   summary both compute a total from THIS window — and it is locally reasonable, which is why it
//   needs a gate rather than a review.
//   PREDICTED: (10) red on the money-array equality.  OBSERVED: (10) AND (9) red. VERBATIM:
//
//    FAIL  … > (10) REGRESSION (D-37): the tile shows the all-in RATE and no window total, in either mode
//   AssertionError: exclusive: the tile renders money the rate parts do not declare: expected
//   [ '₱322.88', '₱645.76' ] to deeply equal [ '₱322.88' ]
//
//     - Expected
//     + Received
//
//       [
//         "₱322.88",
//     +   "₱645.76",
//       ]
//
//    Test Files  1 failed (1) · Tests  2 failed | 8 passed (10)
//
//   (9) reddening alongside is CORRECT rather than redundant: it is a byte-identity pin on the
//   exclusive card, so any added node moves it. What (9) cannot do is speak about the drop-in card or
//   name the rule — its failure says "the text changed", while (10)'s says "money rendered that the
//   server's rate parts do not declare", in both modes, with the offending figure printed. Reverted
//   (`git diff --exit-code src/` clean) → 10 passed.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { SearchResultCard } from "@/components/search/search-result-card";
import { allInRateParts } from "@/lib/booking/all-in-rate";
import { SPACE_TYPE_LABELS } from "@/lib/listing-vocab";
import type { SearchResultRow } from "@/lib/search/query";

afterEach(cleanup);

// 2025-08-08 IS a Friday (2026-08-08 is a Saturday — the calendar slip 09-08 caught in the spec's own
// examples), so `Fri, Aug 8` is a true rendering of this date and can be pinned literally.
const FRIDAY = "2025-08-08";

const PER_HEAD_CENTS = 35000;

function makeOpenRow(overrides: Partial<SearchResultRow> = {}): SearchResultRow {
  const rates = { hourlyRateCents: 30750, dayRateCents: 180000 };
  return {
    id: "open-listing",
    title: "Iron Republic",
    primarySpaceType: "gym_fitness_floor",
    // Kept on purpose — see the header. A drop-in listing may still carry both exclusive rates.
    ...rates,
    timezone: "Asia/Manila",
    city: "Makati",
    coverPhotoUrl: null,
    distanceM: null,
    // Composed through the REAL server-side helper exactly as src/lib/search/query.ts composes it, so the
    // card is proven to render the string the search query would actually hand it.
    allInRateParts: allInRateParts({
      ...rates,
      perHeadPriceCents: PER_HEAD_CENTS,
      occupancyMode: "open_capacity",
    }),
    occupancyMode: "open_capacity",
    perHeadPriceCents: PER_HEAD_CENTS,
    spots: null,
    ...overrides,
  };
}

function makeExclusiveRow(overrides: Partial<SearchResultRow> = {}): SearchResultRow {
  const rates = { hourlyRateCents: 30750, dayRateCents: null };
  return {
    id: "exclusive-listing",
    title: "Sunset Court",
    primarySpaceType: "pickleball_court",
    ...rates,
    timezone: "Asia/Manila",
    city: "Makati",
    coverPhotoUrl: null,
    distanceM: null,
    allInRateParts: allInRateParts(rates),
    occupancyMode: "exclusive",
    perHeadPriceCents: null,
    spots: null,
    ...overrides,
  };
}

/** Any digit immediately followed by a colon — i.e. a wall-clock time anywhere in the rendered card. */
const CLOCK_TIME = /\d:/;

/**
 * Any peso amount anywhere in the rendered card — `₱322.88`, `₱1,234.00`, `₱350`.
 *
 * The `g` flag is deliberate and the regex is re-created per use (`new RegExp(MONEY)`) rather than
 * shared, because a global regex carries `lastIndex` between `matchAll` calls in some engines and a
 * stateful matcher in an assertion is a false green waiting to happen.
 */
const MONEY = /₱[\d,]+(?:\.\d{2})?/g;

/** Every peso amount in a string, in render order. */
function moneyIn(text: string): string[] {
  return [...text.matchAll(new RegExp(MONEY))].map((m) => m[0]);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Cases (7)-(9): the drop-in explainer line (quick task 260811-elm · audit item #6, copy clause).
//
// Pinned as a LITERAL, not imported from the component, on purpose — the house pattern case (2) already
// uses for `Fri, Aug 8 · Makati time`. A copy change must fail HERE and force a deliberate re-read; an
// imported constant would silently follow whatever the component was changed to say.
//
// Case (9) is the byte-identity gate, and it is the only assertion actually carrying the "the exclusive
// card is unchanged" claim: case (6) checks NAMED strings and would not notice an extra node at all.
// Mutation M1 (delete the `isDropIn &&` guard) is what proves that — (9) reddens while (6) stays green.
//
// `FORBIDDEN` is VACUOUS on its own: `open capacity` / `occupancy mode` appear nowhere in either card's
// rendered output today, so the assertion passes on unchanged source and measures nothing. Mutation M2
// (`Day pass` → `Open capacity`) is what gives it teeth (D-ELM-06); its RED is part of the deliverable.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** The shipped explainer copy, verbatim (D-ELM-02). Its tail is `date-pass-picker.tsx:230`'s tail. */
const BLURB = "Day pass · shared space, any time they're open";

/** § Copywriting (09-UI-SPEC:444): booker-facing copy never says either of these. */
const FORBIDDEN = /open capacity|occupancy mode/i;

describe("SearchResultCard — drop-in listings (OC-12 / O2)", () => {
  it("(1) with NO date: badges Drop-in, prices per person, and shows no scarcity of any kind", () => {
    const row = makeOpenRow();
    // The card renders the SERVER's finished string: ₱350.00 per head + the D-74 service fee, all-in.
    expect(row.allInRateParts).toEqual(["₱367.50/person"]);

    const { container } = render(<SearchResultCard listing={row} />);

    expect(screen.getByText("Drop-in")).toBeTruthy();

    const text = container.textContent ?? "";
    expect(text).toContain("₱367.50/person");
    expect(text).toContain("Service fee included");
    // OC-12: no date in play ⇒ no chip, no number, no hint. All three chip strings are absent.
    expect(text).not.toContain("Spots available");
    expect(text).not.toContain("left");
    expect(text).not.toContain("Fully booked");
    expect(container.querySelector('[role="status"]')).toBeNull();
    // …and no availability line at all.
    expect(text).not.toContain("Available ");
  });

  it("(2) with a date in play: renders the date + venue tz and the server's chip, and NO clock time", () => {
    const { container } = render(
      <SearchResultCard
        listing={makeOpenRow({ spots: { remaining: 8, cap: 20, state: "open" } })}
        searchedWindow={{ date: FRIDAY }}
      />,
    );

    expect(screen.getByText("Fri, Aug 8 · Makati time")).toBeTruthy();
    expect(screen.getByText("Spots available")).toBeTruthy();
    // O2, executable: nothing in this card reads as a time, and the shipped exclusive line — whose
    // no-hours branch would look almost right — is not the one that rendered.
    const text = container.textContent ?? "";
    expect(text).not.toMatch(CLOCK_TIME);
    expect(text).not.toContain("Available ");
  });

  it("(3) with a date AND a searched start/end: STILL no clock time (O2 — the default lie)", () => {
    const { container } = render(
      <SearchResultCard
        listing={makeOpenRow({ spots: { remaining: 8, cap: 20, state: "open" } })}
        searchedWindow={{ date: FRIDAY, start: "09:00", end: "11:00" }}
      />,
    );

    const text = container.textContent ?? "";
    expect(text).not.toMatch(CLOCK_TIME);
    expect(text).not.toContain("Available ");
    // The date line is unaffected by the hours the searcher supplied.
    expect(screen.getByText("Fri, Aug 8 · Makati time")).toBeTruthy();
  });

  it("(4) renders the server's `low` state verbatim — the exact count, not a re-derivation", () => {
    render(
      <SearchResultCard
        listing={makeOpenRow({ spots: { remaining: 2, cap: 20, state: "low" } })}
        searchedWindow={{ date: FRIDAY }}
      />,
    );

    // `cap` 20 with 2 remaining is `low` only because the SERVER said so; the card never compares.
    expect(screen.getByText("Only 2 left")).toBeTruthy();
  });

  it("(5) links forward with the DATE ALONE — never a start/end window the listing page cannot resume", () => {
    const { container } = render(
      <SearchResultCard
        listing={makeOpenRow()}
        searchedWindow={{ date: FRIDAY, start: "09:00", end: "11:00" }}
      />,
    );

    const href = container.querySelector("a")?.getAttribute("href") ?? "";
    expect(href).toContain(`date=${FRIDAY}`);
    expect(href).not.toContain("start=");
    expect(href).not.toContain("end=");
  });

  it("(6) REGRESSION: an exclusive card with the same searched window is unchanged", () => {
    const { container } = render(
      <SearchResultCard
        listing={makeExclusiveRow()}
        searchedWindow={{ date: FRIDAY, start: "09:00", end: "11:00" }}
      />,
    );

    expect(
      screen.getByText("Available 9:00 AM–11:00 AM on Fri, Aug 8 · Makati time"),
    ).toBeTruthy();
    // No drop-in decoration leaks onto an exclusive card.
    expect(screen.queryByText("Drop-in")).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
    // …and the link still carries the whole window it always carried.
    const href = container.querySelector("a")?.getAttribute("href") ?? "";
    expect(href).toContain("start=09%3A00");
    expect(href).toContain("end=11%3A00");
  });

  it("(7) drop-in with NO date: the explainer renders, between the badge and the price", () => {
    const { container } = render(<SearchResultCard listing={makeOpenRow()} />);

    expect(screen.getByText(BLURB)).toBeTruthy();

    const text = container.textContent ?? "";
    // The line answers the question the badge just raised, and it does so BEFORE the price — a booker
    // reading top-down knows what they are buying before they are told what it costs.
    expect(text.indexOf("Drop-in")).toBeLessThan(text.indexOf(BLURB));
    expect(text.indexOf(BLURB)).toBeLessThan(text.indexOf("₱367.50/person"));
    // …and it did NOT land between the price and its qualifier: those two are one unit (D-ELM-01).
    expect(text.indexOf("Service fee included")).toBe(
      text.indexOf("₱367.50/person") + "₱367.50/person".length,
    );
    expect(text).not.toMatch(FORBIDDEN);
  });

  it("(8) drop-in with a date AND searched hours: the explainer coexists with O2", () => {
    const { container } = render(
      <SearchResultCard
        listing={makeOpenRow({ spots: { remaining: 8, cap: 20, state: "open" } })}
        searchedWindow={{ date: FRIDAY, start: "09:00", end: "11:00" }}
      />,
    );

    expect(screen.getByText(BLURB)).toBeTruthy();
    expect(screen.getByText("Fri, Aug 8 · Makati time")).toBeTruthy();

    // O2 now polices the NEW line too: both of these run over the WHOLE card text, so the explainer
    // cannot advertise an hour the pass does not reserve. Mutation M3 puts one in and must go RED.
    const text = container.textContent ?? "";
    expect(text).not.toMatch(CLOCK_TIME);
    expect(text).not.toContain("Available ");
    expect(text).not.toMatch(FORBIDDEN);
  });

  it("(9) REGRESSION: the exclusive card's whole rendered text is byte-identical to today", () => {
    const row = makeExclusiveRow();
    const { container } = render(
      <SearchResultCard
        listing={row}
        searchedWindow={{ date: FRIDAY, start: "09:00", end: "11:00" }}
      />,
    );

    // EXACT equality, composed from the card's own inputs in render order (D-ELM-05). The price segment
    // is `row.allInRateParts` — the SAME `allInRateParts` output the card renders from — and never a
    // hardcoded peso figure, so a SERVICE_FEE_BPS change moves both sides together instead of producing a
    // false failure here. Loosening this to `toContain` would remove the only teeth the case has.
    //
    // ── REORDERED BY PLAN 11-11, in that plan's own commit, and it is the ONLY line of this file the
    //    DS-11 container swap moved. `SearchResultCard` now renders through `patterns/result-card.tsx`,
    //    which owns where the price sits: money is the tile's LAST line, so a grid of tiles has its
    //    prices on one optical column instead of wherever each surface happened to put them (11-UI-SPEC
    //    § ResultCard, prop order). The availability line therefore precedes the price now rather than
    //    following it.
    //
    //    THE RED WAS WATCHED BEFORE THIS EDIT, and it is worth recording because it is what proves this
    //    assertion still has teeth after a whole-container rewrite. `npx vitest run tests/search`, with
    //    the swap in place and this array untouched, VERBATIM:
    //
    //      Expected: "…Pickleball court₱322.88/hrService fee includedAvailable 9:00 AM–11:00 AM on …"
    //      Received: "…Pickleball courtAvailable 9:00 AM–11:00 AM on Fri, Aug 8 · Makati time₱322.88/hr
    //                  Service fee included"
    //      Test Files  1 failed | 5 passed (6) · Tests  1 failed | 38 passed (39)
    //
    //    Cases (1)-(8) stayed GREEN through that rewrite — including (7)'s contiguity assertion, which
    //    is the D-ELM-01 property (the price and its qualifier are one unit). The container swap
    //    preserved it by construction: the card now passes both as a SINGLE `price` node, so there is
    //    no longer a gap between them for anything to land in. The diff above is the whole visible
    //    consequence of the adoption on an exclusive card — two segments moved, zero text changed.
    const expected = [
      "No photos yet",
      row.title ?? "Untitled space",
      SPACE_TYPE_LABELS.pickleball_court,
      "Available 9:00 AM–11:00 AM on Fri, Aug 8 · Makati time",
      row.allInRateParts.join(" · "),
      "Service fee included",
    ].join("");
    expect(container.textContent).toBe(expected);

    expect(screen.queryByText(BLURB)).toBeNull();
    expect(container.textContent ?? "").not.toMatch(FORBIDDEN);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // Case (10) — D-37, THE RATE-ONLY TILE, as an executable rule (plan 12-01).
  //
  // The card carries the all-in RATE and never a total computed from the searched window. That has
  // been true since the card shipped and it is stated as a header comment in `search-result-card.tsx`
  // — which is exactly the shape of guarantee this repo has twice watched go quietly false (the
  // `AUTH_SLOT_ICON` docblock, the `lg:sticky` count). A sentence in a file cannot fail.
  //
  // WHY IT IS WORTH PINNING NOW, IN A PLAN THAT DOES NOT TOUCH THIS COMPONENT. Phase 12 is the phase
  // that introduces a window total — the listing page's price breakdown and the checkout summary both
  // compute (rate × hours) + fees for the SAME searched window this card already receives in props.
  // The cheap-looking edit ("the searcher picked 9–11, show them what 9–11 costs") is one line, is
  // locally reasonable, and would put an unreserved price on the busiest surface in the product: the
  // tile is a search result, not a quote, and the hours are not held. This case is written BEFORE the
  // plans that build the totals, so the constraint arrives before the temptation.
  //
  // IT IS GREEN ON UNCHANGED `src/`, BY CONSTRUCTION — this plan modifies no component this file
  // renders. That is the point of a regression pin (the discipline case (9) states in its own note):
  // if it had gone red here it would be measuring this plan's changes rather than protecting the card.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("(10) REGRESSION (D-37): the tile shows the all-in RATE and no window total, in either mode", () => {
    const cases = [
      { label: "exclusive", row: makeExclusiveRow() },
      { label: "drop-in", row: makeOpenRow({ spots: { remaining: 8, cap: 20, state: "open" } }) },
    ] as const;

    for (const { label, row } of cases) {
      // A FULL window — date AND both hours — because that is precisely the input a total would be
      // computed FROM. Pinning this with `date` alone would leave the interesting case untested.
      const { container } = render(
        <SearchResultCard
          listing={row}
          searchedWindow={{ date: FRIDAY, start: "09:00", end: "11:00" }}
        />,
      );
      const text = container.textContent ?? "";

      // GUARD THE GUARD, FIRST. Every clause below is "the money we found was only the declared
      // money", and a card that rendered nothing satisfies that perfectly. Assert the card really
      // rendered, and really received the window.
      expect(text.length, `${label}: the card rendered nothing`).toBeGreaterThan(20);
      expect(text, `${label}: the title did not render`).toContain(row.title);

      // The declared money, taken from the SERVER's own finished strings rather than from a peso
      // figure typed here — so a SERVICE_FEE_BPS change moves both sides together (case (9)'s rule).
      const declared = moneyIn(row.allInRateParts.join(" · "));
      expect(declared.length, `${label}: the fixture declares no rate at all`).toBeGreaterThan(0);

      // THE ASSERTION. Every peso amount in the whole rendered card, in order, is exactly the
      // server's rate parts — no more, no fewer, nothing computed. `toEqual` on the ARRAY and not a
      // `toContain` per part: a total added beside the rate would satisfy "contains the rate".
      expect(moneyIn(text), `${label}: the tile renders money the rate parts do not declare`).toEqual(
        declared,
      );

      // …and the rate keeps its qualifier, which is the other half of D-37: an all-in rate that does
      // not say it is all-in is just a rate.
      expect(text, `${label}: the all-in qualifier is missing`).toContain("Service fee included");

      // A NAMED POSITIVE CONTROL for the exact string this case exists to keep out — the 2-hour
      // window total, derived from the card's own rate rather than hardcoded, so it stays the right
      // wrong answer if the fee moves. Redundant with the array equality above ON PURPOSE: it names
      // the failure mode, so a future reader meets "no window total" rather than inferring it.
      const rate = Number(declared[0].replace(/[₱,]/g, ""));
      const twoHourTotal = `₱${(rate * 2).toFixed(2)}`;
      expect(text, `${label}: a computed window total (${twoHourTotal}) reached the tile`).not.toContain(
        twoHourTotal,
      );

      cleanup();
    }
  });
});
