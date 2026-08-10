---
phase: quick-260810-j3z
plan: 01
subsystem: ops-alerting
tags: [ops, audit, inngest, email, pii, money-safety, t-08-74]
requires:
  - "audit table + audit_needs_attention_idx (drizzle/0024_audit_table.sql)"
  - "recordAudit durable sink (src/lib/audit.ts)"
  - "Inngest serve mount (src/app/api/inngest/route.ts)"
  - "Resend transport + private send()/escapeHtml() (src/lib/email.ts)"
provides:
  - "listUnresolvedAlerts — the D5 operator query, executable"
  - "resolveAlert — the FIRST code writer audit.resolved_at has ever had"
  - "npm run ops:alerts / ops:alerts:resolve — operator CLI"
  - "opsAlertDigest — daily 08:50 Asia/Manila cron, registered in serve()"
  - "renderOpsAlertDigest / sendOpsAlertDigest — PII-safe digest email"
  - ".planning/ops/NEEDS-ATTENTION-RUNBOOK.md — the operator redress procedure"
affects:
  - "src/lib/email.ts (appended section; existing sends byte-unchanged)"
  - "src/app/api/inngest/route.ts (sixth function registered)"
tech-stack:
  added: []
  patterns:
    - "SQL-literal predicate (not eq()) where a partial index must stay usable under a generic plan"
    - "Structural PII enforcement: omit the column from the row type so re-export is a type error"
    - "Call-time env reads so a config branch is observable in a test"
key-files:
  created:
    - src/lib/ops/alerts.ts
    - src/inngest/functions/ops-alert-digest.ts
    - scripts/ops-alerts.ts
    - tests/ops/alerts.test.ts
    - tests/ops/alert-digest.test.ts
    - .planning/ops/NEEDS-ATTENTION-RUNBOOK.md
  modified:
    - src/lib/email.ts
    - src/app/api/inngest/route.ts
    - package.json
    - .env.example
    - .env.local (gitignored — NOT committed)
    - .planning/v1.0-MILESTONE-AUDIT.md
    - .planning/phases/05-payments-payouts/05-HUMAN-UAT.md
decisions:
  - "D-J3Z-01 implemented with a SQL literal rather than eq()/isNull() — measured deviation, see below"
  - "T-08-74 left accurately and permanently OPEN in every artifact; AR-08-01 stands"
  - "05-HUMAN-UAT item 3 stays `partial` — 'no UI surfaces it' is still true"
metrics:
  tasks: 3
  commits: 4
  tests_added: 17
  suite: "1163 passed / 4 skipped / 0 failed"
  completed: 2026-08-10
---

# Quick 260810-j3z: Unresolved `needs_attention` money alerts reach a human — Summary

**One-liner:** The D5 operator query became runnable, `audit.resolved_at` got its first code writer, and a
daily 08:50 Manila Inngest digest pushes every unresolved money alert to an inbox carrying no `meta` — the
**reachability** half of T-08-74 only; the QRPh rail limitation is untouched and permanent.

---

## What shipped

| Task | What | Commit |
|---|---|---|
| 1 | `src/lib/ops/alerts.ts` (`listUnresolvedAlerts`, `resolveAlert`, `DEFAULT_ALERT_LIMIT`), `scripts/ops-alerts.ts`, `npm run ops:alerts` / `ops:alerts:resolve`, `tests/ops/alerts.test.ts` (9 cases) | `24c0a57` |
| 2 | `src/inngest/functions/ops-alert-digest.ts` + `renderOpsAlertDigest`/`sendOpsAlertDigest` in `email.ts` + registration in `serve()`, `tests/ops/alert-digest.test.ts` (8 cases) | `fdc6f9d` |
| 3 | `.env.example`, `.env.local`, `.planning/ops/NEEDS-ATTENTION-RUNBOOK.md` (217 lines), milestone-audit item 5, 05-HUMAN-UAT item 3 | `64631bd` |
| — | Deferred item D1 logged | `50c0be9` |

---

## The truthfulness constraint — how it was honoured

**T-08-74 is left OPEN in every byte written.** No artifact — code comment, runbook, doc, or commit
message — states or implies that the QRPh capture became refundable or that milestone-audit item 5 is
closed. The framing used everywhere is the permitted one: *the rail limitation is permanent; the alert now
reaches a human and can be discharged.*

- `ops-alert-digest.ts`'s header carries a dedicated "WHAT THIS DOES **NOT** CLOSE" paragraph naming the
  rail limitation and `AR-08-01`.
- Milestone-audit item 5 was **extended**, not overwritten — i0v's LW-01 paragraph is byte-intact, and the
  new note opens with "**T-08-74 ITSELF REMAINS OPEN AND AR-08-01 STANDS** — read that first".
- `05-HUMAN-UAT` item 3 stays **`partial`**. Its four reasons were re-assessed one by one: three stopped
  being true (scheduled query, push delivery, `resolved_at` writer); **"no UI surfaces it" is STILL TRUE**
  and is stated as such. "Nothing pages anyone" was described precisely as a *daily email digest, which is
  a push channel, not paging* — deliberately not upgraded, because paging is a latency claim a once-a-day
  email cannot back. Summary counts unchanged (`partial: 2`), since the result *value* did not change.

---

## Deviations from Plan

### 1. [Rule 1 — Bug] The prescribed `eq()` predicate silently defeats the partial index

- **Found during:** Task 1 verification (the EXPLAIN gate).
- **Issue:** The plan specified `where(and(eq(audit.outcome, "needs_attention"), isNull(audit.resolvedAt)))`.
  Drizzle's `eq()` emits `outcome = $1`. A **partial** index is only usable when the planner can *prove* the
  query predicate implies the index predicate, and with the value behind a bind parameter it cannot. Under a
  **generic plan** — which PostgreSQL switches to after ~5 executions of a prepared statement, i.e. exactly
  what a long-lived app connection produces — the planner abandoned the index entirely. Measured, with
  `enable_seqscan=off` **and** `plan_cache_mode=force_generic_plan`:

  ```
  ->  Sort  (cost=15.01..15.02 rows=1 width=104)
        Sort Key: created_at DESC NULLS LAST
        ->  Seq Scan on audit  (Disabled: true)
              Filter: ((resolved_at IS NULL) AND (outcome = $1))
  ```

  This defeats D-J3Z-01's entire stated purpose ("so the index is usable") and the retention argument that
  depends on it (`schema.ts:350-354`: the query stays O(unresolved) forever *because* the partial index is
  used).
- **Fix:** the predicate is emitted as a SQL literal — `sql`outcome = 'needs_attention' AND resolved_at IS
  NULL`` — which is now **literally** byte-identical to the index predicate rather than merely semantically
  so. Re-measured under both plan modes: `Index Scan using audit_needs_attention_idx`, **no Sort node**.
  The value is a hardcoded constant chosen by the module; no caller value reaches it, so there is no
  injection surface and nothing to parameterise. The decision (D-J3Z-01) is unchanged — only the mechanism.
- **Files:** `src/lib/ops/alerts.ts`. **Commit:** `24c0a57` (header line corrected in `fdc6f9d`).

### 2. [Rule 2 — Missing coverage] Two extra test cases beyond the plan's behaviour spec

- `alerts.test.ts` **case 3b** (limit handling) and **case 6b** (`resolveAlert` does *not* filter on
  `outcome`). 6b exists because D-J3Z-07 explicitly decides the writer must not scope to one outcome value,
  and nothing in the plan's seven cases would have caught a re-introduction of that scoping.
- `alert-digest.test.ts` **case 6b** (HTML escaping of `action` / `actor_id`). Threat `T-J3Z-02` assigns a
  `mitigate` disposition to exactly this, and no case in the plan measured it — a `mitigate` with no test is
  a claim, not a mitigation.

### 3. [Rule 1 — Doc accuracy] Stale header line in `alerts.ts`

The header still described the superseded `eq()/isNull()` form after deviation 1 landed. Corrected in
`fdc6f9d`. Left uncorrected it would have invited a future reader to "restore" the broken form.

---

## Mutation verification — four mutations, four recorded verbatim REDs

All recorded verbatim in `tests/ops/alert-digest.test.ts`'s header. `git diff --exit-code src/` clean after
every restore.

| # | Mutation | Result |
|---|---|---|
| **M1** | Delete the zero-row early return in `buildAndSendDigest` | Cases 1 **and** 2 RED — `expected { sent: true, count: +0, …(2) } to deeply equal { Object (sent, reason) }`. Without it a zero-row day mails an empty table. |
| **M2** | Select + render `meta` | RED at **both layers**: `alerts.test.ts` case 7 (`expected true to be false`) *and* `alert-digest.test.ts` case 3 (`expected 'FitOut ops — 1 unresolved money alert…' not to contain 'bk_SENTINEL_9Z1'`). |
| **M3** | Drop `AND resolved_at IS NULL` | Three RED: alerts cases 1 & 4, digest case 2. |
| **M4** | Remove case 5's own `delete process.env.OPS_ALERT_EMAIL` | Case 5 RED. Run **after** `.env.local` got a real address — this is the proof the unset-recipient case is still non-vacuous, which was the whole point of Task 3's regression gate. |

M2 reddening both layers is the load-bearing result: the PII contract is measured where it is *enforced*
(the query/type) and where it would *leak* (the email body).

---

## Live verification against real data (beyond the automated gates)

Smoke-run against the dev database's **25 real unresolved rows** (not fixtures):

- `buildAndSendDigest` → `{ sent: true, count: 25, aging: 14, truncated: false }`; 3,930-byte body rendered
  through the `[email:dev]` fallback.
- **76 real `meta` values across 25 rows were extracted from Postgres and searched for in the rendered
  body: ZERO found.** The audit id *was* present, so the check is not passing on an empty body.
- With `OPS_ALERT_EMAIL` unset the same call returned `{ sent: false, reason: "no_recipient", count: 25 }`
  and logged `[ops-alert] …` with all 25 ids — the D-J3Z-04 degradation path, observed live, not inferred.
- CLI round-trip on a **throwaway** row (`j3z_smoke_throwaway`, deleted afterwards — no real alert was
  discharged): resolve #1 → `Resolved … at 2026-08-10T06:32:54.799Z.`; resolve #2 → `was ALREADY discharged
  at 2026-08-10T06:32:54.799Z — nothing changed.` The original timestamp is byte-identical and the second
  run never claims it acted.
- `npm run ops:alerts:resolve -- no_such_audit_id` → error line, **exit 1**.

---

## Verification results

| Gate | Result |
|---|---|
| `npx vitest run tests/ops` | **17/17 passed** (9 + 8) |
| `npx vitest run` (full suite) | **1163 passed / 4 skipped / 0 failed** |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | **0 errors**, 9 warnings — all pre-existing, **none** in any file this task touched |
| EXPLAIN, custom **and** generic plan | `Index Scan using audit_needs_attention_idx`, **no Sort node** |
| Cron slot uniqueness | five distinct minutes — `0`, `15`, `30`, `45`, `50`; no duplicate |
| `grep -c opsAlertDigest route.ts` | 3 (import + array membership + the comment naming it) |
| `git diff --exit-code src/` after all mutations | clean |
| `ls drizzle/*.sql \| tail -1` | `drizzle/0024_audit_table.sql` — **no migration written** |
| Real address containment | `.env.local` only; gitignored (`.gitignore:39`) and **never staged** |
| `.env.example` carries the real address | 0 occurrences |
| Runbook length / unhedged rail statement | 217 lines; 3 unhedged statements on non-heading lines |

**Suite-baseline note:** the plan's `<verification>` cites a baseline of 1087 at commit `7f46747`. That
figure predates quick task `260810-i0v`, whose own VERIFICATION.md records **1146 passed / 4 skipped / 0
failed**. 1146 + 17 = **1163**, matching exactly — net change is precisely the cases added here, with zero
pre-existing tests newly failing.

**Lint-baseline note:** STATE.md quotes a 7-warning baseline; the tree actually reports 9. The two extra are
`react-hooks/incompatible-library` warnings in `signup/page.tsx` and the host listing `wizard.tsx` — files
this task never touched. Zero warnings were added.

---

## Threat model — dispositions honoured

| Threat | Disposition | How |
|---|---|---|
| T-J3Z-01 (meta in the email body) | mitigate | Structural: four explicit columns, no `meta` on the row type. Pinned by sentinel test + M2 + a 76-value live scan. |
| T-J3Z-02 (`action`/`actor_id` HTML injection) | mitigate | Every interpolated field `escapeHtml`'d; **case 6b added** to measure it. |
| T-J3Z-03 (unbounded digest) | mitigate | `LIMIT 201`, renders 200, states `200+ …`. Case 6. |
| T-J3Z-04 (serve mount DoS) | mitigate | Log-and-no-op; call-time env read. Case 5 + M4. |
| T-J3Z-05 (`resolved_at` clobber) | mitigate | `AND resolved_at IS NULL` guard. Case 5 + live round-trip. |
| T-J3Z-06 (who discharged) | accept | No `resolved_by`; recorded in runbook §7 as a stated gap with the out-of-band record as compensating control. |
| T-J3Z-07 (cron spoofing) | transfer | Unchanged — existing Inngest signing + `INNGEST_SIGNING_KEY` guard. No new endpoint. |
| T-J3Z-SC (package installs) | N/A | **No package was installed.** Nothing was added to `package.json` beyond two `scripts` entries. |

---

## Known Stubs

None. Every surface this task claims is wired end to end and was exercised against real data.

---

## Deferred Issues

**D1 — the test suite writes real `needs_attention` rows into the dev database.** Each `npx vitest run`
adds one `notify` + one `guest-email` row (observed 21 → 25 across two runs), because `recordAudit` inserts
via the app db singleton and takes no `DbConn`. **Pre-existing** — identical rows exist from before this
task began — and out of scope: fixing it means threading a `DbConn` through all 57 awaited call sites on
money paths. Logged in full at `deferred-items.md` (commit `50c0be9`), including *why it now matters more*:
those rows are, as of today, emailed to a human every morning while representing no real money.

---

## What this task did NOT close, restated

An already-captured **QRPh** payment **cannot be refunded through the PayMongo API at all** — settled by the
2026-07-23 probe recorded in `src/lib/payments/refund-rail.ts` (`HTTP 400 … "Refunds are not allowed for
payments with source type qrph."`). No code in this repository can change that.

**T-08-74 remains OPEN. AR-08-01 stands. Milestone-audit item 5 is NOT closed. 05-HUMAN-UAT item 3 remains
`partial`, because there is still no ops UI — a CLI and a daily email are not a UI.**

---

## Self-Check: PASSED

All created files verified present on disk; all four commit hashes verified in `git log`.
