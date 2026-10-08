import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFaq, type FaqQuestion } from "@/components/marketing/faq";
import { absoluteAppUrl, absoluteMarketingUrl } from "@/lib/app-origins";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Practical answers for players and hosts, from finding an available session to preparing a space for bookings.",
  alternates: { canonical: absoluteMarketingUrl("/faq") },
  openGraph: { type: "website", title: "FAQ | FitOut", url: absoluteMarketingUrl("/faq"), images: [{ url: absoluteMarketingUrl("/marketing/screenshots/search.png"), width: 1120, height: 578, alt: "FitOut demo search by activity, location and group size." }] },
};
const linkClass = "inline-flex min-h-11 items-center rounded-lg font-medium text-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const players: readonly FaqQuestion[] = [
  { question: "What spaces can I find on FitOut?", answer: <p>Explore fitness and recreational spaces such as courts, gyms and studios. Use activity, location and group size to find a space that fits your plans, then review the listing’s details and rules.</p> },
  { question: "Do I need an account to browse?", answer: <p>You can browse without signing in. Sign in or create an account when needed to book. <a href={absoluteAppUrl("/")} className={linkClass}>Find a space</a></p> },
  { question: "How do I choose a session?", answer: <p>Open a listing and choose an available date and session from its schedule. Review the capacity, price and booking mode. Some spaces offer instant booking; others need the host to approve a request before you continue to payment. The app shows the steps for that space.</p> },
  { question: "What is the difference between exclusive and open-capacity bookings?", answer: <p>An exclusive booking reserves the space for your time window. Open-capacity spaces share a day’s admissions across independent bookers up to the host’s cap, with pricing per person. Check the listing’s mode before choosing a session.</p> },
  { question: "Can I invite friends to a booking?", answer: <p>After a confirmed exclusive booking, the organizer can create a group and invite friends by link or email. Guests can RSVP without an account. Attendance stays within the booking’s saved capacity; a group invitation does not reserve a separate session.</p> },
  { question: "Where do I find cancellation and payment help?", answer: <p>Open the booking in <a href={absoluteAppUrl("/bookings")} className={linkClass}>My bookings</a> for its status, cancellation controls and support link. The cancellation screen shows any applicable refund before you confirm. Follow the app’s current checkout options; a return from payment alone is not confirmation. For help, <Link href="/contact" className={linkClass}>Contact us</Link>.</p> },
];
const hosts: readonly FaqQuestion[] = [
  { question: "How do I start hosting?", answer: <p><a href={absoluteAppUrl("/start-hosting")} className={linkClass}>Start hosting</a> in the app. Sign in or create an account when needed, then continue host setup. You can add hosting to an existing player account.</p> },
  { question: "What account and payout setup do I need?", answer: <p>Follow the verification roadmap in the app and confirm your payout recipient details. Completing setup does not guarantee approval, booking readiness or payment release. Each host must complete the checks shown for their own account.</p> },
  { question: "When can I create and submit a listing?", answer: <p>After host approval, prepare your listing with the space’s details, photos and operating hours. Submit it for listing review. If changes are needed, use the review feedback in the app to update and resubmit it.</p> },
  { question: "What makes a space bookable?", answer: <p>Email verification, payout setup, host approval, listing review, publication and operating hours must meet the app’s readiness checks. A draft, submitted or published listing does not by itself guarantee that it can take bookings. The host dashboard shows what remains.</p> },
  { question: "How do I manage availability and bookings?", answer: <p>Set weekly operating hours and block dates or times that are unavailable. Manage bookings in the host area. If your listing uses request-to-book, review requests there and approve or decline them within the window shown by the app.</p> },
  { question: "Does payout setup mean a payout is ready?", answer: <p>No. Payout readiness depends on settlement evidence, available funds, the post-session hold and the other account and booking checks. Transfer dispatch and bank or e-wallet arrival are separate events; no universal arrival deadline is promised. Production payment and payout release remain on hold. Review the current status in <a href={absoluteAppUrl("/host/earnings")} className={linkClass}>Host earnings</a>, or <Link href="/contact" className={linkClass}>Contact us</Link> for help.</p> },
];

export default function MarketingFaqPage() {
  return (
    <main id="main-content" className="flex-1">
      <section aria-labelledby="faq-heading" className="mx-auto max-w-3xl space-y-6 px-4 pb-12 pt-16 text-center sm:px-6 sm:pt-24">
        <h1 id="faq-heading" className="font-heading text-display text-balance">A few answers before you get moving.</h1>
        <p className="text-body text-muted-foreground">Find your next step, whether you’re planning a session or making space for one.</p>
      </section>
      <div className="mx-auto max-w-3xl space-y-12 px-4 pb-16 sm:px-6">
        <MarketingFaq audience="Players" questions={players} />
        <MarketingFaq audience="Hosts" questions={hosts} />
        <p className="text-body text-muted-foreground">For the documents currently available in the app, see <a href={absoluteAppUrl("/terms")} className={linkClass}>Terms</a> and <a href={absoluteAppUrl("/privacy")} className={linkClass}>Privacy</a>. Still have a question? <Link href="/contact" className={linkClass}>Contact us</Link>.</p>
      </div>
    </main>
  );
}
