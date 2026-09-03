---
phase: 13-confirmation-bookings-trust
plan: 08
subsystem: ui
tags: [design-system, group-bookings, patterns, state-08, live-regions, rendered-assertions, type-roles, scope-discipline]

# Dependency graph
requires:
  - phase: 11-design-system-foundation
    provides: "PanelCard / RowCard / PageHeader — the three declared containers plus the title block; `data-slot=\"card\"` on the vendored primitive, which is what makes a RENDERED container assertion possible at all; and `empty-state-adoption.test.ts`'s already-recorded refusal of the shared shell for the invite route (T-11-ORACLE)"
  - phase: 08-group-bookings
    provides: "every surface this plan restyled — the organizer page, the roster, the share box, the meter, the nudge, the invite route and its three components"
  - phase: 13-confirmation-bookings-trust
    plan: 02
    provides: "BookingReference (TRUST-02's copyable FIT- string, mounted here for the first time on the group page) and the bare-wrapper-around-PanelCard shape both STATE-08 alerts use"
  - phase: 13-confirmation-bookings-trust
    plan: 05
    provides: "the two STATE-08 alerts, asserted AT THE COMPONENT — and the named deferral this plan discharges: verify the slot on the assembled page"
  - phase: 13-confirmation-bookings-trust
    plan: 06
    provides: "cancel-page-shell.test.tsx — the page→pattern (AST) → attribute (DOM) → contract (union) chain, and the measured argument for NOT extending `CARD_SURFACES` from a later phase"
  - phase: 13-confirmation-bookings-trust
    plan: 07
    provides: "the finding this plan's central test is built on — a source scan cannot see a token that arrives via an import, so a visual contract must be asserted over the rendered tree"
provides:
  - "`/bookings/[id]/group` composed entirely from the declared pattern layer — PageHeader + four PanelCards + three RowCards, with zero `@/components/ui/card` imports in either branch"
  - "`<BookingReference/>`'s FIRST mount on the group page (TRUST-02), server-computed and handed down finished"
  - "tests/group/group-surface-shell.test.tsx — the container clause asserted over the RENDERED tree via `data-slot=\"card\"`, which is the ONLY gate that can see a raw Card inside an imported component"
  - "the STATE-08 alert slot verified ON THE ASSEMBLED PAGE for both outcomes, including the page-scale silence a per-component suite cannot express"
  - "the invite surface on the named type roles, with its no-index metadata, its 404 byte-parity and its DB-free OG route measured intact"
  - "two named accessible names where `role=\"status\"` computed `\"\"`, and two live regions removed from static content"
affects: [13-09, 13-10, 13-12, 13-13, 13-14, 13-15, 13-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A RENDERED container gate: query `[data-slot=\"card\"]` over an assembled tree and require every hit to carry a declared pattern `data-testid`. Sees inside imported components, which every AST card gate in this repo is blind to"
    - "An assembled-page fixture held honest from the other side — the fixture mirrors the page's tree, and an AST assertion over the page's own source fails if the page stops rendering what the fixture renders"
    - "`PanelCard tone=\"muted\"` as the replacement for `ui/alert` on a STATIC advisory, which removes a hardcoded `role=\"alert\"` without inventing a shape"

key-files:
  created:
    - "tests/group/group-surface-shell.test.tsx"
  modified:
    - "src/app/(app)/bookings/[id]/group/page.tsx"
    - "src/app/(public)/invite/[token]/page.tsx"
    - "src/components/group/attendee-roster.tsx"
    - "src/components/group/headcount-meter.tsx"
    - "src/components/group/share-link-box.tsx"
    - "src/components/group/top-up-nudge.tsx"
    - "src/components/group/invite-card.tsx"
    - "src/components/group/rsvp-form.tsx"
    - "src/components/group/rsvp-confirmation.tsx"
    - ".planning/phases/13-confirmation-bookings-trust/deferred-items.md"

key-decisions:
  - "`tests/design/card-pattern-coverage.test.ts` was NOT modified — and the reason is a MEASUREMENT rather than 13-06's argument repeated: with a raw `<Card>` put back into `attendee-roster.tsx` that whole gate stayed 11/11 GREEN, because both this plan's files sit on `ALLOWED_RAW_CARD`. Adding `CARD_SURFACES` rows would falsify that inventory's stated derivation; the coverage the rows were standing in for is now supplied by a rendered gate that is strictly stronger"
  - "The top-up nudge left `ui/alert` for `PanelCard tone=\"muted\"`, which removes a hardcoded `role=\"alert\"` from content that is static on every fresh navigation. Copy byte-identical; the decorative icon dropped so the surface's three advisories are one shape"
  - "`ErrorState` was REFUSED on the group page's load-failure branch on two independent grounds — it paints its glyph with the alarm token 13-UI-SPEC bans on this phase's surfaces, and its `onRetry` is a function prop a Server Component cannot supply"
  - "The four named type roles landed on HEADINGS only. Measured reason: `globals.css` re-declares Tailwind's own ladder (`--text-xs` … `--text-2xl`) PER THEME, so `text-sm` is not frozen — the stylesheet says in as many words that this is 'why DS-02 is not a 400-site migration'"
  - "The `full` and `closed` alerts in `rsvp-form.tsx` were deliberately left alone: neither is one of the two regions 13-UI-SPEC names here, both are server-decided and present on the first paint, and `live-regions.ts` assigns this file's audit to plan 13-14"

patterns-established:
  - "Restoring a probe with `git checkout -- <file>` discards the plan's own UNCOMMITTED work in that file. Probes must be restored from a saved copy — 13-02's summary says 'restored via the saved copy' and this plan learned why the hard way"
  - "A gate whose green is guaranteed by its own allow-list is not coverage. `ALLOWED_RAW_CARD` exempts a file forever, in both directions, and a plan that adopts a pattern on a listed file must supply the replacement coverage or the surface silently leaves every gate"

requirements-completed: []  # NONE. See "Requirements: deliberately NOT marked complete" below.

# Metrics
duration: 35min
completed: 2026-08-20
---

# Phase 13 Plan 08: The Group Surfaces — Design-System Pass Summary

**Both group surfaces now compose only the declared pattern layer and the invite route's three security properties were measured intact after the restyle — and the plan's central test exists because a raw `<Card>` was put back into the roster and the repository's card-coverage gate stayed green on all eleven assertions.**

## Performance

- **Duration:** ~35m
- **Started:** 2026-08-20T09:17Z (17:17 +0800)
- **Completed:** 2026-08-20T09:52Z (17:52 +0800)
- **Tasks:** 2 / 2
- **Files:** 1 created, 9 modified (+ `deferred-items.md`)

## Accomplishments

- **`/bookings/[id]/group` is composed entirely from the pattern layer.** `PageHeader` for the title block; `PanelCard` for the headcount meter, the share box, the roster and the top-up nudge; `RowCard` for all three roster rows; and `PanelCard` for the load-failure branch too. `grep -c 'from "@/components/ui/card"'` returns **0** on the page and **0** on the roster.
- **`<BookingReference/>` has its first mount** (13-02 shipped it with no call site by design). The value is `bookingReference(bk.id)`, computed in the RSC and passed as a finished string — so the organizer quotes the same `FIT-` characters the booker reads on `/bookings/[id]`, and the SHA-256 deriver never crosses into the bundle.
- **13-05's deferral is discharged, and at page scale.** The STATE-08 slot is verified on the ASSEMBLED body for both outcomes — the rotation (a changed prop) and the removal (through the real confirm dialog) — each asserted as *exactly one* named `role="status"` region **counted across the whole surface**, containing the locked sentence, inside a `tone="muted"` panel, and positioned **above** the thing it describes (`compareDocumentPosition`). Plus the fact no per-component suite can express: **a freshly navigated page opens zero regions of any kind**.
- **A defect was found and fixed by the pass itself.** `TopUpNudge` rendered `ui/alert`, which hardcodes `role="alert"` — so an ordinary static advisory **announced itself assertively on every navigation**. It is now `PanelCard tone="muted"`, copy byte-identical. The same shape was removed from `InviteInactive`, whose two static sentences were wrapped in `role="status" aria-live="polite"` on a surface where nothing ever changes.
- **The invite route's three security properties were MEASURED, not assumed.** Both inactive entrances render **1613 identical bytes** after the restyle; the metadata greps return 2 and 3; `opengraph-image.tsx` and `not-found.tsx` were never opened.
- **Zero capability added.** No new filter, no new roster action, no new invite mechanism, no new RSVP option, no attendee name anywhere new. The owner-scoped SQL, `getHeadcount`, `getOwnedGroupByBooking`, `getRoster`, the D-113 arithmetic and the RSVP state machine are provably untouched.
- **Zero packages. Zero migrations. Zero new `ALLOWED_RAW_CARD` rows. Zero `CARD_SURFACES` rows. Zero `selector-contract.ts` rows.** `drizzle/` still ends at `0025_audit_resolved_by.sql`.
- **10 files changed, not the plan's 11** — the plan-checker flagged this plan at the 10-file soft threshold and it came in one under, because the design gate turned out not to need editing (see the recorded judgement).

## Task Commits

1. **Task 1: The group page — patterns, targets, and the reference** — `e133ed8` (feat)
2. **Task 2: The invite route — restyle without touching its security properties** — `451f371` (feat)

## Files Created/Modified

- `tests/group/group-surface-shell.test.tsx` — **new**, 10 cases. Three layers: guard-the-guard (the parse read a real page, the render produced ≥ 7 boxes with a 4-panel/3-row breakdown), an AST half over the page's own source, and a DOM half over an assembled fixture. Plus the STATE-08 block.
- `src/app/(app)/bookings/[id]/group/page.tsx` — `PageHeader`, `PanelCard` on both branches, `BookingReference`, `size="touch"` on the back link. **Not one non-comment changed line touches a read or a SQL construct.**
- `src/components/group/attendee-roster.tsx` — `PanelCard title="Who's coming"` + `RowCard` per row; the list is `space-y-3` (a `divide-y` rule between two ringed boxes draws a line through the gap). The remove control moved from beside the badge into `RowCard`'s `actions` slot — the pattern's geometry, not a preference.
- `src/components/group/headcount-meter.tsx` — wrapped in `PanelCard` (`tone="default"`, deliberately: the focal point must not be dressed as an aside). `sm:text-display` still appears **exactly once**, which is what `type-scale.test.ts`'s `DISPLAY_INVENTORY` pins for this file.
- `src/components/group/share-link-box.tsx` — the box is a `PanelCard`; the rotation alert stays OUTSIDE it; `Copy link` moved from a hand-rolled `h-11` to the named `size="touch"` (WR-01).
- `src/components/group/top-up-nudge.tsx` — `ui/alert` → `PanelCard tone="muted"`; `role="alert"` gone.
- `src/components/group/invite-card.tsx` — `InviteInactive`'s static wrapper is a plain `div`; its `<h1>` is `text-heading`.
- `src/app/(public)/invite/[token]/page.tsx` — `<h1>` → `text-heading`, event `<dl>` → `text-body`. `generateMetadata` untouched.
- `src/components/group/rsvp-confirmation.tsx` — `aria-label="RSVP recorded"` on the result region.
- `src/components/group/rsvp-form.tsx` — `aria-label="RSVP not saved"` on the refusal region; `Log in instead` → `size="touch"`.

## Verification

Every acceptance criterion was run and its output observed. **The two vitest configs were never run concurrently** (13-01's operational finding, still holding).

**Task 1**

| Criterion | Result |
|---|---|
| `grep -c 'from "@/components/ui/card"'` on the group page | **0** (and `0` on `attendee-roster.tsx` too) |
| `npx vitest run --config vitest.design.config.ts tests/design/card-pattern-coverage.test.ts` | **11 passed**; **zero** `CARD_SURFACES` rows added, **zero** `ALLOWED_RAW_CARD` rows added, `EXPECTED_SURFACES` still `12` — the file is byte-unchanged (see the recorded judgement, which is why) |
| `npx vitest run --config vitest.design.config.ts tests/design/sheet-absent.test.ts` | **passed** — no second overlay primitive fetched, `package.json` byte-unchanged |
| `git diff` on the group page, **comments stripped**, for `getHeadcount` / `getOwnedGroupByBooking` / `getRoster` / any SQL construct | **ZERO matching non-comment changed lines.** ⚠ The raw diff DOES match — on the header sentence naming what it did not change. Recorded as this phase's grep-versus-prose collision #9 (see *Deviations*) |
| `npx vitest run tests/group/` | **11 files, 102 passed** (was 10 / 92 — exactly this plan's suite) |
| `npx vitest run tests/group/group-surface-shell.test.tsx` | **10 passed** |
| `npm run build` | **exit 0** |
| `npx tsc --noEmit` / `npx eslint` on all six touched files | exit 0 / 0 errors |

**Task 2**

| Criterion | Result |
|---|---|
| `npx vitest run --config vitest.design.config.ts tests/design/invite-notfound-parity.test.ts` | **passed**; `git diff --stat` on it is **empty — zero lines changed** |
| `grep -c 'index: false'` / `grep -c 'no-referrer'` on the invite page | **2** / **3** (both ≥ 1) |
| `npx vitest run --config vitest.design.config.ts tests/design/og-routes.test.ts` | **passed**; `git diff --stat` on `opengraph-image.tsx` and `not-found.tsx` is **empty** |
| `grep -c 'aria-live="assertive"' src/components/group/*.tsx` | **0 on all eleven files** |
| `npx vitest run tests/group/` | **11 files, 102 passed** |
| `npm run build` | **exit 0** |
| **Rendered 404 parity** (this plan's own measurement — see below) | **1613 === 1613 bytes**, and the probe was watched failing at 1613 vs 1614 |

**Plan-level verification** — all diffs taken against the pre-plan HEAD `dedf2a4`.

| Gate | Result |
|---|---|
| `npm test` | **149 files passed / 1 skipped; 1393 passed / 4 skipped** — exit 0. (13-07 closed at 148 / 1383; **+1 file and +10 tests is exactly this plan's one suite**.) |
| `npm run test:design` | **44 files, 776 passed / 3 skipped** — **identical to 13-07's close.** No design pin moved, because no design file changed |
| `npm run build` | **exit 0**; no new lint warning on any group or invite file |
| `git diff --stat` on `drizzle/`, `package.json`, `package-lock.json`, `components.json` | **empty — zero changes to all four.** `ls drizzle/*.sql \| tail -1` → `drizzle/0025_audit_resolved_by.sql` (D-80 / GATE-06 intact) |
| `git diff --stat` on `tests/design/invite-notfound-parity.test.ts`, `tests/design/site-contacts.test.ts`, `tests/design/card-pattern-coverage.test.ts`, `src/lib/group/`, `src/lib/site.ts`, `src/lib/design/` | **empty — zero changes to every one** |
| This plan's whole diffstat | **10 files, +912 / −117** |

## The Watched Reds — verbatim

Five observations. Three are probes of the new suite, one is a sensitivity check on a one-off measurement, and one is the measurement itself.

### 1. THE FINDING OF THIS PLAN — a raw `<Card>` in the roster, and the card gate that did not care

`attendee-roster.tsx`'s `PanelCard` was reverted to the raw `<Card><CardContent className="space-y-4 p-4 sm:p-6">` it shipped before this plan. The new suite went red on exactly the two assertions that should care:

```
 ❯ tests/group/group-surface-shell.test.tsx (10 tests | 2 failed)
   × (1) parsed a real page and rendered a real tree
   × (3) every card box on the assembled page carries a declared pattern hook

AssertionError: a card box on `/bookings/[id]/group` is not one of the declared patterns. Unlike
the AST gate, this sees INSIDE the components the page renders — which is where every container on
this surface actually lives. …: expected [ Array(1) ] to deeply equal []

- []
+ [
+   "<Card class=\"group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm
+    text-card-foreground ring-1 ring-foreground/10 …\"> with data-testid=\"\"",
+ ]

AssertionError: expected 3 to be greater than or equal to 4     ← the panel count, 4 → 3
```

**Two things this proves, and the second is the point.** Case **(2) — the AST half — stayed GREEN**, because `page.tsx` still opened no `<Card>`: the offending container was one import away, exactly 13-07's finding in a new place. And then, with the probe still applied:

```
$ npx vitest run --config vitest.design.config.ts tests/design/card-pattern-coverage.test.ts
 Test Files  1 passed (1)
      Tests  11 passed (11)
```

**The repository's card-coverage gate — both directions, eleven assertions — is perfectly green over a tree with a hand-rolled container in it.** Two independent reasons: its forward half only asks about DECLARED surfaces and the roster is not one, and its inverse half `continue`s on any file in `ALLOWED_RAW_CARD` — where **both** of this plan's files are listed. That measurement is what decided the recorded judgement below, and it is now written into both files' headers so the next reader does not re-discover it.

### 2. The `role="alert"` restored on the top-up nudge (the pre-plan state)

`TopUpNudge` was reverted to `ui/alert`:

```
   × (1) parsed a real page and rendered a real tree
   × (8) a freshly navigated page opens NO region anywhere on the surface

AssertionError: the render produced 0 card boxes. `every box carries a hook` is satisfied perfectly
by a tree with no boxes in it … : expected 6 to be greater than or equal to 7

AssertionError: expected [ …(1) ] to have a length of +0 but got 1
   443|     const { container } = render(<GroupSurface />);
   444|     expect(screen.queryAllByRole("status")).toHaveLength(0);
   445|     expect(screen.queryAllByRole("alert")).toHaveLength(0);
```

Note the blast radius: the box count fell 7 → 6 **and** the page-scale silence broke, on one edit, in two different clauses. This is the defect the swap fixed, reproduced on demand.

### 3. The removal region's name, stripped

`aria-label={REMOVAL_REGION_NAME}` was deleted from `attendee-roster.tsx`'s alert wrapper and nothing else changed:

```
 FAIL  … > (10) a removal announces ONCE, in a named region, above the roster it describes
AssertionError: expected [] to have a length of 1 but got +0

   494|     expect(screen.queryAllByRole("status", { name: REMOVAL_REGION_NAME })).toHaveLength(1);
```

Only the NAME assertion moved — the count, the sentence, the panel tone and the ordering all stayed green in the same run, which is what shows the query runs the real `dom-accessibility-api` name computation rather than comparing an attribute string.

### 4 & 5. The 404 parity measurement, and its own sensitivity check

**`invite-notfound-parity.test.ts` asserts IMPORTS, by its own explicit design** — its header says so, and says the deliberate consequence is that changing a VALUE leaves it green. So its green is **not** evidence that a restyle preserved the rendered parity, and the plan's acceptance criterion (it passes, with a zero-line diff) is satisfied either way. A real measurement was supplied: a temporary suite rendered **both entrances** — `InviteInactive` with the two imported constants (which is literally the page's `!group.active` branch) and `not-found.tsx`'s default export — and compared `innerHTML`:

```
BYTES: 1613 1613
HAS role=status: false
HAS aria-live: false
H1: <h1 class="text-heading">
✓ page inactive branch === not-found boundary
```

And the comparison was watched failing, so it is not two renders of a tautology. `not-found.tsx` was temporarily given `INACTIVE_BODY + " "` — one trailing space, the smallest possible divergence:

```
BYTES: 1613 1614
AssertionError: expected '<main class="mx-auto w-full max-w-lg …' to be '<main class="mx-auto w-full max-w-lg …'
      Tests  1 failed (1)
```

Restored from a saved copy (`git diff --stat` on it empty), and **the temporary suite was deleted** — it is a measurement, not a gate: the property it measures is guaranteed structurally by there being one component with two call sites, and a permanent test of it would belong to whichever plan owns the live-region inventory rather than to a design pass.

## Deviations from Plan

### Auto-fixed

**1. [Rule 1 — Bug] `TopUpNudge` announced static page content assertively on every navigation**

- **Found during:** Task 1, while deciding what the design pass changes in a file the plan lists but does not name in its action.
- **Issue:** `ui/alert` hardcodes `role="alert"`, which is an ASSERTIVE region. The nudge is ordinary, server-decided, static page content — it is either present on the first paint or absent entirely, and it never changes while anyone is looking at it. Two shipped call sites on the same route (`rsvp-form.tsx`'s `full` and `closed` blocks) pass `role="status"` to `Alert` precisely to climb back down from that default; this one did not. A screen-reader user was interrupted by a paragraph that had not moved.
- **Fix:** `PanelCard tone="muted"` — DS-11's declared in-page advisory surface, which is what plan 13-05 put the two STATE-08 alerts on, so the surface's three advisories are now one shape. Copy is byte-identical; the decorative `aria-hidden` icon was dropped to match the other two. Asserted by case (8) and watched failing (Watched Red 2).
- **Commit:** `e133ed8`.

**2. [Rule 1 — Bug] `InviteInactive` wrapped two static sentences in a live region**

- **Found during:** Task 2, and it is what the plan's own instruction points at (*"the card's STATIC content is not wrapped in a region — a freshly navigated page is not a change"*).
- **Issue:** `role="status" aria-live="polite"` on content that both entrances render on the FIRST paint. A screen reader already reads a freshly navigated page from the top, so the region announced either nothing or the same sentences twice.
- **Fix:** a plain `div`. **The parity is unaffected structurally rather than luckily** — one component, two call sites, so both entrances lost the attribute in the same character. Measured: 1613 identical bytes (Watched Red 4).
- **Commit:** `451f371`.

**3. [Rule 3 — Blocking] The plan's own diff criterion is tripped by the comment explaining it**

- **Found during:** Task 1, running the acceptance criteria.
- **Issue:** The criterion is that `git diff` on the group page *"contains no changed line matching `getHeadcount`, `getOwnedGroupByBooking`, or any SQL string"*. D-79's whole point is that the reads are untouched, so the page's new header says so — **by naming them** — and the raw diff therefore matches on that sentence. This is the ninth instance of this phase's grep-versus-prose collision and the first where the collision is with a DIFF rather than with a file scan.
- **Fix:** the criterion is evaluated with **comments stripped** from the diff, which is the form that means what the criterion says. Result: **zero** matching non-comment changed lines. The prose was kept — gutting the explanation to satisfy a text match is the failure mode `booking-row.tsx:112` established the descriptive-naming idiom to avoid, and here the sentence's whole value is that it names what must not move.
- **Commit:** `e133ed8`.

**4. [Rule 3 — Blocking] `git checkout --` on a probe restore destroyed this plan's uncommitted work**

- **Found during:** Task 1, restoring Watched Red 1.
- **Issue:** The probe was applied to `attendee-roster.tsx` and restored with `git checkout -- src/components/group/attendee-roster.tsx`. That file also held **all four of this task's uncommitted edits**, and the checkout took them with the probe — the file went back to its pre-plan HEAD state. Nothing was lost permanently (every edit was re-applied from context and re-verified), but roughly ten minutes were.
- **Fix:** the four edits were redone, a saved copy was taken **before** the next two probes, and both were restored with `cp` from that copy. 13-02's summary already contained the correct idiom in one clause — *"Restored via the saved copy"* — and this plan is why that clause is worth reading as an instruction. It is recorded under `patterns-established`.
- **Commit:** `e133ed8`.

### Recorded judgements (plan instructions that were conditional, and the condition was false)

**A. `tests/design/card-pattern-coverage.test.ts` was NOT modified — and this time the judgement is a measurement.**

The plan says to *"re-measure `CARD_SURFACES` / `EXPECTED_SURFACES` and move them in the SAME commit as the adoption"*, adding **zero** `ALLOWED_RAW_CARD` rows, and warns about the trap that a listed file which is *deleted or moved* must lose its row. Neither of this plan's two listed files is deleted or moved. What was measured:

- **Adding rows was refused, following 13-06's precedent written one plan earlier for the identical situation** (`bookings/[id]/cancel/page.tsx` adopted `PanelCard` and got no row). That file's argument holds verbatim here: `CARD_SURFACES` is DEFINED as *"the twelve files the 11-UI-SPEC's three `Replaces` lists name"*, and its documented derivation is *"ResultCard 2 + RowCard 5 + PanelCard 5"* — a Phase-13 row makes that arithmetic false and requires moving three pinned numbers to record a surface the gate cannot usefully check.
- **Removing the two stale `ALLOWED_RAW_CARD` rows was considered and refused too**, again following 13-06, which left the cancel page's row in place with the note that *"that half only asserts the named file EXISTS … so a file that stops rendering a raw container does not redden it. ⚠ If this page is ever deleted or moved, that row must go in the same commit."* Two plans in one phase handling the same case two different ways is worse than either way.
- **What is NEW here is the measurement that makes both decisions safe**: with a raw `<Card>` restored into `attendee-roster.tsx`, the whole gate stayed **11/11 green** (Watched Red 1). So the rows are not merely stale — they are an active exemption, in both directions, for both of this plan's files. Leaving them is only defensible **because** `tests/group/group-surface-shell.test.tsx` now supplies strictly stronger coverage over the same surface, and both component headers plus that test's header now say so in as many words, including the consequence: delete that suite and both files are unguarded.

Net effect: `EXPECTED_SURFACES` stays `12`, `adopted` stays `10`, `refused` stays `2`, zero rows added, and the file's `git diff --stat` is empty.

**B. The two group confirm overlays were NOT converted to `ResponsiveDialog`.**

13-UI-SPEC's change table says *"any confirm overlay (remove attendee, regenerate link) is `ResponsiveDialog`"*, and Task 1's action repeats it. **Neither `remove-attendee-button.tsx` nor `regenerate-link-button.tsx` is in the plan's `<files>` list or its `files_modified` frontmatter** — the plan's own scope note says a file needing real logic changes is the signal a design pass has ended, and both files carry plan 13-05's STATE-08 outcome plumbing. The clause's falsifiable half is satisfied and was run: `sheet-absent.test.ts` green, no `sheet` block fetched, `package.json` byte-unchanged, exactly ONE overlay mechanism in the app — and `ResponsiveDialog` composes the very same vendored `Dialog` these two files compose, so what is missing is only its `max-sm:` bottom-sheet presentation. **Logged in `deferred-items.md` with the conversion cost and the test to re-run.**

**C. `EmptyState` / `ErrorState` were refused on both surfaces, and both refusals are already on record.**

- On the invite route, the plan says *"`EmptyState` and `ErrorState` where the surface has an empty or failed shape"*. That surface's empty shape IS the inactive state, and `tests/design/empty-state-adoption.test.ts` already records the refusal from the other side: the route's sibling *"deliberately does NOT use the shell — it must render a BYTE-IDENTICAL inactive surface to the invite page (T-11-ORACLE), so it composes `InviteCard` instead."* The shared shell brings its own icon, heading level and action slot, which is exactly how two entrances start to differ.
- On the group page's load-failure branch, `ErrorState` was refused on two independent grounds: it paints its glyph with the alarm token that 13-UI-SPEC bans across this phase's surfaces, and its `onRetry` is a **function prop** a Server Component cannot supply (the branch's retry is `RefreshGroupButton`, a client island that already owns `router.refresh()`). Both are written at the call site.

**D. The four named type roles were applied to HEADINGS, not to every text utility, and the reason was measured in `globals.css`.**

The plan says *"Type comes from the four named roles only; zero arbitrary sizes."* Read literally across these nine files that is a `text-sm` → `text-label` migration, and the stylesheet says why it must not be: **Tailwind's own ladder is re-declared per theme** (`--text-xs` through `--text-2xl`, both blocks), with the note *"these six are var-referencing inside their generated utilities, so re-declaring them here re-skins all 399 existing `text-*` call sites with ZERO component edits. This is why DS-02 is not a 400-site migration."* So `text-sm` is **not** frozen — it travels. What IS frozen is a named role standing next to `font-semibold` / `leading-tight` / `tracking-tight`, because a co-located utility beats the role's per-theme facet (`type-scale.test.ts`'s header, measured). The roles therefore landed on the two invite `<h1>`s and the event `<dl>`, where the utilities were doing exactly that damage, and via `PanelCard title` on the roster. The falsifiable half — zero arbitrary pixel sizes — is gated repo-wide by `type-scale.test.ts` and is green.

**E. The `full` and `closed` alerts in `rsvp-form.tsx` were left alone.** They are neither of the two regions 13-UI-SPEC names for this plan, both are decided server-side and present on the first paint (so neither ever announces a change), and both already carry the deliberate `role="status"` downgrade from `Alert`'s hardcoded `role="alert"` — so nothing on the surface is assertive while the audit is pending. Whether a static advisory should be a region at all is the live-region audit, and `live-regions.ts` assigns this file to plan **13-14**.

### Honesty notes — two greens that are NOT evidence

1. **`tests/design/card-pattern-coverage.test.ts`'s green says nothing about this plan's two files.** Measured, not argued: it is green with a hand-rolled container in `attendee-roster.tsx` (Watched Red 1). Citing it as coverage for this adoption would be precisely the vacuity this repository keeps finding. The evidence is `tests/group/group-surface-shell.test.tsx`.
2. **`tests/design/invite-notfound-parity.test.ts`'s green is not evidence the restyle preserved the 404 parity.** Its own header states that it asserts imports and that changing a value leaves it green. The plan's criterion (it passes, zero-line diff) is satisfied, and separately the rendered parity was **measured** at 1613 identical bytes with the measurement watched failing. The criterion and the property are two different things and are reported as two different things.

## Threat Flags

None. No network endpoint, no auth path, no schema change and no new trust boundary. The plan's own register, discharged:

- **T-13-08-INVITEORACLE** (Information Disclosure) — mitigated. `invite-notfound-parity.test.ts` is green and **byte-UNMODIFIED** (`git diff --stat` empty), and because that gate cannot see a restyle, the rendered parity was measured directly: **1613 === 1613 bytes**, with the measurement watched failing at 1613 vs 1614.
- **T-13-08-INVITEINDEX** (Information Disclosure) — mitigated. `grep -c 'index: false'` → **2**, `grep -c 'no-referrer'` → **3**; `generateMetadata` is untouched. `og-routes.test.ts` green, and `opengraph-image.tsx` has an empty diffstat — the route still reads no param and performs no DB read.
- **T-13-08-ROSTERSCOPE** (Elevation of Privilege) — mitigated. **Zero non-comment changed lines** in the group page's diff touch `getHeadcount`, `getOwnedGroupByBooking`, `getRoster` or any SQL construct; no roster is filtered in JS after reading. `tests/group/group-owner-scope.test.ts` green.
- **T-13-08-SCOPECREEP** (Tampering) — mitigated. `tests/group/` passes in full (102/102), including the RSVP state machine, the seat-claim race and the D-113 arithmetic assertions that read the page's own source for `attendingTotal={counts.confirmed + 1}`. No filter, no roster action, no invite mechanism, no RSVP option, no printable attendee name was added.
- **T-13-08-SC** (supply chain) — discharged trivially. **Zero packages installed**; `package.json`, `package-lock.json` and `components.json` are byte-unchanged; no shadcn block fetched; `sheet-absent.test.ts` green.

## Known Stubs

None. Every component this plan touched renders real, server-supplied data, and the one deliberate absence — `SupportPath` rendering nothing while `SUPPORT_EMAIL` is `null` (D-64) — is not on either of these surfaces and is not this plan's.

## Requirements: deliberately NOT marked complete

The plan's frontmatter carries `requirements: [TRUST-02, STATE-08]`. **Neither was marked complete**, following 13-02's and 13-05's precedent in this phase.

- **TRUST-02** — the reference now renders on the group page, which is this plan's half. It is also carried by `13-04`, `13-10`, `13-12` and `13-13`, and the booking detail page still renders the reference as a hand-rolled `<p className="… sm:text-display">` rather than through `<BookingReference/>`. Marking it complete would put `Complete` in the traceability table while the surface the requirement is *about* has not adopted the component.
- **STATE-08** — 13-05 named exactly two remaining plans when it declined to mark this: **13-08** (the alert slot verified in situ, done here) and **13-14** (the live-region gate that takes `LIVE_REGION_EXCLUSIONS` from 10 to 0 for this phase's files). The second has not run. Its own summary put it plainly: *"neither has yet been audited by the gate that owns live regions."* One of the two claims is now discharged; the requirement closes when both are.

## Notes for later plans

- **13-14 (live-region inventory):** `live-regions.ts`'s header quotes a measured `aria-live` count of 19 files. This plan removed the region from `invite-card.tsx`'s static inactive state, so that grep now returns **18**. Every assertion in `live-regions.test.tsx` is green — the exclusions are checked for a reason and for non-overlap, never for a region existing — so what drifted is prose arithmetic in that plan's own file. Also inherited: `rsvp-form.tsx`'s `full` and `closed` alerts are static-content regions left for that audit (judgement E), and `rsvp-confirmation.tsx` / `rsvp-form.tsx` now each carry one **named** region.
- **Anyone opening `remove-attendee-button.tsx` or `regenerate-link-button.tsx`:** take the `ResponsiveDialog` conversion with you (judgement B, logged in `deferred-items.md`).
- **Anyone deleting or moving `attendee-roster.tsx` or `(app)/bookings/[id]/group/page.tsx`:** their `ALLOWED_RAW_CARD` rows must go in the same commit (the gate's own recorded trap), and `tests/group/group-surface-shell.test.tsx` is the only remaining guard on those containers.

## Self-Check: PASSED

Files claimed created/modified, verified present on disk:

- `tests/group/group-surface-shell.test.tsx` — FOUND
- `src/app/(app)/bookings/[id]/group/page.tsx` — FOUND
- `src/app/(public)/invite/[token]/page.tsx` — FOUND
- `src/components/group/attendee-roster.tsx` — FOUND
- `src/components/group/headcount-meter.tsx` — FOUND
- `src/components/group/share-link-box.tsx` — FOUND
- `src/components/group/top-up-nudge.tsx` — FOUND
- `src/components/group/invite-card.tsx` — FOUND
- `src/components/group/rsvp-form.tsx` — FOUND
- `src/components/group/rsvp-confirmation.tsx` — FOUND
- `.planning/phases/13-confirmation-bookings-trust/deferred-items.md` — FOUND (+2 rows)

Commits claimed, verified in `git log`:

- `e133ed8` — FOUND
- `451f371` — FOUND
