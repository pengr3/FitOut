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
//     PLAN 11-20 MOVED THAT DECLARATION FROM A STATIC `metadata` OBJECT INTO `generateMetadata`, and both
//     properties survived the move — which is now asserted on the AST by tests/design/og-routes.test.ts,
//     because dropping two lines during exactly this kind of conversion is the likeliest way they leave.
//     The same plan added `opengraph-image.tsx` beside this file: a share card that is CONSTANT, takes no
//     params and reads no token, so the new endpoint an unfurl causes to be fetched cannot answer "does
//     this token name anything". Read that file's header before making it say anything about the event.
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
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE DESIGN-SYSTEM PASS (plan 13-08 · 13-CONTEXT D-79) — AND THE FOUR THINGS IT PRESERVED
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════
//
// This route carries ZERO dedicated requirements. It inherits Phase 13's tokens, patterns and type roles
// and it gains NO capability: no new invite mechanism, no new RSVP option, no attendee name anywhere new.
// What changed is TYPE, and only type — the `<h1>` and the event `<dl>` moved onto the named roles
// (`text-heading` / `text-body`) instead of `text-xl leading-tight font-semibold tracking-tight` and
// `text-base`. The distinction is not cosmetic: `type-scale.test.ts`'s header records that a co-located
// `font-semibold` / `leading-tight` / `tracking-tight` BEATS a named step's per-theme facet, so the old
// spelling was frozen at court's weight and tracking in both themes. The box was already `PanelCard`
// (plan 11-13, via `InviteCard`), so there was no container left to adopt.
//
// PRESERVED, DELIBERATELY AND PROVABLY — each of these is a security property, not a preference:
//   1. `generateMetadata`'s `robots: { index: false, follow: false }` and `referrer: "no-referrer"` are
//      untouched. An indexed invite link is a public one, and a token that rides out in a `Referer` is a
//      credential handed to whatever the visitor clicks next. Asserted on the AST by `og-routes.test.ts`.
//   2. The inactive branch's copy is byte-identical and still arrives from the ONE declaration in
//      `@/lib/group/rsvp`. `invite-notfound-parity.test.ts` is green and UNMODIFIED.
//   3. `opengraph-image.tsx` beside this file was not opened at all: still no route param, still no DB
//      read, still the same bytes for a live, unknown and malformed token.
//   4. The RSVP submission path, its server action and its refusal handling are unchanged.
//
// ⚠ `EmptyState` / `ErrorState` ARE DELIBERATELY NOT USED HERE, and that refusal is already recorded and
// machine-checked. `tests/design/empty-state-adoption.test.ts` states it from the other side: the invite
// route's sibling `not-found.tsx` "deliberately does NOT use the shell — it must render a BYTE-IDENTICAL
// inactive surface to the invite page (T-11-ORACLE), so it composes `InviteCard` instead." This surface's
// empty shape IS the inactive state, and giving it the shared shell — with the shell's own icon, heading
// level and action slot — is exactly how the two entrances start to look different.

import type { Metadata } from "next";
import { headers } from "next/headers";
import { cache } from "react";
import { CalendarIcon, MapPinIcon } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { composeWhenLabel } from "@/lib/booking/when-label";
import { cityLabelFor, venueTzNote } from "@/lib/venue-time";
import {
  GROUP_INACTIVE,
  INACTIVE_BODY,
  INACTIVE_TITLE,
  getGroupByToken,
  getMyRsvpStatus,
  type GroupByToken,
} from "@/lib/group/rsvp";
import { inviteTokenSchema } from "@/lib/validation/group";
import { Separator } from "@/components/ui/separator";
import { InviteCard, InviteInactive } from "@/components/group/invite-card";
import { RsvpForm } from "@/components/group/rsvp-form";

/**
 * THE ONE TOKEN LOOKUP THIS REQUEST PERFORMS (plan 11-20).
 *
 * `generateMetadata` and the component below both need the group, and Next calls them separately.
 * `cache()` makes the second call free for the lifetime of one request, so converting the metadata
 * export into a function did NOT double this route's database work — which matters more here than
 * usual, because the lookup is on an unauthenticated path anyone with a URL can hit.
 *
 * IT IS THE SAME GATED LOOKUP THE PAGE ALREADY PERFORMED, moved rather than duplicated, and the
 * malformed-token fold moved with it. A looser second lookup for the metadata — one that skipped
 * `inviteTokenSchema`, or read the row without `getGroupByToken`'s active predicate — would be a
 * second answer to "does this token name anything", reachable by a crawler, which is precisely the
 * question 08-06 collapsed onto one value.
 */
const resolveInvite = cache(async (token: string): Promise<GroupByToken> => {
  const parsed = inviteTokenSchema.safeParse(token);
  return parsed.success ? await getGroupByToken(db, parsed.data) : GROUP_INACTIVE;
});

/**
 * The URL of this page CONTAINS the credential, so it must never be indexed and must never travel in a
 * `Referer` header. Both are one line each here and unfixable after a crawler has already been through.
 *
 * ── THE COMMENT ABOVE IS CARRIED VERBATIM FROM THE STATIC `metadata` EXPORT THIS REPLACED ────────
 * It is repeated rather than reworded because the conversion is the exact edit that loses it:
 * `robots` and `referrer` are two lines in the middle of a returned object, they are invisible in
 * the rendered page, nothing fails when they go, and the damage is done by a crawler nobody watches.
 * `tests/design/og-routes.test.ts` asserts both on this function's AST for the same reason.
 *
 * ── WHAT CHANGED, AND THE SHIPPED BUG IT FIXES ───────────────────────────────────────────────────
 * The title used to be the literal `"You're invited · FitOut"`, hand-written before
 * `src/app/layout.tsx:107` declared `template: "%s · FitOut"`. Measured on this tree before the
 * change: `<title>You're invited · FitOut · FitOut</title>` — the suffix twice, on the app's only
 * fully public, link-shared page. The title is returned BARE here and the template appends it once.
 *
 * ── THE VENUE, AND ONLY THE VENUE (T-11-OGOVERSHARE) ─────────────────────────────────────────────
 * No date, no address, no organizer name, no headcount, no booking reference. The recipient already
 * holds the link — but everything an unfurl states is stated to every intermediary that fetches it:
 * a chat service, a link scanner, a corporate preview proxy, a spam filter. The venue name is the
 * one fact that makes the preview useful; the rest is a durable copy of someone's plans in a log
 * they never see. The IMAGE beside this file states even less, and states it identically for every
 * token — read its header for why the two surfaces are allowed to differ.
 *
 * ── THE UNKNOWN-TOKEN SHAPE (T-11-OGORACLE) ──────────────────────────────────────────────────────
 * An unknown, malformed, revoked, voided or cancelled token gets the SAME shape minus the venue —
 * never a "not found", "expired" or "invalid" title. Two things are true at once and both matter:
 * a distinguishable failure title would be a new signal, and this function adds NO bit that the
 * page's own two branches do not already show. That is the line: the page may differ between a live
 * invite and an inactive one (showing the event is the product); nothing here may make the SET of
 * inactive causes distinguishable, and the image route may not vary at all.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const group = await resolveInvite(token);
  const venue = group.active ? group.listingTitle?.trim() : null;

  return {
    title: venue ? `You're invited to ${venue}` : "You're invited",
    description: venue
      ? `An organizer reserved ${venue} and invited you. Open the link to say if you're coming.`
      : "Open the link to say if you're coming.",
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

/**
 * `INACTIVE_TITLE` / `INACTIVE_BODY` USED TO BE DECLARED HERE (they were the two lines this comment
 * replaces, and anything citing this file at :71-72 is looking for them). They now live beside
 * `GROUP_INACTIVE` in `src/lib/group/rsvp.ts` and are imported above.
 *
 * The reasoning they carried is unchanged and is now stated at the declaration: ONE pair of constants
 * rendered from ONE branch, mirroring how 08-06 froze `GROUP_INACTIVE` into a single object — two literals
 * in two branches are two things that can drift apart, and the moment they do, the difference between them
 * is the oracle. What CHANGED is the number of surfaces: plan 11-19 added `not-found.tsx` beside this file,
 * rendering the same state, so "two branches" became "two files" and a module-private const could no longer
 * be the single source. `src/app/actions/group.ts` composes the same two into its one-sentence
 * `INVITE_INACTIVE`, so all three inactive paths now read one declaration.
 */

/**
 * `InviteCard` USED TO BE DECLARED HERE, and it now lives in `@/components/group/invite-card` beside
 * `InviteInactive`, which is the component this file's inactive branch renders (plan 11-19). Read that
 * file's header for why: the not-found boundary added next to this page has to render the SAME inactive
 * surface, and a security property that depends on two files continuing to look alike is a property that
 * breaks silently the first time somebody restyles one of them.
 *
 * Nothing about the box changed in the move — it is still the `PanelCard` plan 11-13 adopted (DS-11), and
 * `tests/design/card-pattern-coverage.test.ts`'s inventory row moved with the component, in this commit.
 */

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
  //
  // The two lines that used to spell that out here are now inside `resolveInvite` above, so this page and
  // its `generateMetadata` resolve the token EXACTLY ONCE and by exactly one route. Two call sites doing
  // their own parse-then-lookup is how the metadata half would eventually be given a looser predicate.
  const group = await resolveInvite(token);

  // THE SESSION IS READ, NEVER REQUIRED (D-116). Better Auth returns null for a guest, and null is the
  // expected case on this surface — there is deliberately no redirect, no notFound and no gate below it.
  const session = await auth.api.getSession({ headers: await headers() });
  const viewerId = session?.user?.id ?? null;
  const viewerName = session?.user?.name?.trim() ?? "";

  // THE ONE INACTIVE BRANCH. Unknown, malformed, regenerated, voided and cancelled-booking all arrive here,
  // on the same two sentences, with the same 200. Do not "improve" this by telling them apart (T-08-23).
  //
  // The two sentences are PASSED IN rather than baked into the component, so this file — the surface —
  // still owns its copy and still reaches the one declaration in `@/lib/group/rsvp` by import. The
  // not-found boundary beside this page renders the same component with the same two imports; that both
  // entrances reach one declaration is machine-checked by tests/design/invite-notfound-parity.test.ts.
  if (!group.active) {
    return <InviteInactive title={INACTIVE_TITLE} body={INACTIVE_BODY} />;
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
        {/* The named role, alone — no `font-semibold` / `leading-tight` / `tracking-tight` beside it, so
            the per-theme weight, leading and tracking actually reach the element (see the header). */}
        <h1 className="text-heading">You&apos;re invited to {spaceTitle}</h1>

        <dl className="space-y-3 text-body">
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
