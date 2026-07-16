// Payout state badge (HOST-03 / 05-UI-SPEC § Payout state badge recipes). Maps a payout-ledger state to a
// badge that pairs its colour with a distinct lucide icon + text — NEVER colour-only (a11y: the four badges
// are visually close in a table and Held/Processing/Refunded are indistinguishable by hue alone).
//
// Calm-states rule (D-59): Held/Processing/Refunded are NEUTRAL (secondary / outline), Paid is the one
// --success signal (same treatment as the "Confirmed" booking badge), and the internal Failed edge is NOT a
// badge at all — it reuses the destructive Alert pattern (icon + text), mirroring the "Bookings paused"
// banner. No happy state is ever rendered red.
//
// Not "use client" — a pure presentational component the earnings RSC renders directly.

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowLeftRight, CheckCircle2, Clock, Undo2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  derivePayoutLedgerView,
  type PayoutLedgerState,
} from "./payout-ledger-status";

type BadgeVariant = "secondary" | "outline";

// Per-state badge recipe: a distinct icon + (variant | success className). Keyed by STATE (not tone) because
// Held and Refunded share the neutral "muted" tone yet must show different icons (Clock vs Undo2).
const BADGE_RECIPES: Record<
  Exclude<PayoutLedgerState, "failed">,
  { Icon: LucideIcon; variant?: BadgeVariant; className?: string }
> = {
  held: { Icon: Clock, variant: "secondary" },
  processing: { Icon: ArrowLeftRight, variant: "outline" },
  // The one semantic-success surface (mirrors the Confirmed badge). Never a CTA colour.
  paid: { Icon: CheckCircle2, className: "border-transparent bg-success text-success-foreground" },
  refunded: { Icon: Undo2, variant: "secondary", className: "text-muted-foreground" },
};

export function PayoutStateBadge({ state }: { state: PayoutLedgerState }) {
  const view = derivePayoutLedgerView(state);

  // Failed / needs-attention → the destructive Alert pattern (icon + text), NOT a badge (05-UI-SPEC).
  if (view.tone === "attention") {
    return (
      <Alert variant="destructive" className="w-fit border-destructive/40 px-2 py-1">
        <AlertTriangle className="size-4" aria-hidden="true" />
        <AlertDescription className="text-destructive">{view.label}</AlertDescription>
      </Alert>
    );
  }

  const { Icon, variant, className } = BADGE_RECIPES[state as Exclude<PayoutLedgerState, "failed">];
  return (
    <Badge variant={variant} className={cn("gap-1", className)}>
      <Icon className="size-3" aria-hidden="true" />
      {view.label}
    </Badge>
  );
}
