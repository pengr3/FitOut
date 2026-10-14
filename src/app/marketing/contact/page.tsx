import { marketingSearchImage } from "@/lib/marketing-assets";
import type { Metadata } from "next";
import { absoluteMarketingUrl } from "@/lib/app-origins";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Have a question about finding or hosting a fitness space? Send FitOut a message.",
  alternates: { canonical: absoluteMarketingUrl("/contact") },
  openGraph: { type: "website", title: "Contact | FitOut", url: absoluteMarketingUrl("/contact"), images: [marketingSearchImage] },
};

export default function MarketingContact() {
  return (
    <main id="main-content" className="flex-1">
      <section aria-labelledby="contact-heading" className="mx-auto grid max-w-6xl items-start gap-12 px-4 py-16 sm:px-6 sm:py-24 md:grid-cols-2 md:gap-16">
        <div className="space-y-6">
          <h1 id="contact-heading" className="marketing-display font-heading text-display">Let’s talk.</h1>
          <p className="max-w-prose text-body text-muted-foreground">Have a question about finding a space or sharing yours? We’d love to hear from you.</p>
        </div>
        <div className="space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <ContactForm />
        </div>
      </section>
    </main>
  );
}
