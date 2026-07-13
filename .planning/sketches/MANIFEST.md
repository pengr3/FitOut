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

## Reference Points

Airbnb date/guest picker (calm, roomy, one accent), OpenTable / Calendly time-range pickers
(From/To affordance), Google Calendar event drag-to-create (range fill).

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | timeslot-selector | Which interaction model for picking a multi-hour booking window — with unavailable-hour gaps — feels right? | **A · Range fill** | availability, booking, interaction, phase-03 |
