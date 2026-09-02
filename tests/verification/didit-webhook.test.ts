// HVER-07 — THE AUTHENTICATED DOOR. `POST /api/didit/webhook`, driven for real.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ WHAT THIS FILE CANNOT PROVE, SAID FIRST BECAUSE IT IS THE HALF PEOPLE ASSUME
// ════════════════════════════════════════════════════════════════════════════════════════════════
// **A SELF-SIGNED MOCK PROVES ONLY THAT THE ROUTE AGREES WITH `tests/helpers/mocks.ts`.** Both sides
// of every signature below are computed in this repository, so if the shared understanding of what
// Didit signs is WRONG, every case here is green and every real delivery is a 400.
//
// That is not a hypothetical. 18.1-RESEARCH § ADDENDUM A7 records the vendor contradicting ITSELF
// about `X-Signature` — one page calls it the exact bytes transmitted, another describes a
// canonicalisation, and those cannot both be true. And this repository has already paid the bill
// once, on the other webhook: PayMongo's real header populates exactly one of `te`/`li`, the parser
// demanded both, every real signature was refused with a 400 through a whole phase of local UAT, and
// the synthetic both-filled fixtures stayed green the entire time.
//
// WHAT SETTLES IT IS THE SANDBOX TRANSCRIPT in `18.1-EVIDENCE.md` (plan 18.1-14), which records
// which header actually verified against real bytes. This file's job is the other half: that GIVEN a
// signature the route accepts, every branch behind it does the right thing, and that everything the
// route must refuse is refused with a 400 rather than a 500.
//
// What this file DOES do about the lesson: the fixtures emit the REAL header shape — three separate
// headers (`X-Signature`, `X-Signature-V2`, `X-Timestamp`), each settable independently, exactly as
// the vendor sends them — rather than a convenient single string that would make the header-vs-body
// timestamp cases unwritable.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHY EVERY CLAIM IS A `SELECT`, NEVER A RESPONSE BODY
// ════════════════════════════════════════════════════════════════════════════════════════════════
// The route returns `200 ok` on a successful flip, on a re-delivery, on an unhandled event type and
// on an environment mismatch — deliberately, because a non-2xx burns one of the vendor's only two
// retries. So the STATUS LINE is evidence about the ACK and evidence of nothing about the row. Every
// state claim below reads `host_verification` back out of the table, and every trail claim reads
// `audit` back out — `recordAudit` swallows its own insert failure by design.
//
// ⚠ AND EVERY REFUSAL CASE ALSO PROVES THE GUARD RAN. A 400 with an unchanged row is exactly what a
// route that refused EVERYTHING would produce, so a refusal assertion is vacuous on its own. Two
// things close that here: `case 1` is the positive control (the same fixture, the same secret, a
// good signature, and the row DOES flip), and each refusal case additionally asserts the row is
// still `pending` — i.e. the delivery reached a decision point and was turned away, rather than the
// suite having been misconfigured into refusing every request. That defect has shipped in this
// repository before (five of thirteen cases in `tests/booking/checkout-probe.test.ts` were satisfied
// by a short-circuit rather than the branch they named).

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { and, eq } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { seedHostVerification } from "../helpers/verification";
import {
  badDiditSignature,
  signDiditWebhook,
  signDiditWebhookV2,
} from "../helpers/mocks";
import { audit, hostVerification } from "@/lib/db/schema";
import { HOST_REJECT_REASONS, REJECT_NOTE_MAX } from "@/lib/validation/ops";

const SECRET = "whsec_didit_test_18108";
const WRONG_SECRET = "whsec_didit_test_wrong";

/** The vendor session handle the SUBMISSION wrote. Every fixture's `vendor_ref` starts as this. */
const SESSION = "sess_18108_aaaaaaaa";

let testDb: TestDb;
let POST: (typeof import("@/app/api/didit/webhook/route"))["POST"];

/** Every response this suite produced, so one case can assert the suite never 500s. */
const seenStatuses: number[] = [];

// ── The envelope, from 18.1-RESEARCH § R1 § Webhooks, verbatim in shape. ─────────────────────────
//
// ⚠ V3 PLURAL ARRAYS ONLY (`id_verifications[]`, …). The V2 singular keys are absent on purpose:
// our destination is pinned to `webhook_version: "v3"` and a singular key would be `undefined`,
// which reads as "not approved" and would reject every host (Pitfall 2).
//
// ⚠ NO MEDIA URL APPEARS ANYWHERE IN THIS FIXTURE. A real decision carries short-lived presigned
// URLs; none is modelled, because nothing may persist one (ADDENDUM A8 / D-263).
function envelope(opts: {
  eventId?: string;
  webhookType?: string;
  status?: string;
  vendorData: string;
  sessionId?: string;
  environment?: string;
  timestamp?: number;
  decision?: unknown;
}): string {
  const body: Record<string, unknown> = {
    event_id: opts.eventId ?? "evt_18108_default",
    webhook_type: opts.webhookType ?? "status.updated",
    timestamp: opts.timestamp ?? Math.floor(Date.now() / 1000),
    created_at: (opts.timestamp ?? Math.floor(Date.now() / 1000)) - 6,
    application_id: "app_18108",
    environment: opts.environment ?? "sandbox",
    sandbox_scenario: null,
    session_id: opts.sessionId ?? SESSION,
    status: opts.status ?? "Approved",
    workflow_id: "wf_18108",
    workflow_version: 1,
    vendor_data: opts.vendorData,
    metadata: {},
  };
  if (opts.decision !== undefined) body.decision = opts.decision;
  return JSON.stringify(body);
}

/** A `Declined` decision carrying ONE allow-listed error warning — the D-265 happy path. */
const DECLINED_DECISION = {
  id_verifications: [
    {
      node_id: "node_ocr_1",
      status: "Declined",
      warnings: [
        { log_type: "error", risk: "DOCUMENT_EXPIRED", short_description: "Document expired" },
        // Excluded three ways over: not an error, and its code is not on the safe set.
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

/**
 * Drive the route. Headers are SEPARATE and independently settable — the real shape.
 *
 * `headerTimestamp` defaults to the body's own instant, which is what a genuine delivery looks like;
 * the two are split apart only by the cases that exist to prove the authenticated check is not being
 * carried by the unauthenticated one.
 */
async function post(
  rawBody: string,
  opts: {
    signature?: string | null;
    signatureV2?: string | null;
    simpleSignature?: string | null;
    headerTimestamp?: number | null;
    secret?: string;
  } = {},
): Promise<Response> {
  // ⚠ TOLERANT OF A BODY THAT IS NOT JSON, because one case deliberately sends one. The helper is
  // only reading the body's own instant in order to DEFAULT the header to it; a fixture that could
  // not express "validly signed nonsense" would leave the route's parse branch unmeasured.
  let bodyTs: number | undefined;
  try {
    bodyTs = (JSON.parse(rawBody) as { timestamp?: number }).timestamp;
  } catch {
    bodyTs = undefined;
  }
  const secret = opts.secret ?? SECRET;
  const headers: Record<string, string> = { "content-type": "application/json" };

  const ts = opts.headerTimestamp === undefined ? bodyTs : opts.headerTimestamp;
  if (ts !== null && ts !== undefined) headers["x-timestamp"] = String(ts);

  const sig = opts.signature === undefined ? signDiditWebhook(rawBody, secret) : opts.signature;
  if (sig !== null) headers["x-signature"] = sig;
  if (opts.signatureV2 != null) headers["x-signature-v2"] = opts.signatureV2;
  if (opts.simpleSignature != null) headers["x-signature-simple"] = opts.simpleSignature;

  const res = await POST(
    new Request("http://localhost/api/didit/webhook", { method: "POST", headers, body: rawBody }),
  );
  seenStatuses.push(res.status);
  return res;
}

/** Seed a host whose row is `pending` on a Didit session — the state a real verdict arrives into. */
async function seedPending(id: string, sessionId: string = SESSION): Promise<string> {
  await seedHostVerification(testDb.db, id, "pending", { provider: "didit" });
  await testDb.db
    .update(hostVerification)
    .set({ vendorRef: sessionId })
    .where(eq(hostVerification.userId, id));
  return id;
}

async function row(userId: string) {
  const [r] = await testDb.db
    .select()
    .from(hostVerification)
    .where(eq(hostVerification.userId, userId));
  return r ?? null;
}

/** THE TRAIL INSTRUMENT — `ops-audit.test.ts`'s, copied. Rows are read, never inferred. */
async function trailRows(action: string, outcome: "ok" | "denied" | "needs_attention") {
  return testDb.db
    .select()
    .from(audit)
    .where(and(eq(audit.action, action), eq(audit.outcome, outcome)));
}

beforeAll(async () => {
  testDb = await setupTestDb();
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  // D-83: the host's notice is EMITTED, not sent inline. Stub the client so nothing leaves and so a
  // failure in the fan-out cannot be mistaken for a failure in the verdict.
  vi.doMock("@/inngest/client", () => ({ inngest: { send: async () => {} } }));
  vi.resetModules();
  ({ POST } = await import("@/app/api/didit/webhook/route"));
}, 120_000);

afterAll(async () => {
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/inngest/client");
  await teardownTestDb(testDb);
});

beforeEach(() => {
  // ⚠ STUBBED, NEVER READ FROM `.env.local`. `tests/setup.ts` loads that file on this machine, so a
  // case that depended on the real secret being present — or absent — would be a case nobody else
  // can run, and would leak whether a credential exists on the box.
  vi.stubEnv("DIDIT_WEBHOOK_SECRET", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("HVER-07 — a verified delivery lands exactly once", () => {
  it("case 1 — POSITIVE CONTROL: a valid signature over the raw body, in window, flips the row and ACKs 200", async () => {
    const host = await seedPending("dw_c1");
    const before = await row(host);
    expect(before?.status, "the fixture must start pending").toBe("pending");

    const res = await post(envelope({ eventId: "evt_c1", vendorData: host }));
    expect(res.status).toBe(200);

    const after = await row(host);
    expect(after?.status).toBe("approved");
    // Every case that asserts a 400 leans on THIS case: a suite in which the secret never reached
    // the route would refuse everything, and this is the one assertion that could not survive it.
  });

  it("case 2 — Approved: result=pass, checked_at set, provider from the port, and vendor_ref PRESERVED", async () => {
    const host = await seedPending("dw_c2");

    const res = await post(envelope({ eventId: "evt_c2", vendorData: host, status: "Approved" }));
    expect(res.status).toBe(200);

    const after = await row(host);
    expect(after?.status).toBe("approved");
    expect(after?.result).toBe("pass");
    expect(after?.checkedAt, "the adapter's clock must stamp the decision instant").not.toBeNull();
    expect(after?.provider).toBe("didit");
    expect(after?.reason).toBeNull();

    // ⚠ THE HANDLE IS UNCHANGED. The adapter's verdict carries `vendorRef: null`, which means "this
    // call carries no NEW handle", not "erase the one you have". Writing it would throw away the
    // only pointer FitOut keeps at the vendor's copy of the evidence.
    expect(after?.vendorRef, "vendor_ref must be preserved, not overwritten and not nulled").toBe(
      SESSION,
    );
  });

  it("case 3 — Declined: result=fail, and a bounded, non-empty, allow-listed reason (D-265)", async () => {
    const host = await seedPending("dw_c3");

    const res = await post(
      envelope({
        eventId: "evt_c3",
        vendorData: host,
        status: "Declined",
        decision: DECLINED_DECISION,
      }),
    );
    expect(res.status).toBe(200);

    const after = await row(host);
    expect(after?.status).toBe("rejected");
    expect(after?.result).toBe("fail");
    expect(after?.checkedAt).not.toBeNull();
    expect(after?.vendorRef, "a rejection preserves the handle too").toBe(SESSION);

    const reason = after?.reason ?? "";
    expect(reason.length, "a host told 'no' with an empty reason is the defect D-265 forbids").toBeGreaterThan(0);
    expect(reason.startsWith(HOST_REJECT_REASONS[0])).toBe(true);
    expect(reason).toContain("Document expired");
    // The vendor's warning-level sentence and its accusatory code never reach a host.
    expect(reason).not.toContain("Screen capture");
    expect(reason).not.toContain("SCREEN_CAPTURE_DETECTED");
    expect(reason.length).toBeLessThanOrEqual(HOST_REJECT_REASONS[0].length + 1 + REJECT_NOTE_MAX);
  });

  it("case 4 — Expired returns the row to unverified (FINDING F-3)", async () => {
    const host = await seedPending("dw_c4");

    const res = await post(envelope({ eventId: "evt_c4", vendorData: host, status: "Expired" }));
    expect(res.status).toBe(200);

    const after = await row(host);
    expect(
      after?.status,
      "F-3: nobody checked, so the row returns to the state that says exactly that. The /host/verify " +
        "panel's resting copy depends on this — leaving it `pending` would show a host a check that " +
        "is running when none is, and would park a row in the ops queue nobody will ever decide.",
    ).toBe("unverified");
    expect(after?.result).toBeNull();
    expect(after?.checkedAt).toBeNull();
    expect(after?.vendorRef, "the handle points at a session that decided nothing").toBeNull();
  });

  it("case 5 — Abandoned returns the row to unverified (FINDING F-3)", async () => {
    const host = await seedPending("dw_c5");

    const res = await post(envelope({ eventId: "evt_c5", vendorData: host, status: "Abandoned" }));
    expect(res.status).toBe(200);

    const after = await row(host);
    expect(
      after?.status,
      "F-3: the host started the hosted flow and never finished it. The row is NOT rejected, so " +
        "D-264's cooldown does not apply and the /host/verify panel must offer them the check again.",
    ).toBe("unverified");
    expect(after?.result).toBeNull();
  });

  it("case 6 — In Review leaves the row pending, and writes a trail row so the state is observable", async () => {
    const host = await seedPending("dw_c6");

    const res = await post(envelope({ eventId: "evt_c6", vendorData: host, status: "In Review" }));
    expect(res.status).toBe(200);
    expect(await row(host).then((r) => r?.status)).toBe("pending");

    const rows = await trailRows("didit_verdict", "ok");
    const mine = rows.find((r) => (r.meta as { userId?: string })?.userId === host);
    expect(mine, "a vendor-side review must be visible in the trail, not merely true").toBeDefined();
    expect((mine!.meta as { transition?: string }).transition).toBe("none");
    expect((mine!.meta as { moved?: boolean }).moved).toBe(false);
  });

  it("case 7 — Resubmitted moves nothing, and reading it as a verdict never happens", async () => {
    const host = await seedPending("dw_c7");

    // ⚠ NO `decision` KEY AT ALL, which is the real shape: this status carries `resubmit_info`
    // INSTEAD (ADDENDUM A6). A mapper that reached for the decision unconditionally would throw on
    // the one status meaning "the host is still working"; `carriesDecision` is why it does not.
    const res = await post(
      envelope({ eventId: "evt_c7", vendorData: host, status: "Resubmitted" }),
    );
    expect(res.status).toBe(200);
    expect(await row(host).then((r) => r?.status)).toBe("pending");
  });

  it("case 8 — an unrecognised status fails CLOSED: nothing moves, and a person is asked to look", async () => {
    const host = await seedPending("dw_c8");

    const res = await post(
      envelope({ eventId: "evt_c8", vendorData: host, status: "Gloriously Approved" }),
    );
    expect(res.status).toBe(200);
    expect(
      await row(host).then((r) => r?.status),
      "an eleventh vendor status must never be read as permission",
    ).toBe("pending");

    const rows = await trailRows("didit_verdict", "ok");
    const mine = rows.find(
      (r) => (r.meta as { userId?: string })?.userId === host,
    );
    expect(mine).toBeDefined();
    expect((mine!.meta as { status?: string | null }).status).toBeNull();
  });
});

describe("HVER-07 — the signature is the only authentication, and every refusal is a clean 400", () => {
  it("case 9 — a TAMPERED body carrying the signature of the original is refused", async () => {
    const host = await seedPending("dw_c9");
    const original = envelope({ eventId: "evt_c9", vendorData: host, status: "Declined" });
    const goodSig = signDiditWebhook(original, SECRET);

    // The attack: keep the signature, swap the verdict. One byte of the covered message changes.
    const tampered = original.replace('"status":"Declined"', '"status":"Approved"');
    expect(tampered, "the fixture must actually differ").not.toBe(original);

    const res = await post(tampered, { signature: goodSig });
    expect(res.status).toBe(400);
    expect(
      await row(host).then((r) => r?.status),
      "a forged verdict is a fabricated identity check — it must move nothing",
    ).toBe("pending");
  });

  it("case 10 — a signature computed with the WRONG SECRET is refused", async () => {
    const host = await seedPending("dw_c10");
    const body = envelope({ eventId: "evt_c10", vendorData: host });

    const res = await post(body, { signature: signDiditWebhook(body, WRONG_SECRET) });
    expect(res.status).toBe(400);
    expect(await row(host).then((r) => r?.status)).toBe("pending");
  });

  it("case 11 — a MISSING X-Signature header is refused", async () => {
    const host = await seedPending("dw_c11");

    const res = await post(envelope({ eventId: "evt_c11", vendorData: host }), { signature: null });
    expect(res.status).toBe(400);
    expect(await row(host).then((r) => r?.status)).toBe("pending");
  });

  it("case 12 — an all-zero signature of the RIGHT LENGTH reaches the compare and still loses", async () => {
    const host = await seedPending("dw_c12");

    // Right length, wrong content — so this exercises `timingSafeEqual` itself rather than the
    // length guard in front of it. Both halves matter; case 13 drives the other one.
    const res = await post(envelope({ eventId: "evt_c12", vendorData: host }), {
      signature: badDiditSignature(),
    });
    expect(res.status).toBe(400);
    expect(await row(host).then((r) => r?.status)).toBe("pending");
  });

  it("case 13 — a MALFORMED (odd-length, non-hex) signature is a 400 and NOT a 500", async () => {
    const host = await seedPending("dw_c13");

    // ⚠ THE MUTATION TARGET. `timingSafeEqual` throws a RangeError on unequal-length buffers, so
    // without the byte-length pre-check this exact input escapes the compare as an unhandled
    // exception and the route answers 500 — an availability defect a prober can trigger at will.
    const res = await post(envelope({ eventId: "evt_c13", vendorData: host }), {
      signature: "zzz",
    });
    expect(res.status).toBe(400);
    expect(res.status).not.toBe(500);
    expect(await row(host).then((r) => r?.status)).toBe("pending");
  });

  it("case 14 — X-Signature-Simple is NEVER accepted, even when it is correctly computed", async () => {
    const host = await seedPending("dw_c14");
    const body = envelope({ eventId: "evt_c14", vendorData: host });
    const parsed = JSON.parse(body) as Record<string, unknown>;

    // The vendor's own Simple message: `{timestamp}:{session_id}:{status}:{webhook_type}`. Computed
    // CORRECTLY with the real secret, so this case fails for the right reason — the header is
    // refused by construction, not because the digest happened to be wrong.
    const simple = signDiditWebhook(
      `${parsed.timestamp}:${parsed.session_id}:${parsed.status}:${parsed.webhook_type}`,
      SECRET,
    );

    const res = await post(body, { signature: null, simpleSignature: simple });
    expect(
      res.status,
      "Simple authenticates four envelope fields and leaves `decision` — the thing that decides " +
        "whether a host is approved — completely unauthenticated. FitOut holds the raw bytes.",
    ).toBe(400);
    expect(await row(host).then((r) => r?.status)).toBe("pending");
  });

  it("case 15 — the X-Signature-V2 FALLBACK is accepted when the primary header is absent", async () => {
    const host = await seedPending("dw_c15");
    const body = envelope({ eventId: "evt_c15", vendorData: host });

    // ADDENDUM A7: the vendor's two descriptions of the primary header contradict each other, so
    // both are implemented. This proves the fallback is a live path rather than dead code — which
    // matters because 18.1-14 may find it is the ONLY one that verifies against real bytes.
    const res = await post(body, {
      signature: null,
      signatureV2: signDiditWebhookV2(body, SECRET),
    });
    expect(res.status).toBe(200);
    expect(await row(host).then((r) => r?.status)).toBe("approved");
  });
});

describe("HVER-07 — two independent replay controls, asserted separately", () => {
  it("case 16 — a HEADER timestamp more than 300s in the PAST is refused", async () => {
    const host = await seedPending("dw_c16");
    const nowSec = Math.floor(Date.now() / 1000);

    const res = await post(envelope({ eventId: "evt_c16", vendorData: host }), {
      headerTimestamp: nowSec - 301,
    });
    expect(res.status).toBe(400);
    expect(await row(host).then((r) => r?.status)).toBe("pending");
  });

  it("case 17 — a HEADER timestamp more than 300s in the FUTURE is refused", async () => {
    const host = await seedPending("dw_c17");
    const nowSec = Math.floor(Date.now() / 1000);

    const res = await post(envelope({ eventId: "evt_c17", vendorData: host }), {
      headerTimestamp: nowSec + 301,
    });
    expect(res.status).toBe(400);
    expect(await row(host).then((r) => r?.status)).toBe("pending");
  });

  it("case 18 — a MISSING X-Timestamp header is refused (absent is not fresh)", async () => {
    const host = await seedPending("dw_c18");

    const res = await post(envelope({ eventId: "evt_c18", vendorData: host }), {
      headerTimestamp: null,
    });
    expect(res.status).toBe(400);
    expect(await row(host).then((r) => r?.status)).toBe("pending");
  });

  it("case 19 — a STALE BODY timestamp is refused even when the header's is fresh", async () => {
    const host = await seedPending("dw_c19");
    const nowSec = Math.floor(Date.now() / 1000);

    // ⚠ THIS IS THE CASE THAT MATTERS, AND IT HAS NO PAYMONGO ANALOGUE. Didit's primary signature
    // covers the raw body ALONE, so `X-Timestamp` is NOT inside the signed message and an attacker
    // replaying a captured body may set it to anything. The envelope's own `timestamp` IS covered.
    // Here the header is fresh and correctly formed, the signature is genuinely valid over these
    // exact bytes, and the delivery must STILL be refused — which it can only be if the
    // authenticated copy is checked too. Without that check this case returns 200.
    const body = envelope({ eventId: "evt_c19", vendorData: host, timestamp: nowSec - 3600 });
    const res = await post(body, { headerTimestamp: nowSec });

    expect(res.status).toBe(400);
    expect(await row(host).then((r) => r?.status)).toBe("pending");
  });

  it("case 20 — a RE-DELIVERED event flips 0 rows and returns 200", async () => {
    const host = await seedPending("dw_c20");
    const body = envelope({ eventId: "evt_c20", vendorData: host, status: "Declined", decision: DECLINED_DECISION });

    const first = await post(body);
    expect(first.status).toBe(200);
    const afterFirst = await row(host);
    expect(afterFirst?.status).toBe("rejected");

    // Same body, same `event_id`, FRESHLY SIGNED — exactly what a vendor retry looks like. There is
    // no event ledger: the guarded `WHERE status='pending'` is the idempotency, so the second
    // delivery matches no row.
    const second = await post(body);
    expect(second.status, "a non-2xx here would burn one of the vendor's only two retries").toBe(200);

    const afterSecond = await row(host);
    expect(afterSecond?.status).toBe("rejected");
    expect(afterSecond?.reason).toBe(afterFirst?.reason);
    expect(
      afterSecond?.updatedAt?.getTime(),
      "0 rows flipped, so not one column moved — including the cooldown clock D-264 reads",
    ).toBe(afterFirst?.updatedAt?.getTime());

    // And the no-op is IN THE TRAIL, read back out: "a verdict arrived and moved nothing" is the row
    // an operator needs when a host insists something happened.
    const denied = await trailRows("didit_verdict", "denied");
    const mine = denied.find((r) => (r.meta as { userId?: string })?.userId === host);
    expect(mine).toBeDefined();
    expect((mine!.meta as { reason?: string }).reason).toBe("not_applicable");
  });
});

describe("HVER-07 — authenticated but not applicable: 200, and nothing moves", () => {
  it("case 21 — an unknown webhook_type is a 200 no-op with a trail row", async () => {
    const host = await seedPending("dw_c21");

    const res = await post(
      envelope({ eventId: "evt_c21", vendorData: host, webhookType: "data.updated" }),
    );
    expect(
      res.status,
      "nine other event types exist and none is subscribed; a 4xx would burn retries on an " +
        "accidental Console subscription instead of making it visible",
    ).toBe(200);
    expect(await row(host).then((r) => r?.status)).toBe("pending");

    const rows = await trailRows("didit_webhook", "denied");
    expect(rows.some((r) => (r.meta as { eventId?: string })?.eventId === "evt_c21")).toBe(true);
  });

  it("case 22 — a verdict for a vendor_data with NO host_verification row flips 0 rows and ACKs", async () => {
    const res = await post(
      envelope({ eventId: "evt_c22", vendorData: "dw_nobody_at_all", status: "Approved" }),
    );
    expect(res.status).toBe(200);

    const [r] = await testDb.db
      .select()
      .from(hostVerification)
      .where(eq(hostVerification.userId, "dw_nobody_at_all"));
    expect(
      r,
      "vendor_data is a LOOKUP KEY against a row FitOut already wrote — it may never create one",
    ).toBeUndefined();
  });

  it("case 23 — a SUSPENDED host cannot be auto-approved back to sellable (D-266's other half)", async () => {
    const host = "dw_c23";
    await seedHostVerification(testDb.db, host, "suspended", { provider: "manual" });

    const res = await post(envelope({ eventId: "evt_c23", vendorData: host, status: "Approved" }));
    expect(res.status).toBe(200);
    expect(
      await row(host).then((r) => r?.status),
      "a suspension is a named staff member's deliberate act; letting a vendor verdict silently " +
        "reverse it is exactly what the status-scoped WHERE makes impossible",
    ).toBe("suspended");
  });

  it("case 24 — ADDENDUM A4: a SANDBOX delivery cannot move state on a live-expecting deployment", async () => {
    const host = await seedPending("dw_c24");
    // The module-level boot guard already ran under NODE_ENV=test; `environmentAccepted` reads the
    // environment at CALL time, which is what this stub reaches.
    vi.stubEnv("NODE_ENV", "production");
    // ⚠ AND THE SECOND HALF OF THE PREDICATE MUST BE STUBBED TOO, OR THIS CASE ASSERTS NOTHING.
    // `environmentAccepted` is `environment === (process.env.DIDIT_ENVIRONMENT ?? "live")`. Stubbing
    // only NODE_ENV leaves the comparison reading the MACHINE's value, so the case tested a
    // deployment posture rather than the guarantee in its own name: on a developer box configured
    // for the sandbox application — which is the correct configuration for running the sandbox walk
    // — a sandbox delivery was ACCEPTED and this failed, looking exactly like a product regression.
    // Measured 2026-09-03: red under DIDIT_ENVIRONMENT=sandbox, green under =live, same code.
    // The name says "a live-expecting deployment", so the test must be the thing that establishes
    // the deployment expects live.
    vi.stubEnv("DIDIT_ENVIRONMENT", "live");

    const res = await post(
      envelope({ eventId: "evt_c24", vendorData: host, environment: "sandbox" }),
    );
    expect(res.status).toBe(200);
    expect(
      await row(host).then((r) => r?.status),
      "a mocked sandbox verdict approving a real host is the inbound half of the guarantee " +
        "`sandbox_scenario`-refused-on-live only covers outbound",
    ).toBe("pending");

    const rows = await trailRows("didit_webhook", "needs_attention");
    expect(rows.some((r) => (r.meta as { eventId?: string })?.eventId === "evt_c24")).toBe(true);
  });

  it("case 25 — a THIRD environment value is refused everywhere, including outside production", async () => {
    const host = await seedPending("dw_c25");

    const res = await post(
      envelope({ eventId: "evt_c25", vendorData: host, environment: "staging" }),
    );
    expect(res.status).toBe(200);
    expect(
      await row(host).then((r) => r?.status),
      "an unrecognised environment must fail closed rather than default to permission",
    ).toBe("pending");
  });

  it("case 26 — a delivery with no event_id is refused: an unidentifiable delivery is not applied", async () => {
    const host = await seedPending("dw_c26");

    const res = await post(envelope({ eventId: "", vendorData: host }));
    expect(res.status).toBe(400);
    expect(await row(host).then((r) => r?.status)).toBe("pending");
  });

  it("case 27 — a validly-signed body that is not JSON is a 400, never a 500", async () => {
    const res = await post("not json at all", { headerTimestamp: Math.floor(Date.now() / 1000) });
    expect(res.status).toBe(400);
  });
});

describe("HVER-07 — the suite-wide property", () => {
  it("case 28 — NO response in this suite was a 500", () => {
    // Guard-the-guard: an empty list would satisfy the real assertion perfectly, which is the exact
    // vacuity this repository's design gates open with.
    expect(seenStatuses.length, "the status collector recorded nothing — it is not wired").toBeGreaterThan(
      25,
    );
    expect(
      seenStatuses.filter((s) => s >= 500),
      "an unverifiable delivery must be a clean refusal, never a crash a prober can trigger at will",
    ).toEqual([]);
    expect(new Set(seenStatuses.map((s) => (s >= 400 ? 400 : 200)))).toEqual(new Set([200, 400]));
  });
});
