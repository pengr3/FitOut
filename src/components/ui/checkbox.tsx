"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // A CHECKED AND INVALID BOX KEEPS THE ERROR COLOUR (WR-01). The state-scoped border used to
        // resolve to the primary token, which erased the only error affordance this control has.
        // The two rules are not equal: the plain invalid border compiles to `&[aria-invalid="true"]`
        // at (0,2,0), the checked-and-invalid one to a nested `&[aria-checked="true"]` at (0,3,0),
        // and Radix sets `aria-checked` on this root — so the more specific rule won and a checked,
        // invalid box rendered with no destructive cue of any kind. Before the phase-10 CR-01 fix
        // that state at least had the (poor, 1.44:1) invalid ring; that ring is correctly gone, so
        // this border is now the whole affordance. Verified against the compiled stylesheet rather
        // than argued. The `data-checked:` fill still applies — it compiles inside `:where()` at
        // (0,1,0) — so the control reads as a filled box with an error edge.
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input transition-colors outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:aria-checked:border-destructive dark:bg-input/30 dark:aria-invalid:border-destructive/50 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
