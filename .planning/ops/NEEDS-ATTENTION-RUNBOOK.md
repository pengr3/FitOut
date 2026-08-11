# Runbook — unresolved `needs_attention` money alerts

**Audience:** whoever holds the ops pager for FitOut. No prior context assumed.
**Created:** 2026-08-10 (quick task `260810-j3z`).
**Scope:** discovering, triaging, redressing and discharging an unresolved money alert.

---

## 1. What this covers, and why it is NOT named "qrph-overcharge-runbook"

The obvious name for this file would have been something QRPh-shaped, because the QRPh unrefundable-rail
overcharge is the sharpest case in it. That name was deliberately rejected (D-J3Z-10).

The daily digest surfaces **every** `needs_attention` seam in the product — 17 `recordAudit` call sites
across five files, writing **13 distinct action names** (section 4). An operator woken up holding a
`refund_transfer_failed` or a `checkout_expire_failed` row would open a file called "qrph overcharge
runbook", conclude it did not apply to them, and close it. Every one of these rows means the same thing:
**FitOut is holding or has mishandled money that belongs to somebody, and no code path can fix it.**

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

| `action` | Where it is written | What it means / what you must do |
|---|---|---|
| **`auto_refund_manual`** | `api/paymongo/webhook/route.ts:185` | **The big one.** A payment landed for a slot that was already gone, on a rail that **cannot be refunded** through the API. Real money is held that is not ours. → **Section 5.** |
| `auto_refund_failed` | `api/paymongo/webhook/route.ts:174` | Same gone-slot situation on a *refundable* rail, but the refund call itself failed. Retry the refund from the PayMongo dashboard against the payment id in `meta`; if the rail turns out to be unrefundable, treat as section 5. |
| `refund_after_payout` | `api/paymongo/webhook/route.ts:357` | A refund became due *after* the host payout already moved. The money is with the host, not on the platform wallet. Recover from the host (or net against a future payout) before refunding the booker. |
| `refund_manual_required` | `cancel-booking.ts:797, 1231` | Money is owed but the API cannot move it: unrefundable rail, no captured payment id, no usable destination, or below PayMongo's ₱1 floor. → **Section 5.** |
| `refund_dispatch_failed` | `cancel-booking.ts:708, 1219` | The refund dispatch attempt threw. Check the payment id in `meta`, confirm in the PayMongo dashboard whether a refund actually landed, then either retry or treat as section 5. |
| `refund_transfer_failed` | `cancel-booking.ts:779` | The D-72 InstaPay refund-transfer failed. **Deliberately not auto-retried** — PayMongo requires a NEW `reference_number` per attempt. Re-issue manually with a fresh reference. |
| `refund_over_instapay_ceiling` | `cancel-booking.ts:735` | The refund exceeds the InstaPay ceiling, so the transfer was never fired (it would be doomed). Split it, or disburse out of band. |
| `checkout_expire_failed` | `booking.ts:634, 889` | A superseded checkout session could not be expired — **a live payable session is stranded**, so a booker can still pay for something they should not be able to. Expire it in the PayMongo dashboard promptly; if it was already paid, you now have a gone-slot payment (section 5). |
| `host_cancel_fee_failed` | `cancel-booking.ts:1195` | The D-71 host-cancellation debit was not recorded. The host owes the fee and the ledger does not know. |
| `host_cancel_autoblock_failed` | `cancel-booking.ts:1158` | After a host cancellation the slot was not auto-blocked — it may be rebookable when it should not be. Block it by hand on the listing's availability. |
| `group_void_failed` | `cancel-booking.ts:478` | A group booking's void did not fan out. Attendees may still believe a cancelled session is on. |
| `notify` | `inngest/functions/notify.ts:256` | A notification send failed *permanently* after Inngest exhausted its retries. Someone was not told something. Read `meta` for the recipient and the type, and contact them by hand. **→ read §4a first.** |
| `guest-email` | `inngest/functions/guest-email.ts:55` | Same, for the guest-with-email RSVP path (guests have no account, so there is no in-app notification fallback). **→ read §4a first.** |

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
npm run ops:alerts:resolve -- <audit-id>
```

This sets `resolved_at` and the row leaves both the CLI listing and the daily digest permanently.

Three possible outcomes:

| Output | Meaning |
|---|---|
| `Resolved <id> at <timestamp>.` | Done. This run discharged it. |
| `<id> was ALREADY discharged at <timestamp> — nothing changed.` | Someone got there first. The timestamp shown is the **ORIGINAL** discharge time — a re-run **cannot** rewrite it, by design. Safe to run twice. |
| `No audit row with id <id>. Nothing was discharged.` (exit code **1**) | Typo, or wrong id. Nothing was touched. |

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
| `ERROR` | `meta->>'error'`, the single key surfaced here (§3). `—` when the row has none. Truncated at 48 characters **for table width only** — that truncation is not a privacy control. |

**Two design facts you need in order to read this correctly.**

1. **History is UNSCOPED by outcome — deliberately.** `ops:alerts` only ever shows `needs_attention`, but
   `ops:alerts:resolve` will discharge **any** audit id it is handed, by design. So a discharge performed on
   an `ok` / `denied` / `error` row is real, and **this is the only surface in the product that will ever
   show it to you.** Scoping this list to `needs_attention` would hide exactly the discharges most likely to
   have been a mistake. Check the `OUTCOME` column.
2. **There is NO ACTOR column, and its absence is intentional — see §7.** `actor_id` exists on the row, but
   it is the actor of the **original event** (`system` for every money action, §4), *not* whoever discharged
   it. In a list ordered by discharge time an ACTOR column reads as "who discharged this", and that
   misreading is actively dangerous in a dispute. **This tool cannot tell you who discharged a row. Nothing
   can — there is no `resolved_by` column.**

---

## 7. Known limitation, on the record: no `resolved_by`

`resolved_at` records **that** a row was discharged. It does not record **by whom** — there is no
`resolved_by` column, and adding one would be a schema migration, deliberately out of scope for the task
that built this (D-J3Z-11, threat register `T-J3Z-06`, disposition **accept**).

The honest consequence: **a discharge is non-repudiable by absence.** If two people can run
`ops:alerts:resolve`, the audit trail cannot tell you which of them did, and it cannot link the discharge
to the refund reference from section 5 step 6.

**Compensating control, and it is a manual one:** the operator's own out-of-band record is the only link
between "this row was discharged" and "this refund was actually paid". Keep it. If discharges ever become
contested, the fix is a `resolved_by` column plus an authenticated ops surface — not a convention.

**Updated 2026-08-11 — what §6a did and did not change here.** `npm run ops:alerts:history` now shows
**WHAT** was discharged, **WHEN** it was discharged, **how long it was HELD**, and the **error string** it
was discharged on. It still cannot show **BY WHOM**, and no amount of tooling over the current schema can:
the column does not exist. Everything above this paragraph stands unchanged — a discharge remains
non-repudiable by absence, and the out-of-band record remains the only link to the refund reference.

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

- **No `resolved_by`, so still no answer to "who discharged this".** §7. That needs a schema migration plus
  an authenticated ops surface.
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
