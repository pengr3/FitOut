# Phase 14: Host Tooling - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-23
**Phase:** 14-Host Tooling
**Areas discussed:** Dashboard "today" shape · Requests-inbox row model · Wizard rail + checklist placement · Availability week-at-a-glance shape

**Format:** one batched turn, four product forks, per the PM/SWE operating contract (product forks only,
recommendation first, real trade-off in every description). All four recommendations were taken.

---

## Dashboard "today" shape (HFLOW-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Real agenda + signals | A list of TODAY's actual sessions (guest, space, venue-local time, status) with requests-owed, payout state and hours-missing as compact rows beneath. Costs one new owner-scoped query. The only option where a host with 3 sessions today sees them without navigating. | ✓ |
| Counts and links only | Four signal tiles, each linking to the page that already exists. Cheapest — no new query, no new time math — but a host still cannot see WHO is coming without a second click. | |
| Today + next 7 days | An agenda strip spanning the coming week. More useful when bookings are sparse, but blurs the "what do I owe TODAY" promise and is a bigger surface to build and baseline. | |

**User's choice:** Real agenda + signals.
**Notes:** Recorded as 14-CONTEXT D-140. The new read is a read only — no logic moves and no migration is
implied. D-141 pins the time authority (venue-local, DB clock) because that is where this option's only
real risk lives.

---

## Requests-inbox row model (HFLOW-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Row is self-sufficient | Everything needed to decide is on the row; no navigation at all. Decline confirms (irreversible, refunds the booker). Keeps the inbox a pure triage queue and matches how the row is already built. | ✓ |
| Row opens booking detail | Row clicks through to the full booking, with approve/decline in both places. More information, but turns a triage queue into a browsing surface and doubles the action surface. | |
| Only the space title links | Row stays a queue but the space name links to the listing. One nested link inside a row with two buttons — more keyboard stops, more a11y care. | |

**User's choice:** Row is self-sufficient.
**Notes:** Recorded as 14-CONTEXT D-144, and it closes an open question Phase 11 deliberately left to this
phase (`11-11-SUMMARY.md:283`): `RowCard`'s optional `href` stays unused on the request row. D-145 (decline
confirms, approve does not) and D-146 (the SLA countdown is the loudest element, and keeps its final-hour
emphasis on this hours-scale surface) follow from it.

---

## Wizard rail + checklist placement (HFLOW-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Back to visited, side checklist | Rail jumps back to any already-visited step (not forward); the publish checklist becomes a persistent side panel on desktop / collapsible summary on mobile. A host can never skip into a step whose prerequisites are blank. | ✓ |
| Jump to any step | Every step reachable at any time — defensible since each step autosaves and the server re-validates — but a first-time host can land on a step with blank prerequisites, and the occupancy fork changes which steps exist. | |
| Back-only, checklist stays at the end | Smallest change, but keeps the end-of-flow surprise the requirement exists to remove. | |

**User's choice:** Back to visited, side checklist.
**Notes:** Recorded as 14-CONTEXT D-148 and D-149. Visited-ness is tracked by step KEY rather than index —
the walked list is mode-dependent (`wizard.tsx:380`). D-150 adds the visible save state; D-151 records that
the truthful step count across the occupancy fork already works and is a no-regression obligation, not new
work.

---

## Availability week-at-a-glance shape (HFLOW-04)

| Option | Description | Selected |
|--------|-------------|----------|
| 7-day bar strip, weekly pattern | Seven columns drawing each day's open windows against a 24h scale, updating live as the host edits and before saving. Shows the recurring pattern only. Makes a mistyped 6 PM–6 AM window instantly visible. | ✓ |
| Plain text summary per day | "Mon 6:00 AM–10:00 PM · Tue Closed", live-updating. Cheapest and trivially accessible, but repeats the fields above it — confirmation rather than insight. | |
| Bars + the next 7 real dates | Overlays actual blocks/closures so it shows what a booker would see. Most truthful, but conflates "my weekly pattern" with "this specific week" and needs a second query. | |

**User's choice:** 7-day bar strip, weekly pattern.
**Notes:** Recorded as 14-CONTEXT D-152, with D-153 requiring a text equivalent from the same derivation
that draws the bars. Date-specific blocks are explicitly not overlaid — that is what the `BlocksEditor`
below the strip controls.

---

## Claude's Discretion

Decided by the SWE side and recorded in CONTEXT rather than escalated, per the operating contract:

- **The quiet-day dashboard state** (D-142) — shows the next upcoming session rather than an empty box.
  A dead screen is never the right answer, and this is the dashboard cousin of the inbox-zero rule the
  requirement already states.
- **The host listing tile stays as it is** and the UI-SPEC's `ResultCard` *Replaces* list is corrected
  instead — closing deferred item `[11-16]`, which explicitly named this a Phase-14 call. A management tile
  with four in-card controls cannot become one anchor without nested-interactive a11y problems, and DS-11
  forbids a fourth container.
- **`address-autocomplete.tsx`'s live-region exclusion is discharged here** — the last remaining entry in
  `LIVE_REGION_EXCLUSIONS`.
- **Row heights are re-measured at adoption** rather than trusting the 80px constant (`[11-08]`).
- Everything below the product line — file layout, component decomposition, query shape, test strategy,
  server/client boundaries, plan count.

## Deferred Ideas

- **Availability copy-to-all** — Phase 19 (PROJECT D-136). Named explicitly at the top of the discussion so
  it could not drift into this phase's hours-editor work.
- **Host-side filtering/sorting on `/host/bookings`** — a new capability, not a token pass.
- **Making the host listing tile navigable** — considered and rejected above; recorded in case a future
  phase revisits it.
- **The drop-in month grid's 28×28 hit area and its in-flight month read** (`[12-09]`, `[12-10]`) — booker
  surfaces.
- **`NEXT_PUBLIC_APP_URL` is unset** (`[11-14]`) — environment, not this phase.
