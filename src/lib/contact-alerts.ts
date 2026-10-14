import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contactAlert, contactQuota } from "@/lib/db/schema";
import { sendContactControlAlert } from "@/lib/contact-alert-mail";

type Connection = Pick<typeof db, "transaction">;
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
/** Called inside the quota transaction: one incident per rolling hour, across backends. */
export async function recordContactBudgetAlert(tx: Transaction): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(27018, 2)`);
  await tx.execute(sql`INSERT INTO contact_alert (kind, attempt_count)
    SELECT 'global_budget', 100 WHERE NOT EXISTS
    (SELECT 1 FROM contact_alert WHERE kind = 'global_budget' AND synthetic = false
      AND created_at > clock_timestamp() - interval '1 hour')`);
}

/** No raw query errors or request data escape to the scheduler or email. */
export async function inspectContactAlerts(connection: Connection = db) {
  try {
    return await connection.transaction(async tx => {
      await tx.execute(sql`SET LOCAL lock_timeout = '2s'`);
      await tx.execute(sql`SET LOCAL statement_timeout = '3s'`);
      // Hold the same lock as reservations before reading wall time and quota state.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(27018, 1)`);
      const clock = await tx.execute<{ now: string }>(sql`SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::text AS now`);
      const now = Number(clock[0]?.now);
      if (!Number.isSafeInteger(now) || now <= 0) throw new Error("Invalid quota clock");
      const [global] = await tx.select().from(contactQuota).where(eq(contactQuota.key, "contact:global:v1"));
      if (global) {
        const stamps = global.attempts;
        if (!Array.isArray(stamps) || stamps.length > 100 || stamps.some(n => !Number.isSafeInteger(n) || n < 0 || n > now)) throw new Error("Invalid quota state");
        if (stamps.filter(n => n > now - 3_600_000).length >= 100) await recordContactBudgetAlert(tx);
      }
      // Never blindly replay an uncertain send after the provider's 24h idempotency retention.
      const pending = await tx.select({ id: contactAlert.id }).from(contactAlert)
        .where(sql`sent_at IS NULL AND created_at > clock_timestamp() - interval '23 hours'`)
        .orderBy(contactAlert.createdAt).limit(10);
      const stale = await tx.execute<{ count: string }>(sql`SELECT count(*)::text AS count FROM contact_alert
        WHERE sent_at IS NULL AND created_at <= clock_timestamp() - interval '23 hours'`);
      return { available: true as const, ids: pending.map(r => r.id), staleCount: Number(stale[0]?.count ?? 0) };
    });
  } catch {
    return { available: false as const, ids: [] as string[], staleCount: 0 };
  }
}

export async function deliverContactAlert(id: string, connection: Connection = db,
  send: typeof sendContactControlAlert = sendContactControlAlert) {
  try {
    // Only server-persisted rows can determine mail contents; callers supply an opaque identifier.
    const row = await connection.transaction(async tx => {
      await tx.execute(sql`SET LOCAL statement_timeout = '3s'`);
      const [alert] = await tx.select().from(contactAlert).where(eq(contactAlert.id, id));
      if (!alert || alert.sentAt) return null;
      const [{ recent }] = await tx.execute<{ recent: boolean }>(sql`SELECT ${alert.createdAt.toISOString()}::timestamptz > clock_timestamp() - interval '23 hours' AS recent`);
      if (!recent) throw new Error("Contact alert requires manual delivery review");
      return alert;
    });
    if (!row) return { sent: false, reason: "already_sent_or_missing" };
    const providerId = await send({ id: row.id, kind: "global_budget", observedAt: row.createdAt.toISOString(), attemptCount: 100, synthetic: row.synthetic });
    await connection.transaction(async tx => {
      await tx.execute(sql`SET LOCAL statement_timeout = '3s'`);
      await tx.update(contactAlert).set({ sentAt: sql`clock_timestamp()`, providerId })
        .where(sql`id = ${id} AND sent_at IS NULL`);
    });
    return { sent: true, providerId };
  } catch { throw new Error("Contact alert delivery failed; incident remains pending"); }
}
