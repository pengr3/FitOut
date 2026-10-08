import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { absoluteAppUrl } from "@/lib/app-origins";
import { SITE_TAGLINE } from "@/lib/site";
import { cn } from "@/lib/utils";

export function MarketingFooter() {
  const linkClass = cn(buttonVariants({ variant: "ghost", size: "touch" }), "motion-reduce:transition-none");
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="font-heading text-heading text-brand">FitOut</p>
          <p className="text-body text-muted-foreground">{SITE_TAGLINE}</p>
        </div>
        <nav aria-label="Legal and contact">
          <ul className="flex flex-wrap gap-1">
            <li><Link href="/contact" className={linkClass}>Contact</Link></li>
            <li><a href={absoluteAppUrl("/terms")} className={linkClass}>Terms</a></li>
            <li><a href={absoluteAppUrl("/privacy")} className={linkClass}>Privacy</a></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
