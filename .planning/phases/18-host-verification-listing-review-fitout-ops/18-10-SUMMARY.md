---
phase: 18-host-verification-listing-review-fitout-ops
plan: 10
subsystem: ops-console-ui
tags: [ops, design-system, row-card, responsive-dialog, live-regions, radio-group, enforcement, d-233, d-241, mutation-testing]

# Dependency graph
requires:
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 05
    provides: "`loadReviewQueue`'s `OpsQueueItem` discriminated union, the two reject taxonomies as complete host-readable SENTENCES, and the five self-gating decision actions the controls call"
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 08
    provides: "`loadOpsCancelImpact`'s pre-formatted figures, `opsCancelSchema`'s two-member lever with the LIGHTER one as its default, and `cancelBookingAsOps` — which re-asserts the escalation server-side"
  - phase: 11-design-system-patterns
    provides: "`RowCard` (the second of exactly three card containers, with its `children` body slot) and `ResponsiveDialog` (the ONE overlay primitive, a bottom sheet below `sm:`)"
  - phase: 12-listing-detail
    provides: "`PhotoGallery` — the six mosaic templates, `COLLAPSED_GRID`, the alt strings and the full-screen lightbox, reused VERBATIM at zero new photo code"
  - phase: 14-host-tooling
    provides: "`request-row.tsx` — the transposition source: the `<dl>` idiom, `ROW_VALUE_CLASS`, the touch-target argument, and the ONE-named-refusal-region shape that replaced two toasts"
provides:
  - "`src/components/ops/ops-queue-row.tsx` — the terminal RowCard adopter over the { host | listing } union, one tree at every width, every evidence field on screen (OPS-04, row half)"
  - "`src/components/ops/ops-decision-actions.tsx` — Approve as a neutral solid one press, Reject as an overlay that can never be one, and the one NAMED refusal region carrying the server's own sentence"
  - "`src/components/ops/ops-reject-dialog.tsx` — the taxonomy Select, the bounded Textarea, the ALWAYS-rendered impact block, the conditional escalation RadioGroup and the confirm whose accessible NAME carries the booking count (OPS-05 input half, ENF-01)"
  - "`OpsCancelImpact.cancellableBookingIds` — the ids the escalation fans out over, from the SAME predicate in the SAME statement as the count the operator reads"
  - "card-pattern-coverage `EXPECTED_SURFACES` 21 → 22 (adopted 19 → 20); live-regions `LIVE_REGION_FILES` 28 → 29 with the membership rule widened to name the internal ops surface"
affects: [18-12 (the /ops route, which now owes loadOpsCancelImpact per listing row and four server-formatted labels as COMPILE errors), 18-14 (the phase evidence)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A confirm button whose ACCESSIBLE NAME carries the count it acts on — the anti-muscle-memory device, and the reason the label is dynamic rather than a static Confirm under a radio"
    - "An impact block rendered UNCONDITIONALLY so that choosing reveals nothing — which is what removes the need for a live region on a money-moving overlay"
    - "A GENERIC overlay over its own taxonomy tuple, so the value it hands back is typed as a member of the caller's enum — which is what makes a client-authored fallback refusal sentence unnecessary rather than merely discouraged"
    - "Finished-string props as the enforcement of zero client arithmetic: a component that never receives a number cannot divide one"

key-files:
  created:
    - src/components/ops/ops-queue-row.tsx
    - src/components/ops/ops-decision-actions.tsx
    - src/components/ops/ops-reject-dialog.tsx
    - tests/ops/ops-queue-row.test.tsx
    - tests/ops/enforcement-dialog.test.tsx
  modified:
    - src/lib/ops/cancel-impact.ts
    - src/lib/design/live-regions.ts
    - tests/design/live-regions.test.tsx
    - tests/design/card-pattern-coverage.test.ts

key-decisions:
  - "The plan's task order was executed 3 → 2 → 1, because task 1's row imports task 2's actions which import task 3's dialog — the stated order commits a file whose import does not exist"
  - "`loadOpsCancelImpact` gained `cancellableBookingIds` from the same aggregate under the same filter: without it the escalation radio collects a choice and discards it, which is a control that appears to work"
  - "The row takes FINISHED labels (`waitLabel`, `submittedLabel`, `accountSinceLabel`, `priceLabel`) and a REQUIRED `impact`, so 18-12's obligation is a compile error rather than a note"
  - "The reject dialog is GENERIC over its taxonomy tuple, which is what removes the need for a client-authored refusal sentence on the impossible narrowing branch"
  - "The spec's single zero-bookings sentence became TWO, because \"this listing has never been sold\" is FALSE for a listing whose every confirmed booking was already paid out"
  - "The confirm pluralises — `Reject and refund 1 booking` — because ungrammatical copy on the phase's single most important control is worse than a literal reading of a template"
  - "No client-side `router.refresh()` was added: `revalidatePath('/ops')` is 18-12's, dated at the site, and papering over it here would be this file taking a decision that belongs to the route"

patterns-established:
  - "Pattern 1: put the count in the accessible NAME of the button that acts on it — a role query then pins the anti-muscle-memory device, and a mutation that changes the default lever fails FOUR extra cases because the name moves with it"
  - "Pattern 2: render the consequences unconditionally rather than on selection — the operator reads before choosing, nothing appears in response to an action, and the surface owes no live region"
  - "Pattern 3: when a spec sentence can be false in a reachable state, split it rather than render it — and say at the site which state each half is true in"

requirements-completed: [ENF-01]

# Metrics
duration: 55min
completed: 2026-09-01
---

# Phase 18 Plan 10: The Ops Queue Row & Decision Controls Summary

**An ops reviewer can now see everything needed to decide on one terminal row at any width — photographs included — and the one control that moves money takes three deliberate acts to reach, shows its figures before the choice is made, and says how many bookings it cancels in the name a screen reader reads off it.**

---

## ⚠ THE FINDING THAT MATTERS: THE ESCALATION HAD NOTHING TO ACT ON

**This is the one thing to read if you read nothing else, and it is a gap in the plan rather than in the code it inherited.**

`cancelBookingAsOps` cancels **one** booking. That is not an oversight in 18-08 — it is why that plan gave the action the **30/60s ops budget** rather than the 5/60s money budget its neighbours use, in its own words: *"one operator decision fans out over every booking on a listing, and 5 would leave a fake listing HALF-cancelled."* The fan-out was always the design.

But `loadOpsCancelImpact` returned **counts and finished strings only**. 18-10's `<interfaces>` block names exactly three things — `loadReviewQueue`, `loadOpsCancelImpact`, and the taxonomies — and none of them can name a booking. So a confirm button reading `Reject and refund 4 bookings` had **nothing to call**.

Left as written, the escalation radio would have collected a choice and discarded it: the listing would have been rejected, the four bookings would have stood, and the operator would have been shown a success. That is precisely the shape 18-UI-SPEC forbids by name — *"never a silent no-op, never a control that appears to work."*

**What was done (Rule 2):** `OpsCancelImpact` gained `cancellableBookingIds`, produced by `json_agg(booking_id ORDER BY booking_id) FILTER (WHERE NOT payout_left)` **in the same aggregate, under the same filter, one line from the count it must agree with**. A second query for the ids would have been the restatement 18-04's finding warns about, one query later — and the failure mode is specific: a count the operator reads and a set the console acts on that disagree would make the dialog a lie in exactly the direction nobody checks.

`OpsDecisionActions` fans out over it, **attempting every id even after one refuses**, and surfaces the **first** refusal. Stopping at the first would leave the rest of a confirmed-fake listing's bookings standing for a reason that had nothing to do with them — and would make the retry a second rejection of a listing that is no longer `pending`, i.e. a dead end rather than a retry.

---

## What each of the three components is, and what it refuses to be

### `ops-queue-row.tsx` — terminal, one tree, no fabricated affordance

| Decision | What was done | Why it is a decision rather than an inheritance |
|---|---|---|
| `href` | **absent** | The row is TERMINAL. `RowCard`'s slot is optional, so a destination is a one-word edit nothing objects to — and a detail page you click into to see the photos is precisely what OPS-04 and D-246 forbid. Pinned as a rendered fact: **zero anchors and zero link-role elements, asserted on BOTH kinds**, with the router link stubbed to a plain anchor so a re-added destination shows up as one. |
| `media` | **absent** | The pattern's media box is a 48px square, which is useless as evidence of whether a space is real — the entire question this queue exists to answer. The pattern omits the box rather than drawing an empty one, so `PhotoGallery` goes in the **body** instead. |
| photos | `PhotoGallery`, **verbatim** | Zero new photo code. The six templates, the alt strings, the collapse below `sm:` and the full-screen lightbox are all shipped and already pinned by `tests/listing/photo-gallery.test.tsx`. At the 320px floor the mosaic collapses to the hero at 16/9 plus `Show all N photos` into a full-screen lightbox — a strictly better inspection surface on a phone than five thumbnails. |
| the second tree | **there is none** | A deliberate departure from `/host/requests`. A viewport-conditional twin renders every photo **twice in one document** on the one surface where the photographs are the point, and a six-column table cannot carry a mosaic anyway. Zero viewport reads of any kind under `src/components/ops/**`. |
| a host row's documents | **nothing at all** | No panel, no empty state for one, **no disabled control suggesting one is coming**. All three shapes asserted as absences, plus a word-boundaried scan of the row's whole text. `OpsQueueHostItem` has no field for a document because the column does not exist (HVER-02 / D-206 / D-220), so the type is the first guard and these assertions are the second. |
| the wait figure | the row's **only** promoted element | Loudest is scale and position, never a hue. The heading role appears **exactly once** in the row and it is the wait figure; every `<dd>` computes one shared value class, so the equality is a fact about one constant rather than an accident of five similar ones. |

### `ops-decision-actions.tsx` — the weights are the design

- **Approve** — neutral **solid**, inline, one press, no overlay, **no reason field**. Never the brand variant: an ops reviewer approving forty listings must not be nudged toward yes by a colour.
- **Reject** — outline, and it can **never** be one press, because a rejection needs a reason.
- **The escalation** — not a control here at all.
- **One** status region per row, shared by both paths, **mounted only while a refusal exists**, carrying the server action's own sentence verbatim, named `Decision not recorded` — a **label, not a second copy of the sentence**, on `share-link-box.tsx:109-121`'s measured VoiceOver/Safari grounds.

### `ops-reject-dialog.tsx` — three deliberate acts, and a label that names the number

| Element | Behaviour |
|---|---|
| the reason | A `<Select>` of **complete host-readable sentences**, never codes. What is stored is the sentence. |
| the note | `maxLength` from the schema's own `REJECT_NOTE_MAX`, a **static** hint (a counter would be a live region, and a live region for a character count is noise on a surface with one announcement to make), and **required** under the free-text member — re-gating the confirm exactly as the server's own `.refine` does. |
| the impact block | **ALWAYS rendered.** The operator reads the money BEFORE choosing, so choosing changes nothing on screen and **no live region is needed**. |
| D-241 | `Can't be undone here` renders only above zero and **carries the reason**. |
| the lever | A `RadioGroup` rendered **only when there is something to cancel** — an option that does nothing is a trap, not a choice. The lighter lever is checked **on every mount**; the dialog remembers nothing, and it resets on **both** edges rather than only on close. |
| the confirm | `Reject listing` under the default; `Reject and refund {N} bookings` under the escalation, in **alarm INK** (`variant="outline"` + the token) — **never a solid fill**. |

---

## The inventories: what moved, what did not, and the red watched before each number

### MOVED — and every red observed with the row in and the number stale

| Inventory | Before → After | The red, verbatim |
|---|---|---|
| `tests/design/card-pattern-coverage.test.ts` · `EXPECTED_SURFACES` | **21 → 22** | `AssertionError: the declared card-surface inventory is not the size the UI-SPEC's three 'Replaces' lists describe…: expected 22 to be 21` |
| …its **adopted** half (a separate pin) | **19 → 20** | `AssertionError: expected [ … ] to have a length of 19 but got 20` — and it said this **alone** on the second run, after `EXPECTED_SURFACES` moved, which is the whole reason the two pins are separate |
| `src/lib/design/live-regions.ts` · `LIVE_REGION_FILES` | **28 → 29** | `src/lib/design/live-regions.ts(1910,3): error TS2344: Type 'false' does not satisfy the constraint 'true'.` (exit 2, one error, `tsc` run **bare**) |
| …its second pin in `tests/design/live-regions.test.tsx` | **28 → 29** | `AssertionError: the declared set is 29 files, not 28…: expected 29 to be 28` (1 failed / 25 passed) |

Plus: the compile alias renamed to `…IsTwentyNine` (0 occurrences of the old name in either file), one `LIVE_REGION_IDS` entry, one `LIVE_REGIONS` row of kind `status` / rule 1, and one `AUTHOR_NAMED_REGIONS` entry for `Decision not recorded`.

**The membership rule was widened IN WORDS**, in the same commit. This is the first **staff-only** file in that set, and a closed union that contains an ops file cannot keep a rule asserting it contains none. The widening is not a formality and it does not create a carve-out: 18-UI-SPEC states that there is no *"it's only for staff"* exemption anywhere in `tests/design/**`, and the ops region is inside the audited set rather than beside it.

⚠ **The procedure ran in the inverse order to observed reds (d) and (e)**, and that is recorded at the site rather than glossed: the path, the row and both entries went in together and the two pins were then **staled back to 28** to watch them speak. That measures the same property. It does **not** measure (d)'s claim about SCAN 2 reporting a present-but-undeclared region, so **that half is not claimed** — it was measured twice already and nothing about it changed.

### DID NOT MOVE — asserted, not assumed

`git diff --exit-code` succeeded on **all five**:

| Inventory | Stays at |
|---|---|
| `src/lib/design/accent-uses.ts` | **10** — no coral on any ops control. `AccentUseCountIsTen` is a compile constraint and it was never approached. |
| `src/lib/design/selector-contract.ts` | **unchanged** — **no `data-testid` was added anywhere under `src/components/ops/**`**. Every interactive element is reachable by `getByRole`, and every structural container the specs need already carries a declared id from the pattern it composes. |
| `src/lib/design/contrast-pairs.ts` | **unchanged** — every colour used is an already-declared pair, including the destructive-on-card ink at 5.76:1. |
| `src/lib/design/status-tones.ts` | **4 tones** |
| `src/lib/design/visual-baselines.ts` | **78 baselines** — `/ops` owes no screenshot pair (PROJECT D-138). |

`ALLOWED_RAW_CARD` is **unchanged** too, and that is the content of the decision rather than a side effect: the ops row composes the pattern from its first commit, so there was never an exemption to delete and there is no allow-list → inventory transition to record.

---

## The mutation RED (watched, observed, reverted)

**Mutation:** make the **escalation** the default lever — both the `useState` initialiser and the reset in `handleOpenChange`.

**Observed: 5 failed / 11 passed.**

```
× case 1 — the name carries the booking count when the escalation is selected, and does not when it is not
× case 3 — the lighter lever is checked on first open, and again after a close and a reopen
× case 4 — the confirm is disabled until a reason is chosen
× case 5 — choosing the free-text member makes the note REQUIRED, and re-gates the confirm
× case 5d — the confirm hands back the sentence, the raw note and the chosen lever

AssertionError: expected 'false' to be 'true' // Object.is equality
```

**⚠ It took FOUR cases beyond the one it was aimed at, and that is the design working rather than a brittle suite.** Cases 4, 5 and 5d query the confirm **by its accessible name** (`Reject listing`). With the escalation defaulted, that button no longer exists — it is called `Reject and refund 4 bookings`. The dynamic label is not decoration: it changes what the control *is called*, which is exactly what makes a defaulted escalation impossible to ship quietly.

Reverted with the counts restored to **16/16 passed**, and `grep` confirms both sites read the lighter lever again.

---

## Verification

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npx vitest run tests/ops/ops-queue-row.test.tsx` | **12/12 passed** |
| `npx vitest run tests/ops/enforcement-dialog.test.tsx` | **16/16 passed** |
| `npx vitest run --config vitest.design.config.ts` over card-pattern-coverage + live-regions + one-tree + leak + responsive-dialog-autofocus | **green** |
| `npm run test:design` (run **alone**) | **72 files / 1311 passed / 3 skipped** — baseline 1310; the **+1** is the derived adopter census in `responsive-dialog-autofocus.test.tsx` registering the new overlay as its own named case |
| `npm test` (run **alone**) | **205 files / 2453 passed / 5 skipped** — baseline 203 / 2425 / 5, so **+2 files and +28 cases**, exactly this plan's two spec files (12 + 16) |
| `npx eslint` on all new + modified source | **exit 0** |

Pre-existing and not this plan's: the `[test-db] LEAKED WRITES` block naming `notify` and `guest-email`; the three red e2e specs already in `deferred-items.md`.

### The acceptance greps

| Check | Result |
|---|---|
| viewport reads under `src/components/ops/**` | **0** in all three files |
| `data-testid` under `src/components/ops/**` | **0** in all three files |
| raw hex / arbitrary px | **0** in all three files |
| raw card container | **0** in all three files |
| brand variant | **0** in all three files |
| solid alarm variant | **0** in all three files |
| the alarm-ink token in the dialog | **exactly 1** |
| vendored overlay module imported directly | **0** |
| status regions in `ops-decision-actions.tsx` | **exactly 1** |
| money arithmetic in the dialog | **no match** |
| the old compile-alias name | **0** in both files |
| `Decision not recorded` declared | **1** |

---

## Deviations from Plan

### 1. [Rule 3 — Blocking] The three tasks were executed 3 → 2 → 1

- **Found during:** Task 1, at the first commit.
- **Issue:** The plan orders the queue row first. But the row imports `OpsDecisionActions` (task 2), which imports `OpsRejectDialog` (task 3). Committing task 1 first means committing a file whose import does not exist — `tsc` red, the task's own `<verify>` unrunnable, and a commit that does not build sitting permanently in the history.
- **Fix:** the same three tasks, the same three commits, in dependency order: the dialog (`3b3e810`), the decision controls (`90e1c75`), the row (`4b1476b`). Each commit typechecks and each one's own spec is green at that commit.

### 2. [Rule 2 — Missing critical functionality] `loadOpsCancelImpact` gained `cancellableBookingIds`

See **the finding at the top of this document**. Without it the escalation radio is theatre.

- **Files:** `src/lib/ops/cancel-impact.ts` (outside the plan's `files_modified`) · **Commit:** `3b3e810`
- **Blast radius:** one field added to a type and one aggregate expression added to an existing statement. `tests/payments/ops-cancel.test.ts` asserts field by field rather than on the whole object, so it is untouched and green.

### 3. [Rule 2 — Missing critical functionality] The row takes finished labels and a required `impact`

- **Issue:** `loadReviewQueue` returns **raw centavos** for the rates and `Date` objects for the clocks. Formatting either in a client render breaks two rules at once — PROJECT D-130 / GATE-05 for the money, and the shipped `whenLabel` idiom for the dates (a viewer's clock and locale must not decide what a queue row says). The plan's `<interfaces>` named no such props.
- **Fix:** `OpsQueueRowItem` intersects the domain item with `waitLabel`, `submittedLabel`, `accountSinceLabel` / `priceLabel`, and — on a listing — a **required** `impact`. An optional impact would let a page render a listing row whose reject dialog silently had no money block and no lever.
- **Consequence, stated deliberately:** **18-12 cannot compile without calling `loadOpsCancelImpact` per listing row and formatting four labels server-side.** That is the intended cost — an obligation the type system states beats one a summary states.

### 4. [Rule 1 — Bug] The confirm pluralises

- **Issue:** 18-UI-SPEC's copywriting contract reads `Reject and refund {N} bookings`. The escalation radio only renders above zero, so N ≥ 1 — and at N = 1 the literal template reads *"Reject and refund 1 bookings"* on the phase's single most important control.
- **Fix:** the count and its noun agree, everywhere the count is rendered (the confirm and both radio sub-labels). Asserted at N = 1 and N = 4.

### 5. [Rule 1 — Bug] The zero-bookings sentence is two sentences

- **Issue:** 18-UI-SPEC gives one sentence for the zero case — *"No bookings to undo — this listing has never been sold."* But `cancellableCount` and `notCancellableCount` move **independently**: a listing whose every confirmed booking has already been paid out reads zero cancellable and non-zero not-cancellable. The spec's sentence is then **false**, on the one screen whose job is to be accurate about what has and has not happened.
- **Fix:** the never-sold claim is made only when **both** counts are zero. Otherwise the narrower true sentence renders beside the `Can't be undone here` row that explains it. Asserted in both directions.

### 6. [Rule 1 — Bug] The dialog is generic over its taxonomy

- **Issue:** a non-generic dialog hands back a widened `string`, so the caller must narrow it back to `HostRejectReason` / `ListingRejectReason` — and the impossible branch of that narrowing needs a sentence. Any sentence written there would be a **client-authored refusal**, which is the one thing this surface's own rule forbids.
- **Fix:** `OpsRejectDialog<TReason extends string>` takes the taxonomy tuple and returns a member of it. The narrowing branch does not exist, so neither does the sentence.

### 7. Acceptance-grep hygiene — the landmine, hit twice

**(a) The adopter census went RED against a correct implementation.** `responsive-dialog-autofocus.test.tsx` polices its adopters by scanning their **source** for the focus-hook prop's name — and the dialog's header explained, at length, that it deliberately does not pass it. Measured, not predicted: `× src/components/ops/ops-reject-dialog.tsx does not mention the new prop`. This is the **sixth** instance of that shape in this repository and the first against a **derived** census, which is what made it arrive without warning: the file was not on any list, so nothing said it would be scanned. The paragraph now describes the prop instead of naming it, and says why.

**(b) A backtick in a SQL comment inside a tagged template.** `TS1005: ',' expected` — the same defect 18-08 paid for four times, arriving again in the first SQL edit made after reading that summary. Caught by `tsc` before the commit; the comment now says so at the site.

---

## Known Stubs

**None.** Every control on these three components acts, and every value rendered is a value the component was given. The two deliberate gaps are both **dated and owned**, and neither is a placeholder:

- **The queue does not clear itself after a successful decision.** `ops-review.ts` does not `revalidatePath("/ops")`, deliberately, because the route does not exist until 18-12 — 18-05's own summary carries that as a named obligation. No client-side `router.refresh()` was added to paper over it: that would be this file taking a decision that belongs to the route. Until then a successful decision reports through its toast and a second press is refused calmly by the action's own guard, with the sentence landing in the row's one region.
- **`OPS_QUEUE_ROW_HEIGHT` and the 320px status-column cap are not declared here.** `measurements.ts` is 18-12's file and both numbers must be **measured off a rendered route**, which does not exist yet.

---

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: data-crossing-boundary | `src/lib/ops/cancel-impact.ts` | `cancellableBookingIds` is a **new field crossing the server → client boundary**: a list of booking ids now reaches a client island. It is inside the plan's own `<threat_model>` in effect (T-18-1003's snapshot boundary) but it is a widening of what crosses, so it is flagged rather than assumed. Mitigations already in place: the surface is staff-gated three ways (D-247), the ids are opaque, and **the server re-parses every one of them** — `cancelBookingAsOps` re-scopes each booking to `listingId` in its own `WHERE` and re-checks the payout guard, so a tampered id cancels nothing it should not. The list is a SNAPSHOT and is authoritative for nothing. |

No new endpoint, no new auth path, no schema change, and **no package was installed** (T-18-SC — all nine primitives touched were already vendored, and `components.json` still declares `"registries": {}`).

---

## Carried forward

- **18-12 owes two things the compiler will now demand**, not remind: `loadOpsCancelImpact(db, listingId)` per listing row, and the four server-formatted labels (`waitLabel`, `submittedLabel`, `accountSinceLabel` / `priceLabel`). The page's own plan does not mention either.
- **`revalidatePath("/ops")` is still absent from all five ops actions and from `cancelBookingAsOps`.** 18-05 dated it to 18-12; this plan did not move it, and the row's header says so.
- **`OPS_QUEUE_ROW_HEIGHT` must be MEASURED**, and the 320px status-column squeeze decided by measurement. The wait figure is short (`Waiting 6 days`), so `OPS_QUEUE_STATUS_CAP` may prove unnecessary — but that is a reading to take at 320px, not from here, and `REQUEST_STATUS_CAP` must not be reused whatever the answer.
- **The escalation's fan-out is N server actions against a 30/60s budget.** A listing with more than 30 cancellable bookings would exhaust it mid-fan-out; the first refusal is shown and the rest are attempted, so the failure is visible and partial rather than silent — but a listing that large is untested. Worth a bounded batch in a later plan if the catalogue ever produces one.
- **`declinedCopy`'s `'ops'` branch is still latent, not live** (carried from 18-08, unchanged by this plan).

---

## Commits

| Hash | Message |
|---|---|
| `3b3e810` | `feat(18-10): the reject dialog — bounded reason, always-visible money, a label that names the number` |
| `90e1c75` | `feat(18-10): the decision controls and the one named refusal region` |
| `4b1476b` | `feat(18-10): the queue row — terminal, one tree, everything on the same screen` |

## Self-Check: PASSED

All ten created/modified files verified present on disk; all four commits (`3b3e810`, `90e1c75`, `4b1476b`, `27e1e27`) verified in `git log`; working tree clean.
