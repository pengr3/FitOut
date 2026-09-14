---
spike: 009
idea: progressive-search-flow
name: progressive-journey-stress
type: standard
validates: "Given the selected compact search pill and capacity-only party filter, when a booker starts, backs up, edits, cancels, submits, and changes viewport, then intent is retained or cleared deliberately."
verdict: PENDING HUMAN REVIEW
related: [007, 008]
tags: [phase-24, search, ux, responsive, state-machine]
---

# Spike 009: Progressive Journey Stress Test

## What This Validates

Given the chosen search-pill invitation and capacity-only party filter, when a booker changes their
mind mid-flow or corrects a finished answer, then the journey remains a small conversation instead of
becoming a lossy wizard. The test has no production routing or API dependency; it validates the
interaction state required before that wiring is planned.

## Research

| Locked input | Stress condition |
|---|---|
| Search pill is the idle invitation | Cancel must restore the browseable idle state rather than leave an empty shell. |
| Activity → location → party size | Back must preserve the already supplied answer; a correction must go to the exact step. |
| Capacity-only party semantics | Result chips describe a group-size filter, not a reservation or remaining capacity. |
| Mobile matters | The same DOM flow must work at phone width; it must not create a separate mobile journey. |

## How to Run

```bash
node journey-model.test.js
node build-demo.js
```

Open `index.html`. Use the scenario buttons or drive the journey manually, then switch between
desktop and phone shells.

## What to Expect

- Back and edit keep earlier answers until a user replaces them.
- Cancel clears the in-progress answers and returns to the idle pill.
- Submit collapses the answers to editable chips and labels party size as a capacity filter.
- The phone shell uses the same interaction structure, only a narrower presentation.

## Investigation Trail

1. Modelled the flow as explicit stages rather than implicitly inferring a stage from which values
   happen to be present.
2. Tested cancellation separately from Back: correction retains intent; cancellation deliberately
   abandons it.
3. Tested result editing, since an elegant forward flow that makes correction restart from scratch is
   not a successful search experience.

## Results

**Pending human review.** Validate the interaction at both widths and call out any moment where the
flow feels too formal, too sparse, or fails to make the current answer obvious.
