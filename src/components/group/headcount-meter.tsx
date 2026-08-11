// HeadcountMeter (GROUP-04 · 08-UI-SPEC §2) — the ONE Display-scale figure on the whole management surface.
//
// GROUP-04 asks the organizer to "see the headcount and who's coming", so the headcount is the focal point,
// not a stat tucked into a card. 28/600 `tabular-nums` (the Display role, 08-UI-SPEC §Typography) — the same
// treatment the booking reference and the cancel review's question carry, and the only thing on this page
// allowed to have it.
//
// EVERY FIGURE IS SERVER-COMPUTED, AND BOTH ARE ORGANIZER-INCLUSIVE (D-113 · WR-03). `confirmed` is the
// owner-scoped `count(*)` of `yes` RSVPs PLUS the organizer, and `capacity` is the D-111 `capacity_snapshot`
// PLUS the organizer — which is the listing's `maxOccupancy` as it stood at group creation, NOT its live
// value, which a host may have edited since. The organizer is added back exactly once, by the management
// page, because they are visibly row #1 of the roster below this figure: a meter that omitted them would
// disagree with the list directly underneath it. This component still does no arithmetic of any kind — it
// does not add the organizer, and it does not derive `full`, which arrives already decided (`getHeadcount`,
// against the raw snapshot) so the number the organizer reads and the number the seat-claim enforces cannot
// drift by restatement.
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
  /**
   * The organizer-inclusive attending count: the owner-scoped `count(*)` of `yes` RSVPs (08-06) plus the
   * organizer, added by the caller (D-113). This is people in the room, not rows in a table.
   */
  confirmed: number;
  /**
   * The organizer-inclusive cap: the D-111 `capacity_snapshot` — the cap AUTHORITY, frozen at group creation
   * and organizer-EXCLUSIVE because it governs `rsvp` rows — plus 1, added by the same caller. It therefore
   * equals the listing's `maxOccupancy` at the moment the group was created.
   */
  capacity: number;
  /**
   * Decided server-side against the RAW snapshot (`getHeadcount`: `yes` rows >= `capacity_snapshot`) and
   * passed straight through. It is deliberately NOT re-derived from the two organizer-inclusive numbers
   * above: `full` is a fact about the seat-claim, and only the seat-claim's own basis can decide it.
   */
  full: boolean;
}) {
  const spotsLabel = `${confirmed} of ${capacity} spots filled`;

  return (
    <div className="space-y-1">
      <p
        role="img"
        aria-label={full ? `${spotsLabel} — this group is full` : spotsLabel}
        className="text-2xl leading-tight font-semibold tracking-tight tabular-nums sm:text-display"
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
