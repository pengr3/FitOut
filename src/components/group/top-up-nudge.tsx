// TopUpNudge (D-114 / A3 · 08-UI-SPEC §2, G5, Open Q10) — the over-RSVP corroboration signal.
//
// WHAT IT IS. The organizer booked for `declaredPax` people on a listing that prices extra heads, and more
// people than that have now said yes. That discrepancy is worth telling them BEFORE they turn up, so the
// conversation with the host at the door is not a surprise. Stating the gap plainly, once, is the whole job.
//
// ⚠️ WHAT IT IS NOT — AND THE OMISSION IS THE DECISION, NOT AN UNFINISHED EDGE (Open Q10 / A3 / D-114). There
// is NO money-moving control in this block: no button, no link, no amount, no total. The automated in-app
// top-up is an EXPLICIT deferred fast-follow, so a control promising to settle the difference in-app would be
// a lie told in a button label — it would take an organizer's intent to square up and drop it on the floor.
// v1 records and nudges; the difference is settled with the host at check-in, which is exactly, and only,
// what the copy claims. When the rail lands, the amount it quotes must be server-computed (G8/D-46) — this
// component must not grow arithmetic over money in the meantime.
//
// ⚠️ GREP TRIPWIRE (the 07-04 idiom). That absence is checked by grepping this file for the missing CTA's own
// label, for the verb of billing a saved payment instrument, and for the instrument itself — so none of the
// three is spelled out anywhere here, comments included. A grep that the comment forbidding the thing can
// trip is not a guard, which is why this sentence describes them instead of naming them.
//
// ⚠️ IT IS NOT A WARNING (G5 / 08-UI-SPEC §Color). Neutral `alert`, default variant, muted body. Over-RSVP is
// CORROBORATION, not a violation: the RSVP list is not the door policy, and the D-112 seat-claim cap is the
// only hard limit in this feature. An alarm colour would tell an organizer they had done something wrong by
// being popular, and the phase adds no alarm colour anywhere. §New Tokens forbids inventing a "top-up amber"
// for this block specifically.
//
// ⚠️ THE DOUBLE GUARD IS THE CONTRACT (08-UI-SPEC §2 + G5), and both halves are checked below in one place:
//   1. `extraHeadFee > 0` — the listing prices extra heads at all. On a FLAT listing (the common case, and
//      `null` on any listing predating D-108) this block does not exist: there is no extra head to owe for,
//      so the nudge would be a fee the UI invented out of nothing.
//   2. `attendingTotal > declaredPax` — more people are coming than the booking was quoted for. At or under
//      the declared count there is no gap, and narrating a non-gap is noise on the surface whose focal point
//      is the headcount two blocks up.
// The component returns null rather than rendering an empty shell, so "absent" is structurally absent.
//
// ⚠️ BOTH SIDES OF THAT COMPARISON ARE ORGANIZER-INCLUSIVE, AND THAT IS THE WHOLE OF WR-04. `declaredPax` has
// always included the organizer — `pax-stepper.tsx` tells them so in as many words ("This includes you"). The
// count it used to be compared against did not, because the organizer is a roster fixture rather than an
// `rsvp` row (D-113). Comparing the two bases silently cost exactly one person: with `declaredPax = 3` and
// three friends saying yes, four people were coming and `3 <= 3` kept this block quiet on the very first case
// it exists to catch. The prop is named `attendingTotal` rather than a count of RSVPs precisely so the basis
// is STATED at every call site instead of inferred — the silent mismatch is how this shipped wrong once.
//
// EVERY NUMBER IS THE SERVER'S. `attendingTotal` is `getHeadcount`'s owner-scoped count of `yes` rows plus the
// organizer, added once by the management page; `declaredPax` and `extraHeadFee` come off the same
// owner-scoped booking/listing read (08-06). The one piece of arithmetic here is the difference between two
// server-supplied counts, restated so the organizer does not have to do it in their head.
//
// Not "use client" — pure presentation, rendered directly by the management RSC.
//
// ── THE BOX IS `PanelCard tone="muted"` (DS-11 · 13-UI-SPEC, plan 13-08) ──────────────────────────────────
//
// It used to be `ui/alert`'s default variant. The swap is D-79's design-system pass, and it changes two
// things, both of which the surface's own decisions already required:
//
//   1. ONE ADVISORY SHAPE ON THIS PAGE, NOT TWO. Plan 13-05 put the STATE-08 removal and rotation alerts on
//      `PanelCard tone="muted"` and called it "DS-11's declared in-page advisory surface". This block is the
//      third advisory on the same page and was the only one wearing a different box.
//   2. ⚠️ THE `role="alert"` IS GONE, AND ITS REMOVAL IS THE POINT RATHER THAN A SIDE EFFECT. `ui/alert`
//      hardcodes that role, so this block ANNOUNCED ITSELF ASSERTIVELY on every fresh navigation — while
//      being ordinary static page content that has not changed while anyone was looking at it. A freshly
//      navigated page is a page, not an event (GATE-03's rule for this phase; `share-link-box.tsx` states
//      the same rule from the other side, which is why its rotation alert stays silent on first render).
//      Two shipped call sites on this route pass `role="status"` to `Alert` precisely to climb back down
//      from that default; a panel needs no such override because it never claimed to be a region.
//      Nothing is lost: the copy is durable page content, and the organizer reads it.
//
// THE COPY IS BYTE-IDENTICAL and the two guards are untouched. `title` / `description` are `PanelCard`'s
// own slots and render the same two type treatments the alert's title and description did; the decorative
// `aria-hidden` icon is dropped, which is what makes this block match the two alerts beside it.

import { PanelCard } from "@/components/patterns/panel-card";

export function TopUpNudge({
  attendingTotal,
  declaredPax,
  extraHeadFee,
}: {
  /**
   * The ORGANIZER-INCLUSIVE head count: server-computed `yes` RSVPs plus the organizer (D-113), which is the
   * SAME figure HeadcountMeter renders (no second count) and the SAME basis as `declaredPax`, which
   * `pax-stepper.tsx` tells the organizer includes them. The `+ 1` is added ONCE, by the management page.
   */
  attendingTotal: number;
  /** What the booking was quoted for (D-108), organizer included. Null on a booking predating the field. */
  declaredPax: number | null;
  /** The listing's per-extra-head price in minor units (D-108). Null or 0 ⇒ a flat listing. */
  extraHeadFee: number | null;
}) {
  // GUARD 1 — the listing prices extra heads. Null (unpriced/legacy) and 0 (flat) both mean "never render".
  if (extraHeadFee == null || extraHeadFee <= 0) return null;
  // GUARD 2 — more people are coming than the booking declared. Null declaredPax has no gap to report.
  if (declaredPax == null || attendingTotal <= declaredPax) return null;

  const extra = attendingTotal - declaredPax;

  return (
    // `tone="muted"` deliberately — see the header. There is no alarm tone on this surface and there must
    // not be: this is information the organizer asked for by inviting people, not a problem they caused.
    //
    // "are coming", NOT "have RSVP'd" (08-UI-SPEC §2's original wording): the figure now includes the
    // organizer, who never RSVP'd to anything. Stating a total as a count of RSVPs would be off by the same
    // one person this component was fixed to stop losing.
    <PanelCard
      tone="muted"
      title="More people are coming than you booked for"
      description={`${attendingTotal} people are coming, but you booked for ${declaredPax}. You may owe a bit more for the extra ${extra} ${extra === 1 ? "person" : "people"} at check-in.`}
    />
  );
}
