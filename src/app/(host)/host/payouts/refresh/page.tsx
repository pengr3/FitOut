// Payout onboarding REFRESH landing (D-12). PayMongo redirects the host here when a hosted onboarding
// link expires or is revisited — hosted links are single-use, so we re-mint a FRESH one server-side and
// send the host straight back into onboarding. RSC with a canHost re-check (defense in depth).
//
// VOICE: never "Stripe" / "PayMongo" / "KYC" / "webhook" — say "payouts" / "get paid".

import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
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

  // This legacy provider return URL is intentionally inert. Never mint a linked-account onboarding
  // URL from a direct request; the parent-merchant payout flow lives on the host-owned settings page.
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Set your payout destination</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">
        Choose the bank account or e-wallet where FitOut should send your earnings after a completed session.
      </p>
      <div className="mt-8">
        <Button asChild variant="outline">
          <Link href="/host/payouts">Set payout destination</Link>
        </Button>
      </div>
    </div>
  );
}
