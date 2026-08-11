// The operator query + the first `resolved_at` writer, exercised against a real isolated schema.
//
// WHAT IS ACTUALLY UNDER TEST HERE, and why each case exists rather than being assumed:
//
//   - THE PREDICATE IS THE PRODUCT. `listUnresolvedAlerts` is the D5 operator queue given a real
//     implementation. If it returns a RESOLVED row the operator re-sees a discharged alert forever
//     (case 1); if it returns a non-`needs_attention` row the queue fills with `ok`/`denied` noise and
//     stops being a money queue (case 2). Both halves of the WHERE are load-bearing and both are pinned.
//   - ORDER IS AN ASSERTION, NOT A COINCIDENCE (case 3). `ORDER BY created_at DESC NULLS LAST` matches
//     `audit_needs_attention_idx` byte for byte (D-J3Z-01). A set-membership assertion would stay green
//     if the ORDER BY were dropped entirely, so the order itself is asserted.
//   - THE CLOBBER IS THE FAILURE MODE (case 5). `resolveAlert` is guarded by `AND resolved_at IS NULL`,
//     which is the ONLY thing preventing a second run from rewriting the original discharge time — the
//     historical fact of WHEN a money alert was settled. Asserting "the second call did not error" would
//     measure nothing; case 5 asserts the returned timestamp is strictly equal to the first call's.
//   - A TYPO MUST NEVER LOOK LIKE A DISCHARGE (case 6). An unknown id reports not_found and creates no row.
//   - `meta` NEVER LEAVES THE QUERY (case 7). D-J3Z-02 / D-72: the query selects four explicit columns and
//     `UnresolvedAlert` has no `meta` field, so the omission is STRUCTURAL. Case 7 pins it at the query
//     layer; the email-body half is pinned by the sentinel case in tests/ops/alert-digest.test.ts.
//
//   - AND THE DISCHARGE ITSELF IS REVIEWABLE (cases 8-13, `listResolvedAlerts`). Cases 1 and 4 pin that a
//     discharged row LEAVES the queue; until 2026-08-11 nothing pinned that it ARRIVES anywhere. That
//     absence was D2 — found by an operator at a human-verification checkpoint, not by a test, which is
//     itself the argument for these six. Case 8 is case 1's mirror; case 13 is case 6b's.
//
// EVERY fixture timestamp is computed by POSTGRES (`now() - make_interval(...)`), never by the JS clock —
// the 07-05 discipline. Host/Docker clock skew can otherwise make correct arithmetic look wrong.
//
// ---------------------------------------------------------------------------------------------------
// CONFIRM-THEN-FIX — the RED for cases 8-13, recorded VERBATIM (quick task 260811-dj4, 2026-08-11).
// Written FIRST against UNCHANGED `src/`; `git diff --exit-code src/ scripts/` was clean at this point.
// `npx vitest run tests/ops/alerts.test.ts`, bare, no DATABASE_URL exported:
//
//    FAIL  tests/ops/alerts.test.ts > listResolvedAlerts > case 8 — returns ONLY resolved rows; an open alert never appears in history
//   TypeError: listResolvedAlerts is not a function
//    FAIL  tests/ops/alerts.test.ts > listResolvedAlerts > case 9 — newest DISCHARGE first, tie-broken by created_at DESC
//   TypeError: listResolvedAlerts is not a function
//    FAIL  tests/ops/alerts.test.ts > listResolvedAlerts > case 10 — a 30-day default window, widenable by `days`
//   AssertionError: expected undefined to be 30 // Object.is equality
//    FAIL  tests/ops/alerts.test.ts > listResolvedAlerts > case 11 — honours an explicit limit and defaults to DEFAULT_HISTORY_LIMIT
//   AssertionError: expected undefined to be 200 // Object.is equality
//    FAIL  tests/ops/alerts.test.ts > listResolvedAlerts > case 12 — surfaces ONLY meta->>'error'; the rest of `meta` cannot reach the row
//   TypeError: listResolvedAlerts is not a function
//    FAIL  tests/ops/alerts.test.ts > listResolvedAlerts > case 13 — a discharge on a NON-needs_attention row is visible here, and ONLY here
//   TypeError: listResolvedAlerts is not a function
//         Tests  6 failed | 9 passed (15)
//
// NOTE, because the prediction was wrong and the record should say so: the plan expected a MODULE-LEVEL
// failure (the whole file failing to import, since the three named exports do not exist). That is NOT what
// happened. Vite resolves a missing named export from a TypeScript module to `undefined` rather than
// throwing at import time, so the file loaded, the nine EXISTING cases still PASSED, and each new case
// failed individually — four on `listResolvedAlerts is not a function`, and cases 10/11 EARLIER than that,
// on their `DEFAULT_HISTORY_DAYS`/`DEFAULT_HISTORY_LIMIT` constant assertions, which is why those two show
// an AssertionError instead. Recorded as observed; not synthesised, and not "improved" by stubbing.
//
// ---------------------------------------------------------------------------------------------------
// MUTATION VERIFICATION for cases 8-13 (anti-vacuity house standard). Each mutation was applied to `src/`,
// `npx vitest run tests/ops` was re-run bare with no DATABASE_URL exported, the result was recorded
// VERBATIM below, and the mutation was reverted — `git diff --exit-code src/` clean afterwards.
//
// H1 — delete the `resolved_at >= now() - make_interval(...)` window bound, keep `IS NOT NULL`. VERBATIM:
//        FAIL  tests/ops/alerts.test.ts > listResolvedAlerts > case 10 — a 30-day default window, widenable by `days`
//       AssertionError: expected [ 'audit_27', 'audit_26' ] to not include 'audit_26'
//             Tests  1 failed | 22 passed (23)
//      i.e. without the window the 40-day-old discharge comes back at the default. The window is what
//      keeps an unbounded audit table from becoming an unreadable dump.
//
// H2 — delete the ENTIRE `.where()`. VERBATIM:
//        FAIL  tests/ops/alerts.test.ts > listResolvedAlerts > case 8 — returns ONLY resolved rows; an open alert never appears in history
//       AssertionError: expected [ 'audit_20', 'audit_18', 'audit_19' ] to not include 'audit_20'
//        FAIL  tests/ops/alerts.test.ts > listResolvedAlerts > case 10 — a 30-day default window, widenable by `days`
//       AssertionError: expected [ 'audit_27', 'audit_26' ] to not include 'audit_26'
//             Tests  2 failed | 21 passed (23)
//      THIS is where case 8's teeth are: with no predicate at all an UNRESOLVED row enters the history
//      review, which would make a discharge log that reports undischarged obligations as discharged.
//
// H2b — delete ONLY `resolved_at IS NOT NULL`, KEEP the window. **PREDICTED GREEN, AND OBSERVED GREEN.**
//       VERBATIM:
//         Test Files  2 passed (2)
//              Tests  23 passed (23)
//      CONCLUSION, recorded rather than suppressed: `NULL >= x` evaluates to NULL, never true, so the
//      window ALREADY excludes every unresolved row and the explicit clause is logically redundant TODAY.
//      The clause is INTENT — the declared definition of the set, and the half that survives if the window
//      is ever made optional; the window is the ENFORCEMENT. Precedent for reporting a green mutation as
//      observed rather than dropping it: 09-23 M2a. A mutation you predict green must still be RUN — the
//      prediction is the hypothesis, not the result — and case 8's teeth are demonstrated by H2 above,
//      which is the mutation that actually removes the enforcement.
//
// H3 — flip `resolved_at DESC` to `ASC`. VERBATIM:
//        FAIL  tests/ops/alerts.test.ts > listResolvedAlerts > case 9 — newest DISCHARGE first, tie-broken by created_at DESC
//       AssertionError: expected [ 'audit_21', 'audit_22', 'audit_23' ] to deeply equal [ 'audit_23', 'audit_22', 'audit_21' ]
//             Tests  1 failed | 22 passed (23)
//
// H3b — drop the `, created_at DESC` tie-break, keep `resolved_at DESC`. VERBATIM:
//        FAIL  tests/ops/alerts.test.ts > listResolvedAlerts > case 9 — newest DISCHARGE first, tie-broken by created_at DESC
//       AssertionError: expected 'audit_24' to be 'audit_25' // Object.is equality
//             Tests  1 failed | 22 passed (23)
//      RED, which is the answer that matters here: it proves the single-statement UPDATE in case 9 produces
//      a GENUINE tie. Had this come back green the fixture would have been manufacturing two distinct
//      timestamps and the ORDER BY's second term would have been untestable — ship-nothing-you-cannot-measure
//      would then have required deleting the term and the assertion together.
//
// H4 — add `meta: audit.meta` to the select AND `meta` to `ResolvedAlert`. VERBATIM:
//        FAIL  tests/ops/alerts.test.ts > listResolvedAlerts > case 12 — surfaces ONLY meta->>'error'; the rest of `meta` cannot reach the row
//       AssertionError: expected true to be false // Object.is equality
//        Test Files  1 failed | 1 passed (2)
//             Tests  1 failed | 22 passed (23)
//      NOTE WHAT STAYED GREEN, because it is the whole point: `alerts.test.ts` case 7 (the UnresolvedAlert
//      guard) and the ENTIRE `alert-digest.test.ts` file including case 3's email sentinel. Widening the
//      HISTORY row does not trip the digest's guards — so case 12 is not riding on them, it has its own
//      teeth, and the new surface is measured where it would actually leak.
//      (Process note, for honesty: the first H4 run was performed with H3b still applied and reddened both
//      case 9 and case 12. That run was discarded and H4 was re-applied to a clean `src/`; the isolated
//      re-run above is what is recorded.)
//
// H5 — replace the `error` projection with `sql`NULL``. VERBATIM:
//        FAIL  tests/ops/alerts.test.ts > listResolvedAlerts > case 12 — surfaces ONLY meta->>'error'; the rest of `meta` cannot reach the row
//       AssertionError: expected null to be 'resend 503' // Object.is equality
//             Tests  1 failed | 22 passed (23)
//      The ONE deliberate exposure is PINNED, not incidental — it cannot silently regress to null, which is
//      the failure mode that would quietly re-open half of D2 ("on what basis was this discharged?").
// ---------------------------------------------------------------------------------------------------

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import {
  listUnresolvedAlerts,
  resolveAlert,
  DEFAULT_ALERT_LIMIT,
  listResolvedAlerts,
  DEFAULT_HISTORY_DAYS,
  DEFAULT_HISTORY_LIMIT,
} from "@/lib/ops/alerts";

let testDb: TestDb;

let seq = 0;
const uid = (p: string) => `${p}_${seq++}`;

type AuditOpts = {
  outcome: "ok" | "denied" | "error" | "needs_attention";
  action?: string;
  actorId?: string;
  /** Hours BEFORE the DB clock now() the row was created. */
  agoHours?: number;
  /** Hours BEFORE now() the row was resolved; omitted/null writes NULL (unresolved). */
  resolvedAgoHours?: number | null;
  meta?: Record<string, unknown> | null;
};

/**
 * Insert one audit row. `created_at` and `resolved_at` are BOTH computed by Postgres — the audit table's
 * own `created_at` default is `now()` and `recordAudit` deliberately never passes a JS timestamp
 * (src/lib/audit.ts:100-102, the project's zero-JS-clock rule), so a fixture must not either.
 */
async function makeAudit(opts: AuditOpts): Promise<string> {
  const id = uid("audit");
  const ago = opts.agoHours ?? 1;
  await testDb.db.execute(sql`
    INSERT INTO audit (id, created_at, actor_id, action, outcome, meta, resolved_at)
    VALUES (
      ${id},
      now() - make_interval(hours => ${ago}::int),
      ${opts.actorId ?? "system"},
      ${opts.action ?? "test_action"},
      ${opts.outcome},
      ${opts.meta == null ? sql`NULL` : sql`${JSON.stringify(opts.meta)}::jsonb`},
      ${
        opts.resolvedAgoHours == null
          ? sql`NULL`
          : sql`now() - make_interval(hours => ${opts.resolvedAgoHours}::int)`
      }
    )
  `);
  return id;
}

async function countAudit(): Promise<number> {
  const [row] = (await testDb.db.execute(
    sql`SELECT count(*)::int AS "c" FROM audit`,
  )) as unknown as { c: number }[];
  return row?.c ?? 0;
}

beforeAll(async () => {
  testDb = await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

// Each case owns the whole queue: the list query is deliberately UNFILTERED beyond its predicate, so
// leftover rows from a prior case would make an exact-order assertion impossible to write honestly.
beforeEach(async () => {
  await testDb.db.execute(sql`DELETE FROM audit`);
});

describe("listUnresolvedAlerts", () => {
  it("case 1 — returns ONLY unresolved rows; a discharged row disappears from the queue", async () => {
    const openA = await makeAudit({ outcome: "needs_attention", agoHours: 2 });
    const openB = await makeAudit({ outcome: "needs_attention", agoHours: 3 });
    const discharged = await makeAudit({
      outcome: "needs_attention",
      agoHours: 4,
      resolvedAgoHours: 1,
    });

    const rows = await listUnresolvedAlerts(testDb.db);
    const ids = rows.map((r) => r.id);

    expect(ids).toContain(openA);
    expect(ids).toContain(openB);
    expect(ids).not.toContain(discharged);
    expect(ids).toHaveLength(2);
  });

  it("case 2 — returns ONLY needs_attention rows; ok / denied / error never enter the money queue", async () => {
    const alert = await makeAudit({ outcome: "needs_attention", action: "auto_refund_manual" });
    const ok = await makeAudit({ outcome: "ok", action: "activateHosting" });
    const denied = await makeAudit({ outcome: "denied", action: "activateHosting" });
    const errored = await makeAudit({ outcome: "error", action: "activateHosting" });

    const ids = (await listUnresolvedAlerts(testDb.db)).map((r) => r.id);

    expect(ids).toEqual([alert]);
    expect(ids).not.toContain(ok);
    expect(ids).not.toContain(denied);
    expect(ids).not.toContain(errored);
  });

  it("case 3 — newest first, in strict created_at DESC order", async () => {
    const oldest = await makeAudit({ outcome: "needs_attention", agoHours: 30 });
    const middle = await makeAudit({ outcome: "needs_attention", agoHours: 5 });
    const newest = await makeAudit({ outcome: "needs_attention", agoHours: 1 });

    const rows = await listUnresolvedAlerts(testDb.db);

    // The ORDER is the assertion — a set-membership check would survive dropping the ORDER BY.
    expect(rows.map((r) => r.id)).toEqual([newest, middle, oldest]);
    expect(rows[0].createdAt.getTime()).toBeGreaterThan(rows[1].createdAt.getTime());
    expect(rows[1].createdAt.getTime()).toBeGreaterThan(rows[2].createdAt.getTime());
  });

  it("case 3b — honours an explicit limit and defaults to DEFAULT_ALERT_LIMIT", async () => {
    await makeAudit({ outcome: "needs_attention", agoHours: 1 });
    await makeAudit({ outcome: "needs_attention", agoHours: 2 });
    await makeAudit({ outcome: "needs_attention", agoHours: 3 });

    expect(DEFAULT_ALERT_LIMIT).toBe(200);
    expect(await listUnresolvedAlerts(testDb.db, { limit: 2 })).toHaveLength(2);
    expect(await listUnresolvedAlerts(testDb.db)).toHaveLength(3);
  });

  it("case 7 — never selects `meta`: the returned row has no meta key at all", async () => {
    await makeAudit({
      outcome: "needs_attention",
      meta: { bookingId: "bk_META_LEAK_CANARY", last4: "4242" },
    });

    const [row] = await listUnresolvedAlerts(testDb.db);

    // D-J3Z-02 — structural, not a review catch: the query selects four explicit columns.
    expect("meta" in row).toBe(false);
    expect(Object.keys(row).sort()).toEqual(["action", "actorId", "createdAt", "id"]);
    expect(JSON.stringify(row)).not.toContain("bk_META_LEAK_CANARY");
  });
});

describe("resolveAlert", () => {
  it("case 4 — discharges the row: outcome resolved, a real timestamp, and gone from the queue", async () => {
    const id = await makeAudit({ outcome: "needs_attention", agoHours: 6 });

    const result = await resolveAlert(testDb.db, id);

    expect(result.outcome).toBe("resolved");
    if (result.outcome !== "resolved") throw new Error("unreachable");
    expect(result.id).toBe(id);
    expect(result.resolvedAt).toBeInstanceOf(Date);
    expect(Number.isNaN(result.resolvedAt.getTime())).toBe(false);

    const ids = (await listUnresolvedAlerts(testDb.db)).map((r) => r.id);
    expect(ids).not.toContain(id);
    expect(ids).toHaveLength(0);
  });

  it("case 5 — idempotent: a second resolve reports already_resolved and CANNOT rewrite the original time", async () => {
    const id = await makeAudit({ outcome: "needs_attention", agoHours: 6 });

    const first = await resolveAlert(testDb.db, id);
    expect(first.outcome).toBe("resolved");
    if (first.outcome !== "resolved") throw new Error("unreachable");

    // A visible gap between the two calls: an UNGUARDED UPDATE would move the timestamp forward here,
    // and the equality assertion below is what catches it. This is the clobber, and it is the failure mode.
    await testDb.db.execute(sql`SELECT pg_sleep(0.05)`);

    const second = await resolveAlert(testDb.db, id);
    expect(second.outcome).toBe("already_resolved");
    if (second.outcome !== "already_resolved") throw new Error("unreachable");
    expect(second.resolvedAt.getTime()).toBe(first.resolvedAt.getTime());

    // And the stored column is byte-unchanged too — not merely the value the second call reported back.
    const [stored] = (await testDb.db.execute(
      sql`SELECT resolved_at AS "resolvedAt" FROM audit WHERE id = ${id}`,
    )) as unknown as { resolvedAt: Date | string }[];
    expect(new Date(stored.resolvedAt).getTime()).toBe(first.resolvedAt.getTime());
  });

  it("case 6 — an unknown id reports not_found, creates no row, and never looks like a discharge", async () => {
    await makeAudit({ outcome: "needs_attention" });
    const before = await countAudit();

    const result = await resolveAlert(testDb.db, "audit_does_not_exist");

    expect(result.outcome).toBe("not_found");
    expect(result.id).toBe("audit_does_not_exist");
    expect(await countAudit()).toBe(before);
    // The real row is untouched — a typo must not discharge somebody else's alert.
    expect(await listUnresolvedAlerts(testDb.db)).toHaveLength(1);
  });

  it("case 6b — does NOT filter on outcome: an operator handed an id discharges THAT id", async () => {
    // Scoping the writer to outcome='needs_attention' would be a second, unstated policy (D-J3Z-07).
    const id = await makeAudit({ outcome: "error", action: "some_non_money_action" });

    const result = await resolveAlert(testDb.db, id);

    expect(result.outcome).toBe("resolved");
  });
});

describe("listResolvedAlerts", () => {
  it("case 8 — returns ONLY resolved rows; an open alert never appears in history", async () => {
    const dischargedA = await makeAudit({
      outcome: "needs_attention",
      agoHours: 6,
      resolvedAgoHours: 2,
    });
    const dischargedB = await makeAudit({
      outcome: "needs_attention",
      agoHours: 9,
      resolvedAgoHours: 4,
    });
    const stillOpen = await makeAudit({ outcome: "needs_attention", agoHours: 3 });

    const rows = await listResolvedAlerts(testDb.db);
    const ids = rows.map((r) => r.id);

    // The exact mirror of case 1. Case 1 pins "a discharged row LEAVES the queue"; this pins "and it
    // arrives SOMEWHERE" — the absence of that somewhere is precisely what D2 recorded.
    expect(ids).toContain(dischargedA);
    expect(ids).toContain(dischargedB);
    expect(ids).not.toContain(stillOpen);
    expect(ids).toHaveLength(2);
  });

  it("case 9 — newest DISCHARGE first, tie-broken by created_at DESC", async () => {
    const oldest = await makeAudit({
      outcome: "needs_attention",
      agoHours: 40,
      resolvedAgoHours: 30,
    });
    const middle = await makeAudit({
      outcome: "needs_attention",
      agoHours: 20,
      resolvedAgoHours: 5,
    });
    const newest = await makeAudit({
      outcome: "needs_attention",
      agoHours: 10,
      resolvedAgoHours: 1,
    });

    // A review is over discharge ACTS, not money events (D-DJ4-02) — so the ORDER is the assertion, and
    // it is deliberately NOT the created_at order the unresolved queue uses.
    const rows = await listResolvedAlerts(testDb.db);
    expect(rows.map((r) => r.id)).toEqual([newest, middle, oldest]);
    expect(rows[0].resolvedAt.getTime()).toBeGreaterThan(rows[1].resolvedAt.getTime());
    expect(rows[1].resolvedAt.getTime()).toBeGreaterThan(rows[2].resolvedAt.getTime());

    // Now force a REAL tie. Two rows discharged in ONE statement share ONE transaction and ONE now(), so
    // their resolved_at values are byte-identical. Two separate `execute` calls would NOT tie — each is
    // its own transaction and now() differs by microseconds — which is why the single statement is
    // load-bearing rather than stylistic.
    const tieOlderEvent = await makeAudit({ outcome: "needs_attention", agoHours: 50 });
    const tieNewerEvent = await makeAudit({ outcome: "needs_attention", agoHours: 2 });
    await testDb.db.execute(sql`
      UPDATE audit SET resolved_at = now() WHERE id IN (${tieOlderEvent}, ${tieNewerEvent})
    `);

    const tied = await listResolvedAlerts(testDb.db);
    const [first, second] = tied;
    expect(first.resolvedAt.getTime()).toBe(second.resolvedAt.getTime());
    // The tie-break: same discharge instant → newest MONEY EVENT first.
    expect(first.id).toBe(tieNewerEvent);
    expect(second.id).toBe(tieOlderEvent);
  });

  it("case 10 — a 30-day default window, widenable by `days`", async () => {
    const longAgo = await makeAudit({
      outcome: "needs_attention",
      agoHours: 24 * 41,
      resolvedAgoHours: 24 * 40, // discharged 40 days ago — outside the default window
    });
    const recent = await makeAudit({
      outcome: "needs_attention",
      agoHours: 5,
      resolvedAgoHours: 2,
    });

    expect(DEFAULT_HISTORY_DAYS).toBe(30);

    const defaultIds = (await listResolvedAlerts(testDb.db)).map((r) => r.id);
    expect(defaultIds).toContain(recent);
    expect(defaultIds).not.toContain(longAgo);

    const widenedIds = (await listResolvedAlerts(testDb.db, { days: 60 })).map((r) => r.id);
    expect(widenedIds).toContain(recent);
    expect(widenedIds).toContain(longAgo);
  });

  it("case 11 — honours an explicit limit and defaults to DEFAULT_HISTORY_LIMIT", async () => {
    await makeAudit({ outcome: "needs_attention", agoHours: 4, resolvedAgoHours: 1 });
    await makeAudit({ outcome: "needs_attention", agoHours: 5, resolvedAgoHours: 2 });
    await makeAudit({ outcome: "needs_attention", agoHours: 6, resolvedAgoHours: 3 });

    expect(DEFAULT_HISTORY_LIMIT).toBe(200);
    expect(await listResolvedAlerts(testDb.db, { limit: 2 })).toHaveLength(2);
    expect(await listResolvedAlerts(testDb.db)).toHaveLength(3);
  });

  it("case 12 — surfaces ONLY meta->>'error'; the rest of `meta` cannot reach the row", async () => {
    const id = await makeAudit({
      outcome: "needs_attention",
      agoHours: 8,
      resolvedAgoHours: 1,
      meta: {
        bookingId: "bk_HISTORY_LEAK_CANARY",
        transferId: "tr_LEAK_CANARY",
        last4: "4242",
        error: "resend 503",
      },
    });

    const [row] = await listResolvedAlerts(testDb.db);

    // The audit id IS present — so this case cannot pass by returning an empty row.
    expect(row.id).toBe(id);

    // D-DJ4-04, structural: `ResolvedAlert` has NO `meta` field and the query never selects the column.
    expect("meta" in row).toBe(false);
    expect(Object.keys(row).sort()).toEqual([
      "action",
      "actorId",
      "createdAt",
      "error",
      "id",
      "outcome",
      "resolvedAt",
    ]);

    // The ONE deliberate widening, pinned so it cannot silently regress to null (mutation H5).
    expect(row.error).toBe("resend 503");

    // …and pinned so it cannot silently widen to the whole column either (mutation H4). Identifiers live
    // under separately-named keys, which is the content-based reason a single-key projection is narrow.
    const serialised = JSON.stringify(row);
    expect(serialised).not.toContain("bk_HISTORY_LEAK_CANARY");
    expect(serialised).not.toContain("tr_LEAK_CANARY");
    expect(serialised).not.toContain("4242");
  });

  it("case 13 — a discharge on a NON-needs_attention row is visible here, and ONLY here", async () => {
    // The read-side mirror of case 6b. `resolveAlert` is deliberately unscoped by outcome, so history
    // must be too (D-DJ4-01) — otherwise a discharge exists that no surface can review, which is D2 one
    // level down.
    const id = await makeAudit({ outcome: "error", action: "some_non_money_action", agoHours: 3 });
    expect((await resolveAlert(testDb.db, id)).outcome).toBe("resolved");

    const rows = await listResolvedAlerts(testDb.db);

    expect(rows.map((r) => r.id)).toEqual([id]);
    expect(rows[0].outcome).toBe("error");
    // And it is visible NOWHERE else: the unresolved queue is scoped to needs_attention AND open.
    expect(await listUnresolvedAlerts(testDb.db)).toHaveLength(0);
  });
});
