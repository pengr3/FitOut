// DS-10 — the status vocabulary is a CLOSED union of four tones, every status declares an icon, and
// the filled green badge is gone. This is the file that keeps all three true.
//
// WHY THIS FILE EXISTS AT ALL. Before plan 10-10 the repo carried TWO tone vocabularies and neither
// was the design system's: `booking-status.ts` declared a three-value union, `payout-ledger-status.ts`
// a four-value one, and the value they shared was a filled green chip measuring 3.24:1. Nothing went
// red, because nothing was checking — "the badge vocabulary" was a claim in a spec rather than a type
// in the tree. The type layer below is what makes it a type; the source layer is what stops the
// retired pairing walking back in through a copy-paste.
//
// THE COMPILE GATE IS REAL, AND WAS WATCHED. Adding a fifth member to `STATUS_TONES` without giving
// it a recipe was tried locally and observed to fail, then reverted. Verbatim:
//
//   src/lib/design/status-tones.ts(79,14): error TS2741: Property 'warning' is missing in type
//   '{ neutral: {…}; positive: {…}; attention: {…}; "soft-accent": {…}; }' but required in type
//   'Record<"neutral" | "positive" | "attention" | "soft-accent" | "warning", StatusToneRecipe>'.
//
//   `npx tsc --noEmit` exited 2. That is the assertion no runtime test can make, which is why the
//   recipe map is a total `Record` and not a lookup with a fallback — and why it is recorded here
//   rather than described as a property the map "has".
//
// OBSERVED RED, NOT ASSUMED. The retired filled pairing was reinstated on `payout-state-badge.tsx`'s
// `paid` recipe and this file went NON-ZERO: **3 failed / 10 passed**, on exactly the three
// assertions that should care — the one-legal-site count, the four-call-site set, and the
// recipe-by-value check, each naming `src/components/host/payout-state-badge.tsx` in its message.
// The other ten stayed green, which is the correct blast radius: the type layer is unaffected by a
// call site, and it would be a bad sign if it moved. Reverted → 13 passed.
//
// WHY THE ICON COMPLETENESS CHECK IS A SOURCE SCAN AND NOT AN IMPORT. `BADGE_RECIPES` lives inside
// `booking-status-badge.tsx` / `payout-state-badge.tsx`, which pull in `lucide-react`, `radix-ui` and
// the vendored `Badge`. This suite runs under `vitest.design.config.ts`, whose whole point is that it
// touches no database and no DOM (`environment: "node"`). Importing two React component modules to
// read one const would drag that surface into a gate that is destined to run inside `next build`. The
// derive FUNCTIONS are imported directly — they are pure `.ts` with no runtime imports at all.
//
// THIS FILE MAY NAME THE RETIRED PAIRING VERBATIM; `src/` MAY NOT. The scanner roots at `src/`, so
// `tests/` is outside its own walk. That asymmetry is deliberate and is the same one
// `brand-recipe.test.ts` relies on — it is what lets the banned string be stated here by name instead
// of being described in a paraphrase nobody can grep for. It is also why the surviving call site in
// `wizard.tsx` explains itself in a comment that carefully does NOT quote the class: a comment naming
// the string it is exempting would make this file's own count read 2.
//
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file:
//   • PIXELS. This proves the class names and the tone values. It does not prove a browser paints a
//     legible chip: `cn()` / tailwind-merge precedence at a call site can still drop a class, and the
//     `positive` recipe deliberately overrides the Badge CVA's default variant rather than replacing
//     it. Phase 11's GATE-01 pass and Phase 17's a11y audit see real pixels.
//   • WHETHER THE TONE COLOURS CLEAR THEIR BAR. That is `contrast.test.ts`'s job, against the pair
//     inventory in `src/lib/design/contrast-pairs.ts`. This file only cares that the vocabulary is
//     closed, total, and reaching the four call sites unchanged.
//   • STATUSES OUTSIDE THESE TWO DERIVATIONS. A future surface that invents its own chip without
//     routing through `StatusTone` is invisible here.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import ts from "typescript";

import { stripComments } from "./helpers/strip-comments";
import {
  STATUS_TONES,
  STATUS_TONE_RECIPES,
  type StatusTone,
} from "@/lib/design/status-tones";
import {
  deriveBookingStatusView,
  type BookingDbStatus,
} from "@/components/booking/booking-status";
import {
  derivePayoutLedgerView,
  type PayoutLedgerState,
} from "@/components/host/payout-ledger-status";

const SRC_DIR = resolve(process.cwd(), "src");

/** The four tones, written out independently of the module so a rename cannot rewrite the test. */
const EXPECTED_TONES = ["neutral", "positive", "attention", "soft-accent"] as const;

/** Every booking status the DB can hold (mirrors the `booking_status` pgEnum). */
const ALL_BOOKING_STATUSES: BookingDbStatus[] = [
  "pending",
  "confirmed",
  "cancelled",
  "declined",
  "completed",
  "requested",
  "approved",
];

/** Every payout-ledger state (mirrors the `payout_ledger_state` pgEnum). */
const ALL_PAYOUT_STATES: PayoutLedgerState[] = [
  "held",
  "processing",
  "paid",
  "refunded",
  "failed",
];

/**
 * THE RETIRED PAIRING, as the two classes it is made of rather than as one adjacency (WR-03).
 *
 * The filled green chip: a `--success` fill carrying its LABEL in `--success-foreground`, which
 * measured 3.24:1 against a 4.5 text bar. Four of these shipped and all four are gone.
 *
 * WHY NOT THE ADJACENT STRING. This was `"bg-success text-success-foreground"` matched with
 * `includes()`, which is an assertion about two tokens being adjacent, in that order, separated by
 * exactly one space. The pairing renders identically — and the gate passes — if the classes are
 * REORDERED, double-spaced, wrapped across lines by a formatter, split across two `cn()` arguments,
 * or merely separated by any third class such as `rounded-full`. The last of those is not a
 * contrived evasion; it is what happens the first time somebody adds a border radius. Detecting the
 * two classes INDEPENDENTLY and intersecting them costs nothing in precision: two classes on the
 * same element are the pairing, whatever order they were typed in.
 *
 * WHAT "THE SAME ELEMENT" MEANS, AND THE CLAIM THIS COMMENT USED TO MAKE (CR-01). It previously
 * said that detecting the two classes within one CLASS STRING "removes every one of those escapes
 * at once". That was false for the `cn()`-split one, and the sentence outlived its own
 * counter-example: two `cn()` arguments are two literals, so neither held both classes and the
 * pairing shipped on `booking-row.tsx` with 405/405 green. The unit is now the ELEMENT — see
 * `classSetsForElements`, which unions every literal beneath one `className` attribute or one
 * `cn()` call — and the escapes it does and does not close are enumerated there rather than
 * asserted in a superlative. The split-across-`cva`-slots shape remains open and is recorded as
 * such.
 */
const RETIRED_FILL = "bg-success";
const RETIRED_INK = "text-success-foreground";

/**
 * The ONE file allowed to keep it, and why.
 *
 * D-14 draws the line at "is this a status, or is it progress?". The wizard's completed-step marker
 * is a `<span>` whose only child is a glyph — there is no text node in it and no branch that could
 * add one — so the pairing it carries is the NON-TEXT one, measured at 3.83 court / 3.84 grove
 * against a 3.05 bar. That is a declared pairing in `contrast-pairs.ts` and the single legal use of
 * `--success-foreground` in the product. The count below is the RECORD of that decision, not an
 * oversight waiting to be tidied: a second filled green surface anywhere goes red here.
 */
const LEGAL_FILLED_PAIRING_SITE = "src/app/(host)/host/listings/[id]/edit/wizard.tsx";

/**
 * The four call sites that took the `positive` recipe, pinned per file rather than as a bare total.
 *
 * A total of 4 is satisfiable by re-treating the listing card twice and missing the payout banner.
 * This map is not. It is also the link that keeps the literal classes at these call sites honest:
 * they are written out in each file (the repo's convention for a call site — see
 * `availability/spots-left-chip.tsx`, the shipped soft accent), and asserted here BY VALUE against
 * `STATUS_TONE_RECIPES.positive`, so a change to the vocabulary that does not reach the call sites
 * fails at the file that did not move.
 */
const POSITIVE_CALL_SITES = [
  "src/components/booking/booking-status-badge.tsx",
  "src/components/host/payout-state-badge.tsx",
  "src/components/host/payout-banner.tsx",
  "src/components/listing/listing-card.tsx",
] as const;

/**
 * The files that carry the success hue as a BARE MARK rather than as a status chip's icon.
 *
 * ─── ADDED BY PLAN 13-11, AND IT IS A THIRD CATEGORY RATHER THAN A FIFTH CALL SITE ──────────────
 *
 * `confirmation-moment.tsx` renders BFLOW-08's post-payment first screen, whose success mark
 * 13-UI-SPEC § Color names as the phase's ONE use of the token: *"the confirmation moment's success
 * mark, as an **icon**, `text-success` on `--background` (3.0 non-text bar, declared 4.00 / 3.86)"*.
 * It is a `size-10` `CheckCircle2` standing alone above an `<h1>`, on the page ground.
 *
 * WHY IT IS NOT A ROW IN `POSITIVE_CALL_SITES`. That list is the set of STATUS CHIPS, and the
 * assertions keyed on it require the recipe's `surface` and `text` on ONE element — a chip has a
 * `bg-muted` fill and a `text-foreground` label with the hue on its glyph. This mark has no fill and
 * no label: there is no chip. Adding it to that list would have forced either a false pass (relaxing
 * the same-element requirement, which is WR-09's whole subject) or a `bg-muted` box painted around a
 * success mark purely to satisfy a test — a design change made by a gate, which is backwards.
 *
 * WHY IT STILL HAS TO BE DECLARED SOMEWHERE. The icon-site assertion below is a SET EQUALITY over
 * every file using the hue, and that is the property worth keeping: an undeclared file reaching for
 * `--success` is exactly the drift DS-10 exists to catch. So the set is now the union of the two
 * inventories, each named for what it is — the same shape `LEGAL_FILLED_PAIRING_SITE` above already
 * uses to record the one legal filled pairing rather than to widen a ban.
 *
 * ⚠ THE HUE'S SCARCITY IS THE POINT. This inventory is a RECORD OF A DECISION, not a bucket. A
 * second bare success mark anywhere in the product goes red here and should — D-14's thesis is that
 * green retreats to the icon, and a hue that appears on every satisfied outcome stops meaning the
 * one that matters.
 */
const SUCCESS_GLYPH_SITES = ["src/components/booking/confirmation-moment.tsx"] as const;

/** Every file allowed to name the success hue at a call site, whatever shape it takes. */
const SUCCESS_HUE_SITES = [...POSITIVE_CALL_SITES, ...SUCCESS_GLYPH_SITES] as const;

/** Where a call site may live. `src/lib/` is excluded: the vocabulary itself declares these classes. */
const CALL_SITE_TREES = ["src/app/", "src/components/"] as const;

/**
 * Collect every `.ts`/`.tsx` file under a directory, recursively.
 *
 * Copied from `tests/design/focus-recipe.test.ts:69`, this phase's reference walker. `.css` is not
 * collected: the retired pairing was always a pair of utility classes on an element, never a rule in
 * the stylesheet.
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
 * WINDOWS PATH NORMALISATION — copied verbatim from `tests/design/focus-recipe.test.ts:90`. Load
 * bearing, not cosmetic: on this box `path.relative` emits backslash separators while every scope
 * decision here is a FORWARD-SLASH prefix comparison. Without it `CALL_SITE_TREES` matches nothing,
 * the violation list comes back empty and every count assertion passes vacuously — which is exactly
 * what the guard-the-guard block exists to catch.
 */
function label(file: string): string {
  return relative(process.cwd(), file).split("\\").join("/");
}

/**
 * Does `text` use `cls` as a WHOLE Tailwind class?
 *
 * The boundary matters more than usual here: a plain `includes("text-success")` also matches
 * `text-success-foreground`, which is the very class DS-10 declares illegal as text. A check that
 * cannot tell the two apart would report the wizard as a `positive` call site and would go green on
 * a call site that reinstated the retired ink.
 */
function usesClass(text: string, cls: string): boolean {
  return new RegExp(`${cls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-/])`).test(text);
}

/**
 * Every string literal in a `.ts`/`.tsx` file — one chunk per class string.
 *
 * Copied from `tests/design/focus-recipe.test.ts`, which added it for WR-02 and chose this unit for
 * the same reason it is needed here: a class string is the smallest thing that reliably belongs to
 * ONE element, and both checks below are claims about a single element.
 *
 * NOTE — THIS IS NO LONGER THE UNIT THE CHECKS USE (CR-01). One literal is the smallest thing that
 * belongs to one element; it is NOT the largest, and the gap between the two was an open escape.
 * See `classSetsForElements` below. This function survives because a single literal must still
 * stand on its own, and because the ELEMENT sets are built on top of it.
 */
function classChunks(path: string, text: string): string[] {
  const sf = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const out: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      out.push(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/**
 * The set of UTILITIES in one class string, each with its variant chain removed and its opacity
 * modifier KEPT.
 *
 * Both halves of that sentence are load-bearing.
 *
 * REMOVING THE VARIANT CHAIN is what lets `data-[state=on]:bg-muted` be recognised as the same
 * utility as `bg-muted`, without a regex that has to guess where the chain ends. The scan walks
 * bracket depth, so a colon inside `data-[state=on]` does not split the token.
 *
 * KEEPING THE OPACITY MODIFIER is WR-09. The previous check used a regex whose right boundary was
 * `(?![\w-])`, which does not exclude `/` — so `bg-muted/40` satisfied a `bg-muted` surface match.
 * Those are two different rendered colours with two different contrast ratios, and the tree already
 * ships the tinted one (`search-result-card.tsx`'s `group-hover:bg-muted/40`). Comparing whole
 * utility strings makes the distinction structural rather than a lookahead that has to remember to
 * list every character that could follow.
 */
function utilitiesIn(chunk: string): Set<string> {
  const out = new Set<string>();
  for (const raw of chunk.split(/\s+/).filter(Boolean)) {
    const token = raw.replace(/^!+/, "");
    let depth = 0;
    let start = 0;
    for (let i = 0; i < token.length; i++) {
      const ch = token[i];
      if (ch === "[" || ch === "(") depth++;
      else if (ch === "]" || ch === ")") depth--;
      else if (ch === ":" && depth === 0) start = i + 1;
    }
    out.add(token.slice(start));
  }
  return out;
}

/**
 * The call expressions that COMBINE several class strings into one (CR-01).
 *
 * `cn` is this repo's own merge helper (`src/lib/utils.ts`), `clsx` and `twMerge` are what it wraps.
 * Every argument to one of these lands on the SAME element, so for the purpose of "is this pairing
 * on one element" they are one class string however many literals they were typed as.
 *
 * `cva` is deliberately ABSENT. Unioning a `cva()` call would merge its base with EVERY variant,
 * including variants that are mutually exclusive by construction — a gate that reports a pairing
 * two variants can never render together is crying wolf, and this phase has already recorded what
 * that costs. The residual gap that leaves is stated as a blind spot in the header rather than
 * quietly closed over.
 */
const CLASS_COMBINERS = new Set(["cn", "clsx", "twMerge", "classNames", "classnames"]);

/**
 * The utility set of every ELEMENT in a file — not of every string literal (CR-01).
 *
 * WHY THE UNIT HAD TO CHANGE. The previous scheme detected the two halves of the retired pairing
 * INDEPENDENTLY and intersected them within one literal, and the doc comment above `RETIRED_FILL`
 * claimed that "removes every one of those escapes at once". It did not remove the `cn()`-split one:
 * `classChunks` returns ONE CHUNK PER STRING LITERAL, and two `cn()` arguments are two literals, so
 * neither chunk holds both classes.
 *
 * THAT WAS OBSERVED SHIPPING, NOT REASONED ABOUT. `src/components/booking/booking-row.tsx` was
 * changed from `<Card className="relative">` to
 *
 *     <Card className={cn("relative bg-success", "text-success-foreground")}>
 *
 * and this file reported **18/18 passed**, the whole design suite **405/405**. The retired 3.24:1
 * filled-green pairing — the one DS-10 exists to retire, the one `contrast-pairs.ts` calls "ILLEGAL
 * as text" — shipped on the booker's booking card with every gate green. `pair-drift.test.ts` could
 * not see it either, for the same reason.
 *
 * Nor was it contrived. `booking-status-badge.tsx` and `payout-state-badge.tsx` are one literal
 * today purely by convention, and the phase's own `cn("gap-1", className)` idiom sits at both call
 * sites — one refactor away from the shape above.
 *
 * WHAT AN "ELEMENT" IS HERE, and why each anchor is in the list:
 *
 *   • A JSX `className` attribute. Everything under it lands on one element, whatever expression
 *     produced it — `cn()` arguments, a conditional, a template literal's head/middle/tail spans.
 *     This is the anchor that closes the reproduced escape.
 *   • A `cn()` / `clsx()` / `twMerge()` call ANYWHERE, including outside JSX. A recipe map's value
 *     is not under a `className` attribute, but if it is built by one of these calls its arguments
 *     still land together.
 *   • Every individual literal, kept from `classChunks`. A single string must still stand on its
 *     own, and it is the only unit available inside a `cva` variant.
 *
 * The sets are deliberately allowed to overlap: a pairing is a violation if it appears on ANY of
 * them, so a wider unit can only add detections, never remove one.
 *
 * KNOWN RESIDUAL GAP, STATED RATHER THAN CLAIMED CLOSED. A pairing split across a `cva` BASE and one
 * of its VARIANTS is still invisible — the base's `bg-success` and a variant's
 * `text-success-foreground` do render together, but so would every other variant's classes if the
 * call were unioned, and most of those combinations are unreachable. Closing it properly means
 * modelling which variant keys can co-occur, which is a type-level question this text scan cannot
 * answer. It is recorded here, and the `positive`-recipe surface-and-ink check at the bottom of this
 * file carries the same gap for the same reason.
 */
function classSetsForElements(path: string, text: string): Set<string>[] {
  const sf = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  /** Every utility in every literal beneath `node`, unioned into one set. */
  const utilitiesUnder = (node: ts.Node): Set<string> => {
    const bag = new Set<string>();
    const collect = (n: ts.Node): void => {
      if (
        ts.isStringLiteral(n) ||
        ts.isNoSubstitutionTemplateLiteral(n) ||
        ts.isTemplateHead(n) ||
        ts.isTemplateMiddle(n) ||
        ts.isTemplateTail(n)
      ) {
        for (const u of utilitiesIn(n.text)) bag.add(u);
      }
      ts.forEachChild(n, collect);
    };
    collect(node);
    return bag;
  };

  const out: Set<string>[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isJsxAttribute(node) && node.name.getText(sf) === "className") {
      out.push(utilitiesUnder(node));
    } else if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      CLASS_COMBINERS.has(node.expression.text)
    ) {
      out.push(utilitiesUnder(node));
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  // …plus every individual literal, so a single class string still stands on its own.
  return [...out, ...classChunks(path, text).map(utilitiesIn)];
}

interface Scan {
  /** Normalised forward-slash paths of every file the walker visited. */
  scanned: string[];
  /** Files under `src/app/` + `src/components/` carrying the retired filled pairing. */
  retiredPairingSites: string[];
  /** Files under `src/app/` + `src/components/` carrying the positive tone's icon hue. */
  positiveIconSites: string[];
  /** Raw text of every scanned file, keyed by normalised path. */
  text: Map<string, string>;
  /**
   * The same files with every comment removed (CR-03).
   *
   * WHY BOTH MAPS EXIST. The two are NOT interchangeable and each assertion below picks
   * deliberately. A check that a class is ABSENT from the whole tree is correctly stricter on raw
   * text: for a string that may appear nowhere at all, a comment quoting it is indistinguishable
   * from a call site using it, and this phase relies on that (see `contrast-pairs.ts`'s note about
   * describing rather than quoting). A check that a class is PRESENT must read stripped code, or
   * prose about the class satisfies the requirement the class exists to meet.
   */
  code: Map<string, string>;
  /** Per call-site file: one utility SET per class string, so checks can be per-element. */
  utilities: Map<string, Set<string>[]>;
}

/** Scanned ONCE at module level; every `it()` below only asserts against this result. */
function scanSrc(): Scan {
  const scan: Scan = {
    scanned: [],
    retiredPairingSites: [],
    positiveIconSites: [],
    text: new Map(),
    code: new Map(),
    utilities: new Map(),
  };

  for (const file of collectSourceFiles(SRC_DIR)) {
    const name = label(file);
    const text = readFileSync(file, "utf8");
    scan.scanned.push(name);
    scan.text.set(name, text);
    scan.code.set(name, stripComments(text));

    if (!CALL_SITE_TREES.some((tree) => name.startsWith(tree))) continue;

    // PER ELEMENT (WR-03 / WR-09 / CR-01): both the retired pairing and the recipe's surface+ink
    // are claims about ONE element, and a file-level `includes()` answers a weaker question. The
    // unit was "one string literal" until CR-01 observed the `cn()`-split escape shipping the
    // retired pairing with every gate green — see `classSetsForElements`.
    const chunks = classSetsForElements(name, text);
    scan.utilities.set(name, chunks);

    if (chunks.some((u) => u.has(RETIRED_FILL) && u.has(RETIRED_INK))) {
      scan.retiredPairingSites.push(name);
    }

    // FROM STRIPPED CODE, NOT RAW TEXT (CR-03). This is DS-10's only mechanical check that the
    // `positive` recipe's hue actually reaches a call site — D-14's thesis is "green retreats to
    // the icon", so the glyph is the entire non-colour-only signal in a status chip. Read raw, it
    // was satisfiable by a comment: the hue was deleted from `payout-banner.tsx`'s CheckCircle2 and
    // replaced with `{/* the hue used to be text-success here */}`, and this file reported 18/18
    // passed while the "Payouts enabled" badge shipped as an unhued glyph. That is the exact
    // colour-only-to-no-colour regression DS-10 was written to prevent.
    //
    // Live risk in that same file, which is why this is not hypothetical: the prose at
    // `payout-banner.tsx:48` already explains "the CheckCircle2 glyph that carries the hue". One
    // edit that QUOTES the class instead of describing it and the assertion is permanently
    // satisfied by documentation.
    const code = scan.code.get(name)!;
    if (usesClass(code, STATUS_TONE_RECIPES.positive.icon)) scan.positiveIconSites.push(name);
  }

  return scan;
}

const scan = scanSrc();

describe("DS-10 — the scan itself reaches what it claims to police", () => {
  // GUARD-THE-GUARD. Both source assertions below are counts, and a scanner that visited zero files
  // satisfies a count of 0 perfectly while satisfying a count of 1 not at all — so the failure would
  // at least be loud. The positive control is what makes the SET assertions trustworthy: a walker
  // that skipped `src/components/booking/` would report the badge files as clean.
  it("visits the whole source tree, not a fraction of it", () => {
    expect(scan.scanned.length).toBeGreaterThan(200);
  });

  it("reaches the badge files this plan re-treated — the positive control for every count below", () => {
    for (const site of POSITIVE_CALL_SITES) {
      expect(scan.scanned).toContain(site);
    }
    expect(scan.scanned).toContain(LEGAL_FILLED_PAIRING_SITE);
  });
});

describe("DS-10 — the tone vocabulary is closed and its recipe map is total", () => {
  it("declares exactly four tones, and exactly these four", () => {
    expect(STATUS_TONES).toHaveLength(4);
    expect([...STATUS_TONES].sort()).toEqual([...EXPECTED_TONES].sort());
  });

  it("gives every tone a recipe with all three slots filled — no tone can ship half-declared", () => {
    expect(Object.keys(STATUS_TONE_RECIPES).sort()).toEqual([...EXPECTED_TONES].sort());
    for (const tone of STATUS_TONES) {
      const recipe = STATUS_TONE_RECIPES[tone];
      expect(recipe, `no recipe for ${tone}`).toBeDefined();
      expect(recipe.surface.length, `${tone}.surface`).toBeGreaterThan(0);
      expect(recipe.text.length, `${tone}.text`).toBeGreaterThan(0);
      expect(recipe.icon.length, `${tone}.icon`).toBeGreaterThan(0);
    }
  });

  it("D-14 — green retreats to the icon: the three lifecycle tones differ ONLY in their icon hue", () => {
    // The structural form of "colour never carries the meaning". `neutral`, `positive` and
    // `attention` are the three tones a lifecycle state can land on, and all three put full-contrast
    // ink on the same neutral tint. If the hue could reach the LABEL, this assertion is where it
    // would arrive — a `positive` whose text is `text-success` fails here before any pixel is drawn.
    const lifecycle: StatusTone[] = ["neutral", "positive", "attention"];
    for (const tone of lifecycle) {
      expect(STATUS_TONE_RECIPES[tone].surface, `${tone}.surface`).toBe("bg-muted");
      expect(STATUS_TONE_RECIPES[tone].text, `${tone}.text`).toBe("text-foreground");
    }

    // …and the icon is what distinguishes them, so it must be distinct per tone. Three tones sharing
    // a surface AND a text colour AND an icon colour would be three names for one chip.
    const icons = lifecycle.map((t) => STATUS_TONE_RECIPES[t].icon);
    expect(new Set(icons).size).toBe(lifecycle.length);
  });

  it("no tone reaches for --success-foreground: it is illegal as text, in every slot", () => {
    // It survives with exactly ONE legal pairing — a non-text glyph on a filled --success surface —
    // and a tone recipe is by definition applied to a chip that has a label. Not one slot of one
    // tone may name it, including the icon slot, because the icon slot's colours land on the neutral
    // tint rather than on a --success fill.
    for (const tone of STATUS_TONES) {
      const recipe = STATUS_TONE_RECIPES[tone];
      for (const [slot, value] of Object.entries(recipe)) {
        expect(value, `${tone}.${slot}`).not.toContain("success-foreground");
      }
    }
  });
});

describe("DS-10 — every derived status lands inside the union and declares an icon", () => {
  it("every booking status, both sides, past and future, derives a tone in the union + an icon", () => {
    const NOW = new Date("2026-07-02T10:00:00Z");
    const FUTURE = new Date("2026-07-02T12:00:00Z");
    const PAST = new Date("2026-07-02T08:00:00Z");

    for (const side of ["booker", "host"] as const) {
      for (const endsAt of [FUTURE, PAST]) {
        for (const status of ALL_BOOKING_STATUSES) {
          const view = deriveBookingStatusView(status, endsAt, NOW, side);
          expect(STATUS_TONES, `${status}/${side} tone`).toContain(view.tone);
          // "Every status declares an icon" is the half of DS-10 that keeps a chip legible to a
          // reader who cannot see the hue at all. A status that derived a tone but no icon would be
          // colour-only by construction.
          expect(view.icon.length, `${status}/${side} icon`).toBeGreaterThan(0);
          expect(view.label.length, `${status}/${side} label`).toBeGreaterThan(0);
        }
      }
    }

    // POSITIVE CONTROL: the loop really did exercise more than one tone. Without this, a derivation
    // that collapsed every status to `neutral` would satisfy every assertion above.
    const tones = new Set(
      ALL_BOOKING_STATUSES.map((s) => deriveBookingStatusView(s, FUTURE, NOW, "booker").tone),
    );
    expect(tones.size).toBeGreaterThan(1);
    expect(tones).toContain("positive");
  });

  it("every payout state derives a tone in the union, and only `failed` is the attention edge", () => {
    for (const state of ALL_PAYOUT_STATES) {
      const view = derivePayoutLedgerView(state);
      expect(STATUS_TONES, `${state} tone`).toContain(view.tone);
      expect(view.label.length, `${state} label`).toBeGreaterThan(0);
    }

    // The never-red rule, asserted rather than asserted-about: a held payout is a NORMAL state.
    expect(derivePayoutLedgerView("failed").tone).toBe("attention");
    for (const happy of ["held", "processing", "paid", "refunded"] as const) {
      expect(derivePayoutLedgerView(happy).tone, `${happy} must not be the attention edge`).not.toBe(
        "attention",
      );
    }
  });
});

describe("DS-10 — every status badge recipe declares an icon", () => {
  /**
   * Does `file`'s recipe map give `key` an `Icon`? Matches both the one-line and braced forms.
   *
   * READS STRIPPED CODE (CR-03). This is a PRESENCE check, and every presence check in this file
   * was reading raw text — which is how the sibling icon check came to be satisfiable by a comment.
   * A commented-out recipe entry is not a recipe entry, and the negative control at the bottom of
   * this file is what proves the distinction is real rather than intended.
   */
  function declaresIcon(file: string, key: string): boolean {
    const code = scan.code.get(file) ?? "";
    return new RegExp(`\\n\\s*${key.replace("-", "\\-")}:\\s*\\{[^}]*Icon:`).test(code);
  }

  it("the booking badge map gives all seven display statuses an Icon", () => {
    for (const status of ALL_BOOKING_STATUSES) {
      expect(
        declaresIcon("src/components/booking/booking-status-badge.tsx", status),
        `booking badge recipe for ${status} has no Icon`,
      ).toBe(true);
    }
  });

  it("the payout badge map gives every badge-rendered state an Icon, and routes `failed` to an Alert", () => {
    for (const state of ["held", "processing", "paid", "refunded"] as const) {
      expect(
        declaresIcon("src/components/host/payout-state-badge.tsx", state),
        `payout badge recipe for ${state} has no Icon`,
      ).toBe(true);
    }

    // `failed` is deliberately absent from that map: a genuine failure needing a human is a MESSAGE,
    // not a chip, and it keeps the destructive Alert pattern (`text-destructive` on `--card`, a
    // declared pairing at 5.76:1). Asserting the branch exists is what makes the absence a decision.
    //
    // READ FROM STRIPPED SOURCE, and matched on the STATE (WR-13). This assertion previously named
    // the old `view.tone === "attention"` condition and read raw text — so once the component was
    // corrected to branch on the discriminant, the check went on passing because the COMMENT
    // explaining the correction still quoted the old condition. A gate satisfied by a comment about
    // the code rather than by the code is the collision this phase has now hit repeatedly.
    const badge = scan.code.get("src/components/host/payout-state-badge.tsx") ?? "";
    expect(badge.length, "payout-state-badge.tsx was not read").toBeGreaterThan(0);
    expect(badge).toContain('state === "failed"');
    expect(badge).toContain('variant="destructive"');
    // The guard must NOT be re-expressed against the derived view: that is what let a cast claim a
    // branch was unreachable while nothing checked the value the lookup actually indexes on.
    expect(badge).not.toContain('view.tone === "attention"');
  });
});

describe("DS-10 — the filled green badge is retired, and the one survivor is a glyph", () => {
  it("keeps exactly ONE filled --success surface in the app, the wizard's glyph-only step marker (D-14)", () => {
    // The number is the record of a decision. Every OTHER filled green chip put its LABEL on the
    // fill at 3.24:1; this one puts a CheckIcon on it at 3.83 / 3.84, which is the single legal
    // pairing of --success-foreground and a progress indicator rather than a status.
    expect(scan.retiredPairingSites).toEqual([LEGAL_FILLED_PAIRING_SITE]);
  });

  it("names the success hue in exactly the five declared files, and nowhere else", () => {
    // TWO INVENTORIES, ONE SET (plan 13-11). Four status chips carry it on their glyph; one bare
    // mark carries it alone, on the confirmation moment. See `SUCCESS_GLYPH_SITES` for why the
    // second is a distinct category rather than a fifth chip. The equality is over the UNION, so an
    // undeclared file reaching for `--success` still fails here whichever shape it reaches in.
    expect([...scan.positiveIconSites].sort()).toEqual([...SUCCESS_HUE_SITES].sort());
  });

  it("keeps the bare success mark scarce — exactly ONE file, and it is the confirmation moment", () => {
    // Asserted separately from the union above, because the union alone would go green if a chip
    // were quietly re-declared as a mark or vice versa. The hue's meaning comes from its scarcity:
    // 13-UI-SPEC gives this phase ONE use of the token and this is the record of it.
    expect(SUCCESS_GLYPH_SITES).toEqual(["src/components/booking/confirmation-moment.tsx"]);
    for (const site of SUCCESS_GLYPH_SITES) {
      const code = scan.code.get(site) ?? "";
      expect(code.length, `${site} produced no stripped code`).toBeGreaterThan(0);
      // From STRIPPED code, for `positive`'s reason (CR-03): read raw, a comment naming the hue
      // satisfies this for a mark that has lost it.
      expect(usesClass(code, STATUS_TONE_RECIPES.positive.icon)).toBe(true);
      // …and it is a MARK, not a chip: it carries no filled surface of its own on any element.
      const chunks = scan.utilities.get(site) ?? [];
      expect(
        chunks.some((u) => u.has(STATUS_TONE_RECIPES.positive.surface)),
        `${site} paints a chip surface around the success mark — DS-10 retired the filled green ` +
          "badge, and green retreats to the icon on the page ground",
      ).toBe(false);
    }
  });

  it("each of the four carries the positive recipe BY VALUE, on ONE element (WR-09)", () => {
    // The surface and the ink are the badge's OWN recipe, so they are required on the same class
    // string rather than merely somewhere in the file. File-level was too weak in two separate
    // ways: three slots scattered across three unrelated elements satisfied it, and — because the
    // old boundary did not exclude `/` — an opacity-modified surface satisfied it too, which is a
    // different rendered colour with a different contrast ratio.
    const { surface, text, icon } = STATUS_TONE_RECIPES.positive;
    for (const site of POSITIVE_CALL_SITES) {
      const body = scan.code.get(site) ?? "";
      expect(body.length, `${site} was not read`).toBeGreaterThan(0);

      const chunks = scan.utilities.get(site) ?? [];
      expect(chunks.length, `${site} produced no class strings`).toBeGreaterThan(0);
      expect(
        chunks.some((u) => u.has(surface) && u.has(text)),
        `${site} does not carry ${surface} and ${text} on the same element`,
      ).toBe(true);

      // The icon is a CHILD element by construction — the recipe puts the hue on the glyph and the
      // ink on the label — so it cannot be on the same string, and requiring that would be wrong.
      // It is asserted per file, which is this check's one remaining cross-element blind spot and
      // is stated here rather than left for the next reader to discover.
      //
      // FROM STRIPPED CODE (CR-03) — see the note in `scanSrc`. Read raw, a comment naming the hue
      // satisfied this for a glyph that had lost it.
      expect(usesClass(body, icon), `${site} missing ${icon}`).toBe(true);
    }
  });

  it("pins ALL FOUR tone recipes by value, not just the one with a call site (WR-08)", () => {
    // THE VOCABULARY HAD ONE LOAD-BEARING ENTRY. Only `positive` was destructured anywhere in this
    // file, so `neutral`, `attention` and `soft-accent` could be edited to anything at all and
    // nothing in the suite would notice — a closed TYPE over three unenforced values. Changing
    // `neutral.surface` changed nothing and failed nothing.
    //
    // Every class named here is a declared pairing in `contrast-pairs.ts`, which is what makes the
    // table an assertion rather than a copy: foreground-on-muted 18.16 / 16.89, success-on-muted
    // 3.67 / 3.54, destructive-on-muted 5.28 / 5.10, muted-foreground-on-muted 4.82 / 5.28,
    // foreground-on-brand@10% 17.04 / 16.24, brand-on-brand@10% 4.10 / 4.06. Editing a slot here
    // means re-deriving that pairing, which is exactly the friction DS-10 wants.
    expect(STATUS_TONE_RECIPES).toEqual({
      neutral: { surface: "bg-muted", text: "text-foreground", icon: "text-muted-foreground" },
      positive: { surface: "bg-muted", text: "text-foreground", icon: "text-success" },
      attention: { surface: "bg-muted", text: "text-foreground", icon: "text-destructive" },
      "soft-accent": { surface: "bg-brand/10", text: "text-foreground", icon: "text-brand" },
    });

    // Every tone in the closed union has a recipe, and no recipe exists for a tone the union
    // dropped — `outline` in particular, which was removed as a TONE while its badge variant stayed.
    expect(Object.keys(STATUS_TONE_RECIPES).sort()).toEqual([...STATUS_TONES].sort());
    expect(Object.keys(STATUS_TONE_RECIPES)).not.toContain("outline");
  });

  it("renders soft-accent BY VALUE at its one adopter, on a single element", () => {
    // The second tone that is genuinely load-bearing, asserted the same way `positive` is. Without
    // this, `soft-accent` was pinned only against itself by the table above.
    const { surface, text, icon } = STATUS_TONE_RECIPES["soft-accent"];
    const site = "src/components/availability/spots-left-chip.tsx";
    const chunks = scan.utilities.get(site) ?? [];
    expect(chunks.length, `${site} produced no class strings`).toBeGreaterThan(0);
    expect(
      chunks.some((u) => u.has(surface) && u.has(text)),
      `${site} does not carry ${surface} and ${text} on the same element`,
    ).toBe(true);
    // Stripped code, for the same reason as `positive`'s twin above (CR-03).
    expect(usesClass(scan.code.get(site) ?? "", icon)).toBe(true);
  });

  it("records which tones are rendered from the recipe and which only agree with it (WR-08)", () => {
    // THE HONEST STATEMENT of what the reconciliation actually achieved, asserted so it cannot rot
    // into a claim nobody re-checks. `neutral` and `attention` do NOT consume the recipe object at
    // a call site: neutral's chips reach the same colours through `variant="secondary"` (--secondary
    // and --muted hold the same value in both themes), and attention's only adopter is a destructive
    // Alert on --card. Closing that gap means deciding whether approved/processing keep their
    // border treatment and whether the closed lifecycle statuses keep their de-emphasised ink —
    // design decisions, deferred, not silently pending.
    const badge = scan.code.get("src/components/booking/booking-status-badge.tsx") ?? "";
    expect(badge.length).toBeGreaterThan(0);
    // The outline variant is still selected per status, which is what the vocabulary note now says.
    expect(badge).toContain('variant: "outline"');
    // …and the neutral tint is still reached via the secondary variant rather than the recipe.
    expect(badge).toContain('variant: "secondary"');
  });

  it("cannot be evaded by reordering, extra spacing, or an intervening class (WR-03)", () => {
    // POSITIVE CONTROL for the detection change. Every shape below renders the retired 3.24:1
    // pairing, and every one of them passed the old adjacency check.
    for (const evasion of [
      "text-success-foreground bg-success",
      "bg-success  text-success-foreground",
      "bg-success rounded-full text-success-foreground",
      "inline-flex bg-success px-2 text-success-foreground",
    ]) {
      const u = utilitiesIn(evasion);
      expect(u.has(RETIRED_FILL) && u.has(RETIRED_INK), evasion).toBe(true);
      // …and the old check genuinely did not see them, which is why this test exists.
      expect(evasion.includes(`${RETIRED_FILL} ${RETIRED_INK}`), evasion).toBe(false);
    }

    // The legal glyph-only survivor must still be recognised, or the count above means nothing.
    expect(utilitiesIn("bg-success text-success-foreground").has(RETIRED_FILL)).toBe(true);
  });

  it("cannot be evaded by SPLITTING the pairing across two class strings (CR-01)", () => {
    // POSITIVE CONTROL for the unit change, and the assertion the previous scheme could not make.
    // Every fixture below renders the retired 3.24:1 pairing on ONE element while putting its two
    // halves in TWO string literals — so the per-literal check saw two innocent chunks. The first
    // is the exact shape reproduced on `booking-row.tsx`, where it shipped with 405/405 green.
    //
    // By this phase's own standard, a gate never observed failing on a form is not a gate for that
    // form. These are that observation, in test form.
    const splits: Record<string, string> = {
      "cn() arguments": [
        "export const A = () => (",
        `  <Card className={cn("relative ${RETIRED_FILL}", "${RETIRED_INK}")}>x</Card>`,
        ");",
      ].join("\n"),
      "a conditional inside cn()": [
        "export const B = () => (",
        `  <span className={cn("${RETIRED_FILL}", done && "${RETIRED_INK}")}>x</span>`,
        ");",
      ].join("\n"),
      "a template literal with an interpolation": [
        "export const C = () => (",
        `  <span className={\`${RETIRED_FILL} \${pad} ${RETIRED_INK}\`}>x</span>`,
        ");",
      ].join("\n"),
      "two literals in the same className, no helper": [
        "export const D = () => (",
        `  <span className={[\"${RETIRED_FILL}\", \"${RETIRED_INK}\"].join(\" \")}>x</span>`,
        ");",
      ].join("\n"),
      "a cn() call outside JSX": [
        `const recipe = cn("${RETIRED_FILL}", "${RETIRED_INK}");`,
      ].join("\n"),
    };

    for (const [shape, source] of Object.entries(splits)) {
      // The OLD unit — one set per string literal — genuinely does not see these. That is what
      // makes this a control rather than a restatement.
      const perLiteral = classChunks("fixture.tsx", source).map(utilitiesIn);
      expect(
        perLiteral.some((u) => u.has(RETIRED_FILL) && u.has(RETIRED_INK)),
        `${shape} should have been invisible to the per-literal unit`,
      ).toBe(false);

      // …and the ELEMENT unit catches every one of them.
      const perElement = classSetsForElements("fixture.tsx", source);
      expect(
        perElement.some((u) => u.has(RETIRED_FILL) && u.has(RETIRED_INK)),
        `${shape} evaded the per-element unit`,
      ).toBe(true);
    }
  });

  it("does not report two class strings that land on DIFFERENT elements (CR-01)", () => {
    // The other direction, which is what stops the widening becoming a wolf-crier. A fill on the
    // parent and an ink on the child are two elements and are not the retired pairing — the wizard's
    // legal survivor is exactly that shape inverted, and over-reporting here would make the pinned
    // count of 1 unmaintainable.
    const twoElements = [
      "export const E = () => (",
      `  <div className="${RETIRED_FILL}">`,
      `    <span className="${RETIRED_INK}">x</span>`,
      "  </div>",
      ");",
    ].join("\n");

    const sets = classSetsForElements("fixture.tsx", twoElements);
    expect(sets.some((u) => u.has(RETIRED_FILL) && u.has(RETIRED_INK))).toBe(false);
  });

  it("records the split-across-cva-slots shape as an OPEN gap, not a closed one (CR-01)", () => {
    // STATED BLIND SPOT, asserted so it cannot quietly become untrue in either direction.
    //
    // A `cva` base and one of its variants DO render together, so this shape is a real evasion. It
    // is not closed because closing it means unioning the base with EVERY variant — including
    // variants that are mutually exclusive by construction — and a gate that reports a pairing no
    // combination of props can produce teaches the next author that it cries wolf.
    //
    // This assertion exists so that the gap is a recorded decision rather than a comment nobody
    // re-checks. If a future change DOES close it, this test goes red and should be deleted along
    // with the blind-spot note in `classSetsForElements`.
    const cvaSplit = [
      "const badge = cva(",
      `  "inline-flex ${RETIRED_FILL}",`,
      `  { variants: { tone: { paid: "${RETIRED_INK}" } } },`,
      ");",
    ].join("\n");

    const sets = classSetsForElements("fixture.tsx", cvaSplit);
    expect(
      sets.some((u) => u.has(RETIRED_FILL) && u.has(RETIRED_INK)),
      "the cva base/variant split is now caught — delete this test and the blind-spot note",
    ).toBe(false);
  });

  it("does not accept a COMMENT naming the icon hue as the icon hue (CR-03)", () => {
    // NEGATIVE CONTROL for the stripped-source change, and the reason it exists is that the gate
    // was observed passing without it. `payout-banner.tsx`'s glyph was changed from
    //
    //     <CheckCircle2 className="size-3 text-success" aria-hidden="true" />
    // to
    //     {/* the hue used to be text-success here */}
    //     <CheckCircle2 className="size-3" aria-hidden="true" />
    //
    // and this file reported **18/18 passed** — both the four-call-site set equality and the
    // per-site `usesClass` were satisfied by the comment. The "Payouts enabled" badge became an
    // unhued glyph, which is precisely the colour-only-to-no-colour regression DS-10 exists to
    // prevent, and nothing in the suite noticed.
    //
    // The risk is not theoretical in that file: the prose above the glyph already explains "the
    // CheckCircle2 glyph that carries the hue". One edit that quotes the class instead of
    // describing it and the assertion would be permanently satisfied by documentation.
    const { icon } = STATUS_TONE_RECIPES.positive;

    const commentOnly = [
      `        {/* the hue used to be ${icon} here */}`,
      '        <CheckCircle2 className="size-3" aria-hidden="true" />',
    ].join("\n");
    const trailing = `        <CheckCircle2 className="size-3" /> // was ${icon}`;
    const lineComment = [
      `        // the glyph carries ${icon}`,
      '        <CheckCircle2 className="size-3" aria-hidden="true" />',
    ].join("\n");

    for (const evasion of [commentOnly, trailing, lineComment]) {
      // The raw text DOES contain the class — which is exactly why reading raw text was wrong.
      expect(usesClass(evasion, icon), `fixture must contain ${icon} raw`).toBe(true);
      expect(
        usesClass(stripComments(evasion), icon),
        `a comment naming ${icon} must not satisfy the icon check`,
      ).toBe(false);
    }

    // …and the REAL form must still be recognised, or this hardening would have deleted the check
    // rather than fixed it.
    const real = `        <CheckCircle2 className="size-3 ${icon}" aria-hidden="true" />`;
    expect(usesClass(stripComments(real), icon)).toBe(true);
  });

  it("reads the four pinned call sites from stripped code, and they still carry the hue (CR-03)", () => {
    // GUARD-THE-GUARD on the change itself. The negative control above proves a comment no longer
    // counts; this proves the stripper did not silently take the REAL hue with it, which would turn
    // the set equality into a different kind of lie. A scan whose `code` map came back empty would
    // satisfy neither.
    const { icon } = STATUS_TONE_RECIPES.positive;
    for (const site of POSITIVE_CALL_SITES) {
      const code = scan.code.get(site) ?? "";
      expect(code.length, `${site} produced no stripped code`).toBeGreaterThan(0);
      expect(
        usesClass(code, icon),
        `${site} does not carry ${icon} in stripped code — either the call site lost the hue, or the stripper ate it (compare against the raw file to tell which)`,
      ).toBe(true);
    }
  });

  it("does not accept an opacity-modified surface as the solid one (WR-09)", () => {
    // `bg-muted/40` is not `bg-muted`: different composite, different ratio. The tree already ships
    // the tinted form on `search-result-card.tsx`, so this is a live distinction, not a hypothetical.
    expect(utilitiesIn("group-hover:bg-muted/40").has("bg-muted")).toBe(false);
    expect(utilitiesIn("bg-muted").has("bg-muted")).toBe(true);
    expect(usesClass("group-hover:bg-muted/40", "bg-muted")).toBe(false);
    expect(usesClass("border-transparent bg-muted text-foreground", "bg-muted")).toBe(true);

    // The variant chain, by contrast, must NOT change the utility's identity.
    expect(utilitiesIn("data-[state=on]:bg-muted").has("bg-muted")).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// STATE-08 (plan 13-05) — WHAT A BOOKER MUST *READ* NEVER TRAVELS IN A TOAST
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// WHY THIS LIVES IN THE STATUS-VOCABULARY FILE. DS-10 above is a claim about the vocabulary a status
// is ALLOWED to use. This is a claim about the SURFACE a status outcome is allowed to arrive on, and
// 13-UI-SPEC § STATE-08 states it as one table with the tone table: terminal success is a full-page
// moment, non-terminal success is a toast, and anything the reader must actually READ — a money
// amount, a reduced headcount, a dead invite link — is an IN-PAGE ALERT. One file, one scan, one
// module-level pass; the `it()` blocks below only assert against it, exactly like the DS-10 half.
//
// WHAT MAKES A FACT "MUST-READ". A toast is dismissible, timed, unaddressable and gone on refresh.
// So the split is not about importance in the abstract — it is about whether the sentence carries a
// fact with MONEY or PLANS attached, which a booker will want to re-read after the animation is
// over. Three shipped `toast.success` calls carried exactly that and are the reason this scan exists:
// a cancellation's money-return sentence, an attendee removal's headcount, and a regenerated invite
// link. All three are STATE-08's own named examples.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// WHY AN AST SCAN AND NOT A GREP — two measured reasons, both from this phase
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
//   1. A GREP CANNOT TELL A TOAST FROM A PARAGRAPH. Every banned token here is a word the correct
//      copy is REQUIRED to use somewhere else in the same file: `cancel-confirm.tsx`'s destination
//      renders the money sentence, `attendee-roster.tsx` renders the headcount, `share-link-box.tsx`
//      renders the link. A source grep for those words reports the fix as the defect. The unit that
//      makes the rule expressible at all is "a string literal reachable from a `toast` call's
//      arguments", which is an AST question.
//   2. THE TWO WAYS THIS REPOSITORY HAS ALREADY WATCHED A TEXT GATE GO PERMANENTLY GREEN:
//        (a) A PROHIBITION CHECKED BY SUBSTRING MATCHES ITS OWN WARNING LABEL. Hit twice here. So
//            every banned token below is stored in TWO PIECES, split mid-word, joined at runtime —
//            `price-surface.test.ts:256-283`'s idiom — and the guard-the-guard fixtures are BUILT
//            from that encoding rather than written out. The plan's own acceptance criterion is a raw
//            grep for the voided-invite phrase over this file returning ZERO.
//
//            THE SAME ASYMMETRY THE DS-10 HALF RELIES ON, RESTATED FOR THIS SCAN. The walk roots at
//            the three `src/` trees, so `tests/` is outside its own reach and prose here cannot trip
//            it. The encoding is therefore not what keeps this file from self-tripping — the SCOPE
//            is. It earns its place for the OTHER audience: the human who greps the repository for
//            one of these tokens while deciding whether a sentence may ride a toast, and who must
//            not find the answer only inside the rule forbidding it. Where an incidental substring
//            survives below (`becoming`, and the payout state's own past tense in the DS-10 half) it
//            is a word this scan never reads.
//        (b) JSX ESCAPES APOSTROPHES. Plan 13-04 measured a tripwire that was green against a live
//            defect because `react/no-unescaped-entities` stores the sentence's apostrophe as
//            `&apos;` and the scan looked for `'`. `normaliseCopy` folds every spelling onto one
//            before anything is matched. No row below happens to contain an apostrophe TODAY, so
//            that pass is prophylactic rather than load-bearing — which is stated here rather than
//            claimed as coverage, and asserted directly so it cannot rot before the row that needs
//            it arrives.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// NOT COVERED — stated so the next reader under-trusts this scan
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//   • A RENAMED IMPORT. `import { toast as notify } from "sonner"` is invisible: the callee match is
//     on the identifier `toast`, syntactically. Closing it means resolving the import graph, which
//     is a type-checker's job rather than a source walk's. The repo's four toast call sites in scope
//     all use the plain name.
//   • A SENTENCE ASSEMBLED AT RUNTIME. `toast.success(messageFor(res))` carries no literal, so the
//     fact travels invisibly. That is the same safe-direction hole `price-surface.test.ts` records
//     for its phrase scan: it can miss a violation, it can never invent one. The one shape this scan
//     DOES follow is a literal reached through a conditional or a template, because that is the
//     shape the cancellation toast actually shipped in — see the fixtures.
//   • WHETHER THE REPLACEMENT ALERT IS ANY GOOD. This scan proves the fact LEFT the toast. That it
//     ARRIVED somewhere addressable is `tests/group/state08-alerts.test.tsx`'s claim, and the
//     cancellation's destination is the booking detail page's own cancelled branch.
//   • `src/app/(app)/bookings/**` CONTRIBUTES ZERO TOAST CALLS TODAY. It is in the scanned set
//     because 13-UI-SPEC names it, and the guard below asserts the walk REACHES it (a non-zero file
//     count) rather than pretending its silence is coverage.

/** The identifier every scanned call hangs off, spelled once so the fixtures cannot drift from it. */
const TOAST_CALLEE = "toast";

/**
 * The three trees 13-UI-SPEC § STATE-08 makes its claim over.
 *
 * Forward slashes, always — `label()` above normalises `path.relative`'s Windows backslashes, and
 * without that every membership test here silently stops matching.
 */
const TOAST_SCAN_ROOTS = [
  "src/app/(app)/bookings",
  "src/components/booking",
  "src/components/group",
] as const;

/**
 * THE ONE ALLOW-LISTED FILE, AND ITS REASON. A row without a reason is not a row.
 *
 * `share-link-box.tsx`'s two toasts are the positive half of STATE-08's split rather than an
 * exception to it: `Link copied` and its copy-failure twin announce PLUMBING — whether a clipboard
 * write happened — and the fact the organiser needs is the link itself, which is rendered in a
 * `readOnly` input directly beneath and survives every refresh. Nothing in either sentence is a fact
 * to retain, so a timed, dismissible surface is the correct one. (It is also, structurally, the only
 * confirmation the organiser gets that `Copy link` worked.)
 */
const TOAST_ALLOW_LIST: Readonly<Record<string, string>> = {
  "src/components/group/share-link-box.tsx":
    "Its toasts announce whether the clipboard write happened, which is plumbing. The fact the " +
    "organiser needs — the link — is rendered in the read-only field beneath them and survives a " +
    "refresh, so nothing in either sentence is a fact to retain.",
};

/** A banned token, in two pieces, with the reason it may not ride a toast. */
type MustReadToken = {
  /** Split mid-word so neither fragment reads as the token. Joined at runtime, never written. */
  readonly pieces: readonly [string, string];
  /** WHY. Travels into the failure message — a row without a reason is not a row. */
  readonly why: string;
};

/**
 * THE MUST-READ VOCABULARY.
 *
 * Six of these are 13-UI-SPEC § STATE-08's falsifiable list verbatim. The seventh is plan 13-05's
 * own addition and is marked as such: the spec's six do not reach the third violation the same
 * paragraph names, which is recorded on the row rather than left for the next reader to re-derive.
 *
 * The currency sign cannot be split mid-word — it is ONE character — so it is built from its code
 * point instead. That achieves the same property for the same reason: the glyph never appears in this
 * file, so a search for it here cannot be satisfied by the rule forbidding it. Its row is the reason
 * the "is it really split" assertion below is scoped to multi-character tokens.
 */
const MUST_READ_TOKENS: readonly MustReadToken[] = [
  {
    pieces: ["ref", "und"],
    why:
      "a money-return fact. It is the single most re-read sentence in the whole cancellation flow, " +
      "and a booker who dismissed the toast has no way back to it. STATE-08 names it first; it " +
      "belongs on the destination — the booking detail page's cancelled branch — where D-79's " +
      "wording is durable and addressable.",
  },
  {
    pieces: [String.fromCharCode(0x20b1), ""],
    why:
      "an amount of money. Whatever sentence carries it, a figure the booker may be reconciling " +
      "against their own bank app cannot be delivered by a surface that removes itself on a timer.",
  },
  {
    pieces: ["sp", "ot"],
    why:
      "a capacity fact — how many places are free. It changes who the organiser can still invite, " +
      "which is a plan rather than a notification, and it belongs beside the roster and the meter " +
      "that state the same numbers.",
  },
  {
    pieces: ["com", "ing"],
    why:
      "a headcount. STATE-08's second named example: the number of people who will be in the room " +
      "is the whole reason the organiser opened the page, and it must be re-readable after a refresh.",
  },
  {
    pieces: ["no lon", "ger works"],
    why:
      "the voided-invite sentence. STATE-08's third named example: an organiser who missed it will " +
      "keep sharing a dead link, and there is no second announcement to catch them.",
  },
  {
    pieces: ["inv", "ite"],
    why:
      "the invite credential's own vocabulary. Anything a toast says about the invite link is a " +
      "fact about what the organiser may still share, which outlives the toast by definition.",
  },
  {
    pieces: ["new l", "ink"],
    why:
      "PLAN 13-05'S ADDITION, NOT ONE OF 13-UI-SPEC'S SIX — and the row exists because the six do " +
      "not reach the very violation the same paragraph names. The shipped regenerate toast said the " +
      "fresh credential was ready and to share it again; it contained none of the other six tokens, " +
      "so a scan built from the spec's list alone would have gone green against one of STATE-08's " +
      "three own examples (measured, not predicted — the first run of this scan named three files " +
      "and that one was not among them). Announcing a freshly minted credential is a must-read fact " +
      "for the same reason announcing the dead one is: it decides what the organiser shares next.",
  },
];

/**
 * Fold every spelling of an apostrophe onto one, and lower-case. See reason (2b) in the header:
 * without this a scan is green against a sentence whose apostrophe is an HTML entity, which plan
 * 13-04 measured rather than predicted.
 */
function normaliseCopy(text: string): string {
  return text
    .replace(/&apos;|&#0*39;|&#x0*27;|&rsquo;|[‘’ʼ]/gi, "'")
    .toLowerCase();
}

/** One string reachable from a `toast` call's arguments. */
type ToastLiteral = {
  readonly file: string;
  readonly line: number;
  /** `toast` or `toast.<member>` — carried into the failure so the shape is visible in the message. */
  readonly callee: string;
  readonly text: string;
};

type ToastScan = {
  /** Every `.ts`/`.tsx` file the walk visited, normalised. */
  readonly files: string[];
  /** The same, partitioned by declared root, so a root that reached nothing is loud. */
  readonly filesByRoot: Readonly<Record<string, string[]>>;
  /** Every `toast` / `toast.*` call expression found, literal-bearing or not. */
  readonly calls: { file: string; line: number; callee: string }[];
  /** Every string reachable from one of those calls' arguments. */
  readonly literals: ToastLiteral[];
};

/**
 * Collect every `.ts`/`.tsx` file under a directory, recursively — and return what it has when the
 * directory is unreadable rather than raising.
 *
 * `collectSourceFiles` above throws on a missing root, which for a DECLARED root list is the wrong
 * failure: a renamed directory would surface as a stack trace burying which gate went quiet, instead
 * of as the empty-root assertion below naming it. 11-02's rule.
 */
function collectSourceFilesSafe(dir: string, out: string[] = []): string[] {
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) collectSourceFilesSafe(full, out);
      else if (/\.tsx?$/.test(entry.name)) out.push(full);
    }
  } catch {
    return out;
  }
  return out;
}

/**
 * Every `toast` / `toast.*` call in one file, and every string literal reachable from its arguments.
 *
 * THE ARGUMENT WALK IS RECURSIVE, and that is the whole difference between this and a one-line
 * `node.arguments.filter(isStringLiteral)`. The cancellation toast shipped as
 *
 *     toast.success(condition ? "…the money sentence…" : "Booking cancelled.")
 *
 * — a conditional expression whose literals are two levels down. Template spans are collected for the
 * same reason: an interpolated amount is exactly how a figure re-enters a toast after this scan
 * exists. `JsxText` is collected because `sonner` accepts a ReactNode, so `toast.success(<p>…</p>)`
 * is a real shape and would otherwise be a hole with a two-character cost to close.
 */
function readToastCalls(file: string, source: string): {
  calls: { file: string; line: number; callee: string }[];
  literals: ToastLiteral[];
} {
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const calls: { file: string; line: number; callee: string }[] = [];
  const literals: ToastLiteral[] = [];

  const lineOf = (node: ts.Node): number =>
    sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  /** `toast` / `toast.<member>`, or `null` for every other callee. */
  const calleeOf = (node: ts.CallExpression): string | null => {
    const target = node.expression;
    if (ts.isIdentifier(target)) return target.text === TOAST_CALLEE ? TOAST_CALLEE : null;
    if (
      ts.isPropertyAccessExpression(target) &&
      ts.isIdentifier(target.expression) &&
      target.expression.text === TOAST_CALLEE
    ) {
      return `${TOAST_CALLEE}.${target.name.text}`;
    }
    return null;
  };

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = calleeOf(node);
      if (callee !== null) {
        calls.push({ file, line: lineOf(node), callee });
        const collect = (n: ts.Node): void => {
          if (
            ts.isStringLiteral(n) ||
            ts.isNoSubstitutionTemplateLiteral(n) ||
            ts.isTemplateHead(n) ||
            ts.isTemplateMiddle(n) ||
            ts.isTemplateTail(n) ||
            ts.isJsxText(n)
          ) {
            literals.push({ file, line: lineOf(n), callee, text: n.text });
          }
          ts.forEachChild(n, collect);
        };
        for (const arg of node.arguments) collect(arg);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return { calls, literals };
}

/** Scanned ONCE at module level; every `it()` below only asserts against this result. */
function scanToasts(roots: readonly string[]): ToastScan {
  const filesByRoot: Record<string, string[]> = {};
  const files: string[] = [];
  const calls: { file: string; line: number; callee: string }[] = [];
  const literals: ToastLiteral[] = [];

  for (const root of roots) {
    const found = collectSourceFilesSafe(resolve(process.cwd(), root)).map(label);
    filesByRoot[root] = found;
    for (const name of found) {
      files.push(name);
      const read = readToastCalls(name, readFileSync(resolve(process.cwd(), name), "utf8"));
      calls.push(...read.calls);
      literals.push(...read.literals);
    }
  }

  return { files, filesByRoot, calls, literals };
}

/**
 * Every must-read token riding a toast literal, as `file:line — callee(…) — why`.
 *
 * Allow-listed files are skipped WHOLE rather than per-token: the allow-list's unit is "this file's
 * toasts carry no fact to retain", which is a statement about the file, and a per-token exemption
 * would be a second, weaker vocabulary nobody declared.
 */
function mustReadToastViolations(literals: readonly ToastLiteral[]): string[] {
  const hits: string[] = [];
  for (const literal of literals) {
    if (Object.prototype.hasOwnProperty.call(TOAST_ALLOW_LIST, literal.file)) continue;
    const haystack = normaliseCopy(literal.text);
    for (const token of MUST_READ_TOKENS) {
      if (haystack.includes(normaliseCopy(token.pieces.join("")))) {
        hits.push(`${literal.file}:${literal.line} — ${literal.callee}(…) — ${token.why}`);
      }
    }
  }
  return hits;
}

const toasts = scanToasts(TOAST_SCAN_ROOTS);

describe("STATE-08 — the toast scan reaches what it claims to police", () => {
  it("walked every declared root, and none of them came back empty", () => {
    // GUARD-THE-GUARD, asserted FIRST. The real assertion below is `toEqual([])`, which a scan over
    // nothing satisfies perfectly. A renamed route group — `(app)` is exactly the kind of path a
    // restructure moves — would empty a root silently, and `collectSourceFilesSafe` deliberately
    // does not raise on it.
    const barren = TOAST_SCAN_ROOTS.filter((root) => toasts.filesByRoot[root].length === 0);
    expect(
      barren,
      "a declared root contributed no source files at all. Either the directory moved (move this " +
        "declaration in the same commit) or the walk is broken — and both look identical to a " +
        "passing ban.",
    ).toEqual([]);
  });

  it("found a non-zero number of `toast` calls across the three roots", () => {
    // THE POSITIVE CONTROL the plan requires. Files being present is not the same as toasts being
    // reachable: a callee matcher that matched nothing would give every ban below a perfect green.
    expect(
      toasts.calls.length,
      "the scan found no toast call anywhere in the three roots. The tree ships several, so this " +
        "means the callee matcher stopped matching — a vacuous green, not a clean one.",
    ).toBeGreaterThan(0);

    // …and it reached BOTH component trees by name, so a walk that quietly covered one of them
    // cannot read as coverage of both.
    const filesWithToasts = new Set(toasts.calls.map((call) => call.file));
    expect([...filesWithToasts].some((f) => f.startsWith("src/components/booking/"))).toBe(true);
    expect([...filesWithToasts].some((f) => f.startsWith("src/components/group/"))).toBe(true);

    // THE HONEST HALF: `src/app/(app)/bookings/**` carries no toast call today. Its inclusion is
    // 13-UI-SPEC's, and what this scan can truthfully say about it is that the walk REACHED it.
    expect(toasts.filesByRoot["src/app/(app)/bookings"].length).toBeGreaterThan(0);
  });

  it("every allow-listed file exists, still has toasts, and carries its reason", () => {
    // An allow-list row for a file with no toasts is not an exemption, it is a lie that reads like
    // one — and it is how an allow-list outlives the thing it was excusing.
    for (const [file, why] of Object.entries(TOAST_ALLOW_LIST)) {
      expect(toasts.files, `${file} is allow-listed but was never scanned`).toContain(file);
      expect(
        toasts.calls.some((call) => call.file === file),
        `${file} is allow-listed but carries no toast call — delete the row`,
      ).toBe(true);
      expect(why.length, `${file}'s allow-list row has no reason`).toBeGreaterThan(40);
    }

    // EXACTLY ONE, per 13-UI-SPEC § STATE-08. The number is the record of a decision: a second
    // allow-listed file is a second surface that decided its fact was not worth re-reading.
    expect(Object.keys(TOAST_ALLOW_LIST)).toHaveLength(1);
  });

  it("every banned token declares a reason, and no fragment reads as the token", () => {
    for (const token of MUST_READ_TOKENS) {
      expect(token.why.length, `${JSON.stringify(token.pieces)} has no reason`).toBeGreaterThan(40);
      const whole = token.pieces.join("");
      expect(whole.length, "an empty token matches every literal").toBeGreaterThan(0);
      // Neither half may be the whole — that is what makes the encoding an encoding rather than a
      // formality, and it is the property that keeps this file's own grep at zero.
      //
      // SCOPED TO MULTI-CHARACTER TOKENS, and that exemption is exactly one row wide: a token that
      // IS one character cannot be split at all, so it is built from its code point instead and the
      // glyph never appears here either way. Asserting the exemption's size is what stops it
      // becoming the hole every future row is written through.
      if (whole.length === 1) {
        expect(
          MUST_READ_TOKENS.filter((t) => t.pieces.join("").length === 1),
          "more than one single-character token. The split-mid-word rule is waived for exactly one " +
            "row (the currency sign, which has nothing to split); a second is a rule quietly relaxed.",
        ).toHaveLength(1);
        continue;
      }
      for (const piece of token.pieces) {
        if (piece.length === 0) continue;
        expect(
          normaliseCopy(piece) === normaliseCopy(whole),
          `${JSON.stringify(token.pieces)} is not really split — one piece IS the token`,
        ).toBe(false);
      }
    }
  });

  it("finds a banned token when there IS one — plain, ternary, template and JSX shapes", () => {
    // Every fixture is BUILT from the encoding, so this file still never spells a banned token.
    for (const token of MUST_READ_TOKENS) {
      const needle = token.pieces.join("");
      const source = `export const A = () => ${TOAST_CALLEE}.success("a ${needle} sentence");`;
      const found = mustReadToastViolations(readToastCalls("fixture.tsx", source).literals);
      expect(
        found,
        `the row encoded as ${JSON.stringify(token.pieces)} matched nothing`,
      ).toHaveLength(1);
      expect(found[0]).toContain("fixture.tsx:1");
      expect(found[0]).toContain(`${TOAST_CALLEE}.success`);
    }

    const money = MUST_READ_TOKENS[0].pieces.join("");

    // THE SHIPPED SHAPE. The cancellation toast's literals sat inside a conditional expression, two
    // levels below the argument — the exact reason the argument walk is recursive.
    const ternary =
      `export const B = () => ${TOAST_CALLEE}.success(n > 0 ? "your ${money} is on its way" : "ok");`;
    expect(mustReadToastViolations(readToastCalls("t.tsx", ternary).literals)).toHaveLength(1);

    // An interpolated figure — the way a number re-enters a toast after this scan exists.
    const template =
      "export const C = () => " + TOAST_CALLEE + ".success(`${amount} " + money + " on its way`);";
    expect(mustReadToastViolations(readToastCalls("t.tsx", template).literals)).toHaveLength(1);

    // A ReactNode toast. `sonner` accepts one, so this is a shape rather than a hypothetical.
    const jsx = `export const D = () => ${TOAST_CALLEE}.success(<p>your ${money} is on its way</p>);`;
    expect(mustReadToastViolations(readToastCalls("t.tsx", jsx).literals)).toHaveLength(1);

    // The bare-call form, which is `sonner`'s default export shape.
    const bare = `export const E = () => ${TOAST_CALLEE}("your ${money} is on its way");`;
    expect(mustReadToastViolations(readToastCalls("t.tsx", bare).literals)).toHaveLength(1);
  });

  it("does NOT report the same sentence outside a toast call — it is a scan, not a grep", () => {
    // THE OTHER DIRECTION, and the reason this is an AST scan at all. Every banned token is a word
    // the CORRECT copy is required to use in the same file: the in-page alert states the headcount,
    // the detail page states the money sentence, the share box renders the link. A grep reports the
    // fix as the defect.
    const money = MUST_READ_TOKENS[0].pieces.join("");

    const paragraph = `export const A = () => <p>Your ${money} is on its way.</p>;`;
    expect(mustReadToastViolations(readToastCalls("t.tsx", paragraph).literals)).toEqual([]);

    // A different notifier with the same argument is not a toast, and must not be reported as one.
    const other = `export const B = () => notify.success("your ${money} is on its way");`;
    expect(mustReadToastViolations(readToastCalls("t.tsx", other).literals)).toEqual([]);

    // …and a clean toast is clean, so the scanner is not simply always positive.
    const clean = `export const C = () => ${TOAST_CALLEE}.success("Booking cancelled.");`;
    expect(mustReadToastViolations(readToastCalls("t.tsx", clean).literals)).toEqual([]);
  });

  it("folds every apostrophe spelling before matching — 13-04's measured failure, pre-empted", () => {
    // NO ROW ABOVE CONTAINS AN APOSTROPHE TODAY, so this pass is prophylactic and says so. It is
    // asserted directly rather than through a fixture because the alternative — inventing a row that
    // needs it — would be a gate written to make its own helper look load-bearing.
    //
    // What 13-04 measured: the banned sentence renders as `haven&apos;t` in source, so a scan for the
    // plain-apostrophe spelling matched nothing and reported a clean file. Every spelling below is
    // one a formatter, a linter or a copy-paste can produce.
    for (const spelling of ["&apos;", "&#39;", "&#x27;", "&rsquo;", "’", "‘", "ʼ"]) {
      expect(normaliseCopy(`don${spelling}t`), spelling).toBe("don't");
    }
    // …and it lower-cases, so a capitalised sentence cannot dodge a lower-case row.
    expect(normaliseCopy("REFUSED")).toBe("refused");
  });
});

describe("STATE-08 — no toast in the phase-13 file set carries a must-read fact", () => {
  it("carries none of the must-read vocabulary, outside the one allow-listed file", () => {
    expect(
      mustReadToastViolations(toasts.literals),
      "a toast is carrying a fact the booker has to READ. A toast is dismissible, timed, " +
        "unaddressable and gone on refresh; a money amount, a headcount and a dead invite link are " +
        "none of those things (STATE-08, D-93). The fix is never to re-word the toast — it is to " +
        "move the fact onto an in-page alert (`PanelCard tone=\"muted\"` + `role=\"status\"` + a " +
        "non-empty accessible name) or onto the destination the flow navigates to, and to leave the " +
        "toast carrying nothing anyone needs to keep. Two regions announcing one outcome is " +
        "GATE-03 rule 6's defect, so the alert REPLACES the toast rather than joining it.",
    ).toEqual([]);
  });
});
