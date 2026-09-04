# Phase 11: Quality Gates, Pattern Layer & App Shell - Context

**Gathered:** 2026-08-13
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers **three things later phases inherit rather than invent**: gates that can actually
fail, a pattern layer that is used rather than grown, and an app shell with a header, a footer and all
four state families.

**The visual half of this phase is already settled** by `11-UI-SPEC.md` (approved, 1165 lines) — shell
geometry, footer, `/terms` + `/privacy`, the four state families, three card patterns, the
mobile-overlay primitive, share/meta, the copy contract, the 14 `data-testid` names, +2 contrast pairs
/ +3 exclusions, and 35 falsifiable acceptance criteria. **This document does not re-decide any of it.**

**What this discussion settled is the ENGINEERING half of the three gates**, which `11-UI-SPEC.md`
explicitly hands off: *"Engineering ownership of GATE-01 / 04 / 05 belongs to the plan. What follows is
only the part that is a visual or interaction contract."*

**Explicitly NOT in this phase** (each belongs to a later one, do not absorb):
- Any per-surface polish of search, listing detail or checkout — **Phase 12**
- `bookings/[id]/not-found.tsx` and the booker trust surfaces — **Phase 13**
- Host dashboard/inbox/wizard redesign — **Phase 14** (HFLOW-01 *adopts* `EmptyState`, never re-decides it)
- Auth screen and email-shell design — **Phase 15**
- `section.tsx`, `stat-card.tsx`, `data-list.tsx`, `form-section.tsx` — real duplication, deliberately
  not extracted until the phase that stresses them (`11-UI-SPEC.md` § Supporting patterns)
- The full baseline regeneration, the axe pass, and flipping leak tests advisory→blocking — **Phase 17**

</domain>

<decisions>
## Implementation Decisions

### Where the gates run — CI

- **D-23:** **GitHub Actions is added in this phase.** GATE-01's requirement text says *"CI fails on a
  missing baseline"* and **there is no CI in this repository today** — no `.github/workflows`, no husky,
  no git hooks. D-135 prescribes `updateSnapshots: process.env.CI ? "none" : "missing"`, which with no
  CI anywhere resolves to `"missing"` on every machine that will ever run it. The gate is only real if
  something sets `CI=true`; Actions does it for free, and a missing baseline then fails on a machine
  that is not the author's.
- **D-24:** **Two jobs.** Job 1 is DB-free: `lint` + `test:design` + the Playwright **visual** project in
  the pinned container. Job 2 adds a `postgis/postgis:18-3.6` service + `db:migrate` + `db:test:setup`
  and runs the **full vitest suite**, so the exclusion-constraint specs GATE-04 protects run somewhere
  other than the author's laptop. **The 12 shipped e2e specs are deliberately NOT in CI** — they each
  boot a dev server and seed real data, which is the largest flake and secret surface available, and a
  flaky gate gets retried until green. (One narrow exception: see **D-33**.)
- **D-25:** **Triggers on push to `dev`/`main` and on PRs, with `concurrency: cancel-in-progress`.**
  The binding rules are two: *a phase cannot be marked complete with CI red*, **and** *any plan that adds
  or changes a baselined surface pushes and waits for green before the next plan starts*. Rationale: the
  executor already runs vitest locally per plan, so what CI uniquely adds is the **Linux-only visual
  baselines** — which only some plans touch. **Load-bearing context: `dev` is 145 commits ahead of
  `origin/dev` and `main` is still at "Initial commit".** CI only ever sees what is pushed, so this is a
  push-cadence commitment as much as a workflow file.

### `SUPPORT_EMAIL` — the UI-SPEC's declared blocking input

- **D-26 (DELIBERATE DEPARTURE from approved `11-UI-SPEC.md` — record it, do not silently reconcile):**
  FitOut owns no domain and has no support inbox (`metadataBase` falls back to `localhost:3000`; the only
  real address anywhere in `src/` is Resend's `onboarding@resend.dev` sender). The user's call was
  **"just placeholder for now."**
  - `SUPPORT_EMAIL` stays `null` and **the footer renders no support entry at all** — no greyed link, no
    `mailto:`, no "coming soon". This is the spec's own *nothing false ships* path, just held open longer
    than it assumed. **Inventing an address remains banned** (`11-UI-SPEC.md` § Anti-Patterns).
  - **`site-contacts.test.ts` INVERTS rather than softens.** While `SUPPORT_EMAIL` is null it asserts that
    **zero** support affordances render anywhere; it flips back to demanding a non-null string containing
    `@` plus exactly one `mailto:` the moment the constant is set. The gate is never absent — the failure
    mode this phase exists to prevent is a gate quietly reduced to nothing.
  - The unfilled slot is carried as a named **`human_needed`** item on phase completion, the same
    convention the roadmap already uses for the sales-gated PayMongo threads.
  - **Amends `11-UI-SPEC.md` AC#8 and § The unfilled slot.** The "phase cannot complete with the
    placeholder in place" clause no longer holds; the `human_needed` item replaces it.

### GATE-01 — baselines

- **D-27:** **CI generates and commits the baseline PNGs.** A `workflow_dispatch` job runs the visual
  project with `--update-snapshots` on the Actions Linux runner (fresh `npm ci`, correct Linux binaries,
  `mcr.microsoft.com/playwright:v1.60.0-noble`) and commits them back to the branch. **No local Docker.**
  The baselines are produced by the exact same runner + image that later compares against them, so drift
  is structurally impossible. *Local Docker was rejected on a measured ground:* `node_modules` holds
  Windows-native binaries (Next's SWC, esbuild, sharp), so a bind-mounted container needs its own Linux
  `node_modules` volume — a second dependency tree to keep in sync, on Windows Docker Desktop.
- **D-28 (DEVIATION from D-135's literal ternary — strictly stronger, record it):**
  **`updateSnapshots: "none"` unconditionally.** Dropping the `process.env.CI` ternary means the config
  can **never** write a baseline implicitly, on any machine, whether or not an env var happens to be set —
  which removes the gate's dependency on `process.env.CI` existing in the place that matters. Regeneration
  happens **solely** via the explicit `--update-snapshots` CLI flag in the dispatch job (the flag overrides
  config). The problem this closes: under D-135 as written, a local Windows run resolves to `"missing"`,
  writes `*-win32.png` baselines and reports **green** — the fail-open bug relocated from CI to the
  author's laptop.
- **D-29:** The visual specs live in **their own `visual` Playwright project** that hard-skips on
  non-Linux with a named reason, so a local `npx playwright test` stays usable. `@playwright/test` is
  pinned **exact** at `1.60.0` (it currently carries a `^`), and `.gitignore` gains the
  `*-win32.png` / `*-darwin.png` rules (it has none today).
- **D-30:** **How "this gate can actually fail" is proven, split by kind.** Missing-baseline and
  few-pixel-shift are each triggered **deliberately once**, with the verbatim failing output committed in
  the workflow file's header — the repo's established **OBSERVED RED** convention
  (cf. `tests/use-server-exports.test.ts`). The Windows rule is different in kind: it is a static fact
  that can regress **silently**, so it earns a **standing DB-free design test** asserting `.gitignore`
  carries both rules AND that git tracks zero such files.

### GATE-04 — the selector inventory and the mutation proof

- **D-31 (SUPERSEDES D-134's literal `SELECTOR-CONTRACT.md` name — record it):** the inventory is a
  **typed TS module** (e.g. `src/lib/design/selector-contract.ts`) read by a DB-free design test. This
  repo has converged hard on that shape for every declared inventory — `contrast-pairs.ts`,
  `status-tones.ts`, and the `measurements.ts` the UI-SPEC mandates. A markdown doc that must be parsed
  is the only inventory in the codebase that would not be type-checked, and its failure modes (a renamed
  heading, a reformatted table) look exactly like selector regressions.
- **D-32:** **"Checked" means existence + a FLOOR, not equality.** Every `data-testid` declared in the
  inventory must actually appear in `src/` (source scan), and the `getByRole` / `getByLabel` counts in
  `e2e/` may only go **up**, never down. This blocks the real regression D-134 describes — someone
  converting accessible queries into brittle test ids — while letting Phases 12–19 add coverage freely.
  **`11-UI-SPEC.md` AC#32's "unchanged in count" is read as a floor**, because exact equality at 92 / 30
  would break on every legitimate new assertion and train everyone to bump the number as a reflex, which
  is the rubber-stamp habit this phase exists to prevent arriving from the opposite direction.
- **D-33:** **The (N+1)th-booking mutation is OBSERVED RED, plus a standing catalog assertion.** The
  destructive mutation (drop or widen `booking_no_overlap`) is performed **once by hand** against the test
  DB and the spec's verbatim failing output is committed in its header; **nothing destructive lives in the
  suite.** The standing guard is instead a `pg_constraint` assertion that the constraint exists with its
  expected definition — extending what `tests/availability/open-capacity-exclude.test.ts:146` already
  does. *An in-transaction mutation test was rejected on risk:* DDL in a test suite against the app's
  single most important invariant, where a failed rollback leaves the test DB with no constraint and every
  later test silently green.

### GATE-05 — the client/server boundary and the price e2e

- **D-34:** **`server-only` guards make Next itself the enforcer.** `import "server-only"` is added to the
  declared forbidden modules (`src/lib/booking/pricing.ts`, `src/lib/booking/all-in-rate.ts`, the fee
  constants in `src/lib/payments/config.ts` / `service-fee.ts`, and `src/lib/availability/**`'s computing
  modules). Next's bundler then hard-fails `next build` the moment any client graph reaches them —
  **transitively, through barrels and re-exports, with no resolver of ours to maintain.** The requirement
  says *"fails the build"*; this makes the build the enforcer. The design test's job shrinks to asserting
  every module on the declared list still carries its guard, so it cannot be quietly deleted.
- **D-35:** **The DB-vs-DOM price check gets its own narrow third CI job** — Postgres service + dev server
  + a self-seeded booking (the `search-and-book.spec.ts` pattern: unique `randomUUID` rows,
  cascade-correct teardown), running **exactly one spec**, reading the `data-testid="price-total"` hook
  `11-UI-SPEC.md` already mandates. This deliberately re-opens a small slice of the e2e surface D-24
  closed, because it is the single assertion standing between a restyle and a wrong number charged to a
  real card. One self-contained spec is a fraction of the twelve.
- **D-36:** **GATE-05 lands red on shipped code, and the guard + its OBSERVED RED + the fix land in ONE
  plan.** See the measured finding in `<code_context>` — `listing-card.tsx` is a live D-130 violation. The
  plan adds `server-only`, runs the build, captures the verbatim failure **naming `listing-card.tsx`** as
  its OBSERVED RED (a genuine demonstration that the gate fails on real shipped code — far stronger than a
  synthetic probe), then moves the computation server-side so prices arrive pre-formatted. Atomic, and no
  intervening plan runs against a red build. **This mirrors `11-UI-SPEC.md`'s own same-plan rule for the
  `SUPPORT_EMAIL` gate**, and the fix is already in scope: the UI-SPEC names `listing/listing-card.tsx` as
  one of the components `ResultCard` replaces.

### Claude's Discretion

Nothing was delegated wholesale. Two items were **resolved rather than asked**, both recorded above with
their reasoning, and the planner may adjust their mechanics but not their intent:

- **D-26's inverted gate.** The user said "just placeholder for now"; the choice *not* to soften the gate
  to nothing — and to carry a `human_needed` item instead — is Claude's, on the stated ground that a gate
  quietly reduced to nothing is this phase's named failure mode.
- **The `next build` / Postgres risk** below was flagged for research rather than put to the user, because
  it is a measurement, not a preference.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The visual contract — read this FIRST, it settles most of the phase
- `.planning/phases/11-quality-gates-pattern-layer-app-shell/11-UI-SPEC.md` — **the approved design
  contract for this phase.** App shell geometry, the footer, `/terms` + `/privacy`, all four state
  families, the three card patterns, the mobile-overlay primitive, share/meta, the copywriting contract,
  the 14 `data-testid` names, the +2 / +3 contrast rows, the anti-pattern list, and **35 falsifiable
  acceptance criteria**. Do not re-decide anything in it. **Three of its clauses are amended by this
  document — D-26 (AC#8 + § The unfilled slot), D-32 (AC#32's count reading).**
- `.planning/phases/10-design-system-foundation-theme-runtime/10-UI-SPEC.md` — the foundation
  `11-UI-SPEC.md` extends (`extends:` in its frontmatter).

### Prior locked decisions — do not reopen
- `.planning/phases/10-design-system-foundation-theme-runtime/10-CONTEXT.md` — **D-01…D-22.** Especially
  **D-08** (the Playwright `addInitScript` theme seam this phase's swap smoke depends on), **D-16** (one
  shared pattern list, two consumers), **D-18** (generated token module, committed + regen-diff checked —
  the precedent D-31 follows), **D-22** (`size="touch"` is opt-in, so Phase 17's audit is what catches misses).
- `.planning/PROJECT.md` § Key Decisions — **D-127…D-136.** D-130 (no logic moves client-side),
  D-131 (the four gates), **D-134** (GATE-NOREG's three mechanisms — its `SELECTOR-CONTRACT.md` name is
  superseded by D-31), **D-135** (the fail-open VR gate — its ternary is deviated from by D-28),
  D-136 (net-new capability stays out).
- `.planning/ROADMAP.md` § *Phase 11* and § *Cross-Cutting Constraints (v1.1)* — the five hard gates, the
  ordering invariants, and **GATE-06 (zero schema migrations; `drizzle/` stays at `0025`)**. A migration
  proposed in any plan is a scope alarm to be raised explicitly, never absorbed.
- `.planning/REQUIREMENTS.md` — the 11 requirement texts (DS-11, STATE-01/02/04, SHELL-01/02/04, RESP-01,
  GATE-01/04/05) and § *Requirement Overlaps* (STATE-04 vs HFLOW-01).

### In-repo conventions the plans must follow rather than reinvent
- `tests/use-server-exports.test.ts` — **two conventions in one file.** (1) The **OBSERVED RED** header
  block: a verbatim failing run committed as proof the gate can fail — the format D-30, D-33 and D-36 all
  follow. (2) AST scanning via `ts.createSourceFile`, **not grep**, with its explicit note that it does
  *not* follow imports.
- `tests/availability/open-capacity-exclude.test.ts:146` — the existing `pg_constraint` catalog query
  D-33's standing assertion extends.
- `tests/availability/exclusion-race.test.ts` — the double-booking spec GATE-04 protects; its
  `makeRacingClients` two-connection harness.
- `e2e/search-and-book.spec.ts` — the self-seeding e2e pattern D-35's price spec copies (unique
  `randomUUID` rows, cascade-correct teardown, `postgres` direct to `DATABASE_URL`).
- `e2e/helpers/theme.ts` — D-08's theme seam. Its header states outright that **no VR baseline may be
  captured before Phase 11**; this is the phase that shoots them.
- `vitest.design.config.ts` — the DB-free design-gate config. **Its header is a warning, not commentary:**
  adding `globalSetup` or `setupFiles` silently reintroduces the Docker dependency this config exists to
  avoid. Every new gate in this phase that can be DB-free belongs here.
- `.planning/research/SUMMARY.md` § *The Verified Defect List* — every row a measurement with `file:line`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Measured this session (2026-08-13) — supersedes any earlier figure

| Fact | Evidence |
|---|---|
| **No CI exists** | no `.github/workflows`, no husky, no git hooks |
| GitHub remote exists | `origin` → `pengr3/FitOut` |
| **`dev` is 145 commits ahead of `origin/dev`**; `main` is at "Initial commit" | `git branch -vv` |
| `@playwright/test` **1.60.0** installed, `^` in package.json | D-135 needs an exact pin → image tag `mcr.microsoft.com/playwright:v1.60.0-noble` |
| `playwright.config.ts` has **no** snapshot config | no `updateSnapshots`, one chromium project, `webServer: npm run dev` |
| **Zero baselines exist**; `.gitignore` has no `*-win32.png` / `*-darwin.png` rules | `find e2e -name "*.png"` empty; `.gitignore:15-17` |
| `src/` contains **zero** `data-testid` | confirmed — matches `11-UI-SPEC.md` § GATE-04 |
| **100** `"use client"` files in `src/` | `grep -rl '"use client"' src/` |
| `pricing.ts` carries **no** `server-only` guard | only 5 files in `src/` import `server-only` |

### ⚠ A LIVE D-130 VIOLATION IN SHIPPED CODE — this is what makes GATE-05 land red

`src/components/listing/listing-card.tsx` is `"use client"` (line 1) and **calls `allInRateParts()` at
line 205**. The chain:

```
listing-card.tsx  ("use client")
  → @/lib/booking/all-in-rate           (line 43)
    → @/lib/payments/service-fee        (all-in-rate.ts:21, computeServiceFee)
      → @/lib/payments/config           (service-fee.ts:25)
        → SERVICE_FEE_BPS = Number(process.env.SERVICE_FEE_BPS ?? 500)   (config.ts:59)
```

`SERVICE_FEE_BPS` has **no `NEXT_PUBLIC_` prefix**, so in the browser bundle `process.env.SERVICE_FEE_BPS`
is `undefined` and the expression falls back to **the literal `500`**. Two consequences, both on
`/host/listings`:

1. **The commission rate is in the client bundle.** `11-UI-SPEC.md` § GATE-05 asserts *"`SERVICE_FEE_BPS`
   never enters the browser bundle"* — that is true of `SearchResultCard`, whose prices arrive
   pre-formatted from the server, but **not** of its sibling `listing-card.tsx`.
2. **A silent price divergence.** If the deployed `SERVICE_FEE_BPS` is ever set to anything other than
   `500`, the host's listing grid renders a price the server would never charge — no error, no warning.

**This is in scope to fix:** `11-UI-SPEC.md` names `listing/listing-card.tsx` as one of the components
`ResultCard` replaces. **D-36** sequences the guard, the OBSERVED RED capture and the fix into one plan.

### The only other value-imports crossing the boundary (both benign — do NOT deny-list them)

Everything else reaching client components from these trees is a `import type` (erased at compile) or a
non-computation:

- `BOOKING_HORIZON_DAYS` from `@/lib/availability/slots` — a **constant** (`availability-calendar.tsx:29`,
  `date-pass-picker.tsx:42`)
- `blockReasonLabel` from `@/lib/availability/block-reason` — a **label mapper** (`blocks-editor.tsx:26`)

The deny-list must be drawn at *computation* modules, not whole trees, or `server-only` breaks these two
legitimate imports and the gate fails for the wrong reason.

### Reusable assets
- **`e2e/helpers/theme.ts` (`seedTheme`) already exists and was built for this phase.** Its own header
  says so. The theme-swap smoke seeds `next-themes`' storage key via `addInitScript` before navigation —
  the key is *imported from the provider*, not duplicated, precisely so the smoke cannot silently
  screenshot the same theme twice.
- **`/dev/theme` already exists** (Phase 10, plan 10-16), renders two themes in nested `[data-theme]`
  subtrees, needs no DB/network/seed, and 404s in production. `11-UI-SPEC.md` mandates **extending** it
  with sections 10–14 rather than building a second dev route.
- **`vitest.design.config.ts` + `tests/design/**`** — the DB-free gate home, already wired into
  `npm run build`. `tests/ops/` and `tests/security/` are the established homes for mechanical guards.
- **`tests/helpers/db.ts`** (`setupTestDb` / `teardownTestDb` / `makeRacingClients`) — the schema-isolated
  test-DB harness CI job 2 will drive via `db:test:setup`.
- **`docker-compose.yml` pins `postgis/postgis:18-3.6`** with a documented reason (a bare `:18` tag does
  not exist on Docker Hub) — CI job 2's service must use the **same** tag, not `:18`.

### Integration points
- **`.github/workflows/` — created from nothing in this phase.** Three jobs (D-24, D-35) plus the
  `workflow_dispatch` baseline-regeneration job (D-27).
- `playwright.config.ts` — the `visual` project (D-29), `updateSnapshots: "none"` (D-28), exact version pin.
- `package.json` — pin `@playwright/test` exact; `build` stays `lint && test:design && next build`.
- `.gitignore` — the `*-win32.png` / `*-darwin.png` rules (D-29), asserted by a standing test (D-30).
- `src/lib/design/` — joins `contrast-pairs.ts`, `status-tones.ts`: new `measurements.ts` (UI-SPEC) and
  `selector-contract.ts` (D-31).
- `src/lib/site.ts` — new; exports `SUPPORT_EMAIL: string | null = null` (D-26).
- `src/lib/booking/pricing.ts`, `all-in-rate.ts`, `src/lib/payments/config.ts`, `service-fee.ts`,
  `src/lib/availability/**` — gain `import "server-only"` (D-34).
- `src/app/listings/[id]/page.tsx:346` — `lg:sticky lg:top-8` → `lg:top-20`; it would tuck under the new
  64px sticky header on every scroll (`11-UI-SPEC.md`, load-bearing).
- `src/app/(app)/layout.tsx` and `src/app/(host)/host/layout.tsx` — the Suspense restructure STATE-01
  depends on for ~15 of ~27 routes. **The session check stays blocking** (the T-04-06 / T-04-02 security
  gate that `redirect()`s); only the *ambient* notification read moves into an async child.

### ⚠ Open risk for the researcher to resolve BEFORE the CI job split is written
**`npm run build` = `lint && test:design && next build`. If `next build` needs a reachable Postgres to
prerender routes, "job 1 is DB-free" collapses** and both jobs need the `postgis` service. This was
flagged rather than assumed — it is a measurement, not a preference, and it changes the workflow's shape.

</code_context>

<specifics>
## Specific Ideas

- **"A gate that has silently never failed is worse than no gate."** The roadmap's own line drove every
  choice above. It is why `updateSnapshots` became unconditional rather than env-dependent (D-28), why
  the `SUPPORT_EMAIL` gate was **inverted rather than removed** (D-26), why the count check is a floor
  rather than an equality that trains people to bump numbers (D-32), and why the `listing-card.tsx`
  violation is treated as an **opportunity** — a free, genuine OBSERVED RED on real shipped code, which is
  stronger evidence than any synthetic probe (D-36).
- **Prefer making an existing enforcer do the work over writing a new one.** `server-only` hands
  transitive enforcement to Next's bundler (D-34); `--update-snapshots` as a CLI-only escape hatch means
  no config path can write a baseline (D-28); CI generating its own baselines means author-vs-CI drift is
  structurally impossible rather than merely unlikely (D-27).
- **Destructive proofs are recorded, never automated.** The double-booking constraint is the product's
  core value; DDL against it inside a test suite risks a failed rollback leaving every later test silently
  green. One hand-run mutation with committed output, plus a read-only catalog assertion (D-33).
- **Three departures are recorded with citations rather than quietly reconciled** — D-26 (vs
  `11-UI-SPEC.md` AC#8), D-28 (vs D-135's ternary), D-31 (vs D-134's `.md` name). Each is strictly
  stronger than what it replaces, and each is named so a future reader finds the reason instead of the
  discrepancy.

</specifics>

<deferred>
## Deferred Ideas

- **A real support address / a FitOut domain.** Blocked on a business fact, not on code. Carried as a
  named `human_needed` item on phase completion (D-26). When it arrives, `src/lib/site.ts` is a one-line
  edit and `site-contacts.test.ts` flips itself back to the demanding form automatically.
- **The 12 shipped e2e specs in CI.** Excluded by D-24 on flake and secret grounds, with exactly one
  narrow exception (D-35). If Phase 17's audit wants full e2e coverage in CI, that is its call to make
  with the whole suite's flake profile in view — not a Phase 11 decision.
- **A standing in-transaction mutation harness** for the exclusion constraint — considered and rejected on
  risk (D-33). If a future phase wants continuous rather than recorded proof, it needs its own isolated
  database and an explicit post-run constraint-existence verification.
- **A transitive AST import-graph walker.** Superseded by `server-only` (D-34), which gets transitivity
  from Next's bundler for free. If a module ever genuinely cannot take a `server-only` guard, this is the
  documented alternative.
- **Real legal copy for `/terms` and `/privacy`.** `11-UI-SPEC.md` is explicit: the placeholder notice is
  removed **only** in the same commit that supplies real copy, and that commit deletes the two assertions
  guarding it. Not a v1.1 item.
- **`section.tsx`, `stat-card.tsx`, `data-list.tsx`, `form-section.tsx`.** Real duplication, deliberately
  not extracted — every one lives on a Phase 12–14 surface, and extracting a pattern before the phase that
  stresses it is how a pattern layer becomes a junk drawer (`11-UI-SPEC.md`).

</deferred>

---

*Phase: 11-Quality Gates, Pattern Layer & App Shell*
*Context gathered: 2026-08-13*
