# Phase 21: The Host Can See Where They Stand — Verification Roadmap & the Deliberate Resubmit - Context

**Gathered:** 2026-09-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the host's existing verification and listing-review facts legible and actionable. The host
dashboard gains a four-gate roadmap from account setup to the first bookable listing; host
verification failures name their cause and honest next action; stale pending checks gain the shipped
rescue path; rejected listings gain a deliberate route into the existing edit-and-re-review mechanism;
and each listing exposes a bounded, host-safe review-cycle history. This is presentation over existing
authorities: zero migrations, zero new dependencies, no new sell gate, and no new appeal or
resubmission mechanism.

</domain>

<decisions>
## Implementation Decisions

### Verification roadmap
- **D-01:** The complete roadmap lives on the main host dashboard (`/host`), where the host is already
  deciding what needs attention. `/host/verify` remains the focused identity-check destination rather
  than duplicating the whole journey.
- **D-02:** Render the four gates as four separate cards: a 2×2 grid where space permits and the same
  cards stacked at 320px. Sequence comes from explicit step numbers; each card owns its own state,
  explanation, and action. Do not add a connecting line or percentage.
- **D-03:** The four cards are ordered: identity check, payout onboarding, list a space, FitOut reviews
  that space. Completed, current, and remaining states must be visually distinct, but only the card
  with a real next action receives a button-shaped control. Waiting stays calm.
- **D-04:** The account-level journey is complete once the host has a first live/bookable listing. A
  rejected sibling listing remains visible and actionable on its own listing card; it does not turn
  account onboarding back into an unfinished journey.
- **D-05:** Once all four gates are complete, replace the expanded four-card roadmap with one compact
  “Ready to take bookings” summary. Do not leave four completed cards consuming dashboard space, and
  do not remove all confirmation of readiness.

### Fix and resubmit
- **D-06:** On a rejected listing card, replace the ordinary primary `Edit` action with the explicit
  `Fix and resubmit` action. Other listing states retain their normal edit affordance. The selected
  action routes into the existing edit wizard; it never submits an unchanged listing.
- **D-07:** Before navigation, the fix-and-resubmit action opens the existing dialog pattern and names
  which edits cause re-review. Its field list is rendered from the exported `MATERIAL_FIELDS` tuple,
  through host-readable labels, rather than maintained as a second list. The edit wizard also keeps a
  compact notice and the current rejection reason visible so a direct URL or refresh cannot bypass
  the explanation.
- **D-08:** Re-review still begins only when a material change is successfully saved through the
  shipped action. There is no standalone submit, appeal, dispute, or contest action, and a non-material
  save must not claim that the listing was re-queued. `src/lib/listing/re-review.ts` remains
  byte-unchanged.
- **D-09:** A successful material save from this journey receives an in-page acknowledgement that the
  changes were received and the listing is back in review. The listing's persistent `pending` review
  state is the durable confirmation after that receipt; a transient toast alone is insufficient.
  The acknowledgement must be tied to the server-confirmed transition, not merely to entering the
  wizard or carrying a query parameter.

### Review-cycle history
- **D-10:** Any listing with review cycles exposes a `Review history` control on its listing card. The
  control opens the existing accessible dialog pattern, keeping history close to the listing without
  creating a new page or expanding one grid card out of alignment. Render no dead control when there
  is no history.
- **D-11:** Inside the dialog, render stacked cycle records newest first. Each cycle shows the lifecycle
  as submitted → waiting → decided; an open cycle stops honestly at `Waiting`, while a decided cycle
  shows the decision and its absolute decision time. A rejected decision includes the operator's
  host-readable reason as text; approvals do not invent a reason.
- **D-12:** Show at most the five newest cycles per listing, with no infinite feed or pagination. If
  older cycles exist, say that the view shows the latest five rather than implying completeness.
- **D-13:** Review timestamps use absolute date and time in the product's established host-facing
  locale/time-zone format. Do not use relative-only ages. Never expose `decidedByStaffId`, a staff
  name, internal codes, or deleted listings.

### the agent's Discretion
- Exact supporting copy, icon choice, token usage, focus treatment, and dialog spacing, provided the
  states and action ownership above remain intact and the 320px contract holds.
- The precise server composition that supplies each roadmap card, provided every card reads its own
  shipped gate and the dashboard does not create a second authority or an N+1 query.
- The exact stale-pending control label and ordinary-pending threshold presentation, provided the
  implementation reuses the shipped resend/reconciliation and cooldown authorities, promises no ETA,
  and gives a stale host a real action.
- Loading, empty, and error-state details for the roadmap and history dialog, within existing host
  surface patterns.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase contract and inherited decisions
- `.planning/ROADMAP.md` § Phase 21 — goal, five success criteria, ordering before Phase 22, hard
  implementation constraints, and anti-features.
- `.planning/REQUIREMENTS.md` §§ HVER and LVER — HVER-09…HVER-14 and LVER-06…LVER-09, plus the
  explicit exclusions for appeals, progress percentages, ETAs, queue position, and staff identity.
- `.planning/PROJECT.md` §§ D-276 and D-278 — the host-side rescue must precede removal of the manual
  host queue; resubmission is deliberate editing, never appeal.
- `.planning/phases/18.1-close-phase-18-verification-submission-didit-listing-gate/18.1-CONTEXT.md` —
  shipped verification submission, cooldown, Didit reconciliation, and listing-gate decisions this
  phase must present rather than replace.
- `.planning/phases/19-host-listing-surfaces-gates-that-actually-run/19-CONTEXT.md` — current host
  listing-card layout, state signaling, edit routing, and 320px/equal-height surface contracts.
- `.planning/todos/pending/2026-09-01-host-verification-submission-path-and-listing-creation-gate.md`
  — historical source for the verification-entry gap and gate rationale; reference only, not folded
  into Phase 21.

### Validated interaction evidence
- `.planning/spikes/MANIFEST.md` § `host-verification-roadmap` — accumulated roadmap requirements and
  comparison verdicts.
- `.planning/spikes/005-b-separate-cards/README.md` — user-selected composition; 2×2 desktop,
  single-column phone, 392px default-state height.
- `.planning/spikes/006-roadmap-state-stress/README.md` — 8/8 state-stress result and the selected
  first-live mixed-portfolio policy.

### Shipped code authorities
- `src/app/(host)/host/page.tsx` and `src/components/host/host-signals.tsx` — dashboard integration,
  existing owner-scoped reads, signal ordering, and the `data-verification-owed` hook that survives.
- `src/lib/host/verification-status.ts`, `src/lib/host/verification-signal.ts`, and
  `src/lib/host/verification-cooldown.ts` — one verification read, total six-state copy map, rejection
  reason composition, `retryAllowedAt`, and the shared cooldown value.
- `src/components/host/verification-panel.tsx` and `src/app/(host)/host/verify/page.tsx` — existing
  button-shaped verification states, resend behavior, and absolute retry presentation.
- `src/app/(host)/host/listings/page.tsx` and `src/components/listing/listing-card.tsx` — the one
  listing-card call site, grouped review read, current review reason, edit route, dialog pattern, and
  aligned footer actions.
- `src/app/(host)/host/listings/[id]/edit/page.tsx`,
  `src/app/(host)/host/listings/[id]/edit/wizard.tsx`, and `src/app/actions/listing.ts` — edit-wizard
  destination and the material-save action that invokes re-review.
- `src/lib/listing/re-review.ts` — byte-frozen guarded transition, exported `MATERIAL_FIELDS`,
  append-only cycle insert, and server transition result.
- `src/lib/db/schema.ts` — `listing_review` state, reason, submitted/decided timestamps, staff id, and
  cascade relationship.
- `src/lib/bookability.ts` and `src/lib/listing/fitout-check.ts` — independent sell-gate and FitOut
  check authorities; neither may be re-derived in the roadmap.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `VerificationPanel`: already renders real bordered state, one button-shaped action, rejection reason,
  retry timing, and resend behavior for the focused identity-check page.
- `VERIFICATION_SIGNAL`: total copy map over all six stored states; extend this authority for any new
  per-step verification copy rather than authoring strings in components.
- `loadHostVerification`: returns `{ status, reason, suspended, updatedAt }` owner-scoped and is already
  called on the dashboard. Reuse that result for the identity card.
- `derivePayoutStatus`, the dashboard's listing count, and listing review/bookability fields: existing
  gate inputs that can feed the remaining roadmap cards without an invented checklist.
- `ListingCard` and its existing `Dialog`: the natural owner for both the deliberate entry warning and
  the bounded review-history viewer.
- `MATERIAL_FIELDS` and `markForReReview`: one shared material-field vocabulary and the already-guarded
  transition; presentation may consume their exported contract but must not alter the mechanism.

### Established Patterns
- Host signals state the state, reason, and one true way out. Waiting is calm; actionable failures get
  a control; silent/grandfathered states do not fabricate a decision.
- Grid data is loaded in grouped owner-scoped reads and collapsed to maps/sets before render. Do not put
  a query inside `rows.map`; reshape the existing review read to return bounded cycle data.
- Operator-authored reasons render as escaped text, never HTML. The reason is intentionally
  host-readable; staff identity is not.
- Server outcomes, not optimistic client intent, authorize acknowledgement copy.
- Existing dialogs and responsive card grids already satisfy the no-new-dependency path.

### Integration Points
- Compose the roadmap in `src/app/(host)/host/page.tsx`, using a dedicated server-safe view model and
  a presentational component adjacent to the current `HostSignals` block.
- Extend the existing `/host/listings` grouped `listing_review` read from latest rejected reason to the
  newest bounded cycles, still owner-scoped through non-deleted parent listings and still one grid-level
  query.
- Thread history and the rejected-state action into the sole `ListingCard` call site.
- Carry deliberate-resubmit context into the existing edit wizard for the persistent notice, but
  derive the acknowledgement from the real `saveListingStep`/re-review outcome.

</code_context>

<specifics>
## Specific Ideas

- The separate-card direction was chosen through a live three-variant spike, then stress-tested across
  rejected cooldown, retry-ready, stale pending, grandfathered, listing rejection, mixed portfolio,
  and ready states at desktop and 320px.
- “Done” on the account roadmap means the host has successfully reached one bookable listing. Ongoing
  maintenance belongs to each listing card; onboarding must not regress because a sibling listing
  later needs work.
- Completion should leave a quiet, compact readiness receipt rather than either a permanent four-card
  monument or total silence.

</specifics>

<deferred>
## Deferred Ideas

No new deferred ideas were introduced. Appeals remain in backlog 999.6 and are explicitly not a
variant of this phase's resubmit flow.

### Reviewed Todos (not folded)
- **Host verification submission path and listing-creation gate** — historical background only; its
  submission and gate work shipped in Phase 18.1, while this phase presents the resulting states.
- **Phase 18 PM decision follow-through** — its D-231 material-field decision is already shipped and
  remains a binding input; the todo's other payment/earnings work is outside Phase 21.
- **Ops staff management surface and invite flow** — belongs to completed Phase 20 and shares no
  machinery with this host-facing phase.
- **Reveal host contact details in ops queue** — ops-side work for the later operations surface, not
  part of the host roadmap or listing resubmit journey.

</deferred>

---

*Phase: 21-The Host Can See Where They Stand — Verification Roadmap & the Deliberate Resubmit*
*Context gathered: 2026-09-09*
