// BFLOW-02 / D-43 — the KEY-FACTS STRIP on the public listing page: a bordered box of three or four
// label-over-value cells, sitting between the title and the description.
//
// ══ WHY A <dl> ════════════════════════════════════════════════════════════════════════════════════════
// Each cell is a term and its definition, which is exactly what a description list is for, and it is the
// only markup that says so to a screen reader. There is NO other `<dl>` in `src/` (12-PATTERNS § No
// Analog Found), so this shape inherits nothing and the rules are written here rather than looked up:
// every `<dt>` is immediately followed by its own `<dd>`, and no cell renders one without the other.
//
// ══ THE STRIP IS FOUR CELLS AND CANNOT BECOME FIVE ════════════════════════════════════════════════════
// Both branches below push from a fixed list — at most four labels exist in each — so a fifth is not
// prevented by a slice, it is unreachable. That matters because a slice would SILENTLY drop the fifth
// fact somebody added, and the strip is the one surface on this page whose whole design argument is that
// it holds a fixed, scannable number of things. Adding a fifth key fact is on 12-UI-SPEC's anti-pattern
// list; the place to change that is the requirement, not this array.
//
// ══ NO ICONS ══════════════════════════════════════════════════════════════════════════════════════════
// The rejected variant had a glyph row; this one does not, and adding glyphs back to these cells would
// be a third treatment nobody chose. The icon library is therefore imported by nothing in this file —
// and its package name is deliberately NOT spelled anywhere here, because an acceptance grep counts its
// occurrences and a guard that a comment explaining the guard can trip is not a guard. That failure has
// now been recorded six times in this repository (`booking-row.tsx`, `responsive-dialog.tsx`, 11-07
// ×2, 11-08 ×3, 12-07's `photo-gallery.tsx`); this is the seventh site to observe the rule rather than
// the seventh to break it.
//
// This is a SERVER component: it carries no client directive and calls no hook, so the whole strip is in
// the first paint and in the no-JS document. (The directive string is deliberately not spelled anywhere
// in this file so a grep for it stays a real guard.)

import { SPACE_TYPE_LABELS, type SpaceTypeValue } from "@/lib/listing-vocab";

/** One rendered cell: the `<dt>` term and the `<dd>` that defines it. */
export type KeyFact = { label: string; value: string };

/**
 * 09-UI-SPEC's booker vocabulary: a drop-in listing sells a DAY PASS, and this is the sentence that says
 * what one buys. A TS constant rather than JSX text for the reasons `cancellation-policy-disclosure.tsx`
 * records — chiefly that `react/no-unescaped-entities` would force an entity into the apostrophe and the
 * source would stop being the bytes that render.
 */
export const DAY_PASS_VALUE = "Shared space, any time they're open";

/**
 * THE UNIT NOUN, derived from the space type, falling back to `spaces`.
 *
 * A per-surface presentational word, kept HERE rather than promoted into `listing-vocab.ts`: that module
 * is the authority for the values and labels the wizard, the Zod schemas and the search filters all
 * share, and this noun has exactly one consumer and exists only to make one sentence read like English.
 * A second space-type word list in the shared vocabulary with one caller would be the drift risk that
 * module exists to prevent, not a protection against it.
 *
 * A `Partial` record on purpose: every type NOT named here falls to `spaces`, which is always true and
 * never silly ("1 of 3 spaces" for a multi-purpose venue), so adding a space type to the vocabulary can
 * never leave this map rendering `undefined`.
 */
const UNIT_NOUNS: Partial<Record<SpaceTypeValue, string>> = {
  pickleball_court: "courts",
  tennis_court: "courts",
  basketball_court: "courts",
  multi_sport_court: "courts",
  yoga_studio: "rooms",
  dance_studio: "rooms",
  pilates_barre_studio: "rooms",
};
const UNIT_NOUN_FALLBACK = "spaces";

export type KeyFactsProps = {
  /** The LISTING's persisted mode — a drop-in listing gets an entirely different four cells. */
  occupancyMode: "exclusive" | "open_capacity";
  bookingMode: "instant" | "request";
  primarySpaceType: SpaceTypeValue | null;
  maxOccupancy: number | null;
  unitCount: number;
};

/**
 * The cells this listing renders, in the order the requirement fixes them.
 *
 * EXCLUSIVE — up to four: `Capacity`, `Space`, `Booking`, `Units`.
 * DROP-IN — up to four, and `Units` is NEVER one of them: `Space`, `Booking`, `Day pass`,
 * `Spots a day`. A drop-in listing sells spots inside ONE shared space, so a unit count says nothing
 * true about what is being bought — it is not omitted for room, it is omitted because it would be a
 * claim about the wrong thing. The fourth label reads `Spots a day` rather than `Capacity` because the
 * 09-UI-SPEC booker vocabulary bans "capacity" on drop-in surfaces (a daily admissions count is not a
 * room size).
 *
 * Exported for reuse, NOT as the tests' expectation: `tests/listing/key-facts.test.tsx` holds its own
 * literal table and asserts the RENDERED markup against it. Reading this function to decide what the
 * markup should say would make the gate agree with the implementation by construction — the tautology
 * 12-07 measured on the gallery's button predicate.
 */
export function keyFactCells({
  occupancyMode,
  bookingMode,
  primarySpaceType,
  maxOccupancy,
  unitCount,
}: KeyFactsProps): KeyFact[] {
  const spaceLabel = primarySpaceType ? SPACE_TYPE_LABELS[primarySpaceType] : null;
  // The mode is stated THREE times on this page — `DropInBadge` renders on the title line and beside
  // the `Availability` heading — so this cell is a confirmation, never the only place a booker could
  // learn how the space books.
  const booking = bookingMode === "instant" ? "Instant" : "Host approves";

  if (occupancyMode === "open_capacity") {
    const cells: KeyFact[] = [];
    if (spaceLabel) cells.push({ label: "Space", value: spaceLabel });
    cells.push({ label: "Booking", value: booking });
    cells.push({ label: "Day pass", value: DAY_PASS_VALUE });
    if (maxOccupancy !== null) cells.push({ label: "Spots a day", value: `Up to ${maxOccupancy}` });
    return cells;
  }

  const cells: KeyFact[] = [];
  if (maxOccupancy !== null) cells.push({ label: "Capacity", value: `Up to ${maxOccupancy}` });
  if (spaceLabel) cells.push({ label: "Space", value: spaceLabel });
  cells.push({ label: "Booking", value: booking });
  if (unitCount > 1) {
    // ══ `1 of 4 courts`, NEVER `4 courts` — a correctness rule, not a wording preference ═══════════
    // The chosen strip has no qualifier line: the rejected variant's "book one exclusively" caption
    // has nowhere to live, so the disambiguation had to move INTO the value. A booker who reads
    // `4 courts` in a cell labelled `Units` can reasonably conclude the booking gets them all four —
    // and this listing sells ONE unit for the window. That is a factual claim the product does not
    // make, about the thing the booker is paying for, on the page where they decide. The prefix is
    // what makes the cell say what is actually bought.
    const noun = (primarySpaceType && UNIT_NOUNS[primarySpaceType]) || UNIT_NOUN_FALLBACK;
    cells.push({ label: "Units", value: `1 of ${unitCount} ${noun}` });
  }
  return cells;
}

/**
 * The container's column count ABOVE 700px, as a lookup rather than an interpolation.
 *
 * Tailwind resolves utilities by scanning source text, so a template-built class name (`grid-cols-${n}`)
 * never reaches the compiled stylesheet and the strip would silently fall back to one column. Every
 * class this file can emit is therefore written out whole, exactly once, here.
 *
 * 700px is the breakpoint the design contract names, and it is between Tailwind's `sm` (640) and `md`
 * (768) — hence the arbitrary variant. It is the first `min-[…]` in `src/`; it is a one-off for a strip
 * whose collapse point is a property of ITS content (four cells stop fitting), not of the page.
 */
const WIDE_COLUMNS: Record<number, string> = {
  1: "min-[700px]:grid-cols-1",
  2: "min-[700px]:grid-cols-2",
  3: "min-[700px]:grid-cols-3",
  4: "min-[700px]:grid-cols-4",
};

/**
 * A cell's borders, computed from its INDEX and the TOTAL rather than written as ternaries in the JSX.
 *
 * There are two layouts and one element, so every cell states both. Below 700px the strip is 2 columns:
 * the right-hand cell of each row must drop its right border (or it draws on the box's own edge), and
 * the first row must gain a bottom border (or the two rows run together). At and above 700px every cell
 * is on ONE row: the right border returns to all but the last, and no cell has a row beneath it.
 *
 * Keeping this out of the JSX is not tidiness — the four cases interact (a cell can be both "right-hand
 * below 700px" and "not last above it"), and inline they read as four independent conditions that are
 * easy to change one at a time into a strip with a stray border.
 */
export function keyFactCellClass(index: number, total: number): string {
  const isLast = index === total - 1;
  /** Right-hand column of the 2-up layout — odd indices, below 700px. */
  const endsNarrowRow = index % 2 === 1;
  /** Sits in the first of two narrow rows, so something is drawn beneath it below 700px. */
  const hasNarrowRowBelow = index < 2 && total > 2;

  return [
    "p-4",
    endsNarrowRow ? "border-r-0" : "border-r",
    hasNarrowRowBelow ? "border-b" : null,
    // One row at >=700px: restore the right border everywhere but the end, and remove the row rule.
    endsNarrowRow && !isLast ? "min-[700px]:border-r" : null,
    isLast ? "min-[700px]:border-r-0" : null,
    hasNarrowRowBelow ? "min-[700px]:border-b-0" : null,
  ]
    .filter(Boolean)
    .join(" ");
}

export function KeyFacts(props: KeyFactsProps) {
  const cells = keyFactCells(props);
  if (cells.length === 0) return null;

  return (
    <dl
      data-testid="listing-key-facts"
      className={`grid grid-cols-2 overflow-hidden rounded-lg border ${
        WIDE_COLUMNS[cells.length] ?? WIDE_COLUMNS[2]
      }`}
    >
      {cells.map((cell, index) => (
        <div key={cell.label} className={keyFactCellClass(index, cells.length)}>
          <dt className="text-label text-muted-foreground">{cell.label}</dt>
          <dd className="mt-0.5 text-body font-semibold text-foreground">{cell.value}</dd>
        </div>
      ))}
    </dl>
  );
}
