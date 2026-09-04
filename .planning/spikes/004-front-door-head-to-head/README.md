---
spike: 004
name: front-door-head-to-head
type: standard
validates: "Given today's shipped 7-control search bar and spike 001's one box, when the same three booker intents are completed on both at desktop and 375px, then the interaction cost, the pre-submit network cost and the intents each side CANNOT serve are measured"
verdict: "VALIDATED with a limit — the box wins 5-10 taps per intent but does NOT subsume the controls"
related: [001, 002, 003]
tags: [ux, responsive, phase-18, D-137, search]
---

# Spike 004: Front Door, Head to Head

## What This Validates

**Given** today's shipped bar (`src/components/search/search-bar.tsx`) and spike 001's router
running unmodified, **when** three realistic booker intents are completed on both sides at desktop
and 375 px, **then** the interaction cost, the network cost before submit, and — the part that
matters most — **the intents the one box cannot serve** are measured rather than asserted.

## Why It Matters

D-137 says: when two options both satisfy a requirement, choose the one that costs the **booker**
less, and its first implication is *never make them tell us something twice*. This spike puts a
number on what the current front door costs, and finds where the replacement stops being better.

## How to Run

```bash
node build-demo.js   # inlines spike 001's router; writes index.html
```

Open `index.html`. Pick an intent, complete it on both sides, switch to 375 px. The tally at the
bottom fills in as each intent is completed on both.

## Method, and its one real limit

The left-hand side is a **replica**, not the live app: the dev server was not running, so the
controls were reconstructed from the shipped component — the address combobox, the single combined
activity select (D-35), the date popover, From, To, Price, Within, the `Use my location` ghost
button, and Search. **The counts are therefore derived from the component's control inventory, not
from driving the real page.** That is a genuine limit and it is why the replica models the
`Use my location` button at all: leaving it out would have overcharged the incumbent by two taps on
the "near me" intent, and a comparison that flatters the challenger by omission is worthless.

"Taps" counts control openings and selections — what a thumb pays for. **Keystrokes are not counted
on either side**, because the bar requires typing too (the address field), so counting them would
credit the box for something both do.

## Results

### Interaction cost — measured by driving both sides through their own handlers

| Intent | bar taps | box taps | saved | network before submit |
|---|---|---|---|---|
| pickleball in Makati tonight | **11** | **1** | **10** | bar 1 · box 0 |
| a gym near me on Saturday | **6** | **1** | **5** | bar 0 **+1 permission prompt** · box 0 |
| yoga in Ortigas, under ₱800 | **7** | **1** | **6** | bar 1 · box 0 |

Both sides produce the same shape of request. For intent 1 the bar emits
`?lat=…&lng=…&category=pickleball&date=…&start=18:00&end=22:00` after eleven taps and a geocoder
round-trip; the box emits the same params plus `place=Makati` after one.

**Every search today costs a third-party network call before the booker has submitted anything** —
the Photon lookup behind the address field. The box makes zero: spike 001 measured the geocoder
reached by 0 of 30 realistic queries.

### 375 px — the front door's share of the fold

| | height at 375 px | share of a 667 px phone screen |
|---|---|---|
| shipped bar (9 controls, stacked) | **570 px** | **0.85** |
| one box | **165 px** | 0.25 |

On an iPhone SE/8 the search bar alone consumes **85% of the first screen**. A booker on a phone
sees the front door and essentially no results without scrolling — before Phase 18 adds a map that
wants the same space.

### The honest loss — intent 3

`yoga in ortigas under 800` returned **partial**: `?category=yoga&q=ortigas+under+800`.

Two separate things, both correct behaviour and both limits:

1. **There is no price NLP, deliberately.** Spike 001's corpus fixed this as a case
   (`cheap pickleball` must not silently become a ceiling). "under 800" is a number the booker will
   be charged against — inventing a filter from it is exactly the D-137 "never surprise them with a
   number" failure. **The price control has to stay.**
2. **`ortigas` became free text plus a suggestion**, not an applied place — requirement R1 working
   as designed, because the catalog stores `Ortigas Center` and a prefix is an inference.

### Verdict — VALIDATED, with the limit as the actual finding

**The one box wins decisively on the common intents** (5–10 fewer taps, zero pre-submit network,
a third of the vertical space) **and it does not replace the filter controls.**

It replaces the *starting* interaction. The controls remain, for refinement and for everything
natural language should not guess — price above all. That is Airbnb's real model too: a box that
gets you into the right neighbourhood of results, and controls that narrow from there.

This matters for scoping. "One box replaces the bar" is a rewrite of the whole search surface;
"one box in front of the bar, controls kept for refinement" is additive, keeps every existing
control's tests and behaviour, and leaves the D-59 / D-137 scope guard intact — no saved searches,
no favourites, no new filters.

### Signal for the build

- Ship the box **in front of** the existing controls, not instead of them.
- **Keep the price control.** No natural-language price parsing, in this milestone or the next.
- What the box resolves should **populate the controls visibly**, so the booker can see what was
  understood and correct it — the same discipline as R1's suggestions, applied to the whole bar.
- The 375 px number (570 px, 85% of the fold) is a **GATE-RESP problem that already exists** and
  Phase 18 will make worse by adding a map. Collapsing the bar to the box plus a "Filters" control
  on small screens is the obvious answer and belongs in the phase's UI spec.
- Re-measure against the **live app** during Phase 18's UI work. These counts are sound but they are
  read off a replica, and the replica is the one thing in this spike set that was not driven for
  real.
