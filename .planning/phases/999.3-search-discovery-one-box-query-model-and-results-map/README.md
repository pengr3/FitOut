# 999.3 — Search & Discovery (BACKLOG)

Deferred out of v1.1 on **2026-08-31** by PM decision (**D-141**), after its spikes ran and before
any plan was written. It was **Phase 18**.

**Requirements:** `SEARCH-06..09` + `MAP-01..04` — marked *Deferred* in
`.planning/REQUIREMENTS.md` rather than deleted. Phase definition and the full scope discipline live
in `.planning/ROADMAP.md` under *Backlog → Phase 999.3*.

## Where the work actually is

This directory is a placeholder so the phase has a home for a plan when it is promoted. **Nothing is
lost — the substance is four completed spikes:**

| | | |
|---|---|---|
| `.planning/spikes/001-one-box-intent-routing/` | ✓ VALIDATED | 30/30 corpus, geocoder reached **0/30**, 0.01–0.05 ms/query. **Demo:** `index.html` |
| `.planning/spikes/002-freetext-at-0025/` | 002a ✓ WINNER · 002b ✗ INVALIDATED | free text is free below **~12,000** published listings |
| `.planning/spikes/003-bbox-vs-radius/` | ✓ VALIDATED | bbox wins, no migration. **Demo:** `index.html` (real Leaflet) |
| `.planning/spikes/004-front-door-head-to-head/` | ✓ VALIDATED with a limit | 5–10 taps saved; does **not** subsume the controls. **Demo:** `index.html` |

Read `.planning/spikes/MANIFEST.md` first — it carries the twelve requirements (R1–R12) the spikes
established, and `.planning/spikes/CONVENTIONS.md` carries the measurement discipline.

## Still binding while this sleeps

- **D-140 — only certainty becomes a filter.** A general search principle, not a phase artifact. It
  binds whenever search work resumes.
- **The GATE-06 crossover.** A GIN index becomes mandatory between **~12,000 and ~20,000 published
  listings**; FitOut has 18. That threshold is live regardless of when this is built.

## Did NOT come here — two defects in shipped code

`.planning/spikes/deferred-items.md` holds them, because they are wrong in `dev` today:

- **S-1** — `e2e/zero-result-relax.spec.ts` compares the relaxation band against the *control*, never
  against the results, so it cannot detect a band that lies.
- **S-2** — the search bar stacks to **570px at 375px wide**, 85% of a phone screen, before any map
  is added (GATE-RESP).

Promote with `/gsd:review-backlog`.
