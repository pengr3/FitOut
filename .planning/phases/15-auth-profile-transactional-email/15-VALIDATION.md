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
| 15-11-01 | 11 | 5 | AUTHUI-03 | — | N/A (baseline inventory 66→74, `auth-login` rows edited) | design | `npx tsc --noEmit && npm run test:design` | ✅ | ⬜ pending |
| 15-11-02 | 11 | 5 | AUTHUI-03 | — | — | **manual checkpoint (blocking)** — CI `baselines.yml` dispatch; deliverable is the follow-up comparison run's id | `git ls-files 'e2e/visual/surfaces.spec.ts-snapshots/*-visual-linux.png' \| wc -l` | — | ⬜ pending |

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
| Visual-baseline regeneration (2 edited `auth-login` rows + 8 new rows) | AUTHUI-03 | `baselines.yml` is `workflow_dispatch`-only; Playwright `visual` project not constructed off Linux | 15-11-02 checkpoint: operator dispatches CI generation run, then records the follow-up comparison run's id |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (100% of auto tasks carry a command)
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 180s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-08-24 (gsd-plan-checker verified 8a–8d directly against the 11 plans; this file backfilled from that pass)
