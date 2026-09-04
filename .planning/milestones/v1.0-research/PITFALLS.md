# Pitfalls Research

**Domain:** Two-sided fitness/recreational-space booking marketplace (Airbnb-style, real marketplace payments, group bookings)
**Researched:** 2026-06-03
**Confidence:** HIGH (Stripe Connect rules, Postgres concurrency, and timezone handling verified against official docs; marketplace liquidity/MVP findings MEDIUM, drawn from multiple credible sources)

> Phase names below are *topics*, not fixed roadmap entries — the roadmap doesn't exist yet. They map to natural build slices: **Search/Availability**, **Booking & Instant-vs-Request**, **Payments & Payouts**, **Group Bookings**, **Cancellation/Refund Policy**, **Trust & Safety / Ops**, **Launch/Liquidity**. Read "Phase to address" as "the slice that owns this concern."

---

## Critical Pitfalls

### Pitfall 1: Double-booking via check-then-act race conditions

**What goes wrong:**
Two bookers (or one booker double-clicking, or a booker + an instant-book + a request-to-book on the same slot) reserve the same space/time window. The system reads "slot is free," both pass the check, both write a booking. A host shows up to two groups for the same court. For FitOut this is the single most damaging failure: the PROJECT explicitly names double-booking and stale availability as "unacceptable failure modes for the core value."

**Why it happens:**
The naive flow is `SELECT to check availability` → application logic → `INSERT booking`. The gap between read and write is a race window. Under concurrency, both requests see the slot free. Developers test single-user happy paths and never see it. It also sneaks in through retries: a payment timeout triggers a client retry that creates a second booking. Hourly/daily granularity makes it worse — a "9–11am" booking and a "10am–noon" booking *overlap* but aren't equal, so naive equality checks miss the conflict entirely.

**How to avoid:**
- Enforce non-overlap at the **database level**, not in application code. In Postgres: `EXCLUDE USING gist (space_id WITH =, time_range WITH &&)` with `btree_gist`, using a `tstzrange` column. Postgres 18 also offers `WITHOUT OVERLAPS`. This makes overlapping bookings *impossible* regardless of concurrency — the DB rejects the second insert. (HIGH — verified against PostgreSQL docs and multiple implementations.)
- Use a **short-lived hold/reservation** (10–15 min) when a booker enters checkout, so the slot is tentatively claimed during payment. Release on expiry. The hold itself must also respect the exclusion constraint.
- Use **idempotency keys** on the booking-creation and payment endpoints so retries/double-clicks don't create duplicates.
- Treat `instant-book` and `request-to-book` against the same slot as competitors: a pending request must either hold the slot or be auto-declined when an instant-book takes it.

**Warning signs:**
Availability logic lives entirely in application code; bookings table has no overlap constraint; "available" is a boolean column rather than derived from actual booking ranges; no idempotency keys on POST /bookings; QA has never run a concurrent-booking test.

**Phase to address:**
Booking & Availability slice (foundational). The exclusion constraint and hold mechanism must exist *before* payments — money on top of a racy booking core multiplies the damage.

---

### Pitfall 2: Storing slot times wrong (timezone / DST / boundary bugs)

**What goes wrong:**
A booker sees "7:00pm" but the host sees "6:00pm"; someone shows up an hour off. During DST transitions, a recurring availability window shifts, a slot vanishes or duplicates, or an overnight booking computes the wrong duration (and therefore wrong price). Single-launch-region lulls teams into assuming "everyone's in one timezone" — until a booker travels, sets their laptop to another zone, or DST flips and the whole region's availability is off by an hour.

**Why it happens:**
Developers store naive local datetimes ("2026-11-01 09:00") with no zone, or store UTC but display without converting to the *space's* zone, or convert to the *browser's* zone (wrong — the slot is anchored to the physical space's local time). DST is invisible in testing because it happens twice a year. The single-region constraint actively *encourages* the shortcut of ignoring zones.

**How to avoid:**
- Store the canonical instant as **UTC (`timestamptz`)** for the booking range (used by the exclusion constraint and all backend filtering).
- **Also store the IANA timezone of the space** (e.g. `America/New_York`, never a fixed offset). The space's local time is the source of truth for *what the host listed* and *what the booker is buying*. Display always converts UTC → space timezone, and optionally shows the booker's own zone as a secondary label ("7:00pm venue time / 4:00pm your time").
- Compute availability windows in the space's local time, then materialize to UTC. For DST: skipped local times → advance to next valid time; ambiguous (fall-back) times → pick the first occurrence. (Pattern verified against Wix Bookings' documented DST handling.)
- Never persist offsets (`-05:00`) as a stand-in for a timezone — offsets change with DST.

**Warning signs:**
Datetime columns are `timestamp` (no zone) instead of `timestamptz`; no `timezone` column on the space/listing; times rendered from `new Date()` in the browser without explicit zone conversion; duration/price computed by subtracting local clock times; no test crossing a DST boundary.

**Phase to address:**
Search/Availability slice (data model decision — expensive to retrofit once bookings exist).

---

### Pitfall 3: Marketplace payment liability mistakes (refunds, chargebacks, transfer reversals)

**What goes wrong:**
A booker disputes a charge or gets a refund *after* the host has been paid out. The platform's Stripe balance gets debited for the refund/chargeback amount, but the money is already in the host's account — leaving the **platform eating the loss**. Or: refund is issued but the platform's commission (application fee) is silently kept, surprising the host. Or: the host's connected account has a negative balance the platform can't recover.

**Why it happens:**
Teams assume Stripe "handles payments" and don't internalize that **the platform is ultimately liable for chargebacks** (HIGH — verified against Stripe Connect docs). With destination charges, refunds debit the *platform* balance first; you must explicitly pass `reverse_transfer=true` to claw back from the host, and `refund_application_fee=true` to return your commission proportionally. None of this is automatic. Separate charges/transfers are worse — refunding the charge doesn't touch the transfer at all; you must reverse it manually.

**How to avoid:**
- Decide the **money flow model explicitly**: destination charges (`reverse_transfer=true`) keep the platform as merchant of record and simplify clawbacks — recommended for v1.
- **Delay host payouts** until after the booking occurs (and ideally a short window after) rather than paying out at booking time. Stripe explicitly recommends holding payouts until service delivery and extending delays (2+ weeks) for new hosts. This means the funds are still on-platform when most refunds/disputes happen.
- Subscribe to the `charge.dispute.created` **webhook** and reverse transfers immediately on dispute.
- On refunds, consciously choose whether commission is refunded (`refund_application_fee`) per your cancellation policy — and make that choice visible to hosts.
- Set `debit_negative_balances=true` where supported; otherwise plan for future-volume recovery.

**Warning signs:**
Payouts happen at booking confirmation rather than after service; no dispute webhook handler; refund code calls Stripe refund without `reverse_transfer`; no decision documented on who absorbs refunds; "the platform's Stripe dashboard balance keeps drifting negative."

**Phase to address:**
Payments & Payouts slice. Payout *timing* (delay-until-after-booking) is a first-class design decision here, not an afterthought.

---

### Pitfall 4: Stripe Connect host-onboarding friction kills supply

**What goes wrong:**
Hosts must complete a 10–15 minute KYC form (ID, bank details, tax info, business docs) before they can list — *before they've seen any value*. A large fraction abandon. On a supply-constrained new marketplace, every lost host directly shrinks the inventory that makes search results meaningful. Worse: a host lists, gets a booking, and *then* discovers they can't receive payout because onboarding is incomplete — now there's a confirmed booking with no payable host.

**Why it happens:**
Default Connect onboarding is front-loaded. Teams gate listing creation behind full payout-readiness, conflating "can list" with "can get paid." The compliance requirement is real, but its *timing* is a choice.

**How to avoid:**
- **Decouple "list a space" from "complete payout setup."** Let hosts create listings immediately; require Stripe onboarding completion before the listing goes *bookable* (or before first payout). Use Stripe's hosted/embedded onboarding to minimize friction.
- Surface onboarding status clearly and block bookability — never let a slot be bookable for a host who can't be paid.
- Consider deferred onboarding (platform holds funds for unverified hosts) only if the added complexity is justified; for v1, "list now, verify before bookable" is the simpler safe path.
- Monitor `account.updated` webhooks for `charges_enabled`/`payouts_enabled` transitions.

**Warning signs:**
Single mandatory wizard: "sign up → full KYC → then you can do anything"; no listing-draft state; host onboarding completion rate not instrumented; a booking can be created against a host whose `payouts_enabled` is false.

**Phase to address:**
Host listing slice + Payments slice (the boundary between them is exactly this pitfall).

---

### Pitfall 5: The cold-start / liquidity trap (empty marketplace)

**What goes wrong:**
Launch day: a booker searches and finds 3 spaces, none near them, none available this week. They leave and never return. Hosts who did sign up get no bookings, so they stop maintaining availability. The marketplace dies of emptiness — the classic chicken-and-egg deadlock. For FitOut this is existential: the core value ("search → see *real* availability → book") is hollow without local density.

**Why it happens:**
Teams build the full two-sided product and "open the doors," expecting organic balance. But buyers won't come without supply and hosts won't engage without demand. Spreading thin across many neighborhoods/activity types fragments the little liquidity you have.

**How to avoid:**
- **Seed supply first, manually.** Concierge-onboard hosts in *one tight geography and a few high-demand activity types* (the PROJECT already commits to single-region launch — go narrower still: a few neighborhoods). Density beats breadth.
- Pre-populate real, bookable availability for seeded hosts before any demand marketing — searches must return real results from day one.
- Don't measure success by signups; measure by **completed end-to-end bookings** and search-result density (searches that return ≥N bookable results).
- Resist multi-region/multi-vertical expansion until unit economics and liquidity are proven in the beachhead.

**Warning signs:**
Marketing spend on demand before supply is seeded; listings spread across a wide area with no local cluster; lots of signups but few completed bookings; high rate of searches returning zero bookable results ("zero-result searches" is the key liquidity metric).

**Phase to address:**
Launch/Liquidity slice + product strategy throughout. Not a code phase per se, but roadmap success criteria should include a liquidity/zero-result-search target, and the build should make manual host seeding easy (admin tooling to create listings + availability on a host's behalf).

---

### Pitfall 6: Over-building before the core transaction is validated

**What goes wrong:**
The team builds reviews, messaging, cost-splitting, recommendation engines, analytics dashboards, and native apps before a single real booking-and-payout has flowed end-to-end. Capital and time burn on features nobody has validated, while the one thing that must work — find → book → pay → host paid out — is shaky. 74% of failed startups scaled (built) too soon.

**Why it happens:**
Group cost-splitting, chat, and reviews feel like "the product." It's tempting to build the differentiator before the foundation. The PROJECT already wisely defers splitting, chat, and reviews — the pitfall is *re-adding* them under pressure, or gold-plating the items that are in scope.

**How to avoid:**
- Define "done" for v1 as: **the core transaction loop completes end-to-end without manual intervention** — booker searches, sees real availability, books, pays; host gets paid out minus commission. Everything else is secondary.
- Honor the PROJECT's Out-of-Scope list (no splitting, no chat, no reviews, no native apps, single region) as a *contract*, not a suggestion.
- Build group bookings in the deliberately-simple v1 form (organizer pays + RSVP/headcount) — don't let it balloon into payment-splitting.
- Sequence: prove the single-booker paid transaction *first*, then layer group bookings on top.

**Warning signs:**
Backlog fills with differentiators before the paid-booking loop works end-to-end; "we'll need messaging for this" scope creep; building admin analytics before there's data; group-booking design drifting toward per-attendee payment.

**Phase to address:**
Roadmap sequencing overall. The first shippable slice must be the single-booker paid transaction; group bookings and trust/ops come after.

---

### Pitfall 7: Cancellation & refund policy edge cases (under-specified policy)

**What goes wrong:**
A booker cancels 2 hours before a 2-hour court booking — full refund? Partial? Host already turned away other bookers. A host cancels on the booker last-minute — does the booker get fully refunded, and is the host penalized? A booker no-shows — host keeps the money? Refund commission too? Without a crisp policy *and* its precise money mechanics, every cancellation becomes a manual support ticket and a trust-eroding argument.

**Why it happens:**
Teams build the happy-path booking and treat cancellation as "we'll add a refund button later." But cancellation policy is a matrix: *who* cancels × *how far in advance* × *what % refunds* × *what happens to commission* × *what happens to the host payout*. Each cell has distinct money movement (see Pitfall 3). Hourly bookings have tight windows where Airbnb-style multi-day policies don't map cleanly.

**How to avoid:**
- Define an explicit **policy matrix** before building cancellation: rows = who cancels (booker/host) × time-to-start buckets; columns = % refunded to booker, commission kept/refunded, host payout adjustment, host penalty (if any).
- Pick **a small number of named policies** (e.g. Flexible / Moderate / Strict) hosts choose per listing, rather than free-form — far fewer edge cases.
- Make host-initiated cancellation costly/visible (it's the worst experience for a booker who's organized a group around it) — at minimum full refund + clear messaging; consider host-side consequences post-v1.
- Tie each policy outcome to the exact Stripe calls (refund amount, `reverse_transfer`, `refund_application_fee`).
- No-show handling: decide explicitly whether the host keeps payout; default to "yes, slot was reserved."

**Warning signs:**
A "cancel" button exists but refund amount is hardcoded or always-100%; no named policy tiers; cancellation behaves identically regardless of who cancels or timing; support is manually issuing refunds; group organizer can cancel with no defined refund consequence.

**Phase to address:**
Cancellation/Refund Policy slice (depends on Payments being correct first — Pitfall 3).

---

### Pitfall 8: Group-booking edge cases (RSVP, capacity, organizer cancellation)

**What goes wrong:**
The differentiator breaks in messy ways: more people RSVP "yes" than the space's capacity allows (capacity overflow); the organizer cancels after invitees have arranged their schedules; only 2 of 8 invitees confirm — does the booking still happen, and at what price; an invitee RSVPs after the booking is already full; the organizer paid for 8 but only 4 show. Because *the organizer pays* in v1, the money side is simpler, but the *coordination* side is full of traps.

**Why it happens:**
Group flows have multi-actor state that single bookings don't: an organizer plus N invitees, each with their own RSVP state, racing against a fixed capacity and a payment that's already been made. Teams model the happy path (everyone confirms) and miss partial/overflow/cancellation states. RSVP-after-full is a mini double-booking problem against *capacity* rather than *time*.

**How to avoid:**
- Anchor on the v1 model from PROJECT: **organizer pays for the booking (the slot), invitees confirm headcount** — RSVP is informational/coordination, *not* a payment gate and *not* what makes the slot booked. The slot is reserved the moment the organizer books and pays. This dramatically shrinks the edge-case surface.
- Enforce **capacity as a hard limit** on RSVPs (waitlist or "full" message beyond it) — and treat RSVP acceptance against capacity with the same atomic-increment discipline as slot booking (avoid the read-modify-write race on remaining seats).
- Define organizer-cancellation explicitly: it cancels the *whole* booking → triggers the cancellation/refund policy (Pitfall 7) → notifies all invitees.
- Define partial RSVP: booking stands regardless (organizer already paid for the slot); headcount is just expectations. Don't couple "booking is valid" to "enough people RSVP'd" in v1.
- Handle RSVP state transitions: invited → confirmed → declined → (re-confirm?), and what happens to a confirmed invitee when the organizer cancels.

**Warning signs:**
RSVP count can exceed listed capacity; organizer cancellation has no defined effect on invitees or refunds; "booking valid" logic depends on RSVP threshold; no atomicity on the remaining-seats counter; invitee can RSVP to a cancelled booking.

**Phase to address:**
Group Bookings slice (after single-booker booking + payments + cancellation policy are solid — group reuses all of them).

---

### Pitfall 9: Stale / inconsistent availability display

**What goes wrong:**
The search results or calendar show a slot as available, but it was booked seconds ago (or held by someone mid-checkout). The booker invests effort selecting it, enters checkout, and is rejected by the exclusion constraint — a jarring "this just got booked" experience. At worse-cache extremes, availability is minutes stale and bookers repeatedly hit conflicts.

**Why it happens:**
Availability is cached/denormalized for fast search but not invalidated promptly on booking/hold/cancel. Or the calendar is computed once and not re-checked at the point of commit. This is the *display-layer* cousin of Pitfall 1 — the DB stays correct, but the UI lies.

**How to avoid:**
- Derive displayed availability from actual bookings + active holds, and **re-validate at the moment of commit** (the exclusion constraint is the backstop, but catch conflicts gracefully before charging).
- Keep holds short and reflected in availability immediately, so two bookers don't both pursue the same slot.
- If caching search results, invalidate on booking/hold/cancel events for the affected space/day; keep cache TTL short.
- Design the UI to handle "slot no longer available" gracefully (re-show fresh availability, don't dead-end).

**Warning signs:**
Availability is a cached boolean updated by a periodic job; no hold reflected in search; "this slot just got taken" errors only appear at the payment step; calendar and booking table can disagree.

**Phase to address:**
Search/Availability slice (display correctness), reinforced by the hold mechanism in the Booking slice.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Availability as a boolean column instead of derived from booking ranges | Trivial to query | Can't represent overlapping hourly bookings, holds, or partial-day; guarantees double-booking bugs | Never (foundational) |
| Storing `timestamp`/naive local times, no space timezone | Looks fine in single region | Off-by-an-hour bugs at DST; impossible to expand regions; wrong durations/prices | Never |
| Paying out hosts at booking confirmation (not after service) | Hosts get money fast, feels generous | Platform eats refunds/chargebacks; can't claw back; negative-balance exposure | Never for v1 paid bookings |
| Hardcoding 100%-refund cancellation | Ships a cancel button fast | No host protection; revenue leakage; manual support load | Only in a throwaway prototype, never in v1-with-real-money |
| No idempotency keys on booking/payment POST | Less code | Duplicate bookings & double charges on retry | Never with real payments |
| RSVP gating whether a booking is "valid" | Models "everyone must come" intuition | Breaks partial-RSVP, couples coordination to money | Never (v1 = organizer-pays, RSVP is informational) |
| Skipping the dispute/`account.updated` webhooks | Faster to "working" demo | Can't recover disputed funds; bookings against unpayable hosts | Never with real Connect payouts |
| Single mandatory onboarding wizard (KYC before listing) | One flow to build | Supply drop-off on a supply-starved marketplace | Acceptable only if host volume is tiny/hand-held at seed |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Stripe Connect — refunds | Calling refund without `reverse_transfer` → platform eats it | Use destination charges + `reverse_transfer=true`; decide `refund_application_fee` per policy |
| Stripe Connect — disputes | No `charge.dispute.created` handler; transfers not reversed | Webhook-driven: reverse transfer immediately on dispute; platform is liable |
| Stripe Connect — payouts | Paying out at booking time | Delay payout until after service; extend delay for new hosts (Stripe-recommended) |
| Stripe Connect — onboarding | Gating listing creation behind full KYC | Decouple list vs. payout-ready; gate *bookability* on `payouts_enabled` via `account.updated` |
| Stripe Connect — negative balances | Assuming Stripe absorbs host negatives | Set `debit_negative_balances` where available; plan recovery; choose liability model upfront |
| Payment + booking atomicity | Charging before the slot is durably held → charge succeeds, booking fails (or vice versa) | Hold slot first → charge → confirm; idempotency keys; reconcile on failure (refund orphaned charges) |
| Calendar/sync (if ever added) | Trusting external calendar as source of truth (sync lag → double-book) | Internal DB + exclusion constraint is the source of truth; external calendar is a projection |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Computing availability by scanning all bookings per search | Search slows as bookings grow | Index booking ranges (GiST on `tstzrange`); precompute/materialize availability per space/day with prompt invalidation | Hundreds of listings × many bookings; noticeable once a region fills in |
| Global table lock / pessimistic locking to prevent double-booking | Throughput collapses under concurrent booking attempts | Use the DB exclusion constraint (optimistic) + short holds, not coarse locks | Booking spikes (popular slot, e.g. weekend prime time) |
| N+1 queries rendering search results (host, photos, availability per card) | Search page latency balloons | Eager-load/join; paginate; cache search results with short TTL | First time a region has dense results |
| Recomputing every slot for a wide date range on calendar load | Calendar feels sluggish | Limit horizon; compute on demand per visible window | Long bookable horizons (months out) |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Authorization gaps on bookings/listings (IDOR) | Booker A views/cancels Booker B's booking; host edits another host's listing | Enforce ownership checks server-side on every booking/listing/payout action; never trust client-supplied IDs |
| Trusting client-sent price/duration/commission | Booker manipulates price or commission in the request | Compute price, duration, and commission server-side from the listing + slot; never accept money amounts from the client |
| Leaking host/booker PII (exact address, contact) pre-booking | Privacy harm; off-platform circumvention | Reveal precise location/contact only after booking confirmation; show approximate area pre-booking |
| Webhook endpoints unauthenticated | Forged Stripe events → fake "paid" bookings or fund movements | Verify Stripe webhook signatures; treat webhooks as the source of truth for payment state, not client callbacks |
| Group-invite links guessable/permanent | Uninvited people RSVP or view a private booking | Use unguessable invite tokens, scoped and expirable |
| Disputes/refunds triggerable without authz | Fraudulent self-refunds | Gate refund/cancel actions behind ownership + policy checks server-side |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing times in the browser's timezone, not the venue's | Booker shows up an hour off | Always show venue-local time as primary; booker-local as secondary label |
| "This slot just got booked" only at payment step | Effort wasted, frustration, abandonment | Short holds reflected immediately in availability; re-validate early; graceful fallback to fresh availability |
| Instant-book vs request-to-book indistinguishable in search | Booker thinks they booked but it's pending host approval | Clearly badge each listing; set expectations on approval time; show pending state distinctly |
| Request-to-book with no response SLA | Booker stuck waiting indefinitely; slot frozen | Auto-expire pending requests; tell booker the window; release the slot on expiry |
| Refund amount unclear before cancelling | Booker cancels expecting full refund, gets partial → dispute | Show exact refund amount *before* confirming cancellation (Airbnb does this deliberately) |
| Group organizer can't see who's confirmed | Can't plan headcount; the differentiator feels broken | Clear RSVP roster: invited / confirmed / declined counts vs capacity |
| Empty search results dead-end | Booker leaves, never returns (liquidity death) | Show nearby alternatives, broaden filters, capture demand signal ("notify me"); seed supply so this rarely happens |

## "Looks Done But Isn't" Checklist

- [ ] **Booking creation:** Often missing the DB-level overlap constraint — verify two concurrent overlapping bookings (not just equal ones) can't both succeed, including instant-book vs. request-to-book on the same slot.
- [ ] **Availability:** Often missing timezone correctness — verify a slot displays correctly in venue zone, across a DST boundary, and computes the right duration/price.
- [ ] **Payments:** Often missing the refund/dispute money path — verify a refund after payout claws funds back from the host (`reverse_transfer`) and handles commission per policy; verify a `charge.dispute.created` webhook reverses the transfer.
- [ ] **Payouts:** Often missing payout timing — verify hosts are paid *after* service, and a booking can't be created against a host whose `payouts_enabled` is false.
- [ ] **Cancellation:** Often missing the who×when matrix — verify booker-cancel, host-cancel, and no-show each produce the correct refund, commission, and payout outcome.
- [ ] **Group booking:** Often missing capacity/overflow and organizer-cancel — verify RSVPs can't exceed capacity, partial RSVP still leaves the booking valid, and organizer cancellation refunds + notifies invitees.
- [ ] **Holds:** Often missing expiry/cleanup — verify an abandoned checkout releases the slot back to availability.
- [ ] **Idempotency:** Often missing on retries — verify a double-clicked "Book & Pay" creates exactly one booking and one charge.
- [ ] **Liquidity:** Often missing the zero-result case — verify search with no results doesn't dead-end, and instrument zero-result-search rate.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Double-booking already shipped | MEDIUM | Add the exclusion constraint (will surface/clean existing overlaps first); add idempotency keys; backfill `tstzrange`; reconcile/refund any existing conflicts manually |
| Times stored without timezone | HIGH | Data migration to `timestamptz` + add space timezone; re-interpret existing naive times (ambiguous — may need per-record correction); audit all bookings near DST |
| Payout timing too early (already paying at booking) | MEDIUM | Switch to delayed payouts going forward; absorb in-flight risk; add dispute webhook + transfer reversal now to stop the bleeding |
| Refunds eating platform balance | LOW–MEDIUM | Add `reverse_transfer`/`refund_application_fee` to refund flow; reconcile past refunds and claw back where possible |
| Cancellation policy under-specified | MEDIUM | Define the policy matrix; map each cell to Stripe calls; migrate listings to named policy tiers; communicate change to hosts |
| Empty marketplace (no liquidity) | HIGH | Pause demand spend; concierge-seed supply in one tight area; manually create bookable availability; re-measure completed bookings before re-opening demand |
| Group RSVP exceeding capacity | LOW–MEDIUM | Add hard capacity cap with atomic seat decrement + waitlist; reconcile overbooked groups manually |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase (topic) | Verification |
|---------|--------------------------|--------------|
| Double-booking race | Booking & Availability core | Concurrent overlapping-booking test fails the 2nd insert; idempotency test creates one booking |
| Timezone / DST / slot boundaries | Search/Availability (data model) | DST-crossing test shows correct venue time, duration, price; columns are `timestamptz` + IANA zone |
| Marketplace refund/chargeback liability | Payments & Payouts | Refund-after-payout claws back from host; dispute webhook reverses transfer |
| Stripe onboarding friction | Host listing + Payments boundary | Host can draft a listing pre-KYC; slot only bookable when `payouts_enabled` |
| Cold-start / liquidity | Launch/Liquidity strategy + admin seeding tools | Zero-result-search rate tracked; ≥N bookable results in beachhead; admin can seed listings+availability |
| Over-building before validation | Roadmap sequencing | First shippable slice = single-booker paid transaction end-to-end; Out-of-Scope list honored |
| Cancellation/refund edge cases | Cancellation/Refund Policy | Each cell of who×when matrix produces correct money movement |
| Group-booking edge cases | Group Bookings | RSVP can't exceed capacity; partial RSVP valid; organizer-cancel refunds + notifies |
| Stale availability display | Search/Availability + holds | Booked/held slots disappear from search promptly; graceful "no longer available" |

## Sources

- PostgreSQL Range Types & exclusion constraints (`EXCLUDE USING gist`, `WITHOUT OVERLAPS` in PG18): https://www.postgresql.org/docs/current/rangetypes.html ; https://www.cybertec-postgresql.com/en/exclusion-constraints-in-postgresql-and-a-tricky-problem/ ; https://sqlfordevs.com/non-overlapping-time-ranges (HIGH)
- Double-booking / race-condition patterns (check-then-act, holds, idempotency keys): https://adamdjellouli.com/articles/databases_notes/07_concurrency_control/04_double_booking_problem ; https://itnext.io/solving-double-booking-at-scale-system-design-patterns-from-top-tech-companies-4c5a3311d8ea ; https://medium.com/@fadhilhan01/preventing-duplicate-orders-in-a-ticket-booking-system-what-i-learned-50662a6dad32 (MEDIUM)
- Timezone/DST handling in booking systems (UTC + IANA zone, DST skip/ambiguous rules): https://dev.wix.com/docs/api-reference/business-solutions/bookings/about-time-zones ; https://github.com/calcom/cal.com/issues/22525 (MEDIUM–HIGH)
- Stripe Connect — refunds & disputes (platform liability, `reverse_transfer`, `refund_application_fee`): https://docs.stripe.com/connect/marketplace/tasks/refunds-disputes (HIGH)
- Stripe Connect — risk management best practices (payout delays, negative balances, KYC, holding funds): https://docs.stripe.com/connect/risk-management/best-practices (HIGH)
- Stripe Connect onboarding friction / deferred onboarding: https://greenmoov.app/articles/en/stripe-connect-for-marketplace-payments-explained-account-types-onboarding-and-pricing-2026-guide (MEDIUM)
- Marketplace chicken-and-egg / liquidity / single-market launch: https://www.journeyh.io/blog/chicken-and-egg-problem ; https://www.applicoinc.com/blog/marketplaces-and-the-chicken-and-egg-problem-supply-or-demand-first/ ; https://www.cobbleweb.co.uk/supply-or-demand-cracking-the-chicken-and-egg-challenge-in-marketplace-startups/ (MEDIUM)
- Over-building / MVP validation (core transaction loop, scaling too soon): https://www.shipturtle.com/blog/how-to-build-an-mvp-for-marketplace-apps ; https://roobykon.com/blog/posts/how-to-build-an-online-marketplace-mvp-in-2026 (MEDIUM)
- Cancellation/refund & trust-safety edge cases (no-show, host-cancel, refund visibility): https://www.airbnb.com/help/article/3066 ; https://www.airbnb.com/help/article/311 ; https://www.airbnb.com/help/article/2868 (MEDIUM)
- Group/RSVP capacity, waitlist, partial & organizer cancellation: https://help.rsvpify.com/en/articles/4343288-capacity-limits ; https://www.offsite.com/blog/group-reservation (MEDIUM)

---
*Pitfalls research for: two-sided fitness/recreational-space booking marketplace*
*Researched: 2026-06-03*
