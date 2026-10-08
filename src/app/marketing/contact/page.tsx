import type { Metadata } from "next";
import { absoluteMarketingUrl } from "@/lib/app-origins";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Have a question about finding or hosting a fitness space? Send FitOut a message.",
  alternates: { canonical: absoluteMarketingUrl("/contact") },
  openGraph: { type: "website", title: "Contact | FitOut", url: absoluteMarketingUrl("/contact"), images: [{ url: absoluteMarketingUrl("/marketing/screenshots/search.png"), width: 1120, height: 578, alt: "FitOut demo search by activity, location and group size." }] },
};

export default function MarketingContact() {
  return (
    <main id="main-content" className="flex-1">
      <section aria-labelledby="contact-heading" className="mx-auto max-w-2xl space-y-6 px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
        <div className="space-y-4 text-center">
          <h1 id="contact-heading" className="font-heading text-display">Let’s talk.</h1>
          <p className="text-body text-muted-foreground">Have a question about finding a space or sharing yours? Send us a message.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <ContactForm />
        </div>
        <p className="text-small text-muted-foreground">This form is for contact inquiries. Sending a message does not authorize a payment. For an emergency, contact local emergency services.</p>
      </section>
    </main>
  );
}
