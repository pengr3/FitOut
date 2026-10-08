import type { Metadata } from "next";
import { AudienceSteps, type AudienceStep } from "@/components/marketing/audience-steps";
import { buttonVariants } from "@/components/ui/button";
import { absoluteAppUrl, absoluteMarketingUrl } from "@/lib/app-origins";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Hosts",
  description: "Share your court, gym or studio. Follow the account, verification, listing and readiness steps before taking bookings on FitOut.",
  alternates: { canonical: absoluteMarketingUrl("/hosts") },
  openGraph: { type: "website", title: "Hosts | FitOut", url: absoluteMarketingUrl("/hosts"), images: [{ url: absoluteMarketingUrl("/marketing/screenshots/search.png"), width: 1120, height: 578, alt: "FitOut demo search by activity, location and group size." }] },
};

const steps: readonly AudienceStep[] = [
  {
    title: "Create your account",
    description: "Sign in or create an account, verify your email and continue host setup. If you already use FitOut to book spaces, you can add hosting to your account.",
    image: { src: "/marketing/screenshots/account.png", alt: "FitOut host signup screen with empty name, email and password fields in a demo account setup.", width: 384, height: 682 },
    caption: "Demo host signup with no personal details entered.",
  },
  {
    title: "Complete verification and payout setup",
    description: "Follow the account checks shown in your host roadmap. Confirm your payout recipient details in the app. Completing setup does not guarantee approval or payment release.",
    image: { src: "/marketing/screenshots/verification.png", alt: "FitOut demo host roadmap with account verification and payout setup still outstanding.", width: 736, height: 530 },
    caption: "Demo account with checks still to complete; approval is not assumed.",
  },
  {
    title: "Prepare your listing",
    description: "After host approval, add your space type, details and weekly hours. Your listing also needs review before it can take bookings.",
    image: { src: "/marketing/screenshots/listing.png", alt: "FitOut demo draft listing wizard showing the space-type step and listing preparation checklist.", width: 1280, height: 610 },
    caption: "Demo draft listing setup in the existing edit wizard.",
  },
  {
    title: "Become bookable",
    description: "Your space can take bookings once email verification, payout setup, host approval, listing review, publication and operating hours meet the app’s readiness checks. Keep your listing and availability up to date.",
    image: { src: "/marketing/screenshots/bookable.png", alt: "FitOut demo host listing marked Live after its account and listing readiness checks are complete.", width: 1280, height: 541 },
    caption: "Demo listing with readiness checks completed locally; this does not show a released payout.",
  },
];

export default function MarketingHosts() {
  return (
    <main id="main-content" className="flex-1">
      <section aria-labelledby="hosts-heading" className="mx-auto max-w-3xl space-y-6 px-4 pb-12 pt-16 text-center sm:px-6 sm:pt-24">
        <h1 id="hosts-heading" className="font-heading text-display text-balance">Have the space? Make room for more.</h1>
        <p className="text-body text-muted-foreground">Share your court, gym or studio with people looking for a place to move. FitOut helps you prepare your listing, set availability and manage bookings.</p>
        <a href={absoluteAppUrl("/start-hosting")} className={cn(buttonVariants({ variant: "brand", size: "touch" }), "px-8 motion-reduce:transition-none")}>Start hosting</a>
      </section>
      <section aria-labelledby="host-steps-heading" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 id="host-steps-heading" className="font-heading text-heading">Four steps toward taking bookings.</h2>
        <p className="mt-3 max-w-prose text-body text-muted-foreground">These genuine demo app screens show the setup journey. Each host and listing must complete its own checks.</p>
        <AudienceSteps label="Host setup steps" steps={steps} />
      </section>
    </main>
  );
}
