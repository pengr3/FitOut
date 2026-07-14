# Phase 4: Booking Core & Search (no payment) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-14
**Phase:** 4-Booking Core & Search (no payment)
**Areas discussed:** Search experience, Filters & availability, Checkout & confirm, Pricing & hold expiry, + a follow-up round (post-booking, countdown, sort, seed data)

---

## Search experience

### Entry point (→ D-29)
| Option | Description | Selected |
|--------|-------------|----------|
| Search IS the homepage | `/` becomes the browse/search home; replaces the scaffold | ✓ |
| Separate /search page | `/` stays a light landing linking to `/search` | |
| You decide | Pick per codebase + Airbnb convention | |

### Default view (→ D-30)
| Option | Description | Selected |
|--------|-------------|----------|
| All local bookable listings | Every bookable listing in the launch city, sorted | ✓ |
| Browse by category first | Space-type tiles → drill into results | |
| Empty until they search | Blank prompt to enter location/activity | |

### Zero-result state (→ D-31)
| Option | Description | Selected |
|--------|-------------|----------|
| Empty state + escape hatches | Broaden-radius / clear-filters + nearby alternatives | ✓ |
| Show nearest anyway | Relax strictest filter, show closest matches | |
| Plain 'no results' | Simple message, no suggestions | |

### Results loading (→ D-32)
| Option | Description | Selected |
|--------|-------------|----------|
| 'Load more' / pagination | Simple, SEO-friendly, single-city scale | ✓ |
| Infinite scroll | Auto-load on scroll (TanStack Query) | |
| You decide | Simplest that fits result volume | |

---

## Filters & availability

### Location model (→ D-33)
| Option | Description | Selected |
|--------|-------------|----------|
| Autocomplete + radius | Type area/address (Photon/LocationIQ) → PostGIS radius; distance on cards | ✓ |
| Neighborhood chips | Curated launch-city areas; no per-search geocoding | |
| Near me + radius | Browser geolocation as default origin | |

### Availability filter depth (→ D-34)
| Option | Description | Selected |
|--------|-------------|----------|
| True free-window | Only listings with an actual free unit for the picked window appear | ✓ |
| Open-that-day | Filter to listings open on the date; exact slot confirmed on listing page | |
| You decide | Planner picks per query cost | |

### First-class filter set (→ D-36)
| Option | Description | Selected |
|--------|-------------|----------|
| Type + price (the reqs) | Activity/space type + price; amenities deferred | |
| Add amenities too | Also filter by curated amenities | |
| You decide | Scope filters without bloat | ✓ |

**User's choice:** You decide → Claude scoped it to **type + price first-class** (the SEARCH reqs), **amenities deferred** to a later polish.

### Activity match semantics (→ D-35)
| Option | Description | Selected |
|--------|-------------|----------|
| Primary type OR tag | A gym tagged 'basketball' matches; surfaces multi-use venues | ✓ |
| Primary type only | Match only the one canonical space type | |
| You decide | Best rule to surface supply | |

---

## Checkout & confirm

### Checkout page shape (→ D-39)
| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated reserve page | `/listings/[id]/book`-style: window + breakdown + confirm | ✓ |
| Inline review on rail | Rail expands into review→confirm | |
| Modal checkout | Dialog over the listing page | |

### No-payment confirm boundary (→ D-40)
| Option | Description | Selected |
|--------|-------------|----------|
| Placeholder confirm (pending→confirmed) | Confirm flips hold to confirmed; Phase 5 injects payment before this transition | ✓ |
| Stop at the hold | Bookings stay pending; confirmation is Phase 5's job | |
| You decide | Boundary that de-risks Phase 5 | |

### Auth to book (→ D-41)
| Option | Description | Selected |
|--------|-------------|----------|
| Require sign-in at 'Book' | Login prompt (return-to-checkout); guest checkout deferred | ✓ |
| Guest hold, account at confirm | Signed-out hold, force account before confirm | |
| You decide | Follow existing auth/capability gating | |

### Double-click idempotency (→ D-42)
| Option | Description | Selected |
|--------|-------------|----------|
| Idempotency key + button disable | Retried submit → no-op returning the SAME booking; own slot shows success | ✓ |
| Rely on the DB constraint | 2nd insert conflicts → wrongly says 'just taken' | |
| You decide | Planner designs; exactly-one holds either way | |

---

## Pricing & hold expiry

### Pricing rule (→ D-45, resolves D-23)
| Option | Description | Selected |
|--------|-------------|----------|
| Distinct, no cap | Hourly = rate × hours; 'Book full day' = day rate; no auto-switch | ✓ |
| Day-rate cap / auto-switch | Charge day rate if hourly run ≥ it | |
| You decide | Simplest, hardest to game | |

### Breakdown content (→ D-46)
| Option | Description | Selected |
|--------|-------------|----------|
| Subtotal only (no fees yet) | Rate × qty = subtotal + total; fee row slots in Phase 5; PHP | ✓ |
| Indicative fee line | Placeholder service-fee row now | |
| You decide | Honest for no-payment, Phase-5-ready | |

### Hold TTL (→ D-47)
| Option | Description | Selected |
|--------|-------------|----------|
| 15 minutes | Comfortable window; survives into Phase-5 payment | ✓ |
| 10 minutes | Tighter; frees faster; may feel rushed with payment | |
| You decide | Sensible platform-wide default | |

### Expiry mechanism (→ D-48, resolves WR-03 design)
| Option | Description | Selected |
|--------|-------------|----------|
| Sweep-on-write + lazy reads (no new infra) | Reads treat expired-pending as free; booking tx clears stale holds first; DB stays authority | ✓ |
| Background worker now (BullMQ/Inngest) | Stand up job infra; adds a race window + infra | |
| You decide | Keep the DB the sole source of truth | |

---

## Follow-up round (finer points)

### Post-booking / confirmation (→ D-43)
| Option | Description | Selected |
|--------|-------------|----------|
| Confirmation page, viewable by link | Durable owner-gated `/bookings/[id]`; survives refresh; no list (Phase 7) | ✓ |
| Ephemeral confirmation screen | Confirmed screen only; refresh loses it | |
| You decide | Minimum that proves the flow | |

### Reserve-page countdown (→ D-44)
| Option | Description | Selected |
|--------|-------------|----------|
| Visible countdown + graceful expiry | 'held for 14:59…' + clear expiry with a path back | ✓ |
| Silent hold | No timer; post-expiry submit gets the message then | |
| You decide | Per timer helpfulness vs pressure | |

### Result sort (→ D-37)
| Option | Description | Selected |
|--------|-------------|----------|
| Nearest first, switchable | Default distance; switch to price | ✓ |
| Nearest, fixed | One order, no sort control | |
| You decide | Sensible default; sort control only if it earns it | |

### Seed data (→ D-38)
| Option | Description | Selected |
|--------|-------------|----------|
| Yes — lightweight seed set | Demo bookable listings across the city for dev/E2E/UAT | ✓ |
| No — hand-made listings only | No seed script | |
| You decide | Just enough to exercise search + zero-result | |

---

## Claude's Discretion

- **First-class filter set** (D-36) — user said "you decide"; scoped to type + price, amenities deferred.
- **`expired` vs `cancelled`** status for abandoned holds (D-49) — lean reuse `cancelled`.
- **Exact `booking`-table column shape**, idempotency-key source, booking-reference format (D-42/D-43/D-49).
- **URL schemes** for reserve + confirmation pages; **radius presets**, **sort-control affordance**, **card layout** — defer to UI-SPEC.
- **"Near me" geolocation** — first cut vs fast-follow (D-33).
- **Search query implementation** (single SQL with PostGIS radius + availability EXISTS vs two-stage) — researcher/planner; correctness-first, bounded by bookable-only + horizon.

## Deferred Ideas

- Amenities search filter — later polish (D-36).
- Day-rate cap / auto-switch pricing — deferred (D-45).
- Map view of search results (DISC-01) — v2.
- My Bookings list + management + cancellation — Phase 7 (D-43).
- Background job infra (BullMQ/Redis or Inngest) — when Phase 5/7 needs delayed jobs (D-48).
- Instant-book vs request-to-book fork — Phase 6 (D-40).
- Per-listing hold TTL / per-host horizon / lead time — platform-wide for v1 (D-47).
- Guest checkout — deferred; v1 requires sign-in (D-41).
