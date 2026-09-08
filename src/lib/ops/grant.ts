// The staff-grant POLICY (OPS-01, D-217) — executable, injectable, and therefore mutable in a test.
//
// ── WHY THIS IS A MODULE AND NOT SIXTY LINES INSIDE `scripts/ops-grant.ts` ────────────────────────
//
// The same reason `src/lib/ops/resolve-args.ts` exists, restated for a heavier rule. That script
// cannot be imported by a test: it opens a postgres.js client and calls `main()` at module load, so an
// `import` of it would connect to a database and run a command as a side effect of collection. A
// policy nothing can execute in isolation is a policy nothing can MUTATE in isolation either — and
// "how does one become staff?" is the single most load-bearing rule in Phase 18. It lives here so a
// mutation can flip one line and watch exactly one case go red.
//
// ── THE GRANT IS A DRIZZLE WRITE, NEVER BETTER AUTH'S `updateUser` API ────────────────────────────
//
// Two independent reasons, and the second one is the decision:
//
//   1. It CANNOT be. `role` is `input: false` (`src/lib/auth.ts:112`), so Better Auth's
//      `parseInputData` throws FIELD_NOT_ALLOWED on a truthy value and silently drops a null; the
//      route then rejects the emptied body as "No fields to update". `src/lib/auth.ts:120-135` already
//      records paying exactly this cost for `avatarUrl`/`avatarPublicId`, which is why both avatar
//      actions write through Drizzle — as does `src/app/actions/capability.ts:75` for `canHost`.
//   2. It MUST NOT be, even if it could. D-217 says a role-grant HTTP path does not get to exist. The
//      `input: false` flag is the guard that makes (1) true today; the absence of any server action,
//      any route handler and any env allow-list is what keeps (2) true tomorrow. This module is
//      reachable from a shell with `DATABASE_URL` and from nowhere else.
//
// ── THE CONNECTION IS INJECTED AND HAS NO DEFAULT, AND THAT IS DELIBERATE ─────────────────────────
//
// `src/inngest/functions/payout-reconcile.ts:138` writes `alertStuckHeld(dbConn: DbConn = db)` — the
// project's parameterisation idiom, with a default so app callers need not pass one. This module takes
// the SAME first parameter and pointedly omits the default, because the default is the import: a
// `= db` here would pull `@/lib/db`'s module-level singleton into the CLI's graph, and that singleton
// opens a connection nothing in a short-lived script closes, so the process prints its result and then
// hangs forever. `src/lib/ops/alerts.ts` is the shipped module under the same constraint and it makes
// the same omission. The import set below is copied from it exactly.
//
// FOR THE SAME REASON THE AUDIT ROW IS INSERTED HERE, NOT VIA `recordAudit`. `src/lib/audit.ts`
// imports the `@/lib/db` singleton at module top, so calling it from a CLI hangs the process. The row
// is written through the SAME injected connection as the grant itself — which is also what lets an
// isolated-schema test read it back, and reading it back is the only honest verification available:
// `recordAudit` swallows its own insert failure by design (`src/lib/audit.ts:104-110`), so no
// audit-writing function's return value has ever been evidence that a row exists.
//
// ── THE ACTOR IS ASSERTED, NOT AUTHENTICATED — SAID PLAINLY, AS `ops-alerts.ts` SAYS IT ───────────
//
// `actorId` here is the `--by` handle an operator typed. This CLI has no session, so the value records
// who CLAIMS to have made a grant and is not proof of who did — byte-for-byte the limitation
// `scripts/ops-alerts.ts` records about its own `resolved_by`, and the same one `src/lib/db/schema.ts`
// notes at the column. That is not a defect being shipped quietly: the ops CONSOLE's own writes
// (plan 18-05) carry an AUTHENTICATED `actorId` from `requireStaff()`, which is the whole point of
// this phase. Retiring the CLI's asserted handle is explicitly out of scope (D-218), and it could not
// be otherwise anyway — the first staff member has to be granted by something that is not the console
// they cannot yet reach.
//
// ── WHAT MAY GO IN `meta` ─────────────────────────────────────────────────────────────────────────
//
// Ids and enum-shaped values only. NEVER the email address the operator typed: `audit.meta` is a
// durable jsonb column under D-72 ("not in this audit meta, not in any log line, NOT IN ANY COLUMN"),
// and an email is the most identifying handle a marketplace holds. The consequence is stated rather
// than hidden: a `denied` row for an unknown target CANNOT name what was attempted, because the only
// handle supplied was PII. The row therefore records that a grant was attempted, by whom, and that it
// found nothing — which is what a repudiation record needs, and it is the honest maximum here.

import { randomUUID } from "node:crypto";
import { asc, eq, or, sql } from "drizzle-orm";

import type { DbConn } from "@/lib/availability/read-model";
import { audit, user } from "@/lib/db/schema";

/**
 * The two audit action names this module writes, as constants rather than inline literals — the
 * grep-ability of an audit trail is the trail (`ops:alerts` matches on `action`).
 */
export const GRANT_ACTION = "ops_grant_staff";
export const REVOKE_ACTION = "ops_revoke_staff";

/** The one staff role (D-215). There is no tier, no second capability, and no permission table. */
export const STAFF_ROLE = "staff";
/** What a revoke sets the column back to — the `defaultValue` in `src/lib/auth.ts:112`. */
export const DEFAULT_ROLE = "user";

/** Shared D-19 copy. UI affordances and server refusals must render the same declaration. */
export const SELF_REVOKE_REASON = "You can't revoke your own staff access.";
export const LAST_STAFF_REVOKE_REASON = "You can't revoke the last staff account.";

export type StaffWriteRefusalReason =
  | "self_revoke"
  | "last_staff"
  | "staff_invariant_empty"
  | "stale_role";

export type StaffRoleWriteInput = {
  target: string;
  actorId: string;
  role: typeof STAFF_ROLE | typeof DEFAULT_ROLE;
};

/**
 * The result of one grant/revoke attempt.
 *
 * A discriminated union rather than a boolean plus a side channel, on the `ResolveResult` precedent
 * in `src/lib/ops/alerts.ts`: the caller has to narrow before it can reach `userId`, so "nothing was
 * found" cannot be accidentally rendered as "done".
 *
 * `previousRole` is the field that makes a REPEAT grant legible instead of merely harmless — it is
 * `"staff"` on the second run and `"user"` or `null` on the first.
 */
export type StaffWriteResult =
  | { outcome: "written"; userId: string; previousRole: string | null; role: string }
  | { outcome: "not_found" }
  | { outcome: "ambiguous" }
  | { outcome: "refused"; reason: StaffWriteRefusalReason };

/** One staff account, as an operator sees it in `npm run ops:staff`. */
export type StaffAccount = {
  id: string;
  email: string;
  createdAt: Date;
};

/**
 * Resolve `target` — an email address OR a user id — to exactly one row, or refuse.
 *
 * Both handles are accepted because both are what an operator actually has: an email from the person
 * asking, an id from a log line or an audit row. `OR` over two equality predicates cannot widen into
 * a scan or a prefix match, and the length check below is the fail-closed answer to the only way it
 * could ever match twice (an account whose email is literally another account's id). Refusing an
 * ambiguous target is not paranoia about a case that cannot happen — it is refusing to pick one.
 */
async function resolveTarget(
  dbConn: DbConn,
  target: string,
): Promise<{ id: string; role: string | null } | "not_found" | "ambiguous"> {
  const rows = await dbConn
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(or(eq(user.email, target), eq(user.id, target)));

  if (rows.length === 0) return "not_found";
  if (rows.length > 1) return "ambiguous";
  return rows[0];
}

/** Insert one audit row through the INJECTED connection. See the header for why not `recordAudit`. */
async function writeAudit(
  dbConn: DbConn,
  entry: {
    actorId: string;
    action: string;
    outcome: "ok" | "denied";
    meta: Record<string, unknown>;
  },
): Promise<void> {
  await dbConn.insert(audit).values({
    id: randomUUID(),
    actorId: entry.actorId,
    action: entry.action,
    outcome: entry.outcome,
    meta: entry.meta,
    // `createdAt` is deliberately not passed — the Postgres `now()` default is the authority
    // (the project's zero-JS-clock rule, src/lib/units.ts), as in `recordAudit`.
  });
}

/**
 * Set `role = 'staff'` on the account named by `target`, and record the attempt.
 *
 * ALWAYS writes exactly one audit row, on both branches. The denial is the half that is easy to skip
 * and the half a repudiation record actually needs: "somebody tried to make an account staff and it
 * did not land" is the shape of both a typo and an attack, and a trail that only logs successes
 * cannot show either.
 *
 * IDEMPOTENT by construction — the UPDATE is scoped by id and sets a constant, so a second run is a
 * no-op on the row. It is NOT silent, though: the second run's `previousRole` reads `"staff"`, which
 * is how the audit trail distinguishes "granted" from "granted again".
 */
export async function grantStaff(
  dbConn: DbConn,
  target: string,
  by: string,
): Promise<StaffWriteResult> {
  return writeRole({ target, actorId: by, role: STAFF_ROLE }, dbConn);
}

/**
 * Set `role` back to the default on the account named by `target`, and record the attempt.
 *
 * ⚠ A revocation takes effect on the revoked person's VERY NEXT REQUEST, with no session to hunt down
 * — `auth.api.getSession()` re-reads the row every time because `session.cookieCache` is unconfigured.
 * That property is `src/lib/ops/staff.ts`'s to keep, and its header is where the dependency is written
 * down. If cookie caching is ever enabled, this function stops being a revocation for the cache TTL.
 */
export async function revokeStaff(
  dbConn: DbConn,
  target: string,
  by: string,
): Promise<StaffWriteResult> {
  return writeRole({ target, actorId: by, role: DEFAULT_ROLE }, dbConn);
}

/**
 * The single staff-role mutation authority.
 *
 * A revoke takes the named transaction-scoped advisory lock before it reads any role state. The
 * conditional UPDATE is the authority: an application count is never allowed to decide whether the
 * last staff member may be removed. Its audit insert uses the same transaction, so neither half can
 * commit alone.
 */
export async function writeRole(
  input: StaffRoleWriteInput,
  dbConn: DbConn,
): Promise<StaffWriteResult> {
  return dbConn.transaction(async (tx): Promise<StaffWriteResult> => {
    const action = input.role === STAFF_ROLE ? GRANT_ACTION : REVOKE_ACTION;

    if (input.role === DEFAULT_ROLE) {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended('fitout:staff-role-policy', 0))`,
      );
    }

    const found = await resolveTarget(tx, input.target);
    if (found === "not_found" || found === "ambiguous") {
      // Preserve the established unknown/ambiguous attempt trail. D-19 policy refusals below are
      // deliberately side-effect free; no target state exists to pair with this legacy audit shape.
      await writeAudit(tx, {
        actorId: input.actorId,
        action,
        outcome: "denied",
        meta: { reason: found === "not_found" ? "target_not_found" : "target_ambiguous" },
      });
      return { outcome: found };
    }

    if (input.role === DEFAULT_ROLE) {
      // Re-read actor and the active set under the same lock. The actor lookup is diagnostic for
      // authenticated UI callers; the bootstrap CLI's --by value remains asserted, not authenticated.
      await tx.select({ id: user.id, role: user.role }).from(user).where(eq(user.id, input.actorId));
      const activeStaff = await tx
        .select({ id: user.id })
        .from(user)
        .where(eq(user.role, STAFF_ROLE))
        .orderBy(asc(user.createdAt), asc(user.id));

      const updated = (await tx.execute(sql`
        UPDATE "user" AS target
           SET role = ${DEFAULT_ROLE}, updated_at = now()
         WHERE target.id = ${found.id}
           AND target.role = ${STAFF_ROLE}
           AND target.id != ${input.actorId}
           AND EXISTS (
             SELECT 1
               FROM "user" AS other
              WHERE other.role = ${STAFF_ROLE}
                AND other.id != target.id
           )
         RETURNING target.id AS "userId"
      `)) as unknown as Array<{ userId: string }>;

      if (updated.length === 0) {
        const reason: StaffWriteRefusalReason =
          activeStaff.length === 0
            ? "staff_invariant_empty"
            : found.role !== STAFF_ROLE
              ? "stale_role"
              : found.id === input.actorId
                ? "self_revoke"
                : "last_staff";
        return { outcome: "refused", reason };
      }

      await writeAudit(tx, {
        actorId: input.actorId,
        action,
        outcome: "ok",
        meta: { targetUserId: found.id, previousRole: found.role, role: input.role },
      });
      return {
        outcome: "written",
        userId: updated[0].userId,
        previousRole: found.role,
        role: input.role,
      };
    }

    await tx.update(user).set({ role: input.role }).where(eq(user.id, found.id));
    await writeAudit(tx, {
      actorId: input.actorId,
      action,
      outcome: "ok",
      meta: { targetUserId: found.id, previousRole: found.role, role: input.role },
    });
    return {
      outcome: "written",
      userId: found.id,
      previousRole: found.role,
      role: input.role,
    };
  });
}

/**
 * Every account currently carrying the staff role, oldest first.
 *
 * POSITIVE EQUALITY on the value, matching `readStaff()` exactly — a list built from "not the default
 * role" would show a different set from the one the guard admits, and an ops roster that disagrees
 * with the gate is worse than no roster.
 *
 * The email is in this projection ON PURPOSE and the boundary is narrower than it looks: this value
 * reaches an operator's terminal and nothing else. It is never written to `audit.meta` (see the
 * header) and it never reaches an email digest — which is the same line `src/lib/ops/alerts.ts` draws
 * between what `psql` may show and what leaves the machine. A staff roster with no human-readable
 * handle would answer "how many" and never "who", which is the only question it is asked.
 */
export async function listStaff(dbConn: DbConn): Promise<StaffAccount[]> {
  const rows = await dbConn
    .select({ id: user.id, email: user.email, createdAt: user.createdAt })
    .from(user)
    .where(eq(user.role, STAFF_ROLE))
    .orderBy(asc(user.createdAt), asc(user.id));

  return rows;
}

/** The parsed `grant`/`revoke` invocation, or the reason it was refused. */
export type ParsedGrantArgs =
  | { ok: true; target: string; by: string }
  | { ok: false; error: string };

const ERR_NO_TARGET = "needs an email address or a user id.";
const ERR_NO_BY =
  `needs --by "<your name>". There is deliberately no default — not your OS username, not any ` +
  `environment variable. A name you type is the record; a name the machine fills in attributes ` +
  `nothing while making every grant look attributed. (It is an identity that is asserted, not ` +
  `authenticated — this CLI has no session.)`;
const ERR_BLANK_BY = 'needs a non-empty --by "<your name>" — a blank name records nothing.';

/**
 * Parse the arguments that follow the `grant` / `revoke` verb.
 *
 * FLAGS FIRST, POSITIONALS SECOND — load-bearing, not stylistic, and inherited wholesale from
 * `src/lib/ops/resolve-args.ts:60-66`: with positionals taken first, `--by Jane alice@example.com`
 * would make the TARGET `--by` (or `Jane`), and this verb's write is a privilege grant. Both flag
 * forms are accepted because an operator should not have to remember which one this tool wants.
 *
 * THIS MODULE READS `process.env` NOWHERE, which is the structural version of the no-default rule
 * rather than a promise about it (D-FH6-03, applied to a heavier verb than `resolve`). Three distinct
 * refusals, for the same reason that file gives: a typo, a policy violation and a slip must not print
 * the same sentence.
 *
 * @param argv the tokens AFTER the verb, i.e. `process.argv.slice(3)`.
 */
export function parseGrantArgs(argv: string[]): ParsedGrantArgs {
  const positionals: string[] = [];
  let by: string | undefined;
  let sawByFlag = false;

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--by") {
      sawByFlag = true;
      // Consumed unconditionally, even when empty — that is what stops a blank name falling through
      // and being read as the positional target.
      by = argv[i + 1];
      i++;
      continue;
    }
    if (token.startsWith("--by=")) {
      sawByFlag = true;
      by = token.slice("--by=".length);
      continue;
    }
    positionals.push(token);
  }

  const target = positionals[0];
  if (!target) return { ok: false, error: ERR_NO_TARGET };
  if (!sawByFlag || by === undefined) return { ok: false, error: ERR_NO_BY };

  const trimmed = by.trim();
  if (trimmed.length === 0) return { ok: false, error: ERR_BLANK_BY };

  return { ok: true, target, by: trimmed };
}
