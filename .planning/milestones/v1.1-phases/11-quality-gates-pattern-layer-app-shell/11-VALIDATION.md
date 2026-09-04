---
phase: 11
slug: quality-gates-pattern-layer-app-shell
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-13
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `11-RESEARCH.md` § Validation Architecture (all figures measured 2026-08-13).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (DB-free gates)** | Vitest 4.1.8 via `vitest.design.config.ts` — `tests/design/**`, environment `node`, **no `globalSetup`, no `setupFiles`** (adding either silently reintroduces the Docker dependency this config exists to avoid) |
| **Framework (DB gates)** | Vitest 4.1.8 via `vitest.config.ts` — `globalSetup: tests/global-setup.ts`, `setupFiles: tests/setup.ts`, `testTimeout: 20_000` |
| **Framework (browser)** | Playwright 1.60.0 — `playwright.config.ts`, gains a `visual` project (D-29) |
| **Config file** | `vitest.design.config.ts` (primary for this phase) · `vitest.config.ts` · `playwright.config.ts` |
| **Quick run command** | `npm run test:design` |
| **Full suite command** | `npm test` (`vitest run`, requires `fitout_test`) |
| **Build gate** | `npm run build` = `lint && test:design && next build` — **also the GATE-05 enforcement point** |
| **Estimated runtime** | design ~57s (22 files, 458 tests, zero DB) · build ~3 min · full vitest requires Postgres |

*No framework install is needed — Vitest, Playwright and the browsers are all present. This phase installs **zero** npm packages (`server-only` is aliased by Next).*

---

## Sampling Rate

- **After every task commit:** `npm run test:design` (57s, DB-free — runs anywhere)
- **After every plan:** `npm run build` (lint + design + `next build`)
- **After every plan that touches a baselined surface (D-25):** push and wait for CI green before the next plan starts
- **After every wave:** `npm test` (full vitest, needs `fitout_test`)
- **Before `/gsd:verify-work`:** all three CI jobs green
- **Max feedback latency:** 57 seconds (design gate)

---

## Per-Task Verification Map

Task IDs are assigned by the planner; this map binds each phase requirement to its layer, command and current state. `❌ W0` = the test file does not exist yet and is a Wave 0 deliverable.

| Requirement | Behavior | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|------------|-----------------|-----------|-------------------|-------------|--------|
| GATE-01 | `.gitignore` carries `*-win32.png` + `*-darwin.png` AND git tracks zero such files | — | N/A | design | `npm run test:design` | ❌ W0 | ⬜ pending |
| GATE-01 | Missing baseline fails; few-pixel shift fails | — | N/A | **OBSERVED RED, recorded once (D-30)** | manual; verbatim output committed in the workflow header | ❌ W0 | ⬜ pending |
| GATE-01 | Every baselined surface: `court.png !== grove.png` (except `global-error`) | — | N/A | e2e visual | `npx playwright test --project=visual` | ❌ W0 | ⬜ pending |
| GATE-04 | Every declared `data-testid` appears in `src/` | — | N/A | design (AST) | `npm run test:design` | ❌ W0 | ⬜ pending |
| GATE-04 | `getByRole` ≥ 92 and `getByLabel` ≥ 30 in `e2e/` (**floor**, D-32) | — | N/A | design | `npm run test:design` | ❌ W0 | ⬜ pending |
| GATE-04 | `booking_no_overlap` exists with its expected definition | T-11-DDL | Constraint present in `pg_constraint` | integration (DB) | `npx vitest run tests/availability/open-capacity-exclude.test.ts` | ⚠ partial — `:146` exists, extend | ⬜ pending |
| GATE-04 | (N+1)th booking succeeds when the constraint is dropped | T-11-DDL | Recorded hand-run only; `_test` suffix guard; post-run existence verification | **OBSERVED RED, hand-run (D-33)** | manual against `fitout_test`; output committed | ❌ W0 | ⬜ pending |
| GATE-05 | Build fails when a client graph reaches a guarded module | T-11-FEELEAK | Fee/rate constants never enter a client chunk | **build** | `npm run build` | ❌ W0 | ⬜ pending |
| GATE-05 | Every declared module still carries its `server-only` guard | T-11-FEELEAK | Guard cannot be quietly deleted | design (**AST — not grep**; all 6 current `server-only` hits are comments) | `npm run test:design` | ❌ W0 | ⬜ pending |
| GATE-05 | DOM price == DB price | T-11-PRICE | Rendered total equals the persisted total | e2e (self-seeded) | `npx playwright test e2e/price-parity.spec.ts` | ❌ W0 | ⬜ pending |
| STATE-01 | Every async-default `page.tsx` has a `loading.tsx` (20/20) | — | N/A | design (AST) | `npm run test:design` | ❌ W0 | ⬜ pending |
| STATE-01 | Skeletons import boxes from `measurements.ts`; zero literal `h-`/`w-`/`aspect-` | — | N/A | design | `npm run test:design` | ❌ W0 | ⬜ pending |
| STATE-01 | Skeleton vs resolved container within ±2px, both themes | — | N/A | e2e visual (**Playwright only — jsdom cannot see this**) | `npx playwright test --project=visual` | ❌ W0 | ⬜ pending |
| STATE-01 | Every skeleton renders exactly one `role="status"` with a non-empty name | — | N/A | design (jsdom pragma) | `npm run test:design` | ❌ W0 | ⬜ pending |
| STATE-01 | `(app)` / `(host)` session check stays blocking after the Suspense restructure | T-04-06 / T-04-02 | `getSession` + `redirect()` execute before any streamed child | design + manual review | `npm run test:design` | ❌ W0 | ⬜ pending |
| STATE-02 | Five `error.tsx` exist, each with two actions (retry + route out) | — | N/A | design | `npm run test:design` | ❌ W0 | ⬜ pending |
| STATE-02 | `SENTINEL_LEAK_PROBE` appears zero times in the rendered DOM | T-11-ERRLEAK | Only `digest` renders; never `error.message` / `error.stack` | e2e | `npx playwright test` | ❌ W0 | ⬜ pending |
| STATE-02 | `global-error.tsx` imports `THEME_TOKENS`, zero Tailwind classes | — | N/A | design | `npm run test:design` | ❌ W0 | ⬜ pending |
| STATE-02 | Invite not-found text === invite page inactive text | T-11-ORACLE | Both **import** `INACTIVE_TITLE`/`INACTIVE_BODY`; two literals drift, and the drift is the oracle | design | `npm run test:design` | ❌ W0 | ⬜ pending |
| STATE-04 | Zero `border-dashed` empty blocks outside `patterns/empty-state.tsx` | — | N/A | design | `npm run test:design` | ❌ W0 | ⬜ pending |
| SHELL-01 | Header height 56/64, identical in both themes, all three compositions | — | N/A | e2e visual | `npx playwright test --project=visual` | ❌ W0 | ⬜ pending |
| SHELL-01 | Header + brand boxes byte-identical before/after auth-slot resolution | T-11-SESSION | Auth slot reads the session **server-side** (`await headers()`), never via a client fetch | e2e | `npx playwright test` | ❌ W0 | ⬜ pending |
| SHELL-01 | `getByRole("navigation")` === 1 at 320px and 1280px | — | N/A | e2e | `npx playwright test` | ❌ W0 | ⬜ pending |
| SHELL-02 | `SUPPORT_EMAIL` null ⇒ **zero** support affordances anywhere (**inverted gate**, D-26) | — | N/A | design | `npm run test:design` | ❌ W0 | ⬜ pending |
| SHELL-02 | Legal notices carry the exact strings; bodies contain no legalese tokens | — | N/A | design | `npm run test:design` | ❌ W0 | ⬜ pending |
| SHELL-04 | OG routes import `THEME_TOKENS`; invite OG references no `params`, imports no db | T-11-OGCRED | Constant image; zero `params` read; zero DB access | design | `npm run test:design` | ❌ W0 | ⬜ pending |
| SHELL-04 | Invite route retains `robots: noindex` + `referrer: no-referrer` | T-11-REFERER | Both survive the `metadata` → `generateMetadata` conversion | design | `npm run test:design` | ❌ W0 | ⬜ pending |
| RESP-01 | `scrollWidth <= clientWidth` at 320px on 12 routes, both themes | — | N/A | e2e | `npx playwright test` | ⚠ harness exists (10-16) | ⬜ pending |
| DS-11 | `ui/sheet.tsx` absent; `Z_SHEET_INVENTORY` asserted empty | — | N/A | design | `npm run test:design` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Infrastructure that must exist before the per-requirement gates above can run:

- [ ] `.github/workflows/ci.yml` — jobs 1–3 (**there is no CI in this repository today**)
- [ ] `.github/workflows/baselines.yml` (or a `workflow_dispatch` job in the same file) — D-27 commit-back
- [ ] `playwright.config.ts` — `visual` project, `updateSnapshots: "none"` unconditional (D-28), non-Linux hard-skip with a named reason (D-29)
- [ ] `package.json` — exact-pin `@playwright/test@1.60.0` (currently carries a `^`)
- [ ] `.gitignore` — `*-win32.png`, `*-darwin.png` (it has neither today)
- [ ] `src/lib/design/measurements.ts` — skeleton box constants (UI-SPEC)
- [ ] `src/lib/design/selector-contract.ts` — the typed inventory (D-31, supersedes D-134's `.md` name)
- [ ] `src/lib/site.ts` — `SUPPORT_EMAIL: string | null = null` (D-26)
- [ ] `src/lib/payments/fees.ts` — the guarded split out of `config.ts` (**new, from research**: guarding `config.ts` wholesale breaks two legitimate client imports of lead-time constants)
- [ ] `e2e/visual/freeze.css` — determinism (reduced motion, zeroed durations, hidden caret)
- [ ] `e2e/price-parity.spec.ts` — job 3's single spec (D-35)
- [ ] `tests/design/` — ~12 new gate files (see the map above)
- [ ] 18 × `loading.tsx`, 5 × `error.tsx`, 1 × `global-error.tsx`, 3 × `not-found.tsx`

*No framework install is needed — Vitest, Playwright and the browsers are all present.*

---

## Manual-Only Verifications

Three proofs are **deliberately** manual. Each follows the repo's OBSERVED RED convention (`tests/use-server-exports.test.ts`): a verbatim failing run committed as a header block.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A missing visual baseline fails CI | GATE-01 | Automating it means deliberately deleting a committed baseline in CI — the gate would then be testing its own test harness. Recorded once (D-30). | Delete one baseline PNG, run the `visual` project in the pinned container, commit the verbatim failure into the workflow header. **Note (research Finding 3):** in Playwright 1.60.0 a missing baseline **fails non-retriably and writes the PNG** — the next run is green with no code change. The recorded output must reflect that, not D-135's assumed "writes one and reports green". |
| A few-pixel shift goes red | GATE-01 | Same reason; a synthetic shift committed as a test would itself need a baseline. | Nudge one padding token by 2px, run the visual project, commit the verbatim diff output, revert. |
| The (N+1)th booking succeeds when `booking_no_overlap` is dropped | GATE-04 | DDL against the product's core-value constraint inside a test suite risks a failed rollback leaving every later test silently green (D-33). | Hand-run against `fitout_test` **only** (assert the `_test` suffix first): drop or widen the constraint, run `tests/availability/exclusion-race.test.ts`, capture the red, re-`ADD` the constraint, then **verify existence via the `pg_constraint` catalog query** before doing anything else. Commit the captured output. |
| Repo Actions workflow-write permission | GATE-01 | Unverifiable from the working tree — it is a GitHub repo setting. | `checkpoint:human-verify` before D-27's first dispatch. |

---

## Validation Sign-Off

Verified by `gsd-plan-checker` against all 22 plans (2026-08-13): 59 automated commands across 59 `type="auto"` tasks, no watch-mode flags, no `MISSING` automated placeholders requiring a Wave 0 backfill.

- [x] All tasks have `<automated>` verify or a Wave 0 dependency
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all `❌ W0` references above
- [x] No watch-mode flags
- [x] Feedback latency < 60s (design gate) — **with a recorded exception**: several tasks verify via `npm run build` (~3 min) or a multi-spec Playwright run, because a build-time boundary gate (GATE-05) and the Suspense-gate e2e specs can only be proven by running the build or the browser. Inherent to the mechanism, not a planning gap.
- [x] The three manual OBSERVED RED proofs are each assigned to exactly one task — D-36 → `11-01` T1 · D-33 → `11-05` T2 (`autonomous: false`) · D-30 → `11-22` T5
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-08-13 (plan-checker pass: 0 blockers, 5 warnings — all documentation-hygiene or recorded-exception)
