"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/patterns/page-header";
import { HOST_LIST_SHELL } from "@/lib/design/measurements";

/** Next 16.2.7 segment boundary: retry refetches the Server Component. */
export default function HostEarningsError({ unstable_retry }: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <div className={HOST_LIST_SHELL}>
    <PageHeader title="Earnings" />
    <div role="alert" className="mt-8 rounded-xl border border-border bg-card p-4 sm:p-6">
      <AlertCircle className="size-5 text-muted-foreground" aria-hidden="true" />
      <h2 className="mt-3 text-heading font-semibold">Earnings unavailable</h2>
      <p className="mt-2 max-w-prose text-body text-muted-foreground">We couldn&apos;t load your earnings. Try again.</p>
      <Button type="button" variant="outline" className="mt-4 min-h-11 max-w-full whitespace-normal break-words" onClick={unstable_retry}>
        Try again
      </Button>
    </div>
  </div>;
}
