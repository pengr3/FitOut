# Phase 17: Cross-Cutting Audit — Themes, Responsive, A11y & Baselines - Pattern Map

**Mapped:** 2026-08-29
**Files analyzed:** 31 (13 created · 18 modified)
**Analogs found:** 30 / 31

> **The governing fact for this phase:** almost nothing here is net-new mechanism. Every instrument has
> a shipped nucleus, and the analog is usually the file being extended rather than a sibling. Where the
> analog IS the file being modified, that is stated explicitly and the pattern to copy is the *idiom
> already in that file* — a row shape, a guard order, a failure-message form.
>
> **Three idioms are universal in this tree and appear in every assignment below.** They are the
> repo's actual house style and the planner should treat them as mandatory, not optional:
> 1. **Vacuity guard first** — every "a number is small" / "a list is empty" assertion is preceded by a
>    guard proving the scan looked at something.
> 2. **The failure message is the deliverable** — it names the measurement, the width, the theme, the
>    route and the element, and it argues *why* the reader must not fix it by bumping the constant.
> 3. **A row without a reason is not a row** — every table entry (`skip`, `why`, `hookWhy`, `blocked`,
>    `owner`) carries prose that a reviewer can check.

---

## File Classification

### Created

| New file | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `e2e/helpers/axe.ts` | test utility (e2e helper) | measure → assert (DOM scan) | `e2e/helpers/overflow.ts` | exact |
| `e2e/helpers/nowrap.ts` | test utility (e2e helper) | measure → assert (DOM scan) | `e2e/mobile-booker-path.spec.ts:443-486` (extraction source) + `e2e/helpers/overflow.ts` (destination shape) | exact |
| `e2e/axe-sweep.spec.ts` | test (e2e spec) | table-driven route sweep | `e2e/overflow-320.spec.ts` AC#29 block (`:296-776`) | exact |
| `e2e/keyboard-composites.spec.ts` | test (e2e spec) | event-driven (real key presses) | `e2e/auth-keyboard.spec.ts` | exact |
| `tests/design/one-tree.test.ts` | test (vitest design gate) | source-AST scan | `tests/design/loading-coverage.test.ts` | exact |
| `tests/design/focus-definition.test.ts` | test (vitest design gate) | source text scan over `e2e/` | `tests/design/sheet-absent.test.ts` | exact |
| `tests/design/baseline-theme.test.ts` | test (vitest design gate) | filesystem + `git ls-files` scan | `tests/design/gitignore-baselines.test.ts` | exact |
| `src/app/(app)/<throw>/page.tsx` | route (page) | request-response (deliberate throw) | `src/app/dev/throw/page.tsx` | exact |
| `src/app/(host)/host/<throw>/page.tsx` | route (page) | request-response (deliberate throw) | `src/app/dev/throw/page.tsx` | exact |
| `src/app/(auth)/<throw>/page.tsx` | route (page) | request-response (deliberate throw) | `src/app/dev/throw/page.tsx` | exact |
| `src/app/(legal)/<throw>/page.tsx` | route (page) | request-response (deliberate throw) | `src/app/dev/throw/page.tsx` | exact |
| `.planning/phases/17-…/deferred-items.md` | doc (findings ledger) | batch record | `.planning/phases/16-image-crop-framing/deferred-items.md` | exact |
| *sticky-bar block* — see § Decision Point below | test (e2e spec or block) | measure → assert (geometry) | `e2e/mobile-booker-path.spec.ts` clause (f) | role-match |

### Modified

| Modified file | Role | Data Flow | Pattern source (usually itself) | Match Quality |
|---------------|------|-----------|--------------------------------|---------------|
| `e2e/overflow-320.spec.ts` | test (e2e spec) | table-driven route sweep | its own `RouteRow`/`Phase14Row` idiom (`:296-340`, `:1743`) | self |
| `e2e/host-headings.spec.ts` | test (e2e spec) | per-state × per-width loop | its own `recordHeading` (`:370-396`) | self |
| `e2e/mobile-booker-path.spec.ts` | test (e2e spec) | measure → assert | `e2e/overflow-320.spec.ts`'s import-the-helper move (`:13`) | exact |
| `e2e/avatar-crop.spec.ts` | test (e2e spec) | attribute assertion | its own `:848-865` block + comment-rewrite duty | self |
| `tests/design/brand-recipe.test.ts` | test (vitest design gate) | source scan, ceiling → zero | its own `:721-760` measurement block | self |
| `tests/design/money-path-invariants.test.ts` | test (vitest design gate) | filesystem digest | its own `:40-65` GATE-06 block | self |
| `tests/design/loading-coverage.test.ts` | test (vitest design gate) | source-AST scan, pinned counts | its own `:571-588` count pin | self |
| `src/components/ui/slider.tsx` | component (vendored primitive) | render | its own `:30-55` D1 docblock idiom | self |
| `src/components/patterns/site-chrome.tsx` | component (app shell) | render | its own `ProfileLink` docblock (`:348-377`) | self |
| `src/components/search/search-bar.tsx` | component (form) | render | `src/components/ui/button.tsx` `size` CVA | role-match |
| `src/components/group/group-refresh.tsx` | component | render | same CVA | role-match |
| `src/components/group/regenerate-link-button.tsx` | component | render | same CVA | role-match |
| `src/components/group/remove-attendee-button.tsx` | component | render | same CVA | role-match |
| `src/components/search/search-results.tsx` | component (list surface) | render | `src/components/availability/booking-panel.tsx:200` | exact |
| `src/components/availability/availability-calendar.tsx` | component (composite widget) | render | `src/components/availability/booking-panel.tsx:200` | exact |
| `src/lib/design/selector-contract.ts` | config (typed inventory) | compile-time contract | its own `SELECTOR_CONTRACT` rows (`:254-305`) | self |
| `src/lib/design/visual-baselines.ts` | config (typed inventory) | compile-time contract | its own `blocked` row idiom (`:330-345`) | self |
| `src/lib/design/contrast-pairs.ts` · `tests/design/pair-drift.test.ts` · `e2e/helpers/theme.ts` · `src/components/theme/theme-provider.tsx` | comment amendment (AC#24) | — | `e2e/helpers/theme.ts:17-34` — the *"read as history, not as a standing rule"* amendment idiom | exact |
| `package.json` / `package-lock.json` | config | dependency | — | **no analog** (see § No Analog Found) |

---

## Pattern Assignments

### `e2e/helpers/axe.ts` (test utility, DOM scan)

**Analog:** `e2e/helpers/overflow.ts` — the only two-function e2e helper in the tree that owns a
*definition* rather than a fixture, and the file the axe helper is a sibling of by construction.

**Module-header pattern** (`e2e/helpers/overflow.ts:1-27`) — a helper that owns a definition opens by
arguing *why it is one definition and not two*:

```ts
// AC#29's MEASUREMENT, extracted so two specs share ONE definition of "nothing scrolls sideways".
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS MOVED OUT OF `overflow-320.spec.ts` (plan 12-11)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// … Two specs, two fixtures, one definition of the assertion — which is the property that matters,
// because a second copy of this scan would be free to disagree with the first about what "clipped"
// means.
```

**Named-constant-with-a-measurement pattern** (`e2e/helpers/overflow.ts:29-52`). Every threshold is an
exported `const` whose docblock says how it was derived and what went red at the wrong value:

```ts
/** The floor. Not a breakpoint — the narrowest viewport the UI-SPEC's responsive baseline names. */
export const FLOOR_PX = 320;

/**
 * The floor on how many laid-out elements a measured page must have, and it is a MEASUREMENT.
 * … The number is set from the two SMALLEST surfaces in the route table rather than chosen: the root
 * error boundary lays out 12 elements … The first draft used 20 and went red on both — a guard tuned
 * above the thing it is guarding is a guard that gets deleted.
 */
export const MIN_EXAMINED_ELEMENTS = 8;
```

→ `AXE_TAGS` gets the same treatment: a docblock naming D-138 (court only) and stating that the tag
set is a *conformance* scope decision, plus the measured fact that `heading-order` is
`best-practice`-tagged and needs an explicit `rules` enable.

**Vacuity-guard-first pattern** (`e2e/helpers/overflow.ts:113-141`) — the exact ordering
`expectAxeClean` must reproduce (guard, then the weaker claim, then the stronger one):

```ts
export async function expectNoOverflow(page: Page, where: string): Promise<OverflowMeasurement> {
  const m = await measureOverflow(page);

  expect(
    m.examined,
    `${where}: the measurement examined ${m.examined} elements. A page with nothing laid out on it ` +
      "never overflows, so this number is what makes the two assertions below mean something. The " +
      `floor is ${MIN_EXAMINED_ELEMENTS} — see the constant for the two surfaces it was measured from.`,
  ).toBeGreaterThanOrEqual(MIN_EXAMINED_ELEMENTS);

  expect(m.scrollWidth, /* … named offenders, or an argued "(none — …)" fallback … */)
    .toBeLessThanOrEqual(m.clientWidth + OVERFLOW_TOLERANCE_PX);

  expect(m.offenders, /* … */).toEqual([]);
  return m;
}
```

**The `where: string` parameter is the house calling convention** — every helper in `e2e/helpers/`
takes it as the last positional arg and prefixes every message with `` `${where}: ` ``. Copy it.

**Exclusion-with-a-committed-reason pattern** — the precedent for `.exclude("nextjs-portal")` is
`e2e/helpers/focus.ts:310-328`, which excludes the same element and *asserts* the exclusion rather
than trusting it:

```ts
/**
 * THE ONE ELEMENT IN THE TAB ORDER THAT IS NOT THE APP'S, named rather than filtered silently.
 * … IT IS NOT PRODUCT MARKUP. It does not exist in a production build, no visitor can reach it …
 * ⚠ THE PARTITION IS ASSERTED, NOT TRUSTED. `e2e/auth-keyboard.spec.ts` checks that every element
 * dropped here is a `nextjs-portal` AND that all of them sit at the END of the raw sequence …
 */
export const DEV_OVERLAY_TAG = "nextjs-portal";
```

→ RESEARCH § Assumptions A1 says the axe exclusion is unverified. Follow this precedent: put the
reason in the source beside the call, and on the first run *check* that no remaining violation target
begins `nextjs-portal`.

---

### `e2e/helpers/nowrap.ts` (test utility, DOM scan)

**Analog (extraction source):** `e2e/mobile-booker-path.spec.ts:443-486` — the instrument being
generalised, verbatim, including both guards.

**Analog (extraction *move*):** `e2e/helpers/focus.ts:1-33` — the tree's one worked example of moving
a measurement out of a spec into `e2e/helpers/`, and it states the rule the planner must reproduce:

```ts
// The focus reading, and the ONE definition of what "a visible focus indicator" means in this suite.
// … Two copies of a focus criterion is the drift that goes silent in the worst direction … D-16's
// "one import site" rule, applied to `e2e/`.
//
// The three declarations below are MOVED, not rewritten — same bodies, same failure messages, same
// `inHeader` field … A move you can diff is worth more here than a tidier type:
// `overflow-320.spec.ts` reports 60 passed / 15 skipped before and after, and that equality is the
// whole proof that the extraction changed no behaviour.
```

→ **The proof-of-no-behaviour-change is part of the task.** Record `e2e/mobile-booker-path.spec.ts`'s
pass/skip counts before and after the extraction, exactly as 15-12 did.

**The two guards, verbatim from the extraction source** (`e2e/mobile-booker-path.spec.ts:466-486`) —
both travel with the function, neither is optional:

```ts
// Guard the guard, twice: an empty line never wraps, and a `normal` line-height parses to NaN,
// which compares false against every bound and would make this a silent pass.
expect(
  measured.text.length,
  `${where}: bar line ${i} rendered no text, so a no-wrap assertion over it is free.`,
).toBeGreaterThan(0);
expect(
  Number.isFinite(measured.lineHeight),
  `${where}: bar line ${i} resolves no numeric line-height (${JSON.stringify(measured.text)}), so ` +
    "there is no single-line reference to compare against.",
).toBe(true);

expect(
  measured.clientHeight,
  `${where}: the bar's ${i === 0 ? "rate" : "fee note"} line wraps — it renders ` +
    `${measured.clientHeight}px against a one-line box of ${measured.lineHeight}px. Text: ` +
    `${JSON.stringify(measured.text)}. The bar's height is a fixed 64px, so a second line is ` +
    "clipped rather than accommodated (12-UI-SPEC § The sticky bottom bar).",
).toBeLessThanOrEqual(measured.lineHeight + TOLERANCE_PX);
```

**One-`evaluate`-one-typed-object pattern** (`e2e/helpers/overflow.ts:63-102`): read everything inside
the page in a single `page.evaluate`, return a typed record, assert in Node. Never assert inside the
browser.

---

### `e2e/axe-sweep.spec.ts` (test, table-driven route sweep)

**Analog:** `e2e/overflow-320.spec.ts`'s AC#29 block. RESEARCH § Open Questions 1 recommends a new
file that *imports* its rows rather than retyping them; the row shape, the skip idiom and the loop
below are what it must copy.

**Row-type pattern** (`e2e/overflow-320.spec.ts:296-340`) — every field carries prose, and `skip` is
mandatory whenever `path` is `null`:

```ts
type RouteRow = {
  /** How the route is named in failures and skip messages. */
  readonly name: string;
  /**
   * `null` for a route this harness cannot reach, in which case `skip` says why, IN THE MESSAGE.
   * A resolver rather than a literal where the path depends on the catalogue.
   */
  readonly path: ((page: Page) => Promise<string | null>) | string | null;
  /** Why it is unreachable. Required when `path` is `null` — a silent skip is not a skip. */
  readonly skip?: string;
  /**
   * The declared selector that proves the route actually rendered ITS OWN surface.
   * … Every assertion below is satisfied by a blank page, so each row has to name something only
   * that route renders.
   */
  readonly tell: string;
  readonly served?: boolean;
  readonly open?: (page: Page) => Promise<void>;
  readonly scope?: string;
};
```

**Reachability guard (TRAP 1)** (`:689-707`) — the axe sweep's Pitfall-4 fix is this function,
unchanged, run *before* `.analyze()`:

```ts
async function expectReachable(page: Page, row: RouteRow, where: string): Promise<void> {
  await expect(
    page.locator(row.tell),
    `${where}: the route rendered no \`${row.tell}\`, so it is not the surface this row names. ` +
      "Every assertion in this file passes against a page with nothing on it, which is why this " +
      "check runs first and is a failure rather than a skip.",
  ).not.toHaveCount(0, { timeout: 15_000 });
}
```

**Named-skip pattern + the loop** (`:709-776`) — the skip *throws its reason into the run's output*;
that is what makes AC#2's "zero silent absences" mechanical:

```ts
test.describe(`AC#29 — nothing scrolls sideways at ${FLOOR_PX}px`, () => {
  // 60s rather than the default 30s. Two rows resolve their path from the running app and every row
  // waits on a route the dev server may still be compiling …
  test.describe.configure({ timeout: 60_000 });

  for (const row of ROUTES) {
    for (const theme of THEMES) {
      const title = `${row.name} · ${theme}`;

      if (row.path === null) {
        // NAMED, never silent. The reason travels into the run's own output.
        test.skip(title, () => {
          throw new Error(`unreachable: ${row.skip}`);
        });
        continue;
      }
      const resolvePath = row.path;

      test(title, async ({ page }) => {
        await seedTheme(page.context(), theme);
        await page.setViewportSize({ width: FLOOR_PX, height: 800 });
        const path = typeof resolvePath === "string" ? resolvePath : await resolvePath(page);
        expect(path, `${title}: this row resolves its path from the running app, and the app ` +
          "produced none. The local catalogue is empty — seed it (`npm run db:seed`) before reading " +
          "this as an overflow failure.").toBeTruthy();

        await page.goto(`${BASE}${path}`);
        await page.evaluate(() => document.fonts.ready);
        if (row.open) { await row.open(page); await page.evaluate(() => document.fonts.ready); }

        const where = `${title} · ${FLOOR_PX}px`;
        await expectReachable(page, row, where);
        await expectNoOverflow(page, where);
        if (row.scope) await expectNoOverflowWithin(page, row.scope, where);
      });
    }
  }
});
```

→ The axe sweep is this loop with `THEMES` collapsed to `["court"]` (D-138), widths `[320, 1280]`
(AC#16), and `expectNoOverflow` replaced by `expectAxeClean`.

**Reachability-source pattern (RESEARCH Pattern 4)** — derive each row's `tell` from
`src/lib/design/visual-baselines.ts`'s `hook`/`hookWhy` rather than retyping. That module's row shape
is already the right one (`src/lib/design/visual-baselines.ts:94-121`):

```ts
export type SurfaceRow = {
  readonly kind: SurfaceKind;
  readonly url: string | null;
  /**
   * A CSS selector that MUST match at least once before any pixel is compared.
   * Trap 1 from `e2e/scroll-area-overflow.spec.ts:33-39`, in its most dangerous form yet …
   */
  readonly hook: string;
  /** Why that selector proves the surface actually rendered its subject, rather than merely loading. */
  readonly hookWhy: string;
  readonly blocked: string | null;
};
```

**Import-the-constant-never-retype-it pattern** (`e2e/overflow-320.spec.ts:17-31`) — the rule for any
string the sweep waits on:

```ts
// The support constant is imported rather than re-declared, for `site.ts`'s own stated reason: it is
// pure and isomorphic (no `server-only` guard) precisely so a gate can read it. … a spec carrying its
// own copy would go green the day the real one changed.
import { SUPPORT_EMAIL } from "../src/lib/site";
```

---

### `e2e/keyboard-composites.spec.ts` (test, event-driven)

**Analog:** `e2e/auth-keyboard.spec.ts` — the shipped five-property walk. The new spec is the same
file aimed at calendar / slot picker / wizard / dialogs / sheets.

**Import block** (`e2e/auth-keyboard.spec.ts`, top) — every focus primitive comes from the one helper;
no local re-definition (AC#20 will assert exactly this):

```ts
import {
  expectRing, indicatorOf, sameIndicator, partitionDevOverlay, probeCandidateStops,
  resetFocusToTop, walkForward, walkBackward, DEV_OVERLAY_TAG, WALK_BOUND,
  type Indicator, type StopProbe,
} from "./helpers/focus";
```

**Arm-then-walk pattern** (`:410-423`):

```ts
/** Navigate, confirm the auth composition, run the row's resolver, confirm the row's own surface. */
async function arm(page: Page, row: WalkCase): Promise<void> {
  await page.goto(`${BASE}${row.path}`);
  await expectReachable(page, PANEL, `${row.caseName} (before the resolver)`);
  if (row.open !== undefined) await row.open(page);
  await expectReachable(page, row.tell, row.caseName);
}
```

**Asserted dev-overlay partition** (`:434-451`) — copy whole; it is what keeps the filter from
swallowing a product control:

```ts
function partitionAsserted(raw: StopProbe[], where: string, edge: "start" | "end") {
  const { stops, overlay } = partitionDevOverlay(raw);
  expect(overlay.map((s) => s.tag), `${where}: something other than the \`${DEV_OVERLAY_TAG}\` ` +
    "dev-tools host was dropped from the walk. Only the dev server's own furniture may be excluded.")
    .toEqual(overlay.map(() => DEV_OVERLAY_TAG));

  const withoutEdge = edge === "end" ? raw.slice(0, stops.length) : raw.slice(overlay.length);
  expect(withoutEdge.map((s) => s.descriptor), `${where}: a dropped \`${DEV_OVERLAY_TAG}\` stop was ` +
    `not at the ${edge} of the sequence, so the filter would be hiding part of the real tab order ` +
    "rather than the dev overlay.").toEqual(stops.map((s) => s.descriptor));

  return stops;
}
```

**The five properties, in their shipped form** (`:571-712`). Map them onto AC#19's names:

| AC#19 property | Shipped assertion to copy | Line |
|---|---|---|
| **reachable** | `expect(stops.map(s => s.descriptor)).toEqual([...row.stops])` — one `toEqual` over the whole array, never a per-stop loop | `:604-609` |
| **operable** | the composite's own key contract (arrows on the calendar/slider), plus `expect(stop.focusVisible).toBe(true)` proving a *real* key press landed | `:618-623` |
| **indicated** | `expectRing(stop, where)` + `expectIndicatorPaints(stop, where)` + the unfocused-baseline difference check | `:615-642` |
| **escapable** | not yet shipped — nearest is the reverse-walk trap check at `:692-704`; build Escape-closes-and-does-not-trap on that shape | `:687-704` |
| **returned** | not yet shipped — assert `probeActiveStop(page)?.descriptor` equals the trigger's descriptor after close | — |

**The unfocused baseline** (`:571-582`) — the half that makes an indicator an *indicator*:

```ts
// ── THE UNFOCUSED BASELINE, taken BEFORE a key is pressed ─────────────────────────────────
// Keyed by the SAME descriptor the walk produces, which is why both readings come out of one
// projection in the shared helper: a descriptor computed one way here and another way there
// would miss on every lookup and the difference check below would silently measure nothing.
const candidates = await probeCandidateStops(page);
const unfocused = new Map<string, Indicator>();
for (const candidate of candidates) {
  if (!unfocused.has(candidate.descriptor)) unfocused.set(candidate.descriptor, indicatorOf(candidate));
}
```

**Bounded walk** (`:454-466`) — a focus trap must report as an assertion, never a hang:

```ts
const raw = await walkForward(page);
expect(raw.length, `${where}: the forward walk hit its ${WALK_BOUND}-press bound without focus ever ` +
  "leaving the document. That is what a focus trap looks like from here, and the bound is why it is " +
  "an assertion instead of a hang.").toBeLessThan(WALK_BOUND);
```

⚠ **`WALK_BOUND` is 40 and the widest shipped document is 14 stops.** A dialog or sheet with a focus
trap legitimately never leaves — the new spec's escapable/returned properties must press `Escape`
rather than walking past the trap. Do not raise the bound.

---

### `tests/design/one-tree.test.ts` (vitest design gate, source-AST scan)

**Analog:** `tests/design/loading-coverage.test.ts` — the tree's canonical `src/app/**` AST scan, and
the file whose pinned counts this phase may also move.

**Imports + scanned-tree-as-one-constant** (`:214-220`):

```ts
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync, type Dirent } from "node:fs";
import { resolve, join, dirname, relative } from "node:path";
import ts from "typescript";

/** The scanned tree, as ONE constant — probe (c) above is a one-line edit here. */
const APP_DIR = resolve(process.cwd(), "src/app");
```

**Recursive collector with a named-guard failure mode** (`:305-323`):

```ts
/** Every file with a given basename under a directory, recursively. `[]` on a missing tree. */
function collect(dir: string, basename: string, out: string[] = []): string[] {
  let entries: Dirent[];
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch {
    // 11-02's rule: a broken scan surfaces as one named guard-the-guard failure, never a stack trace
    // that buries which gate went quiet.
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collect(full, basename, out);
    else if (entry.name === basename) out.push(full);
  }
  return out;
}

const rel = (p: string) => relative(process.cwd(), p).replace(/\\/g, "/");
```

**Guard-the-guard block, asserted FIRST** (`:495-532`) — three guards before any real clause. AC#10's
"zero viewport-conditional branches" is an empty-list assertion and needs all three:

```ts
it("scans the route tree it is supposed to be policing", () => {
  expect(PAGES.length, `scanned: ${PAGES.map((p) => p.page).join(", ") || "(nothing)"}`)
    .toBeGreaterThanOrEqual(20);
  // Named, not just counted: one page from each side of the classification …
  expect(PAGES.map((p) => p.page)).toContain("src/app/(auth)/login/page.tsx");
  expect(PAGES.map((p) => p.page)).toContain("src/app/(public)/page.tsx");
});

it("really parsed every page it counted", () => {
  // … a glob can match 27 files while the parse silently yields an empty statement list …
  for (const page of PAGES) {
    expect(page.statements, `${page.page} parsed to zero statements`).toBeGreaterThan(0);
  }
});

it("finds BOTH classes over the real tree, so the classifier is discriminating", () => {
  // THE POSITIVE CONTROL. A classifier stuck at `true` or at `false` makes one of the two list
  // assertions vacuous …
});
```

**The prescribed-grep-is-wrong pattern** (`:325-334`) — this is *exactly* RESEARCH Pitfall 7's
`matchMedia` trap, and this file already has the worked precedent for it:

```ts
// THE BOX-LITERAL CLAUSE — the Task-2 acceptance criterion, made mechanical.
//
// The plan states it as `grep -rEc "\bh-[0-9]|\bw-[0-9]|aspect-\[" src/app/**/loading.tsx` returning
// zero. That grep reports SIX hits against a correct tree, every one of them a container width:
// `\bw-[0-9]` matches the `w-4` inside `max-w-4xl`, because `-` is a word boundary. It is the tenth
// prescribed-grep false positive in this phase … So the AST classifier below passes it and bans the
// thing that was meant.
```

→ AC#11 must count **call expressions**, not the string `matchMedia` (which occurs twice on one call
site: `publish-checklist.tsx:148` guards with `typeof window.matchMedia !== "function"` before
`:149` calls it). Write the failure message so it says *which* call sites were counted.

**Self-test / both-directions pattern** (`:642-694`) — the file drives its own classifier over
synthetic sources never written to disk, e.g. *"does NOT qualify a sync page whose await is inside an
event handler"*. AC#10's classifier needs the same: a fixture that IS a viewport-conditional branch
and one that only looks like one.

---

### `tests/design/focus-definition.test.ts` (vitest design gate, source text scan)

**Analog:** `tests/design/sheet-absent.test.ts` — the tree's canonical *absence* gate, and it already
carries the two things AC#20 needs: a scanned-tree floor and a comment-stripping pass.

**Imports + declared tree + floor** (`tests/design/sheet-absent.test.ts:155-175`):

```ts
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, join, relative } from "node:path";

import { stripComments } from "./helpers/strip-comments";
import { readGlobalTokens } from "./helpers/compile-css";

const SRC_DIR = resolve(process.cwd(), "src");
const SHEET_BLOCK = "src/components/ui/sheet.tsx";
const OVERLAY_PRIMITIVE = "src/components/patterns/responsive-dialog.tsx";
const GATE_TREE = ["src/app/", "src/components/"] as const;
const MIN_COMPONENT_FILES = 50;
```

→ For AC#20 the tree is `e2e/`, the floor is a count of spec files, and the subject is
"how many places compute `outlineStyle` / `boxShadow` into a focus verdict". **`stripComments` is
mandatory** — `e2e/overflow-320.spec.ts:1017-1029` and `auth-keyboard.spec.ts:468-489` both *quote*
DS-05's recipe in prose, and an un-stripped scan would report them as second definitions.

**Both-directions-on-fixtures pattern** — `tests/design/gitignore-baselines.test.ts:410+` runs the
same check against a synthetic negative (`a rule argued for in a comment does not satisfy the rule
check`). The failure message must have been produced by something other than a passing run —
`money-path-invariants.test.ts:71-77` states the rule:

```ts
/**
 * The failure message, built by a function so the SELF-TEST below can drive the same code path with a
 * synthetic set (the `leak.test.ts:208-212` rule). A message that has only ever been produced by a
 * passing assertion — i.e. never — is a message nobody has read.
 */
```

---

### `tests/design/baseline-theme.test.ts` (vitest design gate, filesystem + git)

**Analog:** `tests/design/gitignore-baselines.test.ts` — same gate, other half. AC#26's platform half
is already there; only the `*-grove-*.png` half is new. **Prefer extending that file** unless the
planner has a reason to split; if split, copy this shape.

**Declared rules + control pathspecs + a floor** (`:212-234`):

```ts
const REPO_ROOT = process.cwd();
const GITIGNORE_PATH = resolve(REPO_ROOT, ".gitignore");
const FORBIDDEN_PLATFORM_RULES = ["*-win32.png", "*-darwin.png"] as const;
const CONTROL_PATHSPECS = { /* root + nested, each with `pathspec` and `mustInclude` */ };
const MIN_RULE_LINES = 20;
```

**The positive control** (`:353-371`) — this is the pattern that makes an "empty list" result mean
something. AC#26's grove half needs its court twin as the control:

```ts
// And the positive controls — a `git ls-files` that returns nothing for a pathspec that MUST match
// is the vacuity trap in miniature, and half 2 cannot notice it from the inside.
if (controlNested.ok) {
  expect(
    controlNested.paths,
    `the control pathspec \`${CONTROL_PATHSPECS.nested.pathspec}\` did not reach a file inside a ` +
      `directory. git pathspec wildcards crossing \`/\` is what lets \`*-win32.png\` find a baseline ` +
      `nested under e2e/visual/<spec>.spec.ts-snapshots/. If that changed, half 2 is vacuous.`,
  ).toContain(CONTROL_PATHSPECS.nested.mustInclude);
}
```

→ Control for the grove half: assert the scan *does* find the 36 `*-court-visual-linux.png` files on
disk, then assert zero `*-grove-*`. Without the first, the second is free.

**Failure message names the remedy AND the wrong remedy** (`:393-408`):

```ts
expect(paths, `git tracks ${paths.length} platform baseline(s) that may never be committed: ` +
  `${paths.join(", ")}. \`.gitignore\` is advisory — \`git add -f\` bypasses it entirely … Remove ` +
  `each with \`git rm --cached <path>\`, which takes it out of the index and LEAVES it on disk … ` +
  `Regenerate the real baseline in mcr.microsoft.com/playwright:v1.60.0-noble via the dispatch job ` +
  `(D-27).`).toEqual([]);
```

---

### `src/app/(app|host|auth|legal)/<throw>/page.tsx` ×4 (route, deliberate throw)

**Analog:** `src/app/dev/throw/page.tsx` — copy it four times, one per route group. RESEARCH Pitfall 6
is the correction: the UI-SPEC's `src/app/dev/throw-in/[group]/` path reaches the ROOT boundary and
closes nothing.

**The whole file, which is the pattern** (`src/app/dev/throw/page.tsx:67-95`):

```ts
import type { Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * The sentinel, exported so the e2e spec can import it rather than retype it.
 * TWO LITERALS IN TWO FILES ARE TWO THINGS THAT DRIFT … the spec asserts a string appears ZERO
 * times, so a typo on either side makes the assertion pass against a page that is leaking.
 */
export const SENTINEL_LEAK_PROBE = "SENTINEL_LEAK_PROBE";

/** Noindex, following `/dev/theme` and `invite/[token]`. The production guard already 404s it. */
export const metadata: Metadata = {
  title: "Deliberate throw",
  robots: { index: false, follow: false },
};

export default function DevThrowPage() {
  if (process.env.NODE_ENV === "production") notFound();

  // A SERVER-RENDER throw, deliberately, rather than a client-side one …
  throw new Error(SENTINEL_LEAK_PROBE);
}
```

⚠ **The sentinel is IMPORTED, never redeclared** (RESEARCH § Security, threat "Error text leaking
through a boundary"). The four new pages import `SENTINEL_LEAK_PROBE` from the shipped route.

**The loading-coverage duty, stated in the analog's own header** (`:47-51`) — the planner must copy
this decision-and-record shape:

```
// The cost of THIS file, stated plainly so it is not discovered later: it is a 28th `page.tsx`, so
// `loading-coverage.test.ts`'s pinned counts move 27→28 and 7→8. That gate's own comment asks for
// exactly this — *"a change here means a ROUTE WAS ADDED and somebody has to decide which side it is
// on"*. The decision: the default export is SYNC and throws immediately, so the page component can
// never suspend and a `loading.tsx` beside it could never render. It joins the non-qualifying seven.
```

→ Four sync default exports ⇒ `EXPECTED_PAGES` 29→33 and `EXPECTED_NON_QUALIFYING` 8→12, in the same
commit, with the decision recorded. **`EXPECTED_QUALIFYING` stays 21.**

**Group-gate consequences (RESEARCH Pitfall 6, verified):** `(app)` inherits `layout.tsx`'s blocking
session gate (fixture must sign in — `signUpAndReachProfile` exists at
`e2e/overflow-320.spec.ts:240`); `(host)/host` additionally inherits the `canHost` gate
(`src/app/(host)/host/layout.tsx:42-54`) and needs the Phase-14 host fixture; `(auth)` and `(legal)`
gate nothing. `tests/design/blocking-session-gate.test.ts` must stay green — the guard sits *above*
any `<Suspense>`.

---

### `.planning/phases/17-…/deferred-items.md` (findings ledger)

**Analog:** `.planning/phases/16-image-crop-framing/deferred-items.md`.

**File header** (`:1-5`):

```markdown
# Phase 16 — deferred items

Out-of-scope discoveries, logged rather than fixed (executor scope rule). Each names the file that
owns it, the plan that found it, and what a fix would cost.
```

**Per-finding shape** (`:9-48`) — this is the exact four-part format UI-SPEC § The escalation format
requires (measurement · owner file · why not fixed here · cheapest correct fix):

```markdown
## D1 — The zoom slider ships with NO accessible name

- **Found by:** plan 16-10, `tests/profile/avatar-field.test.tsx` (jsdom), 2026-08-25
- **Owner file:** `src/components/profile/image-crop-dialog.tsx` (plan 16-09's), the `<Slider>` call
- **Severity:** WCAG 2.2 SC 4.1.2 (Name, Role, Value) failure on a shipped control

**Measured, not inferred.** … Read out of a real render:

```
thumbAriaLabel : null
rootAriaLabel  : "Zoom"
queryAllByRole("slider", { name: "Zoom" }).length : 0
```

**Why it was not fixed here.** …

**Cheapest correct fix:** …

**Suggested owner:** plan 16-13 …
```

**Closure annotation pattern** (`:9-15`) — when a later phase closes a row, the row is *kept* and
annotated, never deleted:

```markdown
> **CLOSED — confirmed by the phase verifier 2026-08-26.** The vendored block now forwards … The row
> below is kept because the MEASUREMENT is the useful part …
```

→ Phase 17 closes [13-15], [16-D7], [16-D9], [15-12] in *other phases'* files. Per D-199 those stay in
their own files; annotate them with this idiom rather than moving them.

---

### `e2e/overflow-320.spec.ts` (MODIFIED — 7 new rows, 3 fixes)

**Pattern source: itself.** Four distinct edits, each with its in-file precedent:

**1. The seven un-measured host/booker routes** → they need seeded fixtures, so they belong in the
AC#36 Phase-14 block (`:1741-2013`), not AC#29. That block's row type already carries the touch-target
mechanism the new rows need:

```ts
type TouchTarget = { readonly name: RegExp; readonly why: string };
```

and `TOUCH_FLOOR_PX = 44` (`:1570`) is asserted **by name, per surface** — never as a blanket
(`expectTouchTargets`, `:1985`). The conformance floor stays `TARGET_FLOOR_PX = 24` (`:905`).

**2. [16-D9] — one line** on the `/listings/[id] · sheet open` row (~`:394-418`). The loop at `:772`
already reads the field:

```ts
scope: '[data-testid="responsive-dialog"]',   // ← ADD. Reported 48 named offenders when measured.
```

**3. [15-12] — `expectTargets` after the tell.** The AC#29 loop already does it in the right order
(`:765-767`: `expectReachable` then measure); the AC#30 rows do not. The fix is to move the call, and
the pattern to copy is `:757-765`:

```ts
// The one row whose subject is behind an interaction. It runs BEFORE `expectReachable`, because
// that guard's `tell` is the thing the interaction produces.
if (row.open) { await row.open(page); await page.evaluate(() => document.fonts.ready); }

const where = `${title} · ${FLOOR_PX}px`;
await expectReachable(page, row, where);
```

**4. AC#22 — ProfileLink ≥24px + the 226px cluster.** `collectControls` (`:950-984`) currently
*excludes* the shell chrome, with the finding written into its docblock (`:921-933`). That exclusion
is the thing D-196 retires. The exclusion to delete or narrow:

```ts
// The app shell, excluded with a measurement and a reason — see the docstring above.
if (
  el.closest('[data-testid="site-header"]') !== null ||
  el.closest('[data-testid="site-footer"]') !== null
) {
  continue;
}
```

→ ⚠ **The docblock above it must be rewritten in the same commit** (UI-SPEC § May fix in place:
*"Correcting a stale comment that promises coverage this phase did not build"*). Leaving a comment
that says the finding "is NOT this plan's to fix" beside a fixed finding is the defect class Phase 15
exists to repair (`:342-349` says so about this very file's own header).

**⚠ Editing-protected regions:** this file records that plans 15-10 and 16-15 forbade editing
pre-existing rows and comments (`:49-52`). Those constraints belonged to those plans, not to this one
— but the *idiom* stands: when a stale phrase is left standing, flag it as history in the file header
rather than silently correcting it in place.

---

### `e2e/host-headings.spec.ts` (MODIFIED — the outline walk joins the 28-state loop)

**Pattern source: itself,** `recordHeading` (`:370-396`). The outline walk is a second measurement
inside the same function, at the same three widths, using the same accessibility-tree read:

```ts
async function recordHeading(page: Page, where: string): Promise<void> {
  const h1 = page.getByRole("heading", { level: 1 });

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });

    await expect(h1, `${where} · ${width}px: this document offers a number of first-level headings ` +
      "other than ONE. Two roots give a screen-reader user two answers to 'what page is this' …")
      .toHaveCount(1);

    const size = await h1.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    // … NaN/zero guard … then push a Measurement
  }
}
```

⚠ **`getByRole("heading", …)` not `querySelectorAll("h1")`, and the reason is load-bearing** (`:363-368`):
the role query reads the accessibility tree, so a heading inside a `display: none` subtree (the
`hidden md:block` desktop tables) does not count. The outline walk must read levels the same way, or
it will report a skipped level on a responsive surface that shows one tree.

**Vacuity guard for the walk** — copy the shape at `:387-392`: a computed value that reads back as
`NaN`/`0` is a *measurement failure*, not a small heading, and it would satisfy the comparison
perfectly.

**Red-watch (AC#21, RESEARCH Pattern 3):** break with an `h1` → **`h3`** skip, never a duplicated
level. A duplicate is the easy case and proves nothing.

**Run it alone** — the describe is `test.describe.configure({ mode: "serial" })` for a stated reason
(`:441-445`): every case reads/writes the same seeded listing, and `beforeAll` runs once per worker.

---

### `e2e/avatar-crop.spec.ts` (MODIFIED — D-197, two assertions flipped)

**Pattern source: itself,** `:848-865`. The comment being invalidated is the interesting part:

```ts
// ⚠ `data-disabled`, NOT `toBeDisabled()`. MEASURED: Radix's thumb is a `<span role="slider">`
// that carries `data-disabled=""` and drops out of the tab order, but exposes NO
// `aria-disabled` — which is what `toBeDisabled()` reads on a non-native control, so it would
// report every state as enabled. … the missing `aria-disabled` is Radix's own choice and is logged
// as D7 rather than patched over here. This file asserts the mechanism that IS shipped rather than
// the one that should be.
const disabledAttr = await slider.getAttribute("data-disabled");
const tabindex = await slider.getAttribute("tabindex");
```

→ The flip to `toBeDisabled()` **requires deleting/rewriting this comment in the same commit**, and
the `tabindex` half stays (D-197: the thumb stays out of the tab order). RESEARCH § Assumptions A2
flags that `aria-disabled` making `toBeDisabled()` pass is unverified — run this file first.

---

### `src/components/ui/slider.tsx` (MODIFIED — the ONE sanctioned vendored edit)

**Pattern source: itself,** the D1 fix docblock at `:30-55`. It is the precedent for how a vendored
edit is annotated in this repo — measurement, both halves of the change, and the case deliberately
left untouched:

```ts
/**
 * D1 — WHERE A SLIDER'S NAME HAS TO GO, AND WHY IT IS NOT WHERE THE CALLER PUT IT.
 *
 * MEASURED by plan 16-10 out of a real render (2026-08-25) and re-measured red before this fix: …
 * So a caller's `aria-label` is FORWARDED to the thumb when there is exactly one, and is left off
 * the Root — both halves matter. Leaving it on the Root as well would keep an `aria-label` on a
 * generic element, which is prohibited by ARIA and is a real axe finding (`aria-prohibited-attr`) …
 *
 * MULTI-THUMB SLIDERS ARE DELIBERATELY UNTOUCHED. …
 */
const isSingleThumb = _values.length === 1
const thumbLabel = isSingleThumb ? ariaLabel : undefined
```

**The edit site** — the Thumb, which today carries no `aria-disabled`:

```tsx
<SliderPrimitive.Thumb
  data-slot="slider-thumb"
  key={index}
  aria-label={thumbLabel}
  className="relative block size-3 shrink-0 rounded-full border border-ring bg-background …"
/>
```

→ D-197: `aria-disabled={props.disabled || undefined}`. **`|| undefined`, not `|| false`** — the same
`isSingleThumb ? ariaLabel : undefined` idiom two lines up, so React omits the attribute entirely
rather than rendering `aria-disabled="false"`.

⚠ **This file uses no semicolons and 2-space indent** (shadcn vendored style, unlike the rest of
`src/`). Match the file, not the repo.

---

### `src/components/patterns/site-chrome.tsx` (MODIFIED — D-196 ProfileLink padding)

**Pattern source: itself,** `ProfileLink` and its docblock (`:348-377`):

```tsx
/**
 * The `Profile` control: an icon below `sm:`, an icon plus its label from `sm:` up.
 *
 * TWO MECHANISMS, TWO DIFFERENT REASONS, AND THE COMMENT HAS TO SAY BOTH …
 *   • `hidden sm:inline` on the label … (the signed-in cluster measures 200px against 226px
 *     available, and dropping the label takes it to ~176px) …
 *   • `aria-label="Profile"` on the WRAPPER, and `aria-hidden="true"` on the glyph …
 */
export function ProfileLink({ href = "/profile" }: { href?: string } = {}) {
  return (
    <Link href={href} aria-label="Profile"
      className={cn(NAV_LINK_CLASS, "inline-flex items-center gap-1.5")}>
      <UserIcon aria-hidden="true" className="size-4" />
      <span className="hidden sm:inline">Profile</span>
    </Link>
  );
}
```

`NAV_LINK_CLASS` (`:114`) carries **no padding**: `"text-sm font-medium underline-offset-4 hover:underline"`.

→ D-196: padding goes on the **`<Link>`'s own `cn()` argument**, not on `NAV_LINK_CLASS` (which four
header links share — widening all four is a header change nobody asked for), and not on the glyph
(`size-4` stays; D-196 says padding, not a bigger glyph). The 226px re-measure lands in the same commit
and the docblock's `200px / 226px` figures are updated with the new measurement.

⚠ **`hidden` vs `aria-label` must not be merged** — UI-SPEC § Copywriting names this as a bug the repo
has already shipped once.

---

### DS-09 conversions ×5 in 4 files (MODIFIED)

**Measured sites** (RESEARCH § Summary finding 3 — five, not six):

| File | Line | Current | Width change on conversion |
|---|---|---|---|
| `src/components/search/search-bar.tsx` | `:327` | `"h-11 w-full min-w-[150px] justify-start gap-2 font-normal"` | **+12px** (`px-2.5` → `px-4`) — moves the truncate point |
| `src/components/search/search-bar.tsx` | `:428` | `"h-11 w-full min-w-[130px] justify-start font-normal"` | **+12px** |
| `src/components/group/group-refresh.tsx` | `:70` | `<Button type="button" variant="outline" className="h-11" …>` | +12px, but no shot baseline |
| `src/components/group/regenerate-link-button.tsx` | `:104` | `<Button variant="outline" className="h-11 w-full sm:w-auto">` | +12px, no shot baseline |
| `src/components/group/remove-attendee-button.tsx` | `:124` | `<Button variant="outline" className="h-11 px-3" aria-label={…}>` | **zero** — `px-3` in `className` wins over the variant's `px-4` via tailwind-merge |

⚠ **`search-bar.tsx:291/377/402/477` are `<SelectTrigger>` / non-`<Button>` and are NOT in scope** —
`brand-recipe.test.ts:727-729` states they expose no `touch` size. Converting them is out of the
measured five.

⚠ **The two `regenerate-link-button.tsx` / `remove-attendee-button.tsx` sites carry a comment
justifying the hand-rolled height** (`"h-11 clears the 44px touch target (08-UI-SPEC §Spacing)"`).
Those comments become stale on conversion — rewrite them in the same commit.

**Ceiling flip** — `tests/design/brand-recipe.test.ts:756-759`:

```ts
expect(
  handRolled.length,
  `hand-rolled 44px <Button> heights:\n${handRolled.join("\n")}`,
).toBeLessThanOrEqual(6);
```

→ AC#34: becomes `.toBe(0)`. The `:741-755` comment block ("The six left are Phase 17's to convert
under DS-09, which is why this is a ceiling and not a zero") is rewritten to record that Phase 17
converted them and that the measured count was **5, not 6** — the ceiling-that-reads-as-a-decision
failure the file's own docblock warns about.

---

### `src/lib/design/selector-contract.ts` + the 2 components that get the ids (MODIFIED)

**Pattern source: itself.** Adding an id without a row is a `tsc` error (TS2741), watched red in the
file's own header (`:19-35`).

**Row shape** (`:230-248`) — both fields mandatory, neither has a default:

```ts
/** One declared hook. Both fields are mandatory; neither has a default. */
export type SelectorRow = {
  /**
   * WHY a role or label query cannot carry the assertion this hook exists for.
   * Mandatory, and load-bearing rather than documentation. `contrast-pairs.ts:99-116` established the
   * rule this follows: a row without a reason is not a row.
   */
  readonly why: string;
  /** The plan that SHIPS this id into `src/`, as `11-NN`. */
  readonly owner: string;
};
```

**The `why` a container id must argue** — copy `"result-card"`'s form (`:291-298`), which is the
closest analog to both new rows (a container whose *count* is the assertion):

```ts
"result-card": {
  why:
    "A card container. Its interactive content — the title link, the CTA — stays on role queries; this " +
    "hook marks the CARD so that counting results counts results. `getByRole(\"link\")` counts LINKS, " +
    "and a card that gains a second link (a host name, a map pin) changes that count without changing " +
    "the number of spaces on screen.",
  owner: "11-08",
},
```

→ AC#12's two missing ids: the **search-results region** (`src/components/search/search-results.tsx`)
and the **availability calendar container** (`src/components/availability/availability-calendar.tsx`
— only `skeleton-calendar` exists today at `:869`, and that is the *fallback*, which is precisely why
counting it would answer the wrong question).

**Rows are grouped by owning plan with a divider** (`:255`, `:266`, `:290`): `// ─── 17-NN ───…`.

**JSX side** — the shipped spelling for a structural container
(`src/components/availability/booking-panel.tsx:200`):

```tsx
<div data-testid="booking-panel" data-placement={placement} className="space-y-4">
```

⚠ **D-32 floors** (`selector-contract.ts:38-50`): `getByRole >= 92` / `getByLabel >= 30` in `e2e/`,
asserted as floors and never equalities. Measured today: **303 / 84**. Converting a shipped
`getByRole`/`getByLabel` into a test id is the anti-pattern; ids go on structural containers only.

---

### AC#24 — the four stale "two-theme axe pass" comments (MODIFIED)

**All four verified present.** Note `e2e/helpers/theme.ts` has **three** two-theme sentences, not one.

| File | Line | The sentence |
|---|---|---|
| `src/lib/design/contrast-pairs.ts` | ~`:27` | *"That class of defect is covered instead by Phase 17's two-theme axe pass, on the rendered DOM."* |
| `tests/design/pair-drift.test.ts` | ~`:69` | *"That residue is covered by Phase 17's two-theme axe pass, on the rendered DOM — not by this file, and saying so is the point of saying it."* |
| `e2e/helpers/theme.ts` | `:3`, `:7`, `:28` | *"PHASE 17'S TWO-THEME AXE PASS"*, *"the axe pass would audit court twice and report full two-theme coverage"*, *"a two-theme shot is genuinely two themes"* |
| `src/components/theme/theme-provider.tsx` | `:20-21` | *"This is the seam Phase 11's theme-swap smoke and Phase 17's two-theme axe pass both depend on."* |

**Amendment pattern:** `e2e/helpers/theme.ts:17-28` is the tree's worked example of amending a stale
paragraph — **rewrite in place with the history preserved, never delete**:

```
// THE BASELINE PROHIBITION THAT STOOD HERE IS SATISFIED — READ THE NEXT PARAGRAPH AS HISTORY, NOT AS
// A STANDING RULE. Amended by plan 11-03; a prohibition left sitting beside the thing it prohibits is
// exactly the drift Phase 11 exists to end, so it is rewritten rather than deleted.
//
// While Phase 10 was in flight this paragraph read "NO VISUAL-REGRESSION BASELINE MAY BE CAPTURED IN
// THIS PHASE", because … All of those have landed. …
```

→ Each amended sentence must **name the limitation** (AC#24): court only, per D-138, and grove
therefore has no axe coverage at all. `contrast-pairs.ts`'s and `pair-drift.test.ts`'s sentences sit
inside a **"NOT COVERED — real blind spots"** list; the amended text stays in that list rather than
being promoted to a promise.

---

### `tests/design/money-path-invariants.test.ts` (MODIFIED — GATE-06 content digest)

**Pattern source: itself,** `:40-65`. The digest is a third `it()` inside the shipped describe, and
`migrations()` already exists.

**Guard-the-guard already shipped** (`:44-49`) — the new digest inherits it:

```ts
// Guard-the-guard: a wrong path would make `migrations()` return [] and every assertion below would
// pass vacuously against an empty list. The floor is well under the real count (26) …
it("actually found the migration directory", () => {
  expect(migrations().length, `read ${DRIZZLE_DIR} and found no .sql files — the path is wrong, so ` +
    `the pin below proves nothing`).toBeGreaterThan(20);
});
```

**The failure message that forbids its own easy fix** (`:54-63`) — copy this tone verbatim; it is the
whole reason the pin works:

```ts
expect(last, `drizzle/ now ends at "${last}", not "${LAST_MIGRATION}".\n\n` +
  `D-80: the v1.1 milestone ships ZERO schema migrations, and Phase 17 SC#4 (GATE-06) makes that a\n` +
  `milestone-closing proof. … a migration proposed inside a v1.1 phase plan is a SCOPE ALARM to raise\n` +
  `explicitly with the operator, never a thing to absorb quietly … \n\n` +
  `Do NOT "fix" this by updating LAST_MIGRATION.`).toBe(LAST_MIGRATION);
```

→ Digest input is `name + NUL + bytes` per file (a bytes-only digest misses a rename), `MIGRATION_COUNT
= 26`, and the message must say **"Do NOT fix this by updating the constant."** Red-watch: change one
character in a shipped `.sql`, observe red, restore.

---

## Shared Patterns

### 1. Vacuity guard first — the phase's single most-repeated requirement

**Sources:** `e2e/helpers/overflow.ts:41-52` + `:113-141` (`MIN_EXAMINED_ELEMENTS`),
`tests/design/loading-coverage.test.ts:495-532` (three guards before any clause),
`tests/design/money-path-invariants.test.ts:44-49`, `tests/design/gitignore-baselines.test.ts:333-371`
(positive controls).
**Apply to:** every new assertion in this phase, without exception.

```ts
expect(
  m.examined,
  `${where}: the measurement examined ${m.examined} elements. A page with nothing laid out on it ` +
    "never overflows, so this number is what makes the two assertions below mean something.",
).toBeGreaterThanOrEqual(MIN_EXAMINED_ELEMENTS);
```

The repo has recorded the scan-of-nothing failure **eight times**. The axe form is
`passes.length > 0` **and** `scannedNodes > 0`, both asserted before `violations == []`.

### 2. The `tell` — prove the surface rendered before measuring it

**Source:** `e2e/overflow-320.spec.ts:689-707`; the 60s variant with its measurement is
`e2e/host-headings.spec.ts:398-431`.
**Apply to:** every route row in the axe sweep, the keyboard spec and the seven new 320px rows.

```ts
await expect(
  page.locator(row.tell),
  `${where}: the route rendered no \`${row.tell}\`, so it is not the surface this row names. ` +
    "Every assertion in this file passes against a page with nothing on it, which is why this " +
    "check runs first and is a failure rather than a skip.",
).not.toHaveCount(0, { timeout: 15_000 });
```

⚠ Timeout is **measured, not defaulted**: 15s in `overflow-320`, 60s in `host-headings` (which
records a 20s compile miss on `/host/listings/[id]/availability`). Pick per-spec and say why.

### 3. Named skip — a silent absence is the failure AC#2 forbids

**Source:** `e2e/overflow-320.spec.ts:719-725` (the throw-into-the-run mechanism) + `:663-686` (four
worked `skip` strings).
**Apply to:** the axe route table, the extended 320px table, every surface inventory.

```ts
if (row.path === null) {
  // NAMED, never silent. The reason travels into the run's own output.
  test.skip(title, () => { throw new Error(`unreachable: ${row.skip}`); });
  continue;
}
```

A `skip` string is a paragraph, not a phrase — see `:672`: *"same as (app): no dev throw affordance
inside the (host) route group, and this boundary additionally sits behind the canHost capability gate,
so reaching it needs a seeded or signed-up host as well as a new route."*

### 4. Theme seeding — never click a switcher

**Source:** `e2e/helpers/theme.ts:57-71`.
**Apply to:** every e2e case in this phase. There is no runtime switcher (D-06); seeding pre-paint
avoids a flash and a post-hydration switch.

```ts
await seedTheme(page.context(), theme);
await page.setViewportSize({ width: FLOOR_PX, height: 800 });
await page.goto(`${BASE}${path}`);
await page.evaluate(() => document.fonts.ready);
```

⚠ On the **context**, before the first `goto`. The axe sweep seeds `"court"` only (D-138).

### 5. The failure message forbids the easy fix

**Sources:** `tests/design/money-path-invariants.test.ts:62` (*"Do NOT 'fix' this by updating
LAST_MIGRATION"*), `tests/design/loading-coverage.test.ts:573-576` (*"A CHANGE HERE MEANS A ROUTE WAS
ADDED … It does not mean this number should be bumped"*), `e2e/auth-keyboard.spec.ts:606-608` (*"If
the page is right and the declaration is stale, fix the declaration and say why in the summary — never
edit the page to make the sequence come true"*), `tests/design/gitignore-baselines.test.ts:387-390`
(*"do NOT satisfy this test with a comment"*).
**Apply to:** every pinned count, digest and declared sequence this phase writes or moves.

### 6. A closed inventory is a total `Record` over a const tuple

**Sources:** `src/lib/design/selector-contract.ts:119-254`, `src/lib/design/visual-baselines.ts:94-121`,
`accent-uses.ts:212` (`AccentUseCountIsTen`).
**Apply to:** the two new `SELECTOR_CONTRACT` rows; any new axe exclusion list.

Adding a name without its row is a **compile** error (TS2741, watched red in the file header). Never
`Partial<Record<…>>`, never an index signature — both compile silently.

### 7. Import the constant, never retype it

**Sources:** `e2e/overflow-320.spec.ts:17-31` (`SUPPORT_EMAIL`, `AVATAR_CROP_TITLE`,
`COVER_PREVIEW_TITLE`), `src/app/dev/throw/page.tsx:70-78` (`SENTINEL_LEAK_PROBE`),
`e2e/helpers/theme.ts:38-41` (`THEME_STORAGE_KEY`).
**Apply to:** the four new throw pages' sentinel; every string the axe sweep waits on; the sticky-bar
measurements (`STICKY_BAR_HEIGHT = "h-16"` at `src/lib/design/measurements.ts:336`,
`STICKY_BAR_CLEARANCE = "pb-20"` at `:345`).

⚠ **But assert the outcome, not the class** (RESEARCH Pitfall 5): asserting `pb-20` is present is a
statement about source, not pixels. Import the constants for the *message*; assert the box geometry
and the non-intersection.

### 8. Red-watch every new assertion, and record the mutation

**Sources:** `e2e/overflow-320.spec.ts:90-100` (the 12-failed/4-passed blast-radius argument),
`src/lib/design/selector-contract.ts:19-35` (the verbatim TS2741 output),
`e2e/auth-keyboard.spec.ts:498-504` (the ordering finding found by *running* the mutation).
**Apply to:** all four of this phase's new assertions. RESEARCH Pattern 3 pins the specific breaks:
heading walk vs an `h1`→`h3` **skip** (not a duplicate); GATE-06 digest vs a **one-character** `.sql`
edit; axe vacuity guard vs a URL that 404s (confirm the *guard* fires, not the violation list);
sticky-bar occlusion vs dropping `pb-20`.

The recorded form is a comment in the file naming the command, the mutation, the counts, and **why
the blast radius was the right one**.

### 9. `stripComments` before any source-text scan

**Source:** `tests/design/helpers/strip-comments.ts:78`, used by `sheet-absent.test.ts:159` and
`brand-recipe.test.ts:732`.
**Apply to:** `focus-definition.test.ts` (AC#20) and `one-tree.test.ts` (AC#10/11). This tree's
comments quote the very patterns the scans forbid — an un-stripped scan is red on correct code.

---

## Decision Point — the sticky-bar clause (RESP-03 B, AC#4-7)

RESEARCH § Test Map leaves this open: *"same (or a new `sticky-bar` block)"*. Both analogs exist and
the planner should pick one explicitly:

| Option | Analog | Argument for |
|---|---|---|
| A block inside `e2e/overflow-320.spec.ts` | its AC#30 / AC#36 blocks (`:1297`, `:2013`) | Reuses the seeded fixtures; the bars only exist on seeded routes |
| A new `e2e/sticky-bar.spec.ts` | `e2e/mobile-booker-path.spec.ts` clause (f) at `:488-494` | `overflow-320.spec.ts` is already 2,092 lines and its AC#29 half is deliberately seed-free |

The geometry pattern to copy either way — `e2e/mobile-booker-path.spec.ts` clause (f) header:

```
// ── (f) THE SHEET'S PINNED ACTION SURVIVES A SCROLL TO THE BOTTOM ────────────────────────────
// 320×568 is the case the pinned bar exists for: the sheet's content does not fit, so the booker
// WILL scroll, and an action that scrolls away with the content is an action they have to go
// looking for on the surface that replaces the whole rail.
```

Both testids are already declared in `SELECTOR_CONTRACT`: `booking-sticky-bar`
(`src/components/booking/booking-sticky-bar.tsx:165`) and `checkout-sticky-bar`
(`src/components/booking/checkout-sticky-bar.tsx:78`).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `package.json` / `package-lock.json` (`@axe-core/playwright@4.13.0`) | config | dependency | No in-tree pattern for adding a dev dependency; RESEARCH § Package Legitimacy Audit is the whole procedure. **Expect exactly two new lockfile entries** (`@axe-core/playwright` + `axe-core`) and nothing else — this repo's own `"postinstall": "node scripts/patch-kysely-adapter.mjs"` re-runs on any `npm i -D` and is not a Phase-17 change. |

**Partial-analog gaps to flag to the planner** (an analog exists for the file, but not for one clause
inside it):

- **AC#19 "escapable" and "returned"** — `e2e/auth-keyboard.spec.ts` has no dialog/sheet, so neither
  property has a shipped assertion. The reverse-walk trap check (`:687-704`) is the nearest shape.
- **The heading *outline* walk** — `host-headings.spec.ts:93` says the file "says nothing about `<h2>`
  and below". The level-collection code is genuinely new; only the read mechanism
  (`getByRole("heading", { level })`) and the guard idiom transfer.
- **AC#26's grove half** — `gitignore-baselines.test.ts` "mentions `grove` nowhere" (verified). The
  scan shape transfers; the pathspec and its positive control are new.

---

## Anti-Patterns This Tree Will Punish

Named because each is a plausible-looking move whose analog exists *as a warning*:

| Move | Where the repo argues against it |
|---|---|
| A second focus definition in `e2e/` | `e2e/helpers/focus.ts:1-33` (D-16 one-import-site) — and AC#20 makes it mechanical |
| A blanket 44px target assertion | `e2e/overflow-320.spec.ts:890-905` — 44 would be **red on correct code**; 24 is the conformance bar, 44 is asserted by name |
| Enabling axe's `target-size` rule | RESEARCH § Alternatives — a **second** definition of a floor `expectTargets` already owns; also disabled-by-default so a tag filter buys nothing |
| `.withTags([...]).options({rules})` | RESEARCH Pitfall 2 — `.options()` **replaces**; the tag filter is silently dropped and axe runs its wider default set |
| A fourth route table | RESEARCH § Alternatives — a fourth place a surface can be silently absent, which is what AC#2 forbids |
| A second `host-headings` file | RESEARCH § Anti-Patterns — the 28 states already carry their seeding and tells |
| Converting `getByRole`/`getByLabel` to test ids | `selector-contract.ts:38-50` — 303/84 measured against D-32 floors of 92/30; those are accessibility guarantees asserted as a side effect |
| `disableRules` on the axe builder | UI-SPEC AC#17 + RESEARCH § Security ("An axe `.exclude()` used to make a red green" → Repudiation) — forbidden outright |
| Bumping `EXPECTED_BLOCKED` / unblocking `wizard-cover-preview` | RESEARCH § Open Questions 4 — "the PM's to schedule, not a side effect" |
| Reading a green off a generation run, or off this box | RESEARCH Pitfall 10 — `platform = win32`, so the `visual` project **is not constructed at all** |

---

## Metadata

**Analog search scope:** `e2e/`, `e2e/helpers/`, `e2e/visual/`, `tests/design/`,
`tests/design/helpers/`, `src/lib/design/`, `src/components/{ui,patterns,search,group,availability,
booking,theme}/`, `src/app/dev/`, `.planning/phases/16-image-crop-framing/`
**Files scanned:** 36 listed / 21 read (14 read in full, 7 via targeted non-overlapping ranges)
**Pattern extraction date:** 2026-08-29
