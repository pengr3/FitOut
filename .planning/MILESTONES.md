# Milestones

## v1.0 MVP (Shipped: 2026-08-11)

**Phases completed:** 9 phases, 107 plans, 227 tasks
**Timeline:** 2026-06-03 → 2026-08-11 (69 days, 755 commits)
**Code:** 211 TypeScript/TSX files under `src/` (~37.9k LOC), 135 test files
**Gate at close:** 1087 tests passing / 4 skipped / 0 failures · `tsc --noEmit` exit 0 · 49/49 requirements satisfied · 9/9 phases carry a VERIFICATION.md

**Delivered:** A two-sided fitness-space marketplace where a person can search for a space,
see real availability, reserve a slot, and pay — with the booking's realness enforced by the
database, and the host paid out net of commission only after the session.

### Key accomplishments

- **The double-booking guarantee is structural, not advisory.** A Postgres GiST `EXCLUDE`
  constraint over `tstzrange(…, '[)')` — not an app-level query-then-insert — makes two
  overlapping bookings for a listing impossible, proven by a genuine two-connection race
  (which yields 23P01 *or* 40P01; both are mapped and both prevent the double-book).
- **Identity and supply:** one FitOut account carries both booker and host capabilities;
  hosts publish listings with ordered photos, hourly/day pricing, and instant-book vs
  request-to-book mode — with *bookability* (never listing creation) gated on PayMongo
  payout onboarding, so a slot can never be sold to an unpayable host.
- **Money moves on the webhook, never the redirect.** PayMongo hosted checkout (cards /
  GCash / Maya / QR Ph) collects the full amount to the platform wallet; the
  signature-verified, idempotent `checkout_session.payment.paid` webhook is the single
  confirm authority; commission is host-side (10%, config-tunable) and the host is paid
  `price − commission` by an inhouse `/v2/batch_transfers` fired T+24h after the session —
  at most once per booking, enforced by a ledger claim.
- **The full lifecycle forks correctly:** instant-book captures and confirms; request-to-book
  holds the slot with *no charge*, gives the host an SLA to approve or decline, and on
  approval the booker pays to confirm — with decline, SLA expiry, and non-payment all
  freeing the slot without ever refunding or voiding.
- **Bookings management end to end:** My Bookings on both sides, tiered cancellation/refund
  policy, host cancellation, and a transactional email layer over Resend for every
  lifecycle transition.
- **Two differentiators on the same rail:** group bookings (organizer wraps a paid booking,
  invites by link/email, account-less attendees RSVP against a transactionally-frozen
  capacity cap under a `FOR UPDATE` seat claim) and open-capacity drop-in bookings (many
  independent bookers share one day up to a cap, each paying per head).

### Known gaps

None. All 49 v1.0 requirements are checked off and traced; every phase carries a
VERIFICATION.md. The items below are deferred, not unsatisfied.

### Deferred items

Known deferred items at close: 6 (see STATE.md § Deferred Items).

Two phases sit at `human_needed` (02, 05) and both are blocked on a third party rather than
on unfinished engineering: PayMongo's `/v2` money-movement and hosted Linked-Accounts KYC
betas are sales-gated on this account, probed directly and recorded verbatim. Stated without
softening: **real host payouts have never moved real money** — the sweep and reconcile are
proven only against `mockPayMongo`. The booker-side rail *is* proven against the real API,
but per rail only for **card** and **QR Ph**; GCash and Maya have never been individually
hand-paid. `T-08-74` (an already-captured QR Ph payment is not refundable through the
PayMongo API at all) is a permanent rail limitation carrying an operator runbook, a daily
alert digest, and — as of `260811-fh6` — an asserted discharger on every new discharge.

---
