"use client";

// Search bar (SEARCH-01..05 · D-29/D-32/D-35) — the demand-side front door. An Airbnb-style filter form:
// location autocomplete + a SINGLE combined activity/type control + date + optional time + price + radius,
// serialized to the URL so search is shareable / SEO-friendly and the Back button works (D-32). The RSC
// re-reads and re-validates those params (searchParamsSchema.safeParse) and runs the two-stage search —
// this client form is a UX convenience, never the authority (mirrors the repo's "client RHF + Zod for UX;
// server re-validates the SAME schema" contract). We manage the fields with react-hook-form and validate
// the assembled params with the shared `searchParamsSchema` at submit; the coerce/refine schema stays the
// single source of truth for the param shape without leaking `z.coerce` input `unknown`s into the form.
//
// The ONE combined activity control merges SPACE_TYPE_LABELS + ACTIVITY_TAG_LABELS into a single Select
// that emits ONE `category` value (the two vocabularies are disjoint, so a value is unambiguous — the
// search SQL checks it against BOTH columns, D-35). Never split into separate type/activity params.
//
// Coral appears exactly once on this screen: the Search submit button (the Airbnb magnifier).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { format } from "date-fns";
import { toast } from "sonner";
import { SearchIcon, LocateFixedIcon, CalendarIcon } from "lucide-react";

// `RADIUS_PRESETS` comes from the authority rather than a fourth copy (12-REVIEW WR-03). This file used
// to restate `[2, 5, 10, 25]` beside the schema that refines against it, so adding a preset meant editing
// three files and only one of them — the schema — would have failed to compile if a copy were missed.
import { RADIUS_PRESETS, searchParamsSchema } from "@/lib/validation/booking";
import { SPACE_TYPE_LABELS, ACTIVITY_TAG_LABELS } from "@/lib/listing-vocab";
import type { RelaxationRungId } from "@/lib/search/relaxation";
import { STATUS_TONE_RECIPES } from "@/lib/design/status-tones";
import { cn } from "@/lib/utils";
import { AddressAutocomplete, type ResolvedAddress } from "@/components/listing/address-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ANY = "__any__"; // Radix Select forbids an empty-string item value — sentinel for "no filter".

/** On-the-hour "HH:mm" options (00:00..23:00), 12-hour labels — matches the on-the-hour rule (D-22). */
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => {
  const value = `${String(h).padStart(2, "0")}:00`;
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { value, label: `${hour12}:00 ${period}` };
});

/** One combined activity/type option list — MERGES both vocab label maps (D-35). */
const SPACE_TYPE_OPTIONS = Object.entries(SPACE_TYPE_LABELS).map(([value, label]) => ({ value, label }));
const ACTIVITY_OPTIONS = Object.entries(ACTIVITY_TAG_LABELS).map(([value, label]) => ({ value, label }));

/** Clean, coercion-free form state; the shared schema validates the assembled params at submit. */
type SearchFormValues = {
  lat?: number;
  lng?: number;
  category: string; // "" = any (a space-type OR activity-tag key)
  date: string; // "" = any, else YYYY-MM-DD
  start: string; // "" = any, else HH:mm
  end: string; // "" = any, else HH:mm
  priceMax: string; // "" = unbounded; raw ₱/hr pesos (converted to cents at submit)
  radius: string; // preset km as a string ("10" default)
};

export type SearchBarDefaults = {
  lat?: number;
  lng?: number;
  category?: string;
  date?: string;
  start?: string;
  end?: string;
  /** Frozen price ceiling in CENTS (the serialized param unit); shown to the booker as ₱/hr pesos. */
  priceMaxCents?: number;
  radius?: number;
  /**
   * STATE-03 / D-53 (plan 12-12) — which ONE control the relaxation ladder moved, if any.
   *
   * THE VALUES ABOVE ARE ALREADY THE EFFECTIVE ONES. `(public)/page.tsx` composes `defaults` from the
   * ladder's `effectiveParams` while the URL keeps the BOOKER'S query, which is what lets this bar show
   * `25 km` while `Undo` still has the original 10 km to restore. This field only says WHICH of them
   * moved, so the control that changed can be marked and tinted — the RESULTS and the CONTROL never
   * disagreeing is half of D-53's requirement, and the half a booker actually sees.
   *
   * THERE IS NO CHIP COMPONENT AND THIS IS NOT ONE (RESEARCH Pitfall 6). "The filter chip" in D-53 and
   * in 12-UI-SPEC AC#30 means the shipped `<Select id="search-radius">` below, whose `SelectValue`
   * renders `{r} km`. Building a chip row would be net-new UI on a phase whose own scope guard (D-59)
   * exists to stop exactly that.
   */
  relaxed?: RelaxationRungId | null;
};

/**
 * THE SOFT-ACCENT TONE FOR A CONTROL THE SYSTEM MOVED (accent item 9).
 *
 * ⚠ NAMED, NEVER QUOTED — and this file is one of the two the rule was measured on. The surface and the
 * ink below are read from `STATUS_TONE_RECIPES["soft-accent"]` BY NAME, the same way
 * `patterns/empty-state.tsx` reads the `positive` recipe, and the prose here DESCRIBES the classes
 * instead of spelling them. Two of `tests/design/brand-recipe.test.ts`'s assertions read this file's
 * RAW text — the in-scope accent-background scan, and the one that finds the accent CTA by locating its
 * variant prop with `indexOf` — so a comment that quotes either string is indistinguishable from markup
 * to both. Measured here, not anticipated: an earlier draft of this very docblock quoted both and turned
 * the gate red twice, the second time by pointing the CTA scan at a sentence.
 *
 * WHY THE RECIPE OBJECT RATHER THAN CLASS LITERALS. Two reasons, and the second one is mechanical:
 *
 *   1. It is the design system's declared vocabulary for a brand-relevant informational surface, whose
 *      one shipped adopter is the spots-left chip. Reading it by name makes this the third surface
 *      agreeing with a TONE rather than a fourth surface agreeing with a habit.
 *   2. That gate pins the NON-BUTTON accent recipes per file — the eight occurrences across six files
 *      allowed to stay token classes. A literal here would be a ninth, in a seventh file, and widening
 *      the map is the wrong answer: a Radix select trigger is not a `Button` and cannot opt into the
 *      accent button variant at all, which is exactly the situation the tone object exists for.
 *
 * The EDGE is the one literal, and it is legal for a stated reason: the 30% accent border is
 * `DECORATIVE_ACCENT_EDGE` in that same gate and an `EXCLUDED_PAIRS` row in `contrast-pairs.ts`
 * (1.60 court / 1.49 grove), declared by plan 12-01 — whose row names THIS surface as an incoming
 * adopter. That exclusion carries a compensating requirement and this control meets it: the meaning is
 * carried by the control's own VALUE (foreground ink on the 10% accent tint, 17.04 / 16.24, a declared
 * passing row) and by the band's sentence beside it, never by the tinted border alone.
 */
const RELAXED_TONE = cn(
  STATUS_TONE_RECIPES["soft-accent"].surface,
  STATUS_TONE_RECIPES["soft-accent"].text,
  "border-brand/30",
);

export function SearchBar({
  defaults = {},
  sort = "nearest",
}: {
  defaults?: SearchBarDefaults;
  sort?: "nearest" | "price";
}) {
  const router = useRouter();
  const [dateOpen, setDateOpen] = useState(false);
  const [usedGeo, setUsedGeo] = useState(false);

  const form = useForm<SearchFormValues>({
    defaultValues: {
      lat: defaults.lat,
      lng: defaults.lng,
      category: defaults.category ?? "",
      date: defaults.date ?? "",
      start: defaults.start ?? "",
      end: defaults.end ?? "",
      priceMax: defaults.priceMaxCents != null ? String(Math.round(defaults.priceMaxCents / 100)) : "",
      radius: String(defaults.radius ?? 10),
    },
  });

  const { setValue, control } = form;
  const lat = useWatch({ control, name: "lat" });
  const lng = useWatch({ control, name: "lng" });
  const category = useWatch({ control, name: "category" });
  const date = useWatch({ control, name: "date" });
  const start = useWatch({ control, name: "start" });
  const end = useWatch({ control, name: "end" });
  const priceMax = useWatch({ control, name: "priceMax" });
  const radius = useWatch({ control, name: "radius" });

  const hasOrigin = lat !== undefined && lng !== undefined;

  /**
   * Did the ladder move THIS control? Drives one bare `data-relaxed` attribute and the soft-accent tone.
   *
   * Keyed on the RUNG rather than on "the value differs from the URL", because the bar cannot see the
   * URL: `defaults` already carries the effective values, so a value-diff here would compare a number
   * against itself. The rung is the RSC's own answer to the same question and it is the one the band
   * renders, which is what keeps the sentence and the tint pointing at the same control.
   */
  const relaxedRung = defaults.relaxed ?? null;
  const relaxedAttr = (rung: RelaxationRungId): string | undefined =>
    relaxedRung === rung ? rung : undefined;
  const relaxedTone = (rung: RelaxationRungId): string | false =>
    relaxedRung === rung && RELAXED_TONE;

  function handleAddress(addr: ResolvedAddress) {
    setValue("lat", addr.lat);
    setValue("lng", addr.lng);
    setUsedGeo(false);
  }

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Location isn't available in this browser. Type an address instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue("lat", pos.coords.latitude);
        setValue("lng", pos.coords.longitude);
        setUsedGeo(true);
      },
      () => toast.error("We couldn't get your location. Type an address instead."),
    );
  }

  const selectedDate = (() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined;
  })();

  const priceLabel = priceMax.trim() ? `≤ ₱${priceMax.trim()}/hr` : "Any price";

  const onSubmit = form.handleSubmit((v) => {
    // Assemble only the set filters; the price axis is the hourly rate in CENTS (matches the search SQL).
    const candidate: Record<string, unknown> = { radius: v.radius, sort };
    if (v.lat !== undefined && v.lng !== undefined) {
      candidate.lat = v.lat;
      candidate.lng = v.lng;
    }
    if (v.category) candidate.category = v.category;
    if (v.date) candidate.date = v.date;
    if (v.date && v.start) candidate.start = v.start; // time is only meaningful with a date
    if (v.date && v.end) candidate.end = v.end;
    if (v.priceMax.trim() !== "") {
      const pesos = Number(v.priceMax.trim());
      if (!Number.isFinite(pesos) || pesos < 0) {
        toast.error("Enter a valid maximum price.");
        return;
      }
      candidate.priceMax = Math.round(pesos * 100); // ₱ → cents
    }

    const parsed = searchParamsSchema.safeParse(candidate);
    if (!parsed.success) {
      toast.error("Those filters aren't valid. Adjust your search and try again.");
      return;
    }

    // Serialize the validated params to the URL (page resets to 0 on a fresh search).
    const p = new URLSearchParams();
    if (parsed.data.lat !== undefined && parsed.data.lng !== undefined) {
      p.set("lat", String(parsed.data.lat));
      p.set("lng", String(parsed.data.lng));
    }
    if (parsed.data.category) p.set("category", parsed.data.category);
    if (parsed.data.date) p.set("date", parsed.data.date);
    if (parsed.data.start) p.set("start", parsed.data.start);
    if (parsed.data.end) p.set("end", parsed.data.end);
    if (parsed.data.priceMax !== undefined) p.set("priceMax", String(parsed.data.priceMax));
    if (parsed.data.radius !== 10) p.set("radius", String(parsed.data.radius));
    if (sort !== "nearest") p.set("sort", sort);

    const qs = p.toString();
    router.push(qs ? `/?${qs}` : "/");
  });

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border bg-card p-3 shadow-raised sm:p-4"
      aria-label="Search for a space"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        {/* Location — reuse AddressAutocomplete verbatim (lifts {lat,lng} via onResolved). */}
        <div className="min-w-[220px] flex-1 space-y-1.5">
          <Label htmlFor="search-location">Where</Label>
          <AddressAutocomplete hasCoordinates={hasOrigin} onResolved={handleAddress} />
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-9 px-1.5 text-muted-foreground"
              onClick={useMyLocation}
            >
              <LocateFixedIcon className="size-4" /> Use my location
            </Button>
            {usedGeo && <span className="text-xs text-muted-foreground">Using your current location</span>}
          </div>
        </div>

        {/* Activity / type — ONE combined control merging both vocab label maps (D-35). */}
        <div className="space-y-1.5">
          <Label htmlFor="search-category">Activity or type</Label>
          <Select
            value={category || ANY}
            onValueChange={(val) => setValue("category", val === ANY ? "" : val)}
          >
            <SelectTrigger id="search-category" className="h-11 w-full min-w-[170px]">
              <SelectValue placeholder="Any type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any type</SelectItem>
              <SelectGroup>
                <SelectLabel>Space types</SelectLabel>
                {SPACE_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Activities</SelectLabel>
                {ACTIVITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Date + optional time. */}
        <div className="space-y-1.5">
          <Label htmlFor="search-date">When</Label>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                id="search-date"
                variant="outline"
                data-relaxed={relaxedAttr("date")}
                className={cn(
                  "h-11 w-full min-w-[150px] justify-start gap-2 font-normal",
                  relaxedTone("date"),
                )}
              >
                <CalendarIcon className="size-4 shrink-0" />
                <span className="truncate">
                  {selectedDate ? format(selectedDate, "EEE, MMM d") : "Any date"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => {
                  if (d) setValue("date", format(d, "yyyy-MM-dd"));
                  setDateOpen(false);
                }}
                disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
              />
              {date && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 w-full"
                  onClick={() => {
                    setValue("date", "");
                    setValue("start", "");
                    setValue("end", "");
                    setDateOpen(false);
                  }}
                >
                  Clear date
                </Button>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="search-start">From</Label>
          <Select
            value={start || ANY}
            onValueChange={(val) => setValue("start", val === ANY ? "" : val)}
            disabled={!date}
          >
            <SelectTrigger
              id="search-start"
              data-relaxed={relaxedAttr("time-of-day")}
              className={cn("h-11 w-full min-w-[110px]", relaxedTone("time-of-day"))}
            >
              <SelectValue placeholder="Any time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any time</SelectItem>
              {HOUR_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="search-end">To</Label>
          <Select
            value={end || ANY}
            onValueChange={(val) => setValue("end", val === ANY ? "" : val)}
            disabled={!date}
          >
            <SelectTrigger
              id="search-end"
              data-relaxed={relaxedAttr("time-of-day")}
              className={cn("h-11 w-full min-w-[110px]", relaxedTone("time-of-day"))}
            >
              <SelectValue placeholder="Any time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any time</SelectItem>
              {HOUR_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Price (max ₱/hr). */}
        <div className="space-y-1.5">
          <Label htmlFor="search-price">Price</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                id="search-price"
                variant="outline"
                data-relaxed={relaxedAttr("price")}
                className={cn(
                  "h-11 w-full min-w-[130px] justify-start font-normal",
                  relaxedTone("price"),
                )}
              >
                <span className="truncate">{priceLabel}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56">
              <Label htmlFor="search-price-max" className="text-xs text-muted-foreground">
                Max hourly price (₱)
              </Label>
              <Input
                id="search-price-max"
                type="number"
                inputMode="numeric"
                min={0}
                step={50}
                placeholder="Any"
                className="h-11"
                value={priceMax}
                onChange={(e) => setValue("priceMax", e.target.value)}
              />
              {priceMax.trim() !== "" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setValue("priceMax", "")}
                >
                  Clear price
                </Button>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Radius (applies only with an origin; presets 2/5/10/25, default 10). */}
        <div className="space-y-1.5">
          <Label htmlFor="search-radius">Within</Label>
          {/* ⚠ THIS IS "THE FILTER CHIP" AC#30 READS. Its `SelectValue` renders `{r} km`, and that
              rendered string is compared — both sides read from the DOM — against the band's
              changed-constraint value in `e2e/zero-result-relax.spec.ts`. A page whose control and
              whose results disagree is the failure D-53 exists to prevent, and this is where it is
              measured. */}
          <Select value={radius} onValueChange={(val) => setValue("radius", val)}>
            <SelectTrigger
              id="search-radius"
              data-relaxed={relaxedAttr("radius")}
              className={cn("h-11 w-full min-w-[110px]", relaxedTone("radius"))}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RADIUS_PRESETS.map((r) => (
                <SelectItem key={r} value={String(r)}>
                  {r} km
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* The one coral primary CTA. */}
        <div className="space-y-1.5">
          <span className="sr-only">
            <Label htmlFor="search-submit">Search</Label>
          </span>
          {/* D-22 — the 44px height is the named opt-in size, not a hand-rolled height class. The
              wider gap and padding are kept explicitly: this CTA sits at the end of a filter row and
              was already roomier than the size's own shape, and a class on the element wins the
              tailwind-merge, so the rendered control is unchanged. */}
          <Button
            id="search-submit"
            type="submit"
            variant="brand"
            size="touch"
            className="w-full gap-2 px-6 lg:w-auto"
          >
            <SearchIcon className="size-4" /> Search
          </Button>
        </div>
      </div>
    </form>
  );
}
