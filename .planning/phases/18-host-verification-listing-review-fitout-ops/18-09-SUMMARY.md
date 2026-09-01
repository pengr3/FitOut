---
phase: 18-host-verification-listing-review-fitout-ops
plan: 09
subsystem: notifications
tags: [ops-05, d-245, notification-fan-out, enum-55p04, email-copy, d-243, d-250, mutation-testing, compile-census]

# Dependency graph
requires:
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 05
    provides: "the five ops decision actions, their post-flip discipline, and `composeReason` — the exact string the host reads"
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 08
    provides: "`cancelBookingAsOps` and the dated Fork-5 gap this plan closes"
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 02
    provides: "`tests/design/enum-first-use-tripwire.test.ts`, extended here to a second owning migration"
  - phase: 07-cancellation-refunds
    provides: "the D-86/D-91/D-92 fan-out — ONE Inngest function writing the durable row and dispatching the email from one payload"
provides:
  - "six `notification_type` values added by `drizzle/0028`, an ALTER-TYPE-only migration, APPLIED to the live database"
  - "six `NotificationPayload` variants that store the COMPOSED SENTENCES, with the operator's own sentence on its own field"
  - "`composeOpsDecisionBody` — one join expression BOTH channels call (src/lib/notification-copy.ts)"
  - "`sendOpsDecision` — an email sender containing NO copy; every string arrives on the payload"
  - "one guarded `emitNotify` per ops decision, plus the ops-cancellation pair on `booking_cancelled_by_ops`"
  - "`tests/notifications/ops-decision-notify.test.ts` — 12 cases pinning delivery, verbatim-once, one-invocation parity and the D-243/D-250 banned language"
affects: [18-13 (the host-surface status D-230 adds ALONGSIDE this), 18-14 (the phase summary that carries the D-250 unblock)]

# Tech stack
tech-stack:
  added: []
  patterns:
    - "55P04 two-migration split, second application: ADD VALUE only, first runtime write is an emit"
    - "pre-composed copy in the payload where BOTH channels must say the same words (D-91 taken literally)"
    - "one shared join expression CALLED by both channels, in a dependency-free module the client graph can hold"
    - "AST string-literal scan for a copy prohibition, so the paragraph forbidding a phrase cannot redden its own gate"

key-files:
  created:
    - drizzle/0028_ops_notification_types.sql
    - src/lib/notification-copy.ts
    - tests/notifications/ops-decision-notify.test.ts
  modified:
    - src/lib/db/schema.ts
    - src/lib/validation/notification.ts
    - src/lib/notifications.ts
    - src/lib/email.ts
    - src/inngest/functions/notify.ts
    - src/components/notifications/notification-item.tsx
    - src/app/actions/ops-review.ts
    - src/app/actions/cancel-booking.ts
    - drizzle/meta/_journal.json
    - tests/design/enum-first-use-tripwire.test.ts
    - tests/helpers/email-fixtures.ts
    - tests/security/notification-owner-scope.test.ts
    - tests/payments/ops-cancel.test.ts

decisions:
  - "The copy is stored IN the payload for these six kinds — a departure from every other kind, argued from D-91 and D-86 rather than convenience"
  - "SIX values, not the planned five: Task 3's ops-cancel copy has no kind among the five, so `booking_cancelled_by_ops` was added (Rule 3)"
  - "`sentence` = 400 chars, not `label`'s 200: `composeReason` legitimately produces 338, and 200 would have thrown at the write boundary"
  - "The join lives in a new dependency-free module because `notifications.ts` would drag Inngest and Drizzle into the browser bundle"
  - "A rejected listing is offered NO way back: D-232 does not cover `rejected → pending`, so promising the edit route would be an appeal promise by another name"

metrics:
  duration_minutes: 26
  tasks_completed: 3
  files_created: 3
  files_modified: 13
  completed: 2026-09-01
---

# Phase 18 Plan 09: Telling the Host Summary

The five ops decisions and the ops cancellation now reach the host on **both channels from one payload**,
with the operator's own sentence intact — six new `notification_type` values added by an ALTER-TYPE-only
migration that has been applied, rendered by one Inngest function, and pinned by 12 cases plus two
observed mutation REDs.

## What Shipped

### Task 1 — the ALTER-TYPE-only migration and the compile-forced kinds (`e2ab5e5`)

`drizzle/0028_ops_notification_types.sql` contains **six `ALTER TYPE … ADD VALUE IF NOT EXISTS`
statements and nothing else**, the drizzle/0018 split applied a second time. `npm run db:migrate` was
run — the [BLOCKING] gate — and its output recorded below. The first runtime write of every value is
Task 3's emit, long after that migration committed.

**THE COMPILE CENSUS WAS RED FIRST, IN THREE PRODUCTION SITES AND TWO TEST SITES.** Recorded verbatim,
because the census is the mechanism the schema header describes and a summary that only reports the
green tells you nothing:

```
src/components/notifications/notification-item.tsx(240,9): error TS2322: Type '{ type: "listing_review_approved"; … }' is not assignable to type 'never'.
src/inngest/functions/notify.ts(223,9):                    error TS2322: Type '{ type: "listing_review_approved"; … }' is not assignable to type 'never'.
src/lib/validation/notification.ts(229,3):                 error TS2344: Type 'false' does not satisfy the constraint 'true'.
tests/security/notification-owner-scope.test.ts(172,44):   error TS2339: Property 'listingTitle' does not exist on type 'NotificationPayload'.
```

Each was answered with real work, never a `default` clause — `grep -c "default:"` on
`notification-item.tsx` is **0, unchanged from 18-08**. A fifth census fired on the second pass:
`tests/helpers/email-fixtures.ts` derives `SenderName` from the email module's own exported function
type, so `sendOpsDecision` was a **missing-key compile error** until it got a fixture. That fixture is
three calls (approval, rejection, suspension), and it is what puts the operator's free text through the
shipped `email-injection` probe.

### Task 2 — the copy, one payload, two channels (`28357d9`)

Six payload factories in `src/lib/notifications.ts`, transcribed from **18-UI-SPEC § Telling the host**:

| Kind | Heading / subject | Body |
|---|---|---|
| `listing_review_approved` | `{title} is live` | Your listing passed FitOut's check and can now be booked. |
| `listing_review_rejected` | `{title} wasn't approved` | FitOut checked this listing and didn't approve it. · *{operator sentence}* · It won't take bookings. |
| `host_verification_approved` | You're approved to host on FitOut | Someone at FitOut checked your account. Your listings can go live once each one is approved. |
| `host_verification_rejected` | We couldn't approve your host account | FitOut checked your account and didn't approve it. · *{operator sentence}* · Your listings can't take bookings. |
| `host_suspended` | FitOut has paused your hosting | *{operator sentence}* · Your spaces can't be booked, and payouts are on hold. |
| `booking_cancelled_by_ops` (booker) | FitOut cancelled this booking | FitOut cancelled your booking at {title} on {when}. You're getting {refund} back, to the way you paid. |
| `booking_cancelled_by_ops` (host) | FitOut cancelled a booking at your space | The booking at {title} on {when} is cancelled and the guest is being refunded. **You're not charged a cancellation fee for this.** |

The body is stored as **three parts** — `lead`, `reasonText`, `tail` — and `composeOpsDecisionBody`
joins them. `host_suspended` has **no lead**: the reason is the first thing a suspended host needs, so
nothing is put in front of it.

### Task 3 — emit from the decisions, and prove it (`560277d`)

One `emitNotify` per decision in `ops-review.ts`, **after the flip and after the audit row**, inside the
post-flip discipline: the recipient lookup and the emit are both inside one guard, and a failure becomes
a `needs_attention` audit row rather than an exception past a decision that already committed. `meta`
carries the verb and the failure reason **only** — never the payload, which holds the operator's free
text (D-72), and never the recipient's address (T-07-38).

`cancelBookingAsOps` closes 18-08's dated Fork-5 gap with the two `booking_cancelled_by_ops` emissions.
`grep -c "booking_cancelled_by_host" src/app/actions/cancel-booking.ts` is **5 — byte-identical to
after 18-08** (see Deviations: the first draft moved it to 6 through my own prose).

## The [BLOCKING] migration — run, and recorded

```
$ npm run db:migrate
Using 'postgres' driver for database querying
[⣷] applying migrations...
[✓] migrations applied successfully!          # exit 0

$ npm run db:migrate                          # idempotency, second run
[✓] migrations applied successfully!          # exit 0
```

And read back off the **live** database, because `tsc` and `next build` pass without the migration and
skipping it is a false-positive verification state:

```
$ SELECT enumlabel FROM pg_enum … WHERE typname='notification_type' ORDER BY enumsortorder
… group_cancelled
listing_review_approved
listing_review_rejected
host_verification_approved
host_verification_rejected
host_suspended
booking_cancelled_by_ops
```

Twenty values, the six new ones appended at the tail in `schema.ts` order.

## Mutation Proofs — both watched RED, both reverted

**M1 — paraphrase the operator's sentence.** `reasonText` in `listingRejectedPayload` replaced with
`reasonText.replace(/^The /, 'FitOut found that the ').toLowerCase()`.

```
× case 2  AssertionError: expected 'fitout found that the photos don't s…' to be 'The photos don't show the space bein…'
× case 6  AssertionError: expected 'fitout found that the photos don't s…' to be 'The photos don't show the space bein…'
× case 11 AssertionError: expected 'something else (explain below). <scri…' to be 'Something else (explain below). <scri…'
   Tests  3 failed | 9 passed (12)
```

Three cases, not one — the verbatim property is asserted at the row, at the body and at the byte-identical
round-trip, so a paraphrase cannot slip past any single one of them.

**M2 — add an appeal route.** `"…payouts are on hold."` → `"…payouts are on hold. Reply to this message
if you'd like to appeal."`

```
× case 8  AssertionError: host suspended promises an appeal route (999.6 / D-243): "FitOut has paused your hosting\n…Reply to this message if you'd like to appeal."
× case 9  AssertionError: src/lib/notifications.ts literal promises an appeal route (999.6 / D-243): "Your spaces can't be booked, and payouts are on hold. Reply to this message if you'd like to appeal."
× case 10 AssertionError: suspension promises an appeal route (999.6 / D-243): "…Reply to this message if you'd like to appeal."
   Tests  3 failed | 9 passed (12)
```

Case 9 is the one worth noting: it caught the phrase **in the source literal**, independently of any
rendered surface, which is the assertion that survives a future kind that renders through a path case 8
does not walk.

Both reverted by editing the line back; `git diff --exit-code src/lib/notifications.ts` clean before the
commit shipped.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] A SIXTH enum value: Task 3 had no kind to emit on**

- **Found during:** Task 1, reconciling Task 1's "add five values" against Task 3's "add the ops-cancel
  notifications to `cancelBookingAsOps`".
- **Issue:** The five planned kinds are all about a host's standing. Task 3 requires booker-facing and
  host-facing ops-**cancellation** copy, and the only shipped kind that fits is
  `booking_cancelled_by_host` — which the same task forbids on that path, correctly, because both of its
  sentences are false there.
- **Fix:** Added `booking_cancelled_by_ops`, one type with the `side: "booker" | "host"` discriminant
  `booking_cancelled_by_host` already established. It is in `drizzle/0028` with the other five and under
  the same tripwire.
- **Verified non-colliding with 18-02's tripwire:** the 0027 gate matches `'ops'` **with its quotes**,
  and `'booking_cancelled_by_ops'` does not contain that sequence. This is asserted rather than assumed —
  the new describe block carries a dedicated case for it, so a rename that broke the property fails
  loudly instead of silently making 0027's prohibition trip on 0028.
- **Commit:** `e2ab5e5`

**2. [Rule 1 - Bug] `label`'s 200-character bound would have thrown on a valid rejection**

- **Found during:** Task 1, writing the Zod mirror.
- **Issue:** `reasonText` is `composeReason`'s output: a taxonomy sentence (longest 57) + a space + a
  note bounded at `REJECT_NOTE_MAX` = 280 → **338 characters**. Every existing payload field is
  `label` = `.max(200)`. A 280-character note is a value the ops console explicitly accepts, so
  `insertNotification` would have **thrown at the write boundary**, burned four Inngest retries and
  landed a `needs_attention` row — for the one notification whose entire purpose is to be delivered.
  Nothing in the suite would have caught it: every existing test uses short reasons.
- **Fix:** a dedicated `sentence` bound of 400 for the composed fields, with the arithmetic written out
  at the declaration. The real bound on the operator's text stays upstream where it belongs.
- **Commit:** `e2ab5e5`

**3. [Rule 3 - Blocking] `src/lib/validation/notification.ts` was not in `files_modified`**

- **Issue:** the plan's file list omits it, but `_PayloadUnionParity` is a compile-time weld that makes
  the Zod union and the TS union provably the same set. Six new variants cannot be added without it.
- **Fix:** added the six Zod members plus the six enum literals; the parity assert is green.
- **Commit:** `e2ab5e5`

**4. [Rule 3 - Blocking] `tests/security/notification-owner-scope.test.ts` stopped compiling**

- **Issue:** it read `r.payload.listingTitle` across the whole union, which compiled only while all 14
  kinds carried that field. The six new ones are about a host's standing and carry none.
- **Fix:** a `titleOf` helper using `in` narrowing — **not** a cast. The assertion is unchanged in
  strength: every row that file seeds is a booking kind, and a titleless kind now **fails** the
  expectation rather than failing to compile, which is the direction that keeps the leak assertion live.
- **Commit:** `e2ab5e5`

**5. [Rule 2 - Missing critical] A new module for the shared join, rather than the planned file**

- **Issue:** the plan places the copy in `src/lib/notifications.ts`, and it is there. But the **body
  join** must be CALLED by both channels (the 18-04 og-facts carry-forward: the compiler counts callers,
  not restatements), and one of those channels is `notification-item.tsx`, which is in the **client
  graph** via `notification-bell.tsx`. A value-import of `notifications.ts` from there would drag the
  Inngest SDK and the Drizzle table objects into the browser bundle.
- **Fix:** `src/lib/notification-copy.ts` — a module importing **nothing**, holding
  `composeOpsDecisionBody`, called by the panel, the email sender and the payload factories. Three
  callers, one expression.
- **Commit:** `e2ab5e5`

**6. [Rule 1 - Bug] `tests/payments/ops-cancel.test.ts` case 12's zero was superseded**

- **Issue:** 18-08 asserted `expect(opsSent.filter(… "oc_b_notify")).toHaveLength(0)` — the ops path
  tells nobody — and dated that gap to **this plan** in its own summary ("18-09 owes the
  ops-cancellation notification copy"). Closing the gap makes the zero false.
- **Fix:** replaced with a **strictly stronger** pin, not a relaxation: exactly **two** emissions for
  that booking, both `booking_cancelled_by_ops`, one per `side`, and each side routed to the right
  recipient id (`bookerId` / `hostId`). A path that regressed to telling one party, or that mailed the
  host's no-fee copy to the defrauded booker, is red. **The Pitfall-5 assertion above it —
  `not.toContain("booking_cancelled_by_host")` — is untouched**, and so is its positive control.
- **Commit:** `560277d`

**7. [Rule 1 - Bug] My own prose moved the pinned `booking_cancelled_by_host` count**

- **Issue:** the rewritten Fork-5 comment named the forbidden type, taking `grep -c` from 5 to **6** on
  a file whose emissions had not changed at all. This is the acceptance-grep landmine the plan warned
  about, arriving in the plan that was warned about it.
- **Fix:** the comment now says "the HOST-CANCEL type (spelled at its own call sites above, and
  deliberately NOT spelled here — an acceptance grep counts its occurrences)", drizzle/0021's rule.
  Count back to **5**, byte-identical to 18-08.
- **Commit:** `560277d`

**8. [Rule 2 - Missing critical] A declared exclusion for the Resend sender address**

- **Found during:** Task 3, first run of case 9 — it went **RED** on `"FitOut <onboarding@resend.dev>"`
  in `email.ts`, which is the `EMAIL_FROM` fallback, not a support affordance.
- **Fix:** a `DECLARED_NON_SUPPORT_ADDRESSES` row with the reason, mirroring
  `site-contacts.test.ts`'s own `EXCLUDED_ADDRESSES` (itself the `EXCLUDED_PAIRS` idiom) — **not** a
  loosened pattern. The gate additionally asserts every declared row **still fires**, so a stale
  exemption cannot quietly widen it.
- **Commit:** `560277d`

### Not fixed, and stated as such

**`appBaseUrl()` now has a third definition.** `cancel-booking.ts:364` and `group.ts:199` each declare
their own; `notificationBaseUrl()` in `notifications.ts` is a third. Consolidating means editing two
modules this plan does not own for no behavioural gain, so it is **logged to `deferred-items.md`**
rather than absorbed. All three read the same `BETTER_AUTH_URL` with the same fallback.

## The D-250 blocking input — one line for the PM

**`src/lib/site.ts:70` still reads `export const SUPPORT_EMAIL: string | null = null;` and this plan did
not touch it.** `git diff --exit-code` on both `src/lib/site.ts` and `tests/design/site-contacts.test.ts`
succeeds; neither appears in any of this plan's three commits.

> **PM, one line:** give FitOut a real, monitored support address (or confirm there is none yet).
> Setting `SUPPORT_EMAIL` in `src/lib/site.ts:70` is the whole change — `tests/design/site-contacts.test.ts`
> **inverts automatically**, from "zero support affordances anywhere in `src/`" to demanding the footer
> renders one, so the two cannot drift.

It also closes the carried-forward **STATE-05 / TRUST-01** slot, reached here for the third time
(PROJECT D-26 → D-64 → D-250). **It did not hold this plan and must not hold the phase**: every sentence
shipped above was written to be complete and honest without an address, and none of them ends in a
half-rendering "email us at…" clause. If an address ever arrives, an affordance on these surfaces goes in
behind `src/components/booking/support-path.tsx`'s guard shape — the whole control inside a
`SUPPORT_EMAIL !== null` conditional, literals authored **inside** it — never spliced into the copy.

## Verification

| Gate | Result |
|---|---|
| `npm run db:migrate` | **run**, exit 0, idempotent on a second run, six values read back off the live enum |
| `npx tsc --noEmit` | **exit 0**, after having been RED in five places (recorded above) |
| `npm test` **alone** | **203 files / 2425 passed / 5 skipped** (baseline 202 / 2392 / 5) |
| `npm run test:design` **alone** | **72 files / 1310 passed / 3 skipped** (baseline 72 / 1304 / 3) |
| `tests/notifications/ops-decision-notify.test.ts` | 12 passed |
| `tests/payments/ops-cancel.test.ts` | 16 passed — the Pitfall-5 assertion unchanged |
| `tests/ops/reject-reason.test.ts` | 11 passed, unmodified |
| `tests/design/enum-first-use-tripwire.test.ts` | 11 passed (was 5) — the six new literals covered |
| `tests/design/site-contacts.test.ts` | passed **UNMODIFIED** — `git diff --exit-code` clean |
| `tests/auth/email-escaping.test.ts` + `email-injection.test.ts` | 166 passed — the operator sentence rides the shipped path |
| `eslint` on every changed file | clean |

The `+33` on `npm test` is exactly this plan's work: 12 new cases in the new file, plus 21 from the
three `sendOpsDecision` fixture calls being driven through the injection probe's per-string walk.

**Pre-existing and not this plan's:** the `[test-db] LEAKED WRITES` block naming `notify` ×1 and
`guest-email` ×1 — unchanged at 2 rows, and expected here since this plan works on the notify path;
three red e2e specs already in `deferred-items.md`.

## Threat Model Coverage

| Threat ID | Disposition | Where it is discharged |
|---|---|---|
| T-18-0901 | mitigated | Zod-bounded at write (18-05); React text child in-app (case 11); email rides the shipped escaping anchors, re-run and green, now with three fixture calls driving the operator's field |
| T-18-0902 | mitigated | the payload carries display strings only; `audit.meta` on the notify-failure path carries the verb and reason **only** — never the payload, never the address |
| T-18-0903 | mitigated | `drizzle/0028` does nothing but ADD VALUE, applied and verified against the live enum; the tripwire mechanises it over six literals plus a non-collision guard |
| T-18-0904 | mitigated | case 7 drives ONE event through both steps and asserts the stored heading is byte-identical to the delivered subject |
| T-18-0905 | mitigated | `SUPPORT_EMAIL` untouched; `site-contacts.test.ts` unmodified and green; case 9's AST scan is a second, independent gate |
| T-18-0906 | mitigated | cases 8/9/10, **mutation-proved RED** (M2) |
| T-18-0907 | mitigated | the `booking_cancelled_by_host` count pinned at 5; ops-cancel case 12 now pins per-side, per-recipient delivery |
| T-18-SC | mitigated | no package installed |

## Known Stubs

**None.** Every kind renders real copy from a real payload; nothing returns a hardcoded empty value and
no surface renders a value it does not have.

## Requirements

| ID | Status | Evidence |
|---|---|---|
| OPS-05 | **satisfied** | 18-05 shipped the write half (the sentence in a durable column); this plan ships the DELIVERY half — one durable row and one email per decision, from one payload, with the operator's sentence verbatim. D-230's host-surface status (18-13) is in addition to this, not instead of it. |

## Commits

| Hash | Message |
|---|---|
| `e2ab5e5` | `feat(18-09): the six OPS-05 notification kinds, added by an ALTER-TYPE-only migration` |
| `28357d9` | `feat(18-09): the OPS-05 copy — six events, one payload each, both channels from one function` |
| `560277d` | `feat(18-09): emit from every ops decision, and prove the row exists and says the right thing` |

## Self-Check: PASSED

- `drizzle/0028_ops_notification_types.sql` — FOUND
- `src/lib/notification-copy.ts` — FOUND
- `tests/notifications/ops-decision-notify.test.ts` — FOUND
- commit `e2ab5e5` — FOUND
- commit `28357d9` — FOUND
- commit `560277d` — FOUND
