// The operator CLI for unresolved money alerts — `npm run ops:alerts` and `npm run ops:alerts:resolve`.
//
// WHY THIS EXISTS. Until now, answering "what money is outstanding?" required either log access or a psql
// session and knowledge of the D5 query (src/lib/db/schema.ts:342-348). That is not a redress procedure,
// it is a thing you have to already know. This makes it one command. The full operator procedure —
// how the alert arrives, how to read the row's stored context, the QRPh out-of-band refund, and when a row
// may be discharged — lives in .planning/ops/NEEDS-ATTENTION-RUNBOOK.md.
//
// STANDALONE CONNECTION, on the scripts/seed.ts pattern (seed.ts:14-20): its OWN postgres.js client with
// `max: 1` and an explicit `end()`. It must NOT import `@/lib/db` — the app singleton opens a connection
// nothing in a short-lived script closes, and the process hangs after printing.
//
// IT MAY, HOWEVER, IMPORT `@/lib/ops/alerts`, AND THAT WAS PROBED FIRST-HAND (2026-08-10): `npx tsx` on a
// file importing `@/lib/db/schema` resolved the alias cleanly, with and without `--tsconfig`. tsx 4.22.4
// auto-discovers tsconfig.json (`paths: { "@/*": ["./src/*"] }`) from cwd, which is the repo root under
// `npm run`. seed.ts:5's "NO `@/` imports" comment describes ITS OWN standalone design choice, not a tsx
// limitation. Do not "fix" these imports back to relative paths.
//
// NEVER PRINTS THE STORED CONTEXT COLUMN (D-J3Z-02, D-DJ4-04). Stated precisely, because as of 2026-08-11
// the older blanket phrasing ("prints no stored context column") is no longer accurate:
//   - The `meta` COLUMN is never selected and never printed, by EITHER verb. Neither `UnresolvedAlert` nor
//     `ResolvedAlert` has a `meta` field, so re-exporting it stays a compile error rather than a review
//     catch.
//   - `ops:alerts` (list) is UNCHANGED: audit id / action / actor_id / created_at / age, and nothing else.
//   - `ops:alerts:history` surfaces exactly ONE derived key, `meta->>'error'`, and no other. That is a
//     single deliberate widening argued in full at `listResolvedAlerts` in src/lib/ops/alerts.ts — the D2
//     question is "what was discharged, AND ON WHAT BASIS?", and identifiers live under separately-named
//     keys (`bookingId`, `transferId`, `paymentId`, `last4`) that a single-key projection cannot reach.
//   - The EMAIL digest is byte-untouched by that widening and still carries no key out of `meta` at all.
//
// THE HISTORY VERB PRINTS A `BY` COLUMN (2026-08-11, quick task 260811-fh6), and it changes none of the
// above. `resolved_by` is a plain COLUMN on the audit row — NOT a second key out of `meta` — so the
// single-derived-key boundary stated above is exactly where it was. It carries an operator-chosen handle,
// never a booker or host identity. The EMAIL digest remains byte-untouched and cannot acquire the value
// even in principle: `UnresolvedAlert` has no such field, `listUnresolvedAlerts` is unchanged, and an
// unresolved row has `resolved_by IS NULL` by definition. What the column is worth is stated at every
// surface that shows it, including this one: it is an identity that is ASSERTED, NOT AUTHENTICATED — this
// CLI has no session, so the value records who CLAIMS to have discharged a row and is not proof of who did.
//
// To read the full row including its jsonb context, use a LOCAL database session:
// `docker compose exec db psql -U fitout -d fitout -c "SELECT * FROM audit WHERE id = '<id>'"` or
// `npm run db:studio`. See sections 3 and 6a of the runbook — that boundary is deliberate.

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import {
  listUnresolvedAlerts,
  resolveAlert,
  listResolvedAlerts,
  DEFAULT_HISTORY_DAYS,
  DEFAULT_HISTORY_LIMIT,
} from "@/lib/ops/alerts";
import { parseResolveArgs, BY_FLAG_HELP } from "@/lib/ops/resolve-args";
import type { DbConn } from "@/lib/availability/read-model";

// The tsx process doesn't load .env; fall back to the deterministic dev URL (as scripts/seed.ts).
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
const db = drizzle(sql) as unknown as DbConn;

const USAGE = `Usage:
  npm run ops:alerts                        list every UNRESOLVED needs_attention alert, newest first
  npm run ops:alerts:resolve -- <audit-id> --by "<your name>"
                                            discharge one alert (sets resolved_at and resolved_by)
  npm run ops:alerts:history [-- <days>]    review DISCHARGED alerts, newest discharge first
                                            (days: 1-36500, default ${DEFAULT_HISTORY_DAYS}; read-only)

${BY_FLAG_HELP}

Discharge a row only AFTER the money question is actually settled — this records that someone acted,
it does not verify that they did. See .planning/ops/NEEDS-ATTENTION-RUNBOOK.md.`;

/** Pad to a fixed column width so the table stays readable in a plain terminal. */
function pad(s: string, w: number): string {
  return s.length >= w ? s : s + " ".repeat(w - s.length);
}

/** Whole hours between a row's creation and now. Advisory display only — moves no money (D-J3Z-08). */
function ageHours(createdAt: Date): number {
  return Math.floor((Date.now() - createdAt.getTime()) / 3_600_000);
}

async function list(): Promise<void> {
  const rows = await listUnresolvedAlerts(db);
  if (rows.length === 0) {
    console.log("No unresolved needs_attention alerts.");
    return;
  }

  const header =
    pad("AUDIT ID", 38) + pad("ACTION", 30) + pad("ACTOR", 22) + pad("CREATED (UTC)", 26) + "AGE";
  console.log(header);
  console.log("-".repeat(header.length + 4));
  for (const r of rows) {
    console.log(
      pad(r.id, 38) +
        pad(r.action, 30) +
        pad(r.actorId, 22) +
        pad(r.createdAt.toISOString(), 26) +
        `${ageHours(r.createdAt)}h`,
    );
  }
  console.log(
    `\n${rows.length} unresolved alert(s). Discharge one with: npm run ops:alerts:resolve -- <audit-id>`,
  );
}

async function resolve(id: string, by: string): Promise<void> {
  const result = await resolveAlert(db, id, by);
  if (result.outcome === "resolved") {
    // The parenthetical is not decoration. This line is the moment a name enters an audit trail, and it is
    // the last chance to say what that name is worth before somebody reads it back in a dispute.
    console.log(
      `Resolved ${result.id} at ${result.resolvedAt.toISOString()}, by "${result.resolvedBy}" ` +
        `(asserted, not authenticated — this CLI has no session).`,
    );
    return;
  }
  if (result.outcome === "already_resolved") {
    // Never implies THIS run discharged it — the timestamp AND the discharger printed are the ORIGINAL
    // ones (D-J3Z-07, D-FH6-04). `unrecorded` means NOT CAPTURED, never "nobody".
    const who = result.resolvedBy == null ? "an unrecorded discharger" : `"${result.resolvedBy}"`;
    console.log(
      `${result.id} was ALREADY discharged at ${result.resolvedAt.toISOString()} by ${who} — nothing changed.`,
    );
    if (result.resolvedBy == null) {
      // Said out loud rather than left to be inferred from "nothing changed": an operator who supplied a
      // name has every reason to assume it landed somewhere.
      console.log(
        `The --by you supplied ("${by}") was NOT recorded. This row was discharged before the resolved_by ` +
          `column existed, and a past discharge is never retro-attributed — neither the original discharge ` +
          `nor its missing discharger is overwritten or back-filled.`,
      );
    }
    return;
  }
  console.error(`No audit row with id ${result.id}. Nothing was discharged.`);
  process.exitCode = 1;
}

/** `2026-08-10T06:29:41Z` — seconds precision, no millis. Narrower than `list`'s full ISO, because this
 *  table carries TWO timestamps per row and the milliseconds buy a reviewer nothing. */
function shortUtc(d: Date): string {
  return `${d.toISOString().slice(0, 19)}Z`;
}

/**
 * Whole hours a money obligation sat outstanding before somebody discharged it — the accountability number
 * a reviewer actually wants ("how long did we hold this?"). Advisory display only, exactly like `ageHours`:
 * it moves no money and no decision keys off it (D-J3Z-08).
 */
function heldHours(createdAt: Date, resolvedAt: Date): number {
  return Math.floor((resolvedAt.getTime() - createdAt.getTime()) / 3_600_000);
}

/**
 * Render the one derived key this verb surfaces. Truncated at 48 chars purely so the table stays readable
 * in an 80-ish column terminal — this is a COSMETIC rule and NOT a PII control, and saying so plainly
 * matters: the actual control is the single-key `meta->>'error'` projection in the query (D-DJ4-04), which
 * is what makes `bookingId` / `transferId` / `last4` structurally unreachable. Truncating a leaked value
 * would not un-leak it, so do not read this as a safeguard.
 */
function errorCell(error: string | null): string {
  if (error == null) return "—";
  const flat = error.replace(/\s+/g, " ").trim();
  return flat.length > 48 ? `${flat.slice(0, 47)}…` : flat;
}

/**
 * Render the discharger. NULL prints `unrecorded` (D-FH6-07).
 *
 * NOT `—`, and the reason is one column to the right: `errorCell` above already uses `—` to mean "this row
 * has no error", so reusing it here would make two entirely different absences look identical in the same
 * table row. NOT blank either — a blank cell reads as "the field is empty because nothing happened", when
 * what actually happened is a real discharge whose discharger was never captured. `unrecorded` reads as NOT
 * CAPTURED, which is exactly what it is; it does NOT mean nobody.
 *
 * Truncation at 19 characters is COSMETIC — table width in a plain terminal, nothing more. Two things it is
 * emphatically not: it is not a privacy control (the value is an operator-chosen handle, and truncating a
 * value you did not want printed would not un-print it), and it is not a validity check. The value is an
 * identity that is ASSERTED, NOT AUTHENTICATED: the CLI has no session, so a name in this column is a claim
 * by whoever held `DATABASE_URL`, not proof of who discharged the row. Read it alongside your shell and
 * database access control, and alongside the out-of-band record (runbook §7).
 */
function byCell(resolvedBy: string | null): string {
  if (resolvedBy == null) return "unrecorded";
  const flat = resolvedBy.replace(/\s+/g, " ").trim();
  return flat.length > 19 ? `${flat.slice(0, 18)}…` : flat;
}

/**
 * Parse the optional `days` argument. Returns null on anything invalid — the caller prints USAGE and exits 1.
 *
 * A BARE `Number.parseInt` IS NOT A VALIDATOR: `parseInt("7abc")` is `7`, so a typo would silently run a
 * different query than the operator asked for. The regex is what rejects it. The upper bound exists because
 * `days` reaches `make_interval(days => $1::int)` — an out-of-range value overflows `::int` and fails as a
 * database error rather than as a usage message. (It reaches the query as a BIND PARAMETER, never as a SQL
 * literal — see D-DJ4-07 — so this validation is defence in depth, not the only thing standing between
 * argv and the predicate.)
 */
function parseDays(arg: string | undefined): number | null {
  if (arg === undefined) return DEFAULT_HISTORY_DAYS;
  if (!/^\d+$/.test(arg)) return null;
  const days = Number.parseInt(arg, 10);
  if (days < 1 || days > 36500) return null;
  return days;
}

async function history(daysArg: string | undefined): Promise<void> {
  const days = parseDays(daysArg);
  if (days === null) {
    console.error(`history needs a whole number of days between 1 and 36500 (got: ${daysArg}).\n`);
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  // LIMIT + 1, the shipped digest idiom: asking for one more row than we will show is how the truncation
  // notice below can be honest about there being more rather than silently cutting the list off.
  const fetched = await listResolvedAlerts(db, { days, limit: DEFAULT_HISTORY_LIMIT + 1 });
  const truncated = fetched.length > DEFAULT_HISTORY_LIMIT;
  const rows = truncated ? fetched.slice(0, DEFAULT_HISTORY_LIMIT) : fetched;

  if (rows.length === 0) {
    // NOT an error, matching `list`: "nobody discharged anything this month" is a real answer.
    console.log(`No alerts discharged in the last ${days} day(s).`);
    return;
  }

  if (truncated) {
    console.log(
      `${DEFAULT_HISTORY_LIMIT}+ discharged in the last ${days} day(s) — showing the ${DEFAULT_HISTORY_LIMIT} most recently discharged.`,
    );
  }

  // THERE IS A `BY` COLUMN AND THERE IS STILL NO `ACTOR` COLUMN. That NARROWS D-DJ4-05; it does not
  // reverse it (D-FH6-06). The old reasoning here ended "…and there is NO `resolved_by` column", which
  // became FALSE on 2026-08-11 — a comment that argues from a fact that has since changed is worse than no
  // comment, so here is the argument that actually holds now, in the order it runs:
  //
  //   1. TWO PERSON-SHAPED COLUMNS IN ONE DISCHARGE-ORDERED ROW IS WORSE THAN ONE. With `ACTOR = system`
  //      beside `BY = Jane`, a reader scanning for "who" has two candidates and must know which is which.
  //      The exact hazard D-DJ4-05 identified is AMPLIFIED by adding a correctly-named neighbour, not
  //      removed by it.
  //   2. `actor_id` CARRIES NO INFORMATION IN THIS VIEW. It is `system` for every money action (runbook
  //      §4), so on the rows a reviewer actually reads it is a constant column — pure width, pure risk.
  //   3. THE FACT IS NOT LOST. `listResolvedAlerts` still RETURNS `actorId`, unchanged, and the full row
  //      including `actor_id` is one psql away (runbook §3). Only this terminal render drops it.
  //
  // Rejected alternative, on the record because it is defensible and was considered: show BOTH, clearly
  // labelled (`EVENT ACTOR` / `DISCHARGED BY`). It fails on (2) — the extra width buys a constant — and on
  // (1), because "clearly labelled" is a bet that a stressed operator reads headers.
  //
  // What `BY` means: the discharger, as CLAIMED. See `byCell` — asserted, not authenticated.
  const header =
    pad("AUDIT ID", 38) +
    pad("OUTCOME", 17) +
    pad("ACTION", 30) +
    pad("CREATED (UTC)", 22) +
    pad("RESOLVED (UTC)", 22) +
    pad("HELD", 7) +
    pad("BY", 20) +
    "ERROR";
  console.log(header);
  console.log("-".repeat(header.length + 4));
  for (const r of rows) {
    console.log(
      pad(r.id, 38) +
        pad(r.outcome, 17) +
        pad(r.action, 30) +
        pad(shortUtc(r.createdAt), 22) +
        pad(shortUtc(r.resolvedAt), 22) +
        pad(`${heldHours(r.createdAt, r.resolvedAt)}h`, 7) +
        pad(byCell(r.resolvedBy), 20) +
        errorCell(r.error),
    );
  }
  console.log(
    `\n${rows.length} discharged alert(s) in the last ${days} day(s). ` +
      `Full row incl. meta: npm run db:studio, or psql (runbook §3).`,
  );
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const [cmd, arg] = argv;
  if (cmd === "list") {
    await list();
    return;
  }
  if (cmd === "resolve") {
    // The WHOLE tail, not the single destructured argument — `resolve` now takes a flag, and its parsing
    // lives in a pure module so the `--by` requirement is testable and mutable (D-FH6-08). The `list` and
    // `history` branches keep their existing single-argument handling untouched; `parseDays` is
    // deliberately not moved.
    const parsed = parseResolveArgs(argv.slice(1));
    if (!parsed.ok) {
      console.error(`${parsed.error}\n`);
      console.error(USAGE);
      process.exitCode = 1;
      return;
    }
    await resolve(parsed.id, parsed.by);
    return;
  }
  if (cmd === "history") {
    await history(arg);
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
