# Roadmap: FitOut

## Overview

FitOut delivers a two-sided fitness-space marketplace where the core transaction — search for a space, see real availability, reserve a slot, pay, and have the host paid out minus commission — is both the value proposition and the hardest engineering problem. The roadmap follows a strict dependency-driven order that all research independently converged on: identity must exist before supply, supply before availability, and the database-enforced double-booking guarantee must be proven correct **before** any money touches the system. The single-booker paid transaction is built end-to-end and made solid first; the group-booking differentiator is layered on last because it reuses the entire booking, payment, and cancellation infrastructure underneath. Payments are split into two phases — focused payments infrastructure first, then wiring it into the full instant-book / request-to-book lifecycle fork — to keep the deepest complexity areas isolated and verifiable.

## Milestones

- ✅ **v1.0 MVP** — Phases 1–9 (shipped 2026-08-11)
- 📋 **v1.1 (not yet defined)** — run `/gsd-new-milestone`

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)
- 999.x: Backlog — unsequenced, outside the active phase sequence

<details>
<summary>✅ v1.0 MVP (Phases 1–9, 107 plans) — SHIPPED 2026-08-11</summary>

- [x] **Phase 1: Auth & Accounts** (4/4 plans) — verified 2026-06-03 — single account with booker + host capabilities, sessions, password reset, basic profile
- [x] **Phase 2: Listings & Host Onboarding** (6/6 plans) — completed 2026-07-10, verified 2026-08-01 (retroactively — the milestone audit's one blocking finding) — hosts create/edit listings with photos, pricing, booking mode; PayMongo onboarding gates bookability
- [x] **Phase 3: Availability & the Double-Booking Guarantee** (5/5 plans) — completed 2026-07-14 — availability rules, real-time calendar, and the DB exclusion constraint that makes overlaps structurally impossible
- [x] **Phase 4: Booking Core & Search (no payment)** (8/8 plans) — completed 2026-07-15 — two-phase slot hold + state machine + expiry worker, plus geo/activity/date/price search
- [x] **Phase 5: Payments & Payouts** (7/7 plans) — verified 2026-07-16 — PayMongo hosted-checkout charge, host-side commission, hold-until-session delayed payout, webhook-as-source-of-truth, refund mechanism
- [x] **Phase 6: Full Booking + Payment Integration** (10/10 plans) — completed 2026-07-20 — instant-book capture vs request-to-book pay-on-approval, host approve/decline, confirmation
- [x] **Phase 7: Bookings Management, Cancellation & Notifications** (20/20 plans) — completed 2026-07-24 — My Bookings both sides, cancellation/refund policy tiers, transactional email layer
- [x] **Phase 8: Group Bookings** (22/22 plans) — completed 2026-07-29 — organizer wraps a paid booking, invites via link/email, attendees RSVP, headcount validated against capacity
- [x] **Phase 9: Open-Capacity Bookings** (25/25 plans) — completed 2026-08-01 — host-set open/common-use mode: many independent bookers share one slot up to a capacity cap, each paying per head on the existing rail

**Full phase details** (goals, success criteria, plan lists, waves, cross-cutting constraints):
`.planning/milestones/v1.0-ROADMAP.md`
**Requirements** (49/49): `.planning/milestones/v1.0-REQUIREMENTS.md`
**Audit:** `.planning/milestones/v1.0-MILESTONE-AUDIT.md`

</details>

### 📋 v1.1 — not yet defined

No phases sequenced. Start with `/gsd-new-milestone` (questioning → research → requirements → roadmap).

Two deferred v1.0 threads are candidates rather than commitments — both are blocked on PayMongo
enabling sales-gated betas on this account, not on engineering:

- Real host payouts have never moved real money (`/v2` money movement).
- PayMongo hosted Linked-Accounts KYC (PAY-04) has never been walked.

One v1.0 item is closable today by a human with no new code: hand-pay one test-mode checkout on
**GCash** and one on **Maya** to finish Phase 5 human-UAT item 1 (card and QR Ph are already proven).

## Progress

**Execution Order:**
v1.0 phases executed in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Auth & Accounts | v1.0 | 4/4 | Complete (verified · all 6 human items cleared) | 2026-06-03 |
| 2. Listings & Host Onboarding | v1.0 | 6/6 | Complete (verified · human_needed: PAY-04 hosted KYC is sales-gated) | 2026-07-10 |
| 3. Availability & Double-Booking Guarantee | v1.0 | 5/5 | Complete (verified 12/12) | 2026-07-14 |
| 4. Booking Core & Search | v1.0 | 8/8 | Complete (verified 8/8) | 2026-07-15 |
| 5. Payments & Payouts | v1.0 | 7/7 | Complete (verified 5/5 · human_needed: `/v2` payouts sales-gated; GCash + Maya rails unwalked) | 2026-07-16 |
| 6. Full Booking + Payment Integration | v1.0 | 10/10 | Complete (verified 4/4 · live re-UAT passed 2026-07-20) | 2026-07-20 |
| 7. Bookings Management, Cancellation & Notifications | v1.0 | 20/20 | Complete (verified 4/4 · human UAT passed) | 2026-07-24 |
| 8. Group Bookings | v1.0 | 22/22 | Complete (verified 5/5) | 2026-07-29 |
| 9. Open-Capacity Bookings | v1.0 | 25/25 | Complete (verified 12/12 · all 14 code-review findings closed) | 2026-08-01 |

## Backlog

Unsequenced ideas parked outside the active phase sequence (999.x). Promote with `/gsd:review-backlog`.

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

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.2: Image crop/framing UI — profile picture and listing photos (BACKLOG)

**Goal:** [Captured for future planning — UI-SPEC to be produced by /gsd:ui-phase before any code]
**Requirements:** TBD (touches AUTH-05's "optional photo" and LIST-02; NEITHER requirement is unmet —
both are SATISFIED and the round-trips are proven. This is the framing experience on top of them.)
**Plans:** 0 plans

**Captured:** 2026-08-10, raised by the operator immediately after the first real avatar upload
succeeded. Their words: *"it just inserted the photo without confirming or adjusting the zoom and
whatever. That's the standard."*

**The gap, measured — it is TWO surfaces, and they are asymmetric.**

*Avatar (`/profile`).* `profile-form.tsx:108` is a bare `<input type="file" accept="image/*">` that
uploads on change. There is no hold, no preview, no confirm. The server then applies a **blind**
transform, `src/lib/cloudinary.ts:29`:

```
transformation: { width: 400, height: 400, crop: "fill", gravity: "face" }
```

`gravity: "face"` on a source with no face falls back to an arbitrary region — which is exactly what
the operator got, and why the complaint is about framing rather than upload. **No cropper library is
installed** (`package.json` has nothing matching crop/cropper/image-edit), so this needs a real
component.

*Listing photos (wizard).* `photo-uploader.tsx:156-161` passes `CldUploadWidget` only
`{ folder, multiple, maxFiles, sources }` — **no `cropping` key**, so the same complaint applies.

> ⚠️ **CORRECTION (2026-08-10, measured during `/gsd:ui-phase`).** This entry originally claimed the
> listing side was "nearly free: Cloudinary's own widget supports `cropping`". **That was wrong on three
> counts**, and the correction is what shaped the spec:
> 1. Cloudinary supports `cropping` **only with `multiple: false`** — enabling it would break batch
>    upload of up to 20 photos.
> 2. It **does not crop the asset**. It writes `customCoordinates`; delivery must then request
>    `gravity: custom`. All three delivery sites — `photo-gallery.tsx:43,56`, `listing-card.tsx:228`,
>    `search-result-card.tsx:172` — render the raw `secure_url` through a plain `<img>`, so the flag
>    would change nothing visible.
> 3. It would **400 at our own sign endpoint**: `api/cloudinary/sign/route.ts:35` has an
>    `ALLOWED_SIGN_KEYS` allow-list of `{folder, source, timestamp}`.
>
> **And there is no single cover aspect ratio to crop TO.** The cover renders **16:9** on the listing
> hero (`photo-gallery.tsx:40`) and **4:3** on both the search card and the host card. Any destructive
> cover crop bakes in the wrong framing for one of them. The avatar is the opposite case — one circle,
> one stored 400×400 — which is precisely why a destructive crop is correct there and wrong here.

**Decided 2026-08-10** (operator, during the UI-SPEC pass): the avatar gets a real cropper; listing
photos get a **non-destructive cover-frame preview** on the wizard tile showing what the 16:9 hero and
the 4:3 card each cut off — nothing baked in, no delivery-code change. Avatar **removal** is in scope
(there is currently no way to unset one). The original is **discarded** — only the 400×400 result is
stored, `overwrite: true`, so re-framing means re-uploading and no schema column is added.

**Why this is a UI-SPEC job and not a quick task.** The hard part is the contract, not the code:
frame size and mask shape, zoom range and what the bounds are, behaviour on a non-square or
very-small source, mobile drag ergonomics, what a cancel leaves behind, and — the consistency
question — whether the avatar's bespoke cropper and Cloudinary's widget UI should look like one
product or are allowed to differ. Decide those before installing anything.

**One thing the spec must settle:** once the user chooses their own framing, the server's
`gravity: "face"` re-crop becomes actively wrong — it would re-frame what the user just framed. The
spec should say what replaces it (a straight crop of the chosen region, or nothing).

**Not blocking v1.0.** AUTH-05 calls the photo optional; LIST-02 is satisfied and proven. Both
round-trips work against real Cloudinary as of 2026-08-10.

Plans:
- [ ] TBD (run /gsd:ui-phase 999.2 to produce the UI-SPEC, then promote with /gsd:review-backlog)
