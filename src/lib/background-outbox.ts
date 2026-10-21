import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import type { DbConn } from "@/lib/availability/read-model";
import { db } from "@/lib/db";
import { BACKGROUND_EVENT, eventDrivenBackground, SCHEDULE_HORIZON_DAYS, type EntityKind, type PlannedWork, type WorkKind } from "@/lib/background-policy";

export type BackgroundTask = { id: string; entityKind: EntityKind; entityId: string; kind: WorkKind;
  dueAt: string; generation: string; checkNumber: number };

export async function readBackgroundTask(id: string, connection: DbConn = db): Promise<BackgroundTask | null> {
  const [row] = await connection.execute(sql`SELECT id,entity_kind AS "entityKind",entity_id AS "entityId",kind,
    due_at::text AS "dueAt",generation,check_number AS "checkNumber" FROM background_task
    WHERE id=${id} AND completed_at IS NULL AND cancelled_at IS NULL`) as unknown as BackgroundTask[];
  return row ? { ...row,dueAt:new Date(row.dueAt).toISOString() } : null;
}

export async function addBackgroundWork(parent: BackgroundTask, work: PlannedWork[], connection: DbConn = db,
  checkNumber = 0): Promise<void> {
  for (const item of work) {
    // Stable across retries, including retries outside Inngest's event-deduplication retention.
    const id = createHash("sha256").update(`${parent.id}:${item.kind}:${checkNumber}`).digest("hex");
    await connection.execute(sql`WITH parent AS (SELECT id FROM background_task WHERE id=${parent.id}
        AND cancelled_at IS NULL AND completed_at IS NULL FOR UPDATE)
      INSERT INTO background_task
      (id,entity_kind,entity_id,kind,due_at,available_at,generation,check_number)
      SELECT ${id},${parent.entityKind},${parent.entityId},${item.kind},${item.dueAt}::timestamptz,
        GREATEST(now(),${item.dueAt}::timestamptz-make_interval(days=>${SCHEDULE_HORIZON_DAYS})),${parent.generation},${checkNumber}
      FROM parent
      ON CONFLICT (id) DO NOTHING`);
  }
}

export async function completeBackgroundTask(id: string, connection: DbConn = db): Promise<void> {
  await connection.execute(sql`UPDATE background_task SET completed_at=now(),lease_until=NULL WHERE id=${id} AND completed_at IS NULL`);
}

/** Claim, commit, publish over HTTP, then acknowledge. No database lock spans a network call. */
export async function dispatchBackgroundTasks(connection: DbConn = db,
  send: (events: Array<{ id: string; name: string; data: { taskId: string } }>) => Promise<unknown> = events => inngest.send(events)) {
  if (!eventDrivenBackground()) return { published: 0, enabled: false };
  let published = 0;
  // Bounded request work. A follow-up event drains larger batches; the daily audit repairs crash gaps.
  for (let batch = 0; batch < 5; batch++) {
    const rows = await connection.execute(sql`WITH ready AS (
      SELECT id FROM background_task WHERE published_at IS NULL AND completed_at IS NULL AND cancelled_at IS NULL
        AND available_at<=now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY due_at,id LIMIT 100 FOR UPDATE SKIP LOCKED
      ) UPDATE background_task t SET lease_until=now()+interval '2 minutes',publish_attempts=publish_attempts+1
      FROM ready WHERE t.id=ready.id RETURNING t.id,t.publish_attempts AS attempt`) as unknown as { id: string; attempt: number }[];
    if (!rows.length) break;
    const ids = rows.map(row => row.id);
    try {
      await send(rows.map(row => ({ id: `background:${row.id}:${row.attempt}`, name: BACKGROUND_EVENT, data: { taskId: row.id } })));
      await connection.execute(sql`UPDATE background_task SET published_at=now(),lease_until=NULL WHERE id IN ${sql`(${sql.join(ids.map(id => sql`${id}`),sql`,`)})`}`);
      published += rows.length;
    } catch {
      await connection.execute(sql`UPDATE background_task SET lease_until=NULL WHERE id IN ${sql`(${sql.join(ids.map(id => sql`${id}`),sql`,`)})`}`);
      throw new Error("Background event delivery failed; durable work remains pending.");
    }
    if (rows.length < 100) break;
  }
  return { published, enabled: true };
}

/** Do not expose a payable checkout until its committed scheduling event has been accepted. */
export async function requireBookingBackgroundDelivery(bookingId: string, connection: DbConn = db): Promise<void> {
  if (!eventDrivenBackground()) return;
  await dispatchBackgroundTasks(connection);
  const rows = await connection.execute(sql`SELECT id FROM background_task WHERE entity_kind='booking' AND entity_id=${bookingId}
    AND kind='plan' AND cancelled_at IS NULL AND completed_at IS NULL AND published_at IS NULL LIMIT 1`);
  if (rows.length) throw new Error("Checkout scheduling is pending; please retry.");
}
