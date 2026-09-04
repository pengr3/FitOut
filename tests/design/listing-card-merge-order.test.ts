// HSURF-01 / D-06 — THE RULE: *the four classes the host listing card's footer depends on must all
// survive `cn()`.* Concretely: `p-4` (from `CardFooter`'s own base) and `gap-2`, `mt-auto`,
// `flex-wrap` (from the call site) must ALL be present in the merged result.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE EXISTS — the mechanism, and the precedent that measured it
// ═══════════════════════════════════════════════════════════════════════════════════════════════
//
// `cn` is not string concatenation. It is `clsx` + `extendTailwindMerge` (`src/lib/utils.ts:41-47`),
// and tailwind-merge resolves a conflict by **DELETING THE EARLIER CLASS BEFORE ANY CSS EXISTS**.
// So ARGUMENT ORDER decides which class survives to the DOM at all — not which one wins a cascade,
// which is a different mechanism at a later stage.
//
// Phase 17's **WR-04** measured this for real, in this repo, on a shipped page: hoisting a named
// constant to the FRONT of a `cn()` call deleted `pb-20` **outright**, leaving a state worse than
// the defect being fixed. `tests/design/clearance-merge-order.test.ts` is the gate that closed that
// case. This file is the same rule pointed at HSURF-01's edit.
//
// The hazard is *structurally* absent from the shipped shape — `Card`, `CardContent` and
// `CardFooter` all call `cn(<base>, className)` with the call-site string LAST
// (`src/components/ui/card.tsx:14-18`, `:76`, `:86-91`), which is the winning position, and
// `src/lib/utils.ts` extends only `theme.text`, so no layout group is touched. That is an argument,
// not an instrument. This file is the instrument: it runs the REAL `cn` over the REAL strings, so a
// future "tidy" that hoists the call-site string, folds it into a constant, or reorders the tokens
// reddens here instead of shipping a footer that silently lost its padding or its alignment.
//
// ⚠ NOT COVERED, deliberately: whether those classes produce the right *geometry*. That is measured
// in a browser by `e2e/host-listing-grid.spec.ts` (both guards, at 320/700/1280), which was watched
// RED against the pre-fix tree. This file only proves the classes REACH the DOM.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cn } from "@/lib/utils";

const CARD_SRC = resolve(process.cwd(), "src/components/ui/card.tsx");
const LISTING_CARD_SRC = resolve(process.cwd(), "src/components/listing/listing-card.tsx");

/**
 * The four classes under the rule, and what each one is load-bearing FOR. Naming the job is what
 * makes a red here readable: a missing class is never "a string differs", it is a specific piece of
 * the footer that stopped existing.
 */
const REQUIRED: Readonly<Record<string, string>> = {
  "p-4": "CardFooter's OWN base padding (ui/card.tsx:86-91) — lose it and the control row sits hard against the card's edges",
  "gap-2": "the spacing between the footer's three flex children",
  "mt-auto":
    "HSURF-01's alignment fix — it absorbs the column's free space so the tinted band is flush with the card's bottom edge (D-05)",
  "flex-wrap":
    "HSURF-01's overflow fix — CardFooter is the flex container that cannot wrap, while Button carries shrink-0 + whitespace-nowrap (D-08)",
};

/**
 * `CardFooter`'s base string, read from the vendored primitive rather than retyped — so a shadcn
 * re-install that changes the base reaches this gate instead of sliding past a stale copy.
 */
function readCardFooterBase(): string {
  const src = readFileSync(CARD_SRC, "utf8");
  const marker = 'data-slot="card-footer"';
  const at = src.indexOf(marker);
  if (at === -1) return "";
  const match = /cn\(\s*"([^"]+)"/.exec(src.slice(at));
  return match ? match[1] : "";
}

/**
 * The call-site string on `<CardFooter …>` in the host listing card, read from source. This is the
 * argument whose ORDER the rule is about, so reading it beats asserting a literal: reorder the
 * tokens in the component and this gate merges what the component actually ships.
 */
function readFooterCallSite(): string {
  const src = readFileSync(LISTING_CARD_SRC, "utf8");
  const match = /<CardFooter\s+className="([^"]+)"/.exec(src);
  return match ? match[1] : "";
}

describe("D-06 — the listing card's footer classes all survive cn()", () => {
  const base = readCardFooterBase();
  const callSite = readFooterCallSite();

  // ── Vacuity gates. A regex that matched nothing would make every assertion below trivially
  // true over two empty strings, which is the failure mode a source-reading gate has and a
  // literal-string gate does not. These are HARD.
  it("actually read CardFooter's base string out of the vendored primitive", () => {
    expect(
      base,
      `Could not extract CardFooter's base class string from ${CARD_SRC}. This gate merges the REAL base; ` +
        `an empty read would make every assertion below vacuously true. If the primitive's shape changed, fix the ` +
        `reader — do not delete the gate.`,
    ).not.toBe("");
    expect(base).toContain("p-4");
  });

  it("actually read the <CardFooter> call-site string out of the listing card", () => {
    expect(
      callSite,
      `Could not extract the <CardFooter className="…"> string from ${LISTING_CARD_SRC}. The listing card has ONE ` +
        `call site (see that file's docblock at :270-279), and this gate is about the ORDER of its tokens, so an ` +
        `empty read is a broken instrument, not a pass.`,
    ).not.toBe("");
  });

  // ── The rule itself.
  it("keeps p-4, gap-2, mt-auto and flex-wrap through the real merge", () => {
    const merged = cn(base, callSite).split(/\s+/).filter(Boolean);

    for (const [cls, job] of Object.entries(REQUIRED)) {
      expect(
        merged,
        `\`${cls}\` WAS DELETED BY THE CLASS MERGE.\n\n` +
          `  cn(base, callSite) → "${merged.join(" ")}"\n` +
          `  base      = "${base}"\n` +
          `  callSite  = "${callSite}"\n\n` +
          `WHAT \`${cls}\` DOES: ${job}.\n\n` +
          `THE MECHANISM: \`cn\` is clsx + extendTailwindMerge (src/lib/utils.ts:41-47), and tailwind-merge resolves a ` +
          `conflict by DELETING THE EARLIER CLASS — before any CSS exists. This is not a cascade the later rule wins; ` +
          `the class never reaches the DOM at all.\n` +
          `THE PRECEDENT: Phase 17's WR-04 measured exactly this in this repo — a named constant hoisted to the FRONT ` +
          `of a cn() call destroyed \`pb-20\` outright, leaving a page worse than the defect being fixed. See ` +
          `tests/design/clearance-merge-order.test.ts.\n` +
          `THE FIX: the call-site string must stay in the LAST argument position (ui/card.tsx:86-91 already passes it ` +
          `there), and new tokens must be APPENDED to it, never prepended and never folded into a hoisted constant.`,
      ).toContain(cls);
    }
  });

  it("uses the REAL cn, so a change to the merge configuration reaches this gate", () => {
    // Not a tautology: `cn` is `extendTailwindMerge`d, and the whole rule is a claim about THAT
    // function's behaviour. Importing it rather than modelling it is what makes this file a gate
    // over the app instead of a gate over a description of the app. The second line is the deletion
    // this file exists to catch, demonstrated on the footer's own padding group.
    expect(cn("p-4", "p-8")).toBe("p-8");
    expect(cn("p-8", "p-4")).toBe("p-4");
    expect(cn("flex items-center p-4", "gap-2 mt-auto flex-wrap")).toContain("p-4");
  });

  it("would go RED if the call-site string were hoisted to the front", () => {
    // The counterfactual, asserted rather than asserted-about: hoisting is the single most plausible
    // "tidy" anyone will ever perform here, and it is what WR-04 measured. `p-4` is the casualty —
    // the base's padding loses to nothing here, so the shape below shows the direction of the
    // deletion using an explicit conflicting token.
    const hoisted = cn("gap-2 mt-auto flex-wrap p-8", base);
    expect(hoisted).not.toContain("p-8");
    expect(hoisted).toContain("p-4");
  });
});
