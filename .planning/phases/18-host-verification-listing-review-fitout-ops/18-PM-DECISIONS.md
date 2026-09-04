# Phase 18 — PM decisions taken 2026-09-01 (before discuss)

Collected directly from the PM at session open, ahead of planning, because the ROADMAP entry
reserved them and the PM is unavailable overnight. These are ANSWERED. Do not re-ask them.
Record them as D-numbers at discuss time.

## PM-1 — KYC vendor: ADAPTER NOW, VENDOR LATER

Build a **provider-agnostic verification port**. FitOut stores only `{ result: pass|fail,
vendorRef, checkedAt, provider }` — **never a government ID, never a document, never an image**.
Ship with an **ops-manual provider** behind that port so the sell-gate, the review queue, the
badge and the audit trail are all real and complete in this phase.

- PayMongo Linked Accounts is NOT wired in this phase. It is sales-gated and has never been walked.
- The phase still OWES a written comparison — PayMongo Linked Accounts vs a standalone PH KYC
  vendor — as a decision document for the PM. This is a deliverable, not a blocker.
- Swapping in a real vendor later must be a provider registration + config change, not a
  re-architecture. The port is the contract that guarantees that.
- Success Criterion 7's literal "runs through a third-party vendor" is therefore DEFERRED until a
  vendor is reachable. The *storage contract* it exists to protect (no government ID at FitOut) is
  satisfied in full by this phase.

## PM-2 — Cutover: GRANDFATHER PERMANENTLY

Every listing already `published` at migration time is marked **approved by the migration** and is
**never retroactively re-reviewed**. The gate applies only to:
  - listings created after this phase, and
  - listings that take a MATERIAL EDIT after this phase (Success Criterion 4).

Consequences to hold explicitly, because they narrow the phase:
- **Success Criterion 2 is narrowed** to "a host cannot sell a listing *created or materially
  edited after this phase* until ops has approved both the host and the listing." The pre-existing
  catalogue stays ungated by PM decision. This is a deliberate scope choice, NOT a phase failure —
  verification must assert the narrowed criterion, not the original wording.
- The material-edit path (Criterion 4) is the **natural burn-down** for grandfathered rows: the
  first material edit to a grandfathered listing pulls it into review like any other.
- The migration must be explicit and legible about what it did — a grandfathered row must be
  DISTINGUISHABLE from an ops-approved row in the data, so a future PM can burn the backlog down
  on purpose if they choose. Do not write grandfathered rows as if a human approved them.
- Host verification state for grandfathered hosts follows the same rule.

## PM-3 — Pending listings: HIDDEN UNTIL APPROVED

A listing submitted but not yet ops-approved does NOT appear in search and does NOT render a
public listing page. The HOST sees its own listing and its own review status. A booker never
encounters a space they can look at but cannot book.

- This is a DIFFERENT behaviour from the existing no-hours / payouts-disabled gates, which render
  published-but-not-payable listings visible and read-only. Do not "follow the existing pattern"
  here — the PM chose the divergence deliberately.
- Accepted cost: supply visibility is throttled to ops throughput; hosts get no pre-approval traffic.

## PM-4 — Ops cancel-and-refund: BOOKER REFUNDED IN FULL, PLATFORM FEE RETAINED

PM's exact words: *"booker 100% refund, but not the service fee / platform fee"*.

Interpretation used (state this assumption in the plan and in the phase summary):
- The booker is refunded **the full booking amount**.
- FitOut **retains its service / platform fee** on that booking.
- The **host is paid nothing** — their payout for that booking is frozen and never sent, per
  Success Criterion 5.

If the reconciliation path cannot express "refund booking minus platform fee" against the PayMongo
rails already built (Phase 13.1), that is a REPORT-BACK, not a place to silently pick the other
behaviour.

## Standing scope (from the ROADMAP, unchanged)

OUT of this phase: booker-side reporting (999.4), reviews and ratings (999.5), host appeals (999.6).
Suspension is IN.

---

## ⚠ CONFLICT FOUND AFTER THE PM ANSWERED PM-4 — SWE flag, not a silent override

**Discovered while scouting, AFTER the PM had already answered.** The question I put to the PM did
not mention this precedent, so their answer was given without it. That is my omission, not theirs.

`src/app/actions/cancel-booking.ts:1010` and `:1134` — the HOST-INITIATED cancellation path
(`cancelBookingAsHost`, D-70/D-71/D-80) **already refunds the booker 100% INCLUDING the D-74 service
fee**, and the code states the principle in its own words:

> *"This is the ONE case where the non-refundable fee IS returned: the booker did nothing wrong, so
> the platform, not the booker, absorbs the gateway cost of the reversal."*

An **ops-forced cancellation on a listing FitOut has confirmed is fake** is the strongest possible
instance of "the booker did nothing wrong" — strictly stronger than a host cancelling on them. Read
against that precedent, PM-4 as answered makes FitOut *less* generous to a defrauded booker than to
one whose host merely flaked.

**What I am doing about it (decided, not asked):**
1. **Implement PM-4 exactly as the PM stated it** — booker refunded the full booking amount, FitOut
   retains the service/platform fee. Their decision stands; I do not override a money call.
2. **Isolate it behind ONE named policy constant** — `OPS_CANCEL_REFUNDS_SERVICE_FEE = false` — at a
   single call site, with this conflict documented at that site. Flipping it to match the
   host-cancel precedent must be a one-line change, not a re-architecture.
3. **Lead the morning summary with it**, with the precedent quoted, so the PM re-decides with the
   full picture in view.

Do NOT resolve this conflict inside a plan by picking the other behaviour. It is the PM's to settle.
