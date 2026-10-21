import { inngest } from "@/inngest/client";
import { BACKGROUND_EVENT, eventDrivenBackground } from "@/lib/background-policy";
import { dispatchBackgroundTasks, readBackgroundTask } from "@/lib/background-outbox";
import { processBackgroundTask, repairBackgroundWork } from "@/lib/background-work";
import { configuredSettlementAccount,paymongoReader,querySettlementRefreshCandidates,refreshBookingSettlement } from "@/inngest/functions/settlement-reconcile";
import { alertStuckHeld } from "@/inngest/functions/payout-reconcile";
import { db } from "@/lib/db";

export const backgroundWork = inngest.createFunction({
  id:"background-work",retries:8,
  concurrency:[{limit:1,key:"event.data.taskId"},{limit:20}],
  triggers:[{event:BACKGROUND_EVENT}],
},async ({event,step}) => {
  if (!eventDrivenBackground()) return {enabled:false};
  const id = event.data?.taskId;
  if (typeof id !== "string" || id.length>128) throw new Error("Invalid background task identifier.");
  const task = await step.run("read-persisted-deadline",()=>readBackgroundTask(id));
  if (!task) return {state:"obsolete"};
  if (Date.parse(task.dueAt)>Date.now()+28*86_400_000) throw new Error("Background work was published outside the scheduling horizon.");
  // Future reminders enter the queue only within 27 days: below Free's 30-day run limit.
  await step.sleepUntil("wait-for-deadline",task.dueAt);
  const result = await step.run("process-current-state",()=>processBackgroundTask(id));
  await step.run("publish-follow-up-work",()=>dispatchBackgroundTasks());
  return result;
});

export const backgroundRecoveryAudit = inngest.createFunction({
  id:"background-recovery-audit",concurrency:1,
  triggers:eventDrivenBackground() ? [{cron:"TZ=Asia/Manila 0 8 * * *"}] : [{event:"fitout/background.audit"}],
},async ({step}) => {
  if (!eventDrivenBackground()) return {enabled:false};
  const result = await step.run("repair-pending-work",()=>repairBackgroundWork());
  await step.run("audit-stuck-payout-claims",()=>alertStuckHeld());
  // Continue watching settlement returns after a transfer completes, without an hourly empty scan.
  const account=configuredSettlementAccount();
  if (account) {
    const candidates=await step.run("audit-settlement-candidates",()=>querySettlementRefreshCandidates());
    for (const row of candidates) await step.run(`audit-settlement-${row.bookingId}`,()=>refreshBookingSettlement(row.bookingId,paymongoReader,account,db));
  }
  await step.run("publish-pending-work",()=>dispatchBackgroundTasks());
  return result;
});
