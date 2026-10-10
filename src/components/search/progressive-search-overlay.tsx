"use client";

import type { ReactNode } from "react";
import { ResponsiveDialog } from "@/components/patterns/responsive-dialog";

const DESKTOP_WIDTH_CLASS = { standard: "sm:max-w-3xl", compact: "sm:max-w-xl" } as const;

export function ProgressiveSearchOverlay({ open, trigger, returnFocus, onOpenAutoFocus, onDismiss,
  desktopPresentation = "standard", children }: {
  open: boolean;
  trigger?: ReactNode;
  returnFocus?: HTMLElement | null;
  onOpenAutoFocus?: (event: Event) => void;
  onDismiss: () => void;
  desktopPresentation?: "standard" | "compact";
  children: ReactNode;
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onDismiss(); }}
      trigger={trigger} title="Search spaces" hideTitle showCloseButton={false}
      contentClassName={"max-sm:inset-0 max-sm:h-[100dvh] max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:overflow-y-auto max-sm:data-open:zoom-in-100 max-sm:data-closed:zoom-out-100 " + DESKTOP_WIDTH_CLASS[desktopPresentation] + " sm:w-[calc(100%-2rem)] sm:max-h-[calc(100dvh-4rem)] sm:overflow-y-auto"}
      onOpenAutoFocus={onOpenAutoFocus} onCloseAutoFocus={(event) => {
        if (!trigger && returnFocus) { event.preventDefault(); returnFocus.focus(); }
      }}>
      {children}
    </ResponsiveDialog>
  );
}
