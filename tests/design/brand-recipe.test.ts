// DS-08 / DS-09 / D-21 / D-22 — the coral accent reaches a booker through ONE variant, and the 44px
// touch target is a named size. This is the booker-tree half of that gate.
//
// WHY THIS FILE EXISTS AT ALL (T-10-24, T-10-39).
//
// Before this phase, fifteen call sites across the booking, group and search trees each repeated the
// same literal string in a `className`: `bg-brand text-brand-foreground hover:bg-brand/90`. Two
// things follow from that, and both are defects rather than style preferences:
//
//   1. THE HOVER FAILS WCAG AA, FIFTEEN TIMES OVER. `--brand-foreground` on a 90%-alpha brand
//      measures **4.04:1 in court and 3.87:1 in grove** against a 4.5:1 bar. The cause is
//      mechanical: an alpha modifier composites the surface toward whatever is BEHIND it, and behind
//      it is a light background — so the fill LIGHTENS and moves toward its own text colour. The
//      sanctioned recipe darkens instead, with a `color-mix` toward `--foreground`, and measures
//      5.41 / 5.36. That recipe is declared exactly once, in `src/components/ui/button.tsx`.
//   2. A REPEATED STRING IS INVISIBLE TO THE CONTRACT. Change the accent and fifteen files disagree
//      with the variant until someone finds them all. The variant is the only form the theme
//      runtime can actually reason about.
//
// The trap is live, not hypothetical: `10-RESEARCH.md` § Code Examples still ships a CVA block
// using the alpha hover. It is superseded, and this file plus `button-variants.test.ts` make
// copying it verbatim fail a committed gate rather than ship.
//
// SCOPE — COMPLETE as of plan 10-09. It was deliberately partial when 10-08 wrote it, covering only
// the four trees that plan owned (`src/app/(app)/bookings/**`, `src/components/booking/**`,
// `src/components/group/**`, `src/components/search/**`). Plan 10-09 added the host surface, the
// availability surface and the REPO-WIDE totals below, which is what closes DS-08. The per-tree
// blocks are kept intact rather than folded into the totals: a total of 20 is satisfiable by 20
// conversions in the wrong places, and the per-file maps are what make that unsatisfiable.
//
// THE 29 / 20 / 9 SPLIT — WHAT IS DELIBERATELY *NOT* CONVERTED, AND MUST NOT BE.
//
// Of the 29 source lines that carried the accent as a background before this phase, **20 are on a
// `<Button>` and 9 are not**. The 9 are the availability calendar's selected day, the date-pass
// picker's selected day, the slot picker's selected hour chip / soft-accent notice / full-day chip,
// the spots-left chip, the notification unread dot, and the listing wizard's two step markers. They
// are `data-[selected-single=true]:`- and `data-[state=on]:`-scoped recipes on react-day-picker and
// Radix primitives, a bare `<button>`, a `<Badge>`, a `<span>` and an `<ol>` marker — not buttons
// with a variant prop. Converting them breaks the availability calendar and the slot picker, the two
// surfaces the whole booking flow runs through (T-10-26).
//
// 10-08 asserted NOTHING about those 9, on purpose, because it did not own them. **This file now
// pins them by name and by count**, which inverts the guarantee: the 9 stop being an unexamined
// remainder and become a recorded, deliberate non-conversion. An over-eager future sweep that
// "finishes the job" goes red here with the file named.
//
// THE ALPHA BAN IS NOT ABOUT BUTTONS. The rejected hover measures **4.04:1 in court / 3.87:1 in
// grove**, and that is a property of the 90% alpha compositing over a light surface — not of the
// `<Button>` element. So 10-09 removed it from all five of its non-Button occurrences too: four
// hovers under `availability/` (variant prefixes preserved exactly) and one STATIC use on the
// wizard's done step marker, which was the same failure without a hover to hide behind. The
// replacement there is the SOLID token rather than a `color-mix`, deliberately — see T-10-41 and
// the comment at the call site: a `color-mix` would have dropped the pinned 9 to 8 silently.
//
// OBSERVED RED, NOT ASSUMED (every observation recorded per the plans' acceptance criteria):
//   • [10-08] The literal recipe reinstated on `src/components/group/create-group-button.tsx` (the
//     colour classes added back to its `className`, `variant="brand"` removed) → this file exits
//     NON-ZERO: **3 failed / 5 passed**, on exactly the three assertions that should care — the
//     adoption total (14, not 15), the per-file map (`create-group-button.tsx` 0, not 1), and the
//     banned-hover scan (which reports the offending file and matched text). Nothing else moved.
//     Reverted → exits 0 with **8 passed**.
//   • [10-09] `src/components/availability/slot-picker.tsx`'s full-day chip converted to a
//     `<Button variant="brand">` — the exact "helpful" sweep T-10-26 exists to stop → this file
//     exits NON-ZERO: **5 failed / 13 passed**, on exactly the five assertions that should care:
//     the slot-picker positive control (2 lines, not 3), the repo-wide adoption total (21, not
//     20), the surviving-accent MAP, its total (8, not 9), and the availability-hover map (the
//     converted chip took its `color-mix` with it). Every failure diff names the file, which is
//     the point — the message a future sweep gets is "you broke the slot picker", not "a number
//     moved". Reverted → exits 0 with **18 passed**.
//
//     Note for whoever repeats this: reverting with `git checkout -- <file>` restores HEAD, not
//     the pre-experiment working tree, so it silently discards uncommitted task edits in the same
//     file. Take a copy first.
//
// THE LITERALS THIS FILE BANS APPEAR IN THIS FILE, VERBATIM AND ON PURPOSE. `tests/` is outside the
// scanned tree (the walker below roots at `src/`), so a file whose job is to ban a string is allowed
// to name it. Inside `src/`, the same reasoning has to be written descriptively instead — that is
// the standing resolution for this phase's recurring grep-versus-comment collision, and the reason
// the comments added next to the two converted 44px CTAs describe their height rather than quote it.
// 10-09 extended that resolution to `src/lib/design/contrast-pairs.ts`, whose prose quoted the
// banned class twice while documenting the very measurement that condemns it.
//
// THAT EXEMPTION IS NOT FREE, AND 10-09 MEASURED THE BILL. It holds for THIS walker, which roots at
// `src/`. It does NOT hold for TAILWIND's content scan, which roots at the repo and reads every
// tracked file — so the prose above, and the phase's own planning markdown, still emit the banned
// utility into the shipped stylesheet: **770 bytes / 0.58%, across 4 orphan selectors, confirmed
// after a clean `rm -rf .next` rebuild**, for a class that exists in no component. Two scanners,
// two roots, and only one of them had ever been reasoned about. See deferred item D-1 (three
// sightings now: 10-04, 10-07, 10-09). It is why THIS gate is a source scan: an assertion of the
// shape "the banned recipe is absent from the compiled CSS" is unsatisfiable by construction here,
// against a perfectly clean source tree.
//
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file:
//   • PIXELS. This proves a prop is present, not that a browser paints coral. `cn()`/tailwind-merge
//     precedence at the call site, a later layer overriding the fill, and the actual rendered
//     contrast are all invisible here. Phase 11's visual pass and Phase 17's a11y audit see pixels.
//   • THE ACCENT BUDGET. Nothing here counts how MUCH coral a screen shows. `variant="brand"` on
//     every button in the app would pass every assertion below while destroying the 10% budget
//     D-21 exists to protect. `button-variants.test.ts` guards the half of that which is mechanical
//     (the default variant must stay neutral); the rest is a design judgement, not a scan.
//   • WHETHER THE 9 SURVIVORS STILL RENDER. This file proves they were not converted, which is not
//     the same as proving the calendar still paints a selected day. `npm run test:e2e` drives real
//     slot selection through both surfaces; that is the only mechanical check of the rendering.
//   • WHETHER `--brand` IS THE RIGHT COLOUR. That is `contrast.test.ts`'s job.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join, relative } from "node:path";

const SRC_DIR = resolve(process.cwd(), "src");

/** The four trees plan 10-08 converts. The repo-wide blocks below cover everything else. */
const SCOPED_TREES = [
  "src/app/(app)/bookings/",
  "src/components/booking/",
  "src/components/group/",
  "src/components/search/",
] as const;

/**
 * Where an adopting call site can live, for the repo-wide total of 20.
 *
 * NOT all of `src/`, and the reason is worth naming so nobody "tightens" it later: the accent
 * variant is referenced in PROSE in `src/lib/design/contrast-pairs.ts`, describing the pairing it
 * measures. Widening this to `src/` makes the total 21 and the failure reads as a stray conversion
 * rather than as a doc comment. `src/components/ui/**` is inside the scope on purpose — the CVA
 * declares the variant but never *calls* it, so it contributes 0 and would expose a default flipped
 * to brand. That specific regression is `button-variants.test.ts`'s job; this is a second net.
 */
const ADOPTION_TREES = ["src/app/", "src/components/"] as const;

/**
 * THE 9 SURVIVORS — the non-Button accent recipes that stay token classes, by file and line count.
 *
 * This is the mitigation for T-10-26 and the whole point of the 10-09 half of this file. A bare
 * `toBe(9)` is satisfied by converting the slot picker's chip and un-converting a button somewhere
 * else; this map is not. `src/components/ui/**` is excluded because the CVA's own `bg-brand` is the
 * declaration these 9 deliberately do NOT route through.
 */
const EXPECTED_SURVIVING_ACCENT_LINES: Record<string, number> = {
  "src/app/(host)/host/listings/[id]/edit/wizard.tsx": 2,
  "src/components/availability/availability-calendar.tsx": 1,
  "src/components/availability/date-pass-picker.tsx": 1,
  "src/components/availability/slot-picker.tsx": 3,
  "src/components/availability/spots-left-chip.tsx": 1,
  "src/components/notifications/notification-item.tsx": 1,
};

/** The declaration site, excluded from the map above and asserted to be excluded. */
const CVA_TREE = "src/components/ui/";

/**
 * The sanctioned darkening hover, per file, under the availability tree.
 *
 * A per-file map rather than a bare total, for one specific failure mode: a migration that DELETED
 * the failing hover instead of replacing it would satisfy the alpha ban perfectly while silently
 * removing the hover affordance from a selected day. Pinning where the replacements landed makes
 * delete-instead-of-replace go red at the file that lost it.
 */
const EXPECTED_AVAILABILITY_HOVERS: Record<string, number> = {
  "src/components/availability/availability-calendar.tsx": 1,
  "src/components/availability/date-pass-picker.tsx": 1,
  "src/components/availability/slot-picker.tsx": 2,
};

const AVAILABILITY_TREE = "src/components/availability/";
const SANCTIONED_HOVER = "color-mix(in_oklch,var(--brand)";

/**
 * The exact conversion map, per file, rather than a bare total.
 *
 * T-10-39: fifteen near-identical edits across eleven files is precisely where an over-eager
 * find-and-replace strips a layout class or converts one site twice and another not at all. A total
 * of 15 is satisfiable by 15 conversions in the wrong eleven places; this map is not.
 */
const EXPECTED_CONVERSIONS: Record<string, number> = {
  "src/app/(app)/bookings/[id]/page.tsx": 3,
  "src/app/(app)/bookings/page.tsx": 2,
  "src/components/booking/book-cta.tsx": 1,
  "src/components/booking/booking-row.tsx": 1,
  "src/components/booking/expired-approval-state.tsx": 2,
  "src/components/booking/hold-expired-state.tsx": 1,
  "src/components/booking/payment-reversed-state.tsx": 1,
  "src/components/booking/reserve-actions.tsx": 1,
  "src/components/group/create-group-button.tsx": 1,
  "src/components/group/rsvp-form.tsx": 1,
  "src/components/search/search-bar.tsx": 1,
};

/** The two booker CTAs that hand-rolled a 44px height before D-22 gave it a name. */
const TOUCH_SITES = [
  "src/components/group/rsvp-form.tsx",
  "src/components/search/search-bar.tsx",
] as const;

const BRAND_VARIANT = 'variant="brand"';
const TOUCH_SIZE = 'size="touch"';

/**
 * ANY background use of the accent token, not just the one banned spelling.
 *
 * `bg-brand/90` is the form that measures 4.04 / 3.87, but `/95` and `/85` are one plausible typo
 * away and are equally broken; the bare `bg-brand` is the half that belongs in the variant. Matching
 * the token itself catches all of them, and catches a re-introduction that arrives in a
 * `data-[…]:`-scoped or `hover:`-scoped position too.
 */
const ACCENT_BACKGROUND = /[^\s"'`]*bg-brand(\/\d+)?/g;

/**
 * The same pattern WITHOUT the `g` flag, for per-line `.test()` calls.
 *
 * Not a style choice. A `/g` regex carries `lastIndex` across `.test()` calls, so reusing
 * `ACCENT_BACKGROUND` inside a `.filter()` would match line 1, resume from that offset on line 2,
 * miss it, reset, match line 3 — undercounting by roughly half and turning the pinned 9 into a
 * number that happens to be smaller. The failure would look like a successful conversion.
 */
const ACCENT_BACKGROUND_LINE = /[^\s"'`]*bg-brand(\/\d+)?/;

/**
 * THE banned recipe, named exactly, in every position it can arrive in.
 *
 * The leading `[^\s"'`]*` is what makes this catch `hover:bg-brand/90`,
 * `data-[state=on]:hover:bg-brand/90` and the bare static form the wizard's done marker carried —
 * one regex for all three, because the 4.04 / 3.87 failure does not care which prefix delivered it.
 */
const BANNED_ALPHA_HOVER = /[^\s"'`]*bg-brand\/90/g;

/**
 * Any alpha on the accent — in ANY role — other than the one that was measured.
 *
 * `/10` is a declared pairing that passes (`contrast-pairs.ts` measures foreground-on-brand@10%
 * over both background and card) and ships on the spots-left chip and the slot picker's notice.
 * Every other alpha is unmeasured, and `/85` / `/95` are one keystroke from `/90` and equally
 * broken — the same widening `button-variants.test.ts` applies inside the CVA, applied to call
 * sites. Deliberately narrower than a blanket alpha ban, which would delete a shipped soft accent.
 *
 * THE ROLE PREFIX IS NOW A SET, NOT JUST `bg-` (CR-01/CR-03). This pattern read `bg-brand/…`, so it
 * policed the FILL and nothing else — and the phase's own argument is about compositing, which is
 * indifferent to which property carries the alpha. Three shapes walked straight through the old
 * form and all three shipped:
 *
 *   • `text-brand-foreground/80` — the slot picker's "N of M free" sub-label, painted on the coral
 *     fill set ten lines above it, measuring 3.38:1 (court) / 3.51:1 (grove) against a 4.5 bar.
 *     An alpha tint over a light surface lightens, so diluting the INK drags it toward the fill
 *     exactly as diluting the fill drags it toward the ink. Same arithmetic, opposite operand.
 *   • `ring-brand/50` — the pending-start anchor, 2.23:1 / 2.03:1 against a 3:1 bar.
 *   • `border-brand/30` — recorded as a shipping composite by IN-05 and equally unmeasured.
 *
 * `brand-foreground` is matched as well as `brand` because the token name is a prefix of it; the
 * alternation is ordered longest-first so the longer name wins the match.
 */
const UNMEASURED_ACCENT_ALPHA =
  /[^\s"'`]*(?:bg|text|ring|border|from|via|to|fill|stroke|shadow|outline|decoration|divide|accent|caret|placeholder)-(?:brand-foreground|brand)\/(?!10(?![\d.]))\d+/g;

/**
 * The one diluted accent that is NOT ink and NOT an indicator — the chip's ornamental edge.
 *
 * Measured, because an exemption without a number is just an opinion: the 30% coral composites to
 * `#f4c0c2` (court) / `#b3d7d6` (grove) and measures 1.60:1 / 1.49:1 against the page. It is legal
 * anyway, for the same reason `contrast-pairs.ts` carries `--border` and `--input` in
 * `EXCLUDED_PAIRS`: it is never the sole boundary and never an indicator. Both call sites — the
 * spots-left chip and the slot picker's gap notice — draw it around a FILLED surface whose tint is
 * what actually bounds the shape, carry their words as `text-foreground` on that tint (a declared,
 * measured row), and put the meaning in a SOLID `text-brand` icon beside them. Deleting the edge
 * would change how the chip looks and improve nothing anyone can read.
 *
 * NOTE WHY THIS LIVES HERE AND NOT IN `EXCLUDED_PAIRS`. That inventory is keyed on `fg`+`bg` with
 * no alpha in the key, and `brand on background` is already a measured row — so the exemption
 * cannot be stated there without colliding with the row it is not talking about. That is the same
 * alpha-blind-key defect WR-05 records in `pair-drift.ts`, met from the other side.
 *
 * BARE FORM ONLY, exactly as with the ring hairline in `focus-recipe.test.ts`: a variant chain
 * means the edge appears in response to a state, and a state edge is an indicator.
 */
const DECORATIVE_ACCENT_EDGE = new Set(["border-brand/30"]);

/** A hand-rolled 44px height class, as a whole token — `min-h-11` and `h-110` must not match. */
const BARE_TOUCH_HEIGHT = /(^|[\s"'`:])h-11(?![\d.])/;

type Violation = string;

/**
 * Collect every `.ts`/`.tsx` file under a directory, recursively.
 *
 * Copied from `tests/design/focus-recipe.test.ts:69` (plan 10-07), which is this phase's reference
 * walker. `.css` is not collected here: unlike the focus ring, the accent recipe never lived in the
 * stylesheet — `globals.css` declares `--brand` as a token and never composes a `bg-brand` utility.
 */
function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * WINDOWS PATH NORMALISATION — copied verbatim from `tests/design/focus-recipe.test.ts:90`, which
 * took it from `tests/use-server-exports.test.ts:302`. Load-bearing, not cosmetic: on this box
 * `path.relative` emits backslash separators, while every scope decision in this file is a
 * FORWARD-SLASH path-prefix comparison. Without this line `SCOPED_TREES` matches nothing, the
 * violation lists come back empty, the per-file map comes back empty — and every assertion below
 * passes vacuously. That is exactly what the guard-the-guard block exists to catch.
 */
function label(file: string): string {
  return relative(process.cwd(), file).split("\\").join("/");
}

/**
 * Extract the opening `<Button …>` tag that encloses a given index.
 *
 * Written properly rather than as a "read to the next `>`", because one of the converted call sites
 * carries `onClick={form.handleSubmit((v) => onSubmit(v, "yes"))}` — an arrow function whose `>`
 * sits inside the props. Brace depth and quote state are tracked so the tag ends at the real `>`.
 *
 * This is what lets the touch assertions be made PER ELEMENT instead of per file. That distinction
 * is the whole point here: both of these files legitimately keep other 44px height classes on
 * `<Input>` and `<SelectTrigger>` primitives, which have no `touch` size to opt into, so a
 * file-level "contains no h-11" assertion would be asserting something untrue and unrelated.
 */
function enclosingButtonTag(text: string, index: number): string {
  const start = text.lastIndexOf("<Button", index);
  if (start === -1) return "";

  let depth = 0;
  let quote: string | null = null;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0) return text.slice(start, i + 1);
  }
  return text.slice(start);
}

interface Scan {
  /** Normalised forward-slash paths of every file the walker visited. */
  scanned: string[];
  /** Files inside the four trees plan 10-08 owns. */
  inScope: string[];
  /** `variant="brand"` occurrences, per in-scope file that has any. */
  conversions: Record<string, number>;
  /** Every background use of the accent token inside the four trees, as `file: matched-text`. */
  accentBackgrounds: Violation[];
  /** Raw text of every scanned file, keyed by normalised path. */
  text: Map<string, string>;

  // ---- Repo-wide, added by plan 10-09 -------------------------------------------------------
  /** `variant="brand"` occurrences per file across `ADOPTION_TREES` — the total must be 20. */
  adoption: Record<string, number>;
  /** LINES containing the accent background, per file, outside the CVA tree — the 9 survivors. */
  survivingAccentLines: Record<string, number>;
  /** Every occurrence of the banned alpha under `src/`, as `file: matched-text`. Must be empty. */
  bannedAlphaHovers: Violation[];
  /** Every unmeasured alpha on the accent background under `src/`. Must be empty. */
  unmeasuredAlphas: Violation[];
  /** Occurrences of the sanctioned darkening hover per file under the availability tree. */
  availabilityHovers: Record<string, number>;
}

/** Scanned ONCE at module level; every `it()` below only asserts against this result. */
function scanSrc(): Scan {
  const scan: Scan = {
    scanned: [],
    inScope: [],
    conversions: {},
    accentBackgrounds: [],
    text: new Map(),
    adoption: {},
    survivingAccentLines: {},
    bannedAlphaHovers: [],
    unmeasuredAlphas: [],
    availabilityHovers: {},
  };

  for (const file of collectSourceFiles(SRC_DIR)) {
    const name = label(file);
    const text = readFileSync(file, "utf8");
    scan.scanned.push(name);
    scan.text.set(name, text);

    // --- Repo-wide, over EVERY file under `src/` ------------------------------------------
    // The alpha bans are unscoped on purpose: the 4.04 / 3.87 failure is a property of the tint,
    // so there is no tree where the recipe is acceptable. `tests/` is outside this walker's root,
    // which is why this file may name the banned literals verbatim and `src/` may not.
    for (const m of text.matchAll(BANNED_ALPHA_HOVER)) {
      scan.bannedAlphaHovers.push(`${name}: ${m[0]}`);
    }
    for (const m of text.matchAll(UNMEASURED_ACCENT_ALPHA)) {
      // `m[0]` carries any variant chain, so a state-scoped edge can never equal the bare key.
      if (DECORATIVE_ACCENT_EDGE.has(m[0])) continue;
      scan.unmeasuredAlphas.push(`${name}: ${m[0]}`);
    }

    if (name.startsWith(AVAILABILITY_TREE)) {
      const hovers = text.split(SANCTIONED_HOVER).length - 1;
      if (hovers > 0) scan.availabilityHovers[name] = hovers;
    }

    if (ADOPTION_TREES.some((tree) => name.startsWith(tree))) {
      const adopted = text.split(BRAND_VARIANT).length - 1;
      if (adopted > 0) scan.adoption[name] = adopted;

      // LINES, not matches: a single className legitimately carries the token once, and the
      // 29 / 20 / 9 split is stated in the UI-SPEC in source lines. Counting matches instead
      // would make the pinned 9 drift the first time a recipe gained a second scoped prefix.
      if (!name.startsWith(CVA_TREE)) {
        const lines = text.split("\n").filter((l) => ACCENT_BACKGROUND_LINE.test(l)).length;
        if (lines > 0) scan.survivingAccentLines[name] = lines;
      }
    }

    // --- The four trees plan 10-08 owns ----------------------------------------------------
    if (!SCOPED_TREES.some((tree) => name.startsWith(tree))) continue;
    scan.inScope.push(name);

    const count = text.split(BRAND_VARIANT).length - 1;
    if (count > 0) scan.conversions[name] = count;

    for (const m of text.matchAll(ACCENT_BACKGROUND)) {
      scan.accentBackgrounds.push(`${name}: ${m[0]}`);
    }
  }

  return scan;
}

const scan = scanSrc();

describe("DS-08 — the scan itself reaches what it claims to police", () => {
  // GUARD-THE-GUARD. Every violation assertion below is an empty-list or a count assertion, and a
  // scanner that visited zero in-scope files satisfies the empty lists perfectly. A moved directory,
  // a `process.cwd()` that is not the repo root, or a backslash creeping back into the path
  // comparison would each turn this file green and blind in the same stroke.
  it("visits the whole source tree, not a fraction of it", () => {
    expect(scan.scanned.length).toBeGreaterThan(200);
  });

  it("reaches a converted file — the positive control for the whole map", () => {
    // Not merely "was visited": the walker must have read a file that actually carries the variant,
    // which is the only way to distinguish a real clean tree from an empty scan.
    expect(scan.scanned).toContain("src/components/booking/book-cta.tsx");
    expect(scan.text.get("src/components/booking/book-cta.tsx")).toContain(BRAND_VARIANT);
  });

  it("reaches all four of the trees this plan owns", () => {
    for (const tree of SCOPED_TREES) {
      expect(scan.inScope.filter((f) => f.startsWith(tree)).length).toBeGreaterThan(0);
    }
  });
});

describe("DS-08 — the accent reaches the booker through the variant, never through a string", () => {
  it("converts exactly 15 call sites across the booking, group and search trees", () => {
    const total = Object.values(scan.conversions).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(15);
  });

  it("converts exactly the right sites — the per-file map, not just the total", () => {
    expect(scan.conversions).toEqual(EXPECTED_CONVERSIONS);
  });

  it("leaves no bg-brand in any form, because hover:bg-brand/90 measures 4.04:1 in court and 3.87:1 in grove against a 4.5 bar", () => {
    // The failure is a property of the alpha, not of any one element: a tint over a light surface
    // LIGHTENS, moving a filled control toward its own text colour. The sanctioned hover darkens
    // with a color-mix (5.41 / 5.36) and lives once, inside the variant in `ui/button.tsx`.
    expect(scan.accentBackgrounds).toEqual([]);
  });
});

describe("DS-09 / D-22 — the two 44px CTAs say so by name", () => {
  it("names the touch size on both sites that hand-rolled the height", () => {
    for (const site of TOUCH_SITES) {
      const text = scan.text.get(site);
      expect(text, `${site} was not scanned`).toBeDefined();
      expect(text!.split(TOUCH_SIZE).length - 1, `${site} should opt into the touch size once`).toBe(
        1
      );
    }
  });

  it("puts the touch size on the brand element itself, with no hand-rolled height beside it", () => {
    // PER ELEMENT, not per file, and the distinction is load-bearing. Both files keep other 44px
    // height classes on `<Input>` and `<SelectTrigger>` primitives, which expose no size variant to
    // opt into; a file-level assertion would be policing controls this contract does not reach.
    const offenders: Violation[] = [];

    for (const site of TOUCH_SITES) {
      const text = scan.text.get(site)!;
      const tag = enclosingButtonTag(text, text.indexOf(BRAND_VARIANT));

      if (!tag.includes(TOUCH_SIZE)) offenders.push(`${site}: brand element is missing the size`);
      if (BARE_TOUCH_HEIGHT.test(tag)) offenders.push(`${site}: brand element hand-rolls its height`);
    }

    expect(offenders).toEqual([]);
  });
});

// =============================================================================================
// PLAN 10-09 — the repo-wide half, which is what closes DS-08.
// =============================================================================================

describe("DS-08 — the repo-wide scan reaches the trees it now claims to police", () => {
  // GUARD-THE-GUARD, restated for the wider scope. The blocks below are dominated by empty-list
  // and exact-map assertions, every one of which a scanner that read nothing satisfies perfectly.
  it("visits more than 200 source files", () => {
    expect(scan.scanned.length).toBeGreaterThan(200);
  });

  it("reaches the slot picker — the file T-10-26 says must never be converted", () => {
    // The positive control for the non-conversion half: a walker that cannot see this file cannot
    // notice it being converted either, and the "exactly 9" assertion would go green on a broken
    // availability surface.
    expect(scan.scanned).toContain("src/components/availability/slot-picker.tsx");
    expect(scan.survivingAccentLines["src/components/availability/slot-picker.tsx"]).toBe(3);
  });

  it("reaches the CVA and still excludes it from the 9, which is the scope rule working", () => {
    // `ui/button.tsx` DOES carry the accent background — it is the declaration. If it were merely
    // unscanned, the exclusion below would be indistinguishable from a walker that never got here.
    expect(scan.scanned).toContain("src/components/ui/button.tsx");
    expect(scan.text.get("src/components/ui/button.tsx")).toMatch(ACCENT_BACKGROUND_LINE);
    expect(Object.keys(scan.survivingAccentLines)).not.toContain("src/components/ui/button.tsx");
  });
});

describe("DS-08 / D-21 — coral appears on exactly the 20 buttons someone asked for it", () => {
  it("adopts the brand variant at exactly 20 call sites across src/app and src/components", () => {
    // 15 from plan 10-08 (bookings, booking, group, search) + 5 from plan 10-09 (the host surface).
    // The per-tree maps above and the surviving map below are what stop this total being satisfied
    // by 20 conversions in the wrong twenty places.
    const total = Object.values(scan.adoption).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(20);
  });

  it("lands the 5 host conversions on the host surface, not somewhere convenient", () => {
    const host = Object.entries(scan.adoption)
      .filter(([file]) => file.startsWith("src/app/(host)/"))
      .reduce((sum, [, n]) => sum + n, 0);
    expect(host).toBe(5);
  });
});

describe("DS-08 / T-10-26 — the 9 non-Button recipes are a RECORDED deliberate non-conversion, not an oversight, and an over-eager future sweep must go red here", () => {
  it("keeps exactly the 9 accent lines, in exactly the 6 files that are allowed to have them", () => {
    // Read this as a contract, not as a count. Each of these lines is a react-day-picker DayButton,
    // a Radix ToggleGroupItem, a bare <button>, a <Badge>, an unread dot or an <ol> step marker —
    // none of them a <Button> with a variant prop. Converting any of them breaks the availability
    // calendar or the slot picker, the two surfaces the core booking value runs through.
    //
    // If this assertion fails, the question is not "how do I make the number match". It is which
    // of the two happened: a survivor was converted (the calendar or picker is now broken), or a
    // NEW literal recipe was added (it belongs on the variant instead).
    expect(scan.survivingAccentLines).toEqual(EXPECTED_SURVIVING_ACCENT_LINES);
  });

  it("counts 9 in total, matching the 29 / 20 / 9 split the UI-SPEC states", () => {
    const total = Object.values(scan.survivingAccentLines).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(9);
    expect(Object.keys(scan.survivingAccentLines)).toHaveLength(6);
  });
});

describe("DS-08 / T-10-25 — the 90%-alpha accent is gone from src/ in EVERY form, because it measures 4.04:1 in court and 3.87:1 in grove against a 4.5 bar", () => {
  it("finds it nowhere — not hover-prefixed, not variant-prefixed, not static", () => {
    // The failure is a property of the tint, not of the <Button> element: alpha over a LIGHT
    // surface lightens, dragging a filled control toward its own text colour. So it is banned on
    // the four availability hovers and on the wizard's static done marker too, not just on buttons.
    expect(scan.bannedAlphaHovers).toEqual([]);
  });

  it("allows only the one alpha that was actually measured — the /10 soft accent", () => {
    // Widened past the single banned spelling on purpose: `/85` and `/95` are one keystroke away
    // and equally broken. Narrowed to exempt `/10`, which contrast-pairs.ts measures over both
    // background and card and which ships on the spots-left chip and the slot picker's notice.
    expect(scan.unmeasuredAlphas).toEqual([]);
  });

  it("catches a diluted accent in ANY role, not just the fill (CR-03)", () => {
    // POSITIVE CONTROL, and the reason this assertion is not the one it used to be. The pattern
    // read `bg-brand/…` and so policed the FILL alone, while the phase's whole argument is about
    // COMPOSITING — which does not care which property carries the alpha. All three shapes below
    // were shipping and all three were invisible: the first is CR-03's sub-label on the coral fill
    // at 3.38:1, the second the slot picker's anchor ring at 2.23:1, the third IN-05's border.
    for (const shape of [
      'isSelected ? "text-brand-foreground/80" : "text-muted-foreground"',
      'className="border-brand ring-2 ring-brand/50"',
      'className="hover:border-brand/30"',
      'className="hover:bg-brand/90"',
    ]) {
      expect([...shape.matchAll(UNMEASURED_ACCENT_ALPHA)], shape).not.toEqual([]);
    }

    // …and must still let the measured tint and every solid form through, or it deletes a shipped
    // affordance instead of a failing one.
    for (const legal of [
      'className="bg-brand/10 text-foreground"',
      'className="text-brand-foreground"',
      'className="ring-2 ring-brand"',
      'className="bg-brand text-brand-foreground"',
    ]) {
      expect([...legal.matchAll(UNMEASURED_ACCENT_ALPHA)], legal).toEqual([]);
    }
  });

  it("exempts the BARE decorative chip edge and nothing wearing a variant", () => {
    // Asserted in both directions, for the same reason as the ring hairline: an exemption is the
    // one place a widened gate can be quietly re-narrowed into uselessness.
    expect(DECORATIVE_ACCENT_EDGE.has("border-brand/30")).toBe(true);
    expect(DECORATIVE_ACCENT_EDGE.has("hover:border-brand/30")).toBe(false);

    // …and it must still describe something the tree actually renders. If the chip edge is ever
    // redrawn, DELETE the entry rather than leaving it standing open.
    const chip = scan.text.get("src/components/availability/spots-left-chip.tsx") ?? "";
    expect(chip).toContain("border-brand/30");
  });

  it("replaced the four availability hovers rather than deleting them", () => {
    // The failure mode this catches: a migration that removed the failing hover and stopped there
    // would satisfy both assertions above perfectly while silently dropping the hover affordance
    // from a selected day. The per-file map names which file lost it.
    expect(scan.availabilityHovers).toEqual(EXPECTED_AVAILABILITY_HOVERS);

    const total = Object.values(scan.availabilityHovers).reduce((sum, n) => sum + n, 0);
    expect(total).toBeGreaterThanOrEqual(4);
  });
});
