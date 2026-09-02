# Roadmap: FitOut

## Overview

FitOut is a two-sided marketplace for fitness and recreational spaces, booked by the hour or by the
day. **v1.0** built the core transaction — search, real availability, reserve, pay, host payout — with
the booking's realness enforced by a Postgres exclusion constraint rather than by application code.
**v1.1** put a single token contract between what a component asks for and what colour and size it
gets, across all nine v1.0 surfaces, so locking real branding later is a token edit rather than a
component sweep.

## Milestones

- ✅ **v1.0 MVP** — Phases 1–9 (shipped 2026-08-11) — 49/49 requirements
- ✅ **v1.1 Front-End Polish & Placeholder Design System** — Phases 10–17.1 (shipped 2026-08-31) — 69/71 requirements
- 📋 **v1.2** — not yet defined. **Phase 18 (Host Verification, Listing Review & FitOut Ops) was added
  ahead of the milestone cycle** on 2026-09-01 by PM decision. Run `/gsd-new-milestone` when v1.2's
  full scope is defined.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 13.1): Urgent insertions (marked with INSERTED)
- 999.x: Backlog — unsequenced, outside the active phase sequence

**Numbering continues across milestones.** v1.0 ended at Phase 9; v1.1 ended at Phase 17.1.

<details>
<summary>✅ v1.0 MVP (Phases 1–9, 107 plans) — SHIPPED 2026-08-11</summary>

- [x] **Phase 1: Auth & Accounts** (4/4) — verified 2026-06-03
- [x] **Phase 2: Listings & Host Onboarding** (6/6) — verified 2026-08-01
- [x] **Phase 3: Availability & the Double-Booking Guarantee** (5/5) — 2026-07-14
- [x] **Phase 4: Booking Core & Search (no payment)** (8/8) — 2026-07-15
- [x] **Phase 5: Payments & Payouts** (7/7) — verified 2026-07-16
- [x] **Phase 6: Full Booking + Payment Integration** (10/10) — 2026-07-20
- [x] **Phase 7: Bookings Management, Cancellation & Notifications** (20/20) — 2026-07-24
- [x] **Phase 8: Group Bookings** (22/22) — 2026-07-29
- [x] **Phase 9: Open-Capacity Bookings** (25/25) — 2026-08-01

**Full phase details:** `.planning/milestones/v1.0-ROADMAP.md`
**Requirements** (49/49): `.planning/milestones/v1.0-REQUIREMENTS.md`
**Audit:** `.planning/milestones/v1.0-MILESTONE-AUDIT.md`

</details>

<details>
<summary>✅ v1.1 Front-End Polish & Placeholder Design System (Phases 10–17.1, 149 plans) — SHIPPED 2026-08-31</summary>

- [x] **Phase 10: Design-System Foundation & Theme Runtime** (17/17) — 2026-08-12
- [x] **Phase 11: Quality Gates, Pattern Layer & App Shell** (22/22) — 2026-08-17
- [x] **Phase 12: Booker Path — Search → Listing → Checkout** (15/15) — 2026-08-19
- [x] **Phase 13: Confirmation, Bookings & Trust** (16/16) — verified; WALK A + WALK B discharged 2026-08-31
- [x] **Phase 13.1: Payment Reconciliation (INSERTED)** (5/5) — 2026-08-22
- [x] **Phase 14: Host Tooling** (16/16) — 2026-08-23
- [x] **Phase 15: Auth, Profile & Transactional Email** (14/14) — 2026-08-25
- [x] **Phase 16: Image Crop & Framing** (16/16) — verified 2026-08-26
- [x] **Phase 16.1: Upload Hardening & Storage Economy (INSERTED)** (7/7) — 2026-08-28
- [x] **Phase 17: Cross-Cutting Audit — Themes, Responsive, A11y & Baselines** (14/14) — 2026-08-30
- [x] **Phase 17.1: Close Phase 17 Escalations (INSERTED)** (7/7) — 2026-08-30
- ~~**Phase 18: Search & Discovery**~~ — **DEFERRED to backlog 999.3** (D-141), spiked but never planned
- ~~**Phase 19: Availability Copy-to-All**~~ — **shipped as quick task `260831-ndc`** (D-142), never run as a phase

Also carrying requirements: quick task **`260831-rpt`** closed TRUST-02/TRUST-03, the D-78 email
handoff neither Phase 13 nor Phase 15 executed — found by the milestone audit.

**Full phase details:** `.planning/milestones/v1.1-ROADMAP.md`
**Requirements** (69/71 · 8 descoped by D-141): `.planning/milestones/v1.1-REQUIREMENTS.md`
**Audit:** `.planning/milestones/v1.1-MILESTONE-AUDIT.md`

</details>

### 📋 v1.2 — not yet defined · one phase added ahead of the cycle

**v1.2 has not been through the milestone cycle** — no requirements doc, no research, no roadmap
pass. **Phase 18 was added ahead of it on 2026-09-01 by PM decision**, because the hole it closes is
live in production: *FitOut cannot tell a real host from a fraudulent one, and has no ops function to
find out.* **Phase 18.1 was inserted the same day** — Phase 18 shipped the console that decides and
never shipped the thing that submits to it, and the Internet Transactions Act of 2023 turns that from
a product gap into a compliance one. Run `/gsd-new-milestone` when v1.2's full scope is defined; both
fold into it.

**Two requirements carry forward unsatisfied from v1.1**, both closed by one monitored support
address at `src/lib/site.ts:70`: `STATE-05` and `TRUST-01`. `TRUST-01` is now **Phase 18's
neighbour** — a monitored support address is where a report of a fake listing would land, and 999.4
below is the queue it would feed.

### Phase 18: Host Verification, Listing Review & FitOut Ops

**Goal**: A space cannot be sold on FitOut until a person at FitOut has checked who the host is and
that the listing is real — and FitOut has the ops function, the authenticated staff identity, and the
enforcement levers to do that checking and to undo it.

**Depends on**: Phase 17 (net-new capability; sequenced after the v1.1 polish work)
**Requirements**: OPS-01, OPS-02, OPS-03, OPS-04, OPS-05, HVER-01, HVER-02, HVER-03, HVER-04,
HVER-05, LVER-01, LVER-02, LVER-03, LVER-04, ENF-01, ENF-02, ENF-03 — **17 requirements**, written
at plan time into `.planning/REQUIREMENTS.md`, which was opened ahead of the v1.2 milestone cycle and
holds Phase 18 only (D-239). `HVER-05` (the booker-facing badge, SC#6) was added beyond the four
proposed families, which had no home for it.
**UI hint**: yes — two distinct surfaces (an internal ops console, and the booker-facing badge).

**Success Criteria** (what must be TRUE):

  1. A staff member signs in to FitOut Ops **as themselves**, and every ops action records who did it
     — *authenticated*, not asserted. No ops power is reachable by a non-staff account, and none is
     reachable by knowing a URL.
  2. A host cannot sell until a FitOut ops person has approved **both the host and the listing**, and
     that approval is a **term of the sell-gate itself** — never a separate check a code path can
     forget to run.
  3. Ops works one queue: hosts awaiting verification and listings awaiting review, oldest first,
     with everything needed to decide on the same screen — and approve/reject carries a reason the
     host is actually told.
  4. A **material edit** to an approved listing (address, space type, capacity, photos, price)
     returns it to review and stops it being sellable until re-approved. Approval is not a permanent
     grant.
  5. Ops can suspend a host or pull a listing and choose **per case** (PM decision, 2026-09-01):
     block new bookings only, or additionally cancel-and-refund what is already sold. Either way the
     host's pending payouts **freeze**, and no payout leaves for a host under suspension.
  6. A booker sees what verification actually means — a badge that states **what FitOut checked**,
     and never implies we inspected the space when we checked a document.
  7. Identity checking runs through a **third-party KYC vendor**: FitOut stores a pass/fail and a
     reference, **never a government ID**.

**PM decisions taken 2026-09-01, before planning** (record them as D-numbers at discuss time):

  - **Strictness: ops approves every host AND every listing.** Not host-only, not first-listing-only,
    not automated-with-flags. This throttles supply growth to ops throughput — accepted, because the
    core value promise is that the booking is *real*.
  - **Identity: third-party KYC vendor, not documents held by FitOut.** FitOut does not become a
    custodian of government IDs. **The vendor is NOT chosen** — see the open decision below.
  - **Enforcement: both levers, ops chooses per case.** Default is block-new + freeze payouts; ops can
    escalate to cancel-and-refund when the space is confirmed fake.
  - **Scope: this phase only; the rest goes to backlog.** Booker-side reporting (999.4), reviews and
    ratings (999.5) and host appeals (999.6) are explicitly OUT.
  - **Suspension is IN, despite being adjacent to 999.4** (SWE call, stated to the PM): an
    approve-only console is unsafe, because ops must be able to pull a listing it already approved.

**OPEN DECISION — the KYC vendor is not chosen, and must not be chosen silently.** The PM asked
directly whether PayMongo's own KYC can serve this. It is a real candidate *and* a real risk: PayMongo
Platforms / Linked Accounts is the mechanism already wired to `host_payout.activationStatus` and the
`merchant.activated` webhook, but it is **sales-gated and has never been walked** (see § Carried
Forward), so betting host verification on it bets the phase on a third party we currently cannot
reach. This phase owes a **written comparison** — PayMongo Linked Accounts vs. a standalone PH KYC
vendor — brought back to the PM as a fork, not settled by the planner.

**⚠ THE SELL-GATE IS THE TRAP, and it is bigger than it looks.** Criterion 2 means adding a term to
`deriveBookable` (`src/lib/bookability.ts`), and that function is deliberately built so this is not a
one-line change:

  - It is **pure and parameterised** specifically so adding a required field makes **every call site a
    compile error** — the census is done by `tsc`, not grep. There are four.
  - It has an **inlined SQL twin** in `src/lib/search/query.ts` Stage-1, held equal by
    `tests/search/bookable-gate.test.ts` over shared fixtures. Drift in either direction fails there.
  - It has **two server-side re-derivation sites** — `placeHold` and `placeOpenHold` in
    `src/app/actions/booking.ts` — written by deliberate RE-STATEMENT, each with its own refusal
    anchor. **Do not fold them into a shared helper.**
  - The new term must be **independent of `payoutsEnabled`**. That term was meant to be the identity
    gate and cannot be relied on: PayMongo Linked Accounts is sales-gated, so in production it never
    turns true on its own merits. Today's effective gate is *"the host clicked a link in an email."*

**⚠ STAFF IDENTITY DOES NOT EXIST YET, and the existing ops workflow proves it.** `user.role` is a
declared-but-dead slot (`src/lib/auth.ts:112`, `input: false`, no admin plugin, no route guard, zero
reads). The one operator workflow that ships today is `scripts/ops-alerts.ts`, which connects with
`DATABASE_URL` and **has no login of any kind** — the schema says so about `audit.resolved_by` in its
own words: *asserted, not authenticated*. Phase 18 is what finally gives that column an authenticated
actor. Staff access control is therefore the **first** plan, not a later one: an ops console over live
bookings and money, built before staff auth, is a bigger hole than the one being closed.

**✅ CLOSED BY 18-01 (2026-08-31).** `user.role` is no longer dead: `src/lib/ops/staff.ts` reads it off
the session through one `cache()`'d expression, `requireStaff()` is the per-page/per-action security
boundary and returns the **authenticated** staff id every later ops audit row is written with, and
`npm run ops:grant -- <email> --by "<name>"` is the only path to staff standing. The Better Auth admin
plugin was rejected on measurement (15 privileged routes the existing catch-all would publish
instantly). ⚠ One invariant now rides on the auth config: `requireStaff()` is correct only while
`session.cookieCache` stays unconfigured — enabling it would keep a REVOKED grant alive for the cache
TTL, and no test would go red. It is written into that module's header.

**Plans:** 14/14 plans complete
SEQUENTIALLY on `dev`, one executor at a time — waves express dependency order, not concurrency.

Plans:
- [x] 18-01-PLAN.md — Staff identity: `requireStaff`/`assertStaff` + the CLI grant (wave 1)
- [x] 18-02-PLAN.md — Schema, migrations & the grandfather backfill · **[BLOCKING] `npm run db:migrate`** (wave 2)
- [x] 18-03-PLAN.md — The sell-gate: seven sites + the fixture/seed sweep, ONE commit (wave 3)
- [x] 18-04-PLAN.md — Hidden until approved: the three leak surfaces (wave 4)
- [x] 18-05-PLAN.md — Verification port, ops decision actions & the review queue (wave 4)
- [x] 18-06-PLAN.md — Material edit returns a listing to review (wave 4)
- [x] 18-07-PLAN.md — Payout freeze under suspension (wave 4)
- [x] 18-08-PLAN.md — Ops cancel-and-refund, behind the D-236 constant (wave 5)
- [x] 18-09-PLAN.md — Telling the host: the OPS-05 notification · **[BLOCKING] `npm run db:migrate`** (wave 6)
- [x] 18-10-PLAN.md — The ops queue row & decision controls (wave 6)
- [x] 18-11-PLAN.md — The booker-facing check badge (wave 6)
- [x] 18-12-PLAN.md — The `/ops` route, its three guard layers & the design-gate ledger (wave 7)
- [x] 18-13-PLAN.md — Host-facing review & suspension signals (wave 7)
- [x] 18-14-PLAN.md — HVER-04 vendor comparison & the OPS-02 status-line audit (wave 8, has checkpoint)

### Phase 18.1: Close Phase 18 — the verification path FitOut is legally required to have (INSERTED)

**Goal**: A host can actually be verified — and FitOut collects, before a listing goes up, what
**RA 11967 § 21(b)** requires it to collect. Phase 18 shipped the console that *decides* and never
shipped the thing that *submits to it*; this phase closes that, wires the chosen vendor, lands the
gate, and discharges the PM decisions Phase 18 left open.

**Depends on**: Phase 18 (closes it — the Phase 18 checkbox cannot be ticked until this ships)
**Requirements**: new `HVER-06..08`, `LVER-05`, `OPS-06` written at plan time into
`.planning/REQUIREMENTS.md` (the D-239 convention Phase 18 used). The three close-out items carry
**decisions**, not requirements: **D-236**, **D-231**, and the **F11** earnings gap.
**UI hint**: yes — a host-facing verification surface, a gated listing wizard, and one ops row change.

**⚠ WHY THIS IS AN INSERTION AND NOT v1.2 SCOPE.** Two independent reasons, both measured rather than
argued:

  1. **A live production defect.** Repo-wide, the only `INSERT INTO host_verification` is
     `e2e/helpers/booker-seed.ts:600` and the `drizzle/0026` grandfather backfill. `approveHost()` is
     an `UPDATE … WHERE status IN ('pending','unverified')`, so with no row it flips nothing and
     returns `STALE`. **The ops host queue can never fill, no new host can ever be approved, and no
     new host can ever sell.** Only hosts grandfathered at cutover can transact.
  2. **A statutory obligation, not a product choice.** The **Internet Transactions Act of 2023
     (RA 11967)** has been **fully enforced since 20 June 2025** and requires an online platform to
     collect from every merchant *prior to listing* a name plus at least one valid government
     identification, a geographic address, and contact details including a phone number and a valid
     email — and to keep that list *"updated and verified regularly"* under an **ordinary diligence**
     standard. See `.planning/phases/18-host-verification-listing-review-fitout-ops/18-REGULATORY-BRIEF.md`.
     Phase 18's own goal is therefore unmet in a way that is not merely a product gap.

**Success Criteria** (what must be TRUE):

  1. A host can **ask to be verified**, and doing so puts a real row in the ops queue. The "hosts
     awaiting verification" half of `/ops` fills from ordinary product use — proven by driving it,
     because today it provably cannot.
  2. Identity is checked by **Didit** behind the existing verification port. FitOut stores
     `{ result, vendorRef, checkedAt, provider }` and **never a document, an ID number or an image** —
     `tests/ops/verification-schema.test.ts`'s column allow-list still passes untouched.
  3. The **manual provider stays registered** as the ops override: a vendor outage, an edge-case
     document or an appeal can still be decided by a named staff member, and those rows stay
     distinguishable in the audit trail by `provider = 'manual'`.
  4. FitOut holds, for every host verified after this phase, what § 21(b) names: the identity check
     (via the vendor), a **geographic address**, a **phone number** and a **valid email**. Phone and
     email are **required at submission** — not optional profile fields.
  5. **A host cannot create a listing until they are verified.** Server-side in the action, never a
     hidden button — and the refusal names the state, the reason and the way out.
  6. **Ops can reach a host**: email and phone revealed on demand from the queue row, each reveal
     writing an audit row carrying ids only — never the address itself (D-72).
  7. The three carried PM decisions are implemented: an ops-forced cancellation refunds the **full
     charge** (D-236 flipped), **title and description are material fields** (D-231), and a suspended
     host's `/host/earnings` **names the frozen session** (F11).
  8. Phase 18's roadmap checkbox can be ticked.

**PM decisions already taken (2026-09-01) — ANSWERED, do not re-ask.** Recorded in `18-14-SUMMARY.md`
§ The five checkpoint decisions and `18-KYC-VENDOR-COMPARISON.md` § ✅ DECIDED:

  - **PM-C** — the gate sits at **listing creation**, not at publish and not at hosting entry.
  - **PM-D** — the submission path is built; the no-documents storage contract is unchanged.
  - **PM-E** — host contact is **reveal-on-click with an audit row**, not always-visible.
  - **PM-F** — the vendor is **Didit**. PayMongo Linked Accounts rejected: its activation *is* its
    payouts gate, so it re-couples identity to payouts and undoes D-225, and it is sales-gated —
    probed negative twice, two months apart, with its own docs page 404ing on both hosts.
  - **PM-G** — the manual provider stays as an ops override. D-215 stands: one staff role, no tiers,
    no permission table.
  - **D-236** flipped to `true`. **D-231** — add title + description, keep reorder excluded.
    **F11** — yes, name the frozen session; do **not** name what unfreezes it (18-13's refusal stands).

**⚠ THREE TRAPS, each already measured — do not rediscover them.**

  - **D-236 is NOT a one-line change**, despite three phase documents saying it is. Production is one
    line (`src/lib/payments/fees.ts:82`), but `tests/payments/ops-cancel.test.ts` **case 1 asserts the
    constant is literally `false`** and fails by design, carrying its own "swap cases 1 and 2" message;
    `withFlippedConstant` hard-codes its mock to `true` and must become `false`; case 3's two
    expectation sets swap; and the docblock above the constant argues at length for the value being
    replaced.
  - **D-231's accepted cost**: a material edit flips `review_state` to `pending`, and `deriveBookable`
    requires `approved|grandfathered` — so **a typo fix in a description takes the listing off the
    market until ops re-approves it.** Ruled acceptable by the PM over a "material but still sellable"
    variant that would need a state the sell-gate does not have.
  - **`re-review.ts` is a deliberately SHARED helper** while the sell-gate's re-statements in
    `booking.ts` are deliberately DUPLICATED (D-227). Do not "consistently" refactor either into the
    other. One enum literal is also deliberately absent from that file because an acceptance grep
    counts occurrences of it — read its header before editing.

**⚠ EXPLICITLY OUT OF SCOPE:**

  - **The `/ops` staff-management surface** (PM-A/PM-B — create/grant/revoke inside `/ops`, onboarded
    by the ordinary signup + email-confirmation flow, no 2FA). It **supersedes D-217**, needs its own
    invite flow, and has **no compliance driver** — the ITA says nothing about how FitOut's own staff
    sign in. → **v1.2.** Captured in
    `.planning/todos/pending/2026-09-01-ops-staff-management-surface-and-invite-flow.md`.
  - **DTI E-Commerce Bureau registration for FitOut itself** — a company action, not code.
  - **§ 21(f) redress mechanisms** — booker-side reporting and host appeals. Now understood as
    **obligations rather than roadmap candidates**, but they stay backlog **999.4** and **999.6**.

**⚠ ONE COUNSEL POINT REMAINS OPEN AND DOES NOT BLOCK THIS PHASE.** Desk research settled the question
PM-H was gating on: BSP Circular 1170 binds BSP-supervised institutions and not a marketplace, FitOut
is not an AMLA covered person, and cross-border transfer to a US/EU vendor is fine — no residency
mandate, and NPC Advisory 2024-01's model clauses are voluntary. **Nothing mandates a PH-licensed
vendor, so PM-F is safe to build.** What is still owed is (i) the timing exposure since 20 June 2025
and (ii) whether holding only a `vendorRef` satisfies § 21(c)'s "updated and verified regularly" list
and the subpoena clause. **Both are vendor-independent** — equally open under Innov8tif or PayMongo —
so neither changes what this phase builds.

**Plans:** 5/14 plans executed
Worktrees stay OFF, so plans run **sequentially on `dev`, one executor at a time**; the waves express
dependency order, not concurrency. No two plans in a wave modify the same file.

**The suggested nine became fourteen, and each departure was a call rather than a drift:**

- **18.1-04/18.1-05 FOLDED** into one submission-path plan (now `18.1-07`). `18.1-RESEARCH § 18.1-05`
  observes they *"share one action and one test file"* — phone and email are gates INSIDE
  `requestHostVerification`, not a separate surface, and **D-267 makes the address half zero work**
  (the listing's own address IS the § 21(b) record). Splitting them would have produced a plan whose
  only artifact was two `if` statements inside another plan's function.
- **The vendor work SPLIT three ways** — credentials + the port widening (`04`), the adapter (`05`),
  the status/warning mapper (`06`) — because each is a distinct contract and the mapper must land
  **before** the `/host/verify` `pending` panel for that panel's copy to be honest (FINDING F-3).
- **FINDING F-4 SHIPS as its own plan (`09`).** Didit retries a webhook twice then drops it
  permanently; with D-262 and D-263 that is a silent, unrecoverable dead end. Inngest is already
  shipped and `payment-reconcile.ts` is the exact precedent.
- **The host surface SPLIT** into the copy module + resend extraction (`10`) and the panel + route +
  design ledger (`11`), on the interface-first rule: the words exist before the surface renders them.
- **A requirements-authoring task opens `01`**, because `HVER-06..08`, `LVER-05` and `OPS-06` are
  written at plan time (the D-239 convention) and every later plan cites them.
- **A closing evidence plan (`14`)** carries the two things no gate in this repo can do: the real
  Didit sandbox transcript, and the 320/1280 both-themes hand-measure.

| Wave | Plans |
|------|-------|
| 1 | 18.1-01, 18.1-02, 18.1-04 |
| 2 | 18.1-03, 18.1-05, 18.1-06 |
| 3 | 18.1-07, 18.1-08 |
| 4 | 18.1-09, 18.1-10 |
| 5 | 18.1-11 |
| 6 | 18.1-12, 18.1-13 |
| 7 | 18.1-14 |

Plans:

- [x] 18.1-01-PLAN.md — Phase requirements written; D-236 flips the ops-cancel refund basis to the full charge (wave 1)
- [x] 18.1-02-PLAN.md — F11/D-260: a suspended host's `/host/earnings` names the frozen session (wave 1)
- [x] 18.1-04-PLAN.md — Didit credentials, the port widened for an async provider, `updatedAt` · **[BLOCKING] Didit Console checkpoint** (wave 1)
- [x] 18.1-03-PLAN.md — D-231: title + description become material fields (wave 2)
- [x] 18.1-05-PLAN.md — The Didit adapter behind the port; manual retained, `migration` still unregistered (wave 2)
- [ ] 18.1-06-PLAN.md — `didit-verdict.ts`: ten statuses, two casings, the D-265 allow-list · **settles F-3** (wave 2)
- [ ] 18.1-07-PLAN.md — The host verification submission path + § 21(b)(3) phone/email · **closes the live defect, proves SC1** (wave 3)
- [ ] 18.1-08-PLAN.md — The Didit webhook: one authenticated door, clean 400 on everything else (wave 3)
- [ ] 18.1-09-PLAN.md — The Inngest reconciliation sweep · **F-4 ships** (wave 4)
- [ ] 18.1-10-PLAN.md — The verification copy module and the email-resend extraction (wave 4)
- [ ] 18.1-11-PLAN.md — `/host/verify`: the panel, the route, its plate and five moved design counts (wave 5)
- [ ] 18.1-12-PLAN.md — PM-C: the listing-creation gate + the fixture sweep · **closes F-2, pins F-7** (wave 6)
- [ ] 18.1-13-PLAN.md — PM-E: host contact reveal in `/ops`, audited per reveal · **resolves F-6** (wave 6)
- [ ] 18.1-14-PLAN.md — The Didit sandbox transcript, the hand-measure, and Phase 18's checkbox · **[BLOCKING] two human checkpoints** (wave 7)


## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1–9 | v1.0 | 107/107 | Complete | 2026-06-03 → 2026-08-01 |
| 10. Design-System Foundation & Theme Runtime | v1.1 | 17/17 | Complete | 2026-08-12 |
| 11. Quality Gates, Pattern Layer & App Shell | v1.1 | 22/22 | Complete (3 UAT items open — all business facts) | 2026-08-17 |
| 12. Booker Path — Search → Listing → Checkout | v1.1 | 15/15 | Complete | 2026-08-19 |
| 13. Confirmation, Bookings & Trust | v1.1 | 16/16 | Complete (WALK A + B discharged 2026-08-31) | 2026-08-31 |
| 13.1 Payment Reconciliation (INSERTED) | v1.1 | 5/5 | Complete | 2026-08-22 |
| 14. Host Tooling | v1.1 | 16/16 | Complete | 2026-08-23 |
| 15. Auth, Profile & Transactional Email | v1.1 | 14/14 | Complete | 2026-08-25 |
| 16. Image Crop & Framing | v1.1 | 16/16 | Complete | 2026-08-26 |
| 16.1 Upload Hardening & Storage Economy (INSERTED) | v1.1 | 7/7 | Complete | 2026-08-28 |
| 17. Cross-Cutting Audit | v1.1 | 14/14 | Complete | 2026-08-30 |
| 17.1 Close Phase 17 Escalations (INSERTED) | v1.1 | 7/7 | Complete | 2026-08-30 |
| 18. Host Verification, Listing Review & FitOut Ops | v1.2 | 14/14 | **Verified** `passed_with_concerns` — 17/17 requirements, 0 code-level blockers; **PM checkpoint ANSWERED 2026-09-01 (all 5); checkbox held until 18.1 ships the code** | verified 2026-09-01 |
| 18.1 Close Phase 18 — verification path (INSERTED) | v1.2 | 5/14 | In Progress|  |

## Carried Forward (not v1.2 scope until promoted)

- **Real host payouts have never moved real money** — PayMongo `/v2` money movement is sales-gated.
- **PayMongo hosted Linked-Accounts KYC (PAY-04) has never been walked** — same gate.
- **GCash and Maya have never been individually hand-paid** — closable today by a human with no new
  code; card and QR Ph are already proven.
- **`SUPPORT_EMAIL`** — one line closes `STATE-05` and `TRUST-01`.
- **~22 of Phase 17's escalate-class findings** await PM review; **D-24** leaves the milestone's own
  Playwright gates out of CI.

See STATE.md § Deferred Items for the full ledger.

## Backlog

Unsequenced ideas parked outside the active phase sequence (999.x). Promote with `/gsd:review-backlog`.

> **999.2 (image crop/framing UI) was PROMOTED into v1.1 on 2026-08-11** and is no longer in this
> backlog. It is now **Phase 16: Image Crop & Framing**, carrying requirements **CROP-01..04** in
> `.planning/REQUIREMENTS.md`. Its already-written spec stays where it is:
> `.planning/phases/999.2-profile-picture-and-listing-photo-crop-ui/999.2-UI-SPEC.md`.

> **999.3 (Search & Discovery) was DEFERRED OUT of v1.1 on 2026-08-31** by PM decision (**D-141**),
> after its spikes ran and before any plan was written. Its four spikes are complete and their
> findings stand — `.planning/spikes/` (001 one-box routing · 002 free text at 0025 · 003 bbox vs
> radius · 004 head-to-head), with three runnable demos. **D-139 and D-140 remain adopted**: D-140
> ("only certainty becomes a filter") is a general search principle that binds whenever this work
> resumes, and the GATE-06 crossover it measured (~12,000–20,000 published listings) is a live
> threshold regardless of when that happens. Requirements `SEARCH-06..09` and `MAP-01..04` move to
> Deferred in `.planning/REQUIREMENTS.md` rather than being deleted. Promote with
> `/gsd:review-backlog`.

### Phase 999.3: Search & Discovery — one-box query model + results map (BACKLOG)

**Goal**: A booker can say what they want, and see *where* it is.
**Was**: Phase 18 of v1.1, deferred 2026-08-31 (D-141) before any plan was written
**Depends on**: Phase 17 (net-new capability, sequenced after the polish work — D-136)
**Requirements**: SEARCH-06, SEARCH-07, SEARCH-08, SEARCH-09, MAP-01, MAP-02, MAP-03, MAP-04
**Success Criteria** (what must be TRUE):

  1. A booker can express a search in one box — an activity, a place, a date, or a listing's name — and the page shows what it understood; anything it *inferred* rather than recognised is offered for confirmation instead of applied silently.
  2. A booker can find a listing by its name or by words in its description, and every place the search offers is a place that has bookable listings.
  3. A booker sees search results on a map alongside the result list, and the two stay in sync — hovering or selecting a result highlights its marker, and selecting a marker highlights its card.
  4. A booker can move or zoom the map and re-search the visible area from an explicit control, with the result list following.
  5. Every map-only interaction has a keyboard-operable equivalent, and the whole surface holds all five gates including its own designed loading, empty and error states.

**Plans**: none — deferred before planning
**UI hint**: yes

**Scope discipline (D-136):** this is net-new capability, not polish — it changes what the product can *do*, and it carries its own REQ IDs (`SEARCH-06..09` continuing v1.0's numbering, plus `MAP-01..04`). It may never be folded into a surface-polish phase.

**Grounded by spikes 001–004** (`.planning/spikes/`), which measured the following. Treat each as a
finding with a number behind it, not a preference:

- **The query model is closed-set-first.** Vocabulary and our own catalog are matched *before* the geocoder, which is reached last and clamped to the launch bbox. Unclamped, `pickleball` returns two courts in the **United States**; the staged router reached the geocoder **0 of 30** times on realistic queries. Photon's `layer` must be a **repeated** param — comma-joined returns a shaped error object, not a 400.
- **Only certainty becomes a filter.** Fuzzy and prefix matches are shown as suggestions, never applied: measured false positives were `dennis` → `category=tennis` and a *uniquely, therefore confidently* wrong `ayala` → "Ayala Alabang". A wrong category does not fail to help — it silently deletes the listings the booker wanted.
- **GATE-06 is not threatened, and the trigger is recorded.** Free text ships as **per-word AND `ILIKE` with naive suffix stripping** — added cost indistinguishable from zero below ~12,000 published listings (FitOut has 18). A GIN index becomes mandatory between **~12,000 and ~20,000**; that threshold ships as a comment beside the query. The phrase form `%whole query%` is a trap — zero results on reversed word order, on a stop-word between terms, and on words in different sentences. Query-time FTS without an index is strictly dominated and must not be used.
- **The map needs no migration either.** `location && ST_MakeEnvelope(...)` is served by the existing `listing_location_gist` and is ~6× cheaper than the radius predicate.
- **When a bbox is present it is the ONLY geo predicate** — `lat/lng/radius` are dropped and the `Within … km` control is hidden while the map governs. Letting the radius win puts 1,131 results in the list that are off-screen and draws 152 pins that are not in it, which cannot satisfy MAP-01.
- **⚠ `relaxation.ts` and `e2e/zero-result-relax.spec.ts` are IN SCOPE.** Ladder rung 1 widens the radius; under a governing bbox that moves the result set **0 → 0** while the band still announces "we widened your search to 25 km" — and the spec compares the band against the *control*, not the results, **so it stays green while the page lies**.
- **Re-search on an explicit "Search this area", never on pan** — D-32 makes the URL the search's identity, so pan-to-search turns Back into a history trap. It is also the only form MAP-04's keyboard equivalent can take.
- **The box goes in front of the existing controls, not instead of them.** It saved 10 / 5 / 6 taps on three intents and removes the pre-submit geocoder call entirely, but returns only partial on "yoga in ortigas under 800": **there is no price NLP and there must not be** (D-137 — never surprise them with a number). This keeps the phase additive rather than a rewrite of the search surface.
- **⚠ GATE-RESP is already failing here.** The shipped bar stacks to **570px at 375px wide — 85% of a 667px phone screen** — before a map is added. The UI spec owes small screens a collapsed box plus a Filters control.

Known latent trap to plan for: Leaflet's `z-index: 1000` against shadcn's `z-50` overlay — the DS-03 z-index scale from Phase 10 is the arbiter. **Clustering is unsolved** and deliberately out of the spikes: 400 pins is already busy at city zoom. D-130 still binds: the bbox and the query go into the **server** query; no availability or price is computed on the client.

### Phase 999.1: Auth flow tells the user nothing — thin emails + silent post-reset landing (BACKLOG)

**Goal:** [Captured for future planning]
**Requirements:** TBD (touches AUTH-03, AUTH-05 surfaces; neither requirement is unmet — both are SATISFIED. This is the experience around them.)
**Plans:** 0 plans

**Captured:** 2026-08-05, during the v1.0 milestone audit, while closing Phase-1 human item 2
(password-reset delivery to a real inbox). **That item PASSED** — the mechanism is correct and
verified end to end: the email reached a real inbox, the password rotated, and every prior session
was revoked. What follows is what *surrounds* the working mechanism. Two halves of one complaint:
*the auth flow does not tell you what is happening.*

**Part A — the emails are one-liners.** `src/lib/email.ts:54-62`:

```
sendVerificationEmail -> "Verify your FitOut email"    | Verify: <a href="URL">URL</a>
sendResetPassword     -> "Reset your FitOut password"  | Reset:  <a href="URL">URL</a>
```

The raw URL is its own anchor text. Compare the Phase-7 D-66 lifecycle emails
(`sendBookingConfirmed`, `src/lib/email.ts:101+`), which get a bolded heading, named detail lines
and a labelled CTA. The auth emails are Phase-1 artifacts that never got that treatment.

Not merely cosmetic: the reset email states **neither the token expiry nor the standard "if you
didn't request this, ignore it" line** — both baseline security-hygiene expectations on a
password-reset email specifically.

**Part B — the post-reset landing is silent.** Observed live on 2026-08-05:

```
POST /api/auth/reset-password -> 200
GET  /                        -> 200      ... and ZERO session rows for that user
```

`revokeSessionsOnPasswordReset: true` correctly kills every prior session, and Better Auth's
`resetPassword` mints no new one — so the user is definitively signed **out**. But they land on `/`,
the PUBLIC search home, which renders identically for an anonymous visitor, with no "password
changed — please sign in" anywhere. A real user in that session believed they were logged in and
reported "got in" when no login had occurred. That is the sharper half of the two.

**Constraints any fix MUST preserve** (each is a deliberate prior decision, not an oversight):

- Keep `escapeHtml()` on the URL before interpolation — that is the WR-01 fix; never interpolate a
  raw url into HTML.

- Do NOT introduce React Email or any new email stack. D-66 deliberately keeps thin plain-HTML sends
  over the same `send()`/`escapeHtml()` helpers.

- Keep `revokeSessionsOnPasswordReset: true`.
- Do NOT auto-create a session on reset. Silently signing someone in from an emailed link is worse
  than the current confusion — **the fix is a confirmation plus a route to `/login`, not an auto-login.**

- `tests/auth/email-escaping.test.ts` and `tests/auth/email-dev-fallback.test.ts` assert on these
  paths. Extend them; do not weaken them.

**Do both parts together** — fixing one alone leaves the complaint half-answered.

> Deliberately left in the backlog for v1.1 (2026-08-11) despite adjacency: v1.1 already touches both
> the auth screens (AUTHUI) and the email layer (EMAIL). Tracked in `REQUIREMENTS.md` § Future
> Requirements as **AUTHFB-01/02**. If Phase 15's EMAIL-01 shell work makes AUTHFB-01 near-free in
> passing, promoting it is a small roadmap amendment rather than a new milestone.

Plans:

- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.4: Booker-side reporting & dispute resolution (BACKLOG)

**Goal**: A booker who finds a space that does not exist, is not as described, or whose host never
showed up has somewhere to say so — and ops has an inbound queue rather than only an onboarding check.
**Requirements**: TBD
**Captured**: 2026-09-01, splitting Phase 18's scope by PM decision.

Deliberately out of Phase 18 so that phase stays shippable. The gap it leaves is real and should be
stated plainly: **Phase 18 catches fraud at onboarding and never again.** Nothing in the product today
carries a report — there is no report table, no flag surface, and no path from "this listing is fake"
to an ops queue. The money angle is what makes this its own phase rather than a form: a report can
arrive **after** the booker has paid and **before** the host has been paid out, so it lands squarely on
the hold-until-session payout window and the `host_payout_ledger` state machine. Phase 18's payout
**freeze** lever is the hook this phase plugs into.

**Plans:**

- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.5: Reviews & ratings (BACKLOG)

**Goal**: A booker can see what other bookers experienced, and a host's record follows them.
**Requirements**: TBD
**Captured**: 2026-09-01, splitting Phase 18's scope by PM decision.

**FitOut has no reputation signal of any kind** — there is no review or rating table in
`src/lib/db/schema.ts`, and no rating anywhere in the UI. This is net-new capability, not polish, and
it is two things at once: the largest remaining booker-trust gap, and the cheapest **continuous**
fraud detector we could own. Phase 18 buys a one-time check at the door; this is the signal that keeps
paying afterwards. Sequenced after 999.4 — a review system without a report path gives ops a
complaints channel it cannot act on.

**Plans:**

- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.6: Host appeals (BACKLOG)

**Goal**: A host who is rejected or suspended has a defined route back, rather than a support ticket
that never closes.
**Requirements**: TBD
**Captured**: 2026-09-01, splitting Phase 18's scope by PM decision.

Directly downstream of Phase 18: the moment ops can reject and suspend, someone will be rejected
wrongly. Small in code, real in support load. **Phase 18 must not paint this into a corner** — its
reject/suspend actions carry a reason and an authenticated actor precisely so an appeal has something
to review.

**Plans:**

- [ ] TBD (promote with /gsd:review-backlog when ready)
