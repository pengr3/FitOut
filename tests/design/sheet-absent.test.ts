// RESP-01 — THE ABSENCE THAT THE OVERLAY DECISION CREATED, ASSERTED WITH ITS REASON.
//
// Three claims, and none of them is about a component behaving correctly: the shadcn `sheet` block
// was NOT installed, `--z-sheet` has zero call sites, and the sheet's height cap is written in the
// dynamic viewport unit. All three are facts about the tree, which is why they live in a source gate
// rather than in a render test.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY AN ABSENCE NEEDS A PERMANENT TEST
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `scaffold-residue.test.ts:16-20` states the rule for a deletion — *"a deletion has no symptom"* —
// and a NON-INSTALLATION has even less of one. Nothing in this repository is worse for `sheet` never
// having been fetched; no build fails, no type is missing, no screen is blank. The only trace of the
// decision is prose in three documents, and prose is what gets overridden by the next person who
// reads `FEATURES.md` F1 (*"Install `sheet` and adopt it as the one mobile-overlay primitive"*)
// without reading `ARCHITECTURE.md` §6.3 (*"Do not add shadcn `sheet` alongside `dialog` — two
// focus-trap implementations, two escape behaviours, and two sets of baselines for one concept"*).
//
// Those two approved documents flatly contradict each other. The tiebreak is the ROADMAP's own Phase
// 16 dependency line, which names the deliverable — *"Depends on … Phase 11's responsive-dialog
// pattern."* This file is where that resolution becomes mechanical: `npx shadcn add sheet` now fails
// the build, and the failure message says why rather than leaving the next reader to rediscover the
// contradiction.
//
// T-11-FOCUSTRAP is the security-shaped half of that. Two overlay mechanisms mean two focus traps and
// two escape behaviours, and a focus trap that can be escaped by tabbing into the other one is an
// accessibility denial-of-service on a booking flow. One primitive is the mitigation; AC#26 is what
// keeps it one.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// AC#28 WAS UNSATISFIABLE AS ORIGINALLY WRITTEN, AND THE CORRECTION IS RECORDED RATHER THAN QUIET
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The criterion's original wording banned the SUBSTRING `vh]` from `responsive-dialog.tsx`. The class
// the very same criterion MANDATES is `max-h-[85dvh]`, and `dvh]` ends in `vh]` — so a literal
// `expect(source).not.toContain("vh]")` goes RED against the correct implementation and GREEN only if
// the file adopts the unit that clips the sheet's footer on iOS Safari. A gate that fails on correct
// code and passes on the defect is this phase's named failure mode arriving from the opposite
// direction, and it is a repudiation risk (T-11-CRITFAIL): the obvious fix for that red is to weaken
// or delete the check, which loses the assertion entirely.
//
// The corrected form is a BOUNDED regex — `/\[\d+vh\]/`, which requires the digits to be followed
// immediately by `vh]` — plus the positive half, `source.includes("[85dvh]")`. Both directions are
// self-tested below against fixtures, including a runnable demonstration that the original wording
// really would have gone red. That demonstration is the point: a correction argued in prose is a
// claim, and a correction that fails its own assertion is a fact.
//
// A SECOND-ORDER CONSEQUENCE, MEASURED THE HARD WAY DURING THIS PLAN. Because AC#28 scans the SOURCE
// of `responsive-dialog.tsx`, the comment in that file explaining why the legacy unit is wrong cannot
// QUOTE the legacy unit. The first draft did, and the plan's own probe reported `bare vh unit`
// against a file whose implementation was already correct — the fifth instance of this shape in Phase
// 11 (11-07's two, 11-08's three, and this). The fix is the repo's standing precedent from
// `booking-row.tsx:112`: name the banned thing DESCRIPTIVELY and say in the comment why it is named
// that way.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — FOUR WAYS, ALL REAL (13 August 2026). GREEN IS 18 PASSED.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A gate that has never been watched failing is not a gate (`tests/design/infra.test.ts:5-9`).
// Command for all four:
// `npx vitest run --config vitest.design.config.ts tests/design/sheet-absent.test.ts`
//
//   (a) THE BLOCK ARRIVES. An empty `src/components/ui/sheet.tsx` created. 1 failed / 17 passed:
//
//         FAIL  … > AC#26 — the shadcn `sheet` block was not installed > has no
//               `src/components/ui/sheet.tsx`
//         AssertionError: src/components/ui/sheet.tsx EXISTS. The shadcn `sheet` block is not
//         installed in this repo and adding it is a REVERSAL of a recorded decision, not a bug fix:
//         FEATURES.md F1 asks for it, ARCHITECTURE.md §6.3 refuses it, and the roadmap's Phase 16
//         dependency line ("Phase 11's responsive-dialog pattern") breaks the tie. Two overlay
//         mechanisms mean two focus traps and two escape behaviours (T-11-FOCUSTRAP). The one
//         primitive is src/components/patterns/responsive-dialog.tsx.: expected true to be false
//
//       The whole recorded decision travels in the failure message, because the person who just ran
//       `npx shadcn add sheet` is exactly the person who has not read the three documents.
//       Deleted → 18 passed.
//
//   (b) THE TOKEN GETS A HOME. `z-(--z-sheet)` prepended to the wrapper `<div>`'s className in
//       `src/components/patterns/empty-state.tsx`. 1 failed / 17 passed:
//
//         FAIL  … > AC#27 — `--z-sheet` has zero call sites, in both consumption forms > finds zero
//               POSITIVE call sites under src/app/** and src/components/**
//         AssertionError: expected [ Array(1) ] to deeply equal []
//         - []
//         + [
//         +   "src/components/patterns/empty-state.tsx:140 — z-(--z-sheet)",
//         + ]
//
//       File, LINE and the matched form — "the token has a call site somewhere" is not an
//       actionable failure. Reverted with `git checkout --` → 18 passed.
//
//   (c) THE UNIT REGRESSES. `max-sm:max-h-[85dvh]` changed to `max-sm:max-h-[85vh]` in
//       `responsive-dialog.tsx`. 2 failed / 16 passed — BOTH halves of AC#28 fire, which is the
//       point of asserting the positive alongside the negative:
//
//         FAIL  … > AC#28 … > contains no bare viewport-height unit
//         AssertionError: src/components/patterns/responsive-dialog.tsx contains a bare
//         viewport-height unit: ["[85vh]"]. On iOS Safari that unit measures the URL-bar-retracted
//         viewport, so the sheet is taller than the visible area and the part clipped is the BOTTOM
//         — where the footer and its confirm button live.: expected true to be false
//
//         FAIL  … > AC#28 … > DOES cap at `[85dvh]` — the negative half alone is satisfied by no cap
//         AssertionError: src/components/patterns/responsive-dialog.tsx no longer contains
//         `[85dvh]`. The negative half of this criterion is satisfied by a file with NO height cap
//         at all, which is why the positive half is asserted beside it.: expected false to be true
//
//       Reverted → 18 passed.
//
//   (d) GUARD-THE-GUARD — THE PROBE WORTH READING. `SRC_DIR` re-pointed at `src-nope`, a directory
//       that does not exist. 3 failed / 15 passed:
//
//         FAIL  … > guard-the-guard … > opened at least 50 files under src/components/**
//         AssertionError: the scanner found 0 files under src/components/**. Every zero above is
//         green against a scan that opened nothing, and an absence assertion cannot notice it was
//         handed an empty list.: expected 0 to be greater than or equal to 50
//
//         FAIL  … > guard-the-guard … > reaches both halves of the gate tree, and the two files this
//               plan is about
//         AssertionError: expected false to be true
//
//         FAIL  … > AC#27 … > keeps the reason beside the declaration, where the next reader will be
//               (an ENOENT on src-nope/app/globals.css — an incidental third failure, recorded
//               rather than tidied away, because it is a read and not an assertion about the scan)
//
//       THE TWO ZERO-CALL-SITE ASSERTIONS PASSED, AND SO DID THE EMPTY-INVENTORY ONE. Over a tree
//       the scanner never opened, all three reported a perfectly clean result — indistinguishable
//       from a real clean run, and it would stay that way forever. An absence assertion cannot
//       notice that it was handed nothing; only a positive control over the scan can. That is the
//       whole argument for the file floor, and it is the same measurement
//       `selector-contract.test.ts` probe (d) recorded. Reverted → 18 passed.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • THIS FILE PROVES THE BLOCK WAS NOT INSTALLED. It cannot prove the responsive dialog BEHAVES
//     correctly at either breakpoint — that the sheet actually anchors to the bottom edge below
//     640px, that the centred dialog is pixel-identical above it, that focus is trapped, that
//     `Escape` closes it, or that the close button is reachable. Nothing reachable from a DB-free
//     source scan can say any of that. Plan `11-21`'s `/dev/theme` sections render it at both widths
//     and plan `11-22`'s Playwright baselines photograph it.
//   • The call-site scan reads authored SOURCE with comments stripped. A `z-(--z-sheet)` composed at
//     runtime (a template with a substitution, a class from a `cva` variant map keyed by a prop) is
//     invisible to it. That is the safe direction for a BAN — it can miss a violation, never invent
//     one — but it is a real hole.
//   • `Z_SHEET_INVENTORY` being empty is a DECLARATION that matches the scan today. If a future plan
//     legitimately gives the step a home, the honest change is to add a row WITH ITS REASON and let
//     the scan agree with it — not to delete the inventory.
//   • Nothing here checks that `--z-sheet: 20` still sits strictly between the sticky and dialog
//     steps. `elevation-z.test.ts` owns the scale's ordering and its per-theme absence; this file
//     only asserts the step is still declared at all.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, join, relative } from "node:path";

import { stripComments } from "./helpers/strip-comments";
import { readGlobalTokens } from "./helpers/compile-css";

const SRC_DIR = resolve(process.cwd(), "src");

/** The one overlay primitive, and the block that must never sit beside it. */
const SHEET_BLOCK = "src/components/ui/sheet.tsx";
const OVERLAY_PRIMITIVE = "src/components/patterns/responsive-dialog.tsx";

/** DS-03's stated tree, and the tree AC#27 is written about. */
const GATE_TREE = ["src/app/", "src/components/"] as const;

/**
 * The scanner must open at least this many files under `src/components/**` before a zero means
 * anything. 50 is well under the real count (~100) and well over any plausible partial scan.
 */
const MIN_COMPONENT_FILES = 50;

/**
 * EVERY LEGITIMATE `--z-sheet` CALL SITE, WITH THE REASON IT IS ONE. It is EMPTY, and that is the
 * assertion — the `EXCLUDED_PAIRS` shape from `src/lib/design/contrast-pairs.ts:34-36`, where a row
 * without a reason is not a row.
 *
 * WHY THE STEP IS EMPTY, IN ONE SENTENCE: RESP-01's mobile overlay is the vendored dialog in another
 * PRESENTATION rather than a second mechanism, so it renders at `--z-dialog` (30) at every viewport
 * width and never at this step. `src/app/globals.css` carries the same sentence beside the token
 * declaration itself, because the reader who is about to give the step a home is reading the
 * stylesheet, not this file.
 *
 * WHY THE TOKEN IS NOT SIMPLY DELETED: Phase 12's mobile filters and booking rail may yet need a
 * layer strictly below the dialog and above the sticky header, which is precisely the gap 20 fills.
 * Deleting a declared step and re-adding it later is a scale that has changed shape twice; keeping it
 * with an asserted zero is a scale that has held.
 *
 * This is the precedent 10-12 set for `shadow-sticky` and 10-16 then moved when a real exerciser
 * appeared. If a Phase 12 surface genuinely needs this layer, this map gains a row with its reason,
 * in that plan's own commit — the same mechanism, deliberately.
 *
 * PHASE 12 EXAMINED THE STEP AND DECLINED IT (plan 12-01). That is the successor sentence above,
 * ANSWERED rather than left open, and it is mirrored here from `globals.css` so a reader meets the
 * finding AT THE GATE instead of only in a stylesheet comment. All three candidates resolved
 * elsewhere, each for a reason:
 *   • the booking sheet IS `ResponsiveDialog`, so it renders at `--z-dialog` — 11-09's prediction,
 *     confirmed by the surface that was supposed to need the step;
 *   • the photo lightbox is a dialog too, so it is the same answer rather than a second one;
 *   • both sticky bars are `z-(--z-sticky)` and are therefore CORRECTLY beneath the sheet's scrim —
 *     a bottom bar floating above the overlay would claim the page is interactive while the sheet
 *     says it is not.
 * The zero is therefore a CONTRACT that has now survived the phase most likely to break it, not an
 * accident nobody re-checked.
 */
const Z_SHEET_INVENTORY: Record<string, string> = {};

/**
 * The POSITIVE consumption form. `z-(--z-sheet)` is the only spelling Tailwind v4 compiles — a bare
 * `z-sheet` emits nothing at all, which `elevation-z.test.ts` asserts directly.
 *
 * The `(?<![\w-])` lookbehind is 10-12's rule and does two jobs here. It excludes the `--z-sheet:`
 * TOKEN DECLARATION in `globals.css` and every `var(--z-sheet)` reference to it — the contract this
 * scan polices, not a call site of it. And because `-` is inside the character class, it also
 * excludes the NEGATIVE form, so the two inventories below stay genuinely independent.
 */
const Z_SHEET_POSITIVE = /(?<![\w-])z-\(--z-sheet\)/g;

/**
 * The NEGATIVE consumption form, counted as its own inventory.
 *
 * 10-13 established that a negative form is its own thing rather than a variant of the positive one:
 * the two "or" dividers on login and signup are `-z-(--z-sticky)` and MUST stay negative, and a scan
 * that folded the signs together would have read a sign inversion on the two highest-traffic
 * unauthenticated pages in the app as no change at all. The same distinction is drawn here BEFORE
 * either form has a call site, so it cannot be forgotten at the moment one appears.
 */
const Z_SHEET_NEGATIVE = /(?<![\w-])-z-\(--z-sheet\)/g;

/** The bounded form of AC#28's ban — see the header for why the substring form was wrong. */
const BARE_VIEWPORT_HEIGHT = /\[\d+vh\]/;

/** Collect every `.ts` / `.tsx` / `.css` file under a directory. The walker from `elevation-z`. */
function collectSourceFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectSourceFiles(full, out);
    else if (/\.(tsx?|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * WINDOWS PATH NORMALISATION — `focus-recipe.test.ts:89`'s idiom, load-bearing rather than cosmetic.
 * `path.relative` emits backslashes on this box while every path written in this file is
 * forward-slash; without this line the prefix filters below stop matching and every zero passes
 * vacuously.
 */
function label(file: string): string {
  return relative(process.cwd(), file).split("\\").join("/");
}

type SheetScan = {
  /** Every file the walker opened, normalised. */
  scanned: string[];
  /** The subset under `src/components/**` — what the file floor is asserted against. */
  componentFiles: string[];
  /** The subset under DS-03's stated tree. */
  gateFiles: string[];
  /** `file:line — match` for every POSITIVE call site in non-comment source. */
  positive: string[];
  /** `file:line — match` for every NEGATIVE call site in non-comment source. */
  negative: string[];
};

/**
 * Scan a tree for both consumption forms.
 *
 * Takes the directory as a PARAMETER rather than closing over `SRC_DIR` so the vacuity probe (d) is a
 * one-line edit, and so the both-directions self-tests below run the SAME code path the real
 * assertions run — `leak.test.ts:208-212`'s rule.
 */
function scanFor(dir: string): SheetScan {
  const scan: SheetScan = {
    scanned: [],
    componentFiles: [],
    gateFiles: [],
    positive: [],
    negative: [],
  };

  for (const file of collectSourceFiles(dir)) {
    const name = label(file);
    scan.scanned.push(name);
    if (name.startsWith("src/components/")) scan.componentFiles.push(name);
    if (GATE_TREE.some((prefix) => name.startsWith(prefix))) scan.gateFiles.push(name);

    // Comments stripped FIRST. `globals.css` and `responsive-dialog.tsx` both explain this token's
    // zero in prose, and a scan that counted prose would demand they stop explaining themselves.
    const lines = stripComments(readFileSync(file, "utf8")).split("\n");
    lines.forEach((line, index) => {
      for (const m of line.matchAll(Z_SHEET_POSITIVE)) {
        scan.positive.push(`${name}:${index + 1} — ${m[0]}`);
      }
      for (const m of line.matchAll(Z_SHEET_NEGATIVE)) {
        scan.negative.push(`${name}:${index + 1} — ${m[0]}`);
      }
    });
  }

  return scan;
}

/** Scanned ONCE at module level; the `it()` blocks below only assert against this result. */
const scan = scanFor(SRC_DIR);
const globals = readGlobalTokens();

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// GUARD-THE-GUARD FIRST, on purpose: every zero below is worthless if the scan opened nothing.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("guard-the-guard — the scanner read the tree it is asserting about", () => {
  it(`opened at least ${MIN_COMPONENT_FILES} files under src/components/**`, () => {
    expect(
      scan.componentFiles.length,
      `the scanner found ${scan.componentFiles.length} files under src/components/**. Every zero ` +
        `above is green against a scan that opened nothing, and an absence assertion cannot notice ` +
        `it was handed an empty list.`,
    ).toBeGreaterThanOrEqual(MIN_COMPONENT_FILES);
  });

  it("reaches both halves of the gate tree, and the two files this plan is about", () => {
    expect(scan.gateFiles.some((f) => f.startsWith("src/app/"))).toBe(true);
    expect(scan.gateFiles.some((f) => f.startsWith("src/components/"))).toBe(true);
    // Named individually: the stylesheet that DECLARES the token and the pattern that made its zero
    // true. A count alone survives either one being renamed out of the scan.
    expect(scan.scanned, "the walker never reached the stylesheet").toContain("src/app/globals.css");
    expect(scan.scanned, "the walker never reached the overlay primitive").toContain(
      OVERLAY_PRIMITIVE,
    );
  });

  it("pointed at a directory that does not exist, finds nothing — which is why the floor exists", () => {
    // The vacuity probe as a permanent assertion rather than a one-off. `collectSourceFiles` returns
    // `[]` for a missing directory instead of throwing, deliberately: the realistic version of this
    // failure is a scan narrowed by a wrong glob, which never throws at all.
    const empty = scanFor(resolve(process.cwd(), "src-nope"));
    expect(empty.scanned).toEqual([]);
    expect(empty.positive, "…and it reports a perfectly clean result over nothing").toEqual([]);
    expect(empty.negative).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// AC#26 — the block is absent AND the primitive that replaces it is present.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("AC#26 — the shadcn `sheet` block was not installed", () => {
  it("has no `src/components/ui/sheet.tsx`", () => {
    expect(
      existsSync(resolve(process.cwd(), SHEET_BLOCK)),
      `${SHEET_BLOCK} EXISTS. The shadcn \`sheet\` block is not installed in this repo and adding ` +
        `it is a REVERSAL of a recorded decision, not a bug fix: FEATURES.md F1 asks for it, ` +
        `ARCHITECTURE.md §6.3 refuses it, and the roadmap's Phase 16 dependency line ("Phase 11's ` +
        `responsive-dialog pattern") breaks the tie. Two overlay mechanisms mean two focus traps ` +
        `and two escape behaviours (T-11-FOCUSTRAP). The one primitive is ${OVERLAY_PRIMITIVE}.`,
    ).toBe(false);
  });

  it("DOES have the one overlay primitive — the absence alone is not the requirement", () => {
    // Asserted beside the absence because a tree with NO overlay at all satisfies the assertion
    // above perfectly, and "we deleted the mobile overlay" is not the decision that was recorded.
    // This is the same both-sides shape `elevation-z.test.ts` uses when it pins a zero: the token
    // must still be declared, the step must still compile.
    expect(
      existsSync(resolve(process.cwd(), OVERLAY_PRIMITIVE)),
      `${OVERLAY_PRIMITIVE} is missing. AC#26's absence half is satisfied by a tree with no mobile ` +
        `overlay whatsoever, which is why the presence half is asserted next to it.`,
    ).toBe(true);
  });

  it("declares no `vaul` and no gesture library in package.json (T-11-SC)", () => {
    // The drag-to-dismiss dependency is the OTHER way the sheet arrives, and it arrives without ever
    // creating a file called `sheet.tsx`. `git diff --stat package.json` is a point-in-time check
    // that only the plan that ran it ever saw; this is the permanent one.
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const declared = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(
      declared.filter((name) => ["vaul", "react-spring-bottom-sheet", "@use-gesture/react"].includes(name)),
      "a drag/gesture dependency was added. Drag-to-dismiss is OUT OF SCOPE for this milestone " +
        "(11-UI-SPEC § the mobile-overlay primitive) — it brings its own focus behaviour into a " +
        "phase whose whole point is that there is exactly one focus trap.",
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// AC#27 — `--z-sheet` is declared, empty, and empty in BOTH consumption forms.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("AC#27 — `--z-sheet` has zero call sites, in both consumption forms", () => {
  it("declares an EMPTY inventory, and the emptiness is the assertion", () => {
    // The inventory carries its reason in its own docblock rather than in a comment beside this
    // line, so the argument travels with the data — `contrast-pairs.ts`'s rule.
    expect(
      Object.keys(Z_SHEET_INVENTORY),
      "`--z-sheet` has zero declared call sites and Phase 12 EXAMINED AND DECLINED the step (plan " +
        "12-01): the booking sheet is `ResponsiveDialog` — the vendored dialog in another " +
        "presentation — so it renders at `--z-dialog`; the photo lightbox is a dialog too; and both " +
        "sticky bars are `z-(--z-sticky)`, correctly BENEATH the sheet's scrim. If a surface " +
        "genuinely needs a layer strictly between sticky and dialog, add a row here WITH ITS REASON " +
        "in that plan's own commit — do not delete this inventory to make the step usable.",
    ).toEqual([]);
  });

  it("finds zero POSITIVE call sites under src/app/** and src/components/**", () => {
    expect(
      scan.positive.filter((hit) => GATE_TREE.some((prefix) => hit.startsWith(prefix))),
    ).toEqual([]);
  });

  it("finds zero NEGATIVE call sites — counted separately, because a sign is its own thing", () => {
    expect(
      scan.negative.filter((hit) => GATE_TREE.some((prefix) => hit.startsWith(prefix))),
    ).toEqual([]);
  });

  it("still DECLARES the step, at its contracted value", () => {
    // The zero is only a contract while the token exists. A "tidy-up" that deleted the declaration
    // would satisfy both zeros above and silently remove a step from a four-step scale.
    expect(
      globals["--z-sheet"],
      "globals.css no longer declares --z-sheet. The zero above is asserted BECAUSE the token is " +
        "kept, not instead of keeping it.",
    ).toBe("20");
  });

  it("keeps the reason beside the declaration, where the next reader will be", () => {
    // The person about to give this step a home is reading the stylesheet, not this test file. A
    // reason that lives only here is a reason they will never see.
    const css = readFileSync(join(SRC_DIR, "app/globals.css"), "utf8");
    expect(css, "globals.css must still declare the token").toContain("--z-sheet:");
    expect(
      css,
      "the stylesheet no longer explains why the step is empty — the zero has become an invitation",
    ).toContain("ZERO CALL SITES");
  });
});

describe("AC#27 self-test — the scanner reads markup and not prose, in both directions", () => {
  it("FLAGS a real call site", () => {
    // Without this, the three zeros above are satisfied by a regex that matches nothing at all.
    const offender = 'export const A = <div className="z-(--z-sheet)" />;';
    const stripped = stripComments(offender);
    expect([...stripped.matchAll(Z_SHEET_POSITIVE)].map((m) => m[0])).toEqual(["z-(--z-sheet)"]);
  });

  it("does NOT flag the token being discussed in a comment", () => {
    // Both `globals.css` and `responsive-dialog.tsx` explain this zero in prose. A scan that counted
    // prose would be red against the very tree that documents the decision correctly.
    const prose = [
      "// z-(--z-sheet) is unused",
      "/* the -z-(--z-sheet) form has no call sites either */",
      'const A = <div className="p-4" />; // z-(--z-sheet)',
    ].join("\n");
    const stripped = stripComments(prose);
    expect([...stripped.matchAll(Z_SHEET_POSITIVE)].map((m) => m[0])).toEqual([]);
    expect([...stripped.matchAll(Z_SHEET_NEGATIVE)].map((m) => m[0])).toEqual([]);
  });

  it("separates the two signs, and never counts the token DECLARATION as a call site", () => {
    const mixed = 'const A = <div className="-z-(--z-sheet)" />;';
    expect([...mixed.matchAll(Z_SHEET_NEGATIVE)].map((m) => m[0])).toEqual(["-z-(--z-sheet)"]);
    expect(
      [...mixed.matchAll(Z_SHEET_POSITIVE)].map((m) => m[0]),
      "the positive form matched inside the negative one — the two inventories are not independent",
    ).toEqual([]);

    // `--z-sheet: 20;` is the CONTRACT and `var(--z-sheet)` is a reference to it. Neither is a call
    // site, and without the lookbehind every inventory here would be permanently off by two.
    const contract = "--z-sheet: 20;\n  z-index: var(--z-sheet);";
    expect([...contract.matchAll(Z_SHEET_POSITIVE)].map((m) => m[0])).toEqual([]);
    expect([...contract.matchAll(Z_SHEET_NEGATIVE)].map((m) => m[0])).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// AC#28 — the height cap, and the criterion that would have failed on correct code.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("AC#28 — the sheet's height cap is the DYNAMIC viewport unit", () => {
  const source = readFileSync(resolve(process.cwd(), OVERLAY_PRIMITIVE), "utf8");

  it("contains no bare viewport-height unit", () => {
    expect(
      BARE_VIEWPORT_HEIGHT.test(source),
      `${OVERLAY_PRIMITIVE} contains a bare viewport-height unit: ` +
        `${JSON.stringify(source.match(BARE_VIEWPORT_HEIGHT))}. On iOS Safari that unit measures ` +
        `the URL-bar-retracted viewport, so the sheet is taller than the visible area and the part ` +
        `clipped is the BOTTOM — where the footer and its confirm button live.`,
    ).toBe(false);
  });

  it("DOES cap at `[85dvh]` — the negative half alone is satisfied by no cap at all", () => {
    expect(
      source.includes("[85dvh]"),
      `${OVERLAY_PRIMITIVE} no longer contains \`[85dvh]\`. The negative half of this criterion is ` +
        `satisfied by a file with NO height cap at all, which is why the positive half is asserted ` +
        `beside it.`,
    ).toBe(true);
  });
});

describe("AC#28 self-test — the correction, demonstrated rather than argued", () => {
  it("shows the ORIGINAL wording would have gone red against the mandated class", () => {
    // THE ASSERTION THIS SECTION EXISTS TO CARRY. The criterion as first written banned the
    // substring `vh]`. The class it simultaneously mandates ENDS in `vh]`, so the two halves of one
    // criterion contradicted each other, and the only way to make the original form green was to
    // ship the unit that clips the sheet's footer.
    expect("max-h-[85dvh]".includes("vh]")).toBe(true);
    // The corrected, bounded form separates them cleanly — which is the whole correction, in two
    // lines that run.
    expect(BARE_VIEWPORT_HEIGHT.test("max-h-[85dvh]")).toBe(false);
    expect(BARE_VIEWPORT_HEIGHT.test("max-h-[85vh]")).toBe(true);
  });

  it("still catches every other bare spelling, so the fix did not narrow the ban to one number", () => {
    for (const bad of ["h-[100vh]", "min-h-[50vh]", "max-sm:max-h-[85vh]", "top-[10vh]"]) {
      expect(BARE_VIEWPORT_HEIGHT.test(bad), `${bad} slipped past the bounded regex`).toBe(true);
    }
    for (const good of ["max-h-[85dvh]", "h-[100svh]", "min-h-[50lvh]", "w-[85vw]"]) {
      expect(BARE_VIEWPORT_HEIGHT.test(good), `${good} was wrongly reported`).toBe(false);
    }
  });
});
