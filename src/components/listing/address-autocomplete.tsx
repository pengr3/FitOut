"use client";

// Address autocomplete (D-10 / D-18) — a command+popover combobox backed by Photon (Komoot), an
// OpenStreetMap-based geocoder that needs NO API key and bills nothing per keystroke (cost-disciplined
// for the single-city launch). Provider-agnostic (D-18): swap PROVIDER_URL for LocationIQ without
// touching the wizard, which only consumes the resolved structured address + lat/lng. On select it
// lifts { addressLine1, city, region, postalCode, country, neighborhood, lat, lng } up so Phase-4
// radius search is never blocked. The single-listing MAP render lives on the public page (Plan 05).
//
// NOTE: in dev the geocoder env may be a placeholder; this component degrades gracefully (it simply
// shows no suggestions) and never blocks the wizard. Automated tests do not depend on a live call.
//
// ── THE ANNOUNCEMENT BELOW THE FIELD (plan 14-14 · GATE-03) ───────────────────────────────────────
// This file was the LAST entry in `LIVE_REGION_EXCLUSIONS` (`src/lib/design/live-regions.ts`), and its
// stated reason named this phase: auditing a host surface early would have frozen markup this phase was
// about to rewrite. The audit is now done and the exclusion list is empty.
//
// What was wrong: ONE announcing element with no role and no accessible name, whose first-paint content
// was a STATIC HINT. That is a region announcing the empty string on arrival and then a hint nobody
// asked for — the same defect the availability calendar's busy plate was corrected for. The rule, in one
// sentence: a live region announces a CHANGE, and a freshly rendered page is not a change, it is a page.
//
// What it is now: the hint is a plain paragraph outside any region, read in document order like every
// other hint on the step; and ONE named region holds only the RESOLVED OUTCOME — located or failed,
// which are the two outcomes of one lookup and therefore share one region. It is declared as
// `address-lookup-result` in `live-regions.ts` and its name is declared beside it.
//
// ── AND THE SAME DEFECT CAME BACK THROUGH THE PROPS (code review WR-04, 24 August 2026) ───────────
// The discharge above was filed under the rationale *"EMPTY until a lookup resolves"*, and for a
// FRESH DRAFT it was. On an EDIT it was not: the region's located branch read `located`, which is
// `hasCoordinates || selectedLabel.length > 0`, and the wizard seeds BOTH from the stored listing. So
// on any edit of a listing that already had an address — most edits — the region mounted already
// carrying its sentence. Content at mount, from a prop: the announce-on-arrival shape this file was
// rewritten to remove, arriving a second time by a different route.
//
// The property was made TRUE rather than the reason edited to match it. The region's located branch
// now reads `outcome`, a value ONLY a resolution on this screen writes and no prop can seed; the
// already-located fact is a plain paragraph beside the hint, because it is a fact and not an
// announcement. The failure branch needed nothing: `error` was already written only by a lookup
// failing. Both branches are resolutions now; neither is a seed.
//
// It was also UNVERIFIED, which is why it survived a plan whose whole subject was this file: this
// component is `vi.mock`'d to `() => null` in all four wizard render tests, and
// `tests/design/live-regions.test.tsx` reads SOURCE through an AST walk and structurally cannot see a
// runtime value. `tests/listing/address-autocomplete.test.tsx` now mounts it for real and reads the
// region's text at mount with `hasCoordinates` both true and false.
//
// ⚠ NAMING DISCIPLINE, inherited from `wizard.tsx`'s rail comment. Nothing in this file's prose quotes
// the announcing attributes by their literal spelling; the gate that reads this tree counts regions per
// file off the markup, and a comment is textually indistinguishable from a call site to a text scan.
// Every such token below is named descriptively. Keep it that way when you edit this.

import { useEffect, useRef, useState } from "react";
import { MapPinIcon } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Photon (Komoot) — free OSM geocoder, no key. LocationIQ is the drop-in D-18 alternative:
//   const PROVIDER_URL = `https://api.locationiq.com/v1/autocomplete?key=${KEY}&q=`;
const PHOTON_URL = "https://photon.komoot.io/api";

/** The structured location the wizard stores (D-10). lat/lng are REQUIRED for a usable listing. */
export type ResolvedAddress = {
  addressLine1: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  neighborhood: string;
  lat: number;
  lng: number;
};

type PhotonFeature = {
  geometry: { coordinates: [number, number] } | null;
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    town?: string;
    village?: string;
    district?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

type Suggestion = ResolvedAddress & { id: string; label: string };

/**
 * THE LOOKUP REGION'S NAME, which is a different mechanism from its CONTENT.
 *
 * The status role is `nameFrom: author` in ARIA — an element carrying it takes NO name from its own
 * text — so without this attribute the region's accessible name is the empty string. That matters more
 * here than on a region that is always full: this one is EMPTY until a lookup resolves, and a region
 * named by text it does not yet have has no name at all for most of the step.
 *
 * ⚠ IT IS A LABEL, NOT A SECOND COPY OF THE SENTENCE, following `src/components/group/share-link-box.tsx`
 * and for the measured reason recorded there: on the VoiceOver/Safari pairing a NAMED live region can be
 * announced by its NAME INSTEAD OF ITS CONTENT, so a name that duplicated the sentence would read it
 * twice and a name that paraphrased it would replace it with a worse version. Two words that say which
 * region this is; the outcome stays the content.
 *
 * Hoisted to a module-level constant rather than inlined so that
 * `tests/design/live-regions.test.tsx` can resolve it to a string and check it against the value
 * recorded in the inventory — a name nothing can read is a name nothing can check.
 */
const LOOKUP_REGION_NAME = "Address lookup";

/**
 * The located OUTCOME's sentence, spelled once and rendered from two places.
 *
 * TWO PLACES, AND THE DIFFERENCE BETWEEN THEM IS THE WHOLE OF WR-04. The same words are either the
 * RESULT of a lookup this host just performed — in which case they belong in the region, because a
 * resolution is a change and a change is what a region is for — or they are a FACT about a listing
 * that was already located before this screen was opened, in which case they are a hint like any other
 * and belong in document order outside any region. One constant, so the two can never say it
 * differently; two elements, because they are two different claims.
 */
const LOCATED_SENTENCE =
  "Location set. Guests see an approximate area until you choose to show the exact address.";

/** Map a Photon GeoJSON feature to a structured suggestion, or null if it has no coordinates. */
function toSuggestion(f: PhotonFeature, i: number): Suggestion | null {
  const coords = f.geometry?.coordinates;
  if (!coords || coords.length !== 2) return null; // no coordinates — unusable (D-10)
  // Photon/GeoJSON order is [lng, lat] — keep the axes straight (Pitfall 1).
  const [lng, lat] = coords;
  const p = f.properties;
  const line1 = [p.housenumber, p.street].filter(Boolean).join(" ") || p.name || "";
  // City-level picks (e.g. "Mandaluyong") return the name in `name` with `city` empty — fall back to
  // it so the required `city` field is populated (UAT: publish dead-end when city stayed blank).
  const city = p.city || p.town || p.village || p.name || "";
  const neighborhood = p.district || p.suburb || p.name || "";
  const label = [line1 || p.name, city, p.state, p.country].filter(Boolean).join(", ");
  return {
    id: `${label}-${i}`,
    label,
    addressLine1: line1,
    city,
    region: p.state || "",
    postalCode: p.postcode || "",
    country: p.country || "",
    neighborhood,
    lat,
    lng,
  };
}

export function AddressAutocomplete({
  initialLabel,
  hasCoordinates,
  onResolved,
  audience = "host",
}: {
  initialLabel?: string;
  hasCoordinates?: boolean;
  onResolved: (addr: ResolvedAddress) => void;
  /** Host copy remains the default; public search uses booker-facing guidance. */
  audience?: "host" | "search";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState(initialLabel ?? "");
  /**
   * WHAT A LOOKUP RESOLVED TO ON THIS SCREEN, and `null` until one has (WR-04).
   *
   * ⚠ IT IS SEEDED FROM NOTHING, ON PURPOSE, AND THAT IS THE ENTIRE POINT OF ITS EXISTENCE. Every
   * other piece of state in this component can arrive pre-filled from the listing being edited —
   * `selectedLabel` takes `initialLabel`, and the caller also passes `hasCoordinates` off the stored
   * lat/lng. `located` below is therefore TRUE at first paint on any edit of a listing that already
   * has an address, which is most edits.
   *
   * The region's discharge (plan 14-14) is filed under the rationale *"empty until a lookup
   * resolves"*, and while the region's content was driven by `located` that sentence was FALSE on
   * exactly that path: the region mounted already carrying the located outcome — content present at
   * mount, which is the announce-on-arrival shape the discharge says it removed. A declared reason the
   * code does not keep is the failure this phase's whole live-region pass exists to end, so the code
   * was changed to keep it rather than the reason edited to match.
   *
   * `error` is the other half and needed no change: it is already written only by a lookup failing,
   * never by a prop. So both of the region's branches are now resolutions and neither is a seed.
   */
  const [outcome, setOutcome] = useState<"located" | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // A query under 3 chars has nothing to look up. This is DERIVED at render (see `visibleResults` /
  // `showLoading` below) rather than pushed into state inside the effect — clearing results and
  // stopping the spinner synchronously in an effect body triggers cascading renders
  // (react-hooks/set-state-in-effect). Deriving keeps the exact same behaviour: a short query shows
  // no suggestions and no spinner, without an extra render pass.
  const isQueryTooShort = query.trim().length < 3;

  // Debounced Photon lookup (250ms) — never one request per keystroke (D-18 cost discipline).
  // The effect body performs NO synchronous setState (react-hooks/set-state-in-effect): the spinner is
  // switched on in the input handler (`handleQueryChange`, an event handler where setState is fine), and
  // every other transition happens inside the async debounce callback below. The effect's sole job is to
  // schedule the debounced fetch and abort the prior one — the external-system sync the rule expects.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) return; // nothing to fetch; the short-query empty/idle state is derived at render
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`${PHOTON_URL}?q=${encodeURIComponent(q)}&limit=6`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("geocoder");
        const data = (await res.json()) as { features?: PhotonFeature[] };
        setResults(
          (data.features ?? [])
            .map(toSuggestion)
            .filter((s): s is Suggestion => s !== null),
        );
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setResults([]);
          setError("We couldn't reach address search. Type your address and try again.");
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Query changes drive both the debounce effect and the immediate UI feedback. Initialising the
  // loading/error state here (an event handler) rather than inside the effect keeps the effect body
  // free of synchronous setState while preserving behaviour: the spinner appears the instant a ≥3-char
  // query is entered (through the 250ms debounce), and a fresh search clears any prior error.
  function handleQueryChange(next: string) {
    setQuery(next);
    const willSearch = next.trim().length >= 3;
    setLoading(willSearch);
    if (willSearch) setError(null);
  }

  function handleSelect(s: Suggestion) {
    // Enforce the D-10 invariant at the UI edge: a pick with no coordinates is not acceptable.
    if (typeof s.lat !== "number" || typeof s.lng !== "number") {
      setError(
        "We couldn't find that address. Pick a suggestion from the list so guests can find you.",
      );
      return;
    }
    setSelectedLabel(s.label);
    setError(null);
    // THE ONLY WRITER (WR-04). A resolution happened on this screen, so the region has something to
    // announce; nothing else in this file may set this, and no prop may seed it.
    setOutcome("located");
    onResolved({
      addressLine1: s.addressLine1,
      city: s.city,
      region: s.region,
      postalCode: s.postalCode,
      country: s.country,
      neighborhood: s.neighborhood,
      lat: s.lat,
      lng: s.lng,
    });
    setOpen(false);
  }

  // Short query ⇒ no suggestions, no spinner (the effect never fetches for it). Deriving these avoids
  // clearing state inside the effect while preserving the exact rendered behaviour.
  const visibleResults = isQueryTooShort ? [] : results;
  const showLoading = !isQueryTooShort && loading;

  const located = Boolean(hasCoordinates) || selectedLabel.length > 0;
  const isSearchAudience = audience === "search";
  const triggerCopy = isSearchAudience ? "Search for your address" : "Search for your address";
  const inputCopy = isSearchAudience ? "Type a street or city…" : "Start typing a street, city…";
  const emptyCopy = isSearchAudience ? "No matching addresses. Try another street or city." : "No matches yet. Keep typing.";
  const hintCopy = isSearchAudience
    ? "Choose an address suggestion to search nearby spaces."
    : "Pick a suggestion so we can place you on the map.";

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={triggerCopy}
            className={cn(
              "w-full justify-start gap-2 font-normal",
              !selectedLabel && "text-muted-foreground",
            )}
          >
            <MapPinIcon className="size-4 shrink-0" />
            <span className="truncate">{selectedLabel || triggerCopy}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) p-0"
        >
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={handleQueryChange}
              placeholder={inputCopy}
            />
            <CommandList>
              {showLoading && (
                <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
              )}
              {!showLoading && query.trim().length >= 3 && visibleResults.length === 0 && (
                <CommandEmpty>{emptyCopy}</CommandEmpty>
              )}
              <CommandGroup>
                {visibleResults.map((s) => (
                  <CommandItem key={s.id} value={s.id} onSelect={() => handleSelect(s)}>
                    <MapPinIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{s.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* THE STATIC HINT, OUTSIDE ANY REGION — this is the discharge. It is present from first paint,
          so a screen reader reads it in document order like every other hint on the step. Inside a
          region it announced nothing useful on arrival and then a hint nobody had asked for. It is
          rendered only while nothing has resolved, so it is never on screen beside the outcome that
          supersedes it, and its appearance and disappearance announce nothing because it is not a
          region and is not inside one. */}
      {!located && error === null ? (
        <p className="text-label text-muted-foreground">
          {hintCopy}
        </p>
      ) : null}

      {/* THE ALREADY-LOCATED FACT, OUTSIDE ANY REGION (WR-04) — the second half of the same rule the
          hint above is the first half of.

          A listing being edited may already have an address, and saying so is useful. But it is not
          an ANNOUNCEMENT: nothing happened, the host simply opened the step. Rendered inside the
          region it was content present at first paint, which is the announce-on-arrival shape the
          discharge above claims to have removed — the defect arriving a second time through the props
          instead of through a static hint.

          It is therefore a plain paragraph, read in document order like every other hint on the step,
          and it stands down the moment a lookup on THIS screen resolves, so the sentence is never on
          screen twice. The words are the same constant either way. */}
      {located && outcome === null && error === null ? (
        <p className="text-label text-muted-foreground">{LOCATED_SENTENCE}</p>
      ) : null}

      {/* ONE REGION FOR ONE ACTION, holding only the RESOLVED OUTCOME. The located outcome and the
          failure outcome are the two outcomes of a single lookup, so they share a single region — two
          regions for one outcome is the defect, not the thoroughness.

          ALWAYS MOUNTED, TEXT EMPTY UNTIL A LOOKUP RESOLVES: an element that comes and goes is a
          different region to assistive technology each time, and its text changing in place is what
          makes one lookup one announcement. The politeness attribute is redundant beside the role,
          which is already implicitly polite, and is kept for the reason `slot-picker.tsx`'s gap hint
          keeps its own — rewriting shipped, correct markup to remove a harmless attribute is churn.

          ⚠ BOTH BRANCHES ARE RESOLUTIONS, AND NEITHER IS A SEED (WR-04). The located branch reads
          `outcome`, which only `handleSelect` writes, and NOT `located`, which is true at first paint
          on any edit of a listing that already has an address. Driven by `located` this region opened
          with its text already in it on most edits — content at mount, from a prop, which is the one
          shape the discharge above says it removed. Do not re-point either branch at a value a prop
          can seed; the already-located fact has its own paragraph above.

          The failure branch keeps the declared alarm ink it already carried; that occurrence is
          pre-existing and is deliberately unchanged. */}
      <p
        role="status"
        aria-live="polite"
        aria-label={LOOKUP_REGION_NAME}
        className="text-label"
      >
        {error !== null ? (
          <span className="text-destructive">{error}</span>
        ) : outcome === "located" ? (
          <span className="text-muted-foreground">{LOCATED_SENTENCE}</span>
        ) : null}
      </p>
    </div>
  );
}
