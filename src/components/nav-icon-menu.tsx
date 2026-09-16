"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MenuIcon } from "lucide-react";

import { activateBooking, activateHosting } from "@/app/actions/capability";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NavIconMenu({
  current,
  canBook,
  canHost,
}: {
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Navigation menu"
          data-mode-switch
          data-current={current}
          disabled={pending}
        >
          <MenuIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link href="/profile">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Switch context</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-52">
            <DropdownMenuLabel>Switch context</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              data-mode-target="book"
              disabled={pending}
              onSelect={(event) => {
                event.preventDefault();
                goBooking();
              }}
            >
              {canBook ? "Switch to booking" : "Start booking"}
            </DropdownMenuItem>
            <DropdownMenuItem
              data-mode-target="host"
              disabled={pending}
              onSelect={(event) => {
                event.preventDefault();
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
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
