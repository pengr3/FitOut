# FitOut — Requirements

> **Scope note (2026-09-01, extended 2026-09-02).** This file was opened **ahead of the v1.2 milestone
> cycle** and holds **Phase 18 and the inserted Phase 18.1 only**. `/gsd-new-milestone` has not been
> run for v1.2, so there is no milestone-wide requirements pass yet; Phase 18 was added ahead of the
> cycle by PM decision because the hole it closes is live in production, and Phase 18.1 was inserted
> the next day to close it. When v1.2 is properly opened, these requirements fold into it.
>
> Prior milestones' requirements are archived and are NOT restated here:
> - `.planning/milestones/v1.0-REQUIREMENTS.md` (49/49)
> - `.planning/milestones/v1.1-REQUIREMENTS.md` (69/71 · 8 descoped by D-141)
>
> Two v1.1 requirements carry forward unsatisfied and are **not** in this file's scope:
> `STATE-05` and `TRUST-01`, both closed by one monitored support address at `src/lib/site.ts:70`.

---

## Phase 18 — Host Verification, Listing Review & FitOut Ops

Decisions referenced below (`D-2xx`) live in
`.planning/phases/18-host-verification-listing-review-fitout-ops/18-CONTEXT.md`.
The PM's four pre-planning answers live in the sibling `18-PM-DECISIONS.md`.

### OPS — Staff identity, ops console & audit

- [x] **OPS-01** — A staff member signs in to FitOut Ops **as themselves**, through the existing
      account system, and their staff standing is read server-side from a field no client can write.
      *(SC1 · D-214, D-217)*
- [x] **OPS-02** — No ops power is reachable by a non-staff account, and none is reachable by knowing
      a URL. Every ops page and every ops server action independently enforces this server-side;
      middleware is not the boundary. A non-staff caller cannot distinguish an ops route from a
      route that does not exist. *(SC1 · D-216, D-219)*
- [x] **OPS-03** — Every ops action records **who did it** on an `audit` row whose `actorId` is the
      authenticated staff user id — authenticated, not asserted. *(SC1 · D-218)*
- [x] **OPS-04** — Ops works **one queue**: hosts awaiting verification and listings awaiting review,
      oldest first, with everything needed to decide on the same screen. *(SC3)*
- [x] **OPS-05** — Approve and reject each carry a **reason the host is actually told**. A rejected
      host or listing can read why. *(SC3 · D-230)*

### HVER — Host identity verification

- [x] **HVER-01** — Identity checking runs through a **provider-agnostic verification port**.
      Registering a different provider is a registration + configuration change, not a
      re-architecture. Ships with the ops-manual provider. *(SC7 · D-206)*
- [x] **HVER-02** — FitOut stores only `{ result, vendorRef, checkedAt, provider }`. **No government
      ID, no document, no image** is stored — and there is no column that could hold one. Enforced by
      a test asserting the table's column set, not by convention. *(SC7 · D-206, D-220)*
- [x] **HVER-03** — A host's verification status is a **term of the sell-gate itself**, and is
      **independent of `payoutsEnabled`** — never expressed in terms of it, and never replacing it.
      *(SC2 · D-224, D-225)*
- [x] **HVER-04** — A written **PayMongo Linked Accounts vs standalone PH KYC vendor** comparison is
      delivered to the PM as a fork: cost, sandbox reachability, KYC depth, data residency, what
      FitOut would store, and what switching costs given the HVER-01 port. *(D-238)*
- [x] **HVER-05** — A booker sees a badge that states **what FitOut actually checked**, and never
      implies FitOut inspected the space when it checked a document. The badge renders for
      `approved` only — **never for a grandfathered row**, which was never checked. *(SC6 · D-212, D-237)*

### LVER — Listing review

- [x] **LVER-01** — A listing **created after this phase** cannot be sold until ops has approved both
      it and its host, and that approval is a **term of `deriveBookable` itself** — never a separate
      check a code path can forget. The term is held equal across all of: the predicate, its inlined
      SQL twin in search Stage-1, and both server-side re-derivations in `placeHold` /
      `placeOpenHold`. *(SC2, narrowed by D-210 · D-224, D-226, D-227)*
- [x] **LVER-02** — A submitted-but-unapproved listing is **hidden**: absent from search, and its
      public page returns the shipped soft-404. The host still sees its own listing, its review
      status, and any rejection reason. *(D-208, D-228, D-229, D-230)*
- [x] **LVER-03** — A **material edit** (address, space type, capacity, photos, price) to an
      `approved`, `grandfathered` **or `rejected`** listing returns it to review and stops it being
      sellable until re-approved. Approval is not a permanent grant, and a rejection is not a death
      sentence — a resubmission enters the queue at resubmission time, never at the original time.
      Photo changes are detected in `listing-photo.ts`, not `saveListingStep`, which structurally
      cannot see them. *(SC4 · D-231, D-232, D-242, D-249)*
- [x] **LVER-04** — Listings published before this phase, and their hosts, are **grandfathered** by
      the migration into a **first-class, distinct state** — never written as if a human approved
      them — so a future backfill is one statement. *(D-207, D-211, D-213)*

### ENF — Enforcement

- [x] **ENF-01** — Ops can suspend a host or pull a listing and choose **per case**: block new
      bookings only, or additionally cancel-and-refund what is already sold. *(SC5 · D-233)*
- [x] **ENF-02** — A suspended host's pending payouts **freeze**, and no payout leaves for a host
      under suspension. A frozen row does not read as a stuck row to the reconciler and does not page
      an operator. *(SC5 · D-222, D-234)*
- [x] **ENF-03** — Ops cancel-and-refund returns **the full charged total** to the booker — the space
      price AND the D-74 service fee, with **nothing retained** by FitOut — pays the host **nothing**,
      and charges **no** host-cancel fee. The fee behaviour sits behind one named constant
      (`OPS_CANCEL_REFUNDS_SERVICE_FEE`) whose docblock records the D-236 settlement at that call site.
      ⚠ **AMENDED 2026-09-02 by plan 18.1-01.** As Phase 18 shipped it this clause read *"with the
      **service/platform fee retained** by FitOut"* per D-209; **D-236 supersedes that** and the
      constant is now `true`. The other two clauses are unchanged.
      *(SC5 · D-209 superseded by D-236 · D-235)*

---

## Phase 18.1 — Close Phase 18: the verification path FitOut is legally required to have

These five IDs were **written at plan time**, following the **D-239 convention** Phase 18 used — a
`- [ ] **ID** — sentence *(SC-n · D-nnn)*` bullet plus one Traceability row — rather than at milestone
time, so the fourteen plans of this phase cite real IDs instead of inventing them. Every bullet is
`- [ ]` because the phase has not shipped: the executor of the plan that satisfies an ID ticks it and
moves its Traceability row from `Planned` to `Complete`.

`SC-n` points at the eight success criteria in `.planning/ROADMAP.md` § Phase 18.1. Decisions cited
below (`D-2xx`) live in
`.planning/phases/18.1-close-phase-18-verification-submission-didit-listing-gate/18.1-CONTEXT.md`
for **D-255..D-271**; any number **at or below D-254** lives in the Phase 18
`18-CONTEXT.md` named above.

The three carried PM decisions this phase also discharges — **D-236** (an ops-forced cancellation
refunds the full charge), **D-231** (title and description become material fields) and the **F11**
earnings gap — are decisions, not new requirements. They land against the existing `ENF-03`,
`LVER-03` and `ENF-02` and are recorded on those rows.

### HVER — Host identity verification

- [ ] **HVER-06** — A host can **ask to be verified** from a surface under `/host`, and doing so
      creates a real `host_verification` row at `pending` that appears in the `/ops` queue. Phone and
      a confirmed email are **required at submission** — not optional profile fields.
      *(SC1, SC4 · D-256, D-268, D-269)*
- [ ] **HVER-07** — Identity is checked by **Didit** behind the existing verification port. The
      vendor's verdict enters through **one** code path, the port stays the only branch point, and
      FitOut stores only `{ result, vendorRef, checkedAt, provider }`. The **manual** provider stays
      registered as the ops override with `provider = 'manual'`.
      *(SC2, SC3 · D-258, D-259, D-261, D-262)*
- [ ] **HVER-08** — A **rejected** host may re-submit after a 24-hour cooldown derived from
      `host_verification.updated_at`; a **suspended** host cannot re-submit at all. The rejection
      `reason` the host reads is bounded, escaped, and never empty. *(SC1 · D-264, D-265, D-266)*

### LVER — Listing review

- [ ] **LVER-05** — A host **cannot create a listing** until they are verified. The refusal is
      server-side in `createDraftListing`, names the state and the way out, and cannot be bypassed by
      knowing a URL. Existing drafts stay editable. *(SC5 · D-255, D-270)*

### OPS — Staff identity, ops console & audit

- [ ] **OPS-06** — **Ops can reach a host**: email and phone revealed on demand from either queue
      row, each reveal writing an audit row carrying ids and enum-shaped values only — never the
      contact values themselves. *(SC6 · D-257, D-271, D-72)*

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| OPS-01 | Phase 18 · 18-01 (the identity) · 18-12 (the console) | **Complete** (18-01 — staff standing reads server-side from `user.role`, a field `/api/auth/update-user` provably cannot write: a smuggled value takes the whole request down with `400 FIELD_NOT_ALLOWED` rather than being silently stripped. Granting is CLI-only (`npm run ops:grant`). 18-12 shipped the console, which is what "signs in to FitOut Ops" needed. ⚠ Standing hazard recorded at the site: `requireStaff()` is correct only while `session.cookieCache` stays unconfigured — enabling it as a performance change would keep a REVOKED staff grant working for the cache TTL and no test would go red.) |
| OPS-02 | Phase 18 · 18-01 (the guard) · 18-12 (the route) · 18-14 (the status line) | **Complete** (18-01 — `requireStaff()` is the boundary and refuses non-staff / NULL-role / signed-out with `notFound()`. 18-12 — the route half: `/ops` behind three layers, no `(ops)` not-found body, refusal is `notFound()` everywhere, pinned structurally by `tests/design/ops-guard-coverage.test.ts` with three watched REDs. 18-14 — the last clause MEASURED under a production build of `8520721`, Next 16.2.7, `next start -p 3100`: **200** staff / **404** non-staff / **404** signed-out / **404** on the nonexistent `/ops/xyz` CONTROL, second pass identical; zero occurrences of `Ops` in all three 404 bodies and readings 2 and 3 byte-identical (same sha256). Transcript at `18-EVIDENCE.md § P1`, which states it is a ONE-TIME AUDIT and names the structural test as the ongoing pin. ⚠ ONE FINDING filed, not fixed: a header-level oracle survives the status line — an unrouted path is served from the prerendered 404 (`x-nextjs-prerender: 1`) while a matched `notFound()` is chunked. App-wide, identical on `/listings/[id]`, NOT introduced by 18-12.) |
| OPS-03 | Phase 18 · 18-05 (five console actions) · 18-08 (the sixth, ops-cancel) | **Complete** (every ops action records the authenticated staff id on an `audit` row, read BACK OUT of the table on BOTH the allow and the deny branch — never inferred from an `ok` return, because `recordAudit` swallows its own insert failure by design. 18-08 added the sixth action and closed "every ops action". This is the phase's answer to `audit.resolved_by` being *"asserted, not authenticated"* — the console's writes now carry a real actor, though the pre-existing `scripts/ops-alerts.ts` CLI keeps its asserted handle by scope.) |
| OPS-04 | Phase 18 · 18-05 (data) · 18-10 (row) · 18-12 (page) | Complete (18-05 — `loadReviewQueue` is ONE interleaved oldest-first array over both kinds, carrying every field a reviewer needs so the page runs no second query. 18-10 — the terminal row, one tree at every width, photographs included. 18-12 — `/ops`: ONE page (D-246, asserted), an `<ol>` because the order is the product, designed loading / empty / error states, and every figure formatted server-side. Overflow and a11y measured by hand at 320 and 1280 in both themes) |
| OPS-05 | Phase 18 · 18-05 (write half) + 18-09 (delivery) + 18-13 (host-surface read) | **Satisfied for D-245** (18-05 stores the taxonomy-constrained, `.max(280)`-bounded SENTENCE the host reads; 18-09 delivers it — one durable `notification` row AND one email per decision, from ONE payload through the shipped fan-out, with the operator's sentence verbatim and exactly once, and no appeal/reply/timeline/address anywhere. D-230's host-surface status is IN ADDITION to this, not instead of it — and 18-13 SHIPPED it: the review chip and reason on `/host/listings`, and the suspension notice on `/host`, `/host/listings` and `/host/earnings` (D-252). Both halves now landed) |
| HVER-01 | Phase 18 · 18-05 | Complete |
| HVER-02 | Phase 18 · 18-02 | Complete |
| HVER-03 | Phase 18 | Complete |
| HVER-04 | Phase 18 · 18-14 | **Complete** (`18-KYC-VENDOR-COMPARISON.md` — a fork for the PM, verdict first, leading with the D-225 re-coupling objection BEFORE any price; all six D-238 dimensions on both sides; every figure carries a retrieval date and a probed/cited/assumed label; A1 RE-PROBED 2026-09-01 and moved from `[ASSUMED]` to `[PROBED]`; 'stay manual' presented as a live third option; the switching cost quantified as roughly one plan with NO schema change and NO gate change; a gaps section states out loud that no sandbox was walked. ⚠ The PM has NOT yet chosen — the answer is owed as a D-number.) |
| HVER-05 | Phase 18 · 18-11 | **Complete** (18-11 — the chip says "Checked by FitOut" on the listing detail page and the search card, and the detail page adds the explainer whose second sentence is a deliberate negative: *We haven't visited the space.* No document claim, no vendor claim, no inspection claim — there is no document (HVER-02) and no vendor (D-206). D-212 is STRUCTURAL: `isFitoutChecked` requires BOTH `host_verification.status` and `listing.review_state` to be `approved`, as positive literals, and is reduced to a boolean in the RSC, so neither client component ever receives the grandfathered distinction. Proved over the full 6 × 5 product of both pgEnums, over both grandfathered search fixtures end-to-end, and by a mutation to a host-only rule that reddens the named grandfathered-listing case. The fifth signal is scanned under the same twelve-row trust-signal ban via `FIFTH_SIGNAL_FILES`) |
| LVER-01 | Phase 18 | Complete |
| LVER-02 | Phase 18 · 18-04 (hidden-from-bookers half) + 18-13 (host half) | **Satisfied** (18-04 closed all three booker-facing leak surfaces through one expression; 18-13 closes the third clause on the HOST surfaces — the review chip joins `statusBadge()` at one chip per card, the reason line carries the operator's sentence verbatim, and `rejected` offers the one way out D-249 makes true. ⚠ Satisfied WITHOUT teaching the public path about sessions: `assertPublicListing` is byte-unchanged and still session-free, which was 18-04's closing instruction) |
| LVER-03 | Phase 18 · 18-06 | Complete |
| LVER-04 | Phase 18 · 18-02 | Complete |
| ENF-01 | Phase 18 · 18-05 (default lever) + 18-07 (freeze) + 18-08 (escalation) + 18-10 (the per-case choice) | **Satisfied** (18-10 ships the console half: the reject dialog's `RadioGroup`, rendered only when there is something to cancel, defaulting to the lighter lever on EVERY mount and remembering nothing; the always-rendered impact block, so choosing reveals nothing and the operator reads the money BEFORE deciding; and a confirm whose accessible NAME carries the booking count in alarm ink rather than a solid fill. Reaching the escalation takes three deliberate acts and no control on the queue row can reach it at all — mutation-proved by making the heavier lever the default and watching 5 cases go red. The server still re-asserts the choice: an omitted `lever` parses to block-new-only and cancels nothing. Reachability is 18-12's `/ops` route) |
| ENF-02 | Phase 18 · 18-07 | Complete |
| ENF-03 | Phase 18 · 18-08 (the action + the constant) · Phase 18.1 · 18.1-01 (D-236 settled) | **Complete, amended** (18-08 shipped ops cancel-and-refund behind `OPS_CANCEL_REFUNDS_SERVICE_FEE` with the D-209/D-236 conflict written down at the call site. 18.1-01 flipped it to `true` on the PM's 2026-09-01 settlement: the booker now gets the WHOLE charged total and FitOut retains nothing, so this requirement's first clause was rewritten rather than left asserting the opposite of the code. The other two clauses — host paid nothing, no host-cancel fee — are byte-unchanged. `withFlippedConstant` still drives the opposite branch, so "one line flips it" stays measured rather than promised) |
| HVER-06 | Phase 18.1 · 18.1-07 (the submit path) · 18.1-10 (the words) · 18.1-11 (the surface) · 18.1-14 (the proof) | Planned |
| HVER-07 | Phase 18.1 · 18.1-04 (the async port) · 18.1-05 (the Didit adapter) · 18.1-06 (the decision module) · 18.1-08 (the webhook) · 18.1-09 (the reconciler) · 18.1-14 (the proof) | Planned |
| HVER-08 | Phase 18.1 · 18.1-06 (the cooldown rule) · 18.1-07 (the re-submit guard) · 18.1-08 · 18.1-10 (the words) · 18.1-11 (the surface) | Planned |
| LVER-05 | Phase 18.1 · 18.1-12 | Planned |
| OPS-06 | Phase 18.1 · 18.1-13 (the reveal + its audit row) · 18.1-14 (the proof) | Planned |

**22 requirements across two phases.**

- **Phase 18 · 17 · all complete** — verified 2026-09-01 (`18-VERIFICATION.md`: `passed_with_concerns`, 0 code-level blockers, 4 PM decisions open).
- **Phase 18.1 · 5 · all Planned** — written at plan time per D-239 by `18.1-01`. Phase 18's roadmap checkbox cannot be ticked until these land; the executor of each plan named above moves its row to Complete.

---

## Deferred (recorded so they are not lost)

Carried from `.planning/ROADMAP.md` § Backlog and from Phase 18's own discussion. Not in scope.

- **SEARCH-06..09, MAP-01..04** — Search & Discovery, deferred out of v1.1 by **D-141** to backlog
  999.3. Spikes complete; **D-139/D-140 remain adopted**.
- **Booker-side reporting of a fake listing** — backlog 999.4. The queue a report would feed.
- **Reviews and ratings** — backlog 999.5.
- **Host appeals** — backlog 999.6. A rejected host has no self-serve route back in this phase.
- **Title/description as material-edit fields** — excluded from LVER-03 to hold the ROADMAP's stated
  five fields, but a fake listing lies in its words as much as its fields. Flagged as a real gap.
- **Tiered ops permissions** — one staff role ships; cancel-and-refund is reachable by any staff
  member, with the audit trail as the control.
- **Backfilling the grandfathered catalogue** — LVER-04 makes it one statement whenever the PM wants it.
- **Wiring a real KYC vendor** — HVER-01 lands the port; HVER-04 is what the PM decides the vendor from.
