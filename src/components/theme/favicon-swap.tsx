"use client";

// D-19 — the browser tab carries FitOut's own themed mark, and it re-skins with the theme.
//
// WHY THIS IS A CLIENT EFFECT AT ALL, rather than one of Next's file conventions. Next's own docs
// say it plainly: you cannot GENERATE a favicon. The `icon.tsx` convention does generate an icon,
// but through ImageResponse, producing a PNG that is statically optimised at build time — and a
// build-time raster has exactly one colour baked into it forever, so it can never follow a theme
// chosen in the browser. `icon.svg` is a static file with the same problem. Two generated SVGs plus
// a link swap is the only shape that re-skins at runtime (research landmine L9), which is why this
// module exists instead of a file in `src/app/`.
//
// IT RETARGETS, IT DOES NOT CREATE. The `icons` entry in src/app/layout.tsx's metadata export ships
// the court icon in the server HTML, so the tab is never icon-less and never flashes the browser's
// default document glyph. This effect finds that same element and changes its href — appending a
// second icon link on every theme change would leave the browser to pick between them, which is the
// exact ambiguity deleting `favicon.ico` was meant to remove.
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
    // Undefined before the provider has resolved — leave the server-rendered icon alone rather than
    // clearing the href and producing a momentarily icon-less tab.
    if (!resolvedTheme) return;
    // Allowlist membership, never a cast — the value is about to select a DOM attribute value.
    if (!(THEMES as readonly string[]).includes(resolvedTheme)) return;

    const href = ICON_HREF[resolvedTheme];
    if (!href) return;

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
