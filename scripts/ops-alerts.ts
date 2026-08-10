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
// PRINTS NO STORED CONTEXT COLUMN (D-J3Z-02). `listUnresolvedAlerts` cannot return it — the row type has no
// such field — so this CLI shows audit id / action / actor_id / created_at / age and nothing else. To read
// the full row including its jsonb context (booking id, transfer id, masked last-4), use a LOCAL database
// session: `docker compose exec db psql -U fitout -d fitout -c "SELECT * FROM audit WHERE id = '<id>'"` or
// `npm run db:studio`. See section 3 of the runbook — that boundary is deliberate.

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { listUnresolvedAlerts, resolveAlert } from "@/lib/ops/alerts";
import type { DbConn } from "@/lib/availability/read-model";

// The tsx process doesn't load .env; fall back to the deterministic dev URL (as scripts/seed.ts).
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
const db = drizzle(sql) as unknown as DbConn;

const USAGE = `Usage:
  npm run ops:alerts                        list every UNRESOLVED needs_attention alert, newest first
  npm run ops:alerts:resolve -- <audit-id>  discharge one alert (sets resolved_at)

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
