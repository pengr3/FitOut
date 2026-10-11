import Image from "next/image";
import manifest from "../../../public/marketing/screenshots/manifest.json";

export function AppPreview({ name, alt, eager = false }: { name: keyof typeof manifest.captures; alt: string; eager?: boolean }) {
  const capture = manifest.captures[name];
  return (
    <div className="marketing-preview overflow-hidden rounded-2xl border border-border bg-card">
      <Image unoptimized src={capture.path} alt={alt} width={capture.width} height={capture.height} sizes="(max-width: 767px) calc(100vw - 32px), 1104px" loading={eager ? "eager" : "lazy"} className="h-auto w-full" />
    </div>
  );
}
