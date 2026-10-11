import Image from "next/image";
import manifest from "../../../public/marketing/screenshots/manifest.json";

export type AudienceStep = Readonly<{
  title: string;
  description: string;
  image: Readonly<{ src: string; alt: string; width: number; height: number }>;
}>;

export function AudienceSteps({ label, steps }: { label: string; steps: readonly AudienceStep[] }) {
  return (
    <ol aria-label={label} role="list" className="list-none divide-y divide-border">
      {steps.map((step, index) => {
        const capture = Object.values(manifest.captures).find((entry) => entry.path === step.image.src);
        return (
        <li key={step.title} className="grid min-w-0 items-center gap-8 py-12 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
          <div className="space-y-4">
            <span aria-hidden="true" className="inline-flex size-11 items-center justify-center rounded-full bg-muted text-label text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
            <h3 className="font-heading text-heading text-balance">{step.title}</h3>
            <p className="max-w-prose text-body text-muted-foreground">{step.description}</p>
          </div>
          <figure className="min-w-0">
            <div className="marketing-preview overflow-hidden rounded-2xl border border-border bg-card">
              <Image unoptimized src={step.image.src} alt={step.image.alt} width={capture?.width ?? step.image.width} height={capture?.height ?? step.image.height} sizes="(max-width: 767px) calc(100vw - 32px), 660px" loading="lazy" className="mx-auto h-auto max-h-[36rem] w-full object-contain" />
            </div>
          </figure>
        </li>
      ); })}
    </ol>
  );
}
