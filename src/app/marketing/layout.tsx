import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { absoluteAppUrl, absoluteMarketingUrl, MARKETING_ORIGIN } from "@/lib/app-origins";
import { SITE_TAGLINE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(MARKETING_ORIGIN),
  title: { default: "FitOut — Good plans need a place.", template: "%s | FitOut" },
  description: SITE_TAGLINE,
  robots: process.env.VERCEL_ENV === "preview" ? { index: false, follow: false } : { index: true, follow: true },
  openGraph: {
    type: "website", siteName: "FitOut", url: absoluteMarketingUrl("/"),
    images: [{ url: absoluteMarketingUrl("/marketing/screenshots/search.png"), width: 1120, height: 578, alt: "FitOut demo search for a space by activity, location and group size." }],
  },
  twitter: { card: "summary_large_image", images: [absoluteMarketingUrl("/marketing/screenshots/search.png")] },
};

export default function MarketingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div data-theme="court" className="flex min-h-dvh flex-col bg-background text-foreground">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-(--z-sticky) focus:m-4 focus:rounded-lg focus:bg-background focus:p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">Skip to content</a>
      <MarketingHeader appUrl={absoluteAppUrl("/")} />
      {children}
      <MarketingFooter />
    </div>
  );
}
