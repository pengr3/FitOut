// SHELL-04 — the card a FitOut link unfurls with when the route it points at has no card of its own.
//
// It is the ROOT segment's `opengraph-image`, so it is inherited by every route that does not
// declare one: `/`, `/login`, `/bookings`, `/host/...`, `/_not-found` and the rest. Two routes
// override it — `listings/[id]` (the space's own card) and `(public)/invite/[token]` (a deliberately
// constant one).
//
// ── EVERY COLOUR IS A HEX READ FROM `THEME_TOKENS`, AND IT HAS TO BE ─────────────────────────────
// Satori resolves no CSS custom properties and parses no `oklch()`. `var(--background)` renders as
// nothing here and `oklch(1 0 0)` is not a colour it can read, so this card cannot paint through the
// stylesheet the way every other surface in the app does. `src/lib/design/tokens.generated.ts` names
// exactly this case in its own header: it is the ONE sanctioned duplicate of a token value, checked
// against the stylesheet on every test run. Writing the hex out here instead would fail the DS-13
// leak gate, which scans this whole tree — so the token module is not merely the tidy route, it is
// the only one that builds.
//
// ── COURT, UNCONDITIONALLY, AND THAT IS A DOCUMENTED IMPOSSIBILITY RATHER THAN AN OVERSIGHT ──────
// A server-rendered image has no user, no `data-theme` and no `prefers-color-scheme`: the scraper
// that fetches it is not a browser session. So the card is painted in `court` for everyone, exactly
// as `global-error` is. CONSEQUENCE FOR PLAN 11-22: the OG routes are excluded from the theme-swap
// smoke, and this sentence is the reason — there is no swap to observe, not a swap that was missed.
//
// ── ONE ACCENT, AND IT IS ITEM 8 ON PHASE 10'S CLOSED LIST ────────────────────────────────────────
// The 8 × 240 rule at the bottom-left is `--brand` on `--background` — an already-declared pair,
// measured as a non-text bar (3.0 required; 4.77 court / 4.60 grove). It adds an accent USE and zero
// contrast rows. There is no other accent on this card and no second one may be added.
//
// ── NO PHOTOGRAPHY AND NO BRAND ASSET (D-127) ────────────────────────────────────────────────────
// The wordmark is TEXT. FitOut owns no logo file, and inventing one for a share card would be
// shipping a brand asset through the back door.

import { THEME_TOKENS } from "@/lib/design/tokens.generated";
import { SITE_TAGLINE } from "@/lib/site";
import { OG_CONTENT_TYPE, OG_FONT_FAMILY, OG_SIZE, renderOgCard } from "@/app/og-render";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = `FitOut — ${SITE_TAGLINE}`;

const COURT = THEME_TOKENS.court;

/**
 * The card. `display: flex` is spelled on every container because satori requires it — a `div` with
 * more than one child and no display throws rather than defaulting to block.
 *
 * `withFont` is false on the fallback pass, where no `fonts` are supplied and naming a family satori
 * has not been given would be naming nothing (see `og-render.ts`).
 */
function RootCard({ withFont }: { withFont: boolean }) {
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
          maxWidth: 900,
        }}
      >
        {SITE_TAGLINE}
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

export default async function Image(): Promise<Response> {
  return renderOgCard(
    () => <RootCard withFont />,
    () => <RootCard withFont={false} />,
  );
}
