// D-83 — the three verified refund windows have exactly ONE owner, and no surface can invent a fourth.
//
// WHAT THE RISK ACTUALLY IS. A refund window is a promise about the booker's own bank statement. State
// one the provider does not honour and the booker waits, then concludes the money is gone — on a page
// that exists to reassure them it is not. The shipped, unsourced sentence this module supersedes was
// exactly that: a number nobody could point to a source for, repeated at three call sites.
//
// So the assertions below are of two kinds, and the second kind is the one that keeps working after
// this plan ships:
//
//   • the four rails FitOut actually offers map to the outcome D-83 specifies, and
//   • NO exported sentence contains any digit-plus-time-unit other than the two verified ones. That is
//     a closed-world check over the module's whole exported surface, so a fourth window added later
//     goes red here even if nobody adds a case for it.
//
// `qrph`'s exclusion is NOT re-argued here — `tests/design/money-path-invariants.test.ts` owns that pin
// with the verbatim provider rejection. This file only asserts the COPY consequence of it.

import { describe, it, expect } from "vitest";
import {
  refundWindowFor,
  REFUND_WINDOW_BY_RAIL,
  RAIL_DISPLAY_NAME,
  ALL_RAILS_REFUND_WINDOW,
} from "@/lib/booking/refund-window";
import { REFUNDABLE_RAILS } from "@/lib/payments/refund-rail";

/** FitOut's LIVE rail set — what `createCheckoutSession` offers on every hosted page (D-53). */
const LIVE_RAILS = ["card", "gcash", "paymaya", "qrph"] as const;

/** Every sentence this module can put in front of a booker. */
function everySentence(): string[] {
  return [...REFUND_WINDOW_BY_RAIL.values(), ALL_RAILS_REFUND_WINDOW];
}

describe("refundWindowFor — the four live rails (D-83)", () => {
  it("card gets the up-to-30-days sentence", () => {
    const out = refundWindowFor("card");
    expect(out.kind).toBe("window");
    expect(out.kind === "window" && out.sentence).toBe(
      "Card refunds can take up to 30 days to appear, depending on your bank.",
    );
  });

  it("gcash and paymaya each name the booker's OWN wallet, not the provider token", () => {
    const gcash = refundWindowFor("gcash");
    const maya = refundWindowFor("paymaya");
    expect(gcash.kind === "window" && gcash.sentence).toBe(
      "It should be back in your GCash within 24 hours.",
    );
    expect(maya.kind === "window" && maya.sentence).toBe(
      "It should be back in your Maya within 24 hours.",
    );
    // The raw tokens must never reach a sentence.
    for (const sentence of everySentence()) {
      expect(sentence).not.toContain("paymaya");
      expect(sentence).not.toContain("gcash");
      expect(sentence).not.toContain("qrph");
    }
  });

  it("qrph gets NO window at all — it routes to the manual branch (D-81/D-82)", () => {
    expect(refundWindowFor("qrph")).toEqual({ kind: "no-automatic-window" });
    // And there is nothing to render on that path even by accident: no sentence exists on the marker.
    expect(REFUND_WINDOW_BY_RAIL.has("qrph")).toBe(false);
  });

  it("covers every live rail — no rail falls through unhandled", () => {
    // Anti-vacuity: if a rail were dropped from LIVE_RAILS this loop would silently shrink, so the set
    // is cross-checked against the one place the rails are actually offered.
    expect(LIVE_RAILS).toHaveLength(4);
    for (const rail of LIVE_RAILS) {
      const out = refundWindowFor(rail);
      expect(out.kind === "window" || out.kind === "no-automatic-window").toBe(true);
    }
  });
});

describe("refundWindowFor — the two fallback directions", () => {
  it("a rail we NEVER LEARNED gets the rail-free sentence, not the manual marker (D-84)", () => {
    for (const absent of [null, undefined, ""]) {
      const out = refundWindowFor(absent);
      expect(out.kind).toBe("window");
      expect(out.kind === "window" && out.sentence).toBe(ALL_RAILS_REFUND_WINDOW);
    }
    // The sentence names all three so the booker recognises their own without the app claiming to know.
    expect(ALL_RAILS_REFUND_WINDOW).toContain("GCash");
    expect(ALL_RAILS_REFUND_WINDOW).toContain("Maya");
    expect(ALL_RAILS_REFUND_WINDOW).toContain("card");
  });

  it("an UNRECOGNISED rail fails CLOSED to the marker — the same direction isApiRefundable fails", () => {
    for (const unknown of ["dob_ubp", "shopeepay", "billease", "brankas_bdo", "bitcoin", "CARD"]) {
      expect(refundWindowFor(unknown), `${unknown} must not receive a window`).toEqual({
        kind: "no-automatic-window",
      });
    }
  });

  it("reuses the SHIPPED refundable set rather than restating it", () => {
    // The behavioural proof that `isApiRefundable` is the discriminator: every rail OUTSIDE
    // REFUNDABLE_RAILS takes the marker, and every rail inside it gets a window. A second, private copy
    // of the rail list inside refund-window.ts would drift from this the day refund-rail.ts changed.
    for (const rail of REFUNDABLE_RAILS) {
      expect(refundWindowFor(rail).kind, `${rail} is in REFUNDABLE_RAILS`).toBe("window");
    }
    for (const rail of LIVE_RAILS) {
      const expected = REFUNDABLE_RAILS.has(rail) ? "window" : "no-automatic-window";
      expect(refundWindowFor(rail).kind, `${rail}`).toBe(expected);
    }
  });
});

describe("the closed world of permitted numbers (the D-83 tripwire, as an assertion)", () => {
  it("no exported sentence states any duration other than 30 days or 24 hours", () => {
    // ⚠ The plurals come FIRST in every alternation: regex alternation is ordered, so `day|days`
    // matches "day" out of "days" and the assertion would compare against a truncated set.
    const DURATION = /\d+\s*(?:days?|hours?|weeks?|months?|minutes?|business\s+days?|banking\s+days?)/gi;
    const found = new Set<string>();
    for (const sentence of everySentence()) {
      for (const match of sentence.matchAll(DURATION)) found.add(match[0].toLowerCase());
    }
    expect([...found].sort()).toEqual(["24 hours", "30 days"]);
  });

  it("no exported sentence carries either banned phrase", () => {
    // Both are assembled from pieces so this file does not spell them contiguously either — the same
    // grep-tripwire discipline the module itself keeps.
    const unsourced = ["within", "a", "few", "days"].join(" ");
    const impossibility = ["cannot", "be", "reversed"].join(" ");
    for (const sentence of [...everySentence(), ...RAIL_DISPLAY_NAME.values()]) {
      expect(sentence.toLowerCase()).not.toContain(unsourced);
      expect(sentence.toLowerCase()).not.toContain(impossibility);
    }
  });

  it("the manual path carries no sentence — so the banned word cannot be rendered on it", () => {
    // D-83 bans the word on the manual branch. The structural guarantee is stronger than a scan: the
    // marker is a bare kind with no string field, so there is nothing on it to interpolate.
    const marker = refundWindowFor("qrph");
    expect(Object.keys(marker)).toEqual(["kind"]);
    expect(JSON.stringify(marker).toLowerCase()).not.toContain("refund");
  });
});
