# Phase 17: Cross-Cutting Audit — Themes, Responsive, A11y & Baselines - Context

**Gathered:** 2026-08-29
**Status:** Ready for planning

<domain>
## Phase Boundary

**The five gates stop being per-phase promises and become the milestone's closing, machine-checked
proof across every surface at once.** RESP-03 (320px + sticky bar + no-wrap), RESP-04 (one component
tree), GATE-02 (keyboard operability + court-only axe pass), GATE-01's court baseline set regenerated,
GATE-06 byte-pinned at `drizzle/0025`.

**This is an AUDIT, not a rewrite** — the roadmap's own words, and the phase's one governing rule.
An audit finding is a measurement first and a fix second. Mechanical conformance fixes (a missing
`aria-label`, a sub-24px target, a skipped heading level, a DS-09 `size="touch"` adoption) are taken
in place; anything that would change a declared value, a layout decision, product copy or a
component's shape is **recorded and escalated, never absorbed**.

**The contract for this phase already exists and is approved:**
`17-UI-SPEC.md` (2026-08-28) is a full conformance contract — it pins the instruments, the three
floors (320 viewport / 24 conformance / 44 house-by-name), the colour arbitration order, the
remediation-vs-escalation boundary, the inherited findings with owners, and 36 falsifiable acceptance
criteria. **This CONTEXT re-decides none of it.** It records only the four calls the spec left to
the PM, made 2026-08-29.

**This phase does NOT:**
- Author any new token, type role, spacing value, card pattern, overlay mechanism or accent use
  (all closed sets; moving one is a scope alarm)
- Touch booking/payment/capacity/availability logic or move computation client-side (D-130)
- Ship or propose a schema migration (GATE-06)
- Produce a grove baseline or a grove axe pass (D-138 — grove is a probe, not a product theme)

</domain>

<decisions>
## Implementation Decisions

> **Namespace.** Project-global sequence; D-195 (16.1) was the previous highest. This phase starts
> at **D-196**. Qualify citations as "17-CONTEXT D-196" where collision with PROJECT.md rows is
> possible.
>
> **How these were made (PM, 2026-08-29):** the PM reviewed the four open areas and delegated all
> four to the SWE's stated defaults — "the wheel is yours." Each default below is therefore a
> deliberate decision, not an omission.

### The three inherited policy calls (routed here by earlier phases)

- **D-196 — [13-15] ProfileLink: fix it by padding + a deliberate re-open of the 226px header
  budget.** The 16×16 pointer target below `sm:` goes to **≥ 24px on both axes at 320px** via
  padding on the link (not a bigger glyph), and the signed-in header cluster is re-measured against
  its 226px budget **in the same commit** (UI-SPEC AC#22). If the re-measure shows the cluster no
  longer fits, that is a finding to escalate — do not shrink something else to make room silently.

- **D-197 — [16-D7] slider: the disabled state is EXPOSED to the accessibility tree; the tab-order
  behaviour stands.** Apply the spec's fix shape: `aria-disabled` on the thumb in
  `src/components/ui/slider.tsx`, both e2e assertions flipped to `toBeDisabled()` (AC#23). The thumb
  stays out of the tab order (Radix's choice stands — an inert control need not be a tab stop, but
  its state may not be invisible to AT). This is the phase's **one sanctioned vendored-file edit**
  (Registry Safety section) — compose over primitives everywhere else.

- **D-198 — the `/signup` radio group is NOT converted to roving tabindex; the why is recorded.**
  WCAG 2.1.1 is satisfied as shipped (every radio reachable and operable); the divergence is
  authoring practice against the WAI-ARIA pattern, not conformance. Converting would churn
  `e2e/auth-keyboard.spec.ts`'s declared 59-stop sequence for zero conformance gain — a rewrite
  move inside an audit. Record the observation where the spec asks for it and move on.

### Escalation cadence & the closure bar

- **D-199 — Findings are BATCHED: one list at phase end, no mid-phase interruptions — with two
  named exceptions.** Escalate-class findings accumulate in this phase's `deferred-items.md` in the
  Phases 13–16 format (the measurement — a number, in a named theme, at a named width, on a named
  route; the owner file; why not fixed here; the cheapest correct fix). The PM reviews the list
  once, at phase close. **Immediate escalation only for:** (a) a GATE-06 scope alarm — any fix that
  appears to need a schema migration; (b) a finding that makes an acceptance criterion unreachable,
  since the phase cannot close around it either way.

- **D-200 — The phase MAY close green with recorded-but-unfixed escalate-class findings.** For
  escalate-class items, **the finding is the deliverable** (UI-SPEC remediation rules). The
  deferred-items list is input to the PM's next-milestone decisions, not a blocker on this phase's
  completion. Mechanical-class fixes (the "may fix in place" table) are NOT closeable-around — those
  get fixed, and an unfixed one is an incomplete phase.

### The surface inventory boundary

- **D-201 — "Every surface" = production-reachable browser routes, and the inventory is enumerated,
  not remembered.** The route table's authoritative source is an enumeration of `src/app/**/page.tsx`
  (plus the route-state rows `tests/design/loading-coverage.test.ts` already pins); the researcher
  pins the exact list. Per UI-SPEC, every route in that enumeration appears in the table **either
  with a measurement or with a named reason** — zero silent absences. Excluded from the audit
  subject list, each with its reason recorded IN the table:
  - `src/app/dev/**` — audit *instruments* (`NODE_ENV`-gated out of production), not audit subjects
  - Email templates — not browser documents; covered by the existing `email-shell` / `email-tokens`
    suites
  - OG-image routes — not interactive documents (`og-routes.test.ts` owns them)
  - `global-error` — the one declared route-level axe exclusion (renders its own document; already
    excluded from the theme-swap probe with the same reason)

### Endgame & verification

- **D-202 — Machine evidence is the whole bar; no hands-on UAT walkthrough for this phase.** The
  closing evidence is exactly what the UI-SPEC pins: a **green comparison run**
  (`npx playwright test --project=visual`, no `--update-snapshots`) on the phase's **head commit**,
  with its run id recorded (the [13-16] lesson — a generation run is not a pass). Baselines are
  regenerated **last**, after all fixes land, only via `.github/workflows/baselines.yml`
  (`workflow_dispatch`) in `mcr.microsoft.com/playwright:v1.60.0-noble`. A post-regen commit
  invalidates the evidence and re-runs the comparison.

### Claude's Discretion

The PM delegated execution shape entirely. Within the UI-SPEC's remediation boundary, the SWE
decides without asking: plan count and sequencing (instruments → measure → fix → regenerate last is
the presumed order), per-finding fix-vs-escalate classification against the two tables, instrument
design details (selector strategy per the shipped `selector-contract.ts` rules, vacuity guards,
red-watch procedure for every new assertion), and route-table mechanics.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The contract (read first — it governs every task)
- `.planning/phases/17-cross-cutting-audit-themes-responsive-a11y-baselines/17-UI-SPEC.md` — THE
  conformance contract: invariants, the three floors, colour arbitration, remediation/escalation
  tables, the escalation format, 36 acceptance criteria, anti-patterns. Approved 2026-08-28.
- `.planning/ROADMAP.md` § Phase 17 — goal, success criteria, the D-138 narrowing note
- `.planning/REQUIREMENTS.md` — RESP-03, RESP-04, GATE-02, GATE-06 rows

### Inherited findings routed to this phase (the audit's inbox)
- `.planning/phases/13-confirmation-bookings-trust/deferred-items.md` — [13-15] ProfileLink, [13-16]
  generation-run-is-not-a-pass
- `.planning/phases/14-host-tooling/deferred-items.md` — [14-WR-03] heading-order blindness
- `.planning/phases/15-auth-profile-transactional-email/deferred-items.md` — [15-12] target-scan race
- `.planning/phases/16-image-crop-framing/deferred-items.md` — [16-D7] slider, [16-D9] sheet-row scope
- `.planning/phases/11-quality-gates-pattern-layer-app-shell/deferred-items.md` — [11-21] four error
  boundaries with no dev throw affordance

### The instruments this phase extends (never re-invents)
- `e2e/helpers/focus.ts` — `expectRing` (the ONLY focus-indicator definition), `walkForward` /
  `walkBackward` / `probeCandidateStops`
- `e2e/helpers/overflow.ts` — `FLOOR_PX`, `OVERFLOW_TOLERANCE_PX`, `expectNoOverflowWithin`
- `e2e/overflow-320.spec.ts` — the 320px sweep (route table to extend; `TARGET_FLOOR_PX` at :905)
- `e2e/auth-keyboard.spec.ts` — the shipped 6-document / 59-stop keyboard walk to extend
- `e2e/host-headings.spec.ts` — the 28-state loop the outline walk joins (never a second file)
- `e2e/mobile-booker-path.spec.ts` — case (b): the no-wrap instrument to generalise, with both guards
- `e2e/visual/theme-swap.spec.ts` + `e2e/helpers/theme.ts` — the four-surface token-contract probe
- `tests/design/brand-recipe.test.ts` :721/:759 — the DS-09 ceiling that flips to `toBe(0)`
- `tests/design/money-path-invariants.test.ts` — the GATE-06 gate that gains the content digest
- `tests/design/loading-coverage.test.ts` — pinned route/state counts (read its "ROUTE WAS ADDED"
  comment before touching `src/app/dev/**`)
- `src/lib/design/` — `accent-uses.ts`, `contrast-pairs.ts`, `measurements.ts`,
  `selector-contract.ts`, `visual-baselines.ts` (78 rows / 42 blocked), `tokens.generated.ts` —
  read, not extended (except measured contrast rows per the arbitration procedure)
- `.github/workflows/baselines.yml` — the single sanctioned baseline write path

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Every instrument this phase needs already has a shipped nucleus (see canonical refs) — the work is
  **coverage extension**, not mechanism invention. The one new dependency is
  `@axe-core/playwright@4.13.0`, pinned exactly, dev-only.
- `partitionDevOverlay` / `resetFocusToTop` / `WALK_BOUND` in `e2e/helpers/focus.ts` solve the
  dev-server noise problems a naive keyboard walk hits.

### Established Patterns
- **Red-watch:** every new assertion is observed red against a deliberate break before its green is
  trusted (heading walk red against a SKIPPED level, not a duplicated one; GATE-06 digest red
  against a one-character migration edit).
- **Vacuity guards:** every sweep asserts it scanned something (`MIN_EXAMINED_ELEMENTS`, axe's
  non-zero node/rule counts) — the scan-of-nothing failure is recorded eight times in this repo.
- **Selector contract:** `src/` carries zero test ids on interactive elements by design; `getByRole`
  / `getByLabel` stay. `data-testid` only on structural containers.
- **Findings format:** measurement + owner file + why-not-fixed + cheapest-correct-fix, in
  `deferred-items.md` — the Phases 13–16 idiom.

### Integration Points
- `npm run build` = `lint && test:design && next build` — new Vitest design gates land in
  `tests/design/` and are blocking by construction.
- Playwright e2e run outside the build; `host-headings.spec.ts` seeds a DB and must run alone.
- Baseline regeneration is a CI round-trip (`workflow_dispatch`), sequenced last.

</code_context>

<specifics>
## Specific Ideas

- The PM's single steer for this phase: **"the wheel is yours"** — defaults accepted wholesale,
  audit-not-rewrite governs every judgment call. Batch decisions; interrupt only for the two D-199
  exceptions.
- One measured caveat carried from 16.1: the `next dev` mobile-hydration failure is real, unresolved,
  and **out of scope here too** — nothing in this phase's e2e work depends on a phone hitting the
  dev server.

</specifics>

<deferred>
## Deferred Ideas

None new — the discussion stayed within phase scope. Escalate-class findings the audit produces will
land in this phase's `deferred-items.md` per D-199/D-200; pre-existing deferred items stay in their
own phases' files.

</deferred>

---

*Phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines*
*Context gathered: 2026-08-29*
