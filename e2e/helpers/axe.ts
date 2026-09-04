import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// GATE-02's automated half, extracted so every spec that scans a surface shares ONE definition of
// "the axe pass".
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS IS ONE DEFINITION AND NOT ONE PER SPEC (plan 17-01)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `e2e/helpers/overflow.ts` states the general reason in its own header and it applies here without
// amendment: a second copy of a scan is free to disagree with the first about what it measures. For axe
// that freedom is unusually cheap to exercise and unusually hard to notice, because BOTH ways of getting
// it wrong READ AS GREEN:
//
//   • a spec that assembles its own scanner and loses the tag filter runs axe's DEFAULT rule set, which
//     is WIDER than the conformance scope this milestone agreed to fix. It goes red on rules nobody
//     signed up for, someone quiets it with an exclusion, and that exclusion then covers real findings
//     too — a stricter-looking gate that measures less;
//   • a spec that scans a page which never resolved gets an empty violation list, which is indistin-
//     guishable from a clean surface unless something asserts the scan looked at anything at all.
//
// So the tag set, the builder and the assertion all live here and specs import `expectAxeClean`. There
// is deliberately NO exported escape hatch taking a caller-supplied rule set or tag list: D-16's
// one-import-site rule, applied to `e2e/`, is the whole reason this file exists instead of a snippet
// pasted into each spec.

/**
 * The conformance scope of the audit. A SCOPE DECISION, not a default.
 *
 * D-138 scopes this milestone's axe sweep to the **court** theme only, so this list is the *rule* half
 * of a two-part limitation and the theme is the other half — a reader who finds no grove evidence
 * anywhere is meeting the decision rather than a gap.
 *
 * Two MEASURED facts make the set correct rather than merely declared, and both are the kind that make
 * a green mean less than it looks:
 *
 *   1. `heading-order`, `region`, `landmark-one-main` and `page-has-heading-one` are `best-practice`-
 *      tagged in axe-core's own rule descriptions and carry NO `wcag*` tag, so a `runOnly` tag filter
 *      EXCLUDES all four. `heading-order` is bought back by name in `makeAxe`; the other three are
 *      knowingly out of scope at these tags, and the outline walk in `e2e/host-headings.spec.ts` is
 *      what carries heading structure instead.
 *   2. Axe's SC 2.5.8 target rule is DISABLED BY DEFAULT in axe-core — *"until WCAG 2.2 is more widely
 *      adopted"* — and a tag filter does not enable a disabled rule. `wcag22aa` in this list therefore
 *      buys nothing on its own, and nothing here may be read as covering the 24px target floor.
 */
export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] as const;

/**
 * The ONE axe configuration, and the single `options({...})` call is the load-bearing part of it.
 *
 * ⚠ `AxeBuilder`'s other configuration methods — the tag filter, the rule allow-list and the rule
 * deny-list, spelled `.with…Tags()`, `.with…Rules()` and `.disable…Rules()` — each ASSIGN to the
 * builder's one internal option object, and `options({...})` REPLACES that object wholesale. There is
 * no merge (verified against `dequelabs/axe-core-npm`, `packages/playwright/src/index.ts`). So a tag
 * filter chained INTO `options({ rules })` silently DROPS the tag filter and runs axe's DEFAULT rule
 * set — wider, noisier, and reading like a stricter gate. One call, both keys, no exceptions.
 *
 * Those three method names, and the SC 2.5.8 rule id below, are written WITHOUT their literal
 * identifiers on purpose: this file's acceptance check greps for them and requires zero occurrences,
 * which is the mechanical form of the two rules above. Spelling them out in a comment would make that
 * guard match its own documentation and the guard would be deleted as broken. `options({...})` is
 * written without its leading dot here for the same reason — the check counts DOTTED occurrences and
 * requires exactly one, which is the call below and nothing else.
 */
export function makeAxe(page: Page) {
  return (
    new AxeBuilder({ page })
      // `playwright.config.ts`'s `webServer` is `npm run dev`, so EVERY scanned page carries a
      // `<nextjs-portal>` — Next's own dev-tools chrome. axe-core builds a flattened virtual DOM
      // specifically to cross shadow boundaries, so the framework's development furniture sits inside
      // the audit's scope, and no violation it produces is this product's.
      //
      // It is not this application's DOM, and this repo has already met the same element twice for the
      // same reason: `e2e/visual/freeze.css` hides it for the visual suite, `e2e/error-leak.spec.ts:176`
      // removes it before measuring. This is a COMPONENT-level exclusion, so it does not consume the
      // `global-error` ROUTE-level exclusion budget — and it is the ONLY exclusion in this file. A rule
      // deny-list is forbidden outright (AC#17), because "silence the framework's overlay" and "silence
      // the finding" are the same keystroke and only one of them is legitimate.
      //
      // ⚠ ASSERTED, NOT TRUSTED — `e2e/helpers/focus.ts:323`'s rule for this same element. Excluding the
      // HOST is *assumed* to take its open shadow subtree out of scope with it, and 17-RESEARCH records
      // that assumption (§ Assumptions, A1) as unverified: the root is attached `mode:"open"` (measured,
      // `node_modules/next/dist/compiled/next-devtools/index.js:3834`) and axe walks open shadow trees
      // by design. On the first real sweep, check no surviving violation target begins `nextjs-portal`.
      .exclude("nextjs-portal")
      .options({
        runOnly: { type: "tag", values: [...AXE_TAGS] },
        // Bought back BY NAME because the filter above drops it: `heading-order` is `best-practice`-
        // tagged, so `runOnly` excludes it, and the UI-SPEC sentence that assumed the conformance tags
        // covered heading structure was wrong (17-RESEARCH Pitfall 1). Nothing else is enabled — in
        // particular axe's SC 2.5.8 rule stays off, because `expectTargets` in
        // `e2e/overflow-320.spec.ts:987` already owns that floor at 24px (`TARGET_FLOOR_PX`, :905) with
        // its measured argument, and a second definition of one floor is the drift the one-import-site
        // rule exists to stop.
        rules: { "heading-order": { enabled: true } },
      })
  );
}

/**
 * The floor on how many nodes a scan must have touched, and it is a MEASUREMENT, not a round number.
 *
 * The plan for this file specified `> 0` for both guards below. **Measured in real Chromium on
 * 2026-08-29, `> 0` cannot fire**, which would have made the guard the decorative kind this repository
 * has already caught once ([16-D9]: a green gate on an unmeasured surface — *"not a false red, the
 * opposite, and worse"*). Four probes:
 *
 * | subject | `passes.length` | `scannedNodes` |
 * |---|---|---|
 * | `about:blank` | 1 | **3** |
 * | `setContent("<html><head></head><body></body></html>")` | 1 | **3** |
 * | a 404 route on this app (`status()` 404) | 22 | **57** |
 * | `/terms`, a real surface | 22 | **86** |
 *
 * Axe's own `document-title` and `html-has-lang` rules run on ANY document, so a scan of nothing still
 * reports one passing rule and three nodes. 8 sits well above the degenerate 3 and roughly seven times
 * below the smallest REAL surface measured, which is `expectNoOverflow`'s `MIN_EXAMINED_ELEMENTS`
 * derivation applied to this instrument: a guard tuned above the thing it guards is a guard that gets
 * deleted.
 *
 * ⚠ Note the third row for whoever writes the red-watch: **a 404 URL on this app is NOT a vacuity
 * probe.** It renders a full not-found document — 57 nodes, 22 passing rules, zero violations — so a
 * red-watch pointed at one will not go red here.
 */
export const MIN_SCANNED_NODES = 8;

/**
 * The three assertions the axe half of GATE-02 is made of, in the order they have to run.
 *
 * ⚠ THE TWO VACUITY GUARDS RUN FIRST, AND THEY ARE NOT DECORATION. `.analyze()` over a page that failed
 * to load — or one still showing its `loading.tsx` skeleton — returns ZERO violations and reads exactly
 * like a clean surface. That is the scan-of-nothing failure this repository has now recorded eight
 * times; `expectNoOverflow`'s `examined` floor and `expectTargets`' control count are the same guard on
 * different instruments. Awaiting the surface's own tell before calling this is still the CALLER's job.
 * These two assertions are what catches the caller who forgot.
 *
 * ⚠ AND ONE OF THE TWO IS A HEDGE, SAID PLAINLY RATHER THAN LEFT TO LOOK LOAD-BEARING. On the four
 * subjects measured for `MIN_SCANNED_NODES` above, `results.passes.length` was never zero — axe always
 * runs at least `document-title` and `html-has-lang` — so the pass-rule clause below only reaches a
 * genuinely empty result object (an injection that returned nothing), and the NODE FLOOR is the clause
 * doing the work. Both are kept: the cheap one costs a line, and a header that claimed either was the
 * catch would be the false-header defect this repository has recorded three times.
 *
 * The violation list is projected to readable strings before it is compared, so a red names the rule,
 * its impact, how many nodes carry it and where the first one is — rather than printing an object graph
 * nobody reads.
 *
 * `where` is the last positional argument and prefixes every message: the calling convention every
 * helper in `e2e/helpers/` follows.
 */
export async function expectAxeClean(page: Page, where: string): Promise<void> {
  const results = await makeAxe(page).analyze();

  const scannedNodes =
    results.passes.reduce((n, r) => n + r.nodes.length, 0) +
    results.violations.reduce((n, r) => n + r.nodes.length, 0) +
    results.incomplete.reduce((n, r) => n + r.nodes.length, 0);

  expect(
    results.passes.length,
    `${where}: axe reported ZERO passing rules. A page that failed to load produces an empty violation ` +
      "list and reads exactly like a pass, so this number is what makes the assertion below mean " +
      "anything. Zero here means the result object came back empty, not that the surface is clean.",
  ).toBeGreaterThan(0);

  expect(
    scannedNodes,
    `${where}: axe examined ${scannedNodes} nodes across its passes, violations and incomplete ` +
      `results, against a floor of ${MIN_SCANNED_NODES}. An empty document violates nothing, so a ` +
      "scan this small is an instrument failure and not a verdict — see the constant for the four " +
      "subjects the floor was measured from.",
  ).toBeGreaterThanOrEqual(MIN_SCANNED_NODES);

  expect(
    results.violations.map(
      (v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes[0]?.target.join(" ")}`,
    ),
    `${where}: axe found ${results.violations.length} violation(s) at tags [${AXE_TAGS.join(", ")}], ` +
      `over ${scannedNodes} examined nodes and ${results.passes.length} passing rules.`,
  ).toEqual([]);
}
