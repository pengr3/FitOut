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

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PencilIcon } from "lucide-react";
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
import { formatMoney } from "@/lib/money";

export type ListingCardData = {
  id: string;
  title: string | null;
  primarySpaceType: SpaceTypeValue | null;
  hourlyRateCents: number | null;
  dayRateCents: number | null;
  currency: string;
  status: "draft" | "published" | "unlisted";
  coverUrl: string | null;
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
  editHref,
  onUnlist,
  onDelete,
}: {
  listing: ListingCardData;
  bookable?: boolean;
  editHref?: string;
  onUnlist?: (id: string) => Promise<ActionResult>;
  onDelete?: (id: string) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const badge = statusBadge(listing.status, bookable);
  const hasActions = Boolean(editHref || onUnlist || onDelete);

  const priceParts: string[] = [];
  if (listing.hourlyRateCents != null) {
    priceParts.push(`${formatMoney(listing.hourlyRateCents, listing.currency)}/hr`);
  }
  if (listing.dayRateCents != null) {
    priceParts.push(`${formatMoney(listing.dayRateCents, listing.currency)}/day`);
  }

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
