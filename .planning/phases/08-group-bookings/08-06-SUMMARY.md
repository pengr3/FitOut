---
phase: 08-group-bookings
plan: 06
subsystem: group-bookings
tags: [group-bookings, rsvp, server-actions, idor, owner-scope, token, rate-limit, notifications, inngest, vitest]

# Dependency graph
requires:
  - phase: 08-group-bookings (08-01)
    provides: booking_group / rsvp tables, the three partial-unique de-dup indexes (migration 0017), booking_group.voided_at
  - phase: 08-group-bookings (08-02)
    provides: claimSeat (the D-112 SELECT … FOR UPDATE seat-claim, mutation-verified) + makeInviteToken / makeManageToken
  - phase: 08-group-bookings (08-04)
    provides: group_rsvp_received / group_rsvp_confirmed / group_cancelled across the four compile-enforced files + the email-only fitout/guest-email fn
  - phase: 07-bookings-management
    provides: emitNotify's post-commit contract, the cancel-booking owner-gate skeleton, isoUtc/readDbNow's timestamptz-as-TEXT boundary, rate-limit.ts, recordAudit
provides:
  - "createGroup: owner + confirmed gated, capacity_snapshot read from the listing INSIDE the INSERT, ON CONFLICT idempotent"
  - "submitRsvp: the app's ONLY public session-less write — token-credentialed, DB-clock RSVP close, claimSeat is the sole 'full' arbiter"
  - "removeAttendee / regenerateLink: organizer-gated management; a freed seat takes the SAME group-row lock the claim takes"
  - "src/lib/group/rsvp.ts: owner-scoped roster/headcount/group reads + getGroupByToken's single frozen GROUP_INACTIVE state"
  - "src/lib/group/guest-notify.ts: GUEST_EMAIL_EVENT + emitGuestEmail, split out of the Inngest function module"
  - "D-121 auto-void + attendee fan-out wired into BOTH cancel paths"
  - "The D-117 opt-in email guard: only an address submitted on THIS request is ever emailed, rate-limited 3/hr by normalized address"
affects: [08-07 (group management RSC consumes getRoster/getHeadcount/getOwnedGroupByBooking), 08-08 (invite RSC consumes getGroupByToken + submitRsvp), 08-09 (UAT)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "An Inngest event NAME + its emitter live in a plain lib module, never in the function file (which registers at module scope)"
    - "A snapshot is frozen by INSERT … SELECT from the source table, so there is no read-then-write window and no request shape carrying the value"
    - "One frozen exported constant for a calm denial state, so two code paths cannot drift into an enumeration oracle"
    - "A destructive roster mutation takes the seat-claim's own row lock, so removals and claims serialise instead of interleaving"

key-files:
  created:
    - src/lib/validation/group.ts
    - src/lib/group/rsvp.ts
    - src/lib/group/guest-notify.ts
    - src/app/actions/group.ts
    - tests/group/group-owner-scope.test.ts
    - tests/group/group-lifecycle.test.ts
    - tests/group/guest-email-guard.test.ts
  modified:
    - src/app/actions/cancel-booking.ts
    - src/inngest/functions/guest-email.ts

key-decisions:
  - "getRoster/getHeadcount take the organizer id and put `b.booker_id = $organizerId` in the WHERE — the plan's prose delegated the scope to the caller, but the must_haves (and T-08-14) require a foreign row to be UNREADABLE, so the scope is in the statement AND the action gates as well"
  - "The event name GUEST_EMAIL_EVENT moved to src/lib/group/guest-notify.ts: importing it from the Inngest function module ran inngest.createFunction inside a server action's module graph (it broke outright under a mocked client, and in production would register a function from an action import)"
  - "The attendee confirmation fires ONLY for a 'yes' — the shipped copy on both channels is 'you're on the list', which would be a false statement to send to someone who just declined, and there is deliberately no declined notification type to invent"
  - "removeAttendee DELETEs the row rather than flipping it to 'no': 'removed by the organizer' and 'said they can't make it' are different facts, and the second would put words in the attendee's mouth on the roster"
  - "regenerateLink refuses on a VOIDED group — once a booking is cancelled its invites are dead (D-121), and a fresh working link to a session that is not happening is worse than none"
  - "The RSVP submit budget is keyed on the LINK and deliberately generous (30/60s); the anti-abuse control that matters is the per-address email budget (3/hr), because a real group of ten answering at once is the success case"
  - "The organizer is skipped in both fan-outs (their own RSVP does not ping them, and cancellation does not send them group_cancelled on top of their cancellation + refund notices)"

patterns-established:
  - "GROUP_INACTIVE: unknown = replaced = voided = cancelled-booking all return ONE frozen object; tests compare the four to EACH OTHER (and their key sets), never to a literal"
  - "The D-117 opt-in guard is structural, not a policy comment: the emitted address is derived from the request body, so no code path can read an address out of the roster to mail it"
  - "Post-commit consequence blocks on the cancel paths are individually guarded — a group-void failure raises needs_attention, never a 500 for a cancellation that already committed"

requirements-completed: [GROUP-01, GROUP-02, GROUP-03, GROUP-04, GROUP-05]

# Metrics
duration: 38min
completed: 2026-07-27
---

# Phase 8 Plan 06: Group Lifecycle & Actions Summary

**The group logic layer ships: a confirmed booking becomes an invitable group with a transactionally-frozen cap, a stranger holding the link can RSVP with no account at all, the organizer can free a seat or kill a leaked link, and cancelling the booking voids the invites and tells everyone who was coming — with IDOR and the token oracle both proven by mutation.**

## Performance

- **Duration:** ~38 min
- **Started:** 2026-07-27T18:44:00Z
- **Completed:** 2026-07-27T19:22:00Z
- **Tasks:** 3
- **Files:** 9 (7 created, 2 modified)

## Accomplishments

- **`createGroup` freezes the cap in ONE statement.** `capacity_snapshot` is `SELECT`ed from the listing joined to the booking *inside* the `INSERT`, so there is no read-then-write window a host's capacity edit could land in, and `createGroupSchema` has exactly one field — there is no request shape in which a client could propose a cap. `ON CONFLICT (booking_id) DO NOTHING` makes a double submit return the *existing* group rather than a second one or an error.
- **`submitRsvp` is the first public, session-less write in the app** and the token is the entire credential (GROUP-03/D-116). It never counts confirmed RSVPs and then decides — it calls `claimSeat` and renders whatever the `FOR UPDATE` lock returns, so the CLAUDE.md count-then-insert anti-pattern has no foothold. D-120 is evaluated by Postgres (`now() >= b.starts_at`, computed in the lookup query); there is no JS `Date` anywhere on the path.
- **The D-117 opt-in guard is structural, not a comment.** The only address ever emailed is the one on *this* request body. `tests/group/guest-email-guard.test.ts` case (3) is what proves it: an address already sitting in the `rsvp` table receives nothing when somebody else answers on the same link. A blank-email guest gets zero sends on any channel and the action returns `reachable: false` so the UI can say so honestly (G3).
- **D-121 fires on both cancel paths.** `voidGroupAndNotifyAttendees` sets `voided_at` (scoped `voided_at IS NULL`, so a repeat is a silent no-op) and fans out `group_cancelled` to accounts via `emitNotify` and to guests-with-email via `emitGuestEmail`. The refund math is untouched (D-114). The whole block is guarded — a notification outage raises `needs_attention` rather than 500-ing a cancellation whose money already moved.
- **The invite dies for real, and it dies quietly.** `regenerateLink` and cancellation both make the old token resolve *identically* to one that was never minted — the test drives it through the real `submitRsvp`, not off the column.
- **Full suite green:** `tests/booking/ group/ security/ notifications/` → **34 files / 347 tests, exit 0**. `npx tsc --noEmit` clean, `npx eslint src tests` 0 errors, `npm run build` exit 0 (27 routes, no env workaround).

## Task Commits

1. **Task 1 — validation/group.ts + rsvp.ts owner-scoped reads + the security test** — `69bd0fa` (feat)
2. **Task 2 — actions/group.ts (create / RSVP / remove / regenerate) + lifecycle & guard tests** — `08e6f84` (feat)
3. **Task 3 — D-121 auto-void + attendee fan-out on both cancel paths** — `396cb1d` (feat)

## Files Created/Modified

- `src/lib/validation/group.ts` — `rsvpSchema` (name required, email optional *including blank*, answer enum, **no quantity field** so "one RSVP = one person" is structural), `createGroupSchema`, id schemas, and a Crockford-20 `inviteTokenSchema`.
- `src/lib/group/rsvp.ts` — the read layer: `getGroupByToken`, `getOwnedGroupByBooking` / `getOwnedGroupById`, `getRoster`, `getHeadcount`, `listReachableYesAttendees`, `normalizeEmail`. Every organizer read carries `b.booker_id = $organizerId` in the WHERE; every timestamp goes through `isoUtc` and is hydrated once.
- `src/lib/group/guest-notify.ts` — `GUEST_EMAIL_EVENT` + `emitGuestEmail`, the guest sibling of `emitNotify`.
- `src/app/actions/group.ts` — the four server actions.
- `src/app/actions/cancel-booking.ts` — `voidGroupAndNotifyAttendees` + its two call sites.
- `src/inngest/functions/guest-email.ts` — now *imports and re-exports* the event name (08-04's import surface is unchanged).
- `tests/group/group-owner-scope.test.ts` (18) · `group-lifecycle.test.ts` (22) · `guest-email-guard.test.ts` (9).

## Mutation Verification

The plan's non-negotiable gate. Every predicate was deleted in turn, the suite re-run, and the file restored.

### `src/lib/group/rsvp.ts` → `tests/group/group-owner-scope.test.ts` (18 cases, 18 green)

| Mutation | Result |
|---|---|
| `getRoster` — drop `AND b.booker_id = $organizerId` | **2 failed** / 16 passed |
| `getHeadcount` — drop `AND b.booker_id = $organizerId` | **1 failed** / 17 passed |
| `getOwnedGroupByBooking` — drop `AND b.booker_id = $organizerId` | **1 failed** / 17 passed |
| `getOwnedGroupById` — drop `AND b.booker_id = $organizerId` | **1 failed** / 17 passed |
| `getGroupByToken` — drop `AND g.voided_at IS NULL` (the ORACLE) | **1 failed** / 17 passed |
| `getGroupByToken` — drop `AND b.status NOT IN ('cancelled','declined')` | **1 failed** / 17 passed |
| `listReachableYesAttendees` — drop the group scope | **2 failed** / 16 passed |
| `listReachableYesAttendees` — drop the reachability filter | **1 failed** / 17 passed |

### `src/app/actions/cancel-booking.ts` → `tests/group/group-lifecycle.test.ts` (22 cases, 22 green)

| Mutation | Result |
|---|---|
| Remove the auto-void call from `cancelBookingAsBooker` | **2 failed** / 20 passed |
| Remove the auto-void call from `cancelBookingAsHost` | **1 failed** / 21 passed |
| Weaken the `voided_at` UPDATE to a plain SELECT | **2 failed** / 20 passed |
| Remove the organizer self-skip (double-notify guard) | **1 failed** / 21 passed |

**The organizer self-skip mutation initially survived** — the fixture had no organizer who RSVP'd to their own group, so the guard was decorative as far as the suite could tell. A case was added (organizer answers their own link → no `group_rsvp_received` about themselves, and no `group_cancelled` on top of their own cancellation notices) and the mutation now goes red. This is the 07-14 lesson applied: a mutation that *survives* is the finding.

**Positive controls carry the whole file.** Every describe block also asserts exact id sets, exact counts, that an organizer genuinely *can* read their own roster/headcount, that a live token genuinely *does* resolve, and that a real guest-with-email genuinely *is* emailed once — so an implementation hardcoded to "return nothing, send nothing" fails these tests as loudly as a leaky one.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] The Inngest function module cannot be imported by a server action**

- **Found during:** Task 2, first run of `group-lifecycle.test.ts`
- **Issue:** the plan's interface note specified `inngest.send({name: GUEST_EMAIL_EVENT, …})` with `GUEST_EMAIL_EVENT` imported from `@/inngest/functions/guest-email`. That module calls `inngest.createFunction(...)` at **module scope**, so importing the constant drags the registration into the server action's module graph. Under the test's mocked client it failed outright (`inngest.createFunction is not a function`); in production it would register an Inngest function as a side effect of importing an action.
- **Fix:** created `src/lib/group/guest-notify.ts` holding `GUEST_EMAIL_EVENT` + a self-swallowing `emitGuestEmail`, exactly mirroring how `NOTIFY_EVENT`/`emitNotify` live in `notifications.ts` rather than in `inngest/functions/notify.ts`. `guest-email.ts` now imports and **re-exports** the name, so 08-04's public surface (and `tests/notifications/guest-email.test.ts`) is unchanged.
- **Consequence for the plan's grep criterion:** `grep -c "emitNotify\|inngest.send\|GUEST_EMAIL_EVENT" src/app/actions/group.ts` no longer matches the raw `inngest.send`, because the send now goes through `emitGuestEmail`. The equivalent grep `"emitNotify\|emitGuestEmail\|GUEST_EMAIL"` returns **8**, and every emit still occurs after `claimSeat` has returned.
- **Files:** `src/lib/group/guest-notify.ts` (new), `src/inngest/functions/guest-email.ts`, `src/app/actions/group.ts`
- **Commit:** `08e6f84`

**2. [Rule 1 — Bug] A trailing space in the optional email field failed a valid RSVP**

- **Found during:** Task 2, `guest-email-guard` normalization case
- **Issue:** `z.email()` rejects surrounding whitespace, and the schema validated before trimming. `"  Mia@Example.COM "` — an utterly routine mobile-autofill shape — returned "We couldn't save your RSVP", on the one field the product promises is optional and low-stakes. The `name` field was already `.trim()`ed; the email was not.
- **Fix:** `optionalEmail` now trims first and validates second, and still collapses every blank shape (absent / `""` / all-whitespace) to `undefined` so exactly one "no address" branch exists downstream. Case is deliberately left alone — lowercasing belongs to `normalizeEmail`, whose output is a de-dup *key* rather than a display string.
- **Files:** `src/lib/validation/group.ts`
- **Commit:** `08e6f84`

### Deliberate Interpretation

**`getRoster` / `getHeadcount` take the organizer id.** The plan's action prose said "owner scope enforced by the CALLER's `booking.bookerId` check", while its own `must_haves` truth (and threat T-08-14) requires "owner-scoped **in the WHERE** (a foreign row is UNREADABLE)". The must_haves won: the scope is inside every statement *and* the actions gate as well (defence in depth, the `cancel-booking.ts` discipline). This is what makes the four owner-predicate mutations above meaningful — with a caller-side filter there would have been no predicate to delete.

## Requirements Completed

- **GROUP-01** — a confirmed booking becomes a group with a server-frozen cap.
- **GROUP-02** — a crypto-random bearer invite link, rotatable, revocable.
- **GROUP-03** — a guest with no account can RSVP through the link.
- **GROUP-04** — the organizer reads roster + headcount, and nobody else can.
- **GROUP-05** — the seat-claim is the sole arbiter of a full group.

## Known Stubs

None. Every surface this plan owns is wired to real data; the *UI* that calls these actions is 08-07 (`/bookings/[id]/group`) and 08-08 (`/invite/[token]`), which is the plan's stated scope boundary, not a stub.

## Threat Flags

None. Every file touched is inside the plan's declared `<threat_model>` surface, and the four `mitigate` dispositions (T-08-14 IDOR, T-08-15 createGroup spoofing, T-08-16 the spam cannon, T-08-17 the token oracle, T-08-18 RSVP-after-start) are each implemented **and** covered by a test that a mutation can turn red.

## Notes for the Next Plan (08-07 / 08-08)

1. **`getGroupByToken` returns `{ active: false }` and nothing else** for unknown / replaced / voided / cancelled. Do **not** add a `reason` field to help the UI distinguish them — the indistinguishability *is* T-08-17, and `tests/group/group-owner-scope.test.ts` compares the four results' key sets to catch exactly that "improvement".
2. **`submitRsvp` returns `reachable: boolean`.** `false` means a blank-email guest: render the G3 disclosure ("this is your only confirmation — we don't have an email to reach you") and do **not** offer a "change my answer" affordance they cannot use.
3. **The roster deliberately carries `hasEmail`, never the address.** If a surface needs to display an attendee's email, that is a new decision about personal data, not a missing field.
4. **`createGroup` is idempotent and returns `alreadyExisted`** — the "Invite people" button can be double-clicked safely, and the caller can route straight to `/bookings/[id]/group` either way.
5. **`regenerateLink(groupId)` and `removeAttendee(rsvpId)`**, not booking ids — `getOwnedGroupByBooking` is the bridge from the RSC's `[id]` param to the group id.
6. **The top-up nudge (D-114) must check `extraHeadFee > 0` FIRST** (08-05 contract 6): `declared_pax` is NULL on every flat listing. `getOwnedGroupByBooking` already returns both `declaredPax` and `extraHeadFee` so the nudge needs no extra query.

## Self-Check: PASSED

All 7 created files and the SUMMARY exist on disk; all 4 commits (`69bd0fa`, `08e6f84`, `396cb1d`, `0f100b3`) are present in the repository history.
