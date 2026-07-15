"use client";

// BookCta (BOOK-01 · D-39/D-41) — the bookable-branch "Book this space" control on the listing rail. It
// is the client seam that turns the lifted slot selection (BookingSelectionProvider) into the placeHold
// POST that mints the pending hold on ENTERING checkout (D-39/SC#3), then lets placeHold redirect to the
// reserve page. Hold creation is ALWAYS this POST action, never a GET render (Pitfall 2) — this component
// only calls it.
//
// Result mapping (placeHold returns a discriminated union on failure; SUCCESS redirects, so the awaited
// value is undefined — same idiom as ReserveActions with confirmBooking):
//   - sign-in (D-41): route to /login with a callbackURL that encodes the listing + the selected window +
//     resume=1, so on return checkout resumes WITHOUT re-selecting the slot.
//   - activate-booking (!canBook): surface the Phase-1 "Start booking" activate action, then continue.
//   - taken (SC#4 race) / not-bookable / invalid: a calm neutral notice (NEVER red — occupancy is normal)
//     + a calendar refresh so the freed/taken slot re-reflects.
//
// Resume (D-41): when the page mounts with a restored window (resume=1 after sign-in), auto-invoke placeHold
// once so a single Book click round-trips through sign-in without the booker re-picking the window.

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useBookingSelection } from "@/components/availability/availability-calendar";
import type { SlotSelectionValue } from "@/components/availability/slot-picker";
import { activateBooking } from "@/app/actions/capability";
import type { PlaceHoldResult } from "@/app/actions/booking";

type PlaceHoldFn = (input: unknown) => Promise<PlaceHoldResult>;

export function BookCta({
  listingId,
  placeHold,
  resumeWindow,
}: {
  listingId: string;
  /** The placeHold server action, threaded from the RSC so the wiring is visible at the listing seam. */
  placeHold: PlaceHoldFn;
  /** A window restored from the sign-in callbackURL (resume=1) — auto-resumes checkout on mount (D-41). */
  resumeWindow?: SlotSelectionValue | null;
}) {
  const { selection } = useBookingSelection();
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [needsActivate, setNeedsActivate] = React.useState(false);

  const submit = React.useCallback(
    async (window: SlotSelectionValue) => {
      setPending(true);
      setNotice(null);
      // SUCCESS → placeHold redirects to the reserve page, so on the client the promise resolves to
      // undefined (navigation) and we stay `pending` as this control unmounts. A failure resolves a result.
      const result = (await placeHold({
        listingId,
        startUtc: window.startUtc,
        endUtc: window.endUtc,
        fullDay: window.fullDay,
      })) as PlaceHoldResult | undefined;
      if (!result) return;

      if (result.reason === "sign-in") {
        // Thread the listing + the selected window into the return path so checkout resumes on return (D-41).
        const params = new URLSearchParams({ start: window.startUtc, end: window.endUtc, resume: "1" });
        if (window.fullDay) params.set("fullDay", "1");
        const callback = `/listings/${listingId}?${params.toString()}`;
        router.push(`/login?callbackURL=${encodeURIComponent(callback)}`);
        return;
      }
      if (result.reason === "activate-booking") {
        setNeedsActivate(true);
        setNotice(result.error);
        setPending(false);
        return;
      }
      // taken / not-bookable / invalid — calm neutral notice + refresh the calendar so it reflects reality.
      setNotice(result.error);
      setPending(false);
      if (result.reason === "taken") router.refresh();
    },
    [listingId, placeHold, router],
  );

  // D-41 resume: fire the restored window exactly once on mount (ref-guarded against strict-mode double run).
  const resumedRef = React.useRef(false);
  React.useEffect(() => {
    if (resumedRef.current || !resumeWindow) return;
    resumedRef.current = true;
    void submit(resumeWindow);
  }, [resumeWindow, submit]);

  async function handleActivate() {
    setPending(true);
    setNotice(null);
    const res = await activateBooking();
    if (!res.ok) {
      setNotice(res.error);
      setPending(false);
      return;
    }
    // canBook is now true in the DB (placeHold re-reads the row, not the session) → continue checkout.
    const window = resumeWindow ?? selection;
    if (window) {
      setNeedsActivate(false);
      await submit(window);
      return;
    }
    setNeedsActivate(false);
    setPending(false);
    router.refresh();
  }

  // The active window is the live picker selection (fresh click) — resume drives its own auto-submit above.
  const window = selection;

  return (
    <div className="space-y-2">
      <Button
        size="lg"
        disabled={pending || !window}
        onClick={() => window && submit(window)}
        className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
      >
        {pending ? "Starting…" : "Book this space"}
      </Button>

      {!window && !pending && (
        <p className="text-center text-xs text-muted-foreground">Pick a time above to book.</p>
      )}

      {notice && (
        <p role="status" className="text-center text-sm text-muted-foreground">
          {notice}
        </p>
      )}

      {needsActivate && (
        <Button variant="secondary" size="lg" disabled={pending} onClick={handleActivate} className="w-full">
          Start booking
        </Button>
      )}
    </div>
  );
}
