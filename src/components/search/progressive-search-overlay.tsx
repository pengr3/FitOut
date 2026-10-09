"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { ResponsiveDialog } from "@/components/patterns/responsive-dialog";

export function ProgressiveSearchOverlay({
  open, trigger, desktopAnchor, returnFocus, onOpenAutoFocus, onDismiss,
  desktopPresentation = "standard", children,
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = desktopAnchor ?? triggerRef.current;
    if (!anchor) return;
    // Geometry only: CSS owns the breakpoint. No content or focus trap is replaced on resize.
    // D-24-09 keeps the desktop panel attached to its trigger without moving the page content.
    const position = () => {
      const content = contentRef.current;
      if (!content) return;
      const box = anchor.getBoundingClientRect();
      const width = Math.min(desktopPresentation === "compact" ? 544 : 768, window.innerWidth - 32);
      const left = Math.max(16, Math.min(box.left, window.innerWidth - width - 16));
      const top = Math.max(16, Math.min(box.bottom + 8, window.innerHeight - 96));
      content.style.setProperty("--search-width", `${width}px`);
      content.style.setProperty("--search-left", `${left}px`);
      content.style.setProperty("--search-top", `${top}px`);
      content.style.setProperty("--search-height", `${Math.max(80, window.innerHeight - top - 16)}px`);
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(position) : null;
    observer?.observe(anchor);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      observer?.disconnect();
    };
  }, [open, desktopAnchor, desktopPresentation]);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(nextOpen) => { if (!nextOpen) onDismiss(); }}
      trigger={trigger}
      triggerRef={triggerRef}
      contentRef={contentRef}
      title="Search spaces"
      hideTitle
      showCloseButton={false}
      contentClassName="max-sm:inset-0 max-sm:h-[100dvh] max-sm:max-h-none max-sm:rounded-none sm:top-(--search-top) sm:left-(--search-left) sm:w-(--search-width) sm:max-w-none sm:max-h-(--search-height) sm:translate-x-0 sm:translate-y-0 overflow-y-auto"
      onOpenAutoFocus={onOpenAutoFocus}
      onCloseAutoFocus={(event) => {
        if (!trigger && returnFocus) {
          event.preventDefault();
          returnFocus.focus();
        }
      }}
    >
      {children}
    </ResponsiveDialog>
  );
}
