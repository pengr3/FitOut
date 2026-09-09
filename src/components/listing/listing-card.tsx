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
// PHASE 18 (D-230 / LVER-02's host half): a PUBLISHED listing awaiting or refused a FitOut review shows
// the REVIEW chip instead — "In review" / "Not approved", both neutral. It joins `statusBadge()` rather
// than becoming a second badge beside it, because ONE CHIP PER CARD is this file's rule and two chips
// on a management tile is two things to read before knowing whether the space is selling. The words
// live in `src/lib/listing/review-signal.ts`, with the reason line and the one way out that is true.
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

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
// `Trash2Icon` is HSURF-01 / D-07's icon-only Delete trigger (see the docblock at that call site).
// Aliased in this file's established `…Icon` style, alongside `PencilIcon`.
import {
  PencilIcon,
  CalendarClock,
  CheckCircle2,
  HistoryIcon,
  Trash2 as Trash2Icon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { composeReviewSentence, reviewSignalFor } from "@/lib/listing/review-signal";
// TYPE-ONLY, and therefore erased at compile time — this is a client module and nothing from the
// schema may reach the browser bundle. It is imported rather than re-spelled as a hand-written union
// beside `status` above: the review states are a pgEnum, `tsc` enumerates every construction site of
// the type below, and a sixth value would be invisible to a union typed out by hand. That is 18-04's
// finding in miniature — the census counts what it can SEE.
import type { ListingReviewState } from "@/lib/db/schema";
import type { ListingReviewHistory } from "@/lib/listing/review-history";

export type ListingCardData = {
  id: string;
  title: string | null;
  primarySpaceType: SpaceTypeValue | null;
  status: "draft" | "published" | "unlisted";
  coverUrl: string | null;
  /**
   * The ops review state (phase 18, D-208/D-230). REQUIRED, deliberately: it is free from the host
   * grid's existing `select()` (`r` is a full listing row), and a defaulted field would let a future
   * projection forget it and silently show every listing as if it had been approved.
   */
  reviewState: ListingReviewState;
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
  reviewState: ListingReviewState,
): { label: string; variant: "default" | "secondary"; className: string; Icon?: LucideIcon } {
  // ─── THE REVIEW STATE COMES FIRST, AND ONLY ON A PUBLISHED LISTING ────────────────────────────────
  //
  // ORDERING. A listing that is `published` but `pending` or `rejected` shows the REVIEW chip, because
  // that is THE REASON IT IS NOT SELLING and it is the more specific fact. "Published · not bookable"
  // is true of it as well, and it is the less useful of two true things: it names the symptom while
  // this names the cause. The two cannot disagree — `Live` still requires `bookable`, and the review
  // term joined `deriveBookable` in plan 18-03, so a pending or rejected listing is never bookable.
  //
  // ⚠ `status === "published"` IS PART OF THE CONDITION, for `hours-signal.ts`'s reason applied to a
  // second signal — and here it is load-bearing rather than merely tidy. `listing.review_state`
  // DEFAULTS TO `pending` (schema.ts), so EVERY DRAFT carries it. A draft badged "In review" would be
  // telling the host that FitOut is checking something they have not submitted, on the one card where
  // "Draft" is the whole truth. An `unlisted` listing is off the market by the host's own choice, and
  // that choice is the fact they need; a review outcome on a listing nobody can see is noise.
  //
  // NEUTRAL, NO ICON, NO COLOUR (DS-10). A listing awaiting a decision, and one that did not get it,
  // are normal lifecycle states of a working marketplace. `Live` remains the only colour-carrying
  // branch, `src/lib/design/status-tones.ts` stays at four tones and this plan adds none.
  if (status === "published") {
    const review = reviewSignalFor(reviewState);
    if (review) return { label: review.chip, variant: "secondary" as const, className: "" };
  }
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

function ReviewHistoryDialog({
  history,
  listingTitle,
}: {
  history: ListingReviewHistory;
  listingTitle: string | null;
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HistoryIcon className="size-3.5" aria-hidden="true" /> Review history
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-lg"
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          closeRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Review history</DialogTitle>
          <DialogDescription>
            {listingTitle
              ? `Review activity for “${listingTitle}”, newest first.`
              : "Review activity for this listing, newest first."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea data-review-history-scroll className="min-h-0 overflow-hidden pr-1">
          <ol aria-label="Review cycles" className="space-y-4">
            {history.cycles.map((cycle, cycleIndex) => (
              <li key={cycleIndex} className="rounded-lg border p-3">
                <ol aria-label={`Review cycle ${cycleIndex + 1}`} className="space-y-1">
                  {cycle.events.map((event, eventIndex) => (
                    <li key={`${eventIndex}-${event}`} className="text-sm">
                      {event}
                    </li>
                  ))}
                </ol>
                {cycle.reason ? (
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground select-text">
                    {cycle.reason}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
          {history.hasOlder ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Showing the latest five review cycles.
            </p>
          ) : null}
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button ref={closeRef} variant="outline">
              Close
            </Button>
          </DialogClose>
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
  rejectionReason = null,
  reviewHistory,
  titleAs: TitleTag = "h3",
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
  /**
   * The OPERATOR'S OWN SENTENCE for a rejected listing — `listing_review.reason`, read owner-scoped and
   * ONCE for the whole grid by `(host)/host/listings/page.tsx` (the pre-collapsed `Map` idiom, never a
   * query per card).
   *
   * It is DATA, not copy: the product's sentence lives in `review-signal.ts` and this is the human
   * note an operator typed beside their decision. It is appended VERBATIM by the shared composer —
   * never paraphrased, never summarised into the chip — and it stays readable until the host
   * resubmits, because clearing it would delete the only thing that makes editing purposeful (D-249).
   *
   * ⚠ RENDERED AS TEXT (T-18-1301). This is operator free text crossing onto a surface the host
   * controls nothing about; it reaches a React text node and nothing here interpolates it into markup.
   *
   * Absent on every other state — an approval carries no reason, and a `pending` listing has not been
   * decided yet, so its notice is the product sentence alone.
   */
  rejectionReason?: string | null;
  /** Server-resolved host-facing review lifecycle. Empty or absent histories render no control. */
  reviewHistory?: ListingReviewHistory;
  /**
   * The heading LEVEL the card's title renders at. `EmptyState`'s prop of the same name, for the same
   * reason: a card is a fragment of somebody else's outline, and only the page knows what level it
   * sits at.
   *
   * ⚠ THIS PARAGRAPH USED TO ARGUE THE DEFAULT FROM A CALL SITE THAT DOES NOT EXIST. Corrected by the
   * phase-17 code review (WR-05); the previous text is quoted rather than deleted, because it reads as
   * a measurement and was not one. It said: *"THE DEFAULT IS THE SEARCH GRID'S LEVEL, AND IT IS CORRECT
   * THERE — MEASURED (plan 17-07). On `/` the outline is `h1` "Find a space to play" → `h2` the results
   * heading (`search-results.tsx:187`) → these titles, so `h3` is the right rung […] Changing the
   * default to `h2` would have flattened the search grid's titles into siblings of the results heading
   * they belong under."*
   *
   * `/` DOES NOT RENDER THIS COMPONENT, and that is the whole correction. `search-results.tsx:116`
   * renders `SearchResultCard`, which composes `ResultCard` (`search-result-card.tsx:41,248`), and that
   * pattern hard-codes its title at `patterns/result-card.tsx:153` — `<h3 …>{title}</h3>`, not settable
   * by any prop. So the search grid's `h3` is real and correct, it is simply not THIS card's and cannot
   * be steered from here. `fixtures.ts:257-258` already said the plain version of this: *"`ListingCard`
   * is a HOST management surface."*
   *
   * WHAT IS ACTUALLY MEASURED, as of the WR-05 fix:
   *   • `grep -rn "<ListingCard" src/` → ONE call site for this component,
   *     `(host)/host/listings/page.tsx:160`, and it passes `titleAs="h2"` at `:170`. (The other hit is
   *     a DIFFERENT, locally-declared `ListingCard` inside `listings/[id]/opengraph-image.tsx:72`.)
   *   • The `heading-order (moderate) x1: h3` the first GATE-02 sweep reported at 320 and 1280 was on
   *     `/host/listings` — the page is its `h1` and then the grid, so the default skipped a rung. That
   *     half of the original paragraph is TRUE and is why the prop exists.
   *   • No PRODUCT surface exercises the default. `tests/listing/listing-card.test.tsx` mounts this
   *     card 9 times and passes `titleAs` 0 of them, so the default is reached — by the component's own
   *     unit tests, in isolation, where there is no document outline to be right or wrong about.
   *
   * ⚠ THE DEFAULT STAYS, AND IT STAYS AT `h3` — DECIDED ON THAT EVIDENCE, not inherited. Two reasons,
   * and neither is the one above:
   *
   *   1. IT IS THE LOUD WRONG ANSWER RATHER THAN THE SILENT ONE. Both legal values are wrong on some
   *      page. `h3` under a page that goes straight from `h1` to the grid SKIPS a level, and
   *      `heading-order` fires on exactly that — which is how the one real call site was caught and
   *      corrected inside this same phase. `h2` under a page that has a section heading FLATTENS the
   *      titles into siblings of the heading they belong under, which is a worse outline that axe is
   *      silent about. A default that fails audibly is a better guard than one that fails quietly.
   *   2. Making the prop REQUIRED was considered and rejected as the more invasive change: it would
   *      force `titleAs` onto 9 unit-test renders that deliberately mount the card with no page around
   *      it, and it would break the layer's symmetry with `EmptyState` (`:117`, default `h2`) and
   *      `PanelCard` (`:114`, default `h2`), both of which keep an optional rung with a default.
   *
   * Either way the rule for a NEW call site is unchanged and is the reason the prop exists at all: a
   * card is a fragment of somebody else's outline, so PASS YOUR RUNG. The repo already treats that as
   * the idiom rather than the exception — `profile-pass.test.tsx:1062` pins that the profile panels
   * pass `titleAs="h2"` explicitly even though it is the default.
   */
  titleAs?: "h2" | "h3";
  editHref?: string;
  availabilityHref?: string;
  onUnlist?: (id: string) => Promise<ActionResult>;
  onDelete?: (id: string) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const badge = statusBadge(listing.status, bookable, listing.reviewState);
  const hasReviewHistory = Boolean(reviewHistory?.cycles.length);
  const hasActions = Boolean(editHref || availabilityHref || onUnlist || onDelete || hasReviewHistory);

  // THE REVIEW SIGNAL, resolved ONCE and shared with the chip above — one lookup, so the chip and the
  // sentence beneath it can never name different states. The `status === "published"` term is the
  // badge's own (see `statusBadge`): a draft carries `pending` by default and has been submitted to
  // nobody.
  //
  // `availabilityHref` is the HOST-ONLY guard, exactly as it is for the hours notice (T-IU7-02): a
  // Phase-4 search card passes neither host prop, so it is structurally unable to render a management
  // notice rather than merely unlikely to. The chip is safe on its own — search never renders this
  // component, and every row it does render is already past the sell-gate's review term.
  const reviewSignal = listing.status === "published" ? reviewSignalFor(listing.reviewState) : null;
  const reviewNotice =
    reviewSignal && availabilityHref ? composeReviewSentence(reviewSignal, rejectionReason) : null;

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
          {/* The tag is the `titleAs` prop's; the classes are unchanged, and Tailwind's preflight
              resets every heading's size and weight to `inherit`, so swapping h3 for h2 here moves
              the outline and NOT a single pixel. */}
          <TitleTag className="font-medium leading-snug">
            {listing.title || "Untitled listing"}
          </TitleTag>
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
        {/*
          D-230 / OPS-05 — THE REVIEW SIGNAL'S REASON LINE, and the way out where one exists.

          Same treatment as the hours notice directly above: calm muted information, never an alarm and
          never red. Nothing has gone wrong — a decision is pending, or has been taken.

          The sentence arrives already composed (product sentence, then the operator's own words
          verbatim) and is rendered as TEXT. There is no `dangerouslySetInnerHTML` on this path and
          there must never be one: the second half of that string is free text an operator typed.

          THE WAY OUT IS RENDERED ONLY WHERE THE SIGNAL DECLARES ONE, and `pending` declares none — so
          this is the absence made structural rather than a branch somebody has to remember. `editHref`
          is the host grid's own spelling of the wizard route, reused rather than re-typed here.
        */}
        {reviewNotice && reviewSignal && (
          <p className="text-sm text-muted-foreground">
            {reviewNotice}
            {reviewSignal.wayOut && editHref ? (
              <>
                {" "}
                <Link href={editHref} className="underline underline-offset-4">
                  {reviewSignal.wayOut}
                </Link>
              </>
            ) : null}
          </p>
        )}
      </CardContent>

      {hasActions && (
        /*
          HSURF-01 / D-05 — `mt-auto` IS THE ALIGNMENT FIX AND `h-full` IS NOT.
          The grid wrapper (`(host)/host/listings/page.tsx:180`) sets no `align-items`, so these
          cards ALREADY stretch to the tallest in the row — a full-height utility on `Card` would be
          a no-op dressed as a fix. What misaligned was the FOOTER BAND: `Card` is `flex flex-col`
          (`ui/card.tsx:15`) with a zero gap above and no child declaring `flex-1`, so the children
          packed to the top and the stretched height landed as blank card BELOW a tinted,
          top-bordered bar — MEASURED at 108.0px (`sm`) and 108.02px / 46.27px (`lg`) in
          `19-02-SUMMARY.md`. `mt-auto` absorbs that free space above the footer instead, which
          restores what `has-data-[slot=card-footer]:pb-0` on `Card`'s base already assumes: the
          footer is flush with the card's bottom edge.

          HSURF-01 / D-08 second half — `flex-wrap` is a SEPARATE fix for a SEPARATE defect, and
          fixing either does not fix the other. `Button` carries both `shrink-0` and
          `whitespace-nowrap` (`ui/button.tsx:74`), so the four controls of a PUBLISHED listing can
          neither shrink nor wrap; `Card` carries `overflow-hidden`, so the overrun was CLIPPED at
          the rounded edge rather than painted outside the card. That is why it read as a truncated
          control and not as a spill, and why a document-level overflow scan passes against the
          defect — `e2e/overflow-320.spec.ts`'s `/host/listings` row was green with this shipped.
          The measured overrun was a constant scrollWidth of 332 against a clientWidth of
          288 / 322 / 315, so the `lg` band was TIGHTER than `sm`.

          ⚠ APPENDED, NEVER PREPENDED (D-06 / WR-04). `cn(base, className)` puts this string LAST
          (`ui/card.tsx:86-91`), which is the position tailwind-merge keeps — it resolves a conflict
          by deleting the EARLIER class. Phase 17's WR-04 measured a hoisted constant DELETING
          `pb-20` outright, leaving a state worse than the defect being fixed. Do not reorder these
          tokens to the front of anything; `tests/design/listing-card-merge-order.test.ts` is the
          standing gate that says so.
        */
        <CardFooter className="gap-2 mt-auto flex-wrap">
          {editHref && (
            <Button asChild variant="outline" size="sm">
              <Link href={editHref}>
                <PencilIcon className="size-3.5" /> Edit
              </Link>
            </Button>
          )}
          {hasReviewHistory && reviewHistory ? (
            <ReviewHistoryDialog history={reviewHistory} listingTitle={listing.title} />
          ) : null}
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
                  /*
                    D-07 — ICON-ONLY, AND THE ACCESSIBLE NAME SURVIVES AS `sr-only` TEXT.
                    The visible label is what made the four-control cluster too wide on a PUBLISHED
                    listing; dropping it buys the most space for the least change. The icon size
                    resolves to `size-7` (`ui/button.tsx:117`) — the SAME 28px height as the
                    `size="sm"` siblings (`h-7`), so the row's baseline does not move.

                    ⚠ THE BAR HERE IS 24px, NOT 44px. `e2e/overflow-320.spec.ts:3144-3150` declares
                    `touch: []` for this cluster in as many words, arguing that these controls are
                    smaller than the default BY DESIGN and that "asserting 44 on any of them would
                    be red against reviewed code". 28px clears `expectTargets`'s 24px scan with
                    room. Do not import a 44px requirement here.

                    ⚠ THE `sr-only` SPAN IS THE NAME. Delete it and
                    `getByRole("button", { name: "Delete" })` stops resolving — silently, and only
                    for screen-reader users, because no test locates this control by its text today
                    (measured: zero selector matches across `tests/` and `e2e/`; the sole
                    `/host/listings` hit is a COMMENT). This is the same shape
                    `photo-lightbox.tsx:370-373` already ships.

                    ⚠ THE CONFIRM DIALOG IS NOT OPTIONAL AND MUST NOT BE SIMPLIFIED. Icon-only is
                    safe from mis-taps BECAUSE the destructive act stays double-gated behind the
                    ConfirmDialog below, whose confirm label names the listing and whose confirm
                    button paints destructive.

                    ⚠ ONLY DELETE GOES ICON-ONLY. `Unlist` above keeps its visible label (D-07),
                    and `div.ml-auto` is unchanged — `margin-left: auto` resolves to 0 once free
                    space is negative, so it neither causes nor worsens the overflow, and with the
                    footer wrapping it right-aligns this destructive pair on its own line.
                  */
                  <Button variant="ghost" size="icon-sm" className="text-destructive">
                    <Trash2Icon aria-hidden="true" />
                    <span className="sr-only">Delete</span>
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
