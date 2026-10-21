import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { DbConn } from "@/lib/availability/read-model";
import { planBookingWork, type BookingSchedule, type PlannedWork } from "@/lib/background-policy";
import { addBackgroundWork, completeBackgroundTask, readBackgroundTask, type BackgroundTask } from "@/lib/background-outbox";
import { PRE_EXPIRY_REMINDER_HOURS, PRE_SLA_REMINDER_HOURS, PRE_SESSION_BOOKER_REMINDER_HOURS, PRE_SESSION_HOST_REMINDER_HOURS } from "@/lib/payments/config";
import { queryUnconfirmedPaid, reconcileOne as reconcilePayment, RECONCILE_INTERVAL_MINUTES, RECONCILE_MIN_AGE_MINUTES } from "@/inngest/functions/payment-reconcile";
import { queryExpired, expireOne } from "@/inngest/functions/request-expiry";
import { queryRetirableSessions, retireOne, RETIRE_INTERVAL_MINUTES } from "@/inngest/functions/checkout-retire";
import { remindOne, type ReminderKind } from "@/inngest/functions/reminders";
import { queryStalePendingVerifications, reconcileOne as reconcileVerification, DIDIT_RECONCILE_INTERVAL_MINUTES } from "@/inngest/functions/didit-reconcile";
import { queryProcessingLedger, reconcileOne as reconcilePayout, alertStuckHeld } from "@/inngest/functions/payout-reconcile";
import { configuredSettlementAccount, paymongoReader, refreshBookingSettlement } from "@/inngest/functions/settlement-reconcile";
import { deliverContactAlert } from "@/lib/contact-alerts";
import { DIDIT_RECONCILE_GRACE_MINUTES } from "@/lib/host/verification-cooldown";

async function databaseNow(connection: DbConn): Promise<string> {
  const [row] = await connection.execute(sql`SELECT now()::text AS now`) as unknown as { now: string }[];
  return new Date(row.now).toISOString();
}

async function readBooking(id: string, connection: DbConn) {
  const [row] = await connection.execute(sql`SELECT status,expires_at::text AS "expiresAt",starts_at::text AS "startsAt",
    ends_at::text AS "endsAt",created_at::text AS "createdAt",checkout_session_id AS "checkoutSessionId",payment_id AS "paymentId"
    FROM booking WHERE id=${id}`) as unknown as BookingSchedule[];
  return row;
}

async function plan(task: BackgroundTask, connection: DbConn) {
  const now = await databaseNow(connection);
  let work: PlannedWork[] = [];
  if (task.entityKind === "booking") {
    const row = await readBooking(task.entityId, connection);
    if (row) work = planBookingWork(row, now, {preExpiry: PRE_EXPIRY_REMINDER_HOURS, preSla: PRE_SLA_REMINDER_HOURS,
      booker: PRE_SESSION_BOOKER_REMINDER_HOURS, host: PRE_SESSION_HOST_REMINDER_HOURS},RECONCILE_MIN_AGE_MINUTES);
  } else if (task.entityKind === "verification") {
    const [row] = await connection.execute(sql`SELECT (updated_at+make_interval(mins=>${DIDIT_RECONCILE_GRACE_MINUTES}))::text AS due FROM host_verification
      WHERE user_id=${task.entityId} AND status='pending' AND vendor_ref IS NOT NULL`) as unknown as { due: string }[];
    if (row) work = [{kind:"verification",dueAt:new Date(Math.max(Date.parse(now),Date.parse(row.due))).toISOString()}];
  } else if (task.entityKind === "payout") {
    const [row] = await connection.execute(sql`SELECT id FROM host_payout_ledger WHERE id=${task.entityId}
      AND kind='payout' AND state IN ('held','processing')`) as unknown as { id: string }[];
    if (row) work = [{kind:"payout",dueAt:new Date(Date.parse(now)+300_000).toISOString()}];
  } else if (task.entityKind === "contact") {
    const [row] = await connection.execute(sql`SELECT id FROM contact_alert WHERE id=${task.entityId} AND sent_at IS NULL
      AND created_at>now()-interval '23 hours'`) as unknown as { id: string }[];
    if (row) work = [{kind:"contact",dueAt:now}];
  }
  // Lock only the outbox parent. Domain changes cancel it and its children atomically after this commits.
  await connection.transaction(async tx => {
    const rows = await tx.execute(sql`SELECT id FROM background_task WHERE id=${task.id}
      AND cancelled_at IS NULL AND completed_at IS NULL FOR UPDATE`);
    if (!rows.length) return;
    await addBackgroundWork(task,work,tx as unknown as DbConn);
    await completeBackgroundTask(task.id,tx as unknown as DbConn);
  });
}

/** Each wakeup scopes its reads to one persisted entity. Existing payment/state policies remain authoritative. */
export async function processBackgroundTask(id: string, connection: DbConn = db) {
  const task = await readBackgroundTask(id,connection);
  if (!task) return { state:"obsolete" };
  const now = await databaseNow(connection);
  if (Date.parse(task.dueAt)>Date.parse(now)) throw new Error("Background task is not due yet.");
  if (task.kind === "plan") { await plan(task,connection); return {state:"planned"}; }
  let againMinutes: number | null = null;
  let maxChecks = 500;
  if (task.entityKind === "booking" && ["payment","expiry"].includes(task.kind)) {
    const [candidate] = await queryUnconfirmedPaid(connection,task.entityId);
    if (candidate) {
      const result = await reconcilePayment(candidate,connection);
      if (result.outcome === "unknown") throw new Error("Payment state is unavailable; retry this booking only.");
    }
    if (task.kind === "expiry") {
      const [expired] = await queryExpired(connection,task.entityId);
      if (expired) await expireOne(connection,expired);
      const [session] = await queryRetirableSessions(connection,task.entityId);
      if (session) {
        const result = await retireOne(session);
        if (["unknown","failed"].includes(result.outcome)) throw new Error("Checkout retirement needs retry.");
      }
    }
    const current = await readBooking(task.entityId,connection);
    if (current && ["pending","approved"].includes(current.status) && current.checkoutSessionId && current.expiresAt &&
        Date.parse(now)<Date.parse(current.expiresAt)+1_800_000) againMinutes=task.kind === "expiry" ? RETIRE_INTERVAL_MINUTES : RECONCILE_INTERVAL_MINUTES;
  } else if (task.entityKind === "booking" && task.kind.startsWith("reminder:")) {
    await remindOne(connection,{bookingId:task.entityId,kind:task.kind.slice(9) as ReminderKind});
  } else if (task.entityKind === "verification" && task.kind === "verification") {
    const [row] = await queryStalePendingVerifications(connection,task.entityId);
    if (row) {
      const result = await reconcileVerification(row);
      if (result.outcome !== "recovered") againMinutes=DIDIT_RECONCILE_INTERVAL_MINUTES;
    }
    maxChecks=24;
  } else if (task.entityKind === "payout" && task.kind === "payout") {
    const [row] = await queryProcessingLedger(connection,task.entityId);
    if (row) {
      const result = await reconcilePayout(row,connection);
      if (["held","processing"].includes(result.state)) againMinutes=30;
      await alertStuckHeld(connection,row.bookingId);
    }
    maxChecks=96;
  } else if (task.entityKind === "booking" && task.kind === "settlement") {
    const account = configuredSettlementAccount();
    if (account) {
      const result = await refreshBookingSettlement(task.entityId,paymongoReader,account,connection);
      if (result.state !== "proved") againMinutes=60;
    }
    maxChecks=48;
  } else if (task.entityKind === "contact" && task.kind === "contact") {
    await deliverContactAlert(task.entityId);
  } else throw new Error("Unknown background task kind.");
  if (againMinutes !== null && task.checkNumber<maxChecks) {
    const nextNow = await databaseNow(connection);
    await addBackgroundWork(task,[{kind:task.kind,dueAt:new Date(Date.parse(nextNow)+againMinutes*60_000).toISOString()}],connection,task.checkNumber+1);
  } else if (againMinutes !== null) console.error("[background] recovery requires daily audit",{taskId:task.id});
  await completeBackgroundTask(task.id,connection);
  return {state:"completed"};
}

/** One daily repair, including old data and publishers/workers that died after accepting delivery. */
export async function repairBackgroundWork(connection: DbConn = db) {
  await connection.execute(sql`UPDATE background_task SET published_at=NULL,lease_until=NULL
    WHERE completed_at IS NULL AND cancelled_at IS NULL AND published_at IS NOT NULL AND due_at<now()-interval '1 hour'`);
  const rows = await connection.execute(sql`WITH entities AS (
    SELECT 'booking' AS kind,id FROM booking WHERE status IN ('requested','pending','approved','confirmed')
    UNION ALL SELECT 'verification',user_id FROM host_verification WHERE status='pending' AND vendor_ref IS NOT NULL
    UNION ALL SELECT 'payout',id FROM host_payout_ledger WHERE kind='payout' AND state IN ('held','processing')
    UNION ALL SELECT 'contact',id FROM contact_alert WHERE sent_at IS NULL AND created_at>now()-interval '23 hours'
    ), missing AS (SELECT e.* FROM entities e WHERE NOT EXISTS (
      SELECT 1 FROM background_task t WHERE t.entity_kind=e.kind AND t.entity_id=e.id AND t.completed_at IS NULL AND t.cancelled_at IS NULL
    ) LIMIT 1000), new_tasks AS (SELECT gen_random_uuid()::text AS task_id,* FROM missing)
    INSERT INTO background_task(id,entity_kind,entity_id,kind,generation,due_at,available_at)
    SELECT task_id,kind,id,'plan',task_id,now(),now() FROM new_tasks RETURNING id`);
  return {repaired:rows.length};
}
