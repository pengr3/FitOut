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
- 📋 **v1.2** — not yet defined. Start with `/gsd-new-milestone`.

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

### 📋 v1.2 — not yet defined

No phases planned. Run `/gsd-new-milestone` to start the questioning → research → requirements →
roadmap cycle.

**Two requirements carry forward unsatisfied from v1.1**, both closed by one monitored support
address at `src/lib/site.ts:70`: `STATE-05` and `TRUST-01`.

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
