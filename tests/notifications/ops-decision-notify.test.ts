// OPS-05 / D-245 — the host is actually TOLD, on both channels, from one payload.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE MEASURES, AND WHY EACH PROPERTY NEEDS ITS OWN CASE
// ════════════════════════════════════════════════════════════════════════════════════════════════
// OPS-05 says approve and reject carry "a reason the host is actually told". D-245 settles what
// "told" means: a status a host has to go and LOOK FOR is not being told, and the thing being
// communicated blocks their income. 18-05 shipped the WRITE half — the sentence lands in a durable
// column — and `tests/ops/reject-reason.test.ts` proves that. This file proves the DELIVERY half.
//
//   cases 1-5   — ONE `notification` row per decision, READ BACK OUT OF THE TABLE, with the right
//                 recipient and the right kind. Read back rather than trusted from the action's
//                 return value: the action returns `{ ok: true }` for the DECISION, and it would
//                 return exactly that with the emission deleted.
//   case 6      — the operator's sentence appears in the body VERBATIM and EXACTLY ONCE, and NOT in
//                 the heading. Both channels, from the same row.
//   case 7      — one invocation feeds both channels (D-91). A kind that reached the panel but not
//                 the inbox — or the reverse — would be the drift the single fan-out exists to stop.
//   case 8      — THE BANNED LANGUAGE (D-243 / backlog 999.6). No appeal, no reply promise, no
//                 timeline, no address. Asserted over every rendered surface of all six kinds, and
//                 over the two copy modules' STRING LITERALS (not their prose — see case 9).
//   case 9      — the literal scan is structural, so the paragraphs in `notifications.ts` that
//                 FORBID these phrases cannot be what makes the gate red. A whole-file substring
//                 check is falsely RED on a documented file, every time.
//   case 10     — the suspension specifically: told, with the reason, and no way out promised.
//   case 11     — a crafted operator note containing markup is stored as typed and rendered as TEXT
//                 on both channels.
//   case 12     — the ops CANCELLATION pair (ENF-03), including the explicit no-fee sentence D-235
//                 would otherwise leave invisible.
//
// ⚠ ASSERTED ON THE PLAIN-TEXT TWIN, NOT THE HTML. `renderEmail` escapes the five HTML-significant
// characters on the way into the HTML part, so an apostrophe in ordinary copy ("You're", "can't")
// arrives as `&#39;` and a raw-string assertion over `email.html` goes red for a RENDERING detail.
// The text part is projected from the SAME `EmailContent` with the raw strings, which makes it the
// honest place to assert a sentence — and, for an ABSENCE, the only place a guard can still fail.
// `tests/notifications/notify.test.ts` states this argument at its own `copy()` helper.

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import ts from "typescript";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockResend } from "../helpers/mocks";
import { hostVerification, listing, notification, user } from "@/lib/db/schema";
import type { NotificationPayload } from "@/lib/db/schema";
import type { NotifyEvent } from "@/lib/notifications";
import type { RateLimitResult } from "@/lib/rate-limit";
import { HOST_REJECT_REASONS, LISTING_REJECT_REASONS, OTHER_REASON } from "@/lib/validation/ops";

const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

/** The `fitout/notify` envelope, exactly as `emitNotify` hands it to the Inngest client. */
type NotifyEnvelope = { name: string; data: NotifyEvent };

const emitted: NotifyEnvelope[] = [];

/**
 * The Inngest client, stubbed at the MODULE the actions' graph resolves — the cancellation.test.ts
 * idiom. A `vi.spyOn` on an import held by this file would patch the pre-`resetModules` instance and
 * silently miss, and `emitNotify` swallows its own errors by design, so the miss would be
 * indistinguishable from a pass.
 */
vi.mock("@/inngest/client", () => ({
  inngest: {
    send: vi.fn(async (envelope: NotifyEnvelope) => {
      emitted.push(envelope);
      return { ids: [envelope.name] };
    }),
    createFunction: vi.fn(() => ({})),
  },
}));

const NOT_FOUND = "NEXT_NOT_FOUND";
const PASSWORD = "averylongpassword";
const STAFF_EMAIL = "odn_staff@example.com";

/**
 * Always-allow. This file measures the NOTIFICATION, not the budget — the key and the budget are
 * pinned by tests/ops/ops-audit.test.ts, and a real limiter would start refusing part-way through the
 * privileged calls below and turn later cases into measurements of the limiter.
 */
const fakeRateLimit = (): RateLimitResult => ({ ok: true });

let testDb: TestDb;
let testAuth: TestAuth;
let staffId: string;

type OpsActions = typeof import("@/app/actions/ops-review");
let approveHost: OpsActions["approveHost"];
let rejectHost: OpsActions["rejectHost"];
let suspendHost: OpsActions["suspendHost"];
let approveListing: OpsActions["approveListing"];
let rejectListing: OpsActions["rejectListing"];

type NotifyFns = typeof import("@/inngest/functions/notify");
let sendForType: NotifyFns["sendForType"];
let insertNotification: (typeof import("@/lib/notifications"))["insertNotification"];
let describeNotification: (typeof import("@/components/notifications/notification-item"))["describeNotification"];

const LISTING_REASON = LISTING_REJECT_REASONS[0];
const HOST_REASON = HOST_REJECT_REASONS[0];

let seq = 0;
const nextId = (prefix: string) => `${prefix}_${seq++}`;

async function seedHost(status: "pending" | "approved" = "pending"): Promise<string> {
  const id = nextId("odn_host");
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

async function seedListing(hostId: string, title = "Sunrise Court — Bay 2"): Promise<string> {
  const id = nextId("odn_listing");
  await testDb.db.insert(listing).values({
    id,
    hostId,
    title,
    status: "published",
    reviewState: "pending",
  });
  return id;
}

/** THE DURABLE ROW, read straight out of the table — never the action's return value. */
async function rowsFor(recipientId: string) {
  return testDb.db
    .select({
      id: notification.id,
      type: notification.type,
      bookingId: notification.bookingId,
      payload: notification.payload,
    })
    .from(notification)
    .where(eq(notification.recipientId, recipientId));
}

/**
 * Drive the notify handler's TWO steps against the emission the action produced — in the order the
 * Inngest function runs them. This is what makes "both channels from one payload" a measurement:
 * there is exactly one `NotifyEvent` and both the row and the email are derived from it.
 */
async function deliver(envelope: NotifyEnvelope): Promise<void> {
  await insertNotification(testDb.db, envelope.data);
  await sendForType(envelope.data);
}

/** The one emission for a recipient. Fails loudly on zero or on more than one. */
function soleEmission(recipientId: string): NotifyEnvelope {
  const forRecipient = emitted.filter((e) => e.data.recipientId === recipientId);
  expect(forRecipient).toHaveLength(1);
  return forRecipient[0];
}

/**
 * The COPY a recipient reads, as one searchable string. See the header for why this is the plain-text
 * twin. Throws rather than returning "" so a send that stopped carrying a text part fails loudly here
 * instead of making every absence assertion below vacuously true.
 */
function emailCopy(to: string): { subject: string; body: string } {
  const sent = mockResend.sent().filter((e) => e.to === to);
  expect(sent).toHaveLength(1);
  const text = sent[0].text;
  if (!text) throw new Error("captured email has no plain-text part — the twin IS the copy under test");
  return { subject: sent[0].subject, body: text };
}

/** Count non-overlapping occurrences of a literal. Used for the EXACTLY-ONCE verbatim assertion. */
function occurrences(haystack: string, needle: string): number {
  if (needle.length === 0) throw new Error("occurrences() needs a non-empty needle");
  let count = 0;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) return count;
    count += 1;
    from = at + needle.length;
  }
}

/**
 * D-243 / backlog 999.6 and D-250, as patterns.
 *
 * `appeal` catches "appeal", "appeals", "appealing". The address pattern is the one
 * `tests/design/site-contacts.test.ts` uses, so "no address-shaped literal" means the same thing on
 * this surface as it does on every other one.
 */
const BANNED = [
  { label: "an appeal route (999.6 / D-243)", re: /appeal/i },
  { label: "a promise of contact", re: /we'?ll be in touch|get back to you|hear from us/i },
  { label: "an invitation to reply", re: /repl(y|ies) to th|write back|respond to this (message|email)/i },
  { label: "a timeline", re: /within \d+ (hour|day|week|business day)/i },
  { label: "an address-shaped literal (D-250)", re: /[\w.+-]+@[\w-]+\.[\w.]+/ },
  { label: "a mailto: (D-250)", re: /mailto:/i },
  { label: "a support affordance (D-250)", re: /\bcontact us\b|\bsupport team\b/i },
] as const;

function expectNoBannedLanguage(where: string, text: string): void {
  for (const { label, re } of BANNED) {
    expect(re.test(text), `${where} promises ${label}: ${JSON.stringify(text)}`).toBe(false);
  }
}

/**
 * The one literal in the scanned modules that is address-shaped and is NOT a support affordance —
 * declared as DATA WITH A REASON rather than waved through by loosening the pattern.
 *
 * This is `tests/design/site-contacts.test.ts`'s own `EXCLUDED_ADDRESSES` shape (itself the
 * `EXCLUDED_PAIRS` idiom from `src/lib/design/contrast-pairs.ts`), and it carries that gate's reason
 * verbatim in substance: a row without a reason is not a row, and a blanket exemption for `email.ts`
 * would wave through the next address too — which is the one this gate exists to catch.
 */
const DECLARED_NON_SUPPORT_ADDRESSES: Readonly<Record<string, string>> = {
  "FitOut <onboarding@resend.dev>":
    "Resend's SANDBOX SENDER in the `EMAIL_FROM` fallback — the From: header on transactional mail, " +
    "never published to a host as somewhere to write. Declared identically in " +
    "tests/design/site-contacts.test.ts's EXCLUDED_ADDRESSES, and for the same reason: replies to it " +
    "go nowhere, so surfacing it as a support address would be exactly the fabrication D-250 forbids.",
};

/** Every rendered string of a payload — both channels — as one blob for an ABSENCE assertion. */
function bothChannels(payload: NotificationPayload, email: { subject: string; body: string }): string {
  const described = describeNotification(payload);
  return [described.title, described.body, email.subject, email.body].join("\n");
}

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);

  await signUp(testAuth, {
    email: STAFF_EMAIL,
    password: PASSWORD,
    name: "Notify Staff",
    firstName: "Nia",
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
  // function throws `Invariant: static generation store missing` and all ten cases in this file fail
  // on the CACHE rather than on the notification row they are measuring. The shipped idiom
  // (tests/payments/ops-cancel.test.ts:331) is a no-op stub.
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.resetModules();

  ({ approveHost, rejectHost, suspendHost, approveListing, rejectListing } = await import(
    "@/app/actions/ops-review"
  ));
  ({ sendForType } = await import("@/inngest/functions/notify"));
  ({ insertNotification } = await import("@/lib/notifications"));
  ({ describeNotification } = await import("@/components/notifications/notification-item"));
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

describe("OPS-05 / D-245 — every decision produces ONE durable row for the host", () => {
  it("case 1 — a listing APPROVAL is told, and the row names the listing", async () => {
    const host = await seedHost("approved");
    const target = await seedListing(host, "Northside Pickleball — Court 3");

    expect(await approveListing({ listingId: target })).toEqual({ ok: true });
    await deliver(soleEmission(host));

    const rows = await rowsFor(host);
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("listing_review_approved");
    // A host's standing is not booking-scoped, so this column stays null on every ops-decision row.
    expect(rows[0].bookingId).toBeNull();
    const payload = rows[0].payload;
    expect(payload.type).toBe("listing_review_approved");
    if (payload.type !== "listing_review_approved") return;
    expect(payload.heading).toBe("Northside Pickleball — Court 3 is live");
    expect(payload.lead).toContain("can now be booked");
  });

  it("case 2 — a listing REJECTION is told, and carries the operator's stored sentence", async () => {
    const host = await seedHost("approved");
    const target = await seedListing(host);
    const note = "The third photo is a stock image of a different gym.";

    expect(await rejectListing({ listingId: target, reason: LISTING_REASON, note })).toEqual({
      ok: true,
    });
    await deliver(soleEmission(host));

    const rows = await rowsFor(host);
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("listing_review_rejected");
    const payload = rows[0].payload;
    if (payload.type !== "listing_review_rejected") throw new Error("wrong kind");
    // The SAME string `listing_review.reason` holds — `composeReason`'s output, not a re-composition.
    expect(payload.reasonText).toBe(`${LISTING_REASON} ${note}`);
  });

  it("case 3 — a host APPROVAL is told, and names no document and no inspection", async () => {
    const host = await seedHost("pending");

    expect(await approveHost({ userId: host })).toEqual({ ok: true });
    await deliver(soleEmission(host));

    const rows = await rowsFor(host);
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("host_verification_approved");

    // HVER-02 / Success Criterion 6: no document exists and nobody visited anything, so the copy may
    // not imply either. This is the phase-wide anti-pattern applied to the one message most tempted
    // to overclaim.
    const email = emailCopy(`${host}@fitout.test`);
    const blob = bothChannels(rows[0].payload, email).toLowerCase();
    for (const overclaim of ["id ", "passport", "licence", "license", "document", "visited", "inspected"]) {
      expect(blob.includes(overclaim), `host-approval copy claims "${overclaim}"`).toBe(false);
    }
  });

  it("case 4 — a host REJECTION is told, with the reason", async () => {
    const host = await seedHost("pending");
    const note = "The business name on the account doesn't match the one on the listing.";

    expect(await rejectHost({ userId: host, reason: HOST_REASON, note })).toEqual({ ok: true });
    await deliver(soleEmission(host));

    const rows = await rowsFor(host);
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("host_verification_rejected");
    const payload = rows[0].payload;
    if (payload.type !== "host_verification_rejected") throw new Error("wrong kind");
    expect(payload.reasonText).toBe(`${HOST_REASON} ${note}`);
  });

  it("case 5 — a SUSPENSION is told (D-243), with the reason", async () => {
    const host = await seedHost("approved");
    const note = "Several bookers reported being asked to pay outside FitOut.";

    expect(
      await suspendHost({ userId: host, reason: HOST_REJECT_REASONS[2], note }),
    ).toEqual({ ok: true });
    await deliver(soleEmission(host));

    const rows = await rowsFor(host);
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("host_suspended");
    const payload = rows[0].payload;
    if (payload.type !== "host_suspended") throw new Error("wrong kind");
    expect(payload.reasonText).toBe(`${HOST_REJECT_REASONS[2]} ${note}`);
    // BOTH consequences are stated. A host told only "can't be booked" discovers the payout freeze as
    // an unexplained missing payment, which is the worse way to learn it.
    expect(payload.tail).toContain("can't be booked");
    expect(payload.tail).toContain("payouts are on hold");
  });
});

describe("OPS-05 — the operator's sentence survives VERBATIM, once, in the body", () => {
  it("case 6 — verbatim and EXACTLY ONCE in the body, and never in the heading", async () => {
    const host = await seedHost("approved");
    const target = await seedListing(host);
    // Deliberately distinctive, so an occurrence count is meaningful and a paraphrase is obvious.
    const note = "Photo 3 shows a different venue entirely — the awning says Greenfield Fitness.";
    const stored = `${LISTING_REASON} ${note}`;

    expect(await rejectListing({ listingId: target, reason: LISTING_REASON, note })).toEqual({
      ok: true,
    });
    await deliver(soleEmission(host));

    const [row] = await rowsFor(host);
    const payload = row.payload;
    if (payload.type !== "listing_review_rejected") throw new Error("wrong kind");

    // (a) EXACT MATCH on the stored sentence — not `toContain`, which a paraphrase around it survives.
    expect(payload.reasonText).toBe(stored);

    // (b) ONCE in the in-app body, and the body really is the joined three parts.
    const described = describeNotification(payload);
    expect(occurrences(described.body, stored)).toBe(1);
    expect(described.body).toBe(`${payload.lead} ${stored} ${payload.tail}`);

    // (c) ONCE in the email body — the same string, on the other channel.
    const email = emailCopy(`${host}@fitout.test`);
    expect(occurrences(email.body, stored)).toBe(1);

    // (d) NEVER summarised into the heading or the subject line. The heading names the LISTING; the
    //     reason is a thing you read, not a thing you scan an inbox by.
    expect(described.title).not.toContain(note);
    expect(email.subject).not.toContain(note);
    expect(email.subject).toBe(payload.heading);
  });

  it("case 7 — the row and the email come from ONE invocation, so a kind cannot land on one channel", async () => {
    const host = await seedHost("pending");
    expect(await approveHost({ userId: host })).toEqual({ ok: true });

    const envelope = soleEmission(host);
    // ONE event. Both steps read it; nothing else is passed to either.
    await insertNotification(testDb.db, envelope.data);
    const sent = await sendForType(envelope.data);
    expect(sent).toEqual({ sent: true });

    const rows = await rowsFor(host);
    expect(rows).toHaveLength(1);
    const email = emailCopy(`${host}@fitout.test`);

    // The two channels render the SAME payload. Not merely "both exist" — the heading the row stores
    // is byte-identical to the subject the inbox received, which is the property that fails the moment
    // a second copy source appears on either side.
    const payload = rows[0].payload;
    if (payload.type !== "host_verification_approved") throw new Error("wrong kind");
    expect(email.subject).toBe(payload.heading);
    expect(email.body).toContain(payload.lead);
    expect(describeNotification(payload).body).toBe(payload.lead);
    // And the column and the jsonb discriminant agree — the condition notifyEventSchema refines.
    expect(rows[0].type).toBe(payload.type);
  });
});

describe("D-243 / D-250 — nothing promises a route that does not exist", () => {
  it("case 8 — no banned language on ANY surface of ANY of the six kinds", async () => {
    // One host per decision so each row set is unambiguous; every rendered string of every kind then
    // goes through the same pass.
    const cases: Array<{ recipient: string; label: string }> = [];

    const h1 = await seedHost("approved");
    const l1 = await seedListing(h1);
    await approveListing({ listingId: l1 });
    cases.push({ recipient: h1, label: "listing approved" });

    const h2 = await seedHost("approved");
    const l2 = await seedListing(h2);
    await rejectListing({ listingId: l2, reason: LISTING_REASON });
    cases.push({ recipient: h2, label: "listing rejected" });

    const h3 = await seedHost("pending");
    await approveHost({ userId: h3 });
    cases.push({ recipient: h3, label: "host approved" });

    const h4 = await seedHost("pending");
    await rejectHost({ userId: h4, reason: HOST_REASON });
    cases.push({ recipient: h4, label: "host rejected" });

    const h5 = await seedHost("approved");
    await suspendHost({ userId: h5, reason: HOST_REASON });
    cases.push({ recipient: h5, label: "host suspended" });

    // GUARD-THE-GUARD: five decisions really were made, or every absence below is vacuous.
    expect(cases).toHaveLength(5);

    for (const { recipient, label } of cases) {
      await deliver(soleEmission(recipient));
      const rows = await rowsFor(recipient);
      expect(rows, `${label} produced no durable row`).toHaveLength(1);
      const email = emailCopy(`${recipient}@fitout.test`);
      const blob = bothChannels(rows[0].payload, email);
      // POSITIVE CONTROL first: the blob is real copy, not an empty string that trivially passes.
      expect(blob.length, `${label} rendered nothing`).toBeGreaterThan(60);
      expectNoBannedLanguage(label, blob);
    }
  });

  it("case 9 — the copy modules' STRING LITERALS are clean, asserted structurally not textually", () => {
    // ⚠ A WHOLE-FILE SUBSTRING CHECK IS FALSELY RED HERE, EVERY TIME. `src/lib/notifications.ts`
    // carries the paragraph that FORBIDS these phrases, so its prose necessarily spells them — the
    // failure `scripts/verify-workflows.mjs:24-32` measured and `tests/helpers/source-text.ts` was
    // built to answer. Comment-stripping would work, but the AST is stricter and needs no regex: it
    // collects STRING LITERALS ONLY, so a comment produces no node at all.
    const files = ["src/lib/notifications.ts", "src/lib/email.ts", "src/lib/notification-copy.ts"];
    const declared = new Set(Object.keys(DECLARED_NON_SUPPORT_ADDRESSES));
    const firedExclusions = new Set<string>();
    let literalCount = 0;

    for (const file of files) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
      const visit = (node: ts.Node): void => {
        if (
          ts.isStringLiteral(node) ||
          ts.isNoSubstitutionTemplateLiteral(node) ||
          ts.isTemplateHead(node) ||
          ts.isTemplateMiddle(node) ||
          ts.isTemplateTail(node)
        ) {
          literalCount += 1;
          if (declared.has(node.text)) {
            firedExclusions.add(node.text);
          } else {
            expectNoBannedLanguage(`${file} literal`, node.text);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);
    }

    // GUARD-THE-GUARD: the walk actually found literals. A parse that returned nothing — a renamed
    // file, a changed extension — would otherwise make this pass against a tree it never read.
    expect(literalCount).toBeGreaterThan(40);

    // AND EVERY DECLARED EXCLUSION STILL FIRES. A row that stopped matching is a stale exemption
    // quietly widening the gate; site-contacts.test.ts makes the same demand of its own list.
    for (const [literal, why] of Object.entries(DECLARED_NON_SUPPORT_ADDRESSES)) {
      expect(why.length, `${literal} has no reason`).toBeGreaterThan(40);
      expect(firedExclusions.has(literal), `${literal} no longer appears — remove the row`).toBe(true);
    }
  });

  it("case 10 — a suspended host is told, with the reason, and NO way out is promised", async () => {
    const host = await seedHost("approved");
    const note = "Two bookers were charged off-platform after booking.";
    expect(await suspendHost({ userId: host, reason: HOST_REJECT_REASONS[2], note })).toEqual({
      ok: true,
    });
    await deliver(soleEmission(host));

    const [row] = await rowsFor(host);
    const payload = row.payload;
    if (payload.type !== "host_suspended") throw new Error("wrong kind");
    const email = emailCopy(`${host}@fitout.test`);
    const described = describeNotification(payload);

    // TOLD, WITH THE REASON — both channels, verbatim, once.
    const stored = `${HOST_REJECT_REASONS[2]} ${note}`;
    expect(occurrences(described.body, stored)).toBe(1);
    expect(occurrences(email.body, stored)).toBe(1);

    // AND THE BODY OPENS WITH IT. There is no `lead` on this kind: the reason is the first thing a
    // suspended host needs, so nothing is put in front of it.
    expect(payload.lead).toBeUndefined();
    expect(described.body.startsWith(stored)).toBe(true);

    // NO WAY OUT. Host appeals are backlog 999.6 and OUT (D-243).
    expectNoBannedLanguage("suspension", bothChannels(payload, email));
  });
});

describe("T-18-0901 — the operator's free text is TEXT on both channels", () => {
  it("case 11 — a crafted note with markup is stored as typed and never rendered as HTML", async () => {
    const host = await seedHost("approved");
    const target = await seedListing(host);
    const note = `<script>alert(1)</script> & "quotes" and classes for under <10 people`;

    expect(await rejectListing({ listingId: target, reason: OTHER_REASON, note })).toEqual({
      ok: true,
    });
    await deliver(soleEmission(host));

    const [row] = await rowsFor(host);
    const payload = row.payload;
    if (payload.type !== "listing_review_rejected") throw new Error("wrong kind");

    // STORED BYTE-IDENTICAL. A store-time escape pass would corrupt the last clause of a perfectly
    // ordinary sentence ("under <10 people") while buying nothing — the render is where escaping
    // belongs, and both renders already do it.
    expect(payload.reasonText).toBe(`${OTHER_REASON} ${note}`);

    // IN-APP: the describe helper returns a plain STRING which React renders as a text child. There is
    // no raw-HTML sink anywhere in this directory (T-07-84), asserted structurally by
    // tests/ops/reject-reason.test.ts case 10 over the whole of `src/`.
    expect(describeNotification(payload).body).toContain(note);

    // EMAIL: the HTML part carries the ESCAPED form and NOT the live tag, while the plain-text twin
    // carries the raw sentence. Both halves are asserted — a check on only one of them passes against
    // a send that dropped the body entirely.
    const sent = mockResend.sent().filter((e) => e.to === `${host}@fitout.test`);
    expect(sent).toHaveLength(1);
    expect(sent[0].html).not.toContain("<script>alert(1)</script>");
    expect(sent[0].html).toContain("&lt;script&gt;");
    expect(sent[0].text).toContain(note);
  });
});

describe("ENF-03 — the ops cancellation tells both parties what actually happened", () => {
  it("case 12 — the booker's copy and the host's NO-FEE copy come from one type, two sides", async () => {
    // Driven through the payload factory rather than the whole cancellation action: the ACTION's
    // emission (and its refusal to send the host-cancel type) is measured end-to-end by
    // tests/payments/ops-cancel.test.ts, which owns that path. What is owned HERE is the COPY.
    const { opsCancelPayload } = await import("@/lib/notifications");

    const booker = opsCancelPayload({
      side: "booker",
      listingTitle: "Sunrise Court — Bay 2",
      whenLabel: "Sat 12 Sep, 6:00–7:00 PM (Manila time)",
      refundLabel: "₱1,050.00",
    });
    const host = opsCancelPayload({
      side: "host",
      listingTitle: "Sunrise Court — Bay 2",
      whenLabel: "Sat 12 Sep, 6:00–7:00 PM (Manila time)",
      refundLabel: "₱1,050.00",
    });

    if (booker.type !== "booking_cancelled_by_ops" || host.type !== "booking_cancelled_by_ops") {
      throw new Error("wrong kind");
    }

    // THE BOOKER IS NOT TOLD THEIR HOST CANCELLED. That sentence is the reason this type exists: it
    // is the one message a defrauded booker would repeat to anyone who asked what FitOut did.
    expect(booker.lead).toContain("FitOut cancelled your booking");
    expect(booker.lead.toLowerCase()).not.toContain("the host cancelled");
    expect(booker.lead).toContain("₱1,050.00");

    // THE HOST IS TOLD, EXPLICITLY, THAT NO FEE IS CHARGED (D-235 made visible). Without this sentence
    // the suppression is invisible and a host reasonably assumes the usual fee applied to a
    // cancellation they did not make.
    expect(host.lead).toContain("not charged a cancellation fee");
    expect(host.side).toBe("host");
    expect(booker.side).toBe("booker");
    // Two audiences, two documents — never the same body addressed at both.
    expect(host.lead).not.toBe(booker.lead);

    // CR-01 — a refund of nothing is not announced as a refund.
    const zero = opsCancelPayload({
      side: "booker",
      listingTitle: "Sunrise Court — Bay 2",
      whenLabel: "Sat 12 Sep, 6:00–7:00 PM (Manila time)",
      refundLabel: null,
    });
    if (zero.type !== "booking_cancelled_by_ops") throw new Error("wrong kind");
    expect(zero.lead).not.toContain("getting");
    expect(zero.lead).toContain("FitOut cancelled your booking");

    for (const payload of [booker, host, zero]) {
      expectNoBannedLanguage("ops cancellation", `${payload.heading}\n${payload.lead}`);
    }
  });
});
