---
phase: "20"
slug: "ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-08"
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8 + Playwright 1.60.0 |
| **Config file** | `vitest.config.ts`, `vitest.design.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm test -- tests/auth/ops-host-auth.test.ts tests/ops/staff-invitation.test.ts tests/ops/staff-policy.test.ts` |
| **Full suite command** | `npm test && npm run test:design && npm run build && npm run test:e2e -- --project=chromium` |
| **Estimated runtime** | Measure during Wave 0; keep focused task feedback under 120 seconds |

---

## Sampling Rate

- **After every task commit:** Run the focused Vitest or design-test file for that seam and lint changed source files where supported.
- **After every plan wave:** Run `npm test && npm run test:design`.
- **Before `$gsd-verify-work`:** The full suite, production build/start host probe, browser cookie-isolation flow, and real-recipient invite UAT must be green.
- **Max feedback latency:** 120 seconds for focused automated feedback; longer production and browser probes run at wave/phase gates.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 20-W0-01 | TBD | 0 | OPS-07 | T-20-HOST | Exact two-host route matrix; marketplace `/ops` is cloaked | unit + production integration | `npm test -- tests/auth/ops-host-routing.test.ts` | ❌ W0 | ⬜ pending |
| 20-W0-02 | TBD | 0 | OPS-08 | T-20-SESSION | Host-only sessions; neutral nonstaff cleanup and recovery flow | integration + browser | `npm test -- tests/auth/ops-host-auth.test.ts && npm run test:e2e -- e2e/ops-auth.spec.ts` | ❌ W0 | ⬜ pending |
| 20-W0-03 | TBD | 0 | OPS-09 | T-20-INVITE | Token is the sole target selector; hashed, POST-consumed once | DB integration | `npm test -- tests/ops/staff-invitation.test.ts tests/ops/grant-cli.test.ts` | ⚠ partial | ⬜ pending |
| 20-W0-04 | TBD | 0 | OPS-10 | T-20-LOCKOUT | Self, last-staff, stale, and concurrent revoke attempts are safe no-ops | DB integration | `npm test -- tests/ops/staff-policy.test.ts` | ❌ W0 | ⬜ pending |
| 20-W0-05 | TBD | 0 | OPS-11 | T-20-ROLE | Staff cannot simultaneously book or host; conversion is explicit and atomic | DB integration + source gate | `npm test -- tests/ops/staff-policy.test.ts tests/ops/grant-cli.test.ts` | ⚠ partial | ⬜ pending |
| 20-W0-06 | TBD | 0 | OPS-12 | T-20-CLOAK | Final route census preserves 200/404/404/404 and byte-identical 404 hashes | design + production HTTP | `npm run test:design` plus the Phase 20 production cloak probe | ⚠ partial | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠ flaky*

---

## Wave 0 Requirements

- [ ] `tests/auth/ops-host-routing.test.ts` — pure route matrix, exact configured hosts, ports/case, unknown preview behavior, internal-path denial, and preserved `_sc` behavior.
- [ ] `tests/auth/ops-host-auth.test.ts` — dynamic origins, explicit direct-call headers, forbidden cross-subdomain cookie/cache settings, role refusal/session cleanup, and recovery links.
- [ ] `tests/ops/staff-invitation.test.ts` — duplicate, expiry, resend/cancel races, GET no-consume, concurrent POST, signup conflict, credential compatibility, and audit metadata.
- [ ] `tests/ops/staff-policy.test.ts` — grant/convert/revoke predicates and concurrent last-staff race.
- [ ] `tests/design/ops-host-invariants.test.ts` or equivalent expansion — Proxy naming/import boundary, route census, no scoped not-found, action guard first, forbidden cookie settings, and the intended `/ops` page count.
- [ ] `e2e/ops-auth.spec.ts` — two real hostnames/two cookie jars, sign-in/sign-out/recovery/invite setup, and cross-host links.
- [ ] Phase 20 production cloak probe — status, headers, raw-body SHA-256, and all new paths, run after host partitioning and after the final route set.
- [ ] Repair the local npm shim or document the explicit npm CLI invocation in executor handoff.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Production `ops.` domain assignment, DNS, and TLS | OPS-07 | Requires Vercel/domain operator access | Assign the exact production ops host, verify TLS, then run the production host matrix and record status/body hashes. |
| Real staff-invite delivery through Resend | OPS-09 | Resend accepts non-owner recipients only after domain verification | Send an invite to a real allowed recipient, inspect the composed payload from Postgres, accept once, and confirm replay is refused. |
| Legible on-screen self/last-staff refusal | OPS-10 | Final usability and copy need human confirmation | Attempt self-revoke and last-staff revoke in the roster UI; confirm the console remains visible and explains the refusal without a 404. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Focused feedback latency is under 120 seconds
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
