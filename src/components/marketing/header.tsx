"use client";

import Link from "next/link";
import { useId, useRef, useState, useSyncExternalStore } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const destinations = [
  ["Home", "/"], ["Hosts", "/hosts"], ["Players", "/players"],
  ["About", "/about"], ["FAQ", "/faq"], ["Contact", "/contact"],
] as const;
const subscribeHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

// The server supplies only the checked destination. No account or origin config
// crosses into this disclosure's client bundle.
export function MarketingHeader({ appUrl }: { appUrl: string }) {
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydrated, serverHydrated);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  return (
    <header data-hydrated={hydrated} className="border-b border-border bg-background" onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    }}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-4 sm:gap-4 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <Link href="/" aria-label="FitOut home" className={cn(buttonVariants({ variant: "ghost", size: "touch" }), "mr-auto justify-self-start text-heading text-brand")}><span aria-hidden="true" className={cn(buttonVariants({ variant: "brand", size: "icon" }), "mr-2 size-7 rounded-lg p-0")}><svg viewBox="0 0 24 24" className="size-5" fill="none"><path d="M7 5h12M7 5v14M7 11h9M4 5h3M4 11h3" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg></span>FitOut</Link>
        <Button ref={trigger} disabled={!hydrated} variant="outline" size="touch" className="lg:hidden motion-reduce:transition-none" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(!open)}>Menu</Button>
        <nav id={menuId} aria-label="Main navigation" className={cn("order-last w-full lg:order-none lg:w-auto lg:flex", open ? "block" : "hidden")}>
          <ul className="flex flex-col gap-1 pt-3 lg:flex-row lg:justify-center lg:pt-0">
            {destinations.map(([label, href]) => (
              <li key={href}>
                <Link href={href} onClick={() => setOpen(false)} className={cn(buttonVariants({ variant: "ghost", size: "touch" }), "w-full justify-start lg:w-auto motion-reduce:transition-none")}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <a href={appUrl} className={cn(buttonVariants({ variant: "brand", size: "touch" }), "justify-self-end motion-reduce:transition-none")}>Open App</a>
      </div>
    </header>
  );
}
