#!/usr/bin/env node

import postgres from "postgres";
import { pathToFileURL } from "node:url";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "db"]);
const LEGACY_HOST_EMAIL = "host@fitout.test";
const UNSAFE_OUTPUT_KEY = /email|password|cookie|token|secret|database.?url|authorization/i;

function databaseUrl() {
  return process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";
}

function isLocalDatabase(rawUrl) {
  try {
    return LOCAL_HOSTS.has(new URL(rawUrl).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function assertSafeReport(report) {
  const stack = [report];
  while (stack.length > 0) {
    const value = stack.pop();
    if (!value || typeof value !== "object") continue;
    for (const [key, child] of Object.entries(value)) {
      if (UNSAFE_OUTPUT_KEY.test(key)) {
        throw new Error(`unsafe verifier output field: ${key}`);
      }
      stack.push(child);
    }
  }
}

export async function readOpsLocalState(sql) {
  const [summary] = await sql`
    SELECT
      count(*) FILTER (WHERE role = 'staff')::int AS "staffCount",
      count(*) FILTER (
        WHERE role = 'staff' AND (can_book = true OR can_host = true)
      )::int AS "capabilityBearingStaffCount"
    FROM "user"
  `;
  const staff = await sql`
    SELECT id, can_book AS "canBook", can_host AS "canHost"
      FROM "user"
     WHERE role = 'staff'
     ORDER BY created_at, id
  `;
  const [legacyHost] = await sql`
    SELECT id, role = 'staff' AS "isStaff", can_host AS "canHost", can_book AS "canBook"
      FROM "user"
     WHERE lower(email) = lower(${LEGACY_HOST_EMAIL})
     LIMIT 1
  `;

  return {
    databaseClass: isLocalDatabase(databaseUrl()) ? "local" : "nonlocal",
    staffCount: summary.staffCount,
    capabilityBearingStaffCount: summary.capabilityBearingStaffCount,
    staff: staff.map((row) => ({ id: row.id, canBook: row.canBook, canHost: row.canHost })),
    legacyHost: legacyHost
      ? {
          id: legacyHost.id,
          present: true,
          isStaff: legacyHost.isStaff,
          canHost: legacyHost.canHost,
          canBook: legacyHost.canBook,
        }
      : { id: null, present: false, isStaff: false, canHost: false, canBook: false },
  };
}

export function validateOpsLocalState(report, { requireSeparatedHost = false } = {}) {
  const errors = [];
  if (report.staffCount < 1) errors.push("at least one active staff identity is required");
  if (report.capabilityBearingStaffCount !== 0) {
    errors.push("staff identities must not retain marketplace capabilities");
  }
  if (requireSeparatedHost) {
    if (!report.legacyHost.present) errors.push("the known legacy host identity is missing");
    if (report.legacyHost.isStaff) errors.push("the known legacy host still has staff access");
    if (!report.legacyHost.canHost) errors.push("the known legacy host lost host capability");
  }
  return { ok: errors.length === 0, errors };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const allowed = new Set(["--report", "--require-separated-host"]);
  for (const arg of args) {
    if (!allowed.has(arg)) throw new Error(`unknown argument: ${arg}`);
  }

  const sql = postgres(databaseUrl(), { max: 1, onnotice: () => {} });
  try {
    const report = await readOpsLocalState(sql);
    assertSafeReport(report);
    const validation = validateOpsLocalState(report, {
      requireSeparatedHost: args.has("--require-separated-host"),
    });
    const result = { ...report, validation };
    assertSafeReport(result);
    console.log(JSON.stringify(result, null, args.has("--report") ? 2 : 0));
    if (!validation.ok) process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
