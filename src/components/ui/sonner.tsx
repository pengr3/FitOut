"use client"

// THEME-01 — the toast's theme mapping.
//
// THE BUG THIS FILE SHIPPED FOR THE WHOLE LIFE OF THE PROJECT. `useTheme()` returned `"system"`
// (no provider had ever mounted), and a widening cast on the `theme` prop told the compiler that was
// fine. Sonner's `theme` prop accepts ONLY `light | dark | system`, so with `system` it followed the
// OS colour scheme — and a booker on a dark-mode laptop got DARK toasts inside a light-only app.
// The cast is what hid it: it silenced the one check that would have caught the type lie. It is not
// reproduced literally here, because its absence from this file is asserted by a grep.
//
// Now that a provider is mounted, `resolvedTheme` returns a THEME NAME — `"court"` or `"grove"` —
// and neither is a value this prop accepts. Both are light-background themes (D-03), so the map is
// explicit rather than a wider cast. The `dark` branch is real rather than decorative: it keeps this
// a map instead of a constant, so if a genuinely dark theme is ever added the toast follows it.
//
// THIS ONE EDIT REACHES ALL FOUR <Toaster /> MOUNT SITES — (app)/layout.tsx:103,
// (host)/host/listings/page.tsx:77, .../[id]/availability/page.tsx:140 and
// .../[id]/edit/wizard.tsx:586. Fixing it at the mounts would be four edits and four chances to
// drift; the mapping belongs in the component, once.

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()
  const sonnerTheme: ToasterProps["theme"] =
    resolvedTheme === "dark" ? "dark" : "light"

  return (
    <Sonner
      theme={sonnerTheme}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
