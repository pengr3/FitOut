---
sketch: 002
name: search-and-dead-end
question: "Does a rate-only result card scan on a grid, and does the named relaxation read as an offer rather than a silent swap?"
winner: null
tags: [search, empty-state, phase-12, BFLOW-01, STATE-03]
---

# Sketch 002: Search results & the named dead end

## Design Question

Two questions on one surface, because they share a page and one constrains the other:

1. **BFLOW-01** — the card leads with the photo and puts title and price on one baseline, "in the same
   unit checkout will charge". The discussion locked **rate-only** (`₱420/hr · ₱3,150/day` +
   *Service fee included*), never a computed window total. Does price read without interaction?
2. **STATE-03** — a booker with no results is never at a dead end, and *the page names which constraint
   was relaxed*. Today the fallback drops radius, category, price, date, start AND end at once and
   renders the result under an unlabelled "You might also like". Where does the naming go?

## How to View

```bash
start .planning/sketches/002-search-and-dead-end/index.html
```

Four states in the top bar: **Results · Loading · Zero result · Cold start**. The three variants apply
to the zero-result state; the card, the loading skeleton and cold start are shared.

## Variants

- **A: Banner above alternatives** — the relaxation is applied automatically and a band above the grid
  names it, with an Undo. The filter chip updates to `25 km` and highlights.
- **B: Opt-in from the empty state** — the empty state shows the whole ladder (which rung hit, which
  were not needed, and that activity is never relaxed) and the primary action applies it.
- **C: Labelled divider** — the shipped empty state and its three hatches are untouched; the
  "You might also like" divider simply gains the name of what was dropped.

## What to Look For

- **On the card:** does the rate read as a price, or does its absence of a total feel like a missing
  number? Check the drop-in card (third tile, Results state) — badge, explainer line, spots chip and
  a `/person` rate all land above the price without the tile becoming a spec sheet.
- **A vs B is the real fork:** A never shows an empty page but silently changes the search; B never
  changes the search but shows an empty page for one beat. B is also the only variant where the
  *ladder itself* is visible — worth deciding whether that legibility is a feature or a spec dump.
- **C's contradiction:** the empty state says "No spaces match those filters" directly above six cards.
  Look at whether that reads as helpful or as the page arguing with itself.
- **Both themes.** Switch to grove bottom-right: the display type jumps 28→34px and 600→700, radius
  doubles 10→20px, and shadows deepen and tint. If a variant only reads well in court, it is carrying
  a hardcoded value.
- **320px** (bottom-right): the four filter chips must wrap, and the price + `Service fee included`
  pair must not.
