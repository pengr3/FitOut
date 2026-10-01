import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { RowCard } from "@/components/patterns/row-card";
import { PayoutStateBadge } from "./payout-state-badge";
import type { HostEarningStatus } from "./payout-ledger-status";

export type PayoutRowData = {
  bookingId: string; spaceTitle: string; whenLabel: string;
  grossCents: number | null; commissionCents: number | null; netCents: number | null;
  debitCents: number; currency: string; status: HostEarningStatus;
  estimated: boolean; timing: string;
};

export function PayoutRow({ row }: { row: PayoutRowData }) {
  return <RowCard title={row.spaceTitle} meta={<span className="tabular-nums">{row.whenLabel}</span>}
    status={<PayoutStateBadge status={row.status} />}>
    <dl className="min-w-0 space-y-2 text-label">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">Booking</dt>
        <dd className="tabular-nums">{row.grossCents === null ? "—" : formatMoney(row.grossCents, row.currency)}</dd>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">FitOut commission (10%)</dt>
        <dd className="tabular-nums text-muted-foreground">{row.commissionCents === null ? "—" : `−${formatMoney(row.commissionCents, row.currency)}`}</dd>
      </div>
      {row.debitCents > 0 ? <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">Cancellation fee offset</dt>
        <dd className="tabular-nums text-muted-foreground">−{formatMoney(row.debitCents, row.currency)}</dd>
      </div> : null}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <dt className="font-semibold">{row.estimated ? "Estimated payout" : "Your payout"}</dt>
        <dd className={cn("min-w-0 break-words font-semibold tabular-nums", row.status === "refunded" && "text-muted-foreground line-through")}>
          {row.netCents === null ? "Amount being confirmed" : formatMoney(row.netCents, row.currency)}
        </dd>
      </div>
    </dl>
    <p className="break-words text-label text-muted-foreground tabular-nums">{row.timing}</p>
  </RowCard>;
}
