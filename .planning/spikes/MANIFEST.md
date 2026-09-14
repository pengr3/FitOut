# Spike Manifest

> ## ⏸ Historical status: `search-front-door` is DEFERRED
>
> **Phase 18 (Search & Discovery) was deferred out of v1.1 to backlog 999.3 on 2026-08-31
> (PM decision, D-141)** — after these four spikes ran, and before any plan was written.
>
> **Those four search spikes stand.** All are complete, with runnable demos and forensic logs. When this work
> resumes it starts from measured answers, not a blank page. **D-139 and D-140 remain adopted** —
> D-140 ("only certainty becomes a filter") binds whenever search work resumes, and the GATE-06
> crossover (~12,000–20,000 published listings, against 18 today) is a live threshold regardless of
> when the work happens. The Requirements below are likewise recorded, not retracted.
>
> **Two findings did NOT leave with the phase**, because they are defects in shipped code:
> see [`deferred-items.md`](deferred-items.md) — the relaxation spec that cannot detect a lying
> band (S-1), and the 570px mobile search bar (S-2).

## Ideas

### search-front-door

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

**Requirements:**

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
- **R8 — When a bbox is present it is the ONLY geo predicate.** `lat/lng/radius` are dropped from
  the request and the `Within … km` control is hidden while the map governs. *Measured in 003:
  letting the radius win puts 1,131 results in the list that are off-screen and draws 152 pins that
  are not in it — MAP-01 requires the two to stay in sync, and that policy cannot.*
- **R9 — The map re-searches on an explicit "Search this area", never on pan.** *D-32 makes the URL
  the search's identity; auto-search pushes a history state per map move and turns the Back button
  into a trap. A button is also the only form MAP-04's keyboard equivalent can take.*
- **R10 — `relaxation.ts` and `e2e/zero-result-relax.spec.ts` are in Phase 18's scope.** *Measured
  in 003: with a bbox governing, ladder rung 1 (widen the radius) moves the result set 0 → 0 while
  the band still announces "we widened your search to 25 km" — and the e2e spec compares the band
  against the control, not against the results, so it stays GREEN while the page lies.*
- **R11 — The box goes IN FRONT of the existing controls, never instead of them.** What it resolves
  populates the controls visibly so the booker can see and correct it. *Measured in 004: the box
  saves 10 / 5 / 6 taps on three intents and removes the pre-submit geocoder call entirely, but
  returns only PARTIAL on "yoga in ortigas under 800" — there is no price NLP and there must not be
  (D-137: never surprise them with a number). Scoping consequence: this is additive, not a rewrite
  of the search surface.*
- **R12 — The 375px front door is already over budget and Phase 18 makes it worse.** *Measured in
  004: the shipped bar stacks to 570px, 85% of a 667px phone screen, before a map is added. The
  phase's UI spec owes small screens a collapsed box + Filters control (GATE-RESP).*
- **R5 — Phase 18 is renamed `Search & Discovery`** and carries new `SEARCH-xx` requirement IDs
  alongside `MAP-01..04`. *PM decision, 2026-08-31.*

### host-verification-roadmap

Compare how FitOut should show a host the ordered journey from account setup to a bookable listing,
using the real four-gate sequence and the project's established calm host-surface language. This is
an experiential layout decision for Phase 21, not product implementation.

**Requirements:**

- **R1 — The complete roadmap lives on the host dashboard.** Each current step may route to its
  existing destination; `/host/verify` remains a once-only detail/action page rather than the roadmap's
  home.
- **R2 — Compare before locking the composition.** Vertical step list, separate cards, and responsive
  horizontal stepper must be experienced with identical content at desktop and phone widths before one
  becomes the Phase 21 decision.
- **R3 — No percentage progress.** The roadmap uses discrete server-backed steps and never implies that
  waiting on a third party has a meaningful completion percentage.
- **R4 — The journey completes at the first live listing.** In a mixed portfolio, the roadmap may say
  the path to bookable is done while still naming that another listing needs fixes. The rejected
  listing's own card owns its fix-and-resubmit action; it does not keep account onboarding incomplete.

### progressive-search-flow

**How should FitOut replace the always-expanded search bar with a progressive activity, location,
and party-size journey?**

This idea explores the interaction and presentation layer of Phase 24. It starts from the existing
URL-driven search results contract and deliberately does not change search SQL, availability
derivation, price handling, or the existing address-autocomplete authority. The first prototype
lets the product owner compare initial search invitations and experience the three-step flow before
locking its visual direction or the meaning of party size.

**Requirements:**

- **R1 — The search pill is the progressive journey's idle invitation.** It remains compact until a
  booker engages, then opens the activity → location → party-size flow.
- **R2 — Party size filters out spaces that cannot fit the selected group.** The implementation must
  use a server-authoritative capacity/availability input; it must not merely label a result as suitable.
- **R3 — Phase 24 applies the party filter against configured venue capacity only.** It does not add a
  date question or promise a drop-in space's remaining places; date-specific availability stays in the
  existing booking journey.

## Spikes

| # | Idea | Name | Type | Validates | Verdict | Tags |
|---|------|------|------|-----------|---------|------|
| 001 | search-front-door | one-box-intent-routing | standard | One box → server params via a closed-set-first staged router, no migration | ✓ **VALIDATED** — 30/30 corpus, geocoder reached 0/30, 0.01–0.05 ms/query | search, phase-18, query-model, geocoding |
| 002a | search-front-door | freetext-ilike (per-word) | comparison | `ILIKE` inside the real stage-1 gate, 500–50,000 published listings | ✓ **WINNER** — added cost indistinguishable from zero below ~12k listings; matches FTS on 7/8 quality probes | search, postgres, GATE-06 |
| 002b | search-front-door | freetext-fts-no-migration | comparison | Query-time `to_tsvector()`, no stored column, no GIN | ✗ **INVALIDATED** — strictly dominated: FTS quality without the index, at 8x ILIKE's cost (564 ms vs 68 ms at 25k) | search, postgres, GATE-06 |
| 003 | search-front-door | bbox-vs-radius | standard | Which "where" is authoritative when the map moves and the bar still holds an address + radius | ✓ **VALIDATED** — policy A (bbox wins, radius dropped) + explicit "Search this area"; no migration; the D-53 radius rung breaks under a bbox | map, phase-18, MAP-01, MAP-02, D-53, D-32 |
| 004 | search-front-door | front-door-head-to-head | standard | Today's bar vs the one box, three intents, desktop and 375px | ✓ **VALIDATED with a limit** — box saves 5–10 taps and every pre-submit network call, but does NOT subsume the controls (no price NLP, by design) | ux, responsive, phase-18, D-137 |
| 005a | host-verification-roadmap | vertical-step-list | comparison | Same four gates in one ordered bordered list at desktop and phone widths | ✓ **VALIDATED ALTERNATIVE** — clearest sequence, but tallest default composition (501px) | phase-21, host, verification, ux, responsive |
| 005b | host-verification-roadmap | separate-cards | comparison | Same four gates as individually bordered cards at desktop and phone widths | ✓ **WINNER** — user-selected; each gate reads as a distinct server-backed fact while the 2×2 desktop grid stays compact | phase-21, host, verification, ux, responsive |
| 005c | host-verification-roadmap | responsive-stepper | comparison | Same four gates as a horizontal desktop stepper that stacks on phone widths | ✓ **VALIDATED ALTERNATIVE** — shortest desktop composition (244px), but compresses explanatory copy and changes geometry on phone | phase-21, host, verification, ux, responsive |
| 006 | host-verification-roadmap | roadmap-state-stress | standard | Preferred layout stays truthful across lifecycle states and 320px | ✓ **VALIDATED** — 8/8 automated checks; first live listing completes the journey, with rejected siblings handled on their own cards | phase-21, host, verification, edge-cases, responsive |
| 007 | progressive-search-flow | progressive-search-prototype | standard | Compare opening states and experience activity → location → party size before locking Phase 24's interaction direction | ✓ **VALIDATED** — search pill selected; party size is a real fit filter | phase-24, search, ux, progressive-disclosure, responsive |
| 008 | progressive-search-flow | party-size-capacity-policy | standard | Compare capacity-only and date-aware availability policies across exclusive and drop-in spaces | ✓ **VALIDATED** — capacity-only chosen; no new date question | phase-24, search, capacity, availability, edge-cases |
| 009 | progressive-search-flow | progressive-journey-stress | standard | Verify the chosen search-pill journey survives Back, edit, cancel, result handoff, and phone width | ✓ **VALIDATED** — accepted at desktop and 375px | phase-24, search, ux, responsive, state-machine |
