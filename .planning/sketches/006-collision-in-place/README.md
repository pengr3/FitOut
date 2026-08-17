---
sketch: 006
name: collision-in-place
question: "Does a slot taken mid-selection read as a calm result rather than an error?"
winner: null
tags: [availability, states, phase-12, STATE-07]
---

# Sketch 006: Slot taken, in place

## Design Question

STATE-07: *"A 'slot just taken' collision resolves in place as a calm result rather than an error —
refreshed availability lands in the same paint so the user sees why, and the nearest alternatives are
offered rather than only a way back."*

What ships today is already halfway there: `book-cta.tsx` shows a calm neutral notice and calls
`router.refresh()`. Two things are missing — **naming what happened** in the same paint as the refresh,
and **offering what is next**.

## How to View

```bash
start .planning/sketches/006-collision-in-place/index.html
```

Press **Book this time** to fire the collision. **↻ reset** puts it back.

## Variants

- **A: Notice above the refreshed picker** — the locked direction. The notice names the lost window,
  9 and 10 AM flip to struck-through in the same paint, and the closest free windows are outlined in
  the grid the booker is already looking at.
- **B: Notice + nearest-window chips** — as A, but the two closest windows are one-tap buttons inside
  the notice. Click one and watch the rail repopulate.
- **C: Dialog** — an overlay states what happened and offers the same two windows.

## What to Look For

- **Watch the grid at the moment of collision**, not the notice. Two cells go struck-through with a
  brief ring. That single beat is what makes the message *evidence* rather than an assertion — the
  refresh is the explanation.
- **A vs B is one question: does an outline count as "offered"?** A points at the alternatives in the
  real picker; B lifts them out as buttons. B is faster but duplicates two controls that already exist
  eight centimetres below.
- **C on mobile.** At 375px the picker may be off-screen when the rail's button is tapped, which is the
  strongest argument for the dialog. Check whether that outweighs modalling a normal outcome.
- **The rail's behaviour is shared and is worth agreeing separately.** It drops the selection *and* the
  price rather than leaving a stale ₱1,360.00 next to a window nobody can book any more.
- **Scroll to "What it must never become"** — the red version, with the real `23P01` constraint text.
  Compare it against the calm one to calibrate what "calm" is buying.
- **grove.** The notice's coral-tinted border becomes teal. Check that it still reads as *attention*
  rather than as decoration when the accent hue changes.
