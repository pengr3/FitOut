// The organizer's group management surface (GROUP-04 · D-113/D-118/D-119/D-121, 08-UI-SPEC §2).
//
// WHY A DEDICATED NESTED ROUTE RATHER THAN A SECTION ON THE BOOKING DETAIL (08-UI-SPEC Open Q1): it mirrors
// the shipped `/bookings/[id]/cancel` precedent — a booking's consequential sub-actions get their own RSC —
// and it keeps the confirmation page calm while the roster, the share block and the nudges can grow.
//
// ── THE OWNER GATE IS THE WHOLE SECURITY STORY OF THIS FILE (T-08-19 / Security V4). ──────────────────────
// THE ROUTE GROUP IS NOT THE GATE. `(app)/layout.tsx` only proves SOMEBODY is signed in; it says nothing
// about whose booking this is. So this page repeats the booking-detail gate verbatim on
// `booking.bookerId === session.user.id`, and a missing booking and a stranger's booking return the SAME
// bare `notFound()` — byte for byte, with no distinguishing copy, status or timing. Walking booking ids
// therefore teaches an attacker nothing about which ones exist or who owns them (no enumeration oracle).
//
// AND THE GATE IS BELT-AND-BRACES, because every read below is ALREADY owner-scoped: `getOwnedGroupByBooking`,
// `getHeadcount` and `getRoster` each take the organizer id and carry `b.booker_id = $organizerId` INSIDE
// their own statement (08-06). A foreign roster is UNREADABLE here, not merely unrendered — which is the
// property `tests/group/group-owner-scope.test.ts` proves by mutation. Do NOT "simplify" this page by
// dropping the organizer id from a read and filtering afterwards; that is the exact refactor the scope test
// exists to make impossible.
//
// ── The rest of the contract ──────────────────────────────────────────────────────────────────────────────
//   - THE ROSTER IS ORGANIZER-ONLY (Open Q4). Nothing on the public invite page renders it.
//   - THE TOKEN IS RENDERED, NEVER LOGGED (D-118). It is read back out of the owner-scoped group row and
//     handed to ShareLinkBox as a finished absolute URL; this file has no `console` call.
//   - EVERY NUMBER IS SERVER-COMPUTED. The headcount is `getHeadcount`'s owner-scoped count of `yes` RSVPs
//     against the D-111 `capacity_snapshot` — never live `listing.maxOccupancy`, and never a client count.
//     THIS PAGE ADDS THE ORGANIZER BACK, ONCE (D-113): the audience here is the organizer, who is row #1 of
//     their own roster, so the meter and the nudge both read organizer-INCLUSIVE. That `+ 1` lives at these
//     two render sites and nowhere else — not in `getHeadcount`, not in the components, and never on the
//     public invite page, whose audience is an invitee claiming an invitee seat.
//   - FRESHNESS is the D-84 bounded `router.refresh()` poller, paused on `document.hidden`, silent.
//   - NO CORAL ANYWHERE ON THIS PAGE. 08-UI-SPEC §Color enumerates the accent exhaustively and nothing here
//     is on the list: `Copy link`, `Regenerate link` and `Remove attendee` are all neutral. The one coral in
//     this feature is `Invite people`, on the booking detail, which is what got the organizer here.
//
// TIMES. The subhead's window label comes from the shared `composeWhenLabel` — the SAME formatter 08-06's
// group notifications compose their `whenLabel` with, so the page an organizer opens from a notification and
// the notification itself state the session identically (D-105/SC#2 — venue-local, venue tz named).
//
// ── THE CONTAINER ON BOTH BRANCHES IS A `div`, NOT A LANDMARK (fixed 20 Aug 2026). ───────────────────────
// `(app)/layout.tsx:96` already wraps `{children}` in this route's one `main` landmark; a second one nested
// inside it is the defect `(app)/bookings/[id]/page.tsx`'s own header records in full, and `loading.tsx`
// here already renders the same container as a `div`. Pinned by `e2e/shell.spec.ts`.

import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking } from "@/lib/db/schema";
import { composeWhenLabel } from "@/lib/booking/when-label";
import { venueTzNote } from "@/lib/venue-time";
import { getHeadcount, getOwnedGroupByBooking, getRoster } from "@/lib/group/rsvp";
import type { Headcount, RosterEntry } from "@/lib/group/rsvp";
import { BOOKING_SHELL } from "@/lib/design/measurements";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AttendeeRoster } from "@/components/group/attendee-roster";
import { GroupPoller, RefreshGroupButton } from "@/components/group/group-refresh";
import { HeadcountMeter } from "@/components/group/headcount-meter";
import { RegenerateLinkButton } from "@/components/group/regenerate-link-button";
import { ShareLinkBox } from "@/components/group/share-link-box";
import { TopUpNudge } from "@/components/group/top-up-nudge";

export default async function GroupManagementPage({
  params,
}: {
  // Next 16 — params is a Promise.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // A session is required to own a booking — no session can never be the owner (→ 404, reveal nothing).
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) notFound();

  const [bk] = await db
    .select({
      id: booking.id,
      bookerId: booking.bookerId,
      status: booking.status,
    })
    .from(booking)
    .where(eq(booking.id, id));

  // THE GATE (see the header). Missing OR not-mine → the SAME bare 404 as /bookings/[id].
  if (!bk || bk.bookerId !== userId) notFound();

  const group = await getOwnedGroupByBooking(db, { bookingId: bk.id, organizerId: userId });
  // No group yet, or a group the D-121 auto-void retired with its booking: there is nothing to manage.
  // A REDIRECT rather than a 404, because this visitor demonstrably owns the booking — sending an organizer
  // to a dead page for arriving one step early would be a worse answer than the page they actually want.
  if (!group || group.voidedAt !== null) redirect(`/bookings/${bk.id}`);

  // The two display reads. Both are owner-scoped in their own WHERE and both can only fail transiently (a
  // dropped connection), so they share one calm error state rather than crashing the route — the D-84 poller
  // above will resolve a blip on its own, and the Try-again button is there for one that lasts.
  let headcount: Headcount | null = null;
  let roster: RosterEntry[] = [];
  let loadFailed = false;
  try {
    [headcount, roster] = await Promise.all([
      getHeadcount(db, { groupId: group.groupId, organizerId: userId }),
      getRoster(db, { groupId: group.groupId, organizerId: userId }),
    ]);
  } catch {
    // No error object logged: a driver error can echo the row, and the row carries the access token.
    loadFailed = true;
  }

  const title = group.listingTitle ?? "your space";
  const whenLabel = composeWhenLabel({
    startsAt: group.startsAt,
    endsAt: group.endsAt,
    timezone: group.timezone,
    city: group.city,
    fullDay: group.fullDay,
    // The organizer surface only ever exists for an exclusive booking: open capacity does not combine with
    // Phase-8 group bookings in v1 (D-110).
    openCapacity: false,
    spacePriceCents: group.spacePriceCents,
    quotedTotalCents: group.quotedTotalCents,
    dayRateCents: group.dayRateCents,
  });
  const tzNote = venueTzNote(group.city, group.timezone);

  if (loadFailed) {
    return (
      <div className={BOOKING_SHELL}>
        <Card>
          {/* Calm, NOT red — a read that blipped is not a failure the organizer caused (§Error states). */}
          <CardContent
            role="status"
            aria-live="polite"
            className="flex flex-col items-center gap-4 py-10 text-center"
          >
            <div className="space-y-1">
              <h1 className="text-xl leading-tight font-semibold">Your group</h1>
              <p className="mx-auto max-w-prose text-sm text-muted-foreground">
                We couldn&apos;t load your group. Try again.
              </p>
            </div>
            <RefreshGroupButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Unreachable in practice — `getHeadcount` reads the same group row, under the same owner scope, that
  // `getOwnedGroupByBooking` just returned. The fallback exists so an impossible null can never blank out
  // the page's focal figure; `capacity_snapshot` is the authority either way.
  const counts: Headcount = headcount ?? {
    confirmed: 0,
    capacity: group.capacitySnapshot,
    full: false,
  };

  // The absolute invite URL (D-118). Composed here, from the token this page read back out under the owner
  // scope — the same `BETTER_AUTH_URL` convention every other absolute-link site in the app uses, so the
  // link an organizer copies is byte-identical to the one 08-06 emails an attendee.
  const inviteUrl = `${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/invite/${group.accessToken}`;

  return (
    <div className={BOOKING_SHELL}>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-xl leading-tight font-semibold tracking-tight">Your group</h1>
          <p className="text-sm text-muted-foreground">
            Invite people, and see who&apos;s coming to {title} on {whenLabel}.
          </p>
          <p className="text-xs text-muted-foreground">{tzNote}</p>
        </div>

        {/* GROUP-04's focal point — the one Display-scale figure on the page.
            D-113 — THE `+ 1` ON BOTH SIDES IS THE ORGANIZER, and this is the ONE place on the surface that
            adds them (see the roster's own header). They are row #1 of the list directly below this figure
            and they hold one of the listing's places, so `confirmed + 1` is the number of people who will be
            in the room, and `capacity + 1` is the listing's `maxOccupancy` as it stood at group creation —
            `capacity_snapshot` is organizer-EXCLUSIVE because it caps `rsvp` rows, which the organizer never
            occupies. `full` is passed THROUGH, unmodified: it was decided server-side against the raw
            snapshot by the same query that produced these counts, and re-deriving it from the two displayed
            numbers would replace a fact about the seat-claim with a restatement of the display. */}
        <HeadcountMeter
          confirmed={counts.confirmed + 1}
          capacity={counts.capacity + 1}
          full={counts.full}
        />

        <ShareLinkBox inviteUrl={inviteUrl} />

        <AttendeeRoster entries={roster} />

        {/* D-114 — renders NOTHING unless the listing prices extra heads AND more people are coming than the
            booking declared. Both halves of that guard live in the component, in one place.
            D-113 — `attendingTotal` is `counts.confirmed + 1`, the same organizer-inclusive figure the meter
            above renders, because `declaredPax` is organizer-inclusive too (the pax stepper says so: "This
            includes you"). Comparing a count of RSVPs against it lost exactly one person and kept this block
            silent on the first over-subscription; the prop is NAMED for its basis so no future call site can
            make that mistake quietly. */}
        <TopUpNudge
          attendingTotal={counts.confirmed + 1}
          declaredPax={group.declaredPax}
          extraHeadFee={group.extraHeadFee}
        />

        <Separator />

        {/* Manage actions (D-121, 08-UI-SPEC §2) — below the roster because they are maintenance, not the
            point of the visit. Neutral, like everything else on this page. */}
        <div className="space-y-2">
          <RegenerateLinkButton groupId={group.groupId} />
          <p className="text-sm text-muted-foreground">
            Shared the link too widely? Get a new one — the old link stops working, and everyone who&apos;s
            already RSVP&apos;d stays on your list.
          </p>
        </div>

        {/* A ghost link back, deliberately the quietest thing on the page. */}
        <Button asChild variant="ghost" className="w-full">
          <Link href={`/bookings/${bk.id}`}>Back to your booking</Link>
        </Button>
      </div>

      {/* Renders nothing; refreshes this RSC on a bounded interval, paused when the tab is hidden. */}
      <GroupPoller />
    </div>
  );
}
