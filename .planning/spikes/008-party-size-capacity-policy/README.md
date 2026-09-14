---
spike: 008
idea: progressive-search-flow
name: party-size-capacity-policy
type: standard
validates: "Given a selected party size, when results contain exclusive and open-capacity spaces, then the product owner can compare capacity-only versus date-aware fit policies without showing a false promise."
verdict: "VALIDATED — capacity-only filter; no date question"
related: [007]
tags: [phase-24, search, capacity, availability, edge-cases]
---

# Spike 008: Party-size Capacity Policy

## What This Validates

Given the decision that party size should be a real filter, when a group has six people, then the
prototype shows the difference between a space whose configured capacity can host six and a drop-in
space with only four places remaining on a chosen day. It makes one constraint visible: Phase 24's
proposed three questions do not yet ask for a date.

## Research

| Authority | Observed fact | Consequence |
|---|---|---|
| `src/lib/db/schema.ts` | `listing.maxOccupancy` is the persisted maximum capacity. | It can rule out a group that can never fit. |
| `src/lib/search/query.ts` | Search results currently do not project `maxOccupancy`; open-capacity `spots.remaining` is derived only when a date is selected. | A genuine filter needs server/query work; a client badge cannot be the authority. |
| `src/lib/validation/booking.ts` | The existing URL contract has no party-size parameter. | Phase 24 must decide the new query shape deliberately, not hide it in UI state. |

No external library is involved. The demo uses a deterministic local fixture so its policy comparison
is inspectable without a database.

## How to Run

```bash
node build-demo.js
```

Then open `index.html`. Change group size, toggle the policy, and add/remove a chosen date.

## What to Expect

- **Capacity now** removes a venue only when its configured capacity is too small. It is honest about
  not knowing whether a drop-in venue has enough remaining places on an unspecified date.
- **Availability on a date** uses the fixture's remaining places for a selected date, so a group of
  six cannot be offered a drop-in venue with four remaining.
- The edge-case cards explain why the policy cannot silently claim `fits your group` when the relevant
  date is absent.

## Investigation Trail

1. Tested the common exclusive-space case against `maxOccupancy`.
2. Added an open-capacity case, where configured capacity and availability are different facts.
3. Made the absence of a date an explicit result state rather than silently including or excluding a
   drop-in listing.

## Results

**VALIDATED.** Phase 24 keeps the stated activity → location → party-size sequence. The party answer
filters by a venue's configured maximum capacity only. It must not claim that a drop-in venue has a
particular number of places remaining — that date-specific availability stays in the existing booking
journey. The explicit result copy is as important as the predicate.
