---
spike: 005b
idea: host-verification-roadmap
name: separate-cards
type: comparison
validates: "Given the real four-gate host journey, when every gate is a separate card, then local clarity, competing visual weight, space cost, and 320px behavior can be judged against the other compositions"
verdict: "WINNER — user-selected for the Phase 21 state stress test"
related: [004, 005a, 005c]
tags: [phase-21, host, verification, ux, responsive]
---

# Spike 005b: Separate Cards

## What This Validates

Given identical host states and actions, do four separately bordered cards make each gate easier to
understand, or do they turn one journey into four competing dashboard objects?

## Research

No external dependency or API is involved. The comparison reuses FitOut's established panel-card
language and Spike 004's head-to-head method. All variants receive the same strings, state machine,
control count, palette, and device shell.

## How to Run

```bash
node build-demo.js
```

Open `index.html`, exercise all six host situations, and compare desktop with Phone · 320px.

## What to Expect

- A two-by-two grid on desktop and four stacked cards on phone.
- Four independent borders and larger local targets for scanning.
- The current card gains only a subtle border emphasis; waiting remains calm.
- The sequence is communicated by step numbers rather than by a connecting line.

## Observability

The left rail records scenario and viewport changes with ISO timestamps and exports them as JSON.
`../_roadmap-lab/verification-log.json` contains the automated 18-case width/overflow sweep.

## Investigation Trail

1. Gave every card identical minimum space so the comparison does not flatter short-copy states.
2. Stacked the same cards at 320px instead of creating a second mobile tree.
3. Exposed border count beside height because this variant spends more visual containers than the other
   two even when its pixel height is competitive.

## Results

**WINNER.** The user selected the separate-card composition after comparing all three interactively.
At the default desktop state it measured **392px** tall: shorter than the vertical list while preserving
full explanatory copy. Its four borders cost more visual weight, but make the important product truth
legible: each row is its own server-backed gate rather than a percentage or one inferred checklist.
