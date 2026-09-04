---
phase: 13-confirmation-bookings-trust
plan: 05
subsystem: ui
tags: [state-08, live-regions, accessibility, ast-scan, design-gate, group-bookings, toasts, grep-tripwire]

# Dependency graph
requires:
  - phase: 11-design-system-foundation
    provides: "PanelCard (DS-11's `tone=\"muted\"` in-page advisory surface) — both STATE-08 alerts compose it rather than inventing a shape"
  - phase: 08-group-bookings
    provides: "share-link-box.tsx's presence-checked clipboard write and its two copy toasts (the allow-listed row), attendee-roster.tsx, and the two D-121 confirm dialogs"
  - phase: 07-cancellation-refunds
    provides: "cancel-confirm.tsx + refund-destination-form.tsx (the two toasts that carried the money sentence), and the booking detail page's cancelled branch that already renders D-79's wording durably"
  - phase: 13-confirmation-bookings-trust
    plan: 02
    provides: "money-statement.tsx's bare-wrapper-around-PanelCard shape, reused for both alert regions; and the recorded finding that a `why` string is visible to source scans"
  - phase: 13-confirmation-bookings-trust
    plan: 04
    provides: "reversed-copy.test.ts's apostrophe-normalisation pass and the two-piece `Forbidden` idiom in its measured form — both carried into this plan's scan"
provides:
  - "An AST scan over `toast` / `toast.*` call ARGUMENTS across the three Phase-13 trees, watched red on four shipped calls and green after the fix"
  - "The attendee-removed outcome as one named in-page alert above the roster (PanelCard tone=muted + role=status + non-empty accessible name), with zero toasts"
  - "The link-regenerated outcome as one named in-page alert above the share box, derived from the URL the box itself renders — an announcement that cannot claim a rotation that did not land"
  - "Both cancellation toasts reduced to `Booking cancelled.`; the money truth stays on the destination it already renders on"
  - "`removeAttendee` returning organizer-inclusive `attending` + `spotsFree`, read under the lock the delete already holds"
  - "tests/group/state08-alerts.test.tsx — 8 RTL cases, three watched reds, two live positive controls for the toast spy"
affects: [13-08, 13-10, 13-14, 13-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "An AST scan whose UNIT is a call expression's arguments rather than a file's text — the only unit that can ban a word from a toast while the correct copy is required to use the same word two lines below"
    - "Announcement-by-derivation: a client component decides to announce a rotation by noticing the value IT renders changed, so the announcement is a function of the thing announced and cannot outlive its truth"
    - "A server action returning the two figures its own outcome sentence needs, read inside the transaction that produced them — so the client renders text and performs no arithmetic"

key-files:
  created:
    - "tests/group/state08-alerts.test.tsx"
    - ".planning/phases/13-confirmation-bookings-trust/deferred-items.md"
  modified:
    - "tests/design/status-vocab.test.ts"
    - "src/components/booking/cancel-confirm.tsx"
    - "src/components/booking/refund-destination-form.tsx"
    - "src/components/group/attendee-roster.tsx"
    - "src/components/group/remove-attendee-button.tsx"
    - "src/components/group/regenerate-link-button.tsx"
    - "src/components/group/share-link-box.tsx"
    - "src/app/actions/group.ts"
    - "tests/group/group-lifecycle.test.ts"

key-decisions:
  - "The scan bans SEVEN tokens, not 13-UI-SPEC's six. The spec's list does not reach one of the three violations the same paragraph names — measured, not predicted: the first run named three files and `regenerate-link-button.tsx` was not among them, because `New link ready. Copy it and share it again.` contains none of the six. The seventh row is marked as this plan's addition and carries that finding as its reason."
  - "`refund-destination-form.tsx` is a FOURTH violation the plan did not name, of exactly the same shape as `cancel-confirm.tsx`, and it was fixed rather than allow-listed — an allow-list row for a toast carrying a money sentence would have been the scan excusing the defect it exists to catch."
  - "The rotation alert is DERIVED from the `inviteUrl` prop changing, not pushed by a callback. `RegenerateLinkButton` lives in a different subtree (below the roster), and the derived form is strictly better than a callback: a refused or rate-limited regeneration leaves the URL alone and announces nothing, and the new credential still never crosses the button (D-118)."
  - "`attendee-roster.tsx` became a client island. The announcement of a change is state; a callback into a server component is not a thing; and a module-level store would have added a second mechanism to move one sentence one level up. Measured cost: zero new fields in the client payload — the entries already crossed the boundary for `RemoveAttendeeButton`, and every field is rendered into the emitted HTML regardless."
  - "The organizer `+ 1` now lives at THREE sites, and both files that documented it as two were corrected in the same commit. The invariant that matters is unchanged and is now stated in its checkable form: all three increment the RAW count, and none of them increments each other."
  - "Both alerts' accessible names are LABELS, not copies of their sentences. `live-regions.ts` records the measured hazard that a named live region can be announced by its NAME instead of its content on VoiceOver/Safari; naming the region `Attendee removed` keeps the sentence as the content."

patterns-established:
  - "A ban's guard-the-guard fixture set must include the SHIPPED SHAPE, not just the canonical one: the cancellation toast's literals sat two levels down inside a conditional expression, which a `node.arguments.filter(isStringLiteral)` scan would have missed entirely while looking correct."
  - "An allow-list row is asserted to name a file that EXISTS and STILL CARRIES the thing it excuses — an exemption for a file with no toasts is not an exemption, it is a lie shaped like one."
  - "A `not.toHaveBeenCalled()` spy needs a LIVE positive control in the same file, and the best one is a real call site the plan deliberately preserved (here, the allow-listed copy toast)."

requirements-completed: []  # NONE. See "Requirements: deliberately NOT marked complete" below.

# Metrics
duration: 40min
completed: 2026-08-20
---

# Phase 13 Plan 05: What a Booker Must Read Never Travels in a Toast Summary

**Three must-read facts — a money-return sentence, a reduced headcount and a dead invite link — left their toasts for named in-page alerts, behind an AST scan over `toast` call arguments that was watched failing on FOUR shipped calls (one more than the plan named) and watched failing again on a real reintroduced one.**

## Performance

- **Duration:** ~40m
- **Started:** 2026-08-20T06:58Z (14:58 +0800)
- **Completed:** 2026-08-20T07:38Z (15:38 +0800)
- **Tasks:** 2 / 2
- **Files:** 2 created, 9 modified

## Task Commits

1. **Task 1: the toast AST scan, watched failing on the shipped calls** — `3741eb0` (test)
2. **Task 2: the three outcomes move to named in-page alerts** — `4c65ca1` (feat)

## Accomplishments

- **The scan is an AST scan, and that is load-bearing rather than stylistic.** Every banned token is a word the CORRECT copy is required to use elsewhere in the same file — the detail page states the money sentence, the roster states the headcount, the share box renders the link. A source grep reports the fix as the defect. The unit is "a string literal reachable from a `toast` call's arguments", which only an AST can express.
- **It was watched red on FOUR files, not three.** `src/components/booking/refund-destination-form.tsx:78` carried `Booking cancelled. Your refund is on its way to your account.` — the same defect as `cancel-confirm.tsx`, on the QR Ph branch of the same flow, and named in no plan in this phase. Fixed, not allow-listed.
- **And it was watched NOT reaching one of the three the plan named.** `regenerate-link-button.tsx`'s shipped toast contains none of 13-UI-SPEC's six tokens. A seventh row closes it, marked as this plan's addition and carrying the measurement as its reason. That is the difference between a scan that would have caught all three and one that merely says it would.
- **Both alerts render exactly one region, and the count is asserted rather than the presence.** `queryAllByRole("status")` `toHaveLength(1)` — "at least one" is satisfied by precisely the toast-plus-alert pair GATE-03 rule 6 forbids. Both were watched failing: once on a reintroduced toast (the spy), once on a duplicated region (the count), once on a removed `aria-label` (the name).
- **The rotation alert cannot lie.** It is derived from the `inviteUrl` this component renders, so a refused or rate-limited regeneration produces no announcement at all, and the sentence's *"the new one below"* is true of what is on screen — asserted, by reading the input's value in the same case.
- **The headcount is the server's, end to end.** `removeAttendee` reads `capacity_snapshot` off the row it already holds `FOR UPDATE` and counts the survivors inside the same transaction, so the figure announced is the one the delete produced. The client renders two numbers as text and computes nothing.
- **Zero packages. Zero migrations. Zero new `ALLOWED_RAW_CARD` rows — `card-pattern-coverage.test.ts` has zero lines changed. `site-contacts.test.ts` untouched.**

## Files Created/Modified

- `tests/design/status-vocab.test.ts` — **+512 lines**, appended as a second half under its own banner. A module-level `scanToasts()` over three declared roots; `readToastCalls()` walking call arguments RECURSIVELY (conditionals, template spans, JSX text, the bare-call form); seven two-piece `MustReadToken` rows each with its reason; a one-file allow-list with its reason; `normaliseCopy()` folding every apostrophe spelling. Six new `describe`-level assertions plus the ban itself — 13 new cases, 31 in the file.
- `src/components/booking/cancel-confirm.tsx` — the toast is `Booking cancelled.` and nothing more. `res.refundCents` is no longer read. The money vocabulary is **absent from the whole file, comments included** (see Deviation 3).
- `src/components/booking/refund-destination-form.tsx` — the same reduction on the D-72 branch. The `toast.warning(res.notice)` path is untouched and is recorded in `deferred-items.md`.
- `src/components/group/remove-attendee-button.tsx` — `toast.success` deleted; a new `onRemoved(AttendeeRemoved)` prop carries the outcome up. `toast.error` stays.
- `src/components/group/attendee-roster.tsx` — now `"use client"`. Owns the removal alert slot above the roster: a bare `<div role="status" aria-label>` wrapping `PanelCard tone="muted"`. `removalSentence()` composes 13-UI-SPEC's locked string from the server's two numbers and makes exactly one judgement — `1 spot free` vs `N spots free`.
- `src/components/group/regenerate-link-button.tsx` — `toast.success` deleted. The success path is now the `router.refresh()` alone.
- `src/components/group/share-link-box.tsx` — **+79 lines, 0 deletions.** The rotation alert slot and its reasoning; the two copy toasts are byte-identical (`git diff` on this file touches no toast line).
- `src/app/actions/group.ts` — `RemoveAttendeeResult` replaces `ManageGroupResult` on `removeAttendee`; the `FOR UPDATE` select's result is now read instead of discarded; a post-delete count runs under the same lock.
- `tests/group/group-lifecycle.test.ts` — the existing integration assertion widened to pin **both figures by value** against a real database (see Deviation 2).
- `tests/group/state08-alerts.test.tsx` — **new**, 8 cases.
- `.planning/phases/13-confirmation-bookings-trust/deferred-items.md` — **new**, one row.

## Verification

Every acceptance criterion was run and its output observed. **The two vitest configs were never run concurrently** (13-01's operational finding).

### Task 1

| Criterion | Result |
|---|---|
| Before Task 2 the command FAILS, naming the files with line numbers | **1 failed / 30 passed** — verbatim below. Names `cancel-confirm.tsx:46`, `refund-destination-form.tsx:78`, `regenerate-link-button.tsx:68`, `remove-attendee-button.tsx:67` |
| Positive control asserts a non-zero `toast` call count | present, and green in the same red run |
| `grep -c 'no longer works' tests/design/status-vocab.test.ts` | **0** |
| peso glyph in that file | **0** (built from `String.fromCharCode`) |
| After Task 2, the same command passes | **31 passed** |
| `npx eslint` / `npx tsc --noEmit` | 0 errors / exit 0 |

### Task 2

| Criterion | Result |
|---|---|
| `npx vitest run --config vitest.design.config.ts tests/design/status-vocab.test.ts` | **31 passed** — Task-1 red closed |
| `npx vitest run tests/group/state08-alerts.test.tsx` | **8 passed**, asserting exactly one `role="status"` per outcome and zero toast calls for both |
| `grep -c 'toast.success'` on `remove-attendee-button.tsx` / `regenerate-link-button.tsx` | **0** / **0**. The remaining `toast.error(res.error)` in each is the server-refusal channel and is deliberate — a refusal is not a fact to retain |
| `grep -c 'Booking cancelled.' src/components/booking/cancel-confirm.tsx` | **1**, at line 64 |
| `grep -ci refund src/components/booking/cancel-confirm.tsx` | **0** — comments included (see Deviation 3) |
| `card-pattern-coverage.test.ts` | **11 passed**, `git diff --stat` on it **empty** — zero new `ALLOWED_RAW_CARD` rows, zero `CARD_SURFACES` rows, no pinned number moved |
| `npm run build` | **exit 0** (lint + design gate + next build) |
| `git diff --stat src/components/group/share-link-box.tsx` | `79 +++`, **0 deletions**; no toast line appears in the diff |

### Plan-level

| Gate | Result |
|---|---|
| `npm test` | **147 files passed / 1 skipped; 1365 passed / 4 skipped** — exit 0 |
| `npm run test:design` | **43 files, 770 passed / 3 skipped** — exit 0 |
| `npm run build` | **exit 0** |
| `git diff --stat drizzle/` | **empty**; `ls drizzle/*.sql \| tail -1` → `drizzle/0025_audit_resolved_by.sql` (D-80 / GATE-06 intact) |
| `git diff --stat package.json package-lock.json` | **empty — zero packages** (T-13-05-SC discharged) |
| `git diff --stat tests/design/site-contacts.test.ts` | **empty — D-64 untouched** |
| `npx eslint` on all nine touched files | 0 errors |
| `npx tsc --noEmit` | exit 0 |

## The Watched Reds — verbatim

Four reds were observed. One was the plan's required Task-1 red; three were deliberate probes, each chosen to move a DIFFERENT assertion.

### 1. Task 1's required red — the four shipped calls

Run before a single line of source changed:

```
 FAIL  tests/design/status-vocab.test.ts > STATE-08 — no toast in the phase-13 file set carries
       a must-read fact > carries none of the must-read vocabulary, outside the one allow-listed file
AssertionError: a toast is carrying a fact the booker has to READ. […]: expected [ …(4) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "src/components/booking/cancel-confirm.tsx:46 — toast.success(…) — a money-return fact. […]",
+   "src/components/booking/refund-destination-form.tsx:78 — toast.success(…) — a money-return fact. […]",
+   "src/components/group/regenerate-link-button.tsx:68 — toast.success(…) — PLAN 13-05'S ADDITION […]",
+   "src/components/group/remove-attendee-button.tsx:67 — toast.success(…) — a capacity fact […]",
+ ]

 Test Files  1 failed (1)
      Tests  1 failed | 30 passed (31)
```

**Read the blast radius, not just the colour.** Exactly ONE of the 31 assertions moved. The guard-the-guard block (every root non-empty), the positive control (a non-zero toast count, both component trees reached by name), the allow-list checks, the seven fixture shapes and all thirteen DS-10 assertions stayed green in the same run — which is what shows the red is about the SOURCE and not about the file existing or the walker having broken.

**And the run says two things the plan did not predict.** It names a FOURTH file (Deviation 1). And on the very first version of this scan — the spec's six tokens, before the seventh row existed — it named only THREE, and `regenerate-link-button.tsx` was not one of them.

### 2. The plan's required mutation probe — a real banned toast, reintroduced

`toast.success("Removed. Their spot is free again.")` was put back into `remove-attendee-button.tsx`'s success branch, **beside** the new alert (the toast-plus-alert pair, i.e. the realistic regression). Both layers moved, and each moved on a different assertion:

```
 FAIL  tests/design/status-vocab.test.ts > … > carries none of the must-read vocabulary, outside the
       one allow-listed file
- []
+ [
+   "src/components/group/remove-attendee-button.tsx:104 — toast.success(…) — a capacity fact — how many
+     places are free. It changes who the organiser can still invite […]",
+ ]

 Test Files  1 failed (1)
      Tests  1 failed | 30 passed (31)
```

```
 FAIL  tests/group/state08-alerts.test.tsx > STATE-08 — the attendee-removed outcome is an in-page
       alert, not a toast > (2) after a removal renders EXACTLY ONE named status region, and dispatches
       NO toast
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times

Received:
  1st vi.fn() call:
    Array [
      "Removed. Their spot is free again.",
    ]
Number of calls: 1

 ❯ tests/group/state08-alerts.test.tsx:188:30
```

**Which assertion moved, and why it is the right one.** In the source gate it is the ban, reporting the new line number. In the render gate it is `expect(toastSuccess).not.toHaveBeenCalled()` — **not** the region count, which correctly stayed at 1 because a mocked toast renders no region. That is the honest division of labour between the two gates: the source scan is what catches the pair, and the render gate is what proves the spy is wired to the module the component actually calls. Restored → 31 passed / 8 passed.

### 3. Probe — the accessible name, removed

`aria-label={REMOVAL_REGION_NAME}` was deleted from the removal region and nothing else changed:

```
 FAIL  tests/group/state08-alerts.test.tsx > … > (2) after a removal renders EXACTLY ONE named status
       region, and dispatches NO toast
AssertionError: the removal region has no non-empty accessible name (live-regions rule 5): expected []
to have a length of 1 but got +0

- Expected
+ Received

- 1
+ 0

 ❯ tests/group/state08-alerts.test.tsx:182:7
```

**This is also a re-measurement, not only a probe.** The region still contained the whole sentence, and its computed accessible name was still `""` — which is 13-02's and `skeleton-a11y.test.ts`'s finding reproduced on a new surface: `role="status"` is `nameFrom: author`, so a region named only by its content is an unnamed region. The count assertion one line above stayed green, which is the correct blast radius: the region was there, it just had no name.

### 4. Probe — a second region for one outcome (T-13-05-DOUBLEANNOUNCE)

The alert block was duplicated so two `role="status"` elements rendered for one removal:

```
 FAIL  tests/group/state08-alerts.test.tsx > … > (2) after a removal renders EXACTLY ONE named status
       region, and dispatches NO toast
AssertionError: expected [ …(2) ] to have a length of 1 but got 2
```

An "exactly one" that has never been watched failing on two is indistinguishable from "at least one". This one fails on two. Restored → 8 passed.

## Deviations from Plan

### Auto-fixed

**1. [Rule 1 — Bug] A FOURTH STATE-08 violation the plan does not name: `refund-destination-form.tsx:78`**

- **Found during:** Task 1, on the first red.
- **Issue:** `toast.success("Booking cancelled. Your refund is on its way to your account.")` — the same defect as `cancel-confirm.tsx`, on the same flow's QR Ph branch (D-72's manual-transfer form), naming both the money and the destination account. No plan in this phase mentions the file.
- **Fix:** Reduced to `toast.success("Booking cancelled.")`, identically to `cancel-confirm.tsx` and for the identical reason: the next line navigates to `/bookings/{id}`, whose cancelled branch already renders D-79's durable wording. The alternative — allow-listing it — would have been the scan excusing the exact defect it exists to catch.
- **Commit:** `4c65ca1`.

**2. [Rule 3 — Blocking] `tests/group/group-lifecycle.test.ts` asserted `removeAttendee`'s result by exact equality**

- **Found during:** Task 2's `npm test`.
- **Issue:** `expect(await removeAttendee(…)).toEqual({ ok: true })` — a total equality that the two new fields break. Verbatim: `expected { Object (ok, attending, …) } to deeply equal { ok: true }`, received `{ attending: 2, ok: true, spotsFree: 1 }`.
- **Fix:** Widened to pin **both figures by value** with the reason at the line. This is the more valuable half of the change: it is the only place the arithmetic meets a real database. `capacity_snapshot` is 2, one of two `yes` rows was deleted → `spotsFree: 1` (independently proved by the very next line, which claims that seat), and `attending: 2` — the survivor **plus the organizer**, D-113's `+ 1` applied once. A `1` there would be WR-04's off-book count; a `3` would be the same increment applied twice.
- **Commit:** `4c65ca1`.

**3. [Rule 3 — Blocking] `cancel-confirm.tsx`'s own colour rationale tripped its own acceptance grep**

- **Found during:** Task 2.
- **Issue:** The criterion is *"no refund wording remains in that file"*. After the toast was reduced, one hit remained — a **pre-existing** line in the 07-UI-SPEC colour rationale: *"Red would misrepresent a refund the booker is contractually entitled to as a dangerous act."* A correct file, one word away from failing its own criterion. This is 13-01 Deviation 1 / 13-02 Deviations 2 and 3's exact shape, now for the fourth plan running.
- **Fix:** Reworded to *"money the booker is contractually entitled to getting back"* — every word of the reasoning survives — and the line now records that it said the word until this plan and that leaving it would have made the file's own grep read 1. `grep -ci refund` returns **0**. The same discipline is applied to the new STATE-08 header, which describes the action's amount field rather than naming it.
- **Commit:** `4c65ca1`.

**4. [Rule 2 — Missing critical functionality] The spec's six banned tokens do not reach one of the three violations the spec names**

- **Found during:** Task 1, on the first run of the scan.
- **Issue:** 13-UI-SPEC § STATE-08 states its falsifiable claim as six tokens — `refund` · `₱` · `spot` · `coming` · `no longer works` · `invite` — and, in the paragraph above, names `regenerate-link-button.tsx` as one of three corrections owed. Its shipped toast reads `New link ready. Copy it and share it again.`, which contains **none of the six**. Built to the spec's list alone, the scan named three files and that was not one of them — so the plan's acceptance criterion (*"MUST fail naming all three"*) was unsatisfiable, and more importantly the scan would have gone permanently green against one of STATE-08's own examples.
- **Fix:** A seventh row, two-piece encoded like the rest, whose `why` states that it is this plan's addition and records the measurement that produced it. The scan is strictly stronger than the spec's claim, never weaker, so 13-UI-SPEC's falsifiable statement is still satisfied. The addition is confined to that one row.
- **Commit:** `3741eb0`.

**5. [Rule 3 — Blocking] `removeAttendee` returned no counts, and the plan forbids computing them in the button**

- **Found during:** Task 2.
- **Issue:** The plan says *"the counts arrive from the same server response the action already returns"* and T-13-05-COUNTCROSS forbids client arithmetic. The action returned a bare `{ ok: true }`, so `src/app/actions/group.ts` — not in the plan's `files_modified` — had to change for the required copy to exist at all.
- **Fix:** A `RemoveAttendeeResult` type; the `SELECT capacity_snapshot … FOR UPDATE` result is now **read** rather than discarded (so `capacity` comes off the row the lock is held on, and a vanished group is caught *before* the delete rather than after it); a post-delete `count(*)::int` runs inside the same transaction. Both figures are finished when they leave the server.
- **Commit:** `4c65ca1`.

### Recorded judgements

**A. The organizer `+ 1` now lives at THREE sites, and both files that documented it as two were corrected in the same commit.**

`attendee-roster.tsx`'s header said *"The management page adds the organizer back ONCE"* and named two render sites. That sentence would have become false the moment `removeAttendee` returned an organizer-inclusive `attending`, and a stale invariant note is worse than none — it is the note the next author trusts.

The figure **has** to be organizer-inclusive: the alert renders directly beneath a meter reading `confirmed + 1` of `capacity + 1`, on a page whose audience is the organizer and whose roster puts them at row #1. A figure that left them out would contradict the meter four lines above it.

So the note was rewritten to state the invariant in its **checkable** form rather than as a count of sites: *all three increment the RAW count, and none of them increments each other.* That is the property WR-03 actually cares about — counting the same person twice — and it survives a fourth site, where "there are exactly two" would not. `spotsFree` is organizer-agnostic by construction: `(capacity + 1) − attending` is the same number as `capacity − confirmed`.

**B. `attendee-roster.tsx` became a client island, and the cost was measured rather than waved at.**

The header's *"Not `use client` — a pure presentational component"* is now false and says so. The three alternatives were worse: a callback into a server component is not a thing; a module-level store adds a second announcement mechanism to the page to move one sentence one level up; and rendering the alert from the page would need the page to know a removal just happened, which is the same state one level further out.

What crosses the boundary that did not before: **nothing**. `RemoveAttendeeButton` is already a client island taking `rsvpId` and `name` per `yes` row, and every field of a `RosterEntry` is rendered into the HTML this component emits regardless — an organizer's own DOM already holds all of it. No money crosses, so GATE-05 is untouched, and `server-only-guards.test.ts` is green.

**C. The rotation alert is derived, not pushed — and that is a stronger property, not a shortcut.**

`RegenerateLinkButton` renders below the roster; `ShareLinkBox` renders above it. Rather than thread a callback across the page (which would have meant editing `page.tsx` to host the wiring), `ShareLinkBox` announces when the `inviteUrl` **it renders** changes under it on the refreshed server read. Three consequences:

1. **It cannot lie.** A refused, rate-limited or failed regeneration leaves the URL untouched and announces nothing — where a callback fired on `res.ok` is one refactor away from announcing a rotation that did not land.
2. **D-118 is preserved exactly.** Nothing new carries the token; `regenerate-link-button.tsx` still never reads `res.accessToken`.
3. **It is true of any rotation**, including one performed on the organizer's other device and picked up by the D-84 poller. The old link is dead either way.

Case (7) pins the other direction: re-rendering with the SAME URL twice announces nothing, so the poller stays quiet.

**D. The alerts' accessible names are labels, not sentences.**

13-UI-SPEC requires a non-empty accessible name on both. `live-regions.ts` records the measured hazard that on the VoiceOver/Safari pairing a NAMED live region can be announced by its name **instead of** its content — so a name duplicating the sentence would read it twice and a name paraphrasing it would replace it with a worse version. `Attendee removed` and `Invite link updated` say which region this is; the sentence stays the content. The tension is recorded at both call sites rather than resolved silently.

**E. `card-pattern-coverage.test.ts` was not modified, and the condition for modifying it is false.**

Both alerts compose `PanelCard`; neither opens a raw `<Card>`. `attendee-roster.tsx` is already an `ALLOWED_RAW_CARD` row for its existing roster card and stays exactly one. Zero rows added, zero pinned numbers moved, `git diff --stat` on the file empty — 13-02's recorded judgement applies unchanged.

### Honesty notes — three greens that are NOT what they look like

1. **`src/app/(app)/bookings/**` contributes ZERO toast calls.** It is one of the scan's three declared roots because 13-UI-SPEC names it, and with respect to the ban it is a scan of nothing. What the suite can truthfully assert about it — and does — is that the walk **reaches** it (a non-zero file count), so a renamed route group is loud rather than silent. This is stated in the file's own `NOT COVERED` block, not just here.
2. **The apostrophe-normalisation pass is prophylactic, not load-bearing.** None of the seven rows contains an apostrophe today, so 13-04's measured failure mode cannot currently occur here. Rather than invent a row to make the helper look necessary, `normaliseCopy` is asserted **directly** against seven spellings, and the header says in as many words that the pass is carried for the row that has not been written yet.
3. **`tests/group/state08-alerts.test.tsx` says nothing about the server's arithmetic.** `removeAttendee` is mocked, and the fixtures deliberately use figures that are *not* derivable from the roster list, so a component that recounted its own rows fails on the number a person would have read. The arithmetic itself is pinned in `tests/group/group-lifecycle.test.ts`, against a real database — which is why Deviation 2 widened that assertion instead of merely repairing it.

## Threat Flags

None. This plan introduces no network endpoint, no auth path, no schema change and no new trust boundary beyond the two its own register names.

- **T-13-05-LOSTFACT** (Repudiation) — mitigated. The money sentence left both cancellation toasts; the destination they navigate to already renders it as durable page content on its cancelled branch, with D-79's two wordings (the amount and *on its way*, or the no-money-back sentence **with** its reason). Plan 13-10 moves that same line onto `<MoneyStatement/>`; nothing was lost in the interval, which was verified by reading the branch rather than assumed.
- **T-13-05-DOUBLEANNOUNCE** (Denial of Service) — mitigated **and proved**. Exactly one `role="status"` per outcome, counted; watched failing on a duplicated region (Watched Red 4) and on a reintroduced toast (Watched Red 2). Both regions carry a non-empty accessible name, computed through `dom-accessibility-api` and watched failing when the label was removed (Watched Red 3).
- **T-13-05-COUNTCROSS** (Tampering) — mitigated **structurally**. Both figures are computed server-side inside the transaction that performed the delete, from the row it holds the lock on. The client renders two numbers as text; the only judgement the sentence function makes is `1 spot free` vs `N spots free`. The RTL fixtures use numbers that cannot be derived from the roster the component holds, so a component that started counting rows fails on the rendered sentence.
- **T-13-05-SCANVACUITY** (Repudiation) — mitigated. Two-piece encoding on all seven rows (the one-character currency sign is built from its code point, and the exemption's size is itself asserted at one); every guard-the-guard fixture built from the encoding; a positive control asserting a non-zero toast count and both component trees reached by name; an allow-list row asserted to name a file that exists and still carries toasts; and the scan watched red four times.
- **T-13-05-SC** (supply chain) — discharged trivially. **Zero packages installed**; `package.json` and `package-lock.json` are byte-unchanged.

## Known Stubs

None. No hardcoded empty value, placeholder sentence, `TODO` or `FIXME` was introduced, and both alerts render real, server-sourced content on the only path that mounts them.

One **deferred item**, which is not a stub and is recorded in `.planning/phases/13-confirmation-bookings-trust/deferred-items.md`: `refund-destination-form.tsx`'s `toast.warning(res.notice)`. A `notice` means the cancellation succeeded but the manual transfer could not be dispatched — arguably a fact the booker must retain. It is a **server-composed** string rather than a literal, so the AST scan cannot see it in either direction (stated as a blind spot in the test), and deciding its surface means deciding its copy against D-83's two money truths — a copy decision on a surface this plan does not own.

## Requirements: deliberately NOT marked complete

The plan's frontmatter carries `requirements: [STATE-08]`, and **it was not marked complete.** STATE-08 is carried by two later plans in the same phase:

- **13-08** — the group page's design pass, which verifies the STATE-08 alert slot *in situ* on the rendered page (this plan asserts it at the component).
- **13-14** — the GATE-03 live-regions audit, which brings `bookings/[id]/group/page.tsx` out of `LIVE_REGION_EXCLUSIONS` and audits *"`group/page.tsx`'s two STATE-08 alerts"* by name, alongside every other region on the set.

Both alerts are therefore built and asserted, but neither has yet been audited by the gate that owns live regions, and neither has been seen on the assembled page. Checking the box now would put `Complete` in `REQUIREMENTS.md`'s traceability table for a requirement whose own falsifiable claims two later plans still have to satisfy. 13-02 set this precedent in this phase and it is followed here.

## Self-Check: PASSED

Files claimed created/modified, verified present on disk:

- `tests/group/state08-alerts.test.tsx` — FOUND
- `.planning/phases/13-confirmation-bookings-trust/deferred-items.md` — FOUND
- `tests/design/status-vocab.test.ts` — FOUND (modified)
- `src/components/booking/cancel-confirm.tsx` — FOUND (modified)
- `src/components/booking/refund-destination-form.tsx` — FOUND (modified)
- `src/components/group/attendee-roster.tsx` — FOUND (modified)
- `src/components/group/remove-attendee-button.tsx` — FOUND (modified)
- `src/components/group/regenerate-link-button.tsx` — FOUND (modified)
- `src/components/group/share-link-box.tsx` — FOUND (modified)
- `src/app/actions/group.ts` — FOUND (modified)
- `tests/group/group-lifecycle.test.ts` — FOUND (modified)

Commits claimed, verified in `git log`:

- `3741eb0` — FOUND
- `4c65ca1` — FOUND
