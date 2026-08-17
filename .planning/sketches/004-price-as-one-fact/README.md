---
sketch: 004
name: price-as-one-fact
question: "Once rail and checkout both say Total, do they read as the same fact — and where does the fee explain itself?"
winner: "A"
tags: [pricing, checkout, listing, phase-12, BFLOW-04]
---

# Sketch 004: Price as one fact

## Design Question

BFLOW-04 makes a claim that cannot be checked on paper: *"the price breakdown a booker sees in the
listing rail is visually the same component at checkout, so they recognise it as the same fact."*
Recognisability is a visual property. This sketch puts the two surfaces side by side so it can be
judged rather than asserted.

Two decisions ride on it:

- **How literal is "the same component"** — fully itemised on both, or compact on the rail?
- **Does the rail keep "Est."?** The discussion said no: the rail figure is *exact by construction*
  (the RSC applies the same fee to the same space price checkout freezes), so "Est." understates a
  guarantee the system actually makes.

## How to View

```bash
start .planning/sketches/004-price-as-one-fact/index.html
```

Click the **ⓘ** beside any service-fee row — that popover is the "fee line explains itself on demand"
half. Click away or press Esc to dismiss.

## Variants

- **A: Same component, itemised** — the locked direction. Rail and checkout render the identical
  breakdown block; only what surrounds it differs. Includes the same component on the two other
  pricing shapes (open-capacity passes, full-day + extra guests) to prove it survives them.
- **B: Rail compact / checkout full** — the runner-up. Rail shows fee + Total; the run line appears
  first at checkout.
- **C: What ships today** — the "before". Same ₱1,360.00 in two unrelated containers, one labelled
  *Est.* and one *Total*.

## What to Look For

- **Go to C first.** The improvement is only legible against the current state.
- **In A, cover the surroundings with your hand** and compare just the breakdown blocks. If they read
  as one component, the claim holds. If your eye catches a difference, name it — that difference is a
  bug in the plan, not in the sketch.
- **In B, ask whether meeting `₱680/hr × 2 hours` for the first time at checkout is a problem.** It is
  a new row on the surface where money moves.
- **The popover on touch.** Imagine a thumb. The trigger is 22px inside a 44px row — check whether that
  needs to grow before this becomes a real component.
- **A's bottom section** is the part most likely to break in implementation: one component, three
  pricing shapes, no fork. `PriceBreakdown` already handles all three today via optional props.
- **The copy note under C** flags a line that does not survive the move: *"You'll pay this now"* is
  false on the rail, where no hold exists yet.
