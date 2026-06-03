# Phase 2: Listings & Host Onboarding - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-03
**Phase:** 2-Listings & Host Onboarding
**Areas discussed:** Listing creation flow, Space taxonomy & amenities, Location & privacy on the page, Onboarding & bookability gate

---

## Listing creation flow

### How should a host build a listing?
| Option | Description | Selected |
|--------|-------------|----------|
| Guided multi-step wizard | Airbnb-style steps with progress + draft saved between steps | ✓ |
| Single long form | One page, all sections, single save/publish | |
| Sectioned single page | Anchored/collapsible sections + sticky save | |

### What must be true before draft → published?
| Option | Description | Selected |
|--------|-------------|----------|
| Full: fields + photo + verified email | Core fields + ≥1 photo + verified email (enforces Phase-1 soft email gate) | ✓ |
| Fields + photo, email later | Publish unverified; enforce email at bookability | |
| Minimal | Only title + type + price needed to publish | |

### Hourly vs day pricing?
| Option | Description | Selected |
|--------|-------------|----------|
| At least one of hourly/day | Host offers hourly, day, or both — require at least one | |
| Both hourly AND day required | Every listing must set both | ✓ |
| Hourly required, day optional | Hourly baseline, day optional add | |

### Listing photos?
| Option | Description | Selected |
|--------|-------------|----------|
| Min 1, first = cover, drag-reorder | ≥1 to publish, first = cover | |
| Min 3, first = cover | ≥3 to publish, first = cover, drag-reorder | ✓ |
| Min 1, explicit 'set as cover' | ≥1, dedicated cover control | |

**Notes:** Photo uploads use Cloudinary signed direct-to-client uploads (per the existing `src/lib/cloudinary.ts` graduation note), not server-routed like the Phase-1 avatar.

---

## Space taxonomy & amenities

### How to define space types/activities?
| Option | Description | Selected |
|--------|-------------|----------|
| Fixed curated list | Seed/admin-controlled enum | ✓ |
| Curated list + 'Other' | Curated + free-text escape hatch | |
| Free-form tags | Hosts type their own | |

### One type or many per listing?
| Option | Description | Selected |
|--------|-------------|----------|
| Primary type + activity tags | One canonical type + optional secondary tags | ✓ |
| Single type only | Exactly one type | |
| Fully multi-select | Any number, no primary | |

### Amenities model?
| Option | Description | Selected |
|--------|-------------|----------|
| Fixed curated checklist | Defined checkbox list | ✓ |
| Curated checklist + custom | Curated + free-text custom | |
| Free-form tags | Type freely | |

### Meaning of 'capacity'?
| Option | Description | Selected |
|--------|-------------|----------|
| Single max-occupancy integer | One number = max people; Phase-8 RSVP cap source | ✓ |
| Min + max range | Both floor and ceiling | |
| Optional / free-text | Not strictly enforced | |

### Lock starter vocabulary?
| Option | Description | Selected |
|--------|-------------|----------|
| Lock as-is | Use proposed space types/activity tags/amenities; planner may refine | ✓ |
| I'll adjust | Add/remove specific items | |
| Rethink categories | Different mental model | |

**Notes:** Capacity decision resolves the previously-flagged "Group capacity source" open product decision. Starter vocabulary (11 space types, 15 activity tags, 13 amenities) locked verbatim — see CONTEXT.md D-08.

---

## Location & privacy on the page

### How precise is the location shown before booking?
| Option | Description | Selected |
|--------|-------------|----------|
| Host chooses, default approximate | Per-listing 'show exact' toggle, default approximate; exact after booking | ✓ |
| Approximate for all until booked | Uniform fuzzed-until-booked | |
| Exact address always public | Full address on every page | |

### How is location captured/stored?
| Option | Description | Selected |
|--------|-------------|----------|
| Autocomplete → store lat/lng now | Places autocomplete; store coords for Phase-4 search | ✓ |
| Manual fields, geocode on save | Server-side geocode | |
| Address text only, defer coordinates | No coords until Phase 4 | |

### Map on the listing detail page?
| Option | Description | Selected |
|--------|-------------|----------|
| Yes — approximate pin/area | Embed map (fuzzed/exact per toggle) | ✓ |
| No map — text location only | Text only in v1 | |

### Constrain addresses to launch region?
| Option | Description | Selected |
|--------|-------------|----------|
| Soft — allow any address | No geofence; rely on search | ✓ |
| Hard geofence to launch region | Reject out-of-region | |
| Warn but allow | Flag but permit | |

---

## Onboarding & bookability gate

### When is the host prompted to onboard Stripe?
| Option | Description | Selected |
|--------|-------------|----------|
| Anytime + persistent nudge | Create/edit/publish without Stripe; nudge banner; onboarding only required for bookability | ✓ |
| At first publish attempt | Block publish until connected | |
| Immediately on 'Start hosting' | Push onboarding before any listing | |

### Published but not-payable — public detail page behavior?
| Option | Description | Selected |
|--------|-------------|----------|
| Viewable, book CTA disabled | Public page viewable (SC#3); CTA disabled/'not bookable yet' | ✓ |
| Viewable, no CTA at all | CTA hidden until payable | |
| Block publish until payable | No published state until payable | |

### Show not-yet-bookable listings in Phase-4 search?
| Option | Description | Selected |
|--------|-------------|----------|
| Exclude from search until bookable | Keep dead-ends out; detail page still link-viewable | ✓ |
| Include, marked 'not bookable' | Show with badge | |
| Decide in Phase 4 | Defer | |

### If payouts later get disabled?
| Option | Description | Selected |
|--------|-------------|----------|
| Auto-revert to not-bookable | Live webhook-driven; listings revert + drop from search; one Connect account/host | ✓ |
| Stay bookable, flag host | Keep bookable, warn host | |

---

## Claude's Discretion

- "Unlisted" status semantics (off-market, keeps data, re-publishable); edits to a published listing go live immediately (no moderation); soft-delete/archive over hard-delete.
- Listing URL/slug scheme, exact max photo count, Cloudinary transform presets, wizard step grouping + field validation messages.
- Stripe Connect implementation specifics (Express account creation/onboarding-link timing, webhook signature verification, Stripe CLI local dev) per CLAUDE.md.
- Lightweight cold-start seed tooling (demo listings) acceptable but not over-built; `role` field is the admin hook.

## Deferred Ideas

- Per-listing cancellation policy selection → Phase 7 (tiers not defined yet).
- Availability / operating hours / real calendar → Phase 3 (placeholder on the Phase-2 detail page).
- Search & discovery filters → Phase 4 (vocabulary locked now).
- Real booking + book-CTA wiring, instant vs request-to-book lifecycle → Phase 4/6 (`booking_mode` stored here).
- Map view of search results (DISC-01) → v2.
- Richer host/listing trust content (reviews, host bio, verification badges) → v2.
