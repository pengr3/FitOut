import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge, taught the four NAMED TYPE ROLES this design system declares (DS-02 / D-01).
 *
 * MEASURED, NOT PRECAUTIONARY. tailwind-merge resolves a `text-*` utility by trying the font-size
 * group first (t-shirt sizes and arbitrary lengths) and falling through to the text-COLOUR group,
 * whose matcher accepts anything. `display`, `heading`, `body` and `label` are none of the shapes
 * the font-size matcher recognises, so out of the box every one of them is classified as a COLOUR.
 * Probed against the version in this tree:
 *
 *     twMerge("text-label", "text-muted-foreground")   →  "text-muted-foreground"
 *     twMerge("text-display text-muted-foreground")    →  "text-muted-foreground"
 *
 * The role is silently DELETED. That is the same defect class as the slash-modifier trap
 * `globals.css` warns about (`text-display/tight` compiles to size + leading and drops the
 * per-theme weight and tracking): the call site looks migrated, `tsc` is happy, the leak gate is
 * happy, and DS-02 is false on that surface — with the extra sting that here the surface renders at
 * the INHERITED size, so a Display heading silently becomes body text.
 *
 * Registering the four names under Tailwind's own `--text-*` theme namespace is the fix, and it is
 * the whole fix: after it, `cn("text-label", "text-muted-foreground")` keeps both (different
 * groups), `cn("text-sm", "text-display")` correctly resolves to the role, and `text-foreground`
 * versus `text-brand` still resolves as a colour conflict. Nothing else moves — all 12 shipped
 * `sm:text-display` sites are plain className strings that never reach a merge.
 *
 * THIS LIST IS DERIVED FROM `globals.css`, BUT NOT AUTOMATICALLY (WR-10). It cannot be: `cn()` runs
 * in the browser bundle and cannot read a stylesheet at runtime. So the names are still written out
 * here — and `tests/design/type-scale.test.ts` PARSES the `@theme inline` block and asserts this
 * exact array equals what it finds. That is what closes the loop the fix to `cn()` left open.
 *
 * The open loop was not theoretical. Before that assertion existed, the four names lived in three
 * hand-maintained copies with nothing tying them together, so adding a fifth role to `globals.css`
 * and writing `cn("text-caption", "text-muted-foreground")` silently deleted it again — the exact
 * defect this `extendTailwindMerge` call exists to fix — with the whole suite green, because
 * nothing had told the suite the role existed. Add a role to the stylesheet now and the type-scale
 * gate goes red naming this constant.
 */
export const TYPE_ROLES = ["display", "heading", "body", "label"] as const;

const twMerge = extendTailwindMerge({
  extend: { theme: { text: [...TYPE_ROLES] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
