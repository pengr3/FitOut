---
phase: 15-auth-profile-transactional-email
plan: 14
subsystem: test-integrity
tags: [unfailable-assertion, wr-04, email-escaping, traceability, nyquist, gap-closure, audit]

# Dependency graph
requires:
  - phase: 15-auth-profile-transactional-email
    provides: "plan 15-04's shell adoption for `renderOpsAlertDigest` — the `paragraphs`/`tableHtml` asymmetry that makes case 11 exist, and the `<code>` wrapper removal this plan re-applies as its mutation"
  - phase: 15-auth-profile-transactional-email
    provides: "plan 15-03's `copy()` fix in `notify.test.ts` — the first instance of this phase's unfailable-assertion pattern, and the style the third fix copies"
  - phase: 15-auth-profile-transactional-email
    provides: "plan 15-09's `tests/design/auth-composition.test.tsx` — the build-blocking gate AUTHUI-01's claim is re-measured against"
  - phase: 15-auth-profile-transactional-email
    provides: "plan 15-12's `e2e/auth-keyboard.spec.ts` — the artifact behind validation rows 15-12-01/02"
  - phase: 15-auth-profile-transactional-email
    provides: "plan 15-13's `tests/design/auth-contrast.test.ts` — the artifact behind validation rows 15-13-01/02"
provides:
  - "`tests/ops/alert-digest.test.ts` case 11 able to fail in BOTH projections, with the watched red transcribed as M5"
  - "M6 — the whole 8-assertion raw-tag absence set classified failable-or-fixed BY MEASUREMENT, with the mutations that decided each"
  - "AUTHUI-01 claimed by exactly one plan, on four pieces of evidence re-run today rather than quoted"
  - "`15-VALIDATION.md` rows for AUTHUI-03's keyboard and AA clauses — the two its conjunctive text never had"
  - "a dated closure block beneath the phase's post-execution note, with the note itself byte-identical"
affects: [15-verification, ops-alerting, test-integrity]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "An absence check about AUTHORED markup written in the ESCAPED form for the HTML part and the LITERAL form for the text twin — one mutation, two independent failures"
    - "A positive control named IN THE COMMENT as the control for the line beneath it, so the next reader knows which line proves the other is meaningful"
    - "A kept-but-corrected assertion: the old line stays, its comment stops claiming what it cannot do"
    - "An audit surface RE-GREPPED rather than trusted from the plan's list, with the unchanged count recorded as the first finding"
    - "A requirement claimed by RE-RUNNING its evidence (gate, greps, `git ls-files`, `gh run view`) rather than by citing the verification report"

key-files:
  created: []
  modified:
    - "tests/ops/alert-digest.test.ts"
    - ".planning/phases/15-auth-profile-transactional-email/15-VALIDATION.md"
    - ".planning/phases/15-auth-profile-transactional-email/deferred-items.md"

key-decisions:
  - "An assertion that cannot fail for the regression it names is a defect in the TEST, and the only proof it is fixed is applying that exact regression and watching the new line go red — the fix and its proof are one act"
  - "The half of the red that condemns the old line is the half where it stayed GREEN under the mutation; a fix shipped without it is indistinguishable from a differently-spelled unfailable string"
  - "The old literal-form assertion was KEPT rather than deleted, with its comment corrected — the assertion is harmless, the overstated comment was the defect"
  - "The raw-tag audit's own instrument defines its surface: the grep found 8, but a negated REGEX form exists it can never see. Logged as a deferred item rather than silently widened"
  - "AUTHUI-01 is claimed by RE-RUNNING its four evidence pieces, never by quoting 15-VERIFICATION.md back at itself — a decayed citation and a live one are indistinguishable until something is run"
  - "The validation table gained ROWS while AUTHUI-03 kept its empty checkbox: closing a sampling hole is a validation act, closing a conjunctive requirement is the re-verification pass's"
  - "gsd-sdk v1.42.3's state/roadmap verbs corrupted shared artifacts for the FOURTH consecutive plan and were reverted WHOLESALE from pre-write copies rather than patched in place"

requirements-completed: [AUTHUI-01]
requirements-advanced: [EMAIL-01, AUTHUI-03]

metrics:
  duration: "~35 min"
  completed: 2026-08-25
  tasks: 3
  commits: 2
  files-created: 0
  files-modified: 3
  mutations-applied-and-reverted: 4
---

# Phase 15 Plan 14: Gap Closure — the Failable Assertion, AUTHUI-01's Traceability, and AUTHUI-03's Two Missing Rows Summary

**One-liner:** The phase's third unfailable assertion is now failable in both projections with the red transcribed, the whole 8-assertion raw-tag set is classified by measurement (8/8 failable), AUTHUI-01 is claimed by exactly one plan on evidence re-run today, and `15-VALIDATION.md` finally samples all five clauses AUTHUI-03 asserts — with `src/` byte-identical throughout.

---

## Task 1 — WR-04: the assertion made able to fail, and the raw-tag set classified

### The defect, restated from measurement rather than from the report

`renderOpsAlertDigest` (`src/lib/email.ts:669-712`) hands its runbook sentence to `renderEmail` as a
`paragraphs` entry. `renderEmail` escapes every paragraph structurally on the way into the HTML part
(`src/lib/email-shell.ts:181-186`) and takes the SAME array raw into the `text/plain` twin
(`email-shell.ts:234`). So a re-added `<code>` wrapper reaches the operator as **visible tag text**
(`&lt;code&gt;`) — never as the literal string case 11's only absence check named.

### Part A — what case 11 asserts now

| Line | Projection | Asserts | Why it is there |
|---|---|---|---|
| `expect(html).toContain("&lt;audit-id&gt;")` | html | the placeholder, written RAW in source, arrives escaped | **THE CONTROL**, and now named as such in the comment — it proves the ENTITY form is reachable in this projection, which is what makes an entity-form absence check meaningful rather than merely differently spelled |
| `expect(html).not.toContain("&lt;code&gt;")` | html | **NEW** — the form a re-added wrapper actually takes | the line WR-04 says was missing |
| `expect(text).not.toContain("<code>")` | text | **NEW** — the twin takes the paragraph raw | the same regression, in the projection where the literal form IS reachable |
| `expect(html).not.toContain("<code>")` | html | KEPT, comment corrected | it forbids raw markup arriving through a future `tableHtml`-style pre-escaped slot. It is **not** the wrapper guard, and the comment now says so plainly |

The leading comment was rewritten so every sentence in it is true of the assertions beneath it, and
carries the one sentence this file has earned three times over: *paragraphs are escaped at the choke
point, so an absence check about AUTHORED markup must be written in the escaped form, or it checks a
string that cannot exist.*

### Part B — the red, watched and transcribed (M5 in the file's own header)

Mutation: `Look a row up with <code>npm run ops:alerts</code>;` in `renderOpsAlertDigest`'s
`paragraphs` array — the exact wrapper 15-04 removed.

**(a) The old assertion PASSES under the mutation.** With `tests/ops/alert-digest.test.ts` reverted to
`HEAD` (case 11 carrying only the literal-form check), `npx vitest run tests/ops/alert-digest.test.ts`:

```
 Test Files  1 passed (1)
      Tests  12 passed (12)
```

That is the finding, not a footnote: the guard was green while the regression its own comment names
was live in the tree.

**(b) The new HTML assertion FAILS.** Same command, same mutation, the file as it now stands:

```
× case 11 — the runbook commands survive the shell byte-identical, and a re-added wrapper reddens this case 9ms
AssertionError: a <code> wrapper is back in a runbook paragraph — the operator reads it as visible tag text: expected '<!DOCTYPE html><html lang="en"><head>…' not to contain '&lt;code&gt;'
      Tests  1 failed | 11 passed (12)
```

and the document quoted back carries it exactly as an operator would read it:
`Look a row up with &lt;code&gt;npm run ops:alerts&lt;/code&gt;`.

**(b′) The twin, isolated.** (b) short-circuits at the html line, so the text assertion was measured on
its own by neutralising the line above it for a single run — same mutation, same command:

```
AssertionError: a <code> wrapper is back in a runbook paragraph — the text/plain twin carries it literally: expected 'FitOut ops — unresolved money alerts\…' not to contain '<code>'
+ 1 unresolved needs_attention audit row(s), newest first. Look a row up with <code>npm run ops:alerts</code>; discharge it with npm run ops:alerts:resolve -- <audit-id>. …
      Tests  1 failed | 11 passed (12)
```

**Reverted.** `git diff --exit-code src/lib/email.ts` exit 0; `git diff --name-only src/` empty;
re-run green at `Tests 12 passed (12)` — **the same case count as before this task (12 → 12)**.

### Part C — the 8-assertion classification, by measurement

The grep was **re-run, not trusted**: `not.toContain("<` across `tests/` returns the same **8
assertions in 5 files** the plan listed. An unchanged count is the first finding.

Two further mutations decided the other seven (both applied to `src/`, both reverted):

- **C1** — `escapeHtml` in `src/lib/email-shell.ts` made the **identity** function: the
  escape-regression class every injected-data assertion is written against.
  `npx vitest run tests/auth/email-escaping.test.ts tests/auth/email-injection.test.ts tests/notifications/guest-email.test.ts tests/notifications/notify.test.ts tests/ops/alert-digest.test.ts`
  → `Tests 94 failed | 91 passed (185)`.
- **C3** — `tableText` pointed at `tableHtml`: the twin silently taking the markup.
  `npx vitest run tests/ops/alert-digest.test.ts` → `Tests 1 failed | 11 passed (12)`.

| # | File:line | Projection | String named | Reachable there? | Verdict | Reason (one sentence) |
|---|---|---|---|---|---|---|
| 1 | `tests/auth/email-escaping.test.ts:21` | `html` | `<script>alert(1)</script>` | **YES** | FAILABLE | INJECTED DATA — the reset URL is the thing under test, and under C1 the literal payload is present in the document the failure quotes back |
| 2 | `tests/auth/email-injection.test.ts:334` | `html` | `<script>` | **YES** | FAILABLE | INJECTED DATA — `PAYLOAD` opens with `<script>` and appears literally under C1 across all 84 generated cases |
| 3 | `tests/notifications/guest-email.test.ts:53` | `html` | `<script>alert(1)</script>` | **YES** | FAILABLE | INJECTED DATA — a hostile listing title, literal under C1 |
| 4 | `tests/notifications/notify.test.ts:612` | `html` | `<script>alert(1)</script>` | **YES** | FAILABLE | INJECTED DATA — a hostile `attendeeLabel`, literal under C1 |
| 5 | `tests/ops/alert-digest.test.ts:296` | `html` | `<script>` | **YES** | FAILABLE | INJECTED DATA through the free-text `action` column into the one RAW slot (`tableHtml`); the only one of the five that reports on **its own line** under C1 |
| 6 | `tests/ops/alert-digest.test.ts:402` | `text` | `<td>` | **YES** | FAILABLE | the twin must never carry markup — reddens the moment `tableText` takes the html cells |
| 7 | `tests/ops/alert-digest.test.ts:403` | `text` | `<table` | **YES** | FAILABLE | same class, **different regression**: `<table` lives on the wrapper, so the narrow per-row swap leaves it green and only the whole-table swap reaches it |
| 8 | `tests/ops/alert-digest.test.ts:431` | `html` | `<code>` | **NO** | **UNFAILABLE → FIXED** | AUTHORED markup entering an already-escaped slot: the wrapper lands as `&lt;code&gt;`, so the literal form is unreachable by construction |

**Verdict: 8 of 8 now failable.** Seven already were; case 11's was the single exception.

**Two things worth carrying out of this audit.**

1. **The `text`-projection pair stayed GREEN under C1** — that is the control, and it is what makes the
   classification a measurement rather than a story: those two are about a different regression, and C1
   says so.
2. **Rows 6 and 7 are failable for DIFFERENT regressions.** A narrower first variant
   (`cells.map((c) => c.text)` → `c.html`) reddened 402 and left 403 green. Both survive; knowing why
   matters before either is ever deleted as "redundant".

**Nothing outside this task's file was touched.** `tests/auth/email-escaping.test.ts` — named in the
ROADMAP's carried constraint from backlog 999.1 — was **classified and left byte-identical**
(`git diff --exit-code` exit 0). The audit found no unfailable assertion in any of the other four
files, so no cross-file deferral was owed.

---

## Task 2 — AUTHUI-01 claimed by citing evidence that was re-checked, not rebuilt

Every row below was **run in this session (2026-08-25)**, not quoted from `15-VERIFICATION.md`.

| # | Evidence | Command | Result |
|---|---|---|---|
| 1a | The gate | `npx vitest run tests/design/auth-composition.test.tsx --config vitest.design.config.ts` | **exit 0 — 13 passed** |
| 1b | The gate is BUILD-BLOCKING | `npm run test:design` | **exit 0 — 55 files / 1078 passed / 3 skipped** |
| 1c | …inside the build | `npm run build` (`lint && test:design && next build`) | **exit 0** — lint 0 errors / 25 warnings, all pre-existing and none in any file this plan touched |
| 2a | `PanelCard` on all four auth pages | `grep -c PanelCard 'src/app/(auth)/*/page.tsx'` | forgot **5**, login **6**, reset **5**, signup **5** |
| 2b | Zero raw Card elements survive | `grep -cE '<Card[ />]\|<CardContent\|<CardHeader\|<CardTitle\|<CardFooter\|<CardDescription'` | **0 on each of the four** |
| 2c | One shared `BRAND_CLASS`, **both** sides | `grep -c BRAND_CLASS` | `(auth)/layout.tsx` **2**, `src/components/patterns/site-chrome.tsx` **4** |
| 3 | The committed baselines | `git ls-files 'e2e/visual/surfaces.spec.ts-snapshots/auth-*'` | **exactly 8** |
| 4 | The CI comparison run | `gh run view 32752143309` | **re-fetched, not cited** — `✓ dev ci`, all four jobs green: `gate-db-free`, `gate-price-parity`, **`gate-visual`**, `gate-db` |

The eight baselines, named:

```
auth-forgot-1280-court-visual-linux.png   auth-forgot-320-court-visual-linux.png
auth-login-1280-court-visual-linux.png    auth-login-320-court-visual-linux.png
auth-reset-1280-court-visual-linux.png    auth-reset-320-court-visual-linux.png
auth-signup-1280-court-visual-linux.png   auth-signup-320-court-visual-linux.png
```

### The claim

**AUTHUI-01 is CLOSED, on this evidence, by this plan.** `requirements-completed: [AUTHUI-01]` in this
summary's frontmatter is the artifact that closes the traceability gap; the table above is what makes
it true.

**Why no plan claimed it before.** 15-09 expected 15-11 to close the remaining visual clause; 15-11's
frontmatter scoped only AUTHUI-03 and its body states the requirement is *"outside this plan's
requirements… and is untouched here"*. The hand-off never landed. The verifier confirmed the
requirement substantively anyway and recorded the omission as a **process gap** — which is exactly what
this task closes, with no new implementation.

**No implementation, and it is asserted rather than assumed:** `git diff --name-only src/ tests/ e2e/`
shows nothing attributable to this task, and `git diff --exit-code .planning/REQUIREMENTS.md` exits 0 —
ticking the requirement's checkbox and its traceability row is the verification pass's act, not a
plan's.

**Carried forward, not dropped:** the PM glance recorded in `15-VERIFICATION.md` § Human Verification
Required #2 (confirm the four auth screens read as the same product as booking/checkout) **remains an
open human item**. It is not a blocker for this claim — the verifier already performed that inspection
directly on the four CI-captured PNGs against a same-session `checkout-1280` and found it convincing —
but it stays on the books for the re-verification pass.

**Task 2 modified no file by design** (the plan's own `<files>` says so), so it carries no standalone
commit; its artifact is this section and the frontmatter line above, committed with this summary.

---

## Task 3 — the validation table now maps every clause AUTHUI-03 asserts

### The six new rows

Appended to `15-VALIDATION.md`'s Per-Task Verification Map in the existing ten-column shape, in task-id
order. **Every Status was watched exit 0 in this session** — none was copied from the producing plan's
summary:

| Row | Clause | Command re-run here | Watched result |
|---|---|---|---|
| `15-12-01` | AUTHUI-03 **keyboard** | `npx playwright test e2e/auth-keyboard.spec.ts --project=chromium` | exit 0, **7 passed** |
| `15-12-02` | AUTHUI-03 **keyboard**, T-15-25 | same run | exit 0, **7 passed** |
| `15-13-01` | AUTHUI-03 **AA** | `npx vitest run tests/design/auth-contrast.test.ts --config vitest.design.config.ts` | **170 passed** |
| `15-13-02` | AUTHUI-03 **AA**, T-15-29 | `npm run build` | exit 0; `test:design` 55 files / 1078 passed / 3 skipped |
| `15-14-01` | EMAIL-01 | `npx vitest run tests/ops/alert-digest.test.ts` | exit 0, **12 passed** |
| `15-14-02` | AUTHUI-01 | `npm run build` | exit 0; plus the Task 2 table above |

### The closure block

The post-execution note at the end of `15-VALIDATION.md` is **byte-identical** — confirmed by
`git diff --stat`, which reports **45 insertions and 0 deletions** for the whole file. A dated closure
block sits beneath it naming the two unsampled clauses, the rows that now sample them, the plans that
produced those rows, and the sentence that matters for the next phase: *ticking on "every mapped row is
green" is only sound when the map covers every clause of a conjunctive requirement, which is why this
table gained rows rather than the requirement gaining a tick.*

**Sign-off line:** the sampling-continuity criterion is **unchanged**. All six new rows carry an
automated command, so "no 3 consecutive tasks without automated verify" still holds at 100% of auto
tasks. No other sign-off line was touched.

### `deferred-items.md`

- The **[15-11] AUTHUI-03 keyboard/AA** entry is marked **CLOSED 2026-08-25**, with both plans (15-12,
  15-13), both artifacts (`e2e/auth-keyboard.spec.ts`, `tests/design/auth-contrast.test.ts`) and the
  measured facts each produced — 59 stops reproduced exactly with an indicator on every one; 23 rows ×
  2 themes = 46 measurements with D-162's 18.16/16.89 confirmed and zero new `CONTRAST_PAIRS` rows.
  **Its original body survives untouched** — the diff is 67 insertions and exactly **1** deletion (the
  heading line, which gained the CLOSED marker).
- **One NEW deferred item:** the raw-tag audit's own instrument is grep-shaped and cannot see
  `not.toMatch` forms. One such assertion exists (`tests/design/scaffold-residue.test.ts:227`); it is
  **sound** — it carries its own positive control on the line above and strips comments before
  asserting — so nothing was fixed, but the instrument's blind spot is written down.
- **No duplicate was added** for the `/signup` intent pair: plan 15-12 already logged it, and
  re-logging a closed observation is noise.
- The scope fence held: the stale `visual-baselines.ts` head paragraph, the `EXPECTED_BLOCKED` docblock
  count, the ten re-minted baselines and CR-01 (`src/lib/email.ts:54-55`) were all left alone.

---

## Verification

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npx vitest run tests/ops/ tests/auth/ tests/notifications/` | **exit 0 — 22 files / 282 passed** |
| `npx vitest run tests/ops/alert-digest.test.ts` | **exit 0 — 12 passed** (12 before this plan; count unchanged) |
| `npm test` | **exit 0 — 181 files / 2037 passed / 5 skipped** |
| `npm run build` (`lint && test:design && next build`) | **exit 0** |
| `npm run test:design` | **55 files / 1078 passed / 3 skipped** |
| `npx vitest run tests/design/auth-composition.test.tsx --config vitest.design.config.ts` | **13 passed** |
| `npx vitest run tests/design/auth-contrast.test.ts --config vitest.design.config.ts` | **170 passed** |
| `npx playwright test e2e/auth-keyboard.spec.ts --project=chromium` | **exit 0 — 7 passed** |
| `git diff --exit-code src/lib/email.ts` | **exit 0** — EMAIL-01's no-trigger-moved guarantee intact |
| `git diff --name-only src/` | **empty** — `src/` byte-identical at plan end |
| `git diff --exit-code tests/auth/email-escaping.test.ts` | **exit 0** — the named-and-protected test is not weakened |
| `git diff --exit-code .planning/REQUIREMENTS.md` | **exit 0** |
| `git ls-files 'e2e/visual/…/auth-*'` | **8** |
| `gh run view 32752143309` | **4/4 jobs green**, `gate-visual` ✓ |

**Four mutations applied and reverted**, all inside `src/`: the WR-04 `<code>` wrapper; `escapeHtml`
made the identity function; the per-row `cells.map((c) => c.text)` swapped for `c.html`; `tableText`
= `tableHtml`. Three of the four exist **only** to classify assertions this plan does not own.

---

## Deviations from Plan

### Auto-fixed / adjusted

**1. [Rule 3 — Blocking] The plan's `(b)` and `(a)` cannot be observed in one run, so three runs were used**

- **Found during:** Task 1 Part B, on the first attempt.
- **Issue:** the plan asks for both facts — the old line passing under the mutation AND the new lines
  failing — but they cannot coexist in a single run: once the new entity-form assertion is present it
  fails first, and the case never reaches the old literal-form line.
- **Fix:** three runs instead of one. (a) mutation + the test file at `HEAD`; (b) mutation + the new
  file; (b′) mutation + the new file with the html line neutralised, so the twin reports on its own —
  the same shape 15-12 used for its M-B′. All three are transcribed in M5.
- **Files modified:** none beyond the plan's own scope.

**2. [Rule 3 — Blocking] The plan's C3 mutation reddens 402 but not 403 — a wider one was needed, and the narrower result is kept as a finding**

- **Found during:** Task 1 Part C.
- **Issue:** swapping the per-row text cells for html cells puts `<td>` in the twin but not `<table`,
  because the table's open-tag lives on the wrapper string rather than in any row. Line 403 would have
  been classified "failable" on a mutation that never touches it.
- **Fix:** a second, wider mutation (`tableText = tableHtml`) was run, and **both** results are
  recorded — the two assertions are failable for **different** regressions.

**3. [Rule 1 — Bug, tooling] `gsd-sdk` state/roadmap verbs corrupted STATE.md and ROADMAP.md for the fourth consecutive plan**

- **Found during:** the state-update step.
- **Issue, measured this run:** `roadmap.update-plan-progress 15` re-ticked **15-05 `[x]`** (its Task 3
  is open by the PM's explicit deferral) and **blanked the phase narrative** to `In Progress`;
  `state.advance-plan` fabricated `completed_plans` **104 → 109**, replaced `Status:` with
  `Ready to execute`, and truncated `last_activity` to a bare date. **A new failure mode** also
  appeared: `state.update-progress` answered
  `{"updated": false, "reason": "Progress field not found in STATE.md"}` while the `progress:` block
  sits plainly in the frontmatter.
- **Fix:** pre-write copies were taken first, both files were restored **wholesale** from them
  (`git diff --exit-code` back to 0), and every edit was hand-applied and diffed. Final state verified
  by hand: **15-05 still `[ ]`**, the Phase-15 checkbox still `[ ]`, `completed_plans` **104 → 105**,
  `total_plans` **105**, ROADMAP diff exactly **2 lines**.

**4. [Rule 2 — Missing critical record] One new deferred item logged that the plan listed only as a candidate**

- The plan's two named candidates did not apply: the `/signup` intent pair is **already** logged by
  15-12, and the audit found **no** unfailable assertion outside Task 1's file. A different, real
  finding was logged instead — the audit's grep-shaped instrument cannot see `not.toMatch` forms.

**Total deviations:** 4 (2 × Rule 3, 1 × Rule 1 tooling, 1 × Rule 2). None required a checkpoint.

---

## Scope fence held

Untouched, all deliberately: EMAIL-03's real-client walk (15-05 Task 3 stays open and 15-05 stays
`[ ]`); AUTHUI-02's avatar-removal clause (Phase 16 CROP-03); CR-01 at `src/lib/email.ts:54-55` (the
file is byte-identical); the ten re-minted visual baselines; the stale `visual-baselines.ts` comment
arithmetic and the `EXPECTED_BLOCKED` docblock; the five findings 15-12 and 15-13 logged; and the
dependencies' own deliverables — `e2e/auth-keyboard.spec.ts`, `e2e/helpers/focus.ts`,
`tests/design/auth-contrast.test.ts`, `tests/design/helpers/contrast-math.ts` — whose validation rows
were mapped, not edited.

---

## Requirement Status

| Requirement | Status after this plan | Why |
|---|---|---|
| **AUTHUI-01** | **COMPLETED by this plan** | Four evidence pieces re-measured today; the traceability gap was bookkeeping, and exactly one plan now claims it |
| **AUTHUI-03** | **ADVANCED, deliberately NOT ticked** | All five clauses are now sampled (15-12 keyboard, 15-13 AA, and the three rows already green), but closing a conjunctive requirement is the re-verification pass's call |
| **EMAIL-01** | **ADVANCED** — already satisfied, now better guarded | The digest's authored-markup check can finally fail; no send trigger, subject, recipient or call site moved |
| **EMAIL-03** | **UNCHANGED — open human checkpoint** | 15-05 Task 3, deferred by the PM |

---

## Commits

| Commit | Task | What |
|---|---|---|
| `667f925` | 1 | case 11 made able to fail in both projections; M5's watched red; M6's 8-row classification |
| `2c42c87` | 3 | six validation rows, the dated closure block, and `deferred-items.md` closed + one new entry |
| *(this commit)* | 2 + metadata | the summary carrying AUTHUI-01's claim, plus STATE.md and ROADMAP.md |

---

## Known Stubs

None. This plan created no component, no data path and no rendered surface; `src/` is byte-identical
at plan end.

---

## Threat Flags

None. No network endpoint, auth path, file-access pattern or schema touched. The four mutations lived
inside `src/` for one run each and are proven reverted by `git diff --exit-code src/lib/email.ts` and
an empty `git diff --name-only src/`.
