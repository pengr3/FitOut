"use client";

import type { RefObject } from "react";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ACTIVITY_TAGS, SPACE_TYPES } from "@/lib/listing-vocab";

export type CatalogueOption = { value: string; label: string; group: "Activities" | "Space types" };

export const CATALOGUE: readonly CatalogueOption[] = [
  ...ACTIVITY_TAGS.map((option) => ({ ...option, group: "Activities" as const })),
  ...SPACE_TYPES.map((option) => ({ ...option, group: "Space types" as const })),
];

export type ActivityStepProps = {
  filter: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onFilterChange: (value: string) => void;
  onSelect: (option: CatalogueOption) => void;
};

export function ActivityStep({ filter, headingRef, onFilterChange, onSelect }: ActivityStepProps) {
  const query = filter.trim().toLocaleLowerCase();
  const options = query ? CATALOGUE.filter((option) => option.label.toLocaleLowerCase().includes(query)) : CATALOGUE;

  return (
    <div className="space-y-3 rounded-card border border-border bg-card p-4 shadow-card">
      <p className="text-label text-muted-foreground">Step 1 of 3</p>
      <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">What are you looking for?</h2>
      <Command shouldFilter={false} className="rounded-md border">
        <CommandInput aria-label="Search for activity or type" value={filter} onValueChange={onFilterChange} placeholder="Search activities and space types" />
        <CommandList>
          {options.length === 0 ? <CommandEmpty>No matching activity or type</CommandEmpty> : null}
          {(["Activities", "Space types"] as const).map((group) => {
            const groupOptions = options.filter((option) => option.group === group);
            return groupOptions.length > 0 ? (
              <CommandGroup key={group} heading={group}>
                {groupOptions.map((option) => <CommandItem key={option.value} value={option.label} onSelect={() => onSelect(option)}>{option.label}</CommandItem>)}
              </CommandGroup>
            ) : null;
          })}
        </CommandList>
      </Command>
    </div>
  );
}
