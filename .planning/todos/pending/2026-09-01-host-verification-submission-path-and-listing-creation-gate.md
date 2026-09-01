---
created: 2026-09-01T11:56:40.872Z
title: Host verification submission path and listing-creation gate
area: hosting
files:
  - src/app/actions/capability.ts:56-79
  - src/app/(host)/host/layout.tsx:44-54
  - src/lib/bookability.ts:109-131
  - src/lib/host/verification-status.ts
  - src/app/actions/ops-review.ts:396-406
  - src/lib/ops/review-queue.ts
  - drizzle/0026_host_verification_listing_review.sql:125
  - e2e/helpers/booker-seed.ts:600
---

## Problem

**Raised by the PM on 2026-09-01: "a registered booker can easily jump to hosting page, and can create
listing without issue, now we should limit that as we require prior KYC verification."**

The observation is correct. But investigating it surfaced a **larger, unreported gap underneath it**,
and that gap is the reason this todo is one item and not two.

### What ships today

The gate is on **selling**, not on entering hosting, and that part is deliberate:

- `activateHosting()` (`src/app/actions/capability.ts:56`) flips `canHost` with no verification check
  — only a session, a rate limit and an audit row.
- `src/app/(host)/host/layout.tsx:53` gates the host surface on `canHost` alone.
- The listing wizard (`/host/listings/new`) has **no verification gate at all**.
- `deriveBookable()` has six terms, and the phase-18 pair — listing `approved|grandfathered` AND host
  `approved|grandfathered` — means an unverified host's listing cannot be booked, does not appear in
  search, and renders no book button.

### ⚠ THE GAP: nothing in the product ever creates a `host_verification` row

Repo-wide, the **only** `INSERT INTO host_verification` is `e2e/helpers/booker-seed.ts:600` (a test
seed) and the `drizzle/0026` grandfather backfill (line 125), which covered only hosts who already had
a published listing at migration time.

`approveHost()` is an `UPDATE ... WHERE user_id = $1 AND status IN ('pending','unverified')`
(`src/app/actions/ops-review.ts:396-406`). With no row, it flips zero rows and returns `STALE`.

Consequences, all three of which are live in production right now:

1. The **"hosts awaiting verification" half of the ops queue can never fill** from real usage. Ops will
   only ever see listings.
2. A brand-new host is permanently `unverified` → permanently unsellable → **and has no way to ask to
   be checked.** There is no host-facing verification submission anywhere in the app.
3. The only hosts who can sell at all are the ones `drizzle/0026` grandfathered.

Phase 18 shipped the console that **decides**, but not the thing that **submits to it**. This reads as
a Phase-18 completion gap rather than a new feature, and it makes the PM's request mandatory rather
than optional: adding a gate without the submission path would block hosting outright.

Note also that `payoutsEnabled` is a **separate, independent** term of the same gate, and PayMongo
Linked Accounts is still sales-gated — so there are two distinct reasons a new host cannot sell today.
Fixing verification does not by itself make a new host sellable.

## Decisions (PM, 2026-09-01 — ANSWERED, do not re-ask; record as D-numbers at discuss time)

### PM-C — The gate sits at LISTING CREATION.

Chosen over gate-at-publish, gate-at-hosting-entry, and keep-sell-only.

- `canHost` still unlocks `/host` — the dashboard, payouts onboarding, and the verification
  submission itself. A booker may still "Start hosting" and see what hosting is.
- **The listing wizard refuses until the host is verified.** A host who is `unverified`, `pending`,
  `rejected` or `suspended` cannot create a listing.
- Rationale as the PM framed it: a host should see what hosting involves before committing to a
  check, but should not be able to build an entire listing that silently cannot sell.

Implementation notes carried from the investigation:

- The refusal must be **server-side in the action**, not only a hidden button. The wizard's save
  action (`saveListingStep`) and any listing-creating path are the boundary; a disabled link is a
  hint, not a gate.
- The refusal must be **legible**: a host told "you cannot create a listing" without being told why,
  or without a route to the check, is the copy-about-a-check-that-never-ran defect one level up.
  `src/components/host/hosting-paused-notice.tsx` is the shipped precedent for how a host is told.
- `loadHostVerification()` (`src/lib/host/verification-status.ts`) already exists and is already read
  by three host surfaces. This is a **fourth reader of the same helper**, not a new query — and note
  its own header: *no row means `unverified`, never verified, never suspended.*
- ⚠ Existing hosts with drafts: decide at discuss what happens to a listing already in draft when
  this lands. Suggested: existing drafts remain editable, only **creation** of a new listing is
  gated — otherwise the gate strands work hosts already did.

### PM-D — The submission path must be built. What it can ask for is constrained by the storage contract.

Not a fork — a consequence. The gate is meaningless without a way in.

⚠ **`host_verification` has no column that can hold a document, an ID number or an image, and must
never gain one.** This is HVER-02 / D-206 / D-220, and it is enforced structurally rather than by
convention: `tests/ops/verification-schema.test.ts` asserts the table's **exact** column set as an
allow-list against `information_schema.columns`, so a column named anything at all
(`attachment_url`, `selfie`, `poi_scan`) turns it red. FitOut is a **port** to a verification
provider, never a custodian of identity documents.

So with the **manual** provider that ships today, a submission can only use what already lives on
`user`: name, verified email, phone. That is thin — which is exactly why this todo escalates the
already-open KYC vendor decision (below).

Shape to build:

- A host-facing "request verification" action that creates the `host_verification` row at
  `status = 'pending'`, with `provider` set by the port and **never** by a client body.
- It must be **idempotent** and must not let a host re-submit their way to the front of the ops queue
  — `listing_review`'s D-249 no-line-jumping rule is the precedent to follow, and
  `host_verification_queue_idx` orders on `created_at ASC`.
- It must refuse to move a `suspended` or `rejected` host back to `pending` silently. Decide the
  re-submission-after-rejection policy at discuss; the host-readable `reason` column (D-243) already
  exists to tell them what was wrong.
- **SWE assumption, stated rather than asked:** phone becomes **required at the point of verification
  submission** — not at signup, not at host activation. It is currently optional, self-entered and
  unverified (`src/app/actions/profile.ts`), most hosts will have none, and a manual check needs a
  contact channel. Requiring it at submission is the lowest-friction place that actually works, and it
  pairs directly with the ops contact-reveal todo. Overrule at discuss if the PM disagrees.

### ⚠ ESCALATED — this raises the priority of an already-open PM decision

The **KYC vendor fork is still open on the PM's desk** (one of the four decisions blocking Phase 18's
close; see `.planning/phases/18-.../18-KYC-VENDOR-COMPARISON.md`, which recommends **stay-manual now,
Didit later, NOT PayMongo**). It was a "decide when convenient" item. It is now **on the critical
path**: the submission path's content depends on whether a human eyeballs thin profile data or a
vendor runs a real check. Build the port-shaped submission either way — swapping a vendor in is a
provider registration plus config, by construction (D-206) — but the PM should settle the vendor
before the host-facing copy is written, because the copy promises what the check actually is.

## Solution

TBD at plan time. Rough shape, in dependency order:

1. **Submission path first** (it is the unblocker): host action creating `host_verification` at
   `pending`, plus the `/host` surface that offers it and reports state. Verify the ops host queue
   actually fills — today it provably cannot.
2. **Then the creation gate**: server-side refusal in the listing-creation path keyed on
   `loadHostVerification()`, with the host-readable explanation and a route to the check.
3. **Then the copy**, once the vendor decision lands.
4. Do **not** touch `deriveBookable`'s six terms — the sell-gate is already correct and already fails
   closed. This work adds a way IN, not a new way to refuse. Note D-227: the sell-gate's re-statements
   in `booking.ts` are deliberately duplicated and must not be "consistently" refactored.

## Related

- Blocked-by (soft): the open KYC vendor decision — escalated above.
- Siblings: `2026-09-01-ops-staff-management-surface-and-invite-flow.md`,
  `2026-09-01-reveal-host-contact-details-in-ops-queue.md`.
