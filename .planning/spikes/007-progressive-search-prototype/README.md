---
spike: 007
idea: progressive-search-flow
name: progressive-search-prototype
type: standard
validates: "Given an idle search home, when a booker starts a search, then they can compare three opening states and complete activity → location → party size with visible Back and edit paths."
verdict: "VALIDATED — search pill selected; party size must be a real fit filter"
related: [004]
tags: [phase-24, search, ux, progressive-disclosure, responsive]
---

# Spike 007: Progressive Search Prototype

## What This Validates

Given the all-expanded bar currently shipped on the public home page, when a booker begins a
search, then the product owner can feel three possible invitations and the same staged journey:
activity, location, then party size. The demo makes the pending product decisions visible without
pretending that a static mockup settles them.

## Research

This is a local interaction experiment; it adds no dependency and makes no network call.

| Input | Finding carried forward | Effect on this spike |
|---|---|---|
| Spike 004 | A compact entry point saves substantial mobile height, but does not replace existing refinement controls. | The prototype changes the search *start*, not the result/query contract. |
| `src/components/search/search-bar.tsx` | The live form owns validated URL serialization and address resolution. | This demo records selections only; it does not claim to implement filtering. |
| Phase 24 roadmap goal | Activity, location and party size are asked one at a time with smooth transitions. | The exact ordered sequence is held constant across all opening-state variants. |

## How to Run

Open `index.html` directly in a browser. No server, build command, or sign-in is needed.

## What to Expect

- Switch among **Prompt bar**, **Start button**, and **Search pill** before beginning.
- Choose an activity, a location, and a party-size range; use **Back** to see that the prior answer
  survives.
- On the final screen, use the answer chips to edit a previous step.
- Read the discussion rail beside the prototype, then use **Export interaction log** if you want to
  preserve a walk-through.

## Observability

The demo records every variant selection, step entry, answer, Back action and edit action with an
ISO timestamp. The export contains only demo interaction state — no address, account, or production
search data.

## Investigation Trail

1. Kept all three opening variants on the same staged flow so the comparison is about invitation and
   perceived commitment, not changed downstream content.
2. Used broad party-size ranges rather than claiming the current search query can filter by capacity.
   The product meaning of that answer remains an explicit discussion question.
3. Included both backward navigation and answer-chip edits because smooth forward motion is not
   enough if correction feels like restarting.

## Results

**VALIDATED, with one implementation question intentionally carried forward.** The owner selected
the **Search pill** as the idle invitation. Party size must filter out spaces that cannot fit the
selected group, rather than merely personalising a later booking screen. Spike 008 now resolves what
“can fit” honestly means for normal versus drop-in spaces when this Phase 24 journey has not yet asked
for a date.
