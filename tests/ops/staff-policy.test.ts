import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";

import { user } from "@/lib/db/schema";
import * as grantPolicy from "@/lib/ops/grant";
import { makeRacingClients, setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";

let testDb: TestDb;

beforeAll(async () => {
  testDb = await setupTestDb();
});

beforeEach(async () => {
  await testDb.db.execute(sql`DELETE FROM audit`);
  await testDb.db.execute(sql`DELETE FROM "user"`);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

async function seedUser(
  id: string,
  role: string | null,
  createdAt = new Date("2026-09-08T00:00:00.000Z"),
): Promise<void> {
  await testDb.db.insert(user).values({
    id,
    name: id,
    email: `${id.toLowerCase()}@example.com`,
    firstName: id,
    emailVerified: true,
    role,
    createdAt,
  });
}

async function roleOf(id: string): Promise<string | null | undefined> {
  const rows = await testDb.db.select({ role: user.role }).from(user).where(eq(user.id, id));
  return rows[0]?.role;
}

async function auditCount(): Promise<number> {
  const rows = (await testDb.db.execute(sql`SELECT count(*)::int AS count FROM audit`)) as unknown as Array<{
    count: number;
  }>;
  return rows[0]?.count ?? 0;
}

describe("writeRole staff-revocation boundary (OPS-10, D-19)", () => {
  it("refuses self-revocation with the shared reason and changes neither role nor audit", async () => {
    await seedUser("staff-self", "staff");

    const result = await grantPolicy.revokeStaff(testDb.db, "staff-self", "staff-self");

    expect(result).toEqual({ outcome: "refused", reason: "self_revoke" });
    expect((grantPolicy as Record<string, unknown>).SELF_REVOKE_REASON).toBe(
      "You can't revoke your own staff access.",
    );
    expect(await roleOf("staff-self")).toBe("staff");
    expect(await auditCount()).toBe(0);
  });

  it("refuses removal of the sole active staff member with one stable reason", async () => {
    await seedUser("only-staff", "staff");
    await seedUser("outside-actor", "user");

    const result = await grantPolicy.revokeStaff(testDb.db, "only-staff", "outside-actor");

    expect(result).toEqual({ outcome: "refused", reason: "last_staff" });
    expect((grantPolicy as Record<string, unknown>).LAST_STAFF_REVOKE_REASON).toBe(
      "You can't revoke the last staff account.",
    );
    expect(await roleOf("only-staff")).toBe("staff");
    expect(await auditCount()).toBe(0);
  });

  it("reports an already-empty staff set as an invariant violation", async () => {
    await seedUser("ordinary-user", "user");

    const result = await grantPolicy.revokeStaff(testDb.db, "ordinary-user", "outside-actor");

    expect(result).toEqual({ outcome: "refused", reason: "staff_invariant_empty" });
    expect(await roleOf("ordinary-user")).toBe("user");
    expect(await auditCount()).toBe(0);
  });

  it("uses createdAt then id as the stable staff read ordering", async () => {
    const sameInstant = new Date("2026-09-08T01:00:00.000Z");
    await seedUser("staff-z", "staff", sameInstant);
    await seedUser("staff-a", "staff", sameInstant);

    expect((await grantPolicy.listStaff(testDb.db)).map((row) => row.id)).toEqual([
      "staff-a",
      "staff-z",
    ]);
  });

  it("serializes two crossing revokes at the two-staff boundary and leaves exactly one", async () => {
    await seedUser("staff-a", "staff");
    await seedUser("staff-b", "staff");

    const clients = makeRacingClients(testDb.schema, 2);
    const [dbA, dbB] = clients.map((client) => drizzle(client));
    try {
      const results = await Promise.all([
        grantPolicy.revokeStaff(dbA, "staff-b", "staff-a"),
        grantPolicy.revokeStaff(dbB, "staff-a", "staff-b"),
      ]);

      expect(results.filter((result) => result.outcome === "written")).toHaveLength(1);
      expect(results.filter((result) => result.outcome === "refused")).toHaveLength(1);
      expect(await grantPolicy.listStaff(testDb.db)).toHaveLength(1);
      expect(await auditCount()).toBe(1);
    } finally {
      await Promise.all(clients.map((client) => client.end()));
    }
  });
});
