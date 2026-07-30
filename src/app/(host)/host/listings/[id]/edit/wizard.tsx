"use client";

// The Airbnb-style listing creation/edit wizard (D-01). A single RHF form spans all steps; each
// "Save and continue" AUTOSAVES the draft via saveListingStep (the server re-validates with the same
// draftSchema — the client is never trusted) and advances. The terminal review step enforces nothing
// itself: it calls publishListing, which re-runs the full D-02 gate SERVER-SIDE (all core fields +
// both integer-cents rates + ≥3 photos + verified email). status is never set from the client.
//
// Steps (D-01): type → details → location → photos → pricing → booking mode → cancellation → review.
// The PHOTOS step is a documented seam — the signed direct-to-Cloudinary uploader grid lands in
// Plan 04 (Wave 3). Until then the review checklist's "3+ photos" row stays unmet (photoCount comes
// from the server), so publish is correctly blocked on photos this phase.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  CheckIcon,
  ChevronLeftIcon,
  MinusIcon,
} from "lucide-react";

import {
  draftSchema,
  type CancellationPolicyValue,
  type DraftListingInput,
} from "@/lib/validation/listing";
import {
  SPACE_TYPES,
  ACTIVITY_TAGS,
  ACTIVITY_TAG_LABELS,
  AMENITIES,
  type ActivityTagValue,
  type AmenityValue,
  type SpaceTypeValue,
} from "@/lib/listing-vocab";
import {
  saveListingStep,
  publishListing,
} from "@/app/actions/listing";
import { authClient } from "@/lib/auth-client";
import {
  AddressAutocomplete,
  type ResolvedAddress,
} from "@/components/listing/address-autocomplete";
import { PhotoUploader } from "@/components/listing/photo-uploader";
import { type ListingPhotoRow } from "@/app/actions/listing-photo";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export type WizardListing = {
  id: string;
  title: string | null;
  description: string | null;
  primarySpaceType: SpaceTypeValue | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  neighborhood: string | null;
  lat: number | null;
  lng: number | null;
  maxOccupancy: number | null;
  hourlyRateCents: number | null;
  dayRateCents: number | null;
  /** D-108 — how many people the flat rate covers before the extra-guest fee applies. NULL ⇒ 1. */
  included: number | null;
  /** D-108 — per-extra-guest surcharge in integer centavos. NULL or 0 ⇒ flat pricing (no surcharge). */
  extraHeadFee: number | null;
  currency: string;
  bookingMode: "instant" | "request";
  /** D-77 — NULL until the host makes an explicit choice. There is deliberately no default. */
  cancellationPolicy: CancellationPolicyValue | null;
  showExactAddress: boolean;
  status: "draft" | "published" | "unlisted";
  amenities: string[];
  activityTags: string[];
  photoCount: number;
  photos: ListingPhotoRow[];
};

const STEPS = [
  { key: "type", title: "What kind of space is it?" },
  { key: "details", title: "Tell guests about your space" },
  { key: "location", title: "Where is it?" },
  { key: "photos", title: "Add photos of your space" },
  { key: "pricing", title: "Set your rates" },
  { key: "booking", title: "How do you want to accept bookings?" },
  // Title phrased as a question to match the other steps' voice ("How do you want to accept bookings?"),
  // and deliberately NOT reusing the publish checklist's row label verbatim. Keeping that label a unique
  // string in this file means a grep for the unmet-requirement row finds the ROW, not this heading — the
  // same tripwire discipline 07-04/07-09 use for their forbidden-name greps.
  { key: "cancellation", title: "What happens if a guest cancels?" },
  { key: "review", title: "Review and publish" },
] as const;

/**
 * The index of a step, BY KEY. Generalises the single `CANCELLATION_STEP` idiom below to every step the
 * publish checklist links back to.
 *
 * WHY THIS EXISTS (09-UI-SPEC § 1a migration note): each checklist row used to carry a bare NUMERIC LITERAL
 * as its link target. A literal is correct only for one exact ordering of `STEPS`, so inserting a step —
 * which 09-10 does, adding `occupancy` before `pricing` — silently repoints every row after it: the host
 * clicks "Hourly rate" and lands on photos. Deriving the index from the key means the rows follow the list.
 * Never reintroduce a numeric literal there. (Deliberately NOT quoting the old shape, so the acceptance grep
 * that asserts no literal remains cannot be tripped by the very comment forbidding it.)
 */
const stepIndex = (key: (typeof STEPS)[number]["key"]) => STEPS.findIndex((s) => s.key === key);

/** Index of the D-77 tier step, so the publish-checklist row links back to it without a magic number. */
const CANCELLATION_STEP = stepIndex("cancellation");

/**
 * The three D-67 tiers, host-facing (07-UI-SPEC § 6). Plain language, no dates — there is no booking yet;
 * the booker-facing surfaces derive their copy from the D-68 LADDER instead (see
 * src/components/booking/cancellation-policy-disclosure.tsx).
 *
 * ORDER IS NOT A RANKING. The three render at equal weight and nothing marks one as recommended — see the
 * no-default rationale on the step below.
 */
const CANCELLATION_TIERS: { value: CancellationPolicyValue; title: string; body: string }[] = [
  {
    value: "flexible",
    title: "Flexible",
    body: "Guests get a full refund if they cancel at least 12 hours before the session. Best for spaces that are easy to rebook.",
  },
  {
    value: "standard",
    title: "Standard",
    body: "Full refund up to 24 hours before; half back up to 6 hours before. A middle ground most hosts pick.",
  },
  {
    value: "strict",
    title: "Strict",
    body: "Full refund up to 48 hours before; half back up to 24 hours before. Best for spaces you turn down other bookings for.",
  },
];

/** Minimal currency-symbol map (single-region launch — the column future-proofs multi-currency). */
function currencySymbol(code: string): string {
  const c = code.toLowerCase();
  if (c === "usd") return "$";
  if (c === "php") return "₱";
  if (c === "eur") return "€";
  if (c === "gbp") return "£";
  return code.toUpperCase() + " ";
}

/** Turn the RHF values into a clean draftSchema payload (null/"" → undefined, numbers coerced). */
function toPayload(v: DraftListingInput): DraftListingInput {
  const num = (x: unknown) =>
    typeof x === "number" && !Number.isNaN(x) ? x : undefined;
  return {
    title: v.title || undefined,
    description: v.description || undefined,
    primarySpaceType: v.primarySpaceType || undefined,
    addressLine1: v.addressLine1 || undefined,
    addressLine2: v.addressLine2 || undefined,
    city: v.city || undefined,
    region: v.region || undefined,
    postalCode: v.postalCode || undefined,
    country: v.country || undefined,
    neighborhood: v.neighborhood || undefined,
    lat: num(v.lat),
    lng: num(v.lng),
    maxOccupancy: num(v.maxOccupancy),
    hourlyRateCents: num(v.hourlyRateCents),
    dayRateCents: num(v.dayRateCents),
    // D-108 group pricing. Both carry the app-level defaults (₱0 fee = flat pricing, 1 included head), so
    // saving them is a no-op for a host who never opens the subsection.
    included: num(v.included),
    extraHeadFee: num(v.extraHeadFee),
    bookingMode: v.bookingMode,
    cancellationPolicy: v.cancellationPolicy,
    showExactAddress: v.showExactAddress,
    amenities: v.amenities,
    activityTags: v.activityTags,
  };
}

export function ListingWizard({
  listing,
  hostEmail,
  emailVerified,
}: {
  listing: WizardListing;
  hostEmail: string;
  emailVerified: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  // Live photo count — seeded from the server, kept current by the PhotoUploader as photos are
  // added/removed, so the D-02 publish checklist ("3+ photos") reflects real rows without a reload.
  const [photoCount, setPhotoCount] = useState(listing.photoCount);
  const symbol = currencySymbol(listing.currency);

  const form = useForm<DraftListingInput>({
    resolver: zodResolver(draftSchema),
    defaultValues: {
      title: listing.title ?? undefined,
      description: listing.description ?? undefined,
      primarySpaceType: listing.primarySpaceType ?? undefined,
      addressLine1: listing.addressLine1 ?? undefined,
      addressLine2: listing.addressLine2 ?? undefined,
      city: listing.city ?? undefined,
      region: listing.region ?? undefined,
      postalCode: listing.postalCode ?? undefined,
      country: listing.country ?? undefined,
      neighborhood: listing.neighborhood ?? undefined,
      lat: listing.lat ?? undefined,
      lng: listing.lng ?? undefined,
      maxOccupancy: listing.maxOccupancy ?? undefined,
      hourlyRateCents: listing.hourlyRateCents ?? undefined,
      dayRateCents: listing.dayRateCents ?? undefined,
      // D-108 — seeded with the SAME defaults the pricing engine coalesces to (quoteWindow: fee 0, included
      // 1), so an untouched listing round-trips to exactly the flat price it has today.
      included: listing.included ?? 1,
      extraHeadFee: listing.extraHeadFee ?? 0,
      bookingMode: listing.bookingMode,
      // D-77 — `undefined`, never a fallback tier. An unchosen policy must reach the RadioGroup as
      // unchosen so no card renders selected; seeding a default here would silently make the choice.
      cancellationPolicy: listing.cancellationPolicy ?? undefined,
      showExactAddress: listing.showExactAddress,
      amenities: listing.amenities as AmenityValue[],
      activityTags: listing.activityTags as ActivityTagValue[],
    },
  });

  const values = form.watch();

  /** Autosave the current form state. Returns true on success. */
  async function persist(): Promise<boolean> {
    const res = await saveListingStep(listing.id, toPayload(form.getValues()));
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    return true;
  }

  async function saveAndContinue() {
    setSaving(true);
    const ok = await persist();
    setSaving(false);
    if (ok) {
      toast.success("Saved");
      if (step < STEPS.length - 1) setStep((s) => s + 1);
    }
  }

  async function saveAsDraft() {
    setSaving(true);
    const ok = await persist();
    setSaving(false);
    if (ok) {
      toast.success("Draft saved");
      router.push("/host/listings");
    }
  }

  async function handlePublish() {
    setSaving(true);
    const saved = await persist();
    if (!saved) {
      setSaving(false);
      return;
    }
    const res = await publishListing(listing.id);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Your listing is live!");
    router.push("/host/listings");
  }

  async function resendVerification() {
    try {
      await authClient.sendVerificationEmail({
        email: hostEmail,
        callbackURL: "/host/listings",
      });
      toast.success(`Verification email sent to ${hostEmail}.`);
    } catch {
      toast.error("Couldn't send the email. Try again in a moment.");
    }
  }

  function applyResolvedAddress(addr: ResolvedAddress) {
    form.setValue("addressLine1", addr.addressLine1, { shouldDirty: true });
    form.setValue("city", addr.city, { shouldDirty: true });
    form.setValue("region", addr.region, { shouldDirty: true });
    form.setValue("postalCode", addr.postalCode, { shouldDirty: true });
    form.setValue("country", addr.country, { shouldDirty: true });
    form.setValue("neighborhood", addr.neighborhood, { shouldDirty: true });
    form.setValue("lat", addr.lat, { shouldDirty: true });
    form.setValue("lng", addr.lng, { shouldDirty: true });
  }

  const selectedTags = (values.activityTags ?? []) as ActivityTagValue[];
  function toggleTag(tag: ActivityTagValue) {
    const cur = (form.getValues("activityTags") ?? []) as ActivityTagValue[];
    const next = cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag];
    form.setValue("activityTags", next, { shouldDirty: true });
  }

  const selectedAmenities = (values.amenities ?? []) as AmenityValue[];
  function toggleAmenity(value: AmenityValue, checked: boolean) {
    const cur = (form.getValues("amenities") ?? []) as AmenityValue[];
    const next = checked ? [...cur, value] : cur.filter((a) => a !== value);
    form.setValue("amenities", next, { shouldDirty: true });
  }

  // The live D-02 publish checklist (drives the review step). Each row links back to its step.
  const hasCoords = typeof values.lat === "number" && typeof values.lng === "number";
  const checklist: { label: string; done: boolean; step: number | null; action?: () => void }[] = [
    { label: "Title", done: Boolean(values.title), step: stepIndex("details") },
    { label: "Description", done: Boolean(values.description), step: stepIndex("details") },
    { label: "Space type", done: Boolean(values.primarySpaceType), step: stepIndex("type") },
    { label: "Address", done: Boolean(values.addressLine1 && values.city && values.region && values.country) && hasCoords, step: stepIndex("location") },
    { label: "Capacity", done: Boolean(values.maxOccupancy && values.maxOccupancy > 0), step: stepIndex("details") },
    { label: "Hourly rate", done: Boolean(values.hourlyRateCents && values.hourlyRateCents > 0), step: stepIndex("pricing") },
    { label: "Day rate", done: Boolean(values.dayRateCents && values.dayRateCents > 0), step: stepIndex("pricing") },
    { label: "3+ photos", done: photoCount >= 3, step: stepIndex("photos") },
    // D-77 joins the EXISTING checklist rather than inventing a new blocked affordance — the shipped
    // "Almost there — finish these to publish:" panel already renders unmet rows with a Fix link, and
    // `publishEligible = checklist.every(c => c.done)` picks this up with no other change. The real gate
    // is publishListing's server-side publishSchema; this row only tells the host what's missing.
    {
      label: "Choose a cancellation policy",
      done: Boolean(values.cancellationPolicy),
      step: CANCELLATION_STEP,
    },
    {
      label: "Verified email",
      done: emailVerified,
      step: null,
      action: emailVerified ? undefined : resendVerification,
    },
  ];
  const publishEligible = checklist.every((c) => c.done);

  const progress = ((step + 1) / STEPS.length) * 100;
  const advanceLabel = step === 0 ? "Get started" : "Save and continue";

  return (
    <div className="space-y-8">
      <Toaster />

      {/* --- Stepper + progress --------------------------------------------------------------- */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </p>
        <Progress value={progress} />
        <ol className="flex flex-wrap gap-2" aria-label="Listing steps">
          {STEPS.map((s, i) => {
            const state = i < step ? "done" : i === step ? "current" : "future";
            return (
              <li key={s.key} aria-current={state === "current" ? "step" : undefined}>
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                    state === "current" && "bg-brand text-brand-foreground",
                    state === "done" && "bg-brand/90 text-brand-foreground",
                    state === "future" && "bg-muted text-muted-foreground",
                  )}
                >
                  {state === "done" ? <CheckIcon className="size-3.5" /> : i + 1}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">{STEPS[step].title}</h1>

      <Form {...form}>
        {/* We intentionally do NOT use handleSubmit here — advancing autosaves via saveListingStep. */}
        <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
          {/* --- Step 0: Type + activity tags ------------------------------------------------- */}
          {step === 0 && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="primarySpaceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary space type</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose the best match" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SPACE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      One canonical category — it powers search and sorting.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Activity tags (optional)</FormLabel>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTags.length === 0 && (
                    <span className="text-sm text-muted-foreground">None yet.</span>
                  )}
                  {selectedTags.map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1">
                      {ACTIVITY_TAG_LABELS[t]}
                      <button
                        type="button"
                        aria-label={`Remove ${ACTIVITY_TAG_LABELS[t]}`}
                        onClick={() => toggleTag(t)}
                      >
                        <MinusIcon className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Popover open={tagPickerOpen} onOpenChange={setTagPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      Add activity tags
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-64 p-0">
                    <Command>
                      <CommandInput placeholder="Search activities…" />
                      <CommandList>
                        <CommandGroup>
                          {ACTIVITY_TAGS.map((t) => {
                            const active = selectedTags.includes(t.value);
                            return (
                              <CommandItem
                                key={t.value}
                                value={t.label}
                                onSelect={() => toggleTag(t.value)}
                              >
                                <span
                                  className={cn(
                                    "flex size-4 items-center justify-center rounded-[4px] border",
                                    active
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-input",
                                  )}
                                >
                                  {active && <CheckIcon className="size-3" />}
                                </span>
                                {t.label}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Covers multi-use venues (e.g. a gym that also has a court).
                </FormDescription>
              </div>
            </div>
          )}

          {/* --- Step 1: Details + amenities -------------------------------------------------- */}
          {step === 1 && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Sunny downtown pickleball court"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={5}
                        placeholder="What makes your space great? Flooring, lighting, equipment…"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxOccupancy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max occupancy</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        inputMode="numeric"
                        placeholder="e.g. 8"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          field.onChange(Number.isNaN(n) ? undefined : n);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Most people allowed at once — the cap for group bookings later.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <FormLabel>Amenities</FormLabel>
                <div className="grid gap-2 sm:grid-cols-2">
                  {AMENITIES.map((a) => {
                    const checked = selectedAmenities.includes(a.value);
                    return (
                      <label
                        key={a.value}
                        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => toggleAmenity(a.value, v === true)}
                          aria-label={a.label}
                        />
                        <span className="text-sm">{a.label}</span>
                      </label>
                    );
                  })}
                </div>
                <FormDescription>Pick everything guests can use.</FormDescription>
              </div>
            </div>
          )}

          {/* --- Step 2: Location ------------------------------------------------------------- */}
          {step === 2 && (
            <div className="space-y-6">
              <FormItem>
                <FormLabel>Address</FormLabel>
                <AddressAutocomplete
                  initialLabel={
                    [listing.addressLine1, listing.city, listing.region]
                      .filter(Boolean)
                      .join(", ") || undefined
                  }
                  hasCoordinates={hasCoords}
                  onResolved={applyResolvedAddress}
                />
              </FormItem>

              <FormField
                control={form.control}
                name="addressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit / suite (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="e.g. Suite 200" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="showExactAddress"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5 pr-4">
                      <FormLabel>Show exact address</FormLabel>
                      <FormDescription>
                        Off by default — guests see an approximate area until they book.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                        aria-label="Show exact address"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* --- Step 3: Photos (Plan-04 — signed direct-to-Cloudinary uploader + dnd reorder) - */}
          {step === 3 && (
            <PhotoUploader
              listingId={listing.id}
              initialPhotos={listing.photos}
              onCountChange={setPhotoCount}
            />
          )}

          {/* --- Step 4: Pricing -------------------------------------------------------------- */}
          {step === 4 && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="hourlyRateCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hourly rate</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                          {symbol}
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          className="pl-8"
                          placeholder="0.00"
                          value={field.value != null ? (field.value / 100).toString() : ""}
                          onChange={(e) => {
                            const major = parseFloat(e.target.value);
                            field.onChange(
                              Number.isNaN(major) ? undefined : Math.round(major * 100),
                            );
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>Charged per hour. Required to publish.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dayRateCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day rate</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                          {symbol}
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          className="pl-8"
                          placeholder="0.00"
                          value={field.value != null ? (field.value / 100).toString() : ""}
                          onChange={(e) => {
                            const major = parseFloat(e.target.value);
                            field.onChange(
                              Number.isNaN(major) ? undefined : Math.round(major * 100),
                            );
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>Charged for a full day. Required to publish.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* --- Group pricing (D-108, 08-UI-SPEC § 6) — OPTIONAL, NOT a publish requirement ------
                  Deliberately NOT in the publish checklist and deliberately optional in publishSchema:
                  both fields are backward-compatible with defaults (₱0 fee = flat pricing, 1 included
                  head), so a host who never opens this block publishes exactly as before.

                  There is NO occupancy-mode control here and there must not be one (D-109 / Open Q8):
                  the column exists with a single v1 value and a picker with one choice is noise. The
                  real second mode (open capacity) arrives with Phase 9. */}
              <div className="space-y-6 rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Group pricing (optional)</p>
                  <p className="text-sm text-muted-foreground">
                    Most spaces skip this — leave the fee at {symbol}0 and your rate stays flat however
                    many people come.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="extraHeadFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extra guest fee</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                            {symbol}
                          </span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            className="pl-8"
                            placeholder="0.00"
                            value={field.value != null ? (field.value / 100).toString() : ""}
                            onChange={(e) => {
                              const major = parseFloat(e.target.value);
                              field.onChange(
                                Number.isNaN(major) ? undefined : Math.round(major * 100),
                              );
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Charge more when a group is larger than your base capacity. Leave at {symbol}0 for
                        flat pricing — most spaces do.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Shown ONLY once a fee is actually set — `included` is meaningless without one. */}
                {(values.extraHeadFee ?? 0) > 0 && (
                  <FormField
                    control={form.control}
                    name="included"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base price covers</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            inputMode="numeric"
                            placeholder="1"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const n = parseInt(e.target.value, 10);
                              field.onChange(Number.isNaN(n) ? undefined : n);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          How many people your rate includes before the extra guest fee applies. Keep
                          this below your maximum capacity
                          {values.maxOccupancy ? ` (${values.maxOccupancy})` : ""} — if it equals or
                          exceeds capacity, the extra guest fee can never apply.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>
          )}

          {/* --- Step 5: Booking mode --------------------------------------------------------- */}
          {step === 5 && (
            <FormField
              control={form.control}
              name="bookingMode"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="gap-3"
                    >
                      {[
                        {
                          value: "instant" as const,
                          title: "Instant book",
                          body: "Guests book available times immediately — no approval needed.",
                        },
                        {
                          value: "request" as const,
                          title: "Request to book",
                          body: "You review and approve each request before it's confirmed.",
                        },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border p-4",
                            field.value === opt.value && "border-primary",
                          )}
                        >
                          <RadioGroupItem value={opt.value} className="mt-1" />
                          <span className="space-y-0.5">
                            <span className="block text-sm font-medium">{opt.title}</span>
                            <span className="block text-sm text-muted-foreground">{opt.body}</span>
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    You can change this anytime. It applies to new bookings — any requests already in
                    progress keep the mode they started under.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* --- Step 6: Cancellation policy (D-77) ------------------------------------------- */}
          {/*
            NO CARD IS PRE-SELECTED, DELIBERATELY. This breaks the D-62 precedent of defaulting to the
            most booker-friendly option, because the cancellation tier is not a setting that should be
            set by accident — it governs real money. The tier a host picks here is snapshotted onto every
            booking at creation and is exactly what the refund ladder later applies, so an unchosen tier
            must stay unchosen until a human chooses it.

            All three cards render at equal weight; the selection marker is neutral `border-primary` and
            NEVER coral. Coral is reserved for booker CTAs (07-UI-SPEC § Color) and using it here would
            advertise a recommendation the product deliberately doesn't make.
          */}
          {step === 6 && (
            <FormField
              control={form.control}
              name="cancellationPolicy"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      className="gap-3"
                    >
                      {CANCELLATION_TIERS.map((opt) => (
                        <label
                          key={opt.value}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border p-4",
                            field.value === opt.value && "border-primary",
                          )}
                        >
                          <RadioGroupItem value={opt.value} className="mt-1" />
                          <span className="space-y-0.5">
                            <span className="block text-sm font-medium">{opt.title}</span>
                            <span className="block text-sm text-muted-foreground">{opt.body}</span>
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    Pick the policy that fits your space. You can change it later — it applies to new
                    bookings only; bookings already made keep the policy they were booked under.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* --- Step 7: Review --------------------------------------------------------------- */}
          {step === 7 && (
            <div className="space-y-6">
              {publishEligible ? (
                <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                  Everything looks ready. Publishing makes your listing public. It becomes bookable
                  once your payouts are set up (that step comes next).
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Almost there — finish these to publish:</p>
                  <ul className="space-y-1.5">
                    {checklist.map((c) => (
                      <li key={c.label} className="flex items-center gap-2 text-sm">
                        <span
                          className={cn(
                            "flex size-5 items-center justify-center rounded-full",
                            c.done ? "bg-success text-success-foreground" : "bg-muted",
                          )}
                        >
                          {c.done ? (
                            <CheckIcon className="size-3" />
                          ) : (
                            <MinusIcon className="size-3 text-muted-foreground" />
                          )}
                        </span>
                        <span className={cn(c.done && "text-muted-foreground line-through")}>
                          {c.label}
                        </span>
                        {!c.done && c.step !== null && (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="h-auto p-0"
                            onClick={() => setStep(c.step as number)}
                          >
                            Fix
                          </Button>
                        )}
                        {!c.done && c.action && (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="h-auto p-0"
                            onClick={c.action}
                          >
                            Resend verification email
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                  {!emailVerified && (
                    <p className="text-xs text-muted-foreground">
                      Verify your email to publish. We sent a link to {hostEmail}.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* --- Nav ------------------------------------------------------------------------- */}
          <div className="flex items-center justify-between border-t pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || saving}
            >
              <ChevronLeftIcon className="size-4" /> Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={saveAndContinue} disabled={saving}>
                {saving ? "Saving…" : advanceLabel}
              </Button>
            ) : publishEligible ? (
              <Button
                type="button"
                className="bg-brand text-brand-foreground hover:bg-brand/90"
                onClick={handlePublish}
                disabled={saving}
              >
                {saving ? "Publishing…" : "Publish listing"}
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={saveAsDraft} disabled={saving}>
                {saving ? "Saving…" : "Save as draft"}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
