# Phase 24: Search Bar Rework - Context

**Gathered:** 2026-09-15
**Status:** Ready for gap-closure planning

<domain>
## Phase Boundary

Replace FitOut's always-expanded public search controls with a compact, progressive search journey.
The idle home page begins with one search pill. A booker then chooses an activity or space type, a
location, and their party before results appear. The phase removes the exposed date/time, price, and
radius controls; it does not add date-specific availability to search, free-text search, NLP price
parsing, or a new booking flow.

</domain>

<decisions>
## Implementation Decisions

### Entry and step progression

- **D-01:** The idle invitation is a compact **search pill**, not an expanded form or a separate
  start button. It opens the progressive journey only after the booker engages.
- **D-02:** The journey has this fixed order: **activity/type → location → party size**. Each answer
  is retained when the booker goes Back or edits it from results; Cancel deliberately clears the
  in-progress search and restores the idle/browse state.
- **D-03:** Selecting an activity/type or resolving a location advances immediately to the next
  question. Selecting **For me** (one person) immediately runs the search; a group-size entry instead
  enables a final **See spaces** action once valid.

### Activity and location

- **D-04:** The first step exposes the full activity-and-space-type catalogue, with typing used only
  to filter that known catalogue. A booker must select an exact catalogue item to continue; if nothing
  matches, show a calm `No matching activity or type` state and wait for revised text. Never turn an
  unmatched term into a free-text query or an inferred filter.
- **D-05:** The location step provides both the existing address autocomplete and a **Use my location**
  action. Either a chosen address or a successfully resolved current location advances directly to
  party size.

### Party size and result handoff

- **D-06:** Party choice begins with **For me** or **For a group**. For a group, the booker enters the
  exact number of people; do not use party-size bands. The resulting server-side predicate filters out
  listings whose configured maximum capacity cannot hold that exact count. — **Reversibility:** costly
  — the party-size URL/query contract, server projection and result semantics must agree.
- **D-07:** Capacity is the only party-size authority in this phase. Do not promise remaining places
  for a drop-in space or add a date question; date-specific availability continues to be checked in
  the existing booking journey.
- **D-08:** Results show the selected activity/type, location, and party size as separate editable
  chips. The same direct-edit chips appear in a calm no-results state, so a booker can relax a specific
  answer without restarting. The legacy date/time, price, and radius controls and their exposed
  refinement surface are removed.

### Gap-closure presentation and geographic reach

- **D-09:** The progressive questions open in a floating search overlay anchored to the desktop search
  pill. On small screens it becomes a full-screen sheet. Opening a question must not push the home page
  or result content downward; the one-question-at-a-time sequence remains unchanged.
- **D-10:** A selected address or current location supplies the geographic origin, not a hard municipal
  boundary. Search retrieves listings within a fixed **25 km** Metro Manila reach and ranks the closest
  matches first. For example, a Mandaluyong search should show its nearest matches first while still
  allowing nearby Makati listings to follow naturally.
- **D-11:** The 25 km reach is a product default, not an exposed refinement control. Keep the radius
  picker removed and do not silently broaden results beyond that limit. Distance may inform ordering or
  presentation, but location coordinates remain the server-side authority.
- **D-12:** URL-backed search state must reverse-sync when navigation moves from a completed result
  URL back to the cold idle route. It must clear stale result answer chips without triggering lint
  violations, and the regression requires focused coverage.

### the agent's Discretion

- Choose the exact searchable-catalogue layout, copy, focus management, loading/error treatment and
  responsive transition details, while preserving one-question-at-a-time progression.
- Choose numeric-input affordances and safe validation bounds for group size, using the existing
  server validation/schema authorities rather than trusting client input.
- Preserve safe handling of legacy URL parameters and existing result/booking links where compatible,
  but do not reintroduce removed controls or imply date-specific availability.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase contract and validated interaction evidence

- `.planning/ROADMAP.md` § `Phase 24: Search Bar Rework` — phase goal, dependency and current
  boundary.
- `.planning/spikes/MANIFEST.md` § `progressive-search-flow` — locked spike requirements R1–R3;
  these Phase 24 decisions supersede the older deferred `search-front-door` preference to retain the
  old refinement controls.
- `.planning/spikes/007-progressive-search-prototype/README.md` — user-selected search pill,
  progressive order and correction behavior.
- `.planning/spikes/008-party-size-capacity-policy/README.md` — maximum-capacity-only policy and the
  explicit ban on a false remaining-places promise without a date.
- `.planning/spikes/009-progressive-journey-stress/README.md` — accepted desktop/375px Back, Edit,
  Cancel and compact result-handoff behavior.

### Existing search authorities

- `src/components/search/search-bar.tsx` — current all-controls client form, URL serialization,
  location handling and the legacy controls that this phase replaces.
- `src/components/listing/address-autocomplete.tsx` — reusable address resolution contract and
  accessible lookup feedback.
- `src/app/(public)/page.tsx` — public RSC search entry, validated URL read, result composition and
  current `SearchBar` integration point.
- `src/lib/validation/booking.ts` — untrusted search-parameter schema and the existing bounded
  validation pattern that the new party-size value must follow.
- `src/lib/search/query.ts` — server-side stage-one search and result projection; currently does not
  project `listing.maxOccupancy`, which the capacity predicate needs.
- `src/lib/db/schema.ts` — `listing.maxOccupancy` is the persisted maximum-capacity authority.
- `src/components/search/search-results.tsx` and `src/components/search/search-result-card.tsx` —
  result, empty-state, relaxation and card composition that must not claim capacity availability it
  did not check.

### Gap-closure evidence and geographic authorities

- `src/components/search/search-experience.tsx` — current progressive client state, inline question
  composition, and the completed-to-idle route synchronization gap.
- `src/lib/validation/booking.ts` — existing bounded `RADIUS_PRESETS` include 25 km and own trusted
  search-input normalization.
- `src/lib/search/query.ts` — PostGIS `ST_DWithin` and distance ranking implementation.
- `src/lib/db/schema.ts` — SRID 4326 `listing.location` point plus its GiST index; no schema migration
  is needed to use the approved reach.
- `24-REVIEW.md` and `24-VERIFICATION.md` — canonical evidence for the Back-navigation stale-chip and
  Phase 24 lint blockers this gap plan must close.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `AddressAutocomplete` already resolves an address to `{ lat, lng }`, provides lookup feedback and
  is the natural location-step input; `SearchBar` already contains the browser geolocation fallback
  and success/error copy pattern.
- `SPACE_TYPE_LABELS` and `ACTIVITY_TAG_LABELS` already feed the one combined activity/type control;
  they are the catalogue authority for the new searchable picker.
- `searchParamsSchema` and the public RSC's server-side revalidation form the existing safe URL-query
  contract; any party value must become part of that contract rather than client-only filtering.

### Established Patterns

- Search state is URL-backed and server-revalidated. The client form is a convenience, never the
  authority; Back/forward and shareable search behavior remain part of the experience.
- `searchListings` owns server-side predicates. `listing.maxOccupancy` is stored but is not currently
  projected into the search result row, while date-specific open-capacity `spots.remaining` only
  exists after the availability read model is invoked for a selected date.
- Existing zero-result relaxation is built around controls the phase removes. Its successor must be
  honest about what it changed and give the selected-answer chips, not resurrect hidden filters.
- Location matching already has persisted coordinates, a spatial index, and a distance query. The
  requested 25 km reach is a behavior/default change, not a new schema capability.

### Integration Points

- Replace the current `SearchBar` composition in `src/app/(public)/page.tsx` and rework its client
  state/URL serialization around the three chosen inputs.
- Extend the validated query and server search predicate with the party-size capacity condition; keep
  it server-side and ensure result cards do not overstate date-specific availability.
- Recompose ordinary and empty results around editable answer chips, including direct re-entry to the
  relevant progressive step.
- Recompose the question host as an overlay/sheet and preserve accessibility, focus restoration,
  reduced-motion behavior, and URL-driven Back/forward correctness.

</code_context>

<specifics>
## Specific Ideas

- The user experienced three interactive spikes before deciding. The winning direction is a small
  conversation, not a filter form: a compact pill, immediate transitions after confirmed answers and
  explicit recovery paths for correction.
- A group is a truthful, exact headcount rather than a loose range; `For me` is the one-person shortcut.
- Removing the old controls is deliberate. This phase must not compensate by silently parsing price,
  date or free-text intent from activity typing.
- "Mandaluyong first, nearby Makati too" is the ranking expectation: selected coordinates lead, and
  nearby municipal borders do not exclude otherwise reachable spaces.

</specifics>

<deferred>
## Deferred Ideas

- Date-aware party-size availability in search: it requires a selected date and belongs with a future
  search/availability expansion, not this three-question phase.
- Free-text search, fuzzy/inferred activity matching and natural-language price parsing: distinct
  search-discovery capabilities, explicitly excluded from the known-catalogue activity step.

### Reviewed Todos (not folded)

- **Ops staff management surface and invite flow**, **Phase 18 PM decision follow-through**, and
  **Reveal host contact details in ops queue** — automatic keyword matches only; all concern completed
  operations work and do not belong to public search.

</deferred>

---

*Phase: 24-search-bar-rework*
*Context gathered: 2026-09-14*
