---
phase: 15
slug: auth-profile-transactional-email
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-24
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 15-RESEARCH.md § Validation Architecture (11 Wave 0 gaps listed there,
> including the `DEFAULT_THEME` relocation that blocks EMAIL-02).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (main config + design config — NEVER run concurrently, they share `fitout_test`) |
| **Config file** | `vitest.config.ts` (main) / design suite via `npm run test:design` |
| **Quick run command** | `npx vitest run <touched spec files>` |
| **Full suite command** | `npm test` then `npm run test:design` (sequential, never parallel) |
| **Estimated runtime** | ~100s main / ~60s design |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <touched spec files>`
- **After every plan wave:** Run `npm test` then `npm run test:design` (sequential)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| *(filled by planner from PLAN.md tasks)* | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] See 15-RESEARCH.md § Validation Architecture — 11 Wave 0 gaps, including the
      `DEFAULT_THEME` relocation to a pure module (blocks EMAIL-02's hex gate) and the
      email-shell renderer being a pure export testable without `vi.mock("resend")`
      (the design vitest config loads no `setupFiles`).

*Planner maps each gap to a Wave 0 task; executors tick rows here.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real-client email rendering (Gmail web + Android, Outlook desktop, Apple Mail, ≥1 dark mode) | EMAIL-03 | Real mail clients cannot be driven from CI | Send one of each via `scripts/send-email-previews.ts` with live `RESEND_API_KEY`; open in each client; record results |
| Visual-baseline regeneration (2 edited + 8 new rows) | AUTHUI-01/02 | `baselines.yml` is `workflow_dispatch`-only; Playwright `visual` project not constructed off Linux | Operator/CI step, same convention as STATE.md's Phase-12 note |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
