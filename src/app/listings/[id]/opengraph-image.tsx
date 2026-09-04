// SHELL-04 — the share card for one space. What a pasted `/listings/<id>` link unfurls with.
//
// ── WHY IT SITS AT `[id]` RATHER THAN INSIDE `(detail)` ───────────────────────────────────────────
// A metadata file applies to its segment AND every descendant, so declaring it here also gives
// `/listings/<id>/book` this card. That is the wanted answer: `book` is the same space seen from the
// checkout step, and the alternative — no card there at all, or a second one — is worse. The URL is
// identical either way, because `(detail)` is a route group and erases from the path.
//
// ── FOUR FACTS, ONE READ, AND THE SAME READ THE DESCRIPTION USES ──────────────────────────────────
// Title, space type, city and RATE, from `@/lib/listing/og-facts`. The page's `generateMetadata`
// composes its `og:description` from that same projection, so the card and the sentence under it can
// never name different things. Read that module's header for what it deliberately does not select.
//
// ── A RATE, NEVER A TOTAL (D-75) ──────────────────────────────────────────────────────────────────
// `allInRateParts`' FIRST part — `₱472.50/hr` — fee-inclusive, the same string the listing page and
// the search grid show. A computed "from ₱1,417" would be a promise checkout could miss by a
// centavo, because the service fee is rounded once over the whole space price rather than per hour.
//
// ── NO PHOTOGRAPHY, AND THAT IS A DECISION ────────────────────────────────────────────────────────
// Host photos are unvetted, a listing may have none at all, and a 1200 × 630 crop of an arbitrary
// portrait shot is unpredictable in a way nobody would notice until it was on someone else's
// timeline. The card is the type, the token colours and one rule — which is also exactly what
// "token-driven share image" asks for.
//
// ── COURT, UNCONDITIONALLY; ONE ACCENT; NO BRAND ASSET ────────────────────────────────────────────
// The same three constraints the root card carries, for the same reasons. See
// `src/app/opengraph-image.tsx` — including the note that plan 11-22 excludes these routes from the
// theme-swap smoke because a server-rendered image has no theme to swap.
//
// ── `alt` IS STATIC, AND THE SPEC ASKED FOR A DYNAMIC ONE ─────────────────────────────────────────
// 11-UI-SPEC § Share & Meta specifies `"FitOut — {title}, {city}"`. Next's `opengraph-image`
// convention reads `alt` as a plain module export, evaluated with no params; the only two ways to
// interpolate a listing into it both cost more than the alt is worth. `generateImageMetadata` makes
// Next append an image id to the URL, so `/listings/<id>/opengraph-image` would stop resolving;
// hand-writing `openGraph.images` in the page's `generateMetadata` replaces the file convention and
// with it the automatic `og:image:width`/`height`/`type` tags, leaving a route URL retyped as a
// string in a second file. So the alt below describes the card's SHAPE rather than its contents, and
// the discrepancy with the spec is recorded here instead of quietly closed.

import { THEME_TOKENS } from "@/lib/design/tokens.generated";
import { SITE_TAGLINE } from "@/lib/site";
import { OG_CONTENT_TYPE, OG_FONT_FAMILY, OG_SIZE, renderOgCard } from "@/app/og-render";
import { listingCardFacts, type ListingCardFacts } from "@/lib/listing/og-facts";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "FitOut — a space, the city it is in, and what it costs by the hour";

const COURT = THEME_TOKENS.court;

/** The accent rule: `--brand` on `--background`, item 8 on Phase 10's closed accent list. */
function AccentRule() {
  return (
    <div
      style={{
        display: "flex",
        width: 240,
        height: 8,
        backgroundColor: COURT["--brand"].hex,
      }}
    />
  );
}

/**
 * The card for a space.
 *
 * `-webkit-line-clamp` is satori's supported clamp, and the hard character cap in front of it is the
 * belt: a title of one 400-character word has no line breaks for the clamp to make, and would paint
 * over the rest of the card.
 */
function ListingCard({ facts, withFont }: { facts: ListingCardFacts; withFont: boolean }) {
  const subLine = [facts.spaceTypeLabel, facts.city].filter(Boolean).join(" · ");
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

      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1000 }}>
        <div
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
            fontSize: 64,
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          {facts.title.slice(0, 120)}
        </div>

        {subLine && (
          <div style={{ display: "flex", fontSize: 32, color: COURT["--muted-foreground"].hex }}>
            {subLine}
          </div>
        )}

        {facts.rate && <div style={{ display: "flex", fontSize: 32 }}>{facts.rate}</div>}
      </div>

      <AccentRule />
    </div>
  );
}

/**
 * What a listing that cannot be read unfurls with. A card that says FitOut and nothing false.
 *
 * Reached on TWO paths that are deliberately not told apart: the public may not read the listing at
 * that id (draft, unlisted, soft-deleted, awaiting ops review, rejected, withdrawn, never existed),
 * and the read failed. A "listing not found" card would be a worse answer to both: it states a fact
 * about someone else's link inside an image, on a surface with no way to explain itself.
 *
 * ⚠ "THE SAME SET THE PAGE 404s ON" IS NOW TRUE BY CONSTRUCTION, AND IT WAS NOT ALWAYS. This comment
 * used to make that claim while `listingCardFacts` held its own hand-written copy of the rule — two
 * conditions, written twice, that stayed equal only as long as nobody edited one of them. Phase 18
 * edited one of them (D-208 hid unreviewed listings) and the card kept unfurling a pending listing's
 * title, type, city and rate while the page 404'd. `listingCardFacts` now CALLS the page's own
 * `isPubliclyViewable`, so the set really is one set. See `@/lib/listing/og-facts`' header (D-247).
 */
function GenericCard({ withFont }: { withFont: boolean }) {
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
      <AccentRule />
    </div>
  );
}

export default async function Image({
  params,
}: {
  // Next 16 — params is a Promise.
  params: Promise<{ id: string }>;
}): Promise<Response> {
  return renderOgCard(
    async () => {
      const { id } = await params;
      const facts = await listingCardFacts(id);
      return facts ? <ListingCard facts={facts} withFont /> : <GenericCard withFont />;
    },
    () => <GenericCard withFont={false} />,
  );
}
