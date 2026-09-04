// OPS-05 / T-18-0503 / T-18-0504 — the rejection reason: this phase's highest-risk input field.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT MAKES IT THE HIGHEST-RISK FIELD, STATED BEFORE ANY CODE
// ════════════════════════════════════════════════════════════════════════════════════════════════
// It is the only value in Phase 18 that is (a) typed by a human, (b) written to a DURABLE column,
// (c) READ BY A DIFFERENT HUMAN — the host whose income it blocks — and (d) sent out over email.
// Every other ops input is an id or an enum. So it gets four properties, and this file measures all
// four rather than trusting the schema to have them:
//
//   cases 1-3   — WHAT IS STORED IS THE SENTENCE THE HOST READS, byte for byte, on both the host
//                 side and the listing side, and the note is appended to it rather than filed away
//                 somewhere the host cannot see.
//   cases 4-7   — THE BOUNDS ARE SERVER-SIDE. A reason outside the taxonomy, a note past 280, and
//                 "Something else" with no note (empty, and whitespace-only) are each a CALM DENIAL
//                 — never a raised error, and never a partial write.
//   case 8      — D-72: the operator's FREE TEXT NEVER ENTERS `audit.meta`. The taxonomy sentence
//                 may; the note may not, because it can contain anything they typed about a person
//                 and `meta` is a durable jsonb column under an explicit no-PII rule.
//   cases 9-10  — T-18-0503: a reason containing markup is stored EXACTLY as typed and there is no
//                 HTML-interpreting sink anywhere in `src/` for it to reach.
//   case 11     — D-249: the reason stays READABLE to the host after the rejection, because that is
//                 the only thing that makes the resubmission edit purposeful.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THERE IS NO SANITISER, AND WHY THAT IS THE STRONGER POSITION
// ════════════════════════════════════════════════════════════════════════════════════════════════
// Nothing strips, escapes or rewrites the operator's sentence. Case 9 asserts a byte-identical
// round-trip precisely so a future "defensive" escape pass reddens here — because escaping at the
// STORE would corrupt an ordinary sentence ("classes for under <10 people", "Smith & Sons") while
// buying nothing: the escaping that matters happens at RENDER, and React escapes text nodes by
// construction. Case 10 pins the other half of that argument structurally — the ONE React escape
// hatch that would defeat it appears ZERO times in `src/`, counted over comment-stripped source so
// this file's own prose cannot be what keeps the count honest.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { stripComments } from "../helpers/source-text";
import { audit, hostVerification, listing, listingReview, user } from "@/lib/db/schema";
import type { RateLimitResult } from "@/lib/rate-limit";
import {
  HOST_REJECT_REASONS,
  LISTING_REJECT_REASONS,
  OTHER_REASON,
  REJECT_NOTE_MAX,
} from "@/lib/validation/ops";

const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

const NOT_FOUND = "NEXT_NOT_FOUND";
const PASSWORD = "averylongpassword";
const STAFF_EMAIL = "rr_staff@example.com";

// Always-allow. This file measures the REASON, not the budget — the key and the budget are pinned
// by tests/ops/ops-audit.test.ts case 12, and a real limiter would start refusing part-way through
// the ~15 privileged calls below and turn later cases into measurements of the limiter.
const fakeRateLimit = (): RateLimitResult => ({ ok: true });

let testDb: TestDb;
let testAuth: TestAuth;
let staffId: string;

type OpsActions = typeof import("@/app/actions/ops-review");
let rejectHost: OpsActions["rejectHost"];
let suspendHost: OpsActions["suspendHost"];
let rejectListing: OpsActions["rejectListing"];

/** "The photos don't show the space being listed." — a real sentence, not a code. */
const LISTING_REASON = LISTING_REJECT_REASONS[0];
const HOST_REASON = HOST_REJECT_REASONS[0];

let seq = 0;
const nextId = (prefix: string) => `${prefix}_${seq++}`;

async function seedHost(status: "pending" | "approved" = "pending"): Promise<string> {
  const id = nextId("rr_host");
  await testDb.db.insert(user).values({
    id,
    name: id,
    email: `${id}@fitout.test`,
    firstName: "Seed",
    emailVerified: true,
    canHost: true,
  });
  await testDb.db.insert(hostVerification).values({ userId: id, status, provider: "manual" });
  return id;
}

async function seedListing(hostId: string): Promise<string> {
  const id = nextId("rr_listing");
  await testDb.db.insert(listing).values({
    id,
    hostId,
    title: `Listing ${id}`,
    status: "published",
    reviewState: "pending",
  });
  return id;
}

/** WHAT THE HOST WILL READ — the durable column, read the way a host surface would read it. */
async function hostVisibleHostReason(userId: string): Promise<string | null> {
  const [row] = await testDb.db
    .select({ reason: hostVerification.reason, status: hostVerification.status })
    .from(hostVerification)
    .where(eq(hostVerification.userId, userId));
  return row?.reason ?? null;
}

async function hostVisibleListingReason(listingId: string): Promise<string | null> {
  const [row] = await testDb.db
    .select({ reason: listingReview.reason })
    .from(listingReview)
    .where(eq(listingReview.listingId, listingId));
  return row?.reason ?? null;
}

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);

  await signUp(testAuth, {
    email: STAFF_EMAIL,
    password: PASSWORD,
    name: "Reason Staff",
    firstName: "Rey",
    intent: "book",
  });
  const ids = await testDb.db.select({ id: user.id, email: user.email }).from(user);
  staffId = ids.find((r) => r.email === STAFF_EMAIL)!.id;
  await testDb.db.update(user).set({ role: "staff" }).where(eq(user.id, staffId));

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/navigation", () => ({
    notFound: () => {
      throw new Error(NOT_FOUND);
    },
  }));
  vi.doMock("@/lib/rate-limit", () => ({ rateLimit: fakeRateLimit }));
  // ⚠ ADDED WITH PLAN 18-12's `revalidatePath("/ops")`. The five actions now invalidate the console
  // route they feed; outside a Next request there is no cache store to invalidate, so the real
  // function throws and every case in this file would fail on the CACHE rather than on the audit
  // trail it is measuring. The shipped idiom (tests/payments/ops-cancel.test.ts:331) is a no-op stub.
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.resetModules();
  ({ rejectHost, suspendHost, rejectListing } = await import("@/app/actions/ops-review"));
}, 120_000);

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/navigation");
  vi.doUnmock("@/lib/rate-limit");
  vi.doUnmock("next/cache");
  await teardownTestDb(testDb);
});

beforeEach(async () => {
  const res = await testAuth.api.signInEmail({
    body: { email: STAFF_EMAIL, password: PASSWORD },
    asResponse: true,
  });
  const setCookie = res.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
});

describe("OPS-05 — what is STORED is the sentence the host reads", () => {
  it("case 1 — a listing rejection stores the chosen SENTENCE, not an id to join at read time", async () => {
    const host = await seedHost("approved");
    const target = await seedListing(host);

    const res = await rejectListing({ listingId: target, reason: LISTING_REASON });
    expect(res).toEqual({ ok: true });

    // The whole sentence, in the durable column, exactly as the taxonomy spells it. If this were an
    // id, a later re-wording would retroactively change what the host was told they were told.
    expect(await hostVisibleListingReason(target)).toBe(LISTING_REASON);
    expect(LISTING_REASON).toContain(" "); // it is prose, not a code — guard-the-guard
  });

  it("case 2 — a host rejection stores the sentence, and the NOTE is appended to it", async () => {
    const host = await seedHost("pending");
    const note = "The business name on the account doesn't match the one on the listing.";

    const res = await rejectHost({ userId: host, reason: HOST_REASON, note });
    expect(res).toEqual({ ok: true });

    const stored = await hostVisibleHostReason(host);
    // ONE readable string. The note is not filed in a second column the host surface would have to
    // remember to render — a rejection the host cannot read is not a decision, it is a disappearance.
    expect(stored).toBe(`${HOST_REASON} ${note}`);
    expect(stored).toContain(note);
  });

  it("case 3 — a suspension carries a reason too (D-243), on the same taxonomy", async () => {
    const host = await seedHost("approved");
    const res = await suspendHost({
      userId: host,
      reason: HOST_REJECT_REASONS[2],
      note: "Repeated reports from bookers.",
    });
    expect(res).toEqual({ ok: true });

    const stored = await hostVisibleHostReason(host);
    expect(stored).toBe(`${HOST_REJECT_REASONS[2]} Repeated reports from bookers.`);

    // ⚠ AND THE COPY PROMISES NOTHING IT CANNOT DELIVER. Appeals are backlog 999.6 and OUT (D-243),
    // and `SUPPORT_EMAIL` is null (D-250) — so no sentence in the taxonomy may offer a route back or
    // an address to write to. Asserted over the whole shipped taxonomy, not just this one member.
    for (const sentence of [...HOST_REJECT_REASONS, ...LISTING_REJECT_REASONS]) {
      expect(sentence.toLowerCase()).not.toContain("appeal");
      expect(sentence.toLowerCase()).not.toContain("contact us");
      expect(sentence).not.toContain("@");
    }
  });
});

describe("OPS-05 — the bounds are re-validated SERVER-SIDE, and every refusal is calm", () => {
  it("case 4 — a reason OUTSIDE the taxonomy is a calm denial and writes nothing", async () => {
    const host = await seedHost("approved");
    const target = await seedListing(host);

    // Server-action argument types are not enforced at runtime; this is exactly the crafted value
    // cancel-booking.ts:1101-1105 says would otherwise land verbatim in a durable column.
    const res = await rejectListing({
      listingId: target,
      reason: "Your face doesn't fit." as (typeof LISTING_REJECT_REASONS)[number],
    });

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(typeof res.error).toBe("string"); // a calm typed refusal, never a raised error

    // NOTHING was written: not the review state, not a history row.
    const [row] = await testDb.db
      .select({ state: listing.reviewState })
      .from(listing)
      .where(eq(listing.id, target));
    expect(row.state).toBe("pending");
    expect(await hostVisibleListingReason(target)).toBeNull();
  });

  it("case 5 — a note longer than 280 characters is a calm denial", async () => {
    const host = await seedHost("pending");
    const tooLong = "x".repeat(REJECT_NOTE_MAX + 1);

    const res = await rejectHost({ userId: host, reason: HOST_REASON, note: tooLong });
    expect(res.ok).toBe(false);
    expect(await hostVisibleHostReason(host)).toBeNull();

    // The boundary is EXACT, not approximate — a positive control at exactly 280.
    const host2 = await seedHost("pending");
    const atLimit = "y".repeat(REJECT_NOTE_MAX);
    expect(await rejectHost({ userId: host2, reason: HOST_REASON, note: atLimit })).toEqual({
      ok: true,
    });
    expect(await hostVisibleHostReason(host2)).toBe(`${HOST_REASON} ${atLimit}`);
  });

  it("case 6 — \"Something else\" with NO note is a calm denial", async () => {
    const host = await seedHost("approved");
    const target = await seedListing(host);

    const missing = await rejectListing({ listingId: target, reason: OTHER_REASON });
    expect(missing.ok).toBe(false);
    expect(await hostVisibleListingReason(target)).toBeNull();

    const empty = await rejectListing({ listingId: target, reason: OTHER_REASON, note: "" });
    expect(empty.ok).toBe(false);

    // Whitespace-only too — otherwise the one member of the taxonomy that says nothing on its own
    // ships a rejection whose entire explanation is a space character.
    const blank = await rejectListing({ listingId: target, reason: OTHER_REASON, note: "   \n\t " });
    expect(blank.ok).toBe(false);
    expect(await hostVisibleListingReason(target)).toBeNull();
  });

  it("case 7 — \"Something else\" WITH a note is accepted (the control for case 6)", async () => {
    const host = await seedHost("approved");
    const target = await seedListing(host);
    const note = "The listing duplicates another one already on FitOut.";

    expect(await rejectListing({ listingId: target, reason: OTHER_REASON, note })).toEqual({
      ok: true,
    });
    expect(await hostVisibleListingReason(target)).toBe(`${OTHER_REASON} ${note}`);
  });
});

describe("D-72 / T-18-0504 — the operator's free text never enters the durable trail's meta", () => {
  it("case 8 — meta carries the taxonomy sentence and a flag, and NEVER the note", async () => {
    const host = await seedHost("pending");
    // A note that is unmistakable if it leaks, and shaped like the PII this rule exists for.
    const note = "Spoke to Maria Santos on 0917 555 0110; the address is her home.";

    expect(await rejectHost({ userId: host, reason: HOST_REASON, note })).toEqual({ ok: true });

    const rows = await testDb.db
      .select()
      .from(audit)
      .where(and(eq(audit.action, "ops_reject_host"), eq(audit.outcome, "ok")));
    const row = rows.find((r) => (r.meta as { userId?: string })?.userId === host);
    expect(row).toBeDefined();
    expect(row!.actorId).toBe(staffId);

    // Serialise the WHOLE row, so the assertion cannot be defeated by the note landing in a field
    // the test forgot to look at (the tests/ops/grant-cli.test.ts case-3 idiom).
    const serialised = JSON.stringify(row);
    expect(serialised).not.toContain("Maria Santos");
    expect(serialised).not.toContain("0917 555 0110");
    expect(serialised).not.toContain(note);

    // What IS recorded: the enum-shaped sentence, and the FACT that a note exists — enough for an
    // operator to find the decision, with the text itself living in the domain column the host
    // reads it from.
    const meta = row!.meta as { reasonSentence?: string; hasNote?: boolean };
    expect(meta.reasonSentence).toBe(HOST_REASON);
    expect(meta.hasNote).toBe(true);

    // And the note IS still readable where it belongs — otherwise this case would pass against an
    // implementation that simply threw the operator's explanation away.
    expect(await hostVisibleHostReason(host)).toContain(note);
  });
});

describe("T-18-0503 — the stored reason is text, and there is no HTML sink for it to reach", () => {
  it("case 9 — a reason containing markup round-trips BYTE-IDENTICAL: nothing escapes or strips it", async () => {
    const host = await seedHost("approved");
    const target = await seedListing(host);
    const note = `<script>alert(1)</script> & "quotes" and classes for under <10 people`;

    expect(await rejectListing({ listingId: target, reason: OTHER_REASON, note })).toEqual({
      ok: true,
    });

    // EXACTLY what was typed. A store-time escape pass would corrupt the last clause of a perfectly
    // ordinary sentence while buying nothing — React escapes text nodes by construction, and case
    // 10 proves there is no escape hatch in the codebase for this value to reach.
    expect(await hostVisibleListingReason(target)).toBe(`${OTHER_REASON} ${note}`);
  });

  it("case 10 — the ONE React escape hatch appears ZERO times in src/", async () => {
    // Counted over COMMENT-STRIPPED source, because several files in this repo (this one included)
    // discuss the hatch by name, and a raw-text count would be kept honest by prose rather than by
    // the absence of the sink. Same rule as tests/design/strip-comments.test.ts guards.
    const files = listSourceFiles("src");
    const offenders = files.filter((f) =>
      stripComments(readFileSync(f, "utf8")).includes("dangerouslySetInnerHTML"),
    );
    expect(offenders).toEqual([]);
    // Guard-the-guard: the sweep actually read files, so an empty result means "none", not "none scanned".
    expect(files.length).toBeGreaterThan(100);
  });
});

describe("D-249 — the reason stays readable until the host resubmits", () => {
  it("case 11 — after a rejection, the host's own surface can still read WHY", async () => {
    const host = await seedHost("approved");
    const target = await seedListing(host);
    const note = "Two of the photos are of a different court.";

    await rejectListing({ listingId: target, reason: LISTING_REASON, note });

    // The listing is out of sale…
    const [row] = await testDb.db
      .select({ state: listing.reviewState })
      .from(listing)
      .where(eq(listing.id, target));
    expect(row.state).toBe("rejected");

    // …and the decided history row still carries the reason, with the decision attributed. Clearing
    // it on the flip would delete the only thing that makes the resubmission edit purposeful — the
    // host would be told to fix something without being told what.
    const [history] = await testDb.db
      .select()
      .from(listingReview)
      .where(eq(listingReview.listingId, target));
    expect(history.state).toBe("rejected");
    expect(history.reason).toBe(`${LISTING_REASON} ${note}`);
    expect(history.decidedByStaffId).toBe(staffId);
    expect(history.decidedAt).not.toBeNull();
  });
});

/** Every .ts/.tsx under a directory. Local to this file — one sweep, one consumer. */
function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listSourceFiles(full));
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) out.push(full);
  }
  return out;
}
