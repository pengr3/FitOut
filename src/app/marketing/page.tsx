import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MarketingHero } from "@/components/marketing/hero";
import { AppPreview } from "@/components/marketing/app-preview";
import { buttonVariants } from "@/components/ui/button";
import { absoluteMarketingUrl } from "@/lib/app-origins";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: "FitOut — Good plans need a place." },
  description: "Find a court, gym or studio for your next session. Make your space discoverable and bookable through FitOut.",
  alternates: { canonical: absoluteMarketingUrl("/") },
  openGraph: { type: "website", title: "FitOut — Good plans need a place.", url: absoluteMarketingUrl("/"), images: [{ url: absoluteMarketingUrl("/marketing/photos/tennis.jpg"), width: 1800, height: 2400, alt: "Tennis courts in the afternoon light." }] },
};
const audienceLink = cn(buttonVariants({ variant: "brand", size: "touch" }), "px-6 motion-reduce:transition-none");

export default function MarketingHome() {
  return (
    <main id="main-content" className="flex-1">
      <MarketingHero id="home-heading" title="Good plans need a place." description="Find a court, gym or studio for your next session. Bring your people. Make time to move." image="tennis" imageAlt="An overhead view of blue tennis courts in the afternoon light." secondaryImage="studio">
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/players" className={audienceLink}>I want to play</Link>
          <Link href="/hosts" className={cn(buttonVariants({ variant: "outline", size: "touch" }), "px-6 motion-reduce:transition-none")}>I have a space</Link>
        </div>
        <p className="pt-3 text-small text-muted-foreground">A quick game. A good workout. A little room to practise.</p>
      </MarketingHero>

      <section aria-labelledby="spaces-heading" className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pb-24">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 id="spaces-heading" className="marketing-section-title font-heading text-heading">Whatever moves you.</h2>
          <Link href="/players" className={cn(buttonVariants({ variant: "ghost", size: "touch" }), "underline underline-offset-4")}>Explore the possibilities</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { name: "Courts", photo: "badminton", detail: "Bring your game.", alt: "Blue indoor badminton courts with nets and space to play." },
            { name: "Gyms", photo: "gym", detail: "Find your rhythm.", alt: "A well-equipped fitness floor with weights and exercise machines." },
            { name: "Studios", photo: "studio", detail: "Make room to move.", alt: "An open, light-filled dance studio with wall mirrors." },
          ].map((space) => (
            <Link key={space.name} href="/players" className="group min-w-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
                <Image src={`/marketing/photos/${space.photo}.jpg`} alt={space.alt} fill unoptimized sizes="(max-width: 639px) calc(100vw - 32px), 33vw" className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none" />
              </div>
              <div className="flex items-baseline justify-between gap-2 pt-4"><h3 className="font-heading text-heading">{space.name}</h3><p className="text-small text-muted-foreground">{space.detail}</p></div>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="search-heading" className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-5 md:grid-cols-2 md:gap-16">
            <h2 id="search-heading" className="marketing-section-title max-w-sm font-heading text-heading text-balance">Less planning.<br />More playing.</h2>
            <p className="max-w-prose self-end text-body text-muted-foreground">Choose your activity, location and group size. Get a feel for the space, check its schedule and find a session that fits your day.</p>
          </div>
          <AppPreview name="search" alt="The real FitOut app displaying five photographed spaces and its activity, location and group search controls." />
        </div>
      </section>
      <section aria-labelledby="home-hosts-heading" className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 md:grid-cols-2 md:gap-16">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-muted"><Image src="/marketing/photos/studio.jpg" alt="An open movement studio ready for its next session." fill unoptimized sizes="(max-width: 767px) calc(100vw - 32px), 50vw" className="object-cover" /></div>
        <div className="space-y-6"><h2 id="home-hosts-heading" className="marketing-section-title font-heading text-heading text-balance">Your space.<br />Their next great session.</h2><p className="text-body text-muted-foreground">Have a court, gym or studio? Give people a place to get together. Share your space, set your availability and manage your bookings with FitOut.</p><Link href="/hosts" className={audienceLink}>Get to know hosting</Link></div>
      </section>
    </main>
  );
}
