import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowLeftRight, CalendarDays, CheckCircle2, Clock3, Hourglass, Undo2, Wallet } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HostEarningStatus, PayoutLedgerState } from "./payout-ledger-status";

const RECIPES: Record<Exclude<HostEarningStatus, "failed">, { label: string; Icon: LucideIcon; iconClassName?: string }> = {
  upcoming: { label: "Session upcoming", Icon: CalendarDays },
  review: { label: "Review window", Icon: Hourglass },
  clearing: { label: "Payment clearing", Icon: Clock3 },
  scheduled: { label: "Scheduled", Icon: Wallet },
  processing: { label: "Processing", Icon: ArrowLeftRight },
  paid: { label: "Paid", Icon: CheckCircle2, iconClassName: "text-success" },
  refunded: { label: "Refunded", Icon: Undo2 },
};

export function PayoutStateBadge(props: { status?: HostEarningStatus; state?: PayoutLedgerState }) {
  const status: HostEarningStatus = props.status ?? (props.state === "held" ? "clearing" : props.state ?? "clearing");
  if (status === "failed") return <Alert variant="destructive" className="min-w-0 border-destructive/40 px-2 py-1">
    <AlertTriangle className="size-4" aria-hidden="true" />
    <AlertDescription className="text-destructive">Needs attention</AlertDescription>
  </Alert>;
  const { label, Icon, iconClassName } = RECIPES[status];
  return <Badge variant="secondary" className="max-w-full gap-1 whitespace-normal break-words bg-muted text-foreground">
    <Icon className={cn("size-3 shrink-0", iconClassName)} aria-hidden="true" />{label}
  </Badge>;
}
