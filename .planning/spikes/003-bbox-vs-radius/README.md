---
spike: 003
name: bbox-vs-radius
type: standard
validates: "Given the shipped origin+radius search and a map that emits a viewport, when the two disagree, then which 'where' is authoritative, whether a bbox predicate needs a migration, and what happens to the D-53 relaxation ladder is decided by measurement"
verdict: "VALIDATED — policy A (bbox wins, radius dropped), with an explicit Search-this-area"
related: [001, 002, 004]
tags: [map, phase-18, MAP-01, MAP-02, D-53, D-32, GATE-06, postgis]
---

# Spike 003: bbox vs radius

## What This Validates

**Given** the shipped `origin + radius` search
(`ST_DWithin(location::geography, origin::geography, radius_m)`) and MAP-02's requirement that a
booker can move the map and re-search the visible area, **when** the map's viewport and the bar's
radius disagree, **then** which constraint is authoritative, whether the bbox predicate needs a new
index, and what becomes of the D-53 relaxation ladder — all decided by measurement rather than
preference.

## Why It Matters

Two "where"s cannot both be true. The bar says *Poblacion, Makati · within 10 km*; the map says
*whatever is on screen*. Whichever loses becomes a control that lies. And **rung 1 of the relaxation
ladder is `radius`** (`src/lib/search/relaxation.ts:75`) — so the losing constraint is not merely
cosmetic, it is wired into the zero-result recovery path that D-53 exists to make honest.

## How to Run

```bash
node probe.js         # Q1 index / Q2 policy comparison / Q3 the ladder collision (medians of 9)
node index-probe.js   # follow-up: is listing_location_geog_gist actually chosen, and when?
node build-demo.js    # regenerate the single-file index.html
```

Open `index.html` — a real Leaflet map over 400 published listings. Pan it, switch policy, and watch
the request and the warnings change. Basemap tiles are the only network dependency; without them
the map is blank and every count still holds.

## Observability

The probes print their own tables. The demo surfaces live counts (results / in-radius-off-screen /
on-screen-outside-radius), the exact request URL built from Leaflet's own `getBounds()`, and a
running count of URL states pushed versus map moves.

## Investigation Trail

**A cold-cache number nearly became a finding.** The first `probe.js` run timed the 10 km radius at
**77.5 ms** on `listing_status_idx`, against 0.58 ms for the bbox. Written up as-is that reads
*"radius search is slow and the geography index drizzle/0007 created for it is not being used"* —
a claim that would have pointed Phase 18 at a performance problem that does not exist.

`index-probe.js` settled it by sweeping selectivity, warmed, median of 9:

| radius | rows | % of set | median | index chosen |
|---|---|---|---|---|
| 0.5 km | 10 | 0% | 0.21 ms | `listing_location_geog_gist` |
| 1 km | 38 | 1% | 0.24 ms | `listing_location_geog_gist` |
| 5 km | 429 | 11% | 1.24 ms | `listing_location_geog_gist` |
| 10 km | 1,599 | 40% | **2.90 ms** | `listing_location_geog_gist` |
| 25 km | 3,970 | 100% | 3.63 ms | status only — correctly skipped, it matches everything |

The geography index is used at every selectivity where it can help, and 77.5 ms was one cold run.
`probe.js` now warms and medians. Same lesson as spike 002's negative deltas: **one measurement of a
cold cache is a story, not a number** — and both times the wrong story was the more interesting one,
which is exactly why it needed checking.

## Results

### Q1 — the bbox needs no migration

| predicate | rows | median | index |
|---|---|---|---|
| radius 10 km, `ST_DWithin` | 1,599 | 2.98 ms | `listing_location_geog_gist` |
| **bbox, `&& ST_MakeEnvelope`** | 620 | **0.48 ms** | **`listing_location_gist`** |
| bbox AND radius | 468 | 1.39 ms | both |

**Both indexes already exist at `0025`.** The geometry GiST index (`listing_location_gist`) serves
`&&` directly and the geography one serves `ST_DWithin`. MAP-02's server-side half is a
`WHERE` clause, not a migration — **GATE-06 is untouched by the map**, and the bbox is the cheaper
of the two predicates by 6×.

### Q2 — the three policies, once the map is panned toward Ortigas

| policy | results | | |
|---|---|---|---|
| **A · bbox wins** (radius dropped) | 620 | 0.48 ms | list == map |
| B · radius wins (map is a viewport) | 1,599 | 2.88 ms | **1,131 results off-screen, 152 visible pins excluded** |
| D · intersection (both apply) | 468 | 1.39 ms | can return 0 over a map full of pins |

**B fails MAP-01 outright.** MAP-01 requires the list and the markers to stay in sync; B guarantees
they do not — it puts 1,131 results in the list that the booker cannot see, and draws 152 pins that
are not in it.

**D fails a different way, and worse.** It can empty the page while the map is full of markers,
because two constraints disagree and nothing on screen says which one is binding. That is the
"never leave a screen with no next action" failure from D-137, arrived at by arithmetic.

**A is the only policy where the page tells the truth**, and it carries one obligation: **the
`Within … km` select must disappear while the map governs.** Leaving it on screen leaves a control
that changes nothing — the same defect in a different costume.

### Q3 — the ladder collision, measured

Rung 1 widens the radius to the next preset. With a bbox governing an empty viewport:

| policy | rung 1 fires | result | |
|---|---|---|---|
| bbox governs | radius 10 → 25 km | **0 → 0** | **the band lies** |
| radius governs | radius 10 → 25 km | 1,599 → 3,970 | the band tells the truth |

With a bbox as the binding constraint, widening the radius changes nothing, because the radius is
not what emptied the page. The band would render *"We widened your search to 25 km"* beside an
identical empty grid — and `e2e/zero-result-relax.spec.ts` compares the band's changed-constraint
value against the control's rendered text, **so it would stay green while the page lies**. The test
does not check that the results moved.

**Phase 18 must either suppress the radius rung whenever a bbox is governing, or give the ladder a
map-aware rung that zooms the map out.** The second is better: it relaxes what is actually binding
and keeps the band's promise checkable. Either way `relaxation.ts`'s rung list and that e2e spec are
both in scope, and the spec needs an assertion that the result set actually changed.

### The interaction question: auto-search on pan, or an explicit button?

Not a taste call — **D-32 makes the URL the search's identity**, so it is shareable and the Back
button works. Auto-search on pan pushes a URL state on every map move; after ten pans the booker
needs ten Back presses to escape the map, and the mechanism that made search shareable becomes a
history trap. The demo counts both so the trade is visible.

**Explicit "Search this area."** The map may move freely; only the button writes a URL. Back keeps
meaning *my previous search*. It also gives the keyboard equivalent MAP-04 demands a natural home:
a button is already operable, where "re-search when the viewport settles" has no keyboard analogue
at all.

### Signal for the build

- Ship **policy A**: when a bbox is present it is the only geo predicate; `lat/lng/radius` are
  dropped from the request, and the radius control is hidden while the map governs.
- The bbox predicate is `l.location && ST_MakeEnvelope(minLng, minLat, maxLng, maxLat, 4326)`,
  served by the existing `listing_location_gist`. **No migration.**
- Param shape, taken from Leaflet's own `getBounds()`:
  `bbox=minLng,minLat,maxLng,maxLat` — four fixed-precision floats, one param, URL-safe.
- **Explicit "Search this area"**, not auto-search on pan.
- **`relaxation.ts` and `e2e/zero-result-relax.spec.ts` are in Phase 18's scope.** The radius rung
  is wrong under a bbox, and the spec that guards the band cannot currently tell.
- Still open, and deliberately not answered here: **clustering** (400 pins is already busy at city
  zoom) and the roadmap's known **Leaflet `z-index: 1000` vs shadcn `z-50`** trap — DS-03 is the
  arbiter. Neither changes the policy verdict.
