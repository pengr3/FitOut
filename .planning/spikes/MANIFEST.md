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
  5,000-character input straight through.*
- **R5 — Phase 18 is renamed `Search & Discovery`** and carries new `SEARCH-xx` requirement IDs
  alongside `MAP-01..04`. *PM decision, 2026-08-31.*

## Spikes

| # | Name | Type | Validates | Verdict | Tags |
|---|------|------|-----------|---------|------|
| 001 | one-box-intent-routing | standard | One box → server params via a closed-set-first staged router, no migration | ✓ **VALIDATED** — 30/30 corpus, geocoder reached 0/30, 0.01–0.05 ms/query | search, phase-18, query-model, geocoding |
| 002a | freetext-ilike | comparison | `ILIKE` over title/description/city/neighborhood at 50 / 500 / 5,000 listings | ○ pending | search, postgres, GATE-06 |
| 002b | freetext-fts-no-migration | comparison | Query-time `to_tsvector()` with no stored column and no GIN index, same scale ladder | ○ pending | search, postgres, GATE-06 |
| 003 | bbox-vs-radius | standard | Which "where" is authoritative when the map moves and the bar still holds an address + radius | ○ pending | map, phase-18, MAP-02, D-53 |
| 004 | front-door-head-to-head | standard | Today's 7-control bar vs the one box + map, same three intents, 375px and desktop | ○ pending | ux, responsive, phase-18 |
