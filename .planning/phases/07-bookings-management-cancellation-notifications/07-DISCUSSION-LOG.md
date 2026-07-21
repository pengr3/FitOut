# Phase 7: Bookings Management, Cancellation & Notifications - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-21
**Phase:** 07-bookings-management-cancellation-notifications
**Areas discussed:** Cancellation policy & refund math · Notification reliability & async email · Payment window + session-start cap · Bookings views both sides

---

## Cancellation policy & refund math

### Who sets the tier, how many tiers

| Option | Description | Selected |
|---|---|---|
| Host picks, 3 tiers | Flexible/Standard/Strict per listing, editable while hosting; mirrors D-61 | ✓ |
| Platform-fixed single policy | One rule for all listings; column still lands for later | |
| Host picks, 2 tiers | Flexible/Strict only; less choice paralysis | |

**Notes:** Asked twice — the user requested a return to this question after the ladder question, was shown the full implementation surface it commits to (column, wizard step, listing-page display, three ladders to explain), and re-confirmed the same choice. → D-67

### Refund ladder shape

| Option | Description | Selected |
|---|---|---|
| 3 rungs, tighter windows | Flexible 12h · Standard 24h/6h · Strict 48h/24h | ✓ |
| 3 rungs, industry-standard | Flexible 24h · Standard 48h/24h · Strict 7d/48h | |
| Binary 100%/0% | One cutoff per tier, no partial rung | |

**Notes:** First presentation of this question was dismissed; re-asked after the tier question was revisited. Deciding argument: at FitOut's 1–3 day lead time, a 7-day Strict rung makes Strict listings effectively never refundable — the tier stops being a tier. → D-68

### Where the retained portion goes

| Option | Description | Selected |
|---|---|---|
| Normal split — retained is the gross | Host gets retained − 10%; platform absorbs gateway fee | ✓ |
| Host keeps 100% of retained | Platform waives commission on cancellations | |
| Platform keeps 100% of retained | Covers platform costs; host gets nothing | |

**Notes:** Chosen for zero new mechanism — the payout sweep just reads a smaller gross. → D-69

### Host-cancellation consequences

| Option | Description | Selected |
|---|---|---|
| Record + auto-block | Audit row + block the freed window; no fee | |
| Record + auto-block + fee | Airbnb model; fee deducted from next payout | ✓ |
| Record only | Log for future policy; no block, no fee | |

**Notes:** Framed against the user's own D-63 reasoning — a host *rejection* can't be fairly billed, but a host cancelling an already-confirmed booking can. → D-70

### Host cancellation fee shape & collection

| Option | Description | Selected |
|---|---|---|
| % tiered by proximity | 10%/25%; scales across FitOut's price range | |
| Flat, tiered by proximity | ₱200/₱500, literal Airbnb model | |
| Flat, single amount | One number regardless of proximity | ✓ |
| Carry as debit, net against future payouts | Signed ledger row; written off if uncollected | ✓ |
| Carry as debit + gate bookability | Also blocks listings until settled | |
| Only collect if payout available | No balance concept; waive otherwise | |

**Notes:** Asked once, then re-asked verbatim at the user's request after an interruption; the collection answer changed between passes (waive-if-unavailable → carry-as-debit), the fee shape did not. Resulting combination is a simple policy on robust plumbing. Recorded tradeoff: a flat fee is ~50% of a ₱600 booking and ~10% of a ₱3,000 one — hence the cap-at-booking-value constraint and the config-tunable constant. → D-71

### Who absorbs the ~2.5% on a full refund

| Option | Description | Selected |
|---|---|---|
| Platform absorbs it | Consistent with D-52 and D-50; free-cancellation as acquisition | |
| Refund minus the gateway fee | Booker gets ~97.5% on a "full" refund | |
| Non-refundable booking fee at checkout | Self-funding; reopens D-50's no-booker-fee stance | ✓ |

**Notes:** User selected the third option with their own framing — *"under a line item on checkout 'Taxes and fees'"*. Recorded as superseding the booker-facing half of D-50. **Claude pushed back on the label** (not the decision): it isn't a tax, labelling platform revenue as a government levy is inaccurate to customers, it is the specific pattern junk-fee rules (US FTC, EU/UK) and PH DTI price-display requirements target, and it undercuts the trust positioning every other decision in the phase optimises for. User accepted and chose "Service fee". → D-73, D-74

### Fee label

| Option | Description | Selected |
|---|---|---|
| "Service fee" | What Airbnb settled on after regulatory pressure | ✓ |
| "Booking fee" | Equally accurate, more concrete | |
| "Taxes and fees" | User's original wording; advised against | |

→ D-73

### QRPh refunds

| Option | Description | Selected |
|---|---|---|
| Refund form, collect-and-never-store | Pass-through to createBatchTransfer(instapay) | ✓ |
| Drop QRPh from checkout in v1 | Cards/GCash/Maya only; problem disappears | |
| Manual operator refund | Extend D-58's needs_attention path | |
| Let's talk it through first | (selected on the first pass) | |

**Notes:** User initially chose to talk it through, then proposed the refund-form design themselves, explicitly to avoid handling bookers' financial information, and asked whether PayMongo offers it. Claude researched: PayMongo **does** have Disbursements, `POST /v2/batch_transfers` with `instapay`/`pesonet` to PH banks and e-wallets, `GET /v2/transfers/receiving_institutions`, and a **Workflows** product with a `send_money` step (the user's "workflows" instinct was correct down to the product name) — but **no hosted recipient form**, confirmed in two separate docs. Hence collect-and-never-store as the shape that preserves the user's intent. Claude also flagged that D-58's premise could not be confirmed (refund docs list no QRPh exclusion; two pages 404'd) → recorded as a gating research task. → D-72

### Service fee shape, rate, and price display

| Option | Description | Selected |
|---|---|---|
| % of booking, config-tunable | Basis points; tracks the gateway cost it funds | ✓ |
| Flat ₱, config-tunable | Predictable but doesn't track the cost | |
| % with floor and cap | Guarantees coverage at both ends | |
| 5% | ~15% gross / ~12.5% net total take | ✓ |
| 3% | Barely above gateway cost; no buffer | |
| 8% | ~18% gross; above Airbnb's combined rate | |
| All-in total in search | Price never rises between browsing and paying | ✓ |
| Space price, fee at checkout | Lower search prices; fee discovered late | |
| Show both | Rate plus "total from" | |

→ D-74, D-75, D-76

### Default tier for new listings

| Option | Description | Selected |
|---|---|---|
| Flexible | Applies the D-62 demand-first precedent | |
| Standard | Balanced middle | |
| No default — wizard requires a choice | Host must consciously pick | ✓ |

**Notes:** Deliberately breaks the D-62 pattern. Migration wrinkle flagged: existing rows still need a backfill value. → D-77

### Refund preview & partial-cancel status

| Option | Description | Selected |
|---|---|---|
| Full itemised breakdown | Paid, tier, rung, refund, non-refundable fee, total back | ✓ |
| Amount + one-line reason | Satisfies SC#2, stays scannable | |
| Amount only | Cleanest dialog; leaves the fee gap unexplained | |
| Single `cancelled` + row detail | Keeps the enum small; refund amounts as columns | ✓ |
| `cancelled` vs `cancelled_partial` | Lifecycle distinguishes them; enum audit required | |

**Notes:** Claude raised the honesty problem the service fee created — a "100% refund" now returns 100% of space price and 0% of the fee. → D-78, D-79

### Host cancel UI & policy disclosure

| Option | Description | Selected |
|---|---|---|
| Yes, with deliberate friction | Consequences stated in confirm dialog | ✓ |
| Yes, no special friction | Symmetric with booker cancel | |
| No — support-only in v1 | Removes the flow; SC#3 loses its path | |
| Listing page + checkout with ladder | Concrete dates for this booking | ✓ |
| Named tier only, details on hover | Cleaner, rarely clicked | |
| Checkout only | Minimum surface; lands at peak commitment | |

→ D-80, D-81

---

## Notification reliability & async email

### Channels

| Option | Description | Selected |
|---|---|---|
| Hardened email + in-app centre | Inngest-backed sends + badge/list/unread | ✓ |
| Above + SMS for time-critical only | The genuinely unmissable channel in PH | |
| Above + web push | Free, but iOS Safari needs an installed PWA | |

**Notes:** Benchmarks presented (Airbnb, Grab/Foodpanda PH, Peerspace) with the PH-specific point that SMS is the reliable floor in this market. → D-82

### Email hardening & in-app freshness

| Option | Description | Selected |
|---|---|---|
| Inngest event-driven sends | Retry, backoff, observability; already mounted | ✓ |
| DB outbox + cron sweep | Transaction-tied, but hand-rolled retry | |
| try/catch + audit logging only | Records failures, never retries | |
| Bounded router.refresh poller | Reuses pending-payment-state.tsx idiom | ✓ |
| Add TanStack Query | Stack-prescribed; first client-state layer | |
| SSE endpoint | True real-time; most new infrastructure | |

**Notes:** Codebase check found TanStack Query is not installed but a bounded `router.refresh()` poller already ships. → D-83, D-84

### Reminders & persistence

| Option | Description | Selected |
|---|---|---|
| Pre-expiry: approved but unpaid | Direct fix for the ghosting case | ✓ |
| Pre-session: booker | 24h out; reduces no-shows | ✓ |
| Pre-session: host | Access/setup preparation | ✓ |
| Pre-SLA: host with pending request | Reduces auto-declines | ✓ |
| A real notification table | Unread state, mark-as-read, durable history | ✓ |
| Derive from booking state | No schema change; no unread state | |

→ D-85, D-86

### Cadence & preferences

| Option | Description | Selected |
|---|---|---|
| Double-tap the critical ones | Pre-expiry twice; session 24h + 2h | |
| One reminder each | Fewer sends, less naggy | ✓ |
| Planner decides from config | Keeps discussion moving | |
| No preferences in v1 | All transactional; outside consent regimes | ✓ |
| Global toggle for reminders only | Draws the line where the legal distinction sits | |
| Per-type preferences | Most respectful; most surface | |

→ D-87, D-88

### The coupling revisit

| Option | Description | Selected |
|---|---|---|
| Keep as-is — accept a forgiving window | Lapse costs a slot, not money (D-63) | ✓ |
| Add SMS for "approved — pay now" only | Makes a short window safe | |
| Double-tap pre-expiry only | Cheaper; still email-only | |
| Inngest dashboard + audit needs_attention | Same operator channel as QRPh/payout alerts | ✓ |
| Inngest dashboard only | Nothing to build; failures live elsewhere | |
| Dedicated failed-notifications admin view | Would be FitOut's first admin surface | |

**Notes:** Claude surfaced explicitly that D-82 + D-87 + D-84 leave the stack **reliable but not unmissable**, so by the user's own Phase-6 coupling insight the fast 15-minute window they originally favoured is not safe — and offered a revisit of either decision. User re-confirmed the stack. SMS recorded as the designated fast-follow. → D-89, D-90

### Coverage & placement

| Option | Description | Selected |
|---|---|---|
| Parity with email | One event fans out to both; cannot drift | ✓ |
| In-app superset | Richer history; two lists to maintain | |
| In-app subset — actionable only | Badge always means action; judgement per type | |
| Bell in shared header, spans both modes | One account is both (AUTH-04) | ✓ |
| Bell scoped to current mode | Cleaner contexts; misses behind a mode switch | |
| Bell + dedicated /notifications page | Complete history; extra route | |

→ D-91, D-92

---

## Payment window + session-start cap

### The squeeze and the fix scope

| Option | Description | Selected |
|---|---|---|
| Two guards — min lead time + min window | Prevents useless sub-minute windows | ✓ |
| Min window on approve only | Fixes the found case; wasted requests remain | |
| Allow any positive window | Correct but practically useless | |
| All lifecycle expiries + refuse post-start | One invariant everywhere; DB clock throughout | ✓ |
| Both hold paths, no post-start guard | Cap alone resolves most cases | |
| Just the reported gap | Leaves the same bug in instant-book | |

**Notes:** Claude inspected the code and found the gap was **wider than reported** — `units.ts:264` has the identical uncapped bug in the higher-traffic instant-book path, and uses the JS clock rather than DB `now()`. → D-93, D-94

### Window values and guard values

| Option | Description | Selected |
|---|---|---|
| Keep 24h SLA + 24h payment window | D-64 unchanged; cap does the work | |
| Keep 24h SLA, shorten payment to 12h | Halves worst-case hold for far-out bookings | ✓ |
| Shorten both to 12h | Tightest turnover; compounds lapse risk | |
| 2h lead, 1h min approve window | Preserves same-day bookability | ✓ |
| 4h lead, 2h min approve window | Better fits an email-only stack | |
| Planner decides | Product call more than implementation | |

→ D-95, D-96

### Revision: mode scoping and proportional SLA

| Option | Description | Selected |
|---|---|---|
| Scope it + proportional split when capped | 2h is request-to-book only; instant-book ~30min; remaining time split | ✓ |
| Scope it only — keep flat windows | Simplest; leaves the degenerate case live | |
| Scope it + drop lead time entirely | Max same-day; allows unapprovable requests | |

**Notes:** User challenged D-96 directly — *"why are we blocking bookings for the next 2 hours… is this only applicable for bookings that require request to book?"* Correct challenge: the scoping had been stated only inside an option description rather than as its own decision. The user also intuited that a flat SLA degrades badly under the cap (a host could consume all remaining time and leave the booker a minute), which produced the proportional split. → D-96 (revised)

### Lapse recovery & guard UX

| Option | Description | Selected |
|---|---|---|
| One-click re-request if still free | From the user's own Phase-6 thread | ✓ |
| Calm dead-end, start over | Nothing new to build | |
| Auto-re-request on lapse | Slot-hoarding by default | |
| Unselectable in SlotPicker with reason | Extends 03-05 machinery; server still gates | ✓ |
| Selectable, refused at submit | (selected on the first pass, before the D-96 revision) | |
| Show the rule up front on the listing | Easily skimmed | |

**Notes:** These two questions were answered, then re-asked at the user's request alongside the D-96 revision; the guard-UX answer changed between passes (refuse-at-submit → unselectable). → D-97, D-98

### SLA communication & instant-book guard UI

| Option | Description | Selected |
|---|---|---|
| Countdown + reason when cap-driven | RequestCountdown already renders any duration | ✓ |
| Countdown only, no explanation | Varying deadlines read as inconsistency | |
| Show nominal SLA and effective deadline | Two values on every row | |
| Same unselectable treatment, different reason | One mechanism, both modes | ✓ |
| No UI treatment — refuse at submit | Inconsistent with D-98 | |
| Fold both guards into one rule | Breaks one mode or the other | |

→ D-99, D-100

---

## Bookings views, both sides

### Route shape & completed transition

| Option | Description | Selected |
|---|---|---|
| Separate /bookings and /host/bookings | Inherits the (host) owner-gate pattern | ✓ |
| Unified /bookings with mode toggle | One URL; moves the gate off the route group | |
| Unified /bookings, no mode dependence | Nothing hidden; ambiguous cancel semantics | |
| Derive `completed` at read time | No cron, no writes, no occupancy risk | ✓ |
| Piggyback the payout sweep | Nearly free; couples completion to payout timing | |
| Dedicated Inngest cron | Accurate; touches the occupancy predicate set | |

→ D-101, D-102

### Layout, actions, row content, paging

| Option | Description | Selected |
|---|---|---|
| Tabs — Upcoming / Past | Airbnb Trips convention | ✓ |
| Sections on one page | Everything visible; unbounded scroll | |
| Filter dropdown | Flexible; hidden control | |
| Primary action only, rest on detail | Cancel routes to detail for D-78's breakdown | ✓ |
| All actions inline with dialogs | Irreversible action one tap from a list | |
| No inline actions | Buries the most time-sensitive action | |
| Side-specific rows, shared shell | Booker and host see what they can act on | ✓ |
| Identical rows both sides | Half the components; no home for booker identity | |
| Minimal rows | Tidy; drops what people actually scan for | |
| "Load more" (Phase-4 idiom) | Consistent; bounded initial render | ✓ |
| No paging in v1 | Degrades for your best users | |
| Numbered pagination | New pattern; awkward on mobile | |

→ D-103, D-104, D-105, D-106

---

## Claude's Discretion

- Cancelling an unpaid `requested`/`approved` hold — reuse cancel flow vs existing decline/release path.
- Refund-preview computation placement (pure function; module choice).
- Host-side filtering of `/host/bookings` by listing.
- Notification table payload shape — typed union vs JSON blob.
- Exact reminder offsets (config constants consistent with D-95).
- Email templating — plain HTML strings vs React Email (left open since D-66).

## Deferred Ideas

- SMS for "approved — pay now" and pre-expiry — designated fast-follow (D-89).
- Web push — rejected for v1 on iOS PWA-install gap (D-82).
- Per-type / per-channel notification preferences (D-88).
- Dedicated failed-notifications admin view (D-90).
- Dedicated `/notifications` full-history page (D-92).
- Acknowledgment-triggered payment window (Model C) — attractive if SMS lands.
- Percentage or proximity-tiered host cancellation fee (D-71 chose flat).
- Dispute / chargeback workflow beyond the refund mechanism (carried from Phase 5).
- Group bookings / RSVP → Phase 8.

## Process Notes

- Four questions were re-asked at the user's request (tier choice, ladder, fee shape + collection, lapse + guard UX). Two answers changed on the second pass — recorded above rather than silently overwritten.
- One user-proposed design (the QRPh refund form) triggered live research against PayMongo's docs; findings are in CONTEXT.md `<canonical_refs>`.
- One pushback was raised and accepted (the "Taxes and fees" label → "Service fee").
- One user challenge corrected a real gap in how a decision had been recorded (D-96 mode scoping).
