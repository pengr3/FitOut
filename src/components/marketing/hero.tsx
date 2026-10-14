import Image from "next/image";
import type { ReactNode } from "react";

type HeroProps = {
  id: string;
  title: string;
  description: string;
  image: "tennis" | "basketball" | "studio";
  imageAlt: string;
  children?: ReactNode;
  secondaryImage?: "studio" | "gym";
};

export function MarketingHero({ id, title, description, image, imageAlt, children, secondaryImage }: HeroProps) {
  return (
    <section aria-labelledby={id} className="marketing-hero mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-12">
      <div className="min-w-0 space-y-6 lg:py-10">
        <h1 id={id} className="marketing-display font-heading text-display text-balance">{title}</h1>
        <p className="max-w-prose text-body text-muted-foreground">{description}</p>
        {children}
      </div>
      <div className="marketing-hero-visual relative min-w-0">
        <div className="marketing-hero-photo relative overflow-hidden rounded-3xl bg-muted">
          <Image src={`/marketing/photos/${image}.jpg`} alt={imageAlt} fill unoptimized sizes="(max-width: 1023px) calc(100vw - 48px), 540px" preload className="object-cover" />
        </div>
        {secondaryImage && (
          <div className="marketing-hero-inset absolute overflow-hidden rounded-2xl border-8 border-background bg-background">
            <Image src={`/marketing/photos/${secondaryImage}.jpg`} alt={secondaryImage === "studio" ? "A light-filled movement studio with mirrors and room to practise." : "A fitness floor with weights and training equipment."} width={360} height={240} unoptimized sizes="(max-width: 639px) 40vw, 240px" className="aspect-[3/2] w-full object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}
