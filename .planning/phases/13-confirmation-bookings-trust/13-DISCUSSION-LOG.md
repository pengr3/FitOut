# Phase 13: Confirmation, Bookings & Trust - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-20
**Phase:** 13-Confirmation, Bookings & Trust
**Areas discussed:** Confirmation moment & decay, Trust signals, Payment-state words, Receipt form

**Session note:** batch overlay applied (4 questions per turn instead of the default 4 single-question
turns) at the PM's explicit request for throughput. All four offered gray areas were selected.

---

## Confirmation moment & decay

### Q1 — What should make the celebration fade on later visits?

| Option | Description | Selected |
|--------|-------------|----------|
| Strip the URL flag after first paint | Land on `?paid=1`, show the full moment, rewrite URL to `/bookings/{id}` so refresh/bookmark/pasted-link shows the ordinary page. No DB column. | ✓ |
| Keep the `?paid=1` flag as-is | Cheapest, already wired — but never really decays, and a pasted link shows a stranger a success screen. | |
| Remember it in a cookie | Survives refresh; breaks in private windows / other devices; third piece of state. | |

**Notes:** A `confirmation_seen_at` column was ruled out before the question was asked — v1.1 must
close with zero schema migrations (Phase 17 SC#4). Stated to the PM up front.

### Q2 — How much of the screen is the confirmation moment?

| Option | Description | Selected |
|--------|-------------|----------|
| Full-page moment, detail continues below | Success mark, amount, reference, what-happens-next own the first screen; scroll continues into normal detail. | ✓ |
| Success banner on top of the normal page | One page, least code — but STATE-08 reserves banners for non-terminal success. | |
| Dedicated confirmation route | Strongest arrival feel — but a second URL and an extra click, against 12-CONTEXT D-59. | |

### Q3 — What is the loudest thing "what happens next" should say?

| Option | Description | Selected |
|--------|-------------|----------|
| Depends on booking mode | Instant → arrival details. Request → approval deadline + automatic full refund on decline. | ✓ |
| Always lead with arrival details | Consistent — but misleads a request-to-book booker whose slot isn't confirmed. | |
| Always lead with the cancellation window | Maximises perceived safety — but leads with undoing the purchase. | |

**Notes:** The rationale that carried it — a request-to-book booker's actual question is whether their
money is at risk.

### Q4 — How should we show where the confirmation email went?

| Option | Description | Selected |
|--------|-------------|----------|
| Full address | Behind auth, own booking; lets them catch a typo'd address. | ✓ |
| Masked address | Safer on a shared screen — but defeats the reason the line exists. | |
| No address, just the fact | Cleanest — but useless if the email never arrives. | |

---

## Trust signals

### Q1 — Support path when `SUPPORT_EMAIL` is null and a shipped gate blocks fake contacts

| Option | Description | Selected |
|--------|-------------|----------|
| Build it behind the guard, flip on an address | Full support path coded behind `SUPPORT_EMAIL !== null`; address carried as a `human_needed` item; one-line flip closes both requirements. | ✓ |
| Give me a support address now | Wire a real monitored inbox this phase; nothing deferred. | |
| Route support to the host instead | Cheapest — but a reversed payment is a FitOut problem, not a host problem. | |

**Notes:** Surfaced as a blocker, not a preference. TRUST-01 and STATE-05 both require a support path;
`src/lib/site.ts` has none and `tests/design/site-contacts.test.ts` asserts zero support affordances
in `src/` while the constant is null. Consequence stated and accepted: both requirements close
**code-complete, address-pending** rather than fully satisfied.

### Q2 — How should a booker see "payout onboarding complete"?

| Option | Description | Selected |
|--------|-------------|----------|
| Reframe as a platform guarantee | "FitOut holds your payment until after your session" — the actual payout model, not a host credential. | ✓ |
| Plain factual host attribute | "Set up to receive payouts through FitOut" — honest but edges toward a verification badge. | |
| Don't surface it at all | Safest against fake verification — but drops one of the four named signals. | |

### Q3 — How to present "host since" when every launch host is new?

| Option | Description | Selected |
|--------|-------------|----------|
| Plain date, no newness badge | "Host since August 2026." Factual, strengthens on its own over time. | ✓ |
| Flag new hosts explicitly | Honest — but at launch it appears on every listing as a warning label. | |
| Hide it until there's history | Avoids the launch problem — but the signal is absent when trust matters most. | |

### Q4 — Where should the trust block appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Detail page on every status, condensed on confirmation | Trust matters most when something looks wrong. | ✓ |
| Confirmation moment only | Keeps the detail page lean — but a worried returning booker finds nothing. | |
| Detail page only | Simple split — but the confirmation is the highest-anxiety moment. | |

**Notes:** Grounded before asking — all four signals map to real columns (`user.createdAt`,
`listing.publishedAt`, `host_payout.onboarding_complete`, `listing.bookingMode`). No response-rate
column exists, so "responds within an hour" would be exactly the invented signal TRUST-04 bans.

---

## Payment-state words

### Q1 — What should a booker be told when their payment was genuinely reversed?

| Option | Description | Selected |
|--------|-------------|----------|
| Tell them what their statement will show | Exact amount charged, refunded in full, when it reappears, reference, support path. | ✓ |
| Keep the current "you haven't been charged" | What ships today — but false for a real reversal; contradicts their bank app. | |
| Neutral wording, no amounts or timing | Never wrong, never specific — leaves the only real question unanswered. | |

**Notes:** Raised as a defect found during scout, not a preference. `payment-reversed-state.tsx` is
currently using STATE-05's *not-completed* language for a reversal. Explicitly agreed that the refund
reappearance window is a fact to verify against PayMongo during research, never a number to invent.

### Q2 — What should the missing not-completed state offer?

| Option | Description | Selected |
|--------|-------------|----------|
| Retry on the same hold, other rails inline | Keeps the live hold; GCash/Maya/card offered inline; states plainly no charge occurred. | ✓ |
| Send them back to the listing | Always correct — but loses a live hold and re-asks for the slot they already picked. | |
| Explain it, no action | Least code — a screen with no next action is the STATE-03 failure mode. | |

**Notes:** Flagged that nothing renders for this state today; `hold-expired-state.tsx` already owns the
expired-hold landing and must not be duplicated.

### Q3 — Where does pending settlement go after the ~20s poll?

| Option | Description | Selected |
|--------|-------------|----------|
| Reassure, then escalate to support | Keep the poll; add "your booking is safe, we'll email you"; late threshold surfaces support with the reference. | ✓ |
| Leave it exactly as it is | Already satisfies "no error affordance" — but hands over a Refresh button and no reassurance. | |
| Poll indefinitely | Never stop — an endless spinner, and it hammers a state only the webhook can change. | |

### Q4 — Primary button on the reversed state?

| Option | Description | Selected |
|--------|-------------|----------|
| Rebook, with support secondary | Booker's goal is still to book a space; support one click away for the money question. | ✓ |
| Support primary, rebook secondary | Takes the money seriously — but frames a benign race as an incident, into an inbox that doesn't exist. | |
| Both equal weight | Neutral — opts out of Phase 10's button hierarchy. | |

---

## Receipt form

### Q1 — What form should the itemised receipt take?

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated `/receipt` route, print-styled | Real URL, prints to paper or PDF via the browser dialog. No new dependency. | ✓ |
| Print stylesheet on the existing detail page | Cheapest — but requires suppressing all page chrome and gives no shareable link. | |
| Server-generated PDF download | Most "real" artefact — new dependency, render pipeline, font debugging, can't view without downloading. | |

### Q2 — Official BIR receipt, or informal booking receipt?

| Option | Description | Selected |
|--------|-------------|----------|
| Informal booking receipt | Clear itemised record, explicitly not presented as an official tax receipt. | ✓ |
| Needs to be BIR-compliant | Treated as a hard constraint if already confirmed with an accountant — expands well past Phase 13. | |
| Not sure — flag it for later | Same code, parked as an owed decision. | |

**Notes:** Deliberately not decided by Claude. Philippine official receipts carry real legal
requirements; shipping a document that *looks* official would quietly make that decision. Parked as an
open business question in CONTEXT.md `<deferred>`.

### Q3 — Which bookings get a receipt?

| Option | Description | Selected |
|--------|-------------|----------|
| Any booking where money moved | Includes cancelled/refunded, showing charge and refund as separate lines. | ✓ |
| Confirmed bookings only | Strictly what TRUST-05 asks — but the refunded case most needs a document. | |
| Everything including unpaid holds | Consistent — but a receipt for an unpaid hold is meaningless and confusing. | |

### Q4 — How should a group receipt itemise?

| Option | Description | Selected |
|--------|-------------|----------|
| Itemise by headcount, one payer | Per-head rate × confirmed headcount + fee + total, issued to the organiser. | ✓ |
| List attendees by name | Useful for splitting costs — but puts others' names on a financial document and can drift from what was charged. | |
| Headcount total only | Simplest — but "itemised" is the actual word in TRUST-05. | |

---

## Claude's Discretion

The PM's stated operating contract: they own app security, UI/UX, business-logic correctness and user
satisfaction; all technical implementation is delegated without consultation. Explicitly at Claude's
discretion for this phase:

- Component decomposition, file layout, and server/client boundaries (subject to GATE-05)
- Test strategy and plan/wave breakdown
- The mechanism for the URL rewrite (D-60)
- Exact poll thresholds and the late-escalation timing (D-71)
- Print-CSS mechanics for the receipt route (D-74)
- The decision-ID namespace collision handling (recorded, not resolved — matches prior-phase precedent)

Two items were carried forward without asking, both recorded in CONTEXT.md for the planner:
TRUST-02's email subject-line requirement (specified here, implemented in Phase 15) and the group
surfaces receiving a design-system pass only.

## Deferred Ideas

- **Official BIR receipt** — open business question for the PM and their accountant. Not Phase 13 work.
- **A monitored support inbox** — operational prerequisite for D-64; a `human_needed` item, not a code task.
- **Net-new group capability** — beyond the design-system pass, this is D-136 territory needing its own phase.
- **Host-side booking surfaces** — Phase 14.
- **The email shell and the reference in the subject line** — Phase 15; this phase defines the contract only.
