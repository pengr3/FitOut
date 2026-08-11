// Pure payout-LEDGER-state derivation — a NON-client module (no client directive) so the HOST-03
// earnings Server Component can CALL derivePayoutLedgerView / summarizePayouts directly. A client-directive
// module's exports become client references when imported by a Server Component and cannot be invoked
// server-side (that crashed /host in UAT for the onboarding derivation — see ./payout-status.ts). Keep
// this file free of the client directive and of any client-only imports.
//
// Distinct from ./payout-status.ts (the ONBOARDING banner state not_started→enabled). This derives the
// per-booking PAYOUT state (D-59): Held → Processing → Paid, plus Refunded, plus the internal Failed edge.
// The states are CALM (D-59 / 05-UI-SPEC): Held/Processing/Refunded are neutral, Paid is the one success
// signal, and Failed is the only destructive edge — none of the happy states is ever rendered as red.
//
// DS-10: the tone is `StatusTone`, the closed four-tone vocabulary in @/lib/design/status-tones, and it is
// the SAME union the booking status view is typed against. This file used to declare a four-value tone
// union and the booking view a three-value one; the values overlapped but the alphabets did not match, so
// "the badge vocabulary" was a claim rather than a type. The two in-flight/closed treatments this file used
// to spell out collapse to `neutral`, the success treatment becomes `positive`, and `attention` keeps both
// its name and its meaning — a genuine failure needing a human, which for a host is a failed payout.

import type { StatusTone } from "@/lib/design/status-tones";

/** The payout-ledger state machine (mirrors host_payout_ledger.state / payout_ledger_state enum). */
export type PayoutLedgerState = "held" | "processing" | "paid" | "refunded" | "failed";

/** The presentation view for one payout state: label + tone (drives the badge recipe) + optional helper
 *  + the date prefix ("Expected {date}" while pending, "Paid {date}" once paid, "Refunded {date}"). */
export type PayoutLedgerView = {
  label: string;
  tone: StatusTone;
  helper?: string;
  datePrefix: "Expected" | "Paid" | "Refunded";
};

/** Derive the calm presentation view for a payout state (05-UI-SPEC § Payout state badge recipes). Pure,
 *  server-callable. Held/Processing/Refunded are neutral; Paid is --success; Failed is the attention edge. */
export function derivePayoutLedgerView(state: PayoutLedgerState): PayoutLedgerView {
  switch (state) {
    case "held":
      // Held is the DESIGNED resting state of every payout, not a delay. Neutral, never a warning.
      return {
        label: "Held",
        tone: "neutral",
        helper: "Held until after the session",
        datePrefix: "Expected",
      };
    case "processing":
      // In-flight. DS-10 folds the old bordered treatment into `neutral`; the ArrowLeftRight icon is
      // what distinguishes it from Held, as it always was.
      return { label: "Processing", tone: "neutral", datePrefix: "Expected" };
    case "paid":
      return { label: "Paid", tone: "positive", datePrefix: "Paid" };
    case "refunded":
      return {
        label: "Refunded",
        tone: "neutral",
        helper: "This booking was refunded — no payout.",
        datePrefix: "Refunded",
      };
    case "failed":
      return { label: "Needs attention", tone: "attention", datePrefix: "Expected" };
  }
}

/** The minimal shape summarizePayouts needs from a ledger row (state + the frozen net). */
export type PayoutLedgerAmount = { state: PayoutLedgerState; netCents: number };

/** Sum the earnings summary totals server-side (05-UI-SPEC § Host earnings copy):
 *    - Upcoming payouts = sum(net where state ∈ held | processing)
 *    - Paid out         = sum(net where state = paid)
 *  Refunded / failed rows contribute to NEITHER total. Pure + integer-cents (no client arithmetic);
 *  shared by the earnings page and its test so the summing logic can never drift. */
export function summarizePayouts(rows: PayoutLedgerAmount[]): {
  upcomingCents: number;
  paidCents: number;
} {
  let upcomingCents = 0;
  let paidCents = 0;
  for (const r of rows) {
    if (r.state === "held" || r.state === "processing") upcomingCents += r.netCents;
    else if (r.state === "paid") paidCents += r.netCents;
  }
  return { upcomingCents, paidCents };
}
