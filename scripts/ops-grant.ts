// The staff-grant operator CLI — `npm run ops:grant`, `npm run ops:revoke`, `npm run ops:staff`.
//
// WHY THIS EXISTS, AND WHY IT IS A SHELL ONLY. FitOut Ops needs a first staff member before anyone can
// reach the console that grants staff, so the bootstrap cannot live in the console. D-217 makes that
// necessity into the whole design: a staff grant is reachable from a shell holding `DATABASE_URL` and
// from nowhere else — never self-serve, never a client body, never an HTTP route. Everything with a
// rule in it lives in `src/lib/ops/grant.ts`, which a test can import and mutate; this file is the
// connection, the argv, the printing and the exit code.
//
// STANDALONE CONNECTION, on the `scripts/ops-alerts.ts:8-16` / `scripts/seed.ts:14-20` pattern: its OWN
// postgres.js client, capped at a single connection, with an explicit `end()`. It must NOT import the
// app's own db module (`@/lib/db`) — that singleton opens a connection nothing in a short-lived script
// closes, and the process hangs after printing. For the same reason nothing here goes through `@/lib/audit`: `recordAudit` imports that
// singleton, so `src/lib/ops/grant.ts` writes its audit row through the injected connection instead.
//
// IT MAY, HOWEVER, IMPORT `@/lib/ops/*`, AND THAT WAS PROBED FIRST-HAND (2026-08-10, recorded at
// `scripts/ops-alerts.ts:12-17`): `npx tsx` on a file importing `@/lib/db/schema` resolved the alias
// cleanly, with and without `--tsconfig`. tsx auto-discovers tsconfig.json (`paths: { "@/*":
// ["./src/*"] }`) from cwd, which is the repo root under `npm run`. Do not "fix" these imports back to
// relative paths.
//
// WHAT THE `--by` NAME IS WORTH, said here as well as in the audit row it lands in: this CLI has no
// session, so the value is an identity that is ASSERTED, NOT AUTHENTICATED. It records who CLAIMS to
// have made a grant. The ops console's own writes (plan 18-05) carry an authenticated actor from
// `requireStaff()`; this one cannot, by construction, because it runs before there is anyone to
// authenticate. `BY_FLAG_HELP` is imported rather than restated so the two CLIs cannot drift on what
// the flag means.
//
// ── RUN END TO END BEFORE IT WAS COMMITTED (2026-09-01), against `fitout_test`, not dev ───────────
//
// `src/lib/ops/grant.ts` is covered by twelve isolated-schema cases; NONE of them exercises this file,
// because a test cannot import it (see above). So it was run — every verb, in order, on a throwaway
// account, with the rows read back afterwards and then deleted:
//
//   (no args) ......................... USAGE + exit 1, terminated (the `finally` closed the client)
//   grant <email>            (no --by) . refused with the three-sentence policy error, exit 1
//   grant <email> --by "…" ............ "Granted staff … previous role \"user\" … (asserted, not
//                                        authenticated — this CLI has no session)."      exit 0
//   grant <email> --by "…" (again) .... "was ALREADY staff … nothing changed, attempt recorded" exit 0
//   list .............................. one row: id, email, created                        exit 0
//   revoke <user-id> --by "…" ......... "Revoked … takes effect on their very next request" exit 0
//   grant nobody@… --by "…" ........... "No account matches … the attempt was recorded"     exit 1
//   list .............................. "No staff accounts."                               exit 0
//
// And the four `audit` rows those calls left, read straight back out of the table:
//
//   ops_grant_staff  ok      {targetUserId, previousRole:"user",  role:"staff"}
//   ops_grant_staff  ok      {targetUserId, previousRole:"staff", role:"staff"}   ← the repeat, legible
//   ops_revoke_staff ok      {targetUserId, previousRole:"staff", role:"user"}
//   ops_grant_staff  denied  {reason:"target_not_found"}                          ← and NO email in it
//
// PRINTS NO `meta` AND NO ROLE HISTORY BEYOND THE ROW IT JUST WROTE. The staff roster prints id +
// email + created — an operator's terminal, which is the same boundary `ops:alerts` draws between what
// a local psql session may show and what leaves the machine.

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { grantStaff, revokeStaff, listStaff, parseGrantArgs } from "@/lib/ops/grant";
import { BY_FLAG_HELP } from "@/lib/ops/resolve-args";
import type { DbConn } from "@/lib/availability/read-model";

// The tsx process doesn't load .env; fall back to the deterministic dev URL (as scripts/seed.ts).
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
const db = drizzle(sql) as unknown as DbConn;

const USAGE = `Usage:
  npm run ops:grant  -- <email-or-user-id> --by "<your name>" [--convert-marketplace-account]
                                            make one account STAFF (role = 'staff')
  npm run ops:revoke -- <email-or-user-id> --by "<your name>"
                                            take staff away again (role = 'user')
  npm run ops:staff                         list every staff account, oldest first (read-only)

${BY_FLAG_HELP}
  (That help text is imported from the alerts CLI rather than restated, so the two cannot drift on
  what the flag means. Read its last clause with this verb substituted: here the thing recorded is a
  staff GRANT, not an alert discharge. The rule, and what a typed name is worth, are identical.)

There is exactly ONE staff role (D-215): no tiers, no partial ops powers. Anyone you grant this to can
reach every ops surface, including cancel-and-refund on a live booking. The audit trail is the control,
so grant it to people you would trust with a refund, and revoke it the day they stop needing it — a
revocation takes effect on their very next request.`;

/** Pad to a fixed column width so the table stays readable in a plain terminal. */
function pad(s: string, w: number): string {
  return s.length >= w ? s : s + " ".repeat(w - s.length);
}

async function grant(
  target: string,
  by: string,
  convertMarketplaceAccount: boolean,
): Promise<void> {
  const res = await grantStaff(db, target, by, { convertMarketplaceAccount });

  if (res.outcome === "written") {
    if (res.previousRole === "staff") {
      console.log(`${target} was ALREADY staff (${res.userId}) — nothing changed, attempt recorded.`);
      return;
    }
    // The parenthetical is not decoration: this line is the moment a name enters an audit trail, and
    // it is the last chance to say what that name is worth before someone reads it back in a dispute.
    console.log(
      `Granted staff to ${target} (${res.userId}), previous role "${res.previousRole ?? "<null>"}", ` +
        `by "${by}" (asserted, not authenticated — this CLI has no session).`,
    );
    return;
  }

  if (res.outcome === "ambiguous") {
    console.error(`Refused: "${target}" matches more than one account. Use the user id.`);
    process.exitCode = 1;
    return;
  }

  if (res.outcome === "refused") {
    console.error(
      res.reason === "marketplace_account"
        ? "Refused: this account can book or host. Use a separate staff account, or repeat with " +
            "--convert-marketplace-account to remove both marketplace capabilities atomically."
        : `Refused: ${res.reason}. Nothing was changed.`,
    );
    process.exitCode = 1;
    return;
  }

  console.error(`No account matches "${target}". Nothing was changed; the attempt was recorded.`);
  process.exitCode = 1;
}

async function revoke(target: string, by: string): Promise<void> {
  const res = await revokeStaff(db, target, by);

  if (res.outcome === "written") {
    if (res.previousRole !== "staff") {
      console.log(
        `${target} was NOT staff (${res.userId}) — role is "${res.role}", attempt recorded.`,
      );
      return;
    }
    console.log(
      `Revoked staff from ${target} (${res.userId}), by "${by}" (asserted, not authenticated). ` +
        `It takes effect on their very next request — there is no cached session to wait out.`,
    );
    return;
  }

  if (res.outcome === "ambiguous") {
    console.error(`Refused: "${target}" matches more than one account. Use the user id.`);
    process.exitCode = 1;
    return;
  }

  if (res.outcome === "refused") {
    const reason =
      res.reason === "self_revoke"
        ? "You can't revoke your own staff access."
        : res.reason === "last_staff"
          ? "You can't revoke the last staff account."
          : `Refused: ${res.reason}.`;
    console.error(`${reason} Nothing was changed.`);
    process.exitCode = 1;
    return;
  }

  console.error(`No account matches "${target}". Nothing was changed; the attempt was recorded.`);
  process.exitCode = 1;
}

async function list(): Promise<void> {
  const rows = await listStaff(db);
  if (rows.length === 0) {
    console.log("No staff accounts. Grant one with: npm run ops:grant -- <email> --by \"<your name>\"");
    return;
  }

  const header = pad("USER ID", 38) + pad("EMAIL", 40) + "CREATED (UTC)";
  console.log(header);
  console.log("-".repeat(header.length + 4));
  for (const r of rows) {
    console.log(pad(r.id, 38) + pad(r.email, 40) + r.createdAt.toISOString());
  }
  console.log(`\n${rows.length} staff account(s). Every one of them can reach every ops surface.`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const [cmd] = argv;

  if (cmd === "list") {
    await list();
    return;
  }

  if (cmd === "grant" || cmd === "revoke") {
    // The WHOLE tail, not a single destructured argument — flags are consumed before positionals so a
    // `--by` VALUE can never be read as the account being granted (src/lib/ops/grant.ts).
    const parsed = parseGrantArgs(argv.slice(1), {
      allowMarketplaceConversion: cmd === "grant",
    });
    if (!parsed.ok) {
      console.error(`${cmd} ${parsed.error}\n`);
      console.error(USAGE);
      process.exitCode = 1;
      return;
    }
    if (cmd === "grant") {
      await grant(parsed.target, parsed.by, parsed.convertMarketplaceAccount === true);
    }
    else await revoke(parsed.target, parsed.by);
    return;
  }

  console.error(cmd ? `Unknown command: ${cmd}\n` : "No command given.\n");
  console.error(USAGE);
  process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Always close, so the process exits with whatever exitCode was set above.
    await sql.end({ timeout: 5 });
  });
