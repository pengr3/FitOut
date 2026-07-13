---
sketch: 001
name: timeslot-selector
question: "Which interaction model for picking a multi-hour booking window — with unavailable-hour gaps — feels right?"
winner: "A"
tags: [availability, booking, interaction, phase-03]
---

# Sketch 001: Timeslot Selector

## Design Question

The booker calendar (03-05) currently selects a booking window by **clicking each hour** in a
contiguous run. How should selecting a **multi-hour** window feel, given that a booking must be
**one continuous block** (the DB `EXCLUDE` constraint stores it as a single `tstzrange`), so a
start→end range **can't span** a booked/blocked hour?

## How to View

Served over HTTP (JS builds the grid, so a static file preview won't render it):

**http://localhost:4599/001-timeslot-selector/index.html**

(or open `index.html` directly in Chrome — `file://` works too since JS runs locally)

## Variants

- **A: Range fill** — click a **start** hour, then an **end** hour; the block fills between. If the
  range crosses an unavailable hour it **truncates at the gap** with a soft inline hint. Fewest
  clicks; keeps the hour grid as the availability map. *(Recommended.)*
- **B: From / To dropdowns** — two menus (OpenTable style). The **To** list only offers end times up
  to the next unavailable hour, so gaps are handled by construction. Grid stays as a read-only map.
- **C: Click each hour (current)** — accurate to the shipped `SlotPicker`: click hours, adjacent
  clicks extend the run, unavailable hours can't be included. Baseline for comparison.

## What to Look For

- **The gap moment** (the real decision): on the seeded day, **8:00 AM** is booked and **10:00 AM**
  blocked, and **4:00 PM** is booked. In A, click **3:00 PM then 6:00 PM** — does truncating to 3–4 PM
  with a hint feel right, or confusing? In B, set **From = 3:00 PM** and watch the **To** list stop at
  4:00 PM. In C, note you simply can't bridge the gap.
- **Clicks to book 5–8 PM**: A (2 clicks) vs C (3 clicks) vs B (2 dropdowns).
- **Do unavailable hours stay legible** (muted + struck-through, never red) in each model?
- **Venue-tz note** ("Makati, GMT+8") + the **rail summary** ("3:00 PM – 6:00 PM · N hours · ₱total").
- Toggle **"Simulate a 3-court venue"** to see the per-hour "N of 3 free" hint.
- Touch feel: which model would you rather use on a phone?
