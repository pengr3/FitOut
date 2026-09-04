---
phase: 19-host-listing-surfaces-gates-that-actually-run
reviewed: 2026-09-04T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - .github/workflows/ci.yml
  - e2e/helpers/booker-seed.ts
  - e2e/host-listing-grid.spec.ts
  - e2e/host-route-reachability.spec.ts
  - scripts/verify-workflows.mjs
  - src/app/(host)/host/listings/new/page.tsx
  - src/app/(host)/host/listings/page.tsx
  - src/app/actions/listing.ts
  - src/components/listing/listing-card.tsx
  - src/lib/listing/create-signal.ts
  - tests/design/listing-card-merge-order.test.ts
  - tests/host/verification-surface.test.ts
  - tests/listing/create-signal.test.ts
  - tests/listing/crud.test.ts
findings:
  critical: 2
  warning: 8
  info: 4
  total: 14
status: issues_found
---

# Phase 19: Code Review Report

**Reviewed:** 2026-09-04
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Three deliverables were reviewed against intent: the HSURF-01 call-site card fix (D-05/D-06/D-07/D-08), the D-02 reuse-then-mint branch plus the D-03 creation-failure signal, and the `gate-e2e` invariants in `scripts/verify-workflows.mjs`.

The card fix is **correct**. I verified the mechanism rather than accepting the argument: `Card`'s base is `flex flex-col … has-data-[slot=card-footer]:pb-0` with `gap-0` supplied at the call site, no child declares `flex-1`, and `mt-auto` on the last flex child is the right absorber; `h-full` genuinely would have been a no-op. `CardFooter`'s base really does carry `p-4`, `cn()` really does put the call-site string last, and `size="icon-sm"` really does resolve to `size-7` (28px), matching the `h-7` of the `size="sm"` siblings. `tests/design/listing-card-merge-order.test.ts`'s two source readers were traced against the real files and neither regex mis-anchors (`data-slot="card-footer"` does **not** collide with `Card`'s `has-data-[slot=card-footer]:pb-0`, because that occurrence is unquoted). The `sr-only` span is the accessible name and it is present. No findings there.

The **query-parameter handling is safe**: there is exactly one equality check, the value is never interpolated, and `tests/listing/create-signal.test.ts` proves the hostile-value case at the render site. I found no XSS or echo path.

The two blockers are elsewhere, and both are cases where the code's own prose asserts a property it does not have:

1. `createDraftListing` has **no failure path that returns `{ ok: false }` for an infrastructure failure** — a failed insert throws. So the entire D-03 signal (the copy module, the query token, the grid notice) can never fire for the case every comment in the phase says it catches.
2. The D-02 reuse predicate covers `listing_photo` and `operating_hours` but **not `availability_block`**, which `src/app/actions/blocks.ts:130` writes without touching the listing row. That is the third instance of the exact loophole the two `NOT EXISTS` conjuncts exist for, and it is reachable in two clicks from the shipped grid.

`verify-workflows.mjs`'s new assertions **can pass vacuously** — job deletion was closed, step deletion was not. Several of `ci.yml`'s own header invariants have gone false now that `gate-e2e` exists.

---

## Critical Issues

### CR-01: The D-03 creation-failure signal is unreachable for the failure it was built to catch

**File:** `src/app/actions/listing.ts:177-260`, `src/app/(host)/host/listings/new/page.tsx:83-104`, `src/lib/listing/create-signal.ts:26-35`

**Issue:**
`createDraftListing` returns `{ ok: false }` on exactly two paths — no session (`:179-181`) and a refusing verification status (`:205-218`). Every remaining statement is unguarded:

```ts
const [reusable] = await db.select(...)   // :226 — throws on DB error
const id = randomUUID();
await db.insert(listing).values({ ... }); // :253 — throws on DB error
return { ok: true, id };                  // id is ALWAYS set when ok
```

There is no `try`/`catch` anywhere in the function. Therefore:

- `!res.id` in `new/page.tsx:84` is **dead** — `ok: true` always carries an id.
- `!res.ok` is reachable **only** for the two guarded paths, and `new/page.tsx` redirects both of them away *before* the call (`:56-58` for no session, `:69-81` for the four refusing states).
- "GENUINE INFRASTRUCTURE FAILURE ONLY — an insert that did not land" (`new/page.tsx:90-92`, restated in `create-signal.ts:28-29` and again in `tests/listing/create-signal.test.ts:14-17`) is the one thing that **cannot** reach this branch. A dead connection, a constraint violation, a timeout — all throw out of the page render and land on Next's error boundary. The host gets an error page, not the grid sentence. `18.1-UI-SPEC § NOT COVERED`'s blind spot is not closed; it is closed only for a case that does not occur.

The two windows that *are* technically reachable both produce **wrong copy**, which sharpens rather than softens the finding:

- session expires between the page's `getSession` (`:55`) and the action's (`:90`) → the host is told "Something went wrong on our side" instead of being sent to `/login`;
- an ops suspension lands between the page's `loadHostVerification` (`:68`) and the action's (`:204`) → the host reads copy that `create-signal.ts:23-35` bans by name, because the refusal *was* a verification refusal.

No test covers the origin. `tests/listing/create-signal.test.ts` renders the destination with a hand-supplied `searchParams`; `tests/host/verification-surface.test.ts:405-421` only greps the page source for the token. Nothing asserts that `createDraftListing` can ever produce a `{ ok: false }` the branch would see.

**Fix:** give the action the failure shape its callers already assume, and keep the two existing refusals distinguishable from it.

```ts
// src/app/actions/listing.ts — inside createDraftListing, after the verification gate
try {
  const [reusable] = await db.select({ id: listing.id }).from(listing).where(and(/* … */))
    .orderBy(desc(listing.createdAt)).limit(1);
  if (reusable) return { ok: true, id: reusable.id };

  const id = randomUUID();
  await db.insert(listing).values({ id, hostId: userId, status: "draft", bookingMode: "instant" });
  return { ok: true, id };
} catch (err) {
  // The branch `new/page.tsx:84` and `create-signal.ts` were written for. Log the shape, never
  // return it — `create-signal.ts` names no mechanism by design (T-19-32).
  console.error("[listing:create] draft mint failed", { userId, err });
  return { ok: false, error: LISTING_CREATE_FAILED_STATE };
}
```

Then separate the two live paths in `new/page.tsx` so the copy stays true — re-`redirect("/login")` when the action reports no session, and `redirect("/host/verify")` when it reports the verification refusal — leaving the grid bounce for the genuine infrastructure case only. Add one test that stubs `@/lib/db` to a rejecting `insert` and asserts `createDraftListing()` resolves `{ ok: false }` rather than rejecting; without it this regresses silently.

---

### CR-02: The D-02 reuse predicate can adopt a draft the host has already put availability blocks on

**File:** `src/app/actions/listing.ts:226-250` (predicate), `:138-144` (the completeness claim), `src/app/actions/blocks.ts:129-135` (the uncovered writer)

**Issue:**
The predicate's stated contract is that reuse can never adopt a draft the host has touched, and its docblock names the complete set of writers that bypass the `updated_at = created_at` term:

> "WHY THE TWO `NOT EXISTS` CONJUNCTS ARE NOT BELT-AND-BRACES … `listing-photo.ts:294` inserts into `listing_photo` … `operating-hours.ts:165-167` does the same for `operating_hours` (measured, both). **So the real gaps** …"

There is a **third** one. `src/app/actions/blocks.ts:129-135`:

```ts
await db.insert(availabilityBlock).values({ id, listingId, unit, startsAt, endsAt, reason });
revalidatePath(`/host/listings/${listingId}/availability`);
```

`addBlock` writes a child row and performs **no** `db.update(listing)` — verified by reading the whole function. `availability_block` (`schema.ts:1047`) is a first-class child of `listing` and is not in the predicate.

The path is reachable in two clicks from the shipped grid, and every conjunct still holds at the end of it:

1. Host presses *Create listing* → an empty draft (`title IS NULL`, `updated_at = created_at`, no photos, no hours).
2. Host clicks *Availability* on that draft's card — `(host)/host/listings/page.tsx:304` passes `availabilityHref` for **every** listing including drafts, and `[id]/availability/page.tsx` has no hours prerequisite and no draft refusal.
3. Host blocks a date. `listing.timezone` defaults to `Asia/Manila` (`schema.ts:223`), so `addBlock` succeeds on a bare draft. `updated_at` is untouched, `title` is still NULL, `listing_photo` and `operating_hours` are still empty.
4. Host presses *Create listing* again to start their second space → **the reuse read matches** and hands back listing #1, with the host's blackout dates silently inherited into what they believe is a brand-new listing.

That is the "TOO LOOSE" direction the docblock at `:147-151` declares unacceptable, arrived at through a table the measurement missed. It is the same class as `tests/listing/crud.test.ts` case 3 (the photo loophole), which the team judged worth a conjunct and a named test.

Secondary, in the same docblock: the claim at `:132-134` that `grep -n 'update(listing)' src/` finds "this file at four sites plus `src/lib/listing/re-review.ts:195`, and nothing else" is an incomplete census of writers to the table. `src/app/actions/ops-review.ts:667` and `:751` are raw-SQL `UPDATE listing` statements that the grep cannot see. They happen to be harmless (both set `updated_at = now()` explicitly, so they push a row toward the tolerable "too tight" side), but the stated method is what a future reader will re-run, and it will keep missing them.

**Fix:** add the third conjunct beside the two it belongs with, and correct the census.

```ts
// src/app/actions/listing.ts, in the reuse read's and(...)
sql`NOT EXISTS (SELECT 1 FROM listing_photo    WHERE listing_id = ${listing.id})`,
sql`NOT EXISTS (SELECT 1 FROM operating_hours  WHERE listing_id = ${listing.id})`,
// blocks.ts:129-135 inserts a subtractive block and does NOT update the listing row, so a draft
// the host has blocked dates on still reads `updated_at = created_at`.
sql`NOT EXISTS (SELECT 1 FROM availability_block WHERE listing_id = ${listing.id})`,
```

Add a fourth case to `tests/listing/crud.test.ts`'s D-02 describe, mirroring case 3 exactly (insert an `availability_block` directly, assert `updated_at === created_at` still holds as the premise, then assert the second create returns a different id and a second row lands). Also amend the docblock's writer census to state that the `update(listing)` grep does not see raw-SQL statements and to name `ops-review.ts:667,751`.

---

## Warnings

### WR-01: `verify-workflows.mjs`'s new `gate-e2e` invariants close job deletion but not step deletion — they can still pass over a job that runs nothing

**File:** `scripts/verify-workflows.mjs:622-664`

**Issue:** The stated purpose of the addition is anti-vacuity:

> "A DELETED JOB SATISFIES ALL OF THEM VACUOUSLY. Before this stop, `gate-e2e` could have been removed from ci.yml in one commit and this script would have printed a clean green…"

Only the *job* is asserted. The two things that make it a gate are not:

- **No assertion that the job runs the suite.** Delete `ci.yml:1252-1253` (`npx playwright test --project=chromium`) and every invariant here still holds: the job exists, the display name matches, the container and service are pinned, no `secrets.`, no mail key, the addressing rule passes. The required check goes green over a job that installs npm and stops. The `ci` section already knows how to assert this — it does exactly that for `gate-visual` at `:705-712` (`--project=visual` **by name**), and the same argument applies verbatim (`--project=chromium` is the name that selects `testMatch: "e2e/*.spec.ts"`).
- **No assertion that the job is unconditional.** `if: github.event_name == 'workflow_dispatch'` on the job, or `continue-on-error: true`, silently detaches the gate while leaving every parsed invariant intact — the same failure shape as the `name:` edit the check at `:659-664` was added for.
- The seed step (`ci.yml:1241-1242`) is likewise unasserted, and its own comment says five specs fail against an empty catalogue.

**Fix:**

```js
const e2eRuns = runsOf(e2e);
check(
  `"${CI_E2E_JOB}" runs the functional project BY NAME (--project=chromium)`,
  e2eRuns.some((r) => r.includes("playwright test") && r.includes("--project=chromium")),
  `run commands=${JSON.stringify(e2eRuns)}`,
);
check(
  `"${CI_E2E_JOB}" is unconditional — no job-level if:, no continue-on-error`,
  e2e?.if === undefined && e2e?.["continue-on-error"] !== true,
  `if=${JSON.stringify(e2e?.if ?? null)}  continue-on-error=${JSON.stringify(e2e?.["continue-on-error"] ?? null)}`,
);
check(
  `"${CI_E2E_JOB}" seeds the catalogue before the suite`,
  (() => { const s = e2eRuns.findIndex((r) => r.includes("db:seed"));
           const p = e2eRuns.findIndex((r) => r.includes("playwright test"));
           return s >= 0 && p >= 0 && s < p; })(),
  `indices: db:seed=${e2eRuns.findIndex((r) => r.includes("db:seed"))} playwright=${e2eRuns.findIndex((r) => r.includes("playwright test"))}`,
);
```

---

### WR-02: The D-14 mail assertion is narrower than both of its sites claim — the runtime half can only see what the parse half already forbids, and neither scans `container.env` / `services.*.env`

**File:** `.github/workflows/ci.yml:1219-1228`, `scripts/verify-workflows.mjs:486-510`

**Issue:** Two problems compound.

1. **The runtime step is effectively vacuous.** `MAIL_KEY_UNDER_TEST: ${{ env.RESEND_API_KEY }}` reads the GitHub Actions **`env` context**, which contains only variables declared in the workflow's own `env:` / job `env:` / step `env:` blocks. It does *not* see repository or organization secrets (`secrets` context), repository variables (`vars` context), or anything present in the runner/container image environment. So the only way this step can ever fire is a workflow-declared `RESEND_*` env key — which `verify-workflows.mjs:491-510` already rejects on job 1, a minute earlier. `ci.yml:1207-1210`'s claim ("this step is what makes that a PROPERTY instead of a COINCIDENCE") and `verify-workflows.mjs:108-111`'s ("Nothing but the assertion below stands between an unrelated secret addition and mail to real addresses") both overstate the coverage.

2. **The parse half has a real hole.** `mailEnvHits` walks `job.env` keys, step `env` keys and workflow `env` keys — but not `job.container.env` or `job.services.*.env`. A container-level `env:` block reaches every step in the job, so `container: { env: { RESEND_API_KEY: … } }` passes both checks and the suite mails 14 real addresses. Note `secretHitsIn` at `:196-217` *does* walk both of those maps — the mail scan simply forgot them.

**Fix:** widen the key scan to the same set `secretHitsIn` already covers, and rewrite the two comments to say what the runtime step actually guards (a workflow-declared key, in case job 1 was skipped or the script deleted) rather than what it does not.

```js
for (const [name, job] of jobs) {
  for (const k of Object.keys(job?.env ?? {})) { /* … */ }
  for (const k of Object.keys(job?.container?.env ?? {}))
    if (k.startsWith(MAIL_KEY_PREFIX)) mailEnvHits.push(`${name}.container.env.${k}`);
  for (const [svc, s] of Object.entries(job?.services ?? {}))
    for (const k of Object.keys(s?.env ?? {}))
      if (k.startsWith(MAIL_KEY_PREFIX)) mailEnvHits.push(`${name}.services.${svc}.env.${k}`);
  /* … steps … */
}
```

If the runtime half is meant to be real defence in depth, it has to read the process environment rather than the `env` context — e.g. `run: if [ -n "${RESEND_API_KEY:-}" ]; then …` with no `env:` block at all, which sees anything the container or runner injected.

---

### WR-03: The supply-chain and credential scans miss job-level `uses:` (reusable workflows) and `secrets: inherit`

**File:** `scripts/verify-workflows.mjs:369-375`, `:438-447`, `:196-217`

**Issue:** Both `uses:` scans are built on `stepsOf(job)`, which returns `[]` for a job written as a **reusable-workflow call**:

```yaml
jobs:
  gate-something:
    uses: some-org/some-repo/.github/workflows/thing.yml@main
    secrets: inherit
```

Such a job has no `steps`, so `ciUses` is empty for it and `ciThirdParty.length === 0` reports green; `secretHitsIn` never looks at `job.uses`, `job.with` or `job.secrets`, so `secrets: inherit` — which hands the called workflow **every repository secret** — passes the T-11-CISECRET assertion untouched. This is precisely the supply-chain decision T-11-SC says must be raised rather than absorbed, and it is currently invisible to the checker in both files.

**Fix:** add the job-level shapes to both scans.

```js
const jobUses = jobs.filter(([, j]) => typeof j?.uses === "string").map(([n, j]) => `${n}:${j.uses}`);
// fold jobUses into ciUses before the first-party filter
check(
  "no job delegates to a reusable workflow with `secrets: inherit`",
  jobs.every(([, j]) => j?.secrets !== "inherit"),
  `jobs with secrets:inherit=[${jobs.filter(([, j]) => j?.secrets === "inherit").map(([n]) => n).join(", ") || "(none)"}]`,
);
```
and extend `secretHitsIn` to scan `job.with.*` and `job.secrets.*` values alongside the step-level ones.

---

### WR-04: The addressing rule is total only over jobs that set `DATABASE_URL` at **job** level — a step-level move silently drops the T-11-DBFREE pairing

**File:** `scripts/verify-workflows.mjs:562-603`, `.github/workflows/ci.yml:446-458`

**Issue:** The loop is `const url = job?.env?.DATABASE_URL; if (typeof url !== "string") continue;`. `ci.yml:446-458` argues at length that the variable must stay at **job** level and states the parser now "asserts the pairing structurally — this job declares no `services:` AND its `DATABASE_URL` is the unreachable sentinel — so the two halves of T-11-DBFREE can no longer drift apart quietly."

They can. Move `DATABASE_URL` from `gate-db-free`'s job `env:` back onto the build step (`ci.yml:603`) — the exact mutation the comment forbids — and:

- the addressing loop skips the job entirely (no job-level `DATABASE_URL`);
- the "covered at least one job" guard at `:599-603` still passes on the other three jobs;
- the T-11-DBFREE check at `:610-620` only asserts the build job declares no `services:` — it never asserts the sentinel.

Net: the sentinel half of T-11-DBFREE becomes unasserted while the script prints a clean green, which is the vacuity class this file exists to remove.

**Fix:** make the loop consider the effective value, and assert the pairing on the build job directly.

```js
const stepUrls = stepsOf(job).map((s) => s?.env?.DATABASE_URL).filter((v) => typeof v === "string");
const url = job?.env?.DATABASE_URL ?? stepUrls[0];
```
plus, in the T-11-DBFREE block, `check("the job that runs \`npm run build\` points DATABASE_URL at the sentinel", …)` reading the same effective value.

---

### WR-05: `ci.yml`'s own header is now false — it describes FOUR jobs and claims eleven of twelve e2e specs are not run

**File:** `.github/workflows/ci.yml:11-50`, `:97-110`, `:148-156`

**Issue:** `gate-e2e` (job 5, `:1105-1253`) runs `npx playwright test --project=chromium`, and `playwright.config.ts:118` sets that project's `testMatch: "e2e/*.spec.ts"` — i.e. the **whole** functional suite. The header still says:

- `:11` — "THE JOB SPLIT (D-24 + D-35). **FOUR** jobs" followed by a four-item list that does not mention `gate-e2e`;
- `:36-45` — "**ELEVEN of the twelve** e2e specs in `e2e/` are NOT run here, by decision, not by oversight (D-24)… A flaky gate does not get fixed; it gets retried until green";
- `:46-50` — "The **ONE** narrow exception is now HERE: … job 3";
- `:148-156` — an invariant list that predates jobs 4 and 5.

This is the defect class the file names about itself twice ("A checker NAMED for one file that asserts invariants of two is the same defect class this repository keeps recording — a file that misstates its own subject"; "A description that outlives what it describes is the defect class this repository keeps recording"). A reader auditing D-24 from this header will conclude Playwright is out of CI, which is no longer true and which several other files still depend on being true (see WR-06).

**Fix:** update the header in the same commit style the file already uses for falsified passages — keep the old text, mark it falsified, and state what replaced it. Specifically: five jobs; job 5 runs the full functional set under D-12/CI-01; D-24's "eleven of twelve excluded" is retired, and what remains excluded is the `visual` project (owned by job 4).

---

### WR-06: `e2e/helpers/booker-seed.ts` carries two "THESE SPECS DO NOT RUN IN CI" warnings that are now false

**File:** `e2e/helpers/booker-seed.ts:266-268`, `:608-609`

**Issue:**

```
// ⚠ These specs do NOT run in CI (D-24), so nothing but a hand run can catch this.
...
// ⚠ THESE SPECS DO NOT RUN IN CI (D-24). Nothing but a hand run can catch a miss here — which is
// precisely how this class of fixture gap has stayed red through three review passes before.
```

`gate-e2e` runs `e2e/*.spec.ts` on every push and pull request, so both statements are now inverted. The same stale premise appears in `tests/host/verification-surface.test.ts:334-336` ("PROJECT D-24 keeps Playwright OUT OF CI, so it can go red for a month without anyone learning") — which is the stated *justification* for that file existing as a source scan rather than relying on `e2e/host-verification.spec.ts`. The reasoning is still defensible (a source scan is cheaper and runs in `gate-db`), but the premise quoted for it is no longer a fact.

**Fix:** correct all three comments to say what is now true — these specs run in `gate-e2e` on every push, and a fixture gap fails CI rather than waiting for a hand run. Where the old claim was load-bearing for a decision (`verification-surface.test.ts`), restate the surviving reason (cost and per-commit feedback) rather than deleting the paragraph.

---

### WR-07: `/host/listings/new` performs a database write during a GET page render

**File:** `src/app/(host)/host/listings/new/page.tsx:83`

**Issue:** The page's render calls `createDraftListing()`, which inserts a row. A GET that mutates is reachable by any navigation the host does not initiate — a cross-site link, a prefetch, a browser prerender hint, a bot following the `Create listing` anchor on a page the host left open. There is no CSRF token because there is no form post; the session cookie alone authorises the write.

D-02's reuse branch reduces the blast radius to "at most one surplus empty draft per host" and is a genuine mitigation, but note the interaction with CR-02: once a draft is *not* reusable (the host uploaded a photo, set hours, or — per CR-02, unguarded — blocked a date), every subsequent GET of this route mints a **new** row again. The reuse branch bounds the damage only while the host's newest draft stays pristine.

**Fix:** this is a D-01 design decision, not a one-line change, so raise it rather than patch it. The shape that keeps draft-first without a mutating GET is to render a minimal page whose only control is a form posting to the server action, or to make `/host/listings/new` a `POST`-only route handler with the grid's button as a form. If the current shape is kept deliberately, record the CSRF reasoning in the page header alongside the D-255 argument, because right now the file argues about authorization and says nothing about the method.

---

### WR-08: Systematically stale line-number citations in failure messages and docblocks across the changed files

**File:** multiple — see list

**Issue:** This repo's convention is to cite `file:line` in assertion messages so a red is actionable. A large fraction of the citations added or touched in this phase point at the wrong lines, which sends a reader to unrelated code at exactly the moment they are debugging. Measured against the current files:

| Citation | Says | Actually at |
|---|---|---|
| `(host)/host/listings/page.tsx:180` (grid wrapper) — `listing-card.tsx:446`, `host-listing-grid.spec.ts:15,222,232,251` | 180 | 238 |
| `listing-card.tsx:434` (`CardFooter` call site) — `host-listing-grid.spec.ts:141,249,262,277` | 434 | 471 |
| `listing-card.tsx:352` (`Card` call site) — `host-listing-grid.spec.ts:243`, `booker-seed.ts:731` | 352 | 360 |
| `listing-card.tsx:450` (`Unlist` status gate) — `host-listing-grid.spec.ts:276`, `booker-seed.ts:759` | 450 | 487 |
| `listing-card.tsx:377` (`primarySpaceType &&`) — `booker-seed.ts:836` | 377 | 389 |
| `(host)/host/listings/page.tsx:118-121` (missing-hours read) — `booker-seed.ts:745` | 118-121 | 159-161 |
| `page.tsx:154` (`.orderBy(desc(updatedAt))`) — `booker-seed.ts:829` | 154 | 93 |
| `listing-card.tsx:387-391` (muted-notice treatment) — `create-signal.ts:61` | 387-391 | 404-411 |
| `(host)/host/listings/page.tsx:160`/`:170` (the one `<ListingCard>` call site) — `listing-card.tsx:286-287` | 160/170 | 278/296 |
| `verify-workflows.mjs:552-561` (T-11-DBFREE set) — `ci.yml:1096` | 552-561 | 610-620 |
| `listing-card.tsx:270-279` (the `titleAs` docblock) — `listing-card-merge-order.test.ts:99` | 270-279 | 264-313 |

**Fix:** re-anchor these to the current lines, or — better, given how often they move — cite the *symbol* rather than the line (`listing-card.tsx`'s `<CardFooter>` call site, `page.tsx`'s grid wrapper `div`). A standing gate is possible but overkill; a single sweep plus a preference for symbol citations in new messages is enough.

---

## Info

### IN-01: `SeededHostGrid` returns five fields no consumer reads

**File:** `e2e/helpers/booker-seed.ts:698-712`, `:873-893`

**Issue:** `hostEmail`, `hostId`, `untitledDraftId`, `publishedNoHoursId`, `longTitleDraftId` and `longTitle` are all populated and returned; `e2e/host-listing-grid.spec.ts` — the only caller — uses `teardown()` alone. Each field's docblock explains why a spec would want it, so this is plausibly intentional forward surface, but unread returns tend to drift out of sync with the rows they describe.

**Fix:** either drop the unused fields or have the spec use at least `longTitle` (asserting the wrapping card is on screen would also make the "three cards of genuinely different height" premise checkable rather than assumed).

### IN-02: `?create=failed` persists in the URL, so the notice re-renders on every reload and is shareable

**File:** `src/app/(host)/host/listings/page.tsx:87`, `:196-205`

**Issue:** The signal is a plain query parameter that nothing clears. After the bounce, a refresh, a back-navigation or a bookmarked/shared URL re-renders "We couldn't start your new listing" for a host whose creation is no longer failing — a stale state claim on a management surface.

**Fix:** low priority given the notice is calm and non-blocking. If it matters, strip the parameter client-side after first paint (`history.replaceState`) or accept it and say so in the page header.

### IN-03: `leadingSentence` gives a 500 the diagnosis written for a 404

**File:** `e2e/host-route-reachability.spec.ts:66-81`

**Issue:** The function branches on `200` and returns the "THIS HOST ROUTE STOPPED RESOLVING… the ROUTER never reached the module — no application code ran" text for **everything else**. A 500 (the page module ran and threw — for instance the unguarded `createDraftListing` of CR-01) would be reported as "no application code ran", which is the wrong first sentence and the exact cost this file exists to avoid.

**Fix:** add a `status >= 500` branch pointing at the server log rather than the manifest greps.

### IN-04: `verify-workflows.mjs` resolves everything relative to CWD, with none of the care its `yaml` diagnostic gets

**File:** `scripts/verify-workflows.mjs:78-80`, `:221`

**Issue:** `WORKFLOW_DIR` and `readFileSync("package.json")` are CWD-relative. Run from anywhere but the repo root, the `package.json` read throws an unhandled `ENOENT` with a raw stack — the opposite of the deliberate, one-line, exit-3 diagnostic the module gets one screen earlier. It is on the CI path, so any future step that runs it with a `working-directory` gets an unreadable failure.

**Fix:** resolve from the script's own location, e.g. `const ROOT = fileURLToPath(new URL("..", import.meta.url));` and join from there, or catch the `package.json` read with a one-line diagnostic in the same shape as the parser's.

---

_Reviewed: 2026-09-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
