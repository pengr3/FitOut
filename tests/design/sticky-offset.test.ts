// SHELL-01 — THE RULE: *every `lg:sticky` offset in the app is at least the header height plus 16px.*
//
// 64px is the shell header's height from `sm:` up (`HEADER_HEIGHT` = `h-14 sm:h-16`) and it is
// `sticky top-0`, so a rail pinned any closer than 64px to the viewport top scrolls UNDER it on every
// scroll. 64 + a 16px gap = **80px**, the 20th spacing step. This file turns that sentence into a
// source scan, which is what `11-UI-SPEC.md § The geometry contract` asks for when it calls the rule
// "falsifiable as a source scan".
//
// It is DELIBERATELY a rule and not an inventory of paths. A per-file map would say "these files are
// correct today"; the failure this gate exists to catch is the NEXT sticky rail, added by a plan that
// has never read this file, copying `lg:top-8` from whichever existing one it happened to look at. So
// the assertion is over every `lg:sticky` site the walk finds, whatever its path.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS IS A PAIRED SCAN AND NOT A GREP FOR THE WRONG CLASS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The plan's own acceptance criterion is `grep -rc "lg:top-8" src/app src/components` → 0. That
// command is GREEN on this tree and would have been green on the broken one too, for two independent
// reasons, both of which this repository has already paid for:
//
//   • IT COUNTS PROSE. Every file that has to explain the wrong offset names it, and a comment naming
//     a class is textually indistinguishable from a call site using one. `panel-card.tsx` hit this in
//     plan 11-08 and worked around it by naming the offset descriptively ("the 8th spacing step") —
//     a workaround that is only necessary because the check is a text grep.
//   • IT CHECKS THE WRONG PROPERTY. `lg:top-8` is one wrong value. `lg:top-4`, `lg:top-12`,
//     `lg:top-16` and `lg:top-[60px]` are all equally wrong and all invisible to it. A gate that
//     names the mistake somebody already made is a gate for the past.
//
// So the scan reads STRING LITERALS AND TEMPLATE CHUNKS via the TypeScript AST — the same node
// classes `leak.test.ts:213-250` and `skeleton-measurements.test.ts:211-239` visit — and it PAIRS
// each `lg:sticky` with the `lg:top-*` in the same class string, resolves that utility to pixels, and
// compares it to the floor. Comments are not literals, so a class named in prose is invisible here by
// construction, and every wrong value fails rather than one.
//
// Both scans run: the source is ALSO comment-stripped with the shared `stripComments` helper before
// the AST parse, which is belt-and-braces rather than redundant — the two mechanisms fail in
// different directions and the guard below asserts that the stripper is not a no-op on this tree.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — BOTH PRESCRIBED PROBES, PLUS THE VACUITY PROBE. 13 August 2026. GREEN IS 11 PASSED.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// A gate that has never been watched failing is not a gate (`tests/design/infra.test.ts:5-9`).
// Command for all three: `npx vitest run --config vitest.design.config.ts
// tests/design/sticky-offset.test.ts`
//
//   (a) THE OFFSET. `listings/[id]/(detail)/page.tsx`'s rail restored to `lg:sticky lg:top-8`, which
//       is the exact class string it shipped before this plan. 2 failed / 9 passed. The rule's own
//       failure names the file, the LINE, the class string and the arithmetic:
//
//         AssertionError: a `lg:sticky` rail is pinned closer to the top of the viewport than the app
//         shell's header is tall, so it scrolls UNDER the header. The rule is: every `lg:sticky`
//         offset is >= 80px (the 64px header + a 16px gap) = `lg:top-20`.: expected [ Array(1) ] to
//         deeply equal []
//
//         - []
//         + [
//         +   "src/app/listings/[id]/(detail)/page.tsx:383 — `lg:sticky lg:top-8` resolves to 32px,
//         +    below the 80px floor",
//         + ]
//
//       The SECOND failure is the vacuity-positive assertion, and it is worth reading beside the
//       first because it fires on the same edit from the other direction:
//
//         AssertionError: expected [ 32, 80, 80 ] to deeply equal [ 80, 80, 80 ]
//
//       Reverted → 11 passed.
//
//   (b) THE COUNT. A fourth `lg:sticky lg:top-20` site added to
//       `src/components/patterns/page-header.tsx` — a CORRECT offset, so probe (a)'s rule stays green
//       and only the count moves. 2 failed / 9 passed:
//
//         AssertionError: the number of `lg:sticky` sites in the app changed. This is not a failure of
//         the offset rule — every site may still satisfy it — it is a prompt to read the new one and
//         update this count deliberately, in the commit that adds it. Sites found:
//         src/app/listings/[id]/(detail)/page.tsx:383, src/components/booking/reserve-view.tsx:73,
//         src/components/patterns/page-header.tsx:36, src/components/patterns/panel-card.tsx:107:
//         expected 4 to be 3
//
//       That is the whole reason the count is pinned SEPARATELY from the rule: a new sticky rail is a
//       layout decision worth one deliberate line, and folding it into the offset assertion would
//       make "somebody added a rail" and "somebody added a BROKEN rail" the same failure. Note also
//       that the message enumerates all four sites by `file:line`, so the answer to "which one is
//       new" is in the failure rather than in a follow-up grep. Reverted → 11 passed.
//
//   (c) VACUITY — THE PROBE WORTH READING. `SRC_DIR` re-pointed at `src-nope`. 5 failed / 6 passed:
//
//         AssertionError: the scanner walked 0 files. Every assertion in this file is "a list was
//         empty" or "a count was N", and a scan that opened nothing satisfies the first perfectly.:
//         expected +0 to be greater than or equal to 50
//         AssertionError: the scanner never reached the listing detail page: expected [] to include
//         'src/app/listings/[id]/(detail)/page.t…'
//         AssertionError: expected 0 to be greater than 0                      (the stripper guard)
//         AssertionError: … Sites found: : expected +0 to be 3                 (the pinned count)
//         AssertionError: expected [] to deeply equal [ 80, 80, 80 ]           (the positive half)
//
//       …AND `pins every lg:sticky offset at >= 80px` — THE RULE ITSELF — PASSED, over a tree it
//       never opened, reporting a perfectly clean `[]` indistinguishable from a real clean run. An
//       absence assertion cannot notice it was handed nothing; only a positive control over the scan
//       can. That is the direction plan 11-02's probe (d) measured, it is why the guards are asserted
//       FIRST in this file, and it is why `resolved a real offset for every site` exists at all.
//       Reverted → 11 passed.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//   • THIS GATE READS CLASSES, NOT COMPUTED GEOMETRY. It proves the source says 80px; it cannot prove
//     the header renders 64px, that the rail's containing block is the viewport, or that no other
//     sticky ancestor changes what `top` is measured from. The rendered assertion — the header's
//     `boundingBox()` at 375/768/1280 in both themes, and the rail's position after a scroll — is
//     plan `11-21`'s shell measurement spec. jsdom cannot see this class of bug at all (D-131).
//   • IT ONLY UNDERSTANDS THE `lg:` BREAKPOINT, because that is the only one the tree uses. A
//     `md:sticky md:top-8` would be equally broken and equally invisible. Widening the prefix set is
//     a one-line change to `STICKY_PREFIXES` when a second breakpoint first appears; it is not
//     widened speculatively, because an assertion over shapes that do not exist cannot be watched red.
//   • IT PAIRS WITHIN ONE CLASS STRING. A component that puts `lg:sticky` in one literal and its
//     offset in another — a `cn()` call with the offset in a variant map, say — reports the sticky
//     site as having no offset at all, which this file treats as a FAILURE rather than as a pass. The
//     safe direction, and the reason that case is asserted explicitly below.
//   • THE UNPREFIXED `sticky top-0` ON THE HEADER ITSELF IS OUT OF SCOPE, by construction: the header
//     is the thing everything else is measured against, so it is the one sticky element whose offset
//     is legitimately 0.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, type Dirent } from "node:fs";
import { resolve, join, relative } from "node:path";
import ts from "typescript";

import { stripComments } from "./helpers/strip-comments";

/** The scanned tree, as one constant — probe (c) above is a one-line edit here. */
const SRC_DIR = resolve(process.cwd(), "src");

/** The two trees the rule applies to, read as prefixes of a repo-relative label. */
const GATE_TREE = ["src/app/", "src/components/"] as const;

/**
 * The breakpoint prefixes a sticky offset may carry. See the NOT COVERED note: `lg:` is the only one
 * in the tree, and widening this speculatively would add an assertion nobody can watch fail.
 */
const STICKY_PREFIXES = ["lg"] as const;

/**
 * The floor, in pixels, and its derivation — the two numbers, not the answer.
 *
 * `HEADER_HEIGHT` is `h-14 sm:h-16`, so the header is 64px at every width the `lg:` breakpoint
 * applies to. The 16px gap is the 4th spacing step and is what stops the rail sitting flush against
 * the header's border.
 */
const HEADER_PX = 64;
const GAP_PX = 16;
const FLOOR_PX = HEADER_PX + GAP_PX;

/**
 * How many `lg:sticky` sites the app has. Pinned SEPARATELY from the rule — see probe (b): a new
 * sticky rail is a layout decision worth one deliberate line, and a count folded into the offset
 * assertion makes "somebody added a rail" and "somebody added a BROKEN rail" the same failure.
 *
 * THREE TODAY, not one. `11-UI-SPEC.md § The geometry contract` says *"there is exactly one such site
 * today"* and plan 11-10 repeats it; the tree holds three, and the discrepancy was found by writing
 * this scan rather than by reading either document:
 *
 *   1. `src/app/listings/[id]/(detail)/page.tsx` — the listing page's booking rail.
 *   2. `src/components/booking/reserve-view.tsx`  — the checkout rail. Missed by the spec, and by the
 *      plan's `<action>`, which names only the first. `patterns/panel-card.tsx` had already recorded
 *      BOTH by path in plan 11-08, so the correction was available to be read.
 *   3. `src/components/patterns/panel-card.tsx`   — the `sticky` prop's own encoded offset. Not a
 *      shipped rail, but a genuine class string that renders whenever an adopter passes the prop, so
 *      the rule applies to it exactly as it does to the other two. It is the ONLY one of the three
 *      that was already correct before this plan.
 *
 * The measurement wins over the spec, the same way `selector-contract.test.ts` records `.locator(` as
 * 23 where `11-UI-SPEC.md § GATE-04` says 22.
 *
 * EXPECTED FUTURE DIRECTION: 3 → 1. Plan 11-13 converts the two shipped rails onto `PanelCard
 * sticky`, at which point sites 1 and 2 disappear and only the pattern's own offset remains. That is
 * the shape of a correct conversion, and a count that stayed at 3 afterwards would mean the rails
 * kept their own offsets alongside the prop.
 */
const EXPECTED_STICKY_SITES = 3;

/** Repo-relative, forward-slashed. See `leak.test.ts:157-165` for why the normalisation matters. */
function label(file: string): string {
  return relative(process.cwd(), file).split("\\").join("/");
}

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  // `Dirent<string>[]`, spelled out rather than inferred through `ReturnType<typeof readdirSync>` —
  // that alias resolves to the BUFFER overload on this @types/node, and the walk would not compile.
  let entries: Dirent<string>[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    // `[]` rather than a throw — 11-02's rule: a broken scan must surface as ONE named
    // guard-the-guard failure, not as a stack trace that buries which gate went quiet.
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectSourceFiles(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Tailwind's spacing scale is 4px per step; `top-20` is 80px. */
const STEP_PX = 4;

/**
 * Resolve a `top-*` utility's value to pixels, or `null` when it is not a fixed pixel measurement.
 *
 * `null` is NOT "fine": a sticky rail whose offset the gate cannot resolve is reported as a
 * violation, because an unresolvable offset is one nobody can check by reading either.
 */
export function topOffsetPx(value: string): number | null {
  // `top-20` → 80. Fractional steps (`top-1.5`) resolve too; the scale is the same.
  if (/^\d+(\.\d+)?$/.test(value)) return Number(value) * STEP_PX;
  // `top-px` → 1px, and it is a real Tailwind utility, so it resolves rather than failing to parse.
  if (value === "px") return 1;
  // `top-[80px]` / `top-[5rem]` — the arbitrary form, resolved for px and rem only.
  const arbitrary = /^\[(\d+(?:\.\d+)?)(px|rem)\]$/.exec(value);
  if (arbitrary) {
    const n = Number(arbitrary[1]);
    return arbitrary[2] === "rem" ? n * 16 : n;
  }
  return null;
}

type Site = {
  readonly file: string;
  readonly line: number;
  readonly prefix: string;
  readonly classString: string;
  readonly offset: string | null;
  readonly px: number | null;
};

/**
 * Every `{prefix}:sticky` in one module's string literals, paired with the `{prefix}:top-*` in the
 * SAME class string. See NOT COVERED: pairing within one literal is the whole mechanism, and a
 * sticky site whose offset is in a different literal is reported as unpaired rather than skipped.
 */
export function scanText(path: string, rawText: string): Site[] {
  const text = stripComments(rawText);
  const sf = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const sites: Site[] = [];

  const visit = (node: ts.Node): void => {
    let chunk: string | null = null;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) chunk = node.text;
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node))
      chunk = node.text;

    if (chunk !== null) {
      const tokens = chunk.split(/\s+/).filter(Boolean);
      for (const prefix of STICKY_PREFIXES) {
        if (!tokens.includes(`${prefix}:sticky`)) continue;
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
        const topToken = tokens.find((t) => t.startsWith(`${prefix}:top-`));
        const offset = topToken ? topToken.slice(`${prefix}:top-`.length) : null;
        sites.push({
          file: path,
          line,
          prefix,
          classString: chunk,
          offset,
          px: offset === null ? null : topOffsetPx(offset),
        });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return sites;
}

const walked: string[] = [];
const scanned: string[] = [];
const sites: Site[] = [];
for (const file of collectSourceFiles(SRC_DIR)) {
  const name = label(file);
  walked.push(name);
  if (!GATE_TREE.some((prefix) => name.startsWith(prefix))) continue;
  scanned.push(name);
  sites.push(...scanText(name, readFileSync(file, "utf8")));
}

/** A site that breaks the rule, rendered as one readable line for the failure diff. */
function violationOf(site: Site): string | null {
  if (site.px === null) {
    return (
      `${site.file}:${site.line} — \`${site.prefix}:sticky\` with ` +
      (site.offset === null
        ? "NO paired offset in the same class string"
        : `an unresolvable offset \`${site.prefix}:top-${site.offset}\``)
    );
  }
  if (site.px < FLOOR_PX) {
    return (
      `${site.file}:${site.line} — \`${site.prefix}:sticky ${site.prefix}:top-${site.offset}\` ` +
      `resolves to ${site.px}px, below the ${FLOOR_PX}px floor`
    );
  }
  return null;
}

describe("SHELL-01 — every lg:sticky offset clears the app shell's header", () => {
  // ---------------------------------------------------------------------------------------------
  // GUARD THE GUARD, ASSERTED FIRST. The real assertion is `toEqual([])`, which a scanner that
  // visited nothing satisfies perfectly. Probe (c) in the header measured exactly that.
  // ---------------------------------------------------------------------------------------------

  it("walked a real source tree rather than an empty one", () => {
    expect(
      walked.length,
      "the scanner walked 0 files. Every assertion in this file is \"a list was empty\" or \"a count " +
        "was N\", and a scan that opened nothing satisfies the first perfectly.",
    ).toBeGreaterThanOrEqual(50);
    expect(scanned.length).toBeGreaterThanOrEqual(50);
    // The walk is WIDER than the scope, which is what makes the scope mean something.
    expect(walked.length).toBeGreaterThan(scanned.length);
  });

  it("reached the three files that actually own a sticky site, by name", () => {
    // Named explicitly so a count of 3 cannot come from a scanner that read three other files.
    expect(scanned, "the scanner never reached the listing detail page").toContain(
      "src/app/listings/[id]/(detail)/page.tsx",
    );
    expect(scanned, "the scanner never reached the checkout rail").toContain(
      "src/components/booking/reserve-view.tsx",
    );
    expect(scanned).toContain("src/components/patterns/panel-card.tsx");
  });

  it("its comment stripper is not a no-op on this tree", () => {
    // `panel-card.tsx` explains the rule at length and, in doing so, writes the correct offset in
    // prose. If the stripper ever became a pass-through, that prose would be counted as a call site
    // and the pinned count would silently go up by one — a green-looking failure.
    const raw = readFileSync(resolve(SRC_DIR, "components/patterns/panel-card.tsx"), "utf8");
    expect(stripComments(raw).length).toBeLessThan(raw.length);
    expect(raw).toContain("lg:sticky");
  });

  // ---------------------------------------------------------------------------------------------
  // The two real clauses.
  // ---------------------------------------------------------------------------------------------

  it(`has exactly ${EXPECTED_STICKY_SITES} lg:sticky sites`, () => {
    expect(
      sites.length,
      "the number of `lg:sticky` sites in the app changed. This is not a failure of the offset rule " +
        "— every site may still satisfy it — it is a prompt to read the new one and update this " +
        "count deliberately, in the commit that adds it. Sites found: " +
        sites.map((s) => `${s.file}:${s.line}`).join(", "),
    ).toBe(EXPECTED_STICKY_SITES);
  });

  it(`pins every lg:sticky offset at >= ${FLOOR_PX}px`, () => {
    const violations = sites.map(violationOf).filter((v): v is string => v !== null);
    expect(
      violations,
      "a `lg:sticky` rail is pinned closer to the top of the viewport than the app shell's header is " +
        `tall, so it scrolls UNDER the header. The rule is: every \`lg:sticky\` offset is >= ` +
        `${FLOOR_PX}px (the ${HEADER_PX}px header + a ${GAP_PX}px gap) = \`lg:top-20\`.`,
    ).toEqual([]);
  });

  it("resolved a real offset for every site, so the rule above is not vacuous", () => {
    // The pair to the assertion above: `toEqual([])` is satisfied just as well by a scan that found
    // sticky sites and failed to parse any of their offsets, because `violationOf` would then report
    // them — but it is ALSO satisfied by a scan that found no sites at all. This is the positive half.
    expect(sites.map((s) => s.px)).toEqual(
      Array.from({ length: EXPECTED_STICKY_SITES }, () => FLOOR_PX),
    );
  });

  // ---------------------------------------------------------------------------------------------
  // Both-directions self-tests, over fixtures never written to disk — so the thing the real
  // assertion runs is the same code path the fixtures prove.
  // ---------------------------------------------------------------------------------------------

  it("flags the wrong offset and spares the right one", () => {
    const bad = scanText(
      "fake-bad.tsx",
      'export const A = <div className="lg:sticky lg:top-8" />;\n',
    );
    expect(bad).toHaveLength(1);
    expect(violationOf(bad[0])).toContain("resolves to 32px, below the 80px floor");

    const good = scanText(
      "fake-good.tsx",
      'export const A = <div className="lg:sticky lg:top-20" />;\n',
    );
    expect(good).toHaveLength(1);
    expect(violationOf(good[0])).toBeNull();
  });

  it("does not mistake a class named in a comment for one written at a call site", () => {
    // THE REASON THIS IS AN AST WALK OVER STRIPPED SOURCE. `panel-card.tsx` does exactly this, and
    // the plan's prescribed `grep -rc "lg:top-8"` reports it.
    const commented = scanText(
      "fake-comment.tsx",
      [
        "// The rail used to be `lg:sticky lg:top-8`, which tucked it under the header.",
        "/* and a block comment naming lg:sticky lg:top-4 too */",
        'export const A = <div className="w-full" />; // trailing lg:sticky lg:top-2',
      ].join("\n"),
    );
    expect(commented).toEqual([]);
  });

  it("treats an unpaired or unresolvable offset as a failure, not as a pass", () => {
    // The safe direction. An offset the gate cannot read is one a reader cannot check either.
    const unpaired = scanText("fake.tsx", 'export const A = <div className="lg:sticky" />;\n');
    expect(violationOf(unpaired[0])).toContain("NO paired offset");

    const dynamic = scanText("fake.tsx", 'export const A = <div className="lg:sticky lg:top-(--x)" />;\n');
    expect(violationOf(dynamic[0])).toContain("unresolvable offset");
  });

  it("resolves every offset spelling the scale actually has", () => {
    expect(topOffsetPx("20")).toBe(80);
    expect(topOffsetPx("8")).toBe(32);
    expect(topOffsetPx("1.5")).toBe(6);
    expect(topOffsetPx("px")).toBe(1);
    expect(topOffsetPx("[80px]")).toBe(80);
    expect(topOffsetPx("[5rem]")).toBe(80);
    // …and refuses the ones it cannot: a CSS variable, a percentage, `auto`.
    expect(topOffsetPx("(--rail)")).toBeNull();
    expect(topOffsetPx("[50%]")).toBeNull();
    expect(topOffsetPx("auto")).toBeNull();
  });

  it("ignores the unprefixed `sticky top-0` the header itself uses", () => {
    // The header is what everything else is measured against, so its own offset is legitimately 0.
    // A rule that policed unprefixed `sticky` would make the shell its own first violation.
    const header = scanText(
      "fake-header.tsx",
      'export const H = <header className="sticky top-0 z-(--z-sticky) border-b" />;\n',
    );
    expect(header).toEqual([]);
  });
});
