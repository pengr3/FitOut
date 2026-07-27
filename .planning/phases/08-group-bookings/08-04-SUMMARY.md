---
phase: 08-group-bookings
plan: 04
subsystem: api
tags: [notifications, inngest, resend, drizzle, postgres, enum, zod, email, xss]

# Dependency graph
requires:
  - phase: 07-bookings-management-cancellation-notifications
    provides: the fitout/notify fan-out, the four-file notification contract (pgEnum + TS union + Zod union + describeNotification), the notify/onFailure D-83/D-90 envelope, email.ts send/escapeHtml, safeHref render guard
  - phase: 08-group-bookings (08-01)
    provides: group-booking enums/tables/columns + migration 0017 (booking_group, rsvp)
provides:
  - Three group RSVP notification types (group_rsvp_received, group_rsvp_confirmed, group_cancelled) wired across all four compile-checked files with no default: clause
  - Three account-recipient email templates (sendGroupRsvpReceived/Confirmed, sendGroupCancelled) over the private send/escapeHtml
  - Migration 0018 (ALTER TYPE notification_type ADD VALUE — the 55P04-safe split half)
  - The email-only fitout/guest-email Inngest fn (retries:4 + onFailure, single send-email step, NO durable row) + sendGuestRsvpEmail, mounted in the serve route
affects: [08-06 (owns the D-117 opt-in-guarded emit sites for both channels), group-bookings emit wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Group notification types are ACCOUNT-only (they write a durable row); guest-with-email attendees route through a SEPARATE email-only Inngest fn that writes no row (RESEARCH Pitfall 2 / RESOLVED A2)"
    - "The email-only fn clones the D-83 retries:4 + onFailure envelope from notify.ts but drops the durable-row step — the absence of that step is the defining property"
    - "onFailure audit for the guest path records the KIND only, never the guest email address (T-07-38 / T-08-09)"

key-files:
  created:
    - src/inngest/functions/guest-email.ts
    - drizzle/0018_group_notification_types.sql
    - tests/notifications/guest-email.test.ts
  modified:
    - src/lib/db/schema.ts
    - src/lib/validation/notification.ts
    - src/inngest/functions/notify.ts
    - src/components/notifications/notification-item.tsx
    - src/lib/email.ts
    - src/app/api/inngest/route.ts
    - drizzle/meta/_journal.json
    - drizzle/meta/0018_snapshot.json
    - tests/notifications/notify.test.ts
    - tests/notifications/notification-render.test.tsx

key-decisions:
  - "D-122: group RSVP types added as the four-file compile-checked change with NO default: clause — every omission stays a compile error"
  - "RESOLVED A2 / Pitfall 2: guests (null user_id) get a separate email-only fitout/guest-email fn — NOT a nullable notification.recipientId — preserving one FK-safe write path"
  - "answer ('yes'|'no') on group_rsvp_received is a copy variant (two sentences, two icons), mirroring request_declined.expired — never a rendered label"
  - "0018 ONLY adds enum values; nothing in any migration USES them (first use is a runtime INSERT from 08-06's emitter) — the 55P04-safe split"

patterns-established:
  - "Guest-email path: email-only Inngest fn, no durable row, D-83 envelope preserved, address never logged"

requirements-completed: [GROUP-03, GROUP-04]

# Metrics
duration: 30min
completed: 2026-07-27
---

# Phase 8 Plan 04: Group RSVP Notification Infrastructure Summary

**Three group RSVP notification types wired across the four-file compile-checked contract (no `default:`), plus the email-only `fitout/guest-email` Inngest function that reaches account-less guest attendees without ever writing a durable row — migration 0018 ships the 55P04-safe enum split.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-07-27T17:40Z (approx)
- **Completed:** 2026-07-27T18:02:23+08:00
- **Tasks:** 2
- **Files modified:** 13 (3 created, 10 modified)

## Accomplishments
- Added `group_rsvp_received` / `group_rsvp_confirmed` / `group_cancelled` to the `notificationType` pgEnum + `NotificationPayload` union, the `notificationTypeValues` tuple + `notificationPayloadSchema`, `sendForType`, and `describeNotification` — all four files, `_PayloadUnionParity` weld left intact, no `default:` clause in either switch. `tsc --noEmit` exits 0, which proves no file was missed.
- Three thin account-recipient email templates (`sendGroupRsvpReceived`, `sendGroupRsvpConfirmed`, `sendGroupCancelled`) over the private `send`/`escapeHtml` — every interpolated field, including the guest-typed attendee name, is escaped (G6 / T-08-08); UI-SPEC §4 icons (UserRoundCheck/UserRoundX/CalendarCheck/CalendarX2).
- Migration 0018 (`ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS ...` per value) — applied to the live DB and confirmed idempotent (re-running the ADD VALUE skips with a NOTICE, no error). Nothing in any migration USES the new values, honoring the 55P04-safe split.
- New `fitout/guest-email` Inngest function: clones the D-83 `retries: 4` + `onFailure` envelope from `notify.ts` but has ONLY a send-email step and writes NO durable row — the FK-safe path for guests with an email but no `user.id` (RESEARCH Pitfall 2 / RESOLVED A2). Mounted in the `/api/inngest` serve list. `onFailure` records a `needs_attention` audit carrying the kind but NEVER the guest address (T-07-38 / T-08-09).

## Task Commits

Each task was committed atomically:

1. **Task 1: Four-file group notification types + email templates + migration 0018** - `6b19a77` (feat)
2. **Task 2: The email-only guest Inngest function (no durable row) + mount** - `abd521a` (feat)

**Plan metadata:** (this commit) (docs: complete plan)

## Files Created/Modified
- `src/lib/db/schema.ts` - Added the three group values to `notificationType` pgEnum + three `NotificationPayload` union members (attendeeLabel + answer copy variant; all hrefs absolute)
- `src/lib/validation/notification.ts` - Mirrored the tuple + Zod discriminated-union members (`answer: z.enum(["yes","no"])`); parity weld unchanged
- `src/inngest/functions/notify.ts` - Three `sendForType` cases, no `default:`; imports the new senders
- `src/components/notifications/notification-item.tsx` - Three `describeNotification` cases with UI-SPEC §4 icons, no `default:`
- `src/lib/email.ts` - `sendGroupRsvpReceived/Confirmed`, `sendGroupCancelled`, and `sendGuestRsvpEmail` (+ `GuestRsvpEmail` type) — all escapeHtml every field
- `src/inngest/functions/guest-email.ts` - NEW email-only fn + `GUEST_EMAIL_EVENT` + `guestEmailOnFailure`
- `src/app/api/inngest/route.ts` - Mount `guestEmail` in `serve({ functions: [...] })`
- `drizzle/0018_group_notification_types.sql` - The ADD VALUE half of the 55P04 split (hand-edited: unqualified type, IF NOT EXISTS)
- `drizzle/meta/_journal.json`, `drizzle/meta/0018_snapshot.json` - drizzle-kit generate output
- `tests/notifications/notify.test.ts` - Group dispatch block (yes/no/escaping/confirm/cancel/null-email)
- `tests/notifications/notification-render.test.tsx` - Group render block (escaped guest name, safeHref anchor) + exhaustive samples extended
- `tests/notifications/guest-email.test.ts` - NEW: event name, envelope (retries:4 + onFailure), G6 escaping, dev fallback, address-never-logged

## Decisions Made
None beyond the plan — the interface block, D-122, and RESOLVED A2 were followed as specified. The payload `answer` field was modeled as a copy variant (mirroring `request_declined.expired`) per the interfaces block.

## Deviations from Plan

None - plan executed exactly as written.

The one nuance worth recording: the Task-2 acceptance grep (`grep -cE 'write-notification|insertNotification' guest-email.ts` must be 0) initially matched explanatory prose in the file's header comments. The comments were reworded to describe the absent step as the "durable-row step" so the literal grep returns 0 — no code change, the function never had a durable-row write. This is a wording adjustment to satisfy the acceptance probe, not a behavioral deviation.

## Issues Encountered
- `drizzle-kit migrate` needs `DATABASE_URL`, which is in `.env.local` (not `.env`) and is not auto-loaded by drizzle-kit; exported it from `.env.local` for the migrate step. No project change required.
- `drizzle-kit generate` emitted the qualified type name without `IF NOT EXISTS`; hand-edited to the unqualified, idempotent form per the 0010 template and RESEARCH Pitfall 7 (as the plan directs).

## Known Stubs
None. This plan builds notification INFRASTRUCTURE (types, templates, dispatch, guest channel). The EMIT sites — the post-commit sends with the D-117 opt-in guard — are explicitly owned by 08-06 (which depends on this plan), not stubbed here. No component renders empty/placeholder data as a result.

## User Setup Required
None - no external service configuration required. The guest-email path reuses the existing Resend integration and works keyless via the `[email:dev]` console fallback in dev/test.

## Next Phase Readiness
- 08-06 can now emit `fitout/notify` for the three account-recipient group types and `fitout/guest-email` for guest-with-email attendees, applying the D-117 opt-in guard + rate-limit at the emit site.
- Contract for emitters: group hrefs must be ABSOLUTE (`${BETTER_AUTH_URL}/...`) and pass `safeHref`; blank-email guests get NO send; the guest onFailure audit must never carry the address.

## Self-Check: PASSED
- Commits `6b19a77`, `abd521a` present in git log.
- Files exist: `src/inngest/functions/guest-email.ts`, `drizzle/0018_group_notification_types.sql`, `drizzle/meta/0018_snapshot.json`, `tests/notifications/guest-email.test.ts`.
- Verification: `npx tsc --noEmit` exit 0; `npx vitest run tests/notifications/` 63/63 green; migration 0018 applied + idempotent; no `default:` in the two group switches; guest-email no-durable-row grep = 0.

---
*Phase: 08-group-bookings*
*Completed: 2026-07-27*
