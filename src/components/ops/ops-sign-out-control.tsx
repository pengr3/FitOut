"use client";

import { useTransition } from "react";

import { signOutOpsAction } from "@/app/actions/ops-auth";
import { Button } from "@/components/ui/button";

/**
 * Server Actions navigate through the App Router by default. Because `/login` is host-rewritten,
 * that client transition can reuse the marketplace route tree even while the address bar carries
 * the ops authority. A full-document assignment makes Proxy classify the destination Host again.
 */
export function OpsSignOutControl() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      className="min-h-11"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const redirectTo = await signOutOpsAction();
          window.location.assign(redirectTo);
        });
      }}
    >
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
