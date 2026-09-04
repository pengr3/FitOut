"use client";

// Airbnb-style booker/host mode switch (D-04).
//
// Flips the user between "Booking" and "Hosting" context. The two contexts are DISTINCT surfaces:
// booking lives under (app) at "/", hosting lives under the (host) route group at "/host". This
// control just navigates between them — the REAL capability gate is the per-page server check in
// src/app/(host)/host/layout.tsx (middleware/UI are optimistic only).
//
// CAPABILITY-AWARE: if the user lacks the TARGET capability, the switch shows an activation CTA
// ("Start hosting" / "Start booking") instead of a plain switch. That CTA calls the server action
// (activateHosting/activateBooking), which flips the flag server-side (input:false guard) and BOTH
// capabilities then coexist (D-03). After activation we navigate into the newly-available surface.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";

import { activateHosting, activateBooking } from "@/app/actions/capability";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ModeSwitch({
  current,
  canBook,
  canHost,
}: {
  /** Which context the current surface represents. */
  current: "book" | "host";
  canBook: boolean;
  canHost: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function goBooking() {
    if (canBook) {
      router.push("/");
      return;
    }
    // Activate booking, then navigate into the booking surface (coexists with hosting).
    startTransition(async () => {
      setError(null);
      const res = await activateBooking();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(res.redirectTo);
      router.refresh();
    });
  }

  function goHosting() {
    if (canHost) {
      router.push("/host");
      return;
    }
    // Activate hosting (NO Stripe — Phase 2), then navigate to the host surface.
    startTransition(async () => {
      setError(null);
      const res = await activateHosting();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(res.redirectTo);
      router.refresh();
    });
  }

  const label = current === "host" ? "Hosting" : "Booking";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-mode-switch
          data-current={current}
          disabled={pending}
        >
          {label}
          <ChevronDownIcon className="ml-1 size-3.5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Switch context</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Booking context */}
        <DropdownMenuItem
          data-mode-target="book"
          onSelect={(e) => {
            e.preventDefault();
            goBooking();
          }}
        >
          {canBook ? "Switch to booking" : "Start booking"}
        </DropdownMenuItem>

        {/* Hosting context */}
        <DropdownMenuItem
          data-mode-target="host"
          onSelect={(e) => {
            e.preventDefault();
            goHosting();
          }}
        >
          {canHost ? "Switch to hosting" : "Start hosting"}
        </DropdownMenuItem>

        {error && (
          <p role="alert" className="px-2 py-1 text-xs text-destructive">
            {error}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
