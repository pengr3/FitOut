---
phase: 1
slug: auth-accounts
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-03
validated: 2026-08-01
audited: 2026-08-01
audit_scope: "Retroactive close-out during the v1.0 milestone audit — the contract was written pre-execution and never updated after Phase 1 shipped. Every row below was re-run first-hand on 2026-08-01."
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Greenfield: NO test infrastructure exists yet — Wave 0 must install and configure it.
>
> **STATUS UPDATE (2026-08-01, v1.0 milestone audit).** This file sat at `status: planned` /
> `wave_0_complete: false` for the whole milestone — it was authored before execution and never
> refreshed, so the milestone audit initially scored Phase 1 as Nyquist-PARTIAL. Wave 0 was in fact
> completed by plan 01-01, and every behavior in the map below now has a real, passing automated test.
> Re-run first-hand on 2026-08-01: **`npx vitest run tests/auth tests/profile` → 14 files / 39 tests
> passed**, and **`npx playwright test e2e/login-persistence.spec.ts e2e/password-reset.spec.ts
> e2e/mode-switch.spec.ts` → 4/4 passed** against the dev app + dev Postgres.

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

| Behavior to prove | Requirement | Test Type | Backing file (verified present + green 2026-08-01) | Status |
|-------------------|-------------|-----------|-----------------------------------------------------|--------|
| Sign up (email/pw) → log in → session persists across browser restart | AUTH-01, AUTH-02 | integration + E2E | `tests/auth/signup.test.ts`, `tests/auth/session-config.test.ts` (expiresIn=2592000, updateAge=86400) + `e2e/login-persistence.spec.ts` (real storageState carried into a fresh browser context) | ✅ green |
| Forgot password → email link → reset → log in with new password | AUTH-03 | integration + E2E | `tests/auth/reset-revokes-sessions.test.ts` + `e2e/password-reset.spec.ts` (token read from the dev `verification` table — the documented dev capture strategy) | ✅ green |
| Password reset **revokes all other active sessions** (old session invalid after reset) | AUTH-03 | integration | `tests/auth/reset-revokes-sessions.test.ts` — old cookie returns null after reset | ✅ green |
| Google OAuth sign-in creates an account with `emailVerified=true` | AUTH-01 | integration | `tests/auth/oauth-verified.test.ts` — provider mapping + persistence via Better Auth's internal adapter | ✅ green (live OAuth still manual — no creds) |
| Soft gate: unverified email/pw user **can** still sign in and browse (NOT blocked in Phase 1) | AUTH-01 | unit/integration | `tests/auth/soft-gate-noop.test.ts` | ✅ green |
| Capability flags: signup-as-booker sets `canBook=true`; explicit activation flips `canHost=true` | AUTH-04 | integration | `tests/auth/capability-signup.test.ts` (invariant scan: no user ever both-false), `capability-escalation.test.ts` (smuggled `canHost`/`role` stripped), `capability-activate.test.ts` | ✅ green |
| Single account toggles between booker/host mode without a new identity | AUTH-04 | E2E | `e2e/mode-switch.spec.ts` — host-capable user reaches the distinct `/host` surface; booker-only user is redirected away by the **server** gate (T-04-02) | ✅ green |
| Create/edit profile (first name, bio, city, phone) persists; public/private split honored | AUTH-05 | integration | `tests/profile/profile.test.ts` — cleared fields write NULL (WR-05); `publicProfile()` allow-list asserted key-exact | ✅ green |
| Avatar upload to Cloudinary stores URL/public_id on the user | AUTH-05 | integration | `tests/profile/avatar.test.ts` — type+size validated before upload; session-gated | ✅ green (mocked; real CDN upload still manual — no server secret) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Re-run evidence (2026-08-01):** `npx vitest run tests/auth tests/profile` → **14 files / 39 tests
passed**. `npx playwright test e2e/login-persistence.spec.ts e2e/password-reset.spec.ts
e2e/mode-switch.spec.ts` → **4 passed (33.7s)**.

---

## Wave 0 Requirements

- [x] Install + configure **Vitest** (`vitest.config.ts`) — **present**
- [x] Install + configure **Playwright** (`playwright.config.ts`) for E2E auth flows — **present** (`webServer` boots `npm run dev` on :3000, reuses a running server)
- [x] Test DB strategy — `postgis/postgis:18-3.6` via Docker Compose with per-worker isolated schemas (`tests/helpers/db.ts`, incl. `makeRacingClients` for genuine multi-connection races) — **present and up**
- [x] Shared test fixtures — `tests/helpers/{auth,db,mocks,seed}.ts` — **all four present**

*Greenfield — Wave 0 owns all of the above before integration tests can run.*
**Closed by plan 01-01; confirmed present 2026-08-01.**

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Current state (2026-08-01) |
|----------|-------------|------------|----------------------------|
| Real verification/reset email actually **delivers** via Resend | AUTH-03 | external email delivery | **Transport proven downstream, this specific send not re-observed.** `RESEND_API_KEY` is now configured, and Phase 6 delivered a real booking-confirmation email via Resend (id `faa1481e`, `06-HUMAN-UAT.md`). `e2e/password-reset.spec.ts` proves the full forgot→reset→login flow but reads the token from the DB, because Resend rejects `example.com` recipients (`validation_error 422`, observed in this run). Sending a reset to a real inbox remains the one un-run leg. |
| Live **Google OAuth** browser round trip | AUTH-01 | `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` unset | Still unset (Better Auth logs `Social provider google is missing clientId or clientSecret` on every boot). Provider mapping + `emailVerified` persistence are proven by `tests/auth/oauth-verified.test.ts`. **Not a v1 requirement** — AUTH-01 is email/password — but the button ships in the signup/login UI. |
| Real **Cloudinary avatar** upload | AUTH-05 | server-side Cloudinary secret unset | `CLOUDINARY_CLOUD_NAME`/`API_KEY`/`API_SECRET` are absent from the current `.env.local` (only the two `NEXT_PUBLIC_*` client vars are set), so the signing path cannot mint a real signature here. Validation + persistence proven by `tests/profile/avatar.test.ts`. |
| **Signup intent default** — product sign-off that an intent-less signup should default to booker | AUTH-04 | product decision, not a code question | Behavior is verified (`capability-escalation.test.ts` proves `canBook=true` and both-false impossible). The product confirmation was never formally recorded; the default has since shipped through nine phases unchanged, which is de-facto acceptance. |

*All automatable behaviors have automated coverage. The four items above are external-credential or
product-decision items, not code gaps — carried into the v1.0 milestone audit as tech debt.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Plan 01 installs Vitest+Playwright, test DB strategy, mocks)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved by planner 2026-06-03 — all 11 executable tasks across plans 01-04 carry an <automated> verify; Wave 0 (plan 01) installs the test infra and shared mocks the integration/E2E tests depend on.
