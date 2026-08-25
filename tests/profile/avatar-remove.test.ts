// CROP-03 / D-169 — `removeAvatarAction` against a LIVE `fitout_test`: the ordering, the tolerated
// destroy failure, and the session gate.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE ORDERING CASE READS THE ROW FROM INSIDE THE DESTROY
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-169's rule is an ORDER — null both columns first, destroy the Cloudinary asset second — and an
// order is not observable in an end state. A test that removes an avatar and then asserts "the
// columns are null and the asset was destroyed" passes identically against an action that destroyed
// FIRST and nulled second, which is the arrangement D-169 exists to forbid: it can leave a live row
// pointing at an asset that no longer exists, i.e. a broken image on a public profile (T-16-42).
//
// So the observation is taken at the only instant that distinguishes the two: `destroy`'s own
// implementation is replaced for one call, and it reads the user row from the same database the
// action just wrote to. If the columns are already null AT THAT MOMENT, the write happened first.
// The assertion is therefore structural rather than a race against a timer, and it fails loudly on
// the swapped order rather than intermittently. Watched red by actually swapping the two blocks in
// `src/app/actions/avatar.ts` — the transcript is in `16-12-SUMMARY.md`.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE TWO FAILURE CASES ARE SEPARATE CASES
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `cloudinary.uploader.destroy` has TWO failure shapes and they arrive through different doors:
// it RESOLVES `{ result: "not found" }` for a public id that is not there, and it REJECTS only on a
// network or auth failure (16-RESEARCH §C11). An action that wrote only a `try/catch` handles the
// second and is blind to the first; one that checked only the result is blind to the second. Neither
// may reach the person, because by the time either happens the columns are ALREADY null and the
// removal HAS succeeded — reporting a failure there is the UI lying, arriving through the other door
// from the one D-169's ordering closes (T-16-43).
//
// ⚠ A BEST-EFFORT DESTROY THAT SWALLOWS ITS OWN FAILURE IS INVISIBLE, which is why the rejecting case
// asserts the call was ATTEMPTED as well as absorbed. "The action returned ok" is equally true of an
// action that never called Cloudinary at all, and that is a different bug wearing the same green.
//
// ⚠ AND THE TWO NEGATIVE CASES ASSERT THE CALL COUNT, NOT THE RESULT. `{ ok: false }` from the
// session gate and `{ ok: true }` from an idempotent no-op are both values some OTHER bug could
// produce; the load-bearing claim in each is that no destructive call was made, so each counts the
// destroy invocations rather than reading the answer back.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE HARNESS IS THE UNION OF THE TWO THAT ALREADY EXIST
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// From `tests/profile/avatar.test.ts`: the `next/headers` mock carrying the signed-in cookie, the
// test-schema `auth` bound through `vi.doMock` + `vi.resetModules()` + a dynamic import, so the REAL
// exported action runs against the isolated schema. From `tests/listing/photos.test.ts`: the
// `mockCloudinary` import (its `destroy` records every public id it is handed) and the `@/lib/db` /
// `next/cache` doMocks. This action reaches neither of those two — it writes through Better Auth and
// revalidates nothing — and they are carried anyway so that a later db read or a `revalidatePath`
// added to it cannot escape the harness silently.
//
// NO ENV IS STUBBED, AND THAT IS A READING RATHER THAN AN OMISSION: `cloudinary` is mocked whole in
// `tests/setup.ts`, its `config()` is a `vi.fn`, and `removeAvatarAction` has no env-gated branch at
// all — so there is no outcome here that `.env.local` existing or not could move.

import { describe, it, expect, beforeAll, afterAll, vi, type Mock } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockCloudinary } from "../helpers/mocks";
import { user } from "@/lib/db/schema";

let testDb: TestDb;
let testAuth: TestAuth;
type AvatarActions = typeof import("@/app/actions/avatar");
let uploadAvatarAction: AvatarActions["uploadAvatarAction"];
let removeAvatarAction: AvatarActions["removeAvatarAction"];
let destroySpy: Mock;

const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);
  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.resetModules();
  ({ uploadAvatarAction, removeAvatarAction } = await import(
    "@/app/actions/avatar"
  ));
  // The SAME mocked instance the action's `@/lib/cloudinary` resolved after resetModules — grabbed
  // here rather than reached for through the helper, because per-case overrides
  // (`mockImplementationOnce` / `mockRejectedValueOnce`) have to land on the function that actually
  // runs. `tests/profile/avatar.test.ts:43-47` takes the same handle for `upload_stream`.
  const cloudinary = await import("cloudinary");
  destroySpy = cloudinary.v2.uploader.destroy as unknown as Mock;
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  await teardownTestDb(testDb);
});

/** Sign up + sign in a user; return the id and stash the cookie for the `next/headers` mock. */
async function signInUser(email: string, firstName: string): Promise<string> {
  const res = (await signUp(testAuth, {
    email,
    password: "averylongpassword",
    name: firstName,
    firstName,
    intent: "book",
  })) as { user: { id: string } };
  const signIn = await testAuth.api.signInEmail({
    body: { email, password: "averylongpassword" },
    asResponse: true,
  });
  const setCookie = signIn.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
  return res.user.id;
}

/** The two columns this action nulls, read straight off the row. */
async function avatarColumnsOf(
  userId: string,
): Promise<{ avatarUrl: string | null; avatarPublicId: string | null }> {
  const rows = await testDb.db.select().from(user).where(eq(user.id, userId));
  return {
    avatarUrl: rows[0]?.avatarUrl ?? null,
    avatarPublicId: rows[0]?.avatarPublicId ?? null,
  };
}

/** Build a real File so `.type` / `.size` / `.arrayBuffer()` behave like the runtime input. */
function fakeFile(): File {
  return new File([new Uint8Array(2048)], "avatar.png", { type: "image/png" });
}

/** Sign a user in and give them a stored avatar through the REAL upload action. */
async function withStoredAvatar(
  email: string,
  firstName: string,
): Promise<{ userId: string; publicId: string }> {
  const userId = await signInUser(email, firstName);
  const form = new FormData();
  form.set("avatar", fakeFile());
  const res = await uploadAvatarAction(form);
  expect(res.ok, "the fixture upload did not land, so the removal case is vacuous").toBe(
    true,
  );
  const stored = await avatarColumnsOf(userId);
  expect(stored.avatarPublicId).toBeTruthy();
  return { userId, publicId: stored.avatarPublicId as string };
}

describe("removeAvatarAction — the happy path and D-169's ordering (CROP-03)", () => {
  it("nulls both columns and destroys the stored asset", async () => {
    const { userId, publicId } = await withStoredAvatar(
      "avatar.remove.happy@example.com",
      "Remy",
    );

    const res = await removeAvatarAction();
    expect(res.ok).toBe(true);

    const after = await avatarColumnsOf(userId);
    expect(after.avatarUrl).toBeNull();
    expect(after.avatarPublicId).toBeNull();
    // The id the ROW carried, not one this test composed — `uploadAvatarAction` stores Cloudinary's
    // own `public_id`, so the destroy target needs no reconstruction.
    expect(mockCloudinary.destroys()).toContain(publicId);
  });

  it("has ALREADY nulled the columns at the moment the destroy runs", async () => {
    const { userId } = await withStoredAvatar(
      "avatar.remove.order@example.com",
      "Orla",
    );

    // The observation, taken inside the destroy itself. See the header: the end state cannot tell
    // the two orders apart, so it is read at the one instant that can.
    let columnsAtDestroy: {
      avatarUrl: string | null;
      avatarPublicId: string | null;
    } | null = null;
    destroySpy.mockImplementationOnce(async () => {
      columnsAtDestroy = await avatarColumnsOf(userId);
      return { result: "ok" };
    });

    const res = await removeAvatarAction();
    expect(res.ok).toBe(true);

    // Non-vacuity first: an assertion on a snapshot that was never taken would be an assertion about
    // `null`, and it would pass just as happily against an action that never called destroy at all.
    expect(
      columnsAtDestroy,
      "the destroy was never called, so nothing observed the ordering",
    ).not.toBeNull();
    expect(columnsAtDestroy!.avatarUrl).toBeNull();
    expect(columnsAtDestroy!.avatarPublicId).toBeNull();
  });
});

describe("removeAvatarAction — a Cloudinary failure never changes the result (D-169, T-16-43)", () => {
  it("returns ok and leaves the columns null when the destroy REJECTS", async () => {
    const { userId } = await withStoredAvatar(
      "avatar.remove.reject@example.com",
      "Reva",
    );

    destroySpy.mockRejectedValueOnce(new Error("cloudinary is unreachable"));
    const callsBefore = destroySpy.mock.calls.length;

    const res = await removeAvatarAction();

    // The whole point: the removal HAPPENED, so the person is told it happened.
    expect(res.ok).toBe(true);
    const after = await avatarColumnsOf(userId);
    expect(after.avatarUrl).toBeNull();
    expect(after.avatarPublicId).toBeNull();
    // …and the failure was ABSORBED rather than never attempted. A best-effort call that silently
    // stopped being made would produce this same green without this line.
    expect(destroySpy.mock.calls.length).toBe(callsBefore + 1);
  });

  it("returns ok when the destroy RESOLVES `not found` — the shape that does not throw", async () => {
    const { userId } = await withStoredAvatar(
      "avatar.remove.notfound@example.com",
      "Nadia",
    );

    destroySpy.mockResolvedValueOnce({ result: "not found" });
    const callsBefore = destroySpy.mock.calls.length;

    const res = await removeAvatarAction();

    expect(res.ok).toBe(true);
    const after = await avatarColumnsOf(userId);
    expect(after.avatarUrl).toBeNull();
    expect(after.avatarPublicId).toBeNull();
    expect(destroySpy.mock.calls.length).toBe(callsBefore + 1);
  });
});

describe("removeAvatarAction — the gate and the no-op (T-16-41)", () => {
  it("refuses with no session, and destroys nothing", async () => {
    // A stored avatar EXISTS on this row; only the caller's session goes away. Without the fixture
    // the case would be indistinguishable from the idempotent no-op below.
    await withStoredAvatar("avatar.remove.gate@example.com", "Gale");

    sessionHeaders.cookie = "";
    const callsBefore = destroySpy.mock.calls.length;

    const res = await removeAvatarAction();

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/signed in/i);
    // The load-bearing half. `{ ok: false }` is what a dozen other bugs would also return; the claim
    // worth making about a destructive action refused at the gate is that it destroyed NOTHING.
    expect(destroySpy.mock.calls.length).toBe(callsBefore);
  });

  it("is idempotent for a user with no stored photo, and calls Cloudinary zero times", async () => {
    const userId = await signInUser("avatar.remove.none@example.com", "Nils");

    const before = await avatarColumnsOf(userId);
    expect(before.avatarPublicId).toBeNull();
    const callsBefore = destroySpy.mock.calls.length;

    const res = await removeAvatarAction();

    // Nothing to remove is not an error — a second press of the confirm, or a row whose url and id
    // ever disagreed, both end at the same truthful state.
    expect(res.ok).toBe(true);
    const after = await avatarColumnsOf(userId);
    expect(after.avatarUrl).toBeNull();
    expect(after.avatarPublicId).toBeNull();
    expect(destroySpy.mock.calls.length).toBe(callsBefore);
  });
});
