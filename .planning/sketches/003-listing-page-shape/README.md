---
sketch: 003
name: listing-page-shape
question: "Does the reordered listing page read as one product, and what do five key facts look like without becoming a spec sheet?"
winner: "B"
tags: [listing, gallery, layout, phase-12, BFLOW-02, BFLOW-03]
---

# Sketch 003: Listing page shape

## Design Question

BFLOW-02 fixes the order — **gallery → title → key facts → description → availability → map →
cancellation policy → host**. Two of those moves are real changes to what ships: availability rises
*above* the map, and cancellation gets its own section while **keeping** its compact line in the rail
(there is no rail on mobile, which is the case for both).

That leaves two things the requirement does not decide:

1. **What does a key-facts block look like** when it carries five persisted facts — capacity, space
   type, booking mode, drop-in mode, unit count — without reading like a spec table?
2. **Does the 5-up mosaic survive real supply?** BFLOW-03 replaces the carousel with a hero grid and a
   full-screen keyboard-pageable dialog. The mosaic assumes five photos. Hosts upload one to eight.

## How to View

```bash
start .planning/sketches/003-listing-page-shape/index.html
```

Click any photo or **Show all 8 photos** to open the lightbox — arrow keys page it, Esc closes it.
The **↓ mosaic fallbacks** button jumps to the photo-count shapes.

## Variants

- **A: Icon row** — glyph + fact + qualifier, wrapping. Warmest, most Airbnb.
- **B: Bordered strip** — four cells with label/value. Densest and most scannable; most spec-sheet-like.
- **C: Chips under the title** — outline badges. Lightest touch, and reuses a component that already
  exists; least room for a qualifier line.

## What to Look For

- **The qualifier lines in A** ("per booking", "book one exclusively") are what stop `4 courts` being
  ambiguous — a booker could otherwise read it as "you get four courts". B and C have nowhere to put
  that. Decide whether the ambiguity is real enough to cost the density.
- **The mosaic at 3 and 4 photos.** Five and one are easy. Three and four are where a 2×2 gets a hole
  in it. Judge whether the fallback shapes still read as deliberate.
- **The host block.** It carries avatar, first name, "Host since June 2026" and bio — all real columns
  via `publicProfile`. The instant-book notice is under it; the yellow note shows the
  **request-to-book** wording, which deliberately states no hour count, because D-96 shortens the
  approval SLA proportionally and "within 24 hours" is frequently false.
- **The cancellation section vs the rail line.** Both are present. Look at whether that reads as
  useful reinforcement at the decision point, or as the page saying the same thing twice.
- **grove** doubles the radius to 20px and pushes display type to 34px/700. The mosaic's 8px gaps and
  the strip's cell borders are where a doubled radius shows up first.
