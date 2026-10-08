"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { activateHosting } from "@/app/actions/capability";
import { Button } from "@/components/ui/button";
import { safeCallbackPath } from "@/lib/safe-callback-url";

const subscribeHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

export function HostingIntent() {
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydrated, serverHydrated);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function startHosting() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await activateHosting();
        if (!result.ok) { setError(result.error); return; }
        const destination = safeCallbackPath(result.redirectTo, window.location.origin);
        if (destination !== "/host") {
          setError("We couldn't continue host setup. Please try again.");
          return;
        }
        router.push(destination);
      } catch {
        setError("We couldn't start hosting. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-3">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="button" variant="brand" size="touch" className="w-full"
        disabled={!hydrated || pending} onClick={startHosting}>
        {pending ? "Starting hosting…" : "Start hosting"}
      </Button>
    </div>
  );
}
