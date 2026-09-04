---
phase: 19-host-listing-surfaces-gates-that-actually-run
reviewed: 2026-09-04T12:57:13Z
depth: standard
files_reviewed: 18
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
  - tests/design/listing-create-refusal-routing.test.ts
  - tests/design/listing-reuse-predicate-census.test.ts
  - tests/host/verification-surface.test.ts
  - tests/listing/create-failure.test.ts
  - tests/listing/create-routing.test.ts
  - tests/listing/create-signal.test.ts
  - tests/listing/crud.test.ts
findings:
  critical: 2
  warning: 6
  info: 6
  total: 14
status: issues_found
---

# Phase 19: Code Review Report

**Reviewed:** 2026-09-04T12:57:13Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Whole-phase review (plans 19-01..19-11), replacing the earlier review of 19-01..19-08. Findings
already closed by the gap-closure run are **not** re-raised: `createDraftListing`'s missing
`try`/`catch` (old CR-01) is fixed and proven by `tests/listing/create-failure.test.ts`; the
`availability_block` conjunct (old CR-02) is present and now machine-censused; the `!res.ok` branch
is a real three-way router pinned by two independent gates.

Verified live during this review:

- `node scripts/verify-workflows.mjs` → **all 44 invariants hold** (baselines=11, ci=26, cross=7).
- `npx vitest run --config vitest.design.config.ts` over the three new design gates → **16/16 pass**.
- `deriveChildTables()` over `schema.ts` resolves to exactly the 7 children of `listing`
  (3 covered by conjuncts, 4 exempted) — the census is not vacuous.

The application-code half of the phase is in good shape. **The gate half is not.** Two of the
phase's headline claims are false against the shipped tree, and both are about controls that are
documented at length as being live:

1. `gate-e2e`'s runtime mail-credential refusal **cannot fire** — `${{ env.RESEND_API_KEY }}` is
   only ever populated by a workflow/job/step `env:` key, which is exactly and only what the parse
   half already rejects. D-14's "two halves and both are live" is one half, and the hole the header
   names as carried-forward is covered by *neither*.
2. `gate-e2e` is described as "IT REPORTS; IT DOES NOT BLOCK", but a failing job fails the workflow
   run. Per the phase's own evidence the job's conclusion is `failure` with **14 reproducible test
   failures** (including a refund-parity spec and a booking-collision spec). `ci` is therefore red
   on every push, which either voids or violates this file's own binding rule #1.

Alongside those: the "stale line citation" defect class flagged as WR-08 in the earlier review is
**not closed** — 19-11 reworded one paragraph in `create-signal.ts` while leaving at least eleven
verified-wrong citations in the phase's own files, several of them inside gate failure messages
that tell a fixer which line to edit.

## Structural Findings (fallow)

No `<structural_findings>` block was supplied with this review request. All findings below are
narrative.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: `gate-e2e`'s runtime mail-credential refusal is inert — D-14's "two halves" is one half, and the known hole is covered by neither

**File:** `.github/workflows/ci.yml:1312-1321` (and the header claim at `:241-255`)
**Severity:** BLOCKER

**Issue:**

```yaml
      - name: Refuse to run the suite with a live mail credential in the environment
        run: |
          if [ -n "${MAIL_KEY_UNDER_TEST:-}" ]; then
            ...
            exit 1
          fi
        env:
          MAIL_KEY_UNDER_TEST: ${{ env.RESEND_API_KEY }}
```

The GitHub Actions `env` **context** is built exclusively from `env:` maps declared at workflow,
job and step level in the workflow file. It does not contain repository/organization secrets, does
not contain `vars`, does not contain `container.env`, does not contain `services.*.env`, and does
not read the runner's or the container's actual process environment. Therefore
`${{ env.RESEND_API_KEY }}` expands to the empty string in every case *except* the one where the
key is declared as a workflow/job/step `env:` key — which is precisely and exclusively the case
`scripts/verify-workflows.mjs:491-510` already rejects.

Consequences, all provable from the file:

1. **The runtime half adds zero coverage.** It is 100% redundant with the parse half. There is no
   input for which it fires and the parser does not.
2. **The documented hole is covered by neither half.** The header at `:249-255` names the
   `container.env` / `services.*.env` gap in the *parse* half and carries it forward — implicitly
   leaning on the runtime half. A key spelled in `container.env` reaches every step's process
   environment, `src/lib/email.ts` binds its client at module load, and the suite mails real
   addresses. `${MAIL_KEY_UNDER_TEST:-}` would still be empty, because the expression that fills it
   never sees container env. The measured cost of that path is the header's own number: **14 real
   outbound sends per run.**
3. **The header's ordering claim is also false.** `:246` and `scripts/verify-workflows.mjs:479-484`
   claim the parse half "runs on job 1 ... so it fires about a minute before any browser starts."
   `gate-e2e` declares no `needs:`, so jobs 1 and 5 start simultaneously and GitHub does not cancel
   sibling jobs when one fails. Job 1 going red does not stop job 5 from booting the app and
   sending mail. The parse half protects the *next* run, never the current one.

This is a fail-closed privacy control that provably cannot fail closed, documented as active.

**Fix:** assert over the *actual process environment*, which is the only place a container-level or
runner-level key can be observed. To keep the `grep -c RESEND .github/workflows/ == 0` audit
intact, read the prefix from the checker that already owns it (`MAIL_KEY_PREFIX` in
`scripts/verify-workflows.mjs`) rather than spelling it here:

```yaml
      - name: Refuse to run the suite with a live mail credential in the environment
        run: |
          # The prefix is READ from scripts/verify-workflows.mjs, which is the one file allowed to
          # spell it (see that file's MAIL_KEY_PREFIX comment). Spelling it here would make
          # `grep -c <provider> .github/workflows/` permanently non-zero.
          PREFIX="$(node -p "require('fs').readFileSync('scripts/verify-workflows.mjs','utf8').match(/MAIL_KEY_PREFIX = \"([A-Z_]+)\"/)[1]")"
          if [ -z "$PREFIX" ]; then
            echo "::error::could not read MAIL_KEY_PREFIX — the assertion would be vacuous. Hard stop."
            exit 1
          fi
          if env | grep -qE "^${PREFIX}"; then
            echo "::error::A live mail credential is present in this job's ENVIRONMENT (not merely"
            echo "::error::in the workflow's env: maps). A full e2e run with it set was measured at"
            echo "::error::14 real outbound sends per run. Remove it; do NOT weaken this check."
            exit 1
          fi
```

Then correct the header at `:241-255`: the parse half's `container.env` / `services.*.env` gap is
closed *by this step* (not carried forward), and the "fires a minute before any browser starts"
sentence must be replaced with the truth — jobs 1 and 5 are parallel and independent.

Independently worth doing: widen the parse scan to `job.container.env` and `job.services.*.env`
keys (see WR-03) so both halves are honest.

---

### CR-02: `gate-e2e` turns `ci` permanently red, contradicting the same file's binding rule #1, with no known-failure boundary

**File:** `.github/workflows/ci.yml:1198-1346`; claims at `:40-51` and `:435-444`
**Severity:** BLOCKER

**Issue:** The header asserts "⚠ IT REPORTS; IT DOES NOT BLOCK" and argues it from the fact that
branch protection is unreachable on this repository. That argument is about `main`'s required
checks. It is **not** true of the workflow: `gate-e2e` carries no `continue-on-error` (and
`scripts/verify-workflows.mjs:697-702` actively *forbids* one), so a failing job fails the `ci`
workflow run, on every push to `dev`/`main` and every pull request.

The phase's own evidence file
(`.planning/.../evidence/gate-e2e-wallclock.txt:20`, `:136-155`) records:

```
job conclusion     failure
...
Its first two real executions show FOURTEEN tests failing for real reasons, reproducibly,
across ten spec files, plus two flaky. The same failures appear in both runs...
  8  e2e/cancel.spec.ts:232           SC#2 previewed refund is the refund given
  9  e2e/collision-in-place.spec.ts:240  STATE-07 lost race becomes a result
```

So as shipped:

1. `ci` is red on `dev` today, and `:141` of this same file states the binding rule *"A phase cannot
   be marked complete with CI red."* The rule is now either violated or dead. Both outcomes are
   worse than the gate not existing, because a permanently-red check is the thing the file's own
   flake argument (`:58`) says gets retried until green and then stops being a gate.
2. There is **no allowlist, no `--fail-on-flaky-tests` boundary, no expected-failure file, and no
   tracked issue** distinguishing the known 14 from a new one. A regression introduced tomorrow in
   `gate-e2e` is indistinguishable at the workflow level from the baseline.
3. Two of the fourteen are on the core-value path this project is defined by — a refund-preview
   parity assertion and the collision/lost-race assertion. They were surfaced by this phase and left
   untriaged inside it.

**Fix:** choose one and record it, rather than leaving the contradiction in the header:

- **(a) Make the claim true.** Give the job a *deliberate, single-purpose* soft-fail and amend the
  verifier's invariant #2 in the same commit (its own comment at `:694-696` explicitly provides for
  this: *"If this job is genuinely meant to become conditional or soft-failing, remove this
  invariant in the same commit and say why in it"*):

  ```yaml
  gate-e2e:
    name: gate-e2e (functional Playwright suite)
    # REPORTS, DOES NOT BLOCK — until the 14 recorded failures are triaged. Paired with the
    # removal of verify-workflows.mjs's `unconditional` invariant, same commit, D-<n>.
    continue-on-error: true
  ```

- **(b) Make the gate true.** Keep it hard-failing and land a checked-in expected-failure boundary
  so the workflow is green over the *known* set and red over anything else — e.g. a
  `e2e/known-failures.json` consumed by a wrapper step that diffs the JSON reporter's failure list
  against it and exits non-zero only on a new name.

Either way, file the fourteen (at minimum `cancel.spec.ts:232` and `collision-in-place.spec.ts:240`)
as tracked work before this phase is called complete; they are the gate's first finding and the
phase currently discards it.

---

## Warnings

### WR-01: `ConfirmDialog` never releases `pending` when the action rejects — the confirm button locks on "Working…" forever

**File:** `src/components/listing/listing-card.tsx:186-195` (with `runAction` at `:345-357`)
**Severity:** WARNING

**Issue:**

```tsx
            onClick={async () => {
              setPending(true);
              const ok = await onConfirm();
              setPending(false);
              if (ok) setOpen(false);
            }}
```

`onConfirm` is `runAction(onUnlist | onDelete, …)`, whose body is `await action(listing.id)` with no
`try`. `unlistListing` and `softDeleteListing` (`src/app/actions/listing.ts:794-899`) have no
`try`/`catch` either, so a dead connection, a timeout or a Server-Action transport failure produces
a **rejected** promise. The rejection propagates out of the `async` click handler:
`setPending(false)` never runs, the confirm button stays `disabled` reading "Working…" for the life
of the mount, no toast is shown, and the browser logs an unhandled rejection. The host is left with
a dialog that looks like it is still working and no way to retry without a full page reload.

This is the exact defect class plan 19-10 spent a whole task closing for `createDraftListing`
("CREATION FAILS BY RETURNING, NEVER BY THROWING") — the same reasoning was not applied to the two
sibling actions this file drives.

**Fix:** guard the boundary at the component (and, better, mirror 19-10 in the actions):

```tsx
            onClick={async () => {
              setPending(true);
              try {
                if (await onConfirm()) setOpen(false);
              } finally {
                setPending(false);
              }
            }}
```

```ts
  async function runAction(action, successMsg): Promise<boolean> {
    let res: ActionResult;
    try {
      res = await action(listing.id);
    } catch (err) {
      // The operator's half; the host gets a fixed sentence, per T-19-32.
      console.error("[listing:card] action threw", { listingId: listing.id, err });
      toast.error("Something went wrong on our side. Nothing was changed — try again.");
      return false;
    }
    ...
  }
```

---

### WR-02: the `gate-e2e` "unconditional" invariant only inspects the JOB — a step-level `if:` or `continue-on-error:` detaches the gate with all 26 `ci` invariants green

**File:** `scripts/verify-workflows.mjs:691-702` (and the run-command invariant at `:685-689`)
**Severity:** WARNING

**Issue:** The check is:

```js
    e2e?.if === undefined && e2e?.["continue-on-error"] !== true,
```

Its own comment (`:666-676`) states the property it is closing: *"they do not close the job being
kept, correctly named, and made to do NOTHING … a required check would go green over a job that
installs npm and stops."* But every one of the three invariants quantifies over `runsOf(e2e)` —
the *strings* of the job's `run:` steps — and none of them looks at the step's own `if:` or
`continue-on-error:`. So this survives all 26 checks and detaches the gate completely:

```yaml
      - name: Playwright — the functional suite
        run: npx playwright test --project=chromium
        continue-on-error: true        # ← job succeeds, gate is gone
      # …or…
        if: ${{ false }}               # ← step skipped, gate is gone
```

`continue-on-error` is also evaluated as an expression, so `continue-on-error: ${{ true }}` (a
string after parse) already defeats the `!== true` comparison at job level too.

**Fix:** make the invariant total over the step that carries the command, and treat any non-literal
value as a violation:

```js
  const e2eSteps = stepsOf(e2e);
  const playStep = e2eSteps.find(
    (s) => typeof s?.run === "string" && s.run.includes("playwright test"),
  );
  const softJob = e2e?.["continue-on-error"];
  const softStep = playStep?.["continue-on-error"];
  check(
    `"${CI_E2E_JOB}" is unconditional — no if:/continue-on-error at the JOB or on the SUITE STEP`,
    e2e?.if === undefined &&
      softJob !== true && softJob !== "true" && typeof softJob !== "string" &&
      playStep != null &&
      playStep.if === undefined &&
      softStep !== true && softStep !== "true" && typeof softStep !== "string",
    `job.if=${JSON.stringify(e2e?.if ?? null)} job.coe=${JSON.stringify(softJob ?? null)} ` +
      `step.if=${JSON.stringify(playStep?.if ?? null)} step.coe=${JSON.stringify(softStep ?? null)}`,
  );
```

(If CR-02 is closed with option (a), this invariant is removed deliberately instead — but then it
must be removed, not left half-covering.)

---

### WR-03: the mail-key parse scan walks only workflow/job/step `env:` — not `container.env`, not `services.*.env`, and not a differently-named key holding a mail credential

**File:** `scripts/verify-workflows.mjs:491-510`
**Severity:** WARNING

**Issue:** `secretHitsIn()` at `:196-217` correctly walks `job.container.env` and
`job.services.*.env`. The mail-key scan directly below does not:

```js
  for (const [name, job] of jobs) {
    for (const k of Object.keys(job?.env ?? {})) { … }
    for (const s of stepsOf(job)) { for (const k of Object.keys(s?.env ?? {})) { … } }
  }
  for (const k of Object.keys(doc?.env ?? {})) { … }
```

`ci.yml:249-255` names this hole and carries it forward on the reasoning that the runtime half
still catches it. **CR-01 shows it does not** — so today this vector is covered by nothing at all.

A second, unnamed gap: the scan matches on the env **key** prefix. A key called `MAILER` or
`NOTIFY_KEY` set to `${{ vars.RESEND_API_KEY }}` passes both this check and `secretHitsIn` (which
matches the literal `secrets.`, not `vars.`).

**Fix:** reuse the walker `secretHitsIn` already has, and add a `vars.` value scan:

```js
  const mailEnvHits = [];
  const scanKeys = (where, envObj) => {
    for (const k of Object.keys(envObj ?? {})) {
      if (k.startsWith(MAIL_KEY_PREFIX)) mailEnvHits.push(`${where}.${k}`);
    }
    for (const [k, v] of Object.entries(envObj ?? {})) {
      // any KEY, if its VALUE reaches for the provider through vars. or secrets.
      if (typeof v === "string" && /(?:secrets|vars)\.\s*RESEND/i.test(v))
        mailEnvHits.push(`${where}.${k} (value)`);
    }
  };
  scanKeys("workflow.env", doc?.env);
  for (const [name, job] of jobs) {
    scanKeys(`${name}.env`, job?.env);
    scanKeys(`${name}.container.env`, job?.container?.env);
    for (const [svc, s] of Object.entries(job?.services ?? {}))
      scanKeys(`${name}.services.${svc}.env`, s?.env);
    stepsOf(job).forEach((s, i) => scanKeys(`${name}.step[${i}].env`, s?.env));
  }
```

---

### WR-04: at least eleven verified-stale line citations in the phase's own files — several inside gate failure messages that tell a fixer which line to edit

**File:** multiple; verified by resolving each citation against the file it names
**Severity:** WARNING

**Issue:** `src/lib/listing/create-signal.ts:50-53` states the rule this phase adopted:
*"WR-08 measured eleven stale line citations in this phase's own files, and a citation that points
at the wrong code is worse than none because it is believed."* 19-11 applied that rule to one
paragraph. The rest of the phase's files were edited afterwards and the citations were not
followed. Resolved against `HEAD`:

| citation | cited as | line actually contains | truth |
|---|---|---|---|
| `listing-card.tsx:352` (e2e spec ×2) | the `<Card>` call site (`gap-0`) | `return false;` | `:360` |
| `listing-card.tsx:434` (e2e spec ×3) | `hasActions` / the `CardFooter` call site | `</Link>` | `:322` / `:471` |
| `listing-card.tsx:450` (e2e spec) | `Unlist` gated on `status === "published"` | a comment | `:487` |
| `listing-card.tsx:377` (booker-seed) | the `primarySpaceType &&` branch | `<div className="flex items-start…">` | `:389` |
| `listing-card.tsx:387-391` (create-signal) | the "calm muted text" rule | `</Badge>` / `</div>` | `:405-410` |
| `listings/page.tsx:180` (e2e spec ×4, listing-card) | the grid wrapper | `{verification.suspended && (` | `:238` |
| `listings/page.tsx:118-121` (booker-seed) | `loadPublishedListingsMissingHours` | comment prose | `:159-161` |
| `listings/page.tsx:154` (booker-seed) | `.orderBy(desc(listing.updatedAt))` | a comment | `:93` |
| `listings/page.tsx:160` / `:170` (listing-card) | the `<ListingCard>` call site / `titleAs` | the missing-hours map | `:278` / `:296` |
| `host/page.tsx:75` (create-signal) | the `"₱300.00in"` SWC whitespace defect | an `import` line | elsewhere |
| `button.tsx:117` (listing-card) | `icon-sm` → `size-7` | `icon-xs` → `size-6` | `:118-119` |

The blast radius is not cosmetic. Four of these are inside `e2e/host-listing-grid.spec.ts`'s guard
failure messages (`:222`, `:232`, `:249-252`, `:262`, `:276-278`) — the strings a developer reads
*while the gate is red*, instructing them to apply `mt-auto` at `listing-card.tsx:434` (a closing
`</Link>`) and warning them not to add `items-*` to `page.tsx:180` (an unrelated notice). The file's
own header says *"The VALUE OF THIS FILE IS ENTIRELY IN THE FAILURE SENTENCE"*.

**Fix:** either correct all eleven, or — consistent with what 19-11 already decided for
`create-signal.ts` — cite **by role and symbol** and drop the numbers, e.g.
`` `listing-card.tsx`'s `<CardFooter>` call site `` and
`` `(host)/host/listings/page.tsx`'s grid wrapper (`grid sm:grid-cols-2 lg:grid-cols-3`) ``. A
cheap standing gate is possible and would fit this repo's idiom: a design test that regex-scans
`src/`, `e2e/` and `tests/` for `` `<path>.tsx:<n>` `` citations, resolves each, and asserts the
named line is non-blank and not a comment.

---

### WR-05: `host-listing-grid.spec.ts` leaks its seeded host when the fixture throws mid-way, and never closes the page if teardown throws

**File:** `e2e/host-listing-grid.spec.ts:291-310`; `e2e/helpers/booker-seed.ts:806-894`
**Severity:** WARNING

**Issue:**

```ts
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    fixture = await seedHostGridFixture(page);   // ← sign-up happens FIRST, inside this call
    ...
  });

  test.afterAll(async () => {
    await fixture?.teardown();
    await page?.close();
  });
```

`seedHostGridFixture` signs a host up through the UI and writes a `host_verification` row **before**
it returns. If anything after the sign-up throws — the `waitForURL` timing out at 60s, the
`seedApprovedHostVerification` lookup, any of the three inserts — `fixture` is never assigned, so
`fixture?.teardown()` is a no-op and the `user`, `session`, `account` and `host_verification` rows
persist. `gate-e2e` now runs on every push against a single long-lived service DB per job, and
`retries: 2` means one bad run leaks three hosts. Nothing in the suite ever collects them.

Secondly, if `teardown()` rejects, `await page?.close()` is skipped and the browser page leaks for
the worker's lifetime.

**Fix:** have the helper own its own partial-failure cleanup, and make the hook's two teardown steps
independent:

```ts
// booker-seed.ts — inside seedHostGridFixture, after the sign-up succeeds:
  const cleanupAccount = async () => {
    await withClient(async (sql) => {
      await sql`DELETE FROM "user" WHERE email = ${hostEmail}`;
    });
  };
  try {
    const hostId = await seedApprovedHostVerification(hostEmail);
    ...
    return { …, teardown };
  } catch (err) {
    // The account exists whatever else failed — this helper drove the form that made it.
    await cleanupAccount().catch(() => {});
    throw err;
  }
```

```ts
// host-listing-grid.spec.ts
  test.afterAll(async () => {
    try {
      await fixture?.teardown();
    } finally {
      await page?.close();
    }
  });
```

---

### WR-06: `/host/listings/new` performs an unconditional database WRITE during a GET render

**File:** `src/app/(host)/host/listings/new/page.tsx:102`
**Severity:** WARNING

**Issue:** `const res = await createDraftListing();` runs inside the page's render. Every GET that
reaches this module inserts a row (or, under D-02, reuses one). There is no POST boundary, no
idempotency key and no CSRF token: `SameSite=Lax` blocks cross-site subresource requests, but a
top-level navigation from any third-party link — or a browser prerender, or a background-tab
restore, or a crawler with a live session cookie — executes the write with the host's session.

D-02's reuse-then-mint genuinely caps the blast radius at **one** surplus untouched draft per host,
which is why this is a warning and not a blocker, and the file records the design intent (D-01).
But D-02 is a *mitigation for* this shape, not a licence for it, and the same file's docblock
already concedes the check-then-act is not race-free (`src/app/actions/listing.ts:233-245`), so two
concurrent GETs can still produce two rows.

**Fix:** no code change is required this phase, but this should be recorded as an explicit deferred
item rather than left implicit, with the intended shape named: the wizard entry becomes a
`<form action={createDraftListing}>` POST (or a route handler that only accepts `POST`), and
`/host/listings/new` renders a one-click "Start a listing" surface instead of side-effecting on
render. At minimum add `export const dynamic = "force-dynamic"` is *not* the fix — the fix is the
method.

---

## Info

### IN-01: the two zero-import gates on `create-signal.ts` use different regexes; the always-run one is the stricter

**File:** `tests/listing/create-signal.test.ts:191` vs `tests/design/listing-create-refusal-routing.test.ts:207`
**Issue:** `/^import\b/` (no leading whitespace) vs `/^\s*import\b/`. An indented `import` — inside a
`try`, or after a prettier reflow — passes the `vitest.config.ts` copy and is caught only by the
design copy.
**Fix:** use `/^\s*import\b/` in both, and add a `import(` dynamic-import term:
`/^\s*import\b|\bimport\s*\(/`.

### IN-02: the census's stripping proof asserts on prose in three unrelated files

**File:** `tests/design/listing-reuse-predicate-census.test.ts:336-368`
**Issue:** `expect(unstripped.length).toBeGreaterThan(stripped.length)` and
`expect(unstrippedMissing.length).toBeGreaterThan(0)` require that `listing.ts`, `schema.ts` and
`visual-baselines.ts` keep *discussing* a raw `UPDATE listing` in comments. An unrelated doc edit
turns a correct tree red, and the failure message correctly says so but asks the reader to re-point
the assertion by hand.
**Fix:** make the fixture local — strip a string literal defined in the test file itself
(`const PROSE = "// an UPDATE listing SET status = 'x' WHERE id = 1"`), assert `stripComments(PROSE)`
removes it, and drop the dependency on other files' comments.

### IN-03: `pageConditions()` silently mis-parses the first nested-paren condition

**File:** `tests/design/listing-create-refusal-routing.test.ts:101-104`
**Issue:** `/if\s*\(([^)]*)\)/g` stops at the first `)`. The docblock says "None of ours nests
parentheses" — true today. The day one does (`if (!res.ok && isSomething(res))`), the extracted
condition is truncated, `/^!\s*res\.ok$/` stops matching, and the red reads as a routing defect.
**Fix:** balance the parentheses with a small scanner, or narrow the assertion to
`code.includes("if (!res.ok)")` and note the trade.

### IN-04: `cross`-section YAML parse has no error boundary

**File:** `scripts/verify-workflows.mjs:899-906`
**Issue:** `parse(readFileSync(...))` is called on every file in `.github/workflows/` with no `try`.
A third workflow with a syntax error produces a raw stack and exit 1 — indistinguishable from "an
invariant broke", which is the exact confusion the file's exit-code-3 contract (`:69-73`) exists to
prevent.
**Fix:** wrap in `try`/`catch` and call `hardStop([...])` naming the file and the parser message.

### IN-05: off-by-N citations in the ui primitives

**File:** `src/components/listing/listing-card.tsx:509` (`ui/button.tsx:117`);
`tests/design/listing-card-merge-order.test.ts:116` (`src/lib/utils.ts:41-47`)
**Issue:** `button.tsx:117` is `icon-xs`'s `size-6`; `icon-sm`'s `size-7` is `:118-119` — the
*claim* (28px, matching `h-7`) is correct, only the pointer is wrong. `utils.ts:41` is a blank line.
**Fix:** cite `:118-119` and `:42-47`, or cite the variant key by name.

### IN-06: `ci.yml`'s header calls the mail refusal "job 5's FIRST step"

**File:** `.github/workflows/ci.yml:245`
**Issue:** It is the fourth step — `actions/checkout`, `actions/setup-node`, `npm ci` precede it.
The step's own comment at `:1305` ("it runs before anything boots") is accurate; the header's is
not.
**Fix:** "job 5's first step after `npm ci`, and before anything boots".

---

_Reviewed: 2026-09-04T12:57:13Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
