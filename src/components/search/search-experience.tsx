"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { ActivityStep, CATALOGUE, type CatalogueOption } from "@/components/search/activity-step";
import { LocationStep } from "@/components/search/location-step";
import { PartyStep } from "@/components/search/party-step";
import type { ResolvedAddress } from "@/components/listing/address-autocomplete";
import { Button } from "@/components/ui/button";
import { searchParamsSchema } from "@/lib/validation/booking";

export type SearchAnswerKey = "activity" | "location" | "party";
export type ProgressiveSearchScreen = "idle" | SearchAnswerKey;

export type SearchExperienceInitialAnswers = {
  category?: string;
  locationLabel?: string;
  lat?: number;
  lng?: number;
  partySize?: number;
};

export type ProgressiveSearchState = {
  screen: ProgressiveSearchScreen;
  answers: SearchExperienceInitialAnswers;
  history: ProgressiveSearchScreen[];
  editOrigin?: SearchAnswerKey;
  groupDraft: string;
  groupMode: boolean;
  resultsVisible: boolean;
  progress: string;
};

export type ProgressiveSearchEvent =
  | { type: "ENGAGE" }
  | { type: "SELECT_ACTIVITY"; option: CatalogueOption }
  | { type: "RESOLVE_LOCATION"; address: SearchExperienceInitialAnswers }
  | { type: "CHOOSE_SOLO" }
  | { type: "CHOOSE_GROUP"; partySize?: number }
  | { type: "BACK" }
  | { type: "EDIT"; step: SearchAnswerKey }
  | { type: "CANCEL" }
  | { type: "HYDRATE_RESULTS"; answers: SearchExperienceInitialAnswers };

function advance(state: ProgressiveSearchState, screen: SearchAnswerKey, answers: SearchExperienceInitialAnswers, progress: string): ProgressiveSearchState {
  return { ...state, screen, answers, history: [...state.history, state.screen], groupMode: false, progress };
}

export function progressiveSearchReducer(state: ProgressiveSearchState, event: ProgressiveSearchEvent): ProgressiveSearchState {
  switch (event.type) {
    case "ENGAGE":
      return advance(state, "activity", state.answers, "Choose an activity or space type.");
    case "SELECT_ACTIVITY":
      return advance(state, "location", { ...state.answers, category: event.option.value }, "Choose a location.");
    case "RESOLVE_LOCATION":
      return advance(state, "party", { ...state.answers, ...event.address }, "Choose who is coming.");
    case "CHOOSE_SOLO":
      return { ...state, answers: { ...state.answers, partySize: 1 }, progress: "" };
    case "CHOOSE_GROUP":
      return event.partySize === undefined
        ? { ...state, groupMode: true }
        : { ...state, answers: { ...state.answers, partySize: event.partySize }, groupDraft: String(event.partySize), progress: "" };
    case "BACK": {
      const previous = state.history.at(-1) ?? "idle";
      return { ...state, screen: previous, history: state.history.slice(0, -1), groupMode: false, progress: "" };
    }
    case "EDIT":
      return { ...state, screen: event.step, history: ["idle"], editOrigin: event.step, groupMode: false, progress: `Editing ${event.step}.` };
    case "CANCEL":
      return { screen: "idle", answers: {}, history: [], groupDraft: "", groupMode: false, resultsVisible: false, progress: "" };
    case "HYDRATE_RESULTS":
      return { ...state, screen: "idle", answers: event.answers, history: [], resultsVisible: true, progress: "" };
  }
}

function categoryLabel(category?: string) {
  return CATALOGUE.find((option) => option.value === category)?.label ?? "Activity";
}

function addressLabel(address: ResolvedAddress) {
  return [address.addressLine1, address.city, address.region, address.country].filter(Boolean).join(", ");
}

function initialState(initialAnswers: SearchExperienceInitialAnswers, hasCompletedSearch: boolean): ProgressiveSearchState {
  return {
    screen: "idle",
    answers: initialAnswers,
    history: [],
    groupDraft: initialAnswers.partySize && initialAnswers.partySize > 1 ? String(initialAnswers.partySize) : "",
    groupMode: false,
    resultsVisible: hasCompletedSearch,
    progress: "",
  };
}

export function SearchExperience({ initialAnswers, hasCompletedSearch, children }: {
  initialAnswers: SearchExperienceInitialAnswers;
  hasCompletedSearch: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState(() => initialState(initialAnswers, hasCompletedSearch));
  const [filter, setFilter] = useState("");
  const [locationPending, setLocationPending] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (state.screen !== "idle") headingRef.current?.focus();
  }, [state.screen]);

  function dispatch(event: ProgressiveSearchEvent) {
    setState((current) => progressiveSearchReducer(current, event));
  }

  function submitPartySize(partySize: number) {
    const candidate = searchParamsSchema.safeParse({
      category: state.answers.category,
      lat: state.answers.lat,
      lng: state.answers.lng,
      locationLabel: state.answers.locationLabel,
      partySize,
    });
    if (!candidate.success || candidate.data.category === undefined || candidate.data.lat === undefined || candidate.data.lng === undefined || candidate.data.locationLabel === undefined) {
      dispatch({ type: "EDIT", step: "activity" });
      return;
    }
    const query = new URLSearchParams();
    query.set("category", candidate.data.category);
    query.set("lat", String(candidate.data.lat));
    query.set("lng", String(candidate.data.lng));
    query.set("locationLabel", candidate.data.locationLabel);
    query.set("partySize", String(partySize));
    router.push(`/?${query.toString()}`);
  }

  function resolveAddress(address: ResolvedAddress) {
    dispatch({ type: "RESOLVE_LOCATION", address: { lat: address.lat, lng: address.lng, locationLabel: addressLabel(address) } });
  }

  function useMyLocation() {
    if (!("geolocation" in navigator) || navigator.geolocation === undefined) {
      setState((current) => ({ ...current, progress: "Location is unavailable. Type an address instead." }));
      return;
    }
    setLocationPending(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationPending(false);
        dispatch({ type: "RESOLVE_LOCATION", address: { lat: position.coords.latitude, lng: position.coords.longitude, locationLabel: "Current location" } });
      },
      () => {
        setLocationPending(false);
        setState((current) => ({ ...current, progress: "We couldn't get your location. Type an address instead." }));
      },
    );
  }

  function cancel() {
    dispatch({ type: "CANCEL" });
    setFilter("");
    router.push("/");
  }

  const answers = state.answers;
  return (
    <section aria-label="Space search" className="space-y-4">
      <p role="status" aria-live="polite" aria-label="Search progress" className="sr-only">{state.progress}</p>

      {state.screen === "idle" && !state.resultsVisible ? (
        <Button type="button" variant="outline" size="touch" aria-label="Start your search" className="w-full justify-between" onClick={() => dispatch({ type: "ENGAGE" })}>
          <span>Start your search</span><span className="text-muted-foreground">Activity, location, and party</span>
        </Button>
      ) : null}
      {state.screen !== "idle" ? (
        <div className="flex justify-between gap-2">
          <Button type="button" variant="ghost" onClick={() => dispatch({ type: "BACK" })}>Back</Button>
          <Button type="button" variant="ghost" onClick={cancel}>Cancel</Button>
        </div>
      ) : null}
      {state.screen === "activity" ? (
        <ActivityStep filter={filter} headingRef={headingRef} onFilterChange={setFilter} onSelect={(option) => { setFilter(option.label); dispatch({ type: "SELECT_ACTIVITY", option }); }} />
      ) : null}
      {state.screen === "location" ? (
        <LocationStep headingRef={headingRef} initialLabel={answers.locationLabel} hasCoordinates={answers.lat !== undefined && answers.lng !== undefined} locationPending={locationPending} onResolved={resolveAddress} onUseMyLocation={useMyLocation} />
      ) : null}
      {state.screen === "party" ? (
        <PartyStep
          headingRef={headingRef}
          groupDraft={state.groupDraft}
          showGroupInput={state.groupMode}
          onChooseSolo={() => { dispatch({ type: "CHOOSE_SOLO" }); submitPartySize(1); }}
          onChooseGroup={() => dispatch({ type: "CHOOSE_GROUP" })}
          onGroupDraftChange={(groupDraft) => setState((current) => ({ ...current, groupDraft }))}
          onSubmitGroup={(partySize) => { dispatch({ type: "CHOOSE_GROUP", partySize }); submitPartySize(partySize); }}
        />
      ) : null}
      {state.resultsVisible ? (
        <div className="flex flex-wrap gap-2" aria-label="Search answers">
          <Button type="button" variant="outline" onClick={() => { setFilter(categoryLabel(answers.category)); dispatch({ type: "EDIT", step: "activity" }); }}>Activity: {categoryLabel(answers.category)}</Button>
          <Button type="button" variant="outline" onClick={() => dispatch({ type: "EDIT", step: "location" })}>Location: {answers.locationLabel}</Button>
          <Button type="button" variant="outline" onClick={() => dispatch({ type: "EDIT", step: "party" })}>{answers.partySize === 1 ? "1 person" : `${answers.partySize ?? 1} people`}</Button>
        </div>
      ) : null}
      {children}
    </section>
  );
}
