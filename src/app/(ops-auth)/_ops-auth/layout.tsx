import Link from "next/link";

import { BRAND_CLASS } from "@/components/patterns/site-chrome";
import { cn } from "@/lib/utils";

/**
 * Logged-out ops-auth shell. It is deliberately a sibling of `(ops)`: the protected ops layout
 * cloaks callers without a current staff session, while these pages must remain reachable so staff
 * can establish or recover one. Proxy owns the visible-path rewrite; this layout owns presentation
 * only and grants no authority.
 */
export default function OpsAuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-1 flex-col items-center justify-center bg-muted px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <Link href="/login" className={cn(BRAND_CLASS, "block text-center")}>
            FitOut Ops
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
