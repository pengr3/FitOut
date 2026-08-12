// WR-02 — the comment stripper the phase's pinned counts depend on, tested as the load-bearing
// component it is rather than as a helper.
//
// WHY THIS FILE EXISTS. Four source-scan gates in this suite count exact numbers of things —
// `brand-recipe.test.ts` alone pins six of them, including "coral appears on exactly 20 buttons" —
// and every one of those counts is taken over comment-stripped text. The stripper is therefore the
// single point of failure for all of them, and it had no test of its own. It had four copies instead.
//
// WHAT WENT WRONG, OBSERVED. The strippers this replaces were line-anchored (`/^\s*\/\//`), so a
// TRAILING comment survived. `src/components/booking/book-cta.tsx`'s "Book this space" CTA was
// changed to `variant="secondary" /* was variant="brand" before the regression */` and
// `brand-recipe.test.ts` reported 21/21 passed with all six counts green. Every fixture in the
// "still catches the shapes that shipped past the old stripper" block below is one of those escapes.
//
// THE TWO HAZARD FIXTURES ARE NOT DECORATION. They are the reason the strippers were line-anchored
// in the first place, and the reason this one is a quote-aware scanner rather than an `indexOf`:
// `accept="image/*"` is real markup in this tree whose naive block-open eats 86 lines, and a `//`
// inside a URL string truncates real code. A future "simplification" of the stripper that drops
// quote tracking passes every count assertion in the suite and fails exactly here.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { stripComments } from "./helpers/strip-comments";

describe("WR-02 — the stripper removes prose without eating code", () => {
  it("drops a comment that OPENS its line, in all three syntaxes this tree uses", () => {
    for (const prose of [
      '// variant="brand"\nkeep',
      '  {/* variant="brand" */}\nkeep',
      '/* a\n variant="brand"\n */\nkeep',
    ]) {
      const stripped = stripComments(prose);
      expect(stripped, `left a quoted class behind in: ${prose}`).not.toContain('variant="brand"');
      expect(stripped, `ate real code in: ${prose}`).toContain("keep");
    }
  });

  it("keeps whatever follows a block comment that closes mid-line", () => {
    expect(stripComments('/* note */ <p className="text-[9px]" />')).toContain("text-[9px]");
  });

  it("preserves the line count, so a `file:line` violation still points at the right line", () => {
    // Several gates report `${name}:${line}`. A stripper that collapsed blank lines would shift
    // every reported line number after the first comment — a failure message that sends the next
    // author to the wrong place is only marginally better than no message.
    const src = ["const a = 1; // one", "/* two", "   still two */", "const b = 2;"].join("\n");
    expect(stripComments(src).split("\n")).toHaveLength(4);
  });
});

describe("WR-02 — it now catches the TRAILING shapes that shipped past the old stripper", () => {
  // POSITIVE CONTROL for the widening itself. The old stripper was two line-anchored regexes, and
  // deleting the quote-aware scan in favour of them again is the single easiest edit to make
  // silently ineffective — every count in the suite would stay green. These four fixtures are the
  // exact shapes that evaded it; the first is the one reproduced on the live booker CTA.
  const ESCAPES = [
    {
      label: "trailing block",
      source: '  variant="secondary" /* was variant="brand" before the regression */',
      survives: 'variant="secondary"',
    },
    {
      label: "trailing line",
      source: '  variant="secondary" // was variant="brand"',
      survives: 'variant="secondary"',
    },
    {
      label: "trailing block, mid-attribute",
      source: '  <div className="bg-muted" /* was bg-brand */ />',
      survives: 'className="bg-muted"',
    },
    {
      label: "trailing line, after the element",
      source: '  <div className="bg-muted" /> // used to be bg-brand',
      survives: 'className="bg-muted"',
    },
  ] as const;

  for (const { label, source, survives } of ESCAPES) {
    it(`strips a ${label} comment`, () => {
      const stripped = stripComments(source);
      // The old stripper left every one of these untouched, which is what made the counts a lie.
      expect(source, "fixture must actually contain the evasion").toContain("brand");
      expect(stripped, `left the quoted class behind: ${source}`).not.toContain("brand");
      // …and the code before it must survive, or this fix would just be a different bug.
      expect(stripped, `ate real code: ${source}`).toContain(survives);
    });
  }

  it("blanks a whole-line comment that names a class — the CR-03 evasion", () => {
    // The shape reproduced on `src/components/host/payout-banner.tsx`: the hue deleted from the
    // glyph and named in a comment instead, which satisfied DS-10's only call-site icon check.
    const evasion = [
      "        {/* the hue used to be text-success here */}",
      '        <CheckCircle2 className="size-3" aria-hidden="true" />',
    ].join("\n");
    expect(stripComments(evasion)).not.toContain("text-success");
    expect(stripComments(evasion)).toContain("CheckCircle2");
  });
});

describe("WR-02 — the two hazards that made the old stripper line-anchored are handled", () => {
  it("never treats an in-string `/*` as a block opener (the profile-form hazard)", () => {
    // `accept="image/*"` is real markup at src/app/(app)/profile/profile-form.tsx. A naive block
    // open there runs to the next `*/` 86 lines later, and the scan then vouches for source it
    // never read. This is the assertion that stops a "simpler" stripper being adopted.
    const markup = '<input accept="image/*" />\n<p className="text-[9px]" />\n/* later */';
    expect(stripComments(markup)).toContain("text-[9px]");
    expect(stripComments(markup)).toContain('accept="image/*"');
  });

  it("never truncates a line at a `//` inside a string (the URL hazard)", () => {
    const url = 'const u = "https://fitout.example/og.png"; const keep = "bg-brand";';
    expect(stripComments(url)).toContain("https://fitout.example/og.png");
    expect(stripComments(url)).toContain("bg-brand");
  });

  it("honours backslash escapes, so an escaped quote does not close the string early", () => {
    const escaped = 'const s = "a \\" // not a comment"; const keep = 1;';
    expect(stripComments(escaped)).toContain("// not a comment");
    expect(stripComments(escaped)).toContain("const keep = 1;");
  });

  it("does not carry string state across a newline", () => {
    // An unmatched apostrophe in JSX prose is ordinary (`<p>Don't</p>`). If quote state carried, one
    // of them would put the rest of the FILE into string state and the stripper would stop working
    // silently. Bounded to its own line, the worst case is an un-stripped comment — which
    // OVER-counts, and over-counting fails a pinned assertion loudly.
    const src = "<p>Don't</p>\n// bg-brand";
    expect(stripComments(src)).not.toContain("bg-brand");
  });
});

describe("WR-02 — the stripper is measured against the real tree, not only fixtures", () => {
  it("leaves the overwhelming majority of a real component intact", () => {
    // GUARD-THE-GUARD. Every count assertion in this suite reads stripped text, and a stripper that
    // returned "" would satisfy every empty-violations assertion in the phase perfectly. This pins
    // the opposite property against a real, comment-heavy file.
    const file = resolve(process.cwd(), "src/components/booking/book-cta.tsx");
    const raw = readFileSync(file, "utf8");
    const code = stripComments(raw);

    const nonBlank = (t: string) => t.split("\n").filter((l) => l.trim().length > 0).length;
    expect(nonBlank(code)).toBeGreaterThan(nonBlank(raw) * 0.5);

    // …and the thing the gate actually counts in this file is still there.
    expect(code).toContain('variant="brand"');
  });

  it("still strips the file's real comments", () => {
    const raw = readFileSync(resolve(process.cwd(), "src/components/ui/button.tsx"), "utf8");
    const code = stripComments(raw);
    expect(raw).toContain("//");
    expect(nonBlankLength(code)).toBeLessThan(nonBlankLength(raw));
  });
});

function nonBlankLength(text: string): number {
  return text.split("\n").filter((l) => l.trim().length > 0).length;
}
