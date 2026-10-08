import type { Metadata } from "next";
import { AudienceSteps, type AudienceStep } from "@/components/marketing/audience-steps";
import { buttonVariants } from "@/components/ui/button";
import { absoluteAppUrl, absoluteMarketingUrl } from "@/lib/app-origins";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Players",
  description: "Explore courts, gyms and studios. Browse spaces first, choose an available session and sign in when needed to book on FitOut.",
  alternates: { canonical: absoluteMarketingUrl("/players") },
};

const steps: readonly AudienceStep[] = [
  {
    title: "Find a space",
    description: "Choose your activity, location and group size to explore spaces that fit the plan. Browse before signing in, then open a listing to learn about its space, rules and booking options.",
    image: { src: "/marketing/screenshots/search.png", alt: "FitOut demo progressive search showing activity, location and party answers with a matching space.", width: 1120, height: 578 },
    caption: "Demo search by activity, location and group size; session availability is checked in the listing.",
  },
  {
    title: "Choose an available session",
    description: "Check the listing’s schedule and choose an available date and session. Review its capacity and booking details for your group before continuing.",
    image: { src: "/marketing/screenshots/session.png", alt: "FitOut demo availability calendar and hour picker with an available future afternoon session selected.", width: 584, height: 521 },
    caption: "Demo session selected from the listing’s real availability controls.",
  },
  {
    title: "Book your session",
    description: "Sign in or create an account when needed to book. Review the session and price, then follow the checkout steps available in the app. A booking is confirmed only when the app shows confirmation.",
    image: { src: "/marketing/screenshots/booking.png", alt: "FitOut demo unpaid booking review showing session details, price and the Confirm and pay control.", width: 896, height: 508 },
    caption: "Demo booking review before payment; this is not a confirmed booking.",
  },
];

export default function MarketingPlayers() {
  return (
    <main id="main-content" className="flex-1">
      <section aria-labelledby="players-heading" className="mx-auto max-w-3xl space-y-6 px-4 pb-12 pt-16 text-center sm:px-6 sm:pt-24">
        <h1 id="players-heading" className="font-heading text-display text-balance">Give your next session a place.</h1>
        <p className="text-body text-muted-foreground">A game with friends, a workout on your own or time to practise. Explore courts, gyms and studios, then choose a session that works for your plans.</p>
        <a href={absoluteAppUrl("/")} className={cn(buttonVariants({ variant: "brand", size: "touch" }), "px-8 motion-reduce:transition-none")}>Find a space</a>
      </section>
      <section aria-labelledby="player-steps-heading" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 id="player-steps-heading" className="font-heading text-heading">From finding a space to booking a session.</h2>
        <p className="mt-3 max-w-prose text-body text-muted-foreground">Three steps, shown with genuine demo app screens. Available sessions and checkout options depend on the space and the app’s current status.</p>
        <AudienceSteps label="Player booking steps" steps={steps} />
      </section>
    </main>
  );
}
