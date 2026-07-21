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
  boundaryLabels?: readonly string[],
): PolicyDisclosureLine[] {
  const rungs = LADDER[tier];
  if (boundaryLabels && boundaryLabels.length !== rungs.length) {
    throw new Error(
      `cancellation disclosure: got ${boundaryLabels.length} boundary labels for ${rungs.length} ${tier} rungs`,
    );
  }
  const lines: PolicyDisclosureLine[] = rungs.map((rung, i) => ({
    when: boundaryLabels
      ? `Cancel before ${boundaryLabels[i]}`
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
 */
export function policySummaryLine(
  tier: CancellationTier,
  boundaryLabels?: readonly string[],
): string {
  const i = LADDER[tier].findIndex((r) => r.refundBps >= 10000);
  if (i === -1) return `${TIER_LABELS[tier]} cancellation policy`;
  if (boundaryLabels) return `Free cancellation until ${boundaryLabels[i]}`;
  return `Free cancellation up to ${LADDER[tier][i].minHours} hours before the session.`;
}

export function CancellationPolicyDisclosure({
  tier,
  boundaryLabels,
}: {
  /**
   * At checkout this MUST be the booking's own snapshotted tier (`booking.cancellation_policy`), not the
   * listing's current one — that snapshot is what `quoteRefund` will later read, so sourcing the display
   * from anywhere else could disclose terms the refund engine won't apply (T-07-90).
   *
   * NULL renders NOTHING. See the note below the component.
   */
  tier: CancellationTier | null | undefined;
  /** Present ⇒ concrete mode. Index-aligned with `LADDER[tier]`, already formatted venue-local. */
  boundaryLabels?: readonly string[];
}) {
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

  const summary = policySummaryLine(tier, boundaryLabels);
  const lines = policyDisclosureLines(tier, boundaryLabels);

  return (
    <details className="rounded-lg border bg-muted/40 p-3 text-sm">
      <summary className="cursor-pointer list-none">
        <span className="font-medium">{summary}</span>{" "}
        <span className="text-muted-foreground underline underline-offset-4">
          See cancellation policy
        </span>
      </summary>

      <div className="mt-3 space-y-2 border-t pt-3">
        <p className="font-medium">{TIER_LABELS[tier]} cancellation policy</p>
        <ul className="space-y-1 text-muted-foreground">
          {lines.map((line) => (
            <li key={line.when}>
              <span className="text-foreground">{line.when}</span> — {line.outcome}
            </li>
          ))}
        </ul>
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
