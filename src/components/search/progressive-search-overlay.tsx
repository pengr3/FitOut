"use client";

import { useEffect, useState, type ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const MOBILE_QUERY = "(max-width: 639px)";

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
  returnFocus,
  onOpenAutoFocus,
  onDismiss,
  children,
}: {
  open: boolean;
  trigger?: ReactNode;
  returnFocus?: HTMLElement | null;
  onOpenAutoFocus?: (event: Event) => void;
  onDismiss: () => void;
  children: ReactNode;
}) {
  const isMobile = useMobilePresentation();
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
          className="max-sm:inset-0 max-sm:h-[100dvh] max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:overflow-y-auto"
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
      <PopoverContent
        data-testid="progressive-search-desktop-overlay"
        align="start"
        side="bottom"
        sideOffset={8}
        className="w-[min(30rem,calc(100vw-2rem))] p-4"
        onOpenAutoFocus={onOpenAutoFocus}
        onCloseAutoFocus={restoreFocus}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
