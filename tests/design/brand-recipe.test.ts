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
// SCOPE — deliberately partial, and it says so. This file polices the four trees plan 10-08 owns:
// `src/app/(app)/bookings/**`, `src/components/booking/**`, `src/components/group/**` and
// `src/components/search/**`. Plan 10-09 extends the SAME file with the host tree, the availability
// tree and the repo-wide totals. A partial gate that names its own boundary is honest; one that
// implies whole-tree coverage it does not have is worse than none.
//
// WHAT IS DELIBERATELY *NOT* CONVERTED, AND MUST NOT BE. Of the 29 source lines carrying the accent
// as a background, 20 are on a `<Button>` and **9 are not**: the availability calendar's selected
// day, the date-pass picker's selected day, the slot picker's selected chip / full-day chip / notice
// panel, the spots-left chip, the notification dot, and the listing wizard's two step markers. Those
// are `data-[selected-single=true]:`- and `data-[state=on]:`-scoped recipes on Radix and
// react-day-picker primitives, not buttons with a variant prop. Turning them into `variant="brand"`
// would break the availability calendar and the slot picker — the two surfaces the whole booking
// flow is built around. This file asserts nothing about them on purpose.
//
// OBSERVED RED, NOT ASSUMED (both observations recorded per the plan's acceptance criteria):
//   • The literal recipe reinstated on `src/components/group/create-group-button.tsx` (the colour
//     classes added back to its `className`, `variant="brand"` removed) → this file exits NON-ZERO:
//     **3 failed / 5 passed**, on exactly the three assertions that should care — the adoption
//     total (14, not 15), the per-file map (`create-group-button.tsx` 0, not 1), and the
//     banned-hover scan (which reports the offending file and matched text). Nothing else moved.
//   • Reverted → exits 0 with **8 passed**.
//
// THE LITERALS THIS FILE BANS APPEAR IN THIS FILE, VERBATIM AND ON PURPOSE. `tests/` is outside the
// scanned tree (the walker below roots at `src/`), so a file whose job is to ban a string is allowed
// to name it. Inside `src/`, the same reasoning has to be written descriptively instead — that is
// the standing resolution for this phase's recurring grep-versus-comment collision, and the reason
// the comments added next to the two converted 44px CTAs describe their height rather than quote it.
//
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file:
//   • PIXELS. This proves a prop is present, not that a browser paints coral. `cn()`/tailwind-merge
//     precedence at the call site, a later layer overriding the fill, and the actual rendered
//     contrast are all invisible here. Phase 11's visual pass and Phase 17's a11y audit see pixels.
//   • THE ACCENT BUDGET. Nothing here counts how MUCH coral a screen shows. `variant="brand"` on
//     every button in the app would pass every assertion below while destroying the 10% budget
//     D-21 exists to protect. `button-variants.test.ts` guards the half of that which is mechanical
//     (the default variant must stay neutral); the rest is a design judgement, not a scan.
//   • THE NINE NON-BUTTON RECIPES, per the scope note above.
//   • WHETHER `--brand` IS THE RIGHT COLOUR. That is `contrast.test.ts`'s job.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join, relative } from "node:path";

const SRC_DIR = resolve(process.cwd(), "src");

/** The four trees plan 10-08 converts. Plan 10-09 adds the host and availability trees here. */
const SCOPED_TREES = [
  "src/app/(app)/bookings/",
  "src/components/booking/",
  "src/components/group/",
  "src/components/search/",
] as const;

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
  /** Files inside the four trees this plan owns. */
  inScope: string[];
  /** `variant="brand"` occurrences, per in-scope file that has any. */
  conversions: Record<string, number>;
  /** Every background use of the accent token inside the four trees, as `file: matched-text`. */
  accentBackgrounds: Violation[];
  /** Raw text of every scanned file, keyed by normalised path. */
  text: Map<string, string>;
}

/** Scanned ONCE at module level; every `it()` below only asserts against this result. */
function scanSrc(): Scan {
  const scan: Scan = {
    scanned: [],
    inScope: [],
    conversions: {},
    accentBackgrounds: [],
    text: new Map(),
  };

  for (const file of collectSourceFiles(SRC_DIR)) {
    const name = label(file);
    const text = readFileSync(file, "utf8");
    scan.scanned.push(name);
    scan.text.set(name, text);

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
