---
phase: 11-quality-gates-pattern-layer-app-shell
plan: 06
subsystem: testing
tags: [e2e, playwright, ci, github-actions, money, gate-05, price-parity, selector-contract]
requires:
  - phase: 11-01
    provides: "The AST/`server-only` half of GATE-05 — no money COMPUTATION crosses the client boundary"
  - phase: 11-02
    provides: "SELECTOR_CONTRACT + the undeclared-`data-testid` ban that makes `price-total` the only legal name"
  - phase: 11-04
    provides: "`.github/workflows/ci.yml` with jobs 1 and 2, and the PARSE-don't-grep instruction in its header"
provides:
  - "GATE-05's second half: an integer-equality assertion between the rendered checkout total and booking.quoted_total_cents"
  - "`e2e/price-parity.spec.ts` — one self-seeded, secret-free spec whose only env input is DATABASE_URL"
  - "CI job 3 `gate-price-parity`: the Playwright container + a PostGIS service, running exactly one spec"
  - "The first `data-testid` ever rendered in `src/` — `price-total`, turning the contract's 11-06 row green"
  - "A measured demonstration that whole-file substring verification of ci.yml is now vacuous 6 ways out of 6"
affects: [11-13, 11-22]
tech-stack:
  added: []
  patterns:
    - "Invert the formatter, don't format the DB value: compare money as integer centavos so a locale/symbol change is not a false red on a money gate"
    - "Reachability guard BEFORE the assertion, as a bounded poll rather than a locator auto-wait, so a missing hook names the invariant instead of timing out"
    - "A CI job's secret budget stated as a contract in a comment: a second credential means the spec outgrew its boundary and must be split"
key-files:
  created:
    - e2e/price-parity.spec.ts
  modified:
    - src/components/booking/price-breakdown.tsx
    - .github/workflows/ci.yml
key-decisions:
  - "The parity assertion compares INTEGER CENTAVOS, obtained by stripping non-digits from the rendered string after asserting its 2-decimal shape — never by formatting the DB value and string-comparing"
  - "The seed uses a non-round hourly rate so the frozen service fee is a ROUNDED figure; a round rate would hide exactly the client-side re-derivation drift D-75 forbids"
  - "`pickWindow`/`selectTargetDay` are a deliberate VERBATIM COPY of the analog's, not a hoist into `e2e/helpers/` — the hoist would edit a shipped money spec from a plan whose declared surface is one new file"
  - "Job 3 runs IN the Playwright container, so its DATABASE_URL host is the service LABEL and the service publishes NO ports — the mirror image of job 2"
patterns-established:
  - "Measure the prescribed verification before trusting it: 6 mutations x 2 checkers, recorded in the file being verified"
  - "A comment explaining a grep-counted token must not spell the token (this plan tripped its own AC once, and the ci.yml header once)"
requirements-completed: [GATE-05]
duration: ~2h
completed: 2026-08-13
---

# Phase 11 Plan 06: DB-vs-DOM Price Parity Summary

**The number a booker sees on the reserve page is now provably the number the database froze — asserted
as integer centavos, by one self-seeded spec, in a CI job that holds exactly one credential and it is a
throwaway service password.**

## Performance

- **Duration:** ~2h
- **Started:** 2026-08-13T14:08Z (approx.)
- **Completed:** 2026-08-13T14:36Z (code); SUMMARY + state after
- **Tasks:** 3/3
- **Files modified:** 3 (1 created, 2 modified)

## What Shipped

| Task | Commit | What |
|---|---|---|
| 1 | `5b19c06` | `data-testid="price-total"` on the checkout total + `tabular-nums` on the two money figures that render inside LABELS |
| 2 | `571d733` | `e2e/price-parity.spec.ts` — 347 lines, one assertion |
| 3 | `9ba3e19` | `gate-price-parity`, CI job 3 |

The assertion, in one line:

```
toCentavos(getByTestId("price-total").textContent()) === booking.quoted_total_cents  // for the hold the UI just placed
```

## Falsification Evidence — every gate here has been WATCHED FAILING

A gate that has never been watched failing is not a gate. Four probes, all real, all reverted:

| # | Probe | Result |
|---|---|---|
| A | `data-testid` renamed to `price-total-x` → design gate | **RED.** `price-breakdown.tsx:190 — data-testid="price-total-x" is NOT declared in SELECTOR_IDS`, with file, line AND value |
| B | `formatMoney(quotedTotalCents + 1, …)` → parity spec | **RED.** `The reserve page rendered 99400 centavos; booking.quoted_total_cents … is 99399` — both integers, in the message |
| C | hook renamed to `price-total-x` → parity spec | **RED on the REACHABILITY GUARD**, `expected 1, received 0`, not on a vacuously-passing equality |
| D | 6 mutations of `ci.yml` → the plan's prescribed substring check | **GREEN six times out of six** (see below) |

Probe B's numbers are worth reading: `99399 = 94666 space + 4733 fee`. The fee is `round(94666 × 5%)` =
`round(4733.3)`, so the seeded rate deliberately exercises the rounding path. A client that re-derived the
total would land on a different centavo, and this spec now says so.

After 4 runs (2 red, 2 green): `listing:0 user:0 booking:0 photos:0` for the `e2e_pp_%` / `fitout/e2e-pp/`
prefixes. The spec cleans up after itself even when it fails.

## THE HEADLINE FINDING: THE PLAN'S OWN `<verify>` WAS VACUOUS 6 WAYS OUT OF 6

11-04 measured its prescribed whole-file substring check vacuous for **2 of 5** tokens. This plan
prescribed the same shape for job 3. Measured against six real breakages of the actual file, each run
through both the prescribed check and a 28-assertion parse of the same bytes:

| Mutation | Prescribed substring check | Parsed check |
|---|---|---|
| (control) unmutated | GREEN | GREEN — 28 passed |
| job 3's DATABASE_URL host `postgres` → `localhost` | **GREEN\*** | RED |
| `ports: ["5432:5432"]` added to job 3's service | **GREEN** | RED |
| job 3's whole `npx playwright test …` step deleted | **GREEN** | RED |
| job 3's service image → the 404 major-only tag | **GREEN** | RED |
| job 3's one spec → `npm run test:e2e` (all twelve) | **GREEN** | RED |
| `--ipc=host` dropped from the container options | **GREEN** | RED |

**Six of six.** Worse than 11-04's two of five, and the reason is structural rather than accidental: every
token survives in the file's own prose (the spec path and job name are quoted in comments, `--ipc=host` is
quoted in the comment explaining why it is mandatory), and the image tag is not one of the five tokens at
all. **The substring check gets more vacuous the better the file is documented, so it decays exactly as
the file improves.**

**\* The asterisk is the sharpest part.** That row was GREEN because the first draft of the table
recording this finding spelled the host token contiguously — *the note documenting the vacuity was itself
an instance of it*. Isolated with a control: strip the table → the mutation goes RED; restore it → GREEN.
The table now avoids the token, so re-running the matrix against the shipped file reports RED for that one
row and GREEN for the other five. Both measurements are written into `ci.yml`'s header with the asterisk
explained, so a later reader cannot mistake the discrepancy for sloppiness.

**The same trap fired a second time, in a different file.** Task 1's acceptance criterion is
`grep -c 'data-testid="price-total"' … == 1`. The explanatory comment I added made it read **2**. That is
`price-breakdown.tsx`'s own GREP TRIPWIRE rule — *"a grep is only a real guard if it cannot be tripped by
the very comment forbidding the string"* — tripped by the note explaining the thing it guards. Fixed by
never spelling the attribute+value pair contiguously in prose, and recorded in the comment so the next
editor does not undo it. **Twice in one plan, in two unrelated files, is not a coincidence: it is what
"verify by matching text in a file that documents itself" costs.**

### The parse-based checker (ad-hoc, as 11-04 left it)

28 assertions over the `yaml`-parsed tree: job 3's container image/options, the service image, the
**absence** of a `ports` mapping, `pg_isready`, `DATABASE_URL`'s hostname parsed with `new URL()` (not
matched as a substring), the run commands read as VALUES so a step `name:` cannot satisfy them, `no
secrets.` in the parsed tree, first-party `uses:` only, plus the global invariants job 3 must not have
disturbed (`permissions`, `github.event_name`, job 1's missing `services:`, job 2's `localhost`+`ports`).
Guard-the-guard first: three jobs must parse, or every assertion below is vacuous.

It stays **ad-hoc**, exactly as 11-04 decided: `yaml` is present transitively in `node_modules` but is not
a declared devDependency, and promoting it is a package decision (a checkpoint), not a side effect.
`git diff --stat package.json` is empty for this plan, consistent with 11-01 through 11-05.

## Task 1 — the hook, and one thing the plan did not ask for

The AC "every money figure carries `tabular-nums`" was **not** already true. An AST enumeration of all 8
`formatMoney` call sites in the file (rather than reading the JSX by eye) found two figures rendering
inside LABEL spans without it:

| Line | Figure | Before |
|---|---|---|
| run line | `{rate}/hr × N hours` | `text-muted-foreground` |
| extra guests | `Extra guests (N × {fee})` | `text-muted-foreground` |

Both fixed; the four value-column figures already had it. This is the "a single tool error is a lower
bound" habit applied to an acceptance criterion: reading the AST found the class, not the first offender.

No structural edit, no layout change, and the PanelCard container is untouched — plan `11-13` owns it.

## Task 2 — what the spec is, and the three decisions inside it

- **Seed:** a `martial_arts_boxing` gym. **No other e2e spec and no dev seed uses that space type**, so the
  category filter isolates this listing whatever else is in the database. (`e2e/search-and-book.spec.ts`
  owns `tennis_court`; four specs share `yoga_studio`.)
- **Integer comparison, not string comparison.** `formatMoney` pins fraction digits to 2, so stripping
  non-digits is an exact inverse whatever ICU emits for the symbol (`₱` vs `PHP`), the group separator, or
  the U+00A0 between them. Formatting the DB value and comparing strings would turn a locale change into a
  RED on the one gate that must never be ignored.
- **Reachability first, as a bounded poll.** `expectReachable` runs before the visibility check and before
  the equality, and asserts **exactly 1** — 0 means the hook moved (probe C), >1 means the breakdown is
  rendered twice and "the rendered total" is ambiguous. Polling rather than relying on locator auto-wait is
  what makes probe C fail on the guard's own message instead of an opaque locator timeout.

The flow **stops at the reserve page**. Verified structurally, not by grep: an AST walk of the spec finds
exactly one `process.env` read, `DATABASE_URL`. (A raw-text scan for "paymongo|resend|cloudinary|secret"
hits 8 lines — all comments explaining the boundary, plus the `paymongo_account_id` COLUMN in the seed.
That is 11-04's inverse collision recurring: a raw scan cannot tell a prohibition from a violation.)

## Task 3 — job 3

```
container: mcr.microsoft.com/playwright:v1.60.0-noble, options: --ipc=host
services.postgres: postgis/postgis:18-3.6, pg_isready health check, NO ports
env: DATABASE_URL: postgres://fitout:fitout@postgres:5432/fitout   ← service LABEL
steps: checkout → setup-node 24 (npm cache) → npm ci → npm run db:migrate
     → npx playwright test e2e/price-parity.spec.ts --project=chromium
```

`npm run test:e2e` appears in no `run:` value anywhere in the workflow. The job needs no browser-install
step (the image ships them) and no `db:test:setup` (it runs no vitest).

**Header corrections made while in the file**, both because they had become false:

1. The "ONE narrow exception is coming … added by plan `11-06`, not here" bullet now points at the shipped
   job.
2. "The 12 shipped e2e specs" was measured at **eleven** (`ls e2e/*.spec.ts`). The twelfth `.ts` under
   `e2e/` is `helpers/theme.ts`, which is not a spec. With this plan's addition there are now twelve specs
   and **eleven** are excluded. The measurement is recorded next to the correction — the same idiom
   `selector-contract.test.ts` uses for its 22-vs-23 `.locator(` drift.

## Deviations from Plan

**1. [Rule 2 — missing critical verification] The plan's `<verify>` command could not detect any of six real breakages.**
- **Found during:** Task 3
- **Fix:** built a 28-assertion parse-based checker, ran the 6-mutation matrix through both checkers, and
  wrote the table + the asterisk control into `ci.yml`'s header for `11-22`, who edits the file next.
- **Commit:** `9ba3e19`

**2. [Rule 2 — missing critical functionality] Two money figures lacked `tabular-nums`.**
- **Found during:** Task 1 (AST enumeration of all `formatMoney` call sites, not by eye)
- **Fix:** `tabular-nums` added to the run-line and extra-guests LABEL spans.
- **Commit:** `5b19c06`

**3. [Rule 1 — the plan's own AC was self-defeating] `grep -c` read 2, not 1.**
- **Found during:** Task 1
- **Fix:** the explanatory comment no longer spells the attribute+value pair contiguously. Documented in
  place so it is not reintroduced.
- **Commit:** `5b19c06`

**4. [Scope decision, not a deviation] `pickWindow`/`selectTargetDay` copied verbatim rather than hoisted.**
The plan says "reuse … do NOT re-derive the venue-local date math". They are not exported. Hoisting them
into `e2e/helpers/` would edit `e2e/search-and-book.spec.ts` — a shipped money spec outside this plan's
declared surface. They are copied **character-for-character** with a comment naming the source lines and
the reason, so the math is identical, not re-derived. **The hoist is a clean follow-up** and is logged
below.

## Verification

| Check | Result |
|---|---|
| `npx playwright test e2e/price-parity.spec.ts --project=chromium` | **passed**, twice in a row (12.8s / 12.6s) |
| `npm run build` (lint + design gate + `next build`) | **exit 0** — 0 errors / 9 warnings (pre-existing), 514 design assertions, 21 static pages |
| `npm test` (full vitest) | **1216 passed / 4 skipped**, unchanged from the wave baseline |
| `npx tsc --noEmit` | **exit 0** |
| `tests/design/selector-contract.test.ts` | **5 passed** — the `price-total` row is now the first declared id actually rendered in `src/` |
| parse-based `ci.yml` verification | **28 passed, 0 failed** |
| `ls drizzle/*.sql \| tail -1` | `0025_audit_resolved_by.sql` — GATE-06 intact, no migration added |
| Seed leak after 4 runs | `listing:0 user:0 booking:0 photos:0` |

### ⚠️ NOT YET OBSERVED — the CI run

The last acceptance criterion ("push to `origin/dev` and all three jobs green") is **not met yet, by
instruction**: the coordinator owns the push. Nothing here has been observed on a runner. What to look for
when it is pushed is in the checkpoint at the end of the executor's report; the two most plausible
first-run failures are recorded there rather than predicted away.

## Threat Model Disposition

| Threat ID | Disposition | How it is met |
|---|---|---|
| T-11-PRICE | mitigated | Integer equality, rendered vs `booking.quoted_total_cents`, on every push. Watched red (probe B). |
| T-11-PRICEVACUOUS | mitigated | Reachability guard before the equality, asserting exactly 1. Watched red (probe C) — it fails on the guard, not on a passing equality. |
| T-11-CISECRET | mitigated | Parsed tree: job 3 has exactly one env key and zero `secrets.`; the spec's only `process.env` read is `DATABASE_URL` (AST). The contract is written into the job as a comment. |
| T-11-SEEDLEAK | mitigated | Every seeded id carries `randomUUID()`; cascade-correct teardown runs on failure too (measured across 2 red runs). |
| T-11-SC | mitigated | Both image tags pinned and matched to existing artifacts (`v1.60.0-noble` matches the `@playwright/test@1.60.0` pin; `postgis/postgis:18-3.6`, never the 404 major-only tag — asserted structurally). Only `actions/*` steps. |

## Known Stubs

None.

## Handed Forward

- **`11-13`** owns `price-breakdown.tsx`'s container (PanelCard adoption). The `price-total` hook is on the
  **total's own span**, not on a wrapper — moving it onto a container would make the parity spec parse the
  string `Total₱1,234.00`. The comment above it says so.
- **`11-22`** edits `ci.yml` next: **parse it**; the command and the now-6-row vacuity table are in its
  header. Grant `contents: write` per-job only. Also: `11-22` owns the forward direction of the selector
  contract — as of this plan, 1 of 17 declared ids is rendered in `src/`.
- **Follow-up (logged, not taken):** hoist `pickWindow` / `selectTargetDay` / the venue-local target-day
  math into `e2e/helpers/venue-day.ts` and have both specs import it. Two verbatim copies of timezone math
  is one more than the rule allows; it needs a plan whose surface includes `search-and-book.spec.ts`.

## Self-Check

- `e2e/price-parity.spec.ts` — FOUND (tracked, committed in `571d733`)
- `src/components/booking/price-breakdown.tsx` — FOUND, modified in `5b19c06`
- `.github/workflows/ci.yml` — FOUND, modified in `9ba3e19`
- `5b19c06` / `571d733` / `9ba3e19` — all three FOUND in `git log`
- Each commit touches exactly one file
- `package.json` unmodified; no migration added

## Self-Check: PASSED
