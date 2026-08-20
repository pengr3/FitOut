// RsvpConfirmation (GROUP-03 · D-117 / D-120 / D-122, 08-UI-SPEC §3) — the calm post-RSVP state that
// replaces the choice buttons in the same card, with the event summary still standing above it.
//
// ⚠️ THE HONESTY RULE IS THE WHOLE POINT OF THIS COMPONENT (G3 / D-117 / Open Q9). A person who answered
// with a name and no email has NO channel: no in-app row, no email, and no way for us to recognise them if
// they come back to the link. So this component says exactly that, in plain words, instead of showing the
// same cheerful "we'll be in touch" everyone else gets. A blank-email guest who assumed a confirmation was
// coming — or that they could change their mind later — would be a silent dead end, which is the one thing
// D-117 says a name-only RSVP must not be.
//
// ⚠️ AND IT ONLY PROMISES AN EMAIL THAT WAS ACTUALLY SENT. `submitRsvp` emits the attendee's confirmation
// for a `yes` and DELIBERATELY not for a `no` — the shipped copy on both channels reads "you're on the
// list", which would be a false statement to mail to someone who just declined. So the "we've emailed you a
// copy" sentence is gated on `answer === "yes"` here too. `reachable` alone is NOT enough to claim a send.
//
// COLOUR: neutral throughout. A "yes" is not a success-green state and a "can't make it" is not a failure —
// 08-UI-SPEC §Color reserves `--success` to the confirmed BOOKING badge and puts NO alarm colour anywhere in
// the group flows at all. Both outcomes are ordinary, expected answers to a question.
//
// ⚠️ GREP TRIPWIRE (the 07-04 idiom, as in top-up-nudge.tsx). That absence is checked by grepping this file
// for the alarm token's own name, and a grep is only a real guard if the comment forbidding the thing cannot
// trip it — so the token is not spelled out anywhere here, comments included.
//
// Not "use client": pure presentation with no state and no handlers. It is rendered from inside RsvpForm
// (a client component), so it travels in the client bundle — but it imports nothing server-only, and the
// `action` slot is how the interactive "Change my answer" control is injected without this file owning any
// behaviour.
//
// ── THE REGION NOW HAS A NAME (plan 13-08 · 13-UI-SPEC § The Group Surfaces) ──────────────────────────────
// This is the ONE region that announces the RSVP RESULT, and it stays one. What it lacked was a name:
// `role="status"` is `nameFrom: author` in ARIA — a status region takes NO name from its own text — so
// without an author-supplied one the accessible name computes to the empty string. 13-UI-SPEC requires a
// non-empty name on the phase's alert regions and `live-regions.ts`'s rule 5 says the same in general.
//
// ⚠️ IT IS A LABEL, NOT A SECOND COPY OF THE SENTENCE, for the measured reason `share-link-box.tsx`'s twin
// records: on the VoiceOver/Safari pairing a NAMED live region can be announced BY ITS NAME INSTEAD OF ITS
// CONTENT. A name that duplicated the heading would read it twice; a name that paraphrased it would replace
// it with a worse version. Two words that say which region this is, and the sentences stay the content.
//
// It covers BOTH answers deliberately — a "can't make it" is as recorded as a "yes", and a name that said
// otherwise would be wrong half the time.

import { CalendarCheckIcon, CalendarOffIcon } from "lucide-react";

/** The region's NAME — see the header for why it is a label rather than a copy of the sentence. */
const RESULT_REGION_NAME = "RSVP recorded";

export function RsvpConfirmation({
  answer,
  reachable,
  action,
}: {
  /** What the SERVER recorded — never what the button optimistically hoped for. */
  answer: "yes" | "no";
  /**
   * D-117/G3 — `submitRsvp`'s own `reachable` flag. False means a blank-email guest: no account, no
   * address, therefore no confirmation anywhere but this screen and no way to change the answer later.
   */
  reachable: boolean;
  /** The "Change my answer" control, injected by RsvpForm. Absent when there is nothing to toggle. */
  action?: React.ReactNode;
}) {
  const Icon = answer === "yes" ? CalendarCheckIcon : CalendarOffIcon;

  return (
    // Announced rather than merely re-rendered: the choice buttons vanish and this takes their place, which
    // a screen-reader user would otherwise have to go hunting for (08-UI-SPEC §Accessibility).
    <div
      role="status"
      aria-live="polite"
      aria-label={RESULT_REGION_NAME}
      className="flex flex-col items-center gap-4 text-center"
    >
      <Icon className="size-8 text-muted-foreground" aria-hidden="true" />

      <div className="space-y-1">
        <h2 className="text-xl leading-tight font-semibold">
          {answer === "yes" ? "You're in — see you there." : "Thanks for letting us know."}
        </h2>

        {reachable ? (
          <p className="mx-auto max-w-prose text-sm text-muted-foreground">
            {answer === "yes" ? "We've emailed you a copy. " : ""}
            You can change your answer any time before the session starts.
          </p>
        ) : (
          // The G3 disclosure. Two plain sentences, muted rather than alarming — being unreachable is a
          // choice this person made and is allowed to make, not a mistake to scold them for.
          <p className="mx-auto max-w-prose text-sm text-muted-foreground">
            This is your only confirmation — we don&apos;t have an email to reach you. You won&apos;t be
            able to change your answer later.
          </p>
        )}
      </div>

      {action}
    </div>
  );
}
