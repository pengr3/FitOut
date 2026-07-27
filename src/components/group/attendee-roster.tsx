// AttendeeRoster / AttendeeRow (GROUP-04 · D-113/D-116, 08-UI-SPEC §2) — "who's coming".
//
// THE ROSTER IS ORGANIZER-ONLY (08-UI-SPEC Open Q4). Attendees on the public invite page never see this list
// — guest names and attendance are personal data the invitees did not consent to publish, and GROUP-04
// assigns the roster to the organizer specifically. The enforcement is not here: `getRoster` carries
// `b.booker_id = $organizerId` inside its own WHERE, so a foreign roster is UNREADABLE rather than merely
// unrendered. This component is the display half of that decision, not the gate.
//
// ⚠️ GUEST NAMES ARE ATTACKER-CONTROLLED FREE TEXT (G6 / T-08-20). They are rendered as React text children,
// which React escapes automatically. React's raw-markup escape hatch does not appear in this file and must
// never be added — an organizer's screen is exactly where a stored-XSS payload typed into a public RSVP form
// would want to land. The email half of the same rule is `escapeHtml` in email.ts.
//
// ⚠️ GREP TRIPWIRE (the 07-04 idiom). That absence is checked by grepping this file for the escape hatch's
// own prop name, so the name is deliberately not spelled out anywhere here — a grep that the comment
// forbidding the thing can trip is not a guard.
//
// ORDERING IS THE SERVER'S (`getRoster` sorts `yes` first, then oldest-first). This component partitions the
// already-sorted list rather than re-sorting it, so the order the organizer reads is the order the query
// promised.
//
// D-113 — THE ORGANIZER IS ROW #1. They booked the space and they are attendee #1, so the roster opens with
// them rather than making them hunt for themselves in a list of guests. Their row carries no Remove control
// (you cannot remove yourself from your own booking; cancelling is the action for that, and it lives on the
// booking detail).
//
// ⚠️ THE ORGANIZER ROW IS NOT COUNTED HERE, AND MUST NOT BE. The focal headcount comes from `getHeadcount`
// (`yes` RSVP rows only, D-113) — this row is a display fixture. Adding "+1 for the organizer" in either
// place would put the page's own two numbers into disagreement.
//
// `no` rows live in a COLLAPSED native `<details>`: they are real information the organizer asked for, but
// they are not the point of the surface, and a native disclosure is keyboard-operable and screen-reader
// announced without a line of JavaScript.
//
// The Guest/Account tag is a neutral `secondary` badge carrying an ICON AND TEXT — the phase's badges are
// hue-indistinguishable by design (§New Tokens), so colour alone could never have carried the distinction
// (08-UI-SPEC §Accessibility).
//
// Not "use client" — a pure presentational component the management RSC renders directly. The one
// interactive control on a row (Remove attendee) is its own client island.

import { CircleUserRoundIcon, UserRoundCogIcon, UserRoundIcon } from "lucide-react";

import type { RosterEntry } from "@/lib/group/rsvp";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

function AttendeeRow({ entry }: { entry: RosterEntry }) {
  // D-116 — a display distinction only. It NEVER drives an authorization decision: an account RSVP and a
  // guest RSVP occupy exactly the same kind of seat.
  const AccountIcon = entry.isAccount ? CircleUserRoundIcon : UserRoundIcon;

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0 space-y-0.5">
        {/* Escaped React text (G6). Never interpolated into markup, never into an href. */}
        <p className="truncate text-sm font-semibold">{entry.name}</p>
        <p className="text-sm text-muted-foreground">
          {entry.status === "yes" ? "Coming" : "Can't make it"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="secondary" className="gap-1.5">
          <AccountIcon className="size-3.5" aria-hidden="true" />
          {entry.isAccount ? "Account" : "Guest"}
        </Badge>
      </div>
    </li>
  );
}

export function AttendeeRoster({ entries }: { entries: RosterEntry[] }) {
  // Partitioning a list the server already ordered — see the header. Unanswered invitees are not rows at
  // all: there is no `rsvp` row until someone answers, and inventing a "pending" row would mean inventing a
  // number (how many people the link reached) that nothing in this system knows.
  const coming = entries.filter((e) => e.status === "yes");
  const declined = entries.filter((e) => e.status === "no");

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <h2 className="text-xl leading-tight font-semibold tracking-tight">Who&apos;s coming</h2>

        <ul className="divide-y">
          {/* D-113 — row #1, always, even before anyone answers. */}
          <li data-organizer="true" className="flex items-center justify-between gap-3 pb-3">
            <div className="min-w-0 space-y-0.5">
              <p className="truncate text-sm font-semibold">You</p>
              <p className="text-sm text-muted-foreground">You booked this space</p>
            </div>
            <Badge variant="secondary" className="shrink-0 gap-1.5">
              <UserRoundCogIcon className="size-3.5" aria-hidden="true" />
              Organizer
            </Badge>
          </li>
          {coming.map((entry) => (
            <AttendeeRow key={entry.rsvpId} entry={entry} />
          ))}
        </ul>

        {/* The empty state keeps the organizer row above it and the share block above that (08-UI-SPEC §2) —
            an organizer who has not shared the link yet is one step from the fix, not at a dead end. */}
        {entries.length === 0 && (
          <div className="space-y-1">
            <p className="text-sm font-semibold">No one&apos;s RSVP&apos;d yet</p>
            <p className="text-sm text-muted-foreground">
              Share your invite link and people will show up here as they respond.
            </p>
          </div>
        )}

        {declined.length > 0 && (
          <details>
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Can&apos;t make it ({declined.length})
            </summary>
            <ul className="mt-1 divide-y">
              {declined.map((entry) => (
                <AttendeeRow key={entry.rsvpId} entry={entry} />
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
