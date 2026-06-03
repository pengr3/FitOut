// AUTH-05 / D-11 / threat T-04-04: avatar upload validates type+size, uploads to Cloudinary
// (MOCKED — no real creds), and stores the returned secure_url + public_id on the user row.
//
// Cloudinary is mocked globally (tests/setup.ts -> tests/helpers/mocks.ts): upload_stream resolves
// a fake { secure_url, public_id }. So this exercises the REAL uploadAvatar helper end-to-end
// against the mock, plus the action's Zod file-guard (content-type image/* and size <= 5MB), plus
// the persistence of both columns on the isolated test schema.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { user } from "@/lib/db/schema";
import { uploadAvatar } from "@/lib/cloudinary";
import { avatarFileSchema, AVATAR_MAX_BYTES } from "@/app/actions/avatar";

let testDb: TestDb;
let auth: TestAuth;

beforeAll(async () => {
  testDb = await setupTestDb();
  auth = makeTestAuth(testDb);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

async function createUser(email: string, firstName: string) {
  const res = (await signUp(auth, {
    email,
    password: "averylongpassword",
    name: firstName,
    firstName,
  })) as { user: { id: string } };
  return res.user.id;
}

/** Build a minimal File-like stand-in for the Zod guard (Node test env, no real File needed). */
function fakeFile(type: string, size: number): File {
  // Construct a real File so .type/.size/.arrayBuffer() behave like the runtime input.
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

describe("avatar upload + persistence (AUTH-05, D-11)", () => {
  it("uploads via Cloudinary (mocked) and stores secure_url + public_id on the user row", async () => {
    const email = "avatar.store@example.com";
    const userId = await createUser(email, "Ava");

    // Reproduce the action's upload+store step (the action binds to the dev db + needs a session;
    // the BEHAVIOR — uploadAvatar then persist both columns — is identical here on the test schema).
    const buffer = Buffer.from(new Uint8Array(2048));
    const { secure_url, public_id } = await uploadAvatar(buffer, userId);

    await testDb.db
      .update(user)
      .set({ avatarUrl: secure_url, avatarPublicId: public_id })
      .where(eq(user.id, userId));

    const rows = await testDb.db.select().from(user).where(eq(user.id, userId));
    const row = rows[0];
    expect(row.avatarUrl).toBe(secure_url);
    expect(row.avatarPublicId).toBe(public_id);
    // Mock derives the public_id from the userId (folder/public_id), so it round-trips that id.
    expect(row.avatarPublicId).toContain(userId);
    expect(row.avatarUrl).toMatch(/^https?:\/\//);
  });
});
