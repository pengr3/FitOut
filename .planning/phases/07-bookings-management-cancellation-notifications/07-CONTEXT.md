# Phase 7: Bookings Management, Cancellation & Notifications - Context

**Gathered:** 2026-07-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 7 closes the booking lifecycle. Six phases built the path *into* a booking (search → availability → hold → pay → approve → confirm); this phase builds everything *after* it — seeing your bookings, getting out of one, and being told when something changed.

Covers **BOOK-07, PAY-06, HOST-02, MANAGE-01, MANAGE-02, MANAGE-03**.

**In scope:**
- Booker and host bookings-management views — upcoming/past, full status lifecycle visible to both sides (MANAGE-01, MANAGE-02, HOST-02).
- Booker-initiated cancellation with a policy-driven refund, exact amount shown before confirming (BOOK-07, PAY-06).
- Host-selectable named cancellation policy tiers per listing, and the refund ladder that drives them.
- Host-initiated cancellation with defined consequences (ROADMAP SC#3).
- A hardened async transactional-email layer that never blocks the booking transaction (MANAGE-03, WR-04 deferred from Phase 6), plus an in-app notification centre and four reminders.
- A **booker-facing non-refundable service fee** (D-74) — introduced here because it funds the refund economics this phase creates.
- **Lifecycle expiry correctness fix** — all holds capped at `startsAt`, post-start actions refused, DB clock as sole authority (D-94).

**Out of scope (belongs to other phases):**
- Group bookings / RSVP — **Phase 8** (GROUP-01..05).
- SMS and web push notifications — deliberately deferred at D-82/D-89; revisit with real lapse-rate data.
- Dispute/chargeback workflow beyond the existing refund mechanism.
- Reviews & ratings, in-app messaging — out of scope project-wide.
- Any admin surface (FitOut has none today; D-90 deliberately avoids creating one).

> ⚠️ **This phase supersedes two prior locked decisions.** **D-74 supersedes the booker-facing half of D-50** ("no booker-facing fee line; breakdown stays subtotal = total") — a "Service fee" line now exists. The host-side half of D-50 is unchanged. **D-95 partially supersedes D-64** — the post-approval payment window moves 24h → 12h. Both are deliberate revisions made with the original rationale on the table, not drift.

</domain>

<decisions>
## Implementation Decisions

### Cancellation policy tiers (BOOK-07, PAY-06)

- **D-67:** **Host picks from 3 named tiers per listing** — Flexible / Standard / Strict — editable while hosting, mirroring D-61's booking-mode pattern. The tier is **snapshotted onto the booking at creation** (like `booking.bookingMode`) so a host retiering a listing never rewrites the refund terms of an in-flight booking. Benchmarks: Peerspace, Airbnb, and Giggster all use host-selected per-listing tiers.

- **D-68:** **Refund ladder anchored to hours-to-`startsAt`**, compressed for FitOut's real lead time (hourly sessions booked days out, not multi-night stays booked months out):

  | Tier | 100% refund | 50% refund | 0% |
  |---|---|---|---|
  | Flexible | ≥12h before start | — | <12h |
  | Standard | ≥24h | 24h→6h | <6h |
  | Strict | ≥48h | 48h→24h | <24h |

  Rejected industry-standard windows (Strict at 7 days) because a 7-day full-refund rung would make Strict listings effectively never refundable at FitOut's lead time — the tier would stop being a tier.

- **D-77:** **No default tier.** The listing wizard **requires an explicit choice** before publishing — this is not a setting that should be set by accident. Deliberately breaks the D-62 precedent of defaulting to the most booker-friendly option.

- **D-81:** **Policy surfaced on the listing detail page AND at checkout**, expandable to the actual rungs with **concrete dates for this booking** ("Free cancellation until Thu 3 Jul, 8:00 PM") rather than abstract percentages. Host side: plain-language tier descriptions in the wizard. A refund promise the booker demonstrably saw is the only kind enforceable in spirit.

### Cancellation money mechanics (PAY-06)

- **D-69:** **The retained (non-refunded) portion becomes the booking's gross.** Everything downstream is unchanged: host receives retained − 10% commission, platform keeps 10%, platform absorbs the gateway fee per D-52. ₱1,000 @ 50% → booker ₱500, host ₱450, platform ₱50 gross / ~₱25 net. **Zero new mechanism** — the payout sweep reads a smaller gross on the existing ledger row.

- **D-78:** **Full itemised breakdown before confirming** (satisfies SC#2's "exact refund amount before confirming", and then some): amount paid, which tier applies and why, the rung hit, the space-price refund, the **service fee explicitly marked non-refundable**, and the final amount back. Server-computed, zero client arithmetic, matching the Phase-4 `PriceBreakdown` contract.

- **D-79:** **A partially-refunded cancellation keeps the single `cancelled` enum status**; refund and retained amounts live as **columns on the booking row** and render as secondary detail ("Cancelled — ₱500 refunded"). Rejected a distinct `cancelled_partial` status: every new enum value forces an audit of the GiST `EXCLUDE` predicate, both lazy-expiry sweeps, and the read model — real correctness risk (D-21 keystone) for a display convenience.

- **Cancellation is permitted only before `startsAt`.** This **structurally eliminates the payout clawback problem**: payout isn't eligible until `endsAt + 24h` (D-55), so a refund is always just a platform-wallet refund with the host never yet paid — exactly the property D-60 relied on.

### Host-initiated cancellation (ROADMAP SC#3)

- **D-70:** **Consequences = 100% refund + audit record + auto-block + fee.** The booker gets everything back regardless of tier; the cancellation is recorded against the host; the freed window is **auto-blocked on that listing** (reusing the Phase-3 `availability_block` machinery) so a host can't cancel and immediately resell the same slot at a higher price — the actual abuse vector; and a cancellation fee is charged.
  - **Rationale continuous with D-63:** the user rejected capture-now→refund-on-decline because a host *rejection* is the one reversal nobody can be fairly billed for. A host cancelling an **already-confirmed** booking is the opposite case — a broken commitment the booker paid for — so they *can* fairly be billed, and the fee self-funds the ~2.5% the platform would otherwise eat for nothing.

- **D-71:** **Fee = flat, single, config-tunable amount** (`HOST_CANCEL_FEE_CENTS`, beside `COMMISSION_RATE_BPS`), **capped at the booking value** so it can never exceed what the host would have earned. Collected as a **signed debit row on `host_payout_ledger`**, netted against the host's next payout; written off if they never host again. No collections process, no card on file.
  - **Accepted tradeoff:** a flat fee is ~50% of a ₱600 court booking and ~10% of a ₱3,000 gym day. Config-tunable specifically so real cancellation data can move it.

- **D-80:** **Hosts CAN cancel through the UI**, behind a confirm dialog stating consequences plainly (booker refunded in full, ₱X charged, this window blocked) — **deliberately more friction than the booker's cancel**, because a host breaking a confirmed booking is the more damaging event. Without this, D-70's apparatus has no trigger and SC#3 has no product path.

### Service fee (supersedes booker-facing half of D-50)

- **D-74:** **A booker-facing non-refundable service fee is introduced.** This **supersedes the booker-facing half of D-50** ("no booker-facing fee line — breakdown stays subtotal = total"). The **host-side half of D-50 is unchanged**: commission is still a 10% host-side deduction and the host still receives `space price − 10%`. The fee funds the gateway-fee bleed a 100%-refund cancellation creates (PayMongo does not return its ~2.5% on a refund — the same fact that drove D-63).

- **D-73:** **The line is labelled "Service fee."** The user's initial framing was "Taxes and fees"; Claude pushed back — it is not a tax, labelling platform revenue as a government levy is inaccurate to customers, it is the specific pattern junk-fee rules (US FTC, EU/UK) and PH DTI price-display requirements target, and it is the one moment in a flow otherwise optimised for booker trust that isn't straight with the booker. User accepted. Airbnb landed on a named "service fee" line after the same pressure.

- **D-76 / D-74 shape:** **5%, as basis points** (`SERVICE_FEE_BPS`), computed on the space price using the existing integer-cents `computeCommission` idiom. A percentage tracks the ~2.5% gateway cost it exists to fund at every price point, which a flat fee structurally cannot. Total platform take ≈15% gross / ~12.5% net — in line with Peerspace, below Airbnb's combined ~17%.

- **D-75:** **Search results and listing pages display the ALL-IN total** including the service fee; the breakdown is revealed at checkout. The number never goes up between browsing and paying. This is where regulation has landed everywhere it has been tested (EU, UK, California), and Airbnb defends fee-inclusive display today after losing the argument publicly.

### QRPh refunds

- **D-72:** **A collect-and-never-store refund form.** On cancelling a QRPh booking the booker gets a form — institution picked from PayMongo's `GET /v2/transfers/receiving_institutions`, account name, account number — which passes **straight through** to `createBatchTransfer(provider: "instapay")` and is **never persisted**; only the transfer ID and a masked last-4 are kept. Destination bound to the authenticated booker + that specific booking; amount server-frozen at the computed refund.
  - **Origin:** the user proposed this, explicitly to avoid handling bookers' financial information. Research finding: **PayMongo has no hosted recipient form** — confirmed in two separate docs; the sender always supplies account name, number, and institution. So the form must be FitOut's, and the storage-avoidance is what preserves the user's intent.
  - **Risk profile:** not card data, so **PCI-DSS does not apply**. It *is* personal financial data under the PH Data Privacy Act (RA 10173). The material risk is **payout redirection** (a hijacked session changing the destination), mitigated by binding destination to the authenticated booker + booking and server-freezing the amount.
  - **⚠️ CONTINGENT — see the gating research task below.** If QRPh turns out to be API-refundable today, **this is not built at all.**

### Notification channels & reliability (MANAGE-03, WR-04)

- **D-82:** **Channels for v1 = hardened email + an in-app notification centre.** No SMS, no web push. Web push was rejected specifically because iOS Safari only delivers to *installed PWAs*, leaving a silent gap for a large share of mobile demand — an "unmissable" notification that is invisible to some users is worse than none, because the payment window would be designed assuming it works.

- **D-83:** **Email hardening via Inngest event-driven sends.** A server action emits an Inngest event and returns immediately; an Inngest function performs the send with automatic retry, backoff, and per-run observability. Inngest is **already mounted** at `/api/inngest` with three crons and a fail-closed prod guard — this adds functions, not infrastructure. Satisfies MANAGE-03's "never blocks the booking transaction".

- **D-84:** **In-app freshness via a bounded `router.refresh()` poller**, reusing the exact idiom already shipping in `pending-payment-state.tsx` (05-03), pausing when the tab is hidden. **TanStack Query is NOT installed and is not being added** — the app stays server-authoritative.

- **D-86:** **A real `notification` table** (recipient, type, payload, read-at, created-at) — supports unread counts, mark-as-read, and durable history that survives the underlying booking changing state. It is also the natural second write target for the Inngest functions already sending email.

- **D-91:** **In-app coverage is at parity with email** — one Inngest event fans out to both channels, so they cannot drift and there is no per-event judgement call to maintain.

- **D-92:** **A bell with unread badge in the SHARED header, spanning both modes.** One FitOut account is both booker and host (AUTH-04), so a notification is never invisible because the user was in the wrong mode. The D-65 pending-request count badge stays alongside it as a host-specific action nudge.

- **D-90:** **Permanently-failed sends surface via Inngest run history + a `recordAudit` `needs_attention` row** on final exhaustion — the same operator-alert channel already used for QRPh refunds (D-58) and payout failures (05-05b). No new admin surface.

### Reminders

- **D-85:** **Four reminders ship** — (1) pre-expiry: approved but unpaid, (2) pre-session: booker, (3) pre-session: host, (4) pre-SLA: host with a pending request.

- **D-87:** **One reminder each** — no double-tap, including on pre-expiry.

- **D-88:** **No notification preferences in v1.** Everything is transactional — tied to a booking the user themselves created — so it sits outside marketing-consent regimes (PH DPA, CAN-SPAM, GDPR all treat transactional mail this way).

### The coupling decision (the phase's central tradeoff)

- **D-89:** **Channel stack kept as-is; the payment window is therefore FORGIVING, not fast.**

  The user's own Phase-6 insight was that *window length and notification strength are coupled* — a short payment window makes a missed notification fatal. Stacking D-82 (no SMS/push), D-87 (single reminder), and D-84 (in-app only helps someone with the app open), the notification stack is **reliable but not unmissable**. By the user's own logic, the fast 15-minute window they originally favoured is **not safe on this stack**.

  This was surfaced explicitly and the user re-confirmed the stack anyway, on the reasoning that **pay-on-approval means a lapsed approval costs a slot, never money** (D-63), and real lapse-rate data is worth more than guessing. **SMS for the "approved — pay now" event is the designated fast-follow.**

### Lifecycle expiry correctness (carried from the Phase-6 UX thread)

- **D-94:** **One invariant, enforced everywhere: no hold ever outlives its own session.** `expires_at = LEAST(now() + window, starts_at)` applied to **all three** — the request SLA, the approval payment window, and the instant-book hold. Approve, confirm, and pay are all **refused once `starts_at` has passed**. `units.ts:264` switches off the JS clock (`Date.now()`) to DB `now()`, so the DB clock is genuinely the sole expiry authority.
  - **The gap was wider than reported.** `host-requests.ts:174` had the uncapped approval window (a 2pm approval of a 5pm session stayed payable until 2pm the next day). `units.ts:264` has the **identical bug in the higher-traffic instant-book hold path**, plus the JS-clock inconsistency.

- **D-93:** **Two guards** so the cap can never produce a useless window: a minimum lead time to *create* a request, and a minimum remaining window to *approve* (below which the request auto-declines with an honest "too close to start" message to both sides). Both config constants beside `APPROVAL_SLA_HOURS`.

- **D-96:** **Guards are mode-scoped, and time splits proportionally when capped.**
  - The **2h minimum lead time applies to request-to-book ONLY** — it needs *two humans in sequence* (host approves, then booker pays). **Instant-book gets its own ~30min checkout-sized guard** — one person, one checkout. Same-day instant-book stays available.
  - **When the session-start cap bites, remaining time is split rather than consumed by the host**: host SLA = `min(24h, half the time to start)`, booker window = the rest, with the **1h minimum approve window as a floor**. A request 4h out gives the host 2h and the booker 2h — not the host 3h59m and the booker one minute.

- **D-95:** **24h SLA, 12h payment window** (partially supersedes D-64's 24h/24h). Worst-case request-to-book slot hold is now `min(36h, time-to-start)`, down from a flat 48h.

- **D-97:** **One-click re-request on lapse** when the slot is still free — a calm "this approval expired" state plus a single button resubmitting the same window, no re-picking or re-navigating. From the user's own Phase-6 thread; the cheapest recovery from exactly the failure mode D-89 accepted.

- **D-98 / D-100:** **Lead-time-blocked slots render unselectable in `SlotPicker`** with a reason ("too soon to request — needs 2h notice" / "too soon to book — needs 30min"), extending the existing occupied/blocked/past machinery from 03-05. Both modes use the same mechanism with different reason text. **The server still re-validates at submit — the UI is a courtesy, never the gate** (Security V4).

- **D-99:** **A cap-shortened SLA shows a reason.** `RequestCountdown` (06-08) already renders arbitrary durations; when the deadline comes from the cap rather than the flat 24h, the row adds a short explanation ("session starts in 4h — respond soon") so a host doesn't read varying deadlines as inconsistency.

### Bookings views (MANAGE-01, MANAGE-02, HOST-02)

- **D-101:** **Separate `/bookings` and `/host/bookings`.** Follows the route-group split used for six phases, so the host page inherits the owner-scoped RSC + defense-in-depth `canHost` re-gate pattern from `/host/earnings` verbatim. Rejected a unified route specifically because it would move the ownership gate off the `(host)` group — the class of thing Security V4 warns about.

- **D-102:** **`completed` is derived at read time**, not stored — a `confirmed` booking whose `endsAt` has passed displays as Completed. Zero cron, zero writes, cannot drift, and **cannot race the occupancy predicate**. MANAGE-02 requires the lifecycle be *visible* to both sides, which this satisfies. The `completed` enum value (unused since Phase 3) stays unused.

- **D-103:** **Tabs — Upcoming / Past**, Upcoming default. Cancelled and declined bookings live under Past, since they're equally inert.

- **D-104:** **Primary action only inline**, everything else on the detail page. A row surfaces at most its one obvious next action ("Pay now" on an approved booking; Approve/Decline on a host request, as `/host/requests` already does). **Cancel is NOT inline** — it routes to detail where D-78's itemised breakdown can be shown before confirming. Irreversible money actions stay behind the disclosure they require.

- **D-105:** **Side-specific rows on a shared shell.** Both sides use the desktop-table/mobile-card shell from `PayoutRow`/`RequestRow`, with different content. Booker: space photo + title, venue-local date/time, status badge, amount paid. Host: booker name, listing, venue-local date/time, status badge, payout state — **reusing `derivePayoutLedgerView` badges from 05-06** so payout status reads identically to `/host/earnings`.

- **D-106:** **"Load more"**, reusing the Phase-4 search idiom. Matters most on the Past tab, where history accumulates without bound.

### Claude's Discretion (defer to research/planner)

- **Cancelling an unpaid `requested`/`approved` hold** — no money moves; it just frees the slot. Planner picks whether this reuses the cancel flow or the existing decline/release path.
- **Refund-preview computation placement** — a pure function over (snapshotted tier, `startsAt`, `now()`, amounts), mirroring `computeCommission`/`derivePayoutLedgerView`; planner picks the module.
- **Host-side filtering of `/host/bookings` by listing** — useful for multi-listing hosts, not decided.
- **Notification table payload shape** — typed discriminated union vs JSON blob; planner's call.
- **Exact reminder offsets** — config constants; planner picks defaults consistent with D-95's window values.
- **Email templating** — plain HTML strings (current `email.ts` idiom) vs React Email; D-66 left this open and it stays open.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-7 scope & requirements
- `.planning/ROADMAP.md` § Phase 7 — goal + 4 success criteria. SC#2 ("named cancellation policy tier") and SC#3 ("defined consequences") are directly implemented by D-67/D-68 and D-70/D-71/D-80.
- `.planning/REQUIREMENTS.md` — **BOOK-07, PAY-06, HOST-02, MANAGE-01, MANAGE-02, MANAGE-03**. Also § "Open Product Decisions → Cancellation/refund policy specifics", which this phase closes.
- `.planning/.continue-here.md` § "Phase 7 UX Design Thread" — the four exploratory inputs that seeded this discussion (feeds don't live-update; the window ⇄ notification coupling; payment-window models A/B/C; the `starts_at` cap correctness gap). All four are resolved above.

### Payments architecture (authoritative)
- `CLAUDE.md` § "Marketplace Payments — Prescriptive Detail" — D-20 PayMongo rails, hold-until-session, `Idempotency-Key` on POSTs, `Paymongo-Signature` HMAC verification, never pay the host at booking time.
- `.planning/phases/05-payments-payouts/05-CONTEXT.md` — **D-50** (commission host-side — ⚠️ **booker-facing half superseded by D-74**), **D-51** (10% config-tunable, frozen at payout), **D-52** (platform absorbs gateway fee), **D-55** (payout T+24h after `endsAt` — the reason cancellation has no clawback), **D-57** (webhook = confirm authority, single writer), **D-58** (never keep money for an undeliverable slot; QRPh operator-alert — ⚠️ **premise must be re-verified, see gating task**), **D-59** (payout state vocabulary), **D-60** (refund mechanism exists; policy was always Phase 7).
- `.planning/phases/06-full-booking-payment-integration/06-CONTEXT.md` — **D-61** (host picks mode per listing, editable — the pattern D-67 mirrors), **D-63** (pay-on-approval; nothing ever reversed — the reason a lapse costs a slot not money), **D-64** (SLA + payment window — ⚠️ **payment window superseded by D-95**), **D-65** (`/host/requests` pattern + pending-count nudge), **D-66** (five lifecycle emails over `email.ts`; hardening deferred to this phase).
- `.planning/PROJECT.md` § Key Decisions — **D-20** (PayMongo), **D-21** (units occupancy model — the correctness keystone D-79 and D-102 protect).

### Correctness foundations
- `.planning/phases/03-availability-the-double-booking-guarantee/03-CONTEXT.md` + `drizzle/0005`, `drizzle/0012` — the `booking_no_overlap` GiST `EXCLUDE` constraint and its occupying-status set. **Any status or predicate change must be audited against this.**
- `.planning/phases/04-booking-core-search-no-payment/04-CONTEXT.md` — D-46 (`DISPLAY_CURRENCY = php`), D-47 (`HOLD_TTL_MINUTES = 15`), D-48 (lazy-expiry occupancy), D-49 (frozen `quotedTotalCents` — ⚠️ **splits into two values under D-74**), plus the `createPendingHold` / `confirmBooking` seam.
- `.planning/phases/06-full-booking-payment-integration/06-SECURITY.md` — 31/31 threats closed; the trust boundaries (owner-gating, IDOR, server-authoritative money) carry directly into every new surface here.
- `.planning/phases/06-full-booking-payment-integration/06-VERIFICATION.md` — how Phase 6 was verified, incl. the G-06-01/02 webhook-signature history.

### PayMongo disbursement research (new this phase — informed D-72)
- https://docs.paymongo.com/docs/money-movement-moving-money-with-api — `POST /v2/batch_transfers`, `GET /v2/transfers/receiving_institutions?provider=instapay`.
- https://docs.paymongo.com/docs/money-movement-send-money — destinations (PH banks **and** e-wallets), InstaPay ≤₱50k real-time / PESONet ≤₱10M; **explicitly confirms no hosted recipient form**.
- https://developers.paymongo.com/docs/send-money-step — Workflows `send_money` step.
- https://paymongo.help/en/articles/11926784-paymongo-workflows-overview — PayMongo Workflows product.

### Code Phase 7 extends
- `src/app/actions/host-requests.ts:174` — the uncapped `expires_at` (D-94 fix site).
- `src/lib/availability/units.ts:264` — the **same uncapped bug** in `placeHold`, plus `Date.now()` instead of DB `now()` (D-94 fix site). `HOLD_TTL_MINUTES` at :119.
- `src/lib/payments/config.ts` — the named-constant home for `SERVICE_FEE_BPS`, `HOST_CANCEL_FEE_CENTS`, the two guard values, and reminder offsets. Never hardcode at a call site.
- `src/lib/payments/commission.ts` — the integer-cents `computeCommission` idiom D-76 and the refund calculator follow.
- `src/lib/paymongo.ts` — `createRefund` (:226), `createBatchTransfer` (:266, currently `inhouse` only — D-72 adds an `instapay` destination path), `listWalletAccounts`, `getTransfer`.
- `src/lib/email.ts` — five lifecycle sends (`sendBookingConfirmed`, `sendRequestReceived`, `sendRequestApproved`, `sendRequestDeclined`, `sendNewRequestToHost`). D-83 moves these behind Inngest; D-85 adds four reminders.
- `src/inngest/functions/` — `payout-sweep.ts`, `payout-reconcile.ts`, `request-expiry.ts`. The DB-clock `queryDue…` → status-scoped `RETURNING` claim idiom is what reminders must clone.
- `src/app/bookings/[id]/page.tsx` — existing booker detail with `pending`/`requested`/`approved`/`declined`/`cancelled` branches; gains the cancel flow and D-97's lapse state.
- `src/components/booking/`, `src/components/host/` — `PriceBreakdown` (reserved fee slot), `RequestCountdown`, `PayoutRow`, `RequestRow`, `derivePayoutLedgerView`.
- `src/lib/db/schema.ts` — `bookingStatus` enum (:331, `completed` unused), `booking` (:414), `host_payout_ledger`, `availability_block`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`PriceBreakdown` has a documented RESERVED fee slot** (Phase 4) with zero client arithmetic — D-74's service-fee line drops into a slot the code already anticipated.
- **`createBatchTransfer` already exists** for `inhouse` host payouts — D-72's booker refund is the *same endpoint* with `provider: "instapay"` and a bank/e-wallet destination. Not a new integration.
- **Bounded `router.refresh()` poller** in `pending-payment-state.tsx` (05-03) — the proven idiom D-84 reuses; no new dependency.
- **`RequestCountdown`** (06-08) already renders arbitrary hour-scale durations — D-99's varying deadline needs no new component.
- **`availability_block`** (Phase 3) — D-70's auto-block of a host-cancelled window reuses it directly.
- **`derivePayoutLedgerView` / `PayoutRow` / `RequestRow`** (05-06, 06-08) — the desktop-table/mobile-card shell and badge vocabulary D-105 clones.
- **`/host/earnings`** — the owner-scoped `(host)` RSC pattern `/host/bookings` clones verbatim (D-101).
- **Inngest with three crons + fail-closed prod guard, already mounted** — D-83 and D-85 add functions, not infra.
- **"Load more"** on Phase-4 search — the paging idiom D-106 reuses.
- **`SlotPicker`** (03-05) already renders occupied/blocked/past as unselectable — D-98/D-100 add a fourth reason to existing machinery.

### Established Patterns
- **The GiST `EXCLUDE` constraint is the sole double-booking authority** — D-79 and D-102 are both shaped to avoid touching the occupying-status set.
- **The DB clock (`now()`) is the sole expiry authority** — D-94 makes this actually true by fixing the one place (`units.ts:264`) that used the JS clock.
- **Owner-gated `(host)` routes re-check ownership in the action/RSC** — the route group is NOT the gate (Security V4). Applies to `/host/bookings` and every cancel action.
- **Server-authoritative money and state** — refund amounts, tier evaluation, and fee math are all server-computed and never trusted from the client.
- **Config-as-named-values** (`src/lib/payments/config.ts`) — every new number in this phase joins it.
- **Integer minor units (cents), never float.**
- **Fire-and-forget sends are the current anti-pattern** — D-83 is precisely the fix.

### Integration Points
- **New `/bookings` and `/host/bookings` routes** — neither exists today (`/bookings/[id]` is detail-only).
- **New `notification` table + bell in the shared header** — first notification surface in the app.
- **Cancel actions** (booker + host) — new server actions; both owner-gated, both writing refund/retained columns.
- **`listing.cancellationPolicy` + `booking.cancellationPolicy` snapshot** — new columns; the wizard gains a required step (D-77).
- **`host_payout_ledger` gains signed amounts** — D-71's debit rows; touches the at-most-once `ON CONFLICT` claim in `payout-sweep`.
- **Phase-4 surfaces get the all-in price** (D-75) — search cards, listing detail, `PriceBreakdown`.
- **Inngest gains** email-send functions (D-83) and four reminder crons (D-85).

</code_context>

<specifics>
## Specific Ideas

- **The QRPh refund form is the user's own design.** They proposed it unprompted, with the explicit constraint *"I don't want to handle these people's financial information."* PayMongo has no hosted form, so the collect-and-never-store shape is what preserves that intent — keep the no-persistence rule load-bearing, not an optimisation. Their instinct that PayMongo has "workflows" that could execute behind it was **correct down to the product name**.

- **"Service fee", not "Taxes and fees".** The user's first framing was the latter; Claude pushed back and the user accepted. Worth preserving *why*, so it doesn't drift back: it isn't a tax, and every other decision in this phase optimises for booker trust. Don't let a future copy pass re-bundle it.

- **D-89 is the phase's central tradeoff and it was made with eyes open.** The user identified the window ⇄ notification coupling themselves in Phase 6, was shown explicitly that the chosen channel stack makes their preferred fast window unsafe, and re-confirmed anyway on the D-63 reasoning that a lapse costs a slot rather than money. **Do not "fix" this by quietly shortening the window** — the forgiving window is the deliberate consequence of the channel decision. SMS is the designated fast-follow.

- **The user reasons from economics first.** The Phase-6 debate that produced D-63 turned on who can fairly be billed for a reversal; D-70's host-cancellation fee is the same lens applied to the opposite case. Frame money decisions this way — it's how the decisions actually get made.

- **Benchmarks land better than abstractions.** Every tier, ladder, and channel decision here moved once a Peerspace / Airbnb / Giggster / Grab comparison was on the table. Lead with how comparable apps do it.

</specifics>

<deferred>
## Deferred Ideas

- **SMS notifications** for "approved — pay now" (and possibly pre-expiry) → **fast-follow after launch data.** Deferred at D-89. Would make a short payment window safe and is the single highest-value notification upgrade available. Needs a vendor (Semaphore/Movider/Twilio) and phone-number collection + verification, which FitOut does not do today.
- **Web push** → rejected for v1 at D-82 (iOS Safari only delivers to installed PWAs). Revisit if PWA install becomes part of the product.
- **Per-type / per-channel notification preferences** → deferred at D-88. Will matter once a multi-listing host is receiving high volume.
- **Dedicated failed-notifications admin view** → deferred at D-90. FitOut has no admin surface at all; creating the first one is its own scope.
- **Dedicated `/notifications` full-history page** → deferred at D-92; the dropdown serves v1 volume.
- **Acknowledgment-triggered payment window (Model C)** — start the booker's pay clock when they *open* the approval rather than when the host clicks. Superseded by D-89's forgiving window; genuinely attractive if SMS ever lands.
- **Percentage or proximity-tiered host cancellation fee** → D-71 chose a flat amount; the config constant makes revisiting cheap once cancellation data exists.
- **Dispute / chargeback workflow** beyond the existing refund mechanism → still future (carried from Phase 5).
- **Group bookings / RSVP** → **Phase 8** (GROUP-01..05).

</deferred>

<gating_research_task>
## ⚠️ Gating research task — settle before planning D-72

**Re-verify D-58's claim that QRPh payments cannot be API-refunded.**

That claim entered the repo during Phase 5 and drives the entire QRPh refund-form design (D-72). During this discussion, PayMongo's refund documentation stated that payments with status `paid` are refundable via dashboard or API and listed **no QRPh exclusion** — but two relevant doc pages returned 404, so it could not be confirmed either way.

**If QRPh is API-refundable today, D-72 is not built at all** — QRPh cancellations use the same `createRefund` path as every other rail, and the form, the DPA exposure, the payout-redirection risk, and the failed-transfer recovery UX all disappear.

**One test-mode API call settles it.** This is the highest-leverage item in the phase's research pass and should run first.
</gating_research_task>

---

*Phase: 07-bookings-management-cancellation-notifications*
*Context gathered: 2026-07-21*
