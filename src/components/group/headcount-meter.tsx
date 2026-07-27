// HeadcountMeter (GROUP-04 · 08-UI-SPEC §2) — the ONE Display-scale figure on the whole management surface.
//
// GROUP-04 asks the organizer to "see the headcount and who's coming", so the headcount is the focal point,
// not a stat tucked into a card. 28/600 `tabular-nums` (the Display role, 08-UI-SPEC §Typography) — the same
// treatment the booking reference and the cancel review's question carry, and the only thing on this page
// allowed to have it.
//
// EVERY FIGURE IS SERVER-COMPUTED. `confirmed` is the owner-scoped `count(*)` of `yes` RSVPs and `capacity`
// is the D-111 `capacity_snapshot` — NOT the listing's live `maxOccupancy`, which a host may have edited
// since. This component does no arithmetic of any kind: even `full` arrives decided (`getHeadcount`), so the
// number the organizer reads and the number the seat-claim enforces cannot drift by restatement.
//
// "FULL" IS A HAPPY STATE, NOT AN ERROR (G4/D-112). At the cap the caption becomes "This group is full." in
// the SAME muted treatment — never red, never an alarm, never `--destructive`. A full group is the success
// case for this feature.
//
// ACCESSIBILITY. "3 of 12" alone is meaningless read aloud, so the figure carries `role="img"` + an
// `aria-label` that states the whole fact, and the visible caption is `aria-hidden` — otherwise a screen
// reader would hear "3 of 12 spots filled" and then "spots filled" again. One announcement, complete.
//
// The optional `progress` bar 08-UI-SPEC §2 floats is DELIBERATELY not rendered: it is marked a nicety in
// the contract itself, and a bar needs a fill colour — which on this surface would have to be either the
// reserved coral or an invented "coming green" the phase explicitly forbids (§New Tokens). The text is the
// contract; the bar would only be a colour decision in disguise.
//
// Not "use client" — a pure presentational component the management RSC renders directly.

export function HeadcountMeter({
  confirmed,
  capacity,
  full,
}: {
  /** Server-computed count of `yes` RSVPs (owner-scoped in the query's own WHERE, 08-06). */
  confirmed: number;
  /** The D-111 `capacity_snapshot` — the cap AUTHORITY, frozen at group creation. */
  capacity: number;
  /** Decided server-side (`confirmed >= capacity`); this component never compares the two itself. */
  full: boolean;
}) {
  const spotsLabel = `${confirmed} of ${capacity} spots filled`;

  return (
    <div className="space-y-1">
      <p
        role="img"
        aria-label={full ? `${spotsLabel} — this group is full` : spotsLabel}
        className="text-2xl leading-tight font-semibold tracking-tight tabular-nums sm:text-[28px]"
      >
        {confirmed} of {capacity}
      </p>
      {/* aria-hidden: the figure's own label above already says this, and saying it twice is worse than
          not saying it at all. Muted at the cap — a full group is not a warning (G4). */}
      <p aria-hidden="true" className="text-sm text-muted-foreground">
        {full ? "This group is full." : "spots filled"}
      </p>
    </div>
  );
}
