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
 * Keep this list in lockstep with the `--text-*` role entries in `src/app/globals.css`'s
 * `@theme inline` block. A fifth role added there and not here is invisible to `cn()` again.
 */
const twMerge = extendTailwindMerge({
  extend: { theme: { text: ["display", "heading", "body", "label"] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
