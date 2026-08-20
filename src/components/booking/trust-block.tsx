// TrustBlock (TRUST-04 · D-65, D-66, D-67, D-68) — FOUR SIGNALS, AND A FIFTH IS A DEFECT.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE SET IS CLOSED AT FOUR. A FIFTH IS NOT A DESIGN DECISION, IT IS A DEFECT.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// Every signal below maps to a column that exists:
//
//   1. the platform guarantee   — the hold-until-session payout model itself (D-65; see the block below)
//   2. host tenure              — `user.createdAt`      (schema.ts:38)
//   3. listing published        — `listing.publishedAt` (schema.ts:223)
//   4. booking behaviour        — `listing.bookingMode` (schema.ts:199)
//
// ⚠ THERE IS NO RESPONSIVENESS COLUMN IN `src/lib/db/schema.ts` — no rate, no latency, no SLA field
// about a host's replies. Checked against the schema when this file was written. A fifth signal of that
// shape could therefore only be INVENTED: a sentence with no row behind it, on the one surface where a
// booker is deciding whether their money is safe. That is precisely what TRUST-04 exists to prevent, and
// D-80 closes the escape hatch — **if a surface wants a fifth signal the answer is no, not a new
// column.** The same goes for a tier badge, an assurance tick, a score or a feedback count: FitOut runs
// no such programme and stores no such data.
//
// TWO GATES ENFORCE THIS, AND THEY ARE COMPLEMENTARY RATHER THAN REDUNDANT:
//   - `tests/design/trust-signals.test.ts` bans twelve named tokens across the Phase-13 file set. It
//     catches a fifth signal spelled one of the twelve ways already imagined.
//   - `tests/booking/trust-block.test.tsx` asserts an exact ROW COUNT per variant. It catches the
//     realistic fifth signal — the one nobody listed — because a closed set is a count, not a word list.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// SIGNAL 1 IS D-65's REFRAMING, AND IT DOES NOT READ THE PAYOUT COLUMNS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// *"FitOut holds your payment until after your session."* is literally the payout model (PROJECT § the
// hold-until-session rule): the full amount is collected to the platform wallet and the host's share is
// pushed only AFTER the session is delivered. Stated to a booker it is a fact about **where their money
// is**, which is a stronger trust statement than any credential a marketplace could award a host — and
// it cannot be mistaken for the invented assurance TRUST-04 bans, because it is a claim about FitOut's
// own behaviour rather than about the host.
//
// ⚠ IT IS THEREFORE NOT A BADGE, AND THIS FILE READS NEITHER `host_payout.onboarding_complete` NOR
// `host_payout.payouts_enabled`. Those two columns keep their EXISTING role — the bookability gate that
// `deriveBookable` consults — unchanged. Surfacing them here as a host-facing marker would be exactly
// the badge D-65 replaced, and it would also be a second surface for a fact the gate already owns. The
// sentence is unconditional because the payout model is unconditional.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// SIGNAL 2 CARRIES NO NEWNESS BADGE, AND THAT IS D-66 RATHER THAN AN OMISSION
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// Do not add a "New host" marker beside the date, and do not hide the row until the host is 90 days old.
// Both were considered and both were rejected for the same measured reason: **at launch every host is
// new**, so a newness marker would appear on effectively every listing in the product and read as a
// warning label across the whole marketplace; and hiding the field removes the signal exactly when a
// booker is least sure. The plain date is factual, does not editorialise, and strengthens on its own as
// the marketplace ages.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE PROPS ARRIVE FINISHED — THIS COMPONENT DOES NO DATE MATH AND NO CONDITIONAL DATA READING
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `cancellation-policy-disclosure.tsx:201-256`'s discipline, applied whole: every derived value arrives
// server-computed and already formatted, and every prop is REQUIRED rather than optional. The formatter
// for signal 2 is the shipped one — the same one `listing/host-block.tsx:115` already renders "Host
// since" with — and it is called in the RSC, never here, so there is no fifth date format anywhere in
// the product and no chance of this surface and the listing page disagreeing about the same host.
//
// `variant` is required for the same reason the disclosure's boolean is: an optional variant lets a
// surface silently keep whichever default was written first, and the two variants answer different
// questions. `listingPublishedLabel` is `string | null` rather than optional because a NULL
// `published_at` is a real state that must be ANSWERED (row absent), not one a call site can forget.
//
// A SERVER COMPONENT: no client-boundary directive, no state, no effect, no event handler, and no
// money value of any kind crosses into it (GATE-05 / D-130) — there is no numeric prop here at all.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE `<dt>` TERMS, AND THE ONE JUDGEMENT THIS FILE MADE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// 13-UI-SPEC § The Trust Block prescribes `<dt>` + `<dd>` per row; its Copywriting Contract gives the
// four ROW strings. For signals 2 and 3 the split is already in the contract's own wording — the term is
// "Host since" / "Listing published" and the description is the month, so the rendered and announced
// sentence is character-for-character the contract's. Signals 1 and 4 are whole sentences with no term
// inside them, so each gets the minimal category word: "Your payment" and "Booking".
//
// THE ALTERNATIVE WAS REJECTED FOR A RECORDED REASON: giving those two rows a `<dt>` that repeats their
// own `<dd>` is not a row, it is two copies of one string — 13-02 recorded exactly this when
// `SupportPath` gained its `term` prop, and a screen reader linearising a definition list would read the
// sentence twice.

import { SupportPath } from "@/components/booking/support-path";
import { PanelCard } from "@/components/patterns/panel-card";

/**
 * The four sentences, as TS constants rather than JSX text — `host-block.tsx:42-49`'s three reasons:
 * `react/no-unescaped-entities` makes a literal apostrophe in JSX an error (so the source and the
 * rendered sentence would stop being the same bytes), one copy per sentence, and SWC's JSX whitespace
 * transform cannot eat a leading space inside a literal.
 *
 * DELIBERATELY NOT EXPORTED. `host-block.tsx` exports its two rules so tests import instead of retyping,
 * which is right for a sentence whose identity is what matters. These four are a COPY CONTRACT: the
 * assertion is that this component renders THOSE WORDS, so `tests/booking/trust-block.test.tsx` types
 * them out from 13-UI-SPEC § Copywriting instead. A test importing these constants would compare the
 * component to itself and pass through any rewording.
 */
const PLATFORM_GUARANTEE = "FitOut holds your payment until after your session.";
const INSTANT_RULE = "Books instantly — no approval needed.";
/**
 * ⚠ THE VERB IS "approves", AND IT IS CHOSEN. Phase 12's shipped listing copy describes the same
 * behaviour with a verb `tests/design/trust-signals.test.ts` bans (it is also a feedback-count noun),
 * and that copy sits OUTSIDE the scan's three roots and is unchanged. This phase's own copy is clean
 * under this phase's own scan, with no exclusion row anywhere — which is the whole reason the scope
 * boundary is stated rather than widened.
 */
const REQUEST_RULE = "This host approves each request before it's confirmed.";

export type TrustBlockProps = {
  /**
   * REQUIRED, never optional.
   *
   * `full` — all four signals plus the guarded support row. Renders on the booking detail page for
   * EVERY status (D-67), including the ones that look wrong: trust matters most when something has gone
   * wrong, so binding this block to the happy path would remove it precisely where it is needed.
   *
   * `condensed` — signals 1 and 4 ONLY, inside the confirmation moment. At the instant of payment the
   * booker's two questions are *where is my money* and *what happens next*; tenure and listing age are
   * reassurance for a later, calmer read and are one scroll below in the full block, permanently.
   */
  variant: "full" | "condensed";
  /**
   * Signal 2's value — `user.createdAt` run through the shipped member-since formatter IN THE RSC,
   * e.g. `"June 2026"`. The label arrives finished; this component performs no date math.
   *
   * ⚠ GREP TRIPWIRE (13-PATTERNS § H, and the tenth instance of this collision in Phase 13). The
   * formatter is named DESCRIPTIVELY here, never as an identifier, because the check that this file
   * does not CALL it is a whole-source grep for its name — and a grep tripped by the comment
   * explaining it is disarmed for good. It is exported from `src/lib/profile.ts` beside
   * `publicProfile`, it is the same one `src/components/listing/host-block.tsx:115` already renders
   * "Host since" with, and reusing it is the point: a fifth date format in this product would let the
   * booking page and the listing page disagree about the same host. Do not "helpfully" spell it out.
   */
  hostSinceLabel: string;
  /**
   * Signal 3's value, or NULL when the listing has no `published_at`.
   *
   * NULL removes the ROW — not a placeholder, not an em dash, not an empty cell. A row that is present
   * and says nothing reads to a booker as a fact FitOut has and is withholding, which is worse than the
   * absence. `null` rather than optional so every call site answers.
   */
  listingPublishedLabel: string | null;
  /** Signal 4's source: the LISTING's persisted mode (`listing.booking_mode`, D-61's snapshot rules). */
  bookingMode: "instant" | "request";
  /**
   * The `FIT-XXXXXXXX` reference, forwarded to the guarded support row as its subject payload.
   *
   * Required on BOTH variants even though only `full` renders that row. The variant is presentational,
   * so a surface switching from condensed to full is a one-word edit rather than a prop hunt — and the
   * reference is already on hand at every specified call site.
   */
  reference: string;
};

/** One `<dt>`/`<dd>` pair. Local, because a trust row is not a shape any other surface composes. */
function TrustRow({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    // The `<div>`-wrapped `<dt>`/`<dd>` group `refund-breakdown.tsx` and `support-path.tsx` already use
    // inside a `<dl>`: legal HTML5, and it keeps the row's two halves associated for a screen reader
    // that linearises the list.
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-label shrink-0 text-muted-foreground">{term}</dt>
      {/* NO VERDICT COLOUR, ON ANY ROW. `text-foreground` is the ink for all four, so a date can never
          become a judgement — the same move the forbidden badges make, one step quieter. */}
      <dd className="text-label text-right text-foreground">{children}</dd>
    </div>
  );
}

export function TrustBlock({
  variant,
  hostSinceLabel,
  listingPublishedLabel,
  bookingMode,
  reference,
}: TrustBlockProps) {
  const full = variant === "full";
  const behaviour = bookingMode === "request" ? REQUEST_RULE : INSTANT_RULE;

  return (
    <PanelCard>
      {/* NO TITLE, DELIBERATELY. 13-UI-SPEC's Copywriting Contract is defined as *every* string this
          phase renders, and it lists no heading for this block — so authoring one here would ship
          unlisted copy on the phase's most scrutinised surface. The `<dl>` is self-describing. */}
      <dl data-testid="trust-block" className="space-y-3">
        {/* 1 — THE PLATFORM GUARANTEE. Unconditional, because the payout model is unconditional, and
            stated without reading either payout column (see the header). */}
        <TrustRow term="Your payment">{PLATFORM_GUARANTEE}</TrustRow>

        {/* 2 — HOST TENURE. A plain date and nothing beside it (D-66). */}
        {full && <TrustRow term="Host since">{hostSinceLabel}</TrustRow>}

        {/* 3 — LISTING PUBLISHED. The row is ABSENT when the label is null. */}
        {full && listingPublishedLabel !== null && (
          <TrustRow term="Listing published">{listingPublishedLabel}</TrustRow>
        )}

        {/* 4 — BOOKING BEHAVIOUR, off the listing's own persisted mode. */}
        <TrustRow term="Booking">{behaviour}</TrustRow>

        {/* THE GUARDED FINAL ROW (D-64). Mounted UNCONDITIONALLY and never behind a test of
            `SUPPORT_EMAIL` here — the component decides, which is what keeps the guarded literal in the
            one file that holds the guard (`support-path.tsx`'s property 1). It renders NOTHING today,
            so the block simply ends after signal 4.

            The `term` and `label` are sentence-case on purpose: the same gate bans an unguarded
            capitalised single-word label, and that constraint lands on THIS file because these are the
            literals. Ordinary English is invisible to it. */}
        {full && (
          <SupportPath
            variant="trust-row"
            term="Something not right?"
            label="Get in touch"
            reference={reference}
          />
        )}
      </dl>
    </PanelCard>
  );
}
