---
phase: 27-app-subdomain-marketing-website
plan: "18"
status: complete
subsystem: contact-quota
requirements-completed: []
completed: 2026-10-10
---

One additive Contact quota table now reserves per-IP and global rolling budgets
atomically before delivery. A transaction-scoped global advisory lock, database
time read after lock acquisition, bounded SQL/lock timeouts and expiring HMAC
identities enforce five attempts per fifteen minutes and one hundred per hour
across instances. Corruption or unavailable storage returns 503 before mail;
exhausted budgets return 429 with bounded Retry-After. Reservations are never
refunded after ambiguous delivery. Existing authority, input, honeypot, sender
and Contact-off guards remain intact.

Code commit: `4d31a45ed4748d9f9e6efe3f1b4e7d38f59530c1`.
Focused Contact verification: 91/91 passed in four files, zero skips or DB leaks.
Full workspace typecheck: zero diagnostics. Owned ESLint and whitespace checks
passed. Offline evidence/runner verification: 120 passed, zero failed/skipped.
The manifest now captures all migration files and requires the quota SQL, journal
and snapshot in fresh runs while preserving historical manifest validity.

Tests include eight-backend same-IP/global races, rolling boundaries, retention,
six corrupt-state variants, database outage and real advisory-lock timeout, with
no mail on rejected/disabled requests. Actual schema-only Neon contention also
passed five admitted/three limited and left application tables empty; see
27-PREVIEW-ISOLATION-EVIDENCE.md for its explicit execution adaptation.

The generator first included unrelated prior manual migration changes because
the previous snapshot stopped at 0027. That SQL was caught before cloud apply
and retained as `playwright/.cache/phase27-08/contact-quota-generator-drift-20261010.sql`.
The final 0034 SQL contains only CREATE TABLE and CREATE INDEX. The new snapshot
records current schema including prior manual migrations; earlier migrations and
snapshots were not rewritten. A test typing failure was fixed and its failed log
retained before the clean typecheck. These failures were not relabeled.

Focused logs: `playwright/.cache/phase27-08/quota-contact-focused-20261010.log`
and `quota-types-repaired-20261010.log`. Six full checks of this new candidate
are running separately in Plan 20; this summary does not claim they passed.
No production migration, Contact enablement or requirement completion occurred.
Original 08/09 and all HOLDs remain pending.
