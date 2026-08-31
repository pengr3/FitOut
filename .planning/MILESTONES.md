# Milestones

## v1.1 Front-End Polish & Placeholder Design System (Shipped: 2026-08-31)

**Phases completed:** 11 phases (10, 11, 12, 13, 13.1, 14, 15, 16, 16.1, 17, 17.1), 149 plans, 372 tasks
**Also carrying requirements:** 2 quick tasks — `260831-ndc` (HOURS-01/02) and `260831-rpt` (TRUST-02/03)
**Timeline:** 2026-08-11 → 2026-08-31 (20 days, 1,076 commits)
**Code:** 353 TypeScript/TSX files under `src/` (~75.4k LOC), 301 test/spec files (~139.8k LOC)
**Gate at close:** `npm run test:design` 71 files / 1291 passed · `tsc --noEmit` exit 0 · **69/71 in-scope requirements satisfied** · 11/11 phases carry a VERIFICATION.md · zero schema migrations (`drizzle/` still at `0025`)

**Delivered:** One token contract between what a component asks for and what colour and size it
gets, across all nine v1.0 surfaces — so locking real branding later is a token edit rather than a
component sweep. Two visually distinct themes prove the contract holds; a build-blocking gate proves
nothing leaked around it.

### Key accomplishments

- **Branding lives in exactly one place, and the build enforces it.** A raw hex, `rgb(`, `oklch(`
  or an arbitrary `text-[NNpx]` anywhere under `src/components/**` or `src/app/**` fails
  `npm run build` — demonstrated by putting one in `badge.tsx` and watching the build go red, not
  by writing a test that claims so. The one value allowed to exist twice is generated from the
  stylesheet and byte-compared on every run, closing the shipped `BRAND_CORAL` drift.

- **The second theme shipped in the same phase as the first, as the enforcement test rather than a
  feature.** Court and grove carry identical 24-key sets and differ on all four of colour, shape,
  type and depth; a nested `[data-theme]` subtree renders in its own theme so two directions can be
  compared on real screens. Zero component edits to re-skin.

- **The milestone fixed the defects it inherited before measuring anything.** The app rendered in
  Geist for the first time (the `--font-sans` cycle at `globals.css:10`), all 29 declared colour
  pairings now clear WCAG AA with a 0.05 epsilon in both themes — correcting a coral CTA at 3.60:1,
  a success badge at 3.24:1 and a focus ring that rendered at ~1.54:1 — and every focus indicator
  lost the 50%-alpha that made it invisible.

- **The gates became capable of failing before the first surface was touched.** Playwright can no
  longer write a baseline on any machine (`updateSnapshots: "none"`, unconditional); GitHub Actions
  exists for the first time and its first red run found a defect latent for 167 commits; the
  double-booking guarantee has now been *watched failing* with `booking_no_overlap` removed, two
  racing inserts both fulfilled and captured verbatim; and the price a booker sees is asserted equal
  to the integer centavos the database froze.

- **Every v1.0 surface was re-cut through the pattern layer** — booker path (search → listing →
  checkout), confirmation and receipt, host tooling, auth and the 23-message email shell — onto three
  named card patterns, one overlay primitive, and one closed four-tone status vocabulary where status
  is never colour alone.

- **Two net-new capabilities rode the milestone in their own containers (D-136), so the polish scope
  stayed honest:** image crop and framing with upload hardening (bounded, MIME-true, and costing what
  it should to serve), and availability copy-to-all — the latter shipped as a quick task with zero
  server changes once Phase 14 had already built the infrastructure.

### Known gaps

**2 of 71 in-scope requirements are unsatisfied at close: `STATE-05` and `TRUST-01`.** Both are
code-complete and blocked on the same business fact — a monitored support address. The support path
is written and composed on every surface that owes one, and renders nothing while `SUPPORT_EMAIL` is
`null`; `src/lib/site.ts:70` is the only line that changes, and D-64 explicitly forbids setting a
placeholder to make the gate pass.

8 further requirements (`SEARCH-06..09`, `MAP-01..04`) were **deferred out of scope** to backlog
999.3 by **D-141** before any plan was written, after their spikes ran. They are descoped, not
unsatisfied, and their findings stand.

Worth stating plainly rather than burying: the milestone audit initially read worse than the tree
was. Four requirements (`DS-09`, `RESP-04`, `GATE-02`, `GATE-06`) were satisfied in code but never
ticked, and `WR-05` was reported open for six days after being fixed — because nothing pinned the
fix and a verification pass re-confirmed a stale claim. Both classes of drift are now corrected, and
the WR-05 allow-list is build-blocking.

### Deferred items

Known deferred items at close: 10 (see STATE.md § Deferred Items, entries 7–16).

Five phases sit at `human_needed` (11, 13, 13.1, 14, 15) and **none is blocked on unfinished
engineering** — each is waiting on a business fact, a third party, or a human's eyes. The two
manual walks that *could* be done were done on the closing day: **WALK A** paid a real hosted
PayMongo checkout and confirmed the moment, its `?paid=1` shedding, its decay and its Back
behaviour; **WALK B** printed the receipt to PDF in both themes with background graphics off.

Stated without softening: **no v1.1 email has ever been read in a real client at its real
recipient.** `RESEND_API_KEY` is set, so sends take the real Resend branch — and Resend rejects any
recipient but the account owner with HTTP 403 until a domain is verified, so every UAT email to a
seeded address is composed, dispatched and rejected at the rail. `EMAIL-03` is signed off on
Gmail/Apple Mail spot checks, not on the full 23.

The largest carried debt is **~22 of Phase 17's 28 escalate-class findings, filed for PM review and
never reviewed**, and **D-24**: none of Phase 17's seven Playwright specs run in CI. Every gate this
milestone declares is real; most are only ever run by hand. That is the concrete reason the GATE-02
gap survived four review passes — the assertion worked exactly as designed and nothing was running
it.

Both v1.0 payout blockers are unchanged and still third-party gated: real host payouts have never
moved real money, and hosted Linked-Accounts KYC has never been walked.

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
