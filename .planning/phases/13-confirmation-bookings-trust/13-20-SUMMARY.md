---
phase: 13-confirmation-bookings-trust
plan: 20
subsystem: ui
tags: [trust, payment-states, copy-contract, money-truth, webhook-authority, tripwire, url-decay, uat]

# Dependency graph
requires:
  - phase: 13-confirmation-bookings-trust
    plan: 07
    provides: "the pending state's three-threshold copy structure and its FROZEN poller mechanics — this plan rewrites the copy and proves the mechanics unmoved by filtered diff"
  - phase: 13-confirmation-bookings-trust
    plan: 04
    provides: "reversed-copy.test.ts — the two-piece phrase encoding, the apostrophe fold and the two-pass scan, inherited rather than rediscovered"
  - phase: 13-confirmation-bookings-trust
    plan: 11
    provides: "ConsumePaidParam and D-89's mount rule — widened here without being relaxed"
  - phase: 13-confirmation-bookings-trust
    plan: 10
    provides: "detail-completeness.test.tsx's ten-render table, which is where the D-103 mount points become a per-status count"
  - phase: 13-confirmation-bookings-trust
    plan: 19
    provides: "the measured finding that a test asserting text and roles cannot see a defect the text shares — restated here for a claim rather than for an animation"
provides:
  - "13-CONTEXT D-102 — the pending surface states FitOut's knowledge and never the money's arrival; four sentences replaced, including two inherited from plan 05-03"
  - "tests/design/pending-copy.test.ts — eleven receipt-assertion forms banned over the whole surface, comments included, watched failing twice"
  - "payment-states.test.tsx case (9) — the same forms over the RENDERED tree, covering the runtime-template hole a source scan admits to"
  - "13-CONTEXT D-103 — ?paid=1 decays on every branch where it is INERT, closing five stranding landings, with D-89 asserted as a count for the first time"
  - "detail-completeness.test.tsx's `consumesParam` column — the mount point of a null-rendering component, per status, in both directions"
  - "The finding that the plan's own sanctioned claim (`your booking is held`) is unverified on the open-capacity path, and was dropped rather than kept"
affects: [13-verification, 13.1-payment-reconciliation, 14-host-side-bookings, 15-transactional-email, 17-milestone-close]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Knowledge-state copy: on a surface that renders while an authority is still outstanding, every sentence must be true under BOTH outcomes — checked one sentence at a time, never as an inherited block"
    - "Two-layer copy guard: a source scan (comments included, catches the defence-in-a-comment) plus a rendered-text scan (catches template-composed copy the source scan admits it cannot see)"
    - "A null-rendering component's MOUNT POINT becomes assertable by mocking it to a countable footprint — the property is where it is mounted, not what it draws"
    - "Widen a prohibition by restating what it was actually about: D-89 was never 'confirmed only', it was 'only where the parameter is inert'"

key-files:
  created:
    - tests/design/pending-copy.test.ts
  modified:
    - src/components/booking/pending-payment-state.tsx
    - src/components/booking/consume-paid-param.tsx
    - src/app/(app)/bookings/[id]/page.tsx
    - src/lib/design/live-regions.ts
    - tests/booking/payment-states.test.tsx
    - tests/booking/detail-completeness.test.tsx
    - e2e/shell.spec.ts
    - e2e/confirmation-decay.spec.ts
    - .planning/phases/13-confirmation-bookings-trust/13-CONTEXT.md
    - .planning/phases/13-confirmation-bookings-trust/13-UI-SPEC.md
    - .planning/phases/13-confirmation-bookings-trust/13-UAT-LOG.md
    - .planning/phases/13-confirmation-bookings-trust/deferred-items.md

key-decisions:
  - "13-CONTEXT D-102 — the pending surface may not assert a payment FitOut has not verified; it corrects copy inherited from plan 05-03 (c07c804)"
  - "D-102 — the comment that defended the claim was itself the defect, and was rewritten rather than deleted so it cannot re-teach the error"
  - "D-102 — `your booking is held` was dropped despite being sanctioned: verified for exclusive listings, NOT for open capacity, where the seat hold needs expires_at > now()"
  - "D-102 — no swing to denial either: STATE-05 forbids an error affordance while the webhook is outstanding, and the booker very probably did pay"
  - "D-102 — D-71 is strengthened, not weakened: the reason not to offer a retry was never that the money is here, it is that nobody knows"
  - "13-CONTEXT D-103 — the parameter is consumed wherever it is INERT (no predicate reads it, no poller runs, no redirect re-enters), never on pending"
  - "D-103 — requested and approved are deliberately excluded: neither is terminal, and an approved hold's next step is the checkout that appends the parameter"

patterns-established:
  - "Presence is not truth: a test that pins a string proves the string is there, never that it is true — the ban is the other half and it has to be written separately"
  - "Audit sibling clauses, not just the headline claim: the presupposition survives a rewrite of the sentence that carried it"
  - "A prohibition stated as a place ('confirmed only') rots; stated as a property ('where it is inert') it widens safely"

requirements-completed: []

# Metrics
duration: 32 min
completed: 2026-08-22
---

# Phase 13 Plan 20: The Fourth Unverified Money Claim Summary

**The one surface that renders while the confirm authority is still outstanding stops telling bookers their money arrived — it now says what FitOut actually knows, guarded by a two-layer ban that was watched failing against the real string twice — and the checkout-return marker stops stranding on five terminal landings without D-89 being relaxed by an inch.**

## Performance

- **Duration:** 32 min
- **Started:** 2026-08-22T02:28Z (local 02:28)
- **Completed:** 2026-08-22T03:00Z (local 03:00)
- **Tasks:** 5 (guard RED · D-102 fix · D-103 RED · D-103 fix · records)
- **Files modified:** 12 + 1 created

## Accomplishments

### D-102 — the surface stops asserting receipt

The PM, on the settling state after a real hosted-checkout return: *"it said Payment Received, did we
really receive the payment??"* **The answer was no — nobody knew.** The row was still `pending`
*because* the `checkout_session.payment.paid` webhook had not arrived, and PROJECT D-57 makes that
webhook the sole confirm authority: `?paid=1` is a UX signal and never proof.

Two sentences asserted it, both from plan 05-03 (`c07c804`), four phases old. 13-07 rewrote the entire
body around them and left them standing — which is the exact failure mode the previous three
corrections in this phase shared.

| | Shipped (05-03) | D-102 |
|---|---|---|
| `<h1>` | *"Payment received"* | *"Confirming your payment"* |
| L1 (money) | *"Your payment reached us."* | *"We're waiting on your payment provider to confirm it."* |
| L2, 0–20s | *"We're waiting on the final confirmation — this page updates on its own."* | *"This page updates on its own — you don't need to refresh it."* |
| L2, past cap | *"…Your payment is safe, your booking is held, and we'll email you at {x} the moment it confirms."* | *"It's taking longer than usual. We'll email you at {x} the moment it's confirmed."* |
| L2, escalation | *"Your reference is {FIT-…} — we've recorded it against this booking."* | unchanged |

### The sentence-by-sentence audit (the success criterion, one at a time)

Every sentence the surface can render, checked against **both** readings — the payment settled, and it
did not. This is the list, not a claim that a list was made:

| # | Sentence | Verified by what | True if it settled | True if it did not |
|---|---|---|---|---|
| 1 | `<h1>` *"Confirming your payment"* | the act, not the outcome — this component exists to wait for the authority | ✅ | ✅ (we were confirming; the answer came back negative) |
| 2 | L1 *"We're waiting on your payment provider to confirm it."* | PROJECT D-57 — the webhook IS the provider's, and it is the sole confirm authority | ✅ | ✅ |
| 3 | L2 (a) *"This page updates on its own — you don't need to refresh it."* | the poller is running at this threshold, and the copy switches at its cap for exactly that reason | ✅ | ✅ |
| 4 | L2 (b) *"It's taking longer than usual."* | ~20s elapsed against a healthy round trip measured in SECONDS (`payments/config.ts`, ~2s) | ✅ | ✅ |
| 5 | L2 (b) *"We'll email you at {email} the moment it's confirmed."* | the confirm path really sends it; the sentence is CONDITIONAL on the confirmation | ✅ | ✅ (nothing is promised unconditionally) |
| 6 | L2 (c) *"Your reference is {FIT-…} — we've recorded it against this booking."* | server-derived from this booking (TRUST-02 / D-78) | ✅ | ✅ |
| 7 | `BookingReference` — the bare `FIT-…` string | same derivation | ✅ | ✅ |
| 8 | control *"Refresh status"* | it runs the same `router.refresh()` the poller ran; claims nothing | ✅ | ✅ |
| 9 | guarded *"Email us about this booking"* | renders nothing while `SUPPORT_EMAIL` is null (D-64) | ✅ | ✅ |
| 10 | region label *"Payment status"* | a two-word name, no claim | ✅ | ✅ |

**Two sentences were removed rather than reworded**, and finding the second is the transferable part:

- ***"Your payment is safe"*** — the sibling of the headline claim. It asserts a payment EXISTS in
  order to reassure about where it is: the same presupposition, one clause further down. A rewrite of
  the two headline sentences that left this one standing would have shipped the same defect.
- ***"Your booking is held"*** — **the plan's brief explicitly sanctioned this one as verified, and the
  audit found it is not.** On the exclusive path it is a DB fact: `pending` sits inside the occupying
  set of the `booking_no_overlap` EXCLUDE predicate (`drizzle/0022`, `status NOT IN
  ('cancelled','declined','completed')`). But an **open-capacity** booking holds its seats through
  `OPEN_OCCUPYING_STATUS_SQL` (`src/lib/availability/open-capacity.ts:194`), which requires
  **`b.expires_at > now()`** — so a lease that lapsed while the booker sat on the hosted page holds
  nothing, and this client leaf is handed neither `expiresAt` nor `occupancyMode`. *True for most
  bookings* is precisely what shipped four times already. The stronger fix (a server-verified `held`
  prop) is logged in `deferred-items.md`.

### The defending comment — the part that made this recur

The shipped file carried this above the money sentence:

> *"'Your payment reached us.' is true from the first paint — the browser only gets here from the
> hosted checkout's return"*

**That reasoning is the defect.** A redirect is not a payment: the URL is typable, the parameter is
forgeable (the entire premise of D-57 and of D-89 one file over), and a hosted session can redirect and
still fail to capture. Reasoning that terminates in a money claim has to terminate at a webhook. It was
**rewritten, not deleted** — left in place it would have re-taught the error to the next reader, which
is how it survived 13-07's rewrite of everything around it.

Three more comment sites carried the claim and were corrected: the file's opening description, 13-07's
threshold table, and D-71's own argument — where **the correction makes the argument stronger**. The
reason to offer no retry was never *the money is here*; it is that **nobody knows**, and a retry
offered into ignorance is how a booker pays twice.

### D-103 — the marker stops stranding

The PM: *"i think /?paid appears when the time of booking has already elapsed."* It did.
`ConsumePaidParam` mounted inside `showConfirmationMoment`, which also requires `!isCompleted`, so five
landings a paid checkout can reach kept the marker forever on a bookmarkable URL: a swept hold that
ended `cancelled`, a reversal, a lapse, a decline, and the derived `completed` render one session later.

**D-89 is not relaxed — it is restated as what it was always about.** The rule was written as
*"confirmed branch only"*; the property underneath is *"only where the parameter is INERT"* — no branch
predicate reads it, no poller is running to re-render the RSC for the current url, and no redirect can
be re-entered. `confirmed` was simply the first branch that qualified.

- One `paidParamDecay` element, declared **below** the pending branch (which returns above in all three
  of its shapes), so there is no line above that branch where the mount can exist.
- Rendered on `declined`, all three `cancelled` landings, and the confirmed branch — the last hoisted
  out of the moment's fragment, which is what widens it to the derived `completed`.
- **`requested` / `approved` deliberately excluded:** neither is terminal, and an approved hold's own
  next step is the checkout that *appends* this parameter. Nothing in the shipped flow can put it on
  either branch anyway. Recorded in `deferred-items.md` so the two `false`s read as a decision.

## Task Commits

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | D-102 guard, watched failing | `b901184` | `tests/design/pending-copy.test.ts` |
| 2 | D-102 copy + comments + dependents | `89d3c02` | `pending-payment-state.tsx`, `live-regions.ts`, `payment-states.test.tsx`, `detail-completeness.test.tsx`, both e2e specs |
| 3 | D-103 table, watched failing | `f480e83` | `detail-completeness.test.tsx` |
| 4 | D-103 mount set | `e8c5d53` | `bookings/[id]/page.tsx`, `consume-paid-param.tsx` |
| 5 | D-102 / D-103 recorded | `c7697b6` | `13-CONTEXT.md`, `13-UI-SPEC.md`, `13-UAT-LOG.md`, `deferred-items.md` |

## The Watched Reds — verbatim

### RED 1 — the guard against the shipped file (before any fix)

`npx vitest run --config vitest.design.config.ts tests/design/pending-copy.test.ts`

```
× src/components/booking/pending-payment-state.tsx states FitOut's knowledge, never the money's arrival
AssertionError: … expected [ …(9) ] to deeply equal []
+   "…pending-payment-state.tsx:3   — was this surface's `<h1>` from plan 05-03 until D-102 removed it…"
+   "…pending-payment-state.tsx:76  — …"
+   "…pending-payment-state.tsx:224 — …"
+   "…pending-payment-state.tsx:190 — was this surface's money statement until D-102 removed it, defended
                                      by a comment arguing it was true from the first paint…"
+   "…pending-payment-state.tsx:193 — …"
+   "…pending-payment-state.tsx:226 — …"
+   "…pending-payment-state.tsx:30  — carries the same presupposition one step further…"
+   "…pending-payment-state.tsx:196 — …"
+   "…pending-payment-state.tsx:197 — …"
Tests  1 failed | 7 passed (8)
```

Nine hits, three forms, six code sites and three comment sites — **including the defending comment at
190 and the file's own opening description at 3**, which is the whole reason the scan does not strip
comments. The seven guard-the-guard cases passed in the same run.

### RED 2 — the post-fix reintroduction probe

The heading was put back into the corrected file (a copy saved to the scratchpad first and restored
from it — never `git checkout`), and **both layers bit independently**:

```
# layer 1, source scan
× …states FitOut's knowledge, never the money's arrival
+ "…pending-payment-state.tsx:299 — was this surface's `<h1>` from plan 05-03 until D-102 removed it…"

# layer 2, rendered tree
× (9) asserts no receipt at any of the three thresholds, with an address and without one
AssertionError: on arrival (email=jane@example.com): the pending surface told the booker something
about their money that no event on this system has established…: expected [ 'payment received' ] to
deeply equal []
× (1) at 0-20s … AssertionError: expected 'Payment received' to be 'Confirming your payment'
```

### RED 3 — the D-103 table before the mount set widened

`npx vitest run tests/booking/detail-completeness.test.tsx`

```
× completed (derived) consumes ?paid=1
× declined consumes ?paid=1
× cancelled (party) consumes ?paid=1
× cancelled (lapsed approval) consumes ?paid=1
× cancelled (reversed) consumes ?paid=1
Tests  5 failed | 87 passed (92)
```

Exactly the five stranding branches. **`confirmed` was green from the shipped mount and BOTH pending
rows were green at zero — D-89 was proved intact before it was widened**, which is the assertion that
would have caught a fix that reached too far.

## Why the existing tests could not see this

`payment-states.test.tsx` renders this component at all three thresholds and asserts its copy. It was
green for the whole life of the defect and could not have been anything else: **it asserted the shipped
strings were PRESENT, and they were.** A test that pins text cannot see that the text is a lie — the
same shape 13-19 measured for the spinner, where every case shared the defect's text, role, name and
colour. Pinning the *new* strings inherits the same blindness, so both new gates assert the other
direction: a set of forms that must not appear, whatever the copy is next rewritten to say.

The two layers are not duplicates. The source scan reads comments (where the last version of this
defect was defended) and cannot see runtime-composed copy; this component builds two of its three lines
from templates. Case (9) reads the rendered tree and cannot see comments. Each covers the other's hole,
and both say so in their own headers.

## Deviations from Plan

**1. [Rule 1 — Bug] The brief's sanctioned claim was itself unverified**

- **Found during:** the sentence-by-sentence audit (D-102).
- **Issue:** the objective stated *"The booking being held IS verified and may be stated."* It is
  verified on the exclusive path only; `OPEN_OCCUPYING_STATUS_SQL` requires `expires_at > now()`, so an
  open-capacity booking whose lease lapsed holds nothing while this state still renders.
- **Fix:** the clause was dropped rather than kept, and the reasoning is recorded in the component
  header, in 13-CONTEXT D-102 and in `deferred-items.md` (with the server-verified `held` prop named as
  the stronger fix).
- **Files:** `src/components/booking/pending-payment-state.tsx`
- **Commit:** `89d3c02`

**2. [Rule 2 — Missing critical functionality] The spec documents still taught the removed claim**

- **Found during:** D-102, after the component was green.
- **Issue:** eight rows of `13-UI-SPEC.md` spelled the two claims (the status table, the three-state
  table, the threshold table, the two-line copy table and the escalation sketch). The guard scans source
  only, so the spec would have re-taught the error to the next implementer — the same failure as the
  defending comment, one document out.
- **Fix:** every row marked superseded by D-102, carrying the corrected wording.
- **Files:** `.planning/phases/13-confirmation-bookings-trust/13-UI-SPEC.md`
- **Commit:** `c7697b6`

**3. [Rule 3 — Blocking] `ConsumePaidParam` had to be mocked before it could be counted**

- **Found during:** the D-103 table.
- **Issue:** the real component renders `null` (its contract) and reads `usePathname`, which the
  harness's navigation mock deliberately does not provide — so forcing `?paid=1` onto the confirmed
  render would have thrown, and its mount point was unassertable in any case.
- **Fix:** mocked to a countable `<span data-testid>` footprint in `detail-completeness.test.tsx`, with
  the reason recorded at the mock.
- **Files:** `tests/booking/detail-completeness.test.tsx`
- **Commit:** `f480e83`

No Rule 4 (architectural) situations arose. Zero schema migrations: `drizzle/` still ends at
`0025_audit_resolved_by.sql` (D-80).

## Constraints — verified, not assumed

| Constraint | Evidence |
|---|---|
| Poller mechanics byte-unchanged (13-07 / D-71) | `git diff -U0` filtered for `POLL_INTERVAL_MS`, `MAX_ATTEMPTS`, `SUPPORT_ESCALATION_MS`, `setInterval`, `clearInterval`, `setTimeout`, `clearTimeout`, `routerRef`, `useRef`, `useEffect`, `setSlow`, `setEscalated`, `animate-spin` → **zero lines** |
| The `slow`-gated indicator still works (D-101.1) | cases (7) and (8) green in the 21-case run; `animate-spin` never appears in the diff |
| ZERO schema migrations (D-80) | `drizzle/` ends at `0025_audit_resolved_by.sql`; `git status drizzle/` clean |
| `tests/design/site-contacts.test.ts` untouched (D-64) | not in any commit's file list; green in the 48-file design run |
| STATE-05 — no error affordance at any threshold | case (5) green at all three thresholds; the new copy states no failure and offers no new control |
| STATE-06 / D-73 / D-94 — `MoneyStatement` not extended | one panel per document, unchanged mount set; `detail-completeness`'s `money` column untouched |
| Design gates (no raw hex/`rgb(`/`oklch(`/arbitrary px, no `--destructive`) | 48 design files / 816 tests green |
| D-89 — the poller can never reach the parameter's consumer | the element is declared below the pending branch; both pending rows assert **0** mounts under a forced `?paid=1` |

## Gates

| Gate | Result |
|---|---|
| `npm test` | **158 files passed, 1 skipped · 1582 passed, 4 skipped, 0 failed** |
| `npm run test:design` | **48 files passed · 816 passed, 3 skipped** |
| `npm run build` | **✓ Compiled successfully in 22.8s**, 25/25 static pages; lint 0 errors / 14 pre-existing warnings |
| `npx tsc --noEmit` | clean (the only line is the running dev server's stale `.next/dev/types/validator.ts`) |

Run one at a time — `tests/global-setup.ts` TRUNCATEs every `public` table in `fitout_test` on every
run. The end-of-run leaked-writes report (2 `public.audit` rows from `recordAudit`'s module-level
singleton) is the pre-existing, documented, contained condition, not a regression from this plan.

## Known Stubs

None. No hardcoded empty values, placeholder text or unwired components were introduced. `SUPPORT_EMAIL`
is still `null` at `src/lib/site.ts:70` — a pre-existing operator action (D-64's guard), unchanged here.

## Threat Flags

None. No new network surface, auth path, file access or schema change. The one behavioural change at a
trust boundary is a **reduction**: the surface that renders while the confirm authority is outstanding
now makes strictly fewer claims about money than it did.

## What the next plan should know

- **The register is now "knowledge state".** Any future sentence on `/bookings/{id}?paid=1` has to pass
  the same test — true under both outcomes — and `tests/design/pending-copy.test.ts` will fail on
  eleven ways of getting it wrong, comments included. **Add a surface to `SURFACES` the day a second
  component renders before an authority has answered**; the list's size is asserted at 1 for exactly
  that reason.
- **`your booking is held` is available again the moment the RSC passes a verified `held` prop.** The
  page already has the row, the listing and one hydrated `now`. See `deferred-items.md`.
- **This is the fourth inherited money claim this phase has removed** (D-69, D-83/13-18, D-96, now
  D-102). All four shipped the same way. The remaining copy on `/bookings/**` that predates Phase 13 is
  the place to look for the fifth.
- **Human verification is owed and is not optional here.** CI proves the strings and the mount points;
  it cannot tell you whether the corrected page still *feels* safe to somebody whose money is in the
  air, or whether `?paid=1` really leaves the address bar on a live return. Recorded in `13-UAT-LOG.md`
  under Outstanding, and it can be observed in the same pass as Walk A.

## Self-Check: PASSED

Every file named in `key-files` exists on disk (14/14 checked with `[ -f ]`) and every commit hash in
the task table resolves in `git log --all` (5/5). `drizzle/` ends at `0025_audit_resolved_by.sql` and
`git status drizzle/` is clean. All three gates were run one at a time and are green.
