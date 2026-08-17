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
// booking detail). That is STRUCTURAL rather than conditional: row #1 is a hand-written display fixture with
// no `rsvpId` to remove, so there is no branch here that a later edit could flip the wrong way.
//
// THE REMOVE CONTROL IS ON `yes` ROWS ONLY, and that is a copy-honesty decision (08-UI-SPEC §Copywriting >
// Destructive confirmations). The locked confirm copy promises "this frees up their spot" — true of someone
// holding a seat, and a plain falsehood over a row in the "Can't make it" list, which holds no seat and
// counts toward nothing. Tidying declines is not worth a dialog that misstates what it does.
//
// ⚠️ THE ORGANIZER IS COUNTED EXACTLY ONCE ON THIS PAGE, AND THIS ROW IS NOT WHERE IT HAPPENS (D-113 · WR-03).
// Three facts, in the order they matter:
//   1. Row #1 is a display FIXTURE. The organizer has no `rsvpId` and no `rsvp` row of their own — which is
//      also the reason `capacity_snapshot` excludes them (it caps rows, and they never occupy one).
//   2. The management page adds the organizer back ONCE, at the one place with the organizer as its
//      audience: it renders the meter as `confirmed + 1` of `capacity + 1` and hands the nudge an
//      organizer-inclusive `attendingTotal`. So the figure above this list and the list itself agree —
//      they would only disagree if the meter left out the person the roster visibly puts first.
//   3. THE ONE THING THAT MUST NEVER HAPPEN IS COUNTING THEM TWICE. `submitRsvp` deliberately lets an
//      organizer answer their own link, so a real `rsvp` row can exist for the same person this fixture
//      renders; adding a second `+ 1` anywhere — here, in `getHeadcount`, or in a second call site — would
//      claim a body that does not exist and, via the nudge, an overage nobody owes.
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

import {
  CircleUserRoundIcon,
  UserRoundCogIcon,
  UserRoundIcon,
  UsersRoundIcon,
} from "lucide-react";

import type { RosterEntry } from "@/lib/group/rsvp";
import { EmptyState } from "@/components/patterns/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RemoveAttendeeButton } from "@/components/group/remove-attendee-button";

function AttendeeRow({ entry, removable }: { entry: RosterEntry; removable: boolean }) {
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
        {/* The one interactive control on a row — a client island inside this server component. The name is
            passed so the confirm dialog can name the person; it is escaped React text there too (G6). */}
        {removable && <RemoveAttendeeButton rsvpId={entry.rsvpId} name={entry.name} />}
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
            <AttendeeRow key={entry.rsvpId} entry={entry} removable />
          ))}
        </ul>

        {/* The empty state keeps the organizer row above it and the share block above that (08-UI-SPEC §2) —
            an organizer who has not shared the link yet is one step from the fix, not at a dead end.

            STATE-04 (plan 11-16) — THE SHARED SHELL, AND THIS FILE IS WHERE THE SURFACE ACTUALLY IS. The
            plan named `(app)/bookings/[id]/group/page.tsx` as the file to edit; that page renders
            `<AttendeeRoster entries={roster} />` and owns no zero-branch of its own. The roster's zero is
            here, and this is its only call site. Same finding shape as plan 11-13's `price-breakdown.tsx`.

            THE TITLE WAS A `<p className="text-sm font-semibold">` — shell A's exact defect, in a second
            place the UI-SPEC's two-shell table never counted. `titleAs="h3"` because this block sits under
            this card's own `<h2>Who's coming</h2>`; `h2` here would put two h2s in one panel.

            Both strings are byte-identical to the shipped ones.

            `actions={null}`, and it is the composition rather than a shrug: the invite affordance the
            body names is `<ShareLinkBox>`, rendered by the same page DIRECTLY ABOVE this card. Passing it
            here would put two copy-this-link controls for one link on one screen — the roster's job is to
            point at the affordance, not to grow a second one.

            NOTE THE NESTING, since it is a real cost: this dashed panel sits inside `CardContent`'s
            `p-4 sm:p-6`, so the empty region carries 24 + 32 = 56px of inset at `sm`. Accepted rather
            than special-cased — the pattern owns its geometry on purpose, and a `className` escape hatch
            for one adopter is how one shell becomes two again. */}
        {entries.length === 0 && (
          <EmptyState
            icon={UsersRoundIcon}
            titleAs="h3"
            title="No one's RSVP'd yet"
            body="Share your invite link and people will show up here as they respond."
            actions={null}
          />
        )}

        {declined.length > 0 && (
          <details>
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Can&apos;t make it ({declined.length})
            </summary>
            <ul className="mt-1 divide-y">
              {declined.map((entry) => (
                <AttendeeRow key={entry.rsvpId} entry={entry} removable={false} />
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
