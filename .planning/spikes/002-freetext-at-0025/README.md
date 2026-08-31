---
spike: 002
name: freetext-at-0025
type: comparison
validates: "Given the product schema at migration 0025 and the real stage-1 bookable gate, when free-text `q` is added by ILIKE / query-time FTS / FTS+GIN across 500-50,000 published listings, then the cost and the match quality of each are measured, and the published-listing count at which a migration stops being optional is stated"
verdict: "002a ILIKE (per-word) WINNER · 002b query-time FTS INVALIDATED"
related: [001, 003]
tags: [search, postgres, GATE-06, phase-18, benchmark]
---

# Spike 002: Free Text at Migration 0025

> **Convention deviation.** The plan called for `002a-…` / `002b-…` directories. Both variants share
> one seeder, one gate and one bench harness — splitting them would fork the fixture and make the
> head-to-head incomparable, which is the entire point of a comparison spike. They live here
> together and are reported as two verdicts.

## What This Validates

**Given** `fitout_spike` — a `pg_dump --schema-only` clone of the product database at migration
`0025`, carrying the same five `listing` indexes and therefore the same total absence of a text
index — and the real stage-1 gate from `src/lib/search/query.ts`, **when** free-text `q` is added by
each of four strategies across 500 → 50,000 published listings, **then** the added cost and the
match quality of each is measured, and the row count at which a migration stops being optional is
stated as a number.

## Why It Matters

**GATE-06 says v1.1 ships zero schema migrations** — `drizzle/` stays at `0025`, and a migration
proposed inside a phase plan is a scope alarm to be raised explicitly, never absorbed. Spike 001
left exactly one question behind: 7 of its 30 corpus queries produced free-text residue, and a
listing NAME (`Sunlit Yoga Studio`) cannot be resolved any other way. So the honest way to put this
to the PM is not "FTS is better" — it is *here is what each option costs, and here is the catalogue
size at which the free one stops being acceptable.*

## Research

No library research: every option is a Postgres 18 built-in already available in the product image
(`postgis/postgis:18-3.6`). The design work went into making the measurement honest.

| Strategy | Migration? | Mechanism |
|---|---|---|
| **A1 · ILIKE phrase** | no | `doc ILIKE '%pickleball court%'` — words must be adjacent and in order |
| **A2 · ILIKE per-word** | no | every word ANDed independently across the concatenated document |
| **B · FTS, no index** | no | `to_tsvector(...) @@ plainto_tsquery(...)`, tsvector built per row at query time |
| **C · FTS + GIN** | **yes** | same predicate, GIN expression index. Measured only in the throwaway spike DB, to price the alarm |

### Three decisions that make the numbers mean something

1. **The real gate, not a naked table.** Every query runs inside stage 1's actual WHERE — published,
   not deleted, host `email_verified`, `payouts_enabled`, and an `operating_hours` row must exist.
   A free-text benchmark against a bare table measures a query this product never runs.
2. **The worst case is the query that finds NOTHING.** `LIMIT 21` lets a matching scan stop as soon
   as it has a page, which hides the cost almost completely — at 25,000 listings `yoga` still
   returned in 1.6 ms. Only a zero-hit term has no early exit. That is also the query that matters
   most: it is when the booker is already frustrated.
3. **A zero-result search costs five scans, not one.** The D-53 relaxation ladder re-runs the search
   up to four more times. The budget below is divided accordingly.

### The budget, stated before the numbers were seen

150 ms is where a search stops feeling instant. Stage 1 is only part of the page — stage 2 then runs
a *sequential* per-candidate `getAvailability` loop — so free text gets a third: **50 ms of added DB
time per page**, across up to 5 ladder runs = **10 ms added per scan**.

## How to Run

```bash
node seed.js 5000 | docker exec -i fitout-db-1 psql -U fitout -d fitout_spike -q
node bench.js         # 4 scales x 3 strategies x 5 terms, absolute timings + plan shapes
node crossover.js     # interleaved A/B deltas over 7 scales; prints the crossover
node quality.js       # do these strategies actually FIND things? 8 probes x 4 strategies
```

The spike database is created with:

```bash
docker exec fitout-db-1 psql -U fitout -d postgres -c "CREATE DATABASE fitout_spike;"
docker exec fitout-db-1 sh -c "pg_dump -U fitout -d fitout --schema-only --no-owner --no-privileges | psql -U fitout -d fitout_spike -q"
```

Nothing here touches the dev database.

## Observability

`bench-log.json` (every scale × strategy × term with p50/p95, planner execution time and scan node),
`crossover-log.json` (paired deltas and the budget that judged them), `quality-log.json` (the 8×4
match matrix).

## Investigation Trail

**The clone rejected the seeder twice, and that was the clone working.** `user.first_name`,
`can_book` and `can_host` are NOT NULL with no default; `host_payout` has no `id` column and is keyed
on `user_id`. A fixture that had been allowed to drift from the product schema would have benchmarked
a table the product does not have.

**`out.push(...hours)` blew the call stack** at 25,000 listings — 175,000 spread arguments.

**The first crossover run produced a non-monotonic baseline and two negative deltas.** Baseline
35.7 ms at 7,948 rows but 14.6 ms at 19,891; `delta = -8.06 ms`. Two causes, both real:

- Every seeded row shared one `created_at`, so `ORDER BY created_at DESC LIMIT 21` had no stable
  ordering and the planner flipped between shapes run to run. Timestamps are now spread over two years.
- Measuring all baselines in one batch and all `+q` runs in another subtracts *drift* as much as
  predicate cost. The runs are now **interleaved** and the delta taken per pair before medianing.

A negative delta is not a fast query; it is a broken measurement. Reporting the first table would
have told the PM that adding a predicate makes the query cheaper.

## Results

### Cost — added DB time over the query stage 1 already runs (zero-hit term, paired medians)

| Published listings | gate only | gate + `q` | **added** | ×5 ladder | |
|---|---|---|---|---|---|
| 392 | 1.21 ms | 1.43 ms | **+0.19 ms** | 1 ms | within budget |
| 1,988 | 6.77 | 7.16 | **0.00** | 0 ms | within budget |
| 3,970 | 13.36 | 13.43 | **−0.11** | — | within budget |
| 7,948 | 27.75 | 27.02 | **−0.83** | — | within budget |
| 11,928 | 43.25 | 41.10 | **−2.04** | — | within budget |
| 19,891 | 17.27 | 84.24 | **+66.38 ms** | 332 ms | **OVER** |
| 39,781 | 29.14 | 163.41 | **+134.28 ms** | 671 ms | **OVER** |

Deltas up to ~12,000 are **indistinguishable from zero** (±2 ms is this machine's noise floor, not a
speed-up). The step is a plan change: below the crossover the gate itself dominates and ILIKE rides
along free; above it the planner can early-exit the gate but the ILIKE scan still has to read
everything.

**Crossover: between ~12,000 and ~20,000 published listings.** FitOut has **18** today, in a
single-city launch. The free option has roughly three orders of magnitude of headroom.

### Cost — the alternative, priced

Worst-case DB time, zero-hit term:

| Published | A · ILIKE | B · FTS no index | C · FTS + GIN | A vs C |
|---|---|---|---|---|
| 50 | 0.18 ms | 1.05 ms | 0.04 ms | 4.6× |
| 500 | 1.43 | 9.01 | 0.04 | 33× |
| 5,000 | 13.42 | 93.07 | 0.04 | 363× |
| 25,000 | 68.34 | **563.95** | 0.04 | 1667× |

**C is flat at ~0.04 ms at every scale** — a GIN index is worth an enormous amount, eventually.

### Quality — 3,970 published listings, 8 probes

| Query | A1 phrase | **A2 per-word** | B/C FTS | What it tests |
|---|---|---|---|---|
| `pickleball court` | 184 | **184** | 184 | baseline |
| `court pickleball` | **0** | **184** | 184 | same intent, words reversed |
| `pickleball in ortigas` | **0** | **11** | 11 | stop-word between content words |
| `studios` | 0 | **0** | **1342** | plural — the one place FTS wins |
| `showers lockers` | **0** | **720** | 720 | words from different sentences |
| `sunlit` | 149 | **149** | 149 | brand adjective — free text is the only route |
| `yog` | **157** | **157** | **0** | prefix — the one place ILIKE wins |

### Verdicts

**002a · ILIKE — VALIDATED, but only in the per-word form.** `A1` (the obvious phrase `%q%`) returns
**zero** on four of eight probes: reversed word order, a stop-word between terms, words in different
sentences. It is a trap that looks like it works because the first query anyone tries is one word.
`A2` splits the input and ANDs each word, matches FTS on 7 of 8 probes, and still needs no migration.

**002b · query-time FTS — INVALIDATED. Strictly dominated.** It buys exactly the matching quality of
`C` and none of the index, at **8× the cost of ILIKE** (564 ms vs 68 ms at 25k). There is no
catalogue size at which it is the right pick: below the crossover ILIKE is free and equal, above it
you need the index that makes it `C`.

**The stemming gap closes for free.** The single quality loss is plurals. Adding a suffix-stripped
alternate per word recovers it exactly: `studios` → **1342**, matching FTS's 1342 (`courts` → 1621,
`classes` → 795). Cheap, and honest about what it is — a heuristic, not a stemmer.

### Signal for the build

- Ship **per-word AND ILIKE with naive suffix stripping**. Zero migration, GATE-06 untouched, and
  matching indistinguishable from FTS on everything a booker is likely to type.
- **Never ship the phrase form.** Split the input.
- **Cap `q`** — spike 001 passed 5,000 characters straight through, and each word becomes another
  ILIKE term (requirement R4).
- Free text is the *last* stage. Spike 001's router already resolves 23 of 30 queries without it, so
  the expensive predicate runs on the minority of searches — a property worth preserving.
- **Write the crossover into the code as a comment with its number.** The migration becomes
  mandatory between ~12,000 and ~20,000 published listings; whoever revisits this deserves the
  threshold, not a rediscovery.
- The migration, when it comes, is one GIN expression index. It is a *v1.2 scope item with a known
  trigger*, not a v1.1 alarm.
