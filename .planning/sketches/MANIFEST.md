# Sketch Manifest

## Design Direction

Calm, confident, Airbnb-like booking surface for FitOut's booker availability calendar
(Phase 3 / plan 03-05, `src/components/availability/slot-picker.tsx`). Coral is the single
accent (selected hours + the book CTA); everything else is warm neutral. Occupancy is a
normal state, never an error — unavailable hours are muted + struck-through, never red.
All times render in the venue's local timezone (Makati, GMT+8), never the browser's (SC#2).
Slots are 60-min, on-the-hour (D-22/D-23); a booking is one contiguous run of hours or a
full operating day (D-23). This sketch explores the *interaction model* for selecting a
multi-hour window — the picker is advisory only; the DB `EXCLUDE` constraint is the real
authority and Phase 4 re-validates server-side.

### v1.1 / Phase 12 — added 2026-08-17

The direction above is unchanged and is now **locked by D-127** (the visual layer is an explicit
placeholder; Airbnb-calm with coral as the single accent, because it is what is half-built and
therefore cheapest to swap). What changed since 001 is that the tokens are **real**: `globals.css`
ships `court` and `grove` as complete, contrast-proven blocks.

Sketches 002–006 therefore do **not** invent a palette. `themes/court.css` and `themes/grove.css`
are transcribed verbatim from the shipped token blocks, and `themes/kit.css` is a shared component
layer built only from `var(--token)` references and only from primitives that exist in
`src/components/ui/`. Two consequences worth stating:

1. The mockups preview the **actual product**, not an adjacent one.
2. **The theme switcher is a leak test.** Grove moves geometry (20px radius vs 10px), type
   (34px/700 display vs 28px/600) and elevation (double blur, ink-tinted) — not just hue. A layout
   that only reads correctly in court is carrying a hardcoded value, and learning that in an HTML
   sketch costs an edit rather than a Phase-17 rewrite.

**Viewing:** open any `index.html` directly. Relative stylesheets resolve fine over `file://`; if a
preview surface snapshots the file as a `data:` URL the theme will not load, in which case serve the
directory over HTTP instead.

## Reference Points

Airbnb date/guest picker (calm, roomy, one accent), OpenTable / Calendly time-range pickers
(From/To affordance), Google Calendar event drag-to-create (range fill). For 002–006: Airbnb's
listing page (5-up mosaic → lightbox, sticky rail, mobile price bar → date sheet) and its
checkout's collapsed price disclosure.

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | timeslot-selector | Which interaction model for picking a multi-hour booking window — with unavailable-hour gaps — feels right? | **A · Range fill** | availability, booking, interaction, phase-03 |
| 002 | search-and-dead-end | Does a rate-only result card scan on a grid, and does the named relaxation read as an offer rather than a silent swap? | TBD | search, empty-state, phase-12, BFLOW-01, STATE-03 |
| 003 | listing-page-shape | Does the reordered listing page read as one product, and what do five key facts look like without becoming a spec sheet? | TBD | listing, gallery, layout, phase-12, BFLOW-02, BFLOW-03 |
| 004 | price-as-one-fact | Once rail and checkout both say Total, do they read as the same fact — and where does the fee explain itself? | TBD | pricing, checkout, phase-12, BFLOW-04 |
| 005 | mobile-path | At 375px, does sticky bar → sheet → checkout → PayMongo hold together as one flow? | TBD | mobile, responsive, checkout, phase-12, RESP-02, BFLOW-06/07, SHELL-03 |
| 006 | collision-in-place | Does a slot taken mid-selection read as a calm result rather than an error? | TBD | availability, states, phase-12, STATE-07 |
