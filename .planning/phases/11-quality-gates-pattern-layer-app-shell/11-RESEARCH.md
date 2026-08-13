# Phase 11: Quality Gates, Pattern Layer & App Shell - Research

**Researched:** 2026-08-13
**Domain:** CI construction from zero · Playwright visual-regression gate mechanics · Next 16 App Router state conventions · client/server boundary enforcement
**Confidence:** HIGH (the load-bearing findings are measured in this repo, not recalled)

---

## Summary

**The named open risk is resolved by measurement, and the answer is the favourable one: `npm run build`
completes with exit code 0 against an unreachable Postgres. D-24's two-job shape holds — job 1 is genuinely
DB-free.** The full command (`lint && test:design && next build`) was run on this machine with Docker down,
port 5432 closed and `DATABASE_URL` pointed at `127.0.0.1:59999`. Lint passed, 458 design tests passed, and
`next build` generated 21 static pages and exited clean. Every DB-touching route in this app is already
`ƒ (Dynamic)`; the five static ones touch no database. Verbatim output is in § The Named Open Risk.

**Three of this phase's own premises turned out to be wrong or incomplete when measured, and each changes a
plan.** (1) D-135's literal claim that a missing baseline "writes one and reports green" is **not true of
Playwright 1.60.0** — a missing baseline *fails*, non-retriably; the fail-open is that the **next** run goes
green off the PNG the failed run just wrote. D-28 is still correct, but for a sharper reason than the one
recorded. (2) `11-CONTEXT.md` names **one** live D-130 violation; there are **four** client components
importing values from D-34's deny-list, one of which — `availability-calendar.tsx:32` calling
`computeServiceFee` on the **public** listing page — is a second, independent money-computation leak. The
built client bundle was grepped: `Number(process.env.SERVICE_FEE_BPS ?? 500)` is verbatim in **5 chunks**
today. (3) Guarding `src/lib/payments/config.ts` wholesale, as D-34 literally says, **breaks two legitimate
client imports** — the exact failure mode CONTEXT.md warned about. That module must be split, and this is a
plan-shaping consequence, not a detail.

Two findings remove work rather than add it: `import "server-only"` needs **no npm install** (Next aliases
the specifier and declares its module type — verified in `node_modules/next/types/global.d.ts:57`), so this
phase installs **zero new packages**; and Turbopack, which is Next 16's default builder and the one that
actually ran the build above, **does** enforce the guard (the specifier and its error message are both in the
installed `next-swc` binary). The mechanism D-34 leans on is real under the bundler this repo actually uses.

**Primary recommendation:** Write the two-job workflow as D-24 specifies — job 1 needs no `postgis` service —
but sequence the GATE-05 plan first among the gate plans, because splitting `payments/config.ts` and fixing
`availability-calendar.tsx` is materially more work than D-36's single-file description implies, and every
later plan runs against that build.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Where the gates run — CI**

- **D-23:** **GitHub Actions is added in this phase.** GATE-01's requirement text says *"CI fails on a
  missing baseline"* and **there is no CI in this repository today** — no `.github/workflows`, no husky,
  no git hooks. D-135 prescribes `updateSnapshots: process.env.CI ? "none" : "missing"`, which with no
  CI anywhere resolves to `"missing"` on every machine that will ever run it. The gate is only real if
  something sets `CI=true`; Actions does it for free, and a missing baseline then fails on a machine
  that is not the author's.
- **D-24:** **Two jobs.** Job 1 is DB-free: `lint` + `test:design` + the Playwright **visual** project in
  the pinned container. Job 2 adds a `postgis/postgis:18-3.6` service + `db:migrate` + `db:test:setup`
  and runs the **full vitest suite**, so the exclusion-constraint specs GATE-04 protects run somewhere
  other than the author's laptop. **The 12 shipped e2e specs are deliberately NOT in CI** — they each
  boot a dev server and seed real data, which is the largest flake and secret surface available, and a
  flaky gate gets retried until green. (One narrow exception: see **D-33**.)
- **D-25:** **Triggers on push to `dev`/`main` and on PRs, with `concurrency: cancel-in-progress`.**
  The binding rules are two: *a phase cannot be marked complete with CI red*, **and** *any plan that adds
  or changes a baselined surface pushes and waits for green before the next plan starts*. Rationale: the
  executor already runs vitest locally per plan, so what CI uniquely adds is the **Linux-only visual
  baselines** — which only some plans touch. **Load-bearing context: `dev` is 145 commits ahead of
  `origin/dev` and `main` is still at "Initial commit".** CI only ever sees what is pushed, so this is a
  push-cadence commitment as much as a workflow file.

**`SUPPORT_EMAIL` — the UI-SPEC's declared blocking input**

- **D-26 (DELIBERATE DEPARTURE from approved `11-UI-SPEC.md` — record it, do not silently reconcile):**
  FitOut owns no domain and has no support inbox (`metadataBase` falls back to `localhost:3000`; the only
  real address anywhere in `src/` is Resend's `onboarding@resend.dev` sender). The user's call was
  **"just placeholder for now."**
  - `SUPPORT_EMAIL` stays `null` and **the footer renders no support entry at all** — no greyed link, no
    `mailto:`, no "coming soon". This is the spec's own *nothing false ships* path, just held open longer
    than it assumed. **Inventing an address remains banned** (`11-UI-SPEC.md` § Anti-Patterns).
  - **`site-contacts.test.ts` INVERTS rather than softens.** While `SUPPORT_EMAIL` is null it asserts that
    **zero** support affordances render anywhere; it flips back to demanding a non-null string containing
    `@` plus exactly one `mailto:` the moment the constant is set. The gate is never absent — the failure
    mode this phase exists to prevent is a gate quietly reduced to nothing.
  - The unfilled slot is carried as a named **`human_needed`** item on phase completion, the same
    convention the roadmap already uses for the sales-gated PayMongo threads.
  - **Amends `11-UI-SPEC.md` AC#8 and § The unfilled slot.** The "phase cannot complete with the
    placeholder in place" clause no longer holds; the `human_needed` item replaces it.

**GATE-01 — baselines**

- **D-27:** **CI generates and commits the baseline PNGs.** A `workflow_dispatch` job runs the visual
  project with `--update-snapshots` on the Actions Linux runner (fresh `npm ci`, correct Linux binaries,
  `mcr.microsoft.com/playwright:v1.60.0-noble`) and commits them back to the branch. **No local Docker.**
  The baselines are produced by the exact same runner + image that later compares against them, so drift
  is structurally impossible. *Local Docker was rejected on a measured ground:* `node_modules` holds
  Windows-native binaries (Next's SWC, esbuild, sharp), so a bind-mounted container needs its own Linux
  `node_modules` volume — a second dependency tree to keep in sync, on Windows Docker Desktop.
- **D-28 (DEVIATION from D-135's literal ternary — strictly stronger, record it):**
  **`updateSnapshots: "none"` unconditionally.** Dropping the `process.env.CI` ternary means the config
  can **never** write a baseline implicitly, on any machine, whether or not an env var happens to be set —
  which removes the gate's dependency on `process.env.CI` existing in the place that matters. Regeneration
  happens **solely** via the explicit `--update-snapshots` CLI flag in the dispatch job (the flag overrides
  config). The problem this closes: under D-135 as written, a local Windows run resolves to `"missing"`,
  writes `*-win32.png` baselines and reports **green** — the fail-open bug relocated from CI to the
  author's laptop.
- **D-29:** The visual specs live in **their own `visual` Playwright project** that hard-skips on
  non-Linux with a named reason, so a local `npx playwright test` stays usable. `@playwright/test` is
  pinned **exact** at `1.60.0` (it currently carries a `^`), and `.gitignore` gains the
  `*-win32.png` / `*-darwin.png` rules (it has none today).
- **D-30:** **How "this gate can actually fail" is proven, split by kind.** Missing-baseline and
  few-pixel-shift are each triggered **deliberately once**, with the verbatim failing output committed in
  the workflow file's header — the repo's established **OBSERVED RED** convention
  (cf. `tests/use-server-exports.test.ts`). The Windows rule is different in kind: it is a static fact
  that can regress **silently**, so it earns a **standing DB-free design test** asserting `.gitignore`
  carries both rules AND that git tracks zero such files.

**GATE-04 — the selector inventory and the mutation proof**

- **D-31 (SUPERSEDES D-134's literal `SELECTOR-CONTRACT.md` name — record it):** the inventory is a
  **typed TS module** (e.g. `src/lib/design/selector-contract.ts`) read by a DB-free design test. This
  repo has converged hard on that shape for every declared inventory — `contrast-pairs.ts`,
  `status-tones.ts`, and the `measurements.ts` the UI-SPEC mandates. A markdown doc that must be parsed
  is the only inventory in the codebase that would not be type-checked, and its failure modes (a renamed
  heading, a reformatted table) look exactly like selector regressions.
- **D-32:** **"Checked" means existence + a FLOOR, not equality.** Every `data-testid` declared in the
  inventory must actually appear in `src/` (source scan), and the `getByRole` / `getByLabel` counts in
  `e2e/` may only go **up**, never down. This blocks the real regression D-134 describes — someone
  converting accessible queries into brittle test ids — while letting Phases 12–19 add coverage freely.
  **`11-UI-SPEC.md` AC#32's "unchanged in count" is read as a floor**, because exact equality at 92 / 30
  would break on every legitimate new assertion and train everyone to bump the number as a reflex, which
  is the rubber-stamp habit this phase exists to prevent arriving from the opposite direction.
- **D-33:** **The (N+1)th-booking mutation is OBSERVED RED, plus a standing catalog assertion.** The
  destructive mutation (drop or widen `booking_no_overlap`) is performed **once by hand** against the test
  DB and the spec's verbatim failing output is committed in its header; **nothing destructive lives in the
  suite.** The standing guard is instead a `pg_constraint` assertion that the constraint exists with its
  expected definition — extending what `tests/availability/open-capacity-exclude.test.ts:146` already
  does. *An in-transaction mutation test was rejected on risk:* DDL in a test suite against the app's
  single most important invariant, where a failed rollback leaves the test DB with no constraint and every
  later test silently green.

**GATE-05 — the client/server boundary and the price e2e**

- **D-34:** **`server-only` guards make Next itself the enforcer.** `import "server-only"` is added to the
  declared forbidden modules (`src/lib/booking/pricing.ts`, `src/lib/booking/all-in-rate.ts`, the fee
  constants in `src/lib/payments/config.ts` / `service-fee.ts`, and `src/lib/availability/**`'s computing
  modules). Next's bundler then hard-fails `next build` the moment any client graph reaches them —
  **transitively, through barrels and re-exports, with no resolver of ours to maintain.** The requirement
  says *"fails the build"*; this makes the build the enforcer. The design test's job shrinks to asserting
  every module on the declared list still carries its guard, so it cannot be quietly deleted.
- **D-35:** **The DB-vs-DOM price check gets its own narrow third CI job** — Postgres service + dev server
  + a self-seeded booking (the `search-and-book.spec.ts` pattern: unique `randomUUID` rows,
  cascade-correct teardown), running **exactly one spec**, reading the `data-testid="price-total"` hook
  `11-UI-SPEC.md` already mandates. This deliberately re-opens a small slice of the e2e surface D-24
  closed, because it is the single assertion standing between a restyle and a wrong number charged to a
  real card. One self-contained spec is a fraction of the twelve.
- **D-36:** **GATE-05 lands red on shipped code, and the guard + its OBSERVED RED + the fix land in ONE
  plan.** See the measured finding in `<code_context>` — `listing-card.tsx` is a live D-130 violation. The
  plan adds `server-only`, runs the build, captures the verbatim failure **naming `listing-card.tsx`** as
  its OBSERVED RED (a genuine demonstration that the gate fails on real shipped code — far stronger than a
  synthetic probe), then moves the computation server-side so prices arrive pre-formatted. Atomic, and no
  intervening plan runs against a red build. **This mirrors `11-UI-SPEC.md`'s own same-plan rule for the
  `SUPPORT_EMAIL` gate**, and the fix is already in scope: the UI-SPEC names `listing/listing-card.tsx` as
  one of the components `ResultCard` replaces.

### Claude's Discretion

Nothing was delegated wholesale. Two items were **resolved rather than asked**, both recorded above with
their reasoning, and the planner may adjust their mechanics but not their intent:

- **D-26's inverted gate.** The user said "just placeholder for now"; the choice *not* to soften the gate
  to nothing — and to carry a `human_needed` item instead — is Claude's, on the stated ground that a gate
  quietly reduced to nothing is this phase's named failure mode.
- **The `next build` / Postgres risk** below was flagged for research rather than put to the user, because
  it is a measurement, not a preference.

### Deferred Ideas (OUT OF SCOPE)

- **A real support address / a FitOut domain.** Blocked on a business fact, not on code. Carried as a
  named `human_needed` item on phase completion (D-26). When it arrives, `src/lib/site.ts` is a one-line
  edit and `site-contacts.test.ts` flips itself back to the demanding form automatically.
- **The 12 shipped e2e specs in CI.** Excluded by D-24 on flake and secret grounds, with exactly one
  narrow exception (D-35). If Phase 17's audit wants full e2e coverage in CI, that is its call to make
  with the whole suite's flake profile in view — not a Phase 11 decision.
- **A standing in-transaction mutation harness** for the exclusion constraint — considered and rejected on
  risk (D-33). If a future phase wants continuous rather than recorded proof, it needs its own isolated
  database and an explicit post-run constraint-existence verification.
- **A transitive AST import-graph walker.** Superseded by `server-only` (D-34), which gets transitivity
  from Next's bundler for free. If a module ever genuinely cannot take a `server-only` guard, this is the
  documented alternative.
- **Real legal copy for `/terms` and `/privacy`.** `11-UI-SPEC.md` is explicit: the placeholder notice is
  removed **only** in the same commit that supplies real copy, and that commit deletes the two assertions
  guarding it. Not a v1.1 item.
- **`section.tsx`, `stat-card.tsx`, `data-list.tsx`, `form-section.tsx`.** Real duplication, deliberately
  not extracted — every one lives on a Phase 12–14 surface, and extracting a pattern before the phase that
  stresses it is how a pattern layer becomes a junk drawer (`11-UI-SPEC.md`).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **DS-11** | Three named card patterns exist (ResultCard, RowCard, PanelCard) and every card surface uses one | Settled by `11-UI-SPEC.md` § The Pattern Layer. Research adds only the `server-only` constraint: `ResultCard` must be a Server Component because `listing-card.tsx`'s client-side `allInRateParts()` call is one of the four boundary violations (§ GATE-05 Findings). |
| **STATE-01** | Every data-backed route has a loading state whose skeleton does not shift | § STATE-01 gives the exact mechanical rule and route inventory: **20 routes qualify, 2 have one, 18 are new.** The `await`-grep rule the UI-SPEC states would over-generate 4 dead files. |
| **STATE-02** | Every route group has an error boundary with retry + route out, plus global-error and not-found | § STATE-02: `ErrorInfo = { error, reset, unstable_retry }` verified in installed Next 16.2.7 types — the UI-SPEC's "write against `reset`" guidance is correct. Five boundaries, three not-founds. |
| **STATE-04** | Every list surface has a designed empty state; host inbox-zero reads positive | Settled by `11-UI-SPEC.md` § Empty (8 conversions, one copy change). No research constraint beyond the `p-10`→`p-8` ladder fix. |
| **SHELL-01** | Public routes have a real site header | § App Shell Mechanics: the `(app)`/`(host)` Suspense restructure, and the measured consequence that adding a session-aware slot flips 5 currently-static routes to dynamic (harmless for the build, relevant for baselines). |
| **SHELL-02** | A footer with policy/support/contact links exists app-wide | D-26 inverts the `SUPPORT_EMAIL` gate. No research constraint; `src/lib/site.ts` is new. |
| **SHELL-04** | A pasted listing/invite link renders correct title, description and share image | § Share & Meta: `next/og` is available (`node_modules/next/og.js`), `metadataBase` resolves to `http://localhost:3000` today via `DEFAULT_APP_URL` (`layout.tsx:52`) — the OG image URL will be localhost-absolute until `NEXT_PUBLIC_APP_URL` is set. |
| **RESP-01** | One mobile-overlay primitive adopted rather than per-surface dialogs | Settled by `11-UI-SPEC.md` § the mobile-overlay primitive (compose over `ui/dialog`, do not install `sheet`). |
| **GATE-01** | VR baselines generated only in the pinned image; CI fails on a missing baseline | § GATE-01 Findings — five measured behaviours of Playwright 1.60.0, including a correction to D-135's stated failure mode and confirmation that the CLI flag overrides config `"none"`. |
| **GATE-04** | A structural-selector inventory exists and is checked | § GATE-04 Findings — measured selector counts (92/30/63/**23**), the AST idiom, and the `pg_constraint` pattern D-33 extends. |
| **GATE-05** | The build fails if money/availability computation crosses into a client component; DB-vs-DOM price e2e | § GATE-05 Findings — **the largest correction in this document.** Four violations, not one; the fee constants are measured in the shipped client bundle; `payments/config.ts` must be split. |
</phase_requirements>

---

## ⚠ THE NAMED OPEN RISK — RESOLVED BY MEASUREMENT

> `11-CONTEXT.md` § `<code_context>`: *"`npm run build` = `lint && test:design && next build`. If
> `next build` needs a reachable Postgres to prerender routes, 'job 1 is DB-free' collapses."*

### Verdict: **JOB 1 CAN BE DB-FREE.** D-24's two-job shape holds unchanged.

**Command run** (Git Bash, repo root, 2026-08-13) `[VERIFIED: measured in this repo]`:

```bash
DATABASE_URL="postgres://fitout:fitout@127.0.0.1:59999/fitout_unreachable" npm run build
```

**Controls established before the run:**

| Control | Evidence |
|---|---|
| Docker daemon down | `docker ps` → exit 1, no output |
| Port 5432 closed | `netstat -ano \| grep -c ":5432 "` → `0` |
| Shell env beats `.env.local` | Verified in `node_modules/@next/env/dist/index.js`: a `.env` key is only merged when `typeof l[t]==="undefined"`, where `l` is a snapshot of the **original** `process.env`. A shell-set `DATABASE_URL` is therefore never overwritten. |

**Result — exit code 0.** Verbatim tail:

```
> fitout@0.1.0 test:design
> vitest run --config vitest.design.config.ts

 Test Files  22 passed (22)
      Tests  458 passed (458)

▲ Next.js 16.2.7 (Turbopack)
- Environments: .env.local

⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
  Creating an optimized production build ...
✓ Compiled successfully in 39.3s
  Running TypeScript ...
  Finished TypeScript in 24.3s ...
  Collecting page data using 7 workers ...
✓ Generating static pages using 7 workers (21/21) in 1046ms
  Finalizing page optimization ...
```

**Why it is DB-free, structurally:** the build classified **every** DB-touching route as `ƒ (Dynamic)`.
The only `○ (Static)` routes are `/_not-found`, `/dev/theme`, `/login`, `/signup`, `/forgot-password`,
`/reset-password` — and none of the six imports `@/lib/db`. `src/lib/db/index.ts:5` constructs
`postgres(process.env.DATABASE_URL!)` at module scope, but **postgres.js connects lazily**, so module
evaluation during page-data collection neither throws nor dials out.

**Three caveats the planner must carry — this measured HEAD, not the post-phase tree:**

1. **Re-run this exact command after the app shell lands.** The phase adds a session-aware header to the
   public composition. Reading the session goes through `await headers()`, which is a dynamic API and
   triggers Next's dynamic bailout *before* any DB call — so the build should stay DB-free. That is a
   reasoned expectation, not a measurement, and it is cheap to re-verify.
2. **The new root `app/not-found.tsx` is the one genuine hazard.** `/_not-found` is prerendered `○` today.
   If it renders a shell component that reaches `@/lib/db` on a path Next *can* prerender, the build will
   try to connect. **Rule for the plan: the root `not-found.tsx` and `global-error.tsx` must reach no
   database.** Falsifiable by re-running the unreachable-DB build.
3. **Adding the session-aware slot will flip `/login`, `/signup`, `/forgot-password`, `/reset-password`
   and `/_not-found` from `○` to `ƒ`.** Harmless for job 1 (dynamic routes are not prerendered), but
   `11-UI-SPEC.md` baselines the `(auth)` shell — the baseline still works; only the build marker changes.

**Recommended job-1 verification step, so this can never silently regress:**

```yaml
- run: npm run build
  env:
    DATABASE_URL: postgres://unreachable:unreachable@127.0.0.1:59999/nope
```

Pointing job 1 at a deliberately unreachable URL turns "job 1 is DB-free" from an assumption into a
standing assertion — if a later phase adds a build-time DB read, job 1 goes red immediately and names it.
This is strictly better than omitting the variable, because an unset `DATABASE_URL` would let
`postgres(undefined!)` fall back to libpq defaults and possibly find a real database on some future runner.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Money computation (`allInRateParts`, `computeServiceFee`, fee constants) | **API / Backend (RSC + server actions)** | — | D-130 is absolute. Measured today in the **browser bundle** — this phase's job is to move it back. |
| Availability computation (`slots`, `read-model`, `units`) | **API / Backend** | — | Same rule; `BOOKING_HORIZON_DAYS` (a constant) and `blockReasonLabel` (a mapper) are legitimate client imports and must survive. |
| Session read for the auth slot | **Frontend Server (RSC)** | — | `await headers()` + `auth.api.getSession`. Never a client fetch — a client-side session read would reintroduce the layout shift the auth-slot contract exists to prevent. |
| Session **gate** (`redirect()`) | **Frontend Server (RSC), blocking** | — | T-04-06 / T-04-02. **Must NOT move into Suspense** — a security gate behind a streaming boundary renders gated content before it redirects. |
| Ambient notification read (`countUnread`, `listRecent`, `readDbNow`) | **Frontend Server (RSC), streamed** | — | The only part of the layout that moves into an async child. Its try/catch degradation and owner-scoping (T-07-82) survive unchanged. |
| Skeleton geometry (`measurements.ts`) | **Shared / build-time constants** | Browser (rendered) | Constants module under `src/lib/design/**`, outside the leak-gate tree, consumed by both real and skeleton components. |
| VR baseline capture + comparison | **CI (pinned Linux container)** | — | Never the author's machine. D-27 + D-29. |
| Full vitest suite (exclusion-constraint specs) | **CI runner + `postgis` service** | — | Job 2. |
| DB-vs-DOM price equality | **CI runner + `postgis` service + dev server + browser** | — | Job 3 (D-35), the one deliberate e2e re-opening. |
| Client/server boundary enforcement | **Build (Turbopack)** | Design test (guard-presence) | D-34: the bundler is the enforcer; the design test only asserts the guards were not deleted. |
| OG image rendering | **API / Backend (`next/og` on the server)** | — | Satori resolves no CSS custom properties; must read `THEME_TOKENS.court` hex. |

---

## Standard Stack

**This phase installs zero new runtime or dev packages.** Everything it needs is already present or is
provided by Next itself. That is a finding, not an assumption — see the audit below.

### Core (already installed — versions verified from `node_modules` on 2026-08-13)

| Library | Installed version | Purpose in this phase | Why standard |
|---------|-------------------|-----------------------|--------------|
| `next` | **16.2.7** | App Router state conventions, `next/og`, `server-only` alias, Turbopack build | Already the app's framework. `[VERIFIED: node -p require('next/package.json').version]` |
| `@playwright/test` | **1.60.0** (declared `^1.60.0` — D-29 pins exact) | The `visual` project, baselines, theme-swap smoke | Already installed; D-135 requires the exact pin |
| `typescript` | 5.x | `ts.createSourceFile` AST scanning for every new design gate | The repo's established scanner idiom (5 design tests use it) |
| `vitest` | 4.1.8 | `vitest.design.config.ts` — the DB-free gate home | Already wired into `npm run build` |
| `postgres` (postgres.js) | 3.4.9 | Job 3's self-seeded e2e, per `search-and-book.spec.ts` | Already the e2e seeding idiom |

### Provided by Next — do NOT `npm install`

| Specifier | How it resolves | Evidence |
|---|---|---|
| **`server-only`** | Next aliases the bare specifier to `next/dist/compiled/server-only/{index,empty}.js` and declares the module type in `node_modules/next/types/global.d.ts:57` | `[VERIFIED: installed source]` — Next's own comment: *"Next.js provides these packages as aliases, and thus don't require having them installed as dependencies."* The npm package is **absent** from `node_modules` and from `package-lock.json`, and `import "server-only"` still works. |
| **`next/og`** (`ImageResponse`) | `node_modules/next/og.js` → `next/dist/server/og/image-response` | `[VERIFIED: file exists]` |

### Container / service images (verified against live registries, 2026-08-13)

| Image | Exists | Evidence |
|---|---|---|
| `mcr.microsoft.com/playwright:v1.60.0-noble` | **yes** | `[VERIFIED: mcr.microsoft.com/v2/playwright/tags/list]` — tag present alongside `-jammy`, `-noble-amd64`, `-noble-arm64` |
| `postgis/postgis:18-3.6` | **yes** (HTTP 200) | `[VERIFIED: registry-1.docker.io manifest HEAD]` |
| `postgis/postgis:18` | **NO — HTTP 404** | Confirms `docker-compose.yml`'s comment. **CI job 2 and job 3 must use `18-3.6`, never `:18`.** |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `server-only` alias | `npm i server-only` (the React marker package) | Adds a dependency for zero benefit — Next already aliases it. Installing it also introduces a supply-chain surface this phase otherwise has none of. **Do not install.** |
| Turbopack build (default) | `next build --webpack` | Both enforce `server-only`. Turbopack is what the measured build used; switching builders would invalidate the DB-free measurement and every baseline timing. Do not switch. |
| Actions-generated baselines (D-27) | Local Docker | Already rejected on a measured ground in D-27 (Windows-native `node_modules`). |

**Installation:** none.

---

## Package Legitimacy Audit

**This phase installs no external packages.** The two specifiers it introduces into source
(`server-only`, `next/og`) are both resolved by the already-installed `next@16.2.7` and require no registry
fetch — verified above by locating the alias target and the ambient module declaration on disk.

| Package | Registry | Disposition |
|---------|----------|-------------|
| `server-only` | n/a — **not fetched**; resolved by Next's bundler alias + `next/types/global.d.ts` | **Not installed — no audit surface** |
| `next/og` | n/a — subpath of installed `next@16.2.7` | **Not installed — no audit surface** |

**Packages removed due to slopcheck `[SLOP]` verdict:** none — nothing was proposed.
**Packages flagged `[SUS]`:** none.

> **Scope alarm for the planner:** if any plan proposes `npm install server-only`, `@tailwindcss/typography`,
> `vaul`, or a shadcn `sheet` block, that is a recorded-decision reversal (see `11-UI-SPEC.md`
> § Anti-Patterns and § Registry Safety), not a dependency choice. Raise it; do not absorb it.

---

## GATE-01 Findings — Playwright 1.60.0, measured

Every claim in this section was produced by running Playwright 1.60.0 in this repo against a throwaway
project (created under `.pwprobe/`, run, and **deleted** — `git status` confirmed clean afterwards).

### Finding 1 — baseline naming is `{arg}-{projectName}-{platform}{ext}` ✅ D-29 is sound

```
Error: A snapshot doesn't exist at C:\Users\Admin\Roaming\FitOut\.pwprobe\snap.spec.ts-snapshots\shot-visual-win32.png, writing actual.
```

With a project named `visual`, a Windows run writes **`shot-visual-win32.png`**. `[VERIFIED: measured]`

**Consequence:** D-29's `.gitignore` rules `*-win32.png` / `*-darwin.png` **do** match real filenames, and
D-30's standing test asserting "git tracks zero such files" is a gate that can actually fire. The Linux
equivalent will be `*-visual-linux.png` — which is what job 1 compares against and what D-27's dispatch job
commits.

> I initially suspected the opposite (the config source shows `this.snapshotSuffix = ""`), which would have
> made the `.gitignore` rules match nothing and the gate vacuous. **The measurement disproved that** — the
> `-win32` segment comes from the `{platform}` token, not `{snapshotSuffix}`. Recorded because a
> plausible-sounding source read pointed the wrong way and only running it settled it.

### Finding 2 — the default really is `"missing"` ✅ D-135's premise confirmed

`node_modules/playwright/lib/runner/index.js` config defaults: `updateSnapshots: "missing"`.
`[VERIFIED: installed source]`

### Finding 3 — ⚠ D-135's *stated failure mode* is WRONG for 1.60.0. The real one is worse in a different way.

D-135 says a CI run finding no baseline *"writes one and reports green — indistinguishable from a real
pass."* Measured, with `updateSnapshots: "missing"` and `--retries=2`:

```
  x  1 [visual] › .pwprobe\snap.spec.ts:2:5 › names the baseline (426ms)
    Error: A snapshot doesn't exist at ...\shot-visual-win32.png, writing actual.
  1 failed
EXIT=1
```

Then, **immediately re-running with no code change**:

```
  ok 1 [visual] › .pwprobe\snap.spec.ts:2:5 › names the baseline (291ms)
  1 passed (1.1s)
EXIT2=0
```

Two measured facts: the missing-baseline failure is **non-retriable** (no retry attempts ran despite
`--retries=2`), and the PNG **was written**. So the fail-open is **not "green on this run"** — it is
**"green on the next run, off a baseline the failed run just minted."**

**Why this makes D-28 more important, not less.** A red that turns green on a bare re-run is the textbook
rubber stamp: nobody investigates a gate that passes when you press the button again. And the baseline that
made it green was produced by whatever machine happened to run second — on Windows, a `*-win32.png` sitting
in the author's working tree. **D-28's unconditional `"none"` is the fix, and the plan should cite this
measured behaviour rather than D-135's wording.**

### Finding 4 — `updateSnapshots: "none"` behaves exactly as D-28 needs ✅

Same missing baseline, config `updateSnapshots: "none"`, `--retries=2`:

```
  x  1 [visual] › names the baseline (166ms)
  x  2 [visual] › names the baseline (retry #1) (163ms)
  x  3 [visual] › names the baseline (retry #2) (172ms)
    Error: A snapshot doesn't exist at ...\shot-visual-win32.png.
  1 failed
PNG WRITTEN? -> 0 file(s)
```

Three differences from `"missing"`, all favourable: the error loses its `, writing actual.` clause,
**zero PNGs are written**, and the failure now *is* retriable — so it stays red across all three attempts
and across any number of re-runs. `[VERIFIED: measured]`

### Finding 5 — the CLI flag DOES override config `"none"` ✅ D-28's regeneration path works

Two independent confirmations:

- **Source** (`node_modules/playwright/lib/common/index.js`):
  `updateSnapshots: takeFirst(configCLIOverrides.updateSnapshots, userConfig.updateSnapshots, "missing")`
  — CLI first, config second, default last. `[VERIFIED: installed source]`
- **Behaviour**: `npx playwright test --config … --update-snapshots` against config `"none"` →
  `1 passed`, `PNG WRITTEN? -> 1 file(s)`. `[VERIFIED: measured]`

Valid values (validated by the config loader): `"all" | "changed" | "missing" | "none"`.

### Finding 6 — a few-pixel shift is detected at default thresholds ✅ D-30's second OBSERVED RED is cheap

Baseline captured, then a `margin-left:2px` added to the rendered content:

```
Error: expect(page).toHaveScreenshot(expected) failed
  249 pixels (ratio 0.01 of all image pixels) are different.
```

No threshold tuning needed. `[VERIFIED: measured]`

### Container-job specifics for the workflow

| Item | Value | Source |
|---|---|---|
| Image | `mcr.microsoft.com/playwright:v1.60.0-noble` | `[VERIFIED: MCR tag list]` |
| Version match | **Mandatory.** *"If the Playwright version in your Docker image does not match the version in your project/tests, Playwright will be unable to locate browser executables."* | `[CITED: playwright.dev/docs/docker]` |
| `--ipc=host` | **Recommended for Chromium** — *"Without it, Chromium can run out of memory and crash."* | `[CITED: playwright.dev/docs/docker]` |
| Default user | **root** (sandbox disabled; acceptable for trusted E2E). The docs' own GH Actions container example passes `options: --user 1001`. | `[CITED: playwright.dev/docs/docker, /docs/ci]` |
| Browser install step | **Not needed** — the image ships browsers and OS deps. | `[CITED: playwright.dev/docs/ci]` |

### The `workflow_dispatch` commit-back job (D-27)

| Concern | Finding | Source |
|---|---|---|
| Recursive triggering | **Cannot happen.** *"if a workflow run pushes code using the repository's `GITHUB_TOKEN`, a new workflow will not run even when the repository contains a workflow configured to run when `push` events occur."* | `[CITED: docs.github.com — trigger-a-workflow]` |
| ⚠ The flip side | Because the push does **not** retrigger CI, **the freshly committed baselines are never verified by a run.** The plan must make the verification explicit: after the dispatch job commits, dispatch or push again so job 1 compares against them. Otherwise D-27 produces baselines nobody has ever seen pass. | derived from the above |
| Permissions | `permissions: contents: write` on that job only; every other job stays `contents: read`. | `[ASSUMED]` — standard practice; the docs page fetched did not enumerate it |
| Git identity | Must be set explicitly in the job (`github-actions[bot]`); the container image has no configured identity. | `[ASSUMED]` |
| ⚠ Concurrency interaction (D-25) | `cancel-in-progress: true` with a group of `${{ github.workflow }}-${{ github.ref }}` means **a push to the same branch cancels a running baseline-generation dispatch**, leaving a partial or absent baseline commit. Fix: include the event name in the group — `group: ${{ github.workflow }}-${{ github.ref }}-${{ github.event_name }}`. | `[CITED: docs.github.com — workflow-syntax#concurrency]` (concurrency groups are event-agnostic strings; scoping by `github.event_name` separates them) |

### Service containers — the addressing rule that will otherwise burn job 2 or 3

| Job shape | Service hostname | Port mapping needed? |
|---|---|---|
| Job runs **in a container** | the **service label** (e.g. `postgres`) | **No** — same user-defined bridge network, all ports open |
| Job runs **directly on the runner** | `localhost` | **Yes** — `ports: ["5432:5432"]` |

`[CITED: docs.github.com — Creating PostgreSQL service containers]`

**Applied here:** job 2 (vitest) has no browser need, so run it on the plain runner with
`ports: ["5432:5432"]` and `DATABASE_URL=…@localhost:5432/…`. Job 3 (price e2e) needs a browser **and** a
database — if it runs in the Playwright container, its `DATABASE_URL` host is the **service label**, not
`localhost`. Getting this backwards produces a connection-refused that reads like a flaky service.

**Test-database naming is a hard invariant:** `tests/helpers/test-db-url.ts` throws unless the resolved
database name ends in `_test` (because `tests/global-setup.ts` truncates it). CI job 2 must therefore point
at `fitout_test`, provisioned by `npm run db:test:setup`. The `postgis` image is required (not plain
`postgres`) because the exclusion constraint needs `btree_gist`.

---

## GATE-04 Findings

### Measured selector inventory (2026-08-13)

| Selector | Count in `e2e/` | UI-SPEC states | Match? |
|---|---|---|---|
| `getByRole` | **92** | 92 | ✅ |
| `getByLabel` | **30** | 30 | ✅ |
| `getByText` | **63** | 63 | ✅ |
| `.locator(` | **23** | 22 | ⚠ off by one |

`[VERIFIED: grep -ro … e2e/ \| wc -l]`. The two counts D-32's **floor** binds (92 / 30) are exact. The
`.locator(` drift is cosmetic — D-32 does not gate on it — but the plan should write **23** if it records
the number, and should not treat `11-UI-SPEC.md`'s 22 as an assertion target.

Per-file `getByRole` distribution, for sizing the floor test:

```
20 availability.spec.ts   8 cancel.spec.ts        2 login-persistence.spec.ts
 3 mode-switch.spec.ts   28 open-capacity.spec.ts  4 password-reset.spec.ts
 2 public-listing.spec.ts 0 reduced-motion.spec.ts 0 scroll-area-overflow.spec.ts
21 search-and-book.spec.ts 4 stale-session-selfheal.spec.ts
```

`src/` contains **zero** `data-testid` today `[VERIFIED: confirmed]` — so the existence half of D-32 starts
at 0/14 and every one of the UI-SPEC's 14 names is net-new.

### The AST idiom this repo uses (D-31/D-32 must follow it, not grep)

Five existing design tests parse with the TypeScript compiler API rather than grepping:

```
tests/design/focus-recipe.test.ts:194   ts.createSourceFile(…)
tests/design/leak.test.ts:215           ts.createSourceFile(…)
tests/design/pair-drift.test.ts:409     ts.createSourceFile(…)
tests/design/status-vocab.test.ts:214   ts.createSourceFile(…)  (and :333)
```

`tests/use-server-exports.test.ts` states the reason explicitly, and it applies verbatim to the
selector-contract scan: *"`grep -rl '"use server"' src/` returns 31 files, but 15 of them are pure/isomorphic
modules whose header comments say, in prose, that they deliberately have NO `"use server"` directive… A
grep-based guard would have spent its life flagging comments."*

**Directly relevant:** a naive `grep -rn "server-only" src/` today returns **6 hits across 5 files, and every
single one is a comment.** `11-CONTEXT.md`'s line *"only 5 files in `src/` import `server-only`"* is that
grep, and the true count of real `import "server-only"` statements is **zero**. `[VERIFIED: measured]` The
design test asserting guard presence (D-34) must be AST-based or it will pass on prose.

### The `pg_constraint` pattern D-33 extends

`tests/availability/open-capacity-exclude.test.ts:139-152` — the exact shape to copy:

```ts
const [{ def }] = (await testDb.client`
  SELECT pg_get_constraintdef(c.oid) AS def
  FROM pg_constraint c
  JOIN pg_namespace n ON n.oid = c.connamespace
  WHERE c.conname = 'booking_no_overlap' AND n.nspname = ${testDb.schema}`) as unknown as { def: string }[];
expect(def).toContain("open_capacity = false");
expect(def).toContain("'cancelled'");
```

**The namespace scope is load-bearing and its own comment says so** — the dev `public` schema carries a
same-named constraint, so an unscoped query would read the wrong one and stay green after a mutation to the
isolated test schema. D-33's standing assertion must keep `n.nspname = ${testDb.schema}`.

### The hand-run mutation procedure (D-33) — safe shape

D-33 requires the destructive proof to be **recorded, never automated**. The risk it names is a failed
rollback leaving the test DB with no constraint and every later test silently green. The procedure that
eliminates that risk:

1. Run against **`fitout_test` only** — `tests/helpers/test-db-url.ts` already refuses any URL whose
   database name does not end in `_test`, so this invariant is machine-enforced, not remembered.
2. Capture the constraint definition **first**, verbatim, via the `pg_get_constraintdef` query above. That
   string is the restore script; do not retype it from the migration.
3. `ALTER TABLE booking DROP CONSTRAINT booking_no_overlap;` — then run
   `npx vitest run tests/availability/exclusion-race.test.ts` and capture the verbatim failure.
4. `ALTER TABLE booking ADD CONSTRAINT booking_no_overlap …` using the captured definition.
5. **Verify restoration by re-running step 2's query and asserting equality with the captured string**,
   then re-run the spec and confirm green. Step 5 is the part that makes step 3 safe; omitting it is the
   scenario D-33 rejected.
6. Commit the step-3 output as the spec's OBSERVED RED header block.

> A cheaper and lower-risk alternative to consider in planning: `DROP` the constraint inside an explicit
> `BEGIN … ROLLBACK` in a **psql session**, driven by hand. The rollback is atomic and the constraint cannot
> survive the disconnect. This still satisfies "recorded, never automated" and removes step 4/5's dependency
> on a correct manual re-ADD. `[ASSUMED]` — worth the planner's judgement; D-33's intent is preserved either
> way, and the mechanics were explicitly delegated.

---

## GATE-05 Findings — the largest correction in this document

### The violation inventory is 4 client components, not 1

`11-CONTEXT.md` names `listing-card.tsx` and states the only other boundary crossings are two benign
imports from `@/lib/availability/**`. **That is incomplete.** Every value import from a `"use client"` file
into a D-34 deny-list module, measured:

| # | Client component | Imports | From | Verdict |
|---|---|---|---|---|
| 1 | `src/components/listing/listing-card.tsx:43` | `allInRateParts` | `@/lib/booking/all-in-rate` | **VIOLATION** — the known one (D-36) |
| 2 | `src/components/availability/availability-calendar.tsx:32` | `computeServiceFee` | `@/lib/payments/service-fee` | **VIOLATION — NEW, not in CONTEXT.md.** A money computation in a client component, on the **public** `/listings/[id]` page. Called at lines **346** and **411**. |
| 3 | `src/components/availability/slot-picker.tsx:43` | `MIN_LEAD_INSTANT_MINUTES`, `MIN_LEAD_REQUEST_HOURS` | `@/lib/payments/config` | **LEGITIMATE** — lead-time constants, genuinely needed client-side |
| 4 | `src/components/host/request-row.tsx:34` | `APPROVAL_PAYMENT_WINDOW_HOURS` | `@/lib/payments/config` | **LEGITIMATE** — a display window constant |

`[VERIFIED: measured — grep of importers, then per-file inspection to separate `import type` from value imports]`

Type-only imports (`import type { AvailabilitySlot }`, `import type { DayAvailability }`) are erased before
the bundler sees them and are **not** affected by `server-only`. The two `@/lib/availability/**` imports
CONTEXT.md names (`BOOKING_HORIZON_DAYS`, `blockReasonLabel`) are confirmed present and benign.

### The leak is measured in the shipped production bundle — this is D-36's OBSERVED RED, already found

Grepping `.next/static/chunks/**` from the build run above:

```
chunks containing ??500 : 5
FILE: .next\static\chunks\0qdzq30-b1jdo.js
…PAYOUT_RETRY_MAX_AGE_HOURS,a.default.env.APPROVAL_SLA_HOURS;
let t=Number(a.default.env.APPROVAL_PAYMENT_WINDOW_HOURS??12),
    l=Number(a.default.env.SERVICE_FEE_BPS??500);
a.default.env.HOST_CANCEL_FEE_CENTS;
let r=Number(a.default.env.MIN_LEAD_REQUEST_HOU…
```

`[VERIFIED: measured against the build produced in this session]`

**What this proves, precisely:**

- `src/lib/payments/config.ts` is **wholly present in the browser bundle**, in **5 separate chunks**.
- `SERVICE_FEE_BPS`'s fallback literal `500` ships to users, exactly as `11-UI-SPEC.md` § GATE-05 says must
  not happen.
- `process.env` here is the **shimmed** browser object (`a.default.env`), not a static replacement — so at
  runtime `process.env.SERVICE_FEE_BPS` is `undefined` and the expression *always* evaluates to `500`,
  regardless of what the server is configured with. CONTEXT.md predicted this for `listing-card.tsx`; it is
  now confirmed at the bundle level and it has a second entry point.
- `COMMISSION_RATE_BPS ?? 1000` and `HOST_CANCEL_FEE_CENTS ?? 30000` were **not** found as fallback
  expressions — tree-shaking dropped the unreached ones. So the leak is real but bounded; the plan should
  not over-claim "every fee constant ships."

### ⚠ D-34 as literally written will break the build for the wrong reason

D-34 says to guard *"the fee constants in `src/lib/payments/config.ts` / `service-fee.ts`"*. Adding
`import "server-only"` to `config.ts` fails the build on rows **3 and 4** above — two legitimate client
imports of lead-time constants. That is precisely the outcome CONTEXT.md warned against:

> *"The deny-list must be drawn at computation modules, not whole trees, or `server-only` breaks these two
> legitimate imports and the gate fails for the wrong reason."*

`src/lib/payments/config.ts` exports **17 constants**, and they are not one kind of thing:

| Class | Examples | Client-safe? |
|---|---|---|
| **Fee / commission** | `SERVICE_FEE_BPS`, `COMMISSION_RATE_BPS`, `HOST_CANCEL_FEE_CENTS` | **No — must be guarded** |
| **Timing / windows / SLA** | `MIN_LEAD_REQUEST_HOURS`, `MIN_LEAD_INSTANT_MINUTES`, `APPROVAL_PAYMENT_WINDOW_HOURS`, `APPROVAL_SLA_HOURS`, `PAYMENT_WINDOW_MINUTES`, `PRE_*_REMINDER_HOURS`, `CHECKOUT_LEASE_TTL_SECONDS` | Yes — display/UX constants |
| **Payout mechanics** | `PAYOUT_DELAY_HOURS`, `PAYOUT_RETRY_*` | No client need |

**Recommended shape — split the module, do not guard it whole:**

- `src/lib/payments/config.ts` → keeps timing/window constants, **no guard**, client imports keep working.
- `src/lib/payments/fees.ts` (new) → `SERVICE_FEE_BPS`, `COMMISSION_RATE_BPS`, `HOST_CANCEL_FEE_CENTS`,
  `import "server-only"`. `service-fee.ts` imports from here.
- `service-fee.ts` and `all-in-rate.ts` keep their own `server-only` guards (they are computations).

**This is a scope increase over D-36's one-plan description and the planner must size it deliberately.**
D-36 sequences "guard → OBSERVED RED → fix" as one atomic plan on `listing-card.tsx`. In reality that plan
must also: split `config.ts`, update its importers, and move `availability-calendar.tsx`'s two
`computeServiceFee` calls server-side. It stays one plan (nothing may run against a red build), but it is a
larger one. **GATE-06 is not threatened — this is all TypeScript module surgery, zero schema change.**

### The enforcement mechanism is real under Turbopack ✅

Next 16.2.7 builds with **Turbopack by default** (the measured build printed `▲ Next.js 16.2.7 (Turbopack)`),
so the webpack alias in `node_modules/next/dist/build/webpack-config.js:1105-1162` is not the operative path.
The installed native binary carries the enforcement:

```
node_modules/@next/swc-win32-x64-msvc/next-swc.win32-x64-msvc.node
  contains 'server-only'                                    -> true
  contains 'client-only'                                    -> true
  contains 'cannot be imported from a Client Component'     -> true
```

`[VERIFIED: binary string scan]` The message template recovered from the binary is
`… cannot be imported from a Client Component module. It should only be used from a Server Component.`

**Expected OBSERVED RED shape** (for the plan's expectation — the executor captures the verbatim text):
a build-time module error naming the offending client module and the guarded specifier, of the form
`'server-only' cannot be imported from a Client Component module. It should only be used from a Server
Component.` **`[ASSUMED]` for the exact framing/formatting** — the string template is verified, the
surrounding Turbopack diagnostic layout (file/line/import-trace rendering) is not, and D-36 requires the
executor to capture it verbatim anyway.

### `import "server-only"` requires no install ✅

`node_modules/next/types/global.d.ts:50-63`, verbatim:

> *"…and thus don't require having them installed as dependencies. By default it works fine with typescript,
> because (surprisingly) TSC \*doesn't check side-effecting imports\*. But this behavior can be overridden
> with `noUncheckedSideEffectImports` … To prevent that, we add declarations for them here."*
> ```ts
> declare module 'server-only' { … }
> ```

`next-env.d.ts` pulls this in via `/// <reference types="next" />`, and `tsconfig.json` includes
`next-env.d.ts`. So the build's `Running TypeScript …` step will not error. `[VERIFIED: installed source]`

### Job 3's self-seeding pattern (D-35)

`e2e/search-and-book.spec.ts` is the template. Load-bearing details to copy:

- `const sql = postgres(process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout", { max: 1, onnotice: () => {} })`
  — **the Playwright process does not load `.env`**, so the fallback matters. In CI, set `DATABASE_URL`
  explicitly on the job (and remember the container-vs-runner hostname rule above).
- Unique ids per run: `` `e2e_sb_listing_${randomUUID()}` `` — never fixed ids.
- **Cascade-correct teardown: bookings FIRST** (`booker_id` is `ON DELETE RESTRICT`).
- The spec seeds an `instant` listing whose host is payouts-enabled, then drives search → listing → book,
  landing on the reserve page where the price breakdown renders. That is where
  `data-testid="price-total"` belongs and where the DB-vs-DOM comparison reads.

---

## STATE-01 Findings — the route inventory, and a better rule than the UI-SPEC's

### ⚠ The UI-SPEC's stated rule over-generates by 4

`11-UI-SPEC.md`: *"A route needs a `loading.tsx` if its `page.tsx` `await`s anything."* Implemented as a
grep for `await`, that flags all four `(auth)` pages — but their `await`s are inside **client-side event
handlers** (`await authClient.signIn.email(…)`), not server renders. All four are `"use client"` and all
four build as `○ (Static)`. A `loading.tsx` for them would never render.

### The correct discriminator: **the default export is `async`**

This correlates **1:1** with the build manifest's `ƒ (Dynamic)` marker across all 25 pages — measured, not
assumed. It is AST-checkable with the repo's existing `ts.createSourceFile` idiom, and it is DB-free, so it
belongs in `vitest.design.config.ts`.

### Full route inventory (25 `page.tsx`, measured 2026-08-13)

**Needs `loading.tsx` (async default export → `ƒ Dynamic`) — 20 routes:**

| Route | Has `loading.tsx` today |
|---|---|
| `/` (`page.tsx`) | — |
| `/listings/[id]` | — |
| `/listings/[id]/book` | — |
| `/invite/[token]` | — |
| `(app)/bookings` | ✅ **exists** (migrates to `RowListSkeleton`) |
| `(app)/bookings/[id]` | — |
| `(app)/bookings/[id]/cancel` | — |
| `(app)/bookings/[id]/group` | — |
| `(app)/profile` | — |
| `(host)/host` | — |
| `(host)/host/bookings` | — |
| `(host)/host/bookings/[id]` | — |
| `(host)/host/earnings` | — |
| `(host)/host/listings` | ✅ **exists** |
| `(host)/host/listings/new` | — |
| `(host)/host/listings/[id]/edit` | — |
| `(host)/host/listings/[id]/availability` | — |
| `(host)/host/requests` | — |
| `(host)/host/payouts/refresh` | — |
| `(host)/host/payouts/return` | — |

**Does NOT need one — 5 routes:** `(auth)/login`, `(auth)/signup`, `(auth)/forgot-password`,
`(auth)/reset-password` (all `"use client"`, sync, `○ Static`), and `/dev/theme` (sync server, `○ Static`).
This matches `11-UI-SPEC.md`'s own carve-out that the static legal pages get no `loading.tsx`.

**Net new work: 18 `loading.tsx` files.** REQUIREMENTS' "2 of ~27 routes have one today" is confirmed exact.

### The existing skeleton already encodes the measurement idea (`(app)/bookings/loading.tsx`)

```tsx
// Row heights match the real rows (a card is p-4 around a 48px thumbnail, so ~80px)
// so the list does not jump when the data lands
<Skeleton className="h-20 w-full rounded-xl" />
```

The `h-20` here is the literal the UI-SPEC's `measurements.ts` (`ROW_CARD_HEIGHT = "h-20"`) replaces. This
file is the **first** conversion target and the concrete example of the drift AC#16 prevents — the comment
already documents the reasoning, but the constant is inlined, which is exactly what the source gate flags.

### The `(app)` / `(host)` Suspense restructure — the security-critical split

Both group layouts today do, in order:

```ts
const session = await auth.api.getSession({ headers: await headers() });   // ← SECURITY GATE
if (!session?.user) redirect("/login");
// (host) only:  if (!u.canHost) redirect("/");
// (host) only:  const [{ p }] = await db.select({ p: count() })…          // pending-request badge
try {
  const [unread, rows, now] = await Promise.all([
    countUnread(db, session.user.id),
    listRecent(db, session.user.id, NOTIFICATIONS_MAX_LIMIT),
    readDbNow(db),
  ]);
} catch { notificationsFailed = true; }
```

**What must stay blocking:** `getSession` + both `redirect()` calls (T-04-06 / T-04-02). Moving a
`redirect()` behind `<Suspense>` streams the gated shell to the browser before the redirect resolves.

**What moves into the async child:** only the `try/catch`ed notification triple. The child must preserve
(a) owner-scoping in the query on `session.user.id` (T-07-82 — never post-filtered), (b) the
`readDbNow(db)` database-clock read for relative labels, and (c) the try/catch degradation to
`notificationsFailed`. The child receives `session.user.id` as a prop from the still-blocking parent.

**Open judgement for the planner:** `(host)`'s `pendingRequests` count is a **third** await, and it feeds a
badge inside the header's nav slot rather than the actions slot. It is not a security gate, so it can join
the streamed child — but it lives in a different slot, which may mean two Suspense boundaries or one shared
async child that supplies both. `11-UI-SPEC.md` only specifies the `actions` slot's boundary.

### Skeleton-does-not-shift: what the gate can and cannot see

`11-UI-SPEC.md` already specifies the two-layer approach (source gate + Playwright `boundingBox()` within
±2px). One addition from the roadmap that the plan should honour: **GATE-STATES is explicitly a *rendering*
assertion — "jsdom cannot catch this class of bug at all"** (Cross-Cutting Constraints). So the ±2px check
must be a Playwright assertion in the `visual` project's browser, never a Testing Library render.

---

## STATE-02 Findings

### The error-boundary props — UI-SPEC verified correct

`node_modules/next/dist/client/components/error-boundary.d.ts` (installed `next@16.2.7`):

```ts
export type ErrorInfo = {
    error: Error;
    reset: () => void;
    unstable_retry: () => void;
};
```

`[VERIFIED: installed source]` So `reset` is stable and the retry affordance exists only as
`unstable_retry`. `11-UI-SPEC.md`'s instruction — write against `reset`, leave a
`// TODO(next@16.3): retry()` marker — is correct as written. **The plan must not write `retry`** (no such
prop) and should not write `unstable_retry` either, since the UI-SPEC's copy contract binds `Try again` to
`reset()`.

`error` is typed as plain `Error`; `digest` arrives as `(error as Error & { digest?: string }).digest`.

### Placement rules for this repo's tree

| File | Placement | Note |
|---|---|---|
| `src/app/error.tsx` | root | covers `/`, `/listings/**`, `/invite/**` |
| `src/app/(app)/error.tsx` | group | |
| `src/app/(host)/host/error.tsx` | group | note: on `host/`, not `(host)/`, matching the existing layout's location |
| `src/app/(auth)/error.tsx` | group | |
| `src/app/(legal)/error.tsx` | group (new group) | |
| `src/app/global-error.tsx` | root only | renders its own `<html>`/`<body>`; receives no global styles → inline styles from `THEME_TOKENS.court` |
| `src/app/not-found.tsx` | root | **must reach no database** (see the build caveat) |
| `src/app/listings/[id]/not-found.tsx` | segment | |
| `src/app/invite/[token]/not-found.tsx` | segment | imports `INACTIVE_TITLE`/`INACTIVE_BODY` from the page — the oracle-closure property |

`global-error.tsx` sits under `src/app/**`, which `tests/design/leak.test.ts` already scans for raw design
values — so a hex literal there **already fails the build today**, as the UI-SPEC notes. Confirmed:
`leak.test.ts:335-336` asserts the scanner reaches `src/app/(auth)/login/page.tsx` and
`src/app/(host)/host/layout.tsx`, i.e. the whole `src/app` tree.

---

## App Shell & Share/Meta Findings

### `metadataBase` resolves to `localhost:3000` today

`src/app/layout.tsx:52` — `const DEFAULT_APP_URL = "http://localhost:3000"`, and `resolveMetadataBase()`
falls back to it unless `NEXT_PUBLIC_APP_URL` is set to an `http:`/`https:` URL. `[VERIFIED: source]`

**Consequence for SHELL-04:** `og:image` will be emitted as an absolute
`http://localhost:3000/listings/<id>/opengraph-image` until that env var is set. AC#11 ("the image responds
200 at 1200×630") is still satisfiable locally and in CI, but a *real* unfurl needs a real
`NEXT_PUBLIC_APP_URL`. This is the same class of unfilled-slot as `SUPPORT_EMAIL` — worth carrying as a
second named `human_needed` item rather than discovering it in Phase 17.

### `next/og` is available

`node_modules/next/og.js` and `node_modules/next/dist/server/og/image-response.{js,d.ts}` exist.
`[VERIFIED: file listing]` No install needed.

### The sticky-header offset consequence

`src/app/listings/[id]/page.tsx:346` — `lg:sticky lg:top-8` → `lg:top-20`. Confirmed as the **only** such
site (`11-UI-SPEC.md` states "exactly one such site today"; the source scan the plan writes should assert
that count so a second one cannot appear un-noticed).

### Middleware deprecation warning — expect it in every CI log

The build prints:

```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
  Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
```

and the route table renders `ƒ Proxy (Middleware)`. `src/middleware.ts` exists; `src/proxy.ts` does not.
**This is out of scope** (D-136 — no net-new capability; renaming the file is a behaviour-neutral migration
with its own risk on a security-adjacent file). It is recorded here **only** so a reviewer reading the first
CI log does not mistake a pre-existing deprecation warning for something this phase introduced.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Client/server boundary enforcement | A transitive AST import-graph walker | `import "server-only"` + Turbopack | Transitivity through barrels and re-exports for free, from the bundler that already builds the app. Explicitly deferred in CONTEXT.md § Deferred. |
| Baseline platform isolation | A custom `snapshotPathTemplate` with `{platform}` | Playwright's default template | The default **already** emits `-win32` / `-linux` (measured). Overriding it risks losing the segment `.gitignore` depends on. |
| Preventing implicit baseline writes | A pre-commit hook, a wrapper script, an env check | `updateSnapshots: "none"` in config | Measured: writes zero PNGs on any machine, and the CLI flag still overrides it for the dispatch job. One config line replaces a whole enforcement mechanism. |
| Source scanning for gates | `grep` / regex over `src/` | `ts.createSourceFile` | This repo's five existing design tests and `use-server-exports.test.ts`'s header document why: comments and template strings are indistinguishable from code to a regex. **A `server-only` grep today returns 6 comment-only hits and 0 real imports.** |
| Recursive-CI protection on the commit-back job | `[skip ci]` markers, path filters, a bot allowlist | `GITHUB_TOKEN` (default) | GitHub already guarantees a `GITHUB_TOKEN` push creates no workflow run. The real work is the *opposite*: making the follow-up verification explicit. |
| Test-database safety for the D-33 mutation | A checklist / a comment | `tests/helpers/test-db-url.ts`'s `_test` suffix guard | Already machine-enforced; it throws on any non-`_test` target. |
| Prose typography on `/terms`, `/privacy` | `@tailwindcss/typography` | The four named roles + `max-w-prose` | A second, un-gated type system beside DS-02's four roles. Banned in `11-UI-SPEC.md` § Anti-Patterns. |
| Mobile overlay | shadcn `sheet` | `patterns/responsive-dialog.tsx` over `ui/dialog` | Two focus traps, two escape behaviours, two baseline sets. Recorded decision. |

**Key insight:** every gate in this phase is stronger when an existing enforcer owns it — Next's bundler for
the boundary, Playwright's config for baseline writes, GitHub's token semantics for recursion, Postgres's
catalog for the constraint. The custom code this phase writes should be limited to *asserting that those
enforcers are still wired in*, which is exactly what D-34 says the design test's job shrinks to.

---

## Common Pitfalls

### Pitfall 1: Guarding `payments/config.ts` wholesale
**What goes wrong:** `next build` fails on `slot-picker.tsx` and `request-row.tsx` — two legitimate client
imports of lead-time constants — and the OBSERVED RED names the wrong files.
**Why it happens:** D-34 lists `config.ts` as a module to guard, but 14 of its 17 exports are client-safe.
**How to avoid:** split fee/commission constants into a guarded `fees.ts` first, then guard.
**Warning signs:** the build error names `slot-picker` or `request-row` rather than `listing-card` or
`availability-calendar`.

### Pitfall 2: Treating "CI went green on re-run" as a pass
**What goes wrong:** under `updateSnapshots: "missing"`, a missing baseline fails once, writes the PNG, and
the very next run is green with no code change.
**Why it happens:** measured behaviour of Playwright 1.60.0 — the write happens *on the failing run*.
**How to avoid:** D-28's unconditional `"none"`, which writes nothing and stays red across retries.
**Warning signs:** a `*-linux.png` appearing in `git status` after a CI-triggered local reproduction.

### Pitfall 3: The dispatch job's baselines are never verified
**What goes wrong:** D-27 commits baselines via `GITHUB_TOKEN`, which by design triggers no workflow. The
baselines land and nothing ever compares against them; the first real comparison happens whenever someone
next pushes — possibly alongside an unrelated change that gets blamed.
**How to avoid:** the plan's step after the dispatch job is an explicit re-run (push or second dispatch)
that must go green before the plan is complete.

### Pitfall 4: A push cancels the running baseline-generation job
**What goes wrong:** `concurrency: cancel-in-progress: true` grouped only by workflow+ref cancels the
`workflow_dispatch` run mid-flight, leaving a partial baseline commit.
**How to avoid:** include `github.event_name` in the concurrency group.

### Pitfall 5: Addressing the Postgres service as `localhost` from inside a container
**What goes wrong:** connection refused, which reads as a flaky service and gets retried.
**How to avoid:** job-in-container → service **label** as hostname, no port mapping. Job-on-runner →
`localhost` + `ports: ["5432:5432"]`.

### Pitfall 6: Using `postgis/postgis:18` in the workflow
**What goes wrong:** image pull fails — the tag does not exist (**HTTP 404, verified**).
**How to avoid:** `postgis/postgis:18-3.6`, matching `docker-compose.yml`.

### Pitfall 7: A `server-only` guard-presence test written with `grep`
**What goes wrong:** it passes today against **six comment mentions and zero real imports**, and would keep
passing after every guard was deleted.
**How to avoid:** AST scan for a directive-prologue-adjacent `import "server-only"` declaration.

### Pitfall 8: Generating `loading.tsx` for every route whose source contains `await`
**What goes wrong:** four dead `(auth)` loading files that can never render, plus an AC#15 gate that is
green for the wrong reason.
**How to avoid:** the rule is *the default export is `async`* — verified 1:1 against the build manifest.

### Pitfall 9: Moving the session `redirect()` behind `<Suspense>`
**What goes wrong:** the gated shell streams to the browser before the redirect resolves — a real security
regression on T-04-06 / T-04-02.
**How to avoid:** only the try/catch'd notification read moves; the gate stays blocking.

### Pitfall 10: Adding `globalSetup` or `setupFiles` to `vitest.design.config.ts`
**What goes wrong:** silently reintroduces the Docker/Postgres dependency, and `npm run build` — hence CI
job 1 — stops being DB-free. The measured result at the top of this document is invalidated.
**How to avoid:** the config's own header says it outright. Every new DB-free gate goes in `tests/design/**`
with no setup files. If a gate needs a database, it is not a design test and belongs in job 2.

---

## Runtime State Inventory

This phase is not a rename/refactor/migration in the sense that inventory targets, but it **does** change
CI-observable and build-observable state, so the categories are answered explicitly rather than omitted.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | **None.** GATE-06 binds: zero schema migrations, `drizzle/` stays at `0025`. Verified: no plan input proposes a schema change; the `payments/config.ts` split is TypeScript-only. | none |
| **Live service config** | **GitHub Actions does not exist yet** — `.github/workflows/` is created from nothing. The `origin` remote (`pengr3/FitOut`) exists but has never run a workflow. Repository-level settings that must be correct for D-27: Actions enabled, and workflow write permission for `GITHUB_TOKEN` (Settings → Actions → General → Workflow permissions). **This is a repo setting outside the working tree and cannot be set by a commit.** | `human_needed` — verify Actions write permission before the dispatch job's first run |
| **OS-registered state** | **None.** No Task Scheduler entries, no pm2, no launchd — this phase registers nothing with the OS. | none |
| **Secrets / env vars** | **CI needs `DATABASE_URL` only** (jobs 2 and 3). No PayMongo, Resend, Cloudinary, Better Auth or Google secrets are required, because the 12 e2e specs stay out of CI (D-24) and the one exception (D-35) drives only search → listing → reserve, stopping before the PayMongo hosted checkout. **This is a deliberate property worth asserting: job 3 must not need a single production secret.** Separately, `NEXT_PUBLIC_APP_URL` is unset, so `metadataBase` falls back to `localhost:3000` (§ Share & Meta). | set `DATABASE_URL` per job; carry `NEXT_PUBLIC_APP_URL` as `human_needed` |
| **Build artifacts** | `.next/` is gitignored and rebuilt. **`tsconfig.tsbuildinfo` is committed-adjacent and `.gitignore`d via `*.tsbuildinfo`** — no action. The one artifact that matters: **baseline PNGs are a new tracked artifact class**, and `.gitignore` currently has **zero** `*.png` rules (`[VERIFIED: .gitignore read in full]`). D-29's two rules are genuinely net-new. | add `*-win32.png` / `*-darwin.png`; assert via D-30's standing test |

---

## Environment Availability

| Dependency | Required By | Available (this machine) | Version | Fallback |
|------------|------------|--------------------------|---------|----------|
| Node.js | everything | ✓ | v24.13.0 | — |
| `next` | build, all routes | ✓ | 16.2.7 | — |
| `@playwright/test` | GATE-01 | ✓ | 1.60.0 | — |
| Chromium (Playwright) | GATE-01, job 3 | ✓ | `chromium-1223` + headless shell | — |
| `typescript` | AST gates | ✓ | 5.x | — |
| **Docker daemon** | local Postgres, local container runs | **✗ — not running** | — | **Not needed.** D-27 puts baseline generation in Actions specifically to avoid local Docker; job 1's DB-free property was measured with Docker down. |
| **PostgreSQL (local)** | full vitest suite, e2e | **✗ — port 5432 closed** | — | CI job 2/3 use the `postgis/postgis:18-3.6` service. Locally, `npm run db:up` when needed. |
| `mcr.microsoft.com/playwright:v1.60.0-noble` | job 1, job 3 | ✓ (registry) | — | — |
| `postgis/postgis:18-3.6` | job 2, job 3 | ✓ (registry) | — | — |
| GitHub Actions runner | all CI | ✓ (repo has `origin`) | — | — |
| `server-only` npm package | D-34 | **✗ — and not needed** | — | Next's alias + ambient declaration |
| `ctx7` CLI / Context7 MCP | doc lookup | **✗** | — | Used installed package source + official docs + live registry APIs instead — a *stronger* source for version-pinned behaviour than docs would have been |

**Missing dependencies with no fallback:** none.

**Missing with fallback (both fine):** Docker and local Postgres. Neither blocks this phase's plans —
job 1 is DB-free (measured), and jobs 2/3 run their databases as Actions services. The only local work that
would want Postgres is the D-33 hand-run mutation, which needs `npm run db:up` first.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (DB-free gates) | Vitest 4.1.8 via `vitest.design.config.ts` — `tests/design/**` only, environment `node`, **no `globalSetup`, no `setupFiles`** |
| Framework (DB gates) | Vitest 4.1.8 via `vitest.config.ts` — `globalSetup: tests/global-setup.ts`, `setupFiles: tests/setup.ts`, `testTimeout: 20_000` |
| Framework (browser) | Playwright 1.60.0 — `playwright.config.ts`, gains a `visual` project (D-29) |
| Quick run (design) | `npm run test:design` — **57s, 22 files, 458 tests, zero DB** (measured) |
| Full suite | `npm test` (`vitest run`) — requires `fitout_test` |
| E2E | `npm run test:e2e` — boots `npm run dev`; **stays out of CI except job 3** |
| Build gate | `npm run build` = `lint && test:design && next build` — already the enforcement chain |

### Phase Requirements → Test Map

| Req | Behavior | Test Type | Automated Command | Layer | Exists? |
|-----|----------|-----------|-------------------|-------|---------|
| GATE-01 | `.gitignore` carries both platform rules AND git tracks zero such files | design (DB-free) | `npm run test:design` | Vitest node | ❌ Wave 0 |
| GATE-01 | Missing baseline fails; few-pixel shift fails | **OBSERVED RED, recorded once** (D-30) | manual, output committed in the workflow header | Playwright/CI | ❌ |
| GATE-01 | Every baselined surface: `court.png !== grove.png`, except `global-error` | e2e visual | `npx playwright test --project=visual` | Playwright | ❌ Wave 0 |
| GATE-04 | Every declared `data-testid` appears in `src/` | design (AST) | `npm run test:design` | Vitest node | ❌ Wave 0 |
| GATE-04 | `getByRole` ≥ 92 and `getByLabel` ≥ 30 in `e2e/` (**floor**) | design | `npm run test:design` | Vitest node | ❌ Wave 0 |
| GATE-04 | `booking_no_overlap` exists with its expected definition | integration (DB) | `npx vitest run tests/availability/open-capacity-exclude.test.ts` | Vitest + Postgres | ⚠ partial — `:139` exists, extend |
| GATE-04 | (N+1)th booking succeeds when the constraint is dropped | **OBSERVED RED, hand-run** (D-33) | manual against `fitout_test`; output committed | psql + Vitest | ❌ |
| GATE-05 | Build fails when a client graph reaches a guarded module | **build** | `npm run build` | Turbopack | ❌ Wave 0 |
| GATE-05 | Every declared module still carries its `server-only` guard | design (AST) | `npm run test:design` | Vitest node | ❌ Wave 0 |
| GATE-05 | DOM price == DB price | e2e (self-seeded) | `npx playwright test e2e/price-parity.spec.ts` | Playwright + Postgres | ❌ Wave 0 |
| STATE-01 | Every async-default `page.tsx` has a `loading.tsx` (20/20) | design (AST) | `npm run test:design` | Vitest node | ❌ Wave 0 |
| STATE-01 | Skeletons import boxes from `measurements.ts`; zero literal `h-`/`w-`/`aspect-` | design | `npm run test:design` | Vitest node | ❌ Wave 0 |
| STATE-01 | Skeleton vs resolved container within ±2px, both themes | e2e visual | `npx playwright test --project=visual` | **Playwright only** — jsdom cannot see this (GATE-STATES) | ❌ Wave 0 |
| STATE-01 | Every skeleton renders exactly one `role="status"` with a non-empty name | design (jsdom pragma) | `npm run test:design` | Vitest jsdom | ❌ Wave 0 |
| STATE-02 | Five `error.tsx` exist, each with two actions | design | `npm run test:design` | Vitest node | ❌ Wave 0 |
| STATE-02 | `SENTINEL_LEAK_PROBE` appears zero times in the rendered DOM | e2e | Playwright | Playwright | ❌ Wave 0 |
| STATE-02 | `global-error.tsx` imports `THEME_TOKENS`, zero Tailwind classes | design | `npm run test:design` | Vitest node | ❌ Wave 0 |
| STATE-02 | Invite not-found text === invite page inactive text | design | `npm run test:design` | Vitest node | ❌ Wave 0 |
| STATE-04 | Zero `border-dashed` empty blocks outside `patterns/empty-state.tsx` | design | `npm run test:design` | Vitest node | ❌ Wave 0 |
| SHELL-01 | Header height 56/64, identical in both themes, all three compositions | e2e visual | Playwright | Playwright | ❌ Wave 0 |
| SHELL-01 | Header + brand boxes byte-identical before/after auth-slot resolution | e2e | Playwright | Playwright | ❌ Wave 0 |
| SHELL-01 | `getByRole("navigation")` === 1 at 320px and 1280px | e2e | Playwright | Playwright | ❌ Wave 0 |
| SHELL-02 | `SUPPORT_EMAIL` null ⇒ zero support affordances (**inverted**, D-26) | design | `npm run test:design` | Vitest node | ❌ Wave 0 |
| SHELL-02 | Legal notices carry the exact strings; bodies contain no legalese tokens | design | `npm run test:design` | Vitest node | ❌ Wave 0 |
| SHELL-04 | OG routes import `THEME_TOKENS`; invite OG references no `params`, imports no db | design | `npm run test:design` | Vitest node | ❌ Wave 0 |
| SHELL-04 | Invite route retains `robots: noindex` + `referrer: no-referrer` | design | `npm run test:design` | Vitest node | ❌ Wave 0 |
| RESP-01 | `scrollWidth <= clientWidth` at 320px on 12 routes, both themes | e2e | Playwright | Playwright | ⚠ harness exists (10-16) |
| DS-11 | `ui/sheet.tsx` absent; `Z_SHEET_INVENTORY` asserted empty | design | `npm run test:design` | Vitest node | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test:design` (57s, DB-free — runs anywhere)
- **Per plan:** `npm run build` (lint + design + build ≈ 3 min; **this is also the GATE-05 enforcement point**)
- **Per plan that touches a baselined surface (D-25):** push and wait for CI green before the next plan starts
- **Per wave merge:** `npm test` (full vitest, needs `fitout_test`)
- **Phase gate:** all three CI jobs green, then `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `.github/workflows/ci.yml` — jobs 1–3 (GATE-01, GATE-04, GATE-05)
- [ ] `.github/workflows/baselines.yml` (or a `workflow_dispatch` job in the same file) — D-27
- [ ] `playwright.config.ts` — `visual` project, `updateSnapshots: "none"`, non-Linux hard-skip
- [ ] `package.json` — exact-pin `@playwright/test@1.60.0`
- [ ] `.gitignore` — `*-win32.png`, `*-darwin.png`
- [ ] `src/lib/design/measurements.ts` — skeleton box constants (UI-SPEC)
- [ ] `src/lib/design/selector-contract.ts` — the typed inventory (D-31)
- [ ] `src/lib/site.ts` — `SUPPORT_EMAIL: string | null = null` (D-26)
- [ ] `src/lib/payments/fees.ts` — the guarded split from `config.ts` (**new, from research**)
- [ ] `e2e/visual/freeze.css` — determinism (reduced motion, zeroed durations, hidden caret)
- [ ] `e2e/price-parity.spec.ts` — job 3's single spec (D-35)
- [ ] `tests/design/` — ~12 new gate files (see the map above)
- [ ] 18 × `loading.tsx`, 5 × `error.tsx`, 1 × `global-error.tsx`, 3 × `not-found.tsx`

*No framework install is needed — Vitest, Playwright and the browsers are all present.*

---

## Security Domain

**`security_enforcement: true`, ASVS level 1.** This phase is unusual in that it **hardens** the security
posture rather than adding attack surface — but three of its changes touch security-relevant code paths.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control in this phase |
|---------------|---------|-------------------------------|
| V2 Authentication | **yes** | The `(app)`/`(host)` Suspense restructure touches the T-04-06 / T-04-02 gates. The `getSession` + `redirect()` pair **must stay blocking**; only the ambient notification read may stream. |
| V3 Session Management | **yes** | The header's auth slot reads the session. It must read it server-side (`await headers()`), never via a client fetch — a client session read would both leak session shape into the bundle and reintroduce layout shift. |
| V4 Access Control | **yes** | `(host)`'s `canHost` check and both layouts' owner-scoped-in-the-query reads (T-07-82) must survive the restructure unchanged. **Never post-filter.** |
| V5 Input Validation | yes (unchanged) | Zod 4 at every boundary; this phase adds no new input surface. `/` still re-validates `searchParams` through `searchParamsSchema` (T-04-PARAMTAMPER). |
| V6 Cryptography | no | No new crypto. The `Paymongo-Signature` HMAC path is untouched. |
| V7 Error Handling & Logging | **yes — the phase's largest new security surface** | Five new `error.tsx` boundaries. **Neither `error.message` nor `error.stack` may reach the DOM** — only `digest`. Asserted by the `SENTINEL_LEAK_PROBE` test. |
| V14 Configuration | **yes** | CI secrets. Job 3 must need **only** `DATABASE_URL` — no PayMongo/Resend/Cloudinary/auth secrets. Verified reachable: the spec stops before the PayMongo hosted checkout. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation | Status in this phase |
|---------|--------|---------------------|----------------------|
| **Server error text leaking table names / paths / connection strings** | Information Disclosure | Render `digest` only | New requirement — five boundaries, one assertion |
| **Invite-token probe oracle** | Information Disclosure | Identical response for malformed and unknown tokens | 08-06 closed it; the new `invite/[token]/not-found.tsx` must **import** `INACTIVE_TITLE`/`INACTIVE_BODY`, not re-author them. Two literals drift; the drift is the oracle. |
| **Per-token OG image as an unauthenticated credentialed endpoint** | Information Disclosure | Constant image; zero `params` read; zero DB access | Asserted by AC#12 |
| **Invite URL indexed or leaked via `Referer`** | Information Disclosure | `robots: { index: false, follow: false }` + `referrer: "no-referrer"` | Both must survive the `metadata` → `generateMetadata` conversion (AC#13) |
| **Commission/fee constants in the browser bundle** | Information Disclosure | Server-side computation; pre-formatted strings to the client | **Live today — measured in 5 chunks.** GATE-05 fixes it. |
| **Security gate moved behind a streaming boundary** | Elevation of Privilege | Keep `redirect()` blocking | The single riskiest edit in this phase |
| **CI secrets exposed to a flaky, retried e2e job** | Information Disclosure | Keep the 12 e2e specs out of CI; job 3 needs only `DATABASE_URL` | D-24's stated rationale, now checkable |
| **A test-suite DDL mutation destroying the double-booking constraint** | Tampering / DoS | Recorded hand-run only; `_test` suffix guard; post-run existence verification | D-33 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | The exact Turbopack `server-only` diagnostic formatting (file/line/import-trace layout). The message *template* is verified in the binary; the rendered shape is not. | GATE-05 | Low — D-36 requires the executor to capture it verbatim anyway. Only affects how the plan words its expectation. |
| A2 | `permissions: contents: write` and an explicit git identity are what the D-27 commit-back job needs. | GATE-01 | Low-medium — standard Actions practice, but unverified against docs in this session. A wrong guess fails loudly on the first dispatch, not silently. |
| A3 | The `(host)` `pendingRequests` count can join the streamed child rather than staying blocking. | STATE-01 | Low — it is a badge, not a gate. Flagged as a planner judgement call because the UI-SPEC only specifies the `actions` slot. |
| A4 | The psql `BEGIN … ROLLBACK` variant is a safe alternative to drop-and-re-ADD for D-33. | GATE-04 | Low — offered as an option, not a replacement. D-33 explicitly delegates mechanics. |
| A5 | Adding a session-aware header keeps `next build` DB-free (the `headers()` dynamic bailout fires before any DB call). | Open Risk | **Medium — this is the one assumption that could reopen the resolved risk.** Mitigated by making the unreachable-`DATABASE_URL` build a standing CI assertion, which converts it from an assumption into a measurement on every run. |
| A6 | `NEXT_PUBLIC_APP_URL` is genuinely unset in the target deployment (not just locally). | Share & Meta | Low — affects only whether SHELL-04 needs a second `human_needed` item. |

---

## Open Questions

1. **Does the repository have Actions workflow-write permission enabled?**
   - What we know: `origin` → `pengr3/FitOut` exists; no workflow has ever run.
   - What's unclear: the repo's *Settings → Actions → General → Workflow permissions* value, which is not
     visible from the working tree and cannot be set by a commit.
   - Recommendation: make it a `checkpoint:human-verify` in the plan that introduces the D-27 dispatch job.
     If it is read-only, the commit-back push fails with a 403 that is easy to misread as a git error.

2. **Which branch do the baselines get committed to, given `dev` is 145 commits ahead of `origin/dev`?**
   - What we know: CI only ever sees what is pushed (D-25); `main` is still at "Initial commit".
   - What's unclear: whether the first push is a 145-commit push to `origin/dev` (which will run CI against
     the whole accumulated tree — a large first red surface) or something staged.
   - Recommendation: plan for the first CI run to be red for reasons unrelated to this phase, and treat
     "get job 1 green on the existing tree" as its own early task. This is a schedule risk, not a technical
     one, but it is the kind that derails a phase's first day.

3. **Does `availability-calendar.tsx` need a props change, or can `computeServiceFee` move behind an
   existing server boundary?**
   - What we know: it already receives `serviceFeeBps` as a prop from the server, and calls
     `computeServiceFee(spaceCents, serviceFeeBps)` at lines 346 and 411 to derive an all-in figure.
   - What's unclear: whether the arithmetic can be pre-computed server-side for every slot, or whether it
     is genuinely per-interaction (the booker picks a window, then the total is derived client-side).
   - Recommendation: the planner should read those two call sites before sizing the GATE-05 plan. If the
     figure is per-selection, the fix is to pass a pre-computed rate table rather than the function — which
     is more work than `listing-card.tsx`'s straightforward "move it to the server".

---

## Sources

### Primary — HIGH confidence (measured or read from installed source in this session)

- **This repository, measured 2026-08-13** — the unreachable-`DATABASE_URL` build (exit 0, full route
  table), `.next/static/chunks/**` bundle grep (5 chunks contain `SERVICE_FEE_BPS??500`), the
  `.pwprobe/` Playwright behaviour probes (6 runs), selector counts, route/async classification, importer
  map, `.gitignore` contents.
- `node_modules/@next/env/dist/index.js` — shell env vs `.env.local` precedence
- `node_modules/next/types/global.d.ts:50-63` — `declare module 'server-only'` + Next's own note that no
  install is required
- `node_modules/next/dist/client/components/error-boundary.d.ts` — `ErrorInfo = { error, reset, unstable_retry }`
- `node_modules/next/dist/build/webpack-config.js:1105-1162` — `server-only` layer aliasing/erroring
- `node_modules/@next/swc-win32-x64-msvc/next-swc.win32-x64-msvc.node` — Turbopack enforcement strings
- `node_modules/playwright/lib/common/index.js` — `takeFirst(configCLIOverrides.updateSnapshots, userConfig.updateSnapshots, "missing")`; the four legal values
- `node_modules/playwright/lib/runner/index.js` — `updateSnapshots: "missing"` default
- `node_modules/playwright/lib/worker/workerProcessEntry.js` — the snapshot path template and `{platform}` substitution
- `mcr.microsoft.com/v2/playwright/tags/list` — `v1.60.0-noble` exists
- `registry-1.docker.io` manifest probe — `postgis/postgis:18-3.6` = 200, `postgis/postgis:18` = **404**
- In-repo conventions: `tests/use-server-exports.test.ts`, `tests/availability/open-capacity-exclude.test.ts:139-152`, `tests/design/leak.test.ts`, `vitest.design.config.ts`, `tests/helpers/test-db-url.ts`, `e2e/search-and-book.spec.ts`, `e2e/helpers/theme.ts`, `src/app/(app)/layout.tsx`, `src/app/(host)/host/layout.tsx`, `src/lib/db/index.ts`, `src/app/layout.tsx:52-101`

### Secondary — MEDIUM-HIGH (official documentation)

- `playwright.dev/docs/docker` — `--ipc=host` rationale, root default, tag scheme, version-match requirement
- `playwright.dev/docs/ci` — the GH Actions container example (`options: --user 1001`), no browser-install step
- `docs.github.com` — *Trigger a workflow*: `GITHUB_TOKEN` pushes create no workflow run
- `docs.github.com` — *Workflow syntax → concurrency*: groups are event-agnostic strings
- `docs.github.com` — *Creating PostgreSQL service containers*: service-label vs `localhost` addressing

### Tertiary — LOW (unverified, flagged in the Assumptions Log)

- Actions `permissions:` / git-identity specifics for the commit-back job (A2)
- Turbopack diagnostic rendering layout (A1)

**Context7 / `ctx7` was unavailable in this session** (`command -v ctx7` → not found; no MCP tools present).
Mitigation was to read the **installed package source and native binaries directly**, plus live registry
APIs — for version-pinned behavioural questions like "what does Playwright 1.60.0 do with a missing
baseline", that is a *stronger* source than documentation, and it is what caught the D-135 discrepancy.

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| The named open risk (job 1 DB-free) | **HIGH** | Run end-to-end with a controlled unreachable DB; exit 0 captured verbatim; route table corroborates the mechanism |
| GATE-01 / Playwright behaviour | **HIGH** | Six probe runs plus installed-source reads; two independent confirmations of the CLI-override claim |
| GATE-05 / boundary violations | **HIGH** | Importer map measured, per-file type-vs-value inspection done, and the leak confirmed in the built bundle |
| Container / service images | **HIGH** | Live registry queries, including a negative result (`:18` → 404) |
| STATE-01 route inventory | **HIGH** | 25/25 pages classified and cross-checked 1:1 against the build manifest |
| STATE-02 error props | **HIGH** | Installed type definition |
| GitHub Actions workflow specifics | **MEDIUM** | Official docs for the load-bearing semantics; job-level `permissions`/identity details assumed (A2) |
| Post-phase build DB-freeness | **MEDIUM** | Reasoned from the `headers()` dynamic bailout, not measured — mitigated by the proposed standing CI assertion (A5) |

**Research date:** 2026-08-13
**Valid until:** ~2026-09-12 (30 days). The pinned versions (`next@16.2.7`, `@playwright/test@1.60.0`,
`postgis:18-3.6`, `playwright:v1.60.0-noble`) are exact, so the behavioural findings do not expire with
upstream releases. Re-measure the **build DB-freeness** after the app shell lands regardless of date.
