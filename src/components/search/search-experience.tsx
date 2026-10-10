"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { ActivityStep, CATALOGUE, type CatalogueOption } from "@/components/search/activity-step";
import { LocationStep } from "@/components/search/location-step";
import { PartyStep } from "@/components/search/party-step";
import { ProgressiveSearchOverlay } from "@/components/search/progressive-search-overlay";
import type { ResolvedAddress } from "@/components/listing/address-autocomplete";
import { Button } from "@/components/ui/button";
import { SEARCH_BAR_SHELL_MIN_HEIGHT } from "@/lib/design/measurements";
import { searchParamsSchema } from "@/lib/validation/booking";

const subscribeHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

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

function answersKey(answers: SearchExperienceInitialAnswers, hasCompletedSearch: boolean): string {
  return JSON.stringify([
    hasCompletedSearch,
    answers.category,
    answers.locationLabel,
    answers.lat,
    answers.lng,
    answers.partySize,
  ]);
}

export function SearchExperience({ initialAnswers, hasCompletedSearch, children }: {
  initialAnswers: SearchExperienceInitialAnswers;
  hasCompletedSearch: boolean;
  children: ReactNode;
}) {
  const canonicalSearchKey = answersKey(initialAnswers, hasCompletedSearch);

  return (
    <SearchExperienceCoordinator
      canonicalSearchKey={canonicalSearchKey}
      initialAnswers={initialAnswers}
      hasCompletedSearch={hasCompletedSearch}
    >
      {children}
    </SearchExperienceCoordinator>
  );
}

function SearchExperienceCoordinator({ canonicalSearchKey, initialAnswers, hasCompletedSearch, children }: {
  canonicalSearchKey: string;
  initialAnswers: SearchExperienceInitialAnswers;
  hasCompletedSearch: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydrated, serverHydrated);
  const [state, setState] = useState(() => initialState(initialAnswers, hasCompletedSearch));
  const [filter, setFilter] = useState("");
  const [returnFocus, setReturnFocus] = useState<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const locationAttemptRef = useRef(0);
  const syncedSearchKeyRef = useRef(canonicalSearchKey);
  const submittedSearchKeysRef = useRef<string[]>([]);

  useEffect(() => {
    if (syncedSearchKeyRef.current === canonicalSearchKey) return;
    syncedSearchKeyRef.current = canonicalSearchKey;
    // A search we just submitted already updated local answers. Keep a field the visitor opened
    // while the RSC result was in flight; remounting here used to close it and lose the next click.
    const submittedIndex = submittedSearchKeysRef.current.indexOf(canonicalSearchKey);
    if (submittedIndex !== -1) {
      // A newer search result may arrive before an older one. Retire every submission through
      // this URL so a later Back navigation cannot be mistaken for an in-flight submission.
      submittedSearchKeysRef.current.splice(0, submittedIndex + 1);
      return;
    }
    submittedSearchKeysRef.current.length = 0;
    locationAttemptRef.current += 1;
    setState(initialState(initialAnswers, hasCompletedSearch));
    setFilter("");
  }, [canonicalSearchKey, initialAnswers, hasCompletedSearch]);

  useEffect(() => {
    if (state.screen !== "idle") headingRef.current?.focus();
  }, [state.screen]);

  function dispatch(event: ProgressiveSearchEvent) {
    setState((current) => progressiveSearchReducer(current, event));
  }

  function submitAnswers(nextAnswers: SearchExperienceInitialAnswers) {
    locationAttemptRef.current += 1;
    const candidate = searchParamsSchema.safeParse({
      category: nextAnswers.category,
      lat: nextAnswers.lat,
      lng: nextAnswers.lng,
      locationLabel: nextAnswers.locationLabel,
      partySize: nextAnswers.partySize,
    });
    if (!candidate.success) return;
    const query = new URLSearchParams();
    if (candidate.data.category) query.set("category", candidate.data.category);
    if (candidate.data.lat !== undefined && candidate.data.lng !== undefined) {
      query.set("lat", String(candidate.data.lat));
      query.set("lng", String(candidate.data.lng));
    }
    if (candidate.data.locationLabel) query.set("locationLabel", candidate.data.locationLabel);
    if (candidate.data.partySize !== undefined) query.set("partySize", String(candidate.data.partySize));
    submittedSearchKeysRef.current.push(answersKey(candidate.data, true));
    setState((current) => ({ ...current, screen: "idle", answers: nextAnswers, resultsVisible: true }));
    router.push(`/?${query.toString()}`);
  }

  function resolveAddress(address: ResolvedAddress) {
    submitAnswers({ ...state.answers, lat: address.lat, lng: address.lng, locationLabel: addressLabel(address) });
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
        if (attempt !== locationAttemptRef.current) return;
        const { latitude, longitude } = position.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          dispatch({ type: "BROWSER_LOCATION_FAILURE", attempt });
          return;
        }
        submitAnswers({ ...state.answers, lat: latitude, lng: longitude, locationLabel: "Current location" });
      },
      () => {
        if (attempt === locationAttemptRef.current) dispatch({ type: "BROWSER_LOCATION_FAILURE", attempt });
      },
    );
  }

  function cancel() {
    locationAttemptRef.current += 1;
    setState((current) => ({ ...current, screen: "idle", groupMode: false, progress: "", activeLocationAttempt: undefined }));
    setFilter("");
  }

  const answers = state.answers;
  const locationPending = state.activeLocationAttempt !== undefined;
  const hasOpenQuestion = state.screen !== "idle";
  const desktopPresentation = state.screen === "party" ? "compact" : "standard";
  const questionContent = state.screen === "activity" ? (
    <ActivityStep filter={filter} headingRef={headingRef} onFilterChange={setFilter} onSelect={(option) => { setFilter(option.label); submitAnswers({ ...answers, category: option.value }); }} />
  ) : state.screen === "location" ? (
    <LocationStep headingRef={headingRef} initialLabel={answers.locationLabel} hasCoordinates={answers.lat !== undefined && answers.lng !== undefined} locationPending={locationPending} onResolved={resolveAddress} onUseMyLocation={useMyLocation} />
  ) : state.screen === "party" ? (
    <PartyStep
      headingRef={headingRef}
      groupDraft={state.groupDraft}
      showGroupInput={state.groupMode}
      onChooseSolo={() => submitAnswers({ ...answers, partySize: 1 })}
      onChooseGroup={() => dispatch({ type: "CHOOSE_GROUP" })}
      onGroupDraftChange={(groupDraft) => setState((current) => ({ ...current, groupDraft }))}
      onSubmitGroup={(partySize) => submitAnswers({ ...answers, partySize })}
    />
  ) : null;

  function editAnswer(step: SearchAnswerKey, trigger: HTMLElement) {
    setReturnFocus(trigger);
    if (step === "activity") setFilter(answers.category ? categoryLabel(answers.category) : "");
    dispatch({ type: "EDIT", step });
  }

  return (
    <section aria-label="Space search" className="space-y-4">
      <p role="status" aria-live="polite" aria-label="Search progress" className="sr-only">{state.progress}</p>

      <div className={`grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-2 sm:mx-auto sm:max-w-3xl ${SEARCH_BAR_SHELL_MIN_HEIGHT}`} role="group" aria-label="Search spaces">
        <Button disabled={!hydrated} type="button" variant="ghost" aria-label="Search activity" className="h-auto min-h-14 flex-col items-start rounded-xl px-3 text-left" onClick={(event) => editAnswer("activity", event.currentTarget)}>
          <span className="text-xs font-semibold">Activity</span><span className="max-w-full truncate text-sm text-muted-foreground">{answers.category ? categoryLabel(answers.category) : "Any activity"}</span>
        </Button>
        <Button disabled={!hydrated} type="button" variant="ghost" aria-label="Search location" className="h-auto min-h-14 flex-col items-start rounded-xl px-3 text-left" onClick={(event) => editAnswer("location", event.currentTarget)}>
          <span className="text-xs font-semibold">Location</span><span className="max-w-full truncate text-sm text-muted-foreground">{answers.locationLabel || (answers.lat !== undefined && answers.lng !== undefined ? "Selected location" : "Any location")}</span>
        </Button>
        <Button disabled={!hydrated} type="button" variant="ghost" aria-label="Search party size" className="h-auto min-h-14 flex-col items-start rounded-xl px-3 text-left" onClick={(event) => editAnswer("party", event.currentTarget)}>
          <span className="text-xs font-semibold">People</span><span className="max-w-full truncate text-sm text-muted-foreground">{answers.partySize ? `${answers.partySize} ${answers.partySize === 1 ? "person" : "people"}` : "Any group"}</span>
        </Button>
      </div>

      <ProgressiveSearchOverlay
        open={hasOpenQuestion}
        returnFocus={returnFocus}
        desktopPresentation={desktopPresentation}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          headingRef.current?.focus();
        }}
        onDismiss={cancel}
      >
        {hasOpenQuestion ? (
          <div className="flex min-h-[calc(100dvh-2rem)] flex-col motion-reduce:transition-none transition duration-(--motion-base) ease-(--motion-ease-standard) sm:min-h-0">
            <div className="order-1 sm:order-2">
              {questionContent}
            </div>
            <div role="group" aria-label="Search journey actions" className="order-2 flex justify-between gap-2 max-sm:-mx-4 max-sm:-mb-4 max-sm:mt-auto max-sm:border-t max-sm:border-border max-sm:bg-card max-sm:p-4 sm:order-1 sm:mb-2">
              <span className="text-sm text-muted-foreground">Search with any one field</span>
              <Button disabled={!hydrated} type="button" variant="ghost" onClick={cancel}>Cancel</Button>
            </div>
          </div>
        ) : null}
      </ProgressiveSearchOverlay>
      {children}
    </section>
  );
}
