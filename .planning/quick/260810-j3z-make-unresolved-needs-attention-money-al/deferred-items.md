# Deferred items — discovered during quick task 260810-j3z, deliberately NOT fixed here

## D1 — The notify / guest-email failure tests write real `needs_attention` rows into the DEV database

**Discovered:** while smoke-testing the new digest against the live dev DB. The unresolved count moved
**21 → 25** across two full-suite runs, and the new rows are:

```
 guest-email | system | 2026-08-10 06:30:04+00
 notify      | system | 2026-08-10 06:29:41+00
 guest-email | system | 2026-08-10 06:21:34+00
 notify      | system | 2026-08-10 06:20:58+00
```

Exactly one `notify` + one `guest-email` row per `npx vitest run`.

**Cause:** `recordAudit` (`src/lib/audit.ts:104`) inserts via the app db singleton (`@/lib/db`), which is
bound to the **public** schema. The permanently-failed-send tests for `notify` / `guest-email` drive that
code path for real, so the row lands in the dev database rather than in the caller's isolated test schema.
Integration tests elsewhere in this repo take a `DbConn` by dependency injection and are correctly isolated;
these two paths do not, because `recordAudit` takes no `DbConn`.

**Why it was NOT fixed here.** Pre-existing and out of this task's scope — identical rows exist from
`05:13`, `05:17`, `05:42` and `05:51` UTC, i.e. before this task began. Fixing it means threading a `DbConn`
through `recordAudit`, which touches all 57 awaited call sites on money paths. That is its own task with its
own risk budget, not a drive-by change on a money-adjacent path.

**Why it now matters more than it did.** Before this task nothing read those rows, so the pollution was
invisible. As of today they are emailed to a human every morning: the operator's real digest will carry a
slowly-growing tail of test-generated `notify` / `guest-email` rows that represent no real money and no real
failure. That is exactly the noise that trains someone to stop reading the alert.

**Suggested resolution (whoever picks this up):** either give `recordAudit` an optional `DbConn` parameter
so the tests can inject the isolated schema, or have the two tests assert against a mocked audit sink. Then
discharge the accumulated test rows with `npm run ops:alerts:resolve`.

**Interim workaround, safe today:** the rows are discharged like any other —
`npm run ops:alerts:resolve -- <audit-id>` — and they will not come back until the suite runs again.
