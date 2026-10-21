import { after } from "next/server";
import { eventDrivenBackground } from "@/lib/background-policy";

/** Register before the mutation; Next invokes the dispatcher after its response/commit. */
export function dispatchBackgroundAfterResponse(): void {
  if (!eventDrivenBackground()) return;
  after(async () => {
    try {
      const { dispatchBackgroundTasks } = await import("@/lib/background-outbox");
      await dispatchBackgroundTasks();
    }
    catch { console.error("[background] delivery pending; durable outbox retained"); }
  });
}
