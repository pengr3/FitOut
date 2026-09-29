---
phase: 26-settlement-aware-host-payouts
verified_at: 2026-09-29T10:49:56Z
scope: local-320px-host-surfaces
status: passed_with_intermittent_case
---

# Phase 26 local 320px browser verification

Docker Postgres was available. A fresh `fitout_visual_test` database was provisioned with the repository's guarded `db-test-setup.ts` script, and Drizzle migrations through 0033 applied successfully. Playwright booted its own Next development server against that isolated database. The shared development database and production database were not migrated. `PAYMONGO_SECRET_KEY` and `RESEND_API_KEY` were empty in the test process; no provider call, email, or transfer was made.

| Surface | Court | Grove | Result |
| --- | --- | --- | --- |
| `/host/earnings` | Passed | Passed | 2/2 in one run |
| `/host/bookings/[id]` | Passed | Passed | 2/2 in one run |
| `/host/bookings` | Passed | Passed on isolated rerun | 1/2 in first run, 1/1 rerun |

The existing `e2e/overflow-320.spec.ts` cases assert a populated route, no horizontal overflow at 320px, declared touch target sizes, and visible focus. The fixture uses long listing text and a host payout ledger row. The first Grove booking-list run reached the populated route but did not find its expected “Approve request from” button; Playwright skipped the following detail cases in that serial block. The same Grove booking-list case passed when run alone with a newly seeded fixture. This is an intermittent result, not evidence that the assertion should be removed. Booking detail was then run separately in both themes and passed.

The earlier `unrun-verify` entry in `.planning/WINDOWS.md` is resolved by the isolated database run. This local visual check does not validate live PayMongo account behavior, legal publication, or payout release.
