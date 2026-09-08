# Roadmap: FitOut

## Overview

FitOut is a two-sided marketplace for fitness and recreational spaces, booked by the hour or by the
day. **v1.0** built the core transaction — search, real availability, reserve, pay, host payout — with
the booking's realness enforced by a Postgres exclusion constraint rather than by application code.
**v1.1** put a single token contract between what a component asks for and what colour and size it
gets, across all nine v1.0 surfaces, so locking real branding later is a token edit rather than a
component sweep.

**v1.2** takes the host-verification and ops machinery Phase 18 shipped and makes it legible to hosts
and operable by staff: ops moves to its own `ops.` host with its own sign-in and invite flow, Didit's
verdict stands without an operator in the loop, and a host can finally see where they stand.

## Milestones

- ✅ **v1.0 MVP** — Phases 1–9 (shipped 2026-08-11) — 49/49 requirements
- ✅ **v1.1 Front-End Polish & Placeholder Design System** — Phases 10–17.1 (shipped 2026-08-31) — 69/71 requirements
- 🔄 **v1.2 Verification & Operations** — Phases 18–23 (opened 2026-09-03, scoped 2026-09-04) —
  **22/47 requirements complete**. Phases 18 and 18.1 were built *ahead* of the milestone cycle by PM
  decision; they **fold into v1.2** rather than being re-planned, and numbering continues from **19**.

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

### 🔄 v1.2 Verification & Operations — Phases 18–23 (IN PROGRESS)

**Goal:** Make FitOut's verification loop **legible to hosts** and **operable by staff** — a host can see
where they stand and what is left, staff sign in to their own isolated ops surface and decide with the
full picture in front of them, and the hosting surfaces stop misreporting their own state.

**Phases 18 and 18.1 are v1.2's first two phases, and they are already complete and verified.** Both
were built ahead of the milestone cycle on 2026-09-01 by PM decision — the hole Phase 18 closes was live
in production (*FitOut could not tell a real host from a fraudulent one, and had no ops function to find
out*), and Phase 18.1 was inserted the same day because Phase 18 shipped the console that *decides* and
never shipped the thing that *submits to it*. `/gsd-new-milestone v1.2` ran 2026-09-03 and the rest was
scoped 2026-09-04. **Their 22 requirements are counted in this milestone rather than re-planned**, and
phase numbering **continues from 19**.

**Requirements: 47 total — 22 complete (Phases 18 · 18.1) + 25 outstanding (Phases 19–23).**

- [x] **Phase 18: Host Verification, Listing Review & FitOut Ops** (14/14) — verified 2026-09-03 ·
      17 requirements · *built ahead of the cycle, folded in*
- [x] **Phase 18.1: Close Phase 18 — the verification path (INSERTED)** (16/16) — verified 2026-09-03 ·
      5 requirements
- [ ] **Phase 19: Host Listing Surfaces & Gates That Actually Run** — the host grid renders honestly,
      creating a listing lands on the wizard, and the Playwright specs run in CI · HSURF-01, HSURF-02,
      CI-01
- [ ] **Phase 20: Ops Gets Its Own Front Door** — the `ops.` host, its own sign-in, and staff
      invite/onboard without a production `DATABASE_URL` · OPS-07…OPS-12
- [ ] **Phase 21: The Host Can See Where They Stand** — the verification roadmap, the named cause, the
      stale-pending rescue, and the deliberate resubmit · HVER-09…HVER-14, LVER-06…LVER-09
- [ ] **Phase 22: Ops Decides With the Whole Picture** — the manual host queue goes, enforcement gets a
      surface, and listing detail expands in place · ENF-04, OPS-13…OPS-15
- [ ] **Phase 23: The Support Path Becomes Reachable** — one line, blocked on a monitored address ·
      STATE-05, TRUST-01

#### ⚠ Milestone invariants — every v1.2 plan is bound by these

1. **ZERO new runtime dependencies, across the whole milestone.** Measured in `research/STACK.md`:
   every mechanism v1.2 needs — the Host rewrite, host-scoped cookies, the invite flow, Playwright in
   CI — is already installed and paid for. **An `npm install` inside a v1.2 plan is a SCOPE ALARM to be
   raised explicitly**, exactly as D-136 treated one in v1.1. Do not bump `next`, `better-auth` or
   `@playwright/test` either — the CI container image tag embeds the Playwright version, and the visual
   baselines are pinned to `next@16.2.7`.
2. **ZERO schema migrations, across the whole milestone.** Measured item by item in
   `research/ARCHITECTURE.md` § Migration summary — every value v1.2 renders already exists as a column.
   **A new file under `drizzle/` inside a v1.2 plan is the same scope alarm.** ⚠ For the record,
   `drizzle/` ends at **`0029_listing_review_cascade.sql`**, not `0026`; a plan asserting "migrations end
   at 0026" is false on arrival, and the next generated migration would be `0030`.
3. **The ops queue row's TERMINAL property survives.** Zero anchors of any scheme and zero
   `[role="link"]` elements, on **both row kinds**, **before and after** expansion. D-274 re-tightened
   this on 2026-09-03 and 18.1-16 reverted two widenings rather than emptying them. **A disclosure is a
   `<button>`, never a link**, and D-246's one-`/ops`-page rule holds — new ops capability is a *panel*,
   not a second page.
4. **Deploy target is Vercel + Neon** — `vercel.json` is tracked at HEAD, committed 2026-09-01 as
   `c6e43b0`, PM-confirmed 2026-09-04. ⚠ **Vercel preview hostnames are a live hazard for any Host-match
   rule**: every preview gets a generated `*.vercel.app` host, so a rule naming only the two production
   hosts either breaks previews outright or serves the ops surface from a preview host. Drive the match
   from **configuration, never a string literal**, and **fail closed** — an unrecognised host serves the
   public site, never ops. A *named* `ops.` subdomain suffices; no wildcard, so no Vercel nameservers.
5. **The proxy is routing; it is NEVER authorization.** The shipped three-layer guard — `assertStaff()`
   in the `(ops)` layout, `requireStaff()` in the page, `requireStaff()` as the first statement of every
   ops action — stays intact and Host-agnostic. Server Functions POST to their own URL and are **not**
   reliably matcher-covered, so a Host rewrite that also *gates* silently uncovers actions. No diff may
   remove a `requireStaff()` and add a host condition.
6. **Worktrees are OFF**, so plans run **sequentially on `dev`, one executor at a time**. Waves express
   dependency order, not concurrency.

**Two v1.1 carry-forwards are now IN v1.2 scope** and have moved out of § Carried Forward below:
`STATE-05` / `TRUST-01` (Phase 23) and **D-24**'s Playwright-gates-in-CI, which is now `CI-01` in
Phase 19.

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
  8. Phase 18's roadmap checkbox can be ticked. — ✅ **DISCHARGED 2026-09-03.** It was held twice,
     and both holds are now gone. The first: Phase 18 shipped the console that decides but not the
     path that lets a host ask, so the checkbox waited on 18.1 shipping that path — 18.1-07 did.
     The second: 18.1-14's own hand-measure produced **PM decision D-274** (`deferred-items.md § D9`),
     that the revealed `/ops` contact become plain copy-pasteable text rather than a clickable
     anchor. 18.1-14 refused to tick on that basis — ticking would have filed
     `18.1-EVIDENCE.md § P2`, a phase-closing record, describing a surface the PM had already ruled
     against. **18.1-16 shipped D-274** (the row is strictly terminal again, both 18.1-13 gate
     widenings reverted rather than emptied, and the focus-move announcement redesigned rather than
     deleted), and phase 18.1 then **verified `passed` 9/9 on 2026-09-03** — the verifier re-running
     all four gates itself rather than trusting a SUMMARY. **`OPS-06` closed with it; `HVER-06`,
     `HVER-07`, `HVER-08`, `LVER-03`, `LVER-05` and `ENF-03` are Complete in both representations.**

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

**Plans:** 16/16 plans complete
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
| 8 | 18.1-15 |
| 9 | 18.1-16 |

Plans:

- [x] 18.1-01-PLAN.md — Phase requirements written; D-236 flips the ops-cancel refund basis to the full charge (wave 1)
- [x] 18.1-02-PLAN.md — F11/D-260: a suspended host's `/host/earnings` names the frozen session (wave 1)
- [x] 18.1-04-PLAN.md — Didit credentials, the port widened for an async provider, `updatedAt` · **[BLOCKING] Didit Console checkpoint** (wave 1)
- [x] 18.1-03-PLAN.md — D-231: title + description become material fields (wave 2)
- [x] 18.1-05-PLAN.md — The Didit adapter behind the port; manual retained, `migration` still unregistered (wave 2)
- [x] 18.1-06-PLAN.md — `didit-verdict.ts`: ten statuses, two casings, the D-265 allow-list · **settles F-3** (wave 2)
- [x] 18.1-07-PLAN.md — The host verification submission path + § 21(b)(3) phone/email · **closes the live defect, proves SC1** (wave 3)
- [x] 18.1-08-PLAN.md — The Didit webhook: one authenticated door, clean 400 on everything else (wave 3)
- [x] 18.1-09-PLAN.md — The Inngest reconciliation sweep · **F-4 ships** (wave 4)
- [x] 18.1-10-PLAN.md — The verification copy module and the email-resend extraction (wave 4)
- [x] 18.1-11-PLAN.md — `/host/verify`: the panel, the route, its plate and five moved design counts (wave 5)
- [x] 18.1-12-PLAN.md — PM-C: the listing-creation gate + the fixture sweep · **closes F-2, pins F-7** (wave 6)
- [x] 18.1-13-PLAN.md — PM-E: host contact reveal in `/ops`, audited per reveal · **resolves F-6** (wave 6)
- [x] 18.1-14-PLAN.md — The Didit sandbox transcript, the hand-measure, and Phase 18's checkbox · **[BLOCKING] two human checkpoints** (wave 7)
- [x] 18.1-15-PLAN.md — D5: an abandoned Didit flow no longer locks a host out for seven days — `pending` becomes a RESUME, and the queue stamp does not move (wave 8, gap)
- [x] 18.1-16-PLAN.md — D-274: the `/ops` revealed contact becomes plain copy-pasteable text; the queue row returns to strictly terminal and the focus-move announcement is redesigned, not deleted · **closes OPS-06** (wave 9, gap)

### Phase 19: Host Listing Surfaces & Gates That Actually Run

**Goal**: A host's own listing grid renders honestly and creating a listing lands where it should — and
the specs that would catch a regression run in CI instead of only by hand.

**Depends on**: Nothing. This phase shares no machinery with the ops thread; it goes first because it
is cheap, independent, and because `CI-01` makes every later phase's gates capable of running.
**Requirements**: HSURF-01, HSURF-02, CI-01
**UI hint**: yes — `/host/listings` card layout and its footer controls, at 320px and both grid bands.

**Success Criteria** (what must be TRUE):

  1. On `/host/listings`, every card in a row ends at the **same bottom edge**, and every action control
     is fully visible and pressable **inside its own card** — at 320px, at the two-column band and at the
     three-column band.
  2. A host who presses *Create listing* **lands on the edit wizard for the listing they just created**,
     not on "We couldn't find that page".
  3. The 404's cause is **reproduced and identified before any source file is touched**: cleared
     `.next`, restart, re-probe the ten measured URLs, then repeat under `next build && next start`. If
     it does not survive a clean production build, no application file changes.
  4. Opening a pull request **runs the repository's functional Playwright specs**, and a failing spec
     turns the run red — proven by watching one fail, not by reading the workflow file.

**Plans**: 15/15 plans executed, 15 waves (worktrees are OFF, so waves express dependency order, not concurrency);
13/15 executed.
8/8 original plans executed; verification found two FAILED must-haves, so plans 19-09 … 19-11 are
GAP CLOSURE (`gap_closure: true`) and run via `/gsd-execute-phase 19 --gaps-only`. Re-verification
after that closure scored 6/7 and surfaced ONE new gap — D-14's runtime mail-credential refusal is
inert (19-REVIEW CR-01) — so plan 19-12 is a further gap-closure plan under the same flag.
Re-verification after 19-12 scored 6/8: the original gap is genuinely CLOSED, but two NEW gaps were
independently reproduced inside the code that closed it — CR-01 (argument injection defeats the
guard, checker stays green) and CR-02 (a step-level `continue-on-error` detaches it, checker stays
green) — so plan 19-13 is a further gap-closure plan under the same flag.
Re-verification after 19-13 scored 7/9: both round-2 gaps are genuinely CLOSED, but a THIRD round of
the same shape was reproduced by the reviewer and the verifier independently — a step-level `shell:`
override and an expression-valued `continue-on-error`, plus the pre-existing fact that nothing asserts
`ci.yml`'s trigger set. The converged root cause is that every fix so far patched a DENY-LIST against
the one mutation that was measured, and that none left a standing instrument behind. Plans 19-14 and
19-15 are gap-closure plans under the same flag and change the SHAPE: an allow-list on the refusal
step's attribute surface, presence tests replacing value tests, a build-blocking mutation test that
spawns the checker against a mutated copy, and an assertion on the trigger CI-01's text is about.
The invariant total moves 48 → 50 in 19-15, with every count-documenting sentence in the same commit.
Order is the research's: `CI-01 → HSURF-01 → HSURF-02`, with CI-01's required-check flip held to the
end because it can only be justified by a watched red that needs this phase's own specs to exist.

Plans:
**Wave 1**

- [x] 19-01-PLAN.md — `gate-e2e`, the new fifth CI job, plus the fail-closed mail-credential invariant (CI-01)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 19-02-PLAN.md — the grid fixture and the two HSURF-01 guards, watched RED against the pre-fix tree (HSURF-01)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 19-03-PLAN.md — the call-site fix: footer flush, footer wraps, Delete goes icon-only; guards GREEN (HSURF-01)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 19-04-PLAN.md — archive the `.next/dev` evidence, then verify and delete the four orphan drafts (HSURF-02)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 19-05-PLAN.md — the eleven-URL reproduction gate, dev then production, and the written finding (HSURF-02)

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 19-06-PLAN.md — the route-reachability guard, and idempotent draft creation with its three cases (HSURF-02)

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 19-07-PLAN.md — the creation-failure sentence: copy module, query string, inline notice (HSURF-02)

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 19-08-PLAN.md — one green run, two watched reds, the measured wall-clock, then the required-check flip (CI-01)

**Wave 9** *(GAP CLOSURE — blocked on Wave 8 completion)*

- [x] 19-09-PLAN.md — D-02's third conjunct for `availability_block`, plus the child-table census that catches the fourth (HSURF-02)

**Wave 10** *(GAP CLOSURE — blocked on Wave 9 completion)*

- [x] 19-10-PLAN.md — D-03 made reachable: the try/catch, the narrowed result type, and the three-way refusal router (HSURF-02)

**Wave 11** *(GAP CLOSURE — blocked on Wave 10 completion)*

- [x] 19-11-PLAN.md — WR-01's three `gate-e2e` invariants, each watched red, and WR-05's truthful `ci.yml` header (CI-01)

**Wave 12** *(GAP CLOSURE — blocked on Wave 11 completion)*

- [x] 19-12-PLAN.md — D-14's refusal made real: it reads the job's actual process environment, sources its prefix from the checker, four watched-red invariants, and headers that name which half covers what (CI-01)

**Wave 13** *(GAP CLOSURE — blocked on Wave 12 completion)*

- [x] 19-13-PLAN.md — CR-01 and CR-02 closed: the refusal's invocation pinned exactly and its argument removed, "unconditional" promoted from the job to every step, five watched reds, and a header that claims only what fires (CI-01)

**Wave 14** *(GAP CLOSURE — blocked on Wave 13 completion)*

- [x] 19-14-PLAN.md — the standing mutation test the checker never had, plus an allow-list on the refusal step's attribute surface proven against a key nothing names, presence tests replacing both `continue-on-error` value tests, and Invariant C's predecessor claim made true (CI-01)

**Wave 15** *(GAP CLOSURE — blocked on Wave 14 completion)*

- [x] 19-15-PLAN.md — the trigger assertion SC4's text is literally about and the `defaults:` block nothing read, with the total moved 48 → 50 and every count sentence in the same commit; WR-03/WR-04/IN-02 folded in (CI-01)

**⚠ HSURF-01: the obvious fix is a no-op, measured.** The grid wrapper sets no `align-items`, so grid
items with `height: auto` **already stretch** — adding `h-full` to `Card` would be a no-op dressed as a
fix. What misaligns is the **footer band**: `Card` is `flex flex-col` with `gap-0` at the call site and
no child declaring `flex-1`, so the children pack to the top and the stretched height lands as dead
space *below* the tinted, top-bordered footer. The fix is `flex-1` on the growing child (or `mt-auto` on
`CardFooter`) plus `flex-wrap` on the footer. And the controls are **clipped, not spilled** — `Card`
carries `overflow-hidden` while `Button` carries both `shrink-0` and `whitespace-nowrap`.

  - **Fix at the CALL SITE** (`src/components/listing/listing-card.tsx:352`, `:368`, `:434`), **never in
    the vendored `src/components/ui/card.tsx`** — that forks a shadcn primitive from upstream (D-129's
    measured argument) and changes every `Card` in the app, including the search grid.
  - ⚠ **Order matters under `tailwind-merge`.** Phase 17's WR-04 recorded a case where hoisting a named
    constant to the front of `cn()` deleted a padding class outright. **Append, do not prepend.**
  - **Two guards, not one**: equal `offsetHeight` across a row **with the footer flush to the card
    bottom**, *and* `scrollWidth == clientWidth` on `[data-slot="card-footer"]` at 320px, at the `sm`
    band and at the `lg` band. Fixing one does not fix the other.

**⚠ HSURF-02 OPENS WITH A REPRODUCTION GATE, NOT A CODE CHANGE.** The measured evidence points at the
running dev server, not at application code. `.next/dev/server/app-paths-manifest.json` (16 entries) is
**missing** `/(host)/host/listings/[id]/edit` and `…/availability` while the compiled artifact exists on
disk and the **production** manifest is complete. The decisive probe: an anonymous request to
`…/[id]/edit` returned **404**, but that module `redirect()`s to `/login` *before* its `db.select()` and
long before its `notFound()` — an anonymous caller reaching it can only produce a 307. **No FitOut code
runs.** The 404 body is the root not-found, which is byte-identical to what the edit page's own
`notFound()` would render — and that collision is exactly why this looked like an application bug.

  - **Three things are UNPROVEN and this phase must close them**: (a) that `rm -rf .next` + restart makes
    it go away; (b) whether it reproduces under `next build && next start`; (c) **what removed the
    manifest entry** — a swallowed compile error, an HMR write race, a `next build` racing `next dev` on
    the shared `.next`, or a Turbopack bug. **Do not name one in a docblock without evidence.**
  - ⚠ **Never patch at `edit/page.tsx:49`.** That `notFound()` is a real IDOR guard; softening it to
    work around a dev-server routing artifact trades a shipped ownership check for a symptom. Route the
    diagnosis through `/gsd-debug` rather than a standard plan.
  - **A second-order defect that IS in FitOut's code, and is in scope here**:
    `(host)/host/listings/new/page.tsx` is a **GET page with a database write as a side effect** — four
    orphan drafts in 46 seconds on 2026-09-03 is what that costs when the destination fails. Give the
    `!res.ok` branch a sentence (already recorded as a known silent bounce) and make creation
    recoverable so a failed redirect cannot mint orphans. **The fate of the four existing orphan drafts
    is a PM call, not a code call.**
  - ⚠ `npm start` needs `PLATFORM_WALLET_NUMBER` / `PLATFORM_WALLET_NAME` passed inline or it 500s
    before the production-build probe can run.

**CI-01 is a NEW FIFTH JOB, never a widening.** D-24 is half-closed already — two of four CI jobs run
Playwright today — so the remaining scope is the functional `e2e/*.spec.ts` set as a **new `gate-e2e`
job**, in the **same pinned `mcr.microsoft.com/playwright:v1.60.0-noble` container** the existing jobs
use. ⚠ **Widening the existing `gate-price-parity` job instead is an enumerated mutation
`scripts/verify-workflows.mjs:600` is designed to catch.** The full-suite wall-clock in CI is
**unmeasured** — measure it before deciding whether to shard.

### Phase 19.1: CI signal becomes real — constrain gate-db-free, repair the red e2e baseline, and close the checker's own coverage holes (INSERTED)

**Goal**: A `ci` run means something. Green means the suite passed; red names something that actually
broke. The job that runs the gates is itself gated, and the checker's own blind spots are closed.

**Depends on**: Phase 19 — this phase CLOSES Phase 19's outstanding gaps (the `18.1`-style close-out
convention). Phase 19's `19-VERIFICATION.md` is `gaps_found` and stays that way until this phase lands;
re-verify Phase 19 after this closes.
**Requirements**: CI-01 (carried — its literal SC4 text is satisfied, but the invariant suite meant to
keep it true is not yet undriftable)

**Why this is a NEW phase and not Phase 19 round 5.** Rounds 2–4 of Phase 19 each closed the exact
mutation last measured and were each followed by a new single-token defeat. Round 4's structural fix (a
positive allow-list, presence tests, a standing mutation test) genuinely worked *for the predicate it was
applied to* — but the trigger check and the WR-05 fix shipped in the same commits were written in the old
shape, and the job that executes the checker was never constrained at all. That last one is a **scope
error, not a deeper token**: three rounds hardened the guard inside `gate-e2e` while `gate-db-free`, which
runs the checker plus `lint`, `test:design` and `next build`, sat unprotected. Fixing the authoring habit
and the scope is different work from closing vectors one at a time.

**Success Criteria** (what must be TRUE):

  1. `gate-db-free` — the job that runs `verify-workflows.mjs`, `lint`, `test:design` and `next build` —
     is itself constrained. Deleting its checker step, or softening it with `continue-on-error:`, `if:`,
     or a job-level `defaults:`, turns the checker RED. Today all of those leave 50 green
     (`19-REVIEW.md` CR-03, independently reproduced by the verifier).
  2. Every existing predicate is audited for the **axis-vs-property error**. A check asserting a key's
     *presence* also asserts the absence of the modifiers that neuter it — `pull_request: branches:
     [does-not-exist]` and `paths-ignore:` must go red, not just a deleted trigger key (CR-01). Every step
     anchor identifies its step the SAME way: exact `name:`, never a `run` substring that a decoy step can
     capture (CR-02).
  3. The standing test covers the predicates it was built for. Reverting round 2's own load-bearing fix
     (`e2eMailRun.trim() === MAIL_REFUSAL_RUN` → `.includes(...)`) turns
     `tests/design/workflow-invariants.test.ts` RED. Today it stays 12/12 green (WR-01) — the case
     `19-REVIEW.md`'s own minimum list named is the one that was dropped.
  4. The `ci` workflow run is **not red on every push**. The 14 pre-existing e2e failures are either
     repaired or recorded in a checked-in known-failures allowlist, and the allowlist itself is asserted
     so it cannot silently grow. A gate that is red unconditionally carries zero signal — this is the
     item that makes every other gate in this phase worth having.
  5. The repository is **public** and `gate-e2e (functional Playwright suite)` is a **required status
     check** on the default branch. Recorded PM decisions (2026-09-05): go public — a full-history secret
     scan over 2,157 commits found zero credential hits and only `.env.example` ever committed — and
     sequence the flip AFTER criteria 1–3, because `.planning/` currently documents reproduced, unfixed
     ways to defeat this project's own CI guard.

**⚠ The disclosure sequencing in SC5 is load-bearing, not bureaucratic.** `19-REVIEW.md` and
`19-VERIFICATION.md` are committed and contain exact payloads for three live vectors. Publishing before
1–3 land ships an attack recipe alongside the code it applies to.

**Plans:** 19/21 plans executed (13 waves)

Plans:

- [x] 19.1-18-PLAN.md
- [ ] 19.1-20-PLAN.md
- [ ] 19.1-21-PLAN.md

- [x] 19.1-14-PLAN.md

**Wave 1**

- [x] 19.1-01-PLAN.md — TRACER · SC1: constrain `gate-db-free`'s checker step end-to-end (hard stop, display-name pin, exact-invocation invariant, anchor control)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 19.1-02-PLAN.md — Wave 0: the two expected-failure behaviours, the local-repro recipe, the Phase-17 tabular-figure verdict, the avatar local run
- [x] 19.1-03-PLAN.md — Cause A: the five-row month — derive calendar geometry from the rendered grid (4 of the 14)
- [x] 19.1-04-PLAN.md — Cause D1: the duplicated `availability-tz-note` id — per-instance ids in both components + a census
- [x] 19.1-05-PLAN.md — Harness memory (`constFromChecker`, `withJobKey`/IN-02) + SC1 completion + SC3's dropped case

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 19.1-06-PLAN.md — SC2: the axis-vs-property audit — trigger filters (CR-01), sequence form (WR-02), anchor repairs (CR-02), inventory
- [x] 19.1-07-PLAN.md — Cause C: `cancel.spec.ts:232` refund disjunction + audit row (D-01 protected, never allowlisted)
- [x] 19.1-08-PLAN.md — Cause F + #11: trace the hold-countdown timeout, post-condition the day-select helper, triage the wizard refusal
- [x] 19.1-09-PLAN.md — Cause D2: `skeleton-geometry:1807` — reproduce, name the wrapped cell, repair the right tier
- [x] 19.1-10-PLAN.md — Cause B: the four upload-dependent failures — route per case, no credential

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 19.1-11-PLAN.md — D-03: the known-failures allowlist + its growth census + Cause E
- [x] 19.1-12-PLAN.md — D-04: upload the visual diffs, classify all twelve, restore point, regenerate on the sanctioned path

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 19.1-13-PLAN.md — SC4 close: full-suite re-measurement, the 25 released tests, the two flaky

**Wave 6** *(blocked on Wave 5 completion)*

- [~] 19.1-14-PLAN.md — SC5 pre-flight: fresh secret scan, ruleset payload, checklist, handover checkpoint (D-07/D-08)
      — **HALTED at Task 3 (designed stop).** Tasks 1–2 complete (`3a3639b`, `a75e1ce`); the scan is
      clean over 2244 commits and the ruleset payload is checked in. The `blocking-human` checkpoint
      D-08 reserves for the PM returned **`hold`**: SC4 is open (`gate-e2e` and `gate-visual` red), so
      publishing would put a red badge in front of every arrival — the exact cost D-08's ordering
      exists to avoid. **The repository remains `PRIVATE`.** See `19.1-14-SUMMARY.md` (`status: halted`).

**Wave 7** *(BLOCKED — see below, not merely awaiting Wave 6)*

- [ ] 19.1-15-PLAN.md — SC5 enforcement: apply the `main` ruleset, read it back, probe direct-push (D-05/D-06)
      — ⛔ **BLOCKED BY CONSTRUCTION, not skipped.** `gh api repos/pengr3/FitOut/rulesets` returns
      `403 "Upgrade to GitHub Pro or make this repository public to enable this feature"` while the
      repository is private, so this plan's precondition is unmet and it cannot start. Its inputs are
      **prepared and waiting**: the payload at `evidence/ruleset-main.json`, and the five context
      strings with their measured statuses in `evidence/preflight-public.md` §(d). Unblocks only if
      the publication hold lifts.

**Wave 8** *(gap closure — the SC4 route out)*

- [x] 19.1-16-PLAN.md — TRACER · the `(host)` layout hydration: reproduce cold and in the pinned image,
      repair the streamed nav slot, settle `host-headings` + `overflow-320` and the blocked `AC#36` tail,
      then read both owned specs absent from `gate-e2e` on a real push-triggered `ci` run joined by head SHA

**Wave 9** *(blocked on Wave 8 completion)*

- [x] 19.1-17-PLAN.md — two of the same element in one document on the booker surfaces
      (`confirmation-decay`, `avatar-crop`): read the second copy's provenance, answer the shared-cause
      question 19.1-13 left open, repair, prove both instruments can still fail, then read its own real
      push-triggered `ci` run — both booker specs absent, and 19.1-16's two still absent

**Wave 10** *(blocked on Wave 9 completion)*

- [~] 19.1-18-PLAN.md — the day click that does not select on the checkout path: reproduce in
      `mcr.microsoft.com/playwright:v1.60.0-noble` first (19.1-08's refusal to retry without an OBSERVED
      lost click is inherited), account for the siblings the file-scoped serial group blocked, then CLOSE
      SC4's functional half — `gate-e2e (functional Playwright suite)` reads `success` on a real
      push-triggered `ci` run, with all five specs the three e2e plans own absent from its failure list
      — **EXECUTED, HALTED on Task 4.** The click was received and refused because the fake clock covered
      availability selection; moving clock installation to the checkout boundary makes all four cases
      first-attempt green in the runner image, and `hold-countdown.spec.ts` is absent on real push run
      `34008844133`. But `gate-e2e` is still `failure`: seven host-wizard/edit-route cases failed, including
      19.1-16's `host-headings` and `overflow-320`; two cases were flaky and 26 did not run. See
      `19.1-18-SUMMARY.md` (`status: halted`) and `evidence/ci-run-after-18.txt`.

**Wave 11** *(blocked on Wave 10 completion)*

- [x] 19.1-19-PLAN.md — D-19.1-D: the today ring follows VENUE-LOCAL today in both calendar twins, the
      fixture and the two reference URLs are pinned, clock-independence proved three ways, then rows 9–12
      are minted via `baselines.yml` and READ out of the pixels *(blocking-human checkpoint APPROVED
      2026-09-07; run 34043991189 job 101515676520: 43 passed, 42 skipped, 0 failed/flaky)*

**Wave 12** *(blocked on Wave 11 completion)*

- [ ] 19.1-20-PLAN.md — diagnose and repair the two stable wizard walks plus the independent
      verification-panel DB-gate failure, preserve the standing route diagnostics and all six wizard
      property groups, and finish on one clean locally proven repair head

**Wave 13** *(blocked on Wave 12 completion)*

- [ ] 19.1-21-PLAN.md — derive and approve the exact clean repair SHA without tracking it, push only
      that SHA, require all five CI jobs plus the owned-case census to be green, then record evidence
      and the final 63-to-64 plan-count transition

**⚠ SC4 and SC5 are OPEN. Phase 19.1 is NOT complete.** Plan 19.1-19 closed the visual half: all four
clock-bearing references are stable, read from committed crops and PM-approved, and `gate-visual` is green
on exact-head run `34043991189`. The later diagnostic run `34076948628` proved all four host routes
reachable under the default Turbopack server and retained the two stable wizard failures, while also
exposing one independent `gate-db` verification-panel failure. **19.1-20** owns measured diagnosis,
repair, and local proof; **19.1-21** owns the fresh exact-SHA approval and five-job CI closeout. SC4
closes only when Plan 21 records that wholly green exact-head run. That lifts the publication hold and
then unblocks 19.1-15 / SC5.

⚠ **Each is its own wave deliberately, and it is not conservatism.** Every one of the four closes by
reading a real `ci` run or a `baselines` dispatch, and the workflow's concurrency group cancels an
in-flight run on the next push — which is how runs `33971557439` and `33971883942` already died inside
this phase. Two of these plans executing at once would destroy each other's measurement. Each of
19.1-16/-17/-18 therefore takes exactly ONE push as its terminal task, joins the run to the **pushed head
SHA** rather than to recency, and discards a `cancelled` conclusion by identity instead of reading it as
green or red; each also re-verifies the specs the earlier waves closed, so a repair that reopens an earlier
one cannot net to zero unnoticed. 19.1-17 additionally depends on 19.1-16 by construction (its first
instruction is to test whether the two are one defect), and 19.1-19's dispatch commits back to the branch.

### Phase 20: Ops Gets Its Own Front Door — the `ops.` Host, Sign-In & Staff Onboarding

**Goal**: Staff reach FitOut Ops at its own address, sign in there and only there, and can onboard the
next staff member without anyone holding a production `DATABASE_URL`.

**Depends on**: Phase 19 (sequencing only — no shared machinery). ⚠ **The Host partition inside this
phase is the milestone's one hard prerequisite**: nothing ops-side in v1.2 can start before it lands.
**Requirements**: OPS-07, OPS-08, OPS-09, OPS-10, OPS-11, OPS-12
**UI hint**: yes — an ops sign-in surface and a staff roster / invite panel.

**Success Criteria** (what must be TRUE):

  1. A staff member reaches the console **at its own `ops.` address** and signs in there. On the
     marketplace host, `/ops` answers the **same byte-identical `notFound()`** a stranger gets — never a
     redirect, because a redirect is an existence oracle.
  2. **The two hosts do not share a session**: an ops session presented to the marketplace host is
     anonymous, and a marketplace session is not staff on the ops host. Signing in twice is the
     behaviour, not a defect.
  3. A signed-in staff member **invites a colleague by email**; the colleague confirms, sets their own
     password and reaches the console — with **nobody holding a production `DATABASE_URL`**. The link
     works **exactly once**, and the account it produces **cannot also be a booker or a host**.
  4. **No sequence of ops actions can lock every human out.** Self-revoke and last-staff revoke are
     refused with a legible reason *on screen* (not a 404), and the CLI break-glass path still runs.
  5. **The 404 cloak reads staff `200` / non-staff `404` / signed-out `404` / nonexistent `404`, with
     the three 404 bodies byte-identical by hash**, with **every new ops route in the probe set** — and
     there is still no `(ops)`-scoped `not-found.tsx`.

**Plans**: 6/14 plans executed

Plans:
**Wave 1**

- [x] 20-01-PLAN.md — Rename middleware to Next.js 16 Proxy as an isolated behavior-preserving tracer.

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 20-10-PLAN.md — Retarget remaining Proxy tests and comments immediately after the isolated rename.

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 20-02-PLAN.md — Partition exact hosts, establish configured origins, and converge denied paths on one cloak target.

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 20-11-PLAN.md — Build the production cloak probe and record the first partition-stage reading.

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 20-03-PLAN.md — Configure the single Better Auth instance for exact dynamic origins and host-only sessions.
- [x] 20-04-PLAN.md — Centralize serialized staff-role policy, explicit CLI conversion, and next-request revocation.

**Wave 6** *(blocked on Wave 5 completion)*

- [ ] 20-05-PLAN.md — Implement the hashed verification-row invitation state machine and atomic acceptance.
- [ ] 20-14-PLAN.md — Enforce exact ops Host+Origin inside every privileged Server Function and probe marketplace dispatch.

**Wave 7** *(blocked on Wave 6 completion)*

- [ ] 20-12-PLAN.md — Add origin-bound ops sign-in, safe callbacks, and same-host recovery/reset UI.

**Wave 8** *(blocked on Wave 7 completion)*

- [ ] 20-06-PLAN.md — Expose protected invitation actions and the scanner-safe recipient setup route.

**Wave 9** *(blocked on Wave 8 completion)*

- [ ] 20-07-PLAN.md — Add the two-section staff roster and invitation management panel to `/ops`.

**Wave 10** *(blocked on Wave 9 completion)*

- [ ] 20-08-PLAN.md — Finish sign-out, shell recovery, and absolute cross-host exits.

**Wave 11** *(blocked on Wave 10 completion)*

- [ ] 20-13-PLAN.md — Enroll every completed ops/auth/management surface in the exact design inventories.

**Wave 12** *(blocked on Wave 11 completion)*

- [ ] 20-09-PLAN.md — Remediate legacy state and close with final cloak, deployed-host, and real-email UAT.

**⚠ `src/middleware.ts` → `src/proxy.ts` FIRST, as its own commit, before any Host logic is written.**
Next 16.0.0 deprecated the `middleware` convention in favour of `proxy`, this repo runs **16.2.7**, and
`next`'s own build code emits the warning. Do the rename with the `/login` + `/signup` deferral
behaviour **byte-unchanged** — the QK-IR9 `_sc` loop-guard header travels verbatim; it documents a
measured 30-day lockout and is the most expensive comment in the file. Five test files reference the old
path. ⚠ The matcher must widen from `["/login","/signup"]` to effectively every request, which makes the
file's "touches no database, imports nothing from auth or db" property **more** load-bearing, not less —
extend that header, never replace it.

**Cookie scoping is FREE; origin trust is NOT.** Read out of the installed `better-auth@1.6.14`, not
from docs: no `Domain` attribute is emitted unless `advanced.crossSubDomainCookies.enabled` is true, and
`src/lib/auth.ts` has **no `advanced` block at all** — so FitOut's session cookies are already host-only
and D-275's cookie-scoping clause needs zero auth change. What *does* change is `baseURL` (to the
dynamic `{ allowedHosts, fallback }` form, so an invite email does not land the invitee on the apex) and
`trustedOrigins` (which must gain the ops origin, or the ops sign-in POST is refused with an
origin-validation error that reads like a credentials bug).

**⚠ Two one-line "improvements" would silently delete what this phase buys, and no existing test would
go red.** `crossSubDomainCookies` merges the two cookie scopes; `session.cookieCache` keeps a **revoked**
staff grant working for the cache TTL. **Both need net-new build-blocking design tests** — prose is the
only thing protecting either today. Pair the second with a grant → revoke → next-request test.

**⚠ The ops sign-in page CANNOT live under `(ops)`.** `assertStaff()` in the `(ops)` layout `notFound()`s
a signed-out caller *before any page renders a byte*, and a sign-in bounce is literally a `redirect`,
which `FORBIDDEN_REFUSALS` bans at any `(ops)` call site. It also collides with `EXPECTED_OPS_PAGES = 1`.
Use a **sibling route group** (e.g. `(ops-auth)`), served only on the ops host by the proxy.

**The invite is an account + a role write + an audit row. NO NEW TABLE.**

  - `writeRole` gets a **second caller, never a second copy**, and its `actorId` upgrades from the CLI's
    *asserted* `--by` to an **authenticated** id from `requireStaff()`. That upgrade is the real security
    win of this item, and it needs no column.
  - **The grantee is derived ONLY from the invite row, never from the request body.** D-275 supersedes
    D-217's *consequence* but not its *fear*: an accept endpoint taking `{token, email}` is an
    arbitrary-target role-grant path. The accept schema has exactly one field.
  - **Single-use enforced at the database**: `UPDATE … SET accepted_at = now() WHERE token_hash = $1 AND
    accepted_at IS NULL RETURNING *`, granting only if a row comes back. **Store a hash, not the token.**
    **Do not accept on GET** — a corporate link scanner must not burn the invite. Reuse the shipped
    ~100-bit Crockford group-invite token shape rather than inventing one.
  - **Acceptance is the proof of mailbox control**: set `emailVerified` from the invite at acceptance.
    **Do NOT flip the global `requireEmailVerification`** — that is D-07 and it governs bookers and hosts.
  - **Audit meta carries ids and enum-shaped values only** (D-72), including on the no-such-user branch,
    where the invite row's own id is recorded and never the address.
  - **The CLI stays** (`ops:grant` / `ops:revoke` / `ops:staff`) as first-staff bootstrap and
    break-glass, and somebody in production must retain the ability to run it — it is the only recovery
    from an emptied console. Write that down where the UI revoke lives, not only in a decision log.

**⚠ OPS-11 is a recorded REVERSAL, not a new rule.** D-275's "a staff account may not simultaneously be
a booker or a host" is the exact clause **PM-B declined on 2026-09-01**; the PM reversed it on
2026-09-04, and the reversal is to be recorded as such. It costs three things, priced rather than
discovered: an **enforcement mechanism** (nothing today stops a `staff` account holding `canBook` /
`canHost`); **two shipped comment blocks** that argue from the declined premise — `(ops)/ops/layout.tsx`'s
"Ops is a ROLE, not a third context" and `error.tsx`'s "`/` is a real destination for them", the latter
making `routeOut` a genuinely open question; and **what the CLI may do** (`ops:grant` must refuse or
downgrade an account that already books or hosts). ⚠ **The seeded UAT account `host@fitout.test` violates
the rule today** (`role='staff'` **and** `can_host = t`) — re-seed or split it in the same plan and update
the local-env memory, or the next UAT walk reports a phantom regression. Mark PM-B's declined line
**superseded by D-275**, with the date.

**⚠ OPS-12 is D-275's NON-NEGOTIABLE condition, and it closes here** — this is the phase after which the
probe set is complete, so the re-measure sits **after** the new ops routes exist, never before. Take the
reading **twice** and record both: once when the partition lands, again when sign-in and invite have
added their routes. Probes to add beyond 18-14's set: `/ops` on **both** hosts, the sign-in route on
**both** hosts, and `ops.host/api/auth/*` — a `403 INVALID_ORIGIN` there is itself a small oracle, so make
that reading deliberate rather than discovered. The cloak survives the rewrite **structurally**, because
`src/app/not-found.tsx` is prerendered static and a prerendered body cannot vary by Host — **that is the
property to protect**; nobody may "improve" the 404 page into a dynamic one.

**⚠ Every new `(ops)` route inherits the streaming trap.** A `loading.tsx` is required beside every async
ops page by the build-blocking loading-coverage gate; `loading.tsx` is a `<Suspense>` boundary; once
streaming starts the **200 has already been sent** and the status cannot change. Layout-level
`assertStaff()` is a **required** companion to any new `(ops)` route, and **the status line must be
checked separately from the body** — a 200 with a 404 body is the whole attack.

**Cross-host links must be repaired in this phase, or the console's only escape hatch loops.**
`(ops)/ops/error.tsx`'s `Back to FitOut` and the `SiteFooter` composed into the ops shell are
root-relative and mean something different under the ops host.

⚠ **Resend rejects every recipient but the account owner until a domain is verified**, and a staff invite
that cannot be delivered is a bootstrap failure — so this sits on this phase's UAT critical path. Read
the composed payload out of Postgres rather than trusting a seeded `@fitout.test` send.

### Phase 21: The Host Can See Where They Stand — Verification Roadmap & the Deliberate Resubmit

**Goal**: A host reads their own verification standing as a **state** rather than a sentence, follows a
roadmap to the one action that advances them, and fixes and resubmits a rejected listing **by choosing
to** rather than by tripping a field.

**Depends on**: Phase 20 (sequencing only — this phase shares no machinery with the ops-host thread and
is independent of it). ⚠ **It must land BEFORE Phase 22, and that ordering is the point**: D-276 removes
the operator from the host verification loop, and this is the self-service path that replaces the human.
Shipping the removal first leaves a window in which the host has neither.
**Requirements**: HVER-09, HVER-10, HVER-11, HVER-12, HVER-13, HVER-14, LVER-06, LVER-07, LVER-08,
LVER-09
**UI hint**: yes — the host verification state, the step roadmap, the resubmit control and the review
history.

**Success Criteria** (what must be TRUE):

  1. An **unverified** or **rejected** host sees their standing as a real bordered state with a heading
     and a **button-shaped control** — not a muted paragraph with an underlined word — and every
     verification state is named and visually distinguishable, except `grandfathered`, which stays
     **silent to the host**. `pending` stays deliberately calm.
  2. A host can see the **ordered steps from account to bookable** — which are done, which is current,
     which remain — spanning every gate that actually blocks income: identity check, payout onboarding,
     listing a space, and FitOut checking that space. **Each step reads its own server-side gate**, so no
     step can claim a host is ready when the gate that blocks them disagrees.
  3. A host whose check **did not pass** is told a named cause and an **absolute retry instant** read
     from the same value the server's guarded re-submit uses; and a host whose check has sat **pending
     beyond a stated window** is given a way forward rather than an indefinite wait.
  4. A host with a rejected listing can **choose *fix and resubmit***, is told **before they edit** which
     changes send a listing back to review, and is **acknowledged** when the resubmission is received and
     re-queued.
  5. A host can read a listing's **review history per cycle** — submitted → waiting → decided, with the
     operator's reason — newest first and bounded.

**Plans**: TBD

**This is presentation over data that already exists.** `loadHostVerification` already returns
`{ status, reason, suspended, updatedAt }` and already has five callers — the roadmap becomes the
**sixth caller, never a second read**. `listing_review` already carries `state`, `reason`, `submittedAt`
and `decidedAt`: exactly the submitted → waiting → decided triple, with a `reason` column that was
host-readable *by design*, so there is no internal note to leak. `decidedByStaffId` is **never** shown to
a host. **Zero migrations, zero new queries.**

  - ⚠ **`src/lib/listing/re-review.ts` stays BYTE-UNCHANGED.** The mechanism is already built and already
    guarded — the guarded `UPDATE`, the append-only `listing_review` insert whose `submittedAt` is
    deliberately omitted so Postgres supplies the clock (D-249's no-line-jumping guard), and the
    deliberate absence of any statement that clears a prior rejection reason. D-278 changes how a host
    *reaches* it, not what it does. Do not "consistently" refactor it against the deliberately
    **duplicated** sell-gate re-statements in `booking.ts` (D-227).
  - **HVER-14 is the human rescue D-276 removes, restored on the host side** — it is the reason this
    phase precedes Phase 22. Reuse the shipped resend/cooldown modules; do not invent a second clock.
  - **HVER-13's retry instant is ABSOLUTE, never a duration**, read from the one `COOLDOWN_HOURS` /
    `retryAllowedAt` declaration that the guarded re-submit `UPDATE`'s own `WHERE` reads — so the instant
    on screen cannot disagree with the clause that refuses.
  - ⚠ **Per-step copy EXTENDS the total map; it does not invent strings at the component.**
    `VERIFICATION_SIGNAL` is total over all six states by design, and its header says a change there is a
    **copy decision that belongs in the spec first**.
  - **LVER-06 routes INTO the edit wizard.** A resubmit button that resubmits with **no edit** *is* an
    appeal wearing a button (explicitly out of scope — backlog 999.6) and it produces resubmission spam.
    **Never label the control appeal, dispute or contest.**
  - ⚠ **Do NOT soften D-231's accepted cost.** A typo fix in a description takes the listing off the
    market until ops re-approves it. LVER-08 makes that visible *before* the host edits, in plain language
    sourced from the **one exported material-fields tuple** so it cannot drift from the seven fields. It
    must not introduce a "material but still sellable" state — the sell-gate does not have one.
  - **A host-facing history filters `deletedAt IS NULL` on the parent listing**, the way `assertOwnership`
    and the edit page already do (the `listing_review` FK is `cascade`, D-254 / `drizzle/0029`).
  - **Anti-features, named so a plan cannot re-add them**: a percentage progress bar (it lies while
    waiting on a third party), a live countdown or verdict ETA (the vendor drops a webhook permanently
    after two retries — FitOut cannot honour one), host-visible queue position (the queue re-stamps on
    resubmission, so the number would move backwards), naming the deciding staff member, canned rejection
    codes replacing the operator's sentence, and **any "get in touch" clause** — `SUPPORT_EMAIL` is
    `null` until Phase 23, and every new sentence must stand alone so half a sentence never renders.

### Phase 22: Ops Decides With the Whole Picture — Queue Removal, Enforcement & Expand-in-Place

**Goal**: The manual host-approval queue is gone and Didit's verdict stands on its own; an operator can
reach a host to **enforce** against them from a control on screen rather than from a POST no UI issues;
and every fact needed to judge a listing **expands in place** on its own queue row.

**Depends on**: Phase 20 (the staff-surface patterns and the moved action census) **and** Phase 21 (the
host-side legibility that replaces the human this phase removes)
**Requirements**: ENF-04, OPS-13, OPS-14, OPS-15
**UI hint**: yes — a host lookup / enforcement panel and the expanded queue row.

**Success Criteria** (what must be TRUE):

  1. An operator can **find a host, suspend them and freeze their payouts from a surface** — a control on
     screen, not a POST no UI issues — and can still reach that host's contact details on demand, audited
     per reveal.
  2. An operator can read **every fact needed to judge a listing** — photos, description, address,
     capacity, pricing, amenities, host facts — by expanding the queue row **in place**, behind **one**
     disclosure level, without leaving the row.
  3. **The row is still terminal after the change**: zero anchors of any scheme and zero `[role="link"]`
     elements, **before and after** expansion, on every row kind that survives.
  4. **Expanding the evidence never pushes the decision controls off-screen.** The decision widget stays
     one widget, visually separated from the evidence.
  5. **The host's verification standing reads as a fact on the listing row** rather than a blank cell.

**Plans**: TBD

**⚠ ENF-04 IS BIGGER THAN IT LOOKS, and it is this milestone's most undercounted item.** `suspendHost`
(`src/app/actions/ops-review.ts:542`) has **ZERO UI callers today** — measured, repo-wide. So D-276's
promise to "keep enforcement in ops" is currently a promise to preserve **something unreachable**.
**This phase BUILDS the enforcement surface ENF-01 / ENF-02 never got**; it does not merely avoid
deleting code. Treat it as first-class work, not cleanup. Do an **action-to-UI-caller inventory before
the host branch is deleted**, and treat any zero-caller action as a PM question — not as dead code to
delete, and not as a working feature to preserve.

**The removal and its replacement ship TOGETHER, or ENF-01, ENF-02 and OPS-06 have no reachable home.**
`OpsContactReveal` is mounted twice and **both mounts are on queue rows**; deleting the host branch would
leave a host with no pending listing uncontactable from ops.

**Order inside the phase: remove the host branch FIRST, then widen the listing branch.** Both changes
land in the **same two files** (`src/lib/ops/review-queue.ts`, `src/components/ops/ops-queue-row.tsx`),
and doing the widening first means editing both twice with the second edit fighting the first. Migrating
`u.created_at` and `u.email_verified` from the departing host branch onto the listing row is cleanest as
one continuous move.

  - **`approveHost` and `rejectHost` are REMOVED, not left as dead `"use server"` exports.** A live
    approve-host endpoint with no UI is exactly the "two authorities on one question" D-276 exists to
    end. `EXPECTED_OPS_ACTIONS` moves **down two** here and up by the enforcement panel's actions — pin
    and paragraph in one commit, as the constant exists to force.
  - **Eight named test cases go red and must be deleted DELIBERATELY, in the branch's own commit** — five
    in `tests/ops/queue-query.test.ts` (cases 1, 3, 8, 9, 10) and three in
    `tests/ops/ops-queue-row.test.tsx`. ⚠ **Case 8 is also the standing witness for HVER-02 / D-206 /
    D-220 (no document column)** — confirm `tests/ops/verification-schema.test.ts`'s exact-column
    allow-list still carries that proof **before** the case goes. ⚠ **Case 10 is the end-to-end proof that
    the host queue fills from ordinary product use**; deleting it *is* the product decision, and it
    should read that way in the commit.
  - **Keep the discriminated union as a ONE-MEMBER union.** It exists so a third kind fails to *compile*
    rather than throwing in front of an operator; keeping it costs nothing and leaves the exhaustiveness
    machinery in place. Keep `LISTING_QUEUE_PREDICATE` a **named constant** — `queue-query.test.ts` case 2
    reads it.
  - **OPS-13's data gap is `l.description` plus two `LEFT JOIN LATERAL … json_agg` blocks** (amenities,
    activity tags) on the shape of the existing photos lateral, each with the same `?? []` null-collapse
    — `json_agg` over an empty set is NULL, not `[]`. **This is the only genuine new-data gap in the whole
    milestone, and it is still zero migrations.** Every column named **explicitly**; there is no
    `select()` over a whole table anywhere in that file and there must not be one now.
  - ⚠ **Add no field that could carry a document reference**, and render no placeholder implying one is
    coming. The listing branch **inherits** the HVER-02 / D-206 / D-220 prohibition when it inherits the
    host facts.
  - **The disclosure goes in the row's `children` slot**, beside or below the existing `<dl>` — never in
    `meta` (a `<dl>` there hydrates mismatched) and never in `actions`. A wrapper around a single
    `<dt>`/`<dd>` pair is invalid inside a `<dl>`, so the disclosure wraps the **whole** extra block.
  - **Performance**: load the detail **on disclosure**, or in **one grouped read for the page** — the
    `coverByListing` / `rejectionReasonByListing` idiom. **Never a query inside `rows.map`.**
  - **One `/ops` page still (D-246).** The host lookup / enforcement panel is a **panel on the one page**,
    not `/ops/hosts` — a second page also moves all three `loading-coverage` counts.
  - **The accepted cost, stated rather than discovered later**: with the manual queue gone, a verdict
    **Didit drops** (it retries twice, then drops permanently) has **no human rescue** except the Inngest
    reconciliation sweep shipped in 18.1-09, plus HVER-14's host-side affordance from Phase 21.

### Phase 23: The Support Path Becomes Reachable

**Goal**: A booker who needs help can find a support path from any booking, in any payment state.

**Depends on**: nothing in code. ⚠ **Blocked on a BUSINESS FACT — a monitored support address.**
Deliberately phased last and alone so that nothing else in v1.2 waits on it; if the address arrives
earlier, this phase can be pulled forward without disturbing any other phase.
**Requirements**: STATE-05, TRUST-01

**Success Criteria** (what must be TRUE):

  1. A booker looking at a booking — **in any payment state** — can find a way to reach FitOut for help.
  2. The same support path is reachable from the **trust surfaces** that owe one.
  3. Until the address exists, every surface that owes a support path renders **nothing at all** rather
     than a placeholder or half a sentence — and it fills in from **one line** at `src/lib/site.ts:70`.

**Plans**: TBD

  - **Code-complete since v1.1.** The support path is written, composed and guarded on every surface that
    owes one and renders nothing while `SUPPORT_EMAIL` is `null`. `src/lib/site.ts:70` is the only line
    that changes.
  - ⚠ **D-64 explicitly forbids setting a placeholder to make the gate pass.** This phase does not open
    until a real, monitored address exists.
  - **Consequence for Phase 21**: no new v1.2 copy may carry a "get in touch" clause, because half a
    sentence must never render.

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
| 18. Host Verification, Listing Review & FitOut Ops | v1.2 | 14/14 | **Verified & COMPLETE** — 17/17 requirements, 0 code-level blockers. The checkbox was held from 2026-09-01 until 18.1 shipped the missing submission path, then briefly re-held on PM decision D-274 (the `/ops` contact surface). **18.1-16 shipped D-274 on 2026-09-03 and phase 18.1 verified passed 9/9, so both holds are discharged.** | verified 2026-09-03 |
| 18.1 Close Phase 18 — verification path (INSERTED) | v1.2 | 16/16 | Complete    | 2026-09-03 |
| 19. Host Listing Surfaces & Gates That Actually Run | v1.2 | 11/11 | In Progress|  |
| 19.1 CI Signal Becomes Real (INSERTED) | v1.2 | 18/20 | In Progress — Plan 19 visual closure complete and PM-approved; gate-visual green on run 34043991189. Plan 20 remains for the two host-wizard/edit-route E2E failures; SC4 + SC5 OPEN |  |
| 20. Ops Gets Its Own Front Door (`ops.` host, sign-in, invite) | v1.2 | 0/TBD | In Progress|  |
| 21. The Host Can See Where They Stand | v1.2 | 0/TBD | Not started | - |
| 22. Ops Decides With the Whole Picture | v1.2 | 0/TBD | Not started | - |
| 23. The Support Path Becomes Reachable | v1.2 | 0/TBD | **Blocked on a business fact** — a monitored support address (D-64 forbids a placeholder) | - |

## Carried Forward (not v1.2 scope until promoted)

- **Real host payouts have never moved real money** — PayMongo `/v2` money movement is sales-gated.
- **PayMongo hosted Linked-Accounts KYC (PAY-04) has never been walked** — same gate.
- **GCash and Maya have never been individually hand-paid** — closable today by a human with no new
  code; card and QR Ph are already proven.
- **No v1.1 email has ever been read in a real client at its real recipient** — Resend rejects every
  recipient but the account owner until a domain is verified. ⚠ **Now on Phase 20's critical path**: a
  staff invite that cannot be delivered is a bootstrap failure.
- **~22 of Phase 17's escalate-class findings** await PM review.
- **Four orphan draft listings** created 2026-09-03 by the HSURF-02 defect are real rows a real host
  cannot reach. Their fate is a PM call, surfaced by Phase 19.
- ~~**`SUPPORT_EMAIL`** — one line closes `STATE-05` and `TRUST-01`.~~ **PROMOTED into v1.2 on
  2026-09-04 as Phase 23.** Still blocked on a monitored address; D-64 forbids a placeholder.
- ~~**D-24** leaves the milestone's own Playwright gates out of CI.~~ **PROMOTED into v1.2 on 2026-09-04
  as `CI-01` in Phase 19** — half-closed already (two of four CI jobs run Playwright), so the remaining
  scope is the functional `e2e/*.spec.ts` set as a new fifth job.

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
