---
phase: 18-host-verification-listing-review-fitout-ops
plan: 04
subsystem: listing-visibility
tags: [hidden-until-approved, soft-404, open-graph, leak-surface, compiler-census, mutation-testing, design-gate]

# Dependency graph
requires:
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 02
    provides: "`listing.review_state` (listingReviewState pgEnum, default 'pending', notNull) and its derived TS union — the column this gate reads"
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 03
    provides: "search Stage-1 already filtering on the review term (D-228 — asserted here, not re-implemented), and `grandfathered | approved` as the two sellable values"
  - phase: 17.1-shipped-surface-audit
    plan: 01
    provides: "the measured soft-404 shape — draft / nonexistent / published read 404 / 404 / 200 under a production build — that D-229 reuses instead of inventing an error surface"
provides:
  - "`isPubliclyViewable(status, deletedAt, reviewState)` — ONE expression with a REQUIRED third positional parameter and THREE call sites (LVER-02, booker-facing half)"
  - "a pending / rejected / withdrawn listing 404s on `/listings/[id]` in the shipped soft-404 shape, indistinguishable from a draft and from a nonexistent id"
  - "`/listings/[id]/opengraph-image` renders NO card for an unreviewed listing — the third leak surface, closed (D-247)"
  - "`tests/design/og-routes.test.ts` § D-247 — the structural pin that the OG projection resolves its guard through the one expression and holds no copy of it"
  - "`tests/design/soft-404-status.test.ts` — the guard's ARGUMENT COUNT, which is what a defaulted third parameter would defeat"
affects: [18-05 ops decision actions, 18-06 material-edit re-review, 18-11 the badge, 18-13 host-facing review signals, 18-14 the production-build status-line audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "a required positional parameter as a compiler census — and the measured limit of it: `tsc` enumerates CALLERS, so a surface that RESTATES a rule instead of calling it is structurally invisible to the census"
    - "collapsing a restated rule into a call site, then pinning the collapse STRUCTURALLY (import binding + parsed CallExpression + argument count) because the behaviour it protects is unobservable in a browser"
    - "counting a source prohibition over comment-stripped text AND parsed string literals, never over raw source, when the correct file must name the thing it forbids"
    - "a mutation proof recorded with the reading that DISAGREES with the gate's name — the default alone is invisible; the two-argument call it enables is what reddens"

key-files:
  created: []
  modified:
    - src/lib/listing/public-listing.ts
    - src/lib/listing/og-facts.ts
    - src/app/listings/[id]/(detail)/page.tsx
    - src/app/listings/[id]/opengraph-image.tsx
    - tests/listing/status-gate.test.ts
    - tests/design/soft-404-status.test.ts
    - tests/design/og-routes.test.ts

key-decisions:
  - "The compiler census found TWO of the three surfaces. `og-facts.ts` held a COPY of the rule, not a call, so `tsc` could not see it — the transferable lesson of D-247."
  - "`assertPublicListing` stays SESSION-FREE; D-230 is satisfied on the host surfaces (18-13), never by teaching a not-found-adjacent layout about sessions."
  - "LVER-02 is NOT fully complete: its host-visibility clause is 18-13's. The checkbox stays open; the traceability row records which half landed."
  - "The plan's `grep -c \"getSession\\|headers()\" == 0` criterion was falsely RED against the correct file; the warning was reworded to describe the calls rather than spell them."

metrics:
  duration: ~23 min
  tasks: 2
  commits: 2
  completed: 2026-09-01
requirements: [LVER-02]
---

# Phase 18 Plan 04: Hidden Until Approved — The Three Leak Surfaces Summary

D-208's hidden-until-approved rule closed on all three surfaces an unreviewed listing could escape
through, including the Open Graph card route that neither D-228 nor D-229 had named and that the
compiler census was structurally incapable of finding.

## What Shipped

`isPubliclyViewable` took a **third required positional parameter** — `reviewState` — and its body
became `!deletedAt && status === "published" && (reviewState === "approved" || reviewState ===
"grandfathered")`. Positive literals only: a negative spelling would let `withdrawn`, and every value
added after it, through on the day it lands.

It now has **three call sites**, which is the whole point:

| # | Site | What it decides |
|---|------|-----------------|
| 1 | `assertPublicListing` → `(detail)/layout.tsx` | the HTTP **status** line, above the Suspense boundary |
| 2 | `(detail)/page.tsx:280` | the **body**, and keeps the status honest |
| 3 | `src/lib/listing/og-facts.ts:110` | the share **card** `/listings/[id]/opengraph-image` paints |

Site 3 is new. It previously held its own hand-written `status !== "published"` line, and
`opengraph-image.tsx` carried a comment asserting its fallback set was *"the same set the page 404s
on"* — true when written, false the instant the page's set grew a term. That comment is now true by
construction and says so in its own words.

`assertPublicListing`'s internal SELECT reads `review_state` and passes it through. It remains
session-free, and its header now says why that is load-bearing rather than incidental.

## The Three Surfaces, and Where Each Is Pinned

| Surface | Closed by | Pinned by |
|---------|-----------|-----------|
| search Stage-1 | 18-03, by construction (D-228) | `tests/search/bookable-gate.test.ts:272` — the `gate_lr_pending` fixture. **Asserted, not re-implemented**, exactly as the plan required. |
| `/listings/[id]` | the shipped soft-404 (D-229) | `tests/listing/status-gate.test.ts` behaviourally; `tests/design/soft-404-status.test.ts` structurally |
| `/listings/[id]/opengraph-image` | routing `listingCardFacts` through the one expression (D-247) | `tests/design/og-routes.test.ts` § D-247 |

## ⚠ The Finding: The Compiler Census Found Two of Three

**This is the item worth carrying forward, and it is a correction to the plan's own expectation.**

The plan's acceptance criterion says `tsc` "was RED first, at all three call sites … that red IS the
census." It was red at **two**:

```
src/app/listings/[id]/(detail)/page.tsx(272,16): error TS2554: Expected 3 arguments, but got 2.
src/lib/listing/public-listing.ts(143,16): error TS2554: Expected 3 arguments, but got 2.
```

`og-facts.ts` is absent from that list — not because it was already correct, but because **it was not
a call site at all.** It had written the rule out longhand. D-224's census mechanism, which this phase
leans on harder than on anything else, counts *callers*; a restated rule is invisible to it.

Had D-247 not found this by reading, 18-04 would have shipped with a green `tsc`, a green suite, a
404ing listing page, and a live Open Graph endpoint serving an unreviewed listing's **title, space
type, city and hourly rate** to every scraper, link scanner and chat-preview proxy that fetched it —
on a route that is never rendered in a browser, so nobody would have seen it.

**The question to re-ask on every future gate: who RESTATES this rule rather than calling it?** Grep
for the rule's *spelling*, not just for its name. The compiler cannot help with copies.

After this plan the surface is a real call site, so a fourth term would redden all three.

## Mutation Proofs

Both were watched, and both were restored with a control run confirming green afterwards.

**Mutation 1 — revert `og-facts.ts` to its inlined check.** `tests/design/og-routes.test.ts` went RED
on two independent assertions:

```
AssertionError: src/lib/listing/og-facts.ts contains no parsed call to isPubliclyViewable.
  Importing it is not using it…: expected 0 to be greater than or equal to 1

AssertionError: src/lib/listing/og-facts.ts names the status literal "published" in CODE…:
  expected [ 'published' ] to deeply equal []
```
Restored → 18/18 green.

**Mutation 2 — default the third parameter.** Recorded in **two readings**, because the first one
disagrees with what the gate's name implies:

- **2a, the default alone** (`reviewState: string | null | undefined = "approved"`, every call site
  untouched): `tsc` exits 0 and `tests/design/soft-404-status.test.ts` stays **GREEN — 12 passed.**
  The arity pin cannot see the default in isolation. Stated in the gate's own docblock rather than
  left as an overclaim.
- **2b, the default plus the two-argument call it enables** (`page.tsx` shortened): **`tsc` still
  exits 0** — that is the danger — and the gate goes RED:

```
AssertionError: src/app/listings/[id]/(detail)/page.tsx calls isPubliclyViewable with the wrong
  number of arguments at line(s) 282 (2). Expected 3: status, deletedAt and the ops REVIEW STATE
  (D-208)…: expected [ { line: 282, argCount: 2 } ] to deeply equal []
```
Restored → 12/12 green, `tsc` 0.

## Tests Added

`tests/listing/status-gate.test.ts` (+14 cases, integration, real DB):
- the review dimension derived from the pgEnum, so a sixth value reddens the coverage line:
  `pending` / `rejected` / `withdrawn` false, `approved` / `grandfathered` true
- **fails closed** on a `null` / `undefined` review state — the realistic defeat is a caller that
  forgot to select the column, and a `!== "pending"` spelling would pass both
- the three pre-phase-18 terms still hold with the review term satisfied (draft, unlisted, deleted)
- `assertPublicListing` reaches `notFound()` on pending / rejected / withdrawn, **returns** on
  approved / grandfathered (the positive control — without it an unconditionally-404ing assert passes
  every other case in the file), and a pending listing is observably **identical** to a draft and to a
  nonexistent id, compared as whole records rather than per-case `toThrow()`

`tests/design/soft-404-status.test.ts` (+2): the guard resolves through a parsed `CallExpression`
taking all three terms, with both-directions self-tests over three-arg, two-arg and comment fixtures.
The file's inline quotation of the page's guard was updated to the current three-argument form.

`tests/design/og-routes.test.ts` (+6): `og-facts.ts` imports **and** calls the shared expression with
three arguments; holds no independent status literal (counted over comment-stripped code **and**
parsed string literals — the module's header necessarily discusses the rule it must not restate); and
the OG route consumes the null by falling back to the generic card.

## What These Tests Deliberately Do Not Claim

**The HTTP status line.** Recorded in both design-gate headers, not silently assumed.
`soft-404-status.test.ts:31-39` already said it in its own words — the e2e spec is the only instrument
in this repo that can read a status line — and it binds harder on the OG half, because **no e2e spec
drives an OG route at all.** What ships here is: the guard is *called*, with all its terms, and
resolves through one expression. The production-build `curl` reading of the pending case is a one-time
audit and belongs to **plan 18-14**.

## Deviations from Plan

**1. [Rule 1 — falsely-red acceptance criterion] The session-free grep counted its own warning**
- **Found during:** Task 1
- **Issue:** The plan's criterion `grep -c "getSession\|headers()" src/lib/listing/public-listing.ts`
  must return 0. The header sentence explaining *why* those reads are forbidden necessarily named
  them, so the bare grep returned **2** against a correct file.
- **Fix:** Reworded the warning to *describe* the two call expressions ("no session lookup, no
  request-header read") rather than spell them, keeping the prohibition and its measured rationale
  intact. This is the exact trap `tests/helpers/source-text.ts` was written for — *"falsely red for
  prohibitions"* — and the same discipline was applied to both new design gates, which count over
  comment-stripped text or parsed AST nodes and never over raw source.
- **Files modified:** `src/lib/listing/public-listing.ts`
- **Commit:** `2c1b19a`

**2. [Rule 2 — plan expectation corrected] The census red was two sites, not three**
- **Found during:** Task 1
- **Issue:** The plan asserts the `tsc` red covered all three call sites. It covered two; `og-facts.ts`
  was not a call site until this plan made it one.
- **Fix:** Recorded honestly rather than fudged, in the commit message, in STATE.md and in the section
  above — the discrepancy is the single most valuable thing this plan learned.
- **Files modified:** none (documentation)
- **Commit:** `2c1b19a`

**3. [Rule 2 — requirement not over-claimed] LVER-02 left open**
- **Found during:** state update
- **Issue:** LVER-02 has three clauses. Two closed here; the third — *"the host still sees its own
  listing, its review status, and any rejection reason"* (D-230) — belongs to **18-13**.
- **Fix:** The requirement checkbox stays **unticked**; the traceability row records
  `Phase 18 · 18-04 (hidden-from-bookers half)`. This follows 18-03's own precedent with ENF-01.
- **Files modified:** `.planning/REQUIREMENTS.md`

No architectural changes were needed; no package was installed; no existing test or design gate was
weakened.

## Verification

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | **0** (RED first at two sites — see the finding above) |
| `npx vitest run tests/listing/status-gate.test.ts tests/listing/listing-public.test.ts` | 2 files / 37 passed |
| `npx vitest run --config vitest.design.config.ts tests/design/soft-404-status.test.ts tests/design/og-routes.test.ts` | 2 files / 30 passed |
| `npm test` — run **alone** | 195 files / **2291** passed / 5 skipped (baseline 2277; +14 is exactly this plan's) |
| `npm run test:design` — run **alone** | 72 files / **1304** passed / 3 skipped (baseline 1296; +8 is exactly this plan's) |
| `npx playwright test e2e/public-listing.spec.ts --project=chromium --workers=1` | **8/8**, including the anonymous-visitor positive control |
| `npx eslint` on all 7 touched files | clean |

The pre-existing `[test-db] LEAKED WRITES` block naming `notify` and `guest-email` appeared as
expected. The three pre-existing e2e reds (`cancel.spec.ts:232`, `calendar-hit-area.spec.ts` ×4,
`price-parity.spec.ts:287`) were **not** touched and **not** re-run — they remain diagnosed in
`deferred-items.md`.

**Seed safety, checked rather than assumed:** all three seed paths (`scripts/seed.ts`,
`scripts/seed-baseline-fixtures.ts`, `e2e/helpers/booker-seed.ts`) already write
`review_state='approved'` from 18-03, so no seeded listing began 404ing. The e2e run confirms it.

## Known Stubs

None. `listingCardFacts` returning `null` for a non-viewable listing is the specified behaviour, not
a placeholder — it routes the OG route to the generic card, which is the identical answer a
nonexistent id gets, so the card leaks no route-existence signal either.

## Carry Forward

- **LVER-02's host-visibility clause (D-230) is 18-13's.** ⚠ `assertPublicListing` **must stay
  session-free** — `src/app/not-found.tsx:29-45` records that making a not-found-adjacent path
  session-aware once cost the whole build its prerendering (zero static routes). Satisfy D-230 on the
  host surfaces, never by teaching this layout about sessions.
- **The OG surface was a research finding neither D-228 nor D-229 named.** Carry the question forward
  to any future surface that reads a listing: sitemaps, feeds, embeds, exports, notification payloads.
  Each is a candidate leak, and each will be invisible to the compiler if it restates the rule.
- **The status-line half of D-208 is unasserted per-commit** and is plan 18-14's `curl` audit.

## Self-Check: PASSED

All 7 modified files verified present on disk. Both commits verified in `git log`: `2c1b19a`
(feat, 4 files), `2394c41` (test, 3 files). No unexpected deletions in either commit.
