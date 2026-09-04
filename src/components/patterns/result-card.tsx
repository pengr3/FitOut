// DS-11 — THE marketplace tile. One of exactly three named card patterns; a fourth is a scope alarm.
//
// WHAT THIS REPLACES (nobody yet — this plan ships the pattern, the adoption plans swap the surfaces):
// `search/search-result-card.tsx` and `listing/listing-card.tsx`'s presentational core. Both already
// render this shape; the point of extracting it is that padding, radius, hover and focus stop being
// re-decided per surface. Everything below is copied from the shipped analog rather than re-derived —
// where a class string differs from `search-result-card.tsx`, that is a bug in this file.
//
// A SERVER COMPONENT, DELIBERATELY. `patterns/` takes no `"use client"` unless the pattern's own
// behaviour requires it (the rule 11-07 opened this directory with). A client pattern drags every
// surface that composes it toward the client boundary — the D-130 hazard plan 11-01 closed — and this
// one renders markup and nothing else. It imports no domain module: no `@/lib/booking`, `payments`,
// `listing`, `group`, `search` or `availability`. `ui/aspect-ratio.tsx` IS a client component, and
// rendering one from a server component is fine: the boundary moves for the Radix box, not for the
// card or for anything that composes it.
//
// NO PRODUCT COPY. Every string on this tile arrives as a prop — including `mediaFallback`, which is
// required for exactly the reason 11-07's `label` is: the sentence ("No photos yet") belongs to the
// surface and to the UI-SPEC that approved it, never to a file in `patterns/`. An optional fallback
// would need a default, and a default here is product copy in the pattern layer.
//
// NOT COVERED — a real blind spot, stated so the next reader under-trusts this file:
//   • This proves nothing about pixels. Whether the focus ring is actually visible, whether the media
//     box really measures 4:3, and whether the hover shadow renders are Phase 11's GATE-01 screenshot
//     pass and plan 11-21's ±2px comparison. jsdom has no layout engine (D-131).

import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { RESULT_CARD_MEDIA } from "@/lib/design/measurements";

/**
 * The media box's ratio as a NUMBER, DERIVED from the class constant rather than written beside it.
 *
 * `measurements.ts`'s own NOT COVERED footer names this exact hazard: *"`RESULT_CARD_MEDIA` and
 * `AspectRatio ratio={4 / 3}` are two spellings of one number in two languages"*, and it hands the
 * rendered comparison to plan 11-21 because nothing in the source can see the two drift apart. They
 * cannot drift here, because there is only one of them — the card and `CardGridSkeleton` read the
 * same constant and this tile parses its number out of it. That is the whole mechanism behind "the
 * grid does not shift when the results land", expressed mechanically instead of by agreement.
 *
 * THE THROW IS THE POINT, not defensive padding. If the constant is ever given a form this cannot
 * read (`aspect-square`, `aspect-video`), the honest outcomes are "teach this derivation the new
 * form" or "record why the two spellings are allowed to differ" — never "silently fall back to 4/3",
 * which reintroduces the drift the derivation exists to remove. A module-scope throw surfaces at
 * `next build`, naming the constant and its current value.
 */
const MEDIA_RATIO: number = ((): number => {
  const parsed = /^aspect-\[(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\]$/.exec(RESULT_CARD_MEDIA);
  if (!parsed) {
    throw new Error(
      `result-card: RESULT_CARD_MEDIA is \`${RESULT_CARD_MEDIA}\`, which is not an ` +
        "`aspect-[w/h]` class. This tile derives its <AspectRatio ratio> from that constant so the " +
        "card and CardGridSkeleton cannot disagree about the media box. Either teach this " +
        "derivation the new form, or replace it with an explicit ratio AND record in " +
        "measurements.ts why the two spellings are allowed to differ.",
    );
  }
  return Number(parsed[1]) / Number(parsed[2]);
})();

export type ResultCardProps = {
  /** The whole card is one `<Link href>`. */
  href: string;
  /** The cover image (or video, or map tile). Rendered inside the 4:3 box on `bg-muted`. */
  media?: ReactNode;
  /**
   * What the media box shows when `media` is absent — REQUIRED, and never a broken image.
   *
   * Required rather than defaulted because the fallback is a sentence, and `patterns/` owns no
   * sentences (11-07's `label` precedent). It is also the mechanical form of the UI-SPEC's "never a
   * broken image": a caller cannot forget the empty state, because the type will not let them.
   */
  mediaFallback: ReactNode;
  title: string;
  /**
   * The muted lines beneath the title, IN ORDER. The first one is the "type line" and is where
   * `badges` render inline (see below).
   *
   * Required, not optional: a result tile with nothing under its title is an information-free tile,
   * and `[]` is one character to write when a surface genuinely has nothing to say.
   */
  meta: ReactNode[];
  /**
   * The price, PRE-FORMATTED by the caller. Rendered `tabular-nums`, which is mandatory on every
   * money figure in this app (11-PATTERNS § 9 · D-130).
   *
   * REQUIRED, and typed so a caller cannot omit it silently — GATE-05's whole subject is that the
   * number a booker sees is the number the server froze, and a tile that can render without one is a
   * tile that can quietly stop showing it.
   */
  price: ReactNode;
  /**
   * Badges — rendered INLINE on the type line, and NEVER overlaid on the photo.
   *
   * The reason is already on the record at `search-result-card.tsx:191-194`: contrast over arbitrary
   * host photography is unverifiable in both themes, and this card is a text-forward layout. Note
   * that badges render even when `meta` is empty, for that file's other reason — the mode must never
   * be the silent thing on the card.
   */
  badges?: ReactNode;
};

export function ResultCard({
  href,
  media,
  mediaFallback,
  title,
  meta,
  price,
  badges,
}: ResultCardProps) {
  const [typeLine, ...restMeta] = meta;

  return (
    <Link
      href={href}
      data-testid="result-card"
      // DS-05: this recipe set an offset WIDTH without an offset COLOUR, so the 2px band around a
      // focused search result painted Tailwind's default offset — a hardcoded white — instead of
      // --background. On grove's tinted background that is a visible white halo, and it is a leak
      // in all but name: a raw colour reaching the screen from a framework default rather than from
      // a token. Naming the colour is the whole fix; the ring itself was already solid.
      //
      // Copied BYTE-FOR-BYTE from `search-result-card.tsx:174`, comment included. The comment travels
      // with the string on purpose: the offset colour is the half a "tidying" edit deletes first.
      className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* THE CARD'S INTERNALS ARE AUTHORED WITH CONTAINER QUERIES, NOT VIEWPORT BREAKPOINTS.
          This tile renders at three genuinely different widths on the SAME viewport: ~330px in the
          3-up desktop grid, full width (~288px) at the 320px floor, and roughly a third of the row
          inside "You might also like". A `sm:` inside the card answers "how wide is the WINDOW",
          which gets all three wrong at once — the widest instance and the narrowest can be on screen
          together. `@container` here makes the card the query subject; `@max-[20rem]:` and `@sm:`
          below read the CARD's width.

          The GRID that lays these cards out still uses viewport breakpoints, and correctly so — how
          many columns fit is a window question. See `card-grid-skeleton.tsx`, which is the grid's
          loading twin and carries `sm:grid-cols-2 lg:grid-cols-3` for exactly that reason. */}
      <Card className="@container h-full gap-0 overflow-hidden pt-0 transition-shadow group-hover:bg-muted/40 group-hover:shadow-overlay">
        <AspectRatio ratio={MEDIA_RATIO} className="bg-muted">
          {media ?? mediaFallback}
        </AspectRatio>

        {/* The padding tracks the CARD's width rather than the window's, which is the whole argument
            for the container above: the app's shipped step is `p-4 sm:p-6`, and a tile deserves the
            larger step when the TILE is roomy — a full-width card on a large phone — not when the
            window happens to be. Below 20rem (the "you might also like" third-width instance and the
            320px floor) the block padding tightens one step instead. */}
        <CardContent className="space-y-1 py-4 @max-[20rem]:py-3 @sm:px-6 @sm:py-5">
          <h3 className="font-semibold leading-snug">{title}</h3>

          {/* THE TYPE LINE: the first meta node and every badge, on one wrapping row. Rendered when
              EITHER is present, so a badge still appears on a tile with no type label. */}
          {(meta.length > 0 || badges) && (
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {typeLine}
              {badges}
            </p>
          )}

          {/* The remaining meta lines, in the order the caller gave them. Index keys are correct
              here and only here: `meta` is a positional list with no identity and no reordering —
              slot 2 is always slot 2 — so an index IS the stable key. */}
          {restMeta.map((node, i) => (
            <p key={i} className="text-sm text-muted-foreground">
              {node}
            </p>
          ))}

          {/* MONEY IS ALWAYS `tabular-nums` and always the tile's last line. The caller orders `meta`;
              the pattern owns where the price sits, so a grid of tiles has its prices on one optical
              column instead of wherever each surface happened to put them. */}
          <p className="text-sm tabular-nums">{price}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
