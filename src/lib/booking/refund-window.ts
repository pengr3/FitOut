// The ONE owner of every refund-window sentence FitOut is willing to state (D-83).
//
// The idiom is `src/lib/site.ts`'s and `src/lib/payments/config.ts:1-3`'s, restated because it is the
// whole point of the file: *the exported NAME is imported everywhere, never a hardcoded literal*. A
// second spelling of a refund window is not a style problem — it is a promise about the booker's bank
// statement that the app cannot keep, made in a place nobody is looking.
//
// Pure/isomorphic: no "use client"/"use server" directive and NO server-only guard. This module is
// COPY. It performs no arithmetic, reads no environment and decides what nobody is charged, so D-34's
// deny-list does not reach it and a Server Component, an email shell and a client component may all
// read it.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠️ GREP TRIPWIRE — THE THREE PERMITTED NUMBERS (the `price-breakdown.tsx:28-33` idiom)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-83 narrows every refund-window claim in the product to exactly three verified facts, taken from
// PayMongo's published per-rail table (13-RESEARCH § Example 1, fetched 2026-08-20):
//
//     card    — up to 30 days, depending on the bank
//     GCash   — within 24 hours
//     Maya    — within 24 hours
//
// THERE IS NO FOURTH. `qrph` gets NO window here at all; it routes to the manual-return branch (D-82).
// A whole-source grep guards this: `grep -oiE '[0-9]+ *(day|hour)'` over this file must return only the
// two numbers above. If a future rail needs a window, it needs a SOURCE first.
//
// THE STRING THIS FILE SUPERSEDES. A shipped sentence — the one pairing *within* with a vague plural of
// *day*, promising the money is back on the original payment method — is UNSOURCED. It appears at three
// call sites: `src/app/(app)/bookings/[id]/page.tsx`, `src/app/(app)/bookings/[id]/cancel/page.tsx` and
// `src/lib/email.ts`. Those three are rewritten by the surface plans of this phase against the exports
// below. ⚠ That sentence is NOT spelled out anywhere in this file, deliberately: a grep is only a real
// guard if it cannot be tripped by the very comment forbidding the string. Do not write it out "just in
// a comment" — that disarms the check for good.
//
// D-82's PHRASING RULE, AND THE SECOND UNSPELLED PHRASE. When a rail has no automatic window, the money
// is NOT stuck: it sits on the FitOut platform wallet and a human can transfer it. So the accurate
// phrasing is always *"not reversed automatically"*. The phrase that pairs *cannot* with *be reversed*
// is banned outright — it states an impossibility that is false, and it is likewise not spelled
// contiguously here so the grep that bans it stays armed.
//
// And on the manual branch the word *refunded* is banned too (D-83). Note what that means structurally:
// the marker this module returns for such a rail carries NO SENTENCE AT ALL. There is nothing to
// accidentally say. The manual copy belongs to the surface, which also knows the CAUSE (D-82 splits the
// policy by cause, not by rail alone), and this module deliberately does not.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS MODULE DOES AND DOES NOT DECIDE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// It answers ONE question: *if an automatic refund was issued on this rail, what window may we state?*
// It does NOT decide whether a refund was issued. That is the caller's fact — it comes from the cause
// (a booker-initiated cancellation vs. the D-58 gone-slot backstop) and from whether the refund call
// actually succeeded. A caller on the manual branch does not ask this module for a window.

import { isApiRefundable } from "@/lib/payments/refund-rail";

/**
 * Provider token → the name a person would recognise on their own statement. Exported so a surface can
 * render "Paid with {name}" without retyping a brand, and so the two window sentences below can say
 * *"your GCash"* rather than *"your gcash"*.
 *
 * `qrph` is present ON PURPOSE even though it has no window: the receipt still has to name the rail the
 * booker actually used, and a rail with no window is not a rail with no name.
 */
const GCASH = "GCash";
const MAYA = "Maya";

export const RAIL_DISPLAY_NAME: ReadonlyMap<string, string> = new Map([
  ["card", "Card"],
  ["gcash", GCASH],
  ["paymaya", MAYA],
  ["qrph", "QR Ph"],
]);

/**
 * The three verified windows, and nothing else. Keyed on PayMongo's `source.type` token, which is what
 * the D-84 probe returns.
 *
 * ⚠ `grab_pay` is refundable per `REFUNDABLE_RAILS` and has a published window, and is DELIBERATELY
 * absent: `createCheckoutSession` offers `["card", "gcash", "paymaya", "qrph"]`, so no FitOut payment
 * can be on that rail. Adding a row would be a fourth number nobody has ever observed FitOut state.
 */
export const REFUND_WINDOW_BY_RAIL: ReadonlyMap<string, string> = new Map([
  ["card", "Card refunds can take up to 30 days to appear, depending on your bank."],
  // The brand names come from the SAME two bindings the display map is built from, so a rename lands
  // in both places or in neither — a `.get()` here would type as possibly-undefined and interpolate
  // the word "undefined" into a booker-facing sentence if the key ever moved.
  ["gcash", `It should be back in your ${GCASH} within 24 hours.`],
  ["paymaya", `It should be back in your ${MAYA} within 24 hours.`],
]);

/**
 * D-84's rail-free fallback: the sentence used when the live probe did not learn the rail. It names
 * every rail a FitOut booker could plausibly have used, so they recognise their own without the app
 * claiming to know which one it was.
 */
export const ALL_RAILS_REFUND_WINDOW =
  "Refunds to GCash and Maya are usually back within 24 hours; a card can take up to 30 days, " +
  "depending on your bank.";

/**
 * Either a window sentence to render, or the explicit marker that this rail has none.
 *
 * The marker is a KIND, not an empty string, so a caller cannot render it by accident: there is no
 * sentence on the manual path for a template to interpolate.
 */
export type RefundWindowStatement =
  | { kind: "window"; sentence: string }
  | { kind: "no-automatic-window" };

/**
 * The window sentence for a rail, or the no-automatic-window marker.
 *
 * TWO BRANCHES, AND THE ORDER OF THEM IS THE WHOLE DESIGN:
 *
 *   1. A rail we NEVER LEARNED (`null` — the D-84 probe fell back, or the row simply has no rail) is
 *      NOT the same fact as a rail we know PayMongo will not refund. It gets the rail-free sentence.
 *      This branch has to come FIRST, because `isApiRefundable(null)` is `false` by design — its
 *      fail-closed reading is about whether to CALL the refund API, which is a different question from
 *      what copy to show about a refund that already happened. Collapsing the two would silently route
 *      every fallback render onto the manual branch and tell bookers their money needs a human when it
 *      does not.
 *   2. Otherwise the refundable set decides, through the SHIPPED `isApiRefundable` — reused, never
 *      restated. A second spelling of the refundable set is exactly the bug this repository's
 *      one-owner rule exists to prevent, and `refund-rail.ts` says so in its own header:
 *      *"This module remains the ONLY branch point for refund dispatch. Do NOT inline this predicate."*
 *
 * FAILS CLOSED on an unrecognised rail: it is not in the refundable set, so it takes the marker and the
 * caller routes to the manual branch — the same direction `isApiRefundable` already fails.
 *
 * A refundable rail with no verified sentence (see `grab_pay` above) falls back to the all-rails
 * sentence rather than to the marker. That direction is deliberate: a refund WAS issued on such a rail,
 * so telling the booker it needs a human would be false in the other direction.
 */
export function refundWindowFor(rail: string | null | undefined): RefundWindowStatement {
  if (rail == null || rail === "") {
    return { kind: "window", sentence: ALL_RAILS_REFUND_WINDOW };
  }
  if (!isApiRefundable(rail)) {
    return { kind: "no-automatic-window" };
  }
  return {
    kind: "window",
    sentence: REFUND_WINDOW_BY_RAIL.get(rail) ?? ALL_RAILS_REFUND_WINDOW,
  };
}
