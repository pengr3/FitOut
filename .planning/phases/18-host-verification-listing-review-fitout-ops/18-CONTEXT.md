# Phase 18: Host Verification, Listing Review & FitOut Ops - Context

**Gathered:** 2026-09-01
**Status:** Ready for planning

<domain>
## Phase Boundary

A space cannot be **sold** on FitOut until a person at FitOut has checked who the host is and that
the listing is real — and FitOut has the ops function, the **authenticated** staff identity, and the
enforcement levers to do that checking and to undo it.

**In scope:** staff identity + access control; an internal ops console (one queue: hosts awaiting
verification, listings awaiting review); a provider-agnostic identity-verification port with a
manual provider; the sell-gate term that makes approval a *term of bookability itself*; re-review on
material edit; suspension + payout freeze + ops cancel-and-refund; the booker-facing badge; a written
KYC vendor comparison for the PM.

**Out of scope (ROADMAP, unchanged):** booker-side reporting of fake listings (backlog 999.4),
reviews and ratings (999.5), host appeals (999.6). Suspension is **IN** — an approve-only console is
unsafe, because ops must be able to pull a listing it already approved.

</domain>

<decisions>
## Implementation Decisions

### PM decisions — answered 2026-09-01 before planning (do NOT re-ask)

Full text and rationale: `.planning/phases/18-host-verification-listing-review-fitout-ops/18-PM-DECISIONS.md`

- **D-206 (PM-1) — KYC: adapter now, vendor later.** Build a provider-agnostic verification port.
  FitOut persists only `{ result, vendorRef, checkedAt, provider }` — **never a government ID, never
  a document, never an image**. Ship with an **ops-manual provider** so the gate, the queue, the badge
  and the audit trail are all real in this phase. PayMongo Linked Accounts is **NOT** wired here (it
  is sales-gated and has never been walked). Success Criterion 7's literal "runs through a
  third-party vendor" is **deferred**; the storage contract it exists to protect is satisfied in full.
- **D-207 (PM-2) — Cutover: grandfather PERMANENTLY.** Every listing already `published` at migration
  time, and its host, are marked **grandfathered** by the migration and are never retroactively
  re-reviewed. The gate binds only listings created, or materially edited, after this phase.
- **D-208 (PM-3) — Pending listings are HIDDEN.** A submitted-but-unapproved listing does not appear
  in search and its public page 404s. The host sees its own listing and its own review status.
- **D-209 (PM-4) — Ops cancel-and-refund: booker refunded the full booking amount, FitOut RETAINS the
  service/platform fee; the host is paid nothing.** See D-236 below — implement as stated, behind one
  named constant.

### Consequences of D-207 that the plan MUST hold (these narrow the phase)

- **D-210 — Success Criterion 2 is NARROWED**, by PM decision, to: *a host cannot sell a listing
  **created or materially edited after this phase** until ops has approved both the host and the
  listing.* The pre-existing catalogue stays ungated. **Verification must assert the narrowed
  criterion, not the ROADMAP's original wording** — this is a deliberate scope choice, not a failure.
- **D-211 — `grandfathered` is a FIRST-CLASS, DISTINCT state, never written as if a human approved
  it.** A future PM must be able to burn the backlog down with one statement
  (`UPDATE … SET review_state = 'pending' WHERE review_state = 'grandfathered'`). Do not collapse
  `grandfathered` into `approved` in the data, however convenient it is at the gate.
- **D-212 — A grandfathered listing MUST NOT show the verification badge.** The badge states what
  FitOut *checked*; nothing was checked on a grandfathered row, so showing it would be a lie told at
  scale to bookers. Badge renders for `approved` only. This is the sharpest edge of D-207 and is
  non-negotiable against Success Criterion 6.
- **D-213 — Material edit is the burn-down path.** The first material edit to a grandfathered listing
  pulls it into review like any other. This is the only route out of `grandfathered` short of a
  deliberate backfill.

### Staff identity & access control (first plan — not a later one)

- **D-214 — Reuse the existing dead `role` slot** on `user` (`src/lib/auth.ts:112`), which already
  carries `input: false` — the privilege-escalation guard is already in place and must stay. Values:
  `user` (default) | `staff`.
- **D-215 — ONE staff role, no tiering.** Cancel-and-refund is reachable by any staff member; the
  audit trail is the control. Tiered ops permissions are deferred, recorded below.
- **D-216 — The guard is per-page and per-action, never middleware.** `src/middleware.ts` declares
  itself "OPTIMISTIC ONLY — NOT the security boundary" in its own header; a `requireStaff()` in
  `src/lib/ops/staff.ts` (mirroring the shipped capability-guard idiom) is called by every ops page
  and every ops server action. A layout guard is not sufficient and must not be relied on.
- **D-217 — Staff is granted by a CLI script** (`scripts/ops-grant.ts`), never self-serve, never from
  a client body. `role` stays `input: false` so Better Auth's `/api/auth/update-user` cannot write it.
- **D-218 — Every ops action writes an `audit` row with `actorId` = the authenticated staff user id.**
  This is the phase's answer to `audit.resolved_by` being *"asserted, not authenticated"*
  (`src/lib/db/schema.ts:389-391`). The existing `scripts/ops-alerts.ts` CLI keeps its asserted
  handle — retiring it is out of scope — but the console's own writes are authenticated.
- **D-219 — Ops surfaces live under a `(ops)` route group at `/ops`.** No ops power is reachable by
  knowing a URL: every page independently calls `requireStaff()` and a non-staff caller gets the
  same 404 a nonexistent route gets, not a 403 — do not confirm the route exists to a prober.

### Data model

- **D-220 — `host_verification`, 1:1 to `user`.** Columns: `status` (enum), `provider`, `vendorRef`
  (nullable), `result` (nullable), `checkedAt`, `decidedByStaffId`, `reason`, timestamps. **No column
  exists, or may ever exist, for a document, an ID number, or an image** — enforced by a test that
  asserts the table's column set, not by convention.
  `host_verification_status` pgEnum: `unverified | pending | approved | rejected | grandfathered | suspended`.
- **D-221 — `listing.review_state` (denormalised current state) + `listing_review` (history rows).**
  The gate needs a cheap read; the audit needs a trail; re-review on material edit needs both.
  `listing_review_state` pgEnum: `pending | approved | rejected | grandfathered | withdrawn`.
- **D-222 — Suspension rides the host status enum** (`suspended`), so suspension is enforced by the
  *same* gate read as verification. One gate, one read, no second check a code path can forget.
- **D-223 — Follow the shipped enum idiom**: `pgEnum` declared before the table it backs (const TDZ),
  matching `listingStatus` / `bookingStatus` / `payoutLedgerState`.

### D-240 — The grandfather backfill grandfathers `published` ONLY (added after pattern mapping)

`18-PATTERNS.md` found two shipped migration precedents and correctly declined to choose between
them, because the choice is a scope call rather than a mechanism call:

- `drizzle/0017`'s `ADD COLUMN … DEFAULT 'x' NOT NULL` backfills **every row by construction** —
  which would grandfather **drafts** as well, granting review-free status to listings that were never
  live and have never been seen by anyone.
- `drizzle/0014`'s shape — `DEFAULT 'pending'` plus a **scoped, idempotent** `UPDATE … WHERE …` —
  backfills exactly the rows named.

**Take the `drizzle/0014` shape.** D-207 grandfathers what is *already selling*, nothing else:

```sql
UPDATE listing SET review_state = 'grandfathered'
WHERE status = 'published' AND deleted_at IS NULL;
```

Consequences, all intended:
- **`draft` rows become `pending`.** A draft that publishes after this phase goes through review like
  any new listing. It was never live, so nothing breaks and nobody is interrupted.
- **`unlisted` rows become `pending`.** An unlisted listing is not selling today, so gating it costs
  no live supply — and if a host brings it back, FitOut checks it. This is the stricter reading and it
  burns down more of the permanently-grandfathered backlog for free.
- Hosts are grandfathered on the same predicate: a host is grandfathered iff they own at least one
  row that this `UPDATE` touched. A host with only drafts starts `unverified`, not `grandfathered`.
- The `UPDATE` must be **idempotent and re-runnable**, and must never move a row that is already
  `approved` or `rejected`.

### The sell-gate (the trap — read 18-PM-DECISIONS.md and the ROADMAP warning first)

- **D-224 — Add a FIFTH and SIXTH term to `deriveBookable`** (`src/lib/bookability.ts`), one per side:
  `listing.reviewState` and `host.verificationStatus`. Both are **new required fields on the existing
  parameter objects**, which makes **every one of the four call sites a compile error** — that is the
  designed census mechanism (`tsc`, not grep). Do not add an optional field; do not default it.
  - listing term: `reviewState === 'approved' || reviewState === 'grandfathered'`
  - host term: `verificationStatus === 'approved' || verificationStatus === 'grandfathered'`
    (`suspended`, `pending`, `rejected`, `unverified` all fail — D-222)
- **D-225 — The new terms are INDEPENDENT of `payoutsEnabled`.** That term was meant to be the
  identity gate and cannot be: PayMongo Linked Accounts is sales-gated, so in production it never
  turns true on its own merits, and today's effective gate is *"the host clicked a link in an email."*
  Never express the new terms in terms of `payoutsEnabled`, and never remove `payoutsEnabled`.
- **D-226 — Move the inlined SQL twin in lockstep** — `src/lib/search/query.ts` Stage-1 (~205-217).
  `tests/search/bookable-gate.test.ts` holds the two equal over shared fixtures; extend its fixtures to
  cover every new enum value, or the equality proves less than it did before.
- **D-227 — The two server-side re-derivation sites stay RE-STATEMENTS.** `placeHold` and
  `placeOpenHold` in `src/app/actions/booking.ts` (~:192, ~:448) each get their own restated term and
  their **own refusal anchor**, in the spirit of the existing `L_nohours` / `L_OPEN_NOHOURS` anchors.
  **Do not fold them into a shared helper** — duplicated security code on the money path only stays
  honest if each copy is measured independently.

### Hidden-until-approved (D-208)

- **D-228 — Search needs no separate work**: Stage-1 already filters on the gate, so a pending
  listing drops out the moment D-226 lands. Assert it, do not re-implement it.
- **D-229 — `/listings/[id]` 404s for a non-approved listing**, reusing the shipped draft-404
  behaviour that plan 17.1-01 measured first-hand (draft/nonexistent/published read 404/404/200 under
  a production build). Same soft-404 shape, not a new error surface.
- **D-230 — The host sees its own listing and its own review status**, including a rejection reason.

### Material edit → re-review (Success Criterion 4)

- **D-231 — The material field set is exactly the ROADMAP's five**: address, space type, capacity,
  photos, price. Detected in `saveListingStep` (`src/app/actions/listing.ts:109`) by comparing
  incoming vs persisted. Title and description are **deliberately excluded** and recorded as deferred
  — flagged as a real gap, because a fake listing lies in its words as much as its fields.
- **D-232 — A material edit flips `approved` OR `grandfathered` → `pending`**, which stops it being
  sellable via the same gate. Approval is not a permanent grant.

### Enforcement (Success Criterion 5)

- **D-233 — Two levers, ops chooses per case.** Default is block-new + freeze payouts; ops can
  escalate to cancel-and-refund.
- **D-234 — Payout freeze is enforced in `src/inngest/functions/payout-sweep.ts`** (and mirrored in
  `payout-reconcile.ts`'s stuck-`held` predicate so a frozen row does not read as a stuck one and
  page an operator). No payout leaves for a host under suspension.
- **D-235 — Ops cancel-and-refund reuses the host-cancel machinery** in
  `src/app/actions/cancel-booking.ts`, with the ops actor recorded, **but with the host-cancel FEE
  DEBIT suppressed** — a `host_cancel_fee` on a host FitOut is removing for fraud is meaningless and
  would be netted against a payout that is already frozen.

### D-236 — THE ONE PLACE THIS PHASE DIVERGES FROM A SHIPPED PRECEDENT

`cancel-booking.ts:1010` and `:1134` — the host-initiated cancellation path **already refunds the
booker 100% INCLUDING the D-74 service fee**, and states the principle in its own words:

> *"This is the ONE case where the non-refundable fee IS returned: the booker did nothing wrong, so
> the platform, not the booker, absorbs the gateway cost of the reversal."*

An ops-forced cancellation on a **confirmed-fake** listing is a strictly stronger instance of "the
booker did nothing wrong". D-209 as answered therefore makes FitOut *less* generous to a defrauded
booker than to one whose host merely flaked. **The PM answered without this precedent in view — the
omission was in how the question was framed, not in their answer.**

**Implement D-209 exactly as the PM stated it**, isolated behind ONE named constant —
`OPS_CANCEL_REFUNDS_SERVICE_FEE = false` — at a single call site, with this conflict documented at
that site. Flipping it must be a one-line change. **Do not resolve this inside a plan by picking the
other behaviour.** It is the PM's to settle, and it leads the phase summary.

### D-241..D-246 — the six questions research left open, settled (added after 18-RESEARCH.md)

Settled by the SWE under the PM's standing "act on my behalf" grant (2026-09-01). Four of the six
were flagged as PM calls; each is recorded with its reasoning so the PM can overturn any of them in
the morning at the cost of one plan, not a re-architecture.

- **D-241 — Ops cancel REACHES a session that has already started.** `cancelBookingAsHost` guards
  `starts_at > now()` (D-94), which structurally eliminates payout clawback for the host-cancel case.
  An ops cancel cannot inherit that guard: a space confirmed fake is fake whether or not the clock
  has started, and the guard would silently protect exactly the bookings most worth undoing.
  **Replace the guard rather than dropping it** — ops cancel reaches any `confirmed` booking whose
  **payout has not yet left** (no `host_payout_ledger` row in `processing`/`paid` for that booking).
  That preserves the no-clawback property D-94 was protecting while removing the fraud blind spot.
  A booking whose payout has already left is an operator case, not a self-serve one — surface it in
  the console as *not cancellable here*, with the reason, never a silent no-op.
- **D-242 — Photos stay in the material set; the trigger moves to where photos actually change.**
  Research is right that `draftSchema` has no photos field, so `saveListingStep` structurally cannot
  detect a photo change — D-231's own sentence is unachievable at the site it names. The answer is
  **not** to drop photos from the material set: photos are the primary way a fake listing lies, and
  the ROADMAP named them explicitly. **Hook the photo mutation actions in
  `src/app/actions/listing-photo.ts`** (add / remove / reorder / re-crop) with the same
  `approved|grandfathered → pending` flip. Material-edit detection therefore lives in **two** places
  by necessity; state that at both sites, and give each its own test anchor, exactly as the sell-gate
  re-statements do.
- **D-243 — A suspended host IS told, with the reason.** OPS-05 already requires a rejection to carry
  a reason the host can read; suspension is the strictly heavier action, so telling them is the same
  principle applied consistently. ⚠ Host appeals are backlog 999.6 and OUT — so the message must
  **not** promise an appeal route or a reply. Say what happened, say why, name the support address
  (`src/lib/site.ts:70`), and stop.
- **D-244 — Add `'ops'` to the `cancelled_by` pgEnum** (`src/lib/db/schema.ts:698`), rather than
  reusing `'system'`. `'system'` means *no person decided this* (expiry, timeout); an ops
  cancellation is a named human's decision and the record must not blur the two — which is the whole
  point of OPS-03. ⚠ **Migration hazard, from research finding 3:** `ALTER TYPE … ADD VALUE` on an
  ALREADY-COMMITTED type cannot be *used* in the same transaction (PG `55P04`), and both migrators
  wrap all pending migrations in one transaction. Adding the value is safe **because nothing writes
  `'ops'` at migration time**; the first write happens at runtime, long after commit. Do not add a
  backfill that uses the new value in the same migration.
- **D-245 — OPS-05 needs the NOTIFICATION, not just a host-surface signal.** A status a host has to
  go and look for is not being *told* — and the thing being communicated blocks their income. Reuse
  the shipped Phase-7 model (D-86/D-91/D-92): one `notification` row written by the same Inngest
  function that sends the email, so the two channels cannot drift. Host-surface status (D-230) is in
  ADDITION to this, not instead of it.
- **D-246 — ONE `/ops` page.** Confirms what `<specifics>` already says: one queue, hosts and
  listings together, oldest first, everything needed to decide on the same screen. Research notes
  each extra page costs a `loading.tsx` plus three pinned design-gate constants — so the product
  answer and the cheap answer agree, which is the easiest kind of decision to take.

### D-247 — Three leak surfaces for LVER-02, not two (research finding 4d)

A pending listing must not escape through **any** of:
  1. search Stage-1 (`src/lib/search/query.ts`) — closes by construction once D-226 lands,
  2. the public listing page (`src/app/listings/[id]/(detail)/page.tsx`) — soft-404 per D-229,
  3. **`src/lib/listing/og-facts.ts:86`**, which runs its OWN `status !== "published"` check and would
     otherwise render a real Open Graph card for an unreviewed listing — a leak that survives both of
     the above and is invisible in the browser.
Plus the guard layering research found for D-219: **every `/ops` page needs a `loading.tsx`**, whose
Suspense boundary commits HTTP 200 *before* a page-level `notFound()` runs, so a prober separates
"exists but forbidden" from "does not exist" with one `curl`. Assert in the **layout, above the
boundary** — the shipped `/listings/[id]` fix is the analog. This does not retire D-216's per-page
guard; it is a third layer, and the layout layer is explicitly not the security boundary.

### D-248 — The sell-gate change and its fixture sweep ship in ONE commit

Research measured the blast radius: `tests/search/bookable-gate.test.ts` must grow 5→14 fixtures /
3→8 hosts / 1→3 passing set members, **19 test files** hand-build a bookable host and go dark when the
sixth term lands, and 14 non-Vitest seed sites need the same treatment. A red suite spanning 19 files,
discovered a wave later, is indistinguishable from a real regression — this project has lost hours to
exactly that failure mode before. Gate change + fixture sweep + seed sweep are **one atomic commit**.

### D-249 — A material edit also flips `rejected` → `pending` (added after 18-UI-SPEC.md)

The UI spec found a real hole: D-232 flips `approved` and `grandfathered` to `pending` on a material
edit and **says nothing about `rejected`**. As written, a rejected listing is dead forever, and the
host-facing surface would be offering an "Edit this listing" route that does not go anywhere.

**Extend the flip: `approved | grandfathered | rejected` → `pending` on a material edit.**

This does **not** import backlog 999.6. An *appeal* is contesting a decision without changing
anything, and that stays out of scope. This is **resubmission after fixing the thing that was
wrong** — the normal marketplace loop, and the only reading under which the surface copy is true.
Without it a single rejection permanently kills a listing and generates support load into an inbox
that does not exist (D-250).

Two guards that come with it:
- **A resubmission enters the queue at its resubmission time**, not at the listing's original
  submission time. Oldest-first must not let a repeat-resubmitter jump the line.
- The rejection reason stays readable to the host until they resubmit, so they can see what they are
  fixing. Clearing it on the flip would delete the only thing that makes the edit purposeful.

### D-250 — `SUPPORT_EMAIL` is null; do NOT invent one

`src/lib/site.ts:70` has `SUPPORT_EMAIL = null`, and `site-contacts.test.ts` asserts **zero** support
affordances anywhere in `src/` while it is. D-243 says a suspended host is told "and name the support
address" — **there is no support address to name.**

**Every surface's copy must stand without it**, which is how 18-UI-SPEC.md already wrote them. Do not
fabricate an address, do not route to a placeholder, and do not weaken `site-contacts.test.ts`.

This is a **business fact, not an engineering choice** — whether a monitored inbox exists is the PM's
to answer, and shipping an address would quietly answer it for them. It is the same carried-forward
item as `STATE-05` / `TRUST-01`, which one line closes. Carried as `blocking_input` on the plans that
touch host-facing enforcement copy, and raised in the phase summary as a one-line unblock — **not** a
reason to hold the phase.

### D-251 — GATE-06 re-scoped from a migration FREEZE to shipped-migration IMMUTABILITY

**Ruled during execution of 18-02**, when the executor correctly refused to absorb a red build and
raised it instead. Recorded here because it is a milestone-wide change, not a plan-local one.

`tests/design/infra.test.ts` and `tests/design/money-path-invariants.test.ts` pinned
`LAST_MIGRATION == "0025_audit_resolved_by.sql"`, `MIGRATION_COUNT == 26`, and a sha256 over the
bytes of **every** migration — GATE-06, the declared v1.1 invariant that *"v1.1 phases ship on the
v1.0 schema."* The gate's own failure text forbids both available shortcuts: *"do not bump the pinned
number to make this green, and do not delete the migration to make it green either. Take it to the
phase owner."*

**The invariant was not violated — it FINISHED.** v1.1 closed 2026-08-31 with it intact, which
`PROJECT.md:107` records as a kept promise. Phase 18 is v1.2 and its own locked context mandates
migrations (D-220, D-221, D-240).

**Rejected — plain re-baselining** (re-cut the all-migrations digest to the new HEAD). It taxes every
future v1.2 migration: 18-09 adds one, so it would need re-cutting mid-phase and again for every
migration in the milestone. A gate that must be bumped on a schedule stops being read and starts
being bumped reflexively, which is how a real alarm dies.

**Rejected — "every migration must be named in some PLAN's `files_modified`."** It does not survive
this repo: `/gsd-new-milestone` DELETES prior phase directories, so migrations 0000–0025 have no
surviving plan naming them and would all redden. Making it work needs a pinned historical exemption
list — the very thing it was meant to avoid.

**Adopted — split the pin by what it is actually worth:**
  1. The byte-frozen sha256 is scoped to the **historical set 0000–0025** (the v1.0 + v1.1 shipped
     migrations) and **never needs re-cutting again**. It preserves the property a digest is genuinely
     good at: nobody silently rewrites or reorders a migration that has already run against
     production data.
  2. The equality pins retire, replaced by a **monotonic floor** — all 26 historical filenames must
     still exist. History cannot be deleted or renamed; new migrations may appear.
  3. Both headers rewritten to say GATE-06 was a v1.1 invariant, that v1.1 closed with it intact, and
     that this was **re-scoped by a ruling, not bumped to make a build green** — the distinction is
     the entire point.

**Why this is stronger than it looks:** `drizzle/` held exactly those 26 files when the digest was
cut, so narrowing the input set left the hash input **byte-identical** — `652178ae…` verifies
unchanged. The same constant that was independently watched red under the old shape now enforces the
new one. Both REDs were re-watched under the new shape with a control proving the new migrations move
nothing.

### The badge (Success Criterion 6)

- **D-237 — The badge states WHAT FITOUT CHECKED and nothing more.** It must never imply FitOut
  inspected the space when it checked a document. Copy is written against the *manual* provider that
  actually ships (D-206) — do not write copy that describes a third-party vendor check that is not
  happening. Renders for `approved` only (D-212).

### Deliverable that is not code

- **D-238 — `18-KYC-VENDOR-COMPARISON.md`**: PayMongo Linked Accounts vs a standalone PH KYC vendor,
  written for the PM as a fork. Cost, sandbox reachability, KYC depth, data residency, what FitOut
  would store, and what the switch would cost given the D-206 port. This is a phase deliverable.

### Requirements

- **D-239 — Create `.planning/REQUIREMENTS.md` scoped to Phase 18**, with a header stating it was
  opened ahead of the v1.2 milestone cycle and holds Phase 18 only. Families: `OPS-01..05`,
  `HVER-01..04`, `LVER-01..04`, `ENF-01..03`.

### Claude's Discretion

Per the standing PM/SWE contract, taken silently: table/column naming, plan count and wave shape,
component decomposition, server/client boundaries, test strategy, migration mechanics, console
layout and information architecture, error handling, rate-limit budgets.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-defining
- `.planning/ROADMAP.md` § Phase 18 — goal, 7 success criteria, the sell-gate warning, the staff-identity warning
- `.planning/phases/18-host-verification-listing-review-fitout-ops/18-PM-DECISIONS.md` — the four PM answers + the D-236 conflict
- `.planning/PROJECT.md` — core value, key decisions ledger (D-numbers)

### The sell-gate (change all of these together or the gate is broken)
- `src/lib/bookability.ts` — `deriveBookable`, and its module header explaining why every property is load-bearing
- `src/lib/search/query.ts` §Stage-1 (~205-217) — the inlined SQL twin
- `src/app/actions/booking.ts` (~:192 `placeHold`, ~:448 `placeOpenHold`) — the two deliberate re-statements
- `tests/search/bookable-gate.test.ts` — the shared-fixture equality that holds predicate and SQL equal

### Auth, capability & audit
- `src/lib/auth.ts:105-140` — `additionalFields`, the `role` slot, and why `input: false` is the escalation guard
- `src/middleware.ts` — the "OPTIMISTIC ONLY — NOT the security boundary" header (why D-216 is per-page)
- `src/lib/db/schema.ts:379-400` — the `audit` table and the `resolved_by` *"asserted, not authenticated"* note
- `src/lib/audit.ts` — `recordAudit`, and the documented fact that it swallows its own insert failure
- `scripts/ops-alerts.ts` — the ONE shipped operator workflow, and its own statement that it has no login

### Money paths
- `src/app/actions/cancel-booking.ts:995-1160` — host-cancel: the 100%-including-fee precedent (D-236) and the four consequences
- `src/lib/booking/policy-disclosure.ts:121` — *"The service fee portion… Never refunded at any tier or any rung (D-74)"*
- `src/lib/db/schema.ts:405-470` — `payoutLedgerState`, `ledgerKind`, `host_payout_ledger`, the at-most-once composite gate
- `src/inngest/functions/payout-sweep.ts`, `src/inngest/functions/payout-reconcile.ts` — where the freeze lands
- `src/lib/db/schema.ts:284-300` — `host_payout`, `payoutsEnabled` ("KEEP THIS NAME")

### Listings
- `src/app/actions/listing.ts:109 saveListingStep`, `:299 publishListing` — where material-edit detection lands
- `src/app/listings/[id]/(detail)/page.tsx` — the public page and its `deriveBookable` call site
- `src/app/(host)/host/listings/page.tsx` — the host grid call site

### Process
- `.planning/RETROSPECTIVE.md`, `.planning/STATE.md` § Deferred Items
- `.planning/ops/NEEDS-ATTENTION-RUNBOOK.md` — the shipped operator procedure the console sits beside

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`deriveBookable`'s parameter-object design** — adding a required field is *the* call-site census. Use it as intended; do not defeat it.
- **The `audit` table + `recordAudit`** — the ops action log already exists; this phase supplies the authenticated actor it was built to wait for.
- **The soft-404 shape** proven by 17.1-01 — reuse for D-229 rather than inventing an error surface.
- **The capability-guard idiom** (`canBook`/`canHost`, `input: false` + server-side grant via Drizzle) — `requireStaff()` mirrors it exactly.
- **The host-cancel machinery** — refund + audit + notification already wired; ops cancel rides it (D-235).
- **`pgEnum`-before-table (const TDZ)** — the shipped schema idiom for all new/changed enums.

### Established Patterns
- Security decisions are **per-page/per-action**, never middleware. Non-negotiable here.
- Money is integer centavos; frozen at write time; a later rate/price change never rewrites a past row.
- Duplicated security code on the money path is deliberate and each copy carries its own test anchor.
- Enum values are added, never repurposed; constraint migrations are hand-authored SQL (Drizzle cannot express them).

### Integration Points
- `deriveBookable` ← 4 compile-forced call sites + 1 SQL twin + 2 re-statements (7 sites, one gate)
- `payout-sweep` / `payout-reconcile` ← suspension freeze
- `saveListingStep` ← material-edit detection
- `user.role` ← staff identity; `audit.actorId` ← authenticated ops actor
- listing detail + search result card ← the badge (approved only)

</code_context>

<specifics>
## Specific Ideas

- The queue is **ONE queue, oldest first** — hosts awaiting verification and listings awaiting review
  in the same list, with everything needed to decide **on the same screen**. Not two consoles, not a
  detail page you have to click into to see the photos.
- Approve/reject **carries a reason the host is actually told** — a rejection the host cannot read is
  not a decision, it is a disappearance.
- Ops picks the enforcement level **per case**, in the console, at the moment of acting.

</specifics>

<deferred>
## Deferred Ideas

- **Title/description as material fields (D-231)** — excluded to hold the ROADMAP's stated five, but a
  fake listing lies in its words as much as its fields. Flagged as a real gap; worth its own decision.
- **Tiered ops permissions (D-215)** — cancel-and-refund reachable by any staff member. Fine at launch
  ops scale; revisit when the ops team is larger than the people who can be trusted with a refund.
- **Backfilling the grandfathered catalogue (D-207/D-211)** — the data supports it with one statement
  whenever the PM wants it. Not this phase.
- **Wiring a real KYC vendor (D-206)** — the port lands here; the vendor lands when one is reachable.
  The comparison doc (D-238) is what the PM decides from.
- **Retiring `scripts/ops-alerts.ts`'s asserted `resolved_by`** — the console makes an authenticated
  discharge possible, but migrating the CLI is out of scope.
- **Booker-side reporting (999.4), reviews and ratings (999.5), host appeals (999.6)** — ROADMAP-explicit OUT.

</deferred>

---

*Phase: 18-host-verification-listing-review-fitout-ops*
*Context gathered: 2026-09-01*
