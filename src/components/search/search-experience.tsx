"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { AddressAutocomplete, type ResolvedAddress } from "@/components/listing/address-autocomplete";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ACTIVITY_TAGS, SPACE_TYPES } from "@/lib/listing-vocab";
import { searchParamsSchema } from "@/lib/validation/booking";

export type SearchAnswerKey = "activity" | "location" | "party";

export type SearchExperienceInitialAnswers = {
  category?: string;
  locationLabel?: string;
  lat?: number;
  lng?: number;
  partySize?: number;
};

type ActiveStep = "idle" | SearchAnswerKey;
type CatalogueOption = { value: string; label: string; group: "Activities" | "Space types" };

const CATALOGUE: readonly CatalogueOption[] = [
  ...ACTIVITY_TAGS.map((option) => ({ ...option, group: "Activities" as const })),
  ...SPACE_TYPES.map((option) => ({ ...option, group: "Space types" as const })),
];

function categoryLabel(category?: string) {
  return CATALOGUE.find((option) => option.value === category)?.label ?? "Activity";
}

function addressLabel(address: ResolvedAddress) {
  return [address.addressLine1, address.city, address.region, address.country].filter(Boolean).join(", ");
}

export function SearchExperience({
  initialAnswers,
  hasCompletedSearch,
  children,
}: {
  initialAnswers: SearchExperienceInitialAnswers;
  hasCompletedSearch: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState(initialAnswers);
  const [activeStep, setActiveStep] = useState<ActiveStep>(hasCompletedSearch ? "idle" : "idle");
  const [filter, setFilter] = useState("");
  const [progress, setProgress] = useState("");
  const stepHeading = useRef<HTMLHeadingElement>(null);

  const options = useMemo(() => {
    const query = filter.trim().toLocaleLowerCase();
    return query ? CATALOGUE.filter((option) => option.label.toLocaleLowerCase().includes(query)) : CATALOGUE;
  }, [filter]);

  useEffect(() => {
    if (activeStep !== "idle") stepHeading.current?.focus();
  }, [activeStep]);

  function chooseOption(option: CatalogueOption) {
    setAnswers((current) => ({ ...current, category: option.value }));
    setFilter(option.label);
    setActiveStep("location");
    setProgress("Choose a location.");
  }

  function resolveAddress(address: ResolvedAddress) {
    setAnswers((current) => ({
      ...current,
      lat: address.lat,
      lng: address.lng,
      locationLabel: addressLabel(address),
    }));
    setActiveStep("party");
    setProgress("Choose who is coming.");
  }

  function submitForMe() {
    const candidate = searchParamsSchema.safeParse({
      category: answers.category,
      lat: answers.lat,
      lng: answers.lng,
      locationLabel: answers.locationLabel,
      partySize: 1,
    });
    if (!candidate.success || candidate.data.category === undefined || candidate.data.lat === undefined || candidate.data.lng === undefined || candidate.data.locationLabel === undefined) {
      setActiveStep("activity");
      setProgress("Choose an activity, location, and party size to search.");
      return;
    }

    const query = new URLSearchParams();
    query.set("category", candidate.data.category);
    query.set("lat", String(candidate.data.lat));
    query.set("lng", String(candidate.data.lng));
    query.set("locationLabel", candidate.data.locationLabel);
    query.set("partySize", "1");
    router.push(`/?${query.toString()}`);
  }

  function edit(step: SearchAnswerKey) {
    setActiveStep(step);
    setProgress(`Editing ${step}.`);
    if (step === "activity") setFilter(categoryLabel(answers.category));
  }

  return (
    <section aria-label="Space search" className="space-y-4">
      <p role="status" aria-live="polite" aria-label="Search progress" className="sr-only">
        {progress}
      </p>

      {activeStep === "idle" && !hasCompletedSearch ? (
        <Button type="button" variant="outline" size="touch" className="w-full justify-between" onClick={() => { setActiveStep("activity"); setProgress("Choose an activity or space type."); }}>
          <span>Start your search</span>
          <span className="text-muted-foreground">Activity, location, and party</span>
        </Button>
      ) : null}

      {activeStep === "activity" ? (
        <div className="space-y-3 rounded-card border border-border bg-card p-4 shadow-card">
          <p className="text-label text-muted-foreground">Step 1 of 3</p>
          <h2 ref={stepHeading} tabIndex={-1} className="text-xl font-semibold outline-none">What are you looking for?</h2>
          <Command shouldFilter={false} className="rounded-md border">
            <CommandInput aria-label="Search for activity or type" value={filter} onValueChange={setFilter} placeholder="Search activities and space types" />
            <CommandList>
              {options.length === 0 ? <CommandEmpty>No matching activity or type</CommandEmpty> : null}
              {(["Activities", "Space types"] as const).map((group) => {
                const groupOptions = options.filter((option) => option.group === group);
                return groupOptions.length > 0 ? (
                  <CommandGroup key={group} heading={group}>
                    {groupOptions.map((option) => (
                      <CommandItem key={option.value} value={option.label} onSelect={() => chooseOption(option)}>{option.label}</CommandItem>
                    ))}
                  </CommandGroup>
                ) : null;
              })}
            </CommandList>
          </Command>
        </div>
      ) : null}

      {activeStep === "location" ? (
        <div className="space-y-3 rounded-card border border-border bg-card p-4 shadow-card">
          <p className="text-label text-muted-foreground">Step 2 of 3</p>
          <h2 ref={stepHeading} tabIndex={-1} className="text-xl font-semibold outline-none">Where do you want to play?</h2>
          <AddressAutocomplete audience="search" initialLabel={answers.locationLabel} hasCoordinates={answers.lat !== undefined && answers.lng !== undefined} onResolved={resolveAddress} />
        </div>
      ) : null}

      {activeStep === "party" ? (
        <div className="space-y-3 rounded-card border border-border bg-card p-4 shadow-card">
          <p className="text-label text-muted-foreground">Step 3 of 3</p>
          <h2 ref={stepHeading} tabIndex={-1} className="text-xl font-semibold outline-none">Who is this for?</h2>
          <Button type="button" variant="brand" size="touch" onClick={submitForMe}>For me</Button>
        </div>
      ) : null}

      {hasCompletedSearch ? (
        <div className="flex flex-wrap gap-2" aria-label="Search answers">
          <Button type="button" variant="outline" onClick={() => edit("activity")}>Activity: {categoryLabel(answers.category)}</Button>
          <Button type="button" variant="outline" onClick={() => edit("location")}>Location: {answers.locationLabel}</Button>
          <Button type="button" variant="outline" onClick={() => edit("party")}>{answers.partySize === 1 ? "1 person" : `${answers.partySize ?? 1} people`}</Button>
        </div>
      ) : null}

      {children}
    </section>
  );
}
