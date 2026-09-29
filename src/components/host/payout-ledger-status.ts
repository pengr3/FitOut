import type { StatusTone } from "@/lib/design/status-tones";

export type PayoutLedgerState = "held" | "processing" | "paid" | "refunded" | "failed";
export type HostEarningStatus = "upcoming" | "review" | "clearing" | "scheduled" | "processing" | "paid" | "refunded" | "failed";
export type PayoutLedgerView = { label: string; tone: StatusTone; helper?: string; datePrefix: "Expected" | "Paid" | "Refunded" };

/** Legacy booking surfaces use this; earnings uses the evidence-aware projection below. */
export function derivePayoutLedgerView(state: PayoutLedgerState): PayoutLedgerView {
  switch (state) {
    case "held": return { label: "Payment clearing", tone: "neutral", helper: "The guest's payment is confirmed. We're waiting for it to reach FitOut before scheduling your payout.", datePrefix: "Expected" };
    case "processing": return { label: "Processing", tone: "neutral", helper: "We're sending your payout. We'll update this page when it's confirmed.", datePrefix: "Expected" };
    case "paid": return { label: "Paid", tone: "positive", datePrefix: "Paid" };
    case "refunded": return { label: "Refunded", tone: "neutral", helper: "This booking was refunded — no payout.", datePrefix: "Refunded" };
    case "failed": return { label: "Needs attention", tone: "attention", datePrefix: "Expected" };
  }
}

export type PayoutLedgerAmount = { state: PayoutLedgerState; netCents: number };
export function summarizePayouts(rows: PayoutLedgerAmount[]): { upcomingCents: number; paidCents: number } {
  let upcomingCents = 0, paidCents = 0;
  for (const row of rows) {
    if (row.state === "held" || row.state === "processing") upcomingCents += row.netCents;
    if (row.state === "paid") paidCents += row.netCents;
  }
  return { upcomingCents, paidCents };
}

export type EarningSource = {
  bookingId: string; hostId: string; createdAt: Date; startsAt: Date; endsAt: Date;
  bookingStatus: "confirmed" | "cancelled";
  spacePriceCents: number | null; retainedSpaceCents: number | null;
  currency: string; title: string | null; timezone: string;
  ledger: null | { grossCents: number; commissionCents: number; netCents: number; recoveredCents: number;
    state: PayoutLedgerState; transferId: string | null; paidAt: Date | null };
  settlement: null | { depositedAt: Date; verifiedAt: Date };
  /** Owner-scoped, derived public category only. No audit cause or provider detail enters this type. */
  attention?: boolean;
};
export type HostEarning = EarningSource & { grossCents: number | null; commissionCents: number | null;
  netCents: number | null; debitCents: number; estimated: boolean; status: HostEarningStatus;
  fridayNoon: Date | null; timing: string };

const HOUR = 3_600_000;
function nextSupportedFriday(now: Date, eligibleAt: Date): Date {
  const manila = new Date(now.getTime() + 8 * HOUR);
  const days = (5 - manila.getUTCDay() + 7) % 7;
  const noon = new Date(Date.UTC(manila.getUTCFullYear(), manila.getUTCMonth(), manila.getUTCDate() + days, 4));
  if (noon <= now) noon.setUTCDate(noon.getUTCDate() + 7);
  while (noon < eligibleAt) noon.setUTCDate(noon.getUTCDate() + 7);
  return noon;
}

/** The caller provides owner-scoped rows and current correlated settlement proof; this repeats the owner guard. */
export function projectHostEarnings(rows: EarningSource[], hostId: string, now: Date, holdHours: number,
  commissionRateBps: number, fridayPolicyValidated: boolean, outstandingDebitCents = 0): HostEarning[] {
  let remainingDebit = Math.max(0, outstandingDebitCents);
  const byBooking = new Map<string, EarningSource>();
  for (const row of rows) if (row.hostId === hostId) byBooking.set(row.bookingId, row);
  return [...byBooking.values()]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.bookingId.localeCompare(a.bookingId))
    .map((row) => {
      const estimated = !row.ledger;
      const basis = row.retainedSpaceCents ?? row.spacePriceCents;
      const known = basis !== null && Number.isSafeInteger(basis) && basis >= 0 &&
        Number.isSafeInteger(commissionRateBps) && commissionRateBps >= 0 && commissionRateBps <= 10_000;
      const grossCents = row.ledger?.grossCents ?? (known ? basis : null);
      const commissionCents = row.ledger?.commissionCents ?? (known ? Math.round((basis as number) * commissionRateBps / 10_000) : null);
      const beforeDebit = row.ledger?.netCents ?? (grossCents !== null && commissionCents !== null ? grossCents - commissionCents : null);
      const debitCents = row.ledger?.recoveredCents ?? (beforeDebit === null ? 0 : Math.min(remainingDebit, beforeDebit));
      if (estimated) remainingDebit -= debitCents;
      const netCents = beforeDebit === null ? null : Math.max(0, beforeDebit - debitCents);
      const holdEnd = new Date(row.endsAt.getTime() + holdHours * HOUR);
      let status: HostEarningStatus = "clearing", fridayNoon: Date | null = null;
      let timing = "The guest's payment is confirmed. We're waiting for it to reach FitOut before scheduling your payout.";
      if (row.ledger?.state === "refunded" || (row.bookingStatus === "cancelled" && (row.retainedSpaceCents ?? 0) <= 0)) {
        status = "refunded"; timing = "This booking was refunded — no payout.";
      } else if (row.ledger?.state === "paid") {
        if (row.ledger.transferId && row.ledger.paidAt) {
          status = "paid";
          timing = `Paid ${new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" }).format(row.ledger.paidAt)}`;
        } else if (!row.ledger.transferId && row.ledger.paidAt &&
          row.ledger.recoveredCents === row.ledger.netCents) {
          status = "paid";
          timing = row.ledger.recoveredCents > 0
            ? "Settled by cancellation fee offset; no cash transfer was needed."
            : "Settled with no cash payout.";
        } else { status = "failed"; timing = "We're checking a delay with this payout. You don't need to request it again."; }
      } else if (row.attention) {
        status = "failed"; timing = "We're checking a delay with this payout. You don't need to request it again.";
      } else if (row.ledger?.state === "failed") {
        status = "failed"; timing = "We're checking a delay with this payout. You don't need to request it again.";
      } else if (row.ledger) {
        status = "processing"; timing = "We're sending your payout. We'll update this page when it's confirmed.";
      } else if (now < row.endsAt) {
        status = "upcoming"; timing = "Your payout can be reviewed after the session ends.";
      } else if (now < holdEnd) {
        status = "review"; timing = "Your session has ended. Payout review continues for at least 24 hours.";
      } else if (fridayPolicyValidated && row.settlement && row.settlement.verifiedAt <= now &&
        now.getTime() - row.settlement.verifiedAt.getTime() <= 24 * HOUR && row.settlement.depositedAt <= now) {
        status = "scheduled";
        fridayNoon = nextSupportedFriday(now, new Date(Math.max(holdEnd.getTime(), row.settlement.depositedAt.getTime(), row.settlement.verifiedAt.getTime())));
        const date = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(fridayNoon);
        timing = `Next eligible release: ${date} at 12:00 Manila time. Subject to final payout checks.`;
      }
      return { ...row, grossCents, commissionCents, netCents, debitCents, estimated, status, fridayNoon, timing };
    });
}

export function summarizeHostEarnings(rows: HostEarning[]): { upcomingCents: number; paidCents: number; hasEstimate: boolean } {
  let upcomingCents = 0, paidCents = 0, hasEstimate = false;
  for (const row of rows) {
    if (row.netCents === null) continue;
    if (row.status === "paid") paidCents += row.netCents;
    else if (row.status !== "refunded" && row.status !== "failed") {
      upcomingCents += row.netCents;
      hasEstimate ||= row.estimated;
    }
  }
  return { upcomingCents, paidCents, hasEstimate };
}
