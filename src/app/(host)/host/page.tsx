// Host dashboard landing (D-04) — a DISTINCT host surface, not blended into the booker pages.
//
// Reaching this page already means canHost is true (the (host) layout gated it). It is intentionally
// minimal for Phase 1: a "Your hosting" header + a "Create a listing" call to action that points
// toward Phase-2 listing creation. No Stripe onboarding here (D-05). The session read is repeated so
// the greeting can use the first name and so this page also fails closed if reached directly.

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function HostDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  const u = session.user as typeof session.user & {
    firstName?: string | null;
    canHost?: boolean;
  };
  // Defense in depth: the layout already gates, but never render hosting content without canHost.
  if (!u.canHost) {
    redirect("/");
  }

  return (
    <div
      className="mx-auto w-full max-w-3xl px-4 py-12"
      data-host-dashboard
    >
      <h1 className="text-2xl font-semibold tracking-tight">
        Your hosting{u.firstName ? `, ${u.firstName}` : ""}
      </h1>
      <p className="mt-2 max-w-prose text-muted-foreground">
        This is your hosting space, separate from booking. List a fitness or
        recreational space and set its availability so people can find and book
        it.
      </p>

      <div className="mt-8 rounded-lg border border-dashed p-8 text-center">
        <h2 className="text-lg font-medium">No listings yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first listing to start hosting.
        </p>
        {/* Listing creation (and Stripe payout onboarding) lands in Phase 2 — disabled for now. */}
        <Button className="mt-4" disabled>
          Create a listing (coming in Phase 2)
        </Button>
      </div>
    </div>
  );
}
