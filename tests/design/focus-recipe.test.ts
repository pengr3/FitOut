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
// THAT CLAIM IS NOW ASSERTED IN ALL FOUR CHECKS, NOT JUST TWO (CR-02). The two literal scans always
// read every collected file. The two PAIRING checks did too — until WR-02 narrowed them from
// whole-file text to one class string per element and implemented the narrowing with the TypeScript
// AST walker, which returns nothing for a stylesheet. The `.css` leg was not narrowed there, it was
// dropped, and a comment was written asserting it did not matter. It did: an
// `@apply focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` in the base
// layer's body rule left this file at 14/14 while shipping Tailwind's hardcoded `#fff` offset band
// on every focusable element. Both legs now run both checks, over the unit appropriate to the
// language — a class string in TypeScript, a declaration in CSS — and the `.css` leg is exercised
// by a fixture rather than argued for in prose.
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

import { stripComments } from "./helpers/strip-comments";

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

/**
 * A ring WIDTH with no ring COLOUR at the same variant prefix — the mirror of the check above
 * (WR-10), and the half of CR-01's deviation that had no gate at all.
 *
 * CR-01 deleted `aria-invalid:ring-3` — both its colour AND its width — and the argument for
 * deleting the width is recorded in `button.tsx`: Tailwind v4 declares `--tw-ring-color` with
 * `syntax: "*"` and NO initial value, so `.ring-3` emits `var(--tw-ring-color, currentcolor)` and an
 * uncoloured ring falls back to the element's text colour. On a near-black `--foreground` that is a
 * 3px near-black halo on every invalid field.
 *
 * The note closes with "Do not reintroduce a ring colour on a STATE variant here", and the alpha
 * scan enforces that half. Nothing enforced the other half: `aria-invalid:ring-3` could be re-added
 * tomorrow with no colour beside it, and every one of the four scans above would stay green because
 * a bare width is neither an alpha nor an offset. This is the same argument `PREFIXED_OFFSET_WIDTH`
 * already makes about the OFFSET band — a framework default reaching the screen instead of a token —
 * applied to the ring itself, which is the part a user is actually meant to see.
 *
 * `ring-0` is deliberately excluded: zero width paints nothing, and `input-group.tsx` legitimately
 * zeroes an inherited ring. The width must start `[1-9]`.
 *
 * Probed over every string literal in `src/` when this was added: **0 offenders**. It is a guard
 * against a regression, not a fix for a live defect.
 */
const PREFIXED_RING_WIDTH = /(?:^|[\s"'`])((?:[^\s"'`]*:)?)ring-[1-9]\d*(?![\w./-])/g;

/**
 * The `.css` equivalent of one class string — a single CSS declaration, with its line number.
 *
 * WHY THIS EXISTS (CR-02). The pairing checks below originally ran over the RAW TEXT of every
 * collected file, `.css` included. When they were narrowed to one class string per element (WR-02),
 * the narrowing was implemented with `classChunks`, which walks the TypeScript AST — and a `.css`
 * file has no string literals, so it produced nothing. The `.css` leg was therefore not narrowed,
 * it was DELETED, and the justification written in its place ("the stylesheet composes no focus
 * recipe of its own — it declares the tokens the recipe names") contradicted this file's own header
 * and was asserted nowhere.
 *
 * IT WAS NOT AN ACADEMIC LOSS. `globals.css` uses `@apply` in three places, so the shape is one line
 * away. Adding
 *
 *     @apply focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2;
 *
 * to the `@layer base` body rule was observed to leave this file at **14/14 passed** and the whole
 * design suite green, while the stylesheet shipped a hardcoded `#fff` band on every focusable
 * element in the app — Tailwind's `--tw-ring-offset-color` default, which is the exact "raw colour
 * reaching the screen from a framework default" `PREFIXED_OFFSET_WIDTH` exists to prevent, and
 * visibly wrong on grove's tinted background. The gate was strictly STRONGER before the narrowing.
 *
 * WHY A DECLARATION IS THE RIGHT UNIT. The per-element scope the pairing checks need is, in a
 * stylesheet, "one declaration": an `@apply` runs against the rule it sits in, and two declarations
 * in the same rule are no more one element than two class strings in one file are. Splitting on
 * `;`, `{`, `}` and newline is what a declaration boundary is in practice, and it keeps the same
 * property the `.tsx` leg has — a correct sibling cannot vouch for a broken one.
 */
function cssDeclarations(text: string): { chunk: string; line: number }[] {
  const out: { chunk: string; line: number }[] = [];
  let buf = "";
  let bufLine = 1;
  let line = 1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\n") line += 1;

    if (ch === ";" || ch === "{" || ch === "}" || ch === "\n") {
      if (buf.trim().length > 0) out.push({ chunk: buf, line: bufLine });
      buf = "";
      continue;
    }

    if (buf.length === 0) bufLine = line;
    buf += ch;
  }

  if (buf.trim().length > 0) out.push({ chunk: buf, line: bufLine });
  return out;
}

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
  /** Ring widths whose matching ring COLOUR is missing at the same variant prefix (WR-10). */
  uncolouredRing: Violation[];
  /** Files declaring the canonical focus ring colour without the canonical offset colour. */
  unpairedRecipe: Violation[];
  /** Raw text of every scanned file, keyed by normalised path — for the anchor assertions. */
  text: Map<string, string>;

  // ---- WR-03: what the two per-chunk checks ACTUALLY inspected ------------------------------
  /**
   * How many units the pairing checks ran over, `.ts`/`.tsx` and `.css` together.
   *
   * WHY A COUNT AND NOT A FLAG. Both pairing assertions are `expect(list).toEqual([])`, which a
   * scan that inspected NOTHING satisfies perfectly. The existing guard-the-guard counts
   * `scan.scanned`, but files are pushed to `scanned` BEFORE the per-chunk block, so it says
   * nothing about how many the checks reached. That gap was observed: replacing the file-type
   * condition with `if (false)` left this file at **14/14 passed** with both checks inspecting zero
   * units — the same "the assertion's anchor moved so the check silently disarmed" shape the first
   * review raised, reintroduced by the fix that narrowed the scope.
   */
  chunksInspected: number;
  /** …of which came from a `.css` file, so the leg CR-02 restored cannot be silently dropped again. */
  cssChunksInspected: number;
  /** `file:line` of every unit that carries the recipe's ring colour — a NON-empty expectation. */
  recipeSites: Violation[];
}

/** Scanned ONCE at module level; every `it()` below only asserts against this result. */
function scanSrc(): Scan {
  const scan: Scan = {
    scanned: [],
    halfAlphaRing: [],
    halfAlphaOutline: [],
    alphaRingColour: [],
    uncolouredOffset: [],
    uncolouredRing: [],
    unpairedRecipe: [],
    text: new Map(),
    chunksInspected: 0,
    cssChunksInspected: 0,
    recipeSites: [],
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

    // PER UNIT, never per file (WR-02) — AND THE STYLESHEET IS A UNIT SOURCE TOO (CR-02).
    //
    // The unit is "the smallest thing that reliably belongs to one element": a class string in
    // TypeScript, a declaration in CSS. Both legs run the SAME two checks. The `.css` leg is not
    // decorative — `globals.css` was the site of the stylesheet's own half-alpha outline colour,
    // it uses `@apply` in three places today, and an `@apply focus-visible:ring-offset-2` there
    // paints Tailwind's hardcoded white band on every focusable element in the app.
    const units = name.endsWith(".css")
      ? cssDeclarations(text)
      : classChunks(name, text);

    for (const { chunk, line } of units) {
      // WR-03 — count what was inspected, and record a NON-empty expectation alongside the two
      // empty ones. Without this, narrowing the unit source to nothing passes silently.
      scan.chunksInspected += 1;
      if (name.endsWith(".css")) scan.cssChunksInspected += 1;
      if (chunk.includes("focus-visible:ring-ring")) scan.recipeSites.push(`${name}:${line}`);

      for (const m of chunk.matchAll(PREFIXED_OFFSET_WIDTH)) {
        const prefix = m[1];
        if (!chunk.includes(`${prefix}ring-offset-background`)) {
          scan.uncolouredOffset.push(
            `${name}:${line}: ${m[0]} without ${prefix}ring-offset-background`,
          );
        }
      }

      // WR-10 — the same question about the RING itself. A colour at the same prefix is either a
      // token (`focus-visible:ring-ring`, `ring-brand`) or an arbitrary value (`ring-[…]`); a
      // width, an offset or `ring-inset` is not a colour and must not count as one.
      for (const m of chunk.matchAll(PREFIXED_RING_WIDTH)) {
        const prefix = m[1];
        const coloured = new RegExp(
          `(?:^|[\\s"'\`])${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}ring-(?:\\[|(?!offset-|inset(?![\\w-]))[a-z])`,
        ).test(chunk);
        if (!coloured) {
          scan.uncolouredRing.push(`${name}:${line}: ${m[0].trim()} without ${prefix}ring-<colour>`);
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
  it("actually inspected units, so the two empty lists below mean something (WR-03)", () => {
    // GUARD-THE-GUARD for the pairing checks specifically. `scan.scanned` is pushed BEFORE the
    // per-unit block, so the existing file-count guard says nothing about what these two checks
    // reached. Replacing the unit-source condition with `if (false)` was observed to leave this
    // file at 14/14 with both checks inspecting ZERO units; this assertion is what makes that loud.
    expect(scan.chunksInspected).toBeGreaterThan(500);

    // The NON-EMPTY expectation, which is the part a zeroed scan cannot satisfy however it was
    // zeroed. Modelled on `status-vocab.test.ts`'s sibling, whose equivalent assertion is
    // `toEqual([LEGAL_FILLED_PAIRING_SITE])` rather than `toEqual([])` for exactly this reason.
    expect(
      scan.recipeSites.some((s) => s.startsWith("src/components/ui/button.tsx:")),
      `the recipe was not seen in button.tsx; sites seen: ${scan.recipeSites.slice(0, 5).join(", ")}`,
    ).toBe(true);
  });

  it("inspected the STYLESHEET too, which is the leg CR-02 restored", () => {
    // Counted separately from the total on purpose: `.css` is one file out of 200+, so a `.css`
    // leg that silently produced zero units would move `chunksInspected` by a rounding error and
    // the assertion above would stay green. This is the one that goes red instead.
    expect(scan.cssChunksInspected).toBeGreaterThan(100);
    expect(scan.scanned).toContain("src/app/globals.css");
  });

  it("every focus ring declaration is paired with its offset colour", () => {
    expect(scan.unpairedRecipe).toEqual([]);
  });

  it("no variant sets an offset width without naming the offset colour", () => {
    expect(scan.uncolouredOffset).toEqual([]);
  });

  it("no variant sets a RING width without naming the ring colour either (WR-10)", () => {
    // The other half of CR-01's deviation, which until now had no gate. An uncoloured ring falls
    // back to `currentcolor` — a near-black halo — which is exactly the "framework default reaches
    // the screen instead of a token" failure the offset check above exists to prevent.
    expect(scan.uncolouredRing).toEqual([]);
  });

  it("the ring-width check fires on a bare width and spares every legal shape (WR-10)", () => {
    // POSITIVE CONTROL. There are zero offenders in the tree, so without this the assertion above
    // is indistinguishable from a regex that matches nothing at all.
    const uncoloured = (chunk: string): string[] => {
      const out: string[] = [];
      for (const m of chunk.matchAll(PREFIXED_RING_WIDTH)) {
        const prefix = m[1];
        const coloured = new RegExp(
          `(?:^|[\\s"'\`])${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}ring-(?:\\[|(?!offset-|inset(?![\\w-]))[a-z])`,
        ).test(chunk);
        if (!coloured) out.push(m[0].trim());
      }
      return out;
    };

    // The exact shape CR-01 deleted, re-added without its colour — plus a bare and a hover form.
    expect(uncoloured("aria-invalid:ring-3")).toEqual(["aria-invalid:ring-3"]);
    expect(uncoloured("rounded-md ring-2")).toEqual(["ring-2"]);
    expect(uncoloured("hover:ring-1 focus-visible:ring-ring")).toEqual(["hover:ring-1"]);

    // …and PER PREFIX, so one variant's colour cannot vouch for another's — the same property the
    // offset check has, and the reason both capture the prefix rather than matching per file.
    expect(uncoloured("focus-visible:ring-2 focus-visible:ring-ring aria-invalid:ring-3")).toEqual([
      "aria-invalid:ring-3",
    ]);

    for (const legal of [
      // The canonical recipe: width and colour at the same prefix.
      CANONICAL_RECIPE,
      // The decorative hairline.
      "rounded-xl ring-1 ring-foreground/10",
      // An arbitrary ring colour is still a colour.
      "ring-2 ring-[color-mix(in_oklch,var(--brand),transparent)]",
      // Zero width paints nothing, and `input-group.tsx` legitimately zeroes an inherited ring.
      "aria-invalid:ring-0 focus-visible:ring-0",
      // An OFFSET width is not a ring width, and `ring-inset` is not a colour but needs no colour.
      "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "ring-2 ring-inset ring-ring",
    ]) {
      expect(uncoloured(legal), legal).toEqual([]);
    }
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

  it("reports an `@apply` in the STYLESHEET, on both checks (CR-02)", () => {
    // POSITIVE CONTROL for the `.css` leg. It exists because the leg was DELETED with a comment
    // asserting it did not matter, and the deletion was invisible: the exact stylesheet below was
    // added to `globals.css`'s `@layer base` body rule and this file reported 14/14 passed while
    // every focusable element in the app gained Tailwind's hardcoded `#fff` offset band.
    //
    // The `.css` leg is now OBSERVED working rather than argued for, which is the standard the rest
    // of this phase's gates are held to.
    const stylesheet = [
      "@layer base {",
      "  body {",
      "    @apply bg-background text-foreground;",
      "    @apply focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2;",
      "  }",
      "}",
    ].join("\n");

    const units = cssDeclarations(stylesheet);
    expect(units.length).toBeGreaterThanOrEqual(2);

    const uncoloured = units.filter(({ chunk }) =>
      [...chunk.matchAll(PREFIXED_OFFSET_WIDTH)].some(
        (m) => !chunk.includes(`${m[1]}ring-offset-background`),
      ),
    );
    expect(uncoloured, "an offset width with no offset colour must be reported in .css").toHaveLength(1);

    const unpaired = units.filter(
      ({ chunk }) =>
        chunk.includes("focus-visible:ring-ring") &&
        !chunk.includes("focus-visible:ring-offset-background"),
    );
    expect(unpaired, "a ring colour with no offset colour must be reported in .css").toHaveLength(1);

    // …and the line number must point at the offending declaration, not at the top of the file.
    expect(unpaired[0].line).toBe(4);

    // The CORRECT stylesheet form must still pass, or the leg would be reporting every `@apply`.
    const legal = "  body { @apply focus-visible:ring-ring focus-visible:ring-offset-background; }";
    expect(
      cssDeclarations(legal).filter(
        ({ chunk }) =>
          chunk.includes("focus-visible:ring-ring") &&
          !chunk.includes("focus-visible:ring-offset-background"),
      ),
    ).toEqual([]);
  });

  it("treats one CSS declaration as one element, so a correct sibling cannot vouch (CR-02)", () => {
    // The `.css` twin of the WR-02 fixture above. Two declarations in the SAME rule: the first
    // carries the full recipe, the second an offset width alone. Whole-file text finds the offset
    // colour in the first and clears the second on its strength — which is what the pre-WR-02 code
    // did for `.css`, and is the one property the restoration must not bring back with it.
    const stylesheet = [
      "  .a {",
      "    @apply focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background;",
      "    @apply focus-visible:ring-offset-2;",
      "  }",
    ].join("\n");

    expect(stylesheet.includes("focus-visible:ring-offset-background")).toBe(true);

    const offenders = cssDeclarations(stylesheet).filter(({ chunk }) =>
      [...chunk.matchAll(PREFIXED_OFFSET_WIDTH)].some(
        (m) => !chunk.includes(`${m[1]}ring-offset-background`),
      ),
    );
    expect(offenders).toHaveLength(1);
    expect(offenders[0].chunk).not.toContain("ring-offset-background");
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

  it("splits the STYLESHEET rather than returning it as one chunk (CR-02)", () => {
    // The `.css` twin of the walker guard above, and the reason the count assertion has a floor of
    // 100: if `cssDeclarations` ever returned the file whole, both `.css` checks would collapse
    // back into the file-level ones and every assertion here would still pass.
    const css = readFileSync(join(SRC_DIR, "app/globals.css"), "utf8");
    const units = cssDeclarations(css);
    expect(units.length).toBeGreaterThan(100);
    expect(units.every(({ chunk }) => chunk.length < css.length)).toBe(true);
  });

  it("no state variant cancels the invalid affordance with a non-destructive colour (WR-01)", () => {
    // WHY THIS LIVES IN THE FOCUS FILE. It is the same defect class as CR-01 one step along, and
    // this file already owns it: a STATE-scoped rule quietly outranking the base recipe and
    // removing the indicator, invisible to a scan written against the base string. There the state
    // rule diluted the focus ring; here it replaced the error border with the primary token.
    //
    // WHAT WENT WRONG. Deleting the invalid RING was correct — Tailwind v4 gives `--tw-ring-color`
    // no initial value, so a bare width paints a near-black halo — and the note recording it said
    // the destructive BORDER already carried the error meaning. True for Input, Textarea, Select,
    // Switch, Toggle, Badge and Button. False for Checkbox and RadioGroupItem, which each carried a
    // second invalid border scoped to the checked state and pointed at the primary token. Confirmed
    // against the compiled stylesheet rather than assumed: the plain rule emits
    // `&[aria-invalid="true"]` at (0,2,0), the checked-and-invalid one nests `&[aria-checked="true"]`
    // inside it at (0,3,0) and wins on specificity regardless of order, and Radix sets
    // `aria-checked` on both roots. A checked, invalid control therefore had NO error cue at all.
    //
    // THE RULE. Any colour utility whose variant chain mentions the invalid state must name the
    // destructive token. That is what "the border carries the error meaning" means as an assertion
    // rather than as a sentence. Read from STRIPPED code, so the notes in `button.tsx` that explain
    // this decision cannot satisfy or trip it.
    const INVALID_SCOPED_COLOUR =
      /(?:[^\s"'`]*:)?aria-invalid(?::[^\s"'`]+)*:(?:border(?:-[trblxyse])?|text|ring|bg|outline|divide)-([a-z][a-z0-9-]*)(?:\/\d+)?/g;

    const offenders: Violation[] = [];
    for (const [name, text] of scan.text) {
      for (const m of stripComments(text).matchAll(INVALID_SCOPED_COLOUR)) {
        if (m[1] === "destructive") continue;
        offenders.push(`${name}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);

    // POSITIVE CONTROL. Every assertion above is an empty-violations assertion, and this one is a
    // regex — the single easiest thing to make silently ineffective. The first shape is verbatim
    // what shipped on both primitives; the rest must still be allowed through.
    const caught = "aria-invalid:aria-checked:border-primary";
    expect([...caught.matchAll(INVALID_SCOPED_COLOUR)], caught).not.toEqual([]);
    for (const legal of [
      "aria-invalid:border-destructive",
      "aria-invalid:aria-checked:border-destructive",
      "dark:aria-invalid:border-destructive/50",
      // A ring WIDTH is not a colour, and `input-group.tsx` legitimately zeroes one.
      "aria-invalid:ring-0",
      "data-checked:border-primary",
    ]) {
      const hits = [...legal.matchAll(INVALID_SCOPED_COLOUR)].filter((m) => m[1] !== "destructive");
      expect(hits, legal).toEqual([]);
    }
  });

  it("both controls the WR-01 gate exists for are actually in the scan", () => {
    // The gate above is an empty-list assertion over `scan.text`, which a walker that missed these
    // two files satisfies perfectly. Named explicitly because they are the only two primitives the
    // defect ever applied to.
    expect(scan.scanned).toContain("src/components/ui/checkbox.tsx");
    expect(scan.scanned).toContain("src/components/ui/radio-group.tsx");
    for (const file of ["src/components/ui/checkbox.tsx", "src/components/ui/radio-group.tsx"]) {
      expect(scan.text.get(file), `${file} was not read`).toContain("aria-invalid:border-destructive");
    }
  });

  it("the canonical recipe is still written verbatim in the file that defines it", () => {
    // The anchor. If `button.tsx` stops carrying the recipe, every "copied from button.tsx" claim
    // in this phase's summaries becomes a claim about a file that no longer says it.
    expect(scan.text.get("src/components/ui/button.tsx")).toContain(CANONICAL_RECIPE);
  });
});
