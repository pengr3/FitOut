// PaidStatement (13-CONTEXT D-99) — the one sentence that tells a booker the money is already gone.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE DEFECT THIS EXISTS TO CLOSE, IN THE PM'S OWN WORDS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// *"the ticket shows booking confirmed and not paid… there's no obvious key wherein it stated that it
// is already paid for."* Found in live UAT on 2026-08-21, and correct on the evidence: the confirmed
// page rendered a status BADGE, an `<h1>`, and a facts row labelled *Total* beside a figure. None of
// those three says whether the figure has been PAID or is DUE — and on a printed or screenshotted
// ticket, `Total ₱1,050.00` reads at least as naturally as an amount outstanding. The page knew the
// answer and never said it out loud.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// IT IS NOT `MoneyStatement`, AND THE SEPARATION IS DELIBERATE (D-73 / D-94)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `MoneyStatement` is STATE-06's single owner of the "where is your money" sentence on the FOUR
// statuses 13-UI-SPEC's copywriting contract writes one for: pending, not-completed, reversed and
// cancelled. D-94 closed that set explicitly and said an executor must not invent a fifth. This is not
// a fifth member of that set — it is a different sentence, with a different job, on a different branch:
// those four explain a payment that is unfinished, undone or returned, and this one states that a
// payment is COMPLETE. `MoneyStatement` is untouched by this file and mounts nowhere new.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// TWO PHASES, BECAUSE ONE SENTENCE WOULD BECOME FALSE ON WEDNESDAY
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-98 deleted the four-row trust panel and D-99 carried its ONE genuinely valuable sentence in here:
// *"FitOut holds your payment until after your session."* That is literally the hold-until-session
// payout model (PROJECT § the payout rule) — the full amount is collected to the platform wallet and
// the host's share is pushed only AFTER the session is delivered — so stated to a booker it is the
// answer to *where is my money*, which earns it a place in a PAYMENT statement even though it did not
// earn a panel of its own.
//
// ⚠ AND IT IS FALSE THE MOMENT THE SESSION ENDS, WHICH IS WHY `phase` EXISTS. The payout sweep runs at
// `endsAt + PAYOUT_DELAY_HOURS`, so on a booking whose session has already happened the hold has
// arrived at its end or has already released. A single unconditional sentence would therefore be true
// on the confirmed render and a lie on the derived `completed` one — the same booking, two days apart,
// on a page whose whole purpose is that a booker can trust what it says about their money. The
// `settled` phase drops the clause rather than rewording it, because the honest replacement would be a
// second claim about where the money is NOW, and this page has not read that.
//
// The paid FACT — the amount, in full — is stated on both. That is the half the PM asked for and the
// half that is true regardless of what the payout sweep has done.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// A SERVER COMPONENT TAKING A FINISHED STRING (GATE-05 / D-130)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// No client directive, no state, no arithmetic, and NO NUMERIC MONEY PROP: `amountPaid` arrives
// already through `formatMoney` in the RSC, exactly as it does for `MoneyStatement` and the
// confirmation moment. Nothing in here can move or recompute money.
//
// NO BOX OF ITS OWN. It renders as a bare `<p>` inside the heading block, directly under the
// status-meaning sentence — not as a `PanelCard`. A panel here would open a fourth box between the
// heading and the facts card on the one surface D-100 is simultaneously compacting, and the sentence's
// job is to be READ in the same breath as the status, not filed beside it.

/** The two truths this sentence can carry, keyed by whether the session has been delivered yet. */
export type PaidPhase =
  /** The session is still ahead (or running). The platform wallet is holding the money. */
  | "held"
  /** The session is over. The hold has arrived at its end — say nothing about where the money is. */
  | "settled";

export type PaidStatementProps = {
  /**
   * The frozen all-in total, ALREADY through `formatMoney` in the RSC — e.g. `₱1,050.00`.
   *
   * REQUIRED and never optional. A paid statement with no figure is the same failure as the row
   * labelled *Total* it exists to disambiguate: it names a state without naming what was paid.
   */
  amountPaid: string;
  /**
   * REQUIRED, never defaulted. An optional phase would let a call site silently inherit whichever
   * value was written first, and the two differ by a sentence that is a lie in one of them — see the
   * header. The caller already holds the derivation (`deriveDisplayStatus(...) === "completed"`), so
   * answering it costs nothing and forgetting it is not possible.
   */
  phase: PaidPhase;
};

/**
 * The clause, as a TS constant rather than JSX text — `trust-block.tsx:96`'s three reasons, and the
 * first still bites: `react/no-unescaped-entities` would force an escape into any JSX prose carrying
 * an apostrophe, and the source would stop being the same bytes as the rendered sentence.
 *
 * DELIBERATELY NOT EXPORTED. It is a COPY CONTRACT: the assertion is that this component renders THESE
 * WORDS, so `tests/booking/paid-statement.test.tsx` types them out instead. A test importing the
 * constant would compare the component to itself and pass through any rewording.
 */
const HOLD_CLAUSE = " FitOut holds your payment until after your session.";

export function PaidStatement({ amountPaid, phase }: PaidStatementProps) {
  const sentence = `Paid in full — ${amountPaid}.${phase === "held" ? HOLD_CLAUSE : ""}`;

  return (
    // `text-foreground` and not muted, which is the whole point: the sentence directly above it is the
    // status meaning at `text-muted-foreground`, and a paid statement that receded further than the
    // sentence explaining the status would be as easy to skim past as the row it disambiguates.
    // `tabular-nums` is the shipped idiom for a money-carrying prose line on this page
    // (`bookings/[id]/page.tsx`'s "Cancel today and … comes back"), kept so the figure sits on the
    // same rhythm as every other figure in the product.
    <p
      data-testid="paid-statement"
      className="mx-auto max-w-prose text-body font-medium tabular-nums text-foreground"
    >
      {sentence}
    </p>
  );
}
