# Feature Research

**Domain:** Two-sided marketplace — host identity verification UX, internal trust-and-safety moderation console, and seller-facing review/resubmit loop
**Researched:** 2026-09-03
**Confidence:** MEDIUM overall (ecosystem findings are MEDIUM where cross-checked against a vendor's own docs, LOW where only community reporting exists; **every claim about what FitOut already ships is HIGH — read from the tree, with `file:line`**)

---

## How to read this

The milestone question has three parts and this file keeps them separate throughout. Every row is tagged:

| Tag | Area |
|-----|------|
| **A** | Host verification progress/roadmap surface |
| **B** | Internal trust-and-safety / moderation console (`/ops`) |
| **C** | Seller-facing review status/history and the resubmit loop |

**The single most important finding is that FitOut has already built most of the data for all three, and v1.2 is mostly a rendering and vocabulary problem, not a schema problem.** The measurements are in "Dependencies on already-shipped FitOut capabilities" below and they change what should be planned. Two exceptions where real work exists are flagged **[NEW DATA]**.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = the product feels incomplete or, worse, adversarial.

| # | Feature | Why Expected | Complexity | Notes |
|---|---------|--------------|------------|-------|
| **A1** | The unverified state renders as a **state**, not a sentence — a bordered/toned status region with a heading, not a `<p>` with an underlined word | Every comparable marketplace renders "you can't sell yet" as a distinct visual block. FitOut currently ships one muted paragraph at `src/components/host/host-signals.tsx:228` inside a `PanelCard tone="muted"` — deliberately calm, per the comment block, and *too* calm for the one state that blocks all income | **LOW** | Purely presentational. The `data-verification-owed={verificationStatus}` hook already exists and must survive. Do **not** promote it to an alerting tone for `pending` — the shipped comment argues correctly that waiting on a checking partner is a normal lifecycle state; only `rejected`/`unverified` earn urgency |
| **A2** | A real control — a button-shaped affordance — instead of an inline underlined link | An underlined word inside a sentence is not a call to action; it reads as a footnote. This is the PM's stated complaint | **LOW** | `/host/verify` already exists with real panels for unverified/pending/rejected/suspended (`src/app/(host)/host/verify/page.tsx`, `src/components/host/verification-panel.tsx`). The nudge only needs to *look* like the way in |
| **A3** | A **verification roadmap**: the ordered steps, which are done, which is current, which remain | Stripe Connect's `currently_due` / `eventually_due` / `past_due` triple is the industry reference; Vrbo and Airbnb both surface "what's left before you can publish". A host who cannot see the shape of the process assumes it is arbitrary | **MEDIUM** | 3–6 steps is the researched sweet spot. FitOut's honest step list is short: **(1) account → (2) identity check → (3) payout onboarding → (4) list a space → (5) FitOut checks the space**. Steps 3 and 5 are separate gates that already exist (`deriveBookable`, `listing.review_state`) and belong on the same roadmap, because from the host's seat there is one journey to "bookable", not three |
| **A4** | Every verification state is **visually distinguishable and named**: not-started, waiting, passed, not-passed, paused | The six-value enum already exists in data (`unverified`, `pending`, `approved`, `rejected`, `grandfathered`, `suspended` — `src/lib/db/schema.ts:369`) but only some reach the eye | **LOW** | `grandfathered` must stay silent to the host — `src/lib/listing/review-signal.ts:162` (`SILENT_REVIEW_STATES`) already argues this for listings and the same argument holds for hosts: telling someone "you were grandfathered" invites a question nobody at FitOut can answer |
| **A5** | On a failed check: **a named cause and an explicit retry rule** ("you can try again after ⟨time⟩") | Airbnb's most-complained-about behaviour is a terminal, unexplained "verification failed" — community and legal-advice posts both tell hosts to screenshot the wording and ask support what actually failed. That is the bar to clear, not to match | **LOW** | The reason column exists (`host_verification.reason`, schema:~432) and the 24h cooldown clock is already returned by the *same* read the server's guarded `UPDATE` uses (`src/lib/host/verification-status.ts` → `updatedAt`, D-264). **Render from that value. Do not add a second read** — that is the two-authorities defect D-130/GATE-05 exists to prevent |
| **A6** | A **stale-pending affordance** — after the check has sat in `pending` beyond a stated window, the host gets a way forward rather than an indefinite spinner | D-276 removes the manual host-approval queue, and 18.1 measured that Didit retries a webhook twice then drops it permanently. The Inngest sweep is now the *only* rescue, and it is invisible to the host | **LOW–MEDIUM** | This is the human rescue D-276 removed, restored on the **host** side instead of the ops side. It costs nothing structurally: the resend path (`src/lib/host/resend-verification.ts`) and the cooldown (`src/lib/host/verification-cooldown.ts`) already exist. The roadmap's pending step simply stops saying "hang tight" forever |
| **B1** | **Every fact needed to decide is on the deciding surface** — address, capacity, pricing, amenities, description, photos, host facts | This is the #1 reviewer complaint in the moderation literature: without platform-specific context reviewers react to volume instead of judging, and tool/tab switching is a measured throughput and decision-quality tax. Pinterest's Pinqueue3.0 treats the reviewed unit as a *bundle* of related objects (the Pin **plus** its owner, board and reporter), never one record | **LOW for most of it** | **Measured:** `src/lib/ops/review-queue.ts` already selects title, all eight address columns, `primary_space_type`, `max_occupancy`, all three price columns, `occupancy_mode`, `currency`, host name, host verification status (fail-closed `COALESCE(... ,'unverified')`), `submitted_at` and the ordered photo array. **Only two things are genuinely missing: `listing.description` (schema:207) and `listing_amenity` (schema:310).** The rest is a render, not a query |
| **B2** | The queue row **expands in place**; the reviewer never leaves the queue | Both the moderation research and D-277 land in the same place. The action-row/disclosure pattern is the standard for this exact job | **MEDIUM** | Hard constraint: the row is asserted **terminal** — zero anchors of any scheme, zero `[role="link"]`, on both row kinds, before *and* after a reveal (D-274, re-tightened 2026-09-03 after 18.1-13 widened it and 18.1-16 reverted). A disclosure is a `<button>`. Keep the nesting to **one** disclosure level: >2 levels is where progressive disclosure measurably loses people |
| **B3** | **One decision widget**, visually separated from the evidence | Pinqueue3.0's review page is exactly two blocks — review widgets (the evidence) and one action widget (the decision) | **LOW** | Already the shape: `src/components/ops/ops-decision-actions.tsx` + `ops-reject-dialog.tsx`. Expanding the evidence must not push the decision off-screen — that is the regression to watch |
| **B4** | A **required, host-readable reason** on every reject | Turo reserves the right to refuse without a reason and hosts have nowhere to go. Under DSA Art. 17 (all platforms since Feb 2024, regardless of size) a restriction needs a statement of reasons delivered to the affected user | **ALREADY SHIPPED** | `ops-reject-dialog.tsx` + `listing_review.reason` + `composeReviewSentence` (`review-signal.ts:233`). Do not regress it while restructuring the row |
| **B5** | **Who decided, and when**, retained | Basic accountability; needed the first time a decision is questioned | **ALREADY SHIPPED** | `listing_review.decided_by_staff_id` / `decided_at` (schema:452ff), plus a D-218 `audit` row per ops action whose `actorId` deliberately carries no FK so the trail outlives what it describes |
| **B6** | Queue is **oldest-first** with the wait age visible per row | Fairness, and it is how a reviewer triages without a priority model | **ALREADY SHIPPED** | Partial indexes `listing_review_queue_idx` / `host_verification_queue_idx`, both ASC to byte-match the console `ORDER BY` (a mismatch puts a Sort node on the scan — measured at `src/lib/ops/alerts.ts:12-24`). `submittedAt` is `COALESCE(lr.submitted_at, l.created_at)` so a resubmission re-enters at resubmission time (D-249) |
| **B7** | Staff reach ops at its own address, sign in there, and can onboard another staff member | Without it, adding a colleague requires production `DATABASE_URL` — a second credential to protect, and the actual argument behind D-275 superseding D-217 | **HIGH** | Subdomain rewrite + host-scoped cookie + invite flow. **Non-negotiable per D-275:** 18-14's byte-identical 404 cloak (measured 200/404/404/404 with sha256 body equality) is **re-measured with every new ops route in the probe set**, and there is still no `(ops)`-scoped `not-found.tsx`. Keep the CLI (`ops:grant`/`ops:revoke`/`ops:staff`) as first-staff bootstrap and break-glass |
| **C1** | The host can see a listing's review state **on their own surface**, without hunting email | Peerspace, App Store Connect and Etsy all put status in the seller's own dashboard. Email alone is a silent state change | **ALREADY SHIPPED (partly)** | `REVIEW_SIGNAL` chips "In review" / "Not approved" with a sentence and a `wayOut` (`review-signal.ts:111`), rendered on `/host/listings`. What is missing is the **history**, not the current state |
| **C2** | The **rejection reason survives** and is readable *while the host is fixing it* | The whole point. Etsy sellers' recurring complaint is a deactivation notice that does not name the offending element | **ALREADY SHIPPED** | Deliberately never erased (D-278). `listing_review.reason` is per-cycle, so prior reasons are retained too |
| **C3** | An **explicit "fix and resubmit" control** — reached by choosing it, not by tripping one of seven fields | D-278 names this precisely: the loop works and is invisible. Peerspace's flow is literally "make the changes, resubmit" as a stated action | **LOW–MEDIUM** | The mechanism is built and guarded: `flipToPendingOnMaterialEdit`, `MATERIAL_FIELDS` = address, space_type, capacity, photos, price, title, description (`src/lib/listing/re-review.ts:116`), `RE_REVIEW_SOURCE_STATES` = approved ∪ grandfathered ∪ rejected. **The control routes into the edit wizard and names the change requirement; it must not become a no-op submit button** (see AF3) |
| **C4** | **Review status/history**: submitted → waiting → decided, per cycle, with the reason | App Store Connect's Status History is the reference — every status change logged, last 10 submissions from the past 180 days retained. Airbnb and Turo show nothing, and hosts route to support | **LOW — the table already exists** | **Measured:** `listing_review` (schema:452) already stores one row per cycle with `state`, `reason`, `decided_by_staff_id`, `submitted_at`, `decided_at` (NULL = still awaiting), indexed by `listing_review_listing_idx`. **A host-facing history is a read. No migration.** |
| **C5** | The decision **reaches the host on both channels**, from one payload | A status the host must go and look for is not being told, and the thing being communicated blocks their income — D-245, already argued in-tree | **ALREADY SHIPPED** | Enum values `listing_review_approved`, `listing_review_rejected`, `host_verification_approved`, `host_verification_rejected`, `host_suspended` (schema:705-710), one payload → in-app row + email via the D-86/D-91/D-92 fan-out. **Verified safe under D-276:** the Didit path emits independently at `src/lib/verification/apply-verdict.ts:393` via `notifyAccountOwner` + `hostApprovedPayload`/`hostRejectedPayload` — removing the manual host queue does **not** silence host verification notifications |
| **C6** | Confirmation that a **resubmission was received** and re-queued | Silence after resubmitting is what produces resubmission spam — the seller assumes it did not go through | **LOW** | The `pending` chip already returns; what is missing is the acknowledgement moment. Reuse the shipped toast idiom rather than inventing a surface |

---

### Differentiators (Competitive Advantage)

Not required, but each is cheap here *because the substrate already exists*, and each attacks a named competitor failure.

| # | Feature | Value Proposition | Complexity | Notes |
|---|---------|-------------------|------------|-------|
| **A7** | **The roadmap is derived from server state, not a hand-maintained checklist** — each step reads the gate that actually blocks it | This is the Stripe Connect `requirements.*` model. A hand-written checklist drifts from the gate and becomes a second authority on "can I sell?" — the exact defect D-130/GATE-05 forbids | **MEDIUM** | Read the five gates once, server-side, and render. `verification-status.ts` already returns a 4-field shape for exactly this reason ("a host told 'your hosting is paused' on one page while another quietly disagrees is the drift worth preventing") |
| **A8** | **Name the third party and who is waiting on whom** in the pending step | "We're checking" is ambiguous about whether the host still owes something. Peerspace overloads one status ("Pending approval") for both "we're looking" and "your move" — that ambiguity is the bug worth not copying | **LOW** | Copy only. Two distinct pending readings: *waiting on the checker* vs *waiting on you* |
| **C7** | **Tell the host, before they edit, which changes send a listing back to review** | Directly discharges D-278's actual complaint. No comparable marketplace does this — Etsy, Turo and Airbnb all let sellers discover it after the fact | **LOW** | `MATERIAL_FIELDS` is already an exported, documented tuple and its header says it is "documentation with a type". Surface it in the edit wizard as plain language, sourced from that one tuple so it cannot drift |
| **C8** | **Per-cycle history that shows the previous reason alongside the previous fix** | Turns "what do I fix" from a support ticket into a reading task. App Store Connect approximates this; marketplaces do not | **LOW–MEDIUM** | The rows exist. Render newest-first, `decided_at IS NULL` → "waiting". Cap the visible list (App Store caps at 10 / 180 days) so it does not become an infinite scroll |
| **C9** | **A published review window, expressed as a range** | Peerspace publishes "most new submissions **and resubmissions** within 1 hour during operating hours" and it is the single most reassuring thing in their host docs. The "and resubmissions" clause is what stops resubmission anxiety | **LOW** | See AF6 — publish a range and operating hours, never a per-item countdown |
| **B8** | **Reviewer hotkeys and item-passing** across both queue kinds | Pinqueue3.0's headline productivity feature; any throughput gain is a direct cost saving and a decision-quality gain | **MEDIUM** | Must not introduce an anchor or a link role into the row (D-274). Keyboard operability is already a shipped hard gate (D-131) |
| **B9** | **Host standing rendered inline on the listing row** — verification state, and whether their spaces are already live | Pinterest's bundle-of-objects principle. A reviewer judging a space wants to know whether this host has passed a check and has a track record | **LOW — already half-built** | `hostVerificationStatus` is *already selected* with a fail-closed COALESCE and simply needs to render as a fact, not a blank |
| **B10** | **A reason taxonomy that accompanies — never replaces — the operator's sentence** | Speeds the reviewer up, makes reasons consistent, and enables "top rejection causes" later. The sentence is what the host actually reads | **MEDIUM** | Would need a new column. **Defer past v1.2** unless reject volume justifies it; see AF4 for the failure mode if the sentence is ever displaced |
| **B11** | **Audited on-demand contact reveal** | Already shipped (`src/components/ops/ops-contact-reveal.tsx`, OPS-06) and genuinely ahead of the field — most consoles show PII unconditionally | **ALREADY SHIPPED** | Preserved explicitly by D-276: enforcement and contact survive the queue removal |

---

### Anti-Features (Commonly Requested, Often Problematic)

| # | Feature | Why Requested | Why Problematic | Alternative |
|---|---------|---------------|-----------------|-------------|
| **AF1** | **An appeals channel** ("I disagree, review it again") | Feels fair; every big marketplace has one | **Explicitly out of scope — backlog 999.6, D-278.** The distinction is load-bearing: an appeal contests a decision *without changing anything*, so the only entry to re-review must remain an actual edit. Etsy is the cautionary case in the opposite direction: because platform-deactivated listings have **no** fix-and-resubmit path, every case is forced into a 180-day per-listing appeal and seller guidance becomes "assert it was a mistake" — an adversarial channel with no fix in it | **Build C3 instead.** A well-signposted resubmit path removes most of the demand for an appeal. Never label the resubmit control "appeal", "dispute", "contest" or "request another review" |
| **AF2** | **A separate ops listing-detail page** (or "open in new tab") | Feels like the obvious way to show more | Re-opens exactly the property 18.1-16 just closed: the row's zero-anchor / zero-`[role=link]` assertion (D-274) and D-246's one-`/ops`-page rule. A detail page needs an anchor | **Expand in place (B2).** A disclosure is a button, not a link |
| **AF3** | **A "Resubmit" button that resubmits without an edit** | The literal reading of "explicit resubmit path" | Produces resubmission spam — the researched failure mode is endless rejection loops from resubmitting without understanding the rejection, and marketplaces rate-limit on *velocity patterns* (rapid re-edits, parallel submissions), not counts. It also collapses the appeal/resubmit distinction AF1 protects, because a no-change resubmit **is** an appeal wearing a button | **Make the control a signposted route into the edit wizard**, with the prior reason visible while editing. Re-entry to the queue stays where it is today — on a real material change — and stays timestamped at resubmission time (D-249) so a repeat resubmitter cannot jump the line |
| **AF4** | **Canned rejection codes shown to the host in place of the operator's sentence** | Consistency; less writing per decision | The operator's own sentence is the shipped, deliberate property ("a reason the host actually reads"). A code turns a specific, fixable instruction into a category the host must decode — which is precisely the Etsy complaint | If a taxonomy is added (B10), it is **internal and additive**: category **plus** the sentence, and the sentence is never optional |
| **AF5** | **A percentage progress bar on the verification roadmap** | Looks like progress | Verification is not a wizard the host controls. A percentage implies effort-proportional progress and *lies while waiting on a third party* — the bar sits at 60% for a day and communicates nothing. It also invites gamification pressure on a compliance gate | **Discrete steps with per-step state** (done / current / blocked-on-us / blocked-on-you / not yet). 3–6 steps, checkmarks for done, current highlighted, remaining neutral |
| **AF6** | **A live countdown or per-item ETA** ("verdict in 3h 12m") | Reassuring; matches food-delivery expectations | FitOut cannot honour it. Didit retries a webhook twice and then **drops it permanently**; after D-276 the Inngest sweep is the only recovery. A countdown that reaches zero with no verdict is worse than no countdown, and it re-creates the timer as a second authority on state | **Publish a range and operating hours (C9)**, then hand the host a real action once the range is exceeded (A6) |
| **AF7** | **Host-visible queue position** ("you're #7") | Transparency | Invites gaming, and it is **wrong by construction here**: the queue reorders on every resubmission because `submitted_at` re-stamps (D-249). The number would move backwards for reasons the host cannot see | Show the wait *age* ("submitted 2 days ago") — honest, monotonic, and already selected |
| **AF8** | **Showing the host which staff member decided** | "Transparency" | `decided_by_staff_id` is an internal accountability record, not host-facing. Naming an individual on a decision that blocks income is a harassment vector, and with a small ops team it identifies a real person | Keep the actor internal (it already is). Host-facing copy says "FitOut checked this listing" — which is what `REVIEW_SIGNAL.rejected.reason` already says |
| **AF9** | **Bulk approve / bulk reject in the queue** | Obvious throughput win | Every listing decision here is money-bearing and each rejection owes a *specific* sentence (B4). Bulk actions structurally destroy per-item reason quality, and bulk-approve is the fastest way to void the entire "a person at FitOut checked this" guarantee. Pinterest's bulk tooling exists for spam clusters — a category FitOut does not have | Invest in per-item speed instead: expand-in-place (B2) and hotkeys (B8) |
| **AF10** | **Verification expiry / periodic re-KYC** | Sounds prudent | There is no `expired` value in `host_verification_status` and adding one means a background sweep plus an **unbookability cliff** that can strand live listings and in-flight bookings. That is a milestone of its own, and it collides with the payout freeze semantics | Out of v1.2. Note it in the backlog. The stale-pending affordance (A6) covers the only expiry-shaped problem that actually exists today |
| **AF11** | **Re-adding a manual host-approval action beside the automated verdict** | "A human should be able to override" | D-276 removed it deliberately: two authorities on one question. The webhook already flips `pending → approved` with `decided_by_staff_id` NULL, and the queue predicate is `WHERE hv.status = 'pending'`, so a passed host was never in the queue | Keep hosts in ops for **enforcement** (suspend, payout freeze — ENF-01/ENF-02) and **contact** (OPS-06) only, exactly as D-276 scopes it |
| **AF12** | **Adding a support "get in touch" clause to the new rejection/verification copy** | Natural help-desk instinct | `SUPPORT_EMAIL` is `null` at `src/lib/site.ts:70` and D-64 forbids a placeholder. `src/lib/listing/review-signal.ts:69` records that the shipped sentences are written to stand alone precisely so half a sentence never renders | Write every new sentence to stand alone. `STATE-05`/`TRUST-01` unblock on a business fact, not on this work |
| **AF13** | **Auto-publishing a fixed listing the moment the host saves** | "They fixed it, ship it" | Bypasses the review gate that is the entire point of the milestone, and re-review-on-material-edit exists exactly to prevent approve-then-swap (D-232) | Save → `pending` → queue at resubmission time. Unchanged from what ships today |

---

## Feature Dependencies

```
A3 Verification roadmap
    └──requires──> A4 Distinguishable states  ── (SHIPPED: host_verification_status enum)
    └──requires──> A7 Derived-from-server-state reads
                       └──requires──> verification-status.ts single read (SHIPPED, D-264)
    └──requires──> A5 Named cause + retry rule
                       └──requires──> host_verification.reason + updatedAt cooldown (SHIPPED)

A1 Unmissable unverified state ──enhances──> A3   (the roadmap is what the signal points at)
A2 Real control ──requires──> /host/verify panels (SHIPPED, 18.1)
A6 Stale-pending affordance ──requires──> A3 (it is a step state, not a new surface)
A6 ──requires──> 24h cooldown (SHIPPED) ──conflicts──> AF6 live countdown

B1 Full evidence on the row
    └──requires──> description + amenities added to the queue read model   [NEW DATA — the only query work]
    └──requires──> B2 expand-in-place disclosure
                       └──constrained-by──> D-274 zero-anchor / zero-link-role assertion
                       └──constrained-by──> D-246 one-/ops-page rule
B2 ──conflicts──> AF2 separate detail page
B3 One decision widget ──enhances──> B1  (evidence must not push the decision off-screen)
B8 Hotkeys ──requires──> B2  (item-passing only makes sense with in-place review)
B7 ops. subdomain + invite
    └──requires──> re-measured 404 cloak with new routes in the probe set (D-275, non-negotiable)
    └──independent-of──> B1/B2  (can be planned in a separate phase)

C4 Review status/history
    └──requires──> listing_review per-cycle rows (SHIPPED — read only, no migration)
    └──enhances──> C3 explicit resubmit path
C3 Explicit resubmit path
    └──requires──> flipToPendingOnMaterialEdit + MATERIAL_FIELDS (SHIPPED)
    └──requires──> C2 preserved reason (SHIPPED)
    └──enhanced-by──> C7 "what changes send this back to review"
    └──conflicts──> AF3 no-change resubmit button
    └──conflicts──> AF1 appeals (999.6)
C5 Both-channel notification (SHIPPED)
    └──survives──> D-276  (Didit path emits independently at apply-verdict.ts:393 — verified)
C6 Resubmission acknowledgement ──enhances──> C3
```

### Dependency Notes

- **B1 requires two new columns in the read model, and only two.** `src/lib/ops/review-queue.ts` already selects title, eight address columns, `primary_space_type`, `max_occupancy`, `hourly_rate_cents`, `day_rate_cents`, `per_head_price_cents`, `occupancy_mode`, `currency`, host name, host verification status and the ordered photo array. **`listing.description` (schema:207) and `listing_amenity` (schema:310) are the whole gap.** Anyone planning D-277 as "build the detail view" is planning work that is 80% done; the file's own header says every needed field is selected *here, once*, rather than fetched per row — so amenities should join by LATERAL aggregate in the same pattern the photos already use, not by an N+1 per row.
- **C4 requires no migration.** `listing_review` was built as the trail precisely so "a resubmitted listing appends a new row rather than overwriting the decision that sent it back" (D-221). `decided_at IS NULL` already encodes "still awaiting a decision", which is the *waiting* rung of submitted → waiting → decided. The three-rung vocabulary the milestone asks for is already in the columns.
- **A5/A6 must read the cooldown from the shipped single read.** `verification-status.ts` returns `updatedAt` specifically because the submission action's guarded `UPDATE` carries `AND updated_at < now() - interval '…'` in its own `WHERE`. A displayed instant derived from a second query would disagree with the server's guard — the two-authorities defect. This is also why it is `updated_at` and never `created_at`: `created_at` re-stamps on resubmission (D-249) and a cooldown read off it would silently reset itself.
- **C5 survives D-276 — confirmed, not assumed.** The concern is real (removing the ops action that emits a notification would silence it), but `src/lib/verification/apply-verdict.ts:89-90,393` imports `notifyAccountOwner`, `hostApprovedPayload` and `hostRejectedPayload` and emits on the webhook path. Its header states every transition a Didit answer can cause "and every notification one triggers" happens there. **The regression to guard against is the opposite one: double-notifying** if any new host-side surface emits as well.
- **B7 is independent of B1/B2 and should be its own phase.** The subdomain rewrite, host-scoped cookie and invite flow share no code with the queue row, and they carry the D-275 re-measurement obligation. Coupling them makes the cloak measurement hostage to a rendering change.
- **AF3 conflicts with C3 in a way that must be resolved in the requirement text, not in review.** "User can resubmit a rejected listing" is satisfiable by a no-op button. The testable statement must be closer to: *a host with a rejected listing can reach the edit wizard from an explicit control that names the reason and states that a change is required before it re-enters review.*

---

## MVP Definition

### Launch With (v1.2)

- [ ] **A1, A2** — the unverified state renders as a state with a real control. *Cheap, and it is the PM's literal complaint.*
- [ ] **A3, A4, A7** — a five-step verification roadmap derived from the gates that actually block, with per-step state. *This is the milestone's first named target feature.*
- [ ] **A5** — named cause + retry rule on a failed check, read from the shipped cooldown value. *Clears the Airbnb bar.*
- [ ] **A6** — stale-pending affordance. *Restores, on the host side, the rescue D-276 removed on the ops side. Named cost becomes a named recovery.*
- [ ] **B1** — description + amenities join the queue read model; all selected facts render. *The one genuine data gap in area B.*
- [ ] **B2, B3** — expand in place behind a disclosure, decision widget intact, zero anchors preserved and re-asserted.
- [ ] **B7** — `ops.` subdomain, ops sign-in, staff invite/onboard, cloak re-measured with the new routes.
- [ ] **B9** — host standing renders as a fact rather than a blank cell. *Already selected; failing to render it is the bug.*
- [ ] **C3** — explicit fix-and-resubmit control, routing into the edit wizard.
- [ ] **C4** — host-facing review history: submitted → waiting → decided, with the reason, per cycle. *Read-only over an existing table.*
- [ ] **C6** — resubmission acknowledgement.
- [ ] **C7** — the seven material fields named to the host before they edit. *Discharges D-278's actual complaint at near-zero cost.*
- [ ] Plus the two milestone defects (`/host/listings` card alignment + footer spill; the post-create 404) and the two carried-forward close-outs, which are not feature research but are in scope.

### Add After Validation (v1.x)

- [ ] **B8 hotkeys / item-passing** — trigger: a reviewer handles enough items per session that keystrokes beat clicks.
- [ ] **C9 published review window** — trigger: real decision-latency data exists to publish honestly. Publishing a window FitOut has never measured is worse than publishing none.
- [ ] **B10 internal reason taxonomy** — trigger: enough rejections to see repeated causes, and only ever additive to the operator's sentence.
- [ ] **A8 richer pending copy** distinguishing waiting-on-us from waiting-on-you — trigger: support questions show the ambiguity is landing.

### Future Consideration (v2+)

- [ ] **Appeals (999.6)** — deliberately deferred. Revisit only if C3 + C4 + C7 ship and hosts still cannot resolve rejections, which would mean the reasons are bad rather than the loop is missing.
- [ ] **Verification expiry / periodic re-KYC (AF10)** — needs a sweep, an unbookability cliff policy, and interaction with in-flight bookings and payout freeze.
- [ ] **Queue prioritisation by severity/reach** — the moderation literature's standard, but it needs a risk signal FitOut does not have. Oldest-first is correct until then.
- [ ] **Reviewer quality/agreement measurement** — Pinterest built a framework for it; meaningless below a certain reviewer count.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| A1/A2 state + real control | HIGH | LOW | **P1** |
| A3/A4/A7 verification roadmap | HIGH | MEDIUM | **P1** |
| A5 named cause + retry rule | HIGH | LOW | **P1** |
| A6 stale-pending affordance | HIGH | LOW | **P1** |
| B1 description + amenities on the row | HIGH | LOW | **P1** |
| B2/B3 expand in place, decision intact | HIGH | MEDIUM | **P1** |
| B7 ops. subdomain + sign-in + invite | HIGH | HIGH | **P1** |
| B9 host standing renders | MEDIUM | LOW | **P1** |
| C3 explicit resubmit control | HIGH | LOW–MEDIUM | **P1** |
| C4 review status/history | HIGH | LOW | **P1** |
| C7 name the material fields | MEDIUM | LOW | **P1** |
| C6 resubmission acknowledgement | MEDIUM | LOW | **P1** |
| A8 waiting-on-whom copy | MEDIUM | LOW | P2 |
| B8 hotkeys / item-passing | MEDIUM | MEDIUM | P2 |
| C9 published review window | MEDIUM | LOW | P2 |
| B10 internal reason taxonomy | LOW (now) | MEDIUM | P3 |
| AF10 verification expiry | LOW | HIGH | P3 |

**Priority key** — P1: must have for v1.2 · P2: should have, add when possible · P3: future consideration

---

## Competitor Feature Analysis

| Feature | Airbnb | Peerspace | Etsy | App Store Connect | Turo | **FitOut's approach** |
|---------|--------|-----------|------|-------------------|------|----------------------|
| Verification states shown to host | pending / verified / **failed (often unexplained)** | n/a at listing level | n/a | n/a | n/a | Six-value enum, five host-visible; `grandfathered` deliberately silent |
| Named cause on a failed check | Causes documented publicly, message often vague | — | — | Specific guideline cited | **Refusal without a reason is reserved** | Named cause **and** the retry instant, both from one server read |
| Verification roadmap | Partial ("finish setting up") | Host Onboarding page | — | — | — | **Five explicit steps, derived from the gates that block** |
| Listing review statuses | — | Pending approval / Active / Paused / Deactivated / Paused-by / Deactivated-by | Active / Inactive / **Removed by Etsy** | Waiting for Review / In Review / Rejected | Opaque | pending / approved / rejected / grandfathered / withdrawn (shipped) |
| Queued vs being-looked-at distinguished | No | **No — one status means both** | No | **Yes** | No | Follow App Store: separate "waiting" from "decided" in the history rungs |
| Review history retained | No | No | No | **Yes — Status History, last 10 / 180 days** | No | **Yes — `listing_review` per cycle, already persisted** |
| Fix-and-resubmit path | — | **Yes — "Updates required", edit, resubmit** | **No — appeal only, 180 days, per listing** | **Yes — edit rejected items, resubmit** | — | **Yes, made explicit (D-278). Appeals stay out (999.6)** |
| Published review SLA | No | **Yes — ~1h, incl. resubmissions** | No | Ranges only | No | Defer to v1.x, publish a range once measured |
| Reason survives while fixing | — | In email | Often not specific | Yes | — | **Yes — never erased, per cycle** |
| Reviewer console evidence model | — | — | — | — | — | **Pinterest bundle-of-objects: listing + host + standing + photos, all on one terminal row** |

---

## Confidence Notes

| Claim class | Confidence | Basis |
|-------------|------------|-------|
| What FitOut already ships (every `file:line` above) | **HIGH** | Read directly from the working tree at `C:/Users/Admin/Roaming/FitOut` on 2026-09-03 |
| Peerspace / App Store Connect / Stripe Connect / Etsy behaviour | **MEDIUM** | Each vendor's own support or developer documentation, cross-checked against a second result |
| Pinterest Pinqueue3.0 console structure | **MEDIUM** | Pinterest Engineering's own write-up, reached via search summary (direct fetch returned 403), corroborated by their earlier PinQueue post |
| Airbnb verification failure behaviour | **MEDIUM** | Airbnb Help Center for the documented causes; community/legal-advice posts for the "message is vague" complaint — the latter is reported experience, not vendor-confirmed |
| Turo listing-refusal opacity | **LOW** | Terms of service plus third-party guides; Turo publishes no host-facing review-status documentation |
| Reviewer-complaint literature (missing context, tool switching) | **LOW–MEDIUM** | Industry blogs and general context-switching research; no study specific to marketplace listing reviewers was found |
| Resubmission-spam controls | **LOW** | Marketplace guides and seller-forum reports; no vendor publishes its velocity thresholds |

**Gaps that could not be closed:** no primary source documents what Turo or Airbnb show a *host* during an in-review listing state; no public source describes a marketplace's internal listing-review console at the field level (the Pinterest material is content moderation, adjacent but not identical); and no study quantifies the effect of expand-in-place versus a detail page on reviewer decision quality, so B2's benefit is argued from the tool-switching literature and D-277, not measured.

---

## Sources

- support.peerspace.com — "What is the status of my Peerspace listing?", "How long does it take for listings to go live?", "Why is my listing still pending?" — the closest analog; full status vocabulary and the resubmit loop — MEDIUM
- developer.apple.com/help/app-store-connect — "App and submission statuses" + status-history announcement — the reference implementation of seller-facing review status/history — MEDIUM
- docs.stripe.com/connect — hosted onboarding, API onboarding, account capabilities; `currently_due` / `eventually_due` / `past_due` and platform remediation tooling — MEDIUM
- help.etsy.com — "How Do I Submit an Appeal for a Listing Removed by Etsy?" + "How to Deactivate a Listing"; plus community.etsy.com and seller guides on unclear deactivation reasons — the appeal-only anti-pattern — MEDIUM
- airbnb.com/help/article/1237 + community.withairbnb.com + traverselegal.com — identity-verification statuses and the opaque-failure complaint — MEDIUM
- medium.com/pinterest-engineering — "Introducing Pinqueue3.0" and "Under the hood: PinQueue" — two-block review page, bundle-of-objects context, hotkeys, self-serve queue config — MEDIUM
- turo.com/us/en/policies/terms + third-party host guides — eligibility criteria published, refusal reasons not — LOW
- getstream.io/blog/marketplace-content-moderation + streamoid.com listing-rejection guide — velocity-signal abuse detection, endless-rejection-loop failure mode — LOW
- digital-strategy.ec.europa.eu + checkstep.com — DSA Art. 17 statement-of-reasons obligation, applicable to all online platforms since Feb 2024 — MEDIUM
- uxpatterns.dev, patternfly.org, uxmatters.com, lollypop.design — stepper/progress-tracker step counts and states; progressive-disclosure depth limits and the action-row pattern — LOW–MEDIUM
- **FitOut working tree, 2026-09-03 — HIGH:** `src/lib/ops/review-queue.ts` (queue read model and its full select list) · `src/lib/db/schema.ts:188,207,260,310,369,401,452,671,705` (both review enums, `listing_review` history table, `host_verification`, notification types) · `src/lib/listing/re-review.ts:116` (`MATERIAL_FIELDS`, `RE_REVIEW_SOURCE_STATES`) · `src/lib/listing/review-signal.ts:69,111,162,233` (`REVIEW_SIGNAL`, `SILENT_REVIEW_STATES`, `composeReviewSentence`, the stand-alone-copy rule) · `src/lib/host/verification-status.ts` (the single owner-scoped read and its `updatedAt` cooldown argument) · `src/lib/verification/apply-verdict.ts:89-90,393` (Didit-path notification emission) · `src/components/host/host-signals.tsx:228` (the paragraph this milestone replaces) · `src/components/ops/*` (queue row, decision actions, reject dialog, contact reveal) · `src/lib/site.ts:70` (`SUPPORT_EMAIL` null)

---
*Feature research for: two-sided marketplace verification, moderation console and seller review loop*
*Researched: 2026-09-03*
