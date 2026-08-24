---
phase: 15
slug: auth-profile-transactional-email
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-24
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 15-RESEARCH.md § Validation Architecture. Backfilled from the 11 verified
> PLAN.md files after gsd-plan-checker passed them (2026-08-24).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (main config + design config — NEVER run concurrently, they share `fitout_test`) |
| **Config file** | `vitest.config.ts` (main) / `vitest.design.config.ts` (design, no `setupFiles`) |
| **Quick run command** | `npx vitest run <touched spec files>` (add `--config vitest.design.config.ts` for design specs) |
| **Full suite command** | `npm test` then `npm run test:design` (sequential, never parallel) |
| **Estimated runtime** | ~100s main / ~60s design |

---

## Sampling Rate

- **After every task commit:** Run the task's `<automated>` command (below)
- **After every plan wave:** Run `npm test` then `npm run test:design` (sequential)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | EMAIL-01/02 | — | N/A (pure-module relocation, zero import edits) | design | `npx tsc --noEmit && npm run test:design` | ✅ | ⬜ pending |
| 15-01-02 | 01 | 1 | EMAIL-01/02 | T: URL injection | `escapeHtml` per field incl. derived preheader | design + unit | `npx tsc --noEmit && npm run test:design && npx vitest run tests/auth/email-escaping.test.ts tests/auth/email-dev-fallback.test.ts` | ✅ | ⬜ pending |
| 15-02-01 | 02 | 2 | EMAIL-01 | — | no absolute http(s) URL before the CTA (mockResend.lastLink trap) | design (tdd) | `npx vitest run tests/design/email-shell.test.ts --config vitest.design.config.ts` | ❌ W0 | ⬜ pending |
| 15-02-02 | 02 | 2 | EMAIL-02 | — | inline hex only from `tokens.generated.ts` (theme-flip contract) | design (tdd) | `npx vitest run tests/design/email-tokens.test.ts --config vitest.design.config.ts && git diff --exit-code src/lib/design/tokens.generated.ts tests/design/token-drift.test.ts` | ❌ W0 | ⬜ pending |
| 15-03-01 | 03 | 3 | EMAIL-01 | T: escaping regression | `tests/auth/email-escaping.test.ts` byte-identical (`git diff --exit-code`) | unit | `npx tsc --noEmit && npx vitest run tests/auth/ && git diff --exit-code tests/auth/email-escaping.test.ts` | ✅ | ⬜ pending |
| 15-03-02 | 03 | 3 | EMAIL-01 | T: trigger moves | no send trigger moved (GATE-NOREG) | unit + design | `npx tsc --noEmit && npx vitest run tests/booking/ tests/notifications/ && npm run test:design` | ✅ | ⬜ pending |
| 15-03-03 | 03 | 3 | EMAIL-01 | T: trigger moves | no send trigger moved (GATE-NOREG) | unit + design | `npx tsc --noEmit && npx vitest run tests/booking/ tests/notifications/ tests/auth/ tests/ops/ && npm run test:design` | ✅ | ⬜ pending |
| 15-04-01 | 04 | 4 | EMAIL-01/02 | T: PII in digest | digest PII sentinel + existing escaping assertions survive | unit + design | `npx tsc --noEmit && npx vitest run tests/ops/ && npm run test:design` | ✅ | ⬜ pending |
| 15-04-02 | 04 | 4 | EMAIL-01 | T: HTML injection | all-19-sender injection probe, every string parameter | unit (tdd) | `npx tsc --noEmit && npx vitest run tests/auth/ && git diff --exit-code tests/auth/email-escaping.test.ts tests/helpers/mocks.ts` | ✅ (probe file is W0) | ⬜ pending |
| 15-04-03 | 04 | 4 | EMAIL-01/02 | — | `SUPPORT_EMAIL = null` guarded slot (D-161) | design | `npx vitest run tests/design/site-contacts.test.ts --config vitest.design.config.ts && npm run test:design` | ✅ | ⬜ pending |
| 15-05-01 | 05 | 5 | EMAIL-03 | — | N/A (preview harness; live key stays out of CI) | script/build | `npx tsc --noEmit && node -e "…package.json email:previews + build-script checks…"` | ❌ W0 | ⬜ pending |
| 15-05-02 | 05 | 5 | EMAIL-03 | — | Outlook honestly `BLOCKED — client access` (D-163) | doc/CLI | `test -f …/15-UAT-EMAIL.md && grep -c 'BLOCKED — client access' …/15-UAT-EMAIL.md` | ❌ W0 | ⬜ pending |
| 15-05-03 | 05 | 5 | EMAIL-03 | — | — | **manual checkpoint (blocking)** | operator walk recorded in 15-UAT-EMAIL.md | — | ⬜ pending |
| 15-06-01 | 06 | 1 | AUTHUI-01/03 | — | session/middleware boundary untouched | design | `npx tsc --noEmit && npm run test:design` | ✅ | ⬜ pending |
| 15-06-02 | 06 | 1 | AUTHUI-01/03 | T: auth flow regression | reset/login flows still pass end-to-end | build + e2e | `npx tsc --noEmit && npm run build && npx playwright test e2e/password-reset.spec.ts e2e/login-persistence.spec.ts` | ✅ | ⬜ pending |
| 15-07-01 | 07 | 2 | AUTHUI-01/03 | T: auth flow regression | anti-enumeration branches untouched | design + e2e | `npx tsc --noEmit && npm run test:design && npx playwright test e2e/password-reset.spec.ts` | ✅ | ⬜ pending |
| 15-07-02 | 07 | 2 | AUTHUI-01/03 | T: auth flow regression | callback-URL guard untouched | design + e2e | `npx tsc --noEmit && npm run test:design && npx playwright test e2e/password-reset.spec.ts e2e/login-persistence.spec.ts` | ✅ | ⬜ pending |
| 15-08-01 | 08 | 3 | AUTHUI-02 | — | save-state model unmoved (design pass only) | design | `npx tsc --noEmit && npm run test:design && git diff --exit-code tests/design/loading-coverage.test.ts` | ✅ | ⬜ pending |
| 15-08-02 | 08 | 3 | AUTHUI-02 | — | server-side capability mapping untouched | design + unit | `npx tsc --noEmit && npm run test:design && npx vitest run tests/profile/` | ✅ | ⬜ pending |
| 15-09-01 | 09 | 4 | AUTHUI-01/03 | — | N/A (live-region inventory 21→26) | design | `npx tsc --noEmit && npx vitest run tests/design/live-regions.test.tsx --config vitest.design.config.ts && npm run test:design` | ✅ | ⬜ pending |
| 15-09-02 | 09 | 4 | AUTHUI-01/03 | — | N/A (auth-composition gate) | design (tdd) | `npx vitest run tests/design/auth-composition.test.tsx --config vitest.design.config.ts && npm run test:design` | ❌ W0 | ⬜ pending |
| 15-10-01 | 10 | 4 | AUTHUI-02/03 | — | N/A (profile-pass gate) | design (tdd) | `npx vitest run tests/design/profile-pass.test.tsx --config vitest.design.config.ts && npm run test:design` | ❌ W0 | ⬜ pending |
| 15-10-02 | 10 | 4 | AUTHUI-03 | — | N/A (320px floor) | e2e | `npx playwright test e2e/overflow-320.spec.ts` | ✅ | ⬜ pending |
| 15-11-01 | 11 | 5 | AUTHUI-03 | — | N/A (baseline inventory 66→74, `auth-login` rows edited) | design | `npx tsc --noEmit && npm run test:design` | ✅ | ✅ green — tsc 0, 54 files / 908 passed / 3 skipped |
| 15-11-02 | 11 | 5 | AUTHUI-03 | — | — | **manual checkpoint (blocking)** — CI `baselines.yml` dispatch; deliverable is the follow-up comparison run's id | `git ls-files 'e2e/visual/surfaces.spec.ts-snapshots/*-visual-linux.png' \| wc -l` | ✅ **36** | ✅ **DISCHARGED 2026-08-25** — gen `32751407382`, cmp **`32752143309` SUCCESS** (`gate-visual` ✓) |
| 15-12-01 | 12 | 6 | AUTHUI-03 (keyboard) | — | the wordmark-first focus sequence over six auth documents, written out as data and re-checked by a command | e2e | `npx playwright test e2e/auth-keyboard.spec.ts --project=chromium` | ✅ | ✅ green — exit 0, **7 passed** (re-run 2026-08-25; 59 declared stops reproduced exactly) |
| 15-12-02 | 12 | 6 | AUTHUI-03 (keyboard) | T-15-25 | the reset token input is unreachable forward AND backward, and every stop paints a visible indicator | e2e | `npx playwright test e2e/auth-keyboard.spec.ts --project=chromium` | ✅ | ✅ green — exit 0, **7 passed** (same run; M-B/M-B′ transcribed in 15-12) |
| 15-13-01 | 13 | 6 | AUTHUI-03 (AA) | — | every rendered ink-on-ground pair measured in BOTH themes (23 rows × 2 themes = 46 measurements) | design | `npx vitest run tests/design/auth-contrast.test.ts --config vitest.design.config.ts` | ✅ | ✅ green — **170 passed** (re-run 2026-08-25) |
| 15-13-02 | 13 | 6 | AUTHUI-03 (AA) | T-15-29 | an undeclared auth pairing turns the build red (the completeness census, not the token-layer gate) | design | `npm run build` | ✅ | ✅ green — exit 0; `test:design` 55 files / **1078 passed / 3 skipped** |
| 15-14-01 | 14 | 7 | EMAIL-01 | — | the digest's authored-markup check can fail in both projections — entity-escaped in `html`, literal in `text` | unit | `npx vitest run tests/ops/alert-digest.test.ts` | ✅ | ✅ green — exit 0, **12 passed** (count unchanged; the WR-04 mutation was watched red first) |
| 15-14-02 | 14 | 7 | AUTHUI-01 | — | the composition gate is build-blocking and the eight auth baselines are committed | design + CLI | `npm run build` | ✅ | ✅ green — exit 0; `auth-composition.test.tsx` **13 passed**; `git ls-files …'auth-*'` = **8**; `gh run view 32752143309` 4/4 jobs ✓ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

New files the plans themselves create before/with their gates (❌ W0 rows above):

- [ ] `tests/design/email-shell.test.ts` — structure/parity gate (15-02-01)
- [ ] `tests/design/email-tokens.test.ts` — seven-hex-set gate (15-02-02)
- [ ] all-sender injection probe in `tests/auth/` + shared email fixture module (15-04-02; fixtures shared with the preview harness)
- [ ] `scripts/send-email-previews.ts` + `email:previews` script (15-05-01)
- [ ] `15-UAT-EMAIL.md` walk checklist (15-05-02)
- [ ] `tests/design/auth-composition.test.tsx` (15-09-02)
- [ ] `tests/design/profile-pass.test.tsx` (15-10-01)
- [ ] `DEFAULT_THEME` relocation to a pure module (15-01-01 — blocks EMAIL-02's hex gate; the email renderer stays importable by the design config, which loads no `setupFiles`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real-client email rendering (Gmail web + Android, Apple Mail, ≥1 dark mode; Outlook recorded `BLOCKED — client access` per D-163) | EMAIL-03 | Real mail clients cannot be driven from CI | 15-05-03 checkpoint: send one of each via `scripts/send-email-previews.ts` with live `RESEND_API_KEY`; open in each client; record per-client results in 15-UAT-EMAIL.md |
| Visual-baseline regeneration (2 edited `auth-login` rows + 8 new rows) | AUTHUI-03 | `baselines.yml` is `workflow_dispatch`-only; Playwright `visual` project not constructed off Linux | 15-11-02 checkpoint: operator dispatches CI generation run, then records the follow-up comparison run's id — **DONE 2026-08-25**, comparison run `32752143309` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (100% of auto tasks carry a command)
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 180s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-08-24 (gsd-plan-checker verified 8a–8d directly against the 11 plans; this file backfilled from that pass)

---

## Post-execution note (2026-08-25) — AUTHUI-03's sampling gap

This table maps **AUTHUI-03** to exactly three rows — `15-10-02` (320px), `15-11-01` (inventory) and
`15-11-02` (the dispatch) — and **all three are now green**. The requirement was still left UNTICKED.

Its text is conjunctive across five gates: *"320px, keyboard, AA, designed states, and a baseline"*.
Three hold (320px, designed states, baseline). **Keyboard and AA are unevidenced across the whole
phase**, and this table never mapped a row to either — so two of the requirement's five clauses were
never sampled. Ticking on "every mapped row is green" would have been a gate that reads correct
because nothing asked the harder question.

Both gaps, and what closing each looks like, are in `deferred-items.md`.

---

## Closure of the note above (2026-08-25, plan 15-14) — the map now covers all five clauses

The note above stays exactly as written. It is the phase's own honest self-assessment and it was
right; this block records what answered it, not a revision of it.

**The two clauses that were never sampled:** **keyboard** and **AA**. Not failed — *unmapped*. Every
row the table pointed at AUTHUI-03 was green while two of the requirement's five conjunctive clauses
had no row at all.

**The rows that now sample them, and the plans that produced them:**

| Clause | Row(s) | Plan | Artifact | The measured fact |
|--------|--------|------|----------|-------------------|
| keyboard | `15-12-01`, `15-12-02` | 15-12 (wave 6) | `e2e/auth-keyboard.spec.ts` + `e2e/helpers/focus.ts` | six auth documents, **59 stops** declared as data and reproduced exactly (12/14/9/7/9/8); the wordmark is stop 1 on all six and keeps the browser default; an indicator measured on every stop; T-15-25 asserted forward AND backward and mutation-proven twice |
| AA | `15-13-01`, `15-13-02` | 15-13 (wave 6) | `tests/design/auth-contrast.test.ts` + `tests/design/helpers/contrast-math.ts` | 23 ink-on-ground rows × 2 themes = **46 measurements**, each anchored by AST parse to an exact class string in an exact file; D-162's cited **18.16 court / 16.89 grove** re-measured and CONFIRMED; **zero** new `CONTRAST_PAIRS` rows needed, which is the result rather than a shortcut |

**The sentence that matters for the next phase.** Ticking a requirement because *every mapped row is
green* is only sound when the map covers **every clause** of a conjunctive requirement. AUTHUI-03's
map covered three of five, so "all green" was true and meaningless at the same time. That is why this
table gained ROWS and the requirement did not gain a TICK: closing a sampling hole is a validation
act; closing the requirement is the re-verification pass's call, on the evidence 15-12 and 15-13
produced.

**Sign-off, re-checked rather than re-asserted:** the sampling-continuity line above is **unchanged**.
All six new rows carry an `<automated>` command, so "no 3 consecutive tasks without automated verify"
still holds at 100% of auto tasks. No other sign-off line was touched.

**Provenance of the statuses above.** Every green in the six new rows was watched exit 0 in this
session (2026-08-25), not copied from the producing plan's summary: `auth-keyboard.spec.ts` 7 passed,
`auth-contrast.test.ts` 170 passed, `alert-digest.test.ts` 12 passed, `npm run build` exit 0,
`auth-composition.test.tsx` 13 passed, `git ls-files` 8 baselines, `gh run view 32752143309` 4/4 jobs
green including `gate-visual`.

**Still open after this block:** `15-05-03` — the EMAIL-03 real-client walk, a blocking manual
checkpoint deferred by the PM. It is the phase's one remaining human item and nothing here discharges
it.
