---
phase: 15-auth-profile-transactional-email
plan: 04
subsystem: backend
tags: [email, html-email, escaping, injection, ops-digest, pii, design-gate, fixtures]

# Dependency graph
requires:
  - phase: 15-auth-profile-transactional-email
    plan: 03
    provides: "src/lib/email.ts — 18 of 19 senders on the shell; send(to, subject, html, text)"
  - phase: 15-auth-profile-transactional-email
    plan: 02
    provides: "the two build-blocking email gates, and the recorded &-in-href / extractLink trap"
  - phase: 15-auth-profile-transactional-email
    plan: 01
    provides: "src/lib/email-shell.ts — renderEmail, EmailContent, the one escapeHtml"
provides:
  - "src/lib/email.ts — NINETEEN of nineteen senders composing one shell; zero bare markup builders"
  - "tests/helpers/email-fixtures.ts — one argument list per exported sender, totality-typed"
  - "tests/auth/email-injection.test.ts — the all-sender injection probe"
  - "renderOpsAlertDigest's direct-read PII assertion (its docblock's claim is true for the first time)"
affects: [15-05, any phase adding a transactional send]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A data-table body enters the shell through tableHtml with a matching tableText, both from ONE map over the rows"
    - "A totality-typed fixture module keyed on a union DERIVED from the module's own exported functions — a new sender without a fixture is a compile error"

key-files:
  created: []
  modified:
    - src/lib/email.ts
    - tests/ops/alert-digest.test.ts

key-decisions:
  - "The digest's table keeps `border=\"1\"` and types no colour value: reading the rule token in email.ts would put a second palette reader outside the shell and resolve it against a theme the function is never told"

requirements-advanced: []
requirements-completed: []

# Metrics
duration: in-progress
completed: 2026-08-24
---

# Phase 15 Plan 04: The Nineteenth Sender Summary

**IN PROGRESS — interim durability record.**

## Task Commits

1. **Task 1: the ops digest wears the shell; its PII guarantee becomes a direct read** — `57d0ee7` (feat)

## Progress

- Task 1 complete and verified: `npx tsc --noEmit` exit 0, `npx vitest run tests/ops/` 3 files / 37
  passed, `npm run test:design` 52 files / 877 passed / 3 skipped.
- `grep -c '<p><strong>' src/lib/email.ts` → **0**. `grep -c 'renderEmail('` → **20**.
  `grep -c 'escapeHtml'` → **12**. `OpsDigestRow` still lists exactly six fields and no `meta`.

## Remaining

- Task 2: `tests/helpers/email-fixtures.ts` + `tests/auth/email-injection.test.ts`.
- Task 3: the shell's guarded support site declared in `tests/design/site-contacts.test.ts`.
- EMAIL-01 / EMAIL-02 to be ticked (this is the plan that closes them).
