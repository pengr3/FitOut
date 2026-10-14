import { marketingSearchImage } from "@/lib/marketing-assets";
import type { Metadata } from "next";
import { AudienceSteps, type AudienceStep } from "@/components/marketing/audience-steps";
import { buttonVariants } from "@/components/ui/button";
import { absoluteAppUrl, absoluteMarketingUrl } from "@/lib/app-origins";
import { cn } from "@/lib/utils";
import { MarketingHero } from "@/components/marketing/hero";

export const metadata: Metadata = {
  title: "Hosts",
  description: "Share your court, gym or studio. Follow the account, verification, listing and readiness steps before taking bookings on FitOut.",
  alternates: { canonical: absoluteMarketingUrl("/hosts") },
  openGraph: { type: "website", title: "Hosts | FitOut", url: absoluteMarketingUrl("/hosts"), images: [marketingSearchImage] },
};

const steps: readonly AudienceStep[] = [
  {
    title: "Create your account",
    description: "Sign in or create an account, verify your email and continue host setup. If you already use FitOut to book spaces, you can add hosting to your account.",
    image: { src: "/marketing/screenshots/account.png", alt: "FitOut host signup screen with empty name, email and password fields in a demo account setup.", width: 384, height: 682 },
  },
  {
    title: "Complete verification and payout setup",
    description: "Follow the account checks shown in your host roadmap. Confirm your payout recipient details in the app. Completing setup does not guarantee approval or payment release.",
    image: { src: "/marketing/screenshots/verification.png", alt: "FitOut demo host roadmap with account verification and payout setup still outstanding.", width: 736, height: 530 },
  },
  {
    title: "Prepare your listing",
    description: "After host approval, add your space type, details and weekly hours. Your listing also needs review before it can take bookings.",
    image: { src: "/marketing/screenshots/listing.png", alt: "FitOut demo draft listing wizard showing the space-type step and listing preparation checklist.", width: 1280, height: 610 },
  },
  {
    title: "Become bookable",
    description: "Your space can take bookings once email verification, payout setup, host approval, listing review, publication and operating hours meet the app’s readiness checks. Keep your listing and availability up to date.",
    image: { src: "/marketing/screenshots/bookable.png", alt: "FitOut demo host listing marked Live after its account and listing readiness checks are complete.", width: 1280, height: 541 },
  },
];

export default function MarketingHosts() {
  return (
    <main id="main-content" className="flex-1">
      <MarketingHero id="hosts-heading" title="Your space. More possibilities." description="Open your doors to the next game, workout or practice. Share your court, gym or studio with people looking for a place to move." image="studio" imageAlt="A bright, open movement studio with mirrored walls and natural light.">
        <a href={absoluteAppUrl("/start-hosting")} className={cn(buttonVariants({ variant: "brand", size: "touch" }), "px-8 motion-reduce:transition-none")}>Start hosting</a>
        <p className="pt-2 text-small text-muted-foreground">Your listing, your schedule. All in one place.</p>
      </MarketingHero>
      <section aria-labelledby="host-steps-heading" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:pb-24">
        <h2 id="host-steps-heading" className="marketing-section-title font-heading text-heading">Make room for your first booking.</h2>
        <p className="mt-5 max-w-prose text-body text-muted-foreground">Create your account, prepare your space and follow the setup checks in the app.</p>
        <AudienceSteps label="Host setup steps" steps={steps} />
      </section>
    </main>
  );
}
