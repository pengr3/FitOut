"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  // ⚠ DESTRUCTURED OUT OF THE SPREAD ON PURPOSE — this is deferred item D1's fix, and the ONE line
  // that decides whether this control has a name at all. See `thumbLabel` below.
  "aria-label": ariaLabel,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  /**
   * D1 — WHERE A SLIDER'S NAME HAS TO GO, AND WHY IT IS NOT WHERE THE CALLER PUT IT.
   *
   * MEASURED by plan 16-10 out of a real render (2026-08-25) and re-measured red before this fix:
   * the element carrying `role="slider"` is the THUMB, not the Root. Radix names the thumb from
   * `props["aria-label"] || getLabel(index, totalValues)`, and `getLabel` returns `undefined` for a
   * SINGLE-value slider — so a one-thumb slider shipped with no accessible name whatsoever, while
   * the caller's `aria-label` sat on the Root, which this block renders as a `<span data-slot=
   * "slider">` with NO role. A name on a role-less generic element contributes nothing to the
   * accessibility tree: `getByRole("slider", { name: "Zoom" })` matched zero elements, and nothing
   * on screen showed the difference. WCAG 2.2 SC 4.1.2 (Name, Role, Value), on a shipped control.
   *
   * So a caller's `aria-label` is FORWARDED to the thumb when there is exactly one, and is left off
   * the Root — both halves matter. Leaving it on the Root as well would keep an `aria-label` on a
   * generic element, which is prohibited by ARIA and is a real axe finding (`aria-prohibited-attr`),
   * not a tidiness point.
   *
   * MULTI-THUMB SLIDERS ARE DELIBERATELY UNTOUCHED. There Radix's own `getLabel` DOES name each
   * thumb by its index, and copying one caller-supplied name onto every thumb would replace two
   * distinct names with one ambiguous one — strictly worse than the gap this closes. This repo has
   * exactly one slider call site (`profile/image-crop-dialog.tsx`) and it is single-value; the
   * multi-thumb branch keeps today's behaviour byte-for-byte rather than inventing a policy for a
   * case with no consumer.
   */
  const isSingleThumb = _values.length === 1
  const thumbLabel = isSingleThumb ? ariaLabel : undefined

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      aria-label={isSingleThumb ? undefined : ariaLabel}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-full bg-muted data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute bg-primary select-none data-horizontal:h-full data-vertical:w-full"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          aria-label={thumbLabel}
          className="relative block size-3 shrink-0 rounded-full border border-ring bg-background transition-[color,box-shadow] select-none after:absolute after:-inset-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
