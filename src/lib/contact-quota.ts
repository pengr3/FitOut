import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { inArray, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contactQuota } from "@/lib/db/schema";

export type ContactQuotaResult =
  | { ok: true }
  | { ok: false; reason: "limited"; retryAfter: number }
  | { ok: false; reason: "unavailable" };
const GLOBAL_KEY = "contact:global:v1";
const IP_WINDOW = 900_000;
const GLOBAL_WINDOW = 3_600_000;

function retained(value: unknown, now: number, window: number, maximum: number): number[] {
  if (!Array.isArray(value) || value.length > maximum ||
      value.some((stamp) => typeof stamp !== "number" || !Number.isSafeInteger(stamp) || stamp < 0 || stamp > now)) {
    throw new Error("Invalid quota state");
  }
  return value.filter((stamp: number) => stamp > now - window).sort((a: number, b: number) => a - b);
}

/** One atomic reservation across all instances sharing this database. No inquiry PII is stored. */
export async function reserveContactQuota(
  ip: string,
  connection: Pick<typeof db, "transaction"> = db,
  secret: string | undefined = process.env.BETTER_AUTH_SECRET,
): Promise<ContactQuotaResult> {
  if (!secret || secret.length < 32 || (!isIP(ip) && ip !== "isolated-local-marketing")) {
    return { ok: false, reason: "unavailable" };
  }
  const ipKey = "contact:ip:v1:" + createHmac("sha256", secret)
    .update("fitout/contact-quota/ip/v1\0").update(ip).digest("hex");
  try {
    return await connection.transaction(async (tx): Promise<ContactQuotaResult> => {
      await tx.execute(sql`SET LOCAL lock_timeout = '2s'`);
      await tx.execute(sql`SET LOCAL statement_timeout = '3s'`);
      await tx.execute(sql`SELECT pg_advisory_xact_lock(27018, 1)`);
      // Read wall time AFTER waiting for the lock; transaction-start time can be stale.
      const clock = await tx.execute<{ now: string }>(sql`SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::text AS now`);
      const now = Number(clock[0]?.now);
      if (!Number.isSafeInteger(now) || now <= 0) throw new Error("Invalid database clock");
      await tx.delete(contactQuota).where(lte(contactQuota.expiresAt, new Date(now)));
      const rows = await tx.select().from(contactQuota).where(inArray(contactQuota.key, [GLOBAL_KEY, ipKey]));
      const globalRow = rows.find((row) => row.key === GLOBAL_KEY);
      const ipRow = rows.find((row) => row.key === ipKey);
      const global = retained(globalRow ? globalRow.attempts : [], now, GLOBAL_WINDOW, 100);
      const individual = retained(ipRow ? ipRow.attempts : [], now, IP_WINDOW, 5);
      const waits: number[] = [];
      if (global.length >= 100) waits.push(global[0] + GLOBAL_WINDOW - now);
      if (individual.length >= 5) waits.push(individual[0] + IP_WINDOW - now);
      if (waits.length) return { ok: false, reason: "limited", retryAfter: Math.max(1, Math.min(3600, Math.ceil(Math.max(...waits) / 1000))) };
      await tx.insert(contactQuota).values([
        { key: GLOBAL_KEY, attempts: [...global, now], expiresAt: new Date(now + GLOBAL_WINDOW) },
        { key: ipKey, attempts: [...individual, now], expiresAt: new Date(now + IP_WINDOW) },
      ]).onConflictDoUpdate({ target: contactQuota.key, set: { attempts: sql`excluded.attempts`, expiresAt: sql`excluded.expires_at` } });
      return { ok: true };
    });
  } catch {
    // Database errors can contain credentials/query values; never log or echo them.
    return { ok: false, reason: "unavailable" };
  }
}
