---
sketch: 005
name: mobile-path
question: "At 375px, does sticky bar → sheet → checkout → PayMongo hold together as one flow?"
winner: null
tags: [mobile, responsive, checkout, sheet, phase-12, RESP-02, BFLOW-06, BFLOW-07, SHELL-03]
---

# Sketch 005: The mobile booking path

## Design Question

Four requirements land in one flow, and they only make sense judged together:

- **RESP-02** — reach the booking CTA without scrolling the listing page, via a sticky bottom bar
  carrying the price and a 44px action.
- **BFLOW-06** — checkout is a single column on mobile with the summary behind a disclosure and a
  sticky confirm bar carrying the amount.
- **SHELL-03** — checkout's own minimal header holds the wordmark and the **live hold countdown**,
  with no navigation that can silently lose an active hold.
- **BFLOW-07** — the booker is told the redirect is coming, and where they are going, before leaving.

The open question is what the sticky bar's action actually *does*.

## How to View

```bash
start .planning/sketches/005-mobile-path/index.html
```

Everything is live. Tap **Check availability**, pick hours, **Book**, expand **Price details**, hit
**Confirm & pay**. The countdown really ticks.

## Variants

- **A: One sheet** — the locked direction. Calendar, hours, breakdown and CTA all in one overlay.
  Second phone shows checkout end to end including the PayMongo handoff.
- **B: Two-step sheet** — day, then hours. Shorter steps, full-width calendar, two taps.
- **C: Scroll to availability** — no overlay at all; the bar scrolls, then becomes the CTA once hours
  are picked.

## What to Look For

- **A's sheet height.** It fits at 375×720. Check the internal scroll and whether the pinned
  **Book · ₱1,360.00** bar stays reachable — that bar is the whole reason the sheet works.
- **C's ambiguity, then its payoff.** Before a selection the coral button is a *scroll* button wearing a
  booking CTA's clothes. Tap it, pick two hours, watch the bar become `Book · ₱1,360.00`. Decide
  whether that transition earns the earlier ambiguity.
- **B's cost is invisible until you want it.** Try imagining "is Saturday better?" — in B that is a
  step backwards; in A and C both are on screen.
- **The checkout header.** Wordmark is deliberately *not a link*. The countdown sits beside it and is
  the only live thing in the header. Ask whether losing global nav here feels like safety or like being
  trapped — SHELL-03 wants the first.
- **The disclosure.** Only the itemised lines collapse; **Total never does**. Collapsed, the booker
  still sees venue, window and amount — everything needed to know they are buying the right thing.
- **The handoff.** No dialog, no interstitial page. The button names the destination as it works, then
  a brief sheet states the amount and that the slot stays held. Judge whether that is enough warning,
  or whether money leaving the app deserves a harder stop.
- **320px.** Switch the viewport bottom-right. Seven 44px calendar cells is 308px before padding — this
  is where B's full-width calendar argument either proves out or does not.
