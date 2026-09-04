---
phase: 19-host-listing-surfaces-gates-that-actually-run
plan: 02
subsystem: testing
tags: [playwright, e2e, fixtures, layout-guards, watched-red, vacuity, hsurf-01]

# Dependency graph
requires:
  - phase: 19-host-listing-surfaces-gates-that-actually-run
    provides: "19-01's gate-e2e job, which collects e2e/*.spec.ts by project name — so this new spec runs in CI the moment it lands, with no workflow edit"
  - phase: 12-visual-baselines-product-surfaces
    provides: "e2e/helpers/booker-seed.ts's withClient open-write-close idiom and seedApprovedHostVerification"
provides:
  - "e2e/host-listing-grid.spec.ts — HSURF-01's two guards (footer flush to card bottom; footer scrollWidth within its own clientWidth) at 320x800, 700x900 and 1280x900"
  - "seedHostGridFixture in e2e/helpers/booker-seed.ts — one host, three cards of genuinely different content height, one of them PUBLISHED (the four-control footer guard B needs)"
  - "evidence/guards-pre-fix.txt — both guards WATCHED RED against the unfixed tree, with numbers, at named bands"
  - "evidence/{app-paths-manifest.19-33.json, app-path-routes-manifest.prod.json, dev-artifact-mtimes.txt, dev-types-routes.d.ts.halfwritten.txt} — 19-04 Task 1's archive, taken early because this plan had to boot a dev server"
  - "A MEASURED, first-ever fresh-process reproduction of the phase's phantom 404: every /host/* subroute 404'd against the surviving .next while /host itself served 307"
affects: [19-03, 19-04, 19-05, 19-07, testing]

actuals:
  tokens: 20000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A guard is WATCHED RED before it is trusted, and the red is recorded verbatim with its numbers — not a claim that it would fail"
    - "A fixture is a NAMED SET OF HEIGHT SOURCES, not 'some listings'. Each row in the fixture exists to make one specific assertion able to fail."
    - "Vacuity gates are HARD assertions; the geometry claims they protect are `expect.soft`. Passing vacuously must abort; reporting only half of what was measured must not."
    - "A new e2e guard lives in its OWN file when its subject differs in KIND from an existing scan's (element-level vs document-level), rather than becoming one anomalous row in a reviewed table"

key-files:
  created:
    - e2e/host-listing-grid.spec.ts
    - .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/guards-pre-fix.txt
    - .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/app-paths-manifest.19-33.json
    - .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/app-path-routes-manifest.prod.json
    - .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/dev-artifact-mtimes.txt
    - .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/dev-types-routes.d.ts.halfwritten.txt
    - .planning/phases/19-host-listing-surfaces-gates-that-actually-run/deferred-items.md
  modified:
    - e2e/helpers/booker-seed.ts

key-decisions:
  - "The describe is NOT `mode: \"serial\"`, and that reversal was FORCED BY A MEASUREMENT rather than argued: the first pre-fix run was serial, the 320px band's guard-B red skipped the sm and lg bands, and the run reported ONE of six measurements. An instrument whose first finding suppresses its remaining five cannot answer 'which bands did each guard fail at' — which is precisely the question this plan owes its summary."
  - "The geometry claims are `expect.soft` and the vacuity gates are not. Guard A clause 2 failing must not stop guard B being measured — they are independent defects and a fix to one does not touch the other. The vacuity gates stay hard because a measurement over an empty grid must abort, never continue and report soft passes."
  - "`updated_at` is set explicitly and descending on the three seeded rows. The grid orders by it and guard A measures the FIRST VISUAL ROW only, so at the sm band that row is the first two cards — the shortest and the tallest have to BE those two or the guard measures a row with no height variation in it."
  - "The published fixture row carries `review_state = 'approved'` rather than the column's `pending` DEFAULT, so it renders the hours notice ALONE. A pending listing would also render the review notice, adding a second variable to the card whose job is to be the tall one for ONE named reason."
  - "The `.next/dev` evidence 19-04 Task 1 specifies was archived by THIS plan, before any dev server boot. Task 3 boots one (Playwright's webServer), a fresh dev session rewrites `.next/dev/server/app-paths-manifest.json`, and 19-04 had not run — executing this plan as written would have destroyed another plan's subject."
  - "No causal claim is made about `rm -rf .next` and the 404, per D-11 and Pitfall 3. What is recorded is the observation and its two ends, not a mechanism."

requirements-completed: [HSURF-01]

coverage:
  - id: D1
    description: "A seed helper produces one host owning three listings whose CardContent heights genuinely differ, at least one PUBLISHED, with a teardown, and the file still holds no additional database client"
    requirement: "HSURF-01"
    verification:
      - kind: command
        ref: "npx tsc --noEmit → exit 0"
        status: pass
      - kind: command
        ref: "grep -c 'export async function' e2e/helpers/booker-seed.ts → 14 (was 13 at HEAD)"
        status: pass
      - kind: command
        ref: "node -e postgres( occurrence count → 4, unchanged from HEAD"
        status: pass
      - kind: command
        ref: "grep -c mintDraftListing e2e/helpers/booker-seed.ts → 0"
        status: pass
      - kind: command
        ref: "psql: SELECT count(*) FROM listing WHERE id LIKE 'e2e_grid_%' → 0, and count(*) FROM user WHERE email LIKE 'e2e.grid.%' → 0, after the guard run — the teardown removed exactly its own rows"
        status: pass
    human_judgment: false
  - id: D2
    description: "A new spec measures both HSURF-01 guards at three viewport bands, gated on a non-empty grid, with failure messages that name the mechanism and the file:line rather than a moved number"
    requirement: "HSURF-01"
    verification:
      - kind: command
        ref: "npx playwright test e2e/host-listing-grid.spec.ts --project=chromium --list → 3 tests, titles containing 320, 700, 1280"
        status: pass
      - kind: command
        ref: "grep -c 'data-slot=\"card-footer\"' → 4; grep -c getBoundingClientRect → 6; grep -c document.fonts.ready → 3; grep -cE '^\\s*import .*helpers/overflow' → 0"
        status: pass
      - kind: command
        ref: "git diff HEAD --stat -- e2e/overflow-320.spec.ts → no output (byte-unchanged); ls e2e/*.spec.ts | wc -l → 38"
        status: pass
    human_judgment: false
  - id: D3
    description: "Both guards proven capable of failing against the shipped defect, with concrete numbers, at named bands, on disk rather than in a claim"
    requirement: "HSURF-01"
    verification:
      - kind: command
        ref: "npx playwright test e2e/host-listing-grid.spec.ts --project=chromium → exit 1, 3 failed, 0 passed"
        status: pass
      - kind: command
        ref: "grep -c 'dead card BELOW its footer' evidence/guards-pre-fix.txt → 3"
        status: pass
      - kind: command
        ref: "grep -c 'overflows its own content box' evidence/guards-pre-fix.txt → 3"
        status: pass
    human_judgment: false
  - id: D4
    description: "The guards go GREEN after 19-03's call-site fix, and the green is over the same fixture and the same numbers"
    requirement: "HSURF-01"
    verification: []
    human_judgment: true
    rationale: "The fix does not exist yet — 19-03 owns it, and this plan deliberately shipped the instrument first. Nothing here can measure a change that has not been made."

# Metrics
duration: 20 min
completed: 2026-09-04
status: complete
---

# Phase 19 Plan 02: The HSURF-01 Instrument, Watched Red Summary

**A three-card host fixture with deliberately unequal content heights plus `e2e/host-listing-grid.spec.ts`'s two element-level guards at 320/700/1280 — both watched RED against the unfixed tree: 108.0px of dead card below a footer at the `sm` and `lg` bands, and a footer `scrollWidth` of 332 against a `clientWidth` of 288/322/315 at all three.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-04T09:26:51Z
- **Completed:** 2026-09-04T09:46:30Z
- **Tasks:** 3
- **Files created/modified:** 2 source (+5 evidence/doc)

## Accomplishments

- **The instrument exists before the fix, and it can fail.** All three of the obvious HSURF-01
  assertions were already green against the shipped defect (`19-VALIDATION`). This plan wrote the two
  that are not, and drove both red on the current tree — with numbers, at named bands, in a file on
  disk rather than in a sentence.
- **`seedHostGridFixture` makes guard A non-vacuous by construction.** Three cards, each a NAMED
  height source: a title-less draft (every fallback at once), a published listing with zero
  `operating_hours` rows (the two-line notice), and a draft whose title wraps at every band. Their
  `updated_at` values are set explicitly and descending, because guard A measures the first visual
  row only — so the shortest and tallest cards had to BE that row.
- **The published row is what makes guard B non-vacuous, and the measurement confirms it.** The lone
  offender at every band is `div.ml-auto flex gap-2` — the destructive pair, which only exists in
  four-control form on a published listing. A drafts-only fixture would have left guard B green.
- **Serial mode was caught by the very red it was supposed to report.** The first pre-fix run was
  `mode: "serial"`; the 320px guard-B red skipped the other two bands and the run reported one of six
  measurements. Removing serial and softening the geometry claims took the run from `1 failed, 2 did
  not run` to `3 failed`, with all six measurements visible.
- **19-04's `.next/dev` archive was taken early, because this plan would otherwise have destroyed
  it.** Task 3 boots a dev server; a fresh dev session rewrites
  `.next/dev/server/app-paths-manifest.json`, which is the primary subject of the phase's 404
  investigation and had not yet been archived.
- **A first-ever fresh-process reproduction of the phantom 404 was measured on the way past.** See
  "Incidental finding" below. It is handed to 19-05 as an observation, not a diagnosis.

## Task Commits

1. **Task 1 — the fixture** — `09bc30f` (`test`) — 202 insertions in `e2e/helpers/booker-seed.ts`
2. **Task 2 — the two guards at three bands** — `2157df8` (`test`) — 311 insertions, new file `e2e/host-listing-grid.spec.ts`
3. **Task 3 — watched red, plus the early evidence archive** — `3f95b17` (`test`) — 608 insertions, 6 deletions across 7 files

## The verbatim reds (required by the plan's `<output>`)

Source: `.planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/guards-pre-fix.txt`.
Playwright exited **1**; **3 failed, 0 passed**.

### Which bands each guard failed at — stated plainly, not generalised

| Band | Guard A clause 1 (equal bottoms) | Guard A clause 2 (footer flush) | Guard B (footer own-box overflow) |
|---|---|---|---|
| `320 × 800` | **skipped by design** (one column, nothing to compare) | **GREEN** — see below, this is expected and is NOT a fixed defect | **RED** — 332 vs 288 |
| `700 × 900` | green | **RED** — 108.0px on card 0 | **RED** — 332 vs 322 |
| `1280 × 900` | green | **RED** — 108.02px on card 0, 46.27px on card 2 | **RED** — 332 vs 315 |

**Guard A clause 2 is GREEN at 320px, and that is the predicted result rather than a gap.** In a
one-column grid every row holds a single item, the row's height IS that item's height, and `stretch`
has nothing to stretch — the footer is flush even on the broken tree. The spec's own docblock says so
before the run does. The bands that PROVE the defect are `sm` and `lg`, where a row holds two or three
items of different content height. Guard B is the mirror image: tightest at 320px, red everywhere.

### Guard A clause 2 — verbatim, at `700 × 900`

```
Error: 700x900: card 0 leaves 108.0px of dead card BELOW its footer (card bottom 654.5, footer bottom 546.5). THE FOOTER BAND IS FLOATING MID-CARD. `Card` is `flex flex-col` with `gap-0` at the call site (src/components/listing/listing-card.tsx:352) and NO child declares `flex-1`, so the children pack to the top and the height the grid stretched this card to lands as dead space under the tinted, top-bordered footer. `Card`'s base carries `has-data-[slot=card-footer]:pb-0` (src/components/ui/card.tsx:15), so ZERO is the designed gap and the 1px here is sub-pixel tolerance, not a budget — do not widen it. THE FIX IS `mt-auto` ON CardFooter (listing-card.tsx:434), or `flex-1` on the growing child — NOT `h-full` on `Card`, which is a MEASURED no-op because src/app/(host)/host/listings/page.tsx:180 sets no `align-items` and the grid already stretches its items (D-05).

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 1
Received:    108
```

### Guard A clause 2 — verbatim, at `1280 × 900` (two cards, two different gaps)

```
Error: 1280x900: card 0 leaves 108.0px of dead card BELOW its footer (card bottom 649.0, footer bottom 541.0). THE FOOTER BAND IS FLOATING MID-CARD. …

Expected: <= 1
Received:    108.015625
```

```
Error: 1280x900: card 2 leaves 46.3px of dead card BELOW its footer (card bottom 649.0, footer bottom 602.7). THE FOOTER BAND IS FLOATING MID-CARD. …

Expected: <= 1
Received:    46.265625
```

**The two different gaps at `lg` are the fixture proving itself.** Card 0 is the title-less draft
(shortest, so it loses the most to the stretch), card 2 is the long-title draft (taller, so it loses
less), and card 1 — the published listing with the two-line hours notice — is the TALLEST and
therefore reports **no** clause-2 failure at all: it is the card the other two are stretched to
match. Three cards, three different content heights, exactly as the fixture's docblock claims. Had
all three been the same height, every gap would have been zero and the guard would have been green on
the broken tree.

### Guard B — verbatim, at `320 × 800` (with the `scrollWidth`/`clientWidth` pair and the offenders list)

```
Error: 320x800: card 1's footer overflows its own content box — scrollWidth 332 against clientWidth 288. THE CONTROLS ARE CLIPPED, NOT SPILLED: `Card` carries `overflow-hidden` (src/components/ui/card.tsx:15) and `Button` carries `shrink-0` + `whitespace-nowrap` (src/components/ui/button.tsx:74), so the overrun is cut at the card's rounded edge and A DOCUMENT-LEVEL OVERFLOW SCAN REPORTS GREEN AGAINST THIS DEFECT — e2e/overflow-320.spec.ts's /host/listings row passes today with this shipped, which is why the assertion is made on the footer element ITSELF. Offenders: ["div.ml-auto flex gap-2"]. A published listing's footer holds FOUR controls where a draft holds three (`Unlist` is gated on status === 'published', listing-card.tsx:450). The fix is `flex-wrap` on CardFooter at the call site (listing-card.tsx:434) plus D-07's icon-only Delete — never a width on `Button`.

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 288
Received:    332
```

The same message at the other two bands, differing only in the numbers:

```
Error: 700x900: card 1's footer overflows its own content box — scrollWidth 332 against clientWidth 322. … Offenders: ["div.ml-auto flex gap-2"]. …
Expected: <= 322
Received:    332
```

```
Error: 1280x900: card 1's footer overflows its own content box — scrollWidth 332 against clientWidth 315. … Offenders: ["div.ml-auto flex gap-2"]. …
Expected: <= 315
Received:    332
```

**Three facts worth reading off these numbers.**

1. **`scrollWidth` is 332 at every band.** The footer's content is `whitespace-nowrap` + `shrink-0`,
   so the cluster's intrinsic width does not respond to the viewport at all — only `clientWidth`
   moves (288 → 322 → 315). The overrun is 44px, 10px and 17px respectively. **The `lg` band is
   tighter than `sm`**, which is what `19-RESEARCH § 2.1`'s arithmetic predicted and is easy to get
   backwards.
2. **Only card 1 — the PUBLISHED listing — fails guard B.** Cards 0 and 2 are drafts with three
   controls and they fit at every band. This is the fixture's published row doing the exact job the
   plan said it had to do; a drafts-only fixture would have reported guard B green against the
   shipped defect.
3. **The offender is `div.ml-auto flex gap-2`** at every band — the destructive `Unlist` + `Delete`
   pair, which is what D-07's icon-only `Delete` targets.

## The fixture's composition (required by the plan's `<output>`)

`seedHostGridFixture(page)` signs a host up through the form, gives it the D-255 approved
`host_verification` row, and writes three listings through `withClient`:

| Grid position | Row | `status` | `title` | Why it is this shape | Footer controls |
|---|---|---|---|---|---|
| card 0 (newest `updated_at`) | `untitledDraftId` | `draft` | **NULL** | Renders "Untitled listing", **no** space-type line (`primarySpaceType` is NULL), and "No pricing yet". Every fallback at once. **The shortest card.** | 3 |
| card 1 | `publishedNoHoursId` | **`published`** | `"Riverside Ring"` | **Zero `operating_hours` rows**, so `loadPublishedListingsMissingHours` reports it and the card renders the two-line hours notice. **The tallest card**, and the only one with FOUR footer controls. | **4** |
| card 2 (oldest) | `longTitleDraftId` | `draft` | 92-char title | Wraps to two-plus lines at every band. **Between the other two.** | 3 |

- No cover photo on any of the three, so all three render the "No photos yet" fallback. This is
  deliberate and is **not** a height source: `AspectRatio ratio={4/3}` pins the media band either way.
  Stated in the helper's docblock so nobody adds photos expecting a number to move.
- `review_state = 'approved'` on the published row, so it renders the hours notice alone rather than
  the hours notice plus a review notice.
- `teardown()` deletes the three listings by id (cascading photos, hours and tags) and then the host
  account (cascading `host_verification`). **Verified empty after the run:** `SELECT count(*) FROM
  listing WHERE id LIKE 'e2e_grid_%'` → `0`, and `SELECT count(*) FROM "user" WHERE email LIKE
  'e2e.grid.%'` → `0`.

## Spec-count bookkeeping

```
$ ls e2e/*.spec.ts | wc -l
38
```

**38**, exactly what the plan predicted for wave 2 (37 → 38). Phase 19 ends at **39**; `19-06` adds
`host-route-reachability.spec.ts`. The new file joins the `chromium` project automatically via
`playwright.config.ts`'s `testMatch: "e2e/*.spec.ts"`, so **19-01's `gate-e2e` collects it with no
workflow change** — which was the whole reason `19-01` led this phase.

## Incidental finding — the phantom 404, reproduced on a FRESH process for the first time

**MEASURED, 2026-09-04, during Task 1's typecheck detour. Recorded here because `19-RESEARCH § 1.0`
states the failing process no longer existed and this class has cost real time twice already.**

A fresh `next dev` booted against the **surviving** `.next` from 2026-09-03 served:

| URL | Status |
|---|---|
| `/` | 200 |
| `/login` | 200 |
| `/host` | **307** (the layout's `redirect("/login")`, correct for an unauthenticated caller) |
| `/host/listings` | **404** |
| `/host/earnings` | **404** |
| `/host/payouts` | **404** |
| `/host/listings/new` | **404** |

**Every `/host/*` SUBROUTE 404'd while `/host` itself redirected correctly** — so the layout was not
running for the subroutes, i.e. the route was not matching. Note that
`.next/dev/server/app-paths-manifest.json` at that moment **did** contain
`"/(host)/host/listings/page"`, so a missing manifest entry is not a necessary condition for this
symptom. The response was a fully rendered 404 document, not an error page.

After `rm -rf .next` and a restart, the same four URLs served `200 / 307 / 307 / 307`.

⚠ **NO CAUSAL CLAIM IS MADE, per D-11 and `19-RESEARCH` Pitfall 3.** "Clearing `.next` fixed it" is
exactly the sentence the phase forbids: the two observations are from two different processes and
more than one thing changed between them. What is recorded is the observation and its two ends.

**What this is worth to 19-05, stated as questions rather than answers:**

- The class **reproduces on a fresh process**, which `19-RESEARCH § 1.0` had concluded was no longer
  observable. That materially changes what its probe protocol can hope to close.
- It affects **every `/host/*` subroute**, not only `listings/[id]/edit`. The originally-reported
  route may be one instance of a wider symptom.
- **A present manifest entry did not prevent the 404**, which weakens the manifest-centred framing of
  UNPROVEN item (c).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing critical] `mode: "serial"` made the instrument unable to report five of its six measurements**

- **Found during:** Task 3, the first pre-fix run.
- **Issue:** The spec was written serial so the three bands could share one navigation. Playwright's
  serial mode **skips every subsequent test once one fails**. The 320px band's guard-B red therefore
  produced `1 failed, 2 did not run` — guard A clause 2 was never measured at any band, and the
  evidence file contained none of its message. A plan whose deliverable is "which bands did each
  guard fail at" cannot be served by an instrument that stops at the first answer.
- **Fix:** Dropped `mode: "serial"`; the page and fixture are built in `beforeAll`, which is
  per-WORKER, so both distributions are correct — one worker means one sign-up, one seed and one
  navigation as intended, and a split means each worker builds its own independent fixture. Also made
  the three geometry claims `expect.soft` (vacuity gates stay HARD) so a band reports guard A **and**
  guard B rather than stopping at the first. The reasoning is written into the file header.
- **Files modified:** `e2e/host-listing-grid.spec.ts`
- **Verification:** the re-run reported `3 failed`, with all six measurements present:
  `grep -c "dead card BELOW its footer"` → **3**, `grep -c "overflows its own content box"` → **3**.
- **Commit:** `3f95b17`

**2. [Rule 3 — Blocking] `npx tsc --noEmit` failed on a half-written generated file, and repairing it required booting a dev server, which would have destroyed 19-04's unarchived subject**

- **Found during:** Task 1's `<verify>`.
- **Issue:** Two problems, chained. (a) `npx tsc --noEmit` exited **2** with three errors in
  `.next/dev/types/routes.d.ts` — a truncated-and-duplicated generated file dated `Sep 3 18:09`, the
  recorded phantom-`tsc`-error gotcha, and pre-existing (the plan touched only `e2e/`). Deleting it
  alone moved the error to `.next/dev/types/validator.ts`, which imports it. The only repair is to
  regenerate it, which means running a dev server. (b) **Task 3 boots a dev server regardless**
  (Playwright's `webServer`), and a fresh dev session **rewrites
  `.next/dev/server/app-paths-manifest.json`** — the primary artifact of the phase's 404
  investigation, which `19-04` Task 1 is supposed to archive and `19-05` Task 2's precondition asserts
  is archived before `rm -rf .next`. **19-04 had not run.** Executing this plan as written would have
  destroyed another plan's subject silently.
- **Fix:** Ran 19-04 Task 1's archive **verbatim, early** — `evidence/app-paths-manifest.19-33.json`,
  `evidence/app-path-routes-manifest.prod.json`, `evidence/dev-artifact-mtimes.txt` — plus a fourth
  artifact 19-04 does not list, `evidence/dev-types-routes.d.ts.halfwritten.txt`, the malformed file
  itself. Only then regenerated the types.
- **Files modified:** none in source; four files added under `evidence/`.
- **Verification:** `npx tsc --noEmit` → exit **0**. `19-04` Task 1's own acceptance criteria pass
  against the archive as taken: `app-paths-manifest.19-33.json` parses with 16 keys, `grep -c
  'listings/\[id\]/edit'` → **0** in it and **1** in `app-path-routes-manifest.prod.json`,
  `dev-artifact-mtimes.txt` carries full-ISO timestamps for both trees.
- **Commit:** `3f95b17`
- **⚠ Carry-forward for 19-04:** its Task 1 is now **already satisfied on disk**. It should VERIFY the
  archive rather than re-take it — re-running the copy today would overwrite the preserved
  `Sep 3 19:33` manifest with the one this plan's dev sessions produced. Its Task 2 (the orphan-draft
  record) is untouched and still owed.

**3. [Rule 3 — Blocking] Every `/host/*` subroute 404'd, so the guards had nothing to measure**

- **Found during:** Task 1's typecheck detour, before Task 3.
- **Issue:** A dev server booted against the surviving `.next` served 404 on `/host/listings` and
  every other `/host/*` subroute. Both guards navigate to `/host/listings`; against a 404 document
  they would have reported the vacuity gate rather than the defect.
- **Fix:** D-09's clear (`rm -rf .next`) and a restart — which the plan's own phase authorises and
  which was safe **only because deviation 2's archive had already been taken**. The full observation
  is written up under "Incidental finding" above, **without** a causal claim.
- **Files modified:** none (runtime state only; `.next/` is not in git).
- **Verification:** post-clear probe served `200 / 307 / 307 / 307`; Task 3's run reached the grid and
  measured real geometry at all three bands.
- **Commit:** `3f95b17` (the finding; no source change was needed)

### Deferred (NOT fixed — SCOPE BOUNDARY)

**D1 — hydration mismatch in the site nav's `NavDrawer` during e2e sign-up.** Logged to
`.planning/phases/19-host-listing-surfaces-gates-that-actually-run/deferred-items.md` with the
verbatim trace. Pre-existing and unrelated: this plan changed no component, route or server code, and
the trace names `site-nav` / `NavDrawer` / `ResponsiveDialog`. It does not affect the measurement —
the grid is server-rendered and both guards read geometry after the `<h1>` is visible, and guard B
reported the identical `scrollWidth` of 332 at all three bands.

---

**Total deviations:** 3 auto-fixed (1 missing-critical, 2 blocking) + 1 deferred.
**Impact:** No weakening of any guard and no widened tolerance. Two of the three deviations made the
instrument STRICTER (all six measurements reported instead of one) or SAFER (another plan's evidence
preserved instead of destroyed). `FLUSH_TOLERANCE_PX` is still 1 and guard B still has no tolerance
at all.

## Issues Encountered

- **The pre-fix run was executed twice**, once serial (`1 failed, 2 did not run`) and once after the
  deviation-1 fix (`3 failed`). Only the second is on disk as `evidence/guards-pre-fix.txt`; the
  first is quoted in this summary's deviation record. Both were against the same unfixed tree.
- **The three tests were distributed across three workers**, so three fixtures were seeded and torn
  down rather than one. This is the documented non-serial trade-off, it is correct (unique emails,
  unique listing ids, per-worker teardown), and the post-run row counts confirm nothing was left
  behind. On a single-worker runner it collapses back to one sign-up and one navigation.

## Threat Flags

None. This plan introduces no network endpoint, no auth path and no schema change. `T-19-SC` is not
engaged — **zero packages installed**; `git diff --name-only 09bc30f~1..HEAD -- package.json
package-lock.json drizzle/` reports 0 files. `T-19-06` (fixture rows) and `T-19-07` (connection pool)
are mitigated as specified: the helper uses the file's `withClient` open-write-close idiom, opens no
additional long-lived client (`postgres(` occurrence count unchanged at 4), and its teardown was
verified to remove exactly its own rows.

## Known Stubs

None. Both source files are complete as specified. `FLUSH_TOLERANCE_PX = 1` is a documented sub-pixel
tolerance with the reason at the site (`Card`'s `has-data-[slot=card-footer]:pb-0` makes zero the
designed gap), not a placeholder.

## User Setup Required

None.

## Next Phase Readiness

**Ready for 19-03** — the call-site fix now has an instrument that has been seen failing, with the
numbers it must move.

Carry-forward for whoever picks this up:

- **19-03's target numbers are in this summary.** After the fix, guard A clause 2 must report ≤ 1px
  where it reported 108.0 / 108.02 / 46.27, and guard B must report `scrollWidth` ≤ `clientWidth`
  where it reported 332 against 288 / 322 / 315. Re-run against the SAME fixture.
- **Do not widen `FLUSH_TOLERANCE_PX`.** Zero is the designed gap — it is a class that was asserted
  (`ui/card.tsx:15`), not a tolerance anyone chose.
- **Do not restore `mode: "serial"`** on `host-listing-grid.spec.ts`. It cost five of six
  measurements once already, and the file header records why.
- **Guard A clause 2 is expected to be GREEN at 320px** both before and after the fix. A green there
  is not evidence of anything; the bands that carry the claim are `sm` and `lg`.
- **19-04 Task 1's archive is already on disk** (deviation 2). Verify it; do not re-take it.
- **19-05 should read "Incidental finding" before writing its probe protocol.** The class reproduces
  on a fresh process, it affects every `/host/*` subroute rather than one, and a present manifest
  entry did not prevent it.
- **Spec count is 38 now, 39 at phase end.** Record it in every summary that touches it.

## Self-Check: PASSED

Files claimed, verified present on disk:

- `FOUND: e2e/helpers/booker-seed.ts`
- `FOUND: e2e/host-listing-grid.spec.ts`
- `FOUND: .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/guards-pre-fix.txt`
- `FOUND: .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/app-paths-manifest.19-33.json`
- `FOUND: .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/app-path-routes-manifest.prod.json`
- `FOUND: .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/dev-artifact-mtimes.txt`
- `FOUND: .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/dev-types-routes.d.ts.halfwritten.txt`
- `FOUND: .planning/phases/19-host-listing-surfaces-gates-that-actually-run/deferred-items.md`

Commits claimed, verified present in `git log --oneline --all`:

- `FOUND: 09bc30f` (Task 1)
- `FOUND: 2157df8` (Task 2)
- `FOUND: 3f95b17` (Task 3)

Plan-level `<verification>` re-run at close-out:

1. `npx tsc --noEmit` → exit **0** — PASS
2. `ls e2e/*.spec.ts | wc -l` → **38** — PASS
3. `git diff HEAD --stat -- e2e/overflow-320.spec.ts` → no output (byte-unchanged) — PASS
4. `evidence/guards-pre-fix.txt` contains both failure messages with numbers (`grep -c` → 3 and 3) — PASS

Plan `<success_criteria>`:

- Fixture produces genuine height variation and includes a published listing — PASS (three distinct
  clause-2 outcomes at `lg`: 108.02px, no failure, 46.27px)
- Both guards exist, at three bands, in a new file — PASS (`--list` → 3 tests titled 320 / 700 / 1280)
- Both guards watched red, messages recorded verbatim — PASS (above)
- `e2e/overflow-320.spec.ts` byte-unchanged — PASS

---
*Phase: 19-host-listing-surfaces-gates-that-actually-run*
*Completed: 2026-09-04*
