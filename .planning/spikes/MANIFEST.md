# Spike Manifest

## Idea

**How should FitOut's search front door actually work?**

Today the demand-side front door (`src/components/search/search-bar.tsx`) is an OpenStreetMap
geocoder box plus five structured filter controls. There is **no free-text query parameter at
all** — `searchParamsSchema` carries `lat/lng/category/date/start/end/priceMax/radius/sort/page`,
every one a filter and none a query. A booker cannot search a listing by name, cannot type a
district the geocoder does not know, and pays six controls for one intent. There is also no map.

These spikes decide the **query model** for Phase 18, which the PM has renamed from *Search-Results
Map* to **Search & Discovery** (2026-08-31): the spikes settle *how*, not *whether*. Two hard
constraints bind every one of them:

- **GATE-06** — v1.1 ships **zero schema migrations**; `drizzle/` stays at `0025`. A `tsvector`
  column or GIN index is a scope alarm to raise explicitly, never absorbed into a plan.
- **D-130** — the query and the map's bbox go into the **server** query. No availability and no
  price is ever computed on the client.

## Requirements

Design decisions that emerged during spiking. Non-negotiable for the real build.

- **R1 — Only certainty becomes a filter.** Only confidence-1.0 matches (an exact hit in the closed
  vocabulary, or an exact hit in our own catalog) may be applied as search params. Every inference —
  fuzzy, prefix, alias — is shown as a suggestion the booker confirms. *Measured in 001: a wrong
  category does not fail to help, it silently deletes every listing the booker wanted.*
- **R2 — The geocoder is the LAST stage, never the first**, and is clamped to the launch `bbox`.
  *Measured in 001: unclamped, `pickleball` returns two courts in the United States.*
- **R3 — Place suggestions come from the catalog, not from the world.** A place we offer must be a
  place with published listings. *Measured in 001: Photon answers `Ortigas` with a residential
  subdivision; the catalog answers with `Ortigas Center, Pasig`, which has a listing.*
- **R4 — Free-text `q` is length-capped** before it reaches any SQL predicate. *001 passed a
  5,000-character input straight through, and 002 makes every word a separate ILIKE term.*
- **R6 — Free text is per-word AND ILIKE with naive suffix stripping, never a phrase `%q%`.**
  *Measured in 002: the phrase form returns ZERO on reversed word order, on a stop-word between
  terms, and on words in different sentences — four of eight probes.*
- **R7 — GATE-06 is not threatened by search, and the trigger is recorded.** A GIN index becomes
  mandatory between **~12,000 and ~20,000 published listings**; FitOut has 18. The threshold ships
  as a comment beside the query so the next person inherits it instead of rediscovering it.
- **R5 — Phase 18 is renamed `Search & Discovery`** and carries new `SEARCH-xx` requirement IDs
  alongside `MAP-01..04`. *PM decision, 2026-08-31.*

## Spikes

| # | Name | Type | Validates | Verdict | Tags |
|---|------|------|-----------|---------|------|
| 001 | one-box-intent-routing | standard | One box → server params via a closed-set-first staged router, no migration | ✓ **VALIDATED** — 30/30 corpus, geocoder reached 0/30, 0.01–0.05 ms/query | search, phase-18, query-model, geocoding |
| 002a | freetext-ilike (per-word) | comparison | `ILIKE` inside the real stage-1 gate, 500–50,000 published listings | ✓ **WINNER** — added cost indistinguishable from zero below ~12k listings; matches FTS on 7/8 quality probes | search, postgres, GATE-06 |
| 002b | freetext-fts-no-migration | comparison | Query-time `to_tsvector()`, no stored column, no GIN | ✗ **INVALIDATED** — strictly dominated: FTS quality without the index, at 8x ILIKE's cost (564 ms vs 68 ms at 25k) | search, postgres, GATE-06 |
| 003 | bbox-vs-radius | standard | Which "where" is authoritative when the map moves and the bar still holds an address + radius | ○ pending | map, phase-18, MAP-02, D-53 |
| 004 | front-door-head-to-head | standard | Today's 7-control bar vs the one box + map, same three intents, 375px and desktop | ○ pending | ux, responsive, phase-18 |
