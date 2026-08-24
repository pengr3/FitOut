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
//
// M4 — remove case 5's own `delete process.env.OPS_ALERT_EMAIL`. Run AFTER `.env.local` was given a REAL
//      OPS_ALERT_EMAIL, as the regression gate for exactly the hazard called out in the case body: this is
//      the mutation that proves case 5 still tests something rather than silently passing on a configured
//      address. `npx vitest run tests/ops/alert-digest.test.ts` → VERBATIM:
//        × case 5 — no recipient: a loud no-op that RESOLVES, never a throw 22ms
//        ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
//        AssertionError: expected { sent: true, count: 1, …(2) } to deeply equal { sent: false, …(2) }
//              Tests  1 failed | 7 passed (8)
//      i.e. without the delete the digest finds a recipient and SENDS, so the no-recipient branch is never
//      entered. The delete is load-bearing. If this file is ever refactored, keep it.
//
// M5 — WR-04 (15-14), THE THIRD INSTANCE OF THIS PHASE'S UNFAILABLE-ASSERTION PATTERN. Re-add to
//      `renderOpsAlertDigest`'s runbook paragraph in src/lib/email.ts the exact wrapper 15-04 removed:
//        `Look a row up with <code>npm run ops:alerts</code>; discharge it with ` +
//      BOTH HALVES BELOW ARE THE FINDING, and the first half is the one that condemns the old line.
//
//      (a) THE OLD ASSERTION PASSES UNDER THE MUTATION. With this file at HEAD — case 11 carrying only
//          `expect(html).not.toContain("<code>")` — `npx vitest run tests/ops/alert-digest.test.ts`
//          → VERBATIM:
//            Test Files  1 passed (1)
//                 Tests  12 passed (12)
//          A `<code>` inside a paragraph is escaped STRUCTURALLY at the choke point, so it arrives as
//          `&lt;code&gt;` and the literal string that line named cannot exist in that projection. The
//          guard was green while the regression its own comment names was live in the tree.
//
//      (b) THE NEW HTML ASSERTION FAILS. Same command, same mutation, this file as it now stands
//          → VERBATIM:
//            × case 11 — the runbook commands survive the shell byte-identical, and a re-added wrapper reddens this case 9ms
//            AssertionError: a <code> wrapper is back in a runbook paragraph — the operator reads it as visible tag text: expected '<!DOCTYPE html><html lang="en"><head>…' not to contain '&lt;code&gt;'
//                  Tests  1 failed | 11 passed (12)
//          and the document the failure quotes back carries it in exactly the form an operator would
//          read: `Look a row up with &lt;code&gt;npm run ops:alerts&lt;/code&gt;`.
//
//      (b′) THE TWIN, ISOLATED. (b) short-circuits at the html line, so the text one was measured on its
//          own by neutralising the line above it for a single run — same mutation, same command
//          → VERBATIM:
//            × case 11 — the runbook commands survive the shell byte-identical, and a re-added wrapper reddens this case 8ms
//            AssertionError: a <code> wrapper is back in a runbook paragraph — the text/plain twin carries it literally: expected 'FitOut ops — unresolved money alerts\…' not to contain '<code>'
//            + 1 unresolved needs_attention audit row(s), newest first. Look a row up with <code>npm run ops:alerts</code>; discharge it with npm run ops:alerts:resolve -- <audit-id>. …
//                  Tests  1 failed | 11 passed (12)
//          ONE mutation, TWO projections, TWO independent failures. That is the whole point of writing
//          the absence check twice rather than once in the wrong spelling.
//
//      MUTATION REVERTED — `git diff --exit-code src/lib/email.ts` exit 0, `git diff --name-only src/`
//      empty, re-run `Tests  12 passed (12)`: the same case count this file carried before 15-14.
//
// M6 — THE REST OF THE RAW-TAG SET, CLASSIFIED BY MEASUREMENT (15-14 Part C). Grepping `tests/` for a
//      `not.toContain` whose argument opens with an angle bracket returns 8 assertions in 5 files — a
//      listable set, re-counted rather than trusted. Two more mutations decide the other seven, and both
//      were reverted (`git diff --exit-code src/` exit 0).
//
//      C1 — `escapeHtml` in src/lib/email-shell.ts made the IDENTITY function: the escape-regression
//           class every injected-data assertion is written against. `npx vitest run
//           tests/auth/email-escaping.test.ts tests/auth/email-injection.test.ts
//           tests/notifications/guest-email.test.ts tests/notifications/notify.test.ts
//           tests/ops/alert-digest.test.ts` → VERBATIM:
//                 Tests  94 failed | 91 passed (185)
//           including `× case 6b — HTML-escapes every interpolated field (WR-01)` reporting at
//           alert-digest's own `expect(html).not.toContain("<script>")`. The four outside this file each
//           report one line EARLIER, on their sibling positive control — so reachability was read off the
//           document the failure quotes back, and in every one the raw payload
//           (`<script>alert(1)</script>` / `<script>alert('x15')</script>`) is present LITERALLY.
//           All five html-projection assertions are therefore FAILABLE.
//           THE CONTROL INSIDE THIS MUTATION: the two `text`-projection assertions (`<td>`, `<table`)
//           stayed GREEN under C1. They are about a different regression, and C1 says so.
//
//      C3 — `tableText` pointed at `tableHtml`: the twin silently taking the markup.
//           `npx vitest run tests/ops/alert-digest.test.ts` → VERBATIM:
//            × case 9 — the plain-text twin is the real table, not the subject line restated
//            AssertionError: expected 'FitOut ops — unresolved money alerts\…' not to contain '<td>'
//                  Tests  1 failed | 11 passed (12)
//           and the text quoted back carries `<table border="1" cellpadding="4" …`, so line 403's string
//           is reachable in that projection too (402 fires first). A NARROWER first variant — only the
//           per-row `cells.map((c) => c.text)` swapped to `c.html` — reddened 402 and left 403 GREEN,
//           because `<table` lives on the wrapper rather than in a row. Both are failable; they are not
//           failable for the SAME regression, and that is worth knowing before either is ever deleted.
//
//      VERDICT: 8 of 8 now failable. Seven already were; case 11's was the single exception, and M5 is
//      the record of fixing it. `tests/auth/email-escaping.test.ts` is named in the ROADMAP's carried
//      constraint from backlog 999.1 and was NOT edited — it was classified and left alone.
//
// ---------------------------------------------------------------------------------------------------

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { sql } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { mockResend } from "../helpers/mocks";
// The DIRECT read (case 8/9). Until 15-04 no test file imported this renderer at all, which made its own
// docblock's claim — "the PII assertion reads this body DIRECTLY" — false: the sentinel was only ever
// recovered off a captured send. Both readings are kept, because they fail for different reasons.
import { renderOpsAlertDigest, type OpsDigestRow } from "@/lib/email";
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
    const discharge = await resolveAlert(testDb.db, id, "ops-test");
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
    // Marked in plain text, never by colour alone — and counted PER PROJECTION rather than over the
    // concatenation (15-04). The old `match(/AGING/g)` over subject+html+text totalled 1 only because
    // the text part was 15-03's interim restatement of the subject and carried no rows at all; once the
    // real `tableText` twin landed, the same true property counted 2. Per-part is the stronger claim
    // anyway: EXACTLY ONE of the two rows is marked in the HTML, and exactly one in the plain text, so
    // a twin that lost the marker (or gained a second) is caught in the projection that lost it.
    const digest = mockResend.sent()[0];
    expect((digest?.html ?? "").match(/AGING/g) ?? [], "the HTML marks one aging row").toHaveLength(1);
    expect((digest?.text ?? "").match(/AGING/g) ?? [], "the twin marks one aging row").toHaveLength(1);
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

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE DIRECT READ (15-04). Everything above recovers the body from a captured send; everything below
// reads the string the renderer BUILDS. The two are complementary and neither replaces the other:
//
//   • the transport read proves the send carries what was built (it would catch a sender that composed
//     a correct body and then mailed something else, which no direct read can see);
//   • the direct read pins the guarantee at the point the string exists (it would catch a renderer that
//     started carrying `meta` on a path the daily job does not currently take, and it survives the day
//     someone adds a second caller).
//
// ⚠ EVERY fixture instant here is an ABSOLUTE literal, never `new Date()` — a fixture that seeds from
// the clock makes a failure depend on the hour it ran.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The audit row as the DATABASE holds it, jsonb `meta` column included — booking id, transfer id and a
 * masked last-4, the three things D-72 forbids leaving the database ("not in this audit meta, not in any
 * log line, NOT IN ANY COLUMN").
 *
 * The forbidden strings are declared HERE, in the fixture, rather than typed into the assertion, so the
 * absence below has a real source: something in this file genuinely holds them, and the claim is that the
 * renderer's output does not.
 */
const AUDIT_ROW_AS_STORED = {
  id: "audit_direct_7Q2",
  action: "auto_refund_manual",
  actorId: "system",
  createdAt: new Date("2026-08-01T02:30:00.000Z"),
  ageHours: 30,
  aging: true,
  meta: { bookingId: "bk_DIRECT_7Q2", transferId: "tr_DIRECT_7Q2", last4: "9107" },
} as const;

/**
 * The projection the email is allowed to see. `OpsDigestRow` HAS NO `meta` FIELD, so adding one to the
 * object below does not fail a test — it fails `tsc`, at this line. That is the whole of D-J3Z-02: the
 * column rule is enforced by the type rather than by a reviewer noticing.
 */
const DIRECT_ROWS: OpsDigestRow[] = [
  {
    id: AUDIT_ROW_AS_STORED.id,
    action: AUDIT_ROW_AS_STORED.action,
    actorId: AUDIT_ROW_AS_STORED.actorId,
    createdAt: AUDIT_ROW_AS_STORED.createdAt,
    ageHours: AUDIT_ROW_AS_STORED.ageHours,
    aging: AUDIT_ROW_AS_STORED.aging,
  },
];

describe("renderOpsAlertDigest — read directly, not through the transport", () => {
  it("case 8 — PII: no meta sentinel is in the string the renderer builds, in EITHER projection", () => {
    const { html, text } = renderOpsAlertDigest(DIRECT_ROWS, {
      truncated: false,
      limit: DEFAULT_ALERT_LIMIT,
    });
    const body = `${html}\n${text}`;

    // POSITIVE CONTROL FIRST. Every absence below is satisfied by a renderer that returned two empty
    // strings, and an absence assertion cannot notice it was handed nothing.
    expect(body, "the audit id must be carried — it is the whole point of the digest").toContain(
      AUDIT_ROW_AS_STORED.id,
    );
    expect(body).toContain(AUDIT_ROW_AS_STORED.action);
    expect(html.length, "the HTML part rendered as empty or near-empty").toBeGreaterThan(500);
    expect(text.length, "the plain-text twin rendered as empty or near-empty").toBeGreaterThan(80);

    // …and nothing from `meta` is anywhere in either part.
    for (const sentinel of Object.values(AUDIT_ROW_AS_STORED.meta)) {
      expect(
        body,
        `${JSON.stringify(sentinel)} came out of the audit row's meta column and reached the email ` +
          `body. D-72 binds this at the COLUMN level; email is an external service that forwards, ` +
          `archives and indexes, so content that enters it does not come back out of anyone's control.`,
      ).not.toContain(sentinel);
    }
  });

  it("case 9 — the plain-text twin is the real table, not the subject line restated", () => {
    // 15-03 had to pass a fourth argument to `send` the moment it became required, and passed the
    // SUBJECT as the text part rather than invent operator copy that belonged to 15-04. This is the
    // assertion that the interim is gone: the twin carries the row's five fields and the marker.
    const { html, text } = renderOpsAlertDigest(DIRECT_ROWS, {
      truncated: false,
      limit: DEFAULT_ALERT_LIMIT,
    });

    for (const field of [
      AUDIT_ROW_AS_STORED.id,
      AUDIT_ROW_AS_STORED.action,
      AUDIT_ROW_AS_STORED.actorId,
      AUDIT_ROW_AS_STORED.createdAt.toISOString(),
      `${AUDIT_ROW_AS_STORED.ageHours}h`,
    ]) {
      expect(text, `the plain-text twin lost ${JSON.stringify(field)}`).toContain(field);
      expect(html, `the HTML part lost ${JSON.stringify(field)}`).toContain(field);
    }
    // The marker is plain text in BOTH, never colour alone.
    expect(text).toContain("— AGING");
    expect(html).toContain("— AGING");
    // And the twin is text/plain: no markup, and no HTML entity where a raw character belongs.
    expect(text).not.toContain("<td>");
    expect(text).not.toContain("<table");
    expect(text).not.toContain("&lt;");
  });

  it("case 10 — the truncation line is honest in both projections, and absent when it is not true", () => {
    const truncated = renderOpsAlertDigest(DIRECT_ROWS, { truncated: true, limit: 200 });
    expect(truncated.html).toContain("200+ unresolved");
    expect(truncated.text).toContain("200+ unresolved");

    const whole = renderOpsAlertDigest(DIRECT_ROWS, { truncated: false, limit: 200 });
    expect(whole.html).not.toContain("200+ unresolved");
    expect(whole.text).not.toContain("200+ unresolved");
  });

  it("case 11 — the runbook commands survive the shell byte-identical, and a re-added wrapper reddens this case", () => {
    // The `<code>` wrappers were dropped in 15-04 (paragraphs are escaped at the choke point now, so a
    // `<code>` element inside one would reach the operator as visible tag text). The COMMANDS are the
    // part an operator copies, and they are unchanged — asserted on the twin, where they are raw.
    //
    // WR-04 — THE RULE THIS PHASE HAS NOW EARNED THREE TIMES OVER (see M5 in this file's header).
    // `renderOpsAlertDigest` hands its runbook sentence to `renderEmail` as a `paragraphs` entry, and
    // paragraphs are escaped STRUCTURALLY at the choke point. So an absence check about AUTHORED markup
    // must be written in the ESCAPED form for the HTML part, or it names a string the regression it is
    // written against cannot produce — which is what the single `not.toContain("<code>")` that used to
    // stand here alone was doing.
    //
    // ONE regression, TWO projections, TWO independent failures: `renderEmail` builds both parts from the
    // SAME `paragraphs` array — escaped on the way into `html`, taken RAW into the `text/plain` twin.
    const { html, text } = renderOpsAlertDigest(DIRECT_ROWS, {
      truncated: false,
      limit: DEFAULT_ALERT_LIMIT,
    });
    expect(text).toContain("npm run ops:alerts");
    expect(text).toContain("npm run ops:alerts:resolve -- <audit-id>");
    expect(text).toContain("needs_attention");
    expect(text).toContain(".planning/ops/NEEDS-ATTENTION-RUNBOOK.md");
    // THE CONTROL for the two assertions below it. The placeholder is written RAW in the source and
    // arrives here entity-escaped, which is the proof that the ENTITY form is REACHABLE in this
    // projection. Without it, an entity-form absence check would be nothing but a differently-spelled
    // unfailable string.
    expect(html).toContain("&lt;audit-id&gt;");
    // THE LINE THAT CATCHES A RE-ADDED WRAPPER (html projection). Escaped at the choke point, a `<code>`
    // inside a paragraph reaches the operator as visible tag text — this is the form it actually takes.
    expect(
      html,
      "a <code> wrapper is back in a runbook paragraph — the operator reads it as visible tag text",
    ).not.toContain("&lt;code&gt;");
    // THE SAME REGRESSION IN THE TWIN (text projection). The plain-text part takes the paragraph raw, so
    // here the LITERAL open-tag is reachable and this assertion can fail for the same one mutation.
    expect(
      text,
      "a <code> wrapper is back in a runbook paragraph — the text/plain twin carries it literally",
    ).not.toContain("<code>");
    // KEPT, WITH ITS CLAIM CORRECTED. This is NOT the line that catches a re-added wrapper: paragraphs are
    // escaped before they reach the HTML part, so the literal string cannot appear by that route. What it
    // still legitimately forbids is raw markup entering the HTML part by SOME OTHER route — a future
    // `tableHtml`-style pre-escaped slot carrying a `<code>`. Harmless to keep; dishonest to leave
    // described as the wrapper guard.
    expect(html, "raw markup entered the HTML part through a pre-escaped slot").not.toContain("<code>");
  });
});
