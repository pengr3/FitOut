---
spike: 005c
idea: host-verification-roadmap
name: responsive-stepper
type: comparison
validates: "Given the real four-gate host journey, when it is horizontal on desktop and vertical at 320px, then scan speed, geometry change, action clarity, and narrow-width behavior can be judged against the other compositions"
verdict: "VALIDATED ALTERNATIVE — shortest desktop composition, but copy is compressed"
related: [004, 005a, 005b]
tags: [phase-21, host, verification, ux, responsive]
---

# Spike 005c: Responsive Stepper

## What This Validates

Given identical host states and actions, does a horizontal stepper earn its faster wide-screen scan,
or does changing geometry at the phone boundary create an unnecessary second mental model?

## Research

No external library research was needed. The spike uses plain HTML/CSS/JavaScript and the same shared
content model as 005a/005b. It follows the project rule of one DOM tree at every width: CSS changes the
layout, but the nodes, state labels, and order do not change.

## How to Run

```bash
node build-demo.js
```

Open `index.html`, compare all scenarios, and pay particular attention to the switch between Desktop
and Phone · 320px.

## What to Expect

- Four columns connected left-to-right on desktop.
- The identical nodes form a vertical connected list in the phone frame.
- Long current-step copy competes for horizontal space on desktop.
- Exactly one action appears only when the current state provides a real way forward.

## Observability

The left rail records scenario and viewport changes with ISO timestamps and exports them as JSON.
`../_roadmap-lab/verification-log.json` contains the automated 18-case width/overflow sweep.

## Investigation Trail

1. Kept a single DOM tree and used CSS grid/flex only; this avoids desktop/mobile semantic drift.
2. Reserved a minimum copy block on desktop so button baselines remain comparable across steps.
3. Made the 320px transformation explicit in the demo because geometry change is this option's primary
   tradeoff, not an implementation detail to discover later.

## Results

**VALIDATED ALTERNATIVE.** At **244px** in the default desktop state this is the most compact and fastest
to scan. The cost is visible in the demo: four columns squeeze the explanatory sentences, and the same
nodes form a different vertical geometry at 320px. The user selected 005b instead.
