"use client";

// STATE-07's IN-PLACE COLLISION NOTICE (D-55, plan 12-13) — the sentence that names the window the
// booker just lost, landing directly above the refreshed picker rather than in a dialog, a toast or a
// red box.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ THE DELIBERATE DEPARTURE FROM `book-cta.tsx`'s STATED SINGLE-SOURCE RULE — RECORDED HERE AND AT
//   THE CALL SITE, IN THESE WORDS, SO THE NEXT READER DOES NOT "FIX" IT BACK
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `book-cta.tsx`'s refusal branch carries a rule: *"The sentence itself comes from the server, which is
// also where the claim decided it — a second copy here would be a second source of truth, and the one
// that drifts is always the one nobody is looking at."* That rule is right and it still binds. D-55
// departs from it in exactly one, bounded way, and the distinction is the whole of the departure:
//
//   THE SERVER SENTENCE IS THE **RULING**. It is what `mapBookingError` decided, from what the GiST
//   `EXCLUDE` constraint decided, inside the transaction. Nothing on this surface may restate, soften,
//   contradict or re-derive it.
//
//   THE NAMED WINDOW LINE IS A **RESTATEMENT OF THE BOOKER'S OWN SELECTION**, not a second copy of a
//   server decision. `{9:00–11:00 AM}` is what the booker picked, formatted from the instants they
//   themselves chose in the venue's own timezone. The server never said it and cannot drift from it.
//
// The consequence is a real, stated one: when the client holds NO selection to restate (a resume
// auto-fire whose window never reached the picker, a defensive path), `named` is null and this notice
// renders the server's ruling VERBATIM as line 1. That is the honest fallback — the client says nothing
// of its own when it has nothing of its own to say — and it is why `ruling` is a required prop rather
// than decoration.
//
// ⚠ IT MUST NEVER LEAK A CONSTRAINT CODE. `mapBookingError` turns the exclusion-violation and deadlock
// SQLSTATEs (and `NoUnitAvailableError`) into a calm sentence precisely so those codes never travel;
// this component renders whatever it is handed, so the ban is asserted from BOTH sides — a directory
// `grep` for the codes over `src/components/`, and `e2e/collision-in-place.spec.ts`'s whole-DOM leak
// assertion (T-12-13-CONSTRAINTLEAK). THE CODES ARE DESCRIBED HERE AND NEVER SPELLED, for the reason
// `slot-picker.tsx` records at its own unavailable-chip branch: that grep reads raw source, so a comment
// quoting the thing it forbids is indistinguishable from a leak and disarms the check.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// CALM, NOT FAILURE — every one of these is a requirement rather than a preference
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • THE SURFACE IS THE SOFT-ACCENT TONE (12-UI-SPEC § Color, accent item 9), read from
//     `STATUS_TONE_RECIPES` BY NAME rather than spelled as class literals. That is not tidiness: this
//     file lives in `src/components/booking/`, one of the four trees `tests/design/brand-recipe.test.ts`
//     scans with a `toEqual([])` on ANY accent background — including one written in a comment — so a
//     literal recipe here would turn the DS-08 gate red on correct markup. `search-bar.tsx` met the same
//     wall in plan 12-12 and the tone object is the answer both times. The container edge
//     (`border-brand/30`) is NOT part of the tone; it is the decorative accent edge
//     `contrast-pairs.ts` declares as an exclusion, with the compensating requirement that the notice
//     carries its meaning in declared, passing ink and glyph — which is exactly what the tone supplies.
//   • NO ERROR TOKEN, NO RED, NO ALERT ROLE, NO DIALOG, NO TOAST. Losing a race fairly is a normal
//     marketplace outcome, not this booker's error, and a dialog would modal a normal outcome while
//     hiding — at 375px — the very grid that is the evidence. The two banned strings are DESCRIBED and
//     never spelled, for the same reason the constraint codes above are: the acceptance greps read raw
//     source, and a sentence naming what it avoids is what makes them green for the wrong reason.
//   • ONE LIVE REGION. `role="status"` (implicitly polite), never `assertive`, and NO `aria-label`:
//     `status` is nameFrom:author, so naming it risks a screen reader announcing the label INSTEAD of
//     the sentence (the argument `live-regions.ts` records at six other regions). Rule 6's other half —
//     that `book-cta.tsx`'s plain notice and this one are never both mounted — is structural at that
//     call site and asserted in a real document by `e2e/collision-in-place.spec.ts`.
//   • FOCUS MOVES HERE ON MOUNT (`tabIndex={-1}`). That is the mechanism rule 7 demands in place of
//     `assertive`: polite region PLUS moved focus is what makes the event impossible to miss without
//     interrupting whatever is being read. It is not decoration — dropping it would make this file's
//     claim to rule 7 false, exactly as `hold-expired-state`'s row records for its own focus move.
//
// ⚠ THE CALL SITE KEYS THIS COMPONENT ON THE COLLISION'S ORDINAL. A live region announces on CONTENT
// CHANGE and this effect runs on MOUNT, so a SECOND collision has to remount rather than re-render —
// otherwise the focus move would not fire again and a booker who lost two races in a row would be told
// once. The key is what makes both true; see `availability-calendar.tsx`'s `collision.at`.

import * as React from "react";
import { ClockIcon } from "lucide-react";

import { STATUS_TONE_RECIPES } from "@/lib/design/status-tones";
import { cn } from "@/lib/utils";

/**
 * Which twin this is. Both come down `book-cta.tsx`'s ONE refusal branch and get the identical
 * treatment, the identical grammar and the identical live region — `taken` is the exclusive window,
 * `sold-out` is the drop-in day (OC-13).
 */
export type CollisionVariant = "taken" | "sold-out";

export type CollisionNoticeProps = {
  readonly variant: CollisionVariant;
  /**
   * THE BOOKER'S OWN SELECTION, ALREADY FORMATTED IN THE VENUE'S TIMEZONE — `9:00–11:00 AM` on the
   * exclusive path, `Fri, Aug 21` on the drop-in one. Composed at the call site, never here, because
   * the call site is the only place that holds both the instants and the venue tz.
   *
   * `null` when the client held nothing to restate; line 1 then falls back to the server's ruling.
   */
  readonly named: string | null;
  /** The server's refusal sentence, VERBATIM. The ruling — see this file's header. */
  readonly ruling: string;
};

/**
 * Line 2, per twin. 12-UI-SPEC § Copywriting Contract > Collision, verbatim — do not paraphrase.
 *
 * Both sentences do the same three jobs in the same order: name what happened, say that NOTHING WAS
 * CHARGED (the fact a booker in this state most needs and is least likely to assume), and point at the
 * grid directly below as the thing that is now true.
 */
const SECOND_LINE: Record<CollisionVariant, string> = {
  taken:
    "Someone booked it while you were choosing, so nothing was charged. The times below are up to " +
    "date — the closest free windows are outlined.",
  "sold-out":
    "The last spots went while you were choosing, so nothing was charged. The days below are up to " +
    "date.",
};

/** Line 1. The contract's `{9:00–11:00 AM} was just taken` / `{Fri, Aug 21} just sold out`. */
function firstLine(variant: CollisionVariant, named: string | null, ruling: string): string {
  if (named === null) return ruling;
  return variant === "taken" ? `${named} was just taken` : `${named} just sold out`;
}

export function CollisionNotice({ variant, named, ruling }: CollisionNoticeProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  // RULE 7's other half. `tabIndex={-1}` makes the region programmatically focusable without putting it
  // in the tab order, and moving focus here is what replaces `aria-live="assertive"` on the whole
  // booker path. It also puts a keyboard user AT the notice, one Tab away from the refreshed grid the
  // sentence is about.
  React.useEffect(() => {
    ref.current?.focus();
  }, []);

  const tone = STATUS_TONE_RECIPES["soft-accent"];

  return (
    <div
      ref={ref}
      role="status"
      tabIndex={-1}
      // GATE-04: a structural hook, declared in `src/lib/design/selector-contract.ts` in this same
      // commit. A STRING LITERAL, because the bidirectional scan reads source text.
      data-testid="collision-notice"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-brand/30 p-3",
        tone.surface,
        tone.text,
      )}
    >
      {/* A CLOCK, NOT A WARNING TRIANGLE. The glyph names the SUBJECT — a time that went — rather than
          a severity. `mt-0.5` is the optical nudge 12-UI-SPEC § Spacing declares for a `size-4` glyph
          beside a `text-body` line; it is glyph alignment, never spacing between blocks. */}
      <ClockIcon aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", tone.icon)} />
      <div className="min-w-0">
        <p className="text-body font-semibold">{firstLine(variant, named, ruling)}</p>
        <p className="mt-1 text-label text-muted-foreground">{SECOND_LINE[variant]}</p>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • WHETHER THIS READS AS CALM RATHER THAN AS A FAILURE. That is a human judgement, calibrated
//     against `.planning/sketches/006-collision-in-place/`'s "what it must never become" section, and
//     it is routed to UAT. What IS mechanically checkable — no error token, no alert role, no
//     constraint code anywhere in the document — is asserted in `e2e/collision-in-place.spec.ts`.
//   • WHETHER A SCREEN READER SPEAKS THIS ONCE, AND BEFORE THE MOVED FOCUS. Announcement order is
//     browser + AT behaviour, not a DOM property. The count of live regions is asserted; the listening
//     test is Phase 17's.
