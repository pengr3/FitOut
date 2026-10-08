import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { absoluteAppUrl, MARKETING_ORIGIN } from "@/lib/app-origins";
import { SITE_TAGLINE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(MARKETING_ORIGIN),
  title: { default: "FitOut — Good plans need a place.", template: "%s | FitOut" },
  description: SITE_TAGLINE,
};

export default function MarketingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div data-theme="court" className="flex min-h-dvh flex-col bg-background text-foreground">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-sticky focus:m-4 focus:rounded-lg focus:bg-background focus:p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">Skip to content</a>
      <MarketingHeader appUrl={absoluteAppUrl("/")} />
      {children}
      <MarketingFooter />
    </div>
  );
}
