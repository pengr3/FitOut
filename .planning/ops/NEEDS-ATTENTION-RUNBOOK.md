# Runbook — unresolved `needs_attention` money alerts

**Audience:** whoever holds the ops pager for FitOut. No prior context assumed.
**Created:** 2026-08-10 (quick task `260810-j3z`).
**Last revised:** 2026-08-22 (plan `13.1-06`) — two new action names (`checkout_paid_after_lapse`,
`webhook_missed`) added to §4 with detail sections §4b/§4c, and five stale call-site pointers corrected.
**Scope:** discovering, triaging, redressing and discharging an unresolved money alert.

---

## 1. What this covers, and why it is NOT named "qrph-overcharge-runbook"

The obvious name for this file would have been something QRPh-shaped, because the QRPh unrefundable-rail
overcharge is the sharpest case in it. That name was deliberately rejected (D-J3Z-10).

The daily digest surfaces **every** `needs_attention` seam in the product — **19** `recordAudit` call sites
across **eight** files, writing **15 distinct action names** (section 4). An operator woken up holding a
`refund_transfer_failed` or a `checkout_expire_failed` row would open a file called "qrph overcharge
runbook", conclude it did not apply to them, and close it. Almost every one of these rows means the same
thing: **FitOut is holding or has mishandled money that belongs to somebody, and no code path can fix it.**

⚠ **One exception, and it is deliberate: `webhook_missed` (§4c) is INFORMATIONAL.** The money is already
correct by the time that row is written — a lost webhook that the reconciliation sweep already repaired. It
is in the queue so a failing transport is visible, not because anything is owed. Read §4c before acting on
one, and do not let it train you to skim the rest of the queue.

The QRPh out-of-band refund procedure is section 5 — the central, explicitly-named section, not the whole
document.

> This runbook lives outside `.planning/phases/` on purpose. `05-UAT-RUNBOOK.md` is phase-scoped by nature;
> this procedure outlives Phase 5 and is not a verification artifact.

---

## 2. How the alert arrives

**A daily email**, 08:50 Asia/Manila, to whatever address is in `OPS_ALERT_EMAIL`.
Source: `src/inngest/functions/ops-alert-digest.ts`, registered in `src/app/api/inngest/route.ts`.

It carries, per row: **audit id · action · actor_id · created_at (UTC) · age**. Rows older than
`OPS_ALERT_AGING_HOURS` (default 24) are marked `— AGING`. It is capped at the 200 newest and says
`200+ unresolved — showing the 200 newest` when there are more.

**A quiet inbox is the design, not a failure.** On a day with zero unresolved rows the digest sends
**nothing at all** — not an "all clear", not an empty table. Do not escalate a silent morning, and do not
"fix" this by adding a heartbeat email: a daily all-clear is precisely how an alert channel gets filtered
to trash, and the one day it carries real held money is the day nobody opens it. If you want positive
confirmation the pipeline is alive, run `npm run ops:alerts` yourself or look at the `ops-alert-digest` run
history in the Inngest dashboard — the run happens daily either way and returns
`{ sent: false, reason: "no_unresolved" }` on a clean day.

**If `OPS_ALERT_EMAIL` is unset**, nothing is emailed and the digest does not throw. It logs, at
`console.error`, in the app's server logs:

```
[ops-alert] OPS_ALERT_EMAIL unset — unresolved needs_attention alerts NOT emailed { count: N, ids: [...] }
```

Grep your log sink for `[ops-alert]`. The alert degrades to the console sink these rows already had; it does
not vanish. (Why it does not simply throw: a missing notification address is a configuration gap, not an
incident. Failing the run would put a red mark in the dashboard whose content is "an env var is unset",
which is worse signal than a green run plus the log line above. Contrast `INNGEST_SIGNING_KEY`, which is a
security key and *does* fail closed at boot.)

---

## 3. How to look the row up

**The live list** — no psql, no log access needed:

```bash
npm run ops:alerts
```

Prints every unresolved `needs_attention` row, newest first: audit id, action, actor, created, age.

**The full row, including `meta`** — `meta` is the jsonb column holding the case detail you actually need
to act (booking id, transfer id, masked last-4, amounts). The **`meta` column itself** is deliberately
absent from the email and from **both** CLI verbs. One single key out of it, `meta->>'error'`, is surfaced
by `npm run ops:alerts:history` and by nothing else — see **§6a**, and the reasoning below. To read the
full column, use a LOCAL database session:

```bash
docker compose exec db psql -U fitout -d fitout -c "SELECT * FROM audit WHERE id = '<audit-id>'"
# or browse it:
npm run db:studio
```

**Why that boundary exists, so nobody "helpfully" removes it.** `meta` is bound by the D-72 column-level
PII rule, stated verbatim at `src/app/actions/cancel-booking.ts:755-756`: *"No account number, no account
name, no BIC — not in this audit meta, not in any log line, NOT IN ANY COLUMN."* Email is an **external**
service that forwards, archives and indexes — content that enters it leaves everyone's control and does not
come back. So the digest carries only what is needed to *look a row up*, and the lookup itself happens
against the database, inside the trust boundary. This is enforced structurally, not by convention: the
query selects four explicit columns and the row type has no `meta` field, so re-exporting it is a compile
error, and a sentinel test (`tests/ops/alert-digest.test.ts` case 3) plants a value in `meta` and proves it
reaches no email body.

**The one exception, and why it does not erode the rule (2026-08-11, `260811-dj4`).** `ops:alerts:history`
prints `meta->>'error'` — a single named key, never the column. It exists because the review question is
"what was discharged, **and on what basis?**", and the basis is the error string: the 27-row classification
in §4a turned on the literal `'resend 503'`. The scope limit is *content-based and structural*, not a
promise: `error` holds an exception/API message, while identifiers live under **separately-named** keys
(`bookingId`, `transferId`, `paymentId`, `last4`) that a single-key projection cannot reach, and the review
row type has no `meta` field, so widening it stays a compile error. A sentinel test plants all four keys and
proves only `error` surfaces. **The email digest carries no key out of `meta` at all and is unchanged.**
Residual risk, accepted on the record: an error string could embed something you would rather not paste into
a ticket — read the terminal output before forwarding it.

---

## 4. Triage by `action`

Every action name below was read off a real call site — none are invented. `actor_id` is `system` for all
of them except where a real user id drove the action.

> **Line numbers move; action names do not.** Re-derive a pointer that looks wrong with
> `grep -rn 'action: "<name>"' src/` rather than trusting the column. The 2026-08-22 pass (below) found
> **five** of these stale, two of them pointing at a file that no longer contained the call at all.

| `action` | Where it is written | What it means / what you must do |
|---|---|---|
| **`auto_refund_manual`** | `lib/payments/confirm-booking-payment.ts:175` | **The big one.** A payment landed for a slot that was already gone, on a rail that **cannot be refunded** through the API. Real money is held that is not ours. → **Section 5.** |
| `auto_refund_failed` | `lib/payments/confirm-booking-payment.ts:163` | Same gone-slot situation on a *refundable* rail, but the refund call itself failed. Retry the refund from the PayMongo dashboard against the payment id in `meta`; if the rail turns out to be unrefundable, treat as section 5. |
| `refund_after_payout` | `api/paymongo/webhook/route.ts:212` | A refund became due *after* the host payout already moved. The money is with the host, not on the platform wallet. Recover from the host (or net against a future payout) before refunding the booker. |
| `refund_manual_required` | `cancel-booking.ts:813, 1329` | Money is owed but the API cannot move it: unrefundable rail, no captured payment id, no usable destination, or below PayMongo's ₱1 floor. → **Section 5.** |
| `refund_dispatch_failed` | `cancel-booking.ts:728, 1317` | The refund dispatch attempt threw. Check the payment id in `meta`, confirm in the PayMongo dashboard whether a refund actually landed, then either retry or treat as section 5. |
| `refund_transfer_failed` | `cancel-booking.ts:797` | The D-72 InstaPay refund-transfer failed. **Deliberately not auto-retried** — PayMongo requires a NEW `reference_number` per attempt. Re-issue manually with a fresh reference. |
| `refund_over_instapay_ceiling` | `cancel-booking.ts:755` | The refund exceeds the InstaPay ceiling, so the transfer was never fired (it would be doomed). Split it, or disburse out of band. |
| `checkout_expire_failed` | `booking.ts:660, 915` · `lib/payments/retire-checkout.ts:247` | A checkout session could not be expired — **a live payable session is stranded**, so a booker can still pay for something they should not be able to. Expire it in the PayMongo dashboard promptly; if it was already paid, you now have a gone-slot payment (section 5). The `booking.ts` pair is a *superseded* session on the re-price path; the `retire-checkout.ts` one is a *lapsed or withdrawn* hold and carries `meta.trigger` naming which path produced it (§4b). |
| **`checkout_paid_after_lapse`** | `lib/payments/retire-checkout.ts:208` | **New 2026-08-22, and the sharpest row in this table after `auto_refund_manual`.** → **§4b.** FitOut is holding a real payment for a booking that no longer exists, and **no code path will ever act on it.** |
| **`webhook_missed`** | `inngest/functions/payment-reconcile.ts:310` | **New 2026-08-22. Informational — the money is already correct.** A payment PayMongo captured whose confirming webhook never arrived; the reconcile sweep confirmed the booking itself. → **§4c** before you touch anything. |
| `host_cancel_fee_failed` | `cancel-booking.ts:1293` | The D-71 host-cancellation debit was not recorded. The host owes the fee and the ledger does not know. |
| `host_cancel_autoblock_failed` | `cancel-booking.ts:1256` | After a host cancellation the slot was not auto-blocked — it may be rebookable when it should not be. Block it by hand on the listing's availability. |
| `group_void_failed` | `cancel-booking.ts:495` | A group booking's void did not fan out. Attendees may still believe a cancelled session is on. |
| `notify` | `inngest/functions/notify.ts:256` | A notification send failed *permanently* after Inngest exhausted its retries. Someone was not told something. Read `meta` for the recipient and the type, and contact them by hand. **→ read §4a first.** |
| `guest-email` | `inngest/functions/guest-email.ts:55` | Same, for the guest-with-email RSVP path (guests have no account, so there is no in-app notification fallback). **→ read §4a first.** |

> **One action name deliberately absent: `checkout_retired`.** It is written by the same policy
> (`lib/payments/retire-checkout.ts:258`) on every *successful* retire, with outcome **`ok`**, not
> `needs_attention`. It never reaches the digest or `npm run ops:alerts`, and you will only meet it
> browsing the `audit` table directly. It is the system working. Do not triage it.

### 4a. `notify` / `guest-email` rows are REAL as of 2026-08-10 — they were not always

**Read this before triaging either of those two actions.**

**Until 2026-08-10 the test suite wrote real `notify` and `guest-email` rows into the dev database.**
Every `npx vitest run` deposited exactly one of each. They were not failures; they were the
permanently-failed-send *tests* driving the real code path. `recordAudit` inserts through the app's
module-level db singleton (`src/lib/db/index.ts`), which is bound to `public` and bypassed the
suite's per-file schema isolation, so the row landed in dev — silently, because that INSERT's failure
is swallowed by design (`src/lib/audit.ts:111`, load-bearing for the PayMongo 200-ACK path). Logged
as deferred item **D1** by `260810-j3z`.

**This is closed.** Quick task `260810-km4` gave the suite its own `fitout_test` database
(`npm run db:test:setup`, `tests/helpers/test-db-url.ts`), so those writes can no longer reach dev.
They still happen — they are relocated and reported per run, not eliminated — but they land in
`fitout_test`, where a `[test-db] LEAKED WRITES` block names them at the end of each run.

**The operator-facing consequence, and the whole point of the change:**

> **A `notify` or `guest-email` row in the digest is now a REAL permanent send failure. Triage it as
> one — a real person was not told something real. Do not dismiss it as test noise.**

**The historical batch, for the record.** 27 unresolved rows had accumulated (14 `notify` +
13 `guest-email`, dating 2026-08-06 to 2026-08-10). They were classified **before** any was
discharged, and **not on `action` alone** — a genuine permanent send failure is indistinguishable
from test noise at that granularity. The discriminator was the literal error string the two tests
inject, corroborated by their fixture markers:

| Action | Discriminator (ALL parts had to match) |
|---|---|
| `notify` | `meta->>'error' = 'resend 503'` **and** `bookingId = 'bk_failed'` **and** `recipientId = 'user_failed'` **and** `notifyType = 'booking_cancelled_by_host'` (`tests/notifications/notify.test.ts:173-200`) |
| `guest-email` | `meta->>'error' = 'resend 503'` **and** `guestEmailKind = 'rsvp_confirmed'` (`tests/notifications/guest-email.test.ts:106-128`) |

Any row failing the discriminator would have been treated as **GENUINE and left alone**. 27 of 27
matched; **zero were genuine**. Each was discharged individually via
`npm run ops:alerts:resolve -- <id>` (section 6) — **nothing was deleted**; the total `audit` row
count is still 27 and every row and its `meta` remain queryable. No row of any other `action` was
touched: the `auto_refund_*` / `refund_*` / `checkout_expire_failed` / `host_cancel_*` /
`group_void_failed` family in the table above are real money alerts and were explicitly out of scope.

The full per-row dump lives in
`.planning/quick/260810-km4-point-the-vitest-suite-at-its-own-databa/260810-km4-SUMMARY.md`.


### 4b. `checkout_paid_after_lapse` — read `meta.bookingStatus` FIRST; it decides everything

**What it means.** FitOut went to close a checkout session belonging to a hold that had just ended, probed
PayMongo first, and PayMongo answered **`paid`**. Somebody paid for a booking whose hold is over — either
in the seconds before the hold was reclaimed, or afterwards from a stale tab or an unscanned QR.

**What actually happened to the money, mechanically, in every case.** It is **captured at PayMongo, on the
platform wallet.** Nothing was refunded and nothing was confirmed *by this alert's own code path*. The
session was **deliberately NOT expired** — a session the provider reports `paid` is never sent to expire,
because the session is the only handle on the payment and expiring it would destroy the evidence. **No
`booking` row was written either**: the retire policy writes none, ever. So `payment_id`, `payment_method`
and `status` on the booking are exactly what they were before the alert fired.

> ⚠ **`meta.bookingStatus` SPLITS THIS ALERT INTO TWO COMPLETELY DIFFERENT SITUATIONS.** Do not act before
> you have read it. The alert is written whenever the booking is **not** `pending` — and `approved` and the
> terminal statuses have opposite consequences.

#### If `bookingStatus` is `approved` — expect the reconciler to fix this itself

The row is still payable-scoped, so **`payment-reconcile` also selects it**
(`status IN ('pending','approved')`) and will confirm the booking through the normal confirm path within
about five minutes, writing a `webhook_missed` row (§4c) for the same booking. **This is a duplicate view
of one payment, not two problems.**

**What to do:** look the booking up. If it has reached `confirmed` with a `payment_id`, the money and the
booking are both correct — discharge this row and treat the `webhook_missed` one as §4c. If it is **still**
`approved` after several sweep intervals, the reconciler is not reaching it, and there are exactly two
known reasons: the sweep is not running at all (**→ `.planning/ops/DEPLOY-CHECKLIST.md`; an unsynced
Inngest cron raises no error anywhere**), or the booking was created before the reconciler's no-backfill
epoch (`RECONCILE_EPOCH`, `2026-08-22T12:00+08:00` — D-111). In the second case nothing will ever confirm
it, and you must treat it as the terminal case below.

#### If `bookingStatus` is `cancelled` or `declined` — this row is the ONLY report you will ever get

> ⚠ **NOTHING ELSE WILL EVER CHASE THIS PAYMENT.** The booking is terminal, so `payment-reconcile` cannot
> see it (`status IN ('pending','approved')`); `checkout-retire-sweep` cannot see it either; and the D-58
> gone-slot backstop only runs when a confirming webhook arrives, which in this shape it did not. If nobody
> works this row, FitOut keeps the money and the person who paid it hears nothing. **Treat it with the same
> urgency as `auto_refund_manual`.**

**What to check, and where.** Everything you need is on the alert's `meta` (read it with the psql command
in §3 — the digest email deliberately carries no `meta`):

| `meta` key | What it gives you |
|---|---|
| `bookingStatus` | **Read this first** — see the fork above. `approved` = the reconciler is also on it. `cancelled` / `declined` = nothing is. |
| `bookingId` | The booking. Check its `status` and `payment_id`. A non-NULL `payment_id` means a confirm has since landed — re-read the fork above before doing anything. |
| `paymentId` | The `pay_...`. **This is what you refund against.** May be `null` if PayMongo's response omitted it — then use `checkoutSessionId` to find the payment in the dashboard. |
| `paidAt` | When PayMongo says the money was taken. Compare against the booking's `cancelled_at` / `expires_at`. |
| `checkoutSessionId` | The `cs_...`. Open it in the PayMongo dashboard for the payment, the rail and the amount. **The amount is deliberately not in `meta`** (D-72) — get it from the dashboard. |
| `trigger` | Which path ended the hold: `retire-sweep` (the 5-min cron — the only trigger that can carry `approved`), `stale-hold-reclaim` / `open-capacity-reclaim` (somebody else took the slot), `request-expiry` (the payment window closed), `booker-cancel-hold` (**the booker withdrew it themselves**). |
| `probedStatus` | Always `paid` for this action. Present because the same `meta` shape is shared with `checkout_expire_failed`, where it is the useful field. |

**What to do (terminal case).**

1. **Verify the capture in the PayMongo dashboard before moving anything.** A probe reads the provider's
   record; the dashboard is where you see the amount and the rail.
2. **Return the money.** If the rail is card/GCash/Maya, refund against the payment id. **If it is QRPh or
   UBP Online Banking, the API cannot refund it → §5**, the out-of-band procedure.
3. **Do NOT confirm the booking to "fix" it.** The slot was released and may already have been re-sold; a
   confirm would either fail on the exclusion constraint or double-book a real customer.
4. **Do NOT expire the session.** It is already paid — expiring it buys nothing and removes the handle.
5. If `trigger` is `booker-cancel-hold`, **tell the person**. They withdrew deliberately and were charged
   anyway; a refund they never asked for, with no explanation, is its own support ticket.
6. Discharge with §6 once the money is back or the manual return is dispatched.

**One thing this alert does NOT cover, on the record.** A `paid` session on a booking that is still
`pending` is **deliberately silent** — no row is written at all. That is not an omission: `pending` is
exactly the status `payment-reconcile` owns, it will confirm the booking, and a row here as well would put
one payment in your queue twice. If anyone ever narrows the reconciler's status scope, this silence becomes
a hole; the constraint is stated at the branch itself in `src/lib/payments/retire-checkout.ts`.

### 4c. `webhook_missed` — loud on purpose, and NOT a money problem

**What it means.** PayMongo captured a booker's payment and the confirming webhook **never arrived**. The
5-minute reconciliation sweep found the paid session on its own and confirmed the booking.

**What actually happened to the customer's money.** **Nothing is wrong with it.** By the time this row is
written the confirm has already run through the single confirm path the webhook itself uses: the booking is
`confirmed`, `payment_id` and the rail are persisted on the row, and the booker has been sent the
booking-confirmed notification. The host payout follows the normal `payout-sweep` route like any other
confirmed booking. **There is nothing to refund, nothing to re-charge and nothing to re-send.**

The row exists because **a failing transport must be observable rather than absorbed** — the sweep is a
safety net, and a safety net nobody can see catching things is indistinguishable from one that is not
needed. It fires only on a **genuine** transition, never on a replay or a later pass, so one row means one
lost webhook.

**What to check, and where.** On `meta`:

| `meta` key | What it gives you |
|---|---|
| `bookingId` | The booking that was rescued. It should read `confirmed`. |
| `paymentId` / `checkoutSessionId` | The `pay_...` / `cs_...`, for cross-checking against the PayMongo dashboard's webhook delivery log. |
| `method` | The rail PayMongo reported (`gcash`, `qrph`, `card`, … or `unknown`). |
| `paidAt` / `expiresAt` | When the money was taken, and when the hold window closed. |
| `paidWithinHold` | `true` — paid inside their window, the ordinary case. `false` — they paid **after** their hold expired and got the slot anyway because nobody else had taken it. `null` — one of the two instants was unknown, so no claim is made. |

**What to do.**

1. **One row in a quiet week is a blip.** Note it and discharge it (§6).
2. **A cluster in one window is the real signal.** Open the PayMongo dashboard's webhook delivery log for
   that period and check whether deliveries were failing, and whether the endpoint was reachable — a deploy,
   a container recycle or a provider incident will all show up here as several rows minutes apart.
3. **`paidWithinHold: false` is worth reading but is not an action.** It says the booker paid late and the
   slot happened to still be free. If you see it often, the payment window is too short for real behaviour —
   that is a product conversation, not an ops one.
4. ⚠ **Do NOT re-confirm, re-charge, refund or re-send anything.** Every one of those would create the
   double-action this alert exists to prove did *not* happen.
---

## 5. The QRPh / UBP out-of-band manual refund procedure

**State the constraint first, because it governs everything below.**

An already-captured **QRPh** (or UBP Online Banking) payment **cannot be refunded through the PayMongo API
at all.** This is not a bug, not a missing feature on our side, and not something a future release will
fix — it is a **PayMongo rail limitation**. `createRefund`'s own docblock in `src/lib/paymongo.ts` says so,
and `src/lib/payments/refund-rail.ts` records the probe that settled it on 2026-07-23 against a real
captured payment:

```
POST /v1/refunds  →  HTTP 400
{"errors":[{"code":"parameter_invalid",
  "detail":"Refunds are not allowed for payments with source type qrph.", ...}]}
```

The API-refundable rails are `card`, `gcash`, `grab_pay`, `paymaya` (`REFUNDABLE_RAILS`,
`src/lib/payments/refund-rail.ts:42`). **No code in this repository can move money back on the QRPh rail.**
Do not go looking for the function that does it; there isn't one, and adding one is not possible.

### Steps

1. **Get the case detail.** `npm run ops:alerts` for the audit id, then read the row's `meta` via psql
   (section 3). You want the booking id, the captured payment id, and the amount.
2. **Identify the booker and the exact amount owed.** Cross-check the booking row — never trust a figure
   from anywhere but the server-frozen amount recorded at the time.
3. **Confirm the capture in the PayMongo dashboard.** Find the payment by id and verify it is genuinely
   captured, on the rail you think, for the amount you think. If it is on a *refundable* rail, stop — this
   is not a section-5 case; refund it normally and go to section 6.
4. **Execute the refund out of band.** This is a human process outside this codebase: PayMongo support, or
   a manual disbursement to the booker through whatever channel you have. Follow whatever your finance
   process requires for a manual outbound payment.
5. **Tell the booker.** They are owed money and nothing in the product has told them so.
6. **Record the external refund reference in your own record** — a finance ledger, a ticket, a spreadsheet,
   whatever you actually keep. This is not optional bookkeeping: see section 7 for why the audit row itself
   cannot hold it.
7. **Discharge the row** — section 6.

---

## 6. How to discharge the row

```bash
npm run ops:alerts:resolve -- <audit-id> --by "<your name>"
```

This sets `resolved_at` **and `resolved_by`**, and the row leaves both the CLI listing and the daily digest
permanently.

**`--by` is REQUIRED and has no default (2026-08-11, quick task `260811-fh6`).** Not your OS username, not
`USER`, not `USERNAME`, not any environment variable. Omit it and the command refuses and writes nothing.
That is deliberate: a name you type is the record, and a name the machine fills in would make every
discharge *look* attributed while attributing nothing.

**What the name is worth — read this before you rely on it.** `resolved_by` records **who claims to have
discharged the row**. It is an identity that is **asserted, not authenticated**: this CLI has no session,
so anyone who can reach `DATABASE_URL` can run it and type any name. It is meaningful in combination with
your shell / database access control, and it is **not proof of identity on its own**. Type the handle you
are willing to have sitting in an audit table.

Four possible outcomes:

| Output | Meaning |
|---|---|
| `Resolved <id> at <timestamp>, by "<name>" (asserted, not authenticated — this CLI has no session).` | Done. This run discharged it and recorded the name you typed. |
| `<id> was ALREADY discharged at <timestamp> by "<name>" — nothing changed.` | Someone got there first. The timestamp **and the discharger** shown are the **ORIGINAL** ones — a re-run **cannot** rewrite either, by design. Safe to run twice. |
| `<id> was ALREADY discharged at <timestamp> by an unrecorded discharger — nothing changed.` plus `The --by you supplied ("<name>") was NOT recorded.` | One of the 27 rows discharged on 2026-08-10, before the column existed. A past discharge is **never** retro-attributed; your name was not stored anywhere. |
| `resolve needs --by "<your name>". …` + the usage block (exit code **1**) | You omitted `--by`, or gave it a blank value. **Nothing was written.** |
| `No audit row with id <id>. Nothing was discharged.` (exit code **1**) | Typo, or wrong id. Nothing was touched — and the name you supplied landed nowhere. |

**The rule: discharge a row only after the money question is actually settled.** The CLI records that
someone *acted*; it does not and cannot verify that they did. A row discharged before the booker is
actually refunded is worse than one left open — it is now invisible, and nothing will ever surface it again.

---

## 6a. How to review what was discharged

Section 6 discharges a row and it leaves every other surface permanently. This is how you look at what a
predecessor — or you, last month — actually discharged.

```bash
npm run ops:alerts:history            # the last 30 days
npm run ops:alerts:history -- 90      # widen the window to 90 days
```

**It is READ-ONLY.** It performs no write of any kind: there is no un-discharge, and running it cannot
change a `resolved_at`. Safe to run against any database, any number of times.

**Arguments.** One optional positional argument, a whole number of days from **1 to 36500** (default
**30**). Anything else — `0`, `abc`, `-5`, `7abc` — prints the usage block and exits **1** without querying.
An empty result is **not** an error: it prints `No alerts discharged in the last N day(s).` and exits **0**.
Output is capped at the **200** most recently discharged rows; when there are more it says so first
(`200+ discharged in the last N day(s) — showing the 200 most recently discharged.`).

**The columns.**

| Column | Meaning |
|---|---|
| `AUDIT ID` | The row's id — feed it to psql (§3) for the full `meta`. |
| `OUTCOME` | The audit outcome of the ORIGINAL event. Usually `needs_attention` — but see the first design note below. |
| `ACTION` | Which seam produced the alert. Triage table: §4. |
| `CREATED (UTC)` | When the money event happened. |
| `RESOLVED (UTC)` | When a human discharged it. **The list is sorted newest-discharge-first on this column**, so a batch handled in one sitting appears contiguous. |
| `HELD` | Whole hours between the two — **how long the money sat outstanding before somebody discharged it**. Advisory display; it moves no money. |
| `BY` | **Who CLAIMS to have discharged the row** — `resolved_by`, written from the required `--by` (§6). `unrecorded` means the discharger was **NOT CAPTURED**: the row was discharged before the column existed (the 27 of §4a), or outside the CLI. It does **NOT** mean *nobody*. Note it is deliberately not `—`: the `ERROR` column already uses `—` for "this row has no error", and two different absences must not look identical. The value is **asserted, not authenticated** — see §7. Truncated at 19 characters for table width only. |
| `ERROR` | `meta->>'error'`, the single key surfaced here (§3). `—` when the row has none. Truncated at 48 characters **for table width only** — that truncation is not a privacy control. |

**Two design facts you need in order to read this correctly.**

1. **History is UNSCOPED by outcome — deliberately.** `ops:alerts` only ever shows `needs_attention`, but
   `ops:alerts:resolve` will discharge **any** audit id it is handed, by design. So a discharge performed on
   an `ok` / `denied` / `error` row is real, and **this is the only surface in the product that will ever
   show it to you.** Scoping this list to `needs_attention` would hide exactly the discharges most likely to
   have been a mistake. Check the `OUTCOME` column.
2. **There is a `BY` column and there is STILL no `ACTOR` column — and that is a narrowing, not a
   reversal (updated 2026-08-11, `260811-fh6`).** The old wording here ended *"This tool cannot tell you who
   discharged a row. Nothing can — there is no `resolved_by` column."* **That sentence is now false** and is
   replaced rather than left standing. There IS a discharger fact to show, and `BY` shows it. `ACTOR` stays
   omitted anyway, for three reasons in this order:

   1. **Two person-shaped columns in one discharge-ordered row is worse than one.** With `ACTOR = system`
      beside `BY = Jane`, a reader scanning for "who" has two candidates and has to know which is which.
      Adding a correctly-named neighbour *amplifies* the original hazard rather than removing it.
   2. **`actor_id` carries no information in this view.** It is `system` for every money action (§4), so on
      the rows you actually read it is a constant column — pure width, pure confusion risk.
   3. **The fact is not lost.** The query still returns `actor_id`, and the full row is one psql away (§3).
      Only this terminal render drops it.

   *Rejected alternative, on the record: show both, clearly labelled (`EVENT ACTOR` / `DISCHARGED BY`). It
   is defensible and it was considered; it fails on (2), because the extra width buys a constant, and on
   (1), because "clearly labelled" is a bet that a stressed operator reads headers.*

   **And read `BY` for exactly what it is:** the discharger as **claimed**. See §7 — it is asserted, not
   authenticated.

---

## 7. Known limitation, on the record: the discharger is ASSERTED, not AUTHENTICATED

> **NARROWED 2026-08-11 (quick task `260811-fh6`) — read this first; the historical paragraphs below are
> kept deliberately, not left by accident.**
>
> Discharges made from 2026-08-11 onward record an **asserted discharger** (`resolved_by`, written from the
> CLI's required `--by`); the **27 historical discharges remain unattributed forever** and render as
> `unrecorded`; and the identity is **asserted, not authenticated** — the CLI has no session, so the column
> records who *claims* to have discharged the row, meaningful only in combination with shell / database
> access control, and **not proof of identity on its own**.
>
> So the limitation did not disappear; it moved. It used to be *"nothing records who"*. It is now
> *"what is recorded is a claim, not an identity"*. Do not treat a `BY` value as proof of who discharged an
> alert — nothing in this product can establish that, and a column that merely looks authoritative is more
> dangerous in a dispute than an empty one, because it manufactures confidence the data cannot support.
>
> **The compensating control below is therefore MORE relevant, not less.** Keep the out-of-band record.

**The original limitation, as written on 2026-08-10, retained for the record:**

`resolved_at` records **that** a row was discharged. It does not record **by whom** — there is no
`resolved_by` column, and adding one would be a schema migration, deliberately out of scope for the task
that built this (D-J3Z-11, threat register `T-J3Z-06`, disposition **accept**).

The honest consequence: **a discharge is non-repudiable by absence.** If two people can run
`ops:alerts:resolve`, the audit trail cannot tell you which of them did, and it cannot link the discharge
to the refund reference from section 5 step 6.

**Compensating control, and it is a manual one:** the operator's own out-of-band record is the only link
between "this row was discharged" and "this refund was actually paid". Keep it. If discharges ever become
contested, the fix is a `resolved_by` column plus an authenticated ops surface — not a convention.

**Updated 2026-08-11 (`260811-dj4`) — what §6a did and did not change here.** `npm run ops:alerts:history`
now shows **WHAT** was discharged, **WHEN** it was discharged, **how long it was HELD**, and the **error
string** it was discharged on. It still cannot show **BY WHOM**, and no amount of tooling over the current
schema can: the column does not exist. Everything above this paragraph stands unchanged — a discharge
remains non-repudiable by absence, and the out-of-band record remains the only link to the refund reference.

**Amended 2026-08-11, later the same day (`260811-fh6`) — the paragraph immediately above is now partly
superseded, and is kept rather than deleted so the sequence stays legible.** The `resolved_by` column now
exists (migration `0025`) and `ops:alerts:history` prints a `BY` column, so the flat claim "it cannot show
BY WHOM" no longer holds for discharges made from 2026-08-11 onward. What survives, restated precisely:

- **The 27 rows discharged on 2026-08-10 are still non-repudiable by absence, permanently.** They predate
  the column and are **never** back-filled — inventing a discharger for a past act would be fabricating an
  audit record. They render as `unrecorded`, and re-running `resolve --by "<name>"` against one of them
  reports `already_resolved` and stores nothing (the `AND resolved_at IS NULL` guard excludes them).
- **For every discharge after that, non-repudiation is WEAKER THAN IT LOOKS rather than absent.** The name
  is **asserted, not authenticated**: the CLI has no session, so a determined person can type somebody
  else's name, and two people sharing `DATABASE_URL` still cannot be told apart by the audit trail alone.
- **The compensating control is unchanged and still load-bearing.** The out-of-band record remains the only
  link between "this row was discharged" and "this refund was actually paid", and it is now also the only
  independent check on *who*. The real fix is still an authenticated ops surface, not a convention and not
  this column.

---

## 8. What this runbook does NOT close

**T-08-74 remains OPEN, permanently, and `AR-08-01` stands.**

What changed on 2026-08-10 is *reachability*: the alert now reaches a human once a day, and there is a way
to discharge it. What did **not** change, and cannot be changed from this repository, is the rail itself —
an already-captured QRPh payment is still not refundable through the PayMongo API, and every overcharge on
that rail still requires the manual, out-of-band procedure in section 5.

A digest and a CLI are not a fix for a payment rail. They are a way to make sure the humans who *are* the
fix find out in time.

**There is also still no ops UI.** The surfaces are an email and a command line. That is a real gap, not a
rhetorical one — it means redress requires shell access to a machine with a database connection.

**What §6a's review path does NOT close (2026-08-11).** Adding a review surface closed the asymmetry
between making a discharge and auditing one. It did not close any of these, and each is stated so nobody
reads §6a as more than it is:

- **~~No `resolved_by`, so still no answer to "who discharged this".~~ NARROWED 2026-08-11
  (`260811-fh6`).** Discharges made from 2026-08-11 onward record an **asserted discharger**
  (`resolved_by`, written from the CLI's required `--by`); the **27 historical discharges remain
  unattributed forever** and render as `unrecorded`; and the identity is **asserted, not authenticated** —
  the CLI has no session, so the column records who *claims* to have discharged the row, meaningful only in
  combination with shell / database access control, and **not proof of identity on its own**. §7. The
  authenticated ops surface that would make it proof still does not exist and is still not in scope.
- **No un-discharge, and no record of a reversal.** `resolved_at` is written once and never rewritten
  (§6). If a row was discharged in error there is no supported way to reopen it and nothing that would
  record that it had been.
- **Full `meta` is still psql-only.** History surfaces exactly one key, `meta->>'error'` (§3). Booking ids,
  transfer ids, amounts and masked last-4s still require a local database session.
- **Still no ops UI** — this is a *third* command line verb, not a screen. Review still requires shell
  access to a machine with a database connection, exactly as redress does.
- **The query is an accepted sequential scan.** `audit_needs_attention_idx` is partial over *unresolved*
  rows and cannot serve this one. At 27 rows that is irrelevant; the window and the 200-row cap bound the
  *result*, not the scan. The index that would fix it would grow without bound, so it belongs with the
  deferred retention decision, not bolted on. Revisit if `audit` reaches six figures.

---

## Related

- `src/lib/ops/alerts.ts` — the query and the `resolved_at` writer
- `src/inngest/functions/ops-alert-digest.ts` — the daily cron
- `src/lib/db/schema.ts:305-372` — the `audit` table, D3/D4/D5, the D-72 PII contract, retention
- `src/lib/payments/refund-rail.ts` — the single place the QRPh refundability question is answered
- `.planning/v1.0-MILESTONE-AUDIT.md` item 5 — the tech-debt entry this procedure serves
- `.planning/phases/05-payments-payouts/05-HUMAN-UAT.md` item 3 — the UAT item that asked for this
- `tests/helpers/test-db-url.ts` / `tests/global-setup.ts` — the §4a containment: why the suite can no
  longer write `notify` / `guest-email` rows into dev, and the per-run report that says where they went
- `.planning/quick/260810-j3z-make-unresolved-needs-attention-money-al/deferred-items.md` — D1 and D2, both closed
- `.planning/quick/260811-dj4-add-resolved-history-review-to-the-ops-a/260811-dj4-SUMMARY.md` — the review
  path in §6a: why history is unscoped by outcome, why there is no ACTOR column, and the single-key
  `meta->>'error'` widening argued in full
- `src/lib/payments/retire-checkout.ts` — the D-113 retire policy: the ONE owner of what happens to a
  checkout session, and the writer of §4b's `checkout_paid_after_lapse`. Its header states why a `paid`
  session is never expired, which is the constraint §4b's "do NOT expire the session" step comes from
- `src/inngest/functions/payment-reconcile.ts` — the 5-minute reconciliation sweep, the writer of §4c's
  `webhook_missed`
- `.planning/ops/DEPLOY-CHECKLIST.md` — **read this before any deploy.** Both crons above are Inngest
  functions and neither fires until Inngest has re-synced the app; a cron that never fires raises no error
  anywhere, so a missed sync makes both of the above silently stop being written
- `.planning/quick/260811-fh6-add-resolved-by-to-the-audit-table-so-a-/260811-fh6-SUMMARY.md` — the
  `resolved_by` column (migration `0025`), the required `--by` with no default, the `BY` column and its
  honest `unrecorded`, and why the identity is asserted rather than authenticated
- `src/lib/ops/resolve-args.ts` — the one implementation of the `--by` requirement, and the reason there is
  deliberately no fallback to the OS username or any environment variable
