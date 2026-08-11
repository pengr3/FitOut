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
import type { DbConn } from "@/lib/availability/read-model";

// The tsx process doesn't load .env; fall back to the deterministic dev URL (as scripts/seed.ts).
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
const db = drizzle(sql) as unknown as DbConn;

const USAGE = `Usage:
  npm run ops:alerts                        list every UNRESOLVED needs_attention alert, newest first
  npm run ops:alerts:resolve -- <audit-id>  discharge one alert (sets resolved_at)
  npm run ops:alerts:history [-- <days>]    review DISCHARGED alerts, newest discharge first
                                            (days: 1-36500, default ${DEFAULT_HISTORY_DAYS}; read-only)

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

async function resolve(id: string): Promise<void> {
  const result = await resolveAlert(db, id);
  if (result.outcome === "resolved") {
    console.log(`Resolved ${result.id} at ${result.resolvedAt.toISOString()}.`);
    return;
  }
  if (result.outcome === "already_resolved") {
    // Never implies THIS run discharged it — the timestamp printed is the ORIGINAL one (D-J3Z-07).
    console.log(
      `${result.id} was ALREADY discharged at ${result.resolvedAt.toISOString()} — nothing changed.`,
    );
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

  // NO ACTOR COLUMN, and this is not a width hack (D-DJ4-05). `actor_id` is the actor of the ORIGINAL
  // event — `system` for every money action (runbook §4) — and there is NO `resolved_by` column (§7). In a
  // list ordered by DISCHARGE time an ACTOR column is read as "who discharged this", and that misreading is
  // actively dangerous in a dispute. The module still RETURNS actorId; only this render drops it.
  const header =
    pad("AUDIT ID", 38) +
    pad("OUTCOME", 17) +
    pad("ACTION", 30) +
    pad("CREATED (UTC)", 22) +
    pad("RESOLVED (UTC)", 22) +
    pad("HELD", 7) +
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
        errorCell(r.error),
    );
  }
  console.log(
    `\n${rows.length} discharged alert(s) in the last ${days} day(s). ` +
      `Full row incl. meta: npm run db:studio, or psql (runbook §3).`,
  );
}

async function main(): Promise<void> {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === "list") {
    await list();
    return;
  }
  if (cmd === "resolve") {
    if (!arg) {
      console.error("resolve needs an audit id.\n");
      console.error(USAGE);
      process.exitCode = 1;
      return;
    }
    await resolve(arg);
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
