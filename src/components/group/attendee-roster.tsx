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
//   2. The organizer is added back at the places whose AUDIENCE is the organizer, and each of them adds
//      one to the RAW count. There are three, and plan 13-05 added the third: the management page renders
//      the meter as `confirmed + 1` of `capacity + 1` and hands the nudge an organizer-inclusive
//      `attendingTotal`, and `removeAttendee` returns an organizer-inclusive `attending` for the removal
//      alert below. So the figure above this list, the sentence above it, and the list itself all agree —
//      they would only disagree if one of them left out the person the roster visibly puts first.
//   3. THE ONE THING THAT MUST NEVER HAPPEN IS COUNTING THEM TWICE. `submitRsvp` deliberately lets an
//      organizer answer their own link, so a real `rsvp` row can exist for the same person this fixture
//      renders; adding a second `+ 1` anywhere — here, in `getHeadcount`, or on top of a figure that
//      already includes them — would claim a body that does not exist and, via the nudge, an overage
//      nobody owes. Note the shape of the three sites: all three increment `confirmed`, and none of them
//      increments each other.
//
// `no` rows live in a COLLAPSED native `<details>`: they are real information the organizer asked for, but
// they are not the point of the surface, and a native disclosure is keyboard-operable and screen-reader
// announced without a line of JavaScript.
//
// The Guest/Account tag is a neutral `secondary` badge carrying an ICON AND TEXT — the phase's badges are
// hue-indistinguishable by design (§New Tokens), so colour alone could never have carried the distinction
// (08-UI-SPEC §Accessibility).
//
// ── STATE-08 (plan 13-05) — THIS FILE OWNS THE REMOVAL ANNOUNCEMENT, AND IS THEREFORE A CLIENT ISLAND ────
//
// IT USED TO SAY "Not `use client`". That is no longer true, and the reason is the requirement rather
// than a convenience. The removal outcome — *"{Name} removed — {N} coming, {M} spots free."* — is a
// CAPACITY fact: it changes who the organizer can still ask, so STATE-08 puts it in an addressable
// in-page alert instead of a toast that is dismissible, timed and gone on refresh. An announcement of a
// change is state, state needs a client boundary, and the alert belongs directly above the list it
// describes. The alternative shapes were worse: a callback into a server component is not a thing, and a
// module-level store would have put a second mechanism on the page to move one sentence one level up.
//
// WHAT THE BOUNDARY ACTUALLY COSTS, measured rather than waved at: the entries were ALREADY crossing it
// — `RemoveAttendeeButton` is a client island and takes `rsvpId` and `name` per row — and every field on
// a `RosterEntry` is rendered into the HTML this component emits regardless. So the change adds no field
// to the client payload that the organizer's own DOM did not already hold. It carries no money, so
// GATE-05 is untouched.
//
// ⚠️ EXACTLY ONE REGION ANNOUNCES A REMOVAL (GATE-03 rule 6). The button's `toast.success` was DELETED
// rather than kept alongside this alert; two regions for one outcome is the defect, not the belt.
//
// ⚠️ NO ARITHMETIC HAPPENS HERE (T-13-05-COUNTCROSS). Both figures arrive finished on the action's own
// result — computed server-side, inside the transaction that performed the delete, from the row it holds
// the lock on. `attending` ALREADY INCLUDES THE ORGANIZER (D-113); adding one to it here would be the
// count-them-twice mistake this file's own header spends a paragraph on.

"use client";

import * as React from "react";
import {
  CircleUserRoundIcon,
  UserRoundCogIcon,
  UserRoundIcon,
  UsersRoundIcon,
} from "lucide-react";

import type { RosterEntry } from "@/lib/group/rsvp";
import { EmptyState } from "@/components/patterns/empty-state";
import { PanelCard } from "@/components/patterns/panel-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  RemoveAttendeeButton,
  type AttendeeRemoved,
} from "@/components/group/remove-attendee-button";

/**
 * 13-UI-SPEC § Copywriting Contract → STATE-08 alerts, composed from the SERVER'S OWN NUMBERS.
 *
 * The only judgement this function makes is grammatical: `1 spot free` rather than `1 spots free`. It
 * performs no arithmetic — it reads two finished figures and picks a suffix — because a plural rule is
 * about the sentence and a count is about the group.
 */
function removalSentence({ name, attending, spotsFree }: AttendeeRemoved): string {
  const places = spotsFree === 1 ? "1 spot free" : `${spotsFree} spots free`;
  return `${name} removed — ${attending} coming, ${places}.`;
}

/**
 * The removal region's NAME. See `share-link-box.tsx`'s twin for the full reasoning: `role="status"` is
 * `nameFrom: author`, so without an author-supplied name the accessible name is `""` — and the name is
 * deliberately a LABEL rather than a second copy of the sentence, because a named live region can be
 * announced by its name instead of its content.
 */
const REMOVAL_REGION_NAME = "Attendee removed";

function AttendeeRow({
  entry,
  removable,
  onRemoved,
}: {
  entry: RosterEntry;
  removable: boolean;
  onRemoved: (removed: AttendeeRemoved) => void;
}) {
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
        {/* The one interactive control on a row. The name is passed so the confirm dialog can name the
            person; it is escaped React text there too (G6), and it comes back out on the outcome so the
            alert above can name them without this row re-reading the list. */}
        {removable && (
          <RemoveAttendeeButton rsvpId={entry.rsvpId} name={entry.name} onRemoved={onRemoved} />
        )}
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

  // The LAST removal, or none yet. One slot rather than a list: STATE-08's alert states the roster's
  // current shape, and two stacked sentences would be two claims about one list, only one of them true.
  const [removed, setRemoved] = React.useState<AttendeeRemoved | null>(null);

  return (
    <div className="space-y-4">
      {/* ABOVE THE ROSTER, so the sentence is read before the list it describes (13-UI-SPEC § STATE-08),
          and OUTSIDE the card rather than inside it — the alert is about the list, not a row of it.

          `PanelCard tone="muted"` is DS-11's declared in-page advisory surface: not a new pattern, not
          `attention` tone (DS-10 reserves that for a genuine failure needing a human), and not the
          destructive variant, which renders NOWHERE in this phase. Taking someone off a roster is
          ordinary housekeeping — the seat goes back in the pool and they can RSVP again — which is the
          same reason the button that did it is neutral.

          The region wraps the panel rather than being it, because `PanelCard` takes no `role`: the bare
          wrapper shape `money-statement.tsx` uses, so the announced box is the panel, padding included. */}
      {removed && (
        <div role="status" aria-label={REMOVAL_REGION_NAME}>
          <PanelCard tone="muted">
            {/* Escaped React text (G6) — the name inside this sentence is the same attacker-controlled
                free text every other rendering of it is, and it is a text child here too. */}
            <p className="text-sm">{removalSentence(removed)}</p>
          </PanelCard>
        </div>
      )}
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
            <AttendeeRow key={entry.rsvpId} entry={entry} removable onRemoved={setRemoved} />
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
                <AttendeeRow
                  key={entry.rsvpId}
                  entry={entry}
                  removable={false}
                  onRemoved={setRemoved}
                />
              ))}
            </ul>
          </details>
        )}
      </CardContent>
      </Card>
    </div>
  );
}
