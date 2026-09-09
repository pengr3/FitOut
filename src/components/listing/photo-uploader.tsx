"use client";

// Listing photo uploader + reorder grid (LIST-02 · D-04). This is the deliberate graduation from the
// Phase-1 avatar control (which routed bytes through the server): here the browser uploads DIRECTLY to
// Cloudinary via next-cloudinary's <CldUploadWidget signatureEndpoint="/api/cloudinary/sign"> — bytes
// never transit our server. On each successful upload only { public_id, secure_url } metadata comes
// back and we persist it via the persistPhoto server action.
//
// Reorder uses @dnd-kit (never hand-rolled): drag to reorder AND keyboard move-up/move-down controls so
// reordering is fully keyboard-operable (UI-SPEC accessibility — not drag-only). The first tile is the
// cover (position 0). Per-tile remove carries aria-label="Remove photo" + a tooltip so it's operable by
// assistive tech, not hover-only, and calls removePhoto (which also destroys the Cloudinary asset).

import { useEffect, useState } from "react";
import {
  CldUploadWidget,
  type CloudinaryUploadWidgetResults,
} from "next-cloudinary";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GripVerticalIcon,
  ImageIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  persistPhoto,
  reorderPhotos,
  removePhoto,
  type ListingPhotoRow,
} from "@/app/actions/listing-photo";
import { CoverFramePreview } from "@/components/listing/cover-frame-preview";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// The listing-upload contract, in ONE declaration that both sides of the boundary read (rule F2).
// Every value the widget below hands Cloudinary — the byte ceiling, the format list, the preset name,
// the photo cap — and every sentence a host is shown when an upload is refused comes from here.
// NOTHING IN THIS COMPONENT SPELLS ANY OF THEM, which is the only way the picker's hint and the
// boundary's gate cannot come to disagree, and the only way this file's error copy cannot promise a
// limit our code does not have.
import {
  LISTING_ALLOWED_FORMATS,
  LISTING_MAX_BYTES,
  LISTING_MAX_PHOTOS,
  LISTING_UPLOAD_PRESET,
  listingUploadRefusal,
} from "@/lib/listing/upload-policy";
import { cn } from "@/lib/utils";

const MIN_PHOTOS = 3; // D-02/D-04 — minimum to publish.

const PLAYWRIGHT_CLOUDINARY_CLOUD_NAME = "fitout-e2e-placeholder-not-a-real-cloud";
const PLAYWRIGHT_CLOUDINARY_API_KEY = "fitout-e2e-placeholder-not-a-real-key";

function cloudinaryWidgetConfig() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey =
    process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ??
    (cloudName === PLAYWRIGHT_CLOUDINARY_CLOUD_NAME
      ? PLAYWRIGHT_CLOUDINARY_API_KEY
      : undefined);

  return { cloud: { cloudName, apiKey } };
}

/**
 * THE PHOTO-REQUIREMENT REGION'S NAME, which is a different mechanism from its CONTENT.
 *
 * The status role is `nameFrom: author` in ARIA — an element carrying it takes NO name from its own
 * text — so before plan 14-14 this region's accessible name was the empty string. That is what
 * `src/lib/design/live-regions.ts`'s rule 5 forbids, and it is why the region is declared there as
 * `photo-uploader-requirement` rather than excluded to a later phase: an exclusion here would simply
 * have traded one row for another and the exclusion list would not have reached zero.
 *
 * ⚠ IT IS A LABEL, NOT A SECOND COPY OF THE COUNT, following `src/components/group/share-link-box.tsx`:
 * on the VoiceOver/Safari pairing a NAMED live region can be announced by its NAME INSTEAD OF ITS
 * CONTENT. This region DOES have text of its own, which makes it the one entry in the inventory's
 * author-named list in that shape — the full argument, what the trade costs and the second place the
 * same count is carried are all recorded on its row in `live-regions.ts` rather than restated here.
 *
 * Hoisted to a module-level constant rather than inlined so the gate can resolve it to a string and
 * check it against the value recorded in the inventory.
 */
const PHOTO_REQUIREMENT_REGION_NAME = "Photo requirement";

/** Re-pack a photo list so positions are contiguous 0..n-1 after a client-side add/remove/reorder. */
function repack(photos: ListingPhotoRow[]): ListingPhotoRow[] {
  return photos.map((p, i) => ({ ...p, position: i }));
}

export function PhotoUploader({
  listingId,
  initialPhotos,
  onCountChange,
  onReReview,
}: {
  listingId: string;
  initialPhotos: ListingPhotoRow[];
  onCountChange?: (count: number) => void;
  onReReview?: () => void;
}) {
  const [photos, setPhotos] = useState<ListingPhotoRow[]>(() =>
    repack([...initialPhotos].sort((a, b) => a.position - b.position)),
  );

  // Keep the parent wizard's live publish checklist ("3+ photos") in sync as photos change.
  useEffect(() => {
    onCountChange?.(photos.length);
  }, [photos.length, onCountChange]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Persist a freshly-uploaded photo (bytes already landed on Cloudinary; we store only metadata).
  async function addPhoto(publicId: string, url: string) {
    const res = await persistPhoto(listingId, { publicId, url });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setPhotos((prev) => [...prev, res.photo]);
    if (res.flipped === true) {
      onReReview?.();
      return;
    }
    toast.success("Photo added");
  }

  function handleUploadSuccess(results: CloudinaryUploadWidgetResults) {
    const info = results?.info;
    if (!info || typeof info === "string") return;
    const publicId = info.public_id;
    const url = info.secure_url;
    if (!publicId || !url) return;
    void addPhoto(publicId, url);
  }

  // Persist a new order (optimistic: reflect it immediately, revert on server rejection).
  async function commitOrder(next: ListingPhotoRow[]) {
    const previous = photos;
    setPhotos(repack(next));
    const res = await reorderPhotos(
      listingId,
      next.map((p) => p.id),
    );
    if (!res.ok) {
      setPhotos(previous);
      toast.error(res.error);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    void commitOrder(arrayMove(photos, oldIndex, newIndex));
  }

  // Keyboard-operable reorder (UI-SPEC line 222 — not drag-only).
  function movePhoto(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    void commitOrder(arrayMove(photos, index, target));
  }

  async function handleRemove(photoId: string) {
    const previous = photos;
    setPhotos((prev) => repack(prev.filter((p) => p.id !== photoId)));
    const res = await removePhoto(listingId, photoId);
    if (!res.ok) {
      setPhotos(previous);
      toast.error(res.error);
      return;
    }
    if (res.flipped === true) {
      onReReview?.();
      return;
    }
    toast.success("Photo removed");
  }

  const uploader = (
    <CldUploadWidget
      config={cloudinaryWidgetConfig()}
      signatureEndpoint={`/api/cloudinary/sign?listingId=${encodeURIComponent(listingId)}`}
      // D-194 — THE PRESET IS A TOP-LEVEL PROP, AND ITS POSITION IS AS LOAD-BEARING AS ITS VALUE.
      // Inside `next-cloudinary` the widget's option object is composed with the preset taken from
      // this prop — or, when the prop is unset, from NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET — and then
      // `options` is spread LAST OVER THE RESULT. Two consequences, both silent:
      //   - the same name written as a key INSIDE `options` would quietly win over this prop; and
      //   - leaving this prop unset falls back to that environment variable, which is in neither
      //     .env.example nor .env.local today and must stay that way. The preset name is a repo
      //     constant, not configuration (threat T-16.1-09).
      //
      // WHAT THE PROP BUYS, stated because it is not obvious from the name: it is what puts the
      // preset key into the widget's OWN paramsToSign, and that key is the one
      // `/api/cloudinary/sign` now REFUSES TO MINT A SIGNATURE WITHOUT. Remove this prop and every
      // upload fails at our own endpoint before Cloudinary is reached at all — loudly and
      // immediately, which is the intended failure mode rather than a regression to be feared.
      uploadPreset={LISTING_UPLOAD_PRESET}
      options={{
        folder: `fitout/listings/${listingId}`,
        multiple: true,
        // D-180 / D-181 — the declared byte ceiling, honest about what it is: a courtesy to hosts and
        // NOT a security boundary. The bytes go browser-to-Cloudinary directly and our server never
        // sees them, so anyone who bypasses this widget bypasses this number by construction. The
        // security boundary is the transformation the preset carries, which bounds the STORED asset
        // whatever arrived.
        //
        // U1, the gap this closes: until now this file PROMISED a ten-megabyte limit in its error
        // toast and nothing in our code enforced one — our copy was describing a vendor default. The
        // declared limit and the enforced limit are now the same imported number.
        maxFileSize: LISTING_MAX_BYTES,
        // D-184 — the picker's hint and the boundary's gate are LITERALLY the same array. The
        // server-side half is the preset's own format list, built from this same constant by
        // `scripts/cloudinary-preset.ts`; that half is the gate, server-enforced and un-omittable by
        // any client. THIS half is a fast local refusal the host actually sees, and it is not the
        // gate.
        //
        // ⚠ A SPREAD OF THE IMPORTED ARRAY, DELIBERATELY NOT A HAND-TYPED SECOND COPY. On this one
        // point the avatar path is the counter-example rather than the model: `avatar-field.tsx`
        // types its file picker's accept attribute out again as a second copy of the three allowed
        // types, which is what makes `validation/profile.ts`'s claim that the picker "reads it here"
        // aspirational rather than literal. This option takes an array of plain strings, so spreading
        // costs nothing and there is no reason to inherit that residual.
        clientAllowedFormats: [...LISTING_ALLOWED_FORMATS],
        // D-185 — local files only. Both of the other two sources this widget used to offer are gone,
        // for two different reasons.
        //
        // The remote-address source is the load-bearing removal (threat T-16.1-15): it lets a client
        // hand Cloudinary an arbitrary address to go and fetch, and there is then NO LOCAL FILE TO
        // MEASURE — so the ceiling above and the format list above are both defeated BY
        // CONSTRUCTION, not by a bug. It is a documented client-side-validation bypass, and we were
        // offering it from our own UI.
        //
        // The webcam source went with it, and the practical loss is desktop-webcam capture only: on
        // mobile the local source already opens the OS photo picker, which offers the camera on both
        // iOS and Android.
        sources: ["local"],
        // D-195 — offer only the slots this listing actually has left, instead of a flat number that
        // was a second copy of the server-side cap.
        //
        // THE SHAPE THIS NARROWS: a listing already holding 18 photos, a host who selects a full cap
        // worth of files in one click, every one of them uploaded and billed, two persisted, the rest
        // refused at the server-side cap with nothing destroying the bytes. Deriving the limit from
        // what is left makes that same click offer two files rather than twenty.
        //
        // ⚠ IT NARROWS THE WINDOW; IT DOES NOT CLOSE IT, and it never replaces the server-side
        // destroy. The server-side count can change between this render and the upload, so D-187's
        // destroy on the rejection path in `persistPhoto` is the half that actually closes it.
        //
        // THE CLAMP IS DELIBERATE, NOT DEFENSIVE HABIT. The subtraction reaches zero on a full
        // listing, and zero is falsy in an options object whose vendor semantics for it are
        // UNMEASURED — a plausible reading is "no limit", which is the exact opposite of the intent
        // here. Clamping to a single file is safe precisely because this option was never the thing
        // closing the window: that one file is refused by `persistPhoto` at the cap and destroyed
        // there.
        maxFiles: Math.max(1, LISTING_MAX_PHOTOS - photos.length),
      }}
      onSuccess={handleUploadSuccess}
      // D-186 / D-193 — one generic sentence became three, and not one of them is authored here.
      // `listingUploadRefusal` maps whatever the widget hands us onto the too-large, the
      // wrong-format or the upload-failed sentence, each with exactly one home in the declaration.
      //
      // THE THREE REASONS ARE DISTINGUISHABLE ONLY BY MATCHING VENDOR ENGLISH. There is no error
      // code, no enum and no discriminant field — the reason lives only in a sentence Cloudinary
      // wrote. So when the vendor rewords, this degrades to upload-failed BY DESIGN: the failure mode
      // of a vendor copy change is a less specific message, never a misleading one.
      //
      // AND THIS TOAST IS A SECOND SURFACE, NOT THE ONLY ONE. The widget renders its own English
      // error inside its cross-origin iframe too, so the host sees the vendor's sentence AND ours.
      // Ours exists to be the one in FitOut's voice.
      onError={(error) => toast.error(listingUploadRefusal(error))}
    >
      {({ open }) => (
        <Button type="button" variant="outline" onClick={() => open()}>
          <ImageIcon className="size-4" /> Add photos
        </Button>
      )}
    </CldUploadWidget>
  );

  // Empty state — the UI-SPEC dropzone copy.
  if (photos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <ImageIcon className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-medium">Add photos of your space</h2>
        <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
          Listings with great photos get booked more. Add at least 3 to publish — the first one is
          your cover.
        </p>
        <div className="mt-4 flex justify-center">{uploader}</div>
      </div>
    );
  }

  const need = MIN_PHOTOS - photos.length;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Drag a photo, or use the arrows, to reorder. The first photo is your cover.
          </p>
          {uploader}
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {photos.map((photo, index) => (
                <PhotoTile
                  key={photo.id}
                  photo={photo}
                  index={index}
                  total={photos.length}
                  onMove={movePhoto}
                  onRemove={handleRemove}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        {/*
          CROP-02 — what the two cover shapes cut off, shown but never baked in (D-A / D-170).

          NO `photos.length >= 1` GUARD, DELIBERATELY: the zero-photo branch above returns before this
          point, so a guard here would be dead code shaped like a real branch. NO MARGIN EITHER — the
          wrapper's `space-y-4` is the gutter.
        */}
        <CoverFramePreview url={photos[0].url} alt="Cover photo" />

        {photos.length < MIN_PHOTOS && (
          <p
            role="status"
            aria-label={PHOTO_REQUIREMENT_REGION_NAME}
            className="text-sm text-muted-foreground"
          >
            Add {need} more photo{need === 1 ? "" : "s"} to publish (minimum {MIN_PHOTOS}).
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}

function PhotoTile({
  photo,
  index,
  total,
  onMove,
  onRemove,
}: {
  photo: ListingPhotoRow;
  index: number;
  total: number;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (photoId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: photo.id });
  const isCover = index === 0;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-muted",
        // Cover spans 2×2 on desktop (UI-SPEC) so it reads as the primary image.
        isCover && "sm:col-span-2 sm:row-span-2",
      )}
    >
      <AspectRatio ratio={isCover ? 4 / 3 : 1}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={isCover ? "Cover photo" : `Listing photo ${index + 1}`}
          className="size-full object-cover"
        />
      </AspectRatio>

      {isCover && (
        <span className="absolute top-2 left-2 rounded-md bg-foreground/80 px-2 py-0.5 text-xs font-medium text-background">
          Cover
        </span>
      )}

      {/* Drag handle (pointer + keyboard DnD via dnd-kit sensors). */}
      <button
        type="button"
        aria-label="Drag to reorder photo"
        className="absolute top-2 right-2 flex size-8 cursor-grab touch-none items-center justify-center rounded-md bg-background/80 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" aria-hidden="true" />
      </button>

      {/* Keyboard-operable reorder controls (not drag-only) + remove. */}
      <div className="absolute right-2 bottom-2 flex items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="size-8 bg-background/80"
          aria-label="Move photo earlier"
          disabled={index === 0}
          onClick={() => onMove(index, -1)}
        >
          <ArrowUpIcon className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="size-8 bg-background/80"
          aria-label="Move photo later"
          disabled={index === total - 1}
          onClick={() => onMove(index, 1)}
        >
          <ArrowDownIcon className="size-4" aria-hidden="true" />
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="size-8 bg-background/80 text-destructive hover:text-destructive"
              aria-label="Remove photo"
              onClick={() => onRemove(photo.id)}
            >
              <XIcon className="size-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove photo</TooltipContent>
        </Tooltip>
      </div>
    </li>
  );
}
