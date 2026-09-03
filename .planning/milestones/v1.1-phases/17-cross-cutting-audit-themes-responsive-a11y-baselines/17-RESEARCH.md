# Phase 17: Cross-Cutting Audit — Themes, Responsive, A11y & Baselines - Research

**Researched:** 2026-08-29
**Domain:** Conformance auditing of a shipped Next.js 16 / Tailwind 4 design system — automated accessibility (axe-core), responsive floor measurement, keyboard-operability walks, visual-regression baseline regeneration, and a byte-level migration pin
**Confidence:** HIGH (every number below was measured in this tree on 2026-08-29 unless tagged otherwise)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

> **Namespace.** Project-global sequence; D-195 (16.1) was the previous highest. This phase starts
> at **D-196**. Qualify citations as "17-CONTEXT D-196" where collision with PROJECT.md rows is
> possible.
>
> **How these were made (PM, 2026-08-29):** the PM reviewed the four open areas and delegated all
> four to the SWE's stated defaults — "the wheel is yours." Each default below is therefore a
> deliberate decision, not an omission.

- **D-196 — [13-15] ProfileLink: fix it by padding + a deliberate re-open of the 226px header
  budget.** The 16×16 pointer target below `sm:` goes to **≥ 24px on both axes at 320px** via
  padding on the link (not a bigger glyph), and the signed-in header cluster is re-measured against
  its 226px budget **in the same commit** (UI-SPEC AC#22). If the re-measure shows the cluster no
  longer fits, that is a finding to escalate — do not shrink something else to make room silently.

- **D-197 — [16-D7] slider: the disabled state is EXPOSED to the accessibility tree; the tab-order
  behaviour stands.** Apply the spec's fix shape: `aria-disabled` on the thumb in
  `src/components/ui/slider.tsx`, both e2e assertions flipped to `toBeDisabled()` (AC#23). The thumb
  stays out of the tab order (Radix's choice stands — an inert control need not be a tab stop, but
  its state may not be invisible to AT). This is the phase's **one sanctioned vendored-file edit**
  (Registry Safety section) — compose over primitives everywhere else.

- **D-198 — the `/signup` radio group is NOT converted to roving tabindex; the why is recorded.**
  WCAG 2.1.1 is satisfied as shipped (every radio reachable and operable); the divergence is
  authoring practice against the WAI-ARIA pattern, not conformance. Converting would churn
  `e2e/auth-keyboard.spec.ts`'s declared 59-stop sequence for zero conformance gain — a rewrite
  move inside an audit. Record the observation where the spec asks for it and move on.

- **D-199 — Findings are BATCHED: one list at phase end, no mid-phase interruptions — with two
  named exceptions.** Escalate-class findings accumulate in this phase's `deferred-items.md` in the
  Phases 13–16 format (the measurement — a number, in a named theme, at a named width, on a named
  route; the owner file; why not fixed here; the cheapest correct fix). The PM reviews the list
  once, at phase close. **Immediate escalation only for:** (a) a GATE-06 scope alarm — any fix that
  appears to need a schema migration; (b) a finding that makes an acceptance criterion unreachable,
  since the phase cannot close around it either way.

- **D-200 — The phase MAY close green with recorded-but-unfixed escalate-class findings.** For
  escalate-class items, **the finding is the deliverable** (UI-SPEC remediation rules). The
  deferred-items list is input to the PM's next-milestone decisions, not a blocker on this phase's
  completion. Mechanical-class fixes (the "may fix in place" table) are NOT closeable-around — those
  get fixed, and an unfixed one is an incomplete phase.

- **D-201 — "Every surface" = production-reachable browser routes, and the inventory is enumerated,
  not remembered.** The route table's authoritative source is an enumeration of `src/app/**/page.tsx`
  (plus the route-state rows `tests/design/loading-coverage.test.ts` already pins); the researcher
  pins the exact list. Per UI-SPEC, every route in that enumeration appears in the table **either
  with a measurement or with a named reason** — zero silent absences. Excluded from the audit
  subject list, each with its reason recorded IN the table:
  - `src/app/dev/**` — audit *instruments* (`NODE_ENV`-gated out of production), not audit subjects
  - Email templates — not browser documents; covered by the existing `email-shell` / `email-tokens`
    suites
  - OG-image routes — not interactive documents (`og-routes.test.ts` owns them)
  - `global-error` — the one declared route-level axe exclusion (renders its own document; already
    excluded from the theme-swap probe with the same reason)

- **D-202 — Machine evidence is the whole bar; no hands-on UAT walkthrough for this phase.** The
  closing evidence is exactly what the UI-SPEC pins: a **green comparison run**
  (`npx playwright test --project=visual`, no `--update-snapshots`) on the phase's **head commit**,
  with its run id recorded (the [13-16] lesson — a generation run is not a pass). Baselines are
  regenerated **last**, after all fixes land, only via `.github/workflows/baselines.yml`
  (`workflow_dispatch`) in `mcr.microsoft.com/playwright:v1.60.0-noble`. A post-regen commit
  invalidates the evidence and re-runs the comparison.

### Claude's Discretion

The PM delegated execution shape entirely. Within the UI-SPEC's remediation boundary, the SWE
decides without asking: plan count and sequencing (instruments → measure → fix → regenerate last is
the presumed order), per-finding fix-vs-escalate classification against the two tables, instrument
design details (selector strategy per the shipped `selector-contract.ts` rules, vacuity guards,
red-watch procedure for every new assertion), and route-table mechanics.

### Deferred Ideas (OUT OF SCOPE)

None new — the discussion stayed within phase scope. Escalate-class findings the audit produces will
land in this phase's `deferred-items.md` per D-199/D-200; pre-existing deferred items stay in their
own phases' files.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description (REQUIREMENTS.md) | Research Support |
|----|-------------|------------------|
| **RESP-03** | Every surface is verified from 320px up, with the sticky bar present, and no price, countdown or label wraps or overflows | § RESP-03 Coverage Delta pins the **7 production routes with zero 320px measurement today**; § Instrument Inventory shows `expectNoOverflow` / `expectNoOverflowWithin` / the `scope` field / the no-wrap instrument all shipped; § Pitfall 5 documents the sticky-bar assertion shape |
| **RESP-04** | Search, listing detail, calendar, wizard, checkout and list surfaces each hold their defined structure at mobile, tablet and desktop from one component tree | § RESP-04 measured baseline (1 real `matchMedia` call site, 0 `useMediaQuery`, `sheet.tsx` absent); § Pitfall 7 (the `matchMedia` string-count trap); § New `data-testid` rows required and the compile-enforced mechanism for adding them |
| **GATE-02** | Every surface operable by keyboard alone with a visible focus indicator, incl. calendar, slot picker, wizard, dialogs and sheets | § Standard Stack (`@axe-core/playwright@4.13.0`, verified); § **Pitfall 1** (the declared tag set does NOT run `heading-order`/`region`/`landmark-*`); § Pitfall 2 (`.options()` destroys `.withTags()`); § Pitfall 3 (Next dev overlay's OPEN shadow root is inside axe's scan); § Keyboard-walk instrument inventory |
| **GATE-06** | The milestone ships zero schema migrations; a migration proposed in any phase plan is raised explicitly | § GATE-06 measured state (26 `.sql`, ends `0025_audit_resolved_by.sql`); § Code Example 4 (the content-digest extension and its red-watch) |
</phase_requirements>

---

## Summary

**This phase invents almost no mechanism.** Every instrument RESP-03, RESP-04 and GATE-02 need has a
shipped, gated nucleus in this repository: `expectNoOverflow` / `expectNoOverflowWithin` (with the
`scope` field already wired into the AC#29 loop), `expectRing` / `walkForward` / `walkBackward` /
`probeCandidateStops` / `partitionDevOverlay` / `resetFocusToTop`, the line-height-relative no-wrap
measurement in `mobile-booker-path.spec.ts`, the 28-state × 3-width loop in `host-headings.spec.ts`,
a 44-row `VISUAL_SURFACES` inventory that already carries a `url` + reachability `hook` + `hookWhy`
for every surface, and a compile-enforced `SELECTOR_CONTRACT` for adding a structural `data-testid`.
The single genuinely new dependency is `@axe-core/playwright@4.13.0` (verified: latest stable,
Deque first-party, 9.5M weekly downloads, `axe-core@~4.13.0`, peer `playwright-core >= 1.0.0`
satisfied by the installed `playwright-core@1.60.0`, no `postinstall`, slopcheck `[OK]`).

**Three findings materially change what the plans must do**, and all three contradict something the
UI-SPEC states in good faith:

1. **The UI-SPEC's declared axe tag set does not run the rules it says it relies on.** With
   `["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22aa"]`, `heading-order`, `region`,
   `landmark-one-main` and `page-has-heading-one` are **`best-practice`-tagged and will not run at
   all**, and `target-size` (SC 2.5.8) is **disabled by default in axe-core** and does not run under
   a tag filter either. So the UI-SPEC's *"Axe's own `heading-order` rule covers this on every other
   surface"* is false as written, and its `global-error` `region` exclusion is moot under the
   declared tags. The heading-order clause must therefore be carried by an instrument, not inherited.
2. **`.options()` on `AxeBuilder` REPLACES the whole option object**, so the natural
   `.withTags([...]).options({ rules: {...} })` spelling silently drops the tag filter and runs axe's
   *default* rule set instead — a strictly wider, noisier scan that nobody would notice was wider.
3. **The DS-09 gap is FIVE `<Button>` sites, not six.** Measured through the exact scan
   `brand-recipe.test.ts:721` uses (same walker, same `BARE_TOUCH_HEIGHT` regex, same
   `enclosingButtonTag`, same `stripComments`): five hits, in four files. The ceiling literal is 6
   and the test passes at 5, which is exactly the "a ceiling that reads as a considered decision and
   is a forgotten one" shape the file's own docblock warns about.

**A fourth finding is a correctness bug in the UI-SPEC's suggested [11-21] fix.** It proposes
`src/app/dev/throw-in/[group]/page.tsx` to reach the four unreached error boundaries. That file path
sits under **no route group**, so — as `src/app/dev/throw/page.tsx`'s own header records, confirmed by
driving the route rather than inferred — its errors are caught by **`src/app/error.tsx`, the root
boundary**, which the table already covers. Reaching `(app)/error.tsx` requires a page whose *file
path* is inside `src/app/(app)/`, and that route inherits the group layout's blocking session gate
(and, for `(host)`, the `canHost` gate).

**Primary recommendation:** sequence as *instruments and pins → measure → mechanical fixes →
baseline regeneration dispatch → green comparison run*, and treat the axe configuration as a single
`.options({ runOnly: {...}, rules: {...} })` call with an explicit rule-enable block, a mandatory
`.exclude("nextjs-portal")` carrying its reason, and a non-zero `passes.length` + scanned-node
vacuity guard before the empty-violations assertion.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 320px overflow sweep (RESP-03 A) | **Playwright e2e (`chromium` project)** | — | Needs real layout in real Chromium; `scrollWidth`/`clientWidth` do not exist in jsdom |
| Sticky-bar presence/pinning/occlusion (RESP-03 B) | **Playwright e2e** | — | Requires `position: fixed` boxes, a real viewport and a real scroll |
| No-wrap clause (RESP-03 C) | **Playwright e2e** | — | Depends on resolved `line-height` from the compiled theme; per-theme tokens |
| Viewport-conditional JSX scan (RESP-04, AC#10/11) | **Vitest `tests/design/**` (DB-free, in `npm run build`)** | — | A source-AST question; blocking by construction via `test:design` |
| One-instance-in-document counts (RESP-04, AC#12/13) | **Playwright e2e** | — | `[data-testid]` must resolve against `display:none` nodes; a source scan cannot count rendered instances |
| axe conformance sweep (GATE-02) | **Playwright e2e** | — | axe-core needs a live DOM with computed styles |
| Keyboard walk: reachable/operable/indicated/escapable/returned | **Playwright e2e** | — | `:focus-visible` only matches on real key presses (documented in `helpers/focus.ts`) |
| Heading-outline walk (GATE-02, [14-WR-03]) | **Playwright e2e — inside `host-headings.spec.ts`'s existing loop** | — | The 28 states already exist there with their seeding and tells; a second file would need both again |
| DS-09 adoption ceiling flip | **Vitest `tests/design/brand-recipe.test.ts`** | — | Source scan; already the owner |
| GATE-06 content digest | **Vitest `tests/design/money-path-invariants.test.ts`** | — | DB-free filesystem read; already runs inside `npm run build` |
| Baseline regeneration | **CI only — `.github/workflows/baselines.yml`, `workflow_dispatch`** | — | `updateSnapshots: "none"` is unconditional; the `visual` project is not constructed off Linux |
| Baseline **comparison** (closing evidence) | **CI only — `ci.yml` job `gate-visual`** | — | Same reason; **this machine is `win32`, so no local comparison is possible at all** |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@axe-core/playwright` | **4.13.0** (pin exact) | The GATE-02 automated accessibility engine | Deque first-party; the package Playwright's own accessibility-testing docs prescribe. `[VERIFIED: npm registry]` + `[CITED: playwright.dev/docs/accessibility-testing]` |
| `axe-core` | `~4.13.0` (transitive) | Rule engine | Pulled by the above; never imported from `src/` |
| `@playwright/test` | 1.60.0 (already pinned exact) | Runner | Satisfies `@axe-core/playwright`'s `playwright-core >= 1.0.0` peer — `node_modules/playwright-core` resolves to **1.60.0**, verified |
| `vitest` | 4.1.8 (installed) | Design-gate runner | `test:design` runs inside `npm run build`; new blocking gates land there |

### Supporting — already in the tree, extended not re-invented

| Module | Purpose | Extension this phase makes |
|--------|---------|----------------------------|
| `e2e/helpers/overflow.ts` | `FLOOR_PX=320`, `OVERFLOW_TOLERANCE_PX=0.5`, `MIN_EXAMINED_ELEMENTS=8`, `expectNoOverflow`, `expectNoOverflowWithin` | **None needed.** Both functions and both vacuity guards ship |
| `e2e/helpers/focus.ts` | `expectRing` (the ONE indicator definition), `walkForward`/`walkBackward`/`probeCandidateStops`/`probeActiveStop`, `partitionDevOverlay`, `resetFocusToTop`, `WALK_BOUND=40`, `indicatorOf`/`sameIndicator` | New per-surface walks import these; **no second focus definition** |
| `e2e/overflow-320.spec.ts` | 21-row AC#29 table (+`scope`,`open`,`served`,`tell`), 12-row AC#30 Phase-13 table, 6-row AC#36 Phase-14 table, `TARGET_FLOOR_PX=24` at :905, `TOUCH_FLOOR_PX=44` at :1570 | Route-table coverage extension; [16-D9] one-liner; [15-12] race fix |
| `e2e/host-headings.spec.ts` | 28 states × `WIDTHS=[320,768,1280]` = 84 pinned measurements; `expectSurface` tell guard | The outline walk joins `measureHeading`'s call sites |
| `e2e/mobile-booker-path.spec.ts` :443-486 | The no-wrap instrument with **both** mandatory guards | Generalise into a shared helper; keep both guards |
| `src/lib/design/visual-baselines.ts` | `SURFACE_IDS`, `VISUAL_SURFACES` (**44 rows**, each with `url`, `hook`, `hookWhy`), `VISUAL_BASELINES` (**78 rows**), `THEME_SWAP_SURFACES` (4, type-pinned), `THEME_SWAP_EXCLUSIONS` (1) | **Read.** Reuse `VISUAL_SURFACES` as the axe route table's reachability source |
| `src/lib/design/selector-contract.ts` | GATE-04 testid inventory; adding an id without its row is a **compile** error | Add rows for the RESP-04 structural containers that need one |
| `e2e/visual/freeze.css` | Determinism sheet, incl. `nextjs-portal { display: none !important }` | Read — its `nextjs-portal` rationale is the precedent for the axe exclusion |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@axe-core/playwright` | `axe-playwright` (community) | Not first-party; the UI-SPEC pins the Deque scope and Playwright's docs prescribe it. **Do not substitute.** |
| `.exclude("nextjs-portal")` on the axe builder | Run the sweep against `next build && next start` | A production build 404s `/dev/theme` and `/dev/throw` (T-10-01 / T-11-THROWROUTE) and costs minutes per run; `freeze.css`'s header already argues this trade and lands on hiding the one element. Excluding is cheaper and auditable. |
| Extending the shipped `overflow-320.spec.ts` route tables | A new `e2e/surface-sweep.spec.ts` | The three shipped tables carry the seeding, the tells, the theme loop and the skip-with-reason idiom. A fourth table is a fourth place a surface can be silently absent — which is precisely what AC#2 forbids. |
| A bespoke `target-size` axe rule enable | The shipped `expectTargets` 24px scan (`overflow-320.spec.ts:905`) | The shipped scan is measured, reports named offenders, and already carries the "a blanket 44 would be red on correct code" argument at :891-902. Enabling axe's `target-size` would add a **second** definition of the same floor — the drift `expectRing`'s one-import-site rule exists to prevent. |

**Installation (dev-only, pinned exact — the phase's ONLY supply-chain change):**

```bash
npm i -D @axe-core/playwright@4.13.0
```

**Version verification performed 2026-08-29:**
```
npm view @axe-core/playwright@4.13.0 version dependencies peerDependencies
  version          = '4.13.0'          # also the LATEST stable (4.13.1-* are prerelease shas)
  dependencies     = { 'axe-core': '~4.13.0' }
  peerDependencies = { 'playwright-core': '>= 1.0.0' }
  scripts.postinstall = (absent)
node_modules/playwright-core/package.json → 1.60.0   ✓ peer satisfied
```

---

## Package Legitimacy Audit

Protocol run 2026-08-29. `slopcheck` installed via `pip install slopcheck --break-system-packages`
and executed as `python -m slopcheck install @axe-core/playwright axe-core` (the `--json` flag does
not exist in the installed version; the scan itself completed and reported **`2 OK`** before its
subsequent `npm install` shell-out failed on Windows — the *check* result is valid, and **no install
was performed**, which is the intended state: installing is the planner's task).

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@axe-core/playwright` | npm | 5 yrs (created 2021-06-02) | **9,519,206 / wk** | `github.com/dequelabs/axe-core-npm` | `[OK]` | **Approved** — pin `4.13.0` exact |
| `axe-core` | npm | 11 yrs (created 2015-06-08) | **68,509,341 / wk** | `github.com/dequelabs/axe-core` (MPL-2.0) | `[OK]` | **Approved** — transitive, `~4.13.0` |

**Postinstall check:** `npm view @axe-core/playwright@4.13.0 scripts.postinstall` → absent. No
network/filesystem side effects on install.

**Packages removed due to slopcheck `[SLOP]` verdict:** none
**Packages flagged as suspicious `[SUS]`:** none

> ⚠ **A separate, pre-existing supply-chain fact the planner must not disturb:** this repo has its
> own `"postinstall": "node scripts/patch-kysely-adapter.mjs"`. Any `npm i -D` re-runs it. That is
> normal here and is not a Phase-17 change, but a lockfile diff on this phase should contain
> `@axe-core/playwright` + `axe-core` **and nothing else**.

---

## Architecture Patterns

### System Architecture Diagram — how a Phase-17 assertion reaches a verdict

```
                        ┌───────────────────────────────────────────────┐
   ROUTE INVENTORY  ───▶ │  src/app/**/page.tsx  (29 files, MEASURED)   │
   (D-201 source)        │  − src/app/dev/** (2)  = 27 audit subjects   │
                        └───────────────┬───────────────────────────────┘
                                        │  + route STATES
                                        │    4 not-found · 5 error.tsx · global-error · 21 loading.tsx
                                        ▼
        ┌───────────────────────────────────────────────────────────────────────┐
        │  THE THREE SHIPPED ROUTE TABLES in e2e/overflow-320.spec.ts           │
        │  AC#29 (21 rows, no seed)  AC#30 (12 rows, Phase-13 fixture)          │
        │  AC#36 (6 rows, host fixture)   ← every row: path | tell | skip-why   │
        └──────────┬───────────────────────────────────────┬────────────────────┘
                   │ EXTEND coverage                       │ REUSE the seeds
                   ▼                                       ▼
   ┌───────────────────────────────┐        ┌──────────────────────────────────────┐
   │ RESP-03 measurement pipeline  │        │ GATE-02 measurement pipeline         │
   │                               │        │                                      │
   │ goto → fonts.ready            │        │ goto → fonts.ready → await TELL      │
   │   → await TELL (vacuity)      │        │   → (emulateMedia reduce)            │
   │   → expectNoOverflow          │        │   ├─ AxeBuilder                      │
   │   → [scope?] …Within          │        │   │   .exclude('nextjs-portal')      │
   │   → expectTargets  (24px)     │        │   │   .options({runOnly, rules})     │
   │   → no-wrap(lineHeight)       │        │   │   .analyze()                     │
   │   → sticky-bar box + occlusion│        │   │   → assert passes>0 & nodes>0    │
   │                               │        │   │   → assert violations == []      │
   │  ×2 themes (court, grove)     │        │   ├─ resetFocusToTop → walkForward   │
   │  @ 320 (·768·1280 where named)│        │   │   → expectRing on EVERY stop     │
   └───────────────┬───────────────┘        │   │   → walkBackward == reverse      │
                   │                        │   │   → dialog close → focus==trigger│
                   │                        │   └─ heading outline: no skipped lvl │
                   │                        │      (joins host-headings' 28×3 loop)│
                   │                        │  court ONLY (D-138) @ 320 and 1280   │
                   │                        └──────────────────┬───────────────────┘
                   │                                           │
                   ▼                                           ▼
        ┌──────────────────────────────────────────────────────────────────────┐
        │  FINDING TRIAGE — UI-SPEC § Remediation rules                        │
        │   mechanical (aria-label / role=status / size="touch" / nowrap /     │
        │   padding-to-24 / structural testid / measured contrast row /        │
        │   heading level / stale comment)      → FIX IN PLACE                 │
        │   token value · 11th accent · 4th card · copy · booking logic ·      │
        │   migration · deleting the measured thing · reversing a decision     │
        │                                        → deferred-items.md (D-199)   │
        └──────────────────────────┬───────────────────────────────────────────┘
                                   │  fixes landed, tree green
                                   ▼
        ┌──────────────────────────────────────────────────────────────────────┐
        │  BASELINE ROUND-TRIP  (CI-only — this box is win32)                  │
        │  1. workflow_dispatch  baselines.yml  (pinned image, --update-snap)  │
        │     └─ commits ONLY *-visual-linux.png, pushes to github.ref         │
        │  2. ⚠ that push triggers NO workflow (GITHUB_TOKEN rule)             │
        │  3. empty commit / re-dispatch → ci.yml `gate-visual` COMPARISON run │
        │  4. record THAT run id as the phase's closing evidence (D-202)       │
        └──────────────────────────────────────────────────────────────────────┘
```

### Pattern 1 — One axe configuration, one `.options()` call, one fixture

**What:** All axe configuration goes through a single `.options()` object, built once in a Playwright
fixture so no spec can construct a differently-configured builder.
**When to use:** Every axe call in this phase.
**Why:** `.withTags()`, `.withRules()` and `.disableRules()` each *assign* to the builder's internal
`this.option`, and `.options()` **replaces it wholesale** — there is no merge. Two calls means the
later one silently wins. `[VERIFIED: dequelabs/axe-core-npm packages/playwright/src/index.ts]`

### Pattern 2 — `data-testid` additions go through the compile gate, never inline

**What:** A new structural id is added to `SELECTOR_IDS` *and* `SELECTOR_CONTRACT` in
`src/lib/design/selector-contract.ts` in the same edit as the JSX attribute.
**Why:** `SELECTOR_CONTRACT` is a **total** `Record` over the union derived from `SELECTOR_IDS`, so a
missing row is a `tsc` error (TS2741), not a review comment. `selector-contract.test.ts` additionally
asserts every declared id actually appears in `src/`. The 49 ids in the tree today are all declared.

### Pattern 3 — Every new assertion is watched RED before its green is trusted

The repo's established red-watch idiom, restated with this phase's four specific drives:

| New assertion | Deliberate break to watch red against |
|---|---|
| heading outline walk | an `h1` → **`h3`** skip (NOT a duplicated level — a duplicate is the easy case and proves nothing) |
| GATE-06 content digest | change **one character** inside a shipped `.sql`, then restore |
| axe vacuity guard | point a row at a URL that 404s and confirm the *guard* fires, not the violation list |
| sticky-bar occlusion | temporarily drop `pb-20` clearance and confirm the intersection assertion reports it |

### Pattern 4 — Reuse `VISUAL_SURFACES` as the axe route table's reachability source

`src/lib/design/visual-baselines.ts` already carries 44 rows of `{ url, hook, hookWhy }`. Those
`hook` selectors are exactly the "tell" the axe sweep needs before `.analyze()`. Deriving the axe
table's tells from that module (rather than retyping them) means a surface whose hook changes moves
in one place.

### Anti-Patterns to Avoid

- **`new AxeBuilder({page}).withTags([...]).options({rules:{...}})`** — the tags are gone. Combine
  into one `.options({ runOnly: { type: 'tag', values: [...] }, rules: {...} })`.
- **Relying on axe for heading order or landmarks under the declared tags** — those rules are
  `best-practice`-tagged and do not run. See Pitfall 1.
- **A second `host-headings` file** — the outline walk joins the existing 28-state loop.
- **A blanket 44px assertion** — the conformance bar is 24 (`TARGET_FLOOR_PX`); 44 (`TOUCH_FLOOR_PX`)
  is asserted **by name**, per surface, and the app ships deliberate sub-44 controls.
- **Converting shipped `getByRole`/`getByLabel` to test ids** — measured today: **303 `getByRole`**
  and **84 `getByLabel`** in `e2e/` against D-32 floors of 92 / 30. Those are accessibility
  guarantees asserted as a side effect.
- **"Flipping" `leak.test.ts` or the ESLint leak rule** — measured: `eslint.config.mjs:147` is
  `"error"`, `leak.test.ts` has zero `skip`/allowlist/advisory branch and runs in `npm run build`.
  Reporting that flip as work done is the anti-pattern the UI-SPEC names by name.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Nothing overflows at 320" | A new `scrollWidth` check | `expectNoOverflow` | Ships the vacuity guard, the ancestor-clip walk, and named-offender reporting |
| "Nothing overflows inside an open sheet" | Document-level scan on the sheet row | `expectNoOverflowWithin(page, '[data-testid="responsive-dialog"]', …)` | A Radix modal makes `<body>` `overflow:hidden`, retiring all three document clauses — measured: 500px div → `scrollWidth 320, offenders []` |
| "The focus indicator is visible" | A second reading of outline/box-shadow | `expectRing` from `e2e/helpers/focus.ts` | D-16 one-import-site; a ring is a `box-shadow`, and a second copy goes stale silently |
| "This text did not wrap" | `clientHeight <= 24` or any literal | `clientHeight <= parseFloat(getComputedStyle(el).lineHeight) + TOLERANCE_PX` **plus both guards** | `line-height: normal` parses to `NaN`, which compares false against every bound and makes the clause vacuous; and every `--leading-*` token is per-theme |
| Walking a tab order | `.focus()` in a loop | `resetFocusToTop` + `walkForward`/`walkBackward` | `.focus()` does not match `:focus-visible` in Chromium, so every control would report ringless on a correct tree |
| Filtering the dev-server tab stop | An ad-hoc `filter` | `partitionDevOverlay` | It also *asserts* the partition (all dropped elements are `nextjs-portal` AND all sit at the END), so it cannot quietly swallow a product control |
| A target-size rule | axe's `target-size` | `expectTargets` (`overflow-320.spec.ts:905`, `TARGET_FLOOR_PX = 24`) | Already measured, already reports named offenders, and axe's rule is disabled-by-default anyway |
| Theming a Playwright run | Clicking a switcher | `seedTheme(page.context(), theme)` | There is no runtime switcher (D-06); seeding pre-paint avoids a flash and a post-hydration switch |
| Screenshot determinism | Ad-hoc waits | `e2e/visual/freeze.css` + `visualFreeze()` | Zeroed durations/delays, caret, scroll-behavior, and the `nextjs-portal` hide, all argued in place |
| Minting a baseline | `--update-snapshots` anywhere | `.github/workflows/baselines.yml` `workflow_dispatch` | `updateSnapshots:"none"` is unconditional and the `visual` project is not constructed off Linux |

**Key insight:** in this repository the expensive part of a cross-cutting sweep is not the assertion —
it is the **vacuity guard, the tell, and the failure message**. Every shipped helper carries all three
and has the measurement behind them written down. A hand-rolled equivalent starts at zero on all
three and looks identical in a green run.

---

## Runtime & Artifact State Inventory

> Included because this phase mutates state that lives *outside* the source tree — pinned counts,
> committed PNGs and a CI round-trip — and a grep of `src/` finds none of it.

| Category | Items found | Action required |
|----------|-------------|------------------|
| **Committed baseline artifacts** | **36 PNGs** on disk in `e2e/visual/surfaces.spec.ts-snapshots/`, every one `*-court-visual-linux.png`, **zero grove, zero win32/darwin**. Verified by listing. | Regenerate via `baselines.yml` dispatch **last**. Expect a **modify**, not an add — see the predicted diff below. |
| **Pinned counts that MOVE if a route is added** | `tests/design/loading-coverage.test.ts`: `EXPECTED_PAGES = 29`, `EXPECTED_QUALIFYING = 21`, `EXPECTED_NON_QUALIFYING = 8` (:228-230). 21 `loading.tsx` on disk. | Any [11-21] throw route moves `EXPECTED_PAGES` (29→33 for four) and one of the other two. **Move them deliberately, in the same commit, with the decision recorded** — the file's message says "it does not mean this number should be bumped". |
| **Pinned counts in the visual gate** | `e2e/visual/surfaces.spec.ts`: `EXPECTED_BASELINE_COUNT = 78` (:301), `EXPECTED_BLOCKED` = **24 named entries** (:179+); `visual-baselines.ts` carries 79 object literals incl. the type-pin. | Unblocking any row changes `EXPECTED_BLOCKED` **and** makes the next dispatch MINT a new PNG. `[16-D10]`/`wizard-cover-preview` is explicitly the PM's to schedule, not a side effect. |
| **Type-level pins** | `AccentUseCountIsTen` (`accent-uses.ts:212`), `ThemeContractSurfaceCountIsFour`, `THEME_SWAP_EXCLUSIONS` length 1, `SELECTOR_CONTRACT` total Record | All must still compile: `npx tsc --noEmit` exit 0 (AC#28) |
| **CI state, not repo state** | `baselines.yml` pushes with `GITHUB_TOKEN` → **triggers no workflow run**. The pushed baselines have therefore been *written* and never *compared*. | The comparison is a **separate** `ci.yml` `gate-visual` run reached by an empty commit or re-dispatch. Its run id is D-202's closing evidence. |
| **Local runtime prerequisites** | Docker present (29.6.1) with `postgis/postgis:18-3.6` pulled, but **no container running** (`docker ps` empty). `e2e/host-headings.spec.ts` seeds a DB and must run alone. | `npm run db:up` before any seeded e2e. |
| **Stale in-tree comments (state, not code)** | 4 sites still promise a two-theme axe pass: `contrast-pairs.ts:27`, `pair-drift.test.ts:69`, `e2e/helpers/theme.ts:3` (and :8, :28), `theme-provider.tsx:21`. **Verified — all four present.** | AC#24: amend in place to court-only *with the named limitation*. Note `theme.ts` has **three** two-theme sentences, not one. |
| **Secrets / env** | None. `baselines.yml` holds only an ephemeral service-container `DATABASE_URL`; `scripts/verify-workflows.mjs` asserts the no-credential prohibition over `env`/`run`/`with` values. | **No change.** Adding a secret to that job is a scope alarm. |
| **Build artifacts** | `.next/` can go stale (recorded twice: `6123766`, and the memory note about `next dev` + `npm run build` collision) | Kill `next dev`, delete `.next`, rebuild before trusting a full e2e run — the D6 triage did exactly this and it reclassified a failure. |
| **Schema** | `drizzle/` = **26 `.sql`**, last is `0025_audit_resolved_by.sql`. Verified by listing. | **Zero change.** Add the digest pin; never update `LAST_MIGRATION`. |

**Predicted baseline diff from this phase's mechanical fixes** (so the dispatch's diff is readable
rather than merely accepted):

| Fix | Baselines expected to CHANGE | Reason |
|---|---|---|
| DS-09 → `size="touch"` on `search-bar.tsx` ×2 | `search-results-320/768/1280`, `search-relax-band-320/1280` (**5 files**) | `size:default` is `px-2.5`; `size:touch` is `px-4` → +12px content-box change inside `w-full min-w-[150px]`/`min-w-[130px]`, moving the truncate point |
| DS-09 → `group-refresh`, `regenerate-link-button`, `remove-attendee-button` | **none** | All three render on `/bookings/[id]/group`, whose baseline rows are `blocked` |
| D-196 ProfileLink padding | **none expected** | The site header's signed-in cluster renders on no *shot* surface — `auth-*` render no site header (D-162) and `search-results` is captured signed-out. **Verify, don't assume.** |
| `aria-*` / `role=status` additions | **none** | Zero rendered pixels |
| Heading-level corrections | possible, per surface | A level change can change computed `font-size` |

---

## Common Pitfalls

### Pitfall 1 — The declared axe tag set does not run `heading-order`, `region` or `landmark-*`, and does not run `target-size` either

**What goes wrong:** The plan configures `["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22aa"]`,
reports "zero violations", and believes heading order and landmark structure are covered on every
surface. They are not covered anywhere.
**Why it happens:** axe-core's own rule descriptions place these rules in the **Best Practices** table
with tags `cat.semantics, best-practice` (`heading-order`, `landmark-one-main`,
`page-has-heading-one`) and `cat.keyboard, best-practice, RGAAv4` (`region`). None carries a `wcag*`
tag, so a `runOnly` tag filter excludes them. Separately, `target-size` (`cat.sensory-and-visual-cues,
wcag22aa, wcag258`) is **disabled by default** — *"these rules are disabled by default, until WCAG 2.2
is more widely adopted"* — and a `runOnly` tag filter does **not** enable a disabled rule.
`[CITED: github.com/dequelabs/axe-core/doc/rule-descriptions.md]` `[CITED: axe-core doc/API.md]`
**How to avoid:**
1. Keep the conformance tag set (it is the right scope decision), and
2. Carry the heading-order clause with the **instrument** — the outline walk in
   `host-headings.spec.ts` — plus, if wider coverage is wanted, an explicit rule enable:
   `rules: { 'heading-order': { enabled: true } }` inside the same `.options()` object. Record the
   choice; do not leave the UI-SPEC's sentence standing.
3. Do **not** enable `target-size`. `expectTargets` already owns that floor at 24px with its
   measured argument; a second definition is the drift `expectRing`'s one-site rule exists to stop.
4. Correct the UI-SPEC's `global-error`/`region` sentence — under these tags `region` never fires, so
   the route-level exclusion is justified by *"renders its own document, cannot be themed, already
   `THEME_SWAP_EXCLUSIONS`' only entry"*, not by `region`.
**Warning signs:** a violation list that is empty on a surface you know has a heading skip; a
`passes` array that never contains `heading-order`.

### Pitfall 2 — `.options()` silently discards `.withTags()`

**What goes wrong:** `new AxeBuilder({page}).withTags([...]).options({rules:{…}})` runs axe's
**default** rule set (including every best-practice rule) instead of the declared conformance set —
a wider, noisier scan that reads like a stricter one and will produce violations the phase never
agreed to fix.
**Why it happens:** each configuration method assigns to the builder's internal `this.option`;
`options()` replaces the object entirely. There is no merge.
`[VERIFIED: dequelabs/axe-core-npm packages/playwright/src/index.ts]`
**How to avoid:** exactly one `.options({...})` call containing both `runOnly` and `rules`. Build it
once in a fixture (Playwright's documented pattern) so no spec can diverge.
**Warning signs:** the run reports violations for `region`, `landmark-one-main` or `color-contrast-enhanced`.

### Pitfall 3 — The Next dev overlay's shadow root is OPEN, so axe scans inside it

**What goes wrong:** `playwright.config.ts`'s `webServer` is `npm run dev`, so every scanned page
carries `<nextjs-portal>`. Its shadow root is attached with **`attachShadow({mode:"open"})`**
(verified in `node_modules/next/dist/compiled/next-devtools/index.js:3834`), and **axe-core walks
open shadow trees by design** — it builds a flattened virtual DOM specifically to cross shadow
boundaries. So Next.js's own dev chrome is inside the audit's scope, and any violation it produces
is not this product's.
**Why it happens:** this repo has already met the same element twice — `freeze.css` hides it for the
visual suite, `e2e/error-leak.spec.ts:176` removes it, `helpers/focus.ts` partitions it out of the tab
order — but none of those mechanisms is in force in the `chromium` project where the axe sweep will live.
**How to avoid:** `.exclude("nextjs-portal")` with the reason committed beside it, in the
`EXCLUDED_PAIRS` idiom the UI-SPEC prescribes. This is a **component-level** exclusion, not a
route-level one, so it does not consume the `global-error` route exclusion budget.
**Warning signs:** violations whose `target` selector begins `nextjs-portal`; a violation count that
changes when the dev server happens to be compiling.

### Pitfall 4 — Scanning before the surface resolves (the [15-12] race, and its axe twin)

**What goes wrong:** `AxeBuilder(...).analyze()` over a page that has not resolved returns **zero
violations and reads exactly like a pass**. `expectTargets` has the same failure in the other
direction: it reads controls out of a skeleton (the recorded [15-12] finding).
**Why it happens:** `/` streams and its own `loading.tsx` renders a **second `SearchBar`**, so
`#search-category` genuinely resolves to **two elements** while the boundary is unresolved
(`visual-baselines.ts:429`, reproduced as `[16-D8]`). Every `loading.tsx`-bearing route has a window
where the DOM is the skeleton.
**How to avoid:** await the row's own **tell** before *any* measurement — the AC#22 rows already do
this and the AC#30 rows do not, which is [15-12]'s whole content. Then assert the vacuity guard:
**non-zero scanned nodes AND non-zero `passes.length`** before asserting `violations == []`.
**Warning signs:** a green axe run on a route whose `tell` was never awaited; `strict mode violation:
resolved to 2 elements`.

### Pitfall 5 — Asserting the sticky bar's *class* instead of its *outcome*

**What goes wrong:** asserting `pb-20` is present is not asserting that the bar does not occlude the
last control. The clearance class can be right while a later element escapes it.
**Why it happens:** the two numbers live in `src/lib/design/measurements.ts` — measured:
`STICKY_BAR_HEIGHT = "h-16"` (64px, :336) and `STICKY_BAR_CLEARANCE = "pb-20"` (80px = 64 + 16, :345)
— and asserting either class is a statement about source, not about pixels. The testids
are `booking-sticky-bar` (`booking-sticky-bar.tsx:165`) and `checkout-sticky-bar`
(`checkout-sticky-bar.tsx:78`) — both already declared in `SELECTOR_CONTRACT`.
**How to avoid:** scroll to the bottom at 320px, take the last focusable element's box and the bar's
box, and assert **no intersection**. Assert `boundingBox().height === 64` and the bottom-edge pin
separately. At 1280px assert the bar is **absent from layout** (`lg:hidden`) — a bar present at both
widths is RESP-04's forked-variant failure surfacing through RESP-03's harness.

### Pitfall 6 — The `[11-21]` throw routes cannot live under `src/app/dev/`

**What goes wrong:** four new files at `src/app/dev/throw-in/[group]/page.tsx` reach the **root**
boundary, which the table already covers. The four skipped rows stay skipped and the plan believes
they closed.
**Why it happens:** `error.tsx` boundaries nest by **file path**, and `src/app/dev/` sits under no
route group. `src/app/dev/throw/page.tsx`'s own header records this, **confirmed by driving the route
and reading the rendered copy, not inferred**: *"WHICH BOUNDARY CATCHES IT: `src/app/error.tsx`, the
root one — `dev/` sits under no route group, so nothing nearer claims it."*
**How to avoid:** a throw page per group, inside that group's directory
(`src/app/(app)/…/page.tsx`, `src/app/(host)/host/…/page.tsx`, `src/app/(auth)/…`,
`src/app/(legal)/…`), each behind the same build-time `process.env.NODE_ENV === "production" →
notFound()` guard plus `robots: {index:false}`. Then:
- `(app)` inherits `layout.tsx`'s **blocking** session gate → redirect to `/login` without a session
  (the fixture must sign in; `signUpAndReachProfile` already exists in `overflow-320.spec.ts`);
- `(host)/host` inherits the session gate **and** the `canHost` gate (`layout.tsx:42-54`) → the
  Phase-14 host fixture is required;
- `(auth)` and `(legal)` layouts gate nothing (verified — no `redirect` in either).
- All four move `loading-coverage`'s pinned counts. **Decide and record which side each falls on**
  (sync default export ⇒ non-qualifying).
**Warning signs:** a "closed" boundary row whose rendered copy is the root boundary's copy.

### Pitfall 7 — `matchMedia` is a string that appears twice on one call site

**What goes wrong:** AC#11 says *"`src/` contains exactly one `matchMedia` call site"*. A scan
counting the **string** returns **2**, because `publish-checklist.tsx` guards before calling:

```
src/components/host/publish-checklist.tsx:148:    if (typeof window.matchMedia !== "function") return;
src/components/host/publish-checklist.tsx:149:    const query = window.matchMedia(PANEL_MEDIA_QUERY);
```

A literal `toBe(1)` is **red against correct code**. Count *call expressions* (or `matchMedia(`
occurrences that are not preceded by `typeof `), and say so in the failure message.
`useMediaQuery` imports: **0**, verified. `src/components/ui/sheet.tsx`: absent, verified.
`src/components/patterns/responsive-dialog.tsx`: present, verified.

### Pitfall 8 — DS-09 conversion changes rendered width

**What goes wrong:** `size="touch"` is `h-11 gap-1.5 px-4 …` while the current sites are
`size:default` (`h-8 … px-2.5`) with `className="h-11"` overriding only the height. Converting adds
**+12px of horizontal padding**, which is a real layout change on `search-bar.tsx` at 320px and will
move committed baselines.
**How to avoid:** convert, then re-run the 320px sweep **before** the baseline dispatch, and list the
expected PNG changes so the dispatch diff is read rather than accepted. Note `remove-attendee-button.tsx`
carries `px-3` in `className`, which tailwind-merge keeps over the variant's `px-4` — that one is a
zero-width-change conversion.

### Pitfall 9 — The `chromium` e2e project is NOT green on this tree, and none of it is Phase 17's

**Measured today: 281 tests in 33 files.** `[16-D6]`'s triage (2026-08-26, at `d24b212`) records
**3 reproducible + 7 environment/contention** failures:
- `public-listing.spec.ts:385` — a draft listing returns **200** instead of 404. **Not a leak** (body
  is the not-found page, title absent). Cause: `listings/[id]/(detail)/loading.tsx` creates an
  implicit Suspense boundary, so Next flushes the shell and commits 200 before `notFound()` runs.
  **Route-wide: every `loading.tsx`-bearing route (~10) has the same soft-404.**
- `cancel.spec.ts:224` — copy assertion, safety property held.
- `confirmation-decay.spec.ts:151`/`:254` — navigation/decay difference.
- 7 timeouts/detached-frame/intercepted-click failures = `[16-D2]`'s shared-fixture contention class.
Plus `[260824-dbc]`: `e2e/availability.spec.ts` carries **three more standing reds** than the one
declared, and `availability.spec.ts:261` is explicitly *not this phase's to close*.
**How to avoid the trap:** the phase gate cannot be read off a bare full-suite run. Declare the
baseline red set **before** adding assertions, run per-file (`--workers=1` where seeded), and never
attribute a pre-existing red to a Phase-17 change. The soft-404 is an **escalate-class** finding
(product/SEO behaviour on ~10 routes), not an audit fix.

### Pitfall 10 — Reading a "green" off a generation run, or off this machine

`platform = win32`, so `playwright.config.ts` **does not construct the `visual` project at all** and
prints a warning saying so. `npx playwright test --project=visual` cannot run here. The comparison
that D-202 names as closing evidence is a **CI** run — `ci.yml`'s `gate-visual` job. And
`baselines.yml`'s own header states the trap: its `GITHUB_TOKEN` push **triggers no workflow**, so
the regenerated PNGs have been written and never compared. An empty commit or a re-dispatch is a
**required** step, not an optional one.

---

## Code Examples

### 1. The one-call axe configuration (single fixture, no `.withTags()`)

```ts
// e2e/helpers/axe.ts  — ONE definition of "the axe pass", for expectRing's reason.
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** D-138: court only. WCAG conformance tags — NOT best-practice. */
export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] as const;

/**
 * ⚠ ONE `.options()` CALL, AND `runOnly` LIVES INSIDE IT.
 * `.withTags()` assigns to the builder's internal option object and `.options()` REPLACES that
 * object — there is no merge (verified against packages/playwright/src/index.ts). Written as
 * `.withTags(...).options({rules})` the tag filter is silently dropped and axe runs its DEFAULT
 * rule set, which is WIDER than the set this phase agreed to fix and reads like a stricter gate.
 *
 * `heading-order` is enabled EXPLICITLY because it is a `best-practice`-tagged rule and a tag
 * filter therefore excludes it. `target-size` is deliberately NOT enabled: `expectTargets` in
 * `e2e/overflow-320.spec.ts` owns the 24px floor with its measured argument, and a second
 * definition of the same floor is the drift `expectRing`'s one-import-site rule exists to stop.
 */
export function makeAxe(page: Page) {
  return new AxeBuilder({ page })
    // `next dev` mounts its dev-tools chrome in a <nextjs-portal> whose shadow root is
    // attachShadow({mode:"open"}) — measured in next/dist/compiled/next-devtools — and axe walks
    // OPEN shadow trees by design. It is not this application's DOM: `e2e/visual/freeze.css`
    // hides it and `e2e/error-leak.spec.ts:176` removes it, both for this same reason.
    .exclude("nextjs-portal")
    .options({
      runOnly: { type: "tag", values: [...AXE_TAGS] },
      rules: { "heading-order": { enabled: true } },
    });
}

/**
 * The vacuity guard is MANDATORY and runs FIRST. `.analyze()` over a page that failed to load
 * returns zero violations and reads exactly like a pass — the scan-of-nothing failure this
 * repository has now recorded eight times.
 */
export async function expectAxeClean(page: Page, where: string): Promise<void> {
  const results = await makeAxe(page).analyze();

  const scannedNodes =
    results.passes.reduce((n, r) => n + r.nodes.length, 0) +
    results.violations.reduce((n, r) => n + r.nodes.length, 0) +
    results.incomplete.reduce((n, r) => n + r.nodes.length, 0);

  expect(
    results.passes.length,
    `${where}: axe reported ZERO passing rules. A page that failed to load produces an empty ` +
      "violation list and reads exactly like a pass, so this number is what makes the assertion " +
      "below mean anything.",
  ).toBeGreaterThan(0);

  expect(
    scannedNodes,
    `${where}: axe examined ${scannedNodes} nodes. See above — an empty document violates nothing.`,
  ).toBeGreaterThan(0);

  expect(
    results.violations.map(
      (v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes[0]?.target.join(" ")}`,
    ),
    `${where}: axe found ${results.violations.length} violation(s) at tags [${AXE_TAGS.join(", ")}].`,
  ).toEqual([]);
}
```
*Source: `@axe-core/playwright` README + `packages/playwright/src/index.ts` (option precedence) +
`playwright.dev/docs/accessibility-testing` (fixture pattern) + axe-core `doc/API.md` (disabled-rule
enabling) + this repo's `e2e/helpers/overflow.ts` (vacuity-guard idiom).*

### 2. The generalised no-wrap clause — both guards travel with it

```ts
// Generalised from e2e/mobile-booker-path.spec.ts:456-486. Measured against the element's OWN
// resolved line-height, never a literal: the sticky bar's two lines are different type steps and
// every --leading-* token is per-theme.
export async function expectNoWrap(locator: Locator, where: string, tolerancePx = 1) {
  const m = await locator.evaluate((el) => ({
    clientHeight: el.clientHeight,
    lineHeight: parseFloat(getComputedStyle(el).lineHeight),
    text: (el.textContent ?? "").trim(),
  }));

  // GUARD 1 — an empty line never wraps, so the assertion below would be free.
  expect(m.text.length, `${where}: rendered no text, so a no-wrap assertion over it is free.`)
    .toBeGreaterThan(0);

  // GUARD 2 — `line-height: normal` parses to NaN, which compares FALSE against every bound and
  // would make the whole clause vacuous.
  expect(
    Number.isFinite(m.lineHeight),
    `${where}: resolves no numeric line-height (${JSON.stringify(m.text)}).`,
  ).toBe(true);

  expect(
    m.clientHeight,
    `${where}: wraps — ${m.clientHeight}px against a one-line box of ${m.lineHeight}px. ` +
      `Text: ${JSON.stringify(m.text)}.`,
  ).toBeLessThanOrEqual(m.lineHeight + tolerancePx);
}
```

### 3. `[16-D9]` — the whole fix, one line

```ts
// e2e/overflow-320.spec.ts, the "/listings/[id] · sheet open" row (~:394-418).
// The loop at :772 ALREADY reads this field: `if (row.scope) await expectNoOverflowWithin(...)`.
{
  name: "/listings/[id] · sheet open",
  path: firstListingPath,
  open: (page) => openBookingSheet(page, "/listings/[id] · sheet open").then(() => undefined),
  tell: '[data-testid="responsive-dialog"] [data-slot="calendar"]',
  scope: '[data-testid="responsive-dialog"]',   // ← ADD. Reported 48 named offenders when measured.
}
```

### 4. GATE-06 — the content digest, extending the shipped file

```ts
// tests/design/money-path-invariants.test.ts — extend, do not add a second file: this one already
// runs DB-free inside `npm run build` and already carries the "do NOT update LAST_MIGRATION" message.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/** The sorted filename list AND a digest over their bytes. SC#4 says "unchanged", not "ends at". */
const MIGRATION_DIGEST = "…";        // fill from a first run, then WATCH IT RED
const MIGRATION_COUNT = 26;

function digestOfMigrations(): string {
  const h = createHash("sha256");
  for (const name of migrations()) {          // migrations() already exists in this file
    h.update(name).update("\0").update(readFileSync(resolve(DRIZZLE_DIR, name)));
  }
  return h.digest("hex");
}

it("pins drizzle/ byte-for-byte, not just by its last filename", () => {
  expect(migrations().length).toBe(MIGRATION_COUNT);
  expect(
    digestOfMigrations(),
    "the BYTES of drizzle/ changed while the filenames may not have. GATE-06 / SC#4 is " +
      '"`drizzle/` is UNCHANGED from its v1.0 state", which an edit to an already-shipped .sql ' +
      "breaks without changing any filename. Do NOT fix this by updating the constant — a " +
      "migration proposed inside a v1.1 phase is a SCOPE ALARM to raise with the operator.",
  ).toBe(MIGRATION_DIGEST);
});
```
**Red-watch:** change one character in a shipped `.sql`, observe red, restore, observe green.
The filename list must be included in the digest input (name + NUL + bytes) so a *rename* is caught
too — a digest over bytes alone would miss `0025_a.sql` → `0025_b.sql`.

---

## RESP-03 — Coverage Delta (the D-201 enumeration, measured)

`src/app/**/page.tsx` = **29 files**. Minus `src/app/dev/theme` and `src/app/dev/throw` (D-201
instruments) = **27 production-reachable page routes**.

**Already measured at 320px in both themes today (20 of 27):**
`/` · `/listings/[id]` (+`· sheet open`) · `/listings/[id]/book` · `/invite/[token]` (both the
not-found form in AC#29 and the resolved form in AC#30) · `/terms` · `/privacy` · `/login` ·
`/signup` · `/forgot-password` (+`· post-submit`) · `/reset-password` (+`· missing token`) ·
`/profile` (+`· crop dialog open`) · `/bookings/[id]` (confirmation moment + confirmed detail +
pending) · `/bookings/[id]/receipt` · `/bookings/[id]/cancel` · `/bookings/[id]/group` · `/host` ·
`/host/requests` · `/host/bookings` · `/host/listings/[id]/edit` (+`· photos step`) ·
`/host/listings/[id]/availability`

**ZERO 320px measurement today — verified absent from `e2e/overflow-320.spec.ts` entirely (7):**

| Route | File | Fixture it needs |
|---|---|---|
| `/bookings` | `src/app/(app)/bookings/page.tsx` | booker session (Phase-13 fixture reaches it) |
| `/host/bookings/[id]` | `src/app/(host)/host/bookings/[id]/page.tsx` | host fixture + a booking |
| `/host/earnings` | `src/app/(host)/host/earnings/page.tsx` | host fixture |
| `/host/listings` | `src/app/(host)/host/listings/page.tsx` | host fixture |
| `/host/listings/new` | `src/app/(host)/host/listings/new/page.tsx` | host fixture |
| `/host/payouts/refresh` | `src/app/(host)/host/payouts/refresh/page.tsx` | host fixture |
| `/host/payouts/return` | `src/app/(host)/host/payouts/return/page.tsx` | host fixture |

**Route STATES beyond `page.tsx`** (all must appear with a measurement or a named reason):
4 `not-found.tsx` (root ✓ · listing ✗ · booking ✓ · invite ✓) · 5 `error.tsx` (root ✓ · `(app)` ✗ ·
`(auth)` ✗ · `(host)` ✗ · `(legal)` ✗ — the four `[11-21]` skips) · `global-error.tsx` (declared
exclusion) · 21 `loading.tsx`.

**Existing named skips: 3 in AC#30** (payment states *not completed*, *reversed automatic*,
*reversed manual*) **+ 4 in AC#29** (the error boundaries). All seven carry a reason in the message a
skipped run prints, which is the idiom to preserve.

---

## RESP-04 — Measured Baseline

| AC | Claim | Measured 2026-08-29 | Status |
|----|-------|---------------------|--------|
| 10 | Zero viewport-conditional JSX branches under `src/app/**`/`src/components/**` | not yet instrumented | **new source scan** |
| 11 | Exactly one `matchMedia` call site, zero `useMediaQuery` imports | 1 call site (`publish-checklist.tsx:149`) + 1 `typeof` guard on :148; **0** `useMediaQuery` | ✅ **but see Pitfall 7** |
| 12 | Identifying `data-testid` count is **1 in the document** at 320/768/1280 for search, listing detail, calendar, wizard, checkout, every list surface | 49 testids declared. Present: `wizard-step-rail`, `checkout-sticky-bar`, `booking-panel`, `listing-key-facts`, `row-card`, `result-card`, `agenda-rows`, `host-agenda`. **Missing an identifying container id: the search-results region and the availability calendar** (only `skeleton-calendar` exists, which is the *fallback*) | **needs 2–3 new `SELECTOR_CONTRACT` rows** |
| 13 | `getByRole("navigation")` resolves to exactly 1 at 320 and 1280 | Both nav placements live **inside the one `<nav data-testid="site-nav">`**, inactive copy hidden with `hidden` (`site-chrome.tsx:69-72, 206, 338-341`) | ✅ expected green — assert it |
| 14 | `sheet.tsx` absent, `responsive-dialog.tsx` present | verified both | ✅ |

The sanctioned exception — `usePublishChecklistPlacement()` — **chooses one node**, so the
one-instance count holds at all three widths. Assert the property on it; do not remove the hook.
A **second** component reaching for `matchMedia` is a finding, not a precedent.

---

## GATE-02 — Measured Baseline

| Deliverable | Shipped today | Gap |
|---|---|---|
| Focus recipe | one recipe, gated by `tests/design/focus-recipe.test.ts`; `expectRing` is the only e2e definition | assert `expectRing` uniqueness in `e2e/` (AC#20) |
| Keyboard walk | `e2e/auth-keyboard.spec.ts`: **6 documents, 59 stops**, indicator on every stop | **calendar, slot picker, wizard, dialogs, sheets** have none. Five properties each: reachable · operable · indicated · escapable · returned |
| axe pass | **nothing** — `package.json` contains no `axe` at any version, verified | the whole sweep |
| Heading order | `host-headings.spec.ts` asserts exactly one `<h1>` per document across **28 states × 3 widths = 84** measurements; says nothing about `<h2>` and below (`:93`) | the outline walk, joining that loop |
| [13-15] ProfileLink | `<Link aria-label="Profile" className={cn(NAV_LINK_CLASS,"inline-flex items-center gap-1.5")}>` + `<UserIcon className="size-4">` + `<span className="hidden sm:inline">` → **16×16 below `sm:`**. `NAV_LINK_CLASS` carries **no padding** | D-196: padding on the `<Link>` to ≥24×24; re-measure the 226px cluster (docstring at `site-chrome.tsx:356` records 200/226 used) |
| [16-D7] slider | `SliderPrimitive.Thumb` (`ui/slider.tsx:80-84`) renders `role="slider" data-disabled=""`, no `tabindex`, **no `aria-disabled`** | D-197: `aria-disabled={props.disabled \|\| undefined}` on the Thumb; flip `e2e/avatar-crop.spec.ts`'s two `data-disabled` assertions (~:848-856) to `toBeDisabled()` |
| [11-21] boundaries | 4 of 5 unreachable | see **Pitfall 6** — the UI-SPEC's suggested path is wrong |
| Stale two-theme comments | 4 sites, **6 sentences** (`theme.ts` has 3) | AC#24 |

**Rules most likely to fire under the declared conformance tags on this app**, ranked by
probability — useful for scoping the fix budget before the first run:
`color-contrast` (arbitrated by § Color's order — a declared pair wins) · `scrollable-region-focusable`
(SC 2.1.1; the app has 6 `overflow-*-auto` containers, incl. `ui/table.tsx` and two in
`responsive-dialog.tsx`) · `nested-interactive` (`RowCard`'s overlay-link form) ·
`aria-prohibited-attr` (the exact defect `ui/slider.tsx:43` already records having fixed once) ·
`label` / `form-field-multiple-labels` (the streaming double-`SearchBar` window) ·
`aria-required-children` on composite widgets (calendar, slot picker). `[ASSUMED — A5]`

---

## State of the Art

| Old approach | Current approach | When changed | Impact here |
|---|---|---|---|
| axe `duplicate-id` / `duplicate-id-active` | removed; only `duplicate-id-aria` remains | axe-core 4.10 | the streaming double-`#search-category` may not fire an id rule; `label`-family rules are the live risk instead |
| WCAG 2.2 rules on by default | **`target-size` disabled by default** pending adoption | axe-core 4.8+ | a `wcag22aa` tag alone buys nothing today |
| `playwright.config` `updateSnapshots` varying by env (D-135 as originally written) | **unconditional `"none"`** (D-28) with `--update-snapshots` confined to one workflow | Phase 11 | no local regeneration is possible, by construction |
| Two-theme axe pass / two-theme baselines | **court-only** (D-138, 2026-08-23) | Phase 16 era | 4 in-tree comments still promise the old shape |

**Deprecated / outdated in this tree:**
- The UI-SPEC's *"the six left are Phase 17's to convert"* — the measured number is **5**.
- The UI-SPEC's *"Axe's own `heading-order` rule covers this on every other surface"* — not under the
  declared tags.
- The UI-SPEC's `[11-21]` fix shape (`src/app/dev/throw-in/[group]/`) — wrong boundary.

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | Excluding the `nextjs-portal` **host** also removes its open shadow subtree from axe's scope | Pitfall 3 / Code Example 1 | Dev-overlay violations still appear. Cheap probe on the first axe run; fallback is `.exclude()` on a shadow-piercing selector or a production-build run. |
| A2 | `aria-disabled` on Radix's Thumb makes Playwright's `toBeDisabled()` pass without re-entering the tab order | D-197 fix shape | The two flipped e2e assertions go red. Detected immediately by running `e2e/avatar-crop.spec.ts`. |
| A3 | ProfileLink padding changes **zero** committed baselines (the signed-in header renders on no shot surface) | Predicted baseline diff | An unexpected PNG in the dispatch diff. Falsify before dispatch by grepping `VISUAL_BASELINES` rows for a signed-in surface. |
| A4 | `heading-order` can be enabled alongside a tag filter with `rules: {'heading-order':{enabled:true}}` in the same `.options()` | Pitfall 1 | Heading coverage stays host-only. Detectable: check `results.passes` for the rule id. |
| A5 | The predicted "most likely to fire" rule list | GATE-02 baseline | Fix budget mis-sized. It is a prediction, not a measurement — the first sweep replaces it. |
| A6 | The soft-404 (200 on `loading.tsx` routes) behaves the same in a production build | Pitfall 9 | `[16-D6]` explicitly says this was verified in `next dev` only and **has NOT been measured** in production. |
| A7 | `MIGRATION_DIGEST` over `name + NUL + bytes` is the right shape (vs. bytes alone) | Code Example 4 | A rename would slip through a bytes-only digest. Low risk; the shape above closes it. |

---

## Open Questions (RESOLVED)

*All four were resolved during planning (2026-08-29). Each recommendation is implemented by name in a
named plan; the owning plan is recorded beside each RESOLVED marker.*

1. **Does the axe sweep get its own spec file, or does it join `overflow-320.spec.ts`?**
   - What we know: the AC#30/AC#36 tables already carry the seeded fixtures and tells the axe sweep
     needs, and a fourth route table is a fourth place a surface can be silently absent.
   - What's unclear: `overflow-320.spec.ts` is already 2,092 lines and its AC#29 half is deliberately
     seed-free — mixing an axe pass into it would couple the cheapest gate in the suite to the
     flakiest fixtures.
   - Recommendation — **RESOLVED (implemented by plan 17-07 Task 1; the set-equality half by plan
     17-11 Task 2, D-201):** a new `e2e/axe-sweep.spec.ts` that **imports its route rows** from the shipped
     tables / `VISUAL_SURFACES` rather than retyping them, so there is still one inventory. Assert
     that the axe table's row set equals the declared surface set — that assertion is what makes AC#2's
     "zero silent absences" mechanical rather than a promise.

2. **Should `heading-order` be explicitly enabled repo-wide, or left to the bespoke walk?**
   - What we know: it will not run under the declared tags; the bespoke walk covers 28 host states.
   - What's unclear: the non-host surfaces then have no heading-order coverage at all.
   - Recommendation — **RESOLVED (implemented by plan 17-01 Task 3 for the `.options()` enable and
     plan 17-07 Task 2's A4 measurement; the bespoke walk by plan 17-10):** enable the rule explicitly
     (one line, in the one `.options()` object) **and**
     land the bespoke walk. They cover different route sets; neither implies the other. Record the
     enable as the UI-SPEC correction it is.

3. **Does the phase close `[16-D6]`'s three reproducible e2e reds?**
   - What we know: none is Phase 17's by authorship; the soft-404 is product/SEO behaviour across
     ~10 routes; D-200 allows closing green around escalate-class findings.
   - Recommendation — **RESOLVED (implemented by plan 17-01 Task 1 for the declared red set and plan
     17-13 Task 1 for the D-199 escalation ledger):** **declare the baseline red set as a phase
     artifact**, escalate the soft-404 per
     D-199 (it is a product question, and the cheapest correct fix touches `loading.tsx` semantics),
     and fix only what a Phase-17 change breaks. Do not absorb them.

4. **Is `[16-D10]`/`wizard-cover-preview` unblocked here?**
   - What we know: `16-15` recorded that unblocking changes `EXPECTED_BLOCKED` and makes the next
     dispatch **mint** a PNG — explicitly *"the PM's to schedule, not a side effect"*.
   - Recommendation — **RESOLVED (implemented by plan 17-13 Task 3, and re-asserted by plan 17-14
     Task 1's pre-dispatch gate):** **no.** Update the blocked row's reason to the current truth (AC#29)
     and leave
     the mint to the PM. This is the one place where "unblock it and shoot it" must not be reflexive.

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | everything | ✓ | 24.13.0 (engines: `>=24.2`) | — |
| npm | install / build | ✓ | 11.8.0 | — |
| Playwright CLI + browsers | every e2e assertion | ✓ | 1.60.0 (pinned exact) | — |
| `playwright-core` | `@axe-core/playwright` peer | ✓ | 1.60.0 | — |
| Docker | `npm run db:up` for seeded specs | ✓ (29.6.1) | image `postgis/postgis:18-3.6` pulled; **no container running** | `npm run db:up` |
| Postgres (running) | `host-headings`, AC#30/AC#36 rows | ✗ | — | `npm run db:up` before the run |
| `tsx` | seed scripts | ✓ | 4.22.4 (pinned exact) | — |
| `gh` CLI | dispatching `baselines.yml`, reading run ids | ✓ | 2.86.0 | GitHub web UI |
| git | — | ✓ | 2.52.0 | — |
| **`visual` Playwright project** | GATE-01 comparison + regeneration | ✗ **structurally** | — | **CI only.** `process.platform === "win32"` ⇒ the project is not constructed (D-29) |
| `mcr.microsoft.com/playwright:v1.60.0-noble` | baseline generation | n/a locally | — | CI container job |
| `@axe-core/playwright` | GATE-02 | ✗ not installed | — | `npm i -D @axe-core/playwright@4.13.0` (audited above) |

**Missing dependencies with no local fallback:**
- The `visual` project. Every GATE-01 clause (AC#25-29) is a **CI** action. Plan tasks accordingly —
  no plan may claim a local green on a baseline comparison.

**Missing dependencies with a fallback:**
- Running Postgres → `npm run db:up`.
- `@axe-core/playwright` → one pinned dev install (Wave 0).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Design gate | **Vitest 4.1.8** via `vitest.design.config.ts` (DB-free, `environment: "node"`, no `globalSetup`) |
| Full unit suite | **Vitest 4.1.8** via `vitest.config.ts` (**requires Postgres** — `tests/global-setup.ts` preflights `fitout_test`) |
| E2E | **@playwright/test 1.60.0**, `playwright.config.ts`, projects `chromium` (`e2e/*.spec.ts`) and `visual` (Linux only) |
| Quick run (design) | `npm run test:design` — **measured 2026-08-29: 64 files, 1216 passed / 3 skipped, 95s, GREEN** |
| Build gate | `npm run build` = `lint && test:design && next build` — new design gates are blocking by construction |
| E2E scale | **281 tests in 33 files** (`chromium`), NOT green today — see Pitfall 9 |
| Baseline comparison | `npx playwright test --project=visual` — **CI only** (`ci.yml` job `gate-visual`) |

### Phase Requirements → Test Map

| Req | Behaviour | Type | Automated command | File exists? |
|-----|-----------|------|-------------------|--------------|
| RESP-03 | No horizontal overflow at 320px, extended route table, both themes | e2e | `npx playwright test e2e/overflow-320.spec.ts --project=chromium` | ✅ extend |
| RESP-03 | Sheet row scoped, zero offenders (16-D9) | e2e | same | ✅ one-line |
| RESP-03 | Sticky bar visible, 64px, pinned, non-occluding at 320; absent at 1280 | e2e | same (or a new `sticky-bar` block) | ❌ **Wave 0** |
| RESP-03 | No-wrap over the declared price/countdown/label set | e2e | `npx playwright test e2e/mobile-booker-path.spec.ts` + new call sites | ⚠ instrument exists, set does not |
| RESP-03 | `expectTargets` runs after the tell (15-12) | e2e | `npx playwright test e2e/overflow-320.spec.ts` | ✅ fix in place |
| RESP-04 | Zero viewport-conditional JSX; 1 `matchMedia` call site; 0 `useMediaQuery` | unit | `npx vitest run --config vitest.design.config.ts tests/design/{new}.test.ts` | ❌ **Wave 0** |
| RESP-04 | One instance in document at 320/768/1280 per named surface; 1 `navigation` landmark | e2e | new spec | ❌ **Wave 0** |
| RESP-04 | `sheet.tsx` absent / `responsive-dialog.tsx` present | unit | `npx vitest run --config vitest.design.config.ts tests/design/sheet-absent.test.ts` | ✅ |
| GATE-02 | axe zero violations, court, 320+1280, every route-table surface, vacuity-guarded | e2e | new `e2e/axe-sweep.spec.ts` | ❌ **Wave 0** |
| GATE-02 | Five keyboard properties on calendar / slot picker / wizard / dialogs / sheets | e2e | new spec on `helpers/focus.ts` | ❌ **Wave 0** |
| GATE-02 | `expectRing` is the only focus definition in `e2e/` | unit | new design scan | ❌ **Wave 0** |
| GATE-02 | Heading outline: no skipped level, 28 states × 3 widths | e2e | `npx playwright test e2e/host-headings.spec.ts --project=chromium` **alone** | ✅ extend |
| GATE-02 | ProfileLink ≥24×24 at 320 **and** cluster ≤226px | e2e | `npx playwright test e2e/overflow-320.spec.ts` | ⚠ scan exists, assertion does not |
| GATE-02 | Slider `toBeDisabled()` ×2 | e2e | `npx playwright test e2e/avatar-crop.spec.ts --project=chromium` | ✅ flip |
| GATE-01 | 78 rows / 24 blocked / 4 swap surfaces / 1 exclusion; type pins compile | unit + tsc | `npx tsc --noEmit` | ✅ |
| GATE-01 | Zero `*-win32.png` / `*-darwin.png` tracked | unit | `npx vitest run --config vitest.design.config.ts tests/design/gitignore-baselines.test.ts` | ✅ covers the platform half (via `git ls-files`) |
| GATE-01 | Zero `*-grove-*.png` on disk (AC#26's other half) | unit | new assertion — **verified absent**: `gitignore-baselines.test.ts` mentions `grove` nowhere | ❌ **Wave 0** |
| GATE-01 | Green **comparison** run on head commit, run id recorded | CI | `ci.yml` `gate-visual` | ✅ CI |
| GATE-06 | 26 `.sql`, ends `0025_audit_resolved_by.sql` | unit | `npx vitest run --config vitest.design.config.ts tests/design/money-path-invariants.test.ts` | ✅ |
| GATE-06 | Content digest matches, red-watched | unit | same | ❌ **Wave 0** |
| DS-09 | Hand-rolled `h-11` `<Button>` count is **0** | unit | `npx vitest run --config vitest.design.config.ts tests/design/brand-recipe.test.ts` | ✅ flip `toBeLessThanOrEqual(6)` → `toBe(0)` |

### Sampling Rate

- **Per task commit:** `npm run test:design` (95s, DB-free) + the single e2e file the task touched.
- **Per wave merge:** `npm run build` (lint + design + next build) + `npx playwright test e2e/<touched>.spec.ts --project=chromium --workers=1`.
- **Phase gate:** full design suite green; the declared e2e baseline-red set unchanged (nothing new
  red); `npx tsc --noEmit` exit 0; then the CI `gate-visual` comparison run on the head commit.

### Wave 0 Gaps

- [ ] `npm i -D @axe-core/playwright@4.13.0` — pinned exact, dev-only
- [ ] `e2e/helpers/axe.ts` — the single `.options()` configuration + `expectAxeClean` vacuity guard
- [ ] `e2e/helpers/nowrap.ts` (or an export from the existing spec) — the generalised no-wrap clause with both guards
- [ ] `e2e/axe-sweep.spec.ts` — route table derived from the shipped inventories, not retyped
- [ ] `e2e/keyboard-composites.spec.ts` — the five properties on calendar / slot picker / wizard / dialogs / sheets
- [ ] `tests/design/one-tree.test.ts` — RESP-04 source scan (AC#10/11), counting **call sites** not strings
- [ ] `tests/design/focus-definition.test.ts` — `expectRing` uniqueness in `e2e/` (AC#20)
- [ ] `src/lib/design/selector-contract.ts` — 2–3 new rows (search-results container, calendar container) with their `why`/`owner`
- [ ] `npm run db:up` — Postgres for every seeded row
- [ ] `tests/design/{baseline-theme}.test.ts` — AC#26's grove half (zero `*-grove-*.png` on disk); the platform half is already covered
- [ ] **Declare the pre-existing e2e red set** as a committed artifact before the first new assertion lands

---

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1`. This phase ships no product surface and no
data path, so most categories are inapplicable — stated explicitly rather than left blank.

### Applicable ASVS Categories

| ASVS category | Applies | Standard control |
|---|---|---|
| V2 Authentication | **no** | Untouched. Better Auth sessions; the audit reads gated routes through existing fixtures only |
| V3 Session Management | **no** | Untouched |
| V4 Access Control | **yes — narrowly** | The `[11-21]` throw routes are new **production route entries**. Control: build-time `process.env.NODE_ENV === "production" → notFound()`, no operator-settable variable in the path (the shipped `dev/throw` pattern, T-11-THROWROUTE), plus `robots: {index:false}`. `(app)`/`(host)` group layouts keep their **blocking** session/`canHost` gates above any `<Suspense>` — `tests/design/blocking-session-gate.test.ts` asserts this over the AST and must stay green |
| V5 Input Validation | **no** | No new input surface |
| V6 Cryptography | **yes — trivially** | The GATE-06 digest uses `node:crypto` `sha256`. Integrity pin only, not a security boundary. Never hand-roll a hash |
| V14 Configuration / Supply chain | **yes** | One pinned dev dependency, audited above. `baselines.yml` holds `contents: write` and **no** `secrets.*`; `scripts/verify-workflows.mjs` asserts that prohibition over parsed `env`/`run`/`with` values. Adding any credential or trigger to that job is a scope alarm |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard mitigation |
|---|---|---|
| A dev-only throw affordance reachable in production | Elevation / Information disclosure | Build-time `NODE_ENV` guard the bundler can prune; verified by an actual `npm run build && npm start` 404 probe, not by reading the source |
| Error text leaking through a boundary | Information disclosure | `e2e/error-leak.spec.ts` + the shared `SENTINEL_LEAK_PROBE` constant — the sentinel must be **imported**, never retyped, or the zero-count assertion passes against a leaking page |
| A supply-chain addition riding in a lockfile diff nobody reads | Tampering | The Package Legitimacy Audit above; expect exactly two new lockfile entries |
| `--update-snapshots` reaching a `push`-triggered workflow (the gate regenerating itself) | Tampering | `baselines.yml` is `workflow_dispatch`-only; `scripts/verify-workflows.mjs` fails on an added trigger over the **parsed tree** (a substring check is green on that mutation — measured 6/6) |
| An axe `.exclude()` used to make a red green | Repudiation | Every exclusion carries a committed reason in the `EXCLUDED_PAIRS` idiom; `disableRules` is forbidden outright |

---

## Project Constraints (from CLAUDE.md)

| Directive | Consequence for these plans |
|---|---|
| **GSD workflow enforcement** — no direct repo edits outside a GSD workflow | All Phase-17 edits arrive through `/gsd:execute-phase` |
| **PostgreSQL 18 + Drizzle; exclusion constraints hand-written in SQL** | Reinforces GATE-06: no migration, ever, in this phase |
| **"Application-level double-booking checks" are in the *What NOT to Use* table** | The remediation table's D-130 clause: no booking/payment/capacity/availability logic change, no computation moved client-side |
| **Server-side price and availability authority** | `tests/design/money-path-invariants.test.ts` and GATE-05 stay green; the audit may reshape layout only |
| **`timestamptz` everywhere; convert at the edges with `@date-fns/tz`** | Any date shown in a new test message must not introduce a local-time assumption |
| **shadcn primitives are the baseline; a polish milestone that rewrites them has misidentified the problem** | Exactly one vendored edit is sanctioned (D-197, `ui/slider.tsx`); compose over primitives everywhere else |
| **No new capability** (`if building it changes a requirement ID, it is not polish`) | Any finding that wants a control, a filter or a state is escalate-class |

---

## Sources

### Primary (HIGH confidence — measured in this tree, 2026-08-29)

- `e2e/overflow-320.spec.ts` (2,092 lines) — the three route tables, `TARGET_FLOOR_PX=24` (:905), `TOUCH_FLOOR_PX=44` (:1570), `RouteRow.scope` (:339) and its loop consumer (:772)
- `e2e/helpers/overflow.ts` — `FLOOR_PX`, `OVERFLOW_TOLERANCE_PX`, `MIN_EXAMINED_ELEMENTS`, both `expect*` functions and the measured modal-scroll-lock argument
- `e2e/helpers/focus.ts` (424 lines) — `expectRing`, the walk primitives, `partitionDevOverlay`, `WALK_BOUND`
- `e2e/mobile-booker-path.spec.ts:443-486` — the no-wrap instrument and its two guards
- `e2e/host-headings.spec.ts` — `WIDTHS=[320,768,1280]`, `FLAT_STATES + 9 + 8 = 28`, 84 pinned measurements
- `e2e/visual/surfaces.spec.ts` — `EXPECTED_BASELINE_COUNT = 78` (:301), `EXPECTED_BLOCKED` (24 entries, :179+)
- `e2e/visual/freeze.css` — the `nextjs-portal` precedent and the dev-vs-production-build trade
- `e2e/visual/surfaces.spec.ts-snapshots/` — **36 PNGs**, all `court`, all `linux`, zero grove
- `src/lib/design/visual-baselines.ts` — 44 `VISUAL_SURFACES` rows with `url`/`hook`/`hookWhy`
- `src/lib/design/selector-contract.ts` — the compile-enforced testid inventory + D-32 floors
- `src/lib/design/measurements.ts:336/345/355` — `STICKY_BAR_HEIGHT`, `STICKY_BAR_CLEARANCE`, `HOLD_COUNTDOWN_BOX`
- `src/components/ui/button.tsx` — the `size` CVA (`touch: h-11 gap-1.5 px-4 …` vs `default: h-8 … px-2.5`)
- `src/components/ui/slider.tsx:80-84` — the Thumb, and :43's `aria-prohibited-attr` note
- `src/components/patterns/site-chrome.tsx:114/206/356/368-377` — `NAV_LINK_CLASS`, the single `<nav>`, the 226px budget, `ProfileLink`
- `src/app/dev/throw/page.tsx` — **"WHICH BOUNDARY CATCHES IT: `src/app/error.tsx`, the root one"** (confirmed by driving, not inferred) and the `NODE_ENV` guard shape
- `src/app/(app)/layout.tsx:40-42`, `src/app/(host)/host/layout.tsx:42-54` — the blocking gates
- `tests/design/money-path-invariants.test.ts` — `LAST_MIGRATION`, the `>20` guard-the-guard
- `tests/design/brand-recipe.test.ts:419/476/721-760` — `BARE_TOUCH_HEIGHT`, `enclosingButtonTag`, the DS-09 ceiling
- `tests/design/loading-coverage.test.ts:228-230` — `EXPECTED_PAGES/QUALIFYING/NON_QUALIFYING` = 29/21/8
- `.github/workflows/baselines.yml` — the single write path, the `GITHUB_TOKEN`-push-triggers-nothing fact, the substring-vs-parse vacuity table
- `.github/workflows/ci.yml:905-1061` — `gate-visual`, the comparison job
- `.planning/phases/16-image-crop-framing/deferred-items.md` — D2 / D6 (triaged) / D7 / D8 / D9 / D10
- `.planning/phases/13-…/deferred-items.md` — [13-15] with the 226px/200px measurement
- `.planning/phases/14-…/deferred-items.md` — [14-REVIEW WR-03], [260824-dbc]
- Command output: `npm view @axe-core/playwright@4.13.0 …`, `npm view axe-core@4.13.0 …`, `api.npmjs.org/downloads`, `python -m slopcheck install …` (`2 OK`), `npx playwright test --list --project=chromium` (281/33), `npx vitest run --config vitest.design.config.ts` (64 files / 1216 passed / 3 skipped / 95s), `node -p process.platform` (`win32`), `docker images` (`postgis/postgis:18-3.6`)
- `node_modules/next/dist/compiled/next-devtools/index.js:3834` — `attachShadow({mode:"open"})`

### Primary (HIGH confidence — official documentation)

- https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md — `target-size` disabled by default; `region`/`heading-order`/`landmark-one-main`/`page-has-heading-one` are `best-practice`
- https://github.com/dequelabs/axe-core/blob/develop/doc/API.md — `runOnly` + `rules:{id:{enabled:true}}` is required to activate a disabled-by-default rule
- https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/README.md — the chainable API
- https://raw.githubusercontent.com/dequelabs/axe-core-npm/develop/packages/playwright/src/index.ts — `options()` replaces `this.option`; no merge
- https://playwright.dev/docs/accessibility-testing — the `makeAxeBuilder` fixture pattern, `exclude()` vs `disableRules()`, `testInfo.attach` for results

### Secondary (MEDIUM confidence)

- https://www.deque.com/axe/core-documentation/api-documentation/ and https://www.deque.com/blog/axe-3-0-has-arrived/ — axe supports **open** shadow DOM and cannot support closed; it walks a flattened virtual tree (two independent sources agreeing)

### Tertiary (LOW confidence — flagged, not relied upon)

- The "rules most likely to fire" prediction in § GATE-02 (`[ASSUMED — A5]`). Replaced by the first real sweep.

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| Standard stack | **HIGH** | One package; version, deps, peer, postinstall, repo, age, downloads and slopcheck all verified against the registry today; prescribed by Playwright's own docs |
| Instrument inventory & coverage delta | **HIGH** | Every count re-derived from the files by command, not read from a document. The DS-09 count was reproduced through the test's own scan and disagrees with the UI-SPEC — which is why it is stated as a measurement |
| Axe rule/tag behaviour | **HIGH** | Two official docs, plus the package source for the option-precedence claim |
| Dev-overlay shadow-root exposure | **HIGH** | `mode:"open"` read out of the shipped bundle; axe's open-shadow traversal corroborated by two Deque sources |
| `[11-21]` boundary-nesting correction | **HIGH** | The repo's own file records the measurement, and the layouts' gates were read directly |
| Predicted axe violation classes | **LOW** | A prediction. Named as `[ASSUMED — A5]` |
| Predicted baseline diff | **MEDIUM** | Derived from the CVA's padding delta and the baseline row list; the ProfileLink half is `[ASSUMED — A3]` |

**Research date:** 2026-08-29
**Valid until:** 2026-09-28 for the ecosystem facts (axe minor bumps ship new rules — the exact pin is
what makes this durable); the in-tree measurements are valid until the next commit that touches
`e2e/`, `tests/design/`, `src/lib/design/` or `src/app/**/page.tsx`.
