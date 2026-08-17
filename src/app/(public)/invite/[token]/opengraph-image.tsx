// SHELL-04 / T-11-OGCRED — the invite share card. A CONSTANT image, and that is a security property
// rather than a copy choice.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE ONE SENTENCE THIS FILE EXISTS FOR
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A per-token image would put an unauthenticated, credentialed, DB-backed endpoint on the internet
// whose RESPONSE VARIES BY TOKEN — a probe oracle wearing an image's clothing.
//
// Everything else follows from that. This route takes no route-parameter argument, reads no token,
// imports nothing from the database module or the group read layer, and returns the same bytes for a
// valid token, an unknown one and a malformed one. `tests/design/og-routes.test.ts` asserts the first
// three on the AST; the fourth was measured with `curl` and the hashes are in 11-20-SUMMARY.md.
//
// ── THE PROSE ABOVE SPELLS NONE OF THOSE THREE IDENTIFIERS OUT, ON PURPOSE ───────────────────────
// The cheapest possible audit of this file is a text search for the route-parameter identifier and
// for the two module specifiers, each of which must return ZERO lines. A COMMENT containing any of
// them makes that search permanently non-zero — so a header written to explain the property would be
// the thing that stopped the property being checkable in one command, and this paragraph would have
// been the first offender. The header therefore describes those three by role and never by name.
// `tests/design/og-routes.test.ts` reads the AST and does not care either way; the reviewer with a
// terminal and thirty seconds does.
//
// ── WHY AN IMAGE IS A WORSE ORACLE THAN A PAGE, NOT A LESSER ONE ─────────────────────────────────
// A chat service, a link scanner, a corporate URL-preview proxy and a spam filter all fetch this URL
// the moment somebody pastes an invite anywhere. They fetch it WITHOUT the recipient doing anything,
// they follow it from any context, and — unlike the page — nothing about an image invites a human to
// look at it, so a difference between two responses is discovered only by something automated. Which
// is exactly the actor that matters: a script is the only thing that walks a 20-symbol token space,
// and a 4 KB difference in a PNG is as good an answer as a 404 (plan 11-19's finding, one layer up).
//
// ── WHAT THE PAGE MAY VARY AND THIS ROUTE MAY NOT ────────────────────────────────────────────────
// The invite PAGE necessarily differs between a live invite and an inactive one — showing the event
// is the entire product. 08-06's property is narrower and precise: unknown = revoked = voided =
// cancelled = malformed, all one calm state, so the token space cannot be walked for WHICH tokens
// name something. `generateMetadata` in `page.tsx` adds no bit beyond what that page already shows.
// This route adds a NEW endpoint, and a new endpoint that varied would be a new oracle — so it does
// not vary at all. That asymmetry is deliberate; do not "improve" this card by naming the venue.
//
// ── AND NOT INCIDENTALLY: IT IS ALSO THE RIGHT CARD ──────────────────────────────────────────────
// Everything an unfurl states is stated to every intermediary that fetches it. A card naming the
// venue, the date or the organizer would hand all three to a spam filter's log. The recipient
// already holds the link; the preview does not need to re-tell them where they are going.
//
// Court, one accent, no photography, no brand asset — the same four constraints as the root card,
// for the same reasons. See `src/app/opengraph-image.tsx`.

import { THEME_TOKENS } from "@/lib/design/tokens.generated";
import { OG_CONTENT_TYPE, OG_FONT_FAMILY, OG_SIZE, renderOgCard } from "@/app/og-render";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "FitOut — you're invited";

const COURT = THEME_TOKENS.court;

/**
 * The only words on the card. A CONSTANT, so the thing the gate has to check is that nothing else
 * ever gets interpolated beside it — no venue, no date, no organizer, no headcount, no reference.
 */
const HEADLINE = "You're invited";

function InviteOgCard({ withFont }: { withFont: boolean }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        backgroundColor: COURT["--background"].hex,
        color: COURT["--foreground"].hex,
        ...(withFont ? { fontFamily: OG_FONT_FAMILY } : {}),
      }}
    >
      <div style={{ display: "flex", fontSize: 40, fontWeight: 600 }}>FitOut</div>

      <div
        style={{
          display: "flex",
          fontSize: 64,
          fontWeight: 600,
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
        }}
      >
        {HEADLINE}
      </div>

      {/* The accent rule — the only accent on the card. */}
      <div
        style={{
          display: "flex",
          width: 240,
          height: 8,
          backgroundColor: COURT["--brand"].hex,
        }}
      />
    </div>
  );
}

/**
 * No parameter list at all — not an ignored argument, not a `_props`. Next passes the route's token
 * to this function; a signature that cannot receive it is the cheapest possible proof that it is
 * unread, and it is what makes the AST assertion in `tests/design/og-routes.test.ts` a fact about
 * this file rather than a convention somebody has to keep.
 */
export default async function Image(): Promise<Response> {
  return renderOgCard(
    () => <InviteOgCard withFont />,
    () => <InviteOgCard withFont={false} />,
  );
}
