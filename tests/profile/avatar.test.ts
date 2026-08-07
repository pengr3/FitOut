// AUTH-05 / D-11 / threat T-04-04: avatar upload validates type+size, uploads to Cloudinary
// (MOCKED — no real creds), and stores the returned secure_url + public_id on the user row.
//
// WR-07 change: the upload+persistence test now imports and drives the REAL exported
// `uploadAvatarAction` (binding it to the test-schema auth + a mocked session) instead of
// reproducing the upload+store steps against the test db. So a regression INSIDE the action — a
// dropped column write, a broken session gate, or skipping the file validation — fails this test.
//
// The avatarFileSchema guard tests below are genuine and load-bearing (they assert the Zod
// content-type/size contract directly) and are kept as-is.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { user } from "@/lib/db/schema";
// avatarFileSchema/AVATAR_MAX_BYTES import from @/lib/validation/profile, NOT from the action.
// They were exported from the "use server" module until quick-260807-fc6, which made Next refuse
// to evaluate it (only async exports allowed) — these very assertions passed the whole time,
// because Vitest does not enforce that rule. Only the path changed; the cases below are unaltered
// and still drive the same schema. tests/use-server-exports.test.ts is what stops the regression.
import { avatarFileSchema, AVATAR_MAX_BYTES } from "@/lib/validation/profile";

let testDb: TestDb;
let testAuth: TestAuth;
let uploadAvatarAction: typeof import("@/app/actions/avatar")["uploadAvatarAction"];

// uploadAvatarAction reads the session via next/headers + auth.api.getSession and persists via
// auth.api.updateUser({ headers }). Mock next/headers to carry the signed-in cookie; bind @/lib/auth
// to the test-schema auth. Cloudinary is already mocked globally (tests/setup.ts).
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);
  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.resetModules();
  ({ uploadAvatarAction } = await import("@/app/actions/avatar"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  await teardownTestDb(testDb);
});

/** Sign up + sign in a user; return id and stash the session cookie for the next/headers mock. */
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

/** Build a real File so .type/.size/.arrayBuffer() behave like the runtime input. */
function fakeFile(type: string, size: number): File {
  const bytes = new Uint8Array(size);
  return new File([bytes], "avatar.png", { type });
}

describe("avatar file validation (threat T-04-04)", () => {
  it("accepts an image/* file under the size limit", () => {
    const ok = avatarFileSchema.safeParse(fakeFile("image/png", 1024));
    expect(ok.success).toBe(true);
  });

  it("rejects a non-image content type", () => {
    const bad = avatarFileSchema.safeParse(fakeFile("application/pdf", 1024));
    expect(bad.success).toBe(false);
  });

  it("rejects a file over the size limit", () => {
    const tooBig = avatarFileSchema.safeParse(
      fakeFile("image/jpeg", AVATAR_MAX_BYTES + 1),
    );
    expect(tooBig.success).toBe(false);
  });
});

describe("avatar upload + persistence via the real uploadAvatarAction (AUTH-05, D-11, WR-07)", () => {
  it("uploads via Cloudinary (mocked) and stores secure_url + public_id on the user row", async () => {
    const email = "avatar.store@example.com";
    const userId = await signInUser(email, "Ava");

    const form = new FormData();
    form.set("avatar", fakeFile("image/png", 2048));
    const res = await uploadAvatarAction(form);

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.avatarUrl).toMatch(/^https?:\/\//);

    const rows = await testDb.db.select().from(user).where(eq(user.id, userId));
    const row = rows[0];
    expect(row.avatarUrl).toBe(res.avatarUrl);
    expect(row.avatarPublicId).toBeTruthy();
    // Mock derives the public_id from the userId, so it round-trips that id.
    expect(row.avatarPublicId).toContain(userId);
  });

  it("rejects a non-image upload through the real action (server-side file guard)", async () => {
    const email = "avatar.badtype@example.com";
    await signInUser(email, "Bad");

    const form = new FormData();
    form.set("avatar", fakeFile("application/pdf", 2048));
    const res = await uploadAvatarAction(form);
    expect(res.ok).toBe(false);
  });

  it("rejects the upload when there is no session (gate enforced by the real action)", async () => {
    sessionHeaders.cookie = ""; // no session.
    const form = new FormData();
    form.set("avatar", fakeFile("image/png", 2048));
    const res = await uploadAvatarAction(form);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/signed in/i);
  });
});
