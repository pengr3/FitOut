---
spike: 005a
idea: host-verification-roadmap
name: vertical-step-list
type: comparison
validates: "Given the real four-gate host journey, when it is rendered as one vertical bordered list, then sequence, current action, space cost, and 320px behavior can be judged against the other compositions"
verdict: "VALIDATED ALTERNATIVE — clearest sequence, but tallest default composition"
related: [004, 005b, 005c]
tags: [phase-21, host, verification, ux, responsive]
---

# Spike 005a: Vertical Step List

## What This Validates

Given identical host states and actions, does one bordered vertical list make the ordered journey
clearest without making the dashboard feel like a wizard or implying percentage progress?

## Research

No external library research was needed. This is a pure composition comparison using the product's
existing visual grammar: bordered calm panels, coral reserved for the current action, neutral waiting
states, and one component tree at every width. Spike 004 supplied the prior comparison method: identical
content and controls, measured at desktop and 375px/phone rather than evaluating screenshots with
different information in them.

## How to Run

```bash
node build-demo.js
```

Open `index.html`. Switch the host situation and preview width, then use the left navigation to compare
005b and 005c with the same selections.

## What to Expect

- One containing border and one top-to-bottom reading direction.
- A visible connector between four discrete states, never a percentage.
- Exactly one action in actionable scenarios and none once the listing is merely waiting or bookable.
- At 320px, the same tree narrows without changing its geometry.

## Observability

The left rail records scenario and viewport changes with ISO timestamps and exports them as JSON.
`../_roadmap-lab/verification-log.json` contains the automated 18-case width/overflow sweep.

## Investigation Trail

1. Started from the Phase 21 locked sequence: account check → payout setup → list a space → FitOut review.
2. Kept the content and scenario model shared with 005b/005c so composition is the only variable.
3. Added computed roadmap height, action count, and border count to make density visible rather than
   relying only on taste.

## Results

**VALIDATED ALTERNATIVE.** The sequence is strongest here: one border, one connector, one reading
direction. In the default Payouts-next state it measured **501px** tall, however, and spends substantial
vertical space on already-completed and future steps. The user selected 005b instead.
