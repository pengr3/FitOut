---
phase: 1
slug: auth-accounts
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-03
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Greenfield: NO test infrastructure exists yet — Wave 0 must install and configure it.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit/integration) + Playwright (E2E) — per CLAUDE.md |
| **Config file** | none yet — Wave 0 installs `vitest.config.ts` + `playwright.config.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run && npx playwright test` |
| **Estimated runtime** | ~30–60 seconds (unit) + E2E |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run` (relevant file/dir)
- **After every plan wave:** Run `npx vitest run` (full unit suite)
- **Before `/gsd-verify-work`:** Full suite (`npx vitest run && npx playwright test`) must be green
- **Max feedback latency:** 60 seconds (unit)

---

## Per-Task Verification Map

> Refined by the planner as PLAN.md tasks are written. Behaviors below are derived from
> RESEARCH.md §"Validation Architecture" and the AUTH-01..05 success criteria.

| Behavior to prove | Requirement | Test Type | Notes |
|-------------------|-------------|-----------|-------|
| Sign up (email/pw) → log in → session persists across browser restart | AUTH-01, AUTH-02 | integration + E2E | sliding ~30d session cookie present after restart |
| Forgot password → email link → reset → log in with new password | AUTH-03 | integration | token TTL respected |
| Password reset **revokes all other active sessions** (old session invalid after reset) | AUTH-03 | integration | guards the `revokeSessionsOnPasswordReset` default-false landmine |
| Google OAuth sign-in creates an account with `emailVerified=true` | AUTH-01 | integration | OAuth arrives pre-verified |
| Soft gate: unverified email/pw user **can** still sign in and browse (NOT blocked in Phase 1) | AUTH-01 | unit/integration | `requireEmailVerification:false` — verification email is sent but not enforced yet |
| Capability flags: signup-as-booker sets `canBook=true`; explicit activation flips `canHost=true` | AUTH-04 | integration | `additionalFields` with `input:false` — client cannot self-grant at signup (expect FIELD_NOT_ALLOWED) |
| Single account toggles between booker/host mode without a new identity | AUTH-04 | E2E | mode switch + host dashboard route group |
| Create/edit profile (first name, bio, city, phone) persists; public/private split honored | AUTH-05 | integration | last name stays private (D-10) |
| Avatar upload to Cloudinary stores URL/public_id on the user | AUTH-05 | integration | signed server-action upload |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install + configure **Vitest** (`vitest.config.ts`) — no framework exists yet
- [ ] Install + configure **Playwright** (`playwright.config.ts`) for E2E auth flows
- [ ] Test DB strategy — ephemeral `postgis/postgis:18` Postgres (Docker) with migrations applied before integration tests
- [ ] Shared test fixtures — test user factory, authed-session helper, Resend/Cloudinary mocks (or dev console-log fallback)

*Greenfield — Wave 0 owns all of the above before integration tests can run.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real verification/reset email actually delivers via Resend | AUTH-03 | external email delivery | Trigger reset in staging with a real inbox; confirm link arrives and works |

*Most behaviors above have automated coverage; only real email delivery is manual.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
