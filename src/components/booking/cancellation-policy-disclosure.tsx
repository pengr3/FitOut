// The D-81 cancellation-policy disclosure — the ONE component that tells a booker, before they commit
// money, what they get back if they cancel. Rendered on the listing detail page (generic) and at checkout
// (concrete dates for THIS booking).
//
// WHY THIS EXISTS: "a refund promise the booker demonstrably saw is the only kind enforceable in spirit"
// (D-81). Phase 7 already had the whole refund apparatus — the D-68 ladder (07-03), the tier snapshot
// (07-08), the cancel review screen (07-09) — but nothing that showed a booker the terms BEFORE they paid.
// Without this surface the tier is an invisible setting that silently decides how much money comes back.
//
// ══ THE LOAD-BEARING RULE: DISCLOSURE MUST EQUAL ENFORCEMENT ══════════════════════════════════════════
// Every percentage, every hour figure and the ORDER of the rungs below are DERIVED FROM `LADDER` — the
// same constant `quoteRefund` evaluates. None of it is hand-typed. This is not tidiness: hand-typed copy
// drifts from the money math the first time a rung moves, and this is precisely the surface where that
// drift becomes a refund dispute — the booker points at what they were shown, the ladder says otherwise.
// Editing a rung in cancellation.ts therefore rewrites this copy automatically.
// `tests/booking/cancellation-policy.test.ts` derives BOTH the disclosure and `quoteRefund` from `LADDER`
// and asserts they agree at every rung boundary, so the tie cannot be quietly cut.
//
// ══ THE DISCLOSURE PERFORMS NO DATE MATH AND NO MONEY ARITHMETIC ══════════════════════════════════════
// Concrete boundary INSTANTS come from `rungBoundaries(tier, startsAt)` called SERVER-SIDE in the RSC, and
// arrive here already formatted venue-local via `composeDeadlineLabel` — the module that owns venue-local
// rendering (07-02). No fifth time format is invented here, and no client clock can influence a boundary
// (T-07-92). This mirrors the server-computed-props, zero-arithmetic contract `PriceBreakdown` documents.
//
// ══ WHY NATIVE <details> AND NOT AN ACCORDION ═════════════════════════════════════════════════════════
// The researcher's call (07-UI-SPEC § 5 / Open Question 7): no `accordion` or `collapsible` block is
// installed. `<details>` needs zero new blocks, zero client boundary — it expands inside a Server
// Component with no JS at all — and degrades gracefully. A future planner may substitute the
// official-registry `accordion` (that registry needs no vetting gate) if a design-consistency argument
// emerges; nothing here depends on the primitive.
//
// This file is a SERVER component: it carries NO client directive, so it renders inside an RSC and ships
// no JS. (The directive string is deliberately not spelled anywhere in this file, so a grep for it stays a
// real guard that fails the moment someone actually adds one — the 07-03/07-09 tripwire discipline.)

import { LADDER, type CancellationTier } from "@/lib/payments/cancellation";

/** Tier names as a booker reads them. Keyed off the union, so a new tier fails compilation here. */
const TIER_LABELS: Record<CancellationTier, string> = {
  flexible: "Flexible",
  standard: "Standard",
  strict: "Strict",
};

/**
 * WR-05 / T-09-88 — the ONE sentence a booker reads when they are buying a pass for a day that has ALREADY
 * opened. Every rung on the ladder has lapsed by then, so restating the ladder here would be disclosing a
 * refund window that closed before the purchase was made: "you bought it, it's final, and nothing told you"
 * is the outcome this string exists to prevent.
 *
 * O3 grammar — a statement plus what it means. No exclamation, and never rendered in the red error variant
 * this design system reserves for failures: it is a fact about money, not an alarm. (The class name is
 * DELIBERATELY not spelled anywhere in this file, because an acceptance grep counts its occurrences and a
 * guard a comment can trip is not a guard — the same tripwire discipline this file's header already uses
 * for the client directive.)
 *
 * ══ A TS STRING CONSTANT, NOT JSX TEXT — three reasons this file already demonstrates ══════════════════
 *   - LINT. `react/no-unescaped-entities` makes a literal apostrophe in JSX text an ERROR, which is exactly
 *     why the service-fee paragraph below is written with an HTML entity. Inside a string literal no escape
 *     is needed, so the SOURCE and the RENDERED sentence are the same bytes and a copy audit can grep the
 *     one it is actually looking for.
 *   - ONE COPY. Every O3 sentence in this phase lives in exactly one place (`SOLD_OUT_MESSAGE`,
 *     `PAST_DATE_MESSAGE`, `MODE_LOCKED_MESSAGE`, `HOURS_LOCKED_MESSAGE`). The jsdom cases IMPORT this
 *     rather than retyping it, so a copy change stays a one-line, one-file act.
 *   - WHITESPACE. `mode-lock-notice.tsx`'s header records that SWC's JSX whitespace transform strips the
 *     leading space of text following an expression container — the defect that once shipped
 *     "₱300.00in cancellation fees". A single string literal cannot have it.
 */
export const PASS_NON_REFUNDABLE_MESSAGE =
  "The space is already open, so this pass can't be refunded if you cancel.";

/**
 * 09-UI-SPEC § 5b — WHICH INSTANT THE DEADLINE COPY NAMES. The ladder itself is reused UNCHANGED for a
 * drop-in pass (OC-15: `quoteRefund`, `LADDER` and `rungBoundaries` are byte-identical); the ONLY thing that
 * differs is the word for what `starts_at` is. On an exclusive booking it is when the SESSION starts; on an
 * open-capacity booking OC-03 makes it the instant the SPACE OPENS on the booked date.
 *
 * REQUIRED, never optional — the same argument `when-label.ts` makes for `WhenLabelInput.openCapacity`
 * (09-08): an optional flag lets one surface silently keep telling a drop-in booker to cancel "before the
 * session", a session that does not exist. It is declared ONCE, here, and intersected into every consumer's
 * props/params below, so the compiler asks the question at every call site and there is exactly one place a
 * future reader has to look to learn why.
 */
export type DeadlineAnchorInput = {
  /** True ⇒ this booking (or listing) sells drop-in passes: the deadline is the venue's opening time. */
  openCapacity: boolean;
};

/** One rendered rung: WHEN the booker must cancel by, and WHAT they get if they do. */
export type PolicyDisclosureLine = { when: string; outcome: string };

/**
 * The outcome clause for a rung, derived from its basis points. A full refund is stated in words rather
 * than as "100%" because that is how a booker reads it; every other rung names its percentage.
 *
 * "of the space price" is not decoration — it is the honest scope. The service fee is never refunded
 * (D-74), so saying "full refund" unqualified would overstate what comes back.
 */
function outcomeFor(refundBps: number): string {
  if (refundBps >= 10000) return "full refund of the space price";
  return `${refundBps / 100}% of the space price refunded`;
}

/**
 * The expanded rung list, DERIVED ENTIRELY FROM `LADDER` — see this file's header. One line per rung, in
 * the ladder's own descending order (most generous first), plus the closing no-refund line.
 *
 * @param boundaryLabels Concrete mode ONLY: pre-formatted venue-local instants, index-aligned with
 *        `LADDER[tier]`. Omitted → generic mode, where rungs are stated relative to session start.
 *
 * Throws on a length mismatch rather than rendering. A caller that formatted boundaries for one tier and
 * passed a different tier would otherwise disclose dates that belong to a policy the booker isn't under —
 * silently, and only visibly wrong to the booker. Same throw-don't-freeze discipline as the money modules.
 */
export function policyDisclosureLines(
  tier: CancellationTier,
  { openCapacity }: DeadlineAnchorInput,
  boundaryLabels?: readonly string[],
): PolicyDisclosureLine[] {
  const rungs = LADDER[tier];
  if (boundaryLabels && boundaryLabels.length !== rungs.length) {
    throw new Error(
      `cancellation disclosure: got ${boundaryLabels.length} boundary labels for ${rungs.length} ${tier} rungs`,
    );
  }
  const lines: PolicyDisclosureLine[] = rungs.map((rung, i) => ({
    // CONCRETE mode names an INSTANT and therefore no anchor word at all — which is why the drop-in fork
    // touches the generic branch only (09-UI-SPEC § 5b). Both sentences are spelled out in full rather than
    // interpolated from a shared noun, so a copy audit can grep either one whole.
    when: boundaryLabels
      ? `Cancel before ${boundaryLabels[i]}`
      : openCapacity
        ? `Cancel at least ${rung.minHours} hours before the space opens`
        : `Cancel at least ${rung.minHours} hours before the session`,
    outcome: outcomeFor(rung.refundBps),
  }));
  // The last rung's floor is where refunds stop. Stated explicitly so the ladder has no silent bottom.
  lines.push({ when: "After that", outcome: "no refund" });
  return lines;
}

/**
 * The collapsed one-liner, also derived from `LADDER`: it names the instant (or the lead time) up to which
 * cancellation is free, which is the single fact most bookers want and the only one worth a summary line.
 *
 * If a future ladder edit leaves a tier with no 100% rung at all, this deliberately does NOT say "free
 * cancellation" — it falls back to naming the tier. A summary that promises a free cancellation the ladder
 * won't honour is the exact failure this module exists to prevent.
 *
 * ══ T4-rung: CONCRETE MODE LEADS WITH THE BEST STILL-FUTURE RUNG ══════════════════════════════════════
 * The bug this closes: the one-liner used to ALWAYS lead with the ladder's top (100%) rung, so once that
 * rung's boundary had passed for THIS booking the summary advertised "Free cancellation until <past
 * instant>" — a window the refund engine would never honour, while the expanded list below was already
 * correct. In concrete mode the caller passes `bestRungIndex` (the index of the best rung whose boundary
 * is still in the future, computed SERVER-SIDE by the RSC via `bestFutureRungIndex`), and this line names
 * THAT rung. The component still performs NO date math — it only forwards the number.
 */
export function policySummaryLine(
  tier: CancellationTier,
  { openCapacity }: DeadlineAnchorInput,
  boundaryLabels?: readonly string[],
  bestRungIndex?: number,
): string {
  // GENERIC MODE (the listing page, no concrete instants): state the ladder's own free cancellation lead
  // time relative to the anchor this listing actually has — the session start for an hourly booking, the
  // venue's opening time for a drop-in pass (09-UI-SPEC § 5b). `bestRungIndex` is a per-booking,
  // time-relative fact that only makes sense against concrete boundaries, so it is ignored here.
  if (!boundaryLabels) {
    const i = LADDER[tier].findIndex((r) => r.refundBps >= 10000);
    if (i === -1) return `${TIER_LABELS[tier]} cancellation policy`;
    return openCapacity
      ? `Free cancellation up to ${LADDER[tier][i].minHours} hours before the space opens.`
      : `Free cancellation up to ${LADDER[tier][i].minHours} hours before the session.`;
  }

  // CONCRETE MODE (checkout, dates for THIS booking).
  //   - `bestRungIndex` omitted → keep the pre-T4-rung behaviour (lead with the ladder's top 100% rung) so
  //     a caller that has not adopted the index cannot regress;
  //   - `-1` → every boundary has passed: promise NO window. Name the tier (the same truthful fallback the
  //     no-100%-rung case returns) — NEVER "Free cancellation";
  //   - otherwise → lead with the best still-future rung: a full-refund rung reads "Free cancellation
  //     until <date>", any lesser rung names its percentage ("50% refund until <date>").
  //
  // ⚠️ DELIBERATELY NOT FORKED FOR A DROP-IN PASS. Every line below names a concrete venue-local INSTANT and
  // no anchor noun, and OC-03 already makes that instant the venue's opening time — so "Free cancellation
  // until Thu 7 Aug, 8:00 AM (Makati time)" is ALREADY correct in both modes. 09-UI-SPEC § 5b lists these
  // strings as unchanged on purpose. Do not "finish the fork" here: a second wording for the same instant is
  // drift, not accuracy, and `openCapacity` is intentionally unread past this point.
  if (bestRungIndex === undefined) {
    const i = LADDER[tier].findIndex((r) => r.refundBps >= 10000);
    if (i === -1) return `${TIER_LABELS[tier]} cancellation policy`;
    return `Free cancellation until ${boundaryLabels[i]}`;
  }
  if (bestRungIndex === -1) return `${TIER_LABELS[tier]} cancellation policy`;
  const rung = LADDER[tier][bestRungIndex];
  const label = boundaryLabels[bestRungIndex];
  if (rung.refundBps >= 10000) return `Free cancellation until ${label}`;
  return `${rung.refundBps / 100}% refund until ${label}`;
}

/** `openCapacity` is REQUIRED by intersection — see DeadlineAnchorInput for why it is not optional. */
export type CancellationPolicyDisclosureProps = DeadlineAnchorInput & {
  /**
   * At checkout this MUST be the booking's own snapshotted tier (`booking.cancellation_policy`), not the
   * listing's current one — that snapshot is what `quoteRefund` will later read, so sourcing the display
   * from anywhere else could disclose terms the refund engine won't apply (T-07-90).
   *
   * NULL renders NOTHING. See the note below the component.
   */
  tier: CancellationTier | null | undefined;
  /**
   * WR-05 / T-09-88 — TRUE ⇒ the day this pass covers has ALREADY opened, so no rung can still be awarded
   * and the disclosure states the outcome plainly instead of restating the ladder.
   *
   * REQUIRED, never optional, for the same reason `openCapacity` is (09-08 / 09-09): an optional flag lets a
   * surface silently keep rendering the future-date refund promise for a pass that is already non-refundable
   * — and still typecheck. There are exactly TWO call sites, so requiring it is a two-file compiler census
   * rather than a burden.
   *
   * Computed SERVER-SIDE at both call sites and never from a client clock (D-105); the component performs no
   * date math of its own (this file's header rule).
   */
  windowAlreadyOpen: boolean;
  /** Present ⇒ concrete mode. Index-aligned with `LADDER[tier]`, already formatted venue-local. */
  boundaryLabels?: readonly string[];
  /**
   * T4-rung, concrete mode only: the index (into `LADDER[tier]` / `boundaryLabels`) of the best rung whose
   * boundary is still in the future for THIS booking, or `-1` when all have lapsed. Computed SERVER-SIDE by
   * the RSC via `bestFutureRungIndex` and simply FORWARDED to `policySummaryLine` — the component performs
   * no date math (its header rule). Omitted ⇒ the summary keeps its pre-T4-rung top-rung lead.
   */
  bestRungIndex?: number;
};

export function CancellationPolicyDisclosure({
  tier,
  openCapacity,
  windowAlreadyOpen,
  boundaryLabels,
  bestRungIndex,
}: CancellationPolicyDisclosureProps) {
  // ── NULL-TIER BEHAVIOUR (D-77's deliberate no-default, and what it implies for old rows) ─────────────
  // A NULL tier renders nothing at all — not an empty shell, not a fallback policy.
  //
  // After this plan a listing CANNOT be published without a tier, so NULL means one of two things: an
  // unpublished draft (not bookable, and 404 to the public anyway), or a listing published before this
  // column existed. For that second, legacy case `tierOrDefault` makes the refund engine fall back to
  // Flexible — but that fallback is an internal safety net for legacy rows, NOT a policy any host chose.
  // Presenting it as "this host's cancellation policy" would put a promise in the host's mouth that they
  // never made. Showing nothing is the conservative failure: the booker is never told a policy that
  // differs from the one applied, and Flexible is the most generous rung on the ladder, so no booker is
  // worse off than what they were shown. A disclosure that disagrees with `quoteRefund` is worse than
  // no disclosure — that is the rule this branch encodes.
  if (!tier) return null;

  // ── WR-05 / T-09-88 — THE PASS WHOSE DAY HAS ALREADY OPENED ──────────────────────────────────────────
  // The ladder is not wrong for this purchase; it is SPENT. Every rung's boundary sits before the venue's
  // opening instant, so a booker buying at 15:00 for today qualifies for none of them, and the honest
  // disclosure is the outcome rather than a list of windows that all closed before they arrived.
  //
  // Scoped to `openCapacity` on purpose: an EXCLUSIVE booking past its own start cannot be bought at all
  // (D-94 refuses at checkout initiation), so the combination has no call site — and if a future one ever
  // produced it, the exclusive rung copy must still render rather than a pass sentence. A jsdom case pins
  // exactly that, so the flag can never leak into the exclusive path.
  const nonRefundable = openCapacity && windowAlreadyOpen;

  const summary = policySummaryLine(tier, { openCapacity }, boundaryLabels, bestRungIndex);
  const lines = policyDisclosureLines(tier, { openCapacity }, boundaryLabels);

  return (
    <details className="rounded-lg border bg-muted/40 p-3 text-sm">
      <summary className="cursor-pointer list-none">
        {/* The statement goes in the COLLAPSED summary, where it is read without any interaction — a
            disclosure a booker has to expand to find is not a disclosure they demonstrably saw (D-81). */}
        {nonRefundable ? (
          <span className="font-medium">{PASS_NON_REFUNDABLE_MESSAGE}</span>
        ) : (
          <span className="font-medium">{summary}</span>
        )}{" "}
        <span className="text-muted-foreground underline underline-offset-4">
          See cancellation policy
        </span>
      </summary>

      <div className="mt-3 space-y-2 border-t pt-3">
        <p className="font-medium">{TIER_LABELS[tier]} cancellation policy</p>
        {/* The rung list is SUPPRESSED, not restated, once the window has opened: printing "24 hours or
            more — full refund" beside "this pass can't be refunded" would contradict itself on a money
            surface, and the tier name above already says which policy the booking is under. */}
        {!nonRefundable && (
          <ul className="space-y-1 text-muted-foreground">
            {lines.map((line) => (
              <li key={line.when}>
                <span className="text-foreground">{line.when}</span> — {line.outcome}
              </li>
            ))}
          </ul>
        )}
        {/*
          MANDATORY on EVERY expanded view, in BOTH modes, at EVERY tier — including Flexible, where a
          full refund is the only rung and a booker is therefore MOST likely to assume everything comes
          back (Copywriting Contract C2: this is the one place a booker could be surprised).

          Rendered unconditionally and on purpose: there is no `{cond && …}` wrapper here to remove, and
          nothing about the tier or the rung set can suppress it.
        */}
        <p className="text-muted-foreground">The service fee isn&apos;t refunded.</p>
      </div>
    </details>
  );
}
