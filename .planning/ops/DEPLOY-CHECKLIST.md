# Deploy checklist — the steps that fail SILENTLY if you skip them

**Audience:** whoever deploys or redeploys FitOut. No prior context assumed.
**Created:** 2026-08-22 (plan `13.1-06`).
**Scope:** the post-deploy steps that produce **no error anywhere** when they are missed. It is
deliberately NOT a full runbook for building, hosting or provisioning the app.

> **This file did not exist before 2026-08-22, and that is why it exists now.** The Inngest sync
> requirement below was recorded only in a code comment (`src/app/api/inngest/route.ts`) and in two phase
> SUMMARY files — three places a deploying operator has no reason to open. Phase 13.1's verifier flagged
> it (residual C) because the phase's entire guarantee now rides on two crons that this step turns on.
> It is the smallest honest checklist, not a complete one; §5 says what it does not cover.

---

## 1. THE ONE THAT FAILS SILENTLY: sync the app with Inngest

**Every scheduled job in FitOut is an Inngest function, and Inngest learns the schedule from a SYNC of the
`/api/inngest` serve endpoint — not from the deploy.** A function that has not been synced does not exist as
far as Inngest is concerned. It is not disabled, not erroring, not pending: it is absent.

> ⚠ **A CRON THAT NEVER FIRES RAISES NO ERROR ANYWHERE.** Nothing logs, nothing alerts, no health check
> goes red, and the app serves traffic perfectly. The only detector left is a customer's complaint —
> which is exactly how the two 2026-08-21 evidence payments were found, one of them three days late.

**Sync after EVERY deploy that changes the function list, and after every deploy to a new URL.** When in
doubt, sync: it is idempotent.

### The nine registered functions

Registration is derived from the `functions: [...]` array in `src/app/api/inngest/route.ts` at sync time
and is stored nowhere else. All nine must appear after a sync.

| Function id | Trigger | What it is for | What silence costs |
|---|---|---|---|
| **`payment-reconcile`** | cron `TZ=Asia/Manila 2-59/5 * * * *` (every 5 min from :02) | **Phase 13.1 SC1–SC3.** Finds bookings PayMongo says are paid whose confirming webhook never arrived, confirms them through the one confirm path, and files a `webhook_missed` alert. | **A booker who paid gets nothing.** Every lost webhook stays lost; the money is captured, the booking sits `pending` until its hold is swept, and nobody finds out. |
| **`checkout-retire-sweep`** | cron `TZ=Asia/Manila 4-59/5 * * * *` (every 5 min from :04) | **Phase 13.1 D-113.** Expires the PayMongo checkout session of every lapsed hold, so the ability to pay dies with the hold. | **FitOut takes money for bookings it no longer holds.** Every lapsed hold's session stays payable indefinitely — an open tab or an unscanned QR can still charge a booker for a slot already given to somebody else. |
| `payout-sweep` | cron `TZ=Asia/Manila 0 * * * *` | Pays hosts after their sessions are delivered. | Hosts are never paid. |
| `payout-reconcile` | cron `TZ=Asia/Manila 30 * * * *` | Chases transfers stuck in Processing. | Stuck payouts are never noticed. |
| `request-expiry-sweep` | cron `TZ=Asia/Manila 15 * * * *` | Auto-declines lapsed requests and releases lapsed payment windows. | Slots stay blocked by dead holds forever. |
| `reminders-sweep` | cron `TZ=Asia/Manila 45 * * * *` | The pre-expiry / pre-SLA / pre-session reminders. | No reminder is ever sent. |
| `ops-alert-digest` | cron `TZ=Asia/Manila 50 8 * * *` (daily 08:50) | Emails the unresolved `needs_attention` money alerts. | **Every alert in `NEEDS-ATTENTION-RUNBOOK.md` goes back to being psql-only.** Including the two above. |
| `notify` | event `fitout/notify` | Fans one event out to the in-app row and the email. | Every notification silently drops on the floor. |
| `guest-email` | event `fitout/guest-email` | The guest-with-email RSVP send (guests have no account, so no in-app fallback). | Every guest RSVP email drops. |

⚠ **The two 13.1 crons and `ops-alert-digest` fail as a set.** If `ops-alert-digest` is unsynced, the other
two can be working perfectly and you would still never see the `webhook_missed` /
`checkout_paid_after_lapse` rows they file. Check all three, not one.

### How to sync

- **Local development:** run the Inngest dev server alongside `npm run dev`:
  ```bash
  npm run dev:inngest      # npx inngest-cli@latest dev
  ```
  It discovers `/api/inngest` and syncs automatically. Its UI is at `http://localhost:8288`.
- **A deployed environment:** sync from the Inngest Cloud dashboard (**Apps → your app → Sync**, pointed at
  `https://<your-host>/api/inngest`), or by the sync mechanism your hosting integration provides. The
  endpoint must be publicly reachable and `INNGEST_SIGNING_KEY` must be set (§3).

---

## 2. CONFIRM it — two checks, and the second is the one that matters

**Do not stop at "the sync said OK".** A successful sync proves registration; it does not prove a tick.

### Check 1 — REGISTERED

Open the Inngest dashboard (Cloud: **Apps → your app → Functions**; local: `http://localhost:8288`) and
confirm **all nine ids in §1's table are listed**. An empty or short list means the app was deployed but
never synced, or was synced from a different URL.

### Check 2 — TICKING (the real one)

In the same dashboard, open **Runs** and filter by function id.

- `payment-reconcile` runs at **:02, :07, :12, …** — so **within ~10 minutes of a deploy you must be able
  to see at least one completed run.**
- `checkout-retire-sweep` runs at **:04, :09, :14, …** — same, offset by two minutes.

**Zero runs after 10 minutes means it is not ticking, no matter what the Functions list says.** That is the
whole failure mode this file exists for.

Each run returns a JSON result you can read straight off the run detail:

```
{ "scanned": 0, "outcomes": {} }
```

**`scanned: 0` is the healthy steady state, not a problem** — it means there were no paid-but-unconfirmed
bookings (or no lapsed sessions) that pass. A run that returns it is a run that happened, which is exactly
what you are checking for.

### If it is registered but never runs

1. Confirm the deployed URL Inngest holds is the one actually serving (a redeploy to a new hostname needs a
   fresh sync).
2. Confirm `/api/inngest` is publicly reachable and not behind auth, a preview-protection gate, or an
   IP allow-list.
3. Confirm `INNGEST_SIGNING_KEY` matches the environment you synced from — a mismatch makes Inngest's
   invocations fail verification, and the runs show as errors rather than as absent.

---

## 3. Environment variables — which fail LOUDLY and which fail QUIETLY

Knowing which is which is the point of this section; the full list with commentary is `.env.example`.

**Fail LOUDLY — the app will not boot in production without them.** You will find these immediately.

| Variable | Behaviour when missing |
|---|---|
| `INNGEST_SIGNING_KEY` | `src/app/api/inngest/route.ts` **throws at module load in production.** Deliberate: an unverified serve endpoint is a security hole, not a config gap. `next build` and dev are exempt. |
| `DATABASE_URL` · PayMongo keys · auth secrets | Boot guards in their own modules. |

**Fail QUIETLY — the app boots and behaves, and something just does not happen.** These are the ones to
check on purpose:

| Variable | Behaviour when missing |
|---|---|
| `OPS_ALERT_EMAIL` | The daily digest **logs and no-ops**. It deliberately does not throw — a missing notification address must not take down the whole `/api/inngest` mount. Grep the server log for `[ops-alert]`. **Unset in a deployed environment = nobody is reading the money alerts.** |
| `INNGEST_EVENT_KEY` | Events (`fitout/notify`, `fitout/guest-email`) may not reach Inngest. `emitNotify` swallows its own transport errors by design, so a failed send looks exactly like a successful one from the app's side. |
| `APPROVAL_PAYMENT_WINDOW_HOURS` | ⚠ Not a missing-value problem but a **stale-value** one (D-95): if it is set to `24` anywhere, the 12h default never takes effect and the old policy silently stays in force. **Unset it** unless you mean it. |

---

## 4. Database migrations

Run the generated migrations against the target database before the new code serves traffic:

```bash
npm run db:migrate
```

As of 2026-08-22 the migration set ends at **`drizzle/0025_audit_resolved_by.sql`** (26 files). Phase 13.1
added **zero** migrations (13.1-CONTEXT D-112), so a deploy of that phase needs no schema change at all —
but confirm the target is at 0025 rather than assuming it.

---

## 5. What this checklist does NOT cover

Stated so nobody reads it as more than it is:

- **No hosting, build or provisioning steps.** FitOut has no committed deployment target yet; the steps
  above are host-agnostic on purpose. When a host is chosen, its specifics belong here.
- **No rollback procedure.** There is none written down.
- **No smoke test.** "Registered and ticking" is not "the booking flow works". The nearest thing to an
  end-to-end check is `.planning/phases/05-payments-payouts/05-HUMAN-UAT.md`.
- **No monitoring or uptime alerting.** The only recurring signal that reaches a human is the daily ops
  digest, and only if `OPS_ALERT_EMAIL` is set. §2's "check the Runs view" is a manual act, done once, by
  whoever deployed — there is nothing that would tell you a month later that a cron stopped.
- **This file is not enforced by any test.** It is documentation, and it will drift. Re-derive the function
  list from `src/app/api/inngest/route.ts` if it looks wrong; that array is the only source of truth.

---

## Related

- `src/app/api/inngest/route.ts` — the `functions: [...]` array, the sole source of truth for what gets
  registered, and the fail-closed `INNGEST_SIGNING_KEY` guard
- `src/inngest/functions/payment-reconcile.ts` — the reconcile sweep; `reconcileCron()` builds the cron
  string from the constants, so the schedule in §1 is derived rather than hand-typed
- `src/inngest/functions/checkout-retire.ts` — the retire sweep; `retireCron()`, same
- `.planning/ops/NEEDS-ATTENTION-RUNBOOK.md` — what to do with the alerts these crons file (§4b, §4c)
- `.env.example` — every variable, with the reasoning for each default
- `README.md` — local setup, including `npm run db:test:setup` for the test database
