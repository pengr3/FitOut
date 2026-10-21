import { eventDrivenBackground } from "@/lib/background-policy";
import { Inngest } from "inngest";
import { inspectContactAlerts, deliverContactAlert } from "@/lib/contact-alerts";
import { contactAlertMonitorEnabled, sendContactControlAlert } from "@/lib/contact-alert-mail";

// Separate app and endpoint: registering Contact never changes the existing money jobs.
export const contactAlertClient = new Inngest({ id: "fitout-contact-alerts" });
export const contactAlertMonitor = contactAlertClient.createFunction({
  id: "contact-control-monitor", retries: 5, concurrency: 1,
  triggers: [{ cron: eventDrivenBackground() ? "TZ=Asia/Manila 0 8 * * *" : "1-59/5 * * * *" }],
}, async ({ step, event }) => {
  if (!contactAlertMonitorEnabled()) return { active: false };
  const state = await step.run("inspect-contact-controls", () => inspectContactAlerts());
  if (!state.available) {
    // Scheduler-owned durable steps work even when the application database is offline.
    // Constant body and key within the UTC hour suppress repeated outage notifications.
    const hour = Math.floor(event.ts / 3_600_000);
    await step.run("notify-quota-unavailable", () => sendContactControlAlert({
      id: "quota-unavailable-" + hour, kind: "quota_unavailable",
      observedAt: new Date(hour * 3_600_000).toISOString(),
    }));
    return { active: true, quotaAvailable: false };
  }
  for (const id of state.ids) await step.run("deliver-" + id, () => deliverContactAlert(id));
  if (state.staleCount) console.error("Contact alerts require manual delivery review", { count: state.staleCount });
  return { active: true, quotaAvailable: true, pendingProcessed: state.ids.length, staleCount: state.staleCount };
});
