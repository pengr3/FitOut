import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// FORKED FROM SHADCN, DELIBERATELY (D-17). Phase 10 changes four recipes here and adds one size; a
// future `npx shadcn add button` re-collides with all five, so each one carries its reason.
//
// 1. DS-05 — THE FOCUS RECIPE. This is the one recipe, app-wide; every other control copies it from
//    here. The base string used to end its ring in a 50% alpha, which compiles to
//    `color-mix(in oklab, var(--ring) 50%, transparent)` and, composited over white, measures
//    2.32:1 against a 3:1 non-text bar. This is arithmetic, not preference: no value of `--ring`
//    rescues it — the lightest neutral that reaches 3:1 at half alpha still fails on `--muted`
//    (2.93:1). So the alpha is gone and the ring is solid. The offset COLOUR is declared explicitly
//    rather than left to Tailwind's default, which is a literal white — a leak in all but name, and
//    visibly wrong on grove's tinted background. The offset band is what guarantees the
//    indicator has a verified 3:1-or-better surface on both sides (ring on background 7.46 / 7.11).
//
// 2. DS-08 — `brand` IS A VARIANT, not a string copied to 20 call sites. Its hover is a `color-mix`
//    that DARKENS. An alpha tint over a light surface always lightens instead, and
//    `--brand-foreground` on a 90%-alpha brand measures 4.04:1 (court) / 3.87:1 (grove) against a
//    4.5 bar — the CVA block in `10-RESEARCH.md` § Code Examples still ships that alpha form and is
//    superseded; copying it verbatim reintroduces exactly the defect this phase exists to remove.
//    The mix form measures 5.41 / 5.36. It is not new vocabulary: `secondary` below has shipped the
//    same idiom all along. It is also not a `--brand-strong` escape hatch (rejected in CONTEXT):
//    there is still exactly one brand value and zero per-call-site judgement, because the hover
//    lives once, here, inside the variant.
//
// 3. D-21 — AN UN-VARIANTED `<Button>` STAYS NEUTRAL `--primary` near-black. Coral appears only
//    where someone asked for it; that is what protects the 10% accent budget, so `defaultVariants`
//    does not move. `default`'s hover changes to the same mix form for consistency of mechanism
//    only — the alpha it replaces measured 9.19:1 and was never failing.
//
// 4. `destructive`'s hover flips from deepening its own tint to a solid fill with the
//    `--destructive-foreground` token (5.52:1 in both themes). Deepening a tint moves the surface
//    TOWARD the text colour, which is the wrong direction, and is why the 20%-alpha hover it
//    replaces measured 4.01:1.
//
// NOT CHANGED HERE, ON PURPOSE: `text-sm font-medium` (it now renders at the theme's emphasis
// weight because `--font-weight-medium` is aliased onto it — an accepted visible change needing
// zero edits), the `text-[0.8rem]` in `size: sm` (recorded, tolerated vendored debt; the leak
// pattern is px-only), and every dark-mode-prefixed utility below.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-[color-mix(in_oklch,var(--primary),var(--foreground)_10%)]",
        // DS-08 — the accent, opt-in only. Never the default (D-21).
        brand:
          "bg-brand text-brand-foreground hover:bg-[color-mix(in_oklch,var(--brand),var(--foreground)_10%)]",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        // D-2, absorbed by 10-07: this variant used to override the base focus recipe with its own
        // low-alpha ring colour and a low-alpha focus border. That is the SAME defect class as the
        // half-alpha base ring DS-05 exists to remove — arithmetically worse, and invisible to any
        // scan written against the base string, because the colour name differs. Both overrides are
        // gone, so a focused destructive button now paints the one app-wide recipe like every other
        // control. The dark-mode twin went with it, which is why the vendored dark-mode-prefixed
        // total is restated in 10-07-SUMMARY.md rather than left at its previous pin.
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground dark:bg-destructive/20 dark:hover:bg-destructive/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        // DS-09 — a 44px control height, which is 4 x 11 and so already on the spacing grid (no
        // arbitrary value needed). EXPLICIT OPT-IN, NEVER A RESPONSIVE DEFAULT (D-22): a responsive
        // default would silently re-lay-out every dense host table on mobile at once. The cost of
        // that choice, recorded here rather than discovered later: NOTHING ENFORCES ADOPTION
        // AUTOMATICALLY, so Phase 17's a11y audit is the mechanism that catches the booker-facing
        // call sites which never opted in. If it finds many, the documented alternative is the
        // responsive default this rejects.
        touch:
          "h-11 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
