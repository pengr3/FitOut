// Public listing photo gallery (LIST-06 / D-04) — cover-first, accessible, responsive tiles.
//
// Presentational + server-safe (no hooks) so the public detail RSC can render it directly. Photos
// arrive already ordered (position 0 = cover) from publicListing(). Each image carries descriptive
// alt text derived from the listing title, and tiles use a fixed aspect ratio so the grid never
// reflows as images load (the muted background is the built-in loading affordance; the route also has
// a skeleton loading.tsx). Delivery is the stored Cloudinary secure_url via a plain <img> (same as the
// host listing-card) — this keeps the anonymous page free of any Cloudinary client config and works in
// e2e without live credentials; it can graduate to next-cloudinary <CldImage> later.

import { ImageIcon } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import type { PublicListingPhoto } from "@/lib/listing-public";

export function PhotoGallery({
  photos,
  title,
}: {
  photos: PublicListingPhoto[];
  title: string;
}) {
  if (photos.length === 0) {
    return (
      <AspectRatio
        ratio={16 / 9}
        className="flex items-center justify-center rounded-xl bg-muted text-muted-foreground"
      >
        <span className="flex items-center gap-2 text-sm">
          <ImageIcon className="size-4" aria-hidden="true" /> No photos yet
        </span>
      </AspectRatio>
    );
  }

  const [cover, ...rest] = photos;

  return (
    <section aria-label={`Photos of ${title}`}>
      {/* Cover (position 0, D-04) — the largest, first tile. */}
      <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-xl bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover.url}
          alt={`${title} — cover photo`}
          className="size-full object-cover"
        />
      </AspectRatio>

      {rest.length > 0 && (
        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {rest.map((photo, i) => (
            <li key={photo.id}>
              <AspectRatio ratio={4 / 3} className="overflow-hidden rounded-lg bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={`${title} — photo ${i + 2}`}
                  loading="lazy"
                  className="size-full object-cover"
                />
              </AspectRatio>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
