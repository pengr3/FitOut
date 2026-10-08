"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const destinations = [
  ["Home", "/"], ["Hosts", "/hosts"], ["Players", "/players"],
  ["About", "/about"], ["FAQ", "/faq"], ["Contact", "/contact"],
] as const;

// The server supplies only the checked destination. No account or origin config
// crosses into this disclosure's client bundle.
export function MarketingHeader({ appUrl }: { appUrl: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  return (
    <header className="border-b border-border bg-background" onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    }}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-4 sm:gap-4 sm:px-6">
        <Link href="/" aria-label="FitOut home" className={cn(buttonVariants({ variant: "ghost", size: "touch" }), "mr-auto text-heading text-brand")}>FitOut</Link>
        <Button ref={trigger} variant="outline" size="touch" className="lg:hidden motion-reduce:transition-none" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(!open)}>Menu</Button>
        <nav id={menuId} aria-label="Main navigation" className={cn("order-last w-full lg:order-none lg:w-auto lg:flex", open ? "block" : "hidden")}>
          <ul className="flex flex-col gap-1 pt-3 lg:flex-row lg:pt-0">
            {destinations.map(([label, href]) => (
              <li key={href}>
                <Link href={href} onClick={() => setOpen(false)} className={cn(buttonVariants({ variant: "ghost", size: "touch" }), "w-full justify-start lg:w-auto motion-reduce:transition-none")}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <a href={appUrl} className={cn(buttonVariants({ variant: "brand", size: "touch" }), "motion-reduce:transition-none")}>Open App</a>
      </div>
    </header>
  );
}
