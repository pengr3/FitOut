# Phase 24: Search Bar Rework - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-14
**Phase:** 24-search-bar-rework
**Areas discussed:** opening state, activity catalogue, location, party size, results and no-results recovery

---

## Opening state and journey

| Option | Description | Selected |
|--------|-------------|----------|
| Search pill | Compact idle invitation that opens the staged journey on engagement | ✓ |
| Start button | Separate primary action before the journey | |
| Prompt bar | Larger inline invitation | |

**User's choice:** Search pill.
**Notes:** The sequence is activity/type → location → party size. Confirmed activity and location
answers advance immediately; Back/Edit retain answers and Cancel clears the in-progress flow.

---

## Activity and location

| Option | Description | Selected |
|--------|-------------|----------|
| Full searchable catalogue | Full known activity/type catalogue, filtered while typing | ✓ |
| Quick-pick activities | Curated popular activity cards first | |
| Exact selection required | No unmatched free-text search; show a no-match state | ✓ |
| Close suggestions | Suggest approximate catalogue matches | |

**User's choice:** Full searchable catalogue; unmatched text shows `No matching activity or type`.
**Notes:** The location step includes both existing address autocomplete and Use my location.

---

## Party size

| Option | Description | Selected |
|--------|-------------|----------|
| Party-size bands | Conservative upper-bound capacity filter | |
| For me / For a group | One-person shortcut or exact group-size input | ✓ |
| Date-aware availability | Add a date before result filtering | |

**User's choice:** For me immediately searches with 1; For a group takes an exact headcount and
enables See spaces once valid.
**Notes:** Server filtering uses configured maximum capacity only. A date-specific remaining-places
claim stays in booking.

---

## Results and recovery

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate results | Final confirmed party choice opens results | ✓ |
| Final confirmation | Require a confirmation for all party choices | |
| Direct editable chips | Each selected answer can be changed from results/no-results | ✓ |
| One Edit search action | Reopen the journey as the sole recovery path | |

**User's choice:** Immediate results for For me; group uses its validated See spaces action. Results
and no-results states show direct editable activity, location and party-size chips.
**Notes:** User explicitly chose to remove the existing date/time, price and radius controls rather
than retaining them as advanced filters.

---

## the agent's Discretion

- Exact typography, animation, focus behavior, numerical bound and responsive layout within the
  captured interaction contract.

## Deferred Ideas

- Date-aware availability search, free-text/fuzzy activity search, and NLP price search remain future
  search-discovery work.

---

## Gap-closure: search presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Inline expanding questions | Questions grow in the document flow and move surrounding content | |
| Anchored overlay / mobile sheet | A floating desktop overlay opens from the pill; a mobile sheet owns the viewport | ✓ |
| Separate search route | Leave the page for a dedicated search wizard | |

**User's choice:** Anchored overlay on desktop and a full-screen sheet on mobile.
**Notes:** The existing staged questions are retained, but their opening must not make the page jump or
reflow. Exact scrim, animation and focus-restoration details are implementation discretion, subject to
accessibility and reduced-motion support.

---

## Gap-closure: nearby location reach

| Option | Description | Selected |
|--------|-------------|----------|
| Strict city boundary / 10 km default | Limit results tightly to the entered municipality or current small default | |
| Fixed 25 km nearby reach | Use selected coordinates as origin; return and rank nearby spaces within 25 km | ✓ |
| Visible radius control | Let the booker manually choose a reach | |

**User's choice:** Fixed, non-exposed 25 km reach, sorted nearest first.
**Notes:** A Mandaluyong-origin search should rank its closest spaces first but include nearby Makati spaces when they fall within the approved reach. Coordinates, not city-name boundaries, are authoritative; the product must not silently extend beyond 25 km.

---

## Gap-closure: verified state correctness

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve stale answers on Back | Completed answer chips stay after navigation returns to the idle route | |
| Reverse-sync to idle | Clear completed answers when the canonical URL is cold; add lint-safe regression coverage | ✓ |

**User's choice:** Repair the verified Back-navigation state bug as part of this closure work.
**Notes:** The plan must resolve both the stale-chip behavior and the `search-experience.tsx` React-hooks
lint findings rather than suppressing either.
