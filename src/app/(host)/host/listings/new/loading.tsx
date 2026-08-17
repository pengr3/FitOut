// STATE-01 — the loading state for `/host/listings/new`, and the FIRST of the two routes in this
// phase that deliberately get NO skeleton. Convention: see `(app)/bookings/loading.tsx`.
//
// ── WHY THERE IS NOTHING TO SKELETON ──────────────────────────────────────────────────────────────
// `new/page.tsx` renders zero markup. It re-checks `canHost`, creates an empty draft listing and
// `redirect()`s into the wizard at `[id]/edit` — every path out of it is a redirect, including both
// failure paths. So this route has NO resolved geometry for a placeholder to match, and the
// UI-SPEC's own rule ("a skeleton that does not match its content causes the layout shift it was
// built to prevent") resolves the case for us: draw no boxes, say what is happening.
//
// It still needs the file. The default export is `async`, which is what decides whether a segment can
// suspend at all, and this one suspends on a real INSERT — the wait is a database write, not a read
// that might be cached. Without a `loading.tsx` the visitor gets the previous screen frozen with no
// announcement, which is the exact accessibility hole T-11-A11YFILL is about.
//
// ── THE MARKUP, AND WHY IT IS HAND-WRITTEN RATHER THAN A PATTERN ──────────────────────────────────
// One `role="status"` with `aria-busy` and an `aria-label` — `role="status"` is `nameFrom:author`, so
// the label is what gives the live region a non-empty accessible name (measured in plan 11-07 with
// `dom-accessibility-api`; content alone computes to `""`). The sentence is VISIBLE here rather than
// `sr-only`, because it is the only thing on screen: there is no placeholder for it to caption. It is
// therefore the region's content as well as its name, and there is deliberately no second `sr-only`
// copy — that would announce the same sentence twice.
//
// `PANEL_MIN_HEIGHT` is the file's only box class and it comes from the inventory, not from here. It
// is the right constant for the right reason: it is the declared answer to "how much of the page does
// a waiting block claim", which is the only geometric question this route actually has.

import { PANEL_MIN_HEIGHT } from "@/lib/design/measurements";
import { cn } from "@/lib/utils";

const ANNOUNCEMENT = "Creating your listing";

export default function NewListingLoading() {
  return (
    // `max-w-3xl` matches the wizard this route is about to redirect into, so the sentence sits in
    // the column the next screen uses rather than jumping width on arrival.
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div
        role="status"
        aria-busy="true"
        aria-label={ANNOUNCEMENT}
        className={cn(PANEL_MIN_HEIGHT, "flex items-center justify-center")}
      >
        <p className="text-sm text-muted-foreground">{ANNOUNCEMENT}…</p>
      </div>
    </div>
  );
}
