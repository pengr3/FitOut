import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { absoluteMarketingUrl } from "@/lib/app-origins";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: "FitOut — Good plans need a place." },
  description: "Find a court, gym or studio for your next session. Make your space discoverable and bookable through FitOut.",
  alternates: { canonical: absoluteMarketingUrl("/") },
  openGraph: { type: "website", title: "FitOut — Good plans need a place.", url: absoluteMarketingUrl("/"), images: [{ url: absoluteMarketingUrl("/marketing/screenshots/search.png"), width: 1120, height: 578, alt: "FitOut demo search by activity, location and group size." }] },
};

const audienceLink = cn(buttonVariants({ variant: "brand", size: "touch" }), "w-full px-8 motion-reduce:transition-none");

export default function MarketingHome() {
  return (
    <main id="main-content" className="flex-1">
      <section aria-labelledby="home-heading" className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 pb-12 pt-16 text-center sm:px-6 sm:pt-24">
        <h1 id="home-heading" className="font-heading text-display text-balance">Good plans need a place.</h1>
        <p className="max-w-2xl text-body text-muted-foreground">Find a court, gym or studio for your next session. Have a space? Help people find it, book it and make it part of their plans.</p>
        <div className="grid w-full max-w-lg gap-3 sm:grid-cols-2">
          <Link href="/players" className={audienceLink}>I want to play</Link>
          <Link href="/hosts" className={audienceLink}>I have a space</Link>
        </div>
      </section>

      <section aria-label="FitOut for players and hosts" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="grid items-stretch gap-6 md:grid-cols-2">
          <figure className="min-w-0 overflow-hidden rounded-xl border border-border bg-muted">
            <div className="flex aspect-video items-center bg-background p-3 sm:p-5">
              <Image unoptimized src="/marketing/screenshots/search.png" alt="FitOut demo search with activity, location and party choices alongside a matching space." width={1120} height={578} sizes="(max-width: 767px) calc(100vw - 32px), (max-width: 1152px) 50vw, 552px" loading="eager" className="h-full w-full object-contain" />
            </div>
            <figcaption className="space-y-3 border-t border-border p-6 sm:p-8">
              <h2 className="font-heading text-heading">Make room for your next session.</h2>
              <p className="text-body text-muted-foreground">Choose your activity, location and group size. Explore the details, then check the sessions available at a space.</p>
            </figcaption>
          </figure>
          <figure className="min-w-0 overflow-hidden rounded-xl border border-border bg-muted">
            <div className="flex aspect-video items-center bg-background p-3 sm:p-5">
              <Image unoptimized src="/marketing/screenshots/verification.png" alt="FitOut demo host roadmap showing account checks, payout setup, listing preparation and booking readiness." width={736} height={530} sizes="(max-width: 767px) calc(100vw - 32px), (max-width: 1152px) 50vw, 552px" loading="lazy" className="h-full w-full object-contain" />
            </div>
            <figcaption className="space-y-3 border-t border-border p-6 sm:p-8">
              <h2 className="font-heading text-heading">Give your space a place in their plans.</h2>
              <p className="text-body text-muted-foreground">Prepare your host account, share your space and set its availability. The app shows the checks needed before it can take bookings.</p>
            </figcaption>
          </figure>
        </div>
        <p className="mt-6 text-center text-label text-muted-foreground">Demo app screens. Availability and host readiness depend on each space and its completed checks.</p>
      </section>
    </main>
  );
}
