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
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const MIN_PHOTOS = 3; // D-02/D-04 — minimum to publish.

/** Re-pack a photo list so positions are contiguous 0..n-1 after a client-side add/remove/reorder. */
function repack(photos: ListingPhotoRow[]): ListingPhotoRow[] {
  return photos.map((p, i) => ({ ...p, position: i }));
}

export function PhotoUploader({
  listingId,
  initialPhotos,
  onCountChange,
}: {
  listingId: string;
  initialPhotos: ListingPhotoRow[];
  onCountChange?: (count: number) => void;
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
    toast.success("Photo removed");
  }

  const uploader = (
    <CldUploadWidget
      signatureEndpoint={`/api/cloudinary/sign?listingId=${encodeURIComponent(listingId)}`}
      options={{
        folder: `fitout/listings/${listingId}`,
        multiple: true,
        maxFiles: 20,
        sources: ["local", "camera", "url"],
      }}
      onSuccess={handleUploadSuccess}
      onError={() =>
        toast.error(
          "That photo didn't upload. Check the file is an image under 10MB and try again.",
        )
      }
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

        {photos.length < MIN_PHOTOS && (
          <p role="status" className="text-sm text-muted-foreground">
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
