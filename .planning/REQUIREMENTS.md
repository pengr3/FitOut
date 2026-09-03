# FitOut — Requirements

**Milestone:** v1.2 Verification & Operations
**Defined:** 2026-09-04
**Core Value:** Find & book a space — search → real availability → reserve a time slot → pay, with
confidence the booking is real.

> **Scope note (2026-09-01 · extended 2026-09-02 · FOLDED INTO v1.2 on 2026-09-04).** This file was
> opened **ahead of** the v1.2 milestone cycle and for three days held **Phase 18 and the inserted
> Phase 18.1 only**. `/gsd-new-milestone v1.2` has now run, and those 22 requirements are **v1.2's**
> — they are complete and verified, and they are counted in this milestone rather than re-planned.
> The new v1.2 requirements follow them below.
>
> Prior milestones' requirements are archived and are NOT restated here:
> - `.planning/milestones/v1.0-REQUIREMENTS.md` (49/49)
> - `.planning/milestones/v1.1-REQUIREMENTS.md` (69/71 · 8 descoped by D-141)
>
> **`STATE-05` and `TRUST-01` are now IN scope** (they were not, in this file's original form): both
> carry forward unsatisfied from v1.1 and both close on one monitored support address at
> `src/lib/site.ts:70`. They keep their original v1.1 IDs rather than being renumbered, because the
> requirement text and the code are unchanged — only the milestone owning them moved.

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
- [x] **LVER-03** — A **material edit** (address, space type, capacity, photos, price, **title,
      description**) to an `approved`, `grandfathered` **or `rejected`** listing returns it to review
      and stops it being sellable until re-approved. Approval is not a permanent grant, and a
      rejection is not a death sentence — a resubmission enters the queue at resubmission time, never
      at the original time. Photo changes are detected in `listing-photo.ts`, not `saveListingStep`,
      which structurally cannot see them; title and description are detected in `saveListingStep`,
      which can. Photo **reorder** is not a material edit — position is not content.
      ⚠ **AMENDED 2026-09-02 by plan `18.1-03`.** The field list read *"(address, space type,
      capacity, photos, price)"* until D-231 was settled on 2026-09-01; leaving it would have left a
      checked, Complete requirement enumerating a smaller set than the code enforces. **Accepted cost,
      not softened: a typo fix in a description takes the listing off the market until ops
      re-approves it.** *(SC4 · D-231 widened 2026-09-01, D-232, D-242, D-249)*
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

- [x] **HVER-06** — A host can **ask to be verified** from a surface under `/host`, and doing so
      creates a real `host_verification` row at `pending` that appears in the `/ops` queue. Phone and
      a confirmed email are **required at submission** — not optional profile fields.
      *(SC1, SC4 · D-256, D-268, D-269)*
- [x] **HVER-07** — Identity is checked by **Didit** behind the existing verification port. The
      vendor's verdict enters through **one** code path, the port stays the only branch point, and
      FitOut stores only `{ result, vendorRef, checkedAt, provider }`. The **manual** provider stays
      registered as the ops override with `provider = 'manual'`.
      *(SC2, SC3 · D-258, D-259, D-261, D-262)*
- [x] **HVER-08** — A **rejected** host may re-submit after a 24-hour cooldown derived from
      `host_verification.updated_at`; a **suspended** host cannot re-submit at all. The rejection
      `reason` the host reads is bounded, escaped, and never empty. *(SC1 · D-264, D-265, D-266)*

### LVER — Listing review

- [x] **LVER-05** — A host **cannot create a listing** until they are verified. The refusal is
      server-side in `createDraftListing`, names the state and the way out, and cannot be bypassed by
      knowing a URL. Existing drafts stay editable. *(SC5 · D-255, D-270)*

### OPS — Staff identity, ops console & audit

- [x] **OPS-06** — **Ops can reach a host**: email and phone revealed on demand from either queue
      row, each reveal writing an audit row carrying ids and enum-shaped values only — never the
      contact values themselves. *(SC6 · D-257, D-271, D-72, D-274)*

---

## v1.2 — Verification & Operations (the milestone-cycle requirements)

Written 2026-09-04 by `/gsd-new-milestone`, from `.planning/research/` and PM decisions
**D-275**–**D-278** (recorded in `.planning/PROJECT.md` § Key Decisions). Numbering continues the
categories Phase 18/18.1 opened; `STATE-05` and `TRUST-01` keep their v1.1 IDs.

### HVER — Host verification, made legible to the host

- [ ] **HVER-09** — An **unverified** or **rejected** host sees their standing as a *visual state*
      with a heading and a **button-shaped control**, not a muted paragraph with an underlined word.
      `pending` stays deliberately calm — waiting on a checking partner is a normal lifecycle state,
      not an alarm. The shipped `data-verification-owed` hook survives.
- [ ] **HVER-10** — A host sees a **verification roadmap**: the ordered steps from account to
      bookable, which are done, which is current, which remain. The honest step list spans all the
      gates that actually block income — identity check, payout onboarding, listing a space, and
      FitOut checking that space — because from the host's seat that is one journey, not three.
- [ ] **HVER-11** — Each roadmap step reads its **own server-side gate**, so no step can claim a host
      is ready when the gate that blocks them disagrees. No hand-maintained checklist; no second
      authority on "can I sell?".
- [ ] **HVER-12** — Every verification state is **named and visually distinguishable** —
      not-started, waiting, passed, not-passed, paused — except `grandfathered`, which stays
      **silent to the host** on the same argument `SILENT_REVIEW_STATES` already makes for listings.
- [ ] **HVER-13** — A host whose check **did not pass** is told a named cause and an explicit retry
      instant, both read from the **same** value the server's guarded re-submit `UPDATE` uses. The
      instant is absolute, never a duration.
- [ ] **HVER-14** — A host whose check has sat **pending beyond a stated window** is given a way
      forward rather than an indefinite wait. *This is the human rescue D-276 removes on the ops
      side, restored on the host side.*

### OPS — Ops as its own surface, with its own identity

- [ ] **OPS-07** — Staff reach FitOut Ops at its **own `ops.` host**. On the marketplace host,
      `/ops` returns the **same byte-identical `notFound()`** a non-staff caller gets — never a
      redirect, because a redirect is an existence oracle. One door, one cookie jar.
- [ ] **OPS-08** — A staff member **signs in on the ops host**, and that session does not carry to
      the marketplace host or back. Session cookies stay host-scoped.
- [ ] **OPS-09** — A staff member can **invite and onboard another staff member** from within ops,
      without anyone holding a production `DATABASE_URL`. The invitee confirms by email and sets
      their own password through the shipped mechanics. The CLI (`ops:grant` / `ops:revoke` /
      `ops:staff`) **stays** as first-staff bootstrap and break-glass.
- [ ] **OPS-10** — **Self-revoke and last-staff revoke are refused**, so no sequence of ops actions
      can lock every human out of the console. Enforced as a `WHERE`-clause no-op rather than a
      branch somebody can forget.
- [ ] **OPS-11** — A **staff account may not simultaneously be a booker or a host** (D-275,
      reversing PM-B on the PM's 2026-09-04 ruling). Enforced at grant time; the reversal is recorded
      as such rather than silently applied.
- [ ] **OPS-12** — The **404 cloak is re-measured** with every new ops route in the probe set —
      staff `200`, non-staff `404`, signed-out `404`, nonexistent `404`, with the three 404 bodies
      byte-identical by hash — and there is still **no `(ops)`-scoped `not-found.tsx`**.
      *D-275's non-negotiable condition.*
- [ ] **OPS-13** — An operator can read **every fact needed to decide** about a listing — photos,
      description, address, capacity, pricing, amenities, host facts — **expanded in place** on the
      queue row behind **one** disclosure level. The row stays **terminal**: zero anchors of any
      scheme and zero `[role="link"]` elements, on both row kinds, before and after expansion.
- [ ] **OPS-14** — Expanding the evidence **does not push the decision controls off-screen**. The
      decision widget stays one widget, visually separated from the evidence.
- [ ] **OPS-15** — The **host's standing renders as a fact** on the listing row rather than a blank
      cell — it is already selected fail-closed and simply never displayed.

### ENF — Enforcement, reachable by a human

- [ ] **ENF-04** — An operator can **suspend a host and freeze their payouts from a surface**, not
      only by a POST no UI issues. *Measured gap: `suspendHost` has no UI caller today, so D-276's
      promise to "keep enforcement in ops" preserves something currently unreachable.*

### LVER — The rejection loop, made deliberate

- [ ] **LVER-06** — A host with a rejected listing has an **explicit route to fix and resubmit it**,
      reached by choosing it rather than by tripping one of seven material fields. The control routes
      **into the edit wizard** — it is never a submit button that resubmits without a change, and it
      is never labelled appeal, dispute, or contest.
- [ ] **LVER-07** — A host can see a listing's **review history per cycle** — submitted → waiting →
      decided, with the reason — newest first and bounded, so it never becomes an infinite list.
- [ ] **LVER-08** — A host is told **which changes send a listing back to review before they edit**,
      in plain language sourced from the one exported material-fields tuple so it cannot drift.
- [ ] **LVER-09** — A host who resubmits gets an **acknowledgement that it was received and
      re-queued**, because silence after resubmitting is what produces resubmission spam.

### HSURF — Host listing surfaces that tell the truth

- [ ] **HSURF-01** — On `/host/listings`, cards in a row **align**, and every action control stays
      **inside its card** at every width from 320px up. *Measured cause: the card is `flex flex-col`
      with no growing child, so the stretched height lands below the footer band; and the controls
      are **clipped** by `overflow-hidden` against `shrink-0 whitespace-nowrap`, not spilled.*
- [ ] **HSURF-02** — Creating a listing **lands the host on the edit wizard**, not on a
      "We couldn't find that page". *Opens with a reproduction gate, not a code change: the measured
      evidence points at a stale dev route manifest rather than application code, and the fix must
      not be written before the cause is reproduced.*

### CI — Gates that actually run

- [ ] **CI-01** — The repository's **functional Playwright specs run in CI**, as a **new job**
      rather than by widening an existing one. *D-24 is half-closed already: two of four jobs run
      Playwright today, so the remaining scope is the functional `e2e/*.spec.ts` set.*

### Carried forward from v1.1 (original IDs retained)

- [ ] **STATE-05** — A booker who needs help can find a support path from any booking, in any
      payment state. **Blocked on a business fact, not on code**: one monitored support address at
      `src/lib/site.ts:70`. A placeholder is forbidden.
- [ ] **TRUST-01** — The same support path is reachable from the trust surfaces that owe one. Same
      one-line unblock as `STATE-05`.

---

## Out of Scope for v1.2

Explicitly excluded, with the reasoning, so they are not re-added by a later plan.

| Feature | Reason |
|---------|--------|
| **An appeals channel** (999.6) | An appeal contests a decision *without changing anything*; the only entry to re-review must remain an actual edit. `LVER-06` removes most of the demand for one. Never label the resubmit control "appeal", "dispute" or "contest". |
| **A separate `/ops` listing-detail page or "open in new tab"** | Needs an anchor, which re-opens the zero-anchor property closed three days before this milestone opened, and breaches the one-`/ops`-page rule. `OPS-13` expands in place instead. |
| **A resubmit button that resubmits with no edit** | It *is* an appeal wearing a button, and it produces resubmission spam. `LVER-06` routes into the wizard. |
| **Canned rejection codes shown to the host** in place of the operator's sentence | Turns a specific, fixable instruction into a category the host must decode. Any taxonomy stays internal and additive. |
| **A percentage progress bar on the verification roadmap** | Verification is not a wizard the host controls; a percentage lies while waiting on a third party. `HVER-10` uses discrete steps with per-step state. |
| **A live countdown or per-item verdict ETA** | FitOut cannot honour it — the vendor drops a webhook permanently after two retries. `HVER-14` hands the host a real action instead. |
| **Host-visible queue position** | Wrong by construction: the queue re-stamps on every resubmission, so the number would move backwards for reasons the host cannot see. Wait *age* is honest and already selected. |
| **Showing the host which staff member decided** | An internal accountability record, not host-facing. Naming an individual on a decision that blocks income is a harassment vector. |
| **Bulk approve / bulk reject** | Every decision here is money-bearing and each rejection owes a specific sentence. Bulk-approve is the fastest way to void the "a person at FitOut checked this" guarantee. |
| **Verification expiry / periodic re-KYC** | Needs a new enum value, a sweep, and an unbookability cliff that can strand live listings and in-flight bookings. A milestone of its own. `HVER-14` covers the only expiry-shaped problem that exists today. |
| **Re-adding a manual host-approval action** beside the automated verdict | Two authorities on one question — the exact thing D-276 removed. |
| **A support "get in touch" clause in the new copy** | `SUPPORT_EMAIL` is `null` and a placeholder is forbidden. Every new sentence must stand alone so half a sentence never renders. |
| **Reviewer hotkeys / item-passing**, a **published review window**, an **internal reason taxonomy**, and **richer waiting-on-whom pending copy** | All four are wanted and all four are cheap, but each needs a trigger v1.2 cannot supply — reviewer volume, measured decision latency, repeated rejection causes, and evidence the ambiguity is landing in support. Deferred, not rejected. |
| **2FA / step-up re-auth / shorter staff session TTL** | Declined by the PM as accepted risk (PM-B, 2026-09-01) and not re-opened here. |
| **Resolving Vercel-only-for-the-backend** | A real, pre-existing tension with the stack guidance; Inngest already carries the background work. Not this milestone's to settle, and not to be re-litigated inside a v1.2 plan. |

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
| LVER-03 | Phase 18 · 18-06 · Phase 18.1 · 18.1-03 (D-231 widened the set) | **Complete, widened** (18-06 shipped the ROADMAP's five — address, space type, capacity, photos, price — across `approved` / `grandfathered` / `rejected`. 18.1-03 grew the set to SEVEN on the PM's 2026-09-01 D-231 ruling: `title` and `description` are material, so a words-only edit returns a listing to review. ⚠ **THE ACCEPTED COST, STATED PLAINLY AND NOT TO BE SOFTENED: a typo fix in a description takes the listing off the market until ops re-approves it.** `deriveBookable` requires `approved \| grandfathered`, and the PM ruled that acceptable over a "material but still sellable" variant that would need a state the sell-gate does not have. Photo REORDER stays excluded — position is not content. Detection for the two new fields lives at the ONE site that can see them, `saveListingStep`; the photo half stays in `listing-photo.ts`, which is still the only site that can see it) |
| LVER-04 | Phase 18 · 18-02 | Complete |
| ENF-01 | Phase 18 · 18-05 (default lever) + 18-07 (freeze) + 18-08 (escalation) + 18-10 (the per-case choice) | **Satisfied** (18-10 ships the console half: the reject dialog's `RadioGroup`, rendered only when there is something to cancel, defaulting to the lighter lever on EVERY mount and remembering nothing; the always-rendered impact block, so choosing reveals nothing and the operator reads the money BEFORE deciding; and a confirm whose accessible NAME carries the booking count in alarm ink rather than a solid fill. Reaching the escalation takes three deliberate acts and no control on the queue row can reach it at all — mutation-proved by making the heavier lever the default and watching 5 cases go red. The server still re-asserts the choice: an omitted `lever` parses to block-new-only and cancels nothing. Reachability is 18-12's `/ops` route) |
| ENF-02 | Phase 18 · 18-07 | Complete |
| ENF-03 | Phase 18 · 18-08 (the action + the constant) · Phase 18.1 · 18.1-01 (D-236 settled) | **Complete, amended** (18-08 shipped ops cancel-and-refund behind `OPS_CANCEL_REFUNDS_SERVICE_FEE` with the D-209/D-236 conflict written down at the call site. 18.1-01 flipped it to `true` on the PM's 2026-09-01 settlement: the booker now gets the WHOLE charged total and FitOut retains nothing, so this requirement's first clause was rewritten rather than left asserting the opposite of the code. The other two clauses — host paid nothing, no host-cancel fee — are byte-unchanged. `withFlippedConstant` still drives the opposite branch, so "one line flips it" stays measured rather than promised) |
| HVER-06 | Phase 18.1 · 18.1-07 (the submit path) · 18.1-10 (the words) · 18.1-11 (the surface) · 18.1-14 (the proof) | **Complete** — **all four contributors have landed; 18.1-14 closed the last clause on 2026-09-03.** The proof this row has named since 18.1-01 is now on the record in `18.1-EVIDENCE.md`: **§ P2**'s hand-measure took **8 `/host/verify` readings** (320 and 1280, court and grove, across `unverified` / `pending` / `rejected`) in Edge on Windows 11 and **all eight pass** — no horizontal overflow, the form stacks, both controls full-width and holding ≥44px, focus order sensible, and the state / reason / way-out sentence legible. The `rejected` panel was confirmed on screen quoting the retry as an ABSOLUTE INSTANT (*"You can ask for another check after Sep 4, 2026, 1:27 PM."*), not a duration. **§ P1** settles the half no browser could: a real sandbox submission created a real `pending` row that reached the `/ops` queue, and **assumption A8 — the hosted flow on a real phone — reads PASS**, which under D-273's `is_desktop_allowed: false` is not a nice-to-have but the ONLY path a host can complete. ⚠ Two readings that looked like defects were verified as intentional rather than filed: the struck-through `Confirmed email` label is a completed-step indicator for the D-269 gate, and the refusal seen on *Finish the check* against a synthetic `vendor_ref` is 18.1-15's pre-check declining to replace a session it could not read (`vendor_session_read_failed`) — the designed behaviour, clean when re-staged against a live session. ⚠ **D6 is OPEN against this requirement's phone clause and is NOT a blocker**: the number is shape-checked, not verified, not normalised and not echoed back — PM decision 2026-09-03, noted for a later milestone. Three of four contributors had landed before this: 18.1-07 ships the only non-test, non-backfill writer of a `host_verification` row and mints it at `pending` so the `/ops` queue can fill; 18.1-10 ships the words; 18.1-11 ships the surface under `/host` this requirement names — `/host/verify`, reached from a fourth `HostSignals` advisory row rather than from nav, with BOTH required fields at submission (the D-269 email gate as a checklist row over a server re-read, and the D-268 phone as a required `tel` input over a server re-parse). Nothing in `tests/design/**` or in CI can see a real host on a real phone completing a real sandbox session — which is why this row waited for a person, and why the walk above is what closes it rather than any gate. |
| HVER-07 | Phase 18.1 · 18.1-04 (the async port) · 18.1-05 (the Didit adapter) · 18.1-06 (the decision module) · 18.1-08 (the webhook) · 18.1-09 (the reconciler) · 18.1-14 (the proof) | **Complete** — **closed by 18.1-14 on 2026-09-03, and the closing evidence is the only kind that could have closed it.** Every prior contributor was green against **self-signed** mocks, and `tests/verification/didit-webhook.test.ts` says in its own header that such a suite *"proves only that the route agrees with `tests/helpers/mocks.ts`"* — this repository has already paid that bill once on the PayMongo webhook, where the parser demanded both `te` and `li`, every real signature was refused through a whole phase of UAT, and the synthetic both-filled fixtures stayed green throughout. `18.1-EVIDENCE.md § P1` is the drive against the **real vendor**, on the **sandbox** application, 2026-09-02/03. **The approve walk**: signature VERIFIED, `pending → approved`, `result='pass'`, `checked_at` set, `decided_by_staff_id` NULL (no operator was involved and the column says so), **`vendor_ref` unchanged**, the route answering **200 in 85 ms** against the vendor's 5 s retry budget, one audit row (`didit_verdict \| ok \| {"moved": true, …}`) and **exactly one** notification. **The decline walk** (`decline_document_expired`): `pending → rejected`, `result='fail'`, and a stored reason of **48 characters** carrying no risk code, no `node_id`, no `additional_data` and no UUID — ⚠ **the CANNED FALLBACK**, because Didit supplied no allow-listed code at all, which makes D-265's fallback the branch a real vendor decline actually took rather than dead code kept for tidiness. **The replay**: byte-identical repost → **200**, row unchanged, no second notification, `{"moved": false, "reason": "not_applicable"}` — ⚠ and the idempotency is **STRUCTURAL, not a ledger**: the verdict `UPDATE` admits `pending` only, so a replay against any other state is a 0-row no-op by construction; `event_id` is captured for traceability and is *not* what makes it safe. **The tamper**: `"Approved"` → `"Declined"` under the original signature → **400 `Invalid signature`**, no unhandled exception. ⚠⚠ **AND ADDENDUM A7 IS SETTLED** — the vendor's self-contradiction about `X-Signature` resolves in favour of raw-as-primary, because `X-Signature` and `X-Signature-V2` carried the **identical 64-character digest on every delivery observed**: Didit ships already-canonical JSON, so the raw bytes and their canonical re-serialisation are the same bytes. The two mock helpers were deliberately **not** collapsed to match, because they are the only instrument that can tell the two branches apart. Also measured: `created_at` is **not** moved by a verdict and **is** moved by a new submission — F-1's rule read off real rows in both directions. |
| HVER-08 | Phase 18.1 · 18.1-06 (the cooldown rule) · 18.1-07 (the re-submit guard) · 18.1-08 · 18.1-10 (the words) · 18.1-11 (the surface) | **Complete** (all five named plans have landed. 18.1-06 — D-265's rejection sentence is composed through a thirteen-code declared allow-list, bounded at 280 and never empty, with a canned product fallback; 18.1-07 — the cooldown IS a clause of the guarded UPDATE's own `WHERE`, reading `updated_at` and never the now-mutable `created_at`, and `suspended` is simply ABSENT from that `WHERE` so a suspended host cannot re-submit STRUCTURALLY rather than by a branch somebody can forget; 18.1-10 — the words, with the retry quoted as an ABSOLUTE INSTANT because a duration is a promise about a human and an instant is a fact the database keeps; 18.1-11 — the surface: the `rejected` panel forks on a server-composed FINISHED sentence (null is the permission, the string is the refusal), the `suspended` branch renders the shipped notice and draws NO submit control, and `composeVerificationRejectionReason` guarantees the host never reads an empty paragraph under a rejection heading. ⚠ THE 24 HAD TWO DECLARATIONS UNTIL 18.1-11 and now has one: `COOLDOWN_HOURS` moved to the unguarded `src/lib/host/verification-cooldown.ts`, imported by BOTH the clause that enforces it and the sentence that quotes it, so the instant on screen cannot disagree with the clause that refuses — PROJECT D-130 / GATE-05 one domain over. Measured: moving the constant to 26 reddens `tests/ops/host-verification-submit.test.ts` case 6.) |
| LVER-05 | Phase 18.1 · 18.1-12 | **Complete** (`createDraftListing` refuses `unverified \| pending \| rejected \| suspended` SERVER-SIDE, reading `loadHostVerification` as its sixth reader rather than a seventh query. The four states are spelled positively, not as `!== "approved"`, so a seventh enum member cannot be refused by accident. All SIX states plus the NO-ROW case are driven through the real action in `tests/listing/crud.test.ts`, and every refusing case asserts the `listing` row count did not move — `{ok:false}` alone cannot tell a gate from a refusal returned after the insert. **FINDING F-2 is CLOSED**: `/host/listings/new` reads the same row and `redirect("/host/verify")`s the four refusing states BEFORE the action is called, so the refusal lands on a page whose lede explains the bounce instead of on the silent bounce to the grid that would have violated SC5. The ordering is pinned structurally by claim 4 of `tests/host/verification-surface.test.ts`, which is the only proof of it that runs in CI — D-24 keeps Playwright out. **FINDING F-7 is WRITTEN AND PINNED**: `grandfathered` is deliberately NOT a refusing state, argued at the site and held by a named case whose failure message states the whole argument. **D-270 holds**: `saveListingStep` stays UNGATED and a case proves an unverified host can still edit the draft they already had. The four `Create listing` links are byte-unchanged and undisabled — a disabled link is a hint, not a gate. Measured: dropping `pending` from the set reddens only the named `pending` case; neutering the whole condition reddens all five refusing cases while `approved` and `grandfathered` stay green.) |
| OPS-06 | Phase 18.1 · 18.1-13 (the reveal + its audit row) · 18.1-14 (the proof) · **18.1-16 (D-274 — the closing contributor)** | **Complete** — **closed by 18.1-16 on 2026-09-03.** Every clause this row has named since 18.1-01 was already discharged by 18.1-14; what held it open was **PM decision D-274** (`deferred-items.md § D9`), taken off 18.1-14's own hand-measure, and **18.1-16 shipped it.** **What shipped:** the revealed email is now plain, copy-pasteable text — `<span ref={emailRef} tabIndex={-1}>{contact.email}</span>` inside the same `<dd>` the compose anchor occupied. The phone did not change; it was already plain text, and the island's own header already argued it should never become a link, so D-274 made the **email match the phone** rather than changing direction on either. **The announcement was REDESIGNED, NOT DELETED** — which is the clause this row insisted on. Focus still moves on a successful reveal, now onto the revealed VALUE, and every property the anchor's focus move had is carried by that target's POSITION rather than by its element type: same `<dd>` so the `<dt>` context is spoken, its text content IS the address so the value is what gets spoken, and the caret lands on what the operator pressed to read. `booking-reference.tsx:143-153` is the shipped precedent for a `tabIndex={-1}` value the user copies. ⚠ **A live region was weighed and REJECTED, and this row's own note that *"the live region is already there"* was WRONG**: the island declares exactly ONE region and it is the REFUSAL path only, and `src/lib/design/live-regions.ts` states *"⚠ SO NO SUCCESS REGION MAY BE ADDED HERE"*. A polite region beside a focus move is also two announcements for one outcome (GATE-03 rule 6). The shipped shape moves **no count**: `LIVE_REGION_FILES` still 31, `DeclaredFileCountIsThirtyOne` unmoved, `EXPECTED_OPS_ACTIONS` still 7. **THE ROW IS STRICTLY TERMINAL AGAIN, which makes D-274 a TIGHTENING rather than a reversal**: 18.1-13 had to WIDEN the Phase-18 zero-anchor property to ship the compose anchor, and 18.1-16 **reverted both widenings rather than emptying them** — `ops-queue-row.test.tsx` assertion 1 reads zero anchors of ANY scheme with `[role="link"]` still zero, on both kinds and before and after a reveal; and `EXCLUDED_MAILTO`, its filter clause in `unguardedMailto` and its guard-the-guard are all deleted, so **D-26's ban on publishing an address to write TO holds across all of `src/` with ZERO declared exemptions for the first time since 18.1-13**. ⚠ **AND ONE ERROR IN THIS ROW IS CORRECTED RATHER THAN COPIED FORWARD: `EXCLUDED_MAILTO` never lived in `tests/ops/ops-queue-row.test.tsx` — it lives in `tests/design/site-contacts.test.ts`.** Guard-the-guard 1 is byte-unchanged; guard-the-guard 2 was **repurposed rather than deleted with the allowance** and now proves the raw query reports a compose anchor too, so a re-introduced filter of any shape reddens. **How it was measured.** In jsdom: four clauses on the focus target (non-null, `textContent` is the address, `tabindex` is `"-1"`, and `valueFor(card, "Email").contains(activeElement)` — the last is what proves the `<dt>` context structurally rather than by argument) plus a new re-mount case pinning the effect's `[contact]` key. Mutation-scored: `tabIndex={0}` reddens the revealed case because `INTERACTIVE` excludes `[tabindex="-1"]` by construction; removing `tabIndex` reddens both focus cases. **And in a real browser, which is what CI provably cannot do (D-24)** — 8 `/ops` readings, 320 and 1280, court and grove, host row AND listing row, all pass: zero anchors before or after reveal, `cursor: auto`, `text-decoration-line: none`, the same ink as its `<dd>`, no class of its own, `Enter` on the value leaves the URL unchanged and opens no window, Tab from it reaches `Approve {subject}` next, the value selects and copies to exactly its own text, the reveal control holds 44.0px, no overflow at either width (179/191 elements examined), a phoneless host still renders **"Not provided"**, and the compose scheme occurs **zero** times in the served document. Transcript in `18.1-16-SUMMARY.md`. ⚠ **ONE HONEST LIMIT, RECORDED RATHER THAN GLOSSED:** after a MOUSE-activated reveal the target draws no focus ring (`outlineStyle: none`, `boxShadow: none`) because Chromium's `:focus-visible` heuristic does not match a programmatic focus whose last user interaction was a pointer. After a KEYBOARD-activated reveal it does (`outlineStyle: auto`, `1px`). **This is unchanged from the anchor** — a programmatically-focused anchor behaved identically — and it does not affect the screen-reader announcement, which is what the mechanism exists for. **The audit half is BYTE-UNCHANGED**: `revealHostContact` still has `requireStaff()` as its FIRST statement and writes the audit row IN THE SAME CALL as the read, so there is no shape in which a reveal happens and the record does not exist; `src/app/actions/ops-contact.ts`, `src/lib/audit.ts`, `src/lib/ops/review-queue.ts` and `tests/ops/host-contact-reveal.test.ts` all pass `git diff --exit-code`. **FINDING F-6 stays RESOLVED AND STRUCTURAL**: the queue projections are untouched, so the queue item type has no contact field and `tsc` is what says so — contacts never enter the RSC payload and the reveal remains an on-demand, audited fetch whose values live only in the island's React state. **D-72 remains measured on the SERIALISED whole row** with a canary email and phone, `meta` asserted as the exact key set `["userId"]` — who looked at whom, never at what. ⚠ **D6 is OPEN against this requirement's phone clause and is NOT a blocker**: the number is shape-checked, not verified, not normalised and not echoed back — PM decision 2026-09-03, noted for a later milestone. |

**22 requirements across two phases.**

- **Phase 18 · 17 · all complete** — verified 2026-09-01 (`18-VERIFICATION.md`: `passed_with_concerns`, 0 code-level blockers, 4 PM decisions open).
- **Phase 18.1 · 5 · 5 complete** — written at plan time per D-239 by `18.1-01`. HVER-08 was moved to Complete by `18.1-11`, the last of its five named plans; LVER-05 by `18.1-12`, its only one; **HVER-06 and HVER-07 by `18.1-14`** on 2026-09-03, on the strength of the sandbox transcript and the hand-measure in `18.1-EVIDENCE.md § P1` and `§ P2`; and **OPS-06 — the last row — by `18.1-16`** on the same day. OPS-06's outstanding proof (the revealed row at 320 and 1280, focus order included, which CI provably cannot see — D-24) had already been driven and **passed**; what held the row open was **PM decision D-274**, taken off that very reading: the revealed contacts were clickable and had to become plain copy-pasteable text (`deferred-items.md § D9`). **`18.1-16` implemented it** — the email is plain text, the phone was already, the queue row is strictly terminal again, both 18.1-13 gate widenings are reverted rather than emptied, and the focus-move announcement was **redesigned rather than deleted** and re-read by hand in a real browser at both widths and both themes on both row kinds. § D9 is **RESOLVED**. ⚠ **PHASE 18's ROADMAP CHECKBOX IS NOW DISCHARGEABLE — AND `18.1-16` DELIBERATELY DID NOT TICK IT.** The reason it was held (an evidence document describing a surface the PM had already decided against) is gone, but ticking the box, flipping the 18.1 `In Progress` status cell and closing the phase are the **verifier's / orchestrator's** call and not a plan executor's. `18.1-16` moved only what this file and `§ D9` own.

---

## Deferred (recorded so they are not lost)

Carried from `.planning/ROADMAP.md` § Backlog and from Phase 18's own discussion. Not in scope.

- **SEARCH-06..09, MAP-01..04** — Search & Discovery, deferred out of v1.1 by **D-141** to backlog
  999.3. Spikes complete; **D-139/D-140 remain adopted**.
- **Booker-side reporting of a fake listing** — backlog 999.4. The queue a report would feed.
- **Reviews and ratings** — backlog 999.5.
- **Host appeals** — backlog 999.6. A rejected host has no self-serve route back in this phase.
- ~~**Title and description as material fields**~~ — **RESOLVED 2026-09-01 by D-231**, shipped in
  Phase 18.1 plan `18.1-03`. Held out of LVER-03 only to keep the ROADMAP's stated five fields as
  written; the PM promoted both for the reason this entry itself gave — a fake listing lies in its
  words as much as its fields. `MATERIAL_FIELDS` is now the seven, and a title-only or
  description-only edit returns an `approved`, `grandfathered` or `rejected` listing to review.
  Photo REORDER stays excluded: position is not content. Recorded as a resolution rather than
  deleted, so this ledger reads as a history rather than a snapshot.
- **Tiered ops permissions** — one staff role ships; cancel-and-refund is reachable by any staff
  member, with the audit trail as the control.
- **Backfilling the grandfathered catalogue** — LVER-04 makes it one statement whenever the PM wants it.
- **Wiring a real KYC vendor** — HVER-01 lands the port; HVER-04 is what the PM decides the vendor from.
