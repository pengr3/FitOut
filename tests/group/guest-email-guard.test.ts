// The D-117 opt-in email guard (T-08-16 — the spam cannon). The single most abusable surface in Phase 8.
//
// THE THREAT, stated plainly: an invite link is public, shareable and unauthenticated. If "RSVP" can be made
// to send mail to an arbitrary address, then a public URL plus a loop is a mail cannon firing from our
// domain at anyone's inbox — and the sender reputation that pays for it is the one every booking
// confirmation depends on. So the guard is deliberately narrow and STRUCTURAL rather than a policy comment:
//
//   1. The ONLY address ever emailed is the one submitted ON THIS REQUEST. No address is read back out of
//      the database to be mailed, and none is carried over from an earlier RSVP on the same link. Case (3)
//      is what proves this: an address already sitting in the `rsvp` table receives nothing when someone
//      ELSE answers.
//   2. A BLANK-email guest gets NO send of any kind, on any channel — case (1). Their on-screen
//      confirmation is the whole of it (D-117/G3), which is why the action returns `reachable: false`.
//   3. Repeats are RATE-LIMITED by the normalized address, so re-submitting cannot turn one link into a
//      mail bomb aimed at one inbox — case (4). This file therefore runs against the REAL limiter (the
//      module-level Map), not a stub: a stubbed limiter would make case (4) assert nothing at all.
//   4. An account attendee NEVER routes through the guest path — case (5). A guest has no `user.id`, and
//      the two channels are separate functions for exactly that reason (RESEARCH Pitfall 2).
//
// Every assertion is on the EVENTS the action emitted (`fitout/notify` vs `fitout/guest-email`, and their
// `to`/`recipientId`), because that is where the decision lives. The positive controls — the organizer IS
// told, a real guest-with-email IS emailed — are what stop a "send nothing, ever" implementation passing.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { user, listing, booking, bookingGroup, rsvp } from "@/lib/db/schema";
import { readDbNow } from "@/lib/booking/bookings-query";

const HOUR = 60 * 60 * 1000;
const PASSWORD = "averylongpassword";
const HOST_EMAIL = "geg_host@example.com";
const ORG_EMAIL = "geg_organizer@example.com";
const ATTENDEE_EMAIL = "geg_attendee@example.com";

const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

type SentEvent = { name: string; data: Record<string, unknown> };
const inngestSend = vi.fn(async (event: SentEvent) => {
  void event;
  return { ids: [] as string[] };
});
const sent = (): SentEvent[] => inngestSend.mock.calls.map((c) => c[0]);
const guestEmails = () => sent().filter((e) => e.name === "fitout/guest-email");
const notifies = (type?: string) =>
  sent().filter((e) => e.name === "fitout/notify" && (type == null || e.data.type === type));

let testDb: TestDb;
let testAuth: TestAuth;
type GroupActions = typeof import("@/app/actions/group");
let submitRsvp: GroupActions["submitRsvp"];

let hostId: string;
let organizerId: string;
let attendeeId: string;

/** Fixed, shape-valid Crockford-20 tokens — one group per case so budgets never bleed between them. */
const TOKEN_BLANK = "AAAAAAAAAAAAAAAAAAA1";
const TOKEN_WITH_EMAIL = "AAAAAAAAAAAAAAAAAAA2";
const TOKEN_BYSTANDER = "AAAAAAAAAAAAAAAAAAA3";
const TOKEN_REPEAT = "AAAAAAAAAAAAAAAAAAA4";
const TOKEN_ACCOUNT = "AAAAAAAAAAAAAAAAAAA5";
const TOKEN_DECLINE = "AAAAAAAAAAAAAAAAAAA6";
const TOKEN_NORMALIZE = "AAAAAAAAAAAAAAAAAAA7";

const GROUPS: Array<{ token: string; bookingId: string; groupId: string }> = [
  { token: TOKEN_BLANK, bookingId: "bk_geg_1", groupId: "grp_geg_1" },
  { token: TOKEN_WITH_EMAIL, bookingId: "bk_geg_2", groupId: "grp_geg_2" },
  { token: TOKEN_BYSTANDER, bookingId: "bk_geg_3", groupId: "grp_geg_3" },
  { token: TOKEN_REPEAT, bookingId: "bk_geg_4", groupId: "grp_geg_4" },
  { token: TOKEN_ACCOUNT, bookingId: "bk_geg_5", groupId: "grp_geg_5" },
  { token: TOKEN_DECLINE, bookingId: "bk_geg_6", groupId: "grp_geg_6" },
  { token: TOKEN_NORMALIZE, bookingId: "bk_geg_7", groupId: "grp_geg_7" },
];

async function login(email: string): Promise<void> {
  const res = await testAuth.api.signInEmail({
    body: { email, password: PASSWORD },
    asResponse: true,
  });
  const setCookie = res.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
}

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);

  await signUp(testAuth, {
    email: HOST_EMAIL,
    password: PASSWORD,
    name: "GEG Host",
    firstName: "GEGHost",
    intent: "host",
  });
  await signUp(testAuth, {
    email: ORG_EMAIL,
    password: PASSWORD,
    name: "Olive Organizer",
    firstName: "Olive",
    intent: "book",
  });
  await signUp(testAuth, {
    email: ATTENDEE_EMAIL,
    password: PASSWORD,
    name: "Ada Account",
    firstName: "Ada",
    intent: "book",
  });

  const ids = await testDb.db.select({ id: user.id, email: user.email }).from(user);
  hostId = ids.find((u) => u.email === HOST_EMAIL)!.id;
  organizerId = ids.find((u) => u.email === ORG_EMAIL)!.id;
  attendeeId = ids.find((u) => u.email === ATTENDEE_EMAIL)!.id;

  await testDb.db.insert(listing).values({
    id: "L_geg",
    hostId,
    title: "Guard Court",
    status: "published",
    bookingMode: "instant",
    unitCount: 1,
    maxOccupancy: 10,
    timezone: "Asia/Manila",
    city: "Makati",
    addressLine1: "1 Guard Street",
    hourlyRateCents: 100000,
    dayRateCents: 300000,
    cancellationPolicy: "standard",
  });

  const base = await readDbNow(testDb.db);
  for (const [i, g] of GROUPS.entries()) {
    const startsAt = new Date(base.getTime() + (12 + i * 3) * HOUR);
    await testDb.db.insert(booking).values({
      id: g.bookingId,
      listingId: "L_geg",
      unit: 1,
      bookerId: organizerId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + HOUR),
      status: "confirmed",
      bookingMode: "instant",
      cancellationPolicy: "standard",
      spacePriceCents: 100000,
      serviceFeeCents: 5000,
      quotedTotalCents: 105000,
      currency: "php",
    });
    await testDb.db.insert(bookingGroup).values({
      id: g.groupId,
      bookingId: g.bookingId,
      capacitySnapshot: 10,
      accessToken: g.token,
    });
  }

  // The BYSTANDER: an address already sitting in the table before anyone else answers. It must never be
  // emailed by someone else's RSVP — that is the whole of property (1).
  await testDb.db.insert(rsvp).values({
    id: "rsvp_geg_bystander",
    groupId: "grp_geg_3",
    guestName: "Bystander Bea",
    guestEmailNorm: "bystander@example.com",
    status: "yes",
  });

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/inngest/client", () => ({ inngest: { send: inngestSend } }));
  // NOTE: `@/lib/rate-limit` is DELIBERATELY NOT mocked here — case (4) is an assertion about the real
  // budget, and a stub would make it vacuous.
  vi.resetModules();
  ({ submitRsvp } = await import("@/app/actions/group"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  vi.doUnmock("@/inngest/client");
  await teardownTestDb(testDb);
});

beforeEach(() => {
  inngestSend.mockClear();
  sessionHeaders.cookie = "";
});

describe("D-117 — a blank-email guest is never emailed, on any channel", () => {
  it("produces ZERO guest emails and ZERO attendee notifications", async () => {
    const res = await submitRsvp(TOKEN_BLANK, { name: "Nameless Nadia", answer: "yes" });
    expect(res).toEqual({ ok: true, status: "yes", reachable: false });

    // The two counts that matter, asserted as counts (not "not.toHaveBeenCalled" on a shared mock).
    expect(guestEmails()).toHaveLength(0);
    expect(notifies("group_rsvp_confirmed")).toHaveLength(0);

    // POSITIVE CONTROL: the organizer IS told. Without this the case would pass against an action that
    // simply never emits anything.
    const received = notifies("group_rsvp_received");
    expect(received).toHaveLength(1);
    expect(received[0].data.recipientId).toBe(organizerId);
  });

  it("an empty-string email is the SAME path as no email at all", async () => {
    const res = await submitRsvp(TOKEN_BLANK, { name: "Blank Bob", email: "", answer: "yes" });
    expect(res).toEqual({ ok: true, status: "yes", reachable: false });
    expect(guestEmails()).toHaveLength(0);
  });
});

describe("D-117 — only an address that ACTIVELY submitted this RSVP is emailed", () => {
  it("emails exactly the submitted address, exactly once", async () => {
    const res = await submitRsvp(TOKEN_WITH_EMAIL, {
      name: "Gina Guest",
      email: "gina@example.com",
      answer: "yes",
    });
    expect(res).toEqual({ ok: true, status: "yes", reachable: true });

    const emails = guestEmails();
    expect(emails).toHaveLength(1);
    expect(emails[0].data.to).toBe("gina@example.com");
    expect(emails[0].data.kind).toBe("rsvp_confirmed");
    // The invite href is absolute (the 07-10 convention — a relative href is a dead link in a mail client).
    expect(String(emails[0].data.href)).toMatch(/^https?:\/\/.+\/invite\/[0-9A-HJKMNP-TV-Z]{20}$/);
    // A guest never gets a durable in-app row — they have no user.id to hang one on (Pitfall 2).
    expect(notifies("group_rsvp_confirmed")).toHaveLength(0);
  });

  it("never mails a BYSTANDER address already stored on the same group", async () => {
    // Someone else answers on a link where bystander@example.com already RSVP'd. If the action read
    // addresses out of the roster rather than off the request, this is where it would show.
    const res = await submitRsvp(TOKEN_BYSTANDER, {
      name: "Carl Caller",
      email: "carl@example.com",
      answer: "yes",
    });
    expect(res.ok).toBe(true);

    const recipients = guestEmails().map((e) => e.data.to);
    expect(recipients).toEqual(["carl@example.com"]);
    expect(recipients).not.toContain("bystander@example.com");
  });

  it("normalizes the address before sending, so casing cannot mint a second identity", async () => {
    const res = await submitRsvp(TOKEN_NORMALIZE, {
      name: "Mixed Case Mia",
      email: "  Mia@Example.COM ",
      answer: "yes",
    });
    expect(res.ok).toBe(true);
    expect(guestEmails().map((e) => e.data.to)).toEqual(["mia@example.com"]);
  });
});

describe("T-08-16 — repeats are rate-limited by the normalized address", () => {
  it("suppresses the send past the budget while the RSVP itself still succeeds", async () => {
    // Four submissions, same address. The RSVP row de-dups to ONE row (the D-117 partial unique index) and
    // every call succeeds — being rate-limited on the EMAIL must never fail the answer itself.
    for (let i = 0; i < 4; i++) {
      const res = await submitRsvp(TOKEN_REPEAT, {
        name: "Repeat Rita",
        email: "rita@example.com",
        answer: "yes",
      });
      expect(res.ok).toBe(true);
    }

    // The budget is 3 per hour per address: three sends, and the fourth is suppressed.
    const emails = guestEmails();
    expect(emails).toHaveLength(3);
    expect(emails.every((e) => e.data.to === "rita@example.com")).toBe(true);

    // Re-casing the address must NOT buy a fresh budget — that is what normalizing the KEY is for.
    const evasion = await submitRsvp(TOKEN_REPEAT, {
      name: "Repeat Rita",
      email: "RITA@Example.com",
      answer: "yes",
    });
    expect(evasion.ok).toBe(true);
    expect(guestEmails()).toHaveLength(3);
  });
});

describe("D-116 — an account attendee never routes through the guest path", () => {
  it("gets the durable in-app notification and ZERO guest emails", async () => {
    await login(ATTENDEE_EMAIL);
    // The form's email field is ignored entirely when a session exists (single-path identity): a signed-in
    // attendee de-dups by user_id, so writing an address alongside it would give one person two keys.
    const res = await submitRsvp(TOKEN_ACCOUNT, {
      name: "ignored",
      email: "smuggled@example.com",
      answer: "yes",
    });
    expect(res).toEqual({ ok: true, status: "yes", reachable: true });

    expect(guestEmails()).toHaveLength(0);
    const confirmed = notifies("group_rsvp_confirmed");
    expect(confirmed).toHaveLength(1);
    expect(confirmed[0].data.recipientId).toBe(attendeeId);
    expect(confirmed[0].data.email).toBe(ATTENDEE_EMAIL);

    // …and the smuggled address is nowhere in anything this action emitted.
    expect(JSON.stringify(sent())).not.toContain("smuggled@example.com");
  });

  it("records the ACCOUNT's own name, not a client-supplied one", async () => {
    await login(ATTENDEE_EMAIL);
    const received = notifies("group_rsvp_received");
    // (emitted by the previous case's RSVP — re-read here from a fresh call for clarity)
    inngestSend.mockClear();
    await submitRsvp(TOKEN_ACCOUNT, { name: "Totally Someone Else", answer: "no" });
    const payload = notifies("group_rsvp_received")[0].data.payload as { attendeeLabel: string };
    expect(payload.attendeeLabel).toBe("Ada Account");
    expect(received.length).toBeGreaterThanOrEqual(0); // fixture sanity, no assertion on the earlier batch
  });
});

describe("a DECLINE is confirmed on-screen only", () => {
  it("tells the organizer but sends the decliner no 'you're on the list' mail", async () => {
    const res = await submitRsvp(TOKEN_DECLINE, {
      name: "Declining Dana",
      email: "dana@example.com",
      answer: "no",
    });
    expect(res).toEqual({ ok: true, status: "no", reachable: true });

    // The only shipped guest copy is "you're on the list" — mailing that to someone who just declined
    // would be a false statement, and there is deliberately no declined type to invent.
    expect(guestEmails()).toHaveLength(0);

    const received = notifies("group_rsvp_received");
    expect(received).toHaveLength(1);
    expect((received[0].data.payload as { answer: string }).answer).toBe("no");
  });
});
