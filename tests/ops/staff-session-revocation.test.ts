import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";

import { user } from "@/lib/db/schema";
import { writeRole } from "@/lib/ops/grant";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";

let testDb: TestDb;
let testAuth: TestAuth;
let requireStaff: typeof import("@/lib/ops/staff")["requireStaff"];

const sessionHeaders = { cookie: "" };
const NOT_FOUND = "NEXT_NOT_FOUND";
const PASSWORD = "averylongpassword";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);
  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("next/navigation", () => ({
    notFound: () => {
      throw new Error(NOT_FOUND);
    },
  }));
  vi.resetModules();
  ({ requireStaff } = await import("@/lib/ops/staff"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("next/navigation");
  await teardownTestDb(testDb);
});

describe("next-request staff revocation (OPS-10)", () => {
  it("reuses the pre-revocation cookie but requireStaff reads the new database role", async () => {
    const signedUp = (await signUp(testAuth, {
      email: "revoked.staff@example.com",
      password: PASSWORD,
      name: "Revoked Staff",
      firstName: "Revoked",
      intent: "book",
    })) as { user: { id: string } };
    await testDb.db
      .update(user)
      .set({ role: "staff", canBook: false, canHost: false })
      .where(eq(user.id, signedUp.user.id));
    await testDb.db.insert(user).values({
      id: "safeguard-staff",
      name: "Safeguard",
      email: "safeguard.staff@example.com",
      firstName: "Safeguard",
      emailVerified: true,
      role: "staff",
      canBook: false,
      canHost: false,
    });

    const signIn = await testAuth.api.signInEmail({
      body: { email: "revoked.staff@example.com", password: PASSWORD },
      asResponse: true,
    });
    const setCookie = signIn.headers.get("set-cookie");
    sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
    const issuedCookie = sessionHeaders.cookie;
    expect(issuedCookie).toContain("better-auth.session_token=");
    await expect(requireStaff()).resolves.toEqual({ id: signedUp.user.id });

    const result = await writeRole(
      { target: signedUp.user.id, actorId: "safeguard-staff", role: "user" },
      testDb.db,
    );
    expect(result).toMatchObject({ outcome: "written", userId: signedUp.user.id, role: "user" });

    sessionHeaders.cookie = issuedCookie;
    await expect(requireStaff()).rejects.toThrow(NOT_FOUND);
    const identityStillExists = await testAuth.api.getSession({
      headers: new Headers({ cookie: issuedCookie }),
    });
    expect(identityStillExists?.user.id).toBe(signedUp.user.id);
    expect((identityStillExists?.user as { role?: string }).role).toBe("user");
    expect(
      (testAuth as unknown as { options: { session?: { cookieCache?: unknown } } }).options.session
        ?.cookieCache,
    ).toBeUndefined();
  });

  it("retains the old staff-management decision and marks coexistence as superseded", () => {
    const todo = readFileSync(
      ".planning/todos/pending/2026-09-01-ops-staff-management-surface-and-invite-flow.md",
      "utf8",
    );

    expect(todo).toContain("Superseded by D-14 and project decision D-275");
    expect(todo).toContain("An ops-only identity policy (staff may not book or host) — **declined**.");
  });
});
