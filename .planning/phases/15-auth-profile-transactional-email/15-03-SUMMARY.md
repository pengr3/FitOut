---
phase: 15-auth-profile-transactional-email
plan: 03
subsystem: backend
tags: [email, html-email, transactional, escaping, resend, plain-text, refactor]

# Dependency graph
requires:
  - phase: 15-auth-profile-transactional-email
    plan: 01
    provides: "src/lib/email-shell.ts — renderEmail(content) => { html, text }, EmailContent, and the one escapeHtml"
  - phase: 15-auth-profile-transactional-email
    plan: 02
    provides: "tests/design/email-shell.test.ts and email-tokens.test.ts — the two build-blocking gates that judge every adopter"
provides:
  - "src/lib/email.ts — 18 of 19 senders composing one shell behind an unchanged send() contract"
  - "send(to, subject, html, text) — the transport now carries a plain-text part to Resend"
affects: [15-04, 15-05, any phase adding a transactional send]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A sender states an EmailContent with RAW interpolations; the shell escapes every sink"
    - "Copy assertions move from the HTML part to the plain-text twin, which carries the sentence verbatim"

key-files:
  created: []
  modified:
    - src/lib/email.ts

key-decisions: []

requirements-advanced: [EMAIL-01, EMAIL-02]
requirements-completed: []

# Metrics
duration: in-progress
completed: 2026-08-24
---

# Phase 15 Plan 03: Eighteen Senders Adopt the Shell Summary

**IN PROGRESS — interim record written after Task 1 for durability. Refined in place as tasks land.**

## Task Commits

1. **Task 1: the transport gains a plain-text part; the two auth sends adopt the shell** — `cb26f72` (feat)

## Progress

- **Task 1 done.** `send()` is now `(to, subject, html, text)` and the Resend options object carries
  `text`. The WR-02 dev-fallback block is byte-identical — same comment, same production
  `console.error` sentence and early return, same `[email:dev]` log of `html`.
  `sendVerificationEmail` and `sendResetPassword` compose `renderEmail` with `paragraphs: []` and a
  labelled CTA over the **raw** url; their per-field `escapeHtml` locals are gone.
- **Verified:** `npx vitest run tests/auth/` — **14 files / 39 tests passed**, including
  `email-escaping`, `email-dev-fallback`, `login-reachable-after-reset`, `reset-revokes-sessions`
  and `stale-session-selfheal`. `git diff --exit-code` on `email-escaping.test.ts`,
  `email-dev-fallback.test.ts` and `notify-emission.test.ts` exits 0.

## Known open items

- The remaining 17 `send()` call sites still pass three arguments after Task 1's commit, so
  `npx tsc --noEmit` is transiently red between commits. It goes green at Task 3.

---
*Phase: 15-auth-profile-transactional-email*
