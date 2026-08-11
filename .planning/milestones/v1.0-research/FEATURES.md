# Feature Research

**Domain:** Two-sided booking marketplace for fitness & recreational spaces (Airbnb-style, hourly/daily, real payments)
**Researched:** 2026-06-03
**Confidence:** HIGH (table stakes & host tooling verified against Peerspace/Splacer/Airbnb live product docs; group-booking mechanics MEDIUM, synthesized from pickleball-org apps + RSVP tools; payment-flow specifics HIGH from Stripe docs)

## Orientation

The feature set is bounded by three hard product decisions in PROJECT.md:
1. **Demand-side first** — search → availability → reserve → pay is the spine. Host tooling exists only to make that spine possible.
2. **Two booking models per listing** — host chooses instant-book or request-to-book. This forks the booking lifecycle and the payment-capture timing.
3. **Group bookings = organizer-pays + RSVP/headcount** in v1; cost-splitting deferred. This means group booking is a *layer on top of a normal booking*, not a separate transaction type — the organizer is just a normal booker who also has an attendee list.

Competitors analyzed: **Peerspace** (closest analog — hourly venue rental, instant/request, add-ons, attendee tiers, operating hours, cancellation tiers), **Splacer** (hourly fitness/studio rental), **GymSpots / SOLO60** (private gym by the hour, access codes), **HopperFit** (gym-owner approval of trainer bookings), **Facilitron** (gym/court facility rental with approval), **CourtReserve / Playbypoint** (court scheduling), **Airbnb** (instant vs request, calendar, min/max stay), **PlayMore / Picklebeast / Pickleheads** (player invite + RSVP + waitlist mechanics).

## Feature Landscape

### Table Stakes (Users Expect These)

Missing any of these makes the product feel broken or untrustworthy. Grouped by requirement category.

#### Auth & Accounts
| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Email/password signup + login | Can't book/pay or list without an identity | LOW | One account, both capabilities (booker + host) per PROJECT.md. Don't split into two account types. |
| Session/auth persistence | Users return to manage bookings | LOW | Standard. |
| Basic profile (name, contact, photo optional) | Hosts need to know who's booking; bookers need a contact | LOW | Minimal in v1. Avoid full identity verification (anti-feature for v1). |
| Password reset | Universal expectation | LOW | Email-based. |

#### Listings (Host Supply)
| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Create/edit listing (title, description, space type, address, capacity, amenities) | No listing = no supply | MEDIUM | Space-type taxonomy matters for search (gym / court[pickleball,tennis,basketball] / studio[yoga,dance] / home gym). Capacity field feeds group-booking validation. |
| Photo upload (multiple, ordered) | Visual marketplaces live on photos — universal across Peerspace/Splacer/Airbnb | MEDIUM | Image storage + ordering + a hero image. Quality of photos is the single biggest conversion lever per Sharetribe/Peerspace. |
| Listing detail page | The page that sells the booking | MEDIUM | Photos, description, amenities, location/map, price, availability calendar, book CTA. Demand-side critical path. |
| Listing status (draft / published / unlisted) | Hosts edit before going live; pull listings temporarily | LOW | Don't show unpublished/unlisted in search. |

#### Search & Discovery (Demand)
| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Search by location | Core of "find a space near me" | MEDIUM | Single launch city, but still need radius/area search. Geocoding + distance. Map view is standard but can be list-first in v1. |
| Filter by activity/space type | Pickleball player doesn't want a yoga studio | LOW | Drives the whole value prop. Map onto listing taxonomy. |
| Filter by date + time availability | "Show me what's free Saturday 2-4pm" is the actual job-to-be-done | HIGH | This is the hard one — search must query against the availability model, not just static attributes. Stale results here = the unacceptable failure mode from PROJECT.md. |
| Filter by price | Universal marketplace expectation | LOW | Range filter on hourly/day rate. |
| Results list with cards (photo, name, price, location/distance) | Standard scannable results | LOW | Grid/list of cards. |
| Map view of results | Location-based products expect it (Sharetribe, Airbnb, Peerspace) | MEDIUM | Pins + cards. **Defer to v1.x if needed** — list view satisfies core value; map is enhancement. |

#### Availability View
| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Real, up-to-date availability calendar on listing | PROJECT.md core value: "see real availability ... with confidence the booking is real" | HIGH | Must reflect existing bookings + host operating hours + blocks, in real time. The correctness keystone. |
| Hourly slot + full-day selection | Product books "by the hour or by the day" | HIGH | Slot granularity (e.g. 30/60-min) + day-rate path. Affects pricing calc and double-booking logic. |
| Visual "this time is taken" feedback | Bookers must not be able to pick an occupied slot | MEDIUM | Greyed/blocked slots. Derived from confirmed + held bookings. |

#### Booking (Demand)
| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Select time window + see price before committing | No surprise pricing | MEDIUM | Price = rate × duration (+ fees). Show breakdown. |
| Slot hold during checkout | Prevents two people racing for the same slot mid-payment | HIGH | Temporary lock (AVAILABLE → HELD → CONFIRMED) with expiry. Industry-standard pattern (Redis/DB lock). Directly addresses the double-booking failure mode. |
| Instant-book confirmation | If host enabled it, booking confirms immediately on payment | MEDIUM | Capture payment + confirm slot atomically. |
| Request-to-book flow | If host requires approval, request is submitted and held pending | HIGH | Payment authorized/held, not captured, until host approves; auto-expire if no response (Airbnb uses ~24h; Peerspace allows withdraw-while-pending). Capture on approve, release on decline/expire. |
| Booking confirmation (on-screen + email) | Proof the booking is real | LOW | Confirmation with date/time/space/price/access info. |
| Cancellation by booker | Universal expectation; people's plans change | MEDIUM | Tied to a cancellation policy + refund logic. Peerspace pattern: free withdraw while pending; tiered refund once confirmed. |

#### Payments
| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Online card payment at booking | "Pay for a booking online" is an Active requirement | HIGH | Stripe (Connect). PCI handled by provider — never touch raw card data. |
| Platform commission deducted | Business model; an Active requirement | MEDIUM | `application_fee` on the charge. Peerspace ~15% reference point. |
| Host payout | Hosts must get paid or supply leaves | HIGH | Stripe Connect transfer to connected account. **Recommend Separate Charges & Transfers** (platform holds funds, transfers after service/decline window — enables delayed payout & refunds). Destination charges are simpler but less control. |
| Host payout onboarding (KYC) | Legally required to pay hosts; can't be skipped | HIGH | Stripe Connect Express hosted onboarding (~10-15 min, Stripe-managed compliance). Gates a host's ability to receive bookings. |
| Refund handling | Cancellations require money back | MEDIUM | Refund via Stripe; interacts with payout timing — another reason to hold funds before transfer. |
| Authorize-vs-capture for request-to-book | Don't charge for a booking the host might decline | HIGH | Auth at request, capture at approval. Auth expiry (~7 days) constrains how long requests can stay pending. |

#### Host Tools (Supply)
| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Availability / operating-hours management | Hosts define when the space is bookable | HIGH | Operating hours (recurring weekly) + one-off blocks/overrides. Peerspace model: guests can't request outside operating hours. |
| Calendar block / unblock specific dates/times | Hosts take the space offline (maintenance, personal use) | MEDIUM | Manual blocks layered on operating hours. |
| Pricing (hourly rate; day rate) | Hosts set what they charge | LOW | Per-listing rate(s). Keep flat in v1. |
| Instant-book vs request-to-book toggle per listing | Explicit Active requirement & key differentiator of host control | MEDIUM | Per-listing setting that forks the booking lifecycle. |
| Approve / decline booking requests | Required for request-to-book listings | MEDIUM | Host action with deadline; triggers capture or release. HopperFit/Facilitron confirm this is expected behavior for space owners. |
| View bookings (upcoming/past) + status | Hosts run their operation off this | LOW | Host-side booking list. |
| Payout visibility (what's owed / paid) | Hosts need to trust they're getting paid | MEDIUM | Can lean on Stripe Express dashboard in v1 to reduce build. |

#### Account / Bookings Management (Both Sides)
| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Booker "My Bookings" (upcoming/past + status) | Explicit Active requirement | LOW | Status states: pending, confirmed, declined, cancelled, completed. |
| Booking status lifecycle visibility | Users need to know where a request/booking stands | MEDIUM | Shared status model across both sides. |
| Transactional emails (confirm, request received, approved/declined, cancelled, reminder) | Bookings without notifications feel unreal/unreliable | MEDIUM | Email is the v1 notification channel (no chat). Reminders reduce no-shows. |

### Differentiators (Competitive Advantage)

Aligned with PROJECT.md's stated edge. Don't try to differentiate on everything — group bookings is THE bet.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Group booking: organizer books + invites attendees** | The signature feature vs generic booking tools — turns a solo reservation into a social event | HIGH | Layer on a normal booking: organizer pays, then generates invites. Core differentiator per PROJECT.md. |
| **Invite via shareable link (+ email)** | Frictionless — matches how pickleball-org apps (PlayMore: link/email/QR) actually spread | MEDIUM | A booking-scoped invite link is the lowest-friction mechanic. Attendees needn't have accounts to RSVP (or lightweight account). QR optional. |
| **RSVP / attendance confirmation by attendees** | Gives the organizer a real headcount; the "magic" of the feature | MEDIUM | Attendee responds yes/no/maybe → confirmed count. Mirrors PlayMore "join session & manage your own RSVP." |
| **Headcount tracking against listing capacity** | Organizer sees "6 of 8 confirmed"; prevents over-capacity | MEDIUM | Validate confirmed count ≤ listing capacity. "Who's in" view (Picklebeast-style "see who joined"). |
| **Waitlist when a group fills** | Common in player-org apps (PlayMore auto-waitlist); handles drop-outs gracefully | MEDIUM | **v1.x candidate** — nice but not core to the differentiator's first proof. |
| **Fitness-specific space taxonomy & filters** | Generic venue marketplaces (Peerspace) bury fitness; a purpose-built taxonomy is a discovery edge | LOW | Activity-first filtering (pickleball vs yoga) is cheap and on-brand. |
| **Confidence in real availability (no double-booking)** | "Book with confidence it's real" is positioned as core value; doing it well is a trust differentiator | HIGH | Not a flashy feature but a felt one. Robust hold/lock logic = reputation. |

### Anti-Features (Commonly Requested, Often Problematic — Defer or Avoid for v1)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Automated cost-splitting among attendees | "Make everyone pay their share" feels natural for groups | Requires per-attendee payment, partial-refund, chase-up, and dispute logic — large surface before core transaction is proven. PROJECT.md explicitly defers to v2. | Organizer-pays in v1; attendees just RSVP. |
| Per-attendee paid spots / ticketing | Lets each person buy their own spot | Turns one booking into N transactions + inventory mgmt; explicitly out of scope in PROJECT.md | Organizer books the whole slot. |
| In-app chat / messaging between host & booker | Coordination questions arise | Real-time messaging is a product unto itself (moderation, notifications, threading); PROJECT.md defers it | Transactional emails + clear listing info + access instructions. Revisit post-core. |
| Reviews & ratings | Trust signal, drives conversion | Needs moderation, gaming defenses, and enough volume to be meaningful; not required for the core transaction (PROJECT.md) | Launch without; add once liquidity exists. Lean on photos + host responsiveness. |
| Native iOS/Android apps | "Everyone wants an app" | Doubles surface area pre-validation; PROJECT.md = responsive web v1 | Responsive web, installable/PWA-friendly if cheap. |
| Multi-city / region support | "Think big" | Adds geo/region complexity (timezones, region search, supply seeding) before single-market liquidity proven | One city; keep data model region-capable but don't build region UX. |
| Dynamic / surge / seasonal pricing | Hosts may want it; revenue optimization | Pricing-engine complexity; per-attendee tiered rates (Peerspace-style) tempting but heavy | Flat hourly + day rate in v1. Tiered/dynamic later. |
| Add-ons / extras at checkout (catering, equipment, staff) | Peerspace has it; upsell revenue | Inventory + per-add-on pricing + tax interactions; not core to fitness-slot booking | Defer. Bundle into listing description if a host needs it. |
| Subscriptions / memberships / class packs | ClassPass-style recurring access | Different business model (recurring billing, credits, entitlements) than per-booking commission | Stay per-booking in v1. |
| Identity verification / background checks | Trust & safety | Vendor integration + compliance + UX friction; premature at launch scale | Basic account + payment-on-file as soft trust. Add when scale demands. |
| Smart-lock / access-code integration | GymSpots/SOLO60 do automated access | Hardware/integration dependency per host; not generalizable across courts/studios/home gyms | Host provides access instructions in confirmation. |
| Host-side analytics dashboards | Hosts like data | Reporting surface with low early value; Stripe dashboard covers payouts | Minimal bookings list + Stripe Express dashboard. |

## Feature Dependencies

```
Auth (accounts)
  └──requires──> everything booking/listing/payment

Listing creation
  └──requires──> Photo upload + Space taxonomy + Capacity
        └──enables──> Listing detail page ──enables──> Search results & Availability view

Host availability / operating hours
  └──requires──> Availability model (the shared truth)
        └──feeds──> Availability view (demand) AND Search-by-date filter (HARD)
        └──feeds──> Double-booking prevention

Booking (select slot)
  └──requires──> Availability model + Slot hold/lock
        └──forks on──> Instant-book toggle ──> Payment CAPTURE now
                   └──> Request-to-book ──> Payment AUTH now, capture on host Approve
                              └──requires──> Host approve/decline action + expiry

Payment (charge booker)
  └──requires──> Stripe Connect setup
        └──requires──> Host payout onboarding (KYC) BEFORE host can receive bookings
challenge: commission = application fee; payout = transfer (Separate Charges & Transfers)
        └──enables──> Refunds ──required by──> Cancellation

Group booking
  └──requires──> A confirmed normal booking by the organizer (organizer-pays)
        └──requires──> Invite mechanism (link/email)
              └──requires──> Attendee RSVP
                    └──requires──> Headcount-vs-capacity validation (needs Listing.capacity)
        └──enhanced-by──> Waitlist (v1.x)

Bookings management (both sides)
  └──requires──> Shared booking status lifecycle (pending/confirmed/declined/cancelled/completed)
        └──requires──> Transactional emails

Map view ──enhances──> Search (optional in v1)
Cost-splitting ──CONFLICTS with──> v1 organizer-pays model (do not combine; v2)
```

### Dependency Notes

- **Search-by-date depends on the availability model, not just listing attributes.** This is the single highest-risk dependency: filtering "free Saturday 2-4pm" requires querying live availability across listings. Sequence the availability model *before* rich search.
- **Host payout onboarding (KYC) gates supply going live.** A host cannot legally receive money until Stripe Connect onboarding completes. A listing can exist before onboarding, but it must not be bookable (or payouts will fail). Order: account → listing → payout onboarding → bookable.
- **Instant vs request-to-book forks payment timing.** Instant = capture now. Request = authorize now, capture on approve, release on decline/expire. Build the booking-status state machine to encode this fork explicitly; it touches payments, emails, and the host approve action together.
- **Slot hold/lock is a prerequisite for safe checkout.** Without a temporary hold during payment, two bookers can pay for the same slot. This must land *with* the booking flow, not after.
- **Group booking sits entirely on top of a normal confirmed booking.** It adds invite + RSVP + headcount; it does not change who pays or how payment works in v1. This keeps the differentiator cheap relative to the core transaction. It depends on `Listing.capacity` for validation.
- **Cancellation depends on refunds depends on the payout/transfer model.** Holding funds before transfer (Separate Charges & Transfers) makes refunds clean; transferring immediately makes them painful. Decide the payment topology early because cancellation correctness rides on it.

## MVP Definition

### Launch With (v1)

The minimum that proves "find a fitness space, see real availability, book it, pay — with confidence it's real," plus the group-booking bet.

- [ ] Email/password auth, single account with booker+host capabilities — gate for everything
- [ ] Host: create/edit listing (type, capacity, amenities, address, photos) — supply
- [ ] Host: set operating hours + block dates/times — the availability source of truth
- [ ] Host: set hourly + day rate — pricing
- [ ] Host: instant-book vs request-to-book toggle — explicit requirement & host-control edge
- [ ] Host: Stripe Connect payout onboarding — required to receive money
- [ ] Host: approve/decline requests (with expiry) — request-to-book path
- [ ] Search by location + activity type + date/time availability + price — demand spine
- [ ] Results list + listing detail page — discovery → decision
- [ ] Real availability calendar (hourly slots + day) on listing — core-value keystone
- [ ] Slot hold/lock during checkout — double-booking prevention (non-negotiable)
- [ ] Book + online card payment with commission deducted + host payout — the transaction
- [ ] Authorize/capture handling matching instant vs request — correctness
- [ ] Booking confirmation + transactional emails — proof it's real
- [ ] Cancellation + refund with a basic policy — table stakes for any booking product
- [ ] My Bookings (both sides), upcoming/past + status — manage
- [ ] Group booking: organizer books → invite by link/email → attendees RSVP → headcount vs capacity — the differentiator

### Add After Validation (v1.x)

- [ ] Map view of search results — add once list-based search converts and supply density warrants spatial browsing
- [ ] Group waitlist + drop-out handling — add once groups regularly hit capacity
- [ ] Reviews & ratings — add once enough booking volume to make them meaningful and to defend trust
- [ ] In-app messaging — add if email coordination proves insufficient (host/booker back-and-forth complaints)
- [ ] Richer host payout dashboard — add when Stripe Express dashboard becomes a friction point
- [ ] Saved/favorite listings — add when repeat-discovery behavior appears

### Future Consideration (v2+)

- [ ] Cost-splitting among group attendees — explicitly v2 in PROJECT.md; only after core transaction is rock-solid
- [ ] Per-attendee paid spots / ticketing — alternative group model; validate organizer-pays first
- [ ] Native mobile apps — after web validates demand
- [ ] Multi-city expansion — after single-market liquidity is proven
- [ ] Dynamic/tiered/seasonal pricing & attendee-tier rates — after flat pricing validates
- [ ] Add-ons / extras at checkout — after core booking proves out
- [ ] Smart-lock / automated access — per-host integration, scale-dependent
- [ ] Memberships / class-pack billing — different business model

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Auth / accounts | HIGH | LOW | P1 |
| Listing create + photos + taxonomy | HIGH | MEDIUM | P1 |
| Host operating hours / availability model | HIGH | HIGH | P1 |
| Search by location + activity + date + price | HIGH | HIGH | P1 |
| Listing detail + availability calendar | HIGH | HIGH | P1 |
| Slot hold/lock (double-booking prevention) | HIGH | HIGH | P1 |
| Online payment + commission + payout | HIGH | HIGH | P1 |
| Stripe Connect host onboarding (KYC) | HIGH | HIGH | P1 |
| Instant vs request-to-book + approve/decline | HIGH | HIGH | P1 |
| Cancellation + refund | HIGH | MEDIUM | P1 |
| My Bookings + status + transactional emails | HIGH | MEDIUM | P1 |
| Group booking: invite + RSVP + headcount | HIGH | HIGH | P1 (differentiator) |
| Map view of results | MEDIUM | MEDIUM | P2 |
| Group waitlist | MEDIUM | MEDIUM | P2 |
| Reviews & ratings | MEDIUM | MEDIUM | P2 |
| In-app messaging | MEDIUM | HIGH | P3 |
| Cost-splitting | HIGH | HIGH | P3 (v2) |
| Per-attendee ticketing | MEDIUM | HIGH | P3 (v2) |
| Dynamic / tiered pricing & add-ons | LOW | MEDIUM | P3 |
| Native apps / multi-city | MEDIUM | HIGH | P3 |

**Priority key:** P1 = must have for launch · P2 = add when possible (v1.x) · P3 = future (v2+)

## Competitor Feature Analysis

| Feature | Peerspace | Splacer / GymSpots / SOLO60 | Airbnb | Pickleball org apps (PlayMore/Picklebeast) | Our Approach |
|---------|-----------|------------------------------|--------|---------------------------------------------|--------------|
| Booking granularity | Hourly (+ day rates) | Hourly | Nightly | Session-based | Hourly + day — fitness slots |
| Instant vs request | Both (filterable) | Mixed; HopperFit = approval | Both | N/A | Per-listing toggle (explicit requirement) |
| Availability | Operating hours + calendar | Calendar | Calendar + min/max stay | Session schedule | Operating hours + blocks + real-time calendar |
| Pricing | Hourly + attendee tiers + add-ons | Hourly | Nightly + fees | Free/club-set | Flat hourly + day (tiers/add-ons deferred) |
| Payments/payout | Auto-collect, 15% take, payout per cancel policy | Marketplace payouts | Marketplace payouts | Usually none | Stripe Connect, commission, delayed payout via separate charges & transfers |
| Cancellation | Tiered policies; free withdraw while pending | Policy-based | Tiered policies | N/A | Basic tiered policy + refund in v1 |
| Group / multi-person | Attendee count for pricing | N/A | Guest count vs occupancy | Invite link/email/QR, RSVP, see who joined, auto-waitlist | Organizer-pays booking + invite link/email + RSVP + headcount vs capacity (our differentiator; waitlist v1.x) |
| Reviews | Yes | Yes | Yes | Some | Deferred (v1.x) |
| Messaging | Yes | Yes | Yes | Group chat | Deferred (email only in v1) |
| Add-ons | Yes (food, equipment, staff) | Some | No | No | Deferred (v2) |

## Sources

- Peerspace — pricing/booking model, cancellation policy, operating hours, attendee tiers, add-ons, instant vs request (support.peerspace.com, peerspace.com/resources, en.wikipedia.org/wiki/Peerspace) — HIGH
- Splacer fitness/studio listings (splacer.co) — MEDIUM
- GymSpots, SOLO60, HopperFit, Facilitron — private-gym/court hourly booking + host approval (gymspots.com, solo60.com, hopper.fit, facilitron.com) — MEDIUM
- Airbnb Help Center — Instant Book vs request-to-book, calendar, min/max stay, occupancy checks, ~24h request expiry (airbnb.com/help) — HIGH
- Stripe Connect docs — account types, Express onboarding/KYC, application fees, destination vs separate charges & transfers, delayed payout/escrow-equivalent, authorize/capture (docs.stripe.com/connect, /connect/charges, /connect/marketplace) — HIGH
- PlayMore / Picklebeast / Pickleheads / PlayTime Scheduler — invite via link/email/QR, RSVP self-management, "see who joined," auto-waitlist & drop-outs (getplaymore.com, picklebeastpickleball.com, pickleheads.com) — MEDIUM
- Paperless Post / Mixily / RSVPify — RSVP + headcount/+1 mechanics for group invites — MEDIUM
- Sharetribe Academy — marketplace search/filters, map view, listing cards, Stripe Connect overview (sharetribe.com/academy) — MEDIUM
- Double-booking prevention patterns — slot states AVAILABLE→LOCKED/HELD→CONFIRMED, pessimistic/distributed locks, hold expiry (Medium/DEV/itnext system-design write-ups) — MEDIUM

---
*Feature research for: two-sided fitness/recreational space booking marketplace*
*Researched: 2026-06-03*
