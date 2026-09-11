---
phase: "23"
slug: "the-support-path-becomes-reachable"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-11"
---

# Phase 23 — Validation Strategy

This contract validates the fitout.live production-domain cutover, monitored support replies, and the constrained public-callback inventory.

## Test Infrastructure

| Property | Value |
|---|---|
| Framework | Vitest, using main and design configurations |
| Fast design command | node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts tests/design/site-contacts.test.ts |
| Fast origin command | node node_modules/vitest/vitest.mjs run tests/auth/secret-config.test.ts tests/auth/ops-host-routing.test.ts |
| Full suite command | node node_modules/vitest/vitest.mjs run |
| Expected focused-test duration | Under 60 seconds |

## Sampling Rate

- After each source task, run the exact focused command in its plan task.
- After Waves 1 and 2, run the full source suite before authenticated dashboard work.
- Before phase verification, run the full suite and complete the redacted live proof.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement coverage | Validation |
|---|---|---:|---|---|
| 23-01-01 | 01 | 1 | STATE-05, TRUST-01, D-01, D-02, D-07, D-09 | Shared contact and Resend payload tests prove Gmail Reply-To, production sender contract, and CTA origins. |
| 23-01-02 | 01 | 1 | STATE-05, TRUST-01, D-01, D-02, D-03, D-10, D-11 | Origin tests distinguish public, ops, exact Vercel Preview, unknown, and local hosts. |
| 23-02-01 | 02 | 2 | STATE-05, D-01, D-03, D-11 | Public-origin caller inventory and notification/payment/Inngest tests prove absolute public URLs use central authority. |
| 23-02-02 | 02 | 2 | STATE-05, D-01, D-11 | Booking/group-action inventory tests prove generated user links cannot inherit an unsafe fallback. |
| 23-02-03 | 02 | 2 | STATE-05, D-01, D-03, D-11, D-12 | OAuth, PayMongo, Didit, and host-action tests retain callback security while using central origins. |
| 23-03-01 | 03 | 3 | STATE-05, TRUST-01, D-01–D-10 | Authenticated Vercel and Resend dashboard checkpoint verifies domain, exact records, environment scope, and redaction discipline. |
| 23-03-02 | 03 | 3 | STATE-05, D-12, D-14 | Authenticated provider checkpoint inventories and changes only existing public callback values. |
| 23-03-03 | 03 | 3 | STATE-05, TRUST-01, D-13–D-15 | Final production proof covers redirect, host isolation, delivery, Reply-To, safe callback receipts, and Preview behavior. |

## Manual Control-Plane Proof

| Behavior | Why a human checkpoint is required | Required evidence |
|---|---|---|
| Vercel domains, DNS, TLS, redirect, and environment scope | Account changes require authenticated dashboard access. | Redacted healthy/verified states, exact public hostnames, and environment names. |
| Resend sending-domain verification and delivery | DNS identity and controlled receipt exist outside the repository. | Redacted domain status and a non-sensitive delivery/reply result. |
| Google OAuth, PayMongo, Didit, and Inngest callbacks | Each provider owns authenticated configuration and signed flows. | Redacted inventory and provider-safe test or receipt; no secret, token, bearer, or customer evidence. |

## Sign-Off

- [ ] Every source task has a non-watch automated command and an explicit failure condition.
- [ ] The focused email and origin tests are green before Wave 2 begins.
- [ ] The full source suite is green before the authenticated dashboard checkpoint.
- [ ] All manual proof is redacted and excludes keys, tokens, signing secrets, bearer links, and recipient evidence.
- [ ] Set nyquist_compliant to true only after the source suite and every live check are complete.
