# The local triage harness — 19.1-02 Task 2

> ⚠ **THE REAL-MAIL OPT-IN FLAG IS NEVER SET FOR A TRIAGE RUN.** `FITOUT_E2E_REAL_EMAIL=1` makes
> `playwright.config.ts` **inherit** the operator's `RESEND_API_KEY` instead of injecting `""`, and this
> machine's `.env.local` holds a **live** transactional-mail key. The injected empty value is the only
> thing standing between a triage run and real outbound email to fixture-minted addresses. Do not set
> the flag, do not export it, do not add it to a `.env` file. Every plan that inherits this harness
> inherits this line.

This file is the **harness**. It is run first by plans 07, 08, 09 and 10 so each spends its context on
the defect rather than on rediscovering the environment.

---

## (a) THE SEQUENCE

Run in this order, from the repository root, in Git Bash on this box.

```bash
# 1. Postgres up. Idempotent — safe to run when `fitout-db-1` is already up.
npm run db:up

# 2. Schema, then the demo catalogue. Both are required: the e2e fixtures mint their own
#    per-run UUID rows, but they seed ON TOP of the demo catalogue.
npm run db:migrate
npm run db:seed

# 3. Remove the build cache. REFLEXIVE, not conditional — see warning 4.
rm -rf .next

# 4. Confirm port 3000 is free. Empty output = free. Any line = something holds it; kill that
#    process before continuing (see warning 1).
netstat -ano | grep -E ':3000[[:space:]]' || echo "port 3000 is free"

# 5. Run ONE spec, with tracing on, against the functional project.
npx playwright test e2e/<spec>.spec.ts --project=chromium --trace on

# 6. Open the trace that step 5 wrote (the path is printed in the transcript).
npx playwright show-trace test-results/<...>/trace.zip
```

Verified on this box, 2026-09-05: `docker ps` reports `fitout-db-1  postgis/postgis:18-3.6  Up 14 hours`;
`npx playwright test --project=chromium --list` reports `Total: 460 tests in 39 files`.

---

## (b) THE FOUR WARNINGS — each with the consequence of ignoring it

**1. Free port 3000 BEFORE you run. The config does not reuse an existing server.**
`playwright.config.ts` sets `reuseExistingServer: false`, unconditionally and deliberately (`[17-D24]`
/ `[17-D28]`). **Consequence of ignoring it:** the run does not fall back to the server already on the
port — it *aborts*, and Playwright's error names the port. The old `!process.env.CI` value silently
adopted whatever process held :3000 along with whatever environment *that* process was booted with, and
it produced false results twice (17.1 waves 1 and 2), including a `.next`-wedged server answering 500 on
every route whose 500s were reported as failures of the product.

**2. Local retries are 0; CI's are 2. Add `--retries=2` (and `--workers=1`) to reproduce CI's shape.**
`retries: process.env.CI ? 2 : 0`. **Consequence of ignoring it:** a CI failure that burned three
attempts presents locally as a single failure, so "it only failed once here" is not evidence of
anything, and a *flake* is indistinguishable from a hard failure. ⚠ **Measured this session and not in
RESEARCH.md:** `workers` is unset, so Playwright derives it from cores — the 2-core CI runner yields
**1 worker**, this laptop yields **4** (`Running 6 tests using 4 workers`,
`evidence/testfail-behaviour.txt`). Any ordering-dependent hypothesis — e.g. Cause F's live hypothesis 2,
"a hold placed by an earlier spec still occupies 2:00 PM" — therefore does **not** reproduce by default.
`--workers=1` is what reproduces CI's ordering.

**3. The dev server is given an EMPTY transactional-mail key by `webServer.env`, and it must stay that
way.** `env: REAL_EMAIL ? {} : { RESEND_API_KEY: "" }`. The empty string (not an unset) is load-bearing:
`webServer.env` merges *over* `process.env`, and `@next/env` re-supplies a `.env.local` value only when
the key is `undefined` — so a *deleted* variable would be re-supplied from the live `.env.local` at
server boot. **Consequence of ignoring it:** setting `FITOUT_E2E_REAL_EMAIL=1` restores the measured
behaviour of 12 outbound `POST https://api.resend.com/emails` from one `overflow-320.spec.ts` run and 2
from `axe-sweep.spec.ts` — on the operator's live key, really leaving the machine. No spec depends on
delivery; the two that need an emailed token read it from Postgres.

**4. `rm -rf .next` before every triage run.** **Consequence of ignoring it:** a stale Turbopack cache
fakes route 404s and hydration mismatches, and both have been misfiled as product bugs in this
repository before (RESEARCH.md Pitfall 7). A "404" or "hydration failed" reproduced against a week-old
cache is not a reproduction; it is a second bug report about the cache.

**And one that is NOT a local-run warning, stated so nobody wastes a cycle on it:** the `visual` project
is **not collected at all** off Linux — `playwright.config.ts` omits the project entry entirely on
`process.platform !== "linux"` and prints a one-line reason on stderr on every run. A visual
reproduction needs the pinned `mcr.microsoft.com/playwright:v1.60.0-noble` container and is **plan 12's**
subject, not a local run.

---

## (c) PER-ITEM REPRODUCTION LINES — the four unresolved verdicts

Each line gives the spec path, the narrowest run command, and the **one observation** that settles the
verdict. Nothing below records a verdict; see (d).

### 1. `e2e/skeleton-geometry.spec.ts:1807` — the host-bookings row that grew ~20px

```bash
npx playwright test e2e/skeleton-geometry.spec.ts --project=chromium --trace on \
  --grep "the fixture: one host|title\) the Space cell"
```

The narrower grep is **mechanical, not convenient**: the `14-15` describe is
`test.describe.configure({ mode: "serial" })` (`:1691`), so the first failure skips every case after it,
and a probe whose defect reddens an earlier case never reaches the clause it was written for. This grep
runs the seeding case `(0)` and the `(title)` case (`:2182`) and nothing between them.

**THE ONE OBSERVATION:** read the rendered `<td>` widths at 1280px and determine **which cell wrapped —
the When cell or the Space cell**.
- **When wraps** → this is the reverted `260824-dbc` regression put back, and the product is wrong.
  `src/app/(host)/host/bookings/page.tsx:380-384` carries the instruction it violates.
- **Space wraps because the composed date widened When** → fixture drift; the fixture title shortens
  again. The residual is `864 − Guest − When − Status − Payout − Actions` and it moves with the
  calendar, so the row height is a function of the date.

⚠ **The spec's own instruction, verbatim, because this is the one item where following the error message
naively could bless a genuine defect:** *"Re-measure and move the constant, never the tolerance."*

### 2. `e2e/hold-countdown.spec.ts:443` — the 9-minute timeout (Cause F, plan 08 owns the verdict)

```bash
npx playwright test e2e/hold-countdown.spec.ts --project=chromium --trace on --workers=1 \
  --grep "the countdown announces exactly once"
```

`test.describe.configure({ mode: "serial" })` is file-scoped here (`:105`), so `--workers=1` matches CI's
ordering as well as its serialisation.

**THE ONE OBSERVATION:** open the trace and read the **DOM snapshot at the moment of the timeout**, and
answer both halves: **is a day selected in the month grid**, and **is the `2:00 PM` hour button absent or
present-but-disabled?**
- No day selected → `selectTargetDay`'s click was lost (it calls `day.first().click()` with no
  post-condition), the hour buttons never rendered, and the repair is a post-condition assertion.
- Day selected and `2:00 PM` present-but-disabled → an earlier spec's hold still occupies the slot on
  the shared target day (`now + 3 days`).

Two hypotheses are already **refuted** and must not be re-tested: parallel-worker interference (CI runs
1 worker) and a day-of-week gap in the seeded hours (the fixture inserts `06:00`–`21:00` for all seven
days, `booker-seed.ts:303-309`).

### 3. `e2e/host-headings.spec.ts:964` — the wizard refused the location step

```bash
npx playwright test e2e/host-headings.spec.ts --project=chromium --trace on \
  --grep "wizard · whole space, every step"
```

The `AC#35` describe is `mode: "serial"` (`:717`), so the grep keeps an earlier case from masking this
one.

**THE ONE OBSERVATION:** read **what the location step's server action actually returned** (the trace's
network tab, or the dev-server console for the server-action response) and **whether the same refusal
happens locally at all**. The failure message reports the save-state region saying `(nothing)` — the
action neither succeeded nor surfaced an error. Step 3 is `{ key: "location", title: "Where is it?" }`
(`src/app/(host)/host/listings/[id]/edit/wizard.tsx:164`).

⚠ The spec's own message forbids acting on a guess: *"That is a fixture failure or a real refusal —
never a reason to lower the step count or to weaken the guard that refused."* If it refuses locally too,
it is a real refusal and a product bug on the listing-creation path.

### 4. `e2e/avatar-crop.spec.ts` (`:974`, `:2675`, `:2747`) and `e2e/overflow-320.spec.ts:3400` — the upload path

```bash
npx playwright test e2e/avatar-crop.spec.ts --project=chromium --reporter=list
npx playwright test e2e/overflow-320.spec.ts --project=chromium --trace on --workers=1 \
  --grep "AC#36"
```

`avatar-crop.spec.ts` has no serial describe, so it needs no grep. The `AC#36` describe in
`overflow-320.spec.ts` is `mode: "serial"` (`:3352`).

**THE ONE OBSERVATION:** **does the upload path succeed on this machine at all?** That single fact is
what distinguishes an environment-capability gap from a broken spec:
- **Passes locally** → CI lacks a live Cloudinary credential and structurally cannot have one
  (`ci.yml` is invariant-forbidden from carrying any `secrets.` reference,
  `scripts/verify-workflows.mjs`), so plan 10 chooses between a `page.route` intercept, a
  locally-served committed asset (`public/vrt/photo-0.svg`, the idiom `overflow-320.spec.ts:2740`
  already uses), and an annotation.
- **Fails locally too** → they are broken specs and plan 10 REPAIRS them.

`avatar-crop.spec.ts:322-329` states that three cases perform a **real** upload and that in each one the
upload is *unavoidable rather than convenient*, so this is not a case where the upload can simply be
dropped. `tests/listing/photos.test.ts:434` names the absent-credential condition as *"the state every
CI run is in"*.

---

## (d) THIS FILE IS THE HARNESS, NOT A VERDICT

**No triage conclusion for any of the fourteen failures is recorded here.** Every line above stops at the
observation that would settle a verdict and does not state one. Each repair plan reproduces first and
writes its own `evidence/triage-<spec>.txt` transcript — the command line above the unedited output, per
the convention established by Phase 19's `evidence/guards-pre-fix.txt` — and records its verdict there,
quoting the transcript line the verdict is read from. A verdict with no quote is not a verdict.
