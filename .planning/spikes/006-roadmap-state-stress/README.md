---
spike: 006
idea: host-verification-roadmap
name: roadmap-state-stress
type: standard
validates: "Given the user-selected separate-card roadmap, when edge lifecycle and multi-listing states are rendered at desktop and 320px, then every card remains truthful, actionable only when action exists, and silent about grandfathered verification"
verdict: "VALIDATED — 8/8 automated checks and user-approved portfolio rule"
related: [005a, 005b, 005c]
tags: [phase-21, host, verification, edge-cases, responsive]
---

# Spike 006: Roadmap State Stress

## What This Validates

The layout winner is useful only if hard states do not make it lie. This spike drives seven scenarios:
rejection before and after its absolute retry instant, stale pending, grandfathered, listing rejection,
a mixed portfolio, and fully bookable.

## Research

No external research was needed. Inputs come from the Phase 21 roadmap and shipped modules:
`VERIFICATION_SIGNAL`, `loadHostVerification`, the shared cooldown, the four independent sell gates,
and the existing listing re-review mechanism. The demo deliberately marks the stale-pending control as
a candidate; the phase discussion still owns its final label and semantics.

## How to Run

```bash
node build-demo.js
```

Open `index.html`. Exercise every scenario at Desktop and Phone · 320px. In Mixed portfolio, compare
the two journey policies.

## What to Expect

- Rejected-during-cooldown shows a named cause and absolute instant, with no early action.
- Stale pending gains a visible candidate rescue while ordinary pending remains calm.
- Grandfathered reads `Account ready`, never claims a check occurred, and never names the state.
- Listing rejection points into the deliberate fix-and-resubmit path.
- Mixed portfolio exposes the unresolved aggregation decision rather than silently choosing it.

## Observability

The page logs scenario, viewport, and mixed-policy changes with ISO timestamps and exports them as JSON.
An inline truth audit checks four gates, grandfathered silence, cooldown action suppression, and the
absence of percentage progress. `verify.js` sweeps all scenarios/policies at both widths and writes
`verification-log.json`.

## Investigation Trail

1. Reused 005b's 2×2/stacked geometry; the layout variable is now fixed.
2. Added the exact absolute retry shape required by HVER-13 and intentionally provided no countdown.
3. Found the portfolio aggregation ambiguity: a host can have one bookable listing and one rejected
   listing, so `Done` can mean “the journey succeeded once” or “no listing needs action.” The demo keeps
   both policies switchable for an explicit decision.
4. Made the grandfathered card speak only about capability. Naming it checked would fabricate a verdict;
   naming it grandfathered would violate the host-silence requirement.

## Results

**VALIDATED.** The automated sweep passed **8/8** scenario/policy checks: every render held four
server-backed cards, expected action counts matched, the truth audit stayed green, and the 320px frame
had no horizontal overflow.

The user approved the **first-live policy** for mixed portfolios. Once any listing is live, the
account-level journey is complete. Another rejected listing may still be named as a fact, but its own
listing card owns the fix-and-resubmit action; it does not turn account onboarding back into an
unfinished journey.
