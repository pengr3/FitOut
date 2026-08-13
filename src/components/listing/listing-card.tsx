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
// ZERO ARITHMETIC ON MONEY (D-130 / GATE-05). That composition happens SERVER-SIDE, in
// `src/lib/listing/card-price.ts`, and this file receives the finished strings as `priceParts`. It used to
// happen here, which put `allInRateParts` — and therefore `SERVICE_FEE_BPS` — in the browser bundle, where
// a non-`NEXT_PUBLIC_` env override does not reach it: the tile would silently keep showing 5% while
// checkout charged the configured rate. The rate columns are NOT on `ListingCardData` any more, so the
// arithmetic cannot be reintroduced here without a deliberate change to the props contract.
//
// There is deliberately NO `Drop-in` badge and NO spots-left chip on this card, and adding them later is
// not a consistency fix. This is a MANAGEMENT surface, not a marketplace one: the host chose how the space
// is sold and does not need to be told, the status badge is the one badge this tile carries, and scarcity
// is a booker-facing signal about a SPECIFIC DATE — which this card has no date to be about.

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PencilIcon, CalendarClock, CheckCircle2, type LucideIcon } from "lucide-react";
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
import {
  HOURS_MISSING_STATE,
  HOURS_MISSING_REASON,
  HOURS_MISSING_CTA,
} from "@/lib/listing/hours-signal";

export type ListingCardData = {
  id: string;
  title: string | null;
  primarySpaceType: SpaceTypeValue | null;
  status: "draft" | "published" | "unlisted";
  coverUrl: string | null;
};

// D-130 / GATE-05 — WHAT IS DELIBERATELY ABSENT FROM THE SHAPE ABOVE, so the next reader does not "restore"
// it: `hourlyRateCents`, `dayRateCents`, `perHeadPriceCents`, `currency` and `occupancyMode`. Those five
// were the INPUTS to the price line, and a client component may receive money as a pre-formatted string but
// never the inputs to compute one. The mode fork (09-14: a drop-in listing prices PER PERSON, keyed on the
// persisted mode and never on a null rate column) still exists and is still tested — it lives in
// `src/lib/listing/card-price.ts` and reaches this component as the `priceParts` prop.

type ActionResult = { ok: boolean; error?: string };

/**
 * The one badge this tile carries.
 *
 * DS-10 / D-14: `Live` used to be a FILLED green chip (3.24:1) whose meaning lived entirely in the fill —
 * the other three states are neutral chips distinguished by their WORDS, so `Live` was the only one a
 * colour-blind reader could not tell apart at a glance. It now takes the `positive` recipe from
 * @/lib/design/status-tones — full-contrast ink on the neutral tint — and carries the CheckCircle2 glyph
 * that holds the hue (success on muted, 3.67 court / 3.54 grove, against a 3:1 non-text bar).
 *
 * The other three keep no icon deliberately: they were never colour-carrying and their labels already
 * distinguish them. `Icon` is optional for exactly that reason.
 */
function statusBadge(
  status: ListingCardData["status"],
  bookable: boolean,
): { label: string; variant: "default" | "secondary"; className: string; Icon?: LucideIcon } {
  if (status === "published" && bookable) {
    return {
      label: "Live",
      variant: "default" as const,
      className: "border-transparent bg-muted text-foreground",
      Icon: CheckCircle2,
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
  priceParts,
  bookable = false,
  hoursMissing = false,
  editHref,
  availabilityHref,
  onUnlist,
  onDelete,
}: {
  listing: ListingCardData;
  /**
   * D-130 / GATE-05 — the price line, ALREADY FORMATTED SERVER-SIDE by
   * `listingCardPriceParts` (src/lib/listing/card-price.ts). The reasoning is
   * `search-result-card.tsx:131-134`'s, and it is worth restating because the trap is silent: this card is
   * rendered from a `"use client"` shell, so composing the fee here would put `SERVICE_FEE_BPS` in the
   * browser bundle, where a non-public env override does not reach it — the tile would silently keep
   * showing 5% while checkout charged the configured rate. Zero arithmetic in this file.
   *
   * May be empty (a listing with no rates set yet), which renders the "No pricing yet" fallback.
   */
  priceParts: string[];
  bookable?: boolean;
  /**
   * v1.0 audit finding #4. This listing is published and has no weekly hours, so every date reads as
   * closed to a booker. DERIVED UPSTREAM in one grouped query (loadPublishedListingsMissingHours) and
   * passed in — the card never asks the DB, and never re-derives it from anything on `listing`.
   *
   * WHAT THIS PROP NO LONGER MEANS (corrected by 260810-sti). It used to say that a listing with no
   * hours "still reads Live if it is otherwise bookable" — that this was a signal, not a gate. Hours are
   * now the FOURTH term of `deriveBookable`, so that combination is UNREACHABLE in production: a
   * published listing with no hours is not bookable, and the badge above this notice therefore reads
   * "Published · not bookable". The notice's job is to explain that badge rather than to sit beside a
   * contradicting one.
   *
   * THIS COMPONENT'S OWN BEHAVIOUR IS UNCHANGED, and that is worth saying plainly so the next reader
   * does not go hunting for a behavioural diff that is not here: the card still renders whatever
   * `bookable` it is handed, still re-derives nothing, and `hoursMissing` still only controls the
   * notice. What changed is upstream — the value of `bookable` that the host grid now computes.
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
            {badge.Icon ? <badge.Icon className="size-3 text-success" aria-hidden="true" /> : null}
            {badge.label}
          </Badge>
        </div>
        {listing.primarySpaceType && (
          <p className="text-sm text-muted-foreground">
            {SPACE_TYPE_LABELS[listing.primarySpaceType]}
          </p>
        )}
        {/* Pre-formatted server-side; `tabular-nums` is mandatory on every money figure (D-130). */}
        <p className="text-sm tabular-nums">
          {priceParts.length ? priceParts.join(" · ") : "No pricing yet"}
        </p>
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
