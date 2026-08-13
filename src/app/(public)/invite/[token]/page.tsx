// The PUBLIC invite page (GROUP-02 / GROUP-03 · D-116 / D-118 / D-120 / D-122, 08-UI-SPEC §3).
//
// This is the first surface in the app reachable WITHOUT a session and WITHOUT owning anything. The invite
// token in the URL is the entire credential; the person opening it may never have heard of FitOut.
//
// ── WHY IT LIVES OUTSIDE (app)/(host) (RESEARCH Pitfall 5 / T-08-24) ───────────────────────────────────────
// `(app)/layout.tsx` calls `auth.api.getSession` and REDIRECTS to /login when there is none. A public route
// placed inside that group would therefore bounce every signed-out invitee to a login form — silently
// reversing GROUP-03 ("RSVP without a full account") while every test still passed, because the redirect is
// a layout concern that no page-level test would see. So this route INVERTS the gate: the session is READ
// (to skip the name field and offer the change-answer toggle) and never REQUIRED. Do not add a `redirect`
// on a null session, and do not move this file under `(app)` or `(host)`.
//
// AMENDED BY PLAN 11-10, AND THE AMENDMENT IS THE POINT. This block used to end *"Do not move this route
// under a route group"* and to describe the file as sitting *"beside `listings/[id]/page.tsx`, the app's
// other root, header-less … public route"*. Both sentences were written when the only route groups in the
// tree were the two that gate on a session, and both are now false: this file lives at
// `(public)/invite/[token]/page.tsx` and `(public)/layout.tsx` supplies the SHELL-01 header, so neither
// route is header-less any more. What the original instruction was actually protecting is unchanged and
// still binding — **no ancestor layout of this route may read a session and redirect on its absence.**
// `(public)/layout.tsx` reads the session only to render the header's auth slot, and has no `redirect` on
// any path. A group whose layout gates is still forbidden here; a group whose layout merely composes chrome
// is not what that sentence was ever about.
//
// ── THE TOKEN IS A BEARER CREDENTIAL SITTING IN A URL (D-118 / T-08-23) ───────────────────────────────────
// Everything that follows from that is handled here rather than left to convention:
//   - UNKNOWN = REVOKED = VOIDED = CANCELLED, one calm state (Open Q7). `getGroupByToken` already collapses
//     all four onto the frozen `GROUP_INACTIVE` value (08-06), and a MALFORMED token is folded onto the same
//     value here — so this page has exactly ONE inactive branch and one pair of sentences. There is no 404,
//     no "revoked" wording and no distinguishing status code, because a difference between those cases is
//     what turns a guessable-length credential into an enumeration oracle.
//   - IT IS NEVER LOGGED. There is deliberately no logging call of any kind in this file, on any path.
//   - IT IS NEVER HANDED TO A CRAWLER OR A THIRD PARTY. The metadata below marks the page `noindex` (an
//     indexed invite link is a public one) and sets a no-referrer policy, so the token cannot ride out in a
//     `Referer` header on any navigation away from this page.
//
// ── EVERY STATE IS DECIDED BY THE SERVER, AND ONE OF THEM IS ONLY A COURTESY ──────────────────────────────
//   - `closed` is the POSTGRES clock's answer: `getGroupByToken` computes `now() >= b.starts_at` inside its
//     own query (D-120). There is no JS `Date` on this path — a viewer's device clock is not evidence.
//   - `full` is the confirmed-yes count against the D-111 `capacity_snapshot` — and it is a COURTESY only
//     (D-112 / GROUP-05). The authority is `claimSeat`'s `SELECT … FOR UPDATE` inside `submitRsvp`; this
//     page can only report what was true when it rendered. A Yes that looked open and lost the race resolves
//     to the calm sentence the ACTION composes, which is why `RsvpForm` renders the server's error verbatim.
//
// TIMES + ADDRESS (D-122 / D-105 / D-09 / G7). The window is venue-local and names the venue timezone via
// the SAME `composeWhenLabel` the group notifications use, so the invite and the email that pointed at it
// state the session identically. The address is rendered strictly per `listing.showExactAddress`: when the
// host withheld the exact pin, this page shows the area and says the organizer has the rest — a link holder
// is not a booker, and this surface must never be the place a withheld address leaks out.

import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { CalendarIcon, Link2OffIcon, MapPinIcon } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { composeWhenLabel } from "@/lib/booking/when-label";
import { cityLabelFor, venueTzNote } from "@/lib/venue-time";
import { GROUP_INACTIVE, getGroupByToken, getMyRsvpStatus } from "@/lib/group/rsvp";
import { inviteTokenSchema } from "@/lib/validation/group";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RsvpForm } from "@/components/group/rsvp-form";

/**
 * The URL of this page CONTAINS the credential, so it must never be indexed and must never travel in a
 * `Referer` header. Both are one line each here and unfixable after a crawler has already been through.
 */
export const metadata: Metadata = {
  title: "You're invited · FitOut",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * The single calm inactive state (Open Q7). ONE pair of constants rendered from ONE branch, mirroring how
 * 08-06 froze `GROUP_INACTIVE` into a single object: two literals in two branches are two things that can
 * drift apart, and the moment they do, the difference between them is the oracle.
 */
const INACTIVE_TITLE = "This invite is no longer active";
const INACTIVE_BODY = "Ask the organizer for the latest link.";

/**
 * The card shell every state renders inside — header-less, with a FitOut wordmark lockup at the top so an
 * invited stranger can tell what they have opened (08-UI-SPEC §3, brand trust).
 *
 * The wordmark is NOT coral. 08-UI-SPEC §Color enumerates this phase's accent exhaustively and assigns the
 * one coral on this page to `Yes, I'm coming`; a coral wordmark would put two of them on a surface whose
 * whole job is a single decision. It matches the shipped booker/host headers instead.
 */
function InviteCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8 sm:py-12">
      <Card>
        <CardContent className="space-y-6 py-6">
          <div className="text-center">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              FitOut
            </Link>
          </div>
          <Separator />
          {children}
        </CardContent>
      </Card>
    </main>
  );
}

export default async function InvitePage({
  params,
}: {
  // Next 16 — params is a Promise.
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // A malformed token folds onto the SAME value an unknown one resolves to, so the shape check cannot become
  // a probe: `/invite/hello` and `/invite/{20 valid symbols that name nothing}` render identically. This
  // mirrors `submitRsvp`, which returns the same sentence for both (08-06).
  const parsed = inviteTokenSchema.safeParse(token);
  const group = parsed.success ? await getGroupByToken(db, parsed.data) : GROUP_INACTIVE;

  // THE SESSION IS READ, NEVER REQUIRED (D-116). Better Auth returns null for a guest, and null is the
  // expected case on this surface — there is deliberately no redirect, no notFound and no gate below it.
  const session = await auth.api.getSession({ headers: await headers() });
  const viewerId = session?.user?.id ?? null;
  const viewerName = session?.user?.name?.trim() ?? "";

  // THE ONE INACTIVE BRANCH. Unknown, malformed, regenerated, voided and cancelled-booking all arrive here,
  // on the same two sentences, with the same 200. Do not "improve" this by telling them apart (T-08-23).
  if (!group.active) {
    return (
      <InviteCard>
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center gap-4 py-4 text-center"
        >
          {/* Muted, never an alarm colour: a dead link is usually an organizer who rotated it, not a fault
              of the person holding it (08-UI-SPEC §Color — this phase adds no alarm colour anywhere). */}
          <Link2OffIcon className="size-8 text-muted-foreground" aria-hidden="true" />
          <div className="space-y-1">
            <h1 className="text-xl leading-tight font-semibold">{INACTIVE_TITLE}</h1>
            <p className="mx-auto max-w-prose text-sm text-muted-foreground">{INACTIVE_BODY}</p>
          </div>
        </div>
      </InviteCard>
    );
  }

  // ── The event summary (D-122) ─────────────────────────────────────────────────────────────────────────
  const spaceTitle = group.listingTitle ?? "a space";
  const whenLabel = composeWhenLabel({
    startsAt: group.startsAt,
    endsAt: group.endsAt,
    timezone: group.timezone,
    city: group.city,
    fullDay: group.fullDay,
    // An invite only ever exists for an exclusive booking: open capacity does not combine with Phase-8
    // group bookings in v1 (D-110).
    openCapacity: false,
    spacePriceCents: group.spacePriceCents,
    quotedTotalCents: group.quotedTotalCents,
    dayRateCents: group.dayRateCents,
  });
  const tzNote = venueTzNote(group.city, group.timezone);

  // D-09 / D-122 / G7 — the exact street is rendered ONLY when the host opted in, and the fallback is the
  // area plus who to ask. The `&& exactAddress` half matters: an opted-in listing with no address on file
  // must fall back too, rather than render an empty line under a map pin.
  const exactAddress = [group.addressLine1, group.addressLine2, group.city]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");
  const addressLabel =
    group.showExactAddress && exactAddress
      ? exactAddress
      : `Approximate area — ${cityLabelFor(group.city, group.timezone)}. The organizer has the exact address.`;

  // ── The display state, computed HERE, server-side (see the header) ────────────────────────────────────
  // Closed outranks full: once the session has started there is no answer left to give, so offering a
  // "can't make it" would be asking about something already over.
  const rsvpState: "open" | "full" | "closed" = group.rsvpClosed
    ? "closed"
    : group.confirmedYes >= group.capacitySnapshot
      ? "full"
      : "open";

  // D-120 — a returning ACCOUNT sees the answer already on record (and may change it). Self-scoped: the
  // read can only return this viewer's own row. A guest is not recognised on arrival, by design (see
  // getMyRsvpStatus).
  const existingAnswer = viewerId
    ? await getMyRsvpStatus(db, { groupId: group.groupId, userId: viewerId })
    : null;

  // Same-origin return path, so logging in lands back on THIS invite rather than a home page with no trace
  // of where the invite went (D-116). Composed from the token the group was RESOLVED BY — never from the
  // raw route param. The login page independently refuses any callbackURL that is not a relative path.
  const loginHref = `/login?callbackURL=${encodeURIComponent(`/invite/${group.accessToken}`)}`;

  return (
    <InviteCard>
      <header className="space-y-3">
        <h1 className="text-xl leading-tight font-semibold tracking-tight">
          You&apos;re invited to {spaceTitle}
        </h1>

        <dl className="space-y-3 text-base">
          <div className="flex items-start gap-2">
            <CalendarIcon className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="space-y-0.5">
              <dt className="sr-only">When</dt>
              <dd>{whenLabel}</dd>
              {/* SC#2 — the venue timezone is named on every time, including this one. */}
              <p className="text-xs text-muted-foreground">{tzNote}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPinIcon className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div>
              <dt className="sr-only">Where</dt>
              <dd>{addressLabel}</dd>
            </div>
          </div>
        </dl>
      </header>

      <Separator />

      {/* The focal point of the page (08-UI-SPEC §3). Every prop is server-decided; the form proposes a
          name, an optional address and one of two answers, and nothing else.

          `viewer` is null for a guest — and also for the (schema-impossible: user.name is NOT NULL and
          required at signup) case of an account carrying no display name, which degrades to the guest
          identity block rather than to a blank "RSVPing as". The RSVP is still recorded against their
          account either way, because `submitRsvp` reads the user id off the session, not off this prop. */}
      <RsvpForm
        token={group.accessToken}
        viewer={viewerId && viewerName ? { name: viewerName } : null}
        state={rsvpState}
        capacity={group.capacitySnapshot}
        loginHref={loginHref}
        existingAnswer={existingAnswer}
      />
    </InviteCard>
  );
}
