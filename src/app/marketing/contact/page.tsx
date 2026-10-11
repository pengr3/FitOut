import { marketingSearchImage } from "@/lib/marketing-assets";
import type { Metadata } from "next";
import { absoluteMarketingUrl } from "@/lib/app-origins";
import { ContactForm } from "@/components/marketing/contact-form";
import { SUPPORT_EMAIL } from "@/lib/site";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact",
  description: "Have a question about finding or hosting a fitness space? Send FitOut a message.",
  alternates: { canonical: absoluteMarketingUrl("/contact") },
  openGraph: { type: "website", title: "Contact | FitOut", url: absoluteMarketingUrl("/contact"), images: [marketingSearchImage] },
};

export default function MarketingContact() {
  const deployed = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL_ENV);
  const formEnabled = !deployed || (process.env.CONTACT_PRODUCTION_ENABLED === "true" && Boolean(process.env.RESEND_API_KEY));
  return (
    <main id="main-content" className="flex-1">
      <section aria-labelledby="contact-heading" className="mx-auto grid max-w-6xl items-start gap-12 px-4 py-16 sm:px-6 sm:py-24 md:grid-cols-2 md:gap-16">
        <div className="space-y-6">
          <h1 id="contact-heading" className="marketing-display font-heading text-display">Let’s talk.</h1>
          <p className="max-w-prose text-body text-muted-foreground">Have a question about finding a space or sharing yours? We’d love to hear from you.</p>
          {SUPPORT_EMAIL && <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-11 max-w-full items-center break-all rounded-lg text-body underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4">{SUPPORT_EMAIL}</a>}
        </div>
        <div className="space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
          {formEnabled ? <ContactForm /> : <>
            <h2 className="font-heading text-heading">Send us an email.</h2>
            <p className="text-body text-muted-foreground">Our contact form is temporarily unavailable. You can reach FitOut directly by email.</p>
            {SUPPORT_EMAIL && <a href={`mailto:${SUPPORT_EMAIL}`} className={cn(buttonVariants({ variant: "brand", size: "touch" }), "px-6")}>Email FitOut</a>}
          </>}
        </div>
      </section>
    </main>
  );
}
