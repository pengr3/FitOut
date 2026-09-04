"use client";

// D-19 — the browser tab carries FitOut's own themed mark, and it re-skins with the theme.
//
// WHY THIS IS A CLIENT EFFECT AT ALL, rather than one of Next's file conventions. Next's own docs
// say it plainly: you cannot GENERATE a favicon. The `icon.tsx` convention does generate an icon,
// but through ImageResponse, producing a PNG that is statically optimised at build time — and a
// build-time raster has exactly one colour baked into it forever, so it can never follow a theme
// chosen in the browser. `icon.svg` is a static file with the same problem. Two generated SVGs plus
// a link swap is the only shape that re-skins at runtime (research landmine L9).
//
// THIS COMPONENT IS THE SOLE OWNER OF THE ICON LINK, AND THAT EXCLUSIVITY IS THE WHOLE FIX.
// There is deliberately NO icons entry in src/app/layout.tsx's metadata export, and this component
// deliberately renders `null` rather than a link element. Both choices are counter-intuitive, both
// were measured against a production build (`npm start`, not the dev server), and the reason is the
// same in each case: a `<link>` that React owns cannot be re-pointed at a different file.
//
//   • Metadata entry + this effect mutating the element React rendered → React loses track of its
//     own node and re-creates it, leaving TWO icon links with the STALE one LAST. Measured, grove:
//     `["/icon-grove.svg", "/icon-court.svg"]`, permanent.
//   • This component returning `<link rel="icon" href={…}/>` instead → React hoists it into the head,
//     but hoisted metadata links are keyed by href, so changing the href ADDS a second one and never
//     removes the first. Measured, grove: `["/icon-court.svg", "/icon-grove.svg"]`, permanent and
//     stable at two across navigations and reloads.
//   • This shape — no metadata entry, a plain DOM element nothing else manages → exactly ONE link in
//     every state measured: court on a cold load, grove when themed, and still one after two
//     client-side navigations and a hard reload.
//
// Two `rel="icon"` declarations is not a cosmetic untidiness. Which one a browser honours is not
// specified — in practice the last wins, but that is convention, not contract — so a page shipping
// both is a page whose tab icon is chosen by the user agent. That is precisely the ambiguity that
// deleting the scaffold's `favicon.ico` was meant to remove, and reintroducing it through the head
// would have made this component's own requirement unprovable.
//
// THE COST, MEASURED RATHER THAN WAVED AWAY: with no icon in the server HTML there is a window on a
// cold load where the tab shows the browser's generic document glyph. Measured at **252 ms** from
// navigation commit to the link appearing. That is the price of the guarantee above, and it is the
// cheaper side of the trade — a quarter-second of a generic glyph, against every page permanently
// declaring two different identities and letting the browser pick between them.
//
// THE THREAT (T-10-04, ASVS V5). The theme value ends up in a DOM attribute, so it is checked for
// MEMBERSHIP of the THEMES allowlist and then used as a KEY into a table of two literal paths.
// Nothing derived from the value is ever interpolated into the href, and it is never cast — the same
// discipline as theme-query-param.tsx, for the same reason: a cast silences the checker without
// making the value safe.

import { useEffect } from "react";
import { useTheme } from "next-themes";

import { THEMES } from "@/components/theme/theme-provider";

/**
 * One icon per theme, as LITERAL paths. The theme string selects a row; it never becomes part of a
 * path. Written as a table rather than a template so the complete set of values that can reach the
 * attribute is readable in one place.
 */
const ICON_HREF: Record<string, string> = {
  court: "/icon-court.svg",
  grove: "/icon-grove.svg",
};

/** Both icons are SVG, and the type hint is what stops a browser guessing from the extension. */
const ICON_TYPE = "image/svg+xml";

export function FaviconSwap() {
  // `resolvedTheme` rather than `theme`: with enableSystem false the two agree, but `theme` can be
  // the literal string "system" in a provider configured otherwise, and that is not a value this
  // allowlist should ever have to reason about.
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // Undefined before the provider has resolved. Returning early leaves the head untouched for one
    // more frame rather than installing a court icon that immediately becomes grove — a visible
    // flicker in the tab on exactly the path D-19 exists to demonstrate.
    if (!resolvedTheme) return;
    // Allowlist membership, never a cast — the value is about to select a DOM attribute value.
    if (!(THEMES as readonly string[]).includes(resolvedTheme)) return;

    const href = ICON_HREF[resolvedTheme];
    if (!href) return;

    // Find-or-create, never append-per-change: a second element here would recreate the exact
    // ambiguity this module's header explains at length.
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.type = ICON_TYPE;
    if (link.getAttribute("href") !== href) link.setAttribute("href", href);
  }, [resolvedTheme]);

  return null;
}
