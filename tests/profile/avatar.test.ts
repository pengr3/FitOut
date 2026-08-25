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

import { describe, it, expect, beforeAll, afterAll, vi, type Mock } from "vitest";
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
let uploadStreamSpy: Mock;

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
  // Grab the SAME mocked cloudinary instance the action resolved after resetModules (the pattern
  // tests/listing/cloudinary-sign.test.ts uses for api_sign_request), so the upload OPTIONS can be
  // asserted. mockCloudinary only captures the RESULT, and the framing lives in the options.
  const cloudinary = await import("cloudinary");
  uploadStreamSpy = cloudinary.v2.uploader.upload_stream as unknown as Mock;
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

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // Phase 16 / CROP-01: the guard narrows from `image/*` to the three types AVATAR_ALLOWED_TYPES
  // declares. The three cases below EXTEND this describe; not one assertion above was edited.
  // The rejection message is asserted with `toBe` against the pinned literal because 16-UI-SPEC's
  // "Reused verbatim" table pins it as the SERVER-SIDE BACKSTOP — the client shows
  // AVATAR_WRONG_TYPE_MESSAGE instead, and churning this string is a copy change nobody asked for.
  // ───────────────────────────────────────────────────────────────────────────────────────────

  /** The one refusal string this schema is allowed to produce for a wrong content type. */
  const WRONG_TYPE = "Only image files are allowed.";

  it("accepts image/webp — the type AVATAR_HELPER promises and the old copy omitted", () => {
    const ok = avatarFileSchema.safeParse(fakeFile("image/webp", 1024));
    expect(ok.success).toBe(true);
  });

  it("rejects image/gif — the narrowing itself (it passed under startsWith(\"image/\"))", () => {
    const gif = avatarFileSchema.safeParse(fakeFile("image/gif", 1024));
    expect(gif.success).toBe(false);
    if (gif.success) return;
    expect(gif.error.issues[0]?.message).toBe(WRONG_TYPE);
  });

  it("rejects image/svg+xml — a scriptable document must not reach Cloudinary (T-16-23)", () => {
    const svg = avatarFileSchema.safeParse(fakeFile("image/svg+xml", 1024));
    expect(svg.success).toBe(false);
    if (svg.success) return;
    expect(svg.error.issues[0]?.message).toBe(WRONG_TYPE);
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

describe("the server never guesses a framing (CROP-01, D-171, threat T-16-22)", () => {
  // WHY `center` AND NOT `auto`/`faces`/`custom` (999.2-UI-SPEC § 4): `gravity` must never again
  // SELECT a region. `center` is the only value that cannot invent a framing — on the square the
  // cropper produces it is a no-op, and on a non-square input from a client that bypassed the
  // cropper it takes the middle, the least-surprising possible fallback. `gravity: "face"` picking
  // an arbitrary region on a faceless source is the literal bug that opened Phase 16.
  //
  // WHY THE TRANSFORM IS PINNED AND NOT DELETED: `uploadAvatarAction` is publicly reachable and
  // `avatarFileSchema` guards type and byte size but NOT pixel dimensions, so the 400x400 `c_fill`
  // stays as a fail-closed DIMENSION normaliser for that bypass path (D-171). `toEqual` on the whole
  // transformation object is deliberate: it also fails if a `format`, `quality`, `fetch_format` or
  // eager transform is ever slipped in, which § 4 forbids.
  //
  // NO ASSERTION HERE COMPARES STORED BYTES TO UPLOADED BYTES, and none ever should (RESEARCH §C12):
  // an upload `transformation` is an INCOMING transformation, so Cloudinary decodes and re-encodes
  // and the stored asset is not the blob the client produced. "Identity" is a claim about GEOMETRY.
  it("uploads with gravity center and keeps the 400x400 fill normaliser", async () => {
    const email = "avatar.gravity@example.com";
    await signInUser(email, "Grace");

    const callsBefore = uploadStreamSpy.mock.calls.length;
    const form = new FormData();
    form.set("avatar", fakeFile("image/png", 2048));
    const res = await uploadAvatarAction(form);

    expect(res.ok).toBe(true);
    // Assert the call ACTUALLY happened before reading its arguments — an options assertion against
    // an upload that never ran would be vacuous and would stay green through any regression.
    expect(uploadStreamSpy.mock.calls.length).toBe(callsBefore + 1);

    const options = uploadStreamSpy.mock.calls.at(-1)?.[0] as {
      folder?: string;
      public_id?: string;
      overwrite?: boolean;
      transformation?: Record<string, unknown>;
    };
    expect(options.transformation).toEqual({
      width: 400,
      height: 400,
      crop: "fill",
      gravity: "center",
    });
    expect(options.folder).toBe("fitout/avatars");
    expect(options.overwrite).toBe(true); // D-C: one canonical asset per user.
  });
});
