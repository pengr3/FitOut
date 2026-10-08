import type { Metadata } from "next";
import Link from "next/link";
import { absoluteMarketingUrl } from "@/lib/app-origins";

export const metadata: Metadata = {
  title: "About",
  description: "FitOut bridges the gap between plans to get active and spaces ready to welcome them.",
  alternates: { canonical: absoluteMarketingUrl("/about") },
  openGraph: { type: "website", title: "About | FitOut", url: absoluteMarketingUrl("/about"), images: [{ url: absoluteMarketingUrl("/marketing/screenshots/search.png"), width: 1120, height: 578, alt: "FitOut demo search by activity, location and group size." }] },
};
const linkClass = "inline-flex min-h-11 items-center rounded-lg font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function MarketingAbout() {
  return (
    <main id="main-content" className="flex-1">
      <section aria-labelledby="about-heading" className="mx-auto max-w-3xl space-y-6 px-4 pb-12 pt-16 text-center sm:px-6 sm:pt-24">
        <h1 id="about-heading" className="font-heading text-display text-balance">Your plans. Their spaces. A place to connect.</h1>
        <p className="text-body text-muted-foreground">A game with friends, a solo workout or time for practice starts with a plan. Finding the right place helps that plan happen.</p>
        <p className="text-body text-muted-foreground">FitOut bridges the gap between people looking for a place to get active and hosts with courts, gyms and studios to share.</p>
      </section>
      <section aria-label="Connecting players and hosts" className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 sm:px-6 md:grid-cols-2">
        <article className="space-y-4 rounded-xl border border-border bg-muted p-6 sm:p-8">
          <h2 className="font-heading text-heading">A space that fits the plan.</h2>
          <p className="text-body text-muted-foreground">Players need a suitable space, a session that works and details they can review. Explore spaces by activity, location and group size, check availability at the listing, then follow the app’s steps to book.</p>
          <Link href="/players" className={linkClass}>Explore as a player</Link>
        </article>
        <article className="space-y-4 rounded-xl border border-border bg-muted p-6 sm:p-8">
          <h2 className="font-heading text-heading">A way for people to find your space.</h2>
          <p className="text-body text-muted-foreground">Hosts need a way to make their spaces discoverable and bookable. Prepare a listing, set availability and manage bookings in the app. Account, payout and listing checks must be complete before a space can take bookings.</p>
          <Link href="/hosts" className={linkClass}>Get to know hosting</Link>
        </article>
      </section>
      <section className="mx-auto max-w-3xl px-4 pb-16 text-center sm:px-6">
        <h2 className="font-heading text-heading">Have something to ask?</h2>
        <Link href="/contact" className={linkClass}>Contact us</Link>
      </section>
    </main>
  );
}
