"use client";

// Booker hour-slot picker (AVAIL-04 / AVAIL-05 · D-22/D-23 · sketch 001 variant A "Range fill"). A
// toggle-group of 60-min, on-the-hour chips for one venue-local day, rendered in the venue's local
// 12-hour time (SC#2 — never the browser tz). The booker picks a START hour (a coral-ring anchor), then
// an END hour, and the CONTIGUOUS available run between them fills in (either direction). If the run
// would cross an unavailable hour it TRUNCATES at the last available hour before the gap and shows a
// soft, non-error hint naming the blocking hour. A same-anchor second click is a 1-hour block; a click
// after a completed run re-anchors a fresh start. "Book full day" (D-23) selects the whole operating day
// and mutually clears any run/anchor. Occupied / blocked / past / beyond-horizon hours are visibly
// distinct (muted + line-through + tooltip), `aria-disabled`, and CANNOT be selected — never red
// (occupancy is a normal state, not an error; UI-SPEC Availability-state recipes).
//
// A11Y: the control stays a Radix ToggleGroup type="multiple" — this keeps the single tab stop + arrow
// roving + Space/Enter activation + aria-disabled on unavailable chips + 44px hit areas with the least
// churn. The committed run's chips carry aria-pressed=true (honest — they ARE selected). The transient
// START anchor is intentionally NOT a pressed toggle: it is a coral ring + an augmented aria-label +
// an aria-live "pick an end hour" helper, so SR users hear the pending state and the truncation hint.
// (A plain-<button>/roving-tabindex grid matching the sketch was rejected — it would re-implement
// keyboard nav for no a11y gain.) The gesture logic itself lives in the DOM-free ./slot-selection core.
//
// The picker is advisory (Pitfall 6): the DB EXCLUDE constraint is the sole authority and Phase 4
// re-derives + re-validates the selection server-side. Selection lifts up via `onSelectionChange`.
//
// When `disabled` (the listing is published-but-not-payable → !deriveBookable) every chip renders
// read-only so there is no dead-end selection (threat T-03-TAMPER-SELECT; UI-SPEC Interaction rules).

import * as React from "react";
import { format } from "date-fns";
import { tz } from "@date-fns/tz";
import { InfoIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AvailabilitySlot } from "@/lib/availability/read-model";
import { MIN_LEAD_INSTANT_MINUTES, MIN_LEAD_REQUEST_HOURS } from "@/lib/payments/config";
import {
  resolveClick,
  resolveFullDay,
  seedSelection,
  selectionValue,
  type SelectionState,
  type SlotSelectionValue,
} from "./slot-selection";

// The lifted contract is defined in the pure core and re-exported here so availability-calendar.tsx's
// `import { SlotPicker, type SlotSelectionValue }` stays valid and untouched (contract UNCHANGED).
export type { SlotSelectionValue };

type BookingMode = "instant" | "request";

type SlotPickerProps = {
  slots: AvailabilitySlot[];
  timezone: string;
  unitCount: number;
  /** D-100: selects which minimum-notice copy the `too_soon` chips carry. */
  mode: BookingMode;
  disabled: boolean;
  onSelectionChange: (sel: SlotSelectionValue | null) => void;
  /**
   * Phase-12 (D-59 #1) — the selection this picker MOUNTS with, read once. The listing RSC seeds the
   * booker's searched window into the shared booking context when the read model says those hours are
   * free, and the calendar hands the context's current value down here; `seedSelection` re-validates it
   * against `slots` and degrades to nothing on any mismatch.
   *
   * READ ONCE, ON MOUNT ONLY, and that is what makes it correct rather than a controlled-value trap: the
   * calendar keys this component on the day, so a day change REMOUNTS it — and `selectDay` clears the
   * lifted selection in the same transition, so the value read at that mount is null. It can therefore
   * never resurrect a selection the booker cleared.
   */
  initialSelection?: SlotSelectionValue | null;
  /**
   * Phase-12 (STATE-07 / D-55) — THE HOURS THE BOOKER JUST LOST, as start instants.
   *
   * Computed by the calendar from the collision's own window intersected with the REFRESHED day, so
   * every entry here is an hour the server has already ruled on. Empty on every ordinary render, which
   * is what keeps the shipped picker byte-identical outside a collision.
   *
   * ⚠ IT DECIDES A CLASS, NEVER A BOOKABILITY. These hours already render through the unavailable
   * branch because the read model says so; this prop only tells the branch WHICH of them are the ones
   * that just changed under the booker, so that single beat of motion lands on the right chips. Nothing
   * here pre-checks, pre-filters or decides whether anything can be booked — the exclusion constraint
   * inside the transaction remains the sole arbiter (CLAUDE.md § What NOT to Use).
   */
  lostStartUtcs?: readonly string[];
};

/**
 * The nearest FREE hours on each side of the hours that were lost — the "closest free windows are
 * outlined" half of the collision copy (12-UI-SPEC § The Collision, accent item 10).
 *
 * ⚠ PRESENTATION ONLY, AND THE DISTINCTION IS LOAD-BEARING. This is a HIGHLIGHT OVER AVAILABILITY THE
 * SERVER ALREADY RETURNED — it reads `slots` and nothing else, performs no fetch, and makes no claim
 * about bookability. A booker who taps an outlined chip goes through exactly the same `placeHold` and
 * exactly the same constraint as any other chip, and may lose that race too.
 *
 * WHAT "NEAREST FREE WINDOW" MEANS HERE, stated because the phrase could mean three things. It is the
 * first `available` hour walking OUTWARD from the lost run, once in each direction — the two hours a
 * booker would actually reach for. It is deliberately NOT "the nearest free RUN of the same length":
 * that would be a duration claim, and a run long enough for the booker's original window is precisely
 * the thing only the constraint may promise. It is also not the whole run outlined, which on a 06:00
 * to 21:00 day would put an accent on eleven chips and stop being a pointer.
 *
 * WHEN ONE SIDE HAS NOTHING (the lost hours sit against the end of the day), the walk takes TWO from
 * the other side, so the copy's plural stays honest wherever the day the booker lost sits.
 */
function nearestFreeStarts(
  slots: AvailabilitySlot[],
  lost: ReadonlySet<string>,
): ReadonlySet<string> {
  if (lost.size === 0) return EMPTY_SET;
  const indices = slots.flatMap((s, i) => (lost.has(s.startUtc) ? [i] : []));
  if (indices.length === 0) return EMPTY_SET;

  const lo = Math.min(...indices);
  const hi = Math.max(...indices);
  const before: string[] = [];
  const after: string[] = [];
  for (let i = lo - 1; i >= 0 && before.length < 2; i--) {
    if (slots[i].state === "available") before.push(slots[i].startUtc);
  }
  for (let i = hi + 1; i < slots.length && after.length < 2; i++) {
    if (slots[i].state === "available") after.push(slots[i].startUtc);
  }

  const picked =
    before.length > 0 && after.length > 0
      ? [before[0], after[0]] // one on each side — the ordinary case
      : [...before, ...after].slice(0, 2); // one side is empty: take two from the other
  return new Set(picked);
}

/** Shared empty set, so an ordinary render allocates nothing and `useMemo` has a stable identity. */
const EMPTY_SET: ReadonlySet<string> = new Set<string>();

/** Human-readable reason a chip can't be picked (never leaks "unit"/"tstzrange" jargon — UI-SPEC copy). */
function reasonFor(state: AvailabilitySlot["state"], mode: BookingMode): string {
  switch (state) {
    case "past":
      return "Past";
    case "beyond_horizon":
      return "Too far ahead";
    // D-98/D-100. An explicit case is REQUIRED — the `default` below would otherwise swallow it into a
    // flat "Unavailable" and the booker would never learn that the slot is free, just not yet bookable.
    case "too_soon":
      return mode === "request" ? "Too soon to request" : "Too soon to book";
    default:
      return "Unavailable";
  }
}

/**
 * The FULL reason (UI-SPEC § 8): the short one, plus the notice requirement when there is one.
 *
 * ⚠ THIS USED TO BE A TOOLTIP BODY, AND THAT IS THE CHANGE PLAN 12-09 LANDED. Every unavailable chip
 * was a `TooltipTrigger` wrapping a `<span tabIndex>`, so the only way to learn WHY an hour could not
 * be booked was to hover it — an affordance roughly half this traffic (touch) never receives, which is
 * the same objection D-39 and D-ELM-01 raise and the reason D-56 deletes hover-only explanations from
 * the booker path. 12-08 deleted the listing page's last one and logged this one forward with the
 * design question stated: *"where does 'why this hour is unavailable, including the notice
 * requirement' live once the hover is gone — a single day-panel line naming the states present, or the
 * `aria-label` expanded into visible text?"*
 *
 * BOTH, because they answer different halves and neither is sufficient alone. This sentence is now the
 * chip's own `aria-label` — so a screen-reader user hears the notice requirement per chip rather than
 * the short reason only — AND the day panel renders ONE line naming exactly the states the day
 * contains (see `unavailableReasons` below), so a sighted pointer user reads it without interacting.
 * One derivation feeds both, which is what stops the visible sentence and the announced one drifting.
 *
 * A PER-CHIP STATIC LINE WAS THE OTHER CANDIDATE AND IT IS NOT A LAYOUT THAT EXISTS: the chips are a
 * wrapping grid of 44 × 80px boxes, and `Too soon to book — needs 30 minutes' notice` under each one
 * is a paragraph per chip. Naming the distinct states once, below the grid, says the same thing in the
 * space the surface actually has.
 */
function tooltipFor(state: AvailabilitySlot["state"], mode: BookingMode): string {
  if (state !== "too_soon") return reasonFor(state, mode);
  return mode === "request"
    ? `Too soon to request — this host needs ${MIN_LEAD_REQUEST_HOURS}h notice`
    : `Too soon to book — needs ${MIN_LEAD_INSTANT_MINUTES} minutes' notice`;
}

/**
 * Shared chip shape so available / selected / unavailable chips line up in the grid (≥44px hit area).
 *
 * ⚠ `min-w-20` IS NOT COSMETIC, AND IT LANDED IN THE SAME COMMIT AS THE SHIMMER THAT DEPENDS ON IT
 * (plan 12-09 · RESEARCH Pitfall 9). `measurements.ts`'s `SLOT_CHIP_BOX` is `h-11 w-20` and the
 * UI-SPEC derives its `w-20` half from "the real chip's minimum" — which this chip did not have. It
 * carried `min-h-11` and nothing at all on the width, so the chip's width was CONTENT-driven: `9:00 AM`
 * and `12:00 PM` are different strings and the shimmer standing in for them was a fixed 80px.
 *
 * The whole argument for a shared constant is that the placeholder and the thing it stands in for are
 * ONE box, and a constant only one side obeys is worse than two literals — it looks like a guarantee.
 * 12-01 wrote that condition onto the constant ("whichever plan makes this the single source of both
 * MUST add `min-w-20` to the real chip in the SAME commit"), and this is that commit: the eight
 * skeleton bars in `availability-calendar.tsx` now read `SLOT_CHIP_BOX`, and the floor below is its
 * width half.
 *
 * It is a MINIMUM rather than a fixed width because a chip must still be allowed to grow: the
 * multi-unit sub-label (`2 of 4 free`) is wider than 80px at some counts, and pinning the width would
 * either truncate it or force it to wrap. The skeleton reserves the floor, which is the number that
 * decides how many chips fit on a row and therefore how tall the grid is.
 */
const CHIP_BASE =
  "flex h-auto min-h-11 min-w-20 flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1.5 text-sm font-medium";

export function SlotPicker({
  slots,
  timezone,
  unitCount,
  mode,
  disabled,
  onSelectionChange,
  initialSelection,
  lostStartUtcs,
}: SlotPickerProps) {
  const inTz = tz(timezone);

  // D-55. Both are empty on every ordinary render — see the prop and `nearestFreeStarts`.
  const lost = React.useMemo<ReadonlySet<string>>(
    () => (lostStartUtcs === undefined || lostStartUtcs.length === 0 ? EMPTY_SET : new Set(lostStartUtcs)),
    [lostStartUtcs],
  );
  const outlined = React.useMemo(() => nearestFreeStarts(slots, lost), [slots, lost]);
  // The whole gesture (anchor / run / full-day / gap) lives in one reducer state; ./slot-selection owns
  // every transition so the DOM shell never re-implements the range-fill rules.
  // Lazy initializer: `initialSelection` is consulted exactly once, at mount. See the prop's docblock.
  const [sel, setSel] = React.useState<SelectionState>(() =>
    seedSelection(initialSelection ?? null, slots),
  );

  const startToIndex = React.useMemo(() => {
    const m = new Map<string, number>();
    slots.forEach((s, i) => m.set(s.startUtc, i));
    return m;
  }, [slots]);

  // The committed run's startUtcs drive the controlled ToggleGroup value. The pending anchor is NOT in
  // the value (it renders as a coral ring, not a filled/pressed chip); full-day mode selects nothing here.
  const selectedValues = React.useMemo(() => {
    if (!sel.run) return [];
    return slots.slice(sel.run.lo, sel.run.hi + 1).map((s) => s.startUtc);
  }, [sel.run, slots]);

  /** Set the reducer state AND lift the resulting {start,end,fullDay}|null selection to the rail. */
  const apply = React.useCallback(
    (nextSel: SelectionState) => {
      setSel(nextSel);
      onSelectionChange(selectionValue(nextSel, slots));
    },
    [slots, onSelectionChange],
  );

  // Radix hands us the whole toggled array; derive the SINGLE changed hour (added on a fresh click, or
  // removed when an in-run chip is re-clicked — both re-anchor correctly) and feed it to resolveClick.
  function handleValueChange(next: string[]) {
    const prev = selectedValues;
    const added = next.find((v) => !prev.includes(v));
    const removed = prev.find((v) => !next.includes(v));
    const changed = added ?? removed;
    if (changed === undefined) return;
    const index = startToIndex.get(changed);
    if (index === undefined) return;
    apply(resolveClick(sel, index, slots));
  }

  function toggleFullDay() {
    apply(resolveFullDay(sel));
  }

  const hasSlots = slots.length > 0;
  const gapSlot = sel.gapIndex !== null ? slots[sel.gapIndex] : null;

  /**
   * The distinct reasons THIS day's struck-through chips carry, in the order the day presents them.
   *
   * Keyed on the state rather than on the sentence so `too_soon` cannot appear twice, and derived from
   * `tooltipFor` so the line below and the chips' own `aria-label`s are one sentence rather than two
   * that agree today. It names only the states actually present: a day with nothing but booked hours
   * says "already booked" and does not lecture a booker about a notice window that is not why anything
   * is greyed out.
   */
  const unavailableReasons = React.useMemo(() => {
    const byState = new Map<AvailabilitySlot["state"], string>();
    for (const slot of slots) {
      if (slot.state === "available" || byState.has(slot.state)) continue;
      byState.set(slot.state, tooltipFor(slot.state, mode));
    }
    return [...byState.values()];
  }, [slots, mode]);

  return (
    <div className="space-y-3">
      <ScrollArea className="max-h-72 w-full">
        <ToggleGroup
          type="multiple"
          value={selectedValues}
          onValueChange={handleValueChange}
          disabled={disabled}
          aria-label="Available hours"
          className="flex w-full flex-wrap justify-start gap-2 pr-3"
        >
          {slots.map((slot, index) => {
            const timeLabel = format(new Date(slot.startUtc), "h:mm a", { in: inTz });
            const isAvailable = slot.state === "available";
            const isSelected = selectedValues.includes(slot.startUtc);
            const isAnchor = sel.anchor === index;

            if (!isAvailable) {
              // Occupied / blocked / past / beyond-horizon / too-soon: visible, muted, struck-through,
              // NEVER selectable, NEVER red. The fourth state (D-98/D-100) flows through this EXACT
              // treatment with zero visual change: too-soon is a normal state, not an error. This is
              // the phase's calibration point for "occupancy is a normal state", and it is CHECKABLE
              // rather than asserted: the error token is not spelled anywhere in this file, so a
              // directory grep for it returns nothing — which is why it is described here rather than
              // quoted (the repo's standing "name the thing, do not spell it" rule).
              //
              // D-56 / 12-09: the `TooltipTrigger` + `<span tabIndex>` wrapper that used to sit here
              // is GONE, and with it the last hover-only explanation on the booker path. The label
              // below now carries the FULL reason (the notice requirement included, not just the
              // short form), and the day panel names the day's distinct states in one visible line —
              // see `tooltipFor`'s docblock for why that pair rather than either half.
              //
              // D-55'S FLIP RIDES THIS EXACT BRANCH AND CHANGES NOTHING ELSE ABOUT IT. An hour the
              // booker just lost is not a NEW state — it is this state, arriving under them — so it
              // gets the shipped muted-and-struck-through treatment plus ONE brief accent ring, one
              // iteration, inside the slowest named step (`globals.css`'s `--animate-collision-pulse`,
              // where the whole argument for its shape lives). It ANNOUNCES NOTHING: the collision
              // notice above the grid is the one live region for this outcome (rule 6), and a chip
              // that spoke would be a second one. The beat is what makes the sentence evidence; a
              // repeating pulse would make a normal marketplace outcome read as an alarm.
              return (
                <ToggleGroupItem
                  key={slot.startUtc}
                  value={slot.startUtc}
                  disabled
                  aria-disabled="true"
                  aria-label={`${timeLabel} — ${tooltipFor(slot.state, mode)}`}
                  className={cn(
                    CHIP_BASE,
                    "cursor-not-allowed bg-muted text-muted-foreground line-through",
                    lost.has(slot.startUtc) && "animate-collision-pulse",
                  )}
                >
                  <span className="tabular-nums">{timeLabel}</span>
                </ToggleGroupItem>
              );
            }

            return (
              <ToggleGroupItem
                key={slot.startUtc}
                value={slot.startUtc}
                aria-pressed={isSelected}
                // The pending START anchor announces itself (coral ring alone is not enough for SR).
                aria-label={
                  isAnchor
                    ? `${timeLabel} — start selected, pick an end hour`
                    : timeLabel
                }
                className={cn(
                  CHIP_BASE,
                  "border border-border bg-card text-foreground hover:bg-muted",
                  // In-run (data-state=on) = coral fill (the ONLY accent besides the book CTA).
                  // A Radix ToggleGroupItem, not a <Button> with a variant prop — it stays a
                  // token class and converting it breaks hour selection. The hover darkens with
                  // a color-mix rather than tinting at 90% alpha (4.04:1 court / 3.87:1 grove).
                  "data-[state=on]:border-transparent data-[state=on]:bg-brand data-[state=on]:text-brand-foreground data-[state=on]:hover:bg-[color-mix(in_oklch,var(--brand),var(--foreground)_10%)]",
                  // Pending anchor = coral RING (not filled), so start vs committed reads at a glance.
                  // The ring is SOLID (CR-01 of the phase-10 review). At 50% alpha it composited to
                  // #ed969a on card and measured 2.23:1 (court) / 2.03:1 (grove) against the 3:1
                  // non-text bar — an indicator that has to be seen, painted below the bar for
                  // seeing it. Solid `brand` on `card` is already a DECLARED, measured row in
                  // `contrast-pairs.ts`, so this shape needs no new exemption.
                  isAnchor && "border-brand ring-2 ring-brand",
                  // D-55's ALTERNATIVES (accent item 10): the nearest free hour on each side of the
                  // window that went, carrying a coral EDGE — the same solid `brand on card` pairing
                  // the anchor's note measures, so no new inventory row is needed either.
                  //
                  // ⚠ AN EDGE AND NOT A RING, WHICH IS WHAT KEEPS IT DISTINGUISHABLE FROM THE ANCHOR
                  // ABOVE. Two accent indicators that looked identical would tell a booker their
                  // pending start is in two places at once. In practice they cannot co-occur — a
                  // collision remounts this picker with no selection — but "cannot co-occur today" is
                  // the kind of invariant a later edit breaks quietly, and the two treatments differing
                  // costs nothing.
                  //
                  // NOT LIFTED OUT AS BUTTONS, deliberately: a pair of "book 8 AM instead" chips
                  // duplicates two controls that already exist directly below, and a duplicate control
                  // is a second thing to keep in sync with the run-fill rules. NO `role`, NO
                  // `aria-live`, NO `tabindex` of its own — the notice is the one live region and these
                  // chips are already reachable as exactly what they are.
                  outlined.has(slot.startUtc) && "border-brand",
                )}
              >
                <span className="tabular-nums">{timeLabel}</span>
                {unitCount > 1 && (
                  <span
                    className={cn(
                      "text-xs font-normal",
                      // NO ALPHA ON THE INK OVER THE CORAL FILL (CR-03). This sub-label sits on
                      // the coral fill set ten lines above. At 80% opacity it composited to
                      // #f4d1d2 / #c9e2e2 and measured 3.38:1 (court) / 3.51:1 (grove) against a
                      // 4.5 text bar. That is the SAME arithmetic this phase invokes fifteen
                      // times to condemn a 90%-alpha accent fill — an alpha tint over a light
                      // surface LIGHTENS, dragging a filled control toward its own text colour —
                      // applied to the foreground instead of the fill. Solid measures 4.566 (court)
                      // / 4.572 (grove) — both clear the 4.55 bar (TEXT_BAR 4.5 + AA_EPSILON 0.05),
                      // which is why the `brand-foreground on brand` row in `contrast-pairs.ts` is
                      // green. (An earlier draft of this note said "4.57 / 4.53"; the 4.53 was
                      // carried over from a review table and is wrong — it reads as if the fix
                      // landed BELOW the phase's own bar on grove, which it does not.)
                      // The de-emphasis the modifier carried is already expressed structurally by
                      // `text-xs font-normal` against the parent's `text-sm font-medium`, so the
                      // hierarchy survives; only the contrast failure goes.
                      isSelected
                        ? "text-brand-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {slot.freeUnits} of {unitCount} free
                  </span>
                )}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </ScrollArea>

      {/* D-56 / 12-09 — WHERE THE DELETED TOOLTIP'S CONTENT WENT, for everyone rather than for a
            pointer. One line, naming only the states this day actually contains, derived from the same
            `tooltipFor` the chips' `aria-label`s use so the visible sentence and the announced one
            cannot drift. Muted and never red: every state it names is a normal marketplace outcome,
            which is the calibration 12-UI-SPEC hangs on this surface.

            It is NOT a live region and must not become one. Nothing about it changes in response to
            something the booker just did — it describes the day already on screen — and a `role` here
            would announce the day's whole occupancy profile every time the slots re-render, which is
            rule 6 of `src/lib/design/live-regions.ts` arriving through the front door. */}
      {unavailableReasons.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Struck-through times can&apos;t be booked —{" "}
          {unavailableReasons.join(" · ").toLowerCase()}.
        </p>
      )}

      {/* Pending helper: a start is anchored but no end yet. Muted, never red — this is normal flow.

            GATE-03 RULE 5 (plan 12-06): this shipped as a bare `aria-live="polite"` on a `<p>` with no
            role, so it was an anonymous live region rather than a named KIND of one. `role="status"` is
            what says "this is the result of something you just did" — and it matches the gap hint eight
            lines below, so one file no longer carries two idioms for one concept. Declared as
            `slot-picker-pending-helper` in `src/lib/design/live-regions.ts`. The attribute stays beside
            the role for the same reason the gap hint keeps its: `role="status"` is already implicitly
            polite, the redundancy is harmless, and it is the shipped idiom on this path. */}
      {sel.anchor !== null && !sel.run && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-muted-foreground"
        >
          Start selected — pick an end hour.
        </p>
      )}

      {/* Gap hint: the fill truncated at a busy hour. A soft brand-tint info note — NEVER an error/red
            (occupancy is a normal state). Mutually exclusive with the pending helper by construction. */}
      {gapSlot && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2 rounded-lg border border-brand/30 bg-brand/10 px-3 py-2 text-sm text-foreground"
        >
          <InfoIcon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-brand"
          />
          <span>
            {format(new Date(gapSlot.startUtc), "h:mm a", { in: inTz })} is{" "}
            {reasonFor(gapSlot.state, mode).toLowerCase()} — pick a later start
            for a block after it.
          </span>
        </div>
      )}

      {hasSlots && (
        <button
          type="button"
          aria-pressed={sel.fullDay}
          disabled={disabled}
          onClick={toggleFullDay}
          className={cn(
            "min-h-11 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors",
            "hover:bg-muted disabled:pointer-events-none disabled:opacity-50",
            // A bare <button>, not a <Button> with a variant prop — token class by design.
            // Hover darkens with a color-mix; the 90%-alpha tint it replaces measures 4.04:1
            // in court and 3.87:1 in grove against a 4.5 bar.
            sel.fullDay &&
              "border-transparent bg-brand text-brand-foreground hover:bg-[color-mix(in_oklch,var(--brand),var(--foreground)_10%)]",
          )}
        >
          Book full day
        </button>
      )}
    </div>
  );
}
