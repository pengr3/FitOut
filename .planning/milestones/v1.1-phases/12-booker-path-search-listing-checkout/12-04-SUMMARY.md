---
phase: 12-booker-path-search-listing-checkout
plan: 04
subsystem: booking
tags: [gate-05, d-38, d-40, d-42, d-73, d-130, rsc-boundary, ast-gate, money, design-gate]

# Dependency graph
requires:
  - phase: 12-booker-path-search-listing-checkout
    plan: 02
    provides: "the hoisted day/availability provider (the rail this plan's table feeds is inside it); the isomorphic-leaf precedent for a client-graph boundary problem"
  - phase: 12-booker-path-search-listing-checkout
    plan: 03
    provides: "the checkout header countdown and the `hold-countdown` selector row this plan's row is appended after"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "SELECTOR_CONTRACT + its BIDIRECTIONAL gate and string-literal-only collector, tests/design/sheet-absent.test.ts's source-absence spine, tests/design/helpers/strip-comments.ts, buildAllInTable + tests/booking/all-in-table.test.ts"
  - phase: 7
    provides: "PriceBreakdown, its three frozen money props, the C1/D-73 label rule and the GREP TRIPWIRE header this plan finally enforces"
provides:
  - "AllInParts {space, fee, total} and the widened AllInTable — three FINISHED figures per key, all computed inside the guarded server module"
  - "PriceBreakdown as a Client Component with a `surface?: \"rail\" | \"checkout\"` prop, one shared total class constant and two string-literal total hooks"
  - "`rail-price-total` declared in SELECTOR_CONTRACT and rendered; `sheet-price-total` deliberately deferred to 12-10"
  - "tests/design/price-surface.test.ts — the FIRST committed enforcement of the two D-42 grep tripwires, plus an AST zero-arithmetic scan and the D-40 hedge ban"
  - "A measured RSC payload cost for the widening (+1076 B) and the decision it settled"
affects: [12-05, 12-06, 12-09, 12-10, 12-11, 12-13, 12-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A widened server table that ships three finished figures per key instead of one, so a client can RENDER an itemised money surface without ever computing a figure"
    - "Two sibling JSX branches with string-literal `data-testid`s over one computed attribute — the shape a literal-only AST collector can actually see"
    - "One shared class constant consumed by both branches, so computed-style identity is structural rather than copy-paste"
    - "Copy tripwires encoded as two mid-word pieces joined at runtime, so the gate cannot trip on its own documentation"
    - "A taint-set AST walk for 'this module performs no arithmetic on X', where a regex would report the module's own contract paragraph as a breach"
    - "A watched-red probe for a build-level boundary check: break it on purpose, record the verbatim failure, revert"

key-files:
  created:
    - "tests/design/price-surface.test.ts"
  modified:
    - "src/lib/booking/all-in-table.ts"
    - "src/components/availability/availability-calendar.tsx"
    - "src/components/booking/price-breakdown.tsx"
    - "src/lib/design/selector-contract.ts"
    - "tests/booking/all-in-table.test.ts"

key-decisions:
  - "MEASURED, not guessed: the widening costs +1076 bytes of served HTML on a seeded listing (210383 -> 211459), and the allIn slice alone accounts for all of it (375 -> 1451). Under the plan's 4096-byte rule, so NAMED OBJECTS are kept over [space, fee, total] tuples"
  - "`fee` is subtracted on the SERVER (`allInCents - space`) inside the guarded module, not derived in the browser from space and total. A client that subtracts is a client that can be handed the wrong two numbers and asked to produce a plausible third"
  - "Case (5) of the pinned test had to CHANGE to stay unweakened: `expect(table.fullDay).not.toBe(table.hourly[24])` was integer inequality and became reference inequality over two fresh objects — green for every possible table. It compares `.total` on both sides now"
  - "The `server-only` boundary check was proven LIVE over the flipped file by a watched red, not inferred from a green build. A value import of service-fee.ts made `next build` exit 1 naming price-breakdown.tsx in the client graph"
  - "The C7 inventory carries a `toHaveLength(3)` assertion so the ban cannot quietly shrink to two when a copy change wants through"
  - "The self-probe (tripwires pointed at the test's own source) was run and REMOVED rather than made permanent: a permanent self-scan would make the file unable to document its own failure modes in its header"
  - "`src/app/listings/[id]/book/page.tsx` was NOT edited. `surface` defaults to \"checkout\", which is the whole point of the default"

patterns-established:
  - "A ban is always asserted beside a POSITIVE control that the thing it guards still exists — a file with no fee line satisfies the C1 ban perfectly"
  - "A phrase scan runs over raw text AND a whitespace-collapsed copy, because JSX prose wraps wherever the column limit falls and the rendered string is contiguous even when the source is not"
  - "Guard-the-guard assertions run FIRST and the vacuity probe is recorded showing which real assertions passed over nothing"

requirements-completed: []

# Metrics
duration: 30min
completed: 2026-08-18
---

# Phase 12 Plan 04: Seam B — One Component, Two Surfaces — Summary

**`AllInTable` now carries `{space, fee, total}` per key and `PriceBreakdown` is a Client Component with a `surface` prop, so the listing rail and checkout can render the same component rather than two things asserted to agree — and the grep tripwire that has guarded that component's copy since Phase 7 is finally a committed test instead of a bash line in a plan nobody re-runs.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-08-18T13:09Z (local +08)
- **Completed:** 2026-08-18T13:42Z (local +08)
- **Tasks:** 3
- **Files:** 5 modified, 1 created

## Task Commits

1. **Task 1: Widen the table, and measure what widening it costs** — `059bf8d` (feat)
2. **Task 2: Flip PriceBreakdown across the boundary and give it a surface** — `9e1c997` (refactor)
3. **Task 3: The price surface gate — the tripwire's first committed enforcement** — `0f901fd` (test)

## Accomplishments

- **The table is three finished figures per key, and all three are computed on the server.** `AllInParts {space, fee, total}` is built by ONE `parts()` helper from ONE `computeServiceFee(spaceCents)` call, with the rate argument still omitted so the table is produced by the same call checkout makes. `fee` is `allInCents − space`, subtracted inside the guarded module. `parts()` is deliberately **not exported**: the only supported way to obtain an `AllInParts` is to build the table, so there is no second entry point where a rate could be supplied differently.
- **`Est.` is gone (D-40), and the removal is argued rather than asserted.** The comment beside each summary now records why: the figure is exact by construction, so hedging it understated a guarantee the system actually makes and taught a booker to expect the number to move — D-75's failure mode restated as copy. Three stale doc lines that still called the figure an estimate were corrected in the same commit.
- **`PriceBreakdown` crossed the boundary and its header no longer describes a posture it does not have.** The sentence *"Pure display, no hooks → a Server Component"* is replaced by a section stating the reason (the rail's breakdown depends on the client-held selection; a Server Component cannot be imported by a Client Component) **and** what did not change (zero arithmetic, finished figures only, `service-fee.ts`'s `server-only` untouched, GATE-05 is about computation).
- **Two total hooks, two literals, one class constant.** The total row renders through two sibling branches — `rail-price-total` and `price-total` — both consuming `TOTAL_VALUE_CLASS`. Exactly one branch renders per surface, so "exactly one total hook per document" is structural, and 12-05's computed-style identity assertion is true by construction rather than by copy-paste.
- **The rail's trailing line is a strict PREFIX of the checkout line**, so both whole-source greps stay untripped. The second sentence is a claim about a payment that has not started on the listing page, so it is dropped rather than reworded — every alternative phrasing is new booker-facing copy on the exact surface the tripwires guard.
- **The D-42 tripwire is a test now.** `tests/design/price-surface.test.ts` (16 tests) commits both whole-source greps, an AST zero-arithmetic scan and the D-40 hedge ban, each with its own guard-the-guard and a both-directions self-test. Every forbidden phrase is stored in two mid-word pieces and joined at runtime.
- **`book/page.tsx` was not touched.** `surface` defaults to `"checkout"`, and `git diff --stat` on the call site is empty.

## The measured findings

### 1. The payload cost of widening, and the branch it decided

The plan's decision rule: **> 4096 B delta ⇒ ship tuples; at or under ⇒ keep named objects.**

Measured against `next dev`, served HTML of `/listings/uat_listing_bookable`, eight samples each side (the page has a ±60 B jitter from a per-render value; the modal figure is quoted and the delta is identical at both ends of the range):

| | served HTML bytes | the `allIn` JSON slice alone |
|---|---|---|
| before | **210383** | **375** |
| after | **211459** | **1451** |
| delta | **+1076** | **+1076** |

**The entire page delta is the table** — the two numbers agree exactly, which is the check that the measurement is measuring the right thing rather than page noise.

**Branch taken: NAMED OBJECTS.** 1076 B is 26% of the 4096 B threshold and 0.5% of the page. The readable shape wins and the cost is noise.

One honest caveat on the extrapolation: the measured listing has no `perHeadPriceCents`, so `perPass` is empty and the delta covers 24 hourly keys + `fullDay` = 25 values, ≈43 B each. A drop-in listing with a 12-pass cap would add ~516 B more, for ~1592 B — still well under the rule.

### 2. `next build`'s `server-only` check, proven live rather than assumed

The plan's acceptance criterion says to record the command output line and not infer it from "the build was green last time". A green build alone cannot distinguish "the boundary holds" from "the check is not looking at this file", so the check was **broken on purpose first**. A value import of `@/lib/payments/service-fee` added to the now-client `price-breakdown.tsx`:

```
> Build error occurred
Error: Turbopack build failed with 4 errors:
You're importing a module that depends on "server-only". This API is only available in
Server Components in the App Router, but you are using it in the Pages Router.
> 1 | import "server-only";
  Client Component Browser:
    ./src/lib/payments/fees.ts [Client Component Browser]
    ./src/lib/payments/service-fee.ts [Client Component Browser]
    ./src/components/booking/price-breakdown.tsx [Client Component Browser]
```

`next build` exit **1**, and the import chain names the flipped file. Reverted; the shipped build line, verbatim:

```
✓ Compiled successfully in 19.9s
```

with `npm run build` exit **0**, 40 design test files, 717 passed / 3 skipped, 0 lint errors (9 pre-existing warnings).

### 3. Case (5) of the pinned test was silently weakened BY the shape change, and had to be rewritten to stay honest

```ts
expect(table.fullDay).not.toBe(table.hourly[ALL_IN_TABLE_MAX_HOURS]);
```

Before D-38 this compared two integers and was a real assertion (a full day must not be priced as 24 hourly hours). After the widening it compares two **freshly-built objects**, so it is reference inequality — true for every possible table, including one that had started quoting the cheaper hourly run as the day rate. It reads `.total` on both sides now. This is the exact failure mode the plan meant by "neither may be weakened", and it arrived automatically rather than by anyone choosing it.

### 4. The tripwires did not exist

12-PATTERNS flagged this and it was re-measured: `grep -rn` over `tests/` found **no committed test** enforcing either whole-source grep on `price-breakdown.tsx`. Both lived only as `<verify>` bash lines inside Phase-7/11 PLAN files. The component's header has claimed the enforcement since Phase 7. `tests/design/price-surface.test.ts` is the first commit at which the claim is true.

Two deliberate design choices in that file worth carrying forward:

- **Assertions 1 and 2 do NOT strip comments; assertion 4 does.** The hazard a tripwire guards is not "the phrase renders", it is "the phrase EXISTS in the file" — because the moment it does, every future grep matches its own prohibition and the guard is dead. A comment is exactly where that arrives, and a comment-stripped scan would permit the disarming edit. The component's own header says so; the test now enforces it.
- **The phrase scan runs over raw text AND a whitespace-collapsed copy.** JSX prose wraps wherever the formatter's column limit falls, so a banned phrase can render contiguously while being split across two source lines. The collapsed pass reports the file rather than a line, which is the honest thing to say about a match found in a normalised copy.

## Watched reds (all run, all reverted, `git diff` clean after each)

| # | Probe | Mutation | Observed |
|---|---|---|---|
| A | `next build` boundary check | value import of `@/lib/payments/service-fee` in the client-flipped `price-breakdown.tsx` | exit 1, 4 Turbopack errors, chain naming `./src/components/booking/price-breakdown.tsx [Client Component Browser]` (full text above) |
| B | `price-surface` (2) | one C7 phrase added as a **comment** in `price-breakdown.tsx` | 1 failed / 15 passed — names file, line 21 and the REASON, without printing the phrase |
| C | `price-surface` (3) | `const t = spacePriceCents + serviceFeeCents;` in the component body | 1 failed / 15 passed — `` `spacePriceCents + serviceFeeCents` (operator +, touches spacePriceCents, serviceFeeCents) `` at line 187 |
| D | `price-surface` vacuity | `ROOT` re-pointed at `nowhere-at-all` | 6 failed / 10 passed — and **all three real absence assertions PASSED over files never opened**. The extra two failures are the positive controls (the fee label, the money props), which is the second reason every ban is written beside one |
| E | `price-surface` self-probe | this test file added to `PHRASE_SCAN_FILES` | 2 failed / 14 passed — only the membership guards reacted; **both tripwires passed over the test's own source**, proving the two-piece encoding holds |

Verbatim output for B–E is recorded in the test file's own header.

## Deviations from Plan

**None that changed scope.** Three notes where the plan's letter and its intent diverged, resolved in favour of intent and recorded rather than absorbed:

**1. `grep -rn "SERVICE_FEE_BPS\|computeServiceFee" src/components/` does not return nothing, and should not.**
It returns **10 lines, every one of them prose** in comments explaining why the symbol is absent — pre-existing, and true before this plan touched anything. The property the criterion is about was measured properly instead: a **comment-stripped** scan over all 117 files under `src/components/` returns **0 code hits**. The raw grep cannot distinguish a leak from its own documentation, which is the same measurement that made assertion 3 of the new gate an AST walk rather than a regex.

**2. `parts()` is not exported.** The plan named `AllInParts` as the exported artifact; the *builder* stays private on purpose, so there is no second call site where `computeServiceFee`'s rate argument could be passed differently. That is the D-75 guarantee the module header already claims.

**3. The self-probe was removed rather than kept.** The plan's acceptance criterion describes a one-off probe. A permanent self-scan is tempting and slightly stronger, but it would make the file unable to document its own failure modes in the header — which is the more valuable property here. Recorded in the file's NOT COVERED footer so the next reader knows it is a probe and not an oversight.

**Total deviations:** 0 auto-fixes. **Impact on scope:** none. No new dependency, no migration, no change to booking/payment/capacity/availability logic.

## Issues Encountered

- **`e2e/availability.spec.ts` case (2) flaked once and passed on every re-run.** First run after a fresh `next build`: `getByRole("button", { name: /not bookable yet/i })` timed out at 5 s. Re-run in isolation → pass (1.8 s); re-run of the whole file → **4 passed**. The affordance is in `listings/[id]/(detail)/page.tsx:673` and is untouched by this plan; `curl` of a not-payable listing returns it in the server-rendered HTML. Cold Turbopack route compile against a 5 s locator timeout — the recurring `next dev` gotcha, not a regression.
- **The pre-existing draft-404 red in `e2e/public-listing.spec.ts` is still red** and still logged in `deferred-items.md` from 12-02. Untouched here; the three D-59 cases were run with `--grep "D-59"` and are green.

## Threat register disposition

| Threat ID | Disposition | Where it landed |
|---|---|---|
| T-12-04-PRICECLIENT | mitigated | `fee = allInCents − space` computed inside the guarded module by the non-exported `parts()`; the client receives three finished figures. Enforced by `next build`'s boundary check (**watched red A**) and by the AST zero-arithmetic scan (**watched red C**) |
| T-12-04-FEELEAK | mitigated | Comment-stripped scan over 117 files under `src/components/`: **0 code hits** for `SERVICE_FEE_BPS` / `computeServiceFee`. The table remains a keyed lookup; neither the rate nor the formula reaches a client module |
| T-12-04-PARITYBLIND | mitigated | `rail-price-total` and `price-total`, each exactly one string literal in `src/`, each rendered by exactly one branch. `sheet-price-total` deliberately NOT declared — 12-10 renders it, and a declared row with no literal fails the contract's forward assertion |
| T-12-04-COPYDRIFT | mitigated | `tests/design/price-surface.test.ts` commits both whole-source tripwires, comments included; **watched red B** trips it with a phrase in a comment, which is the edit a comment-stripping scan would have waved through |
| T-12-04-ROUNDDRIFT | mitigated | New case (7): `space + fee === total` over **155 populated keys** across five rates incl. the .5 tie (30750 → 1537.5 → 1538), each figure also asserted equal to the guarded module's own `serviceFeeCents` / `allInCents`, with a populated-count guard-the-guard. Case (2) — "the multiply does not agree" — survives unweakened |
| T-12-04-SC | mitigated | `git diff --stat package.json` empty; nothing installed |

## Known Stubs

None. Every figure rendered on either surface is read from the server: the rail's three from `buildAllInTable` inside the RSC, checkout's three from the frozen booking row. `PriceBreakdown`'s `surface="rail"` branch is committed but has no call site yet — that is plan 12-05's Task, and the branch is not a stub because the hook it renders is declared, asserted and reachable by the contract gate today.

## Threat Flags

None. No new network endpoint, no auth path, no file-access pattern, no schema change. `drizzle/` is byte-identical at `0025_audit_resolved_by.sql` (26 `.sql` files) — GATE-06 held.

## Verification

| Check | Result |
|---|---|
| `npm run build` | **exit 0** — `✓ Compiled successfully in 19.9s`, 40 design files, 717 passed / 3 skipped, 0 lint errors (9 pre-existing warnings) |
| `npx tsc --noEmit` | **exit 0** |
| `npx vitest run tests/booking/all-in-table.test.ts` | **7 passed** (6 pre-existing + case 7) |
| `npx vitest run tests/booking` | **334 passed / 34 files** |
| `npx vitest run tests/booking tests/availability` | **505 passed / 53 files** |
| `npm run test:design` | **40 files** (was 39 — raised by exactly 1), **717 passed / 3 skipped** |
| `npx vitest run --config vitest.design.config.ts tests/design/price-surface.test.ts` | **16 passed** |
| `npx vitest run --config vitest.design.config.ts tests/design/selector-contract.test.ts` | **7 passed** (all six assertions + the collector self-test) |
| `npx playwright test e2e/price-parity.spec.ts --project=chromium` | **1 passed**, spec unmodified (`git diff --stat` empty), env surface still `DATABASE_URL` alone |
| `npx playwright test e2e/availability.spec.ts --project=chromium` | **4 passed** (one cold-compile flake on the first run, above) |
| `npx playwright test e2e/public-listing.spec.ts --project=chromium --grep "D-59"` | **3 passed** |
| `grep -n "Est\." src/components/availability/availability-calendar.tsx` | **nothing** |
| `grep -n "computeServiceFee(" src/lib/booking/all-in-table.ts` | one invocation, **one argument** (plus two docblock mentions) |
| comment-stripped `SERVICE_FEE_BPS`/`computeServiceFee` scan over `src/components/**` | **0 code hits** across 117 files |
| `data-testid="rail-price-total"` / `data-testid="price-total"` in `src/` | **exactly one each**, both string literals in JSX attributes |
| `sheet-price-total` declared in `SELECTOR_IDS` | **no** (appears only inside another row's `why` prose, in a `.ts` file the collector does not scan) |
| `vitest.design.config.ts` has `globalSetup` / `setupFiles` | **neither** |
| `ls drizzle/*.sql \| tail -1` | `drizzle/0025_audit_resolved_by.sql` (26 files) |
| `git diff --stat package.json` | empty |
| `git diff --stat src/app/listings/[id]/book/page.tsx` | empty — the call site needed no edit |

## Next Phase Readiness

- **12-05 (the rail renders the real breakdown)** — `AllInParts` is keyed by the selection the booker made, `PriceBreakdown` takes `surface="rail"`, and `TOTAL_VALUE_CLASS` is the single constant its computed-style identity assertion should be written against. The rail summaries were deliberately left otherwise unrestructured, exactly as the plan required, so that plan opens on the surface it was written against.
- **12-10 (the booking sheet)** — declare `sheet-price-total` **in the plan that renders it**, with a literal in the same commit. The forward assertion is why it is not declared here. Once the sheet exists, one document holds two breakdowns; that is the whole reason `rail-price-total` is its own hook.
- **12-11 / 12-06** — the `surface` prop selects exactly two things and must not grow to select a third without a decision to point at. The moment the two surfaces differ in a row, an order, a weight or a figure, BFLOW-04 stops being a property of the code.
- **Anyone editing `price-breakdown.tsx`'s copy** — the tripwires are real now and they scan comments. Encode a forbidden phrase in two pieces if you must refer to it; the four-row inventory in `tests/design/price-surface.test.ts` shows the idiom.

**No blockers.**

## Self-Check: PASSED

- Files: `12-04-SUMMARY.md`, `tests/design/price-surface.test.ts`, `src/lib/booking/all-in-table.ts`, `src/components/booking/price-breakdown.tsx`, `src/components/availability/availability-calendar.tsx`, `src/lib/design/selector-contract.ts`, `tests/booking/all-in-table.test.ts` — **7/7 FOUND**
- Commits: `059bf8d`, `9e1c997`, `0f901fd` — **3/3 FOUND**
- Artifact `contains` checks: `AllInParts` in `all-in-table.ts` ✓ · `use client` on line 1 of `price-breakdown.tsx` ✓ · `price-breakdown` referenced by `tests/design/price-surface.test.ts` ✓ · `allIn\.(hourly|fullDay|perPass)` linking `availability-calendar.tsx` → `all-in-table.ts` ✓

---
*Phase: 12-booker-path-search-listing-checkout*
*Completed: 2026-08-18*
