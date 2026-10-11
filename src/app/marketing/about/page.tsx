import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MarketingHero } from "@/components/marketing/hero";
import { absoluteMarketingUrl } from "@/lib/app-origins";

export const metadata: Metadata = {
  title: "About",
  description: "FitOut bridges the gap between plans to get active and spaces ready to welcome them.",
  alternates: { canonical: absoluteMarketingUrl("/about") },
  openGraph: { type: "website", title: "About | FitOut", url: absoluteMarketingUrl("/about"), images: [{ url: absoluteMarketingUrl("/marketing/photos/tennis.jpg"), width: 1800, height: 2400, alt: "Tennis courts in the afternoon light." }] },
};
const linkClass = "inline-flex min-h-11 items-center rounded-lg font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function MarketingAbout() {
  return (
    <main id="main-content" className="flex-1">
      <MarketingHero id="about-heading" title="A place to come together." description="A game with friends, a solo workout or time for practice. Good things happen when people have a place to move." image="basketball" imageAlt="An open indoor basketball court with room for the next game." secondaryImage="studio">
        <p className="max-w-prose text-body text-muted-foreground">FitOut bridges the gap between people looking for a place to get active and hosts with courts, gyms and studios to share.</p>
      </MarketingHero>
      <section aria-label="Connecting players and hosts" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:pb-24">
        <div className="mb-12 max-w-xl"><h2 className="marketing-section-title font-heading text-heading text-balance">Two sides.<br />One good plan.</h2></div>
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          <article className="space-y-5">
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl"><Image src="/marketing/photos/tennis.jpg" alt="Two tennis courts with players enjoying an afternoon session." fill unoptimized sizes="(max-width: 767px) calc(100vw - 32px), 50vw" className="object-cover" /></div>
            <h3 className="font-heading text-heading">A space that fits the plan.</h3>
            <p className="max-w-prose text-body text-muted-foreground">Explore spaces by activity, location and group size, check availability and choose a session that works for you.</p>
            <Link href="/players" className={linkClass}>Explore as a player</Link>
          </article>
          <article className="space-y-5">
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl"><Image src="/marketing/photos/studio.jpg" alt="A bright mirrored studio with room for movement and practice." fill unoptimized sizes="(max-width: 767px) calc(100vw - 32px), 50vw" className="object-cover" /></div>
            <h3 className="font-heading text-heading">A way for people to find your space.</h3>
            <p className="max-w-prose text-body text-muted-foreground">Make your space discoverable and bookable. Prepare a listing, set availability and manage bookings. The app guides you through the account and listing checks.</p>
            <Link href="/hosts" className={linkClass}>Get to know hosting</Link>
          </article>
        </div>
      </section>
      <section className="border-t border-border px-4 py-12 text-center sm:px-6"><h2 className="font-heading text-heading">Have something to ask?</h2><Link href="/contact" className={linkClass}>Contact us</Link></section>
    </main>
  );
}
