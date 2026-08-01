"use client";

// Listing card — the host "Your listings" grid tile (LIST-05), forward-compatible with Phase-4
// search cards. Presentational by default (cover / title / primary type / "hourly · day" price /
// status badge); when the host-action props (editHref / onUnlist / onDelete) are supplied it also
// renders the per-card actions (edit link + reversible unlist + destructive soft-delete), each behind
// a confirm dialog per the UI-SPEC. Search cards omit those props, so no host controls render there.
//
// Status badge (UI-SPEC): draft → "Draft" (neutral); published+bookable → "Live" (success);
// published-not-payable → "Published · not bookable" (neutral); unlisted → "Unlisted" (neutral).
// bookable is DERIVED upstream (deriveBookable) and passed in — the card never re-derives it.
//
// PHASE 9 (09-UI-SPEC § 4, final paragraph): a drop-in listing's price line reads `₱…/person`, composed by
// the SAME `allInRateParts` open branch the search card and the listing rail use — one definition of what
// a per-person rate says, so the three surfaces cannot drift.
//
// There is deliberately NO `Drop-in` badge and NO spots-left chip on this card, and adding them later is
// not a consistency fix. This is a MANAGEMENT surface, not a marketplace one: the host chose how the space
// is sold and does not need to be told, the status badge is the one badge this tile carries, and scarcity
// is a booker-facing signal about a SPECIFIC DATE — which this card has no date to be about.

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PencilIcon, CalendarClock } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SPACE_TYPE_LABELS, type SpaceTypeValue } from "@/lib/listing-vocab";
import { allInRateParts } from "@/lib/booking/all-in-rate";
import { formatMoney } from "@/lib/money";
import {
  HOURS_MISSING_STATE,
  HOURS_MISSING_REASON,
  HOURS_MISSING_CTA,
} from "@/lib/listing/hours-signal";

export type ListingCardData = {
  id: string;
  title: string | null;
  primarySpaceType: SpaceTypeValue | null;
  hourlyRateCents: number | null;
  dayRateCents: number | null;
  currency: string;
  status: "draft" | "published" | "unlisted";
  coverUrl: string | null;
  /**
   * Phase 9 (OC-01). How the space is sold. The price line forks on THIS and never on the accident of a
   * null rate column — 09-06 requires a per-head price but never CLEARS hourly/day, and OC-17 lets a host
   * switch modes, so a drop-in listing can genuinely still carry both exclusive rates (09-07's lesson).
   *
   * REQUIRED, not optional-with-a-default: the column is NOT NULL, and a defaulted mode here would quietly
   * price a drop-in listing by the hour on the host's own dashboard.
   */
  occupancyMode: "exclusive" | "open_capacity";
  /** Phase 9 (D-125). The per-person day-pass base price; null on every exclusive listing. */
  perHeadPriceCents: number | null;
};

type ActionResult = { ok: boolean; error?: string };

function statusBadge(status: ListingCardData["status"], bookable: boolean) {
  if (status === "published" && bookable) {
    return {
      label: "Live",
      variant: "default" as const,
      className: "border-transparent bg-success text-success-foreground",
    };
  }
  if (status === "published") {
    return { label: "Published · not bookable", variant: "secondary" as const, className: "" };
  }
  if (status === "unlisted") {
    return { label: "Unlisted", variant: "secondary" as const, className: "" };
  }
  return { label: "Draft", variant: "secondary" as const, className: "" };
}

/** A confirm dialog that runs an async action and closes only on success. */
function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  confirmVariant,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant: "secondary" | "destructive";
  onConfirm: () => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant={confirmVariant}
            disabled={pending}
            onClick={async () => {
              setPending(true);
              const ok = await onConfirm();
              setPending(false);
              if (ok) setOpen(false);
            }}
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ListingCard({
  listing,
  bookable = false,
  hoursMissing = false,
  editHref,
  availabilityHref,
  onUnlist,
  onDelete,
}: {
  listing: ListingCardData;
  bookable?: boolean;
  /**
   * v1.0 audit finding #4. This listing is published and has no weekly hours, so every date reads as
   * closed to a booker. DERIVED UPSTREAM in one grouped query (loadPublishedListingsMissingHours) and
   * passed in — the card never asks the DB, and never re-derives it from anything on `listing`.
   *
   * It changes NOTHING about bookability or the badge: a listing with no hours still reads "Live" if it
   * is otherwise bookable, and the notice sits below as additional information. That is the decided
   * behaviour (this is a signal, not a gate).
   */
  hoursMissing?: boolean;
  editHref?: string;
  availabilityHref?: string;
  onUnlist?: (id: string) => Promise<ActionResult>;
  onDelete?: (id: string) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const badge = statusBadge(listing.status, bookable);
  const hasActions = Boolean(editHref || availabilityHref || onUnlist || onDelete);

  // The price line. A drop-in listing is priced per person, and that string comes from the ONE shared
  // definition (`allInRateParts`) rather than being spelled a second time here — the alternative is two
  // places for the `/person` unit and the fee rule to drift apart, on surfaces the same host reads.
  //
  // Note the deliberate asymmetry, which 09-UI-SPEC § 4 asks for: the `/person` part is the ADVERTISED
  // all-in rate (what a booker is quoted, D-75), while the `/hr` and `/day` parts below print the raw rate
  // the host set, exactly as they have always done. The drop-in line is the number the host's own listing
  // shows in search — no card arithmetic in either branch.
  const priceParts: string[] = [];
  if (listing.occupancyMode === "open_capacity") {
    priceParts.push(
      ...allInRateParts(
        {
          hourlyRateCents: listing.hourlyRateCents,
          dayRateCents: listing.dayRateCents,
          perHeadPriceCents: listing.perHeadPriceCents,
          occupancyMode: listing.occupancyMode,
        },
        listing.currency,
      ),
    );
  } else {
    if (listing.hourlyRateCents != null) {
      priceParts.push(`${formatMoney(listing.hourlyRateCents, listing.currency)}/hr`);
    }
    if (listing.dayRateCents != null) {
      priceParts.push(`${formatMoney(listing.dayRateCents, listing.currency)}/day`);
    }
  }

  // The no-hours sentence, assembled as ONE string (the cancellation-fee-notice.tsx lesson: SWC's JSX
  // whitespace transform strips the leading space of text following an expression container, which is how
  // "₱300.00in cancellation fees" once shipped). The `availabilityHref` half of the guard is what keeps
  // this a HOST-ONLY signal (T-IU7-02): a Phase-4 search card passes neither prop, so it is structurally
  // unable to render a management notice — not merely conventionally unlikely to.
  const hoursNotice =
    hoursMissing && availabilityHref ? `${HOURS_MISSING_STATE} — ${HOURS_MISSING_REASON}` : null;

  async function runAction(
    action: (id: string) => Promise<ActionResult>,
    successMsg: string,
  ): Promise<boolean> {
    const res = await action(listing.id);
    if (!res.ok) {
      toast.error(res.error ?? "Something went wrong. Try again.");
      return false;
    }
    toast.success(successMsg);
    router.refresh();
    return true;
  }

  return (
    <Card className="gap-0 pt-0">
      <AspectRatio ratio={4 / 3} className="bg-muted">
        {listing.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.coverUrl}
            alt={listing.title ?? "Listing photo"}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
            No photos yet
          </div>
        )}
      </AspectRatio>

      <CardContent className="space-y-1 py-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium leading-snug">{listing.title || "Untitled listing"}</h3>
          <Badge variant={badge.variant} className={badge.className}>
            {badge.label}
          </Badge>
        </div>
        {listing.primarySpaceType && (
          <p className="text-sm text-muted-foreground">
            {SPACE_TYPE_LABELS[listing.primarySpaceType]}
          </p>
        )}
        <p className="text-sm">{priceParts.length ? priceParts.join(" · ") : "No pricing yet"}</p>
        {/*
          v1.0 audit finding #4 / rule O7 — the state, the reason, and the way out. Calm muted
          information, never an alert variant and never red: nothing has gone wrong, the host simply has
          not finished setting up. Same treatment as the shipped hours-lock notice on the availability
          page. `availabilityHref` is non-null inside this branch by the guard above.
        */}
        {hoursNotice && availabilityHref && (
          <p className="text-sm text-muted-foreground">
            {hoursNotice}{" "}
            <Link href={availabilityHref} className="underline underline-offset-4">
              {HOURS_MISSING_CTA}
            </Link>
          </p>
        )}
      </CardContent>

      {hasActions && (
        <CardFooter className="gap-2">
          {editHref && (
            <Button asChild variant="outline" size="sm">
              <Link href={editHref}>
                <PencilIcon className="size-3.5" /> Edit
              </Link>
            </Button>
          )}
          {availabilityHref && (
            <Button asChild variant="outline" size="sm">
              <Link href={availabilityHref}>
                <CalendarClock className="size-3.5" /> Availability
              </Link>
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            {onUnlist && listing.status === "published" && (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="sm">
                    Unlist
                  </Button>
                }
                title={`Take “${listing.title || "this listing"}” off the market?`}
                description="Guests won't see it, but you keep all its details and can republish anytime."
                confirmLabel="Unlist space"
                confirmVariant="secondary"
                onConfirm={() => runAction(onUnlist, "Listing unlisted.")}
              />
            )}
            {onDelete && (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="sm" className="text-destructive">
                    Delete
                  </Button>
                }
                title="Delete this listing?"
                description="It'll be removed from FitOut. This can't be undone from here."
                confirmLabel="Delete listing"
                confirmVariant="destructive"
                onConfirm={() => runAction(onDelete, "Listing deleted.")}
              />
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
