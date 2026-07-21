---
phase: 07-bookings-management-cancellation-notifications
plan: 07
subsystem: notifications
tags: [inngest, email, notifications, reliability, zod, manage-03, wr-04]
requires:
  - notification
  - notificationType
  - NotificationPayload
  - recordAudit
  - isoUtc
provides:
  - NOTIFY_EVENT
  - NotifyEvent
  - NotificationRow
  - insertNotification
  - emitNotify
  - countUnread
  - listRecent
  - notificationPayloadSchema
  - notifyEventSchema
  - notificationTypeValues
  - NotificationTypeValue
  - notify
  - sendForType
  - notifyOnFailure
  - sendBookingCancelledByBooker
  - sendBookingCancelledByHost
  - sendRefundIssued
  - sendReminderPreExpiry
  - sendReminderPreSession
  - sendReminderPreSla
affects:
  - src/lib/db/schema.ts
  - src/lib/booking/bookings-query.ts
  - src/lib/email.ts
  - src/app/api/inngest/route.ts
tech-stack:
  added: []
  patterns:
    - "Event-triggered Inngest function: createFunction({id, retries, triggers:[{event}], onFailure}, handler)"
    - "Two memoized steps as a reliability ordering — durable write first, best-effort send second"
    - "Zod discriminated union mirroring a TS union, welded by a compile-time Equals<> parity assertion"
    - "Self-swallowing emitter: transport errors logged, never rethrown into the caller's action"
    - "Exhaustive switch closed by a trailing `never` assignment instead of a fallback clause"
key-files:
  created:
    - src/lib/validation/notification.ts
    - src/lib/notifications.ts
    - src/inngest/functions/notify.ts
    - tests/notifications/notify.test.ts
  modified:
    - src/lib/db/schema.ts
    - src/lib/booking/bookings-query.ts
    - src/lib/email.ts
    - src/app/api/inngest/route.ts
decisions:
  - "D-91: the payload is the SOLE input to both channels, so a field the email needs lives in the payload — three fields added rather than a second parallel structure"
  - "The Inngest trigger reads the shared NOTIFY_EVENT constant, not a string literal, so trigger and emitter cannot drift"
  - "href is scheme-validated at the write boundary: escapeHtml does not stop a javascript: scheme, and the row is durable"
  - "notifyEventSchema refines type === payload.type so the indexed column and the jsonb discriminant cannot disagree"
metrics:
  duration: ~55m
  completed: 2026-07-21
  tasks: 3
  commits: 3
---

# Phase 7 Plan 07: Notification Layer Summary

The MANAGE-03 async notification layer: one `fitout/notify` Inngest event fans out to a durable in-app row and an email in two independently-memoized steps, with a `needs_attention` audit row on retry exhaustion — closing WR-04, open since Phase 2.

## What Was Built

**Task 1 — the write boundary and the service** (`b9a6090`). `src/lib/validation/notification.ts` carries an 11-member Zod discriminated union mirroring `schema.ts`'s `NotificationPayload`, plus `notifyEventSchema` for the full wire body. `src/lib/notifications.ts` exports `insertNotification` (the single validated write boundary), `emitNotify` (self-swallowing), `countUnread` (partial index) and `listRecent` (owner-scoped, hard-capped, timestamps hydrated at the boundary).

**Task 2 — the fan-out** (`4c90f78`). `src/inngest/functions/notify.ts` is the repo's first event-triggered Inngest function: `write-notification` then `send-email`, each its own step. `sendForType` is an exhaustive switch with no fallback clause. `notifyOnFailure` writes the D-90 audit entry. `email.ts` gained six new sends (+25 `escapeHtml` calls) and its contract header's fire-and-forget rule was replaced with the D-83 rule. `notify` joined the `functions: []` array.

**Task 3 — the tests** (`5e50d7f`). Ten cases against a real isolated schema, covering all seven the plan named plus three additions (the wire-contract constant, the `javascript:` href refusal, the `listRecent` cap).

## The Two Guarantees the Phase Goal Names

**"Never blocks the booking transaction"** is proven, not asserted (test 6): `inngest.send` is mocked to reject and `emitNotify` still resolves, logging without the payload or the recipient address. The rationale is written into the module — the caller has already committed a money/state change, so a notification is an amplifier of that fact and never a precondition for it.

**Idempotency** is proven by test 2: `write-notification` runs once and `send-email` runs twice (exactly what Inngest does on a retry, since a completed step is memoized), and `SELECT count(*) FROM notification WHERE booking_id = $1` is 1. The `notification` row is the dedupe record, written in step 1; the email cannot rewrite it because it lives in step 2.

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Email fields the payload lacked | Added them to `NotificationPayload` rather than passing a second structure alongside it | D-91's value is that ONE event feeds both channels. A parallel "email args" object would reintroduce exactly the drift D-91 exists to prevent. See Deviation 1. |
| Inngest trigger string | `triggers: [{ event: NOTIFY_EVENT }]`, the shared constant | A typo between the trigger literal and the emit literal would enqueue events nothing listens for — and `emitNotify` swallows by design, so nothing would ever surface it. The constant makes the class of bug impossible. Costs the plan's literal-grep criterion (see Plan-Text Inaccuracies). |
| `href` validation | Scheme-checked (`/`, `http://`, `https://`) at the write boundary | `escapeHtml` stops attribute breakout but leaves `javascript:` intact. The row is durable and will be rendered by Plan-14 surfaces that do not exist yet, so the refusal has to happen at write time, not render time. |
| Zod/TS union drift | A compile-time `Equals<>` parity assertion | Two hand-maintained lists that merely LOOK synchronised is the failure mode. Without the assertion, adding a field to the TS union and forgetting the Zod one compiles, lints, and then silently strips that field on its way into `jsonb`. |
| Exhaustiveness | Trailing `const unhandled: never` instead of `default:` | A fallback clause turns "new notification type nobody mapped" into a silent runtime no-op with a green suite. As written it is a build error. |
| `isoUtc` | Exported from `bookings-query.ts` and imported | One `to_char` mask in the repo. A second copy is a second thing to get subtly wrong, and the failure is invisible until real rows exist — the exact contract 07-06 established. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Three fields added to `NotificationPayload` — OUT of `files_modified`**
- **Found during:** Task 2, writing `sendForType`
- **Issue:** The 07-01 payload union was designed for the in-app dropdown and is **not sufficient for the email channel** — the dispatch could not be written faithfully. Three concrete gaps: `sendBookingConfirmed` needs a booking reference and `booking_confirmed` had none; `sendNewRequestToHost` needs the guest-pays total and `new_request_to_host` carried `respondByLabel` but no `totalLabel`; `sendRequestDeclined` needs the `expired` copy variant and nothing in the payload distinguished an SLA lapse from a host decline. Without these the dispatch would have had to either invent a second data path or silently email the wrong copy.
- **Fix:** Added `booking_confirmed.referenceLabel`, `new_request_to_host.totalLabel`, and `request_declined.expired` to `schema.ts`'s `NotificationPayload`, each with a comment tying it to the D-91 sufficiency rule (which is now written into the union's header). **Required, not optional** — nothing in the repo writes a `NotificationPayload` yet (verified by grep before changing), so required is safe and strictly stronger: the Zod boundary now guarantees the email always has what it needs.
- **Migration impact:** none. `payload` is `jsonb`; the TS union is a compile-time view over it.
- **Note on `expired`:** it is a boolean in a union documented as "display strings only". This is deliberate and commented — the two declined variants are two different sentences, not two values of one sentence, so it cannot be a label.
- **Files modified:** `src/lib/db/schema.ts`
- **Commit:** `b9a6090`

**2. [Rule 2 - Security] `href` scheme validation at the write boundary**
- **Found during:** Task 1, reading the plan's threat register (T-07-36)
- **Issue:** The plan bounds every payload field with `.min(1)/.max(200)` and relies on `escapeHtml` (email) plus React auto-escaping (in-app) for XSS. Neither stops a `javascript:` or `data:` URI in the CTA `href` — escaping preserves the scheme perfectly and React renders `<a href>` without scheme checks. The notification row is durable and will be rendered by surfaces not yet written (Plan 14).
- **Fix:** A dedicated `href` schema requiring a root-relative path or an `http(s)` URL. Test 4b asserts a `javascript:` href is refused and no row is written.
- **Files modified:** `src/lib/validation/notification.ts`
- **Commit:** `b9a6090`

**3. [Rule 2 - Correctness] `notifyEventSchema` refines `type === payload.type`**
- **Found during:** Task 1
- **Issue:** The plan's `notifyEventSchema` validates `type` and `payload` independently. `type` is stored in the indexed `notification.type` COLUMN while `payload.type` is the `jsonb` discriminant the renderer switches on. Nothing stopped them disagreeing, and a row that filters as one kind and renders as another is a silent, permanent inconsistency in durable history.
- **Fix:** An object-level `.refine` checking equality once, at the boundary, rather than trusting eleven future call sites to keep them aligned.
- **Files modified:** `src/lib/validation/notification.ts`
- **Commit:** `b9a6090`

**4. [Rule 3 - Blocking] `isoUtc` exported from `bookings-query.ts` — OUT of `files_modified`**
- **Found during:** Task 1, writing `listRecent`
- **Issue:** `listRecent` reads two `timestamptz` columns through `dbConn.execute`, which returns them as Postgres TEXT — the repo contract 07-06 established. The `to_char` mask that fixes it was private to `bookings-query.ts`.
- **Fix:** Changed `function isoUtc` to `export function isoUtc` and documented it as the repo's single timestamp-boundary mask. No behaviour change; the alternative was a second copy of the mask, which is what the contract warns against.
- **Files modified:** `src/lib/booking/bookings-query.ts`
- **Commit:** `b9a6090`

### Deliberate Divergences from the Plan Text

**5. Zod 4 idiom.** The plan specifies `z.string().email()`. This repo is on Zod 4, where the top-level `z.email()` is the correct form (`src/lib/validation/auth.ts:5` carries the note explicitly). Used `z.email()`.

**6. `sendBookingCancelledByBooker` takes `bookerLabel`, not `refundLabel`.** The plan lists `(to, spaceTitle, whenLabel, refundLabel, url)` for the email **to the host**. The host has no interest in the booker's refund amount — it is the booker's side of the transaction — and the `booking_cancelled_by_booker` payload carries `bookerLabel`, not `refundLabel`, so the plan's signature could not be satisfied from the payload anyway. The send now tells the host **who** cancelled and that the window is free again. The booker-facing `sendBookingCancelledByHost` does state the full refund plainly, as specified.

**7. Two reminder sends take their pre-composed deadline label.** `sendReminderPreExpiry` takes `payByLabel` and `sendReminderPreSla` takes `respondByLabel` — both fields the payload already carries. This matters for pre-SLA specifically: under D-96 a cap-shortened SLA means the real deadline is frequently **not** `APPROVAL_SLA_HOURS` from now, so rendering the config hour value would be wrong on exactly the short-notice requests where the reminder matters most.

### Plan-Text Inaccuracies (no code impact)

- **Task 2 criterion** `grep -c 'triggers: \[{ event: "fitout/notify" }\]'` **returns 0**, because the trigger reads the shared `NOTIFY_EVENT` constant instead of the literal (see Key Decisions). `grep -c 'triggers: \[{ event: NOTIFY_EVENT }\]'` returns 1, and test "the wire contract is the single shared event name" asserts `NOTIFY_EVENT === "fitout/notify"`, so the substantive intent is covered more strongly than the literal grep would have.
- **Task 3 case 3** says "assert an `audit` row exists". **There is no audit table.** `recordAudit`'s v1 sink is a structured `console.info("[audit]", <json>)` line — `src/lib/audit.ts:8-13` documents this as a deliberate tradeoff. The test asserts against that sink, matching on entry SHAPE (which `audit.ts` says is intentionally stable), so it will keep passing unchanged if a durable sink is swapped in behind `recordAudit`.
- Two greps matched their own explanatory comments on first pass (`read_at IS NULL`, `enqueue_failed`, `db.transaction`, `default:`). Comments were reworded so every criterion now reads literally true without weakening the documentation.

## Verification Performed

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` (all 8 touched files) | clean |
| `npm run build` | exit 0 — **with the two documented env placeholders**, see below |
| `npx vitest run tests/notifications/notify.test.ts` | **10 passed**, exit 0 |
| `npx vitest run tests/notifications tests/booking` | **11 files / 103 tests passed**, exit 0 |
| **`npm test` (full suite)** | **66 files / 519 tests, all passing** (was 65/509 — this plan adds 1 file / 10 tests) |
| `grep -c "Fire-and-forget at every call site" src/lib/email.ts` | 0 |
| `grep -c "D-83" src/lib/email.ts` | 3 |
| `escapeHtml` count in `email.ts` | 24 → 49 (+25, criterion was ≥15) |
| `step.run("write-notification"` before `step.run("send-email"` | lines 245 / 248 ✓ |
| `grep -c "default:" src/inngest/functions/notify.ts` | 0 |

### On the build gate

`npm run build` failed twice on **pre-existing** fail-closed guards before succeeding: `PLATFORM_WALLET_NUMBER`/`PLATFORM_WALLET_NAME` (`src/lib/paymongo.ts`, added 05-02) and `INNGEST_SIGNING_KEY` (`route.ts`, added 05b). Both fire because Next 16 collects page data with `NODE_ENV=production` and this machine's `.env.local` lacks the production secrets. Neither is touched by this plan and the failing routes were `/api/paymongo/webhook` and `/api/inngest`'s pre-existing guard. This is the **exact issue 07-06 already logged** in `deferred-items.md`, in the same order; I reconfirmed it there rather than fixing it (relaxing a fail-closed money guard is not a drive-by change). With the two placeholders supplied, the build completes clean and lists all routes.

## Known Stubs

None in the delivered code — every export is fully implemented and tested.

**But be clear about scope:** this plan builds the layer and **wires no emitter to it**. Nothing in the running app currently calls `emitNotify`, so no notification row is produced and no email is sent through this path yet; the five existing `void sendXxx(...)` call sites are still fire-and-forget. That is the plan's stated design — *"This plan builds the infrastructure and the new sends; Plan 10 migrates the five existing call sites onto it, and Plan 13 adds the reminders that use it"* — and Plan 14 builds the dropdown that reads `countUnread`/`listRecent`. **MANAGE-03 is not observably satisfied end-to-end until Plan 10 lands.**

## Threat Flags

None. All new surface is covered by the plan's register (T-07-35..41): no new endpoints, no migration, no new trust boundary. Two mitigations landed **stronger** than specified — T-07-36 gained the `href` scheme refusal on top of `escapeHtml`, and T-07-38 gained the log-redaction assertions (test 6 asserts the failure log carries neither the payload nor the recipient's address).

## Commits

| Hash | Message |
|---|---|
| `b9a6090` | feat(07-07): notification payload validation + the notifications service |
| `4c90f78` | feat(07-07): the notify Inngest fan-out + six new email sends + registration |
| `5e50d7f` | test(07-07): fan-out, step memoization, onFailure and owner-scope invariants |

## For Downstream Plans

- **Plan 10 (migrate the five existing sends):** the contract is `emitNotify(event)` called **after commit, never inside `db.transaction`** — `notifications.ts` documents why (a rollback would leave an event already sent for a booking that does not exist). Do NOT call `email.ts` sends directly; `sendForType` is the only dispatcher. Note `request-expiry.ts:154` still calls `sendRequestDeclined` directly — 07-RESEARCH recommends converting it to an emit so expiry notices get in-app parity too.
- **Anyone emitting:** the payload must be **complete** — `referenceLabel`, `new_request_to_host.totalLabel` and `request_declined.expired` are REQUIRED and the Zod boundary throws without them. `href` must be a root-relative path or an `http(s)` URL. `type` must equal `payload.type`.
- **Plan 13 (reminders):** `sendReminderPreExpiry` and `sendReminderPreSla` take a **pre-composed deadline label**, not an hour count — compose it venue-local from the booking's actual `expires_at`, because D-96's cap makes the config constant wrong on short-notice requests.
- **Plan 14 (the bell + dropdown):** `countUnread(db, userId)` and `listRecent(db, userId, limit)` are ready and owner-scoped; `listRecent` is hard-capped at `NOTIFICATIONS_MAX_LIMIT` (20) and hydrates `createdAt`/`readAt` as real `Date`s. The renderer's switch over `payload.type` gets compile-time exhaustiveness free — keep it that way, and render payload strings as React text children only (never `dangerouslySetInnerHTML`).
- **Adding a notification type:** it is a **three-file change by construction** — the `notificationType` pgEnum + `NotificationPayload` union (`schema.ts`), the Zod union (`validation/notification.ts`, welded by the parity assertion), and the `sendForType` switch. Each omission is a compile error, not a silent gap. Do not add a fallback clause to make it easier.
- **Known bounded gap (accepted, documented in `notifications.ts`):** if `inngest.send()` itself fails, no notification is produced and `onFailure` never fires — the function never ran. Matches Phase-6 Assumption A6. The robust fix is a transactional outbox; deliberately deferred.

## Self-Check: PASSED

All four created files verified present on disk and all three commit hashes verified in `git log`.
