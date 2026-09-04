"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * ⚠ `value` IS DESTRUCTURED, SO IT MUST BE FORWARDED EXPLICITLY — and that line is a WCAG 2.2 SC 4.1.2
 * (Value) fix, not a tidy-up. Corrected by the phase-17 code review (WR-06).
 *
 * WHAT THIS FILE USED TO DO. `value` was pulled out of the spread and used ONLY for the indicator's
 * `translateX`, so it reached the CSS and never reached `ProgressPrimitive.Root`. MEASURED against the
 * installed Radix build (`node_modules/@radix-ui/react-progress/dist/index.mjs`): `value: valueProp =
 * null` at `:16`, and `"aria-valuenow": isNumber(value) ? value : void 0` at `:35`. With no `value`,
 * Root is INDETERMINATE — `role="progressbar"` with `aria-valuemin`/`aria-valuemax`, no `aria-valuenow`
 * and no `aria-valuetext` — while the bar visibly fills to N%. Sighted users saw a percentage;
 * assistive technology was told the value was unknown.
 *
 * WHY NO GATE CAUGHT IT. `aria-valuenow` is OPTIONAL for `progressbar` (an indeterminate bar is legal
 * ARIA), so axe fires no rule. The GATE-02 sweep that found this bar's missing NAME (plan 17-07) was
 * therefore green on its missing VALUE, and the call-site docblock in `wizard.tsx` wrote the fix up as
 * if the value had always been there. Only a rendered assertion can see this class of defect, which is
 * what `tests/design/progress-value.test.tsx` now is.
 *
 * THE ROUNDING IS RADIX'S, NOT OURS. The one call site passes a float (`(step + 1) / steps.length *
 * 100` → 16.666…), so `aria-valuenow` carries the float — but Radix also derives `aria-valuetext` from
 * `getValueLabel`, which rounds to `"17%"`, and `aria-valuetext` is what an AT announces in preference
 * to `aria-valuenow`. Rounding here would throw away precision the assistive layer does not need us to
 * throw away.
 *
 * `value` is placed BEFORE `{...props}` deliberately: it is already destructured out of `props`, so the
 * spread cannot contain it, and a call site that wants an indeterminate bar says so by passing no
 * `value` at all — exactly as Radix's own API reads.
 */
function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="size-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
