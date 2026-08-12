// DS-05 — the focus indicator is solid, and its offset band is a token rather than a framework
// default. This is the file that keeps both true.
//
// WHY A SOURCE SCAN AND NOT A TOKEN TEST (T-10-20, the whole point).
//
// `--ring` was darkened in plan 10-03 and measures 7.46:1 (court) / 7.11:1 (grove) against
// `--background`. A token-pair contrast test therefore passes — brilliantly — while every focusable
// control in the app still renders its ring at **2.32:1**, because the ring class carried a 50%
// alpha modifier and the alpha is applied to the token, not by it. `ring-ring/50` compiles to
// `color-mix(in oklab, var(--ring) 50%, transparent)`; composited over white, a `#555555` ring
// measures 2.32:1 against a 3:1 non-text bar.
//
// THIS IS ARITHMETIC, NOT PREFERENCE. The lightest neutral that reaches 3:1 through a 50% mix is
// ≈ `oklch(0.2825 0 0)`, and even that fails against `--muted` (2.93:1). **No value of `--ring` can
// fix the alpha form.** So the only honest gate is one that reads the SOURCE and proves the alpha
// is absent — which is what the four violation scans below do.
//
// OBSERVED RED, NOT ASSUMED (recorded per the plan's acceptance criteria):
//   • `focus-visible:ring-ring/50` reinstated in `src/components/ui/input.tsx` → this file exits
//     NON-ZERO: **3 failed / 6 passed**, on exactly the three assertions that should care — "no
//     half-alpha ring colour survives anywhere under src/", "no alpha modifier survives on any
//     focus-scoped ring colour (D-2 widening)", and "every focus ring declaration is paired with
//     its offset colour". The other six stayed green, which is the correct blast radius.
//   • Reverted → exits 0 with **9 passed**.
// The negative is therefore not vacuous, which matters here more than usual: the string it bans is
// the shadcn default, so every future `npx shadcn add` re-introduces it by hand-me-down.
//
// WHAT IS SCANNED. Every `.ts`, `.tsx` AND `.css` file under `src/`. The `.css` leg is load-bearing
// rather than decorative: `src/app/globals.css` was the site of the stylesheet's own half-alpha
// outline colour (removed in plan 10-04), and a walker that collected only TypeScript would report
// a clean tree while the stylesheet still shipped it.
//
// THE VENDORED TREE IS INSIDE THE GATE, WITH NO EXEMPTION (D-17). 13 of the 15 sites this phase
// fixed live in `src/components/ui/**`. Exempting that directory — the obvious "it's upstream's
// code" move — would have excused 13 of 15 and left the requirement closed on paper.
//
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file:
//   • PIXELS. This proves the class names are right. It does not prove a browser paints a visible
//     ring: `cn()`/tailwind-merge precedence at a call site, an `outline-none` in a later layer, or
//     an ancestor `overflow-hidden` clipping the offset band are all invisible here. Phase 11's
//     GATE-01 pass and Phase 17's a11y audit see real pixels.
//   • `focus-visible:after:ring-*` recipes (2 sites: `booking-row.tsx`, `host-booking-row.tsx`)
//     draw a solid ring on a pseudo-element and set NO offset width. They are deliberately not
//     required to carry an offset colour — with no offset width there is no band to colour, so
//     there is nothing to leak. Their ring is solid and sits on `--card` (7.46 / 7.36).
//   • An UNPREFIXED `ring-offset-<width>` class. The leak scan only matches variant-prefixed
//     tokens, because an unprefixed `ring-offset-2` also appears in PROSE (a note in
//     `src/lib/design/contrast-pairs.ts`) and a scan that flagged it would be crying wolf at the
//     one file whose job is documenting this very ratio.
//   • Whether `--ring` is the RIGHT colour. That is `contrast.test.ts`'s job; this file only cares
//     that whatever `--ring` is arrives at the screen undiluted.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import ts from "typescript";

const SRC_DIR = resolve(process.cwd(), "src");

/** A single violation, rendered as one readable `file:snippet` line for the failure diff. */
type Violation = string;

/**
 * Collect every `.ts`/`.tsx`/`.css` file under a directory, recursively.
 *
 * This walker is the one the other source-scan gates in this phase copy from; it is written plainly
 * on purpose. It is modelled on `tests/use-server-exports.test.ts:114`, which walks the same tree
 * for a different property.
 */
function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, out);
    } else if (/\.(tsx?|css)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * WINDOWS PATH NORMALISATION — copied verbatim from `tests/use-server-exports.test.ts:302`, and
 * load-bearing rather than cosmetic. On this box `path.relative` emits backslash separators
 * (`src\components\ui\button.tsx`), while every scope decision and every expectation in this phase
 * is written as a FORWARD-SLASH path-prefix comparison. Without this line the guard-the-guard
 * assertions below silently stop matching and the whole file passes vacuously — which is precisely
 * the failure mode it exists to prevent.
 */
function label(file: string): string {
  return relative(process.cwd(), file).split("\\").join("/");
}

/** The one app-wide recipe, defined in `src/components/ui/button.tsx` by plan 10-06. */
const CANONICAL_RECIPE =
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** The shadcn default this phase exists to delete, and the stylesheet's outline twin. */
const HALF_ALPHA_RING = "ring-ring/50";
const HALF_ALPHA_OUTLINE = "outline-ring/50";

/**
 * ANY ring COLOUR carrying an alpha modifier — the D-2 widening, re-widened by CR-01.
 *
 * The literal scans above catch the shadcn default by name. They do not catch a variant that
 * overrides the base recipe with a DIFFERENT colour at a DIFFERENT alpha, which is exactly what
 * `button.tsx` and `badge.tsx` were doing (deferred item D-2, absorbed by plan 10-07): same defect
 * class, worse alpha, invisible to a scan written against the base string.
 *
 * THE `focus` ANCHOR IS GONE, AND ITS ABSENCE IS THE POINT (CR-01). This pattern used to read
 * `[^\s"'`]*focus[^\s"'`]*:ring-…`, scoping itself to variants whose name contains "focus". The
 * file's ARGUMENT, however, is arithmetic — no value of `--ring` can rescue a diluted ring — and
 * that argument does not care which variant carries the dilution. The gap was live, not
 * theoretical: `aria-invalid:ring-destructive/20` shipped on ten primitives and won over
 * `focus-visible:ring-ring` on source order alone (both flatten to specificity (0,2,0), and the
 * state rule is emitted later), so a focused invalid control painted its focus indicator at 1.44:1
 * against a 3:1 bar — with `outline-none` removing the fallback. A scan anchored on the word
 * `focus` could not see it, one line above the comment documenting the identical miss-mode.
 *
 * So the anchor is now the RING ITSELF, and the variant chain is optional. That reaches three
 * shapes the old pattern could not: a state variant (`aria-invalid:`, `data-*`, `group-*`), a
 * bare unprefixed ring (`ring-brand/50`, which shipped on the slot picker's pending-start anchor
 * at 2.23:1), and a hover ring.
 *
 * The token run is bounded by whitespace and quote characters so a match can never span two class
 * names. `ring-0`, `ring-2` and `ring-3` cannot match: the colour segment must start with a letter.
 */
const ALPHA_RING_COLOUR = /(?:([^\s"'`]*:))?ring-[a-z][a-z0-9-]*\/\d+/g;

/**
 * The one diluted ring that is NOT an indicator — the decorative hairline, exempted as DATA.
 *
 * `ring-1 ring-foreground/10` is this codebase's card/overlay EDGE: the 1px hairline on `card`,
 * `dialog`, `popover`, `dropdown-menu`, `select` content and the map panel. It is a border drawn
 * with a ring so it can sit outside the padding box, and it is the exact same category as
 * `--border` / `--input`, which `contrast-pairs.ts` already carries in `EXCLUDED_PAIRS` with the
 * reason "decorative divider — never a control's sole visible boundary or its sole focus
 * indicator". Banning it would not make anything more accessible; it would delete the surface
 * treatment and teach the next author that this gate cries wolf.
 *
 * THE EXEMPTION IS DELIBERATELY NARROWER THAN THE IDIOM: only the BARE form is exempt. A variant
 * chain means the ring appears in response to a STATE — focus, hover, invalid, selection — and a
 * state ring is an indicator by definition, whatever colour it borrows. So `ring-foreground/10`
 * passes and `focus-visible:ring-foreground/10` is still a violation, which is what keeps this
 * from becoming the hole CR-01 just closed.
 */
const DECORATIVE_HAIRLINE = new Set(["ring-foreground/10"]);

/**
 * Every string literal in a `.ts`/`.tsx` file, with its line number.
 *
 * WHY THIS EXISTS — the pairing checks below are about ONE ELEMENT (WR-02). Both of them used to
 * ask `text.includes(…)` over the whole FILE, which answers a different and much weaker question:
 * whether the file contains a correct recipe ANYWHERE. Every one of the eleven vendored primitives
 * already does, so any of them could gain a second focusable element carrying an offset WIDTH with
 * no offset COLOUR — shipping Tailwind's hardcoded white band, visibly wrong on grove's tinted
 * background — and this file would stay green while one element vouched for the other. That is
 * exactly the leak `search-result-card.tsx` was fixed for, and the fix would not have been detected
 * by the gate that motivated it.
 *
 * A class string is the smallest unit that reliably belongs to a single element, so the checks now
 * run per literal. The walker is `pair-drift.test.ts:351`'s, which chose the same unit for the same
 * reason; template SPANS are visited individually, so an interpolation splits the literal rather
 * than joining two elements' classes into one chunk.
 */
function classChunks(path: string, text: string): { chunk: string; line: number }[] {
  const sf = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const out: { chunk: string; line: number }[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      out.push({
        chunk: node.text,
        line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/**
 * A variant-prefixed ring-offset WIDTH, capturing its prefix.
 *
 * Tailwind's `--tw-ring-offset-color` defaults to a literal white. Setting a width without a colour
 * therefore paints a hardcoded `#fff` band — a raw colour reaching the screen from a framework
 * default instead of a token, which is a leak in all but name and visibly wrong on grove's tinted
 * background. Capturing the prefix lets the pairing be checked per-variant rather than per-file, so
 * a file that colours ONE variant's offset cannot vouch for another's.
 */
const PREFIXED_OFFSET_WIDTH = /([^\s"'`]*:)ring-offset-\d+/g;

interface Scan {
  /** Normalised forward-slash paths of every file the walker visited. */
  scanned: string[];
  /** Files carrying the shadcn half-alpha ring colour. */
  halfAlphaRing: Violation[];
  /** Files carrying the stylesheet's half-alpha outline colour. */
  halfAlphaOutline: Violation[];
  /** Files carrying ANY alpha modifier on ANY ring colour (the D-2 widening, re-widened by CR-01). */
  alphaRingColour: Violation[];
  /** Offset widths whose matching offset colour is missing at the same variant prefix. */
  uncolouredOffset: Violation[];
  /** Files declaring the canonical focus ring colour without the canonical offset colour. */
  unpairedRecipe: Violation[];
  /** Raw text of every scanned file, keyed by normalised path — for the anchor assertions. */
  text: Map<string, string>;
}

/** Scanned ONCE at module level; every `it()` below only asserts against this result. */
function scanSrc(): Scan {
  const scan: Scan = {
    scanned: [],
    halfAlphaRing: [],
    halfAlphaOutline: [],
    alphaRingColour: [],
    uncolouredOffset: [],
    unpairedRecipe: [],
    text: new Map(),
  };

  for (const file of collectSourceFiles(SRC_DIR)) {
    const name = label(file);
    const text = readFileSync(file, "utf8");
    scan.scanned.push(name);
    scan.text.set(name, text);

    if (text.includes(HALF_ALPHA_RING)) scan.halfAlphaRing.push(name);
    if (text.includes(HALF_ALPHA_OUTLINE)) scan.halfAlphaOutline.push(name);

    for (const m of text.matchAll(ALPHA_RING_COLOUR)) {
      // `m[1]` is the variant chain, `undefined` when the utility is bare. Only a bare hairline
      // is exempt — see DECORATIVE_HAIRLINE.
      if (m[1] === undefined && DECORATIVE_HAIRLINE.has(m[0])) continue;
      scan.alphaRingColour.push(`${name}: ${m[0]}`);
    }

    // PER CLASS STRING, never per file (WR-02). `.css` has no string literals to walk, and the
    // stylesheet composes no focus recipe of its own — it declares the tokens the recipe names —
    // so the pairing checks simply do not apply to it.
    if (!name.endsWith(".css")) {
      for (const { chunk, line } of classChunks(name, text)) {
        for (const m of chunk.matchAll(PREFIXED_OFFSET_WIDTH)) {
          const prefix = m[1];
          if (!chunk.includes(`${prefix}ring-offset-background`)) {
            scan.uncolouredOffset.push(
              `${name}:${line}: ${m[0]} without ${prefix}ring-offset-background`,
            );
          }
        }

        if (
          chunk.includes("focus-visible:ring-ring") &&
          !chunk.includes("focus-visible:ring-offset-background")
        ) {
          scan.unpairedRecipe.push(`${name}:${line}`);
        }
      }
    }
  }

  return scan;
}

const scan = scanSrc();

describe("DS-05 — the scan itself reaches what it claims to police", () => {
  // GUARD-THE-GUARD. An empty-violations assertion passes just as happily against a scanner that
  // visited zero files, and every assertion in this file is an empty-violations assertion. A moved
  // directory, a `process.cwd()` that is not the repo root, or a backslash creeping back into the
  // path comparison would all turn this file green and blind in the same stroke.
  it("visits the whole source tree, not a fraction of it", () => {
    expect(scan.scanned.length).toBeGreaterThan(200);
  });

  it("reaches a vendored component — the tree carrying 13 of the 15 fixed sites", () => {
    expect(scan.scanned).toContain("src/components/ui/button.tsx");
    expect(scan.scanned).toContain("src/components/ui/input.tsx");
  });

  it("reaches the stylesheet, which is why .css is in the walk at all", () => {
    // `globals.css` held the half-alpha OUTLINE colour (the site plan 10-04 removed). A walker
    // collecting only .ts/.tsx would report a clean tree with the stylesheet still shipping it.
    expect(scan.scanned).toContain("src/app/globals.css");
    expect(scan.scanned.filter((f) => f.endsWith(".css")).length).toBeGreaterThan(0);
  });
});

describe("DS-05 — no focus indicator relies on a diluted colour", () => {
  it("no half-alpha ring colour survives anywhere under src/", () => {
    expect(scan.halfAlphaRing).toEqual([]);
  });

  it("no half-alpha outline colour survives anywhere under src/, including the stylesheet", () => {
    expect(scan.halfAlphaOutline).toEqual([]);
  });

  it("no alpha modifier survives on ANY ring colour, focus-scoped or not (D-2 + CR-01)", () => {
    // Wider than the literal on purpose: `ring-destructive/20` is the same defect at a worse alpha,
    // and a scan written against the base string closes green while it still ships. Wider than
    // "focus" on purpose too — see ALPHA_RING_COLOUR. A ring that is diluted while the element is
    // in a STATE is diluted while it is focused IN that state, which is the moment it is load-bearing.
    expect(scan.alphaRingColour).toEqual([]);
  });

  it("the widened scan actually fires on the two shapes the `focus` anchor could not see", () => {
    // POSITIVE CONTROL. Every assertion above is an empty-violations assertion, and the widening
    // this test defends is a DELETION from a regex — the single easiest edit to make silently
    // ineffective. These two strings are the exact shapes CR-01 found shipping: a state-scoped ring
    // (ten primitives) and a bare unprefixed one (the slot picker). Neither matches the old pattern.
    const stateScoped = 'className="aria-invalid:ring-3 aria-invalid:ring-destructive/20"';
    const bare = 'className="border-brand ring-2 ring-brand/50"';
    for (const shape of [stateScoped, bare]) {
      expect([...shape.matchAll(ALPHA_RING_COLOUR)], shape).not.toEqual([]);
    }
    // …and the widening must not swallow the legal shapes: a width, or a solid token colour.
    for (const legal of ["ring-2", "ring-3", "ring-0", "ring-brand", "focus-visible:ring-ring"]) {
      expect([...legal.matchAll(ALPHA_RING_COLOUR)], legal).toEqual([]);
    }
  });

  it("exempts the BARE decorative hairline and nothing wearing a variant", () => {
    // The exemption is the one place this gate can be widened into uselessness, so it is asserted
    // in BOTH directions rather than trusted. A state-scoped ring borrowing the hairline's colour
    // is still an indicator, and must still be caught.
    const bare = [...'className="rounded-xl ring-1 ring-foreground/10"'.matchAll(ALPHA_RING_COLOUR)];
    expect(bare).toHaveLength(1);
    expect(bare[0][1]).toBeUndefined();
    expect(DECORATIVE_HAIRLINE.has(bare[0][0])).toBe(true);

    const scoped = [...'className="focus-visible:ring-foreground/10"'.matchAll(ALPHA_RING_COLOUR)];
    expect(scoped).toHaveLength(1);
    expect(scoped[0][1]).toBe("focus-visible:");
    expect(DECORATIVE_HAIRLINE.has(scoped[0][0])).toBe(false);
  });

  it("the hairline exemption still describes something the tree actually renders", () => {
    // An exemption for a shape nobody uses is dead weight that only widens the gate. If the card
    // edge is ever redrawn with a border, DELETE the entry rather than leaving it standing open.
    const card = scan.text.get("src/components/ui/card.tsx") ?? "";
    expect(card).toContain("ring-1 ring-foreground/10");
  });
});

describe("DS-05 — the offset band is a token, never a framework default", () => {
  it("every focus ring declaration is paired with its offset colour", () => {
    expect(scan.unpairedRecipe).toEqual([]);
  });

  it("no variant sets an offset width without naming the offset colour", () => {
    expect(scan.uncolouredOffset).toEqual([]);
  });

  it("checks ONE ELEMENT, so a correct sibling cannot vouch for a broken one (WR-02)", () => {
    // POSITIVE CONTROL for the scope change itself. This fixture is the precise shape both checks
    // used to miss: a file whose FIRST element carries the canonical recipe in full, and whose
    // SECOND gains an offset width with no offset colour. `text.includes()` over the whole file
    // finds the offset colour in element one and clears element two on its strength.
    const fixture = [
      "export const A = () => (",
      '  <div className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" />',
      ");",
      "export const B = () => (",
      '  <div className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />',
      ");",
    ].join("\n");

    // The file-level question the old checks asked — and the answer that let this ship.
    expect(fixture.includes("focus-visible:ring-offset-background")).toBe(true);

    const chunks = classChunks("fixture.tsx", fixture);
    expect(chunks.length).toBeGreaterThanOrEqual(2);

    const offenders = chunks.filter(({ chunk }) =>
      [...chunk.matchAll(PREFIXED_OFFSET_WIDTH)].some(
        (m) => !chunk.includes(`${m[1]}ring-offset-background`),
      ),
    );
    expect(offenders).toHaveLength(1);
    expect(offenders[0].chunk).not.toContain("ring-offset-background");

    const unpaired = chunks.filter(
      ({ chunk }) =>
        chunk.includes("focus-visible:ring-ring") &&
        !chunk.includes("focus-visible:ring-offset-background"),
    );
    expect(unpaired).toHaveLength(1);
  });

  it("splits class strings rather than concatenating a file into one chunk", () => {
    // GUARD-THE-GUARD on the walker: if it returned the whole file as a single chunk, the per-chunk
    // checks would silently collapse back into the file-level ones they replaced, and every
    // assertion above would still pass. A real vendored primitive is used, not a fixture.
    const button = readFileSync(join(SRC_DIR, "components/ui/button.tsx"), "utf8");
    const chunks = classChunks("src/components/ui/button.tsx", button);
    expect(chunks.length).toBeGreaterThan(10);
    expect(chunks.every(({ chunk }) => chunk.length < button.length)).toBe(true);
  });

  it("the canonical recipe is still written verbatim in the file that defines it", () => {
    // The anchor. If `button.tsx` stops carrying the recipe, every "copied from button.tsx" claim
    // in this phase's summaries becomes a claim about a file that no longer says it.
    expect(scan.text.get("src/components/ui/button.tsx")).toContain(CANONICAL_RECIPE);
  });
});
