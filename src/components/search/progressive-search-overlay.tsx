"use client";

import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const DESKTOP_WIDTH_CLASS = {
  standard: "sm:max-w-3xl",
  compact: "sm:max-w-xl",
} as const;

export function ProgressiveSearchOverlay({
  open,
  trigger,
  returnFocus,
  onOpenAutoFocus,
  onDismiss,
  desktopPresentation = "standard",
  children,
}: {
  open: boolean;
  trigger?: ReactNode;
  returnFocus?: HTMLElement | null;
  onOpenAutoFocus?: (event: Event) => void;
  onDismiss: () => void;
  desktopPresentation?: "standard" | "compact";
  children: ReactNode;
}) {
  const restoreFocus = (event: Event) => {
    if (!trigger && returnFocus) {
      event.preventDefault();
      returnFocus.focus();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onDismiss(); }}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        aria-describedby={undefined}
        showCloseButton={false}
        className={`max-sm:inset-0 max-sm:h-[100dvh] max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:overflow-y-auto max-sm:data-open:zoom-in-100 max-sm:data-closed:zoom-out-100 ${DESKTOP_WIDTH_CLASS[desktopPresentation]} sm:max-h-[calc(100dvh-4rem)] sm:overflow-y-auto`}
        onOpenAutoFocus={onOpenAutoFocus}
        onCloseAutoFocus={restoreFocus}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search spaces</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
