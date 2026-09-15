"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { ActivityStep, CATALOGUE, type CatalogueOption } from "@/components/search/activity-step";
import { LocationStep } from "@/components/search/location-step";
import { PartyStep } from "@/components/search/party-step";
import { ProgressiveSearchOverlay } from "@/components/search/progressive-search-overlay";
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
  activeLocationAttempt?: number;
};

export type ProgressiveSearchEvent =
  | { type: "ENGAGE" }
  | { type: "SELECT_ACTIVITY"; option: CatalogueOption }
  | { type: "RESOLVE_LOCATION"; address: SearchExperienceInitialAnswers }
  | { type: "START_LOCATION_ATTEMPT"; attempt: number }
  | { type: "RESOLVE_BROWSER_LOCATION"; attempt: number; address: SearchExperienceInitialAnswers }
  | { type: "BROWSER_LOCATION_FAILURE"; attempt: number }
  | { type: "CHOOSE_SOLO" }
  | { type: "CHOOSE_GROUP"; partySize?: number }
  | { type: "BACK" }
  | { type: "EDIT"; step: SearchAnswerKey }
  | { type: "CORRECT_LOCATION" }
  | { type: "CANCEL" }
  | { type: "HYDRATE_RESULTS"; answers: SearchExperienceInitialAnswers };

function advance(state: ProgressiveSearchState, screen: SearchAnswerKey, answers: SearchExperienceInitialAnswers, progress: string): ProgressiveSearchState {
  return { ...state, screen, answers, history: [...state.history, state.screen], groupMode: false, progress, activeLocationAttempt: undefined };
}

export function progressiveSearchReducer(state: ProgressiveSearchState, event: ProgressiveSearchEvent): ProgressiveSearchState {
  switch (event.type) {
    case "ENGAGE":
      return advance(state, "activity", state.answers, "Choose an activity or space type.");
    case "SELECT_ACTIVITY":
      return advance(state, "location", { ...state.answers, category: event.option.value }, "Choose a location.");
    case "RESOLVE_LOCATION":
      return advance(state, "party", { ...state.answers, ...event.address }, "Choose who is coming.");
    case "START_LOCATION_ATTEMPT":
      return state.screen === "location" ? { ...state, activeLocationAttempt: event.attempt } : state;
    case "RESOLVE_BROWSER_LOCATION":
      return state.screen === "location" && state.activeLocationAttempt === event.attempt
        ? advance(state, "party", { ...state.answers, ...event.address }, "Choose who is coming.")
        : state;
    case "BROWSER_LOCATION_FAILURE":
      return state.screen === "location" && state.activeLocationAttempt === event.attempt
        ? { ...state, activeLocationAttempt: undefined, progress: "We couldn't get your location. Type an address instead." }
        : state;
    case "CHOOSE_SOLO":
      return { ...state, answers: { ...state.answers, partySize: 1 }, progress: "" };
    case "CHOOSE_GROUP":
      return event.partySize === undefined
        ? { ...state, groupMode: true }
        : { ...state, answers: { ...state.answers, partySize: event.partySize }, groupDraft: String(event.partySize), progress: "" };
    case "BACK": {
      const previous = state.history.at(-1) ?? "idle";
      return { ...state, screen: previous, history: state.history.slice(0, -1), groupMode: false, progress: "", activeLocationAttempt: undefined };
    }
    case "EDIT":
      return { ...state, screen: event.step, history: ["idle"], editOrigin: event.step, groupMode: false, progress: `Editing ${event.step}.`, activeLocationAttempt: undefined };
    case "CORRECT_LOCATION":
      return { ...state, screen: "location", history: ["idle"], editOrigin: "location", groupMode: false, progress: "Check your location and try again.", activeLocationAttempt: undefined };
    case "CANCEL":
      return { screen: "idle", answers: {}, history: [], groupDraft: "", groupMode: false, resultsVisible: false, progress: "", activeLocationAttempt: undefined };
    case "HYDRATE_RESULTS":
      return { ...state, screen: "idle", answers: event.answers, history: [], resultsVisible: true, progress: "", activeLocationAttempt: undefined };
  }
}

function categoryLabel(category?: string) {
  return CATALOGUE.find((option) => option.value === category)?.label ?? "Activity";
}

function addressLabel(address: ResolvedAddress) {
  return [address.addressLine1, address.city, address.region, address.country]
    .filter(Boolean)
    .join(", ")
    .trim()
    .slice(0, 120);
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
    activeLocationAttempt: undefined,
  };
}

export function SearchExperience({ initialAnswers, hasCompletedSearch, children }: {
  initialAnswers: SearchExperienceInitialAnswers;
  hasCompletedSearch: boolean;
  children: ReactNode;
}) {
  const canonicalSearchKey = JSON.stringify([
    hasCompletedSearch,
    initialAnswers.category,
    initialAnswers.locationLabel,
    initialAnswers.lat,
    initialAnswers.lng,
    initialAnswers.partySize,
  ]);

  return (
    <SearchExperienceCoordinator
      key={canonicalSearchKey}
      initialAnswers={initialAnswers}
      hasCompletedSearch={hasCompletedSearch}
    >
      {children}
    </SearchExperienceCoordinator>
  );
}

function SearchExperienceCoordinator({ initialAnswers, hasCompletedSearch, children }: {
  initialAnswers: SearchExperienceInitialAnswers;
  hasCompletedSearch: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState(() => initialState(initialAnswers, hasCompletedSearch));
  const [filter, setFilter] = useState("");
  const [returnFocus, setReturnFocus] = useState<HTMLElement | null>(null);
  const [desktopAnchor, setDesktopAnchor] = useState<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const locationAttemptRef = useRef(0);

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
      dispatch({ type: "CORRECT_LOCATION" });
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
    const attempt = locationAttemptRef.current + 1;
    locationAttemptRef.current = attempt;
    dispatch({ type: "START_LOCATION_ATTEMPT", attempt });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          dispatch({ type: "BROWSER_LOCATION_FAILURE", attempt });
          return;
        }
        dispatch({ type: "RESOLVE_BROWSER_LOCATION", attempt, address: { lat: latitude, lng: longitude, locationLabel: "Current location" } });
      },
      () => {
        dispatch({ type: "BROWSER_LOCATION_FAILURE", attempt });
      },
    );
  }

  function cancel() {
    dispatch({ type: "CANCEL" });
    setFilter("");
    router.push("/");
  }

  const answers = state.answers;
  const locationPending = state.activeLocationAttempt !== undefined;
  const locationChipLabel = answers.locationLabel?.trim() || "Selected location";
  const hasOpenQuestion = state.screen !== "idle";
  const questionContent = state.screen === "activity" ? (
    <ActivityStep filter={filter} headingRef={headingRef} onFilterChange={setFilter} onSelect={(option) => { setFilter(option.label); dispatch({ type: "SELECT_ACTIVITY", option }); }} />
  ) : state.screen === "location" ? (
    <LocationStep headingRef={headingRef} initialLabel={answers.locationLabel} hasCoordinates={answers.lat !== undefined && answers.lng !== undefined} locationPending={locationPending} onResolved={resolveAddress} onUseMyLocation={useMyLocation} />
  ) : state.screen === "party" ? (
    <PartyStep
      headingRef={headingRef}
      groupDraft={state.groupDraft}
      showGroupInput={state.groupMode}
      onChooseSolo={() => { dispatch({ type: "CHOOSE_SOLO" }); submitPartySize(1); }}
      onChooseGroup={() => dispatch({ type: "CHOOSE_GROUP" })}
      onGroupDraftChange={(groupDraft) => setState((current) => ({ ...current, groupDraft }))}
      onSubmitGroup={(partySize) => { dispatch({ type: "CHOOSE_GROUP", partySize }); submitPartySize(partySize); }}
    />
  ) : null;

  function editAnswer(step: SearchAnswerKey, trigger: HTMLElement) {
    setReturnFocus(trigger);
    setDesktopAnchor(trigger);
    if (step === "activity") setFilter(categoryLabel(answers.category));
    dispatch({ type: "EDIT", step });
  }

  return (
    <section aria-label="Space search" className="space-y-4">
      <p role="status" aria-live="polite" aria-label="Search progress" className="sr-only">{state.progress}</p>

      <ProgressiveSearchOverlay
        open={hasOpenQuestion}
        trigger={!state.resultsVisible ? (
          <Button type="button" variant="outline" size="touch" aria-label="Start your search" className="w-full justify-between" onClick={() => { if (!hasOpenQuestion) dispatch({ type: "ENGAGE" }); }}>
            <span>Start your search</span><span className="text-muted-foreground">Activity, location, and party</span>
          </Button>
        ) : undefined}
        desktopAnchor={desktopAnchor}
        returnFocus={returnFocus}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          headingRef.current?.focus();
        }}
        onDismiss={cancel}
      >
        {hasOpenQuestion ? (
          <div className="motion-reduce:transition-none transition duration-(--motion-base) ease-(--motion-ease-standard)">
            <div className="mb-2 flex justify-between gap-2">
              <Button type="button" variant="ghost" onClick={() => dispatch({ type: "BACK" })}>Back</Button>
              <Button type="button" variant="ghost" onClick={cancel}>Cancel</Button>
            </div>
            {questionContent}
          </div>
        ) : null}
      </ProgressiveSearchOverlay>
      {state.resultsVisible ? (
        <div className="flex flex-wrap gap-2" aria-label="Search answers">
          <Button type="button" variant="outline" onClick={(event) => editAnswer("activity", event.currentTarget)}>Activity: {categoryLabel(answers.category)}</Button>
          <Button type="button" variant="outline" onClick={(event) => editAnswer("location", event.currentTarget)}>Location: {locationChipLabel}</Button>
          <Button type="button" variant="outline" onClick={(event) => editAnswer("party", event.currentTarget)}>{answers.partySize === 1 ? "1 person" : `${answers.partySize ?? 1} people`}</Button>
        </div>
      ) : null}
      {children}
    </section>
  );
}
