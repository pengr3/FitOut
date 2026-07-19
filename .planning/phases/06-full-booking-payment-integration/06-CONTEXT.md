# Phase 6: Full Booking + Payment Integration - Context

**Gathered:** 2026-07-17 (paused mid-debate) → 2026-07-19 (resolved)
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 forks the single instant-capture flow from Phase 5 into the **two booking modes** the marketplace promised, driven by each listing's `bookingMode`:

- **Instant-book** — the Phase-5 flow, essentially done: booker pays immediately → `checkout_session.payment.paid` webhook confirms → slot locked.
- **Request-to-book** — a **pay-on-approval** flow: the booker requests a slot (which is **held, but no money moves**), the host approves or declines within an SLA, and **only on approval does the booker pay** via the same Phase-5 checkout. Decline, expiry, or non-payment frees the slot with nothing ever reversed.

Covers **BOOK-04, BOOK-05, BOOK-06, PAY-05, HOST-01**.

**In scope:**
- The `bookingMode` fork on the reserve/checkout path (instant vs request-to-book) — BOOK-04, BOOK-05.
- Host-selectable booking mode per listing, **editable while hosting** (not frozen at creation).
- Request-to-book **pay-on-approval** money handling — request holds the slot with no charge; approve → pay → confirm; decline/expiry/non-payment → free slot — PAY-05.
- Host requests inbox: a `/host/requests` page to approve/decline pending requests within the SLA — HOST-01.
- Approval SLA (auto-decline) + post-approval payment window (auto-release), both config-tunable.
- On-screen booking confirmation + the booking/request **lifecycle transactional emails** (thin send over the existing `src/lib/email.ts`) — BOOK-06.

**Out of scope (belongs to other phases):**
- Cancellation/refund **policy matrix** + booker-facing cancel flow — **Phase 7** (BOOK-07, PAY-06).
- Bookings-management list views (My Bookings, both sides) — **Phase 7** (MANAGE / HOST-02).
- The **hardened** transactional-email layer — retry/observability/queue (**WR-04**), reminders, and non-booking notifications — **Phase 7**.
- Card manual-capture (authorize/hold) as a money model — **not built** (see D-63): PayMongo's hold is a sales-gated card-only feature not enabled for FitOut, and it doesn't exist on the e-wallets/QRPh anyway.
- Group bookings / RSVP — **Phase 8**.

> ⚠️ **The ROADMAP Phase 6 success-criteria text (#2/#3) is being corrected as part of this phase.** It specifies "payment authorized, not captured → captured on approval." That authorize→capture mechanism is **infeasible on our rails** (QRPh/e-wallets are capture-only; card manual-capture is sales-gated and not enabled). Per **D-63**, request-to-book uses **pay-on-approval** instead. REQUIREMENTS **PAY-05** is reworded to match. This is a **mechanism correction, not a scope change** — BOOK-05/PAY-05/HOST-01 all stay in Phase 6.

</domain>

<decisions>
## Implementation Decisions

### Both modes ship; host chooses per listing (BOOK-04, BOOK-05)
- **D-61:** **Both instant-book and request-to-book ship in v1.** The mode is **host-selectable per listing and editable while hosting** (from the listing editor), not frozen at creation. Reaffirms the PROJECT.md Key Decision ("host's choice: instant-book or request-to-book per listing") and makes the already-shipped LIST-04 toggle + `bookingMode` column load-bearing. **Rule:** a mode change governs **new** bookings only — any in-flight request keeps the mode it was created under (a listing flipped to instant while requests are pending does not auto-confirm or drop them).

### Default booking mode (BOOK-04)
- **D-62:** **`listing.bookingMode` default flips `"request"` → `"instant"`** (`src/lib/db/schema.ts:180`). Demand-first: a new listing books smoothly by default; a host opts *into* review. This is a Phase-6 execution change (migration/schema default + any create-wizard default), not a discuss-phase edit. Existing listings are unaffected by a default change; there are no production listings to backfill.

### Request-to-book money model = pay-on-approval (PAY-05)
- **D-63:** **Request-to-book uses pay-on-approval, NOT authorize→capture.** Flow: booker requests → a `pending`-style request **holds the slot** via the existing GiST exclusion (no charge) → host approves within the SLA → booker is prompted to **pay via the exact Phase-5 hosted checkout** → `payment.paid` webhook confirms → slot locked. On decline, SLA expiry, or non-payment within the payment window, the slot frees (request → cancelled). **Nothing is ever refunded or voided.**
  - **Why:** authorize/hold is unavailable on our rails — QRPh and GCash/Maya/GrabPay are capture-only; card manual-capture is a sales-gated "Advanced Card Feature" (7-day auto-void) PayMongo hasn't enabled for FitOut. Capture-now→refund-on-decline was rejected in debate — PayMongo still charges the ~2.5% processing fee on refunds, so every host decline would bleed a fee nobody can be fairly billed for.
  - **Consequence — the QRPh exclusion dissolves:** because nothing ever reverses, **all rails including QRPh work for request-to-book** (the earlier "QRPh can't be in an approval flow" hard-constraint no longer applies). No fee bleed on declines; no dependency on the gated card feature; the request-to-book path **reuses Phase 5 checkout wholesale** rather than being a second payment system.
  - **Tradeoff (accepted):** the booker is not financially committed at request time, so an approved booker could ghost. No money is ever at stake — the only cost is a held slot, bounded by the post-approval payment window (D-64).

### Approval SLA + payment window (HOST-01, BOOK-05, PAY-05)
- **D-64:** **Host approval SLA = 24h** (config-tunable) — if the host does not approve/decline within 24h of the request, it **auto-declines** and the slot frees. **Post-approval payment window = 24h** (config-tunable) — the booker has 24h after approval to pay, else the approval **auto-releases** and the slot frees. Both live alongside the existing named config in `src/lib/payments/config.ts` (join `COMMISSION_RATE_BPS`/`PAYOUT_DELAY_HOURS`/`PAYMENT_WINDOW_MINUTES`). Worst case a request-to-book slot is held ≤48h (review + pay); acceptable at launch, Phase 7 may tune. Benchmark: Airbnb request-to-book expires in ~24h. The card 7-day auto-void ceiling is moot (no hold under pay-on-approval).

### Host requests UI (HOST-01)
- **D-65:** **A dedicated owner-scoped `/host/requests` page** (mirrors the `/host/earnings` RSC + server-action pattern) lists pending requests — booker, space, requested window, quoted price, and an **expiry countdown** — with **Approve / Decline** server actions. A **pending-count nudge** appears in the host dashboard action row + `(host)` header nav. Freshness via `revalidatePath` (no websockets/polling infra in v1).

### Confirmation + lifecycle emails (BOOK-06)
- **D-66:** **On-screen confirmation reuses the existing confirmation page** (`/bookings/[id]`). Phase 6 adds the **booking/request lifecycle transactional emails** via the **existing `src/lib/email.ts`** (Resend + the dev "link withheld/logged" fallback) — the first non-auth emails in the repo:
  - **Booker:** booking confirmed (instant-book, and after pay-on-approval) — the BOOK-06 requirement.
  - **Booker:** request received (awaiting host).
  - **Booker:** request **approved → pay now** (carries the checkout link — the pay-on-approval trigger).
  - **Booker:** request declined / expired.
  - **Host:** new booking request received (drives the SLA response).
  - The **hardened** email layer (retry/observability/queue, WR-04), reminders, and non-booking notifications stay **Phase 7**. Mirrors Phase 5's "mechanism now, policy/hardening later" split.

### Claude's Discretion (defer to research/planner)
- **Request state modeling** — how to represent the request lifecycle over the existing `booking_status` enum (`pending`/`confirmed`/`cancelled` + unused `completed`). Options: repurpose `pending` for "requested/held-unpaid" and add a distinct **"approved-awaiting-payment"** state, vs a separate request concept. **CRITICAL CORRECTNESS NOTE:** any new slot-holding state MUST be added to the `booking_no_overlap` GiST exclusion's occupying-status set (`WHERE status IN ('pending','confirmed')`) — otherwise a requested/approved slot won't block double-booking. The double-booking guarantee is non-negotiable.
- **Hold TTL reuse** — the request hold (≤24h) and post-approval hold (≤24h) reuse the Phase-4 lazy-expiry `expires_at` machinery with mode-specific TTLs (vs the 15-min instant hold). Planner picks how `expires_at` is set/swept across request → approved → paid.
- **Email templating** — plain HTML strings vs React Email components (stack-prescribed) — planner's call; keep the send thin (D-66 defers hardening to Phase 7).
- **Where the mode toggle lives in the listing editor** and how approve/decline surfaces (inline action vs confirm dialog) — planner/UI's call.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Payments architecture (authoritative)
- `CLAUDE.md` § "Marketplace Payments — Prescriptive Detail" — esp. the **"Request-to-book capture (Phase 6)"** line ("card manual-capture is a gated advanced feature; QRPh/GCash/Maya = capture-now → refund-on-decline"). ⚠️ Phase-6 research **supersedes the capture-now→refund guidance** with **pay-on-approval** (D-63) after the per-rail fee-bleed finding; card manual-capture remains gated/unbuilt.
- `.planning/phases/05-payments-payouts/05-CONTEXT.md` — **D-57** (`payment.paid` webhook = confirm authority — request-to-book confirms the same way after payment), **D-58** (never keep money for an undeliverable slot + hold/payment race handling), **D-60** (refund mechanism already built, unused on the pay-on-approval happy path).
- `.planning/PROJECT.md` § Key Decisions — the "host's choice: instant vs request-to-book per listing" decision (D-61 reaffirms) and **D-20** (PayMongo), **D-21** (units/exclusion model the holds sit on).

### Prior-phase foundations Phase 6 builds on
- `.planning/phases/04-booking-core-search-no-payment/04-CONTEXT.md` — **D-40** (`bookingMode` stored, NOT forked — **Phase 6 is where it forks**), D-42 (idempotency), D-47 (`HOLD_TTL_MINUTES`), D-48 (lazy-expiry occupancy), D-49 (frozen `quotedTotalCents`), and the `createPendingHold` / `confirmBooking` seam.
- `.planning/phases/03-…/03-CONTEXT.md` + `drizzle/0005` — the `booking_no_overlap` GiST exclusion and its occupying-status `WHERE` (the correctness note above).

### Requirements
- `.planning/REQUIREMENTS.md` — **BOOK-04, BOOK-05, BOOK-06, PAY-05, HOST-01** (Phase-6 scope). **PAY-05 reworded** this phase (authorize/capture → pay-on-approval, D-63). BOOK-07/PAY-06/HOST-02 remain **Phase 7**. WR-04 (email hardening) stays **Phase 7**.
- `.planning/ROADMAP.md` § Phase 6 — SC #2/#3 **corrected** to pay-on-approval (D-63). Use the corrected text.

### Code Phase 6 extends
- `src/app/actions/booking.ts` — `placeHold` / `confirmBooking`: fork on the listing's `bookingMode`. Instant = the current charge path; request = create the held request (no charge), then a new **approve/decline** action pair captures-by-checkout / frees the slot.
- `src/lib/db/schema.ts` — `bookingMode` enum + `booking.bookingMode`/status; flip the default (D-62); model the request lifecycle (Claude's discretion) and extend the exclusion occupying set if a new state is added.
- `src/app/api/paymongo/webhook/route.ts` — `checkout_session.payment.paid` already the confirm authority (D-57); request-to-book confirms through the **same** webhook after pay-on-approval (no new confirm writer).
- `src/lib/email.ts` — extend the existing Resend helper with the lifecycle sends (D-66).
- `src/app/(host)/…` — add `/host/requests` (mirror `/host/earnings` from 05-06) + the pending-count nudge.
- `src/lib/payments/config.ts` — add `APPROVAL_SLA_HOURS` + `APPROVAL_PAYMENT_WINDOW_HOURS` (D-64) beside the existing config.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Phase-5 checkout is the request-to-book payment step verbatim** — `confirmBooking` → `createCheckoutSession` (frozen `quotedTotalCents`) → redirect → `payment.paid` webhook confirm. Pay-on-approval just gates this behind host approval; no new payment primitive.
- **`createPendingHold` + lazy-expiry `expires_at`** (`src/lib/availability/units.ts`) — the slot-holding mechanism; request-to-book reuses it with a longer, mode-specific TTL.
- **`/host/earnings` (05-06)** — the owner-scoped `(host)` RSC + server-action + nav-nudge pattern to clone for `/host/requests`.
- **`src/lib/email.ts`** — Resend send with a dev fallback (logs the link when `RESEND_API_KEY` is unset, withholds it in prod). Already mocked in tests. Extend, don't rebuild.
- **Webhook single-writer + `paymongo_event` dedupe** — request-to-book confirms via the existing `payment.paid` handler; no second writer.

### Established Patterns
- **Owner-gated `(host)` routes re-check ownership in the action/RSC** — the route group is NOT the gate (Security V4). Approve/decline must re-verify the request belongs to the host's listing (IDOR).
- **Server-authoritative money/state** — approval, capture-trigger, and expiry decisions are server-side; never trust the client. The DB clock (`now()`) is the expiry authority (as in Phase 4/5).
- **The GiST exclusion is the sole double-booking authority** — extend its occupying-status set if a new holding state is introduced (correctness note in Decisions).
- **Config-as-named-values** (`src/lib/payments/config.ts`) — SLA + payment window join the existing pattern, not hardcoded literals.

### Integration Points
- **`placeHold` fork** — branch on `listing.bookingMode`: instant → existing charge path; request → create held request + notify host (no charge).
- **New approve/decline server actions** — approve sets "approved-awaiting-payment" + emails the booker a pay link; decline frees the slot + emails the booker. Both owner-gated + SLA-aware.
- **Auto-decline / auto-release sweeps** — extend the existing lazy-expiry/sweep machinery to expire un-actioned requests (→ decline) and unpaid approvals (→ release).
- **`/host/requests`** — new page; **pending-count nudge** in `host/page.tsx` + `(host)` header.
- **Lifecycle emails** — hook sends at: request created (host), approved (booker+pay-link), declined/expired (booker), confirmed (booker, BOOK-06).

</code_context>

<specifics>
## Specific Ideas

- **Pay-on-approval is the load-bearing insight of this phase** — it converts request-to-book from "a second, fee-bleeding, rail-fragmented payment system" into "instant-book checkout gated behind host approval." Keep it framed that way; resist reintroducing authorize/hold unless PayMongo enables card manual-capture *and* a card-only UX is acceptable.
- **The debate that produced D-63** — the user reasoned hard on payment economics (a retained cancellation fee self-funds a *cancellation*, but a host *rejection* is the one reversal nobody can be fairly billed for → don't build a flow that forces the platform to eat a fee on a "no"). Pay-on-approval removes the unfunded fee event entirely. See 06-DISCUSSION-LOG.md.
- **QRPh is back in scope for request-to-book** under pay-on-approval — call this out so no one re-adds a QRPh guard that was only needed for the (rejected) refund-on-decline model.

</specifics>

<deferred>
## Deferred Ideas

- **Cancellation/refund policy matrix + booker cancel flow** → **Phase 7** (BOOK-07, PAY-06). The Phase-5 refund mechanism exists but is unused on the pay-on-approval happy path.
- **My Bookings list views (both sides)** → **Phase 7** (HOST-02 / MANAGE).
- **Hardened transactional-email layer** (retry, observability, queue — WR-04), reminders, non-booking notifications → **Phase 7**. Phase 6 ships thin lifecycle sends only.
- **Card authorize/hold (manual capture)** as an alternative request-to-book money model → revisit only if PayMongo enables the gated Advanced Card Feature; low priority given pay-on-approval covers all rails.
- **Real-time host request updates** (websockets/push) → future; v1 uses `revalidatePath` freshness.

</deferred>

---

*Phase: 06-full-booking-payment-integration*
*Context gathered: 2026-07-17 → resolved 2026-07-19*
