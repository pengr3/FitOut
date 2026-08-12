"use client"

import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      {/*
        `max-h-[inherit]` IS LOAD-BEARING, and without it BOTH call sites in this repo are broken
        (IN-14). The viewport's `size-full` is `height: 100%`, and a percentage height resolves
        against the containing block's HEIGHT — a `max-height` on the Root does not make that height
        definite, so it falls back to `auto` and the viewport grows to the full content height. The
        viewport is the element carrying `overflow: scroll`, so when it is exactly as tall as its
        content there is nothing to scroll: the cap clamps the Root while the content spills
        straight past it.

        Measured in Chromium via Playwright rather than argued from the spec. `<ScrollArea
        className="max-h-96">` with 20 rows: Root 384px, viewport 800px, `scrollHeight === clientHeight`,
        NOT scrollable, content overflowing the Root by 416px. With this class: viewport 384px,
        scrollHeight 800, scrollable. Both shipped call sites use the max-height idiom —
        `notification-bell.tsx` (max-h-96) and `slot-picker.tsx` (max-h-72) — so both were affected.

        `inherit` rather than a definite height because the cap belongs to the call site, and
        because shrink-to-fit must survive: with 2 rows the panel still measures 80px, where the
        shadcn `h-96` idiom would have forced a 384px box padded with empty space. A Root with no
        max-height inherits `none` and is unchanged.
      */}
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full max-h-[inherit] rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
