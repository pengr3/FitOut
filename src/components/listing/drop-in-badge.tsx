// DropInBadge (OPEN-04 · OC-12 — 09-UI-SPEC § Component Inventory) — names the occupancy mode wherever a
// drop-in listing appears next to whole-space ones: the search card's type line, the listing page's
// Availability heading, and the reserve-page summary.
//
// REAL TEXT, NEVER AN ICON-ONLY MARKER. The label below is a word a booker can read, search for and
// repeat; a bare glyph would be a private code they have to learn. It is also deliberately NOT accent —
// § Color lists the five accent uses this phase allows and this is not one of them. The mode is a neutral
// fact about how the space is sold, not a recommendation, and the secondary token is what every other
// descriptive chip on those surfaces already uses (listings/[id]/page.tsx:219).
//
// Booker-facing vocabulary rule (§ Copywriting): never "open capacity", never "occupancy mode" — say pass,
// spot, day, drop-in.
//
// Not "use client": pure presentation.

import { Badge } from "@/components/ui/badge";

export function DropInBadge({ className }: { className?: string }) {
  return (
    <Badge variant="secondary" className={className}>
      Drop-in
    </Badge>
  );
}
