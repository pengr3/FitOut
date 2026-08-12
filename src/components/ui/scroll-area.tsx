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
      {/*
        THE VIEWPORT'S CONTENT WRAPPER IS FORCED TO `display: block` (UAT gap G-01) — that is what
        the child-combinator override in the className below does, and it is the whole fix.

        Radix renders every child of the Viewport inside ONE wrapper div and hardcodes
        `style={{ minWidth: "100%", display: "table" }}` on it
        (`@radix-ui/react-scroll-area/dist/index.mjs:130`). That style is INLINE, which is why the
        override has to carry `!important`: an unweighted utility loses to it outright. There is no
        Radix prop that configures the wrapper away, so CSS is the only lever available.

        `display: table` shrink-wraps to max-content, which makes `min-width: 100%` a FLOOR WITH NO
        CEILING — long unbreakable content expands the wrapper past the panel and everything beyond
        the edge is clipped. Measured in Chromium via Playwright rather than argued from the spec,
        signed in with the notification panel open: viewport 384.0px, wrapper 976.9px, row 976.9px,
        overflowing by 592.9px to the RIGHT with the rows flush left at 0. (It was reported as
        spilling LEFT; the pixels say right.) With the override, wrapper and row are both exactly
        384.0px.

        NOT an IN-14 regression: remove `max-h-[inherit]` and the row still measures 976.9px. IN-14
        is only what made the list long enough to read, and therefore long enough to notice.

        HORIZONTAL SCROLLING — READ THIS BEFORE ADDING IT. `display: table` is Radix's mechanism for
        horizontal auto-sizing, so forcing the wrapper to a block box means content can never exceed
        the viewport width and a horizontal scrollbar would have nothing left to scroll. That case is
        unreachable today: `ScrollArea` hardcodes `<ScrollBar />` a few lines below, whose
        orientation defaults to vertical, and a horizontal orientation is requested nowhere in `src/`
        (0 occurrences). No conditional and no prop ships for it, deliberately — a branch for a case
        that cannot occur is a branch nothing tests. Anyone adding horizontal support has to edit
        THIS component, so the note is in front of them: the fix then is to SCOPE the override (per
        instance, or off the scrollbar's orientation), NOT to delete it.

        BLAST RADIUS, recorded so it is not rediscovered: a block box no longer establishes the
        table-box boundary, so vertical margins on a direct child can now collapse through the
        wrapper. Neither shipped call site has top/bottom margins — `notification-bell.tsx` renders a
        `divide-y` list, `slot-picker.tsx` a gap-based flex group — and `/dev/theme` renders the
        latter twice for eyes to confirm it.

        Gated at two layers, each watched failing before it passed: `npm run test:design --
        scroll-area` (the compiled stylesheet; runs inside `npm run build`) and `npx playwright test
        scroll-area-overflow` (real widths in real Chromium). Neither alone is sufficient — the first
        proves the rule is emitted, the second proves it lands.
      */}
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full max-h-[inherit] [&>div]:block! rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-1"
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
