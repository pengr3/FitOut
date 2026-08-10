// The daily ops digest: what it sends, what it REFUSES to send, and what it must never carry.
//
// THE TWO ASSERTIONS THAT CARRY THIS FILE, and why neither is a nicety:
//
//   - A ZERO-ROW DAY SENDS NOTHING (case 1/2, D-J3Z-05). Not an "all clear", not an empty table — nothing.
//     A daily "nothing to report" email is precisely how an alert channel gets filtered to trash, and once
//     it is filtered the ONE day it carries real held money is the day nobody reads it. So the no-send is a
//     product property, not an optimisation, and it is measured (M1) rather than assumed.
//   - `meta` NEVER REACHES AN INBOX (case 3, D-J3Z-02 / D-72). That jsonb column carries booking ids,
//     transfer ids and masked last-4s. Email is an external service that forwards, archives and indexes, so
//     an email body is a trust boundary the column-level rule at cancel-booking.ts:755-756 explicitly binds:
//     "not in this audit meta, not in any log line, NOT IN ANY COLUMN." Case 3 plants a sentinel in a
//     fixture row's meta and proves it appears in NO captured email — while asserting the audit id DOES
//     appear, so the test cannot pass by sending an empty body.
//
// NOTHING HERE DELIVERS REAL MAIL: the global Resend mock is already wired by tests/setup.ts, and
// OPS_ALERT_EMAIL is overridden to a .invalid address for the whole file. `.env.local` carries a REAL
// address and tests/setup.ts:15-16 loads it into this process — which is exactly why case 5 deletes the
// variable explicitly instead of assuming it is unset.
//
// EVERY fixture timestamp is computed by POSTGRES (`now() - make_interval(...)`), never by the JS clock.
//
// ---------------------------------------------------------------------------------------------------
// MUTATION VERIFICATION (anti-vacuity house standard). Each mutation was applied to `src/`, the suite was
// re-run, the RED was recorded VERBATIM below, and the mutation was reverted — `git diff --exit-code src/`
// clean afterwards.
//
// M1 — delete the `rows.length === 0` early return in buildAndSendDigest, so a zero-row day still sends.
//      `npx vitest run tests/ops/alert-digest.test.ts` → VERBATIM:
//        × case 1 — a zero-row day sends NOTHING at all 29ms
//        × case 2 — a day whose only alert was discharged still sends NOTHING 22ms
//        ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
//        AssertionError: expected { sent: true, count: +0, …(2) } to deeply equal { Object (sent, reason) }
//        AssertionError: expected { sent: true, count: +0, …(2) } to deeply equal { Object (sent, reason) }
//              Tests  2 failed | 6 passed (8)
//      i.e. WITHOUT the early return a zero-row day mails an empty table — exactly the "all clear" that
//      trains an operator to filter this channel. The no-send assertion is therefore load-bearing.
//
// M2 — add `meta: audit.meta` to the select in listUnresolvedAlerts, add `meta` to UnresolvedAlert and
//      OpsDigestRow, and interpolate JSON.stringify(row.meta) into the rendered table.
//      `npx vitest run tests/ops` → VERBATIM:
//        × case 7 — never selects `meta`: the returned row has no meta key at all 21ms
//        × case 3 — PII: a meta sentinel appears in NO captured email 23ms
//        ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
//        AssertionError: expected 'FitOut ops — 1 unresolved money alert…' not to contain 'bk_SENTINEL_9Z1'
//        AssertionError: expected true to be false // Object.is equality
//              Tests  2 failed | 15 passed (17)
//      NOTE both layers reddened: the query-layer guard (alerts.test.ts case 7) AND the email-body
//      sentinel here. The PII contract is measured where it is enforced and where it would leak.
//
// M3 — remove the `AND resolved_at IS NULL` half of the predicate in listUnresolvedAlerts.
//      `npx vitest run tests/ops` → VERBATIM:
//        × case 1 — returns ONLY unresolved rows; a discharged row disappears from the queue 52ms
//        × case 4 — discharges the row: outcome resolved, a real timestamp, and gone from the queue 23ms
//        × case 2 — a day whose only alert was discharged still sends NOTHING 26ms
//        ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯
//        AssertionError: expected { sent: true, count: 1, …(2) } to deeply equal { Object (sent, reason) }
//        AssertionError: expected [ 'audit_0', 'audit_1', 'audit_2' ] to not include 'audit_2'
//        AssertionError: expected [ 'audit_14' ] to not include 'audit_14'
//              Tests  3 failed | 14 passed (17)
// ---------------------------------------------------------------------------------------------------

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { sql } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { mockResend } from "../helpers/mocks";
import { DEFAULT_ALERT_LIMIT, resolveAlert } from "@/lib/ops/alerts";
import { buildAndSendDigest, agingHours, AGING_HOURS_DEFAULT } from "@/inngest/functions/ops-alert-digest";

let testDb: TestDb;
let prevEmail: string | undefined;
let prevAging: string | undefined;

let seq = 0;
const uid = (p: string) => `${p}_${seq++}`;

type AuditOpts = {
  action?: string;
  actorId?: string;
  agoHours?: number;
  meta?: Record<string, unknown> | null;
};

async function makeAlert(opts: AuditOpts = {}): Promise<string> {
  const id = uid("audit");
  await testDb.db.execute(sql`
    INSERT INTO audit (id, created_at, actor_id, action, outcome, meta, resolved_at)
    VALUES (
      ${id},
      now() - make_interval(hours => ${opts.agoHours ?? 1}::int),
      ${opts.actorId ?? "system"},
      ${opts.action ?? "auto_refund_manual"},
      'needs_attention',
      ${opts.meta == null ? sql`NULL` : sql`${JSON.stringify(opts.meta)}::jsonb`},
      NULL
    )
  `);
  return id;
}

/** Every captured email flattened into one searchable string — subject AND html AND text, all of them. */
function allCapturedText(): string {
  return mockResend
    .sent()
    .map((e) => `${e.subject} ${e.html ?? ""} ${e.text ?? ""}`)
    .join("\n");
}

beforeAll(async () => {
  testDb = await setupTestDb();
  // NEVER assert against the real address: .env.local carries one and tests/setup.ts loads it here.
  prevEmail = process.env.OPS_ALERT_EMAIL;
  prevAging = process.env.OPS_ALERT_AGING_HOURS;
  process.env.OPS_ALERT_EMAIL = "ops@test.invalid";
});

afterAll(async () => {
  if (prevEmail === undefined) delete process.env.OPS_ALERT_EMAIL;
  else process.env.OPS_ALERT_EMAIL = prevEmail;
  if (prevAging === undefined) delete process.env.OPS_ALERT_AGING_HOURS;
  else process.env.OPS_ALERT_AGING_HOURS = prevAging;
  await teardownTestDb(testDb);
});

beforeEach(async () => {
  await testDb.db.execute(sql`DELETE FROM audit`);
  process.env.OPS_ALERT_EMAIL = "ops@test.invalid";
  delete process.env.OPS_ALERT_AGING_HOURS;
});

describe("agingHours", () => {
  it("reads OPS_ALERT_AGING_HOURS at CALL time and falls back to the default", () => {
    expect(AGING_HOURS_DEFAULT).toBe(24);
    expect(agingHours()).toBe(AGING_HOURS_DEFAULT);

    process.env.OPS_ALERT_AGING_HOURS = "6";
    // D-J3Z-06: a module-load read would have frozen the default above and this would still be 24.
    expect(agingHours()).toBe(6);

    process.env.OPS_ALERT_AGING_HOURS = "not-a-number";
    expect(agingHours()).toBe(AGING_HOURS_DEFAULT);
  });
});

describe("buildAndSendDigest", () => {
  it("case 1 — a zero-row day sends NOTHING at all", async () => {
    const result = await buildAndSendDigest(testDb.db);

    expect(result).toEqual({ sent: false, reason: "no_unresolved" });
    // Not an "all clear", not an empty table — zero emails. Mutation M1 measures this.
    expect(mockResend.sent()).toHaveLength(0);
  });

  it("case 2 — a day whose only alert was discharged still sends NOTHING", async () => {
    const id = await makeAlert();
    const discharge = await resolveAlert(testDb.db, id);
    expect(discharge.outcome).toBe("resolved");

    const result = await buildAndSendDigest(testDb.db);

    // Reads through the same unresolved filter, not a stale snapshot. Mutation M3 measures this.
    expect(result).toEqual({ sent: false, reason: "no_unresolved" });
    expect(mockResend.sent()).toHaveLength(0);
  });

  it("case 3 — PII: a meta sentinel appears in NO captured email", async () => {
    const id = await makeAlert({
      action: "auto_refund_manual",
      meta: {
        bookingId: "bk_SENTINEL_9Z1",
        last4: "4242",
        transferId: "tr_SENTINEL_9Z1",
      },
    });

    const result = await buildAndSendDigest(testDb.db);
    expect(result).toEqual({ sent: true, count: 1, aging: 0, truncated: false });

    const captured = mockResend.sent();
    expect(captured).toHaveLength(1);
    expect(captured[0].to).toBe("ops@test.invalid");

    const haystack = allCapturedText();
    // The audit id IS carried — otherwise this test could pass by sending an empty body.
    expect(haystack).toContain(id);
    expect(haystack).toContain("auto_refund_manual");
    // …and nothing from `meta` is. Mutation M2 measures this.
    expect(haystack).not.toContain("bk_SENTINEL_9Z1");
    expect(haystack).not.toContain("tr_SENTINEL_9Z1");
    expect(haystack).not.toContain("4242");
  });

  it("case 4 — aging: a row past the threshold is flagged, a fresh one is not, and BOTH are carried", async () => {
    process.env.OPS_ALERT_AGING_HOURS = "24";
    const old = await makeAlert({ action: "stale_alert", agoHours: 30 });
    const fresh = await makeAlert({ action: "fresh_alert", agoHours: 1 });

    const result = await buildAndSendDigest(testDb.db);

    expect(result).toEqual({ sent: true, count: 2, aging: 1, truncated: false });

    const haystack = allCapturedText();
    // The aging flag DECORATES the digest; it never filters it. Both rows must be present.
    expect(haystack).toContain(old);
    expect(haystack).toContain(fresh);
    // Marked in plain text, never by colour alone.
    expect(haystack.match(/AGING/g) ?? []).toHaveLength(1);
  });

  it("case 5 — no recipient: a loud no-op that RESOLVES, never a throw", async () => {
    // tests/setup.ts loads .env.local, which carries a REAL OPS_ALERT_EMAIL — this delete is what makes
    // the case test anything at all. Without it the branch is unreachable and the assertions are vacuous.
    delete process.env.OPS_ALERT_EMAIL;
    const id = await makeAlert({ action: "refund_after_payout" });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      // Resolves. A throw here would fail the Inngest run instead of degrading to the console sink.
      const result = await buildAndSendDigest(testDb.db);

      expect(result).toEqual({ sent: false, reason: "no_recipient", count: 1 });
      expect(mockResend.sent()).toHaveLength(0);

      // LOUD: the ids an operator needs are in the log line, so the alert degrades rather than vanishing.
      const logged = errSpy.mock.calls.map((c) => JSON.stringify(c)).join("\n");
      expect(logged).toContain("[ops-alert]");
      expect(logged).toContain("OPS_ALERT_EMAIL");
      expect(logged).toContain(id);
    } finally {
      errSpy.mockRestore();
      process.env.OPS_ALERT_EMAIL = "ops@test.invalid";
    }
  });

  it("case 6 — bounded: renders the 200 newest and says so, never an unbounded list", async () => {
    const over = DEFAULT_ALERT_LIMIT + 5;
    // Zero-padded ids so no id is a substring of another (bulk_001 vs bulk_010 vs bulk_100).
    // The +100h offset puts EVERY row past the 24h default threshold, so `aging` here is a clean
    // "all 200 rendered rows", not an off-by-one about which hour a row crosses the line (case 4 owns that).
    await testDb.db.execute(sql`
      INSERT INTO audit (id, created_at, actor_id, action, outcome)
      SELECT 'bulk_' || lpad(g::text, 3, '0'),
             now() - make_interval(hours => (g + 100)::int),
             'system', 'bulk_action', 'needs_attention'
      FROM generate_series(1, ${over}::int) g
    `);

    const result = await buildAndSendDigest(testDb.db);

    expect(result).toEqual({
      sent: true,
      count: DEFAULT_ALERT_LIMIT,
      aging: DEFAULT_ALERT_LIMIT,
      truncated: true,
    });

    const haystack = allCapturedText();
    // The 200 NEWEST (g = 1..200) are carried; the 5 oldest are not.
    expect(haystack).toContain("bulk_001");
    expect(haystack).toContain("bulk_200");
    expect(haystack).not.toContain("bulk_201");
    expect(haystack).not.toContain("bulk_205");
    // An honest truncation line — never a claim the code cannot back (D-J3Z-09).
    expect(haystack).toContain("200+");
  });

  it("case 6b — HTML-escapes every interpolated field (WR-01): action and actor_id are free text", async () => {
    await makeAlert({ action: "<script>alert(1)</script>", actorId: "a&b\"c" });

    await buildAndSendDigest(testDb.db);

    const html = mockResend.sent()[0]?.html ?? "";
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("a&amp;b&quot;c");
  });
});
