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

/** The payout-ledger state machine (mirrors host_payout_ledger.state / payout_ledger_state enum). */
export type PayoutLedgerState = "held" | "processing" | "paid" | "refunded" | "failed";

/** The presentation view for one payout state: label + tone (drives the badge recipe) + optional helper
 *  + the date prefix ("Expected {date}" while pending, "Paid {date}" once paid, "Refunded {date}"). */
export type PayoutLedgerView = {
  label: string;
  tone: "muted" | "outline" | "success" | "attention";
  helper?: string;
  datePrefix: "Expected" | "Paid" | "Refunded";
};

/** Derive the calm presentation view for a payout state (05-UI-SPEC § Payout state badge recipes). Pure,
 *  server-callable. Held/Processing/Refunded are neutral; Paid is --success; Failed is the attention edge. */
export function derivePayoutLedgerView(state: PayoutLedgerState): PayoutLedgerView {
  switch (state) {
    case "held":
      return {
        label: "Held",
        tone: "muted",
        helper: "Held until after the session",
        datePrefix: "Expected",
      };
    case "processing":
      return { label: "Processing", tone: "outline", datePrefix: "Expected" };
    case "paid":
      return { label: "Paid", tone: "success", datePrefix: "Paid" };
    case "refunded":
      return {
        label: "Refunded",
        tone: "muted",
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
