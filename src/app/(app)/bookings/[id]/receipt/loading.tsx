// STATE-01 — the loading state for `/bookings/[id]/receipt`.
// Convention: see `(app)/bookings/loading.tsx`.
//
// NO HEADING, AND THE DECISION IS EXPLICIT RATHER THAN INHERITED. The sibling rule is *"no `<h1>` unless
// the resolved heading is a FIXED string"*, and this route's heading IS fixed — it is the single word
// `Receipt` on every render, with none of the branching that made the cancel page's heading unsafe to
// preview. So the rule as written would permit one here.
//
// It is still omitted, because the heading is not the thing in doubt: the DOCUMENT is. D-76 gates this
// route on money having moved, and the predicate needs a booking read plus — on the reversal shape — a
// live PayMongo probe before it knows whether a receipt exists at all. An unpaid hold, a stranger's
// booking and a booking id that names nothing all resolve to the same bare 404. Painting the word
// `Receipt` while the server is still deciding whether there IS one would put a document title on screen
// for something the page may be about to say does not exist — and on a money surface that is the same
// class of mistake as previewing a refund tier. A fixed heading is safe to show early only when its
// EXISTENCE is fixed too, and here it is not.
//
// The heading also sits above the panels rather than inside one, so a bare copy would be at the right
// indent and the wrong offset the moment the panels resolve.
//
// The container is `BOOKING_SHELL` — the same constant `receipt/page.tsx` renders, so "copied from the
// sibling verbatim" is mechanical rather than an instruction to the next author (plan 13-01). It renders
// as a plain `div` and NEVER opens a second landmark of the kind `(app)/layout.tsx` already wraps
// `{children}` in for this route — a nested one is the defect `bookings/[id]/page.tsx`'s header records
// in full, and it is pinned by `e2e/shell.spec.ts`.
//
// ⚠ THE OPENING TAG OF THAT LANDMARK IS NOT SPELLED ANYWHERE IN THIS FILE. The acceptance check for the
// rule above is a raw count of it over this source expecting ZERO, and a grep is only a guard while the
// comment forbidding the thing cannot trip it (13-PATTERNS § H; `booking-row.tsx:112` is the precedent
// this repository cites for naming a token descriptively). Measured, not hypothesised: a first draft of
// this paragraph wrote the tag out and made the count read 1 against a correct file.
//
// ⚠ IT IS A `div` AND NOT AN `article` EITHER, even though the resolved page's shell is one. The
// `receipt` hook and the `<article>` that carries it are what every print assertion is scoped inside; a
// skeleton that opened the same element would put a second, empty `receipt`-shaped box in the tree for
// the duration of the stream, which is exactly the ambiguity `selector-contract.ts`'s one-literal-per-
// surface rule exists to prevent.

import { BOOKING_SHELL } from "@/lib/design/measurements";
import { PanelSkeleton } from "@/components/patterns/panel-skeleton";

export default function BookingReceiptLoading() {
  return (
    <div className={BOOKING_SHELL}>
      <PanelSkeleton label="Loading your receipt" />
    </div>
  );
}
