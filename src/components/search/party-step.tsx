"use client";

import type { RefObject } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_OPEN_CAPACITY } from "@/lib/validation/listing";

export function parseGroupPartySize(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed >= 2 && parsed <= MAX_OPEN_CAPACITY ? parsed : null;
}

export type PartyStepProps = {
  headingRef: RefObject<HTMLHeadingElement | null>;
  groupDraft: string;
  showGroupInput: boolean;
  onChooseSolo: () => void;
  onChooseGroup: () => void;
  onGroupDraftChange: (value: string) => void;
  onSubmitGroup: (value: number) => void;
};

export function PartyStep({ headingRef, groupDraft, showGroupInput, onChooseSolo, onChooseGroup, onGroupDraftChange, onSubmitGroup }: PartyStepProps) {
  const partySize = parseGroupPartySize(groupDraft);
  return (
    <div className="mx-auto w-full space-y-3 rounded-card border border-border bg-card p-4 shadow-card sm:max-w-md sm:min-w-96 sm:p-5">
      <p className="text-label text-muted-foreground">Step 3 of 3</p>
      <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">Who is this for?</h2>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="brand" size="touch" onClick={onChooseSolo}>For me</Button>
        <Button type="button" variant="outline" size="touch" onClick={onChooseGroup}>For a group</Button>
      </div>
      {showGroupInput ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid w-full gap-1 text-sm font-medium sm:w-auto" htmlFor="group-party-size">Number of people
            <Input id="group-party-size" type="number" inputMode="numeric" min={2} max={MAX_OPEN_CAPACITY} value={groupDraft} onChange={(event) => onGroupDraftChange(event.target.value)} />
          </label>
          <Button type="button" variant="brand" size="touch" className="w-full sm:w-auto" disabled={partySize === null} onClick={() => partySize !== null && onSubmitGroup(partySize)}>See spaces</Button>
        </div>
      ) : null}
    </div>
  );
}
