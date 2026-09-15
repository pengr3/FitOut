"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const MOBILE_QUERY = "(max-width: 639px)";
const DESKTOP_WIDTH_CLASS = {
  standard: "w-[min(48rem,calc(100vw-2rem))]",
  compact: "w-[min(34rem,calc(100vw-2rem))]",
} as const;

function useMobilePresentation() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const updatePresentation = () => setIsMobile(mediaQuery.matches);
    updatePresentation();
    mediaQuery.addEventListener("change", updatePresentation);
    return () => mediaQuery.removeEventListener("change", updatePresentation);
  }, []);

  return isMobile;
}

export function ProgressiveSearchOverlay({
  open,
  trigger,
  desktopAnchor,
  returnFocus,
  onOpenAutoFocus,
  onDismiss,
  desktopPresentation = "standard",
  children,
}: {
  open: boolean;
  trigger?: ReactNode;
  desktopAnchor?: HTMLElement | null;
  returnFocus?: HTMLElement | null;
  onOpenAutoFocus?: (event: Event) => void;
  onDismiss: () => void;
  desktopPresentation?: "standard" | "compact";
  children: ReactNode;
}) {
  const isMobile = useMobilePresentation();
  const directEditAnchor = useMemo(() => ({ current: desktopAnchor ?? null }), [desktopAnchor]);
  const restoreFocus = (event: Event) => {
    if (!trigger && returnFocus) {
      event.preventDefault();
      returnFocus.focus();
    }
  };

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onDismiss(); }}>
        {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
        <DialogContent
          data-testid="progressive-search-mobile-sheet"
          aria-describedby={undefined}
          showCloseButton={false}
          className="max-sm:inset-0 max-sm:h-[100dvh] max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:overflow-y-auto max-sm:data-open:zoom-in-100 max-sm:data-closed:zoom-out-100"
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

  return (
    <Popover open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onDismiss(); }}>
      {trigger ? <PopoverTrigger asChild>{trigger}</PopoverTrigger> : null}
      {!trigger && desktopAnchor ? <PopoverAnchor virtualRef={directEditAnchor} /> : null}
      <PopoverContent
        data-testid="progressive-search-desktop-overlay"
        align="start"
        side="bottom"
        sideOffset={8}
        className={`max-h-(--radix-popover-content-available-height) ${DESKTOP_WIDTH_CLASS[desktopPresentation]} overflow-y-auto p-4`}
        onOpenAutoFocus={onOpenAutoFocus}
        onCloseAutoFocus={restoreFocus}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
