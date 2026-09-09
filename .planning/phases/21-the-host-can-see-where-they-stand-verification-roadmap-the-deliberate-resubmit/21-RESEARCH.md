# Phase 21: The Host Can See Where They Stand — Verification Roadmap & the Deliberate Resubmit - Research

**Researched:** 2026-09-09
**Domain:** Host-facing verification roadmap, listing re-review UX, bounded review history
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### Codex's Discretion

- Exact supporting copy, icon choice, token usage, focus treatment, and dialog spacing, provided the
  states and action ownership above remain intact and the 320px contract holds.
- The precise server composition that supplies each roadmap card, provided every card reads its own
  shipped gate and the dashboard does not create a second authority or an N+1 query.
- The exact stale-pending control label and ordinary-pending threshold presentation, provided the
  implementation reuses the shipped resend/reconciliation and cooldown authorities, promises no ETA,
  and gives a stale host a real action.
- Loading, empty, and error-state details for the roadmap and history dialog, within existing host
  surface patterns.

### Deferred Ideas (OUT OF SCOPE)

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
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HVER-09 | Unverified/rejected become bordered, headed visual states with button-shaped controls; pending remains calm; `data-verification-owed` survives. | Move the verification row out of `HostSignals` and into the new identity roadmap card; preserve the hook on that card and render controls only for unverified, retry-ready rejected, and stale pending. [VERIFIED: .planning/REQUIREMENTS.md:165-168] |
| HVER-10 | Ordered roadmap: identity, payouts, list a space, FitOut review. | The server snapshot and four-card composition below bind each card to an existing authority. [VERIFIED: .planning/REQUIREMENTS.md:169-172] |
| HVER-11 | Each step reads its own server gate; no checklist or second sell authority. | Reuse `loadHostVerification`, `derivePayoutStatus`, persisted listing/hours/review facts, and `deriveBookable`; only `deriveBookable` determines final readiness. [VERIFIED: .planning/REQUIREMENTS.md:173-175; src/lib/bookability.ts:99-131] |
| HVER-12 | Name not-started, waiting, passed, not-passed, and paused; keep grandfathered silent. | Extend the total verification copy authority and map every stored status explicitly, using generic capability copy for grandfathered. [VERIFIED: .planning/REQUIREMENTS.md:176-178; src/lib/host/verification-signal.ts:133-259] |
| HVER-13 | Rejection shows the cause and absolute retry instant from the guarded retry value. | Reuse `reason`, `updatedAt`, `COOLDOWN_HOURS`, `retryAllowedAt`, and the existing absolute formatter. [VERIFIED: .planning/REQUIREMENTS.md:179-181; src/lib/host/verification-signal.ts:367-412; src/lib/host/verification-cooldown.ts:81-87] |
| HVER-14 | Pending beyond a stated window gets a way forward. | Use `DIDIT_RECONCILE_GRACE_MINUTES` and the same `updated_at`/DB-now comparison, then route to the shipped “Finish the check” action. [VERIFIED: .planning/REQUIREMENTS.md:182-184; src/inngest/functions/didit-reconcile.ts:80-105,222-235; src/lib/host/verification-signal.ts:177-192] |
| LVER-06 | Rejected listing explicitly enters fix-and-resubmit through the edit wizard. | Replace only the rejected card's Edit control with a dialog-gated link to the existing `editHref`; add no submit action. [VERIFIED: .planning/REQUIREMENTS.md:224-227; src/components/listing/listing-card.tsx:471-478] |
| LVER-07 | Per-cycle review history is newest-first and bounded. | Reshape the existing grid-level rejection read into a window-ranked, owner-scoped history read capped at six rows per listing (five displayed plus one older-data sentinel). [VERIFIED: .planning/REQUIREMENTS.md:228-229; src/app/(host)/host/listings/page.tsx:126-152] [CITED: https://www.postgresql.org/docs/current/tutorial-window.html] |
| LVER-08 | Material changes are named before editing from the exported tuple. | Add a total host-label map keyed by `MaterialField`, and render it by mapping `MATERIAL_FIELDS`; never create a second field array. [VERIFIED: .planning/REQUIREMENTS.md:230-231; src/lib/listing/re-review.ts:112-126] |
| LVER-09 | The host receives a received/re-queued acknowledgement. | Propagate `ReReviewResult.flipped` through field and photo server-action results, and latch an in-page receipt only when a rejected-journey save returns true. [VERIFIED: .planning/REQUIREMENTS.md:232-233; src/lib/listing/re-review.ts:148-154,189-230] |
</phase_requirements>

## Summary

Phase 21 is an orchestration and presentation phase, not a data or gate phase. The database already has the complete identity state, current listing-review state, append-only review cycles, rejection reasons, and decision timestamps; the host dashboard and listing grid already perform the owner-scoped reads that must be reshaped. The implementation must add zero migrations, zero dependencies, zero query round trips, and zero submission mechanisms. [VERIFIED: .planning/phases/21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit/21-CONTEXT.md:7-15,165-173]

The dashboard should produce one server-side roadmap snapshot. Reshape the existing listing count query into a narrow non-deleted listing-gate projection, reuse the existing missing-hours, payout, and verification reads, and call `deriveBookable` for each projected listing. A single `some(deriveBookable)` result is the only readiness authority; when true it replaces the four cards with the compact receipt. The four cards may describe their own upstream facts, but they must never reconstruct “can sell” by AND-ing a second checklist. [VERIFIED: src/app/(host)/host/page.tsx:113-152; src/lib/bookability.ts:99-131]

The deliberate-resubmit path has one easily missed cross-cutting requirement: `markForReReview` is invoked from the ordinary listing field save and from photo add/remove, but all callers currently discard its `flipped` result. The planner must propagate that boolean across both pathways. A receipt based only on `saveListingStep`, route entry, a query token, or a successful toast would be false for photo edits and false for non-material saves. [VERIFIED: src/lib/listing/re-review.ts:148-154,189-230; src/app/actions/listing.ts:641-679; src/app/actions/listing-photo.ts:288-320,485-514; src/components/listing/photo-uploader.tsx:116-148,189-199]

**Primary recommendation:** Build one server-derived roadmap view model, reshape the two existing listing reads rather than adding queries, and carry the existing guarded `flipped` outcome all the way to a latched in-wizard receipt.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Roadmap gate reads and final readiness | Frontend Server (RSC) | Database / Storage | `/host/page.tsx` already owns the authenticated, owner-scoped reads; `deriveBookable` remains the sole final readiness function. [VERIFIED: src/app/(host)/host/page.tsx:98-162; src/lib/bookability.ts:99-131] |
| Roadmap visual cards and compact receipt | Frontend Server (RSC) | Browser / Client only for interactive controls | Static state belongs in a Server Component; only controls/dialog state need a client boundary. Next 16 says pages are Server Components by default and client props must be serializable. [VERIFIED: node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md:11-33,244-293] |
| Verification retry/resume | API / Backend (Server Action) | External Didit service | The existing action authenticates, validates, checks the stored session, and either resumes the same open session or calmly refuses a closed one. [VERIFIED: src/app/actions/host-verification.ts:312-447] |
| Review history selection | Database / Storage | Frontend Server (RSC) | PostgreSQL ranks rows per listing; the RSC converts the first five into serializable, host-safe display records. [CITED: https://www.postgresql.org/docs/current/tutorial-window.html] |
| Fix-and-resubmit explanation | Browser / Client | Frontend Server (RSC) | `ListingCard` already owns Dialog state, while the material labels and rejection reason are prepared from server-safe authorities. [VERIFIED: src/components/listing/listing-card.tsx:35-75,156-202,204-318] |
| Re-review transition | API / Backend (Server Action) | Database / Storage | Existing transactional callers invoke the byte-frozen guarded transition; the phase only exposes its result. [VERIFIED: src/lib/listing/re-review.ts:156-230] |
| Resubmission acknowledgement | Browser / Client | API / Backend (Server Action) | The browser renders and retains the receipt, but only the server-returned guarded transition may authorize it. [CITED: https://nextjs.org/docs/app/guides/data-security] |

## Project Constraints (from AGENTS.md)

- The installed Next.js is explicitly treated as breaking-change-prone; implementation must read the relevant guides in `node_modules/next/dist/docs/` and heed deprecations before editing code. [VERIFIED: AGENTS.md:1-5]
- For this phase, the relevant installed guides are Server/Client Components and Forms. They establish that database reads stay in Server Components, client-bound props are serializable, and every Server Action must independently authenticate and authorize. [VERIFIED: node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md:19-33,244-293; node_modules/next/dist/docs/01-app/02-guides/forms.md:7-16]

## Existing Authority Inventory

### Discrete state values

The host verification enum is exactly `"unverified"`, `"pending"`, `"approved"`, `"rejected"`, `"grandfathered"`, `"suspended"`. [VERIFIED: src/lib/db/schema.ts:369-376]

The listing review enum is exactly `"pending"`, `"approved"`, `"rejected"`, `"grandfathered"`, `"withdrawn"`. [VERIFIED: src/lib/db/schema.ts:188-194]

The payout display states are exactly `"not_started"`, `"incomplete"`, `"enabled"`, `"paused"`. [VERIFIED: src/components/host/payout-status.ts:7-20]

The material fields are exactly `"address"`, `"space_type"`, `"capacity"`, `"photos"`, `"price"`, `"title"`, `"description"`. [VERIFIED: src/lib/listing/re-review.ts:112-126]

The guarded re-review source states are exactly `"approved"`, `"grandfathered"`, `"rejected"`, and the returned transition shape exposes `flipped`, `trigger`, and `reviewId`. [VERIFIED: src/lib/listing/re-review.ts:128-154]

### Existing reads and writes

- `loadHostVerification` returns `status`, `reason`, `suspended`, and `updatedAt`, defaults an absent row to `"unverified"`, and scopes the single lookup to the caller-supplied host ID. [VERIFIED: src/lib/host/verification-status.ts:61-110]
- `/host` already reads one DB `now`, one non-deleted listing count, one payout row, one grouped missing-hours list, and one host-verification row. Replace the count projection; do not append a roadmap query. [VERIFIED: src/app/(host)/host/page.tsx:113-152]
- `/host/listings` already reads all owner-owned non-deleted listing rows, then one grouped latest-rejection query. Replace that grouped query with bounded cycle data; do not append a per-card or second history query. [VERIFIED: src/app/(host)/host/listings/page.tsx:89-152]
- `listing_review` stores `state`, host-readable `reason`, `decidedByStaffId`, non-null `submittedAt`, nullable `decidedAt`, and `createdAt`; its parent FK cascades. The client DTO must select the first, second, fourth, and fifth fields only, never the staff field. [VERIFIED: src/lib/db/schema.ts:452-491]
- `markForReReview` changes the current listing state and inserts a new open history row only when its guarded update actually moves a row; it intentionally leaves the previous reason untouched. [VERIFIED: src/lib/listing/re-review.ts:156-230]

## Standard Stack

### Core

| Library | Repo Version | Purpose | Why Standard Here |
|---------|--------------|---------|-------------------|
| Next.js | `16.2.7` | App Router RSC pages and Server Actions | Already installed and explicitly governed by local versioned docs. [VERIFIED: package.json:54; installed binary probe] |
| React | `19.2.7` | Client state for dialogs and persistent acknowledgement | Existing client components use React state; no additional state library is needed. [VERIFIED: package.json:59-61; src/components/listing/listing-card.tsx:35-37] |
| Drizzle ORM | `0.45.2` | Owner-scoped relational reads and transactional writes | Existing dashboard, grid, and re-review code all use Drizzle. [VERIFIED: package.json:50; src/app/(host)/host/page.tsx:56-79; src/lib/listing/re-review.ts:189-230] |
| PostgreSQL via `postgres` | `3.4.9` | Window-ranked review-cycle query and DB clock | Existing storage and raw SQL seam; `row_number()` solves bounded newest-N per listing without N+1. [VERIFIED: package.json:57] [CITED: https://www.postgresql.org/docs/current/tutorial-window.html] |
| Radix/shadcn Dialog primitives | `radix-ui` `1.4.3` | Fix warning and review-history dialogs | `ListingCard` already imports and uses the project's accessible Dialog composition. [VERIFIED: package.json:58; src/components/listing/listing-card.tsx:49-62,156-202] |

### Supporting

| Library | Repo Version | Purpose | When to Use |
|---------|--------------|---------|-------------|
| Vitest | `4.1.8` | Pure state, component, and DB integration tests | Per-task and per-wave behavior tests. [VERIFIED: package.json:94; installed binary probe] |
| Playwright | `1.60.0` | Full host journeys and 320px verification | Dashboard/listing/wizard acceptance at real routes. [VERIFIED: package.json:76; playwright.config.ts:110-170; installed binary probe] |
| Zod | `4.4.3` | Server Action input validation | Continue using it only where new client input is introduced; the preferred design adds no new action/input. [VERIFIED: package.json:70; src/app/actions/host-verification.ts:312-351] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing Dialog | New page or expandable card | Both contradict locked D-10 and can disturb equal card height. [VERIFIED: .planning/phases/21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit/21-CONTEXT.md:58-68] |
| Existing guarded transition | New “resubmit” action | A no-edit resubmit is an out-of-scope appeal and produces spam. [VERIFIED: .planning/ROADMAP.md:957-977] |
| Existing Next/React state | New state package | The feature needs only local dialog/receipt state; locked scope requires zero new dependencies. [VERIFIED: .planning/phases/21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit/21-CONTEXT.md:9-15] |

**Installation:** None. This phase must not install packages. [VERIFIED: .planning/phases/21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit/21-CONTEXT.md:9-15]

## Package Legitimacy Audit

Not applicable: the locked phase contract is zero new dependencies, and every recommended library is already declared in the repository. [VERIFIED: .planning/phases/21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit/21-CONTEXT.md:9-15; package.json:37-95]

## Architecture Patterns

### System Architecture Diagram

```text
GET /host + authenticated session
  |
  +--> one DB now -------------------------------------------------------+
  +--> existing host verification read --> identity card ---------------|
  +--> existing payout row -----------> derivePayoutStatus --> card -----|
  +--> reshaped listing-count read ---> listing/status/review candidates |
  +--> existing grouped missing-hours read ------------------------------|
  |                                                                      v
  +------------------------------------------------------------> roadmap view model
                                                                  |
                                                                  +-- some(deriveBookable) == true
                                                                  |     -> compact "Ready to take bookings"
                                                                  |
                                                                  +-- otherwise -> four numbered cards

GET /host/listings + authenticated session
  |
  +--> existing owner/non-deleted listing read
  +--> replacement for existing rejection read:
  |      parent-owner/deleted filter -> row_number per listing -> <= 6
  |      -> first 5 display records + sixth-row "older exists" sentinel
  |
  +--> ListingCard
         +-- rejected -> Fix and resubmit Dialog -> existing edit route
         +-- cycles   -> Review history Dialog

GET edit wizard (server derives rejected journey from persisted row/history)
  |
  +--> material field save --------+
  +--> photo add/remove ------------+--> existing markForReReview (byte unchanged)
                                         |
                                         +-- flipped=false -> no requeue claim
                                         +-- flipped=true  -> latched in-page receipt
                                                              + durable DB state = pending
```

This flow keeps data access and formatting on the server, passes only serializable display facts into interactive islands, and treats Server Actions as independently secured HTTP endpoints. [VERIFIED: node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md:19-33,244-293; node_modules/next/dist/docs/01-app/02-guides/forms.md:7-16]

### Recommended Project Structure

```text
src/
├── lib/host/verification-roadmap.ts                 # pure exhaustive roadmap derivation
├── components/host/verification-roadmap.tsx         # four cards or compact readiness receipt
├── lib/listing/review-history.ts                    # grouped owner-scoped bounded read + DTOs
├── app/(host)/host/page.tsx                         # compose existing reads, move owed hook
├── components/host/host-signals.tsx                 # retain non-verification signals only
├── app/(host)/host/listings/page.tsx                # replace current rejection read
├── components/listing/listing-card.tsx              # both dialogs and rejected CTA
├── app/(host)/host/listings/[id]/edit/page.tsx      # server-derived resubmit context/reason
├── app/(host)/host/listings/[id]/edit/wizard.tsx    # persistent notice + latched receipt
├── app/actions/listing.ts                            # propagate guarded result
├── app/actions/listing-photo.ts                      # propagate guarded result on add/remove
└── components/listing/photo-uploader.tsx             # relay photo transition to wizard
```

These are recommended ownership boundaries; `src/lib/listing/re-review.ts` is intentionally absent from the edit list because the locked decision requires it to remain byte-unchanged. [VERIFIED: .planning/phases/21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit/21-CONTEXT.md:48-56]

### Pattern 1: One server roadmap snapshot

**What:** Replace the dashboard count projection with a narrow listing projection containing the fields needed by `deriveBookable`; keep using the page's existing DB time, payout row, missing-hours read, and verification result. Compute the display model in a pure module. [VERIFIED: src/app/(host)/host/page.tsx:113-152; src/lib/bookability.ts:99-131]

**When to use:** Every `/host` render.

**Prescriptive mapping:**

| Card | Upstream authority | Mapping |
|------|--------------------|---------|
| 1. Identity check | `loadHostVerification` + total `VERIFICATION_SIGNAL` | `unverified` = not started/action; ordinary `pending` = waiting/no button; stale `pending` = waiting with existing “Finish the check” route; `approved` = passed; `rejected` = not passed, cooldown-aware; `suspended` = paused/no invented remedy; `grandfathered` = completed with generic capability copy that names no check. Exact source values quoted above. [VERIFIED: src/lib/host/verification-status.ts:61-110; src/lib/host/verification-signal.ts:137-259] |
| 2. Payout onboarding | `derivePayoutStatus` | `enabled` = passed; `not_started`/`incomplete` retain the existing setup destination; `paused` is visibly paused. Exact source values quoted above. [VERIFIED: src/components/host/payout-status.ts:7-20] |
| 3. List a space | Non-deleted listing projection + existing missing-hours set | Treat a listing as having completed this preparation step only when it is published and has operating hours; otherwise route to the existing listing/wizard/availability surface. This prevents a blank draft from making the journey look further along than it is. The final sell result still comes only from `deriveBookable`. [VERIFIED: src/lib/bookability.ts:99-131; src/app/(host)/host/page.tsx:144-147] |
| 4. FitOut reviews the space | Persisted `reviewState`, evaluated only for listings that qualify for step 3 | Approved/grandfathered capability = passed without claiming a grandfathered review; pending = waiting; rejected = not passed and routes to `/host/listings`, where the listing card owns the actual fix action. Exact source values quoted above. [VERIFIED: src/lib/db/schema.ts:188-194; src/lib/listing/review-signal.ts:111-171] |

The readiness receipt must be controlled only by whether any listing returns true from `deriveBookable`; this correctly incorporates email verification and payouts even though they are not reimplemented in the roadmap model. [VERIFIED: src/lib/bookability.ts:99-131]

The page already reads the DB clock once. Use that exact `now` to compare `verification.updatedAt` against the 30-minute stale threshold; do not call `Date.now()` in the view model or client. [VERIFIED: src/app/(host)/host/page.tsx:113-117; src/inngest/functions/didit-reconcile.ts:80-105,222-235]

### Pattern 2: Replace the old verification signal row

`HostSignals` currently renders verification as a muted paragraph with an underlined link and carries `data-verification-owed` on that paragraph. That exact presentation is what HVER-09 replaces. Remove only the verification row/prop from `HostSignals`, render the new roadmap adjacent to the remaining signals, and carry `data-verification-owed={verification.status}` on the new identity state. Do not leave both surfaces, because duplicate state/action copy would violate one-action ownership. [VERIFIED: src/components/host/host-signals.tsx:98-127,152-165,215-235; .planning/REQUIREMENTS.md:165-168]

### Pattern 3: Stale pending from the reconciliation authority

Use the exact shipped grace value `DIDIT_RECONCILE_GRACE_MINUTES = 30` and the same source timestamp `host_verification.updated_at`. The reconciliation query defines stale as `status = 'pending'`, a nonblank vendor reference, and `updated_at <= now() - 30 minutes`; it runs every 15 minutes with a batch limit of 8. [VERIFIED: src/inngest/functions/didit-reconcile.ts:80-134,188-235]

The dashboard does not know `vendorRef` and must not widen `loadHostVerification` to send it through the RSC payload. Staleness is presentation eligibility only: after 30 minutes, show a button-shaped link to `/host/verify` labelled from the existing pending copy (`"Finish the check"`). The focused page's existing Server Action performs the vendor-session pre-check and resume. This is a real way forward without creating a client poll, a new server action, or a promise about decision time. [VERIFIED: src/app/actions/host-verification.ts:389-447; src/lib/host/verification-signal.ts:155-192]

### Pattern 4: One bounded review-history read

Replace `rejectionRows` with a single owner-scoped query over all current host listing IDs. Rank cycles with `row_number() over (partition by listing_id order by submitted_at desc, id desc)` in an inner query, then filter `row_number <= 6` outside it. PostgreSQL requires a subselect when filtering on a window result; the sixth row is not rendered and exists only to set `hasOlder=true`. [VERIFIED: src/app/(host)/host/listings/page.tsx:126-152] [CITED: https://www.postgresql.org/docs/current/tutorial-window.html]

Select only `listingId`, `state`, `reason`, `submittedAt`, and `decidedAt`. Do not select a whole review row and do not pass `decidedByStaffId` to `ListingCard`; omission at the SQL projection is stronger than remembering not to render it. [VERIFIED: src/lib/db/schema.ts:476-489]

Format absolute timestamps in the RSC before passing the client dialog its DTOs. Reuse/export a shared host absolute-date formatter using the established exact locale/time-zone values `"en-PH"` and `"Asia/Manila"`; do not format from the browser clock. [VERIFIED: src/lib/host/verification-signal.ts:367-412]

Make the history state-label map total over the exact listing review enum quoted above. Never render raw enum tokens. In current write paths, an open row is the latest row with `decidedAt === null`; staff decisions close that same row with state `"approved"` or `"rejected"` and DB `now()`. [VERIFIED: src/app/actions/ops-review.ts:252-305]

### Pattern 5: Server-derived resubmit context, not URL authority

On the edit page, bind ownership and `deletedAt IS NULL` inside the listing query itself and reshape that same query to include the latest rejected reason. Derive the wizard's resubmit context from the persisted current `reviewState` and history, not from a query parameter. This makes direct navigation and refresh truthful while adding no query. [VERIFIED: src/app/(host)/host/listings/[id]/edit/page.tsx:23-60; src/lib/db/schema.ts:250-267,476-489]

For a currently rejected listing, show the compact reason/material-edit notice persistently. For a pending listing with an earlier rejected cycle, show the durable back-in-review state after refresh. A query parameter may never authorize either state or the receipt. [VERIFIED: .planning/phases/21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit/21-CONTEXT.md:43-56]

### Pattern 6: Propagate and latch the guarded transition

Capture `markForReReview(...).flipped` inside each existing transaction and add it to the successful serializable action result. Do this for:

1. material listing-field saves in `saveListingStep`;
2. `persistPhoto` after the photo insert; and
3. `removePhoto` after the delete/repack.

Do not add it to `reorderPhotos`, because reorder is deliberately non-material. [VERIFIED: src/lib/listing/re-review.ts:100-126,148-154; src/app/actions/listing.ts:641-679; src/app/actions/listing-photo.ts:288-320,382-450,485-514]

`PhotoUploader` needs a narrow callback that reports the server-confirmed transition to `ListingWizard`, parallel to its existing count callback. The wizard should latch the receipt once true so a subsequent no-op save does not erase it. If “Save as draft” would navigate immediately after the first true transition, keep the host on the page long enough to render the required receipt instead of relying on its existing navigation toast. [VERIFIED: src/components/listing/photo-uploader.tsx:116-148,189-199; tests/listing/wizard-save-state.test.tsx:494-544]

The receipt condition is the conjunction of server-derived rejected-journey context and the returned `flipped === true`. A route visit, dialog confirmation, action invocation, generic `{ ok: true }`, or `reviewState` predicted on the client is insufficient. [VERIFIED: src/lib/listing/re-review.ts:148-154,194-230] [CITED: https://nextjs.org/docs/app/guides/data-security]

### Anti-Patterns to Avoid

- **A second readiness boolean:** Never combine four card states to decide readiness. Call `deriveBookable`. [VERIFIED: src/lib/bookability.ts:99-131]
- **A new history query per card:** Replace the current grouped rejection read with one ranked read. [VERIFIED: src/app/(host)/host/listings/page.tsx:126-152]
- **A client countdown/poll:** The host gets an absolute guarded retry time and the existing resume/reconcile paths, not an ETA. [VERIFIED: src/lib/host/verification-signal.ts:371-412; src/inngest/functions/didit-reconcile.ts:80-105]
- **Query-token acknowledgement:** URL input is attacker-controlled and cannot prove a DB transition. [CITED: https://nextjs.org/docs/app/guides/data-security]
- **A second material-field array:** Use `MATERIAL_FIELDS.map(...)` with a total label record. [VERIFIED: src/lib/listing/re-review.ts:112-126]
- **Selecting `listing_review.*`:** It needlessly brings `decidedByStaffId` toward a client boundary. [VERIFIED: src/lib/db/schema.ts:476-489]
- **Editing the Dialog/Card primitives:** Extend the sole `ListingCard` call-site/component, preserving the existing primitive and footer alignment contract. [VERIFIED: src/components/listing/listing-card.tsx:49-62,441-520; .planning/phases/19-host-listing-surfaces-gates-that-actually-run/19-CONTEXT.md:57-99]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Can this host sell? | Four-step boolean/checklist | `deriveBookable` | It already encodes the six real gates and fail-closed enum handling. [VERIFIED: src/lib/bookability.ts:99-131] |
| Verification state copy | Strings in card JSX | Extend `VERIFICATION_SIGNAL`/its copy module | It is total over all six persisted states and compiler-checked. [VERIFIED: src/lib/host/verification-signal.ts:133-259] |
| Rejection retry clock | Client duration/countdown | `COOLDOWN_HOURS`, `retryAllowedAt`, existing absolute composer | The UI and guarded update already share one value/column. [VERIFIED: src/lib/host/verification-cooldown.ts:81-87; src/lib/host/verification-signal.ts:371-412] |
| Pending recovery | Poll endpoint or new verification action | Existing `/host/verify` resume action plus Didit reconciliation sweep | The action returns the same unfinished session; the sweep recovers missed webhooks. [VERIFIED: src/app/actions/host-verification.ts:389-447; src/inngest/functions/didit-reconcile.ts:222-360] |
| Top-N history per listing | N queries or all-history client slicing | PostgreSQL `row_number()` in one grouped query | It bounds rows per parent and exposes an older-data sentinel. [CITED: https://www.postgresql.org/docs/current/tutorial-window.html] |
| Dialog accessibility | Custom modal/focus trap | Existing Dialog primitives | Already used in `ListingCard`; no dependency or new interaction pattern. [VERIFIED: src/components/listing/listing-card.tsx:49-62,156-202] |
| Material edit semantics | Duplicate field list or new resubmit mutation | `MATERIAL_FIELDS` + existing `markForReReview` | The tuple and guarded transition already define the contract. [VERIFIED: src/lib/listing/re-review.ts:112-154,189-230] |
| Requeue acknowledgement | Toast/query flag/client guess | Returned `ReReviewResult.flipped` latched in-page | Only the guarded DB transition can prove requeue happened. [VERIFIED: src/lib/listing/re-review.ts:148-154,194-230] |

**Key insight:** Every hard part in this phase already has a server authority. The work is to preserve provenance while composing those authorities into host-readable state, not to create new mechanisms.

## Common Pitfalls

### Pitfall 1: Leaving the old muted verification row beside the roadmap

**What goes wrong:** Unverified/rejected hosts see two competing entry points, and HVER-09's underlined-word presentation remains in the DOM. [VERIFIED: src/components/host/host-signals.tsx:215-235; .planning/REQUIREMENTS.md:165-168]

**How to avoid:** Move the hook and state ownership to the roadmap identity card; retain only requests, payouts, and hours in `HostSignals`.

**Warning signs:** Two `/host/verify` links, duplicate state sentences, or `data-verification-owed` still under `HostSignals`.

### Pitfall 2: Using the 24-hour rejection cooldown as the stale-pending window

**What goes wrong:** Pending hosts wait a day even though the reconciliation authority considers them stale at 30 minutes. The 24-hour value governs rejected resubmission only. [VERIFIED: src/lib/host/verification-cooldown.ts:51-87; src/inngest/functions/didit-reconcile.ts:80-105]

**How to avoid:** Use 30 minutes for pending staleness and 24 hours only for rejected retry.

**Warning signs:** `COOLDOWN_HOURS` imported into pending-stale logic or a second numeric literal for either clock.

### Pitfall 3: Declaring ready from card completion

**What goes wrong:** An approved listing can still lack hours, email confirmation, payout activation, or host verification; four display cards are not a sell gate. [VERIFIED: src/lib/bookability.ts:99-131]

**How to avoid:** Readiness is exactly `listingRows.some(row => deriveBookable(...))`.

**Warning signs:** A new `isReady`, `canSell`, or longhand six-term predicate outside the existing authority.

### Pitfall 4: Mixing different listings into one apparently complete path

**What goes wrong:** A draft's review state can satisfy the review card while another listing supplies status/hours, even though no single listing is near bookable. [VERIFIED: src/lib/db/schema.ts:250-267]

**How to avoid:** Evaluate review progress only over listings that qualify for the preceding listing-preparation step; final readiness remains `deriveBookable` per listing.

**Warning signs:** Independent `some(...)` calls for listing existence and review approval over unrelated row sets.

### Pitfall 5: Fetching history without a parent-owner/deleted boundary

**What goes wrong:** A guessed listing ID can expose another host's reasons or a soft-deleted listing's history. [VERIFIED: src/app/(host)/host/listings/page.tsx:89-102; src/lib/db/schema.ts:476-489]

**How to avoid:** Filter through the already owner-scoped, non-deleted parent listing set in the SQL statement; pass no client-supplied owner/listing ID into a new read.

**Warning signs:** A history query whose only predicate is `listing_review.listing_id = input`.

### Pitfall 6: Selecting staff identity and trusting the component not to render it

**What goes wrong:** `decidedByStaffId` crosses the server/client boundary and becomes available in the RSC payload even if hidden visually. [VERIFIED: src/lib/db/schema.ts:479-489] Next documents that client props are serialized into the RSC payload. [VERIFIED: node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md:107-114,244-293]

**How to avoid:** Omit the field from the SQL projection and DTO type.

**Warning signs:** `.select()` with no projection on `listingReview`, object spreading DB rows, or staff-shaped fields in `ListingCard` props.

### Pitfall 7: Propagating acknowledgement only from field saves

**What goes wrong:** Photo add/remove genuinely requeues the listing but produces no in-page receipt. [VERIFIED: src/app/actions/listing-photo.ts:288-320,485-514]

**How to avoid:** Extend both photo success result shapes and relay the returned transition through `PhotoUploader`.

**Warning signs:** Wizard receipt tests pass for price/title but not photo add/remove.

### Pitfall 8: Treating any successful save as requeue

**What goes wrong:** Non-material changes and already-pending listings falsely claim they re-entered review. `markForReReview` correctly returns `flipped: false` for a 0-row move. [VERIFIED: src/lib/listing/re-review.ts:194-230]

**How to avoid:** Gate receipt on returned `flipped === true` plus persisted rejected-journey context.

**Warning signs:** Receipt condition checks only `res.ok`, current step, URL state, or dialog entry.

### Pitfall 9: Navigating before the required receipt can render

**What goes wrong:** “Save as draft” currently uses a toast because it navigates; the phase requires an in-page acknowledgement for the first successful resubmit. [VERIFIED: tests/listing/wizard-save-state.test.tsx:494-544; .planning/phases/21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit/21-CONTEXT.md:52-56]

**How to avoid:** On the first true requeue result, latch/render the receipt before any optional navigation; subsequent refreshes rely on persisted pending/history state.

**Warning signs:** The only assertion is `toast.success`, or the router call occurs unconditionally before receipt state.

### Pitfall 10: Revealing grandfathering as a check

**What goes wrong:** The UI fabricates a verdict for an account or listing no person checked. [VERIFIED: src/lib/host/verification-signal.ts:245-258; src/lib/listing/review-signal.ts:162-171]

**How to avoid:** Mark the capability complete using generic “ready/can list” copy and never render the words “checked”, “approved”, or “grandfathered” for that branch.

**Warning signs:** Raw enum labels, “verification passed,” or the standard approved copy on a grandfathered fixture.

### Pitfall 11: An unbounded or nondeterministic history

**What goes wrong:** Client slicing still transfers unlimited rows; ordering only by a possibly tied timestamp produces unstable “newest” rows. PostgreSQL specifies tied `row_number` ordering as unspecified without a tie-breaker. [CITED: https://www.postgresql.org/docs/current/tutorial-window.html]

**How to avoid:** Bound to six in SQL and order by `submittedAt DESC, id DESC`; display five.

**Warning signs:** `.slice(0, 5)` is the only cap or the window order has one column.

### Pitfall 12: Editing the byte-frozen mechanism

**What goes wrong:** A presentation phase changes queue timestamp semantics, previous-reason retention, or source-state guards. [VERIFIED: .planning/ROADMAP.md:957-962; src/lib/listing/re-review.ts:156-230]

**How to avoid:** Capture its return at callers only; source-byte assertion before and after implementation.

**Warning signs:** Any diff in `src/lib/listing/re-review.ts`.

## Code Examples

Verified patterns from current sources and official documentation:

### Server-side readiness without a second authority

```typescript
// Source authority: src/lib/bookability.ts:99-131
// The existing dashboard count query is reshaped to return these narrow fields.
const ready = listingRows.some((row) =>
  deriveBookable(
    {
      status: row.status,
      hasOperatingHours: !missingHours.has(row.id),
      reviewState: row.reviewState,
    },
    {
      emailVerified,
      payoutsEnabled: Boolean(payoutRow?.payoutsEnabled),
      verificationStatus: verification.status,
    },
  ),
);
```

The fields and function signature above are verbatim from the existing authority; no status literal is repeated. [VERIFIED: src/lib/bookability.ts:109-131]

### Bounded newest review cycles with an older-data sentinel

```sql
-- Source pattern: PostgreSQL window-functions documentation.
-- The six-row cap is five locked display rows plus one sentinel.
WITH ranked AS (
  SELECT
    r.listing_id,
    r.state,
    r.reason,
    r.submitted_at,
    r.decided_at,
    row_number() OVER (
      PARTITION BY r.listing_id
      ORDER BY r.submitted_at DESC, r.id DESC
    ) AS cycle_number
  FROM listing_review AS r
  JOIN listing AS l ON l.id = r.listing_id
  WHERE l.host_id = $1
    AND l.deleted_at IS NULL
)
SELECT listing_id, state, reason, submitted_at, decided_at, cycle_number
FROM ranked
WHERE cycle_number <= 6
ORDER BY listing_id, cycle_number;
```

The selected schema columns exist exactly as written in Drizzle's source, and `decided_by_staff_id` is deliberately absent. [VERIFIED: src/lib/db/schema.ts:452-491] PostgreSQL documents both the partitioned `row_number` pattern and the required outer subselect for filtering its result. [CITED: https://www.postgresql.org/docs/current/tutorial-window.html]

### Material labels from one tuple

```typescript
// Source values: src/lib/listing/re-review.ts:116-126
const MATERIAL_FIELD_LABELS: Record<MaterialField, string> = {
  address: "Address and map location",
  space_type: "Space type",
  capacity: "Capacity",
  photos: "Photos",
  price: "Pricing",
  title: "Title",
  description: "Description",
};

const hostReadableFields = MATERIAL_FIELDS.map((field) => MATERIAL_FIELD_LABELS[field]);
```

The keys are exactly the exported tuple values quoted in Existing Authority Inventory; the host-readable wording is within Codex's locked copy discretion. [VERIFIED: src/lib/listing/re-review.ts:112-126; .planning/phases/21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit/21-CONTEXT.md:73-82]

## State of the Art

| Old Approach | Current Phase Approach | Impact |
|--------------|------------------------|--------|
| Muted verification paragraph with underlined link | Bordered identity roadmap state with headed status and only a real action button | Directly satisfies HVER-09 while preserving the owed-state data hook. [VERIFIED: src/components/host/host-signals.tsx:215-235; .planning/REQUIREMENTS.md:165-168] |
| Listing count only on dashboard | Same query round trip returns narrow listing gate fields | Enables truthful first-bookable completion without a new query. [VERIFIED: src/app/(host)/host/page.tsx:119-123; .planning/ROADMAP.md:950-955] |
| Latest rejected reason only | Same grouped query becomes five newest cycles plus one sentinel | Adds bounded history and still supplies the current rejection reason. [VERIFIED: src/app/(host)/host/listings/page.tsx:126-152] |
| Ordinary Edit link for every state | Rejected state uses a pre-navigation Fix-and-resubmit dialog; other states keep Edit | Makes entry deliberate without creating a no-edit submit action. [VERIFIED: src/components/listing/listing-card.tsx:471-478; .planning/phases/21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit/21-CONTEXT.md:39-56] |
| Callers discard `ReReviewResult` | Callers propagate `flipped` to a latched receipt | Makes acknowledgement correspond to the committed transition across field and photo paths. [VERIFIED: src/lib/listing/re-review.ts:148-154; src/app/actions/listing-photo.ts:288-320,485-514] |

**Deprecated/outdated:**

- The spike's candidate “Check for an update” label should not ship: the existing action's honest public label is `"Finish the check"`, and it resumes an open session rather than promising an immediate verdict refresh. [VERIFIED: .planning/spikes/006-roadmap-state-stress/stress.js:25-30; src/lib/host/verification-signal.ts:177-192; src/app/actions/host-verification.ts:389-447]
- Client-side relative ages, progress percentages, queue positions, and countdowns are explicitly out of scope and contradict the locked phase contract. [VERIFIED: .planning/ROADMAP.md:965-985]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | None. Product choices are locked in CONTEXT.md; implementation recommendations are grounded in opened source files or official documentation. | — | — |

## Open Questions

No blocking product question remains. The planner may choose names for the new roadmap DTO and the added serializable action-result field, but those are implementation details under the locked server-composition discretion and must not change the `flipped` semantics. [VERIFIED: .planning/phases/21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit/21-CONTEXT.md:73-82; src/lib/listing/re-review.ts:148-154]

The project knowledge graph was absent, so no graph-derived relationships were injected; all integration seams in this document come from direct source reads. [VERIFIED: filesystem probe for .planning/graphs/graph.json]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Build/test/runtime | ✓ | `v24.13.0`, satisfying declared `>=24.2` | — [VERIFIED: package.json:5-7; local version probe] |
| npm | Script runner | ✓ via `npm.cmd` | `11.6.2` | Use `npm.cmd` in PowerShell because `npm.ps1` is the first command shim. [VERIFIED: local command probe] |
| Next.js | App Router build | ✓ | `16.2.7` | — [VERIFIED: package.json:54; installed binary probe] |
| Vitest | Unit/integration/component validation | ✓ | `4.1.8` | Direct `node node_modules/vitest/vitest.mjs` if npm shim resolution fails. [VERIFIED: package.json:94; installed binary probe] |
| Playwright | Route/320px acceptance | ✓ | `1.60.0` | Direct local CLI invocation if needed. [VERIFIED: package.json:76; installed binary probe] |
| PostgreSQL test DB | Integration validation | ✓ | project `fitout_test` available | Run `npm.cmd run db:test:setup` if the preflight later fails. [VERIFIED: successful focused test probe; vitest.config.ts:14-27] |

**Missing dependencies with no fallback:** None observed. [VERIFIED: local environment probes]

**Missing dependencies with fallback:** None. The PowerShell npm shim detail is operational, not a missing dependency. [VERIFIED: local command probe]

## Validation Architecture

Nyquist validation is enabled in `.planning/config.json`, so Wave 0 tests are required. [VERIFIED: .planning/config.json direct read during research session]

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `4.1.8` for unit/integration/component; Playwright `1.60.0` for route journeys. [VERIFIED: package.json:76,94; installed binary probes] |
| Config files | `vitest.config.ts`, `playwright.config.ts`. [VERIFIED: vitest.config.ts:28-74; playwright.config.ts:110-170] |
| Quick run command | `npm.cmd test -- <one changed test file>`; keep each task's selection narrow. [VERIFIED: package.json:32-34] |
| Focused phase suite | `npm.cmd test -- tests/host/verification-surface.test.ts tests/host/verification-panel.test.tsx tests/listing/material-edit.test.ts tests/listing/listing-card.test.tsx tests/listing/wizard-save-state.test.tsx` currently passes 88/88 in 45.19s. [VERIFIED: local test probe 2026-09-09] |
| Full unit suite | `npm.cmd test`. [VERIFIED: package.json:32] |
| Design suite | `npm.cmd run test:design`. [VERIFIED: package.json:33] |
| Functional E2E | `npm.cmd run test:e2e -- --project=chromium`. [VERIFIED: package.json:34; playwright.config.ts:149-170] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HVER-09 | Bordered headed state, button ownership, pending calm, hook survives | component | `npm.cmd test -- tests/host/verification-roadmap.test.tsx` | ❌ Wave 0 |
| HVER-10 | Exact order, numbering, 2×2/stack structure, readiness receipt | component + E2E | `npm.cmd test -- tests/host/verification-roadmap.test.tsx` | ❌ Wave 0 |
| HVER-11 | Per-authority composition and final `deriveBookable` use | unit/structural | `npm.cmd test -- tests/host/verification-roadmap-state.test.ts` | ❌ Wave 0 |
| HVER-12 | Exhaustive six-state mapping and grandfathered silence | unit/component | `npm.cmd test -- tests/host/verification-roadmap-state.test.ts` | ❌ Wave 0 |
| HVER-13 | Stored cause and shared absolute cooldown instant | unit/component | `npm.cmd test -- tests/host/verification-roadmap.test.tsx tests/host/verification-surface.test.ts` | partial; extend existing tests |
| HVER-14 | 30-minute DB-clock stale boundary and real finish route | unit/component | `npm.cmd test -- tests/host/verification-roadmap-state.test.ts` | ❌ Wave 0 |
| LVER-06 | Rejected-only dialog-gated Fix and resubmit | component + E2E | `npm.cmd test -- tests/listing/listing-card.test.tsx` | ✅ extend |
| LVER-07 | Owner/deleted scope, newest order, five cap + sentinel, dialog lifecycle | integration/component | `npm.cmd test -- tests/listing/review-history.test.ts tests/listing/listing-card.test.tsx` | ❌ Wave 0 / ✅ extend |
| LVER-08 | Labels derive from exact tuple and render before navigation | structural/component | `npm.cmd test -- tests/listing/material-edit.test.ts tests/listing/listing-card.test.tsx` | ✅ extend |
| LVER-09 | Only server-confirmed field/photo transition creates latched receipt | integration/component | `npm.cmd test -- tests/listing/material-edit.test.ts tests/listing/wizard-save-state.test.tsx` | ✅ extend |

### Sampling Rate

- **Per task commit:** Run the one changed test file; for shared action shapes also run `tests/listing/material-edit.test.ts`.
- **Per wave merge:** Run the focused phase suite plus `npm.cmd run test:design`.
- **Phase gate:** Full Vitest, design suite, targeted host dashboard/listing-grid/wizard Playwright specs, TypeScript, and build must be green before `/gsd-verify-work`. [VERIFIED: package.json:8-35]

### Wave 0 Gaps

- [ ] `tests/host/verification-roadmap-state.test.ts` — exhaustive source-state/portfolio truth table, including first-bookable mixed portfolio and exact 30-minute boundary.
- [ ] `tests/host/verification-roadmap.test.tsx` — semantic cards/receipt, action counts, owed hook, grandfathered silence, and no percentage/line.
- [ ] `tests/listing/review-history.test.ts` — owner scope, deleted-parent exclusion, deterministic newest-first, maximum five, and older-data sentinel.
- [ ] Extend `tests/listing/listing-card.test.tsx` — rejected-only dialog, material list, history dialog, reasons as text, and zero staff identity.
- [ ] Extend `tests/listing/material-edit.test.ts` — field/photo action results expose true only when the guarded transition moves.
- [ ] Extend `tests/listing/wizard-save-state.test.tsx` — latched in-page receipt, non-material false, photo callback, no URL-authorized receipt, and save-as-draft navigation behavior.
- [ ] Extend `e2e/host-dashboard.spec.ts` — four-card/receipt routes and 320px no-overflow.
- [ ] Extend `e2e/host-listing-grid.spec.ts` — fix dialog, review history, and full resubmit receipt journey.
- [ ] Add a byte-identity guard or explicit diff check for `src/lib/listing/re-review.ts`.

## Security Domain

Security enforcement is enabled at ASVS Level 1; critical/high threats and primary-boundary medium threats require mitigation. [VERIFIED: .planning/config.json direct read; C:/Users/Admin/.codex/gsd-core/references/security-asvs-levels.md direct read]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Keep page session/capability checks and re-authenticate inside every Server Action. Next 16 explicitly says action endpoints remain publicly callable. [VERIFIED: src/app/(host)/host/page.tsx:98-111; node_modules/next/dist/docs/01-app/02-guides/forms.md:7-16] |
| V3 Session Management | yes, unchanged | Continue the existing Better Auth session from request headers; add no client-held verification authority. [VERIFIED: src/app/(host)/host/page.tsx:98-111; src/app/actions/host-verification.ts:327-336] |
| V4 Access Control | yes, primary boundary | Bind `session.user.id` and `deletedAt IS NULL` in dashboard, grid, edit, and history statements; do not trust a listing/owner ID from client props. [VERIFIED: src/app/(host)/host/listings/page.tsx:67-93; src/app/(host)/host/listings/[id]/edit/page.tsx:23-51] |
| V5 Input Validation | yes | Prefer no new URL/action input. If a token is introduced for presentation, allow-list it and never let it authorize notice/receipt/state. [CITED: https://nextjs.org/docs/app/guides/data-security] |
| V6 Cryptography | no new work | Reuse existing session and Server Action protections; do not introduce custom tokens or signing. [CITED: https://nextjs.org/docs/app/guides/data-security] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR on listing history/edit | Information Disclosure / Elevation of Privilege | Owner ID and non-deleted parent constraints inside SQL; not an after-query client filter. [VERIFIED: src/app/(host)/host/listings/page.tsx:67-93] |
| Staff identity leakage in RSC props | Information Disclosure | Narrow projection/DTO excludes `decidedByStaffId`; test serialized/client props. [VERIFIED: src/lib/db/schema.ts:479-489; node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md:107-114] |
| Forged “requeued” URL/client state | Spoofing | Receipt requires returned guarded `flipped`; ignore URL for authority. [VERIFIED: src/lib/listing/re-review.ts:148-154,194-230] |
| Operator reason rendered as markup | Tampering / XSS | Keep reason as React text; never `dangerouslySetInnerHTML`. [VERIFIED: src/components/listing/listing-card.tsx:247-263,412-437] |
| Unbounded history/N+1 | Denial of Service | One ranked grouped query, six rows maximum per current listing, no query inside render loop. [CITED: https://www.postgresql.org/docs/current/tutorial-window.html] |
| Client calls Server Action directly | Elevation of Privilege | Treat actions as public HTTP endpoints; keep authentication, authorization, validation in each action. [VERIFIED: node_modules/next/dist/docs/01-app/02-guides/forms.md:7-16] [CITED: https://nextjs.org/docs/app/guides/data-security] |
| PII/session-handle sent to browser | Information Disclosure | Do not widen `loadHostVerification` with `vendorRef`; expose only status/reason/timestamps already approved for host display. [VERIFIED: src/app/actions/host-verification.ts:405-413; src/lib/host/verification-status.ts:61-110] |

## Sources

### Primary (HIGH confidence)

- Repository source-of-truth files opened directly: `src/lib/bookability.ts`, `src/lib/host/verification-status.ts`, `src/lib/host/verification-signal.ts`, `src/lib/host/verification-cooldown.ts`, `src/inngest/functions/didit-reconcile.ts`, `src/lib/listing/re-review.ts`, `src/lib/db/schema.ts`, dashboard/grid/edit/wizard actions and components. [VERIFIED: direct source reads cited inline]
- Phase contract: `21-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, and validated spike 006. [VERIFIED: direct artifact reads cited inline]
- Installed Next.js 16.2.7 local documentation: Server/Client Components and Forms. [VERIFIED: node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md; node_modules/next/dist/docs/01-app/02-guides/forms.md]

### Secondary (MEDIUM confidence)

- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) — server/client boundary and serializable props.
- [Next.js Forms with Server Actions](https://nextjs.org/docs/app/guides/forms) — action return/pending patterns and per-action authentication warning.
- [Next.js Data Security](https://nextjs.org/docs/app/guides/data-security) — actions as public endpoints, validation, authorization, and client-bound data minimization.
- [PostgreSQL Window Functions](https://www.postgresql.org/docs/current/tutorial-window.html) — partitioned `row_number`, tie behavior, and outer-query filtering.

### Tertiary (LOW confidence)

- None.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — existing installed packages and exact local versions; no package selection.
- Architecture: HIGH — all proposed seams are modifications of opened dashboard/grid/action code and honor locked zero-query/zero-mechanism constraints.
- Pitfalls: HIGH — each is tied to a present code path, exact locked decision, or official Next/PostgreSQL behavior.
- External documentation: MEDIUM — official sources fetched through the research-plan fallback and cross-checked against installed local Next docs.

**Research date:** 2026-09-09
**Valid until:** 2026-10-09 for repository architecture; re-check installed Next docs if the lockfile changes.
