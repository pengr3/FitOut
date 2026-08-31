---
spike: 001
name: one-box-intent-routing
type: standard
validates: "Given one text box, the shipped 44-term vocabulary and the catalog's own places, when a booker types the way they actually type, then intent is classified into category / place / date / free text and emitted as SERVER params — with no migration and no client-side price or availability"
verdict: VALIDATED
related: [002]
tags: [search, phase-18, query-model, geocoding, D-130, GATE-06]
---

# Spike 001: One-Box Intent Routing

## What This Validates

**Given** a single text box, the closed 44-term product vocabulary (`src/lib/listing-vocab.ts`) and
the distinct places of published listings, **when** a Manila booker types `pickleball in makati
tonight` / `basketball court in ortigas` / `hoops near me` / `pickelball`, **then** the input is
classified into `category` / `place` / `date` / `amenity` / free-text `q` and emitted as parameters
the **server** query consumes — at migration `0025`, with no schema change, and computing no price
or availability on the client (D-130).

## Why It Matters

`src/components/search/search-bar.tsx` is the demand-side front door and it has **no query
parameter at all**. `searchParamsSchema` carries `lat/lng/category/date/start/end/priceMax/radius/
sort/page` — every one of them a *filter*, not a *query*. The only "where" is an
`AddressAutocomplete` that hands back `{lat,lng}` from the OpenStreetMap Photon geocoder. So a
booker cannot search a listing by name, cannot type a district the geocoder does not know, and pays
six controls for one intent. This spike asks whether one box can do better without a migration.

## Research

Photon's own API doc (`komoot/photon/docs/api-v1.md`) plus **live probes against
`photon.komoot.io`**, because the doc is incomplete on the two things that mattered.

### Measured, not read

| Query | Top Photon result | Verdict |
|---|---|---|
| `Makati` | `type=city`, `place:city`, **carries `extent`** | ✓ clean — and `extent` is a free bbox, which is MAP-02 material |
| `Bonifacio Global City` | `type=locality`, `place:quarter`, no `extent` | ✓ correct, no bbox |
| `BGC` | `type=house`, `tourism:attraction`, named literally "BGC" | ✗ a POI, not the district |
| `Ortigas` | `Ortigas Greenheights`, `Ortigas Royale`, `Ortigas Technopoint` | ✗ residential subdivisions, not the CBD |
| `pickleball` | a QC building, **then two pitches in the United States** | ✗✗ an activity word becomes a random American court |

Two undocumented facts fell out of the probes:

1. **`properties.type` is a real classifier** with values `house | street | locality | district |
   city | county | state | country | other`. The published doc only describes GeoJSON's own
   `"Feature"`/`"Point"`.
2. **`layer` must be a REPEATED parameter.** `layer=city,district` returns
   `{"layer":[{"message":"Unknown layer type…"}]}` — a shaped error, not a 400, so a client that
   only checks `res.ok` would read it as an empty result set. Repeat the key instead:
   `&layer=city&layer=district`.

### The finding that set the architecture

`pickleball` — the single most likely query this product will ever receive — returns a court in
Florida. **Any design that geocodes the raw string is broken by construction.** `bbox` clamps the
country but not the category confusion: with the Metro Manila bbox applied, `pickleball` still
returns four PH *buildings*, because a geocoder's job is to find places and it will always find one.

So the vocabulary is matched **first**, and the geocoder only ever sees what nothing else claimed.

### Approaches considered

| Approach | Pros | Cons | Status |
|---|---|---|---|
| Geocoder-first (today's bar) | already shipped | proven wrong above; also one network call per search | rejected |
| Postgres FTS over everything | one mechanism | `tsvector` + GIN = **a migration** = a GATE-06 scope alarm | deferred to **spike 002** |
| LLM intent parsing | handles anything | per-query cost + latency + nondeterminism, on a box that must feel instant | rejected for v1.1 |
| **Closed-set-first staged router** | zero migration, sub-ms, deterministic, testable | needs a synonym list; cannot resolve a listing NAME alone | **chosen** |

## How to Run

```bash
node harness.js          # 30-case corpus, scored, writes run-log.json
node harness.js --live   # same, with stage 5 against the real Photon API
node edge-cases.js       # adversarial: precision, scale, hostile input, cost
node build-demo.js       # regenerate the single-file index.html from the template
```

Open `index.html` for the interactive demo — self-contained, works from `file://`, no server.

## What to Expect

`harness.js` prints a scored table and a stage histogram, ending `score 30/30 (100%)` and
`geocoder … reached by 0 queries`. `edge-cases.js` prints four probes; P1 ends `2/9 claimed
something`. The demo classifies as you type and shows the exact URL the server would receive.

## Observability

`run-log.json` (per-case params, matches, suggestions, stage trace, wall time),
`edge-cases-log.txt` (the four probes), and an **Export JSON** button in the demo that dumps the
session's routing events. The verdict below is read off those files, not off the terminal.

## Investigation Trail

**Iteration 1 — 27/30.** Three failures, each a real defect rather than a corpus quibble:

- `basketball court in ortigas` → no place. The catalog stores `Ortigas Center`; nobody types the
  "Center". Added a **prefix rule** guarded on uniqueness.
- `pickelball` → no match. `within1` was plain Levenshtein, and an adjacent transposition costs
  **two** Levenshtein edits but **one** Damerau edit. Transposition is the typo people actually
  make. Made it Damerau.
- `alabang multi-sport court` → no category. `norm()` kept the hyphen while `labelKey()` turned it
  into a space, so the input and the vocabulary were normalised **asymmetrically** and a hyphenated
  label could never match the way it is printed. Both sides now split on it.

**Iteration 2 — 30/30.** Which, on a corpus written by the router's own author, is weak evidence.
Wrote `edge-cases.js` to attack it instead.

**Iteration 3 — the correction that changed the design.** The precision probe measured a **4-of-9
false-positive rate** on words that must claim nothing: `dennis` became `category=tennis`,
`dancer` became `category=dance`. Then the scale probe grew the catalog 7 → 37 places and found the
prefix rule resolving `ayala` **uniquely, and therefore confidently**, to `Ayala Alabang` — a city
twenty kilometres from the Ayala a Manila booker means.

A wrong category is strictly worse than no category: it does not fail to help, it **silently deletes
every listing the booker wanted**, and the results page has no way to say so. Uniqueness is not
correctness. So the rule became: **only confidence-1.0 matches become params; every inference is a
visible suggestion the booker confirms.** False positives fell 4/9 → 2/9, and both survivors are
correct extractions (`boxing day sale` does contain "boxing"; `poblacion street food` does name
Poblacion). The corpus expectations for two cases were rewritten to match the measurement — the
measurement was not explained away to protect the corpus.

**Iteration 4 — the suggestion must not eat the word.** `pickelball` then scored FAIL for a new
reason: the fuzzy stage consumed the token, so a typo produced the **default browse view plus a
hint** — worse than the typo itself. Low-confidence matches no longer consume; the word falls
through to free text, so the booker gets whatever `q` finds *and* the correction chip.

**Build-step footnote.** The demo first shipped as `index.html` + two `<script src>` files. A
preview surface snapshotted it as a `data:` URL, the relative sources silently never loaded, and the
page was inert — the trap `.planning/sketches/MANIFEST.md` records for the sketch stylesheets.
Fixed with `build-demo.js`, which inlines the **same** `router.js` the Node harness runs, so the
demo can never drift from the thing under test.

## Results

### VALIDATED

| Measure | Result |
|---|---|
| Corpus | **30/30** after four iterations |
| Geocoder reached | **0 of 30** realistic queries — confirmed in `--live` mode |
| Residue needing free text | **7 of 30** → this is spike 002's question |
| Precision (must-not-claim) | 4/9 → **2/9**, both correct extractions |
| Fuzzy collisions at 137 index terms | **none** — no two terms within one edit |
| Router cost | **0.01–0.05 ms/query**; 0 network calls for S1–S4 |
| Hostile input (11 cases) | 0 throws, ≤3 ms, incl. 5k chars, SQL-shaped, emoji, diacritics |

**The headline.** Today's search bar *starts* at the geocoder — one third-party call on every
search, answering `pickleball` with Florida. The staged router reaches it **zero times** across the
corpus, and reaches it correctly when it does (`ayala avenue makati` → `Ayala Avenue Extension,
District I, Makati`; `gym at 123 katipunan road` → `Katipunan Avenue, 3rd District, Quezon City`).

**The catalog beats the geocoder on exactly the inputs that matter.** `Ortigas` → `Ortigas Center,
Pasig` — a place with a listing — where Photon offers a residential subdivision. And the coupling is
the right way round: we can only usefully search where we have supply, so a gazetteer derived from
published listings grows precisely as fast as it needs to. `bonifacio` resolved to `Bonifacio Global
City` the moment the scale probe added a listing there.

### Limits, stated rather than rounded up

1. **`BGC` genuinely fails**, and the demo shows it failing. No published listing carries that
   string, so it falls to free text — and whether free text is affordable at `0025` is **spike
   002's** verdict, not this one's. This is also the one case where a small curated alias list
   (`BGC → Bonifacio Global City`) would earn its keep; it is deliberately NOT in this spike,
   because a hand-maintained alias table is a commitment and should be argued on its own.
2. **A listing NAME cannot be resolved by this router.** `Sunlit Yoga Studio` yields
   `category=yoga_studio&q=sunlit`. The `q` half is spike 002.
3. **`amenity` is a net-new server param** — nothing in `searchParamsSchema` or `query.ts` accepts
   it today. The router emits it because the vocabulary contains amenities; wiring it is real work
   and a new REQ ID, not a freebie.
4. **`q` is uncapped.** A 5,000-character input passed straight through. Cap it before it reaches
   any SQL predicate.
5. **The synonym list is hand-written and will rot.** 27 entries covering the obvious Manila
   vocabulary. It is a maintenance commitment, small but real.
6. **The gazetteer is a snapshot.** `data.js` hard-codes the 2026-08-31 `GROUP BY`. In the build it
   must be a cached server query, not a constant — and its cache invalidation is a design question
   this spike did not answer.

### Signal for the build

- Match the **closed set first**; let the geocoder see only what nothing else claimed, and clamp it
  to the launch `bbox` (without it, PH queries return US results).
- **Only certainty becomes a filter.** Everything else is offered. This is D-137 applied to search.
- Photon's `layer` must be **repeated**, never comma-joined, and its `extent` is a free bbox worth
  carrying into MAP-02.
- The router is free (µs). The entire cost question is the free-text residue → **spike 002**.
