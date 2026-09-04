// Payout onboarding REFRESH landing (D-12). PayMongo redirects the host here when a hosted onboarding
// link expires or is revisited — hosted links are single-use, so we re-mint a FRESH one server-side and
// send the host straight back into onboarding. RSC with a canHost re-check (defense in depth).
//
// VOICE: never "Stripe" / "PayMongo" / "KYC" / "webhook" — say "payouts" / "get paid".

import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { refreshOnboardingLink } from "@/app/actions/paymongo-connect";
import { Button } from "@/components/ui/button";

export default async function PayoutRefreshPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  const u = session.user as typeof session.user & { canHost?: boolean };
  if (!u.canHost) {
    redirect("/");
  }

  // Re-mint a fresh single-use onboarding link and bounce the host back into the flow.
  const res = await refreshOnboardingLink();
  if (res.ok) {
    redirect(res.url);
  }

  // Fallback (rate-limited or a transient error): let the host retry from the dashboard nudge.
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Let&apos;s pick up where you left off</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">
        We couldn&apos;t reopen payout setup just now. Head back to your dashboard and choose
        &ldquo;Finish payout setup&rdquo; to continue.
      </p>
      <div className="mt-8">
        <Button asChild variant="outline">
          <Link href="/host">Back to your dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
