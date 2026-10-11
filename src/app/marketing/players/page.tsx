import { marketingSearchImage } from "@/lib/marketing-assets";
import type { Metadata } from "next";
import { AudienceSteps, type AudienceStep } from "@/components/marketing/audience-steps";
import { buttonVariants } from "@/components/ui/button";
import { absoluteAppUrl, absoluteMarketingUrl } from "@/lib/app-origins";
import { cn } from "@/lib/utils";
import { MarketingHero } from "@/components/marketing/hero";

export const metadata: Metadata = {
  title: "Players",
  description: "Explore courts, gyms and studios. Browse spaces first, choose an available session and sign in when needed to book on FitOut.",
  alternates: { canonical: absoluteMarketingUrl("/players") },
  openGraph: { type: "website", title: "Players | FitOut", url: absoluteMarketingUrl("/players"), images: [marketingSearchImage] },
};

const steps: readonly AudienceStep[] = [
  {
    title: "Find a space",
    description: "Choose your activity, location and group size to explore spaces that fit the plan. Browse before signing in, then open a listing to learn about its space, rules and booking options.",
    image: { src: "/marketing/screenshots/search.png", alt: "FitOut demo progressive search showing activity, location and party answers with a matching space.", width: 1120, height: 578 },
  },
  {
    title: "Choose an available session",
    description: "Check the listing’s schedule and choose an available date and session. Review its capacity and booking details for your group before continuing.",
    image: { src: "/marketing/screenshots/session.png", alt: "FitOut demo availability calendar and hour picker with an available future afternoon session selected.", width: 584, height: 521 },
  },
  {
    title: "Book your session",
    description: "Sign in or create an account when needed to book. Review the session and price, then follow the checkout steps available in the app. A booking is confirmed only when the app shows confirmation.",
    image: { src: "/marketing/screenshots/booking.png", alt: "FitOut demo unpaid booking review showing session details, price and the Confirm and pay control.", width: 896, height: 508 },
  },
];

export default function MarketingPlayers() {
  return (
    <main id="main-content" className="flex-1">
      <MarketingHero id="players-heading" title="Make time for your next game." description="The group chat has a plan. Give it a place. Explore courts, gyms and studios for your next game, workout or practice." image="basketball" imageAlt="A bright indoor basketball court with a wooden floor, ready for a game." secondaryImage="gym">
        <a href={absoluteAppUrl("/")} className={cn(buttonVariants({ variant: "brand", size: "touch" }), "px-8 motion-reduce:transition-none")}>Find a space</a>
        <p className="pt-2 text-small text-muted-foreground">For your team. Your friends. Or just yourself.</p>
      </MarketingHero>
      <section aria-labelledby="player-steps-heading" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:pb-24">
        <h2 id="player-steps-heading" className="marketing-section-title font-heading text-heading">From “we should” to “see you there.”</h2>
        <p className="mt-5 max-w-prose text-body text-muted-foreground">Find your space, choose an available session and review your booking in the app.</p>
        <AudienceSteps label="Player booking steps" steps={steps} />
      </section>
    </main>
  );
}
