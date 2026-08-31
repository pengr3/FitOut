// OPS-01, the grant half: staff is granted by a Drizzle write from a CLI, and every attempt leaves a
// row somebody can read back (D-217, D-218).
//
// THE TEST TARGET IS `src/lib/ops/grant.ts`, NOT `scripts/ops-grant.ts`, and that split is the reason
// the policy is a module at all. The script cannot be imported: it opens a postgres.js client and calls
// `main()` at module load, so an `import` of it would connect to a database and run a command as a side
// effect of collection — `src/lib/ops/resolve-args.ts:4-9` states exactly this about the sibling CLI. A
// rule nothing can execute in isolation is a rule nothing can MUTATE in isolation either.
//
// WHY EVERY AUDIT ASSERTION IS A `SELECT`, NEVER A RETURN VALUE. `recordAudit` swallows its own insert
// failure by design (`src/lib/audit.ts:104-110` — "Losing an audit ROW is acceptable; losing the ACK is
// not"), so in this codebase an audit-writing function returning ok has NEVER been evidence that a row
// exists. `grant.ts` writes its row through the injected connection rather than through `recordAudit`,
// which does not change the discipline one bit: OPS-03 is a claim about the TABLE, so the table is what
// gets read. Every case below re-queries `audit` and asserts on what came back.
//
// WHAT EACH CASE MEASURES:
//
//   - case 1 — the grant lands on the row AND in the trail, with the actor the operator typed.
//   - case 2 — an unknown target is a CALM REFUSAL that changes nothing and still records the attempt.
//     "Somebody tried to make an account staff and it did not land" is the shape of both a typo and an
//     attack; a trail that only logs successes can show neither.
//   - case 3 — THE D-72 LEAK GUARD, and it is the sharpest case here. The `denied` row cannot name what
//     was attempted, because the only handle the operator supplied is an EMAIL ADDRESS, and
//     `audit.meta` is a durable jsonb column under a rule stated as "not in this audit meta, not in any
//     log line, NOT IN ANY COLUMN". The case asserts the address reaches the row NOWHERE — not in
//     `meta`, not in `actor_id`, not in `action`. A "meta has a reason key" assertion would stay green
//     with the email sitting right beside it.
//   - case 4 — revoke puts the column back, and its own row says which direction it went. Two actions,
//     not one action with a boolean: `ops:alerts` matches on `action`, so an ops trail that cannot be
//     grepped for revocations is missing the half that matters in an incident.
//   - case 5 — granting twice is idempotent ON THE ROW and NOT SILENT IN THE TRAIL. `previousRole`
//     reads "staff" the second time, which is the only thing distinguishing "granted" from "granted
//     again" after the fact. Asserting only "the role is still staff" would pass on an implementation
//     that wrote no second row at all.
//   - case 6 — a NULL role grants cleanly. The column is nullable (`src/lib/db/schema.ts:45`), so this
//     is a state that exists, and `previousRole: null` is recorded honestly rather than coerced to
//     "user" — the audit row must not claim to know something it does not.
//   - case 7 — `listStaff` is built on the SAME positive equality as `readStaff`. A roster derived from
//     "not the default role" would show a different set from the one the guard admits, and a roster
//     that disagrees with the gate is worse than no roster.
//   - cases 8-12 — the `--by` policy, cloned from `tests/ops/resolve-args.test.ts` cases 19-23 onto a
//     heavier verb. Case 9 is the load-bearing one: it plants `ghost-default` in BOTH `USERNAME` and
//     `USER` and asserts the string reaches the result nowhere, because a bare "missing --by is
//     refused" would stay green under a `process.env.USERNAME ?? "operator"` fallback — the failure
//     this rule actually exists to prevent, where every grant LOOKS attributed while attributing
//     nothing.
//
// NOTE ON WHAT IS *NOT* TESTED HERE. That `grantStaff` never calls `auth.api.updateUser` is asserted by
// a grep in the plan's acceptance criteria and, far more usefully, MEASURED from the other end by
// `tests/auth/ops-role.test.ts`: the endpoint provably cannot write the field, so the absence of the
// call is not the guard — `input: false` is.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user } from "@/lib/db/schema";
import {
  grantStaff,
  revokeStaff,
  listStaff,
  parseGrantArgs,
  GRANT_ACTION,
  REVOKE_ACTION,
} from "@/lib/ops/grant";

let testDb: TestDb;

const BY = "Rina (ops)";

beforeAll(async () => {
  testDb = await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

/** Seed one account. `role` is explicit so a case can plant a NULL, which the column permits. */
async function seedUser(id: string, email: string, role: string | null = "user"): Promise<void> {
  await testDb.db.insert(user).values({
    id,
    name: email,
    email,
    firstName: "Case",
    emailVerified: true,
    role,
  });
}

async function readRole(id: string): Promise<string | null | undefined> {
  const rows = await testDb.db.select({ role: user.role }).from(user).where(eq(user.id, id));
  return rows[0]?.role;
}

type AuditRow = {
  id: string;
  actorId: string;
  action: string;
  outcome: string;
  meta: Record<string, unknown> | null;
};

/**
 * Read the audit rows for one action back OUT OF THE TABLE, oldest first.
 *
 * Raw SQL rather than a Drizzle select, matching `src/lib/ops/alerts.ts`: the point of this helper is
 * that it shares no code path with the writer under test, so a writer that quietly stopped inserting
 * cannot also make the reader agree.
 */
async function auditRows(action: string): Promise<AuditRow[]> {
  return (await testDb.db.execute(sql`
    SELECT id, actor_id AS "actorId", action, outcome, meta
      FROM audit
     WHERE action = ${action}
     ORDER BY created_at ASC, id ASC
  `)) as unknown as AuditRow[];
}

describe("grantStaff / revokeStaff / listStaff — the CLI grant policy (OPS-01, D-217/D-218)", () => {
  it("case 1 — granting flips role to 'staff' and writes an ok audit row that a SELECT finds", async () => {
    await seedUser("G1", "g1@example.com");

    const res = await grantStaff(testDb.db, "g1@example.com", BY);
    expect(res).toEqual({
      outcome: "written",
      userId: "G1",
      previousRole: "user",
      role: "staff",
    });
    expect(await readRole("G1")).toBe("staff");

    const rows = (await auditRows(GRANT_ACTION)).filter((r) => r.meta?.targetUserId === "G1");
    expect(rows).toHaveLength(1);
    expect(rows[0].outcome).toBe("ok");
    // The actor is the handle the operator TYPED — asserted, not authenticated (this CLI has no
    // session). It is still the whole value of the row: a grant nobody's name is on is unattributable.
    expect(rows[0].actorId).toBe(BY);
    expect(rows[0].meta).toEqual({ targetUserId: "G1", previousRole: "user", role: "staff" });
  });

  it("case 2 — an unknown target is a calm refusal that changes nothing and still records the attempt", async () => {
    const before = await listStaff(testDb.db);

    const res = await grantStaff(testDb.db, "nobody@example.com", BY);
    expect(res).toEqual({ outcome: "not_found" });

    // Nothing moved: the staff roster is byte-identical to what it was before the attempt.
    expect((await listStaff(testDb.db)).map((s) => s.id)).toEqual(before.map((s) => s.id));

    const denied = (await auditRows(GRANT_ACTION)).filter((r) => r.outcome === "denied");
    expect(denied).toHaveLength(1);
    expect(denied[0].actorId).toBe(BY);
    expect(denied[0].meta).toEqual({ reason: "target_not_found" });
  });

  it("case 3 — the denial row carries NO email address anywhere (D-72: not in meta, not in any column)", async () => {
    const denied = (await auditRows(GRANT_ACTION)).filter((r) => r.outcome === "denied");
    expect(denied.length).toBeGreaterThan(0);

    // The whole row, serialised — so this passes only if the address is absent from `meta`, from
    // `actor_id` and from `action` alike. The narrower "meta has a reason key" assertion would stay
    // green with the address sitting in the next key over.
    for (const row of denied) {
      expect(JSON.stringify(row)).not.toContain("nobody@example.com");
      expect(JSON.stringify(row)).not.toContain("@example.com");
    }
  });

  it("case 4 — revoking puts the role back and records its own, separately greppable action", async () => {
    await seedUser("G4", "g4@example.com");
    await grantStaff(testDb.db, "G4", BY);
    expect(await readRole("G4")).toBe("staff");

    const res = await revokeStaff(testDb.db, "g4@example.com", BY);
    expect(res).toEqual({
      outcome: "written",
      userId: "G4",
      previousRole: "staff",
      role: "user",
    });
    expect(await readRole("G4")).toBe("user");

    const rows = (await auditRows(REVOKE_ACTION)).filter((r) => r.meta?.targetUserId === "G4");
    expect(rows).toHaveLength(1);
    expect(rows[0].outcome).toBe("ok");
    expect(rows[0].meta).toEqual({ targetUserId: "G4", previousRole: "staff", role: "user" });
  });

  it("case 5 — granting twice is idempotent on the row, and NOT silent in the trail", async () => {
    await seedUser("G5", "g5@example.com");

    const first = await grantStaff(testDb.db, "g5@example.com", BY);
    const second = await grantStaff(testDb.db, "g5@example.com", BY);

    expect(await readRole("G5")).toBe("staff");
    expect(first.outcome).toBe("written");
    expect(second.outcome).toBe("written");

    const rows = (await auditRows(GRANT_ACTION)).filter((r) => r.meta?.targetUserId === "G5");
    // TWO rows, not one: two attempts happened, and an audit trail records attempts.
    expect(rows).toHaveLength(2);
    expect(rows[0].meta).toMatchObject({ previousRole: "user" });
    // The second run's own record of the fact that it changed nothing.
    expect(rows[1].meta).toMatchObject({ previousRole: "staff" });
  });

  it("case 6 — a NULL role grants cleanly, and previousRole is recorded as null, not coerced", async () => {
    await seedUser("G6", "g6@example.com", null);
    expect(await readRole("G6")).toBeNull();

    const res = await grantStaff(testDb.db, "G6", BY);
    expect(res).toEqual({ outcome: "written", userId: "G6", previousRole: null, role: "staff" });
    expect(await readRole("G6")).toBe("staff");

    const rows = (await auditRows(GRANT_ACTION)).filter((r) => r.meta?.targetUserId === "G6");
    expect(rows).toHaveLength(1);
    expect(rows[0].meta).toEqual({ targetUserId: "G6", previousRole: null, role: "staff" });
  });

  it("case 7 — listStaff shows exactly the set the guard admits (positive equality, oldest first)", async () => {
    await seedUser("G7A", "g7a@example.com", "admin"); // a near-miss role is NOT staff (D-215)
    await seedUser("G7B", "g7b@example.com", null);

    const ids = (await listStaff(testDb.db)).map((s) => s.id);
    expect(ids).toContain("G1");
    expect(ids).toContain("G5");
    expect(ids).toContain("G6");
    expect(ids).not.toContain("G4"); // revoked in case 4
    expect(ids).not.toContain("G7A"); // role = 'admin'
    expect(ids).not.toContain("G7B"); // role IS NULL

    const rows = await listStaff(testDb.db);
    const times = rows.map((r) => r.createdAt.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    // The roster carries a human-readable handle, because "who?" is the only question it is asked.
    expect(rows.every((r) => r.email.length > 0)).toBe(true);
  });

  it("case 8 — parseGrantArgs: the happy path, with padding trimmed off the name", () => {
    expect(parseGrantArgs(["alice@example.com", "--by", "  Rina  "])).toEqual({
      ok: true,
      target: "alice@example.com",
      by: "Rina",
    });
  });

  it("case 9 — --by has NO default, silent or otherwise (not USERNAME, not USER, not any env var)", () => {
    const prevUsername = process.env.USERNAME;
    const prevUser = process.env.USER;
    process.env.USERNAME = "ghost-default";
    process.env.USER = "ghost-default";
    try {
      const parsed = parseGrantArgs(["alice@example.com"]);
      expect(parsed.ok).toBe(false);
      // The planted string must reach the result NOWHERE. A bare "it was refused" assertion would
      // stay green under a `process.env.USERNAME ?? "operator"` fallback, which is the actual failure
      // this rule exists to prevent.
      expect(JSON.stringify(parsed)).not.toContain("ghost-default");
    } finally {
      if (prevUsername === undefined) delete process.env.USERNAME;
      else process.env.USERNAME = prevUsername;
      if (prevUser === undefined) delete process.env.USER;
      else process.env.USER = prevUser;
    }
  });

  it("case 10 — a blank or whitespace-only --by is refused (a blank name records nothing)", () => {
    expect(parseGrantArgs(["alice@example.com", "--by", "   "]).ok).toBe(false);
    expect(parseGrantArgs(["alice@example.com", "--by="]).ok).toBe(false);
  });

  it("case 11 — the --by= form, and the flag BEFORE the positional (flags are consumed first)", () => {
    // With positionals taken first, this invocation would grant staff to "--by" or to "Rina".
    expect(parseGrantArgs(["--by", "Rina", "alice@example.com"])).toEqual({
      ok: true,
      target: "alice@example.com",
      by: "Rina",
    });
    expect(parseGrantArgs(["--by=Rina", "alice@example.com"])).toEqual({
      ok: true,
      target: "alice@example.com",
      by: "Rina",
    });
  });

  it("case 12 — a missing target is its OWN refusal, distinct from the missing-name one", () => {
    const noTarget = parseGrantArgs(["--by", "Rina"]);
    const noBy = parseGrantArgs(["alice@example.com"]);
    expect(noTarget.ok).toBe(false);
    expect(noBy.ok).toBe(false);
    // Three mistakes, three sentences: collapsing a typo and a policy violation into one message
    // makes the operator guess which one they made.
    expect((noTarget as { error: string }).error).not.toBe((noBy as { error: string }).error);
  });
});
