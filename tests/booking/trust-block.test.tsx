// @vitest-environment jsdom

// TRUST-04 / D-65 / D-66 / D-67 / D-68 — THE CLOSED FOUR-SIGNAL SET, AS AN EXECUTABLE CONTRACT.
//
// WHY THIS FILE EXISTS, AND WHY ITS CENTRAL ASSERTION IS A COUNT.
//
// `tests/design/trust-signals.test.ts` bans twelve NAMED tokens. That gate is necessary and it is not
// sufficient: it can only catch a fifth signal somebody spells in one of the twelve ways already
// imagined. The realistic fifth signal is the one nobody listed — an "Instant book champion" row, a
// "Trusted host" line, a tick glyph with a tooltip. D-68's rule is not "avoid these words", it is **the
// set is closed at four**, and the only assertion that expresses a closed set is an exact COUNT. A fifth
// row fails this file no matter what it says.
//
// The two gates are therefore complementary rather than redundant, and neither is the other's fallback.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE COPY IS RETYPED HERE ON PURPOSE, AND THAT IS NOT AN OVERSIGHT
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// `host-block.tsx:48` exports its two sentences so tests import instead of retyping, and that is the
// right rule for a sentence whose IDENTITY is what matters. It is the wrong rule here. These four
// strings are a COPY CONTRACT (13-UI-SPEC § Copywriting → The trust block): the thing being asserted is
// that the component renders THOSE WORDS, and a test that imported the component's own constants would
// compare the component to itself and pass through any rewording. So the four strings below are typed
// out from the contract, character for character, and the component keeps its own private constants.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// WHAT THIS FILE DELIBERATELY DOES NOT COVER
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// Nothing here asserts that the block renders on every status (D-67) — that is a property of
// `bookings/[id]/page.tsx` and is asserted where the branches are. Nothing here formats a date: the
// labels arrive pre-formatted from the RSC, which is the whole point of the prop shape, and
// `formatMemberSince` appears in neither the component nor this file.

import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { TrustBlock } from "@/components/booking/trust-block";

afterEach(cleanup);

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE FOUR STRINGS, VERBATIM FROM 13-UI-SPEC § Copywriting Contract → The trust block
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Signal 1 — D-65's reframing. A fact about where the booker's money is, not a host credential. */
const GUARANTEE = "FitOut holds your payment until after your session.";
/** Signal 2 — D-66. A plain date. There is deliberately no newness badge beside it. */
const HOST_SINCE_TERM = "Host since";
/** Signal 3 — absent entirely when the listing has no published timestamp. */
const PUBLISHED_TERM = "Listing published";
/** Signal 4, `instant`. */
const INSTANT = "Books instantly — no approval needed.";
/** Signal 4, `request`. Says "approves", not the verb Phase 12's listing copy uses (TRUST-04 scan). */
const REQUEST = "This host approves each request before it's confirmed.";

const BASE = {
  hostSinceLabel: "June 2026",
  listingPublishedLabel: "July 2026",
  reference: "FIT-8Q3KZ1RA",
} as const;

/**
 * The block's SIGNAL rows — its direct-child rows, minus the guarded support row.
 *
 * The exclusion is written now rather than the day it matters. `SupportPath` renders NOTHING while
 * `SUPPORT_EMAIL` is null (D-64), so today a bare child count and this function agree; the day an
 * operator sets that constant they would stop agreeing, and the count assertions below would start
 * failing for a reason that has nothing to do with the closed set. A test that only holds in one of the
 * two states of a documented guard is a test with an expiry date on it.
 */
function signalRows(container: HTMLElement): HTMLElement[] {
  const block = container.querySelector<HTMLElement>('[data-testid="trust-block"]');
  expect(block, "the trust block did not render at all").not.toBeNull();
  return Array.from(block!.children).filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement && el.getAttribute("data-testid") !== "support-path",
  );
}

/** The `<dd>` text of each signal row, in document order. */
function rowValues(container: HTMLElement): string[] {
  return signalRows(container).map((row) => row.querySelector("dd")?.textContent?.trim() ?? "");
}

/** The `<dt>` text of each signal row, in document order. */
function rowTerms(container: HTMLElement): string[] {
  return signalRows(container).map((row) => row.querySelector("dt")?.textContent?.trim() ?? "");
}

describe("TrustBlock — the closed four-signal set (D-68)", () => {
  it("(1) `full` renders EXACTLY four signal rows — a fifth fails this assertion whatever it says", () => {
    const { container } = render(
      <TrustBlock variant="full" bookingMode="instant" {...BASE} />,
    );

    // THE COUNT IS THE REQUIREMENT. Presence assertions would pass a block with six rows.
    expect(
      signalRows(container),
      "D-68 closes the booker-facing signal set at four, each mapped to a real column. A fifth row " +
        "is a defect, not a design decision — there is no column to back it and D-80 forbids adding " +
        "one this phase.",
    ).toHaveLength(4);

    // …and they are THESE four, in this order.
    expect(rowValues(container)).toEqual([GUARANTEE, "June 2026", "July 2026", INSTANT]);
    expect(rowTerms(container)[1]).toBe(HOST_SINCE_TERM);
    expect(rowTerms(container)[2]).toBe(PUBLISHED_TERM);
  });

  it("(2) `condensed` renders EXACTLY two rows, and they are signals 1 and 4 — not the first two", () => {
    const { container } = render(
      <TrustBlock variant="condensed" bookingMode="request" {...BASE} />,
    );

    expect(signalRows(container)).toHaveLength(2);
    // The distinction that matters: at the instant of payment the two questions are *where is my
    // money* and *what happens next*. Taking the first two rows off the top would answer neither.
    expect(rowValues(container)).toEqual([GUARANTEE, REQUEST]);

    // Host tenure and listing age are one scroll below in the full block, permanently — never here.
    expect(screen.queryByText(HOST_SINCE_TERM)).toBeNull();
    expect(screen.queryByText(PUBLISHED_TERM)).toBeNull();
    expect(screen.queryByText("June 2026")).toBeNull();
  });

  it("(3) a null published label removes the row — no placeholder, no em dash, no empty cell", () => {
    const { container } = render(
      <TrustBlock
        variant="full"
        bookingMode="instant"
        hostSinceLabel={BASE.hostSinceLabel}
        listingPublishedLabel={null}
        reference={BASE.reference}
      />,
    );

    expect(signalRows(container)).toHaveLength(3);
    expect(rowValues(container)).toEqual([GUARANTEE, "June 2026", INSTANT]);

    // The failure this pins is not "the row is missing", it is "the row is present and says nothing":
    // a `<dd>` holding an em dash, a hyphen or the empty string reads to a booker as a fact FitOut
    // has and is withholding, which is worse than the absence.
    expect(screen.queryByText(PUBLISHED_TERM)).toBeNull();
    for (const value of rowValues(container)) {
      expect(value.length, "a signal row rendered with no value").toBeGreaterThan(0);
      expect(["—", "-", "–", "n/a", "N/A"]).not.toContain(value);
    }
  });

  it("(4) each bookingMode renders its OWN sentence, and never the other one", () => {
    const instant = render(<TrustBlock variant="full" bookingMode="instant" {...BASE} />);
    expect(instant.container.textContent).toContain(INSTANT);
    expect(instant.container.textContent).not.toContain(REQUEST);
    cleanup();

    const request = render(<TrustBlock variant="full" bookingMode="request" {...BASE} />);
    expect(request.container.textContent).toContain(REQUEST);
    expect(request.container.textContent).not.toContain(INSTANT);
  });

  it("(5) carries `data-testid=\"trust-block\"` exactly once, on a `<dl>`", () => {
    const { container } = render(<TrustBlock variant="full" bookingMode="instant" {...BASE} />);

    const hooks = container.querySelectorAll('[data-testid="trust-block"]');
    // The per-status presence check and the closed-set scan both target this id; a selector that
    // resolved to two elements would silently assert about whichever came first.
    expect(hooks).toHaveLength(1);
    expect(hooks[0].tagName).toBe("DL");
  });

  it("(6) every row is a `<dt>` + `<dd>` pair — no row is icon-only", () => {
    const { container } = render(<TrustBlock variant="full" bookingMode="request" {...BASE} />);

    for (const row of signalRows(container)) {
      const dt = row.querySelector("dt");
      const dd = row.querySelector("dd");
      expect(dt, "a trust row has no term — that is not a definition-list row").not.toBeNull();
      expect(dd, "a trust row has no description").not.toBeNull();
      // 13-UI-SPEC § The Trust Block: icons optional and `aria-hidden`; NO row is icon-only. A glyph
      // with no text beside it is a signal only a sighted reader receives.
      expect(dt!.textContent?.trim().length ?? 0).toBeGreaterThan(0);
      expect(dd!.textContent?.trim().length ?? 0).toBeGreaterThan(0);
      // Any icon that does ride along is hidden from the accessibility tree.
      for (const svg of Array.from(row.querySelectorAll("svg"))) {
        expect(svg.getAttribute("aria-hidden")).toBe("true");
      }
    }
  });

  it("(7) no row carries a colour that encodes a verdict", () => {
    const { container } = render(<TrustBlock variant="full" bookingMode="instant" {...BASE} />);

    // The block states facts. A green "Host since" or a red "Listing published" would turn a date into
    // a judgement, which is the same move the forbidden badges make — 13-UI-SPEC forbids it in the
    // element description, and `--destructive` renders NOWHERE in this phase (13-UI-SPEC § Color).
    const VERDICT = [
      "text-success",
      "text-destructive",
      "text-attention",
      "bg-success",
      "bg-destructive",
      "border-destructive",
    ];
    const block = container.querySelector('[data-testid="trust-block"]')!;
    for (const el of [block, ...Array.from(block.querySelectorAll("*"))]) {
      const classes = (el.getAttribute("class") ?? "").split(/\s+/);
      for (const banned of VERDICT) {
        expect(classes, `${banned} rides a trust row`).not.toContain(banned);
      }
    }
  });

  it("(8) mounts the guarded support row and nothing else — zero of them while the constant is null", () => {
    const { container } = render(<TrustBlock variant="full" bookingMode="instant" {...BASE} />);

    // D-64: `SupportPath` renders NOTHING today, and this component does not test the constant itself
    // — it mounts the component unconditionally and lets it decide. That is the property that keeps
    // the guarded literal in the one file that holds the guard.
    expect(container.querySelectorAll('[data-testid="support-path"]')).toHaveLength(0);
    // …and the four signal rows are unaffected by that absence, which is the point of the row-count
    // helper excluding it.
    expect(signalRows(container)).toHaveLength(4);
  });
});
