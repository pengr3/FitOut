export const BACKGROUND_EVENT = "fitout/background.task";
export const SCHEDULE_HORIZON_DAYS = 27;
export type EntityKind = "booking" | "verification" | "payout" | "contact";
export type WorkKind = "plan" | "expiry" | "payment" | "verification" | "payout" | "settlement" | "contact" |
  "reminder:pre_expiry" | "reminder:pre_sla_host" | "reminder:pre_session_booker" | "reminder:pre_session_host";
export type PlannedWork = { kind: WorkKind; dueAt: string };

export function eventDrivenBackground(): boolean {
  const mode=process.env.BACKGROUND_EXECUTION_MODE;
  if (mode && mode!=="events" && mode!=="polling") throw new Error("BACKGROUND_EXECUTION_MODE must be events or polling.");
  return mode === "events";
}

/** Keep the previous mode available until the additive migration and backfill are verified. */
export function recoveryTriggers(id: string, cron: string) {
  return eventDrivenBackground() ? [{ event: `fitout/recovery.${id}` }] : [{ cron }];
}

export type BookingSchedule = { status: string; expiresAt: string | null; startsAt: string; endsAt: string;
  createdAt: string; checkoutSessionId: string | null; paymentId: string | null };
export type ReminderOffsets = { preExpiry: number; preSla: number; booker: number; host: number };

/** All timestamps come from persisted state and the database clock, never a browser. */
export function planBookingWork(row: BookingSchedule, now: string, offsets: ReminderOffsets, paymentDelayMinutes=2): PlannedWork[] {
  const work: PlannedWork[] = [];
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) throw new Error("Invalid database clock");
  const schedule = (kind: WorkKind, at: string | null) => {
    const ms = Date.parse(at ?? "");
    if (!Number.isFinite(ms)) throw new Error("Invalid persisted deadline");
    work.push({ kind, dueAt: new Date(Math.max(nowMs, ms)).toISOString() });
  };
  const remind = (kind: WorkKind, at: string | null, hours: number) => {
    const deadline = Date.parse(at ?? "");
    const target = deadline - hours * 3_600_000;
    if (Number.isFinite(target) && hours >= 0 && target >= Date.parse(row.createdAt) && deadline > nowMs) {
      schedule(kind, new Date(target).toISOString());
    }
  };
  if (["requested", "pending", "approved"].includes(row.status) && row.expiresAt) schedule("expiry", row.expiresAt);
  if (["pending", "approved"].includes(row.status) && row.checkoutSessionId) {
    schedule("payment", new Date(nowMs + paymentDelayMinutes*60_000).toISOString());
  }
  if (row.status === "requested") remind("reminder:pre_sla_host", row.expiresAt, offsets.preSla);
  if (row.status === "approved") remind("reminder:pre_expiry", row.expiresAt, offsets.preExpiry);
  if (row.status === "confirmed") {
    remind("reminder:pre_session_booker", row.startsAt, offsets.booker);
    remind("reminder:pre_session_host", row.startsAt, offsets.host);
  }
  if (row.paymentId && ["confirmed", "completed", "cancelled"].includes(row.status)) {
    schedule("settlement", new Date(nowMs + 3_600_000).toISOString());
  }
  return work;
}
