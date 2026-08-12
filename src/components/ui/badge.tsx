import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// FORKED FROM SHADCN, DELIBERATELY (D-17). DS-05: the focus indicator is THE one app-wide recipe
// defined in button.tsx — a solid 2px ring in --ring plus a 2px offset band in --background. The
// half-alpha ring colour it replaces composited to 2.32:1 against a 3:1 non-text bar, and that is
// arithmetic rather than preference: the lightest neutral reaching 3:1 through a half-alpha mix
// still fails on --muted. The offset COLOUR is named explicitly because Tailwind's default offset
// is a hardcoded white — a leak in all but name, and wrong on grove's tinted background.
//
// The `destructive` variant no longer overrides that ring with its own low-alpha colour (D-2). Its
// override was the same defect at a worse alpha, in a position no scan for the base string reaches.
// Removing it took the dark-mode twin with it, which is why the vendored dark-mode-prefixed total
// moves from its previous pin — see 10-07-SUMMARY.md, which restates the new number.
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        // The link-hover flips to a SOLID fill with inverted ink rather than deepening its own
        // tint — the same correction plan 10-07 made to the destructive <Button>, arriving here
        // late because no gate could see it. Deepening a tint moves the surface TOWARD the text
        // colour, which is the wrong direction: the 20% hover measured 4.01 (court) / 3.87 (grove)
        // against a 4.5 bar, the exact pair of numbers `contrast-pairs.ts` already cites as the
        // reason the button stopped doing this. It survived on the badge because
        // `pair-drift.test.ts` dropped the opacity from its lookup key, so this hover matched the
        // SOLID destructive-on-destructive row and was waved through (WR-05).
        destructive:
          "bg-destructive/10 text-destructive dark:bg-destructive/20 [a]:hover:bg-destructive [a]:hover:text-destructive-foreground",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
