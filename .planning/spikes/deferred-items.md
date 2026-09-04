# Spikes — deferred items

Defects the search spikes found in **shipped code**, which therefore do **not** leave with Phase 18.

Phase 18 (Search & Discovery) was deferred to backlog 999.3 on 2026-08-31 (**D-141**). Most of what
spikes 001–004 produced is design guidance that sleeps with the phase. These two are different: they
are wrong in `dev` today, with or without a map, and they were found only because the spikes drove
the real code. Filed here so the deferral does not bury them.

Filed 2026-08-31. Neither is fixed.

---

## S-1 — `e2e/zero-result-relax.spec.ts` cannot detect a relaxation band that lies

**Severity: escalate.** A green test that proves nothing it claims to prove.

**What it does.** The spec compares the relaxation band's changed-constraint value against the
rendered value of the corresponding control — both read from the DOM. That is a real and useful
assertion: it is what stops the page saying "within 25 km" beside a control reading "10 km", which
is the disagreement D-53 exists to prevent.

**What it does not do.** It never asserts that the **result set changed**. The band's whole promise
is *"we relaxed X, so here are results you would not otherwise have seen."* A rung that fires,
updates the control and returns an identical result set satisfies every assertion in the spec while
telling the booker something false.

**How spike 003 found it.** Not by reading the spec — by measuring a case where the rung genuinely
cannot help. With a map bbox as the binding geo constraint, rung 1 (`radius` → next preset) moves
the result set **0 → 0**, because the radius is not what emptied the page:

| governing constraint | rung 1 fires | results |
|---|---|---|
| bbox | radius 10 → 25 km | **0 → 0** |
| radius | radius 10 → 25 km | 1,599 → 3,970 |

**Why it matters even with Phase 18 deferred.** The bbox is only the *demonstration*. The gap is
structural: any rung that cannot bind for any reason produces a truthful-looking band over an
unchanged page, and the spec is blind to all of them. `relaxation.ts` already returns `null` from a
rung with nothing to relax — but nothing tests that a rung which *did* fire actually moved anything.

**Fix shape.** Add one assertion to the existing spec: capture the result count (or the first card's
identity) before and after the ladder fires, and require it to differ whenever a band is rendered.
Cheap, and it converts the spec from "the control and the band agree" to "the control, the band and
the results agree."

**Evidence:** `.planning/spikes/003-bbox-vs-radius/README.md` § Q3, reproducible with
`node .planning/spikes/003-bbox-vs-radius/probe.js`.

---

## S-2 — The search bar consumes 85% of the first screen at 375px

**Severity: escalate. GATE-RESP, on the app's most-trafficked surface.**

**Measured.** Stacked at a 375px viewport, the shipped bar's nine controls (address combobox,
`Use my location`, activity select, date, From, To, Price, Within, Search) occupy **570px** of
height. An iPhone SE/8 viewport is 375×667.

| | height at 375px | share of a 667px screen |
|---|---|---|
| search bar | **570px** | **0.85** |
| (spike 001's single box, for scale) | 165px | 0.25 |

**Consequence.** A booker arriving on a phone sees the front door and essentially **no results**
without scrolling — on the surface that carries the product's core value ("find & book a space").
This is not a map problem; it is true in `dev` today.

**Why it survived Phase 17's responsive audit.** Phase 17 checked that nothing *wraps or overflows*
at 320px, which this does not — the bar is correctly responsive, it is just very tall. "Fits" and
"leaves room for the content" are different properties, and only the first was gated.

**Fix shape.** Collapse the bar on small screens to the primary control plus a `Filters` entry point
(sheet or drawer), which is the shipped pattern elsewhere in the app. Independent of any search
redesign.

**Caveat on provenance.** The 570px figure was measured on spike 004's **replica**, reconstructed
control-for-control from `src/components/search/search-bar.tsx` — the dev server was not running.
The control inventory is exact; the pixel total should be re-measured against the live page before
any fix is sized. The conclusion (the bar dominates the mobile fold) is not sensitive to that margin.

**Evidence:** `.planning/spikes/004-front-door-head-to-head/README.md` § 375px.
