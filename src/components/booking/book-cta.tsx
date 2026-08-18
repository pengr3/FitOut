"use client";

// BookCta (BOOK-01 · D-39/D-41) — the bookable-branch "Book this space" control on the listing rail. It
// is the client seam that turns the lifted slot selection (BookingSelectionProvider) into the placeHold
// POST that mints the pending hold on ENTERING checkout (D-39/SC#3), then lets placeHold redirect to the
// reserve page. Hold creation is ALWAYS this POST action, never a GET render (Pitfall 2) — this component
// only calls it.
//
// Result mapping (placeHold returns a discriminated union on failure; SUCCESS redirects, so the awaited
// value is undefined — same idiom as ReserveActions with confirmBooking):
//   - sign-in (D-41): route to /login with a callbackURL that encodes the listing + the selection +
//     resume=1, so on return checkout resumes WITHOUT re-picking.
//   - activate-booking (!canBook): surface the Phase-1 "Start booking" activate action, then continue.
//   - taken / sold-out (SC#4 race) / not-bookable / invalid: a calm neutral notice (NEVER red — occupancy
//     is normal) + a calendar refresh so the freed/taken capacity re-reflects.
//
// Resume (D-41): when the page mounts with a restored selection (resume=1 after sign-in), auto-invoke the
// hold action once so a single Book click round-trips through sign-in without the booker re-picking.
//
// PHASE 9 (OPEN-02 · OC-02) — ONE CONTROL, TWO PAYLOAD SHAPES. An exclusive listing sends a window
// ({startUtc, endUtc, fullDay}); a drop-in listing sends a DATE and a pass count ({date, requestedPasses})
// and nothing that resembles a time window. That is not cosmetic: `openHoldSchema` carries no window fields
// at all, so a smuggled one is stripped server-side (T-09-26), and the entry-window instants are derived
// from the listing's own operating hours inside the claim. The branch is taken on the LISTING's persisted
// occupancy mode, threaded from the RSC — never on which selection happens to be populated.
//
// The open payload also carries a PER-SELECTION idempotency token (CR-06). The exclusive payload does not,
// and that asymmetry is deliberate: `placeHold` matches an own-hold on the exact `(starts_at, ends_at)`
// window, so a different pick is already a different booking there. On the open path a DATE is the window,
// so "the same submit" is a thing only the client can say — see the memo below.

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useBookingSelection } from "@/components/availability/availability-calendar";
import type { SlotSelectionValue } from "@/components/availability/slot-picker";
import { activateBooking } from "@/app/actions/capability";
import type { PlaceHoldResult } from "@/app/actions/booking";

/** Exported since 12-10: `BookingPanel` threads the two actions through to this control. */
export type PlaceHoldFn = (input: unknown) => Promise<PlaceHoldResult>;

/** A drop-in selection restored from the sign-in callbackURL, or picked in the calendar. */
export type OpenPick = { dateIso: string; passes: number };

/**
 * What this control is about to submit. Discriminated rather than a merged bag of optional fields so the
 * two payloads cannot be half-built: an open submit has no window to forget to strip.
 */
type CtaSelection =
  | { kind: "exclusive"; window: SlotSelectionValue }
  | { kind: "open"; pick: OpenPick };

export function BookCta({
  listingId,
  placeHold,
  placeOpenHold,
  occupancyMode,
  resumeWindow,
  resumeOpen,
  label,
  layout = "block",
}: {
  listingId: string;
  /** The placeHold server action, threaded from the RSC so the wiring is visible at the listing seam. */
  placeHold: PlaceHoldFn;
  /** Its drop-in twin (OPEN-02), threaded the same way. Each action admits exactly one occupancy mode. */
  placeOpenHold: PlaceHoldFn;
  /** The LISTING ROW's persisted mode — the only input that decides which payload shape is sent. */
  occupancyMode: "exclusive" | "open_capacity";
  /** A window restored from the sign-in callbackURL (resume=1) — auto-resumes checkout on mount (D-41). */
  resumeWindow?: SlotSelectionValue | null;
  /** The drop-in twin of resumeWindow: `?date=YYYY-MM-DD&passes=N&resume=1`, re-validated server-side. */
  resumeOpen?: OpenPick | null;
  /**
   * The IDLE label, when the surface rendering this control wants to name the amount (D-59 #3, plan
   * 12-10 — the mobile sheet's pinned bar and the sticky bottom bar both read `Book · {total}`).
   *
   * OPTIONAL AND DEFAULTING TO THE SHIPPED STRING, which is load-bearing rather than polite: the rail
   * placement passes nothing, so `Book this space` still names the desktop CTA and every existing
   * `getByRole("button", { name: "Book this space" })` — `e2e/helpers/booker-seed.ts`'s `placeHold`
   * included — resolves to exactly the control it always did.
   *
   * IT NAMES THE BUTTON; IT NEVER PRODUCES THE FIGURE. The caller composes it from
   * `selectedTotalLabel`, which is the same lookup and the same `formatMoney` call `PriceBreakdown`'s
   * `Total` makes — that is what makes the two strings byte-equal (GATE-05 / T-12-10-BARPRICE).
   */
  label?: string;
  /**
   * How this control lays itself out. `"block"` is the shipped full-width column; `"bar"` is the
   * 44px inline action inside RESP-02's sticky bottom bar (plan 12-10).
   *
   * ⚠ IT IS A LAYOUT FORK AND NOT A SECOND SUBMISSION PATH, WHICH IS THE ENTIRE POINT OF DOING IT
   * HERE. D-59 #3 has the bar submit the hold DIRECTLY when a window is already picked — the sheet is
   * skipped — and that submit has to be the same `submit()` above: the same server action, the same
   * sign-in redirect, the same `activate-booking` recovery, the same refusal sentence from the same
   * server ruling. A second component wired to `placeHold` would be a second place for the guard, the
   * resume and the notice to be almost right. So the bar renders THIS control in a different box.
   *
   * THERE IS EXACTLY ONE `role="status"` IN THIS FILE and both layouts share it, which is a
   * constraint rather than tidiness: `src/lib/design/live-regions.ts` keys `book-cta-notice` to this
   * file at ordinal 1, and a second status element in the source would read as an undeclared region
   * to `tests/design/live-regions.test.tsx`'s SCAN 2 even though only one can ever be on screen.
   */
  layout?: "block" | "bar";
}) {
  const { selection, openSelection } = useBookingSelection();
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [needsActivate, setNeedsActivate] = React.useState(false);

  const isOpen = occupancyMode === "open_capacity";

  // The drop-in pick this control would submit — the live picker selection, or the restored one on a
  // resume mount. Read only on an open listing, so an exclusive listing mints nothing.
  const openPick: OpenPick | null = isOpen ? (openSelection ?? resumeOpen ?? null) : null;

  // ── THE PER-SELECTION IDEMPOTENCY TOKEN (CR-06 / D-42) — the dependency list IS the design ──────────
  // Sent on the OPEN payload only, and memoized on exactly three things: the listing, the picked DATE and
  // the pass COUNT.
  //
  //  - STABLE across repeated clicks on the SAME selection, so a genuine double-submit carries one token
  //    and replays into one booking instead of claiming a second set of seats. (The server's tokenless arm
  //    still matches a live pending hold, so this is the second lock on that door, not the only one.)
  //  - CHANGES when the booker picks a different date or a different number of passes, and a fresh mount
  //    after the post-booking redirect mints a fresh one. That is CR-06's journey — buy 2 passes for
  //    Saturday, pay, come back for 2 more — and it must read as a NEW purchase, never a replay. Keying
  //    the token to the selection is what makes "the same submit" a thing the client can actually say.
  //
  // The random nonce is what stops two BOOKERS (or two sessions) sharing a token for the same selection;
  // the selection prefix is what makes a token legible in a log. Well under the 200-char schema bound.
  const openIdempotencyKey = React.useMemo(
    () => `${listingId}:${openPick?.dateIso ?? ""}:${openPick?.passes ?? ""}:${crypto.randomUUID()}`,
    [listingId, openPick?.dateIso, openPick?.passes],
  );

  const submit = React.useCallback(
    async (sel: CtaSelection) => {
      setPending(true);
      setNotice(null);
      // SUCCESS → the action redirects to the reserve page, so on the client the promise resolves to
      // undefined (navigation) and we stay `pending` as this control unmounts. A failure resolves a result.
      const result = (await (sel.kind === "open"
        ? // A DATE and a head count. No instants, no duration, no full-day flag — there is nothing here for
          // the server to trust about time, which is exactly the point (T-09-26).
          placeOpenHold({
            listingId,
            date: sel.pick.dateIso,
            requestedPasses: sel.pick.passes,
            idempotencyKey: openIdempotencyKey,
          })
        : placeHold({
            listingId,
            startUtc: sel.window.startUtc,
            endUtc: sel.window.endUtc,
            fullDay: sel.window.fullDay,
          }))) as PlaceHoldResult | undefined;
      if (!result) return;

      if (result.reason === "sign-in") {
        // Thread the listing + the selection into the return path so checkout resumes on return (D-41).
        const params =
          sel.kind === "open"
            ? new URLSearchParams({
                date: sel.pick.dateIso,
                passes: String(sel.pick.passes),
                resume: "1",
              })
            : new URLSearchParams({
                start: sel.window.startUtc,
                end: sel.window.endUtc,
                resume: "1",
              });
        if (sel.kind === "exclusive" && sel.window.fullDay) params.set("fullDay", "1");
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
      // taken / sold-out / not-bookable / invalid — calm neutral notice + refresh the calendar so it
      // reflects reality. `sold-out` is the drop-in twin of `taken` (OC-13) and deliberately reuses this
      // exact path: one grammar, one treatment, never red, never a modal. The sentence itself comes from
      // the server, which is also where the claim decided it — a second copy here would be a second source
      // of truth, and the one that drifts is always the one nobody is looking at.
      setNotice(result.error);
      setPending(false);
      if (result.reason === "taken" || result.reason === "sold-out") router.refresh();
    },
    [listingId, placeHold, placeOpenHold, router, openIdempotencyKey],
  );

  // The restored selection, normalized to ONE shape before the effect sees it: exactly one of the two can
  // be present, because the page only parses the resume shape its own listing's mode uses.
  const resumeSelection = React.useMemo<CtaSelection | null>(
    () =>
      resumeWindow
        ? { kind: "exclusive", window: resumeWindow }
        : resumeOpen
          ? { kind: "open", pick: resumeOpen }
          : null,
    [resumeWindow, resumeOpen],
  );

  // D-41 resume: fire the restored selection exactly once on mount (ref-guarded against strict-mode double run).
  const resumedRef = React.useRef(false);
  React.useEffect(() => {
    if (resumedRef.current || !resumeSelection) return;
    resumedRef.current = true;
    void submit(resumeSelection);
  }, [resumeSelection, submit]);

  // The active selection is the live picker selection (fresh click) — resume drives its own auto-submit
  // above. Reading the mode-matching half of the lifted context, never "whichever one is populated".
  const active: CtaSelection | null = isOpen
    ? openSelection
      ? { kind: "open", pick: { dateIso: openSelection.dateIso, passes: openSelection.passes } }
      : null
    : selection
      ? { kind: "exclusive", window: selection }
      : null;

  async function handleActivate() {
    setPending(true);
    setNotice(null);
    const res = await activateBooking();
    if (!res.ok) {
      setNotice(res.error);
      setPending(false);
      return;
    }
    // canBook is now true in the DB (the hold action re-reads the row, not the session) → continue checkout.
    const sel = resumeSelection ?? active;
    if (sel) {
      setNeedsActivate(false);
      await submit(sel);
      return;
    }
    setNeedsActivate(false);
    setPending(false);
    router.refresh();
  }

  const isBar = layout === "bar";

  return (
    // `contents` in the bar so the button below is a direct flex item of the 64px bar rather than a
    // block inside a wrapper that would have to restate the bar's own alignment. The bar is `fixed`,
    // which makes it the containing block for the absolutely-positioned notice further down.
    <div className={isBar ? "contents" : "space-y-2"}>
      {/* THE ACTIVATE BRANCH REPLACES THE PRIMARY ACTION IN THE BAR, rather than sitting beside it.
          Two 44px buttons plus the rate block do not fit a 320px bar, and `Start booking` is the only
          thing the booker can usefully do in that state anyway — a disabled-looking pair would be two
          dead ends where one live control belongs. In the block layout both render, exactly as they
          have shipped. */}
      {isBar && needsActivate ? (
        <Button
          variant="secondary"
          size="touch"
          disabled={pending}
          onClick={handleActivate}
          className="shrink-0"
        >
          Start booking
        </Button>
      ) : (
        <Button
          variant="brand"
          size={isBar ? "touch" : "lg"}
          disabled={pending || !active}
          onClick={() => active && submit(active)}
          className={isBar ? "shrink-0" : "w-full"}
        >
          {pending ? "Starting…" : (label ?? "Book this space")}
        </Button>
      )}

      {/* The hint is BLOCK-ONLY. The bar mounts this control only once a selection exists (its
          no-selection state is a different action entirely — the sheet trigger), so a line telling the
          booker to pick a time would name a state the bar never renders. */}
      {!isBar && !active && !pending && (
        // The hint names the thing this listing actually asks for. A drop-in booker is never picking a
        // time, so telling them to would send them looking for a control that does not exist.
        <p className="text-center text-xs text-muted-foreground">
          {isOpen ? "Pick a day above to book." : "Pick a time above to book."}
        </p>
      )}

      {/* ONE `role="status"`, both layouts — see the `layout` prop for why a second element here would
          read as an undeclared live region. In the bar it sits directly ABOVE the 64px box rather than
          inside it: the bar's height is a measured constant that a wrapped refusal sentence would blow,
          and a notice clipped by the control it is about is a notice nobody receives. */}
      {notice && (
        <p
          role="status"
          className={
            isBar
              ? "absolute inset-x-0 bottom-full border-t bg-card px-4 py-2 text-center text-sm text-muted-foreground"
              : "text-center text-sm text-muted-foreground"
          }
        >
          {notice}
        </p>
      )}

      {!isBar && needsActivate && (
        <Button variant="secondary" size="lg" disabled={pending} onClick={handleActivate} className="w-full">
          Start booking
        </Button>
      )}
    </div>
  );
}
