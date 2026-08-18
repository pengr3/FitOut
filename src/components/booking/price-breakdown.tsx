"use client";

// PriceBreakdown (BOOK-01 · D-45/D-46/D-74) — formalizes the display-only RailSelectionSummary estimate
// (availability-calendar.tsx:233-268) into the committed, SERVER-FROZEN breakdown on the reserve page.
//
// D-74 SUPERSEDES the booker-facing half of D-50. A booker-facing, NON-REFUNDABLE "Service fee" line
// (SERVICE_FEE_BPS, 5% of the space price) now EXISTS and is disclosed here, in the slot this component
// originally reserved. The HOST-side half of D-50 is UNCHANGED: commission is still a 10% host-side
// deduction and the host still receives space price − 10%.
// Do NOT remove the fee line as a "regression" — the prior instruction was correct under D-50 and is
// no longer the policy. The fee funds the ~2.5% gateway cost PayMongo does not return on a refund.
// The component still performs ZERO arithmetic: every figure arrives as a server-computed prop.
//
// The three money props are the booking row's THREE FROZEN VALUES (07-RESEARCH Finding 2), never derived
// from one another here: `spacePriceCents` is the listing-priced portion (and the host payout basis),
// `serviceFeeCents` is platform revenue, and `quotedTotalCents` is the all-in amount actually charged.
// A component that computed `total = space + fee` itself could disagree with what PayMongo charges the
// moment any of the three changed shape — and the displayed total the booker agrees to MUST equal the
// charge (CLAUDE.md "never trust the client for price/time"; the trust failure here is on the core value).
//
// C1 (D-73) — the line is labelled EXACTLY `Service fee`, and NEVER bundled under a tax-sounding label
// ("Taxes" + "and fees", written in two pieces here on purpose — see the tripwire note below). It is
// platform revenue, not a government levy: labelling it as one is inaccurate to customers and is the
// precise pattern junk-fee rules (US FTC, EU/UK) and PH DTI price-display requirements target. The user's
// first framing WAS that bundled label; it was changed deliberately after pushback, and a future copy pass
// must not re-bundle it.
//
// ⚠️ GREP TRIPWIRE (the 07-04 payout-sweep idiom). Two whole-source greps guard this file's copy: one for
// the tax-sounding bundle above, one for the C7-forbidden reassurances (see the Copywriting Contract, rule
// C7 in 07-UI-SPEC.md, for the three exact phrases). A grep is only a real guard if it cannot be tripped by
// the very comment forbidding the string — so NONE of those phrases is spelled contiguously anywhere in
// this file. If you are tempted to write one out "just in a comment", don't: it disarms the check for good.
//
// ── THIS COMPONENT HAS NO CONTAINER OF ITS OWN, AND THAT IS DELIBERATE (DS-11, plan 11-13) ────────────
// `11-UI-SPEC § PanelCard` lists *"`booking/price-breakdown.tsx`'s container"* among the five surfaces
// `PanelCard` replaces. The container it means is NOT in this file: the root below is a bare
// `<div className="space-y-3">` and always has been. The box that supplies this breakdown's background,
// radius, ring and padding is the checkout rail in `booking/reserve-view.tsx`, and `<PriceBreakdown>` has
// exactly ONE call site (`listings/[id]/book/page.tsx`), which renders it into that rail. Plan 11-13
// converted the rail to `<PanelCard sticky>`; this file was left as a bare div ON PURPOSE.
//
// So: do NOT wrap the root below in a `Card`/`PanelCard` to "finish the adoption". It would nest a second
// `bg-card ring-1 rounded-xl` inside the one that already wraps it and pay the block padding twice — the
// same double-padding trap `.planning/…/deferred-items.md` measured at 112px vs 80px on the row cards.
// A breakdown is CONTENT; the panel is the surface it is rendered onto.
//
// ── WHY THIS IS A CLIENT COMPONENT AS OF PHASE 12 (D-38 / BFLOW-04), AND WHAT DID NOT CHANGE ─────────
// This file used to end with the sentence *"Pure display, no hooks → a Server Component (no `use
// client`)"*. That sentence was true for one call site and stopped being true the moment there were two.
//
// THE REASON, and it is a structural one rather than a preference. BFLOW-04's claim is that the listing
// rail and the checkout page show THE SAME FACT, and the only way to make that true rather than asserted
// is for there to be ONE component rendering both. The rail's breakdown depends on the selection the
// booker is holding in the browser — a day, a window, a pass count that changes on every click — so the
// RSC cannot pre-render the right one; the rail's parent must be a Client Component, and a Server
// Component cannot be imported by a Client Component. Hence `"use client"` on line 1.
//
// WHAT DID NOT CHANGE, because this is a money surface and the distinction is the whole of GATE-05:
//   • The component still performs ZERO ARITHMETIC. Every figure below is a server-computed prop, and
//     `tests/design/price-surface.test.ts` walks this file's AST to assert there is no `+`, `-`, `*` or
//     `/` on any of them.
//   • It still receives only FINISHED figures. The rail's three numbers come from `AllInParts`
//     (`@/lib/booking/all-in-table.ts`), where the fee was subtracted on the server inside the module the
//     `server-only` guard reaches; checkout's come from the frozen booking row. Neither surface is handed
//     the ingredients to compute a price (D-130).
//   • `SERVICE_FEE_BPS`, `computeServiceFee` and the formula are still absent from every client module.
//     GATE-05 guards the COMPUTATION, not the rendering, so `service-fee.ts`'s `import "server-only"` is
//     untouched and `next build`'s boundary check was re-run explicitly over this flip rather than
//     assumed from a previous green build.
//   • `@/lib/money` was already explicitly isomorphic (*"both Server Components and Client Components can
//     import it"*, `money.ts:6-7`) and `ui/separator` is already a client-safe primitive, so the flip
//     needed no other file to move.
//
// ── THE `surface` PROP, AND WHY THE TOTAL ROW IS WRITTEN TWICE ───────────────────────────────────────
// `surface` defaults to `"checkout"`, so the shipped call site (`listings/[id]/book/page.tsx`) is
// byte-identical and did not need an edit. Rows, order, weights, `tabular-nums` and the word `Total` are
// IDENTICAL across the two surfaces — that identity IS what BFLOW-04 buys, and nothing new may be made to
// vary here casually. Exactly two things fork: the total's `data-testid`, and the trailing line.
//
// The total row is TWO SIBLING BRANCHES with two string-literal ids rather than one element with a
// computed one, and that is a hard constraint rather than a style: `tests/design/selector-contract.test
// .ts`'s AST collector resolves a `data-testid` only when the value is a string literal. `data-testid=
// {MAP[surface]}` and `data-testid={cond ? "a" : "b"}` both resolve to null, the declared row then reads
// as "rendered NOWHERE in src/", and `npm run build` fails on the contract's forward assertion. Both
// branches consume ONE shared class constant so the two totals are computed-style identical by
// construction rather than by copy-paste, and exactly one branch renders per surface, which makes
// "exactly one total hook per document" structural.

import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { Separator } from "@/components/ui/separator";
// D-39 — the fee's explainer, imported rather than written. Its copy lives in its own module ON
// PURPOSE: the two whole-source greps above scan THIS file, comments included, so every sentence
// added here is a sentence inside the scanned region. See that file's header for why the body names
// no percentage and why it is a popover rather than a tooltip.
import { ServiceFeePopover } from "@/components/booking/service-fee-popover";

/**
 * The total VALUE's classes, shared by both surface branches below.
 *
 * One constant, two call sites, on purpose. `e2e/price-one-fact.spec.ts` (plan 12-05) asserts that the
 * rail's total and the checkout's total have identical computed styles; a constant makes that true by
 * construction, where two hand-written class strings make it true until someone edits one of them.
 */
const TOTAL_VALUE_CLASS = "text-xl font-semibold tabular-nums";

type PriceBreakdownProps = {
  /**
   * Server-frozen ALL-IN total (booking.quotedTotalCents, D-49) — the exact figure Phase 5 charges. Under
   * D-74 this is `spacePriceCents + serviceFeeCents`; it is passed in, never summed here.
   */
  quotedTotalCents: number;
  /** Server-frozen SPACE price (booking.spacePriceCents) — the run line's value by default. */
  spacePriceCents: number;
  /**
   * The RUN LINE's value, when it is not the whole space price. Defaults to `spacePriceCents`, so every
   * flat listing is unchanged. When a D-108 surcharge is disclosed on its own line below, the server passes
   * the BASE here (space price − surcharge) — because the surcharge is folded INTO `spacePriceCents` (A1),
   * and showing the full space price on the run line as well would disclose the same centavos twice.
   * Computed server-side and passed in for the same reason every other figure here is: this component
   * subtracts nothing, just as it sums nothing.
   */
  runPriceCents?: number;
  /** Server-frozen NON-REFUNDABLE service fee (booking.serviceFeeCents, D-74). 0 omits the row entirely. */
  serviceFeeCents: number;
  /**
   * D-108 extra-guest surcharge, as THREE server-computed figures (`paxSurcharge`, pricing.ts) — never one
   * that this component multiplies out. `extraHeads` and `extraHeadCents` label the line; `extraSurchargeCents`
   * IS the line's value and also its render gate. All default to 0, so every existing call site (and every
   * flat listing) renders byte-for-byte what it does today: no line at all.
   *
   * The surcharge is ALREADY INSIDE `spacePriceCents` (A1 — it is host revenue and the payout basis), so this
   * line is a DISCLOSURE of part of the run total, not an addend. Do not add it to anything here.
   */
  extraHeads?: number;
  extraHeadCents?: number;
  extraSurchargeCents?: number;
  /**
   * Phase-9 drop-in pricing (OC-08). Both server-computed; when `passes` is non-null the run line reads
   * per person instead of per hour or per day. Absent on every exclusive booking, so the shipped
   * breakdown is unchanged for them.
   *
   * Deliberately OPTIONAL PROPS rather than a discriminated run-line union (09-UI-SPEC Open Q10, the
   * planner's explicit call): this is a UAT-passed money surface, and optional props leave every existing
   * call site byte-identical instead of forcing a census over one. Same device as the D-108 trio above.
   */
  perHeadPriceCents?: number | null;
  passes?: number | null;
  /** Frozen display currency (booking.currency); defaults to the shared PHP source (D-46). */
  currency?: string;
  /** Full-day selection → the flat day-rate line; else the hourly run (D-45, distinct — no cap). */
  fullDay: boolean;
  /** Whole-hour count, re-derived SERVER-SIDE from the window (passed in — never computed here). */
  hours: number;
  hourlyRateCents: number | null;
  dayRateCents: number | null;
  /**
   * WHICH price surface this instance is (D-38 / BFLOW-04). Defaults to `"checkout"` so the shipped call
   * site renders byte-for-byte what it always has.
   *
   * It selects exactly two things — the total's structural hook and the trailing line — and it must never
   * grow to select a third without a decision to point at. The moment the two surfaces differ in a row, an
   * order, a weight or a figure, "the rail and checkout show the same fact" stops being a property of the
   * code and goes back to being a claim in a document.
   */
  surface?: "rail" | "checkout";
};

export function PriceBreakdown({
  quotedTotalCents,
  spacePriceCents,
  runPriceCents,
  serviceFeeCents,
  extraHeads = 0,
  extraHeadCents = 0,
  extraSurchargeCents = 0,
  perHeadPriceCents,
  passes,
  currency = DISPLAY_CURRENCY,
  fullDay,
  hours,
  hourlyRateCents,
  dayRateCents,
  surface = "checkout",
}: PriceBreakdownProps) {
  // Line label is `{₱rate}/hr × {N} hours` or `{₱rate}/day × 1 day` — formatting only, no multiplication.
  //
  // OC-08 adds a THIRD form for a drop-in day pass, resolved FIRST for the same reason composeWhenLabel
  // resolves its open branch first: a pass is priced per head with NO duration term at all (OC-02), so
  // neither `fullDay` nor `hours` says anything true about one. Still formatting only — the run VALUE
  // below is the server-frozen prop, and nothing here multiplies a rate by a count. A product computed in
  // the browser could disagree with what PayMongo charges, which is the trust failure the header forbids.
  const runLabel =
    passes != null
      ? `${formatMoney(perHeadPriceCents ?? 0, currency)}/person × ${passes} ${passes === 1 ? "pass" : "passes"}`
      : fullDay
        ? `${formatMoney(dayRateCents ?? 0, currency)}/day × 1 day`
        : `${formatMoney(hourlyRateCents ?? 0, currency)}/hr × ${hours} ${hours === 1 ? "hour" : "hours"}`;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {/* The run line — rate × qty on the left, the frozen SPACE price on the right (not the all-in
            total: the fee gets its own disclosed line below, and the two must sum to the Total). */}
        <div className="flex items-baseline justify-between gap-4 text-sm">
          {/* `tabular-nums` on the LABEL too (AC#33): `runLabel` embeds a formatted RATE, and GATE-05's
              rule is about every money figure this file renders, not only the ones in the value column. */}
          <span className="text-muted-foreground tabular-nums">{runLabel}</span>
          <span className="tabular-nums">
            {formatMoney(runPriceCents ?? spacePriceCents, currency)}
          </span>
        </div>

        {/*
          D-108 EXTRA GUESTS (08-UI-SPEC § 5) — ONE conditional line, between the run line and the service
          fee, cloning the service-fee row's shape exactly. Rendered ONLY when the server says a surcharge
          was actually applied, so a flat listing (extraHeadFee = 0, the overwhelming majority) renders this
          file byte-for-byte as it did before Phase 8: no line, no layout shift, no ₱0 row.

          Both label figures AND the value are server-computed props (`paxSurcharge`, pricing.ts — the same
          function that folded the surcharge into the frozen price). Nothing here multiplies heads by fee: a
          product computed in the browser could disagree with the amount PayMongo charges, which is the exact
          trust failure the header contract forbids.
        */}
        {extraSurchargeCents > 0 && (
          <div className="flex items-baseline justify-between gap-4 text-sm">
            {/* Same AC#33 reason as the run line: the per-head fee is a money figure inside a label. */}
            <span className="text-muted-foreground tabular-nums">
              Extra guests ({extraHeads} × {formatMoney(extraHeadCents, currency)})
            </span>
            <span className="tabular-nums">{formatMoney(extraSurchargeCents, currency)}</span>
          </div>
        )}

        {/*
          THE FORMERLY-RESERVED SLOT (D-46), now FILLED by the D-74 booker-facing service fee. It was held
          open as a zero-layout-shift seam for exactly this line and is no longer empty.

          What still must NEVER appear on this surface: the HOST-side 10% commission (D-50's unchanged
          half). That is a deduction from the host's payout, not a charge to the booker, and it lives only
          on /host/earnings — where it is labelled `FitOut commission (10%)` precisely so a user who is
          both booker and host (AUTH-04) can tell the two apart (C8).

          Omitted entirely at 0 rather than rendered as ₱0: a legacy pre-D-74 booking genuinely had no fee,
          and showing a zero line would imply one was assessed.
        */}
        {serviceFeeCents > 0 && (
          <div className="flex items-baseline justify-between gap-4 text-sm">
            {/* D-39 — THE TRIGGER SITS IMMEDIATELY AFTER THE LABEL, INSIDE IT, AND NOWHERE ELSE.
                Two placements were available and only one is correct in the accessibility tree.
                Between the label and its amount as a SIBLING of both, a keyboard user tabs through a
                control that stands between a thing and its price; on the total row, the explanation
                would attach to the figure it does not explain — the total is the whole charge, and
                the fee is one line of it. Inside the label, the tab order reads exactly as the
                sentence does: `Service fee` → `What is the service fee?` → the amount.

                `inline-flex items-center` so the glyph centres on the label's text; the ROW stays
                `items-baseline`, which is what keeps every money figure in this breakdown sitting on
                one baseline, and an inline-flex box takes its baseline from its first item — the
                label text. The row's height is unchanged: see the trigger's own `-my-3` note. */}
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              Service fee
              <ServiceFeePopover />
            </span>
            <span className="tabular-nums">{formatMoney(serviceFeeCents, currency)}</span>
          </div>
        )}
      </div>

      <Separator />

      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-semibold">Total</span>
        {/* Total value = Heading weight (600), tabular-nums so digits align (never a client recompute).

            The `price-total` hook below is GATE-05's e2e half (D-35), declared in
            `src/lib/design/selector-contract.ts` with its reason: `e2e/price-parity.spec.ts` reads THIS
            element's textContent, normalises it back to integer centavos and asserts equality with
            `booking.quoted_total_cents`. It sits on the element whose text is the money string and
            NOTHING else, so the spec never has to peel a label off the number.

            Do not rename it, and do not move it onto the row wrapper: the wrapper's text is
            "Total₱1,234.00", which would make the parity assertion parse a label. A rename fails the build
            twice over — plan 11-02's undeclared-id ban, and the parity spec's own reachability guard.

            ⚠️ The attribute+value pair is deliberately NEVER written contiguously in prose here. The
            plan's acceptance criterion counts that exact pair and expects ONE; a first draft of this very
            comment spelled it out and made the count read 2 — the file header's GREP TRIPWIRE rule,
            tripped by the note explaining the thing it guards. Measured, not hypothesised.

            THE RAIL GETS ITS OWN HOOK, AND SHARING ONE WOULD HAVE BEEN THE DEFECT. Plan 12-10 renders a
            booking sheet, so a single document can hold two breakdowns; the parity spec reads the hook
            and normalises its text back to integer centavos, and with two matches it would silently
            parse whichever came first in the DOM. Two literals, one per surface, one match each — see
            the header for why this is written as two branches rather than one computed attribute. */}
        {surface === "rail" ? (
          <span data-testid="rail-price-total" className={TOTAL_VALUE_CLASS}>
            {formatMoney(quotedTotalCents, currency)}
          </span>
        ) : (
          <span data-testid="price-total" className={TOTAL_VALUE_CLASS}>
            {formatMoney(quotedTotalCents, currency)}
          </span>
        )}
      </div>

      {/* C7: once D-74 ships, no booker surface may reassure that nothing was added or that this figure is
          conclusive. The string previously here did both, and became FALSE the moment the fee existed. The
          forbidden phrases are deliberately not written out — see the GREP TRIPWIRE note in the header.

          THE RAIL'S LINE IS A STRICT PREFIX OF THE CHECKOUT LINE, and that is what keeps it safe rather
          than merely shorter. The second sentence is a statement about a payment that is about to happen,
          and on the listing page it is simply not true yet — nothing is being charged from the rail. So it
          is dropped rather than reworded: every alternative phrasing is new booker-facing copy on a money
          surface, which is exactly where the two whole-source greps in the header live. Do not "improve"
          either string. */}
      {surface === "rail" ? (
        <p className="text-xs text-muted-foreground">Includes our service fee.</p>
      ) : (
        /* Kept on ONE line, exactly as it shipped. JSX would collapse the wrapped form to the same
           string, but this is UAT-passed booker-facing copy and "the same after a transform" is a
           weaker thing to be able to say than "unchanged". */
        <p className="text-xs text-muted-foreground">Includes our service fee. You&apos;ll pay this now.</p>
      )}
    </div>
  );
}
