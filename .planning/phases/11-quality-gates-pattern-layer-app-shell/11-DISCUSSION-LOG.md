# Phase 11: Quality Gates, Pattern Layer & App Shell - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-13
**Phase:** 11-quality-gates-pattern-layer-app-shell
**Areas discussed:** Where the gates run, Baseline generation on Windows, GATE-04 inventory + mutation proof, GATE-05 boundary + price e2e

**Scope note:** the visual half of this phase was already settled by the approved `11-UI-SPEC.md`
(1165 lines, 35 acceptance criteria). No gray area from that document was re-opened. All four areas
below are the engineering half of the gates, which the UI-SPEC explicitly hands to the plan.

---

## Where the gates run

### Q1 — Where does GATE-01's "CI" actually live?

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Actions | Add `.github/workflows/`. Phase 11's baselines are DB-free, so a visual job needs no Postgres. Actions sets `CI=true` for free; a missing baseline fails on a machine that is not the author's. | ✓ |
| Local-only npm script | `npm run test:visual` sets `CI=1` and runs Playwright in the pinned image. No workflow files, no Actions minutes. Risk: a gate depending on the author remembering to run it. | |
| Hybrid — local authors, Actions enforces | Local docker script generates and inspects; Actions is the authority that goes red. | |

**User's choice:** GitHub Actions
**Notes:** Driven by a measured fact — the repo has no `.github/workflows`, no husky and no git hooks,
so D-135's `updateSnapshots: process.env.CI ? "none" : "missing"` resolves to `"missing"` everywhere.

### Q2 — What does the workflow run?

| Option | Description | Selected |
|--------|-------------|----------|
| DB-free + Postgres service | Job 1: `lint` + `test:design` + the visual project, no DB. Job 2: `postgis:18-3.6` service + `db:migrate` + `db:test:setup` + full vitest, so the exclusion-constraint specs run off the laptop. Skips the 12 e2e specs. | ✓ |
| DB-free only | Smallest workflow, zero services, covers GATE-01 fully. Leaves the constraint specs local-only. | |
| Everything, e2e included | Highest coverage; largest flake and secret surface (Cloudinary/PayMongo/Resend). | |

**User's choice:** DB-free + Postgres service

### Q3 — Trigger, and what a red run blocks

| Option | Description | Selected |
|--------|-------------|----------|
| Phase-boundary push + baseline-touching plans | Push to `dev`/`main` + PRs, `cancel-in-progress`. Phase cannot complete red; any plan touching a baselined surface pushes and waits. | ✓ |
| Per-plan push | Green is part of every plan's completion. Strongest localisation; ~17 runs/phase and a network wait each time. | |
| PR-to-main only | A milestone gate. Cheapest; leaves `dev` unchecked for nine phases. | |

**User's choice:** Phase-boundary push + baseline-touching plans
**Notes:** Surfaced first that `dev` is **145 commits ahead of `origin/dev`** and `main` is still at
"Initial commit" — CI only sees what is pushed, so this is a push-cadence commitment as much as a config.

### Q4 — `SUPPORT_EMAIL` (the UI-SPEC's declared `blocking_input`)

| Option | Description | Selected |
|--------|-------------|----------|
| Supply a real address you control | Footer renders one honest `mailto:`, gate goes green, swap for a domain address later. | (initially chosen, then reversed) |
| Amend the contract — no Support entry | `SUPPORT_EMAIL` stays null; the gate inverts to asserting absence. | ✓ (via free text) |
| Keep it blocking and red | Literal spec behaviour; phase cannot complete until a real inbox exists. | |

**User's choice:** Selected "supply a real address", then on being asked for the exact string replied
**"no just placeholder for now"** — reversing to the placeholder path.
**Notes:** Measured first that FitOut owns no domain (`metadataBase` falls back to `localhost:3000`) and
the only real address in `src/` is Resend's `onboarding@resend.dev` sender. Claude resolved the remaining
consequence without re-asking: the gate is **inverted, not softened** — while null it asserts zero support
affordances render; it flips back to demanding a valid address the moment the constant is set. Carried as
a `human_needed` item. Recorded as a deliberate departure from `11-UI-SPEC.md` AC#8.

---

## Baseline generation on Windows

### Q1 — Where do baseline PNGs get generated?

| Option | Description | Selected |
|--------|-------------|----------|
| CI generates and commits them | `workflow_dispatch` job runs `--update-snapshots` on the Actions Linux runner in the pinned container and commits back. Same runner+image generates and compares, so drift is structurally impossible. | ✓ |
| Local Docker with isolated node_modules | Bind-mount + named volume for Linux binaries. Fast iteration; a second dependency tree to keep in sync. | |
| Both | Local for iteration, CI as authority. Two generation paths that must agree. | |

**User's choice:** CI generates and commits them
**Notes:** Local Docker was measured as costly before being offered — `node_modules` holds Windows-native
binaries (Next SWC, esbuild, sharp), so the container needs its own `node_modules`.

### Q2 — Local Windows run behaviour

| Option | Description | Selected |
|--------|-------------|----------|
| `updateSnapshots: "none"` always + Linux-only visual project | Drop D-135's ternary; config can never write implicitly on any machine. Regeneration only via the CLI flag. Removes the dependency on `process.env.CI` existing. | ✓ |
| D-135 exactly as written | Faithful, no deviation to record. Accepts a local green that means "I wrote new baselines". | |
| Ternary + hard throw on non-Linux | Closes the false green loudly; any local e2e run hits a thrown error. | |

**User's choice:** `updateSnapshots: "none"` always + Linux-only visual project
**Notes:** Recorded as a cited deviation from D-135, strictly stronger than what it replaces.

### Q3 — Proving the gate can fail

| Option | Description | Selected |
|--------|-------------|----------|
| OBSERVED RED for the two behavioural proofs + standing test for the Windows rule | Missing-baseline and pixel-shift recorded verbatim once; the gitignore rule gets a live test because it can regress silently. | ✓ |
| OBSERVED RED for all three | Cheapest, fully consistent with Phase 10. Nothing notices a deleted gitignore rule. | |
| Standing self-tests for all three | Continuous proof; needs an inverted-assertion harness and a committed shifted fixture. | |

**User's choice:** OBSERVED RED for the two behavioural proofs + a standing test for the Windows rule

---

## GATE-04 inventory + mutation proof

### Q1 — Form of the inventory

| Option | Description | Selected |
|--------|-------------|----------|
| Typed TS module + design test | Matches `contrast-pairs.ts` / `status-tones.ts` / `measurements.ts`. Type-checked, cannot drift from its gate. | ✓ |
| `SELECTOR-CONTRACT.md` parsed by a test | Faithful to D-134's wording. Needs a markdown parser whose failure modes mimic selector regressions. | |
| TS module + generated `.md`, drift-checked | Honours both; costs a generator for a document with no established reader. | |

**User's choice:** Typed TS module + design test
**Notes:** Supersedes D-134's literal `SELECTOR-CONTRACT.md` name; recorded.

### Q2 — What "checked" asserts

| Option | Description | Selected |
|--------|-------------|----------|
| Existence + a floor, not equality | Declared test ids must appear in `src/`; `getByRole`/`getByLabel` counts may only go up. Blocks the real regression, allows growth. | ✓ |
| Exact equality at 92 / 30 | Literal reading of AC#32. Breaks on every legitimate new assertion; trains reflex number-bumping. | |
| Runtime resolution against live surfaces | Strongest guarantee; needs app + DB, so it lands in the e2e suite CI does not run. | |

**User's choice:** Existence + a floor, not equality

### Q3 — The (N+1)th-booking mutation proof

| Option | Description | Selected |
|--------|-------------|----------|
| OBSERVED RED + standing catalog assertion | Mutation performed once by hand, output committed; standing guard is a `pg_constraint` check extending `open-capacity-exclude.test.ts:146`. No DDL in CI. | ✓ |
| Standing in-transaction mutation test | Continuous proof; DDL against the core invariant, where a failed rollback leaves every later test silently green. | |
| OBSERVED RED only | Cheapest; nothing notices a later weakening of the partial `WHERE`. | |

**User's choice:** OBSERVED RED + a standing catalog assertion

---

## GATE-05 boundary + price e2e

### Q1 — How the boundary check fails the build

| Option | Description | Selected |
|--------|-------------|----------|
| `server-only` guards + a design test asserting they're present | Next's bundler enforces transitively through barrels and re-exports, with no resolver of ours to maintain. The build itself becomes the enforcer. | ✓ |
| AST import-graph walk, transitive | Fully ours, reports the offending chain; needs a real alias-aware resolver. | |
| Direct-import AST scan only | Matches `use-server-exports.test.ts`'s documented strictness; misses indirect reach through a re-export. | |

**User's choice:** `server-only` guards + a design test asserting they're present

### Q2 — Where the DB-vs-DOM price check runs

| Option | Description | Selected |
|--------|-------------|----------|
| A third, narrow CI job for this one spec | Postgres + dev server + a self-seeded booking, one spec, reading the mandated `data-testid="price-total"`. | ✓ |
| Local-only at phase verification | No added CI surface; the money invariant's proof stays self-attested. | |
| Reshape as a DB-bound integration test | Free in CI job 2; proves the render function agrees with the DB, not the browser DOM. | |

**User's choice:** A third, narrow CI job for this one spec
**Notes:** Explicitly re-opens a small slice of the e2e surface the CI-scope answer had closed. Flagged
as such when asked.

### Q3 — Sequencing GATE-05 against the live violation

| Option | Description | Selected |
|--------|-------------|----------|
| Same plan: land the guard, record the red, fix it | Atomic; the OBSERVED RED names real shipped code; no intervening plan runs red. Mirrors the UI-SPEC's own `SUPPORT_EMAIL` same-plan rule. | ✓ |
| Land GATE-05 early and deliberately red | Impossible to defer; every intervening plan runs against a red build for unrelated reasons. | |
| Fix `listing-card` first, then land a green gate | Cleanest history; costs the strongest available proof the gate can fail. | |

**User's choice:** Same plan: land the guard, record the red, fix it
**Notes:** This question only existed because a scout measurement found a **live D-130 violation** —
`listing-card.tsx` is `"use client"` and calls `allInRateParts()` at line 205, pulling `SERVICE_FEE_BPS`
(no `NEXT_PUBLIC_` prefix, so it falls back to the literal `500`) into the browser bundle on
`/host/listings`. Full chain and consequences recorded in CONTEXT.md `<code_context>`.

---

## Claude's Discretion

Nothing was delegated wholesale. Two items were resolved rather than put to the user, both recorded in
CONTEXT.md with their reasoning:

- **The inverted `SUPPORT_EMAIL` gate.** The user chose "placeholder for now"; the decision *not* to
  soften the gate to nothing — and to carry a `human_needed` item instead — was Claude's, on the stated
  ground that a gate quietly reduced to nothing is this phase's named failure mode.
- **The `next build` / Postgres risk** was flagged for the researcher rather than asked, because it is a
  measurement rather than a preference. If `next build` needs a reachable Postgres to prerender, the
  "DB-free job 1" split collapses and both jobs need the service.

## Deferred Ideas

- A real support address / a FitOut domain — blocked on a business fact, carried as `human_needed`.
- The 12 shipped e2e specs in CI — excluded on flake and secret grounds, with one narrow exception.
- A standing in-transaction mutation harness for the exclusion constraint — rejected on risk.
- A transitive AST import-graph walker — superseded by `server-only`; documented as the fallback.
- Real legal copy for `/terms` and `/privacy` — not a v1.1 item.
- `section.tsx`, `stat-card.tsx`, `data-list.tsx`, `form-section.tsx` — deliberately not extracted until
  the Phase 12–14 surfaces that stress them.

**No scope creep was raised during this discussion** — every area stayed inside the phase's gate,
pattern-layer and shell boundary.
