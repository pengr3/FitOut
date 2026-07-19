# Phase 6: Full Booking + Payment Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-17 (R2B money model → snowballed into a scope debate; paused via `/gsd-pause-work`) → 2026-07-19 (resumed via `/gsd-resume-work`; scope + remaining gray areas resolved)
**Phase:** 06-full-booking-payment-integration
**Areas discussed:** Booking-mode scope (does request-to-book belong in v1?), Request-to-book money model, Approval SLA + payment window, Host requests UI, Confirmation & emails

---

## Booking-mode scope — does request-to-book belong in v1?

| Question | Options | Selected |
|----------|---------|----------|
| Should request-to-book (host review/approval) exist in v1 at all? | Build both modes (host-selectable) / Instant-book-only, defer request-to-book / Instant-book-only, delete request-to-book | **Build both modes** ✓ |
| Where does the host set the mode? | Editable per listing while hosting / Fixed at listing creation | **Editable per listing while hosting** ✓ |
| Default booking mode for new listings? | `instant` / `request` | **`instant`** ✓ (was `request`) |

**User's choice:** Build both instant-book and request-to-book; the host selects the mode per listing and can change it while hosting. New listings default to instant.
**Notes:** The debate (2026-07-17) legitimately expanded from "how do we hold money for request-to-book" into "do we even need host review," because request-to-book is the entire source of payment complexity on our rails. The user first leaned instant-book-only + a cancellation-fee policy. On resume (2026-07-19), after weighing the home-gym vetting gap (no reviews at launch → a stranger auto-confirms access to a home) against the commercial-first supply (courts/gyms/studios, where instant is normal), the user chose to keep **both** and let hosts decide — which reaffirms the logged PROJECT.md "host's choice" decision and keeps the ROADMAP intact (no requirements moved out). Rule: a mode change affects new bookings only; in-flight requests keep their original mode.

---

## Request-to-book money model

| Question | Options | Selected |
|----------|---------|----------|
| How is money handled during the approval window? | Pay-on-approval (no charge until host approves) / Card auth-hold + pay-on-approval for e-wallets (hybrid) / Capture-now → refund-on-decline | **Pay-on-approval, all rails** ✓ |

**User's choice:** Pay-on-approval — the request holds the slot with no charge; the booker pays via the Phase-5 checkout only after the host approves; decline/expiry/non-payment frees the slot with nothing reversed.
**Notes:** Grounded in a synchronous PayMongo per-rail research pass:
- **Cards** — HOLD-capable (`capture_type: manual` → `/capture` or `/cancel`), BUT a sales-gated "Advanced Card Feature" (not enabled for FitOut) with a 7-day auto-void.
- **GCash / Maya / GrabPay** — capture-only; refundable but PayMongo **still charges the ~2.5% fee on refunds** → fee bleed on every decline. (Maya same-day = full-refund-only.)
- **QRPh** — capture-only and **not API-refundable at all**.

Rejected **capture-now→refund** (option C): ~2.5% fee bleed per host decline; QRPh can't refund. Rejected the **card auth-hold hybrid** (option B): only helps the minority rail (cards), needs the gated feature, caps SLA at 7 days, and fragments the UX; e-wallets would fall back to pay-on-approval anyway. **Pay-on-approval** wins because it works uniformly on every rail (QRPh included — nothing ever reverses, so the QRPh exclusion dissolves), never bleeds a fee, doesn't depend on the gated card feature, and reuses Phase-5 checkout wholesale. Accepted tradeoff: booker isn't committed at request time (could ghost after approval) — bounded by the post-approval payment window; no money is ever at stake.

**Economics established in debate:** a retained *cancellation* fee (≥ processing fee) self-funds a booker-initiated cancellation, but a host *rejection* is the one reversal nobody can be fairly billed for — so any model that reverses money on a host "no" forces the platform to eat the gateway fee. Pay-on-approval removes the unfunded fee event by never moving money before approval. (Angkas/MoveIt-style GCash escrow was discussed — they use auth-holds or an in-app wallet ledger, neither available on a thin PayMongo wrapper.)

---

## Approval SLA + payment window

| Question | Options | Selected |
|----------|---------|----------|
| How long does the host have to approve/decline? | 24h (auto-decline) / 12h / 48h | **24h, config-tunable** ✓ |
| How long does the booker have to pay after approval? | 24h (auto-release) / a few hours / until slot start | **24h, config-tunable** ✓ |

**User's choice:** 24h host approval SLA (auto-decline → free slot) + 24h post-approval payment window (auto-release → free slot); both tunable.
**Notes:** Benchmark — Airbnb request-to-book expires in ~24h. The card 7-day auto-void ceiling is moot under pay-on-approval (no hold). Worst case a request-to-book slot is held ≤48h (review + pay); acceptable at launch, Phase 7 may tune. Values join the existing named config in `src/lib/payments/config.ts`.

---

## Host requests UI

| Question | Options | Selected |
|----------|---------|----------|
| Where does a host approve/decline requests? | Dedicated `/host/requests` page + dashboard nudge / Inline on the existing dashboard / Notifications inbox | **Dedicated `/host/requests` page + nudge** ✓ |

**User's choice:** A dedicated owner-scoped `/host/requests` page (mirrors the `/host/earnings` pattern) with booker/space/window/price + expiry countdown and Approve/Decline actions, plus a pending-count nudge in the dashboard/header.
**Notes:** Clones the HOST-03 (05-06) RSC + server-action + nav-nudge idiom. Freshness via `revalidatePath` (no websockets in v1).

---

## Confirmation & emails

| Question | Options | Selected |
|----------|---------|----------|
| How much email does Phase 6 build? | Lifecycle transactional emails (thin send) / Full hardened email layer now / On-screen only | **Lifecycle emails, thin send** ✓ |

**User's choice:** On-screen confirmation (reuse the existing confirmation page) + the booking/request lifecycle emails via the existing `src/lib/email.ts` (Resend + dev-link fallback): booker — confirmed / request-received / approved-pay-now / declined-or-expired; host — new-request.
**Notes:** BOOK-06 explicitly requires an email confirmation, so email send is in Phase-6 scope; the **hardened** layer (retry/observability/queue — WR-04), reminders, and non-booking notifications stay Phase 7. Mirrors Phase 5's "mechanism now, hardening later" split. `src/lib/email.ts` already exists (auth verification/reset) — extend it.

---

## Routed scope/mechanism changes (not buried in CONTEXT)

- **ROADMAP Phase 6 SC #2/#3** corrected: "payment authorized, not captured → captured on approval" → **pay-on-approval** (D-63; authorize→capture is infeasible on our rails).
- **REQUIREMENTS PAY-05** reworded to pay-on-approval (mechanism change; requirement stays in Phase 6).
- **`listing.bookingMode` default** flips `"request"` → `"instant"` (D-62) — a Phase-6 execution change flagged for the planner.

## Claude's Discretion (deferred to research/planner)

- Request-state modeling over the `booking_status` enum (repurpose `pending` + add "approved-awaiting-payment" vs a separate request concept) — with the **critical** requirement that any new slot-holding state be added to the `booking_no_overlap` GiST exclusion occupying set.
- Hold-TTL reuse across request → approved → paid (mode-specific `expires_at`).
- Email templating (plain HTML vs React Email); listing-editor toggle placement; approve/decline affordance.
