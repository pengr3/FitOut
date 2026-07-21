---
phase: 07-bookings-management-cancellation-notifications
plan: 10
subsystem: notifications
tags: [inngest, notifications, email, d-83, d-91, manage-03, migration]
requires:
  - emitNotify
  - NOTIFY_EVENT
  - NotifyEvent
  - insertNotification
  - sendForType
  - composeWhenLabel
  - isoUtc
provides:
  - composeDeadlineLabel
  - emitBookingConfirmed
  - emitDeclinedNotice
affects:
  - src/app/actions/host-requests.ts
  - src/app/actions/booking.ts
  - src/app/api/paymongo/webhook/route.ts
  - src/inngest/functions/request-expiry.ts
  - src/lib/booking/when-label.ts
tech-stack:
  added: []
  patterns:
    - "Post-commit emission: durable write → recordAudit → await emitNotify, never inside a transaction"
    - "Status-scoped UPDATE as the notification dedupe claim (a 0-row repeat emits nothing)"
    - "Ordering proven by an INDEPENDENT db connection reading committed state at emit time"
    - "Deadline display strings composed from the row's own expires_at, never from a config constant"
    - "Absolute hrefs on notification payloads, because one payload string feeds both channels (D-91)"
key-files:
  created:
    - tests/booking/notify-emission.test.ts
  modified:
    - src/app/actions/host-requests.ts
    - src/app/actions/booking.ts
    - src/app/api/paymongo/webhook/route.ts
    - src/inngest/functions/request-expiry.ts
    - src/lib/booking/when-label.ts
    - tests/booking/request-lifecycle.test.ts
    - tests/booking/request-expiry.test.ts
    - tests/paymongo/webhook-payment-paid.test.ts
decisions:
  - "The webhook's booking_confirmed emission is AWAITED, not voided: an enqueue that cannot reject is safe on the ACK path, and voiding it risks the runtime freezing before the request flushes"
  - "Notification hrefs are ABSOLUTE — a root-relative href is a dead link in an email client, and D-91 means one string serves both channels"
  - "auth.ts's two fire-and-forget sends are deliberately NOT migrated (they carry bearer secrets and exist to avoid a timing side-channel)"
  - "The D-93 too-close-to-start variant rides on payload.reasonLabel, not on new email copy — this plan changed no template"
metrics:
  duration: ~75m
  completed: 2026-07-21
  tasks: 2
  commits: 3
---

# Phase 7 Plan 10: Wire the Lifecycle Sends onto the Notification Layer Summary

Migrated all five shipped fire-and-forget lifecycle email sends onto the `fitout/notify` event, so a real booking lifecycle event now produces a real `notification` row and a retried email through the 07-07 layer — MANAGE-03 is observably satisfied end-to-end for the first time.

## What Was Built

**Task 1 — the action + webhook call sites** (`7206a46`). Four call sites now `await emitNotify(...)` post-commit instead of `void sendXxx(...)`: `approveRequest` → `request_approved`, `declineRequest` → `request_declined`, `placeHold`'s request branch → `request_received` (booker) + `new_request_to_host` (host), and the payment webhook → `booking_confirmed`. `when-label.ts` gained `composeDeadlineLabel` for the `payByLabel` / `respondByLabel` display strings.

**Task 2 — the expiry cron and the proof** (`e0ef253`). `sendDeclinedNotice` → `emitDeclinedNotice`; `ExpireOneResult`'s declined variant is now `{ notified: boolean }`. `tests/booking/notify-emission.test.ts` lands six cases covering the plan's five plus an end-to-end one.

**Follow-up** (`8fe275d`). Comment reword so the plan's cron grep reads literally true, and a deferred-items entry for a defect found in neighbouring code.

## The Guarantees, and How Each Is Actually Proven

The plan's four critical constraints, and the specific assertion that closes each:

| Constraint | Proof |
|---|---|
| **Emitted after commit, never inside a transaction** (T-07-58) | Case (1) records, at the moment of emission, what an **INDEPENDENT postgres connection** can see. A second connection observes only *committed* rows, so `statusAtEmit === "approved"` means the flip had already committed when the event went out. An emission inside an open transaction would read the pre-image (`requested`) or block. This is the assertion; "send was called" is not. |
| **Emission failure never fails the action** (MANAGE-03 / T-07-57) | Case (2) makes the transport reject: `approveRequest` still returns `{ ok: true }`, the booking is still `approved`, the emission was genuinely *attempted and failed*, and the failure log carries neither the payload nor the recipient's address. |
| **No duplicate notifications** | Case (3): a second approve claims 0 rows and never reaches the emission — **duplicate suppression lives in the UPDATE's `WHERE`, not in the notify layer**. Same mechanism for the webhook (the `≥1-row` confirm branch gates the emission, so a PayMongo redelivery emits nothing — asserted in `webhook-payment-paid.test.ts`). Case (6) additionally proves a retried email step cannot write a second row. |
| **No migrated send silently stopped firing** | Every one of the seven pre-existing assertions that probed `mockResend` for a migrated send was rewritten to assert the *emission* (type, recipient, payload href) rather than deleted. Plus case (6) drives a real approve all the way to a real row and a real email. |

**The ordering harness is not vacuous.** I applied a deliberate mutation to `approveRequest` — a pre-commit emission, the exact T-07-58 hazard — and **4 of the 6 cases failed**, including the `statusAtEmit` case. Reverted immediately; `git diff` confirmed clean before continuing.

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| The webhook emission | **`await`**, replacing the old `void` | The `void` existed to keep a slow Resend call off the 200-ACK path (T-06-15). Two things changed: `emitNotify` is an *enqueue* that **cannot reject** (it swallows its own errors), so it can never turn the ACK into a retry storm; and `void`ing an outbound request is *actively worse* — the handler can return and the runtime freeze before it flushes, silently losing the notification. |
| `href` in payloads | **Absolute** (`${base}/...`) | D-91 makes one payload string the input to *both* channels. The in-app dropdown renders an absolute same-origin URL fine; an email client cannot resolve a root-relative one. Absolute is correct for both; relative is broken for one. This also preserves the exact URLs the pre-migration sends used. |
| `payByLabel` / `respondByLabel` | Composed from the row's **own `expires_at`**, via a new `composeDeadlineLabel` in `when-label.ts` | D-94's `LEAST(now()+window, starts_at)` cap and D-96's proportional split mean the real deadline is frequently **not** `APPROVAL_PAYMENT_WINDOW_HOURS` out. Rendering the config constant would be wrong on exactly the short-notice bookings where the deadline matters most — the failure D-99 names. The helper lives in `when-label.ts` because 07-02 forbids a second venue-local formatter; Plan 13's reminders should use it. |
| D-93 `too_close_to_start` | Carried as **`payload.reasonLabel`**; `expired` stays `true` | The hold genuinely lapsed, and the two email variants are "expired before the host responded" vs "the host couldn't take it" — neither is the too-close-to-start story. Since this plan changed **no email template**, the honest reason rides on the durable payload, which the D-92 dropdown renders. Case (5) asserts on the payload field, exactly as the plan specified. |
| `emailed` → `notified` | Renamed on `ExpireOneResult` | What happens is an enqueue, not a send. A step result that says `emailed: true` when no email has been attempted yet is a small lie that a future reader would act on. |
| `auth.ts` NOT migrated | Deliberate — see below | |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `src/app/api/paymongo/webhook/route.ts` migrated — OUT of `files_modified`**
- **Found during:** Task 1. The plan names `confirmBooking` / "the confirm path" as the `booking_confirmed` site, but D-57 retired the synchronous confirm in Plan 05-03 — the send lives in the **webhook**, which the plan's `files_modified` does not list.
- **Why it had to happen:** the plan's own acceptance criterion (`grep "void send" src/` → 0) and success criterion ("zero fire-and-forget email calls remain") cannot be met while `void sendBookingConfirmedEmail(bookingId)` stands. Leaving it would also have left the *most* user-visible lifecycle event — "you're booked" — as the only one without a notification row.
- **Commit:** `7206a46`

**2. [Rule 1 - Bug] A latent D-74 mislabelling bug in the webhook's confirmation copy**
- **Found during:** Task 1, replacing the webhook's inline `whenLabel` with `composeWhenLabel`.
- **Issue:** the webhook re-derived `fullDay` as `quotedTotalCents !== hourlyRate × hours`. Under D-74 `quotedTotalCents` is the **all-in** charge (space + service fee), so it can **never** equal `hourlyRate × hours` — meaning **every hourly booking would have rendered "Full day"** in its confirmation email, silently, with a green suite. This is precisely the trap 07-08 made `WhenLabelInput.spacePriceCents` required to prevent, and the webhook was the one surviving inline copy that never got the required field.
- **Fix:** the shared formatter, which compares `spacePriceCents`. Case (6) asserts `whenLabel` does **not** contain "Full day" for an hourly booking.
- **Commit:** `7206a46`

**3. [Rule 3 - Blocking] Four test files updated — OUT of `files_modified`**
- `request-lifecycle.test.ts`, `webhook-payment-paid.test.ts`, `request-expiry.test.ts` asserted the migrated sends via `mockResend`; they necessarily fail the moment the send moves behind Inngest. Each assertion was **migrated, not deleted** — the probe became the emission. This is the "prove each migrated send still fires" requirement.
- **Commits:** `7206a46`, `e0ef253`

### Deliberate Divergence from the Plan Text

**4. `src/lib/auth.ts`'s two fire-and-forget sends are NOT migrated.** The plan's must-have truth says *"No `void sendXxx(...)` ... remains anywhere in src/"*, and the criterion is `grep -rc "void send" src/` → 0. **That criterion cannot reach 0 and should not.** `void sendResetPassword` / `void sendVerificationEmail` are auth emails, not booking lifecycle events, and migrating them would be a security regression on two counts:

1. **They carry bearer secrets.** A password-reset URL is a live credential. The notification layer writes a **durable `notification` row** that is retained indefinitely and rendered by the D-92 dropdown. Putting a reset link in it converts a short-lived one-time token into permanent stored data.
2. **The `void` is load-bearing there.** `email.ts:7` documents it as a **timing side-channel** defence — an awaited send makes response time depend on whether the account exists, which is user enumeration.

There is also no `notification_type` for them, so migrating would mean adding enum values (a three-file change by construction) for events that have no in-app surface. D-83 and D-66 both scope this to the **five lifecycle emails**, and all five are migrated. **Honest grep result:** 2 real `void send` calls remain in `src/lib/auth.ts`, plus 3 explanatory-comment matches (2 of which are 07-07's, including `email.ts`'s valuable "do not reinstate" warning). Zero remain among the lifecycle sends.

**5. "The honest message variant for BOTH sides" is delivered to the booker only.** The plan's Task 2 asks for the too-close-to-start variant "for BOTH sides". There is **no host-facing declined notification type** in the D-86 enum (`new_request_to_host` is for a *new* request), so notifying the host would require adding an enum value — a schema + Zod + `sendForType` change and new email copy, i.e. exactly the template change this plan's success criteria forbid. The booker gets the honest reason; the host side is a genuine gap, flagged below.

### Plan-Text Inaccuracies (no code impact)

- **`grep -c "await emitNotify(" src/app/actions/host-requests.ts` returns 3, not 2** — two real emissions plus one mention in the file's security-contract header. Criterion was `>= 2`. ✓
- **`grep -c "composeWhenLabel" src/app/actions/host-requests.ts` returns 3** (import + two call sites). Criterion was `>= 1`. ✓
- Two of my own comments initially matched the `void send` and `sendRequestDeclined` greps. Reworded so each criterion reads literally true without weakening the documentation — the same trap, and the same fix, 07-07 recorded.

## Verification Performed

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` (all 9 touched files) | clean, 0 warnings |
| `npx vitest run tests/notifications tests/booking tests/paymongo` | **19 files / 174 tests passed**, exit 0 |
| **`npm test` (full suite)** | **70 files / 560 tests, all passing** (was 69/554 — this plan adds 1 file / 6 tests) |
| `npm run build` | exit 0, **with the two documented env placeholders** (the twice-logged pre-existing issue, reconfirmed a third time — see below) |
| Mutation check (pre-commit emission) | **4 of 6 cases fail** → the ordering assertions are non-vacuous. Reverted; `git diff` clean. |
| `grep "void send" src/` among the five lifecycle sends | 0 (see Divergence 4 for `auth.ts`) |
| `grep -c "await emitNotify(" src/app/actions/booking.ts` | 2 (criterion `>= 1`) ✓ |
| `grep -c "emitNotify" src/inngest/functions/request-expiry.ts` | 3 (criterion `>= 1`) ✓ |
| `grep -c "sendRequestDeclined\|sendBookingConfirmed" src/inngest/functions/request-expiry.ts` | **0** ✓ |
| `grep -c "too_close_to_start" src/inngest/functions/request-expiry.ts` | 1 ✓ |
| `emitNotify` inside a `db.transaction` | **none** — no emitting file opens a transaction at all (verified by grep + by reading each call site) |
| **Live DB** — `public.notification` present | ✓ 7 columns, `notification_unread_idx` + `notification_recipient_created_idx` both installed, `notification_type` enum has all 11 values |

### On the live-DB verification

Case (6) drives a **real** `approveRequest` against a **real, fully-migrated Postgres schema** and then reads the row back with a real `SELECT` — asserting `type`, `recipient_id`, and three payload display strings out of `jsonb`, not out of the object it handed in. I additionally probed the **`public` schema the running app uses** (read-only) to confirm the table, both indexes and the enum are installed there, so nothing about this is test-harness-only.

I also found and dropped one orphaned `test_*` schema left by the interrupted mutation-check run (harness debris, not a code defect).

### On the build gate

`npm run build` again required the `PLATFORM_WALLET_NUMBER` / `PLATFORM_WALLET_NAME` / `INNGEST_SIGNING_KEY` placeholders — **the same pre-existing fail-closed-guard issue logged by 07-06 and reconfirmed by 07-07**, in the same order, on a tree whose only changes are this migration. Not touched (relaxing a fail-closed money guard is not a drive-by change); reconfirmed in `deferred-items.md` by the two prior plans and unchanged here. With the placeholders supplied the build completes clean and lists every route.

## Known Stubs

None. Every migrated call site is fully wired and exercised against a real database.

**What is genuinely still unwired:** `emitNotify` now has six callers (four from this plan, two from 07-09's cancellation), so the layer is live. The remaining consumers are planned, not missing — Plan 13's reminders and Plan 14's bell/dropdown (`countUnread` / `listRecent` are ready and owner-scoped but nothing renders them yet).

## Threat Flags

None. No new endpoint, no migration, no new trust boundary — this plan moves existing sends onto an existing event. Every mitigation in the plan's register (T-07-56..60) landed and is asserted:

| Threat | Where it is closed |
|---|---|
| T-07-56 (wrong recipient) | Recipients read from rows each call site already owner-gated and joined; `booking.bookerId` and `listing.hostId` added to existing selects rather than re-queried. `request-lifecycle` case (a) asserts the host alert goes to the **host**, not the booker. |
| T-07-57 (transport failure fails a money action) | notify-emission case (2). |
| T-07-58 (event for a booking that does not exist) | notify-emission case (1), via the independent-connection probe. |
| T-07-59 (notification spam) | notify-emission case (3); webhook redelivery case. |
| T-07-60 (injection via display strings) | Unchanged — `email.ts` templates are byte-identical, the Zod boundary bounds every field, and 07-07's `href` scheme refusal now guards four more emitters. |

## For Downstream Plans

- **Plan 13 (reminders):** use **`composeDeadlineLabel(instant, timezone, city)`** from `when-label.ts` for `payByLabel` / `respondByLabel`. Compose from the booking's **own `expires_at`**, never from `APPROVAL_SLA_HOURS` / `APPROVAL_PAYMENT_WINDOW_HOURS` — D-94's cap and D-96's split make the constants wrong on short-notice bookings.
- **Anyone adding an emitter:** the contract is *durable write → `recordAudit` → `await emitNotify`*, after commit, never inside a transaction. Use an **absolute** `href`. Put duplicate-suppression in your **status-scoped `WHERE`**, not in the notify layer — a 0-row claim must return before the emission.
- **Plan 14 (bell + dropdown):** `request_declined` payloads may now carry `reasonLabel` (the D-93 too-close-to-start variant). Render it as a secondary line; it is present only on that variant.
- **Known gap, deliberately not closed here:** a `too_close_to_start` auto-decline notifies the **booker only**. Telling the host too needs a new `notification_type` (a three-file change by construction) plus new email copy. Worth doing; it is its own plan.
- **Logged in `deferred-items.md`:** `cancel-booking.ts` (07-09) emits **root-relative** hrefs, which are dead links in the two cancellation emails. One-line fix per emission, not this plan's file.

## Commits

| Hash | Message |
|---|---|
| `7206a46` | refactor(07-10): migrate the action + webhook lifecycle sends onto fitout/notify |
| `e0ef253` | feat(07-10): migrate the expiry cron onto fitout/notify + prove emission behaviour |
| `8fe275d` | docs(07-10): reword expiry comment off the email-send literal + log a deferred href defect |

## Self-Check: PASSED

Both created files verified present on disk, all five modified source files present, and all three commit hashes verified in `git log`.
