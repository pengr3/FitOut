// FINDING F-4 — THE SWEEP IS THE GUARANTEE, SO IT IS DEMONSTRATED RATHER THAN DESCRIBED.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE HAS TO PROVE, AND WHY EACH HALF NEEDS THE OTHER
// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// `src/inngest/functions/didit-reconcile.ts` claims four things, and every one of them is a claim about a
// host's ability to earn:
//
//   1. A verdict Didit decided but could never DELIVER still lands. That is the whole plan: the vendor
//      retries a failed webhook twice and then drops it permanently, and under D-262 (no operator confirms
//      anything) plus D-263 (no host-facing route to a person) a dropped delivery is a host stuck at
//      `pending` forever with nobody prompted.
//   2. It never races a HEALTHY webhook — a fresh row, a row with no handle, and every non-`pending` row
//      are left alone and are never even asked about.
//   3. It owns NO write path. There is exactly one road to the approved state and this file is not it.
//   4. Applying the same verdict twice moves 0 rows and tells the host once.
//
// ⚠ AND (2) IS VACUOUS WITHOUT (1). A selector that returned NOTHING would satisfy every exclusion case in
// this file — fresh row untouched, handle-less row untouched, terminal rows untouched, zero HTTP calls
// everywhere — while the sweep recovered nothing at all, which is the exact failure mode
// `tests/design/money-path-invariants.test.ts:44-49` and `payment-reconcile.test.ts`'s case (1) exist to
// prevent. So the file opens with a GUARD-THE-GUARD on the selector, and every "nothing happened" case
// additionally asserts THE VENDOR WAS NOT ASKED — a counted `fetch` call, never an un-thrown error.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY `fetch` IS STUBBED AND `fetchDiditDecision` IS NOT
// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// The mock replaces the HTTP call, not the adapter. So the REAL reader runs: its URL construction, its
// `x-api-key` header, its 429 branch, its credential branch, its JSON parse and its fail-closed refusal of
// a 2xx with no usable status. Stubbing the adapter would have replaced precisely the fail-closed
// behaviour the sweep leans on with this file's own assumption about it — and the `instanceof` dispatch in
// `reconcileOne` would then be testing a hand-made error rather than the one the adapter really throws.
//
// ⚠ `DIDIT_API_KEY` IS STUBBED, NEVER READ FROM `.env.local`. `tests/setup.ts` loads that file on this
// machine, so a case that depended on the real credential being present — or absent — would be a case
// nobody else can run and would leak whether one exists on this box. Case (2) asserts the stubbed value
// actually reached the vendor call, so "the request happened" is measured rather than assumed.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// MUTATIONS RUN AND SCORED — transcribed in 18.1-09-SUMMARY.md
// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// Green against the shipped sweep proves the cases pass, not that any of them would NOTICE the defect it
// exists for. Three controls this file calls load-bearing were therefore broken on purpose, run, and
// reverted from a scratchpad copy (never `git checkout --`): the grace window set to 0, the `pending`
// scope widened to every status, and the break-on-429 removed. Each reddened a different case; the
// verbatim output is in the summary.

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { seedHostVerification } from "../helpers/verification";
import { stripComments } from "../helpers/source-text";
import { audit, hostVerification, type HostVerificationStatus } from "@/lib/db/schema";
import { HOST_REJECT_REASONS, REJECT_NOTE_MAX } from "@/lib/validation/ops";

const SWEEP_PATH = "src/inngest/functions/didit-reconcile.ts";

/** Declared by this harness. NOT a Didit credential — see the header. */
const HARNESS_API_KEY = "declared-by-this-harness-not-a-real-didit-credential";

const MINUTE_MS = 60_000;

let testDb: TestDb;

type SweepModule = typeof import("@/inngest/functions/didit-reconcile");
let queryStalePendingVerifications: SweepModule["queryStalePendingVerifications"];
let reconcileOne: SweepModule["reconcileOne"];
let diditReconcileCron: SweepModule["diditReconcileCron"];
let DIDIT_RECONCILE_GRACE_MINUTES: SweepModule["DIDIT_RECONCILE_GRACE_MINUTES"];
let DIDIT_RECONCILE_BATCH_LIMIT: SweepModule["DIDIT_RECONCILE_BATCH_LIMIT"];
let applyDiditVerdict: (typeof import("@/lib/verification/apply-verdict"))["applyDiditVerdict"];

/** The handler `inngest.createFunction` was built with, captured so the REAL loop can be driven. */
let sweepHandler: (ctx: {
  step: { run: <T>(id: string, fn: () => Promise<T> | T) => Promise<T> };
}) => Promise<{ scanned: number; outcomes: Record<string, number> }>;

// ── The vendor, as a declared answer per session handle ──────────────────────────────────────────────────

type VendorAnswer =
  | { kind: "ok"; body: unknown }
  | { kind: "raw"; status: number; text: string }
  | { kind: "status"; status: number }
  | { kind: "transport" };

const answers = new Map<string, VendorAnswer>();

/**
 * Sessions the sweep asked about that this harness never declared an answer for.
 *
 * ⚠ IT IS A LIST, NOT A THROW. A thrown error here would be caught by the adapter's own transport branch
 * and reported as `unreachable` — i.e. a MISCONFIGURED FIXTURE would be indistinguishable from a
 * legitimate fail-closed pass, which is the shape of vacuous green this suite is written against.
 */
const undeclaredCalls: string[] = [];

const fetchMock = vi.fn(async (input: unknown, init?: { headers?: Record<string, string> }) => {
  const url = String(input);
  const matched = /\/v3\/session\/([^/]+)\/decision\/$/.exec(url);
  const sessionId = matched ? decodeURIComponent(matched[1]) : "";
  const answer = answers.get(sessionId);

  if (!answer) {
    undeclaredCalls.push(url);
    return { ok: false, status: 599, text: async () => "undeclared" };
  }
  if (answer.kind === "transport") throw new TypeError("fetch failed");
  if (answer.kind === "status") {
    return { ok: false, status: answer.status, text: async () => "" };
  }
  if (answer.kind === "raw") {
    return { ok: answer.status < 400, status: answer.status, text: async () => answer.text };
  }
  void init;
  return { ok: true, status: 200, text: async () => JSON.stringify(answer.body) };
});

/** Every `fitout/notify` envelope emitted so far, so "exactly one" is a LENGTH. */
type NotifyEnvelope = { name: string; data: { type: string; recipientId: string } };
const inngestSend = vi.fn(async (event: NotifyEnvelope) => ({ ids: [event.name] }));

function noticesFor(userId: string): NotifyEnvelope[] {
  return inngestSend.mock.calls
    .map((c) => c[0])
    .filter((e) => e.name === "fitout/notify" && e.data.recipientId === userId);
}

// ── Fixtures ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Seed one host row at a chosen status, handle and IDLE AGE.
 *
 * ⚠ `updated_at` IS SET THROUGH RAW SQL AND NOT THROUGH THE QUERY BUILDER, which is not a style choice:
 * `schema.ts:432-435` declares `$onUpdate` on that column, so a builder `.set({ vendorRef })` would stamp
 * it to `now()` and silently make every "stale" fixture fresh — the staleness cases would then be asserting
 * the opposite of what they name. The instant is bound as an ISO STRING with an explicit cast, the measured
 * rule recorded at `ops-review.ts:390-401` and `payment-reconcile.ts`'s epoch.
 */
async function seedRow(
  id: string,
  opts: { status: HostVerificationStatus; vendorRef: string | null; idleMinutes: number },
): Promise<string> {
  await seedHostVerification(testDb.db, id, opts.status, { provider: "didit" });
  const idleAt = new Date(Date.now() - opts.idleMinutes * MINUTE_MS).toISOString();
  await testDb.db.execute(sql`
    UPDATE host_verification
    SET vendor_ref = ${opts.vendorRef}, updated_at = ${idleAt}::timestamptz
    WHERE user_id = ${id}
  `);
  return id;
}

async function row(userId: string) {
  const [r] = await testDb.db
    .select()
    .from(hostVerification)
    .where(eq(hostVerification.userId, userId));
  return r ?? null;
}

/** THE TRAIL INSTRUMENT — `ops-audit.test.ts`'s. Rows are READ BACK, never inferred from a return value. */
async function trailRows(action: string, outcome: "ok" | "denied" | "needs_attention") {
  return testDb.db
    .select()
    .from(audit)
    .where(and(eq(audit.action, action), eq(audit.outcome, outcome)));
}

/** An `Approved` answer from the DECISION endpoint — note the casing (see case 2). */
function approvedBody() {
  return {
    session_id: "ignored-by-the-reader",
    status: "APPROVED",
    id_verifications: [{ node_id: "n1", status: "APPROVED", warnings: [] }],
    liveness_checks: null,
    face_matches: null,
  };
}

/** A `Declined` answer carrying ONE allow-listed error warning — the D-265 happy path. */
function declinedBody() {
  return {
    status: "DECLINED",
    id_verifications: [
      {
        node_id: "n1",
        status: "DECLINED",
        warnings: [
          { log_type: "error", risk: "DOCUMENT_EXPIRED", short_description: "Document expired" },
          // Excluded twice over: not an error, and its code is not on the safe set.
          {
            log_type: "warning",
            risk: "SCREEN_CAPTURE_DETECTED",
            short_description: "Screen capture detected",
          },
        ],
      },
    ],
    liveness_checks: null,
    face_matches: null,
  };
}

/** Drive the REAL handler — its loop, its tally and its break — with a pass-through `step`. */
async function runSweep() {
  return sweepHandler({ step: { run: async (_id, fn) => fn() } });
}

beforeAll(async () => {
  testDb = await setupTestDb();
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  // The client is stubbed at the MODULE the sweep's graph resolves. `createFunction` is stubbed too
  // because the module builds its function at import time — and the handler is CAPTURED off it, which is
  // how the loop below is the shipped one rather than a re-implementation of it in this file.
  vi.doMock("@/inngest/client", () => ({
    inngest: {
      send: inngestSend,
      createFunction: (opts: { id: string }, handler: typeof sweepHandler) => {
        sweepHandler = handler;
        return { id: opts.id };
      },
    },
  }));
  vi.resetModules();

  const mod = await import("@/inngest/functions/didit-reconcile");
  ({
    queryStalePendingVerifications,
    reconcileOne,
    diditReconcileCron,
    DIDIT_RECONCILE_GRACE_MINUTES,
    DIDIT_RECONCILE_BATCH_LIMIT,
  } = mod);
  ({ applyDiditVerdict } = await import("@/lib/verification/apply-verdict"));
}, 120_000);

afterAll(async () => {
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/inngest/client");
  await teardownTestDb(testDb);
});

beforeEach(async () => {
  // ⚠ THE TABLE IS EMPTIED BETWEEN CASES, AND IT HAS TO BE. The sweep is GLOBAL — it selects every stale
  // `pending` row in the database, not a row this case named — so a fixture left behind by an earlier case
  // is a row a later case's pass legitimately picks up. Measured on the first run of this file: case 7's
  // "zero HTTP calls" saw 1, case 11's "exactly one" saw 8, and case 10 was asked about two sessions from
  // two other cases. That is the suite leaking into itself, not the sweep misbehaving — and leaving it
  // would have meant tuning the assertions to the leak until they stopped measuring anything.
  await testDb.db.execute(sql`TRUNCATE host_verification, audit, "user" CASCADE`);
  answers.clear();
  undeclaredCalls.length = 0;
  fetchMock.mockClear();
  inngestSend.mockClear();
  vi.stubEnv("DIDIT_API_KEY", HARNESS_API_KEY);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("FINDING F-4 — a verdict Didit could not deliver still lands", () => {
  it("case 1 — GUARD-THE-GUARD: the selector really returns a stale pending row, and the constants are real", async () => {
    // Without this case every exclusion below could be satisfied by a selector that returns nothing.
    expect(Number.isFinite(DIDIT_RECONCILE_GRACE_MINUTES)).toBe(true);
    expect(DIDIT_RECONCILE_GRACE_MINUTES).toBeGreaterThan(0);
    expect(Number.isFinite(DIDIT_RECONCILE_BATCH_LIMIT)).toBe(true);
    expect(DIDIT_RECONCILE_BATCH_LIMIT).toBeGreaterThan(0);
    // The batch must stay under the FREE tier's 10 GET/min ceiling — the constant's own reason.
    expect(DIDIT_RECONCILE_BATCH_LIMIT).toBeLessThanOrEqual(10);

    const host = await seedRow("dr_c1", {
      status: "pending",
      vendorRef: "sess_dr_c1",
      idleMinutes: 45,
    });

    const candidates = await queryStalePendingVerifications(testDb.db);
    expect(candidates.map((c) => c.userId)).toContain(host);
    expect(candidates.find((c) => c.userId === host)?.vendorRef).toBe("sess_dr_c1");
  });

  it("case 2 — THE LOST-VERDICT RECOVERY: an idle pending row is approved from the decision endpoint, in ITS casing", async () => {
    const host = await seedRow("dr_c2", {
      status: "pending",
      vendorRef: "sess_dr_c2",
      idleMinutes: 45,
    });
    // ⚠ UPPER CASE. The decision endpoint answers `APPROVED` where the webhook envelope answers
    // `Approved` (18.1-RESEARCH § R1, two vendor pages). This case drives the endpoint's own spelling end
    // to end, so the shared mapper's case-folding is measured on the path that actually uses it rather
    // than asserted in a unit test about the mapper alone.
    answers.set("sess_dr_c2", { kind: "ok", body: approvedBody() });

    const result = await runSweep();
    expect(undeclaredCalls, "the sweep asked about a session this harness never declared").toEqual([]);
    expect(result.outcomes.recovered).toBe(1);

    const after = await row(host);
    expect(after?.status, "THIS is the assertion the phase survives a dropped webhook on").toBe(
      "approved",
    );
    expect(after?.result).toBe("pass");
    expect(after?.checkedAt, "the adapter's clock must stamp the decision instant").not.toBeNull();
    expect(after?.provider).toBe("didit");
    expect(after?.reason).toBeNull();
    // The handle is the only pointer FitOut keeps at the vendor's copy of the evidence.
    expect(after?.vendorRef, "vendor_ref must be PRESERVED across a recovered verdict").toBe(
      "sess_dr_c2",
    );

    // THE CALL HAPPENED, and it happened as a READ with the stubbed credential — never a re-created
    // session, which ADDENDUM A3 makes a no-op that would have looked like a fix.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, { method: string; headers: Record<string, string> }];
    expect(url).toBe("https://verification.didit.me/v3/session/sess_dr_c2/decision/");
    expect(init.method).toBe("GET");
    expect(init.headers["x-api-key"]).toBe(HARNESS_API_KEY);
  });

  it("case 3 — the DECLINED recovery carries a bounded, non-empty, allow-listed reason (D-265)", async () => {
    const host = await seedRow("dr_c3", {
      status: "pending",
      vendorRef: "sess_dr_c3",
      idleMinutes: 45,
    });
    answers.set("sess_dr_c3", { kind: "ok", body: declinedBody() });

    await runSweep();

    const after = await row(host);
    expect(after?.status).toBe("rejected");
    expect(after?.result).toBe("fail");
    expect(after?.checkedAt).not.toBeNull();
    expect(after?.vendorRef, "a recovered rejection preserves the handle too").toBe("sess_dr_c3");

    const reason = after?.reason ?? "";
    expect(
      reason.length,
      "a host told 'no' with an empty reason is the defect D-265 forbids",
    ).toBeGreaterThan(0);
    expect(reason.startsWith(HOST_REJECT_REASONS[0])).toBe(true);
    expect(reason).toContain("Document expired");
    // The warning-level sentence and its accusatory code never reach a host.
    expect(reason).not.toContain("Screen capture");
    expect(reason).not.toContain("SCREEN_CAPTURE_DETECTED");
    expect(reason.length).toBeLessThanOrEqual(HOST_REJECT_REASONS[0].length + 1 + REJECT_NOTE_MAX);
  });

  it("case 4 — a recovered verdict is DISTINGUISHABLE in the trail from a delivered one", async () => {
    const host = await seedRow("dr_c4", {
      status: "pending",
      vendorRef: "sess_dr_c4",
      idleMinutes: 45,
    });
    answers.set("sess_dr_c4", { kind: "ok", body: approvedBody() });

    await runSweep();

    // The write module's own verb records the transition …
    const verdictRows = (await trailRows("didit_verdict", "ok")).filter(
      (r) => (r.meta as { userId?: string })?.userId === host,
    );
    expect(verdictRows.length).toBe(1);

    // … and the sweep's SEPARATE verb records that no webhook ever arrived to carry it. Read back out of
    // the table, because `recordAudit` swallows its own insert failure by design.
    const recoveredRows = (await trailRows("didit_reconciled", "needs_attention")).filter(
      (r) => (r.meta as { userId?: string })?.userId === host,
    );
    expect(recoveredRows.length).toBe(1);
    const meta = recoveredRows[0].meta as Record<string, unknown>;
    expect(meta.transition).toBe("approve");
    expect(meta.recovered).toBe(true);
    // D-72 — no handle, no sentence, no decision object in the durable column.
    expect(Object.keys(meta).sort()).toEqual(["recovered", "status", "transition", "userId"]);
  });
});

describe("FINDING F-4 — the sweep cannot race the webhook", () => {
  it("case 5 — a FRESH row is not selected, is not asked about, and is unchanged", async () => {
    const host = await seedRow("dr_c5", {
      status: "pending",
      vendorRef: "sess_dr_c5",
      idleMinutes: 5,
    });
    answers.set("sess_dr_c5", { kind: "ok", body: approvedBody() });

    const candidates = await queryStalePendingVerifications(testDb.db);
    expect(candidates.map((c) => c.userId)).not.toContain(host);

    await runSweep();
    // ⚠ ZERO HTTP CALLS. "The row did not change" alone would also be true of a sweep that asked and was
    // told nothing; this is what makes it the GRACE WINDOW that did the work. Didit's second retry lands
    // at ~4 minutes, so a 5-minute-old row is one a healthy webhook may still be in the middle of.
    expect(fetchMock).toHaveBeenCalledTimes(0);
    expect((await row(host))?.status).toBe("pending");
  });

  it("case 6 — a row with NO handle, and a row with a BLANK one, are neither selected nor asked about", async () => {
    // ⚠ BOTH SHAPES ARE DRIVEN, AND THE SECOND ONE IS HERE BECAUSE OF A MEASUREMENT. The sweep's handle
    // bound is two predicates — `vendor_ref IS NOT NULL` and `btrim(vendor_ref) <> ''` — and removing the
    // first one during this plan's mutation pass reddened NOTHING: in SQL's three-valued logic
    // `btrim(NULL) <> ''` is NULL, so the blank test alone already excludes a null handle. Without a
    // whitespace fixture the predicate that is actually holding the line would have been the untested one,
    // and the tested one would have been decorative. See the constant's docblock in the sweep.
    const nullHandle = await seedRow("dr_c6_null", {
      status: "pending",
      vendorRef: null,
      idleMinutes: 45,
    });
    const blankHandle = await seedRow("dr_c6_blank", {
      status: "pending",
      vendorRef: "   ",
      idleMinutes: 45,
    });

    const candidates = await queryStalePendingVerifications(testDb.db);
    expect(candidates.map((c) => c.userId)).not.toContain(nullHandle);
    expect(candidates.map((c) => c.userId)).not.toContain(blankHandle);

    await runSweep();
    expect(fetchMock).toHaveBeenCalledTimes(0);
    expect((await row(nullHandle))?.status).toBe("pending");
    expect((await row(nullHandle))?.vendorRef).toBeNull();
    expect((await row(blankHandle))?.status).toBe("pending");
  });

  it("case 7 — every NON-pending status is left alone and unqueried, `suspended` included", async () => {
    const seeded: string[] = [];
    for (const status of ["approved", "rejected", "suspended", "unverified"] as const) {
      seeded.push(
        await seedRow(`dr_c7_${status}`, {
          status,
          vendorRef: `sess_dr_c7_${status}`,
          idleMinutes: 90,
        }),
      );
      // Declared so that if one WERE selected, the case would fail on the row's state rather than on an
      // undeclared-answer 599 that could be mistaken for a fail-closed pass.
      answers.set(`sess_dr_c7_${status}`, { kind: "ok", body: approvedBody() });
    }

    const candidates = await queryStalePendingVerifications(testDb.db);
    for (const id of seeded) expect(candidates.map((c) => c.userId)).not.toContain(id);

    await runSweep();
    expect(fetchMock).toHaveBeenCalledTimes(0);

    for (const status of ["approved", "rejected", "suspended", "unverified"] as const) {
      expect((await row(`dr_c7_${status}`))?.status).toBe(status);
    }
  });

  it("case 8 — IDEMPOTENCY: a verdict the webhook already landed flips 0 rows and sends no second notice", async () => {
    const host = await seedRow("dr_c8", {
      status: "pending",
      vendorRef: "sess_dr_c8",
      idleMinutes: 45,
    });
    answers.set("sess_dr_c8", { kind: "ok", body: approvedBody() });

    // The webhook's path, driven directly: the SAME write module, reached the other way.
    const first = await applyDiditVerdict({
      vendorData: host,
      sessionId: "sess_dr_c8",
      status: "Approved",
      decision: null,
    });
    expect(first.moved).toBe(true);
    expect(noticesFor(host).length, "the host is told exactly once, the first time").toBe(1);

    // Two independent guards close this, and they are asserted SEPARATELY so neither can carry the other:
    //   (a) the SELECTOR no longer sees the row, because it is not `pending`;
    const candidates = await queryStalePendingVerifications(testDb.db);
    expect(candidates.map((c) => c.userId)).not.toContain(host);

    //   (b) and even reached directly — the shape a race would produce, where the selector ran BEFORE the
    //       webhook landed — the write module's own `WHERE status = 'pending'` makes it a 0-row no-op.
    const second = await reconcileOne({ userId: host, vendorRef: "sess_dr_c8" });
    expect(second.outcome).toBe("unchanged");

    expect(noticesFor(host).length, "one decision, one notification — D-245").toBe(1);
    const after = await row(host);
    expect(after?.status).toBe("approved");
    // No second `didit_reconciled` alert either: the webhook beating the sweep is the system WORKING.
    const recovered = (await trailRows("didit_reconciled", "needs_attention")).filter(
      (r) => (r.meta as { userId?: string })?.userId === host,
    );
    expect(recovered.length).toBe(0);
  });
});

describe("FINDING F-4 — the sweep fails closed and backs off", () => {
  it("case 9 — a 429 STOPS THE PASS cleanly; handled rows stay handled and the rest stay selectable", async () => {
    // Oldest first, so the order the pass takes them in is A → B → C.
    const a = await seedRow("dr_c9_a", { status: "pending", vendorRef: "sess_a", idleMinutes: 90 });
    const b = await seedRow("dr_c9_b", { status: "pending", vendorRef: "sess_b", idleMinutes: 80 });
    const c = await seedRow("dr_c9_c", { status: "pending", vendorRef: "sess_c", idleMinutes: 70 });
    answers.set("sess_a", { kind: "ok", body: approvedBody() });
    answers.set("sess_b", { kind: "status", status: 429 });
    answers.set("sess_c", { kind: "ok", body: approvedBody() });

    // No exception escapes — the pass returns a tally.
    const result = await runSweep();
    expect(result.outcomes["rate-limited"]).toBe(1);
    expect(result.outcomes.recovered).toBe(1);

    // It stopped rather than carrying on: C was never asked about. A tight loop against a vendor already
    // saying stop is the one response that makes a rate limit worse.
    expect(fetchMock).toHaveBeenCalledTimes(2);

    expect((await row(a))?.status, "work already done is not undone").toBe("approved");
    expect((await row(b))?.status).toBe("pending");
    expect((await row(c))?.status).toBe("pending");

    // And the next tick picks up exactly where this one left off.
    const next = await queryStalePendingVerifications(testDb.db);
    const ids = next.map((r) => r.userId);
    expect(ids).toContain(b);
    expect(ids).toContain(c);
    expect(ids).not.toContain(a);
  });

  it("case 10 — every OTHER vendor failure is 'we did not learn', never a verdict", async () => {
    const cases: Array<{ id: string; ref: string; answer: VendorAnswer }> = [
      { id: "dr_c10_transport", ref: "sess_t", answer: { kind: "transport" } },
      { id: "dr_c10_credential", ref: "sess_403", answer: { kind: "status", status: 403 } },
      { id: "dr_c10_server", ref: "sess_500", answer: { kind: "status", status: 500 } },
      { id: "dr_c10_notjson", ref: "sess_html", answer: { kind: "raw", status: 200, text: "<html>" } },
      { id: "dr_c10_nostatus", ref: "sess_bare", answer: { kind: "raw", status: 200, text: "{}" } },
    ];
    for (const { id, ref, answer } of cases) {
      await seedRow(id, { status: "pending", vendorRef: ref, idleMinutes: 90 });
      answers.set(ref, answer);
    }

    const result = await runSweep();
    expect(undeclaredCalls).toEqual([]);
    expect(result.outcomes.unreachable).toBe(cases.length);
    expect(result.outcomes.recovered).toBeUndefined();

    // Each was ASKED — so this is the fail-closed branch and not a selector that skipped them …
    expect(fetchMock).toHaveBeenCalledTimes(cases.length);
    // … and every one of them is still exactly where it was.
    for (const { id } of cases) {
      const after = await row(id);
      expect(after?.status, `${id} must be untouched`).toBe("pending");
      expect(after?.result).toBeNull();
      expect(after?.checkedAt).toBeNull();
    }
    // A failure to LEARN is not an operator alert, by design: a refused credential fails every row on
    // every pass, and a `needs_attention` row per row per pass is the D-110 noise defect.
    const noisy = await trailRows("didit_reconciled", "needs_attention");
    expect(noisy.filter((r) => String((r.meta as { userId?: string })?.userId).startsWith("dr_c10")).length).toBe(0);
  });

  it("case 11 — a status FitOut has never heard of moves nothing", async () => {
    const host = await seedRow("dr_c11", {
      status: "pending",
      vendorRef: "sess_dr_c11",
      idleMinutes: 45,
    });
    answers.set("sess_dr_c11", { kind: "ok", body: { status: "Definitely Approved" } });

    const result = await runSweep();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.outcomes.unchanged).toBe(1);
    expect((await row(host))?.status).toBe("pending");
  });
});

describe("FINDING F-4 — one road, and one schedule slot", () => {
  it("case 12 — the sweep's source contains NO host_verification write, read over comment-stripped text", () => {
    const src = readFileSync(resolve(process.cwd(), SWEEP_PATH), "utf8");
    const stripped = stripComments(src);

    // GUARD-THE-GUARD, BOTH DIRECTIONS. A stripper that returned the empty string would make every
    // prohibition below pass vacuously — `tests/design/upload-policy.test.ts`'s rule, applied here.
    expect(stripped.length, "the stripped source is empty").toBeGreaterThan(200);
    expect(stripped, "the sweep must still NAME the table in code (its SELECT)").toContain(
      "host_verification",
    );
    expect(stripped, "the positive control: the one write path is called").toContain(
      "applyDiditVerdict",
    );

    const writeStatements = [
      { name: "UPDATE", re: /\bupdate\s+"?host_verification/i },
      { name: "INSERT", re: /\binsert\s+into\s+"?host_verification/i },
      { name: "DELETE", re: /\bdelete\s+from\s+"?host_verification/i },
      { name: "SET status", re: /\bset\s+status\s*=/i },
    ];

    // Each detector is proved to FIRE on the thing it is named for, so a regex that could never match
    // cannot masquerade as a clean file.
    const sample = `UPDATE host_verification SET status = 'approved'
      INSERT INTO host_verification (user_id) VALUES ('x')
      DELETE FROM host_verification WHERE user_id = 'x'`;
    for (const { name, re } of writeStatements) {
      expect(re.test(sample), `the ${name} detector does not detect ${name}`).toBe(true);
    }

    for (const { name, re } of writeStatements) {
      expect(
        re.test(stripped),
        `${SWEEP_PATH} contains a ${name} of its own — D-105 forbids a second road to the approved state; ` +
          `widen src/lib/verification/apply-verdict.ts instead`,
      ).toBe(false);
    }
  });

  it("case 13 — the cron lands on a minute no other registered job holds (Pitfall 4)", () => {
    const cron = diditReconcileCron();
    const fields = cron.trim().split(/\s+/);
    if (fields[0]?.startsWith("TZ=")) fields.shift();
    const parsed = /^(\d+)-(\d+)\/(\d+)$/.exec(fields[0] ?? "");
    // THROWS-BY-ASSERTION rather than defaulting: a parser that quietly answered `{start:0,step:0}` would
    // make the rest of this case assert against a fiction.
    expect(parsed, `the cron minute field "${fields[0]}" is not the POSIX step form this case can read`)
      .not.toBeNull();

    const start = Number(parsed![1]);
    const step = Number(parsed![3]);
    const minutes: number[] = [];
    for (let m = start; m <= Number(parsed![2]); m += step) minutes.push(m);
    expect(minutes.length).toBeGreaterThan(0);

    // The hourly crons (:00 :15 :30 :45) and the daily digest (:50).
    const OCCUPIED = [0, 15, 30, 45, 50];
    // The two sub-hourly families: payment reconcile `2-59/5` and checkout-retire `4-59/5`.
    const OCCUPIED_RESIDUES = [2, 4];
    for (const m of minutes) {
      expect(OCCUPIED, `minute :${m} is already held by an hourly cron or the digest`).not.toContain(m);
      expect(
        OCCUPIED_RESIDUES,
        `minute :${m} shares a residue with a five-minute sweep, so the two would contend`,
      ).not.toContain(m % 5);
    }
  });
});
