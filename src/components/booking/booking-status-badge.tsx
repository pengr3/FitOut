// Booking lifecycle status badge (MANAGE-02 / 07-UI-SPEC § Status badge matrix). Maps a booking status to
// a badge that pairs its tone with a distinct lucide icon + text — NEVER colour-only (a11y: the neutral
// badges are hue-indistinguishable by design, and they sit in adjacent table columns).
//
// Shared by BOTH sides: /bookings, /host/bookings and /bookings/[id] all render this one component, so the
// booker and host vocabularies can never drift. Clones ../host/payout-state-badge.tsx structurally.
//
// Calm-states rule (07-UI-SPEC § Color): pending/requested/approved/completed/declined/cancelled are
// NEUTRAL (`approved` included — it is NOT paid yet), and `confirmed` is the one --success signal. No
// lifecycle state is ever rendered red — red is reserved for genuine failure edges inherited from Phase 5.
//
// DS-10 / D-14 — GREEN RETREATS TO THE ICON. `confirmed` used to be a FILLED green badge with pale text
// on it; that pairing measured 3.24:1 and is retired. It is now the `positive` recipe from
// @/lib/design/status-tones: full-contrast ink on the neutral tint, with the hue confined to the
// CheckCircle2 glyph (success on muted, 3.67 court / 3.54 grove, against a 3:1 non-text bar). The classes
// are written literally here — the repo's convention for a call site, matching the soft-accent chip in
// availability/spots-left-chip.tsx — and `tests/design/status-vocab.test.ts` pins them BY VALUE against
// STATUS_TONE_RECIPES, so a drift between this file and the vocabulary goes red rather than unnoticed.
//
// ⚠️ D-79 — THE LOAD-BEARING RULE: this component returns ONLY the badge. Refund detail ("₱500 refunded")
// renders as a SIBLING line beneath it, composed by the ROW or PAGE — it is NEVER interpolated into the
// label. Badges are a fixed-width, fixed-vocabulary element shared with a desktop table column: a variable
// money string inside one breaks column widths and the badge grammar everywhere. The caller owns the copy
// variants — full → `₱1,000 refunded`; partial → `₱500 refunded`; zero → `No refund — cancelled inside the
// no-refund window`. NEVER render a bare `₱0 refunded` without the reason.
//
// Not a client component — a pure presentational component the bookings RSCs render directly.

import type { LucideIcon } from "lucide-react";
import { Ban, CalendarCheck, Check, CheckCircle2, CircleDashed, Hourglass, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  deriveBookingStatusView,
  deriveDisplayStatus,
  type BookingDbStatus,
  type BookingDisplayStatus,
  type BookingSide,
} from "./booking-status";

type BadgeVariant = "secondary" | "outline";

// Per-status badge recipe: a distinct icon + (variant | success className). Keyed by DISPLAY STATUS (not
// tone) because completed, declined and cancelled all share the neutral "muted" tone yet must show
// different icons (Check vs XCircle vs Ban) — the same reason payout-state-badge keys by state.
const BADGE_RECIPES: Record<
  BookingDisplayStatus,
  { Icon: LucideIcon; variant?: BadgeVariant; className?: string; iconClassName?: string }
> = {
  pending: { Icon: CircleDashed, variant: "secondary" },
  requested: { Icon: Hourglass, variant: "secondary" },
  approved: { Icon: CalendarCheck, variant: "outline" },
  // The one semantic-success signal (mirrors the Paid payout badge). Never a CTA colour, and never a
  // fill: DS-10's `positive` recipe is ink on the neutral tint with the hue in the glyph alone.
  confirmed: {
    Icon: CheckCircle2,
    className: "border-transparent bg-muted text-foreground",
    iconClassName: "text-success",
  },
  completed: { Icon: Check, variant: "secondary", className: "text-muted-foreground" },
  declined: { Icon: XCircle, variant: "secondary", className: "text-muted-foreground" },
  cancelled: { Icon: Ban, variant: "secondary", className: "text-muted-foreground" },
};

/**
 * `now` must come from the DB clock at the call site (D-102 / T-07-10) — passing a client clock could show
 * a booking as Completed on one surface and Confirmed on another.
 */
export function BookingStatusBadge({
  status,
  endsAt,
  now,
  side,
  cancelledBy,
}: {
  status: BookingDbStatus;
  endsAt: Date;
  now: Date;
  side: BookingSide;
  /** T8: passed to BOTH derivations so the recipe (icon/variant) and the label agree — a booker-cancelled
   *  `declined` request reads Cancelled/Ban, a genuine host decline stays Declined/XCircle. */
  cancelledBy?: string | null;
}) {
  const view = deriveBookingStatusView(status, endsAt, now, side, cancelledBy);
  const display = deriveDisplayStatus(status, endsAt, now, cancelledBy);
  const { Icon, variant, className, iconClassName } = BADGE_RECIPES[display];

  return (
    <Badge variant={variant} className={cn("gap-1", className)}>
      <Icon className={cn("size-3", iconClassName)} aria-hidden="true" />
      {view.label}
    </Badge>
  );
}
