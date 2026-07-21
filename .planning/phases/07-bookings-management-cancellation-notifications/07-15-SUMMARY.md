---
phase: 07-bookings-management-cancellation-notifications
plan: 15
subsystem: cancellation-policy-choice-and-disclosure
tags: [cancellation, D-77, D-81, publish-gate, disclosure, rsc, ladder-derived, wizard]
requires:
  - LADDER
  - rungBoundaries
  - quoteRefund
  - composeDeadlineLabel
  - listing.cancellationPolicy
  - booking.cancellationPolicy
provides:
  - CancellationPolicyDisclosure
  - policyDisclosureLines
  - policySummaryLine
  - CancellationPolicyValue
  - CANCELLATION_POLICY_VALUES
  - publishSchema.cancellationPolicy
affects:
  - src/app/actions/listing.ts
  - src/lib/validation/listing.ts
  - tests/listing/status-gate.test.ts
  - tests/validation/listing-schema.test.ts
tech-stack:
  added: []
  patterns:
    - "Booker-facing policy copy DERIVED from the money constant it describes, never hand-typed — proven by mutating both directions"
    - "Native <details>/<summary> as an RSC-safe disclosure primitive: zero new blocks, zero client boundary, degrades without JS"
    - "New publish requirements join the SHIPPED checklist mechanism rather than inventing a blocked affordance"
    - "Index-aligned display props validated by length and thrown on mismatch, so a mis-paired tier can never render wrong dates"
key-files:
  created:
    - src/components/booking/cancellation-policy-disclosure.tsx
    - tests/booking/cancellation-policy.test.ts
  modified:
    - src/app/(host)/host/listings/[id]/edit/wizard.tsx
    - src/app/(host)/host/listings/[id]/edit/page.tsx
    - src/lib/validation/listing.ts
    - src/app/actions/listing.ts
    - src/app/listings/[id]/page.tsx
    - src/app/listings/[id]/book/page.tsx
    - tests/listing/status-gate.test.ts
    - tests/validation/listing-schema.test.ts
key-decisions:
  - "A NULL-tier listing renders NO disclosure rather than tierOrDefault's Flexible — that fallback is a legacy engine safety net, not a policy any host chose"
  - "Checkout discloses from the BOOKING's tier snapshot, not the listing's current tier — the same column quoteRefund reads"
  - "The wizard step TITLE deliberately differs from the checklist row label, keeping the label a unique grep target"
  - "policyDisclosureLines THROWS on a boundary-label/rung length mismatch rather than rendering dates from the wrong tier"
patterns-established:
  - "Copy-derivation tripwires verified by two-way mutation: move the constant (copy follows), hand-type the copy (test goes red)"
requirements-completed: [BOOK-07]
duration: ~50min
completed: 2026-07-21
---

# Phase 7 Plan 15: The Cancellation Tier — Host Choice & Booker Disclosure Summary

**The two human ends of the refund ladder: a host must explicitly choose a tier before publishing (server-enforced), and a booker sees that tier's actual rungs — as concrete dates for their own booking — before they pay.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 3
- **Files created:** 2 · **Files modified:** 8
- **Full suite:** 76 files / 628 tests, exit 0 (was 75 / 616)

## Why This Mattered

Phase 7 success criterion 2 requires the refund to follow *"the listing's NAMED cancellation policy tier"*. Every mechanism downstream of that name already existed — the ladder (07-03), the snapshot at creation (07-08), the quote and the cancel screen (07-09). Both **human** ends were missing. Before this plan the tier was an invisible column that silently decided how much money a booker got back: no host ever chose it, and no booker ever saw it.

## What Was Built

**Task 1 — the explicit choice, gated server-side** (`53ce7ac`).

The editor wizard gains a seventh step: three tier cards cloned from the Step-5 booking-mode `RadioGroup`, with **no card pre-selected**. The requirement joins the *shipped* publish checklist (`{ label: "Choose a cancellation policy", done: Boolean(values.cancellationPolicy), step: CANCELLATION_STEP }`) — `publishEligible = checklist.every(c => c.done)` picks it up with no other change, and the existing `Almost there — finish these to publish:` panel renders it with its `Fix` link like every other unmet row. No new blocked affordance was invented.

The gate itself is **not** the checklist. `publishSchema` now requires `cancellationPolicy` as an enum, and `publishListing` re-reads it from the **persisted row**, so a stale client, a client that never visited the step, or a crafted call all land on the same refusal. `draftSchema` stays permissive, which is what keeps pre-Phase-7 NULL-tier drafts saveable instead of stranded.

**Task 2 — one disclosure, two modes** (`14dd0f5`).

`CancellationPolicyDisclosure` is a Server Component using native `<details>`/`<summary>`. It mounts generic on the listing detail page (rungs relative to session start) and concrete at checkout (venue-local dates for this specific booking, derived server-side from `rungBoundaries` and formatted by the existing `composeDeadlineLabel` — no fifth time format). The non-refundable service-fee line is rendered unconditionally in both modes at every tier; there is no `{cond && …}` wrapper to remove.

**Task 3 — the proofs** (`05d719d`, `926517c`). 11 integration/derivation cases plus one schema case.

## The Central Guarantee, Verified by Mutation

The plan's real requirement is that **what a booker is shown is what the engine applies**. Every percentage, hour figure and rung ordering in the disclosure is derived from `LADDER` — the same constant `quoteRefund` evaluates. That claim was checked by mutating in **both** directions rather than asserted:

| Mutation | Result |
|---|---|
| **Move a rung** (`LADDER.standard` 100% rung 24h → 36h) | **1 failed / 10 passed.** Only case (5) — the deliberately hardcoded concrete-boundary check — went red. Cases (7)–(11) *followed the ladder automatically* and stayed green, which is the property being claimed. |
| **Hand-type the copy** (one interpolated `${rung.minHours}` replaced with a literal `24`) | **1 failed / 10 passed.** Case (7) went red immediately. A hand-typed disclosure cannot pass this file. |
| Both files restored | `git diff --quiet` confirmed empty before proceeding. |

Case (10) then closes the loop directly: for every tier, at every boundary the disclosure renders, standing exactly **on** the boundary must award the promised rung, and one millisecond later must award the next one down — asserted against `quoteRefund` itself, never against a restatement of it.

## The NULL-Tier Decision (D-77's deliberate no-default)

D-77 gives the tier no default, which means every listing created before this column carries NULL. Three surfaces had to agree on what that means, and they now do:

| Surface | Behaviour on NULL | Why |
|---|---|---|
| **Publish** | Refused, with a named calm error | A host must choose. This is the whole point of D-77. |
| **Draft save** | Allowed | The gate is on publishing, not creation — mirroring how *bookability* (not listing creation) is gated on payout-readiness. Pre-Phase-7 drafts are never bricked. |
| **Disclosure** | Renders **nothing** | See below. |

The disclosure deliberately does **not** fall back to `tierOrDefault`'s Flexible. That fallback is an internal safety net so the refund *engine* never faces an unpriceable row; it is not a policy any host chose. Presenting it as "this host's cancellation policy" would put a promise in the host's mouth they never made. Rendering nothing is the conservative failure, and it is safe in the only direction that matters: the booker is never shown terms that differ from the ones applied, and the fallback they'd actually receive (Flexible) is the *most* generous rung on the ladder — so no booker can end up worse off than what they were shown. **A disclosure that disagrees with `quoteRefund` is worse than no disclosure**; this is that rule, encoded in one branch and documented in-file.

After this plan NULL can only mean an unpublished draft (not bookable, 404 to the public) or a pre-Phase-7 published row.

## Decisions Made

| Decision | Choice | Why |
|---|---|---|
| Checkout's tier source | `booking.cancellationPolicy`, not `listing.cancellationPolicy` | The snapshot is the exact column `quoteRefund` later reads. Sourcing the display from the listing would let a host retiering between checkout and cancellation move terms the booker already saw (T-07-90). |
| NULL-tier disclosure | Render nothing | Above |
| Boundary/rung mismatch | `policyDisclosureLines` **throws** | Boundaries formatted for one tier and passed with another would disclose dates from a policy the booker isn't under — silently, and visible only to the booker. An error is strictly better than a wrong date. Same throw-don't-freeze discipline as the money modules. |
| Wizard step title | `What happens if a guest cancels?` | Matches the other steps' question voice, and keeps `Choose a cancellation policy` a *unique* string so a grep for the checklist row finds the row rather than a heading (the 07-04/07-09 tripwire discipline). |
| Disclosure primitive | Native `<details>` | The researcher's call: no `accordion`/`collapsible` installed; needs zero new blocks, zero client boundary, degrades without JS. |
| `policySummaryLine` with no 100% rung | Names the tier instead of promising "free cancellation" | A future ladder edit must not be able to make the summary promise something the ladder won't honour. |

## Deviations from Plan

No functional deviations. Three consequential adjustments, all direct results of the new requirement:

**1. [Rule 3 — Blocking] `edit/page.tsx` had to pass the tier through.**
Not in `files_modified`, but the wizard step is inert without it: the RSC builds `WizardListing`, so without this field the step would render permanently unselected and the checklist row permanently unmet even for a host who had chosen. Passed through **including null**, so an unchosen tier reaches the RadioGroup as unchosen.
**Committed in:** `53ce7ac`

**2. [Rule 1 — Bug] Two shipped test fixtures were no longer publish-eligible.**
`tests/listing/status-gate.test.ts` (`VALID_FIELDS`) and `tests/validation/listing-schema.test.ts` (`validPublish`) both describe themselves as *complete, publish-eligible* payloads and both lacked a tier, so three tests went red the moment the gate landed. These are not the gate misfiring — they are the gate working on fixtures that fell out of date. Both gained `cancellationPolicy: "standard"` with a comment recording why, and the schema file gained a negative case asserting an absent **and** an unrecognised tier are rejected while `draftSchema` stays permissive.
**Committed in:** `05d719d`, `926517c`

**3. Five test cases beyond the plan's six.** The plan's Task 3 lists six. Cases (7)–(11) were added because the plan's six prove the ladder is *correct* but not that the **disclosure follows it** — which is the actual claim this plan makes to a booker. (7) derivation, (8) summary derivation, (9) concrete mode + the mismatch throw, (10) disclosure-equals-enforcement at every boundary, (11) the service fee unrefunded at every tier including Flexible.

## Acceptance Criteria

| Criterion | Expected | Actual |
|---|---|---|
| `grep -c "Choose a cancellation policy"` in wizard | 1 | **1** |
| Three tier descriptions verbatim | 1 each | **1, 1, 1** |
| `defaultValue="flexible\|standard\|strict"` | 0 | **0** |
| `bg-brand` count vs. pre-change | no increase | **3 → 3** |
| `cancellationPolicy` in validation + action | ≥1 each | **5, 5** |
| `grep -c "use client"` in disclosure | 0 | **0** |
| `<details` / `<summary` present | ≥1 | **3 / 1** (one element each; the extra `<details` hits are header prose) |
| Service-fee line, unconditional | ≥1 | **1**, outside every tier/rung conditional (verified by reading — no `&&` wrapper exists) |
| `See cancellation policy` | ≥1 | **1** |
| `CancellationPolicyDisclosure` on both pages | ≥1 each | **2, 2** |
| `rungBoundaries` on the book page | ≥1 | **3** |
| New colour values in disclosure | 0 | **0** |
| `grep -ci publish` in the test file | ≥3 | **21** |
| `grep -c rungBoundaries` in the test file | ≥2 | **6** |
| `npm run build` | exit 0 | **exit 0** (with the pre-existing env placeholders — see below) |

## Verification Performed

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` (all 10 new/modified files) | 0 errors (1 pre-existing `form.watch()` React-Compiler warning in the wizard, unchanged from HEAD) |
| `npx vitest run tests/booking/cancellation-policy.test.ts` | **11 passed** |
| `npx vitest run tests/booking tests/payments` | **25 files / 267 passed** |
| `npx vitest run tests/listing` | **7 files / 50 passed** |
| `npx vitest run tests/validation` | **3 files / 44 passed** |
| **`npm test` (full suite)** | **76 files / 628 tests, exit 0** (was 75 / 616) |
| `npx next build` (bare) | **fails** — pre-existing env gap, see below |
| `npx next build` (with placeholders) | **exit 0**, 21 pages, all routes present |
| Ladder-derivation mutation, both directions | Red as designed; both files restored, `git diff` empty |

### A note on `npm run build`

A bare `npx next build` still fails at page-data collection with `PLATFORM_WALLET_NUMBER / PLATFORM_WALLET_NAME are not set`, then `INNGEST_SIGNING_KEY is required in production`. This is the **pre-existing** env gap logged in 07-06 and carried through 07-08/07-09 — the module-scope fail-closed guards throw because `next build` runs with `NODE_ENV=production`. Re-run with placeholder values for those four vars only and the build passes. Unchanged by this plan, still out of scope, re-logged below.

## Known Stubs

None. Both surfaces are wired end to end: the wizard writes a real column through the real autosave action, the publish gate reads that column from the persisted row, and both disclosure mounts read real tiers — the listing page from the listing, checkout from the booking's own snapshot — with boundaries computed from the frozen `startsAt`.

## Threat Register Status

| Threat ID | Disposition | How this plan discharges it |
|---|---|---|
| T-07-88 | mitigate | `publishSchema` requires the enum AND `publishListing` re-validates from the **persisted row**. Case (1) publishes directly through the action with a NULL tier and asserts refusal, unchanged status, and a null `publishedAt`. Case (2) is the positive control, so (1) cannot pass against an action that refuses everything. |
| T-07-89 | mitigate | The policy is surfaced on the listing page and at checkout with concrete dates, and checkout reads the same snapshot column the refund engine reads — so the terms shown are provably the terms applied. Case (10) proves the agreement at every boundary. |
| T-07-90 | mitigate | Checkout discloses from `booking.cancellation_policy`, never the listing. Case (4) retiers a published listing after a booking exists and asserts the listing moved, the booking's snapshot did not, and `quoteRefund` still prices the snapshot (50%, not Flexible's 100%). |
| T-07-91 | mitigate | The component returns `null` on a NULL tier — no empty shell, and no fallback policy. Documented at length in-file; such a listing is a draft (404 to the public) or a legacy row. |
| T-07-92 | mitigate | `rungBoundaries` is called in the RSC and formatted venue-local server-side; the component is a Server Component receiving finished strings and performs no date math and no money arithmetic. |
| T-07-93 | mitigate | `draftSchema` keeps the field optional and the column stays nullable. Case (3) asserts a NULL-tier listing still saves as a draft with its edits intact. |

## Threat Flags

None. This plan adds no network endpoint, no auth path, no file access and no schema change. The one trust boundary it touches — the publish action — was **tightened**, not widened: a listing that could previously go live with no cancellation terms now cannot.

## Deferred Items

- **`next build` requires four prod-guard env vars absent from `.env.local`** (`PLATFORM_WALLET_NUMBER`, `PLATFORM_WALLET_NAME`, `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`). Pre-existing; carried from 07-06 / 07-08 / 07-09. Not fixed here.

## For Downstream Plans

- **Anyone writing booker-facing refund copy:** derive it from `LADDER` and import `policyDisclosureLines` / `policySummaryLine`. Do not hand-type a percentage or an hour figure — `tests/booking/cancellation-policy.test.ts` case (7) exists to catch exactly that, and it was verified to catch it.
- **Anyone adding a publish requirement:** add a checklist row in the wizard *and* a field to `publishSchema` read from the persisted row. The checklist alone is never the gate.
- **Anyone rendering the policy on a new surface:** pass the tier from the **booking** wherever a booking exists, and from the listing only where none does. The two can legitimately differ, and the booking's is the one that gets paid.
- **07-16 (QRPh probe):** unaffected. This plan touches no rail logic.

## Task Commits

| Hash | Message |
|---|---|
| `53ce7ac` | feat(07-15): require an explicit cancellation tier to publish (D-77) |
| `14dd0f5` | feat(07-15): surface the cancellation policy pre-booking (D-81) |
| `05d719d` | test(07-15): prove the publish gate and that disclosure equals enforcement |
| `926517c` | test(07-15): pin the schema half of the D-77 publish gate |

## Next Phase Readiness

Wave 4 is complete apart from 07-16 (the gating QRPh probe, which is independent). ROADMAP SC#2's "named cancellation policy tier" now has both a chooser and a disclosure, and BOOK-07 is closed. No blockers.

---
*Phase: 07-bookings-management-cancellation-notifications*
*Completed: 2026-07-21*
</content>

## Self-Check: PASSED

All 11 claimed files verified present on disk and all 4 commit hashes verified in `git log`.
