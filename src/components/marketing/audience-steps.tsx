import Image from "next/image";

export type AudienceStep = Readonly<{
  title: string;
  description: string;
  image: Readonly<{ src: string; alt: string; width: number; height: number }>;
  caption: string;
}>;

export function AudienceSteps({ label, steps }: { label: string; steps: readonly AudienceStep[] }) {
  return (
    <ol aria-label={label} role="list" className="list-none divide-y divide-border">
      {steps.map((step, index) => (
        <li key={step.title} className="grid min-w-0 items-center gap-8 py-10 md:grid-cols-2 md:gap-12">
          <div className="space-y-4">
            <span aria-hidden="true" className="inline-flex size-11 items-center justify-center rounded-lg border border-brand text-label text-brand">{String(index + 1).padStart(2, "0")}</span>
            <h3 className="font-heading text-heading text-balance">{step.title}</h3>
            <p className="max-w-prose text-body text-muted-foreground">{step.description}</p>
          </div>
          <figure className="min-w-0 space-y-3">
            <div className="rounded-xl border border-border bg-muted p-4 sm:p-6">
              <Image unoptimized src={step.image.src} alt={step.image.alt} width={step.image.width} height={step.image.height} sizes="(max-width: 767px) calc(100vw - 64px), (max-width: 1152px) 45vw, 504px" loading="lazy" className="mx-auto h-auto max-h-96 w-full object-contain" />
            </div>
            <figcaption className="text-label text-muted-foreground">{step.caption}</figcaption>
          </figure>
        </li>
      ))}
    </ol>
  );
}
