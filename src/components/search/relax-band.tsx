"use client";

// STATE-03's relaxation band (D-52 / D-53, plan 12-12) — the sentence that names the ONE constraint
// that gave, and the `Undo` that puts it back.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE DIVISION OF LABOUR
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `src/lib/search/relaxation.ts` decides WHAT was relaxed. This file decides HOW it is told. It performs
// no search, no filtering and no ranking (T-12-12-CLIENTFILTER): the whole ladder runs server-side in the
// RSC and this component renders its outcome. Every string below is the Copywriting Contract's, verbatim
// — 12-UI-SPEC § Copywriting Contract > Search. Do not paraphrase them; where a `{brace}` appears in that
// table, the value substituted here is the one the ladder actually used.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE BAND IS NEUTRAL AND THE CONTROL IS TINTED — that split is deliberate
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `bg-muted` + `border` + `rounded-lg`, the neutral tone at panel scale. The band REPORTS A FACT; the
// CONTROL is the thing the system changed, and only the control carries the soft-accent tint
// (`search-bar.tsx`'s `data-relaxed`). Two tinted surfaces would leave the booker looking for the
// difference between them. `Undo` is `variant="outline"`, not the accent: it is a REVERSAL, not the
// thing we want tapped, and a filled coral control here would out-shout the sentence that has to be read
// (12-UI-SPEC § Visual Hierarchy, "Search, zero results").
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// ONE ANNOUNCEMENT, ON ARRIVAL — and the two mechanisms that make it one
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// GATE-03 rule 1: `role="status"` (implicit polite), never `assertive`, and no `aria-label` — a `status`
// region is nameFrom:author and its CONTENT is what a screen reader speaks, so naming it would risk the
// name being announced INSTEAD of the sentence (the argument recorded at `live-regions.ts`).
//
//   1. THE SR-ONLY LEAD SENTENCE. The region's first child is the outcome — "Showing 6 spaces with the
//      distance filter widened." — because line 1 is a NEGATIVE statement. A live region that opens with
//      "Nothing at 9–11 AM…" tells a blind booker their search failed, at the exact moment it succeeded
//      differently. The visible lines stay announceable behind it; they are the detail, not the headline.
//   2. THE LATCH. The rendered text is computed ONCE, in a read-once `useState` initializer, and the
//      component is KEYED BY THE RUNG at its call site — so a re-render carrying the same outcome
//      produces byte-identical children and mutates no text node, which is what stops a second
//      announcement, while a genuinely different rung remounts and is announced. A live region
//      re-announces on CONTENT CHANGE, so "announce once" is a property of the DOM staying still,
//      not of a flag.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE TWO BARE `data-*` HOOKS, AND WHY THEY ARE NOT `data-testid`
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   `data-relax-changed`  wraps the WHOLE changed-constraint phrase. 12-UI-SPEC AC#29 asks that the band
//                         name EXACTLY ONE relaxed constraint — and that count cannot be taken from the
//                         band's text, because line 1 legitimately contains the booker's OWN radius
//                         ("within 10 km") while line 2 contains the relaxed one ("within 25 km"). A
//                         textual count sees two. This element makes the claim structural: exactly one
//                         node, or the band is naming more than one thing.
//   `data-relax-value`    wraps the value INSIDE that phrase — the string the relaxed control now
//                         renders. AC#30 compares it against `#search-radius`'s rendered value, both
//                         read from the DOM.
//
// ⚠ THE STRING EQUALITY IN AC#30 IS EXACT FOR THE RADIUS RUNG AND ONLY FOR IT. The radius `<Select>`
// renders `{r} km`, which is byte-identical to what `data-relax-value` carries. The other three controls
// agree in VALUE and differ in letter case, because they render a sentence-initial placeholder ("Any
// price", "Any time", "Any date") while the band renders the same words mid-sentence. Stated here and in
// `e2e/zero-result-relax.spec.ts`'s NOT-COVERED footer rather than papered over with a case-insensitive
// compare, which would weaken the one assertion that is exact.

import * as React from "react";

import { Button } from "@/components/ui/button";
import { SPACE_TYPE_LABELS, ACTIVITY_TAG_LABELS } from "@/lib/listing-vocab";
import type { RelaxationRungId } from "@/lib/search/relaxation";

/** What the RSC hands down: the rung, the count, and the BOOKER'S original values for line 1. */
export type RelaxBandProps = {
  /** The ONE constraint that gave. */
  readonly rung: RelaxationRungId;
  /** How many rows the relaxed query returned — the `{6}` in both lines. */
  readonly count: number;
  /** The booker's ORIGINAL query. Line 1 names what was asked for, never what was used. */
  readonly asked: {
    readonly category?: string;
    /** Only meaningful with an origin; `undefined` when no radius predicate was in play. */
    readonly radiusKm?: number;
    readonly priceMaxCents?: number;
    /** `YYYY-MM-DD`, already shape-validated by `searchParamsSchema`. */
    readonly date?: string;
    /** `HH:mm`, on the hour. */
    readonly start?: string;
    readonly end?: string;
  };
  /** The radius the ladder actually used — rung 1's new preset. */
  readonly effectiveRadiusKm: number;
  /** One more `pushWith`: ADD `relax=0` to the booker's original query and reset the page. */
  readonly onUndo: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Copy helpers. Every one of them formats a value the BOOKER supplied; none of them computes money,
// availability or distance (GATE-05 — the price ceiling below is the booker's own typed filter, divided
// by 100 exactly as `search-bar.tsx:102` already divides it to render the control).
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** `2026-08-21` → `Fri, Aug 21`. The same construction `search-bar.tsx`'s `selectedDate` uses. */
function formatDay(date: string | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date ?? "");
  if (m === null) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** `9` → `9 AM`. On-the-hour only, which is the only shape `parseWindowHour` lets through. */
function hourLabel(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve} ${period}`;
}

/** `09:00` + `11:00` → `9–11 AM`; across the meridiem → `11 AM–1 PM`. Null unless BOTH parse. */
function formatWindow(start: string | undefined, end: string | undefined): string | null {
  const parse = (t: string | undefined): number | null => {
    const m = /^(\d{2}):(\d{2})$/.exec(t ?? "");
    if (m === null) return null;
    const h = Number(m[1]);
    return Number(m[2]) === 0 && h >= 0 && h <= 23 ? h : null;
  };
  const s = parse(start);
  const e = parse(end);
  if (s === null || e === null || e <= s) return null;
  const samePeriod = s < 12 === e < 12;
  // The en dash is the contract's own character (`{9–11 AM}`), not a hyphen.
  return samePeriod
    ? `${s % 12 === 0 ? 12 : s % 12}–${hourLabel(e)}`
    : `${hourLabel(s)}–${hourLabel(e)}`;
}

/**
 * The plural noun for the searched category, or the generic one.
 *
 * A SPACE TYPE's label is already a noun phrase and every one of the eleven pluralises with a bare `s`
 * (`Pickleball court` → `pickleball courts`, `Multi-purpose / event space` → `…spaces`), and every one
 * begins with an ordinary capitalised word, so lower-casing the first character is safe. An ACTIVITY TAG
 * is an activity rather than a noun (`Badminton`, `HIIT / cross-training`), so there is no correct plural
 * to derive — those fall back to `spaces`, which is also the word the contract's own announcement row
 * uses. Inventing a plural for a label the vocabulary does not supply one for is exactly the fabricated
 * number the copy rules forbid, one part of speech over.
 */
function nounFor(category: string | undefined, count: number): string {
  const plural = count === 1 ? "" : "s";
  if (category !== undefined && category in SPACE_TYPE_LABELS) {
    const label = SPACE_TYPE_LABELS[category as keyof typeof SPACE_TYPE_LABELS];
    return `${label.charAt(0).toLowerCase()}${label.slice(1)}${plural}`;
  }
  // An activity tag is still USEFUL in the sentence even when it cannot be pluralised — it is what makes
  // "the activity was not the thing we changed" legible — so it is named, and the noun stays generic.
  if (category !== undefined && category in ACTIVITY_TAG_LABELS) {
    return `space${plural}`;
  }
  return `space${plural}`;
}

/** The filter NAME the sr-only announcement uses: `…with the {distance} filter widened.` */
const ANNOUNCED_FILTER: Record<RelaxationRungId, string> = {
  radius: "distance",
  price: "price",
  "time-of-day": "time",
  date: "date",
};

/** Line 2's trailing clause — what did NOT move. Contract strings, per rung. */
const SAME_CLAUSE: Record<RelaxationRungId, string> = {
  radius: "same day and time",
  price: "same day, time and area",
  "time-of-day": "same area",
  date: "same area and time",
};

type Rendered = {
  readonly rung: RelaxationRungId;
  readonly announcement: string;
  readonly line1: string;
  /** Line 2 in three pieces, so the changed-constraint phrase can carry its own element. */
  readonly lead: string;
  readonly changedBefore: string;
  readonly changedValue: string;
  readonly changedAfter: string;
  readonly tail: string;
};

function render(props: RelaxBandProps): Rendered {
  const { rung, count, asked, effectiveRadiusKm } = props;

  const dayLabel = formatDay(asked.date);
  const windowLabel = formatWindow(asked.start, asked.end);
  const radiusLabel = asked.radiusKm === undefined ? null : `${asked.radiusKm} km`;
  const priceLabel =
    asked.priceMaxCents === undefined ? null : `₱${Math.round(asked.priceMaxCents / 100)}/hr`;

  // LINE 1 — `Nothing at {9–11 AM} on {Fri, Aug 21} within {10 km}.` Clauses that were never asked for
  // are omitted rather than rendered empty; the price clause follows the same grammar and exists because
  // a price-only query can reach rung 2 with nothing else to name.
  const clauses: string[] = [];
  if (windowLabel !== null) clauses.push(`at ${windowLabel}`);
  if (dayLabel !== null) clauses.push(`on ${dayLabel}`);
  if (radiusLabel !== null) clauses.push(`within ${radiusLabel}`);
  if (priceLabel !== null) clauses.push(`under ${priceLabel}`);
  const line1 =
    clauses.length > 0 ? `Nothing ${clauses.join(" ")}.` : "Nothing matched those filters.";

  // LINE 2 — `Showing {6 badminton courts within 25 km} instead — same day and time. Your other filters
  // are unchanged.` The braced group is the noun phrase plus the ONE changed constraint.
  const noun = nounFor(asked.category, count);
  const lead = `Showing ${count} ${noun} `;

  let changedBefore = "";
  let changedValue = "";
  let changedAfter = "";
  switch (rung) {
    case "radius":
      changedBefore = "within ";
      changedValue = `${effectiveRadiusKm} km`;
      break;
    case "price":
      changedBefore = "at ";
      changedValue = "any price";
      break;
    case "time-of-day":
      changedBefore = "at ";
      changedValue = "any time";
      changedAfter = dayLabel === null ? "" : ` on ${dayLabel}`;
      break;
    case "date":
      changedBefore = "on ";
      changedValue = "other days";
      break;
  }

  return {
    rung,
    announcement: `Showing ${count} spaces with the ${ANNOUNCED_FILTER[rung]} filter widened.`,
    line1,
    lead,
    changedBefore,
    changedValue,
    changedAfter,
    tail: ` instead — ${SAME_CLAUSE[rung]}. Your other filters are unchanged.`,
  };
}

export function RelaxBand(props: RelaxBandProps) {
  // THE LATCH — a READ-ONCE lazy initializer, made safe by the `key={rung}` its parent renders it with.
  //
  // The copy is computed on MOUNT and never again, so a re-render carrying the same outcome (a scroll,
  // a parent re-render, a transition's pending pass) produces byte-identical children, mutates no text
  // node, and gives `role="status"` nothing to re-announce. A DIFFERENT rung is a different outcome and
  // SHOULD be announced — `search-results.tsx` keys this component on the rung, so that case remounts
  // and re-latches. It is the same read-once-plus-key pairing `slot-picker.tsx`'s seeded selection uses,
  // for the same reason.
  //
  // ⚠ THIS WAS A REF FIRST, AND THE REF DOES NOT COMPILE HERE. Holding the latched copy in a
  // `useRef` and syncing it during render is the shape the plan describes, and this repo's React
  // Compiler lint rejects it outright — eleven `Cannot access refs during render` ERRORS (not
  // warnings), which fail `npm run lint` and therefore the build. Measured, not assumed. The
  // initializer buys the identical property without reading anything during render.
  const [copy] = React.useState<Rendered>(() => render(props));

  return (
    <div
      role="status"
      data-testid="search-relax-band"
      // Below `sm:` it stacks and `Undo` becomes full-width (12-UI-SPEC § The relaxation band).
      className="flex flex-col items-start justify-between gap-3 rounded-lg border bg-muted p-4 sm:flex-row sm:items-start"
    >
      <div className="min-w-0">
        {/* The outcome FIRST, for the reason in the header. Visually redundant, never redundant to a
            screen reader arriving at a region whose visible first line is a negative. */}
        <span className="sr-only">{copy.announcement}</span>
        <p className="text-body font-semibold text-foreground">{copy.line1}</p>
        <p className="mt-1 text-label text-muted-foreground">
          {copy.lead}
          <span data-relax-changed>
            {copy.changedBefore}
            <span data-relax-value>{copy.changedValue}</span>
            {copy.changedAfter}
          </span>
          {copy.tail}
        </p>
      </div>
      <Button
        variant="outline"
        size="touch"
        className="w-full shrink-0 sm:w-auto"
        onClick={props.onUndo}
      >
        Undo
      </Button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • WHETHER A SCREEN READER SPEAKS THIS ONCE. Announcement is browser + AT behaviour, not a DOM
//     property. What is mechanically checkable is that the DOM does not change, and that is what the
//     latch buys. The listening test is Phase 17's.
//   • THE ACTIVITY TAG'S NOUN. A tag-filtered search says "6 spaces", not "6 badminton courts", because
//     the vocabulary supplies no plural noun for an activity. The category is still on screen — in the
//     search bar's own control, untinted, which is the point.
