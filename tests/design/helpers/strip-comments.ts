// The ONE comment stripper for the design gate's source-scan counts (WR-02).
//
// WHY THIS FILE EXISTS — THERE WERE FOUR COPIES, AND ALL FOUR SHARED A HOLE.
//
// `brand-recipe.test.ts`, `status-vocab.test.ts`, `type-scale.test.ts` and `dark-scope.test.ts` each
// carried their own stripper, three of them byte-identical. Every one tested `/^\s*\/\//` and
// `/^\s*\{?\s*\/\*/` — both LINE-ANCHORED — so a comment that opened its own line was blanked and a
// TRAILING comment survived intact. Trailing comments are the dominant habit in this codebase
// (`theme-provider.tsx` has seven in a row), which made the hole the common case rather than the
// exotic one.
//
// THE HOLE WAS LIVE ON THE PRIMARY BOOKER CTA, AND WAS OBSERVED. `src/components/booking/
// book-cta.tsx`'s "Book this space" button was changed from
//
//     variant="brand"
// to
//     variant="secondary" /* was variant="brand" before the regression */
//
// and `brand-recipe.test.ts` reported **21/21 passed**; the whole design suite reported
// **20 files / 405 tests passed**. All six of that file's pinned counts stayed green — the 15 total,
// the per-file `EXPECTED_CONVERSIONS` map, the repo-wide 20, the 5 host conversions, the
// surviving-accent map and its total — while the app's most important call to action was no longer
// coral. D-21's "coral appears on exactly the 20 buttons someone asked for it" was satisfied by
// prose. That is the defect this module closes, and the fixtures in `strip-comments.test.ts` are the
// record of it failing.
//
// WHY A CHARACTER SCANNER AND NOT `line.indexOf("//")`.
//
// Two real shapes in this tree make a naive index-of wrong, and the strippers this replaces recorded
// both as the reason they refused to look past the start of a line:
//
//   • `accept="image/*"` — real markup at `src/app/(app)/profile/profile-form.tsx:109`. A stripper
//     that treats that `/*` as a block opener eats to the next `*/`, **86 lines later**, and then
//     reports a clean tree over source it never read. A scan whose stripper silently deletes a third
//     of a file is worse than no stripper.
//   • `"https://fitout.example/og.png"` — a `//` inside a string literal. Truncating there deletes
//     the rest of a line of real code.
//
// Both are the same problem: `//` and `/*` mean nothing inside a string. So the scanner tracks quote
// state (`"`, `'`, backtick, with backslash escapes honoured) and only recognises a comment opener
// OUTSIDE a string. That is what lets it strip trailing comments — which is the whole point — without
// reintroducing either hazard.
//
// QUOTE STATE RESETS AT EVERY NEWLINE; BLOCK STATE DOES NOT. Deliberate, and the asymmetry is the
// safety property:
//
//   • Block comments genuinely span lines, so `inBlock` must carry.
//   • Quote state must NOT carry, because an unmatched quote is common in JSX prose (`<p>Don't</p>`)
//     and in a template literal wrapped across lines. If it carried, one apostrophe would put the
//     rest of a FILE into string state.
//
// The cost is bounded and lands in the safe direction: a stray apostrophe makes the scanner treat
// the remainder of THAT LINE as a string, so a comment on that line survives. Surviving text can only
// make a count too HIGH, which fails the pinned assertions LOUDLY. It can never make one too low,
// which is the silent direction and the one that shipped a grey CTA.
//
// VERIFIED AGAINST THE TREE, NOT ARGUED. Before adoption this stripper was run over every `.ts`,
// `.tsx` and `.css` file under `src/` alongside the old one and their outputs compared. Every token
// the phase pins a count on — `variant="brand"`, `bg-brand`, the sanctioned `color-mix` hover,
// `<Button`, `h-11`, `state === "failed"`, `text-success`, `bg-success`, `text-success-foreground`,
// `dark:`, `sm:text-display`, `text-[0.8rem]` — came back with an IDENTICAL count in every file.
// The comment-dense modules that shrink most under stripping (`src/lib/utils.ts` 45→9 non-blank
// lines, `src/lib/design/status-tones.ts` 104→13, `src/app/globals.css` 472→239) produced
// byte-identical output under both. The change adds coverage and removes nothing.
//
// NOT COVERED — a real blind spot, stated so the next reader under-trusts this module:
//   • It is a SCANNER, not a parser. A regex literal containing an unbalanced quote character
//     (`/['"]/`) puts the rest of its line into string state. As above, that direction is
//     over-counting, so the failure is loud; none is present in `src/` today.

/**
 * Remove every comment — leading, trailing, and block — from `text`, preserving line count.
 *
 * Line count is preserved so a violation reported as `file:line` still points at the right line.
 * Comment bodies are replaced with nothing rather than with a placeholder, so a class name quoted in
 * prose cannot satisfy a `.includes()` or a `.matchAll()` downstream.
 */
export function stripComments(text: string): string {
  const out: string[] = [];
  let inBlock = false;

  for (const raw of text.split("\n")) {
    let kept = "";
    let quote: string | null = null;
    let i = 0;

    while (i < raw.length) {
      if (inBlock) {
        const close = raw.indexOf("*/", i);
        if (close === -1) {
          i = raw.length;
          break;
        }
        inBlock = false;
        i = close + 2;
        continue;
      }

      const ch = raw[i];

      if (quote !== null) {
        // Inside a string: a backslash escapes the next character, so `"\""` does not close early.
        if (ch === "\\") {
          kept += raw.slice(i, i + 2);
          i += 2;
          continue;
        }
        if (ch === quote) quote = null;
        kept += ch;
        i += 1;
        continue;
      }

      if (ch === '"' || ch === "'" || ch === "`") {
        quote = ch;
        kept += ch;
        i += 1;
        continue;
      }

      // A comment opener, recognised only OUTSIDE a string — see the header for the two shapes
      // (`accept="image/*"`, `"https://…"`) that make that qualification load-bearing.
      if (ch === "/" && raw[i + 1] === "/") break;
      if (ch === "/" && raw[i + 1] === "*") {
        inBlock = true;
        i += 2;
        continue;
      }

      kept += ch;
      i += 1;
    }

    out.push(kept);
  }

  return out.join("\n");
}
