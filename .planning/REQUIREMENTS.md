# FitOut — Requirements

> **Scope note (2026-09-01).** This file was opened **ahead of the v1.2 milestone cycle** and holds
> **Phase 18 only**. `/gsd-new-milestone` has not been run for v1.2, so there is no milestone-wide
> requirements pass yet; Phase 18 was added ahead of the cycle by PM decision because the hole it
> closes is live in production. When v1.2 is properly opened, these requirements fold into it.
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

- [ ] **OPS-01** — A staff member signs in to FitOut Ops **as themselves**, through the existing
      account system, and their staff standing is read server-side from a field no client can write.
      *(SC1 · D-214, D-217)*
- [ ] **OPS-02** — No ops power is reachable by a non-staff account, and none is reachable by knowing
      a URL. Every ops page and every ops server action independently enforces this server-side;
      middleware is not the boundary. A non-staff caller cannot distinguish an ops route from a
      route that does not exist. *(SC1 · D-216, D-219)*
- [ ] **OPS-03** — Every ops action records **who did it** on an `audit` row whose `actorId` is the
      authenticated staff user id — authenticated, not asserted. *(SC1 · D-218)*
- [ ] **OPS-04** — Ops works **one queue**: hosts awaiting verification and listings awaiting review,
      oldest first, with everything needed to decide on the same screen. *(SC3)*
- [ ] **OPS-05** — Approve and reject each carry a **reason the host is actually told**. A rejected
      host or listing can read why. *(SC3 · D-230)*

### HVER — Host identity verification

- [ ] **HVER-01** — Identity checking runs through a **provider-agnostic verification port**.
      Registering a different provider is a registration + configuration change, not a
      re-architecture. Ships with the ops-manual provider. *(SC7 · D-206)*
- [x] **HVER-02** — FitOut stores only `{ result, vendorRef, checkedAt, provider }`. **No government
      ID, no document, no image** is stored — and there is no column that could hold one. Enforced by
      a test asserting the table's column set, not by convention. *(SC7 · D-206, D-220)*
- [ ] **HVER-03** — A host's verification status is a **term of the sell-gate itself**, and is
      **independent of `payoutsEnabled`** — never expressed in terms of it, and never replacing it.
      *(SC2 · D-224, D-225)*
- [ ] **HVER-04** — A written **PayMongo Linked Accounts vs standalone PH KYC vendor** comparison is
      delivered to the PM as a fork: cost, sandbox reachability, KYC depth, data residency, what
      FitOut would store, and what switching costs given the HVER-01 port. *(D-238)*
- [ ] **HVER-05** — A booker sees a badge that states **what FitOut actually checked**, and never
      implies FitOut inspected the space when it checked a document. The badge renders for
      `approved` only — **never for a grandfathered row**, which was never checked. *(SC6 · D-212, D-237)*

### LVER — Listing review

- [ ] **LVER-01** — A listing **created after this phase** cannot be sold until ops has approved both
      it and its host, and that approval is a **term of `deriveBookable` itself** — never a separate
      check a code path can forget. The term is held equal across all of: the predicate, its inlined
      SQL twin in search Stage-1, and both server-side re-derivations in `placeHold` /
      `placeOpenHold`. *(SC2, narrowed by D-210 · D-224, D-226, D-227)*
- [ ] **LVER-02** — A submitted-but-unapproved listing is **hidden**: absent from search, and its
      public page returns the shipped soft-404. The host still sees its own listing, its review
      status, and any rejection reason. *(D-208, D-228, D-229, D-230)*
- [ ] **LVER-03** — A **material edit** (address, space type, capacity, photos, price) to an
      `approved`, `grandfathered` **or `rejected`** listing returns it to review and stops it being
      sellable until re-approved. Approval is not a permanent grant, and a rejection is not a death
      sentence — a resubmission enters the queue at resubmission time, never at the original time.
      Photo changes are detected in `listing-photo.ts`, not `saveListingStep`, which structurally
      cannot see them. *(SC4 · D-231, D-232, D-242, D-249)*
- [x] **LVER-04** — Listings published before this phase, and their hosts, are **grandfathered** by
      the migration into a **first-class, distinct state** — never written as if a human approved
      them — so a future backfill is one statement. *(D-207, D-211, D-213)*

### ENF — Enforcement

- [ ] **ENF-01** — Ops can suspend a host or pull a listing and choose **per case**: block new
      bookings only, or additionally cancel-and-refund what is already sold. *(SC5 · D-233)*
- [ ] **ENF-02** — A suspended host's pending payouts **freeze**, and no payout leaves for a host
      under suspension. A frozen row does not read as a stuck row to the reconciler and does not page
      an operator. *(SC5 · D-222, D-234)*
- [ ] **ENF-03** — Ops cancel-and-refund returns **the full booking amount** to the booker with the
      **service/platform fee retained** by FitOut, pays the host **nothing**, and charges **no**
      host-cancel fee. The fee behaviour sits behind one named constant
      (`OPS_CANCEL_REFUNDS_SERVICE_FEE`) with the D-236 conflict documented at that call site.
      *(SC5 · D-209, D-235, D-236)*

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| OPS-01 | Phase 18 | Partial (18-01 — staff standing reads server-side from `user.role`; `/api/auth/update-user` provably cannot write it. The "signs in to FitOut Ops" half needs the console, 18-12) |
| OPS-02 | Phase 18 | Partial (18-01 — `requireStaff()` is the boundary and refuses non-staff / NULL-role / signed-out with `notFound()`. The route half lands in 18-12; the HTTP status-line audit in 18-14) |
| OPS-03 | Phase 18 | Pending |
| OPS-04 | Phase 18 | Pending |
| OPS-05 | Phase 18 | Pending |
| HVER-01 | Phase 18 | Pending |
| HVER-02 | Phase 18 · 18-02 | Complete |
| HVER-03 | Phase 18 | Pending |
| HVER-04 | Phase 18 | Pending |
| HVER-05 | Phase 18 | Pending |
| LVER-01 | Phase 18 | Pending |
| LVER-02 | Phase 18 | Pending |
| LVER-03 | Phase 18 | Pending |
| LVER-04 | Phase 18 · 18-02 | Complete |
| ENF-01 | Phase 18 | Pending |
| ENF-02 | Phase 18 | Pending |
| ENF-03 | Phase 18 | Pending |

**17 requirements · Phase 18 · 0 complete**

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
