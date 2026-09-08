# Spike Conventions

Patterns established across the 2026-08-31 search session (spikes 001–004). New spikes follow these
unless the question requires otherwise.

## Stack

- **Plain JavaScript, no build, no TypeScript, no bundler.** Spike logic is written as classic
  scripts wrapped in an IIFE that assigns to `globalThis` and also sets `module.exports`, so the
  *same file* runs in Node (`require`) and in the browser (`<script src>`). Do not use ESM here —
  ES modules are blocked over `file://` and the demos must open by double-click.
- **Node's built-ins plus whatever the product already has.** Spike 002 and 003 use the project's
  own `postgres@3.4.9` from `node_modules` rather than installing a driver; spike 003 vendors
  `leaflet@1.9.4` from `node_modules` rather than a CDN.
- **Postgres work runs against a throwaway clone**, never the dev database:
  ```bash
  docker exec fitout-db-1 psql -U fitout -d postgres -c "CREATE DATABASE fitout_spike;"
  docker exec fitout-db-1 sh -c "pg_dump -U fitout -d fitout --schema-only --no-owner --no-privileges | psql -U fitout -d fitout_spike -q"
  ```
  A schema-exact clone is the point: it rejected two malformed seed rows (`user.first_name`,
  `host_payout`'s missing `id`), which is a fixture proving it has not drifted from the product.

## Structure

```
NNN-descriptive-name/
  README.md              frontmatter + Research + Investigation Trail + Results
  index.template.html    the demo SOURCE — relative <script src> to the real logic
  index.html             GENERATED, self-contained. Never hand-edit.
  build-demo.js          inlines the sources into index.html, and FAILS if any src survives
  <logic>.js             classic-script modules, shared by the demo and the Node harness
  *-log.json / *.txt     forensic output; the README's numbers are read off these
```

## Patterns

- **Build a single-file demo.** A preview surface snapshots a local page as a `data:` URL, and every
  relative `<script src>` / `<link href>` then silently fails to load, leaving an inert page that
  looks fine. `.planning/sketches/MANIFEST.md` records the same trap for the sketch stylesheets.
  The build step inlines the sources and **exits non-zero if a relative src survives**, so the
  failure is loud. Inlining rather than copy-pasting keeps the demo and the harness running the same
  code — a demo that has forked from the thing under test proves nothing.
- **Write the corpus before running the router.** A scored table is a measurement only if the
  expectations predate the implementation. When a measurement contradicts an expectation, change
  the expectation *and say why in the file* — never quietly to protect the score.
- **Adversarially probe anything that scores 100%.** Spike 001 hit 30/30 and then a precision probe
  found a 4-of-9 false-positive rate that changed the design.
- **Never report a single timing.** Warm 3, then take a median of 9+. This session produced two
  false findings from cold single runs — a 77.5 ms radius query that is really 2.9 ms, and negative
  deltas that made adding a predicate look free. For A/B timing, **interleave the pairs** and take
  the delta per pair; batch-vs-batch subtraction measures drift.
- **Deterministic fixtures.** Seeded PRNG, injected clocks (`opts.now`), never `Date.now()` inside
  logic under test. A benchmark whose data moves between runs cannot attribute a change to the code.
- **Measure the real surrounding query.** Benchmarks run inside the product's actual stage-1 gate
  (published + not deleted + verified + payable + has hours), not against a naked table.
- **State the budget before seeing the numbers**, so it cannot be fitted to them.
- **UI comparisons hold content constant and expose composition cost.** Spikes 004 and 005 compare
  variants through the same scenario model rather than through hand-picked screenshots. Height,
  action count, borders or interaction count are shown beside the preview, so visual preference can
  be checked against an observable cost.
- **Stress the winner before promoting it.** Spike 006 drove the chosen 005b composition through the
  awkward states most likely to make it lie — cooldown, stale pending, grandfathered capability and
  mixed portfolios — at both desktop and 320px. A happy-path layout win is not yet a product signal.

## Tools & Libraries

| Thing | Version | Note |
|---|---|---|
| `postgres` (postgres.js) | 3.4.9 | required from `../../../node_modules`; `EXPLAIN (ANALYZE, FORMAT JSON)` for plan + execution time |
| `leaflet` | 1.9.4 | vendored into the spike dir; `map.getBounds()` is what emits the bbox |
| Photon (`photon.komoot.io`) | — | no key, no cost. `layer` must be a **repeated** param — comma-joined returns a shaped error object, not a 400 |
| Docker `fitout-db-1` | postgis/postgis:18-3.6 | `fitout_spike` database; drop and re-clone freely |

## Visual

Court-adjacent palette inline in each demo (coral `#e8604c` as the single accent, warm neutrals).
Deliberately **not** importing `.planning/sketches/themes/court.css`: these are instrument panels,
not design proposals, and 003/004 must not be mistaken for UI specs.
