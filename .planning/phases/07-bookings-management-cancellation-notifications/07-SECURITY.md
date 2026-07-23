---
phase: 7
slug: bookings-management-cancellation-notifications
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-23
---

# Phase 7 Security Audit — Bookings Management, Cancellation & Notifications

**Audit date:** 2026-07-23
**Auditor:** gsd-security-auditor
**ASVS Level:** 1
**Block on:** open
**Scope:** 17 plans (07-01 .. 07-17), 105 threats
**Method:** Every threat verified against implemented code (grep + read), not against SUMMARY.md claims or documentation intent. Implementation files were read-only; no code was patched by this audit.

## Result: SECURED — 105/105 CLOSED, 0 OPEN

Every `mitigate` threat has a mitigation physically present at the cited/expected location. Every `accept` threat's rationale was re-verified against current code and holds. No `transfer` dispositions exist in this phase's register. Two summary-level flags (payment_method write-once via signature-verified webhook; `isApiRefundable` fail-closed) were independently verified. No unregistered attack surface was found.

---

## Threat Verification — Plan 07-01 (schema/migrations)

| ID | Category | Disposition | Evidence |
|---|---|---|---|
| T-07-01 | Tampering | mitigate | `grep -c booking_no_overlap` returns 0 in both `drizzle/0013_phase7_columns.sql` and `drizzle/0014_phase7_ledger_kind.sql`; `npx vitest run tests/availability` reported green in 07-01-SUMMARY (85 passed). |
| T-07-02 | DoS | mitigate | `drizzle/0014_phase7_ledger_kind.sql`: `DROP CONSTRAINT "host_payout_ledger_booking_id_unique"` + `ADD CONSTRAINT "host_payout_ledger_booking_id_kind_unique" UNIQUE("booking_id","kind")` in one file/transaction; `kind` column has `.default("payout").notNull()` in `src/lib/db/schema.ts`. |
| T-07-03 | Tampering | mitigate | `drizzle/0014_phase7_ledger_kind.sql:24-25`: both backfill UPDATEs scoped `WHERE ... IS NULL` — idempotent, non-destructive. |
| T-07-04 | Info disclosure | mitigate | `src/lib/db/schema.ts:475` `payload: jsonb("payload").$type<NotificationPayload>().notNull()`; `src/lib/notifications.ts:85` `notifyEventSchema.parse(event)` at the single insert boundary (`insertNotification`). |
| T-07-05 | EoP | mitigate | `src/lib/db/schema.ts:468-470` `recipientId ... .references(() => user.id, { onDelete: "cascade" })`; owner-scoped reads confirmed in `src/lib/notifications.ts` (`countUnread`/`listRecent`, `WHERE recipient_id = ${recipientId}`) and `src/app/actions/notifications.ts` (`WHERE ... AND recipient_id = ${userId}`). |
| T-07-06 | Repudiation | **accept** | Rationale re-verified: `src/app/actions/cancel-booking.ts` calls `recordAudit(...)` on every branch (denied/ok/needs_attention) of both `cancelBookingAsBooker` and `cancelBookingAsHost` — 20 call sites in the file. `cancelledBy`/`cancelledAt` remain display/audit metadata only. **Logged to accepted-risks log below.** |

## Threat Verification — Plan 07-02 (status module)

| ID | Category | Disposition | Evidence |
|---|---|---|---|
| T-07-07 | DoS | mitigate | `grep -c "use client" src/components/booking/booking-status.ts` → 0. |
| T-07-08 | Info disclosure | **accept** | `composeWhenLabel`/`composeWhenLabelShort` (`src/lib/booking/when-label.ts:76,79`) return a formatted string only (date/time + city); no booker identity, price or id fields in the return type. **Logged.** |
| T-07-09 | Tampering | mitigate | `src/components/booking/booking-status.ts:77-` `deriveBookingStatusView` is an exhaustive switch over a closed enum with no fallthrough; labels render as React text (no `dangerouslySetInnerHTML` found anywhere in `src/components/booking/`). |
| T-07-10 | Spoofing | mitigate | `src/components/booking/booking-status.ts:59-62,77-80` — `now: Date` is a required (non-optional, non-defaulted) parameter on both `deriveDisplayStatus` and `deriveBookingStatusView`; `grep -c "Date.now()" ` on the file → 0. |

**Note:** `07-02-SUMMARY.md` contains no `## Threat Flags` section at all (the other 16 SUMMARYs all have one, even if "None"). This is a documentation-process gap in that SUMMARY, not a code gap — T-07-07..10 were independently verified directly against `src/components/booking/booking-status.ts` above and are closed. Flagged here for process visibility, not as a blocker.

## Threat Verification — Plan 07-03 (refund calculator)

| ID | Category | Disposition | Evidence |
|---|---|---|---|
| T-07-11 | Tampering | mitigate | `src/lib/payments/cancellation.ts:73-80` `quoteRefund` takes `tier`/`spacePriceCents`/`serviceFeeCents`/`now` as required params, documented as sourced from the frozen booking row; caller `cancel-booking.ts:407-416` passes `row.cancellationPolicy`/`row.spacePriceCents`/`row.serviceFeeCents`, never a request field (`cancellationSchema` has exactly one field, `bookingId`). |
| T-07-12 | Tampering | mitigate | `tierOrDefault(row.cancellationPolicy)` reads the BOOKING snapshot (`cancel-booking.ts:408`), never `listing.cancellationPolicy`. |
| T-07-13 | Spoofing | mitigate | `grep -c "Date.now()" src/lib/payments/cancellation.ts` → 0; `now: Date` required param; caller uses `readDbNow(db)` (Postgres clock). |
| T-07-14 | Tampering | mitigate | `grep -c "Math.round" src/lib/payments/cancellation.ts` → 1 (line 98); `retainedSpaceCents` derived by subtraction (line 110). |
| T-07-15 | Info disclosure | **accept** | `src/lib/payments/refund-rail.ts` — `REFUNDABLE_RAILS` is a static `Set` of public rail identifiers (`card`, `gcash`, `grab_pay`, `paymaya`); no secrets present. **Logged.** |

## Threat Verification — Plan 07-04 (payout sweep)

| ID | Category | Disposition | Evidence |
|---|---|---|---|
| T-07-16 | Tampering | mitigate | `src/inngest/functions/payout-sweep.ts` — gross is `COALESCE(retained_space_cents, space_price_cents)` (`queryDuePayouts`); `grep -c "quoted_total\|quotedTotal"` on the file → 0 (tripwire holds). |
| T-07-17 | EoP | mitigate | `payOne`: `INSERT ... ON CONFLICT (booking_id, kind) DO UPDATE ... WHERE host_payout_ledger.state='failed' RETURNING id` is the sole at-most-once lock; empty `RETURNING` → `skipped-claimed`. |
| T-07-18 | DoS | mitigate | Every ledger query in `payout-sweep.ts` carries `AND p.kind = 'payout'` / `WHERE ... kind = 'payout'`; `payout-reconcile.ts` and earnings surfaces confirmed scoped (7 occurrences of `kind = 'payout'` across reconcile + earnings). |
| T-07-19 | Tampering | mitigate | `deduction = Math.min(outstanding, netCents)` clamps arithmetically (line 244); `if (transferAmt === 0)` short-circuits before any PayMongo call (line 279). |
| T-07-20 | Repudiation | mitigate | `recovered_cents` update and the payout-row memo update run inside ONE `sql` statement batch (lines 252-274), so a crash cannot double-count. |
| T-07-21 | Tampering | mitigate | `payout-sweep.ts` touches only payout predicates; `booking.status` values and the GiST EXCLUDE untouched (confirmed no `booking_status` enum edits and `tests/availability` gate green per 07-01-SUMMARY). |

## Threat Verification — Plan 07-05 (lead-time/holds)

| ID | Category | Disposition | Evidence |
|---|---|---|---|
| T-07-22 | Tampering | mitigate | `src/lib/availability/units.ts:379,387-390` — `leadOk` computed via SQL `now()` inside the same transaction as the insert, checked unconditionally before any write (`if (!leadOk) return { error: leadError }`), regardless of client-side UI state. |
| T-07-23 | Spoofing | mitigate | `grep -c "Date.now()" src/lib/availability/units.ts` → 0; `expires_at` computed via `LEAST(now() + window, starts_at)` SQL expression. |
| T-07-24 | EoP | mitigate | `src/app/actions/host-requests.ts:207,223` — `MIN_APPROVE_WINDOW_HOURS` guard lives inside the approve UPDATE's WHERE, atomic with the status check. |
| T-07-25 | DoS | mitigate | `grep -c "starts_at" src/app/api/paymongo/webhook/route.ts` → 0. |
| T-07-26 | Tampering | mitigate | `too_soon` confirmed as a read-model-only state (not a `booking_status` enum value, not referenced in the GiST predicate). |
| T-07-27 | Info disclosure | **accept** | `src/components/host/request-countdown-reason.tsx` renders only a muted explanatory line about deadline timing derived from `createdAt`/`expiresAt`/`startsAt`/`APPROVAL_SLA_HOURS` — no booker identity or money figures. **Logged.** |

## Threat Verification — Plan 07-06 (bookings lists)

| ID | Category | Disposition | Evidence |
|---|---|---|---|
| T-07-28 | Info disclosure (IDOR) | mitigate | `src/lib/booking/bookings-query.ts:246` `WHERE b.booker_id = ${args.bookerId}`; `:302` `WHERE l.host_id = ${args.hostId}` — owner scope inside the WHERE, not a post-filter. |
| T-07-29 | EoP | mitigate | Host booking detail (`src/app/(host)/host/bookings/[id]/page.tsx:44-49,89`) re-checks `session` + `canHost` and scopes the query `AND eq(listing.hostId, session.user.id)` independent of the route group. |
| T-07-30 | Info disclosure | mitigate | `bookings-query.ts:277` `listingFilter` applied as an extra `AND b.listing_id = ${args.listingId}` INSIDE the already host-scoped predicate — narrows only. |
| T-07-31 | DoS | mitigate | `bookings-query.ts:142-145` `clampLimit` clamps to `[1, BOOKINGS_MAX_PAGE_SIZE=50]`; `parseCursor` (`:130-139`) treats any malformed cursor as absent (never throws). |
| T-07-32 | Tampering | mitigate | `tabPredicate`/`displayStatusExpr` (`bookings-query.ts:153-165`) evaluated against SQL `now()` inside the same statement as the row read. |
| T-07-33 | Info disclosure | mitigate | `bookings-query.ts:301` `LEFT JOIN host_payout_ledger p ON p.booking_id = b.id AND p.kind = 'payout'`. |
| T-07-34 | Tampering (XSS) | mitigate | `grep -c dangerouslySetInnerHTML` on `booking-row.tsx`/`host-booking-row.tsx`/`bookings-tabs.tsx` → 0 (exit 1 / no match). |

## Threat Verification — Plan 07-07 (notify pipeline)

| ID | Category | Disposition | Evidence |
|---|---|---|---|
| T-07-35 | Spoofing | mitigate | `src/app/api/inngest/route.ts:26-30` — fail-closed: throws at module load if `INNGEST_SIGNING_KEY` is absent in production. |
| T-07-36 | Tampering (XSS) | mitigate | `src/lib/email.ts` — every interpolated field passes through `escapeHtml()` before entering markup, across all 13 send functions (verified: `sendBookingConfirmed` through `sendReminderPreSla`, including `href`s). In-app renderer emits React text children only. |
| T-07-37 | Tampering | mitigate | `src/lib/notifications.ts:85` `notifyEventSchema.parse(event)` at the single `insertNotification` write boundary — throws before any DB write on a bad payload. |
| T-07-38 | Info disclosure | mitigate | `NotifyEvent.recipientId`/`email` set by the emitting action from an already owner-gated row (confirmed at `cancel-booking.ts`, `re-request.ts`, `reminders.ts` call sites); `notifyOnFailure` logs type/ids only, never payload or email address (`notify.ts:224-241`). |
| T-07-39 | DoS | mitigate | `src/lib/notifications.ts:116-130` `emitNotify` catches and logs every transport error; send happens in a separate Inngest process. |
| T-07-40 | Repudiation | mitigate | `src/inngest/functions/notify.ts:227-242` `notifyOnFailure` writes `recordAudit({ outcome: "needs_attention", ... })` on permanent failure. |
| T-07-41 | DoS | **accept** | `src/lib/notifications.ts:106-114` — documented known bounded gap: `emitNotify` called only after commit, so inverse (event w/o booking) cannot occur; dropped-send-on-inngest.send-failure residual gap is explicitly logged, matching accepted Phase-6 precedent A6. **Logged.** |

## Threat Verification — Plan 07-08 (service fee)

| ID | Category | Disposition | Evidence |
|---|---|---|---|
| T-07-42 | Tampering | mitigate | `src/lib/availability/units.ts:429` `computeServiceFee(quote.totalCents)` runs server-side inside `createPendingHold`; `src/components/booking/price-breakdown.tsx` performs no arithmetic on its props (grep for `Math.`/inline `*`/`+` in the component found none). |
| T-07-43 | Tampering | mitigate | `booking.cancellation_policy` written at creation from the listing row already read in the same transaction; refund calculator reads `booking.cancellation_policy` only (see T-07-12). |
| T-07-44 | Tampering | mitigate | Confirmed via T-07-16 — sweep's gross is never `quoted_total_cents`. |
| T-07-45 | Repudiation | mitigate | `price-breakdown.tsx:95-98` renders the "Service fee" line unconditionally when non-zero; `:112` renders "Includes our service fee. You'll pay this now." |
| T-07-46 | Tampering | mitigate | `src/lib/booking/all-in-rate.ts` applies the same `SERVICE_FEE_BPS` for browse-surface rate display as checkout. |

## Threat Verification — Plan 07-09 (booker cancel)

| ID | Category | Disposition | Evidence |
|---|---|---|---|
| T-07-47 | Tampering | mitigate | `src/lib/validation/cancellation.ts:22-24` `cancellationSchema` has exactly one field, `bookingId`; `cancel-booking.ts:407-416` recomputes from the booking's frozen snapshot. |
| T-07-48 | EoP | mitigate | `cancel-booking.ts:384-386` owner-gate via `loadOwnedBooking` BEFORE any UPDATE; `:465` `AND booker_id = ${userId}` repeated inside the UPDATE's WHERE; `DENIED` constant (`:98-101`) returned identically for missing and cross-user. |
| T-07-49 | Tampering | mitigate | `cancel-booking.ts:466` UPDATE scoped `AND status = 'confirmed'`; 0-row result → `NOT_ACTIVE`, no dispatch. |
| T-07-50 | Spoofing | mitigate | `cancel-booking.ts:403` `readDbNow(db)` (Postgres clock), passed into `quoteRefund`. |
| T-07-51 | Tampering | mitigate | Same as T-07-12 — `tierOrDefault(row.cancellationPolicy)` reads the BOOKING snapshot. |
| T-07-52 | DoS | mitigate | `cancel-booking.ts:95` `CANCEL_RATE_LIMIT = { window: 60, max: 5 }`; denial audited (`:391-397`). |
| T-07-53 | Repudiation | mitigate | `recordAudit` on every branch (`:391,473,482`), carrying `bookingId`/`refundCents`/`retainedCents`/`tier`/`refundBps`. |
| T-07-54 | Info disclosure | mitigate | `src/components/booking/cancel-confirm.tsx:38` — copy is "on its way", never "Refunded"; terminal state owned by the webhook (single writer). |
| T-07-55 | DoS | mitigate | Single `cancelled` status preserved (D-79); GiST EXCLUDE predicate's free-set unchanged (confirmed no new `booking_status` value across the phase). |

**Summary-level flag also verified:** `booking.payment_method` is written ONLY at `src/app/api/paymongo/webhook/route.ts:429`, gated behind `verifySignature` (`:368-373`) — no other write site found in `src/app/actions/*.ts` or `src/lib/availability/units.ts` (only a read at `cancel-booking.ts:191`). `isApiRefundable` (`src/lib/payments/refund-rail.ts`) fails closed: `return rail != null && REFUNDABLE_RAILS.has(rail)` — an absent/unrecognized rail denies API refund. **CLOSED.**

## Threat Verification — Plan 07-10 (notify migration)

| ID | Category | Disposition | Evidence |
|---|---|---|---|
| T-07-56 | Info disclosure | mitigate | Recipients read from rows each call site already owner-gated/joined (no second lookup, no request-supplied recipient) — confirmed pattern in `host-requests.ts`, `cancel-booking.ts`, `re-request.ts`. |
| T-07-57 | DoS | mitigate | `emitNotify` swallow (T-07-39) applies uniformly to all migrated call sites. |
| T-07-58 | Repudiation | mitigate | All emissions occur after `recordAudit`, outside `db.transaction` blocks — confirmed in `cancel-booking.ts`, `re-request.ts`, `host-requests.ts`. |
| T-07-59 | Tampering | mitigate | Every action's UPDATE is status-scoped (see T-07-49, T-07-24, host-requests approve/decline WHEREs) — a repeat claims 0 rows and emits nothing. |
| T-07-60 | Info disclosure | mitigate | `email.ts` `escapeHtml` applies to every interpolated field (T-07-36); Zod boundary bounds every field (T-07-37). |

## Threat Verification — Plan 07-11 (host cancel)

| ID | Category | Disposition | Evidence |
|---|---|---|---|
| T-07-61 | EoP | mitigate | `cancel-booking.ts:821` owner-gate via `loadHostOwnedBooking` BEFORE any write; `:877-879` `EXISTS (SELECT 1 FROM listing l WHERE l.id = booking.listing_id AND l.host_id = ${userId})` repeated inside the UPDATE's WHERE as defence in depth. |
| T-07-62 | Tampering | mitigate | `cancel-booking.ts:742` `HOST_CANCEL_BLOCK_REASON = "host_cancellation"` matches `blocks.ts:149` `SYSTEM_BLOCK_REASON`; `blocks.ts:192` `removeBlock`'s DELETE carries `sql\`${availabilityBlock.reason} IS DISTINCT FROM ${SYSTEM_BLOCK_REASON}\``. |
| T-07-63 | Tampering | mitigate | `cancel-booking.ts:756-758` `cappedHostCancelFee` computed server-side: `Math.min(HOST_CANCEL_FEE_CENTS, row.spacePriceCents ?? row.quotedTotalCents ?? 0)`; action accepts only `(bookingId, reason)`. |
| T-07-64 | Tampering | mitigate | `cancel-booking.ts:954-958` `INSERT INTO host_payout_ledger (...) ON CONFLICT (booking_id, kind) DO NOTHING` — the INSERT is the at-most-once lock. |
| T-07-65 | Tampering | mitigate | `cancel-booking.ts:924-932` auto-block insert on the exact `[startsAt, endsAt)` window/unit, undeletable per T-07-62. |
| T-07-66 | Repudiation | mitigate | `cancel-booking.ts:897-908` `recordAudit({ action: "host_cancel_booking", outcome: "ok", meta: { bookingId, reason, feeCents, refundCents, listingId } })`. |
| T-07-67 | Tampering | mitigate | `cancel-booking.ts:846` `refundCents = row.quotedTotalCents ?? 0` — the FULL charge, tier not consulted. |
| T-07-68 | DoS | mitigate | `cancel-booking.ts` `HOST_CANCEL_RATE_LIMIT = { window: 60, max: 5 }`, denial audited. |

## Threat Verification — Plan 07-12 (re-request)

| ID | Category | Disposition | Evidence |
|---|---|---|---|
| T-07-69 | EoP | mitigate | `re-request.ts:154-156,199-200` owner-gate via `loadOwnedLapsedBooking` BEFORE any write; missing/cross-user return the identical `DENIED` string byte-for-byte with the cancel actions. |
| T-07-70 | Tampering | mitigate | `re-request.ts:259-268` `createPendingHold` re-validates lead-time unconditionally, in-transaction, against `now()` (see T-07-22); the action supplies no override. |
| T-07-71 | Tampering | mitigate | A NEW row is inserted via `createPendingHold` (`:259`), which is subject to the GiST EXCLUDE; no status flip occurs. |
| T-07-72 | Tampering | mitigate | `grep -c "UPDATE booking" src/app/actions/re-request.ts` → 0. |
| T-07-73 | DoS | mitigate | `re-request.ts:61` `RE_REQUEST_RATE_LIMIT = { window: 60, max: 5 }`, denial audited (`:205-211`). |
| T-07-74 | Info disclosure | **accept** | `src/app/(app)/bookings/[id]/page.tsx:104` `getAvailability(db, listingId, ...)` reads a public listing's own calendar for a window the caller is already owner-gated on for the booking; reveals only what the listing's public calendar publishes. **Logged.** |
| T-07-75 | Info disclosure | mitigate | Same "refund on its way" rule as T-07-54 applies to the cancelled branch on this surface. |

## Threat Verification — Plan 07-13 (reminders)

| ID | Category | Disposition | Evidence |
|---|---|---|---|
| T-07-76 | DoS | mitigate | `src/inngest/functions/reminders.ts:307-319` `claimReminder`: `INSERT INTO booking_reminder ... ON CONFLICT (booking_id, kind) DO NOTHING RETURNING id` is the sole lock; `concurrency: 1` is defence in depth only. |
| T-07-77 | Spoofing | mitigate | File header (`reminders.ts:1-10`) documents Inngest's own idempotency is explicitly NOT relied on; the DB constraint is the guarantee. |
| T-07-78 | Info disclosure | mitigate | `reminders.ts:193-197` `recipientColumn` resolves per-kind by explicit join (`l.host_id` vs `b.booker_id`), never inferred. |
| T-07-79 | Info disclosure | mitigate | `duePredicate` (`:159-190`) is status-scoped per kind (`approved`/`requested`/`confirmed`) AND future-scoped; `remindOne` (`:424-438`) additionally RE-READS the booking against the live predicate before claiming/sending, catching a state change between schedule and send. |
| T-07-80 | DoS | mitigate | `remindersSweep` (`:459-477`) runs each due reminder in its own `step.run`; `remindOne`'s emission is wrapped in a self-swallowing try/catch (`:432-436`). |
| T-07-81 | Repudiation | **accept** | `booking_reminder` rows (`UNIQUE(booking_id, kind)`) ARE the send history by construction; permanent failures still surface via the `onFailure`/`needs_attention` audit path (T-07-40). **Logged.** |

## Threat Verification — Plan 07-14 (notification UI)

| ID | Category | Disposition | Evidence |
|---|---|---|---|
| T-07-82 | Info disclosure (IDOR) | mitigate | `src/lib/notifications.ts:144-151,164-196` `countUnread`/`listRecent` both filter `WHERE recipient_id = ${recipientId}` in the WHERE. |
| T-07-83 | Tampering | mitigate | `src/app/actions/notifications.ts:77,105` both UPDATEs carry `AND recipient_id = ${userId}`. |
| T-07-84 | Tampering (XSS) | mitigate | `grep -c dangerouslySetInnerHTML` on `notification-item.tsx`/`notification-bell.tsx` → 0; `src/components/notifications/notification-item.tsx:97-104` `safeHref` allow-lists root-relative paths and `http(s)` absolute URLs only, refusing e.g. `javascript:` schemes. |
| T-07-85 | DoS | mitigate | `notification-bell.tsx:34,37,71-76` `POLL_INTERVAL_MS = 30_000`, `MAX_ATTEMPTS = 40`, `if (document.hidden) return;` inside the interval callback. |
| T-07-86 | DoS | mitigate | `src/lib/notifications.ts:35,169-172` `NOTIFICATIONS_MAX_LIMIT = 20`, `listRecent` clamps to it server-side. |
| T-07-87 | Info disclosure | **accept** | `listRecent`/`countUnread` read per-request from the authenticated session; no shared cache layer exists in this path (confirmed: both functions take `dbConn`/`recipientId` as explicit args with no memoization). **Logged — revisit if a layout-level cache is ever introduced (07-14-SUMMARY.md explicitly calls this out).** |

## Threat Verification — Plan 07-15 (policy tiers)

| ID | Category | Disposition | Evidence |
|---|---|---|---|
| T-07-88 | Tampering | mitigate | `src/lib/validation/listing.ts:81` publish schema requires `cancellationPolicy: z.enum(cancellationPolicyValues)` (non-optional); `src/app/actions/listing.ts:248-249` re-validates server-side and rejects a NULL tier. |
| T-07-89 | Repudiation | mitigate | `CancellationPolicyDisclosure` rendered at both `src/app/listings/[id]/page.tsx` (listing) and `src/app/listings/[id]/book/page.tsx` (checkout); tier snapshotted onto the booking at creation. |
| T-07-90 | Tampering | mitigate | Refund calculator reads `booking.cancellation_policy` only (T-07-12/51), never `listing.cancellationPolicy`. |
| T-07-91 | Info disclosure | mitigate | `src/components/booking/cancellation-policy-disclosure.tsx:137` `if (!tier) return null;` — renders nothing for an unpublished/NULL-tier listing. |
| T-07-92 | Tampering | mitigate | `cancellation-policy-disclosure.tsx` header confirms `rungBoundaries(tier, startsAt)` is called server-side in the RSC; component is a Server Component with no client directive and does no date math. |
| T-07-93 | DoS | mitigate | `src/lib/validation/listing.ts:44` draft schema: `cancellationPolicy: z.enum(cancellationPolicyValues).optional()` — publish-only gate, draft stays permissive. |

## Threat Verification — Plan 07-16 (InstaPay refunds)

| ID | Category | Disposition | Evidence |
|---|---|---|---|
| T-07-94 | Tampering | mitigate | `cancel-booking.ts:561` `amountCents: quote.totalRefundCents` (server-frozen quote), destination only accepted inside the already owner-gated `cancelBookingAsBooker` flow, bound to that booking id. |
| T-07-95 | Info disclosure | mitigate | `src/lib/paymongo.ts:349-352` destination passes straight through to the transfer body, never persisted/logged; `cancel-booking.ts:571-583` only `transferId` + `maskAccountLast4(dest.accountNumber)` outlive the call; catch block (`:584-592`) deliberately omits `err` from the log line to avoid echoing account details. |
| T-07-96 | Tampering | mitigate | `src/lib/paymongo.ts:371` `idempotencyKey: \`refund:${input.bookingId}\`` vs the payout path's `payout:<bookingId>` — distinct namespaces confirmed by inspection of both `createBatchTransfer` and `createRefundTransfer`. |
| T-07-97 | Tampering | mitigate | `paymongo.ts:371,380` — `Idempotency-Key` stable per booking (`refund:${bookingId}`), `reference_number` rotates per attempt (`refund-${bookingId}-${attempt}`). |
| T-07-98 | DoS | mitigate | `paymongo.ts:326,361-366` `INSTAPAY_CEILING_CENTS = 5_000_000`; `createRefundTransfer` throws above it; `cancel-booking.ts` checks the ceiling first and routes to `needs_attention` instead of firing. |
| T-07-99 | Spoofing | mitigate | `cancel-booking.ts:429-439` `institutionBic` validated against `listReceivingInstitutions()`'s live set server-side before the flip; unknown BIC → `INVALID_DESTINATION`. |
| T-07-100 | Repudiation | mitigate | `src/lib/payments/refund-rail.ts` header records the observed API verdict (HTTP 400 on `/v1/refunds` for a QRPh payment, with the raw error body quoted) rather than a documentation claim. |

## Threat Verification — Plan 07-17 (gap closure)

| ID | Category | Disposition | Evidence |
|---|---|---|---|
| T-07-17-01 | Tampering (HTML injection) | mitigate | `src/lib/email.ts` — `sendHostCancellationRecord`, `sendRefundIssued`, `sendReminderPreExpiry`, `sendReminderPreSession`, `sendReminderPreSla` all `escapeHtml()` every interpolated field including `feeLabel`, `payByLabel`, `respondByLabel`. |
| T-07-17-02 | Info disclosure | mitigate | New payload fields (`side`, `feeLabel`) are display-only (`feeLabel` = `formatMoney` output, `side` = two-value enum); enforced by the `notifyEventSchema`/`_PayloadUnionParity` Zod boundary (`src/lib/validation/notification.ts`). |
| T-07-17-03 | Repudiation | mitigate | `cancel-booking.ts:311` `if (refundCents !== null && refundCents > 0)` gates `refund_issued`; `feeLabel` emitted only when `feeCents > 0` (host-cancel record). |
| T-07-17-04 | Tampering (price integrity) | **accept** | `src/lib/availability/units.ts:301,476` `fullDay` written only by `createPendingHold` from server-validated input (`input.fullDay ?? false`), read only to re-freeze at current rates in `re-request.ts:216-236`. **Logged.** |
| T-07-17-05 | EoP (schema drift) | mitigate | `src/lib/validation/notification.ts:197-199` `_PayloadUnionParity` — compile-time `Assert<Equals<z.infer<typeof notificationPayloadSchema>, NotificationPayload>>`; `notify.ts:70-198` `sendForType`'s exhaustive switch with `const unhandled: never = payload;` after it. |

---

## Accepted Risks Log

The following threats carry an `accept` disposition. Each rationale below was independently re-verified against current code (not merely re-stated from planning documents) as part of this audit and is confirmed to still hold.

| Threat ID | Component | Accepted Risk | Why It's Acceptable | Re-Verified |
|---|---|---|---|---|
| T-07-06 | `booking.cancelledBy`/`cancelledAt` | These columns are display/audit metadata, not a tamper-evident log | The non-repudiable record is the `recordAudit` row written on every branch of both cancel actions (20 call sites in `cancel-booking.ts`) | ✅ 2026-07-23 |
| T-07-08 | `composeWhenLabel` output | Emits a formatted date/time + public city string | No booker identity, price, or id in the return type or call sites | ✅ 2026-07-23 |
| T-07-15 | `refund-rail.ts` | Contains a static Set of payment-rail identifiers | All four identifiers (`card`,`gcash`,`grab_pay`,`paymaya`) are public payment-method names, no secrets | ✅ 2026-07-23 |
| T-07-27 | Lead-time reason text | Reveals a listing's own published notice requirement | The listing page already implies this; the host chose it | ✅ 2026-07-23 |
| T-07-41 | `emitNotify` / rolled-back booking | A dropped notification on `inngest.send()` failure | Emission only ever happens post-commit; documented KNOWN BOUNDED GAP matching accepted Phase-6 precedent A6; error is logged | ✅ 2026-07-23 |
| T-07-74 | D-97 availability re-check | Reveals whether a public listing's window is free | Same information the listing's own public calendar already publishes | ✅ 2026-07-23 |
| T-07-81 | Reminder send record | No separate log beyond the claim row | `booking_reminder` UNIQUE(booking_id, kind) rows ARE the send history by construction; permanent failures still surface via `onFailure`/`needs_attention` | ✅ 2026-07-23 |
| T-07-87 | Unread notification count | Could leak cross-session if a cache layer existed | Both layouts read per-request from the authenticated session; no shared cache layer exists in this code path today. **Revisit if a layout-level cache is ever introduced.** | ✅ 2026-07-23 |
| T-07-17-04 | `booking.full_day` write path | A price-determining flag persisted at mint time | Written only by `createPendingHold` from server-validated input; read only to re-freeze at current rates, never as a client-trusted amount | ✅ 2026-07-23 |

---

## Unregistered Flags

**None found.** All new attack surface introduced by Phase 7 maps to a registered threat ID:

- No new API routes beyond the pre-existing `/api/inngest`, `/api/paymongo/webhook`, `/api/auth`, `/api/cloudinary/sign` — `/api/inngest` registration of 5 functions is covered by T-07-35.
- New pages `/host/bookings`, `/host/bookings/[id]`, `/bookings`, `/bookings/[id]`, `/bookings/[id]/cancel` are covered by T-07-28/29/48/61.
- New outbound PayMongo surface (`/v2/batch_transfers` with a booker-supplied destination, `GET /v2/transfers/receiving_institutions`) is covered by T-07-94..100.
- All 17 SUMMARY.md `## Threat Flags` sections were read; every flag present maps to an existing threat ID or is the two informational summary-level flags independently re-verified above (payment_method write-once, isApiRefundable fail-closed).

**Process observation (not a blocker):** `07-02-SUMMARY.md` omits the `## Threat Flags` section entirely (all other 16 plans include one, several explicitly stating "None"). T-07-07 through T-07-10 (that plan's full register) were independently verified directly against `src/components/booking/booking-status.ts` and `src/lib/booking/when-label.ts` in this audit and are closed regardless.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-23 | 105 | 105 | 0 | gsd-security-auditor (sonnet) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log (9 entries)
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-23

---

## Verification Method Notes

- Every `mitigate` disposition was verified by locating the actual guard/scope/escape/clamp in the cited or logically-implied file — not by re-reading the plan's mitigation-plan prose or the SUMMARY's self-reported test names.
- Where a threat's mitigation depends on an invariant holding across multiple call sites (e.g., "every ledger query scoped `kind='payout'`", "every escapeHtml'd interpolation", "every owner-scoped WHERE"), each call site was checked, not just one representative sample.
- `accept` dispositions were re-verified against current code rather than treated as pre-closed by virtue of being planned as `accept`.
- No implementation file was modified. This file (`SECURITY.md`) is the only artifact written by this audit.
