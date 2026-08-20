---
phase: 13-confirmation-bookings-trust
plan: 14
subsystem: ui
tags: [gate-03, live-regions, accessibility, aria, screen-reader, design-gate, ast-scan, type-level-assertion, countdown]

# Dependency graph
requires:
  - phase: 12-checkout-conversion
    provides: "`src/lib/design/live-regions.ts` — the declared inventory, its seven rules, its type-level file-count alias, and the ten `LIVE_REGION_EXCLUSIONS` naming this phase's requirement IDs; plus `hold-countdown.tsx` as the shipped rule-3 model and `tests/booking/hold-countdown.test.tsx` as its clock-driving harness"
  - phase: 13-confirmation-bookings-trust
    plan: 02
    provides: "pending-payment-state.tsx's named `role=\"status\"` wrapper around MoneyStatement, and `tests/booking/payment-states.test.tsx` case (4)'s one-region count + aria-label assertion"
  - phase: 13-confirmation-bookings-trust
    plan: 05
    provides: "the two STATE-08 alerts as named regions in attendee-roster.tsx / share-link-box.tsx, and the recorded LABEL-not-a-copy naming decision"
  - phase: 13-confirmation-bookings-trust
    plan: 07
    provides: "request-countdown.tsx's `finalHourEmphasis` opt-out and the not-completed-state reuse at `label=\"Slot held for\"`"
  - phase: 13-confirmation-bookings-trust
    plan: 08
    provides: "the invite-card / rsvp-confirmation / rsvp-form design pass, the `ui/alert` hardcoded-role finding, and the explicit hand-off of rsvp-form's `full`/`closed` advisories to this plan"
  - phase: 13-confirmation-bookings-trust
    plan: 10
    provides: "expired-approval-state.tsx with its region already removed, and the nested-panel double-padding measurement"
provides:
  - "All ten Phase-13 `LIVE_REGION_EXCLUSIONS` discharged by audit — six regions removed, seven declared across six new files, one exclusion left (Phase 14's host wizard)"
  - "`request-countdown.tsx` in rule-3 form: a latched threshold announcement, no expiry arm, no `role=\"timer\"` on the expired render, and silence for any countdown that mounts already inside its final hour"
  - "`tests/booking/request-countdown.test.tsx` — 8 clock-driven cases counting region text changes against digit text changes, four watched reds"
  - "`AUTHOR_NAMED_REGIONS` — the closed, both-directions-asserted exception set that replaced SCAN 3's blanket ban on a named non-`loading` region"
  - "A source scan that RESOLVES `aria-label={IDENT}` through module-level string consts, so \"resolves to a non-empty accessible name\" is checked as a value"
  - "`DeclaredFileCountIsSeventeen` — the measured count, watched failing under eleven"
  - "`group-surface-shell.test.tsx` case (4b): the group page's own AST asserted to open no live region, because a mirror fixture cannot prove a page has none"
affects: [13-15, 13-16, 14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A blanket ban that meets shipped, argued, test-pinned counter-examples becomes a CLOSED EXCEPTION SET with a mandatory reason per row, asserted in both directions — never a relaxed predicate"
    - "A source scan that takes the ONE statically-decidable hop (identifier → module-level string const) turns `named: boolean` into a checked value, and makes a declared `name` column load-bearing instead of decorative"
    - "A countdown's threshold latch is seeded from WHICH SIDE OF THE LINE THE FIRST RENDER WAS ON, so a page that arrives inside its threshold announces nothing"
    - "A mirror fixture cannot assert an ABSENCE about the thing it mirrors; the absence has to be read from the mirrored file's own AST"

key-files:
  created:
    - "tests/booking/request-countdown.test.tsx"
  modified:
    - "src/lib/design/live-regions.ts"
    - "src/components/booking/request-countdown.tsx"
    - "src/components/group/rsvp-form.tsx"
    - "src/app/(app)/bookings/[id]/group/page.tsx"
    - "tests/design/live-regions.test.tsx"
    - "tests/group/group-surface-shell.test.tsx"
    - ".planning/phases/13-confirmation-bookings-trust/deferred-items.md"

key-decisions:
  - "SCAN 3's blanket ban on an `aria-label` over a non-`loading` region was replaced by a declared exception set rather than by stripping five shipped names. Reversing 13-02/13-05/13-08's naming decision would have broken `tests/booking/payment-states.test.tsx` case (4) and `tests/group/state08-alerts.test.tsx`, which PIN those names — moving a pin to make code pass is the thing this phase forbids. The ban's load-bearing half survives: the hazard is a name that COMPETES with the sentence, not a name."
  - "The declared set was MEASURED off an AST walk, not read off 13-UI-SPEC's table. Two of the six additions are different files from the ones the spec named: the two STATE-08 alerts live in `attendee-roster.tsx` / `share-link-box.tsx` (not `group/page.tsx`) and the RSVP result lives in `rsvp-confirmation.tsx` (not `invite-card.tsx`, which renders no region at all). A row describing a region its file does not have fails the 'no file is padding' assertion."
  - "`invite-card.tsx` is discharged by REMOVAL and is declared nowhere. Its exclusion said Phase 13 owned the audit, not that a region had to survive it — 13-08 removed the region and the correct verdict is an empty entry in both lists."
  - "rsvp-form's `full`/`closed` advisories take `role=\"note\"`. Deleting the `role=\"status\"` override would restore `ui/alert`'s hardcoded `role=\"alert\"` (13-08's measured defect), and the other shipped answer — swap to `PanelCard tone=\"muted\"` as TopUpNudge did — nests a panel inside `InviteCard`'s panel and pays the block padding twice."
  - "The request countdown is SILENT when it mounts inside its final hour. This is the one place it departs from `hold-countdown.tsx`, and the reason is structural: a fifteen-minute hold can never mount inside a sixty-SECOND threshold, and an hours-scale window mounts inside its sixty-MINUTE one constantly."
  - "`BOOKER_PATH_LIVE_REGION_FILES` keeps its name over a set that now includes invitee surfaces, with the membership RULE stated in the header instead. Renaming an exported symbol to widen a comment is churn; the stated rule is what a reader checks."
  - "STATE-08 and TRUST-01 are NOT marked complete. 13-05 declined the same call for STATE-08, TRUST-01 closes PARTIAL by D-64 (SUPPORT_EMAIL is null), and two plans of this phase remain."

patterns-established:
  - "A grep-shaped acceptance criterion over an attribute the file must DOCUMENT is unsatisfiable by any correctly-commented tree. Record the collision, state the satisfiable form (the same count with comment lines stripped), and do not gut the documentation."
  - "A count in a planning note is a prediction until somebody re-reads the tree. 13-08 predicted 19 → 18; the measured answer is 13 by text and 7 by markup."
  - "An exception list is padding-proof only if a row whose subject is NOT breaking the rule fails. Probe both directions before trusting it."

requirements-completed: []  # NONE — see "Requirements: deliberately NOT marked" below.

# Metrics
duration: 40min
completed: 2026-08-21
---

# Phase 13 Plan 14: The Live-Region Debt, Discharged by Audit Summary

**Ten inherited exclusions were audited against GATE-03's seven rules instead of being inherited: six regions were deleted because they wrapped a freshly navigated page, seven were declared across six files whose membership was MEASURED rather than copied from the spec, the second ticking region stopped announcing its own expiry, and the count alias went from eleven to a seventeen that was watched failing at eleven.**

## Performance

- **Duration:** ~40m
- **Started:** 2026-08-21T02:57Z (10:57 +0800)
- **Completed:** 2026-08-21T03:37Z (11:37 +0800)
- **Tasks:** 2 of 2
- **Files modified:** 6 modified, 1 created

## Accomplishments

- **The handover no requirement ID mentions is closed.** `LIVE_REGION_EXCLUSIONS` went from eleven rows to **one**. The module's own footer said *"several are probably not [correct]"* — measured, it was right: only four of the ten still hold a region at all.
- **The second ticking region obeys rule 3.** `request-countdown.tsx`'s threshold message latches instead of flickering `"" → message → ""`, its expiry arm is deleted (rule 6 — the page-level state owns expiry), the expired render drops `role="timer"`, and a countdown that mounts already inside its final hour says nothing. Proved on a driven clock with the DIGIT change count beside the REGION change count.
- **The count alias carries a measured seventeen and was watched failing at eleven**, in the same commit as the second literal in the test.
- **SCAN 3's naming rule became true rather than convenient.** Its blanket ban met five shipped wrapper regions with a written argument and two pinning tests; it is now a closed exception set with a `why` and the exact label per row, asserted in both directions, and the label is RESOLVED through module consts so `aria-label={NAME}` is checked as a value.

## Task Commits

1. **Task 1: Apply rule 3 to the request countdown** — `b00747b` (fix)
2. **Task 2: Discharge the ten exclusions and rename the count alias** — `81157ee` (feat)

**Plan metadata:** see the final `docs(13-14)` commit.

## Files Created/Modified

- `src/components/booking/request-countdown.tsx` — rule-3 shape: latched threshold, no expiry arm, `role="timer"` on the ticking branch only, `aria-live` dropped (text kept) at expiry, and a `startedAboveThreshold` seed that keeps a below-the-line mount silent.
- `tests/booking/request-countdown.test.tsx` — **NEW.** 8 clock-driven cases.
- `src/lib/design/live-regions.ts` — the discharge: six files added, seven rows added, ten exclusions removed, `AUTHOR_NAMED_REGIONS` added, alias renamed, arithmetic re-measured, footer corrected.
- `tests/design/live-regions.test.tsx` — `DECLARED_FILE_COUNT` 11 → 17, the threshold pin 1 → 2, SCAN 3's naming assertion rewritten, the identifier-resolving name check added (21 cases, was 20).
- `src/components/group/rsvp-form.tsx` — the two static advisories stop being regions (`role="note"`); the refusal region stays and is now declared.
- `src/app/(app)/bookings/[id]/group/page.tsx` — the load-failure card stops being a region.
- `tests/group/group-surface-shell.test.tsx` — mirror fixture corrected; case (4b) added, reading the page's own AST.
- `.planning/phases/13-confirmation-bookings-trust/deferred-items.md` — 13-08's count row marked resolved with the real numbers; one new row.

## The audit, file by file

| Excluded file | Verdict | Where |
|---|---|---|
| `bookings/[id]/page.tsx` (declined, cancelled) | **Removed** — static landing | already done by 13-10, verified |
| `bookings/[id]/cancel/page.tsx` | **Removed** | already done by 13-06, verified |
| `bookings/[id]/group/page.tsx` | **Removed** — the load-failure card | **this plan** |
| `payment-reversed-state.tsx` | **Removed**, and no focus move added | already done by 13-04, verified |
| `expired-approval-state.tsx` | **Removed** | already done by 13-10, verified |
| `group/invite-card.tsx` | **Removed**, declared nowhere | already done by 13-08, verified |
| `pending-payment-state.tsx` | **Declared** `pending-payment` (status) | this plan |
| `request-countdown.tsx` | **Declared** `request-countdown-digits` (timer) + `-threshold` | this plan |
| `group/rsvp-confirmation.tsx` | **Declared** `rsvp-recorded` (status) | this plan |
| `group/rsvp-form.tsx` | **Declared** `rsvp-refused`; the other two advisories de-regioned | this plan |

Plus two files the spec assigned elsewhere and the measurement relocated: `group/attendee-roster.tsx` → `group-attendee-removed`, `group/share-link-box.tsx` → `group-link-rotated`.

## The numbers, all re-measured

| | Before | After |
|---|---|---|
| `BOOKER_PATH_LIVE_REGION_FILES` | 11 | **17** |
| `LIVE_REGION_IDS` | 16 | **23** |
| `LIVE_REGION_EXCLUSIONS` | 11 | **1** |
| `threshold`-kind regions | 1 | **2** |
| `DECLARED_FILE_COUNT` / alias | 11 / `…IsEleven` | **17 / `…IsSeventeen`** |
| `grep -rln aria-live src/ --include=*.tsx` | 19 (12-13) | **13** |
| `aria-live` in MARKUP (AST walk) | — | **7 files** |
| `aria-live="assertive"` in markup, tree-wide | 0 | **0** |
| `tests/design/live-regions.test.tsx` | 20 passed | **21 passed** |

⚠ **13-08 predicted the grep would return 18. It returns 13.** The prediction counted one removal; five plans had removed regions since. Both readings (13 by text, 7 by markup) and the reason they differ are now in the module. Do not carry either forward without re-reading the tree.

## Watched reds — every one run and reverted

**Task 1** (`npx vitest run tests/booking/request-countdown.test.tsx`), green is 8 passed:

**(A) The shipped one-minute WINDOW instead of the latch.** 2 failed / 6 passed:
```
AssertionError: the region's text changed 2 times. It must change EXACTLY ONCE — this is an UPPER
bound, which is why it is toBe(1) and not toBeGreaterThan(0). Every extra change is an extra thing
spoken over the booker.: expected 2 to be 1 // Object.is equality
AssertionError: the same drive over a countdown that STARTED above the threshold produced no
announcement either, so the zero above measures nothing.: expected 2 to be 1 // Object.is equality
```

**(B) The expiry arm restored** (`"This window has closed."` + a permanent `aria-live`). 5 failed / 3 passed:
```
AssertionError: a countdown that mounted with 40 minutes left announced anyway. Observed:
[{"minuteMark":0,"region":"This window has closed.","digits":""}]: expected 1 to be +0
AssertionError: the expired render still holds a live region. The surface has been replaced by the
page-level expiry state, which is what announces the expiry — this one would say it a second time.:
expected 1 to be +0
AssertionError: a single tick that landed past the deadline announced the threshold it skipped
over.: expected 'This window has closed.' to be ''
```

**(C) The `startedAboveThreshold` guard dropped.** 2 failed / 6 passed — the observation table printed all forty steps carrying the sentence:
```
AssertionError: a countdown that mounted with 40 minutes left announced anyway. Observed:
[{"minuteMark":39,"region":"Under one hour left.","digits":"39m"}, … {"minuteMark":0,…}]:
expected 1 to be +0
```

**(D) The digits announce** (`aria-live="polite"` on the timer). 2 failed / 6 passed:
```
AssertionError: the digits must be aria-live=off. Anything else announces the remaining time on
every tick for the whole window — the specific defect GATE-03 exists to catch.:
expected 'polite' to be 'off'
AssertionError: the countdown holds 2 polite regions. Two regions is the double-announcement shape:
both are invisible, so a second one is added and nobody notices until a screen-reader user hears the
same sentence twice.: expected 2 to be 1
```

**Task 2** — the alias, `npx tsc --noEmit`, **the acceptance criterion's own probe.** Alias reverted to `DeclaredFileCountIsEleven` / `extends 11`, nothing else changed. Exit code **2**, one error, verbatim:
```
src/lib/design/live-regions.ts(1088,3): error TS2344: Type 'false' does not satisfy the constraint 'true'.
```
Restored → exit 0. The error is terse by design and the ALIAS NAME is what makes it legible — the only edit that can silence it is one whose entire content is the number somebody is changing.

**Task 2** (`npx vitest run --config vitest.design.config.ts tests/design/live-regions.test.tsx`), green is 21 passed:

**(E) A declared author-name row deleted** (`rsvp-refused`). 1 failed / 20 passed:
```
AssertionError: expected [ Array(1) ] to deeply equal []
+ [ "src/components/group/rsvp-form.tsx:369 (status#1) carries BOTH its own text and an author
    name, and is not in AUTHOR_NAMED_REGIONS. Either the region's own text IS the message (drop the
    aria-label — a named live region can be announced by its NAME instead of its content), or it is
    a wrapper with nothing to be named by, in which case add a row in
    `src/lib/design/live-regions.ts` saying so and quoting the label." ]
```

**(F) The exception list PADDED** with `hold-expired-state`, a region that carries no name — the direction that decides whether the list is a loophole. 1 failed / 20 passed:
```
+ [ "hold-expired-state is declared as author-named but its region carries no
    aria-label/aria-labelledby (or is absent). An exception nothing is using is an exception the
    next region inherits." ]
```

**(G) The `full` advisory in `rsvp-form.tsx` made a region again** — the audit verdict is now gated. 2 failed / 19 passed, and it reproduced probe (b)'s documented ORDINAL DISPLACEMENT on a real edit: the reported violation is the innocent element.
```
AssertionError: GATE-03's inventory disagrees with the tree.
  PRESENT BUT UNDECLARED (a live region shipped with no stated reason):
  src/components/group/rsvp-form.tsx:369 — status#2 on <Alert> (role="status")
  src/components/group/rsvp-form.tsx renders, in source order:
    :356 status#1 <Alert> → rsvp-refused
    :369 status#2 <Alert> → NO ROW
```
Line 356 is the PROBE and line 369 is the real refusal region, displaced. The full-sequence block is what makes that readable.

**(H) A resolved name emptied** (`RESULT_REGION_NAME = ""`). 1 failed / 20 passed, reporting BOTH halves:
```
+ [ "rsvp-recorded (src/components/group/rsvp-confirmation.tsx:68) resolves to an EMPTY accessible
    name. The attribute being present is not the claim; the name being non-empty is.",
    "rsvp-recorded renders \"\" but AUTHOR_NAMED_REGIONS records \"RSVP recorded\". The recorded
    string exists so a reviewer can check the LABEL-not-a-paraphrase rule by reading one file; a
    stale copy defeats that silently." ]
```

**(I) The group page's region restored** — `tests/group/group-surface-shell.test.tsx` case (4b). 1 failed / 10 passed:
```
AssertionError: the group page opened a live region of its own. Every branch it returns is a fresh
navigation, and a page is not a change; the two regions this surface keeps live in the client
islands that own the state that moves.: expected [ Array(2) ] to deeply equal []
+ [ "page.tsx:177 — role=\"status\"", "page.tsx:177 — aria-live" ]
```

## Decisions Made

### 1. The naming rule was refined, not relaxed — and stripping five labels was the alternative rejected

This is the plan's one architectural call and it deserves the space.

`tests/design/live-regions.test.tsx`'s SCAN 3 held a **blanket ban**: a non-`loading` region carrying `aria-label` or `aria-labelledby` fails. Widening the declared set to include Phase 13's surfaces put **five shipped regions** on the wrong side of it — `pending-payment-state.tsx` (13-02), `attendee-roster.tsx` and `share-link-box.tsx` (13-05), `rsvp-confirmation.tsx` and `rsvp-form.tsx` (13-08). Every one of them was named deliberately, each records the same reason at the line, and **two are pinned by shipped tests**: `tests/booking/payment-states.test.tsx` case (4) asserts `getAttribute("aria-label")` is truthy, and `tests/group/state08-alerts.test.tsx` computes two of the names through `queryAllByRole("status", { name })`.

So there were two ways to make the gate green, and only one of them is honest:

- **Strip the five names.** This reverses three plans' documented decisions, breaks two shipped test files, contradicts 13-UI-SPEC's explicit *"non-empty accessible name"* instruction for four of them, and moves pins that were firing on correct code. That is precisely what this phase's constraints forbid.
- **Make the rule true.** The measured hazard behind the ban is not *a name* — it is *a name that COMPETES with the sentence*, because on the VoiceOver/Safari pairing a named live region can be announced by its NAME instead of its CONTENT. The blanket ban was written over a tree in which every live region was a `<p>` holding one sentence. All five of Phase 13's are **wrappers**: the role sits on a `<div>` (or an `<Alert>`) around a `MoneyStatement` / `PanelCard` / `AlertDescription`, with no text of its own, absent from the DOM until an outcome lands. `role="status"` is `nameFrom: author`, so those five compute `""` without a label — the same defect `loading` carries, and the same fix.

The ban therefore became `AUTHOR_NAMED_REGIONS`: a **closed set** with `{ id, name, why }`, the same mechanism `LIVE_REGION_EXCLUSIONS` uses, which the module itself calls its most important content. The gate asserts it in **both** directions (probes E and F), so the list can neither be bypassed nor padded, and adding a label to a content-named region still costs a compile-visible edit and a written argument.

**And the exception was given teeth the ban never had.** The scan now resolves `aria-label={IDENT}` through module-level string constants, so it reads the VALUE. That closes a real hole — `aria-label=""` satisfied `attrs.has("aria-label")` — makes the `name` column a checked fact rather than a comment (probe H), and is what actually delivers 13-UI-SPEC's *"resolves to a non-empty accessible name"* for all five.

### 2. `role="note"` for the two static advisories on the invite page

`ui/alert` hardcodes `role="alert"`. Removing the `role="status"` override would have restored the **interrupting** role on static content — 13-08's exact `top-up-nudge.tsx` defect. 13-08's own answer there (swap the box for `PanelCard tone="muted"`) is unavailable here because `InviteCard` already wraps `{children}` in a `PanelCard`, so a panel nests inside a panel and pays the block padding twice (13-10's measurement). `role="note"` is the ARIA role for parenthetical content, it is a **literal** the source scan can read, and it leaves the box, the icons and the copy byte-identical.

### 3. The set name was kept; the membership rule was written down instead

Three of the six additions are surfaces a *booker* never reaches. `BOOKER_PATH_LIVE_REGION_FILES` keeps its spelling — renaming an exported symbol to widen a comment is churn, and the module and two test files refer to it by that name — but the header now states the rule: *every file in `src/` that renders a live region on the demand-side journey — search, checkout, and the post-booking lifecycle that journey hands off to.* What is left outside is the supply side, the auth/profile forms, and the `patterns/` skeletons that `skeleton-a11y.test.ts` gates.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — missing critical functionality] The `threshold` pin fired, and moving it was the scheduled change**
- **Found during:** Task 2
- **Issue:** `tests/design/live-regions.test.tsx` asserted `thresholds.map(r => r.file)` equals exactly `["hold-countdown.tsx"]`. Declaring `request-countdown.tsx`'s rule-3 region makes that two.
- **Fix:** Pin moved 1 → 2 with the reason re-stated: there are exactly **two** ticking values in this application and rule 3 gives each one a role-less polite region. This is a pin moving *as the scheduled change*, not a pin moved to make code pass — the second threshold is the thing the plan exists to create.
- **Files modified:** `tests/design/live-regions.test.tsx`
- **Committed in:** `81157ee`

**2. [Rule 1 — bug] `rsvp-form.tsx`'s `full` and `closed` advisories were regions that could never announce**
- **Found during:** Task 2
- **Issue:** Both carry `role="status" aria-live="polite"` over content decided by a server PROP. 13-08 measured that neither ever changes and handed the audit to this plan by name in the file's own header.
- **Fix:** `role="note"` (see Decision 2). The refusal region is now the file's only region and is declared.
- **Verification:** Probe (G) — putting one back produces a present-but-undeclared failure. `npx vitest run tests/group/` → 103 passed.
- **Committed in:** `81157ee`

**3. [Rule 1 — bug] `group/page.tsx`'s load-failure card was a region wrapped around a page**
- **Found during:** Task 2
- **Issue:** The plan's action text implies 13-05 had already replaced this. Measured, 13-05 put its two alerts in the client islands and left this branch's `role="status" aria-live="polite"` untouched. It wraps the branch's entire content, so it announces on a fresh navigation and never on a change.
- **Fix:** Removed, with the rule and the `router.refresh()` reasoning stated at the line.
- **Files modified:** `src/app/(app)/bookings/[id]/group/page.tsx` (not in the plan's `files_modified`, but named in its action text)
- **Verification:** Probe (I).
- **Committed in:** `81157ee`

**4. [Rule 1 — bug] `group-surface-shell.test.tsx`'s mirror fixture had drifted false**
- **Found during:** Task 2
- **Issue:** That file hand-mirrors the group page's load-failure branch, including its region. After deviation 3 the mirror claimed markup the page no longer had — and case (4) would have stayed green forever, because it only counts card boxes.
- **Fix:** Fixture corrected, and **case (4b) added**: the absence is read from `page.tsx`'s own AST, because a fixture cannot prove anything about the file it mirrors. Guard-the-guard included (byte floor + `loadFailed` present), per probe (d)'s lesson.
- **Files modified:** `tests/group/group-surface-shell.test.tsx`
- **Verification:** Probe (I); 11 passed (was 10).
- **Committed in:** `81157ee`

**5. [Rule 2 — missing critical functionality] The declared `name` column would have been unverifiable prose**
- **Found during:** Task 2
- **Issue:** `AUTHOR_NAMED_REGIONS` records the exact label per row so a reviewer can check the LABEL-not-a-paraphrase rule by reading one file. Four of the five labels arrive as identifiers, which the scan reported as "computed, unknowable" — so a stale `name` would drift silently and `aria-label=""` would pass `attrs.has(…)`.
- **Fix:** `resolveModuleStringConsts` — one statically-decidable hop, module-level `const X = "literal"` only, no expression evaluation. Unresolvable names stay `null` and are reported as such.
- **Verification:** Probe (H), plus two inline fixtures asserting it resolves an identifier and refuses a prop.
- **Committed in:** `81157ee`

---

**Total deviations:** 5 auto-fixed (2 × Rule 1 on shipped markup, 1 × Rule 1 on a drifted fixture, 2 × Rule 2). **Impact:** no scope creep — every one is inside the ten files the plan names or is the direct consequence of an edit it required. No package installed (T-13-14-SC clean).

## Issues Encountered

### Grep/prose collisions — three, all unsatisfiable as written

The phase's known trap, hit three times. **Recorded, not gutted.**

| Criterion as written | Measured | Satisfiable form | Measured |
|---|---|---|---|
| `grep -c 'role="timer"' request-countdown.tsx` returns 1 | **3** | same count with comment lines removed | **1** ✅ |
| `grep -c 'aria-live="off"'` returns 1 | **2** | same, comment lines removed | **1** ✅ |
| `grep -rn 'aria-live="assertive"' src/` returns zero | **3 hits** | same, comment lines removed / AST walk of every element | **0** ✅ |

The three `assertive` hits are `collision-notice.tsx:125` (explaining what its focus move replaces) and `live-regions.ts:99` + `:282` — the latter being the module that *quotes the banned value by name*, which is the documented reason it lives outside the DS-13 leak gate's scanned tree. A file cannot both forbid a string and be forbidden from naming it. The design gate itself already resolves this correctly: SCAN 1 strips comments before its text scan **and** asserts the same ban from the AST, which is why it stayed green throughout.

### The measured set is not the specified set

13-UI-SPEC's Live Regions table assigns `bookings/[id]/group/page.tsx` "the two STATE-08 alerts" and `group/invite-card.tsx` "the RSVP result". Neither file holds what it is assigned: 13-05 put both alerts in `attendee-roster.tsx` / `share-link-box.tsx` (the client islands that own the state that changes), and `invite-card.tsx` renders **no region at all** since 13-08. Taking the spec's list as the answer would have produced two rows describing regions that do not exist, failing the "no file is padding" assertion — which is exactly why the plan says **MEASURE the final set**. The AST walk was the authority; the header records the discrepancy so the next reader is not confused by the spec.

## Requirements: deliberately NOT marked

The plan's frontmatter lists `[STATE-08, TRUST-01]`. Neither is marked complete:

- **STATE-08** — 13-05 built the alerts and explicitly declined to mark it (`requirements-completed: []`); this plan only declares their regions. Two plans of the phase remain.
- **TRUST-01** — closes **PARTIAL** by decision (D-64: `SUPPORT_EMAIL` is null, `src/lib/site.ts:70` is the only line that changes, and it is a `human_needed` item). STATE.md already records this.

Marking either here would be this plan asserting a phase-level verdict it did not measure.

## Verification

| Check | Result |
|---|---|
| `npx vitest run tests/booking/request-countdown.test.tsx tests/booking/hold-countdown.test.tsx` | **15 passed** — the model is untouched |
| `npx vitest run --config vitest.design.config.ts tests/design/live-regions.test.tsx` | **21 passed** |
| `npm test` | **1516 passed, 4 skipped, 0 failed** (157 files) |
| `npm run test:design` | **791 passed, 3 skipped** (46 files) |
| `npm run build` | clean |
| `npx tsc --noEmit` | **exit 0** |
| `npx eslint` on every touched file | clean |
| `git diff --stat HEAD~2 HEAD -- drizzle/` | **empty** — still ends at `0025_audit_resolved_by.sql` |
| `grep -c 'Phase 13'` inside `LIVE_REGION_EXCLUSIONS` | **0** |
| `aria-live="assertive"` in markup, tree-wide | **0** |
| `git diff request-countdown.tsx` — visible digits / interval / prop signature | **unchanged** (`formatRemaining`, `TICK_MS`, `tabular-nums`, and the whole props block are untouched) |

## Next Phase Readiness

- **13-15** should note that `request-countdown.tsx` still carries the alarm-colour token for its hours-scale emphasis (13-07's deferred row, unchanged by this plan — the emphasis is visual and this plan changed only announcements). Its § Color source scan will report the file, and that is not a regression this plan introduced.
- **Phase 14** inherits the single remaining exclusion, `address-autocomplete.tsx`, with its reason intact — and now inherits a worked example of what discharging one looks like.
- **One new deferred row:** the group page's `Try again` announces nothing when it fails a second time. The region that was there could not have reported it either; a real fix needs a mechanism `RefreshGroupButton` does not have, and D-79 caps this surface at a design-system pass.

---
*Phase: 13-confirmation-bookings-trust*
*Completed: 2026-08-21*

## Self-Check: PASSED

All 9 files verified present on disk; both task commits (`b00747b`, `81157ee`) verified in `git log`.
Counts re-read from the module itself rather than from this document: `BOOKER_PATH_LIVE_REGION_FILES`
holds **17** paths and `LIVE_REGION_IDS` holds **23** ids — the two numbers this summary claims.
