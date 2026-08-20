# Phase 13: Confirmation, Bookings & Trust - Context

**Gathered:** 2026-08-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Everything a booker sees about a booking **after they pay**: the post-payment confirmation moment,
the booking detail page across every status, the itemised receipt, the three payment states, and the
group surfaces (`/invite/[token]`, `/bookings/[id]/group`).

**In scope:** `/bookings/**` on the booker side, plus the two group surfaces.
**Out of scope:** the host side of bookings (`/host/bookings/**` — Phase 14), the transactional email
shell itself (Phase 15), anything net-new (D-136).

**Requirements (9):** BFLOW-08, TRUST-01, TRUST-02, TRUST-03, TRUST-04, TRUST-05, STATE-05, STATE-06,
STATE-08.

</domain>

<decisions>
## Implementation Decisions

> **Decision-ID namespace — read before citing a number.** These continue the per-phase CONTEXT
> sequence (Phase 10 = D-01…D-22, Phase 11 = D-23…D-36, Phase 12 = D-37…D-59), so **Phase 13 runs
> D-60…D-89**. That range **collides with PROJECT.md's own D-numbered records**, which already occupy
> **D-62** (demand-first booking-mode default flip, cited in `src/lib/db/schema.ts:199`), **D-66** (no
> React Email / no new email stack), **D-75** (the all-in rate never goes up) and **D-79** (what
> actually went back to the booker, cited in `src/app/(app)/bookings/[id]/page.tsx:169`). The collision
> is pre-existing — Phase 11's D-30/D-31 and Phase 12's D-42…D-50 collide the same way — and is
> recorded rather than silently inherited. **When citing any number in D-60…D-89, say which
> namespace**: "13-CONTEXT D-62" or "PROJECT D-62". Never a bare number.

> **Governing principle carried forward, not re-decided — 12-CONTEXT D-59:** when two options both
> satisfy a requirement, choose the one that costs the booker less. It decides everything this
> document does not decide explicitly.

### The confirmation moment (BFLOW-08)

- **D-60: `?paid=1` is CONSUMED, not persisted.** The booker returns from hosted checkout to
  `/bookings/{id}?paid=1`, sees the full confirmation moment, and the client then rewrites the URL to
  `/bookings/{id}` (history replace) so a refresh, a bookmark or a pasted link renders the ordinary
  booking-detail page. This is the mechanism for BFLOW-08's *"decays into the normal booking-detail
  page on later visits"*. **A cookie and a DB column were both rejected** — the column because v1.1
  ships ZERO schema migrations (13-CONTEXT D-80), the cookie because it is a third piece of state for
  a marginally different result.
  ⚠ **PROJECT D-57 is UNCHANGED and binding: `?paid=1` is a UX signal ONLY and never proof of
  payment.** The `checkout_session.payment.paid` webhook remains the sole confirm authority. Consuming
  the param must not move any branch off the DB status.
  ⚠ Nothing important may live ONLY in the moment — everything it states is repeated on the ordinary
  detail page (TRUST-01), which is what makes the decay safe.

- **D-61: The moment is a full-page first screen inside the SAME route; the ordinary detail continues
  below it.** No `/bookings/[id]/confirmation` route (a second URL for one booking costs the booker a
  navigation — 12-CONTEXT D-59). Not a banner either: STATE-08 reserves banners/toasts for
  NON-terminal success, and a paid booking is terminal success.

- **D-62 (13-CONTEXT): "What happens next" BRANCHES ON `listing.bookingMode`.** These are genuinely
  different situations and one shared sentence is wrong for both:
  - `instant` → lead with arrival: venue, full address, venue-local date/time with named timezone.
  - `request` → lead with the host's approval deadline AND the money answer: the booker has been
    charged, and is refunded in full automatically if the host declines. A request-to-book booker's
    real question is whether their money is at risk; answer it above the fold.

- **D-63: The confirmation states the FULL email address** it was sent to ("Confirmation sent to
  jane@example.com"). The page is behind auth and it is the booker's own booking, so exposure is nil —
  and the full address is the only version that lets them catch a typo, which is the reason the line
  exists. Masking rejected for defeating its own purpose.

### Trust signals (TRUST-01, TRUST-04)

- **D-64: The support path is BUILT COMPLETE but GUARDED. Do not fabricate a contact.**
  `src/lib/site.ts` exports `SUPPORT_EMAIL: string | null = null` — FitOut owns no domain and has no
  monitored inbox — and `tests/design/site-contacts.test.ts` is an **inverted gate** that asserts ZERO
  support affordances anywhere in `src/` while it is null. TRUST-01 and STATE-05 both require a support
  path, so the conflict is real and is resolved as follows:
  1. Build the entire support path — the block on the booking detail page, the reversed-payment
     escalation, the late pending-settlement escalation, the booking reference carried into the
     subject line — behind the existing `SUPPORT_EMAIL !== null` guard, exactly as the footer already
     does (`src/components/patterns/site-footer.tsx`).
  2. The unfilled address is carried as a named **`human_needed`** item on phase completion — the same
     convention 11-CONTEXT D-26 established and the roadmap already uses for the sales-gated PayMongo
     threads.
  3. **NEVER weaken, skip, or invert `tests/design/site-contacts.test.ts` to make a surface pass.**
     Setting the constant is the only line that changes; the gate flips to its demanding branch
     automatically and both requirements close with no other edit.
  ⚠ TRUST-01 and STATE-05 are therefore **partially satisfied at phase close** — code-complete,
  address-pending. State this plainly in the phase SUMMARY rather than marking them done.

- **D-65: "Payout onboarding complete" is expressed as a PLATFORM GUARANTEE, not a host badge.**
  The booker-facing statement is about where their money is — *"FitOut holds your payment until after
  your session"* — which is literally the hold-until-session payout model, is a stronger trust
  statement than any host credential, and cannot be mistaken for the invented verification TRUST-04
  bans. `host_payout.onboarding_complete` / `payouts_enabled` keep their existing role as the
  bookability gate, unchanged.

- **D-66 (13-CONTEXT): "Host since {Month YYYY}" from `user.createdAt`, with NO newness badge.**
  A "New host" marker would appear on effectively every listing at launch and read as a warning label
  across the whole product; hiding the field until 90 days removes the signal exactly when a booker is
  least sure. The plain date is factual, does not editorialise, and strengthens on its own as the
  marketplace ages.

- **D-67: Full trust block on the booking detail page for EVERY status; a condensed version inside the
  confirmation moment.** Trust matters most when something looks wrong — a pending or reversed
  payment — so binding it to the happy path only would remove it precisely when it is needed.

- **D-68: The four signals are a CLOSED set, and each maps to a real column.** `user.createdAt` (host
  since), `listing.publishedAt` (listing published), `host_payout.onboarding_complete` (via D-65's
  reframing), `listing.bookingMode` (request-to-book behaviour).
  ⚠ **There is NO response-rate or response-time column in `src/lib/db/schema.ts`.** "Responds within
  an hour", any verification badge, any superhost/top-host chrome, and any rating or review signal are
  **forbidden** — they are exactly the invented signals TRUST-04 exists to prevent. If a surface wants
  a fifth signal, the answer is no, not a new column (D-80).

### Payment states (STATE-05, STATE-06, STATE-08)

- **D-69: The reversed state must state the MONEY TRUTH, and the shipped copy is WRONG.**
  `src/components/booking/payment-reversed-state.tsx` currently reads *"you haven't been charged"* —
  that is STATE-05's language for the **not-completed** state. A genuine reversal means money DID move
  and came back, and the charge may sit visible on the booker's statement for days; telling them
  otherwise contradicts their bank app. Replace with: the exact amount charged, that it is refunded in
  full, roughly when it reappears per rail, the booking reference, and the support path (D-64).
  ⚠ **The reappearance window is a FACT TO VERIFY, NOT A NUMBER TO INVENT.** Research must confirm the
  real PayMongo refund timing per rail (QRPh / GCash / Maya / card) before any copy ships. If it cannot
  be verified, the copy says so honestly rather than guessing a range.

- **D-70: The not-completed state is NET-NEW — nothing renders for it today.** A checkout that failed
  or was abandoned must: state plainly that the booker has not been charged, and — if the 15-minute
  hold is still alive — let them pay again **on that same hold**, with the alternative rails (GCash,
  Maya, card) offered inline so a failed GCash does not mean starting over. 12-CONTEXT D-59 applied
  directly: they keep their slot and their place in the flow. Sending them back to the listing to
  re-pick a slot they already chose is the "never make them tell us twice" failure.
  ⚠ If the hold has already expired, this is NOT the not-completed state — `hold-expired-state.tsx`
  already owns that landing. Do not duplicate it.

- **D-71 (13-CONTEXT): Pending settlement keeps its poll and gains a promise.** The shipped
  `pending-payment-state.tsx` (8 attempts × 2500ms ≈ 20s, then calm "taking longer" + manual refresh,
  neutral spinner, `aria-live="polite"`) is correct and its poll discipline is preserved verbatim.
  Add the thing it lacks: state that the booking is safe and that they will be emailed the moment it
  confirms. Past a longer threshold, surface the support path with the reference attached (D-64).
  ⚠ **Never an error affordance at any point** — the webhook is still the outstanding authority
  (STATE-05), and the poller must continue to never fabricate a confirmed state client-side.

- **D-72: On the reversed state the primary action stays REBOOK.** `Back to availability` remains the
  single coral primary; the support path is the quieter secondary. Most reversals here are a lost race
  for a slot, and the booker's actual goal is still to book a space. Support stays one click away for
  the money question.

- **D-73: STATE-06's money sentence is ONE shared, named component rendered above the fold in every
  payment state.** A single owner makes the sentence impossible to omit and directly testable, rather
  than three bespoke paragraphs that can drift. Each state supplies its own sentence; the component
  owns placement and prominence.

### Receipt (TRUST-05)

- **D-74: A dedicated `/bookings/[id]/receipt` route, styled for screen AND print.** The browser's own
  print dialog produces the PDF via "Save as PDF", so **no PDF dependency, no server-side render
  pipeline, no font debugging**. A real URL also gives Phase 15 something to link from the confirmation
  email. A print stylesheet bolted onto the 688-line detail page was rejected (cancel buttons, trust
  block and status chrome all need suppressing, and there is no link to hand someone).

- **D-75 (13-CONTEXT): This is an INFORMAL booking receipt and must never present as an official one.**
  It itemises space cost, service fee, total, method, date paid and reference. Philippine official
  receipts carry real legal requirements (registration, serial numbering, retention) and that is a
  business decision for the PM and their accountant — **not something to imply by shipping a document
  that looks official.** Do not add serial numbers, TIN fields, "Official Receipt" wording, or any BIR
  styling. See `<deferred>` for the parked business question.

- **D-76: A receipt exists wherever MONEY MOVED — including cancelled and refunded bookings**, where
  it shows the original charge and the refund as separate lines. The refunded case is the one most
  likely to need a document. No receipt for unpaid holds: a receipt for something nobody paid for is a
  meaningless artefact that invites "was I charged?" confusion.

- **D-77: A group receipt itemises per-head rate × confirmed headcount + service fee + total, issued
  to the ORGANISER** — the only person who actually paid. **Attendee names are NOT listed**: it would
  put other people's names on a printable financial document, and RSVP state can change after payment
  so the list would not match what was charged.

### Reference, and the Phase 15 seam (TRUST-02, TRUST-03)

- **D-78: The booking reference is copyable, rendered in tabular figures, and present on EVERY
  status.** TRUST-02 also requires it in the **email subject line** — the transactional email shell is
  **Phase 15's** scope, so this phase **specifies the contract and does not reach into it**: define the
  reference's canonical format and expose it for the email layer, then hand over. Same for TRUST-03's
  cancellation policy in the confirmation email: this phase owns the on-screen disclosure with concrete
  dates; Phase 15 carries it into the email body.
  ⚠ **Do not move or add an email SEND TRIGGER in this phase.** Phase 15's SC#3 requires that not a
  single send trigger has moved.

### Cross-cutting scope

- **D-79 (13-CONTEXT): The group surfaces get the DESIGN-SYSTEM PASS ONLY.** `/invite/[token]` and
  `/bookings/[id]/group` carry zero dedicated REQ-IDs (the roadmap's own scope note). They inherit the
  tokens, the card patterns, the state families and the trust/receipt decisions above. **No net-new
  group capability** — that is D-136 territory and belongs in its own phase.

- **D-80: ZERO schema migrations.** `drizzle/` stays at `0025_audit_resolved_by.sql`, unchanged —
  Phase 17 SC#4 makes this a milestone-closing proof (GATE-06). Every decision above is deliverable
  without a column. If a plan believes it needs one, that is a signal the decision was misread.

### Post-research decisions (added 2026-08-20, after 13-RESEARCH.md)

> These were taken by the PM **after** research surfaced three blockers. They have the same force as
> D-60…D-80 above and supersede anything earlier that conflicts.

- **D-81: QRPh is STILL not API-refundable — re-probed 2026-08-20, verbatim the same `HTTP 400`.**
  PayMongo's published docs list QR Ph as refundable and contradict this repository's 2026-07-23 probe,
  so the probe was re-run against the same test payment with a fresh `Idempotency-Key`. Identical
  rail-level rejection: *"Refunds are not allowed for payments with source type qrph."* See
  `13-RESEARCH.md` § Addendum for the verbatim method and body. **Observed behaviour is authoritative
  over the docs row.** Do NOT widen `REFUNDABLE_RAILS` in `src/lib/payments/refund-rail.ts`. The docs
  row remains a UAT re-verification item, nothing more.

- **D-82: The refund policy SPLITS BY CAUSE, not by rail alone.** The PM's initial proposal — "QRPh
  payments cannot be reversed once processed" — was refined after the two cases were separated, because
  they are not the same promise:
  1. **Booker-initiated cancellation** → rail-specific terms are legitimate and are adopted: a QRPh
     payment is not automatically reversible, disclosed at checkout and stated in the refund policy.
  2. **FitOut-side reversal** (the D-58 gone-slot backstop: the booker paid, the slot was already taken,
     WE cancelled) → **the money is returned regardless of rail**, by hand where the API refuses, and the
     copy says so plainly. The booker did nothing wrong and we did not deliver the space; keeping the
     payment is not a policy we write down.
  ⚠ The funds are NOT stuck — they sit on the FitOut platform wallet and a human can transfer them. The
  accurate phrasing everywhere is *"not reversed automatically"*, never *"cannot be reversed"*.

- **D-83: The reversed-state copy BRANCHES ON THE TWO MONEY TRUTHS** (research Pitfall 1):
  - *Automatic refund issued* → name the amount, say it is refunded in full, give the verified window
    for the rail.
  - *Manual path* (QRPh / UBP / unknown rail / failed refund) → **never the word "refunded"**. State that
    the booking is cancelled and the amount is flagged for return by hand, and carry the reference. Here
    **the support path is the only route to the money, so it must be unmissable rather than decorative** —
    D-72's coral *Back to availability* primary still stands, but support is not a quiet afterthought.
  ⚠ **The verified refund windows (13-RESEARCH § Example 1) are the ONLY numbers permitted in this copy:**
  card *up to 30 days*; GCash / Maya *within 24 hours*. The shipped string *"within a few days"* is
  unsourced, appears at three call sites, and is superseded.

- **D-84: The rail is recovered by a LIVE PROBE with a rail-free fallback** (coordinator's technical call;
  research Pitfall 1 option B). `booking.payment_method` is NULL on every reversed row by construction, so
  the reversed page widens `getCheckoutSession(booking.checkoutSessionId)` to read
  `payments[0].source.type` and `attributes.paid_at`. **It must have a timeout and must fall back to
  rail-free copy** (naming all rails so the booker recognises their own) rather than blocking the render.
  The same call also supplies D-85's payment date and D-70's discriminator, so one probe pays for three
  problems. ⚠ Do not let a third-party call fail the page: this surface exists to explain a failure.

- **D-85: "Date paid" comes from the PayMongo probe's real `paid_at`** (D-84's call), not from a proxy.
  There is no `paidAt`, no `updatedAt`, and `paymongo_event` cannot be joined to a booking. If the probe
  falls back, the line is labelled **"Booked"** against `booking.createdAt` — truthful — and is **never**
  labelled "Date paid". A receipt that misstates a payment date is exactly the looks-official-but-isn't
  failure D-75 guards against.

- **D-86: D-77 is NARROWED to open-capacity bookings only.** Two different things are called "group":
  - **Open-capacity** (`booking.openCapacity = true`) → per-head itemisation is REAL.
    `declaredPax` × `listing.perHeadPriceCents` *is* the charge. Use `declaredPax` (the granted passes,
    frozen at payment) and **never** the live RSVP count. Render the unit line only on a **positive
    match** (`perHead × declaredPax === spacePriceCents`), mirroring the existing `fullDay` fallback
    idiom. **Never divide a frozen total to recover a unit.**
  - **Exclusive group bookings** (Phase 8) → the organiser paid one whole-space price and the RSVP table
    has **no money column**. These get the ORDINARY whole-space receipt, still with no attendee names.
    A per-head line here would print a number that never equals what was charged, and no existing gate
    would catch it (GATE-05's price-parity e2e stops at the reserve page).

- **D-87: The reversed state must survive `?paid=1`'s removal** (research Open Question 4 — in scope).
  It is currently gated on `status === 'cancelled' && paid === '1'`, so once D-60 consumes the param a
  reversed booking falls through to the generic `cancelled` branch with **no money statement at all**.
  D-60's safety argument ("everything it states is repeated on the ordinary detail page") is currently
  FALSE for this state, and consuming the param is only safe once it is true.

- **D-88: Three debts research found are IN SCOPE, not deferred.**
  1. **Nested `<main>` landmarks** — `pending-payment-state.tsx`, `payment-reversed-state.tsx` and
     `expired-approval-state.tsx` each open a `<main>` inside `(app)/layout.tsx`'s. The 2026-08-20 quick
     fix converted nine *page-level* branches but not these three, and `e2e/shell.spec.ts` seeds only a
     `confirmed` booking so none is covered. D-83/D-70/D-71 rewrite exactly these files — fix the
     landmark while there.
  2. **`src/lib/design/live-regions.ts`** — ten files in `LIVE_REGION_EXCLUSIONS` carry `why` fields
     naming this phase's REQ-IDs. Discharge the handover rather than inheriting it silently.
  3. **`loading-coverage.test.ts`** pins exact counts (28/20/8); the new receipt route moves them.
     Update the pins in the same commit as the route.

- **D-89: Consuming `?paid=1` is mounted on the CONFIRMED branch ONLY** (research Pitfall 2).
  `PendingPaymentState` polls `router.refresh()`, which re-renders the RSC for the *current* URL — so
  consuming the param on the pending branch makes the next poll fall into the existing
  `redirect(…/book?hold=…)` and bounce the booker to checkout mid-webhook. Use
  `window.history.replaceState` (officially router-integrated in Next 16.3), never `router.replace`.

### Claude's Discretion

The PM delegated all technical implementation. Explicitly at the executor's discretion:
component decomposition, file layout, server/client boundaries (subject to GATE-05), test strategy,
how the URL rewrite is performed, the exact poll thresholds, and print-CSS mechanics.

**Not at discretion — these are locked above:** the decay mechanism (D-60), the mode branch (D-62),
the guarded support path (D-64), the closed signal set (D-68), the corrected reversed copy (D-69), the
no-invented-refund-window rule (D-69), the informal-receipt boundary (D-75), and zero migrations (D-80).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase & requirement definition
- `.planning/ROADMAP.md` § Phase 13 — goal, the 5 success criteria, and the group-surface scope note
- `.planning/ROADMAP.md` § Cross-Cutting Constraints (v1.1) — the five hard gates every surface must clear
- `.planning/REQUIREMENTS.md` — BFLOW-08, TRUST-01…05, STATE-05/06/08 verbatim
- `.planning/PROJECT.md` — core value, and the PROJECT-namespace D-numbers that collide with this file

### Decisions this phase inherits and must not re-litigate
- `.planning/phases/12-booker-path-search-listing-checkout/12-CONTEXT.md` § D-59 — the booker-cost
  tie-breaker that governs anything undecided here; also D-37/D-38 (price continuity) and D-57
  (`?paid=1` is never proof of payment)
- `.planning/phases/11-quality-gates-pattern-layer-app-shell/11-CONTEXT.md` § D-26 — the inverted
  support-contact gate and the `human_needed` convention that D-64 follows
- `.planning/phases/10-design-system-foundation-theme-runtime/10-CONTEXT.md` — token contract, the
  closed four-tone status vocabulary, the Sonner toast mapping, button hierarchy

### Code that constrains this phase
- `src/lib/site.ts` — `SUPPORT_EMAIL` and the D-26 block; **the only line that changes to unblock D-64**
- `tests/design/site-contacts.test.ts` — the inverted gate; never weaken it
- `src/app/(app)/bookings/[id]/page.tsx` — 688 lines, the existing status branching and `?paid=1` handling
- `src/components/booking/pending-payment-state.tsx` — poll discipline to preserve (D-71)
- `src/components/booking/payment-reversed-state.tsx` — the copy D-69 corrects
- `src/components/booking/hold-expired-state.tsx` — the calm recovery idiom, and the state D-70 must not duplicate
- `src/app/actions/booking.ts:967` — where `successUrl` sets `?paid=1`
- `src/lib/db/schema.ts` — the four real trust columns; and the absence of any response-rate column

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`PendingPaymentState`** — a correct, careful poller (ref-held router, interval-only setState,
  bounded attempts, neutral spinner, `aria-live`). D-71 extends its copy, not its mechanics.
- **`PaymentReversedState`** — structurally right (calm, never `--destructive`, single coral recovery
  CTA). D-69 replaces its copy and adds the money statement; D-72 keeps its CTA hierarchy.
- **`HoldExpiredState`** — the established calm-recovery idiom every new state here should mirror.
- **Phase 11 patterns** — `PanelCard` / `RowCard`, `EmptyState`, `ErrorState`, the mobile-overlay
  (sheet) primitive, and the page header. No new card or overlay pattern should be invented.
- **`PriceBreakdown`** and the server-computed `AllInTable` (12-CONTEXT D-38) — the receipt's
  itemisation should reuse the real breakdown rather than a lookalike.
- **`site-footer.tsx`** — the working example of a `SUPPORT_EMAIL !== null` guarded affordance.

### Established Patterns
- **The webhook is the only confirm authority** (PROJECT D-57). Every branch reads DB status.
- **`server-only` + GATE-05**: no money or availability computation may cross into a client component,
  and an e2e check asserts the DOM price equals the DB price. The receipt is a money surface — it must
  compute server-side.
- **Status vocabulary is a closed four-tone union** (Phase 10) — new states pick from it, not past it.
- **Terminal success = full page; non-terminal = toast; anything that must be READ = in-page alert**
  (STATE-08). A refund amount, a reduced headcount or a voided invite is never a toast.

### Integration Points
- `/bookings/{id}?paid=1` — the checkout return, where D-60's consume-and-rewrite happens
- `/bookings/[id]/receipt` — the one net-new route (D-74)
- `src/lib/site.ts` `SUPPORT_EMAIL` — the single switch that closes TRUST-01/STATE-05's support path
- The reference format exposed for **Phase 15**'s email subject line (D-78) — a contract, not a send

</code_context>

<specifics>
## Specific Ideas

- The PM's framing of their own role: they own **app security, UI/UX, business-logic correctness and
  user satisfaction**; all technical implementation is delegated. Surface product forks, scope cuts and
  irreversible actions — not library or architecture choices.
- **"FitOut holds your payment until after your session"** — the PM chose the platform-guarantee
  framing over any host-credential badge. This sentence is the trust anchor of the whole phase.
- The reversed-payment copy must survive the test of **the booker looking at their bank app**. If our
  screen and their statement disagree, our screen is wrong.

</specifics>

<deferred>
## Deferred Ideas

- **Official BIR receipt** — whether FitOut must issue registered official receipts (serial numbering,
  registration, retention) is an open **business** question for the PM and their accountant. D-75 ships
  an explicitly informal receipt in the meantime. Recorded here so it is tracked rather than forgotten;
  it is not Phase 13 work and likely not a UI change at all.
- **A monitored support inbox** — the operational prerequisite for D-64. Carried as a `human_needed`
  item, not a code task.
- **Net-new group capability** — anything beyond the design-system pass on `/invite/[token]` and
  `/bookings/[id]/group` is D-136 territory and needs its own phase.
- **Host-side booking surfaces** — Phase 14.
- **The email shell, and the reference in the subject line** — Phase 15. This phase defines the
  contract only (D-78).

</deferred>

---

*Phase: 13-Confirmation, Bookings & Trust*
*Context gathered: 2026-08-20*
