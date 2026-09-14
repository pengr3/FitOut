# Phase 24: Search Bar Rework - Research

**Researched:** 2026-09-14
**Domain:** Progressive public search, URL contracts, server-side capacity filtering, and accessible multi-step interaction
**Confidence:** HIGH for repository architecture and contracts; MEDIUM for externally sourced interaction guidance

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### Codex's Discretion

- Choose the exact searchable-catalogue layout, copy, focus management, loading/error treatment and
  responsive transition details, while preserving one-question-at-a-time progression.
- Choose numeric-input affordances and safe validation bounds for group size, using the existing
  server validation/schema authorities rather than trusting client input.
- Preserve safe handling of legacy URL parameters and existing result/booking links where compatible,
  but do not reintroduce removed controls or imply date-specific availability.

### Deferred Ideas (OUT OF SCOPE)

- Date-aware party-size availability in search: it requires a selected date and belongs with a future
  search/availability expansion, not this three-question phase.
- Free-text search, fuzzy/inferred activity matching and natural-language price parsing: distinct
  search-discovery capabilities, explicitly excluded from the known-catalogue activity step.

### Reviewed Todos (not folded)

- **Ops staff management surface and invite flow**, **Phase 18 PM decision follow-through**, and
  **Reveal host contact details in ops queue** — automatic keyword matches only; all concern completed
  operations work and do not belong to public search.
</user_constraints>

## Project Constraints (from AGENTS.md)

- The repository directive is: “This is NOT the Next.js you know”. Before any Next.js implementation, agents must read the relevant guide under `node_modules/next/dist/docs/`, because this installed version can differ in APIs, conventions, and file structure, and deprecation notices must be followed. [VERIFIED: AGENTS.md:1-5]
- Phase planning must therefore cite the bundled Next.js 16.2.7 guides rather than rely on remembered App Router behavior. The installed package declares `"version": "16.2.7"`. [VERIFIED: node_modules/next/package.json:2-3]

## Summary

This phase should be planned as one coordinated contract change across the public route, client interaction state, validated URL schema, SQL predicate, result/empty-state composition, loading shell, and search test suite. The public page already revalidates URL input on the server and owns database fetching, while the current `SearchBar` owns browser interactions and navigation. Preserve that authority split: keep URL parsing and search execution in the Server Component/backend, and make the new client component a narrow state machine that only collects confirmed catalogue, location, and party answers. [VERIFIED: src/app/(public)/page.tsx:68-99] [VERIFIED: src/components/search/search-bar.tsx:137-256] [CITED: https://nextjs.org/docs/app/getting-started/server-and-client-components]

Use the URL key `partySize` as an optional, coerced integer for safe legacy/browse URLs, bounded from 1 through the existing shared `MAX_OPEN_CAPACITY`. That authority is quoted verbatim as `export const MAX_OPEN_CAPACITY = 1_000;`. [VERIFIED: src/lib/validation/listing.ts:93-105] A completed new journey always emits the key (`For me` emits `1`); the backend applies `l.max_occupancy >= partySize` in the first-stage SQL query. The predicate does **not** require adding capacity to the result projection: SQL may filter on a column that it does not return, and the UI has no requirement to reveal capacity. Avoiding that projection also prevents the result model from becoming a misleading availability surface. [CITED: https://orm.drizzle.team/docs/operators] [VERIFIED: src/lib/search/query.ts:213-281]

The old zero-result relaxation ladder and exposed radius/date/time/price flow conflict with D-08. Plan a usage census and remove their public-route invocation, UI, snapshots, and obsolete tests. Keep parsing safe legacy keys only where another existing link still needs compatibility; do not let removed URL keys invisibly alter `/` results. The page currently calculates relaxation candidates and the empty state currently offers `Broaden radius`, `Clear filters`, and `Show nearby spaces`, so this is an explicit replacement rather than a CSS-only rework. [VERIFIED: src/app/(public)/page.tsx:122-164] [VERIFIED: src/components/search/search-results.tsx:315-360]

**Primary recommendation:** Build a URL-backed, explicit three-step client state machine around the existing catalogue and address resolver; validate `partySize` server-side; enforce capacity in stage-one SQL; then replace all result and empty-state refinement affordances with the same three editable answer chips.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Idle pill and one-question-at-a-time journey | Browser / Client | Frontend Server (SSR) | React state, focus, transitions, geolocation, and click handling need a Client Component; the route supplies initial URL-backed answers. [CITED: https://nextjs.org/docs/app/getting-started/server-and-client-components] |
| Catalogue filtering and exact selection | Browser / Client | — | The known catalogue is already a local typed vocabulary; filtering can be deterministic and requires no request. [VERIFIED: src/lib/listing-vocab.ts:18-63] |
| Address lookup and coordinate resolution | Browser / Client | External Photon service | The existing component debounces a Photon request and returns a structured resolved address to its parent. [VERIFIED: src/components/listing/address-autocomplete.tsx:67-81] [VERIFIED: src/components/listing/address-autocomplete.tsx:199-275] |
| Current-location resolution | Browser / Client | Browser geolocation API | Existing search code already requests browser coordinates and reports permission/failure states. [VERIFIED: src/components/search/search-bar.tsx:187-206] |
| Search URL validation | Frontend Server (SSR) | API / Backend | The page receives async `searchParams` and validates them before search execution. [VERIFIED: src/app/(public)/page.tsx:68-99] [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/page] |
| Exact party capacity enforcement | Database / Storage | API / Backend | Capacity must be part of the parameterized stage-one query so the browser cannot bypass it. [VERIFIED: src/lib/search/query.ts:213-281] |
| Result and no-result edit chips | Browser / Client | Frontend Server (SSR) | Results are fetched by the route; the existing result shell is already a Client Component and can invoke the shared journey coordinator for direct edits. [VERIFIED: src/components/search/search-results.tsx:1-120] |
| Date-specific remaining-place checks | Existing booking/availability path | — | Explicitly out of scope; `spots` is only populated by the date-aware second stage. [VERIFIED: src/lib/search/query.ts:293-338] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard Here |
|---|---:|---|---|
| Next.js | 16.2.7 | App Router route, async URL input, Server/Client boundary, navigation | Already installed and owns the page contract; package source says `"version": "16.2.7"`. [VERIFIED: node_modules/next/package.json:2-3] |
| React | 19.2.7 | Explicit journey state, controlled focus, step transitions | Already installed; package source says `"version": "19.2.7"`. [VERIFIED: node_modules/react/package.json:2-7] |
| Zod | 4.4.3 | Untrusted URL and numeric boundary validation | Existing `searchParamsSchema` authority; package source says `"version": "4.4.3"`. [VERIFIED: node_modules/zod/package.json:2-3] |
| Drizzle ORM | 0.45.2 | Parameterized SQL capacity predicate | Existing search query layer; package source says `"version": "0.45.2"`. [VERIFIED: node_modules/drizzle-orm/package.json:2-3] |

### Supporting

| Library | Version | Purpose | When to Use |
|---|---:|---|---|
| React Hook Form | 7.77.0 | Existing form infrastructure | Retain only if it reduces migration churn; an explicit three-step reducer/state object is clearer than one large hidden form. Package source says `"version": "7.77.0"`. [VERIFIED: node_modules/react-hook-form/package.json:2-4] |
| cmdk | 1.1.1 | Accessible command-list primitives for the catalogue picker | Reuse the repository `Command` wrapper, but provide deterministic exact-catalogue filtering rather than fuzzy semantics. Package source says `"version": "1.1.1"`. [VERIFIED: node_modules/cmdk/package.json:2-3] |
| radix-ui | 1.4.3 | Existing Popover/Dialog-style interaction primitives | Reuse existing wrappers for overlays and focus behavior. Package source says `"version": "1.4.3"`. [VERIFIED: node_modules/radix-ui/package.json:2-3] |
| Vitest | 4.1.8 | Unit/component/integration verification | Existing test framework; package source says `"version": "4.1.8"`. [VERIFIED: node_modules/vitest/package.json:2-4] |
| Playwright | 1.60.0 | Full progressive search and geolocation E2E | Existing browser suite; package source says `"version": "1.60.0"`. [VERIFIED: node_modules/@playwright/test/package.json:2-3] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| Explicit local journey state | A new form-wizard package | No new dependency is justified for three fixed steps; it adds another focus, transition, and serialization abstraction to reconcile. [VERIFIED: package.json:1-80] |
| Existing `Command` wrapper | A custom listbox | A custom composite must recreate keyboard navigation, active-option semantics, and focus behavior already represented by the installed primitives. [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/] |
| Existing address resolver | A second geocoder client | Duplicating Photon debounce/race/error logic would create divergent address contracts. [VERIFIED: src/components/listing/address-autocomplete.tsx:199-275] |

**Installation:** None. This phase should install no external package.

**Version verification:** Versions above were read from the installed packages, which are the relevant implementation authorities for this repository. Registry publish dates were not queried because the phase adds no package and the normal npm launcher on this machine is broken; see Environment Availability. [VERIFIED: package.json:1-80]

## Package Legitimacy Audit

Not applicable. The recommended implementation installs no external packages, so the Package Legitimacy Gate is not triggered.

**Packages removed due to [SLOP] verdict:** none  
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```text
GET / or URL navigation
        |
        v
Next.js public page (Server Component)
  await searchParams -> Zod safeParse
        |                     |
        | invalid             | valid confirmed query
        v                     v
 safe browse/idle       searchListings(params)
                              |
                              v
                 Stage 1 parameterized SQL
                 category + coordinates/default radius
                 + max_occupancy >= partySize
                              |
                              v
                 result rows (no remaining-place claim)
                              |
             +----------------+----------------+
             |                                 |
             v                                 v
        results/cards                    calm empty state
             |                                 |
             +---------- answer chips --------+
                              |
                              v
Client search coordinator
 idle pill -> activity -> location -> party
                  ^          |          |
                  +---- Back/Edit ------+
                             |
                 confirmed answers only
                             v
          constructed same-origin URLSearchParams
                             |
                         router.push
```

### Recommended Project Structure

```text
src/
├── app/(public)/
│   ├── page.tsx                         # validate URL, fetch results, compose the client shell
│   └── loading.tsx                      # inert, geometry-matched idle-pill loading shell
├── components/search/
│   ├── search-experience.tsx            # client coordinator: idle/steps/results edits
│   ├── activity-step.tsx                # exact known-catalogue picker
│   ├── location-step.tsx                # autocomplete + geolocation action
│   ├── party-step.tsx                   # one-person shortcut + bounded exact integer
│   ├── search-answer-chips.tsx           # shared populated/empty edit affordances
│   └── search-results.tsx                # result/empty composition; no legacy relax hatches
├── components/listing/
│   └── address-autocomplete.tsx          # shared resolver with configurable public/host copy
└── lib/
    ├── validation/booking.ts             # partySize and display-only locationLabel URL validation
    └── search/query.ts                    # stage-one max_occupancy predicate
```

Names are planning recommendations, not pre-existing paths. Keep the Client Component boundary at the coordinator and interactive leaves; do not mark the page or database query module with `"use client"`, because everything imported below that directive joins the client bundle. [CITED: https://nextjs.org/docs/app/getting-started/server-and-client-components]

### Pattern 1: Explicit Journey State with Retained Answers

**What:** Represent the screen independently from answer data. A compact state is sufficient: `activeStep: null | "activity" | "location" | "party"`, plus retained activity, resolved location, and party values. `null` means idle/results, not “missing data.” [ASSUMED]

**When to use:** For opening the pill, Back, Cancel, or a result chip. Selection advances only after an exact catalogue choice or successful coordinate resolution; merely typing never advances. [VERIFIED: .planning/phases/24-search-bar-rework/24-CONTEXT.md:17-43]

**Recommended transition table:**

| Event | From | To | Answer effect |
|---|---|---|---|
| Engage pill | idle | activity | Initialize from validated URL answers if present |
| Select exact activity/type | activity | location | Replace activity, retain other answers |
| Resolve address/geolocation | location | party | Replace coordinates and display label |
| Choose For me | party | results navigation | Set `partySize = 1`, navigate immediately |
| Submit valid group | party | results navigation | Set exact bounded integer, navigate |
| Back | any step | prior step | Retain all answers |
| Edit chip | results/empty | named step | Retain all answers; subsequent selection resumes fixed order |
| Cancel | any step | idle/browse | Clear draft and navigate to `/` when editing a URL-backed search |

### Pattern 2: Server-Validated, Canonical Search URL

**What:** Keep `searchParams` as an async page prop, parse with Zod, and pass serializable validated values to the client. The installed Next guide defines `searchParams` as a Promise and explains that using it opts the page into request-time rendering. [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/page] [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md:86-132]

Use the existing route approach rather than introducing `useSearchParams` into the journey. The latter can impose a Suspense boundary for prerendered routes, while this page already needs server-side values for its database query. [CITED: https://nextjs.org/docs/app/api-reference/functions/use-search-params]

**Canonical public keys:** `category`, `lat`, `lng`, `partySize`, and a bounded display-only `locationLabel` are the recommended supported search keys. `locationLabel` must never influence SQL; it exists so the editable location chip survives reload/share. [ASSUMED] Omit default radius from newly generated URLs and use the existing server default internally. The exact current radius authority is quoted verbatim as `export const RADIUS_PRESETS = [2, 5, 10, 25] as const;` and the schema defaults to `10`. [VERIFIED: src/lib/validation/booking.ts:54-90]

Generate navigation from a locally constructed `URLSearchParams` and a constant `/` base. Next warns not to send untrusted or unsanitized URLs to `router.push`/`router.replace`; `push` adds browser history whereas `replace` does not. [CITED: https://nextjs.org/docs/app/api-reference/functions/use-router] Use `push` for completed searches so Back returns to the prior page state; use local state for intra-journey Back.

### Pattern 3: Exact Catalogue Picker, Not Semantic Search

The existing catalogue values are the only accepted query values. The exact space-type values are quoted verbatim: `"pickleball_court"`, `"tennis_court"`, `"basketball_court"`, `"multi_sport_court"`, `"gym_fitness_floor"`, `"yoga_studio"`, `"dance_studio"`, `"pilates_barre_studio"`, `"martial_arts_boxing"`, `"home_private_gym"`, and `"multi_purpose_event"`. [VERIFIED: src/lib/listing-vocab.ts:18-30] The exact activity values are quoted verbatim: `"pickleball"`, `"tennis"`, `"basketball"`, `"volleyball"`, `"badminton"`, `"futsal_soccer"`, `"yoga"`, `"pilates"`, `"barre"`, `"dance"`, `"hiit_cross_training"`, `"weightlifting"`, `"boxing_mma"`, `"climbing"`, and `"general_fitness"`. [VERIFIED: src/lib/listing-vocab.ts:47-63]

Render two labelled groups (“Activities” and “Space types”), filter case-insensitively by the existing human label, and set the command primitive to avoid its own fuzzy scoring. Clear a previously confirmed category when its input text is edited; only clicking/keyboard-selecting a real option commits the value and advances. [ASSUMED] A combobox/listbox pattern is appropriate when input suggests and restricts selection to known values. [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/]

### Pattern 4: Reuse Address Resolution, Separate Copy from Mechanics

The resolver's exact output contract is quoted verbatim: `addressLine1`, `city`, `region`, `postalCode`, `country`, `neighborhood`, `lat`, and `lng`. [VERIFIED: src/components/listing/address-autocomplete.tsx:72-81] Its present copy is host-specific (“Search for your address” and guidance about what guests see), so do not drop it unchanged into a public booker journey. Extend it with optional label/placeholder/help props whose defaults preserve the host flow, or extract a shared lookup primitive with host and public wrappers. [VERIFIED: src/components/listing/address-autocomplete.tsx:120-170]

Parent state must own the resolved label and coordinates so Back/Edit restores the answer. Keep the existing 250 ms debounce, minimum three-character request threshold, limit of six, request cancellation, and lookup status feedback rather than reimplementing them. Those exact current values are quoted as `query.trim().length < 3`, `setTimeout(..., 250)`, and `limit=6`. [VERIFIED: src/components/listing/address-autocomplete.tsx:199-239]

### Pattern 5: Capacity Predicate Without Capacity Projection

The stored column authority is quoted verbatim as `maxOccupancy: integer("max_occupancy"), // D-07 single capacity int`. [VERIFIED: src/lib/db/schema.ts:199-221] Add an optional validated `partySize` and, when present, insert a parameterized `l.max_occupancy >= ${partySize}` condition into the first-stage SQL. Existing query values are already interpolated through Drizzle's SQL template, which parameterizes dynamic values. [VERIFIED: src/lib/search/query.ts:213-281] [CITED: https://orm.drizzle.team/docs/operators]

Do not add `maxOccupancy` to `SearchResultRow` merely to make the predicate work: a WHERE column need not be selected. `NULL` capacity naturally fails this comparison and should fail closed whenever a party size is supplied. [CITED: https://www.postgresql.org/docs/current/functions-comparison.html] The result row's current occupancy strings are quoted verbatim as `"exclusive" | "open_capacity"`, and its spots state is `"open" | "low" | "full"`; neither means “this many places remain without a date.” [VERIFIED: src/lib/search/query.ts:29-66]

Apply the maximum-capacity predicate to both occupancy modes. Only the date-aware second stage may compute remaining spots, and the new front door supplies no date. [VERIFIED: src/lib/search/query.ts:293-338]

### Pattern 6: One Shared Answer-Chip Surface

Render a single `SearchAnswerChips` component above both result cards and the calm empty message. Each chip displays its answer and opens its exact step. The location chip reads the validated display label when available and otherwise uses non-deceptive fallback copy such as “Current location” or “Selected area”; it must never reverse-geocode silently. [ASSUMED]

Keep result sorting unless product context removes it separately: D-08 names date/time, price, radius, and their relaxation surface, not sort. Stop propagating removed controls through `activeQueryString`, pagination, or hidden relaxation behavior. Existing result cards may continue forwarding a legitimate booking date/time from compatible legacy/direct routes, but the new journey must not create them. [VERIFIED: src/components/search/search-result-card.tsx:1-230]

### Pattern 7: Focus, Status, and Motion Are Part of the State Machine

After each animated step change, focus the new question heading or first actionable field; retain DOM order and never use a positive `tabindex`. WCAG requires focus order to preserve meaning and operability and requires visible focus. [CITED: https://www.w3.org/WAI/WCAG22/Understanding/focus-order] [CITED: https://www.w3.org/WAI/WCAG22/UNDERSTANDING/focus-visible.html]

Expose a persistent visible “Step 1 of 3” label and one polite status region for journey transitions/errors. Avoid announcing the same location event in both the coordinator and the resolver, whose current implementation already includes lookup feedback. Status messages must be programmatically determinable without moving focus. [CITED: https://www.w3.org/TR/WCAG22/#status-messages] [VERIFIED: src/components/listing/address-autocomplete.tsx:285-395]

Use the repository's motion tokens, quoted verbatim as `--motion-fast: 120ms`, `--motion-base: 200ms`, `--motion-slow: 320ms`, and `--motion-ease-standard: cubic-bezier(0.2, 0, 0, 1)`. [VERIFIED: src/app/globals.css:464-467] Prefer opacity/translate transitions at the base duration. The global reduced-motion media rule already reduces animation and transition durations to `0.01ms`; do not install or duplicate a motion subsystem. [VERIFIED: src/app/globals.css:527-552] [CITED: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions]

### Anti-Patterns to Avoid

- **One hidden mega-form:** It preserves the implementation shape but not the conversational focus and makes stale hidden values easy to submit. Use explicit answer state and a visible active step. [ASSUMED]
- **Advancing on typed text:** Text is only a local filter. Advance only from a catalogue option event. [VERIFIED: .planning/phases/24-search-bar-rework/24-CONTEXT.md:33-38]
- **Client-only capacity filtering:** It can be bypassed and cannot affect pagination/counting correctly. Put the predicate in stage-one SQL. [VERIFIED: src/lib/search/query.ts:213-281]
- **Projecting capacity to justify filtering:** It widens the read model and invites UI claims not required by the phase. Filter without selecting it. [CITED: https://orm.drizzle.team/docs/operators]
- **Invisible legacy refinements:** Do not accept a legacy radius/date/price key and silently change a search the new UI cannot explain. Normalize public journeys to the supported contract. [VERIFIED: .planning/phases/24-search-bar-rework/24-CONTEXT.md:45-56]
- **Opening a journey in `loading.tsx`:** A temporary interactive tree can be replaced during streaming and lose input/focus. Render an inert, geometry-matched idle pill skeleton there and keep all control IDs out of it. [ASSUMED]
- **Global Escape-to-cancel:** Escape belongs first to the open combobox/popover. Keep journey cancellation explicit. [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Catalogue composite keyboard behavior | Raw input plus clickable divs | Existing `Command`/`cmdk` wrapper | Composite focus and option semantics are error-prone. [VERIFIED: src/components/ui/command.tsx:1-180] [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/] |
| Address lookup | New fetch/debounce/cache implementation | Existing `AddressAutocomplete`, with configurable copy | It already owns cancellation, debounce, parsing, errors, and resolution. [VERIFIED: src/components/listing/address-autocomplete.tsx:199-275] |
| Geolocation fallback | IP guessing or reverse-geocode stack | Existing `navigator.geolocation` pattern | Browser permission/failure handling already exists. [VERIFIED: src/components/search/search-bar.tsx:187-206] |
| Party-size authority | Client min/max only | Shared Zod bound + parameterized SQL | Server validation and DB filtering are required to prevent bypass. [VERIFIED: src/lib/validation/listing.ts:93-105] [VERIFIED: src/lib/search/query.ts:213-281] |
| Remaining-place estimate | `maxOccupancy - partySize` | No availability claim in this phase | Capacity is a configured ceiling, not date-specific remaining inventory. [VERIFIED: src/lib/search/query.ts:293-338] |
| Animation framework | New transition dependency | Existing CSS motion tokens/reduced-motion rule | The interaction needs small state transitions, not timeline orchestration. [VERIFIED: src/app/globals.css:464-467] |
| URL router | Raw string concatenation | `URLSearchParams` + constant same-origin base + Next router | Prevents malformed encoding and unsafe navigation inputs. [CITED: https://nextjs.org/docs/app/api-reference/functions/use-router] |

**Key insight:** The difficult part is not drawing three screens; it is keeping client answers, canonical URL state, server validation, SQL semantics, empty-state edits, browser history, and accessibility focus synchronized. Plan those as one vertical contract, then split UI components within it.

## Common Pitfalls

### Pitfall 1: Party Size Exists in the URL but Not in the SQL

**What goes wrong:** Shareable URLs look correct, but larger parties see listings that cannot hold them.  
**Why it happens:** The client and schema are changed without threading the value into stage-one search.  
**How to avoid:** Add schema tests and database integration tests in the same plan task as the query predicate.  
**Warning signs:** `partySize` appears in navigation snapshots but not in the SQL parameter list. [VERIFIED: src/lib/search/query.ts:213-281]

### Pitfall 2: Treating Maximum Capacity as Remaining Inventory

**What goes wrong:** A card says a party “fits” or shows remaining places even though no date was selected.  
**Why it happens:** `maxOccupancy` is confused with the date-aware `spots.remaining` read model.  
**How to avoid:** Use capacity only as an inclusion predicate; leave card availability copy unchanged/neutral.  
**Warning signs:** Any subtraction from `maxOccupancy`, or a new spots badge when `date` is absent. [VERIFIED: src/lib/search/query.ts:293-338]

### Pitfall 3: Unexplainable Hidden Legacy Filters

**What goes wrong:** Old `priceMax`, `radius`, or date keys keep narrowing/broadening results even though no chip exposes them.  
**Why it happens:** Existing `activeQueryString`, relaxation, and pagination blindly preserve old parameters.  
**How to avoid:** Define a canonical supported-key serializer and use it for search, pagination, sorting, and result links; write a legacy URL normalization test.  
**Warning signs:** Removed keys survive after any Phase 24 interaction. [VERIFIED: src/app/(public)/page.tsx:45-66]

### Pitfall 4: Fuzzy Command Filtering Violates Exact Selection

**What goes wrong:** A typed near-match appears to become a real query or the selected hidden value no longer matches displayed text.  
**Why it happens:** A command palette's ranking behavior is mistaken for semantic search.  
**How to avoid:** Filter only the known label list, store only option values, and clear confirmed selection when the text changes.  
**Warning signs:** Submit/advance is possible without an option-selection event. [VERIFIED: src/lib/listing-vocab.ts:18-63]

### Pitfall 5: Reusing Host-Specific Address Copy Publicly

**What goes wrong:** Bookers see instructions about listing their space or what “guests” will see.  
**Why it happens:** The correct resolver is reused without separating its host-facing content.  
**How to avoid:** Add optional copy props with current host defaults or shared resolver + two wrappers; test both call sites.  
**Warning signs:** Public search renders `Search for your address` or approximate-area host guidance. [VERIFIED: src/components/listing/address-autocomplete.tsx:120-170]

### Pitfall 6: Streaming Produces Two Interactive Search Trees

**What goes wrong:** Duplicate IDs, duplicate accessible names, or a user's in-progress loading-tree journey disappears when the page resolves.  
**Why it happens:** Current `loading.tsx` deliberately renders a real `SearchBar` for geometry and usability.  
**How to avoid:** Replace it with an inert, aria-hidden, size-matched idle-pill skeleton and update “one tree” and CLS assertions.  
**Warning signs:** Two visible controls match the same test selector during navigation. [VERIFIED: src/app/(public)/loading.tsx:18-51]

### Pitfall 7: Focus Moves Before the Transitioned Step Exists

**What goes wrong:** Focus remains on a removed control, drops to `body`, or screen readers announce duplicate status.  
**Why it happens:** State change, CSS exit/enter, focus, and live-region updates are scheduled independently.  
**How to avoid:** Keep one mounted step panel or focus in a post-render effect keyed by `activeStep`; test focus after keyboard and pointer selection under reduced motion.  
**Warning signs:** `document.activeElement` is `body` after an auto-advance. [CITED: https://www.w3.org/WAI/WCAG22/Understanding/focus-order]

### Pitfall 8: Database Fixtures Become Invalid Under Fail-Closed Capacity

**What goes wrong:** Existing search tests unexpectedly return zero rows because fixtures omit `maxOccupancy`.  
**Why it happens:** SQL `NULL >= partySize` is not true.  
**How to avoid:** Update only tests that submit a party size, and add deliberate `NULL`, below-limit, equal-limit, and above-limit cases.  
**Warning signs:** Search E2E seeds create listings without a capacity while Phase 24 URLs always include `partySize`. [VERIFIED: tests/search/open-capacity-search.test.ts:159-174] [CITED: https://www.postgresql.org/docs/current/functions-comparison.html]

## Code Examples

Verified patterns and implementation-ready adaptations:

### Validated Party-Size Contract

```ts
// Adaptation of the repository's Zod search schema.
// Bound source: src/lib/validation/listing.ts (`MAX_OPEN_CAPACITY = 1_000`).
partySize: z.coerce
  .number()
  .int()
  .min(1)
  .max(MAX_OPEN_CAPACITY)
  .optional(),

// Recommended display-only key; never pass it to the query layer.
locationLabel: z.string().trim().min(1).max(120).optional(),
```

The exact shared bound is `MAX_OPEN_CAPACITY = 1_000`; do not repeat the literal in client code. [VERIFIED: src/lib/validation/listing.ts:93-105] The `locationLabel` key and 120-character bound are recommended, not existing authorities. [ASSUMED]

### Parameterized Stage-One Capacity Filter

```ts
// Adaptation of the existing Drizzle sql-template query.
${partySize !== undefined ? sql`AND l.max_occupancy >= ${partySize}` : sql``}
```

Dynamic values in Drizzle SQL templates are parameterized rather than concatenated. [CITED: https://orm.drizzle.team/docs/sql] No result projection is needed for this predicate.

### Safe Same-Origin Navigation

```ts
// Source pattern: Next useRouter docs + existing SearchBar URLSearchParams use.
const params = new URLSearchParams();
params.set("category", answers.category);
params.set("lat", String(answers.location.lat));
params.set("lng", String(answers.location.lng));
params.set("locationLabel", answers.location.label);
params.set("partySize", String(answers.partySize));
router.push(`/?${params.toString()}`);
```

The route base is constant; none of the user-controlled values can become a scheme or host. Next explicitly warns against unsanitized URLs passed to `router.push`. [CITED: https://nextjs.org/docs/app/api-reference/functions/use-router]

### Deterministic Known-Catalogue Filtering

```ts
const normalized = query.trim().toLocaleLowerCase();
const visibleOptions = ALL_CATALOGUE_OPTIONS.filter(({ label }) =>
  label.toLocaleLowerCase().includes(normalized),
);

// Commit and advance only from this option event.
function chooseOption(option: CatalogueOption) {
  setAnswers((current) => ({ ...current, category: option.value }));
  setActiveStep("location");
}
```

`ALL_CATALOGUE_OPTIONS` is a recommended derived view over the verified `SPACE_TYPES` and `ACTIVITY_TAGS`; its allowed stored values must come from those arrays, never from input text. [VERIFIED: src/lib/listing-vocab.ts:18-63]

## State of the Art

| Old Approach in This Repository | Phase 24 Approach | Trigger | Impact |
|---|---|---|---|
| Always-expanded all-filter form | Engaged three-question journey | D-01–D-03 | Smaller idle footprint and explicit progression. [VERIFIED: src/components/search/search-bar.tsx:259-512] |
| Native select-like combined category control | Searchable exact known-catalogue combobox | D-04 | Typing filters but cannot create semantic/free-text queries. [VERIFIED: src/components/search/search-bar.tsx:59-61] |
| Address field embedded in large form | Dedicated location question with address or geolocation | D-05 | Both successful paths converge on one resolved coordinate contract. [VERIFIED: src/components/search/search-bar.tsx:187-206] |
| No party size in search | Exact bounded `partySize` plus DB capacity predicate | D-06–D-07 | Results respect configured maximum without claiming date inventory. [VERIFIED: src/lib/db/schema.ts:199-221] |
| Empty-state radius relaxation hatches | Same activity/location/party edit chips in results and empty state | D-08 | Every recovery action explains exactly which answer changes. [VERIFIED: src/components/search/search-results.tsx:315-360] |
| Interactive full-form route loading shell | Inert geometry-matched idle pill | Phase 24 recommendation | Prevents duplicate active journeys and lost input during streaming. [ASSUMED] |

**Deprecated/outdated in this route after Phase 24:**

- Public search inputs and exposed refinement for `date`, `startTime`, `endTime`, `priceMax`, and `radius`. [VERIFIED: src/components/search/search-bar.tsx:64-73]
- Public zero-result actions `Broaden radius`, `Clear filters`, and `Show nearby spaces`. [VERIFIED: src/components/search/search-results.tsx:315-360]
- Page-level automatic relaxation invocation and its route-visible band. [VERIFIED: src/app/(public)/page.tsx:122-164]

Do not automatically delete generic relaxation utilities until a repository-wide `rg` census proves that no non-public flow consumes them. Removal is safe only at the usage level established by that census. [ASSUMED]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | Use a bounded display-only `locationLabel` URL key (recommended max 120) so location chips survive reload/share; it never affects SQL. | Architecture Pattern 2 / Code Examples | A different canonical label strategy may be preferred; changing the URL contract later is moderately costly. |
| A2 | An explicit local state object/reducer is clearer than retaining React Hook Form for the entire wizard. | Architecture Pattern 1 / Stack | Implementation may retain RHF if it can prove equal state clarity and focus behavior. |
| A3 | Render an inert loading pill rather than a real interactive loading-tree journey. | Architecture Pattern 7 / Pitfalls | Product may prefer temporary interactivity, but must then preserve state across streamed replacement. |
| A4 | Keep sorting because D-08 does not name it among removed refinements. | Architecture Pattern 6 | If product intended all secondary controls removed, sort would also need deletion. |
| A5 | Group the known catalogue visually as “Activities” and “Space types,” use deterministic case-insensitive label substring matching, disable fuzzy ranking, and clear a committed value when the filter text changes. | Architecture Pattern 3 | Copy/grouping is discretionary; a different exact-only filter is acceptable, but fuzzy/inferred matching is not. |
| A6 | Use a single shared answer-chip component and non-deceptive location fallback text without silently reverse-geocoding. | Architecture Pattern 6 | Separate implementations can drift between populated and empty states; fallback copy may require product review. |
| A7 | A hidden mega-form is riskier than answer state separated from the active step. | Anti-Patterns | RHF could still work if the plan explicitly prevents hidden stale values and proves transitions. |
| A8 | Delete generic relaxation utilities only after a fresh repository-wide usage census proves there are no supported consumers. | State of the Art | Premature deletion could break another flow; leaving verified dead code would increase maintenance burden. |
| A9 | The proposed focused Vitest command is a suitable per-task quick check. | Validation Architecture | Global DB setup may make it slower than 30 seconds until Docker access is restored. |
| A10 | Component-test the Photon selection branch and use Playwright's deterministic geolocation support for browser-location E2E rather than depending on a live third party. | Validation Architecture | Browser/provider behavior may still need a separate manual smoke test. |
| A11 | Treat a mismatched `locationLabel` as presentation-only and normalize removed legacy keys after Phase 24 interaction. | Security Domain | If any backend accidentally consumes the label or old keys, results become misleading or unexplainable. |

All exact repository enums, bounds, paths, and versions elsewhere in this research were read from their source-of-truth files in this session.

## Open Questions (RESOLVED)

1. **RESOLVED — The canonical reload-safe location chip label is the bounded, display-only `locationLabel` URL field.**
   - What we know: search authority is coordinates; the current address resolver returns structured address fields, and current geolocation returns coordinates without reverse geocoding. [VERIFIED: src/components/listing/address-autocomplete.tsx:72-81] [VERIFIED: src/components/search/search-bar.tsx:187-206]
   - Accepted resolution: add bounded, display-only `locationLabel`; emit the selected address label or `Current location`; prove in a test that changing only the label never changes SQL results. Coordinates remain the sole location-search authority.

2. **RESOLVED — Delete legacy relaxation modules only after a fresh usage/test census and dependent-contract migration.**
   - What we know: the public page and empty state currently use them, and D-08 requires removing that surface. [VERIFIED: src/app/(public)/page.tsx:122-164]
   - Accepted resolution: Plan 24-04 disconnects the public runtime after its census; the ordered legacy-retirement plan repeats the census, migrates or deletes every dependent test/design contract, and deletes only modules with no supported consumer.

3. **RESOLVED — Cancel from submitted results clears Phase 24 search state and returns to browse `/` per D-02.**
   - What we know: D-02 says Cancel clears the in-progress search and restores idle/browse; result chips edit retained submitted answers. [VERIFIED: .planning/phases/24-search-bar-rework/24-CONTEXT.md:21-29]
   - Accepted resolution: Cancel from result editing navigates to `/`, clears retained Phase 24 answers, and restores browse; Back is the non-destructive answer-preserving escape.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---:|---:|---|
| Node.js | Next/Vitest/build | ✓ | v24.13.0 | — [VERIFIED: `node --version`, 2026-09-14] |
| npm executable via normal launcher | Package scripts | ✗ | wrapper points to missing roaming `npm-cli.js` | Invoke the installed CLI directly with `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js"`. [VERIFIED: local command output, 2026-09-14] |
| npm CLI at installed Node path | Package scripts fallback | ✓ | 11.6.2 | — [VERIFIED: direct CLI command output, 2026-09-14] |
| pnpm | Emergency script runner | ✓ | 11.19.0 | Do not change lockfile/package-manager policy merely for this phase. [VERIFIED: `pnpm --version`, 2026-09-14] |
| Docker CLI | DB-backed Vitest/E2E setup | ✓ | 29.6.1; Compose v5.2.0 | — [VERIFIED: local command output, 2026-09-14] |
| Docker daemon/API | DB-backed Vitest/E2E setup | ✗ in current sandbox | access denied/unavailable | Run integration verification in an executor context with daemon access; pure schema/component checks alone are not the phase gate. [VERIFIED: `docker info`, 2026-09-14] |

The project declares the exact Node engine constraint `">=24.2"`, so v24.13.0 satisfies the present bound. [VERIFIED: package.json:6-10]

**Missing dependencies with no fallback:**

- Docker daemon access for the existing database-backed global test setup. The executor must obtain/start it before the integration and full-suite gates. [VERIFIED: vitest.config.ts:1-80]

**Missing dependencies with fallback:**

- Normal npm launcher: use the installed npm CLI path shown above without modifying repository package metadata.

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | Vitest 4.1.8 + Playwright 1.60.0 [VERIFIED: node_modules/vitest/package.json:2-4] [VERIFIED: node_modules/@playwright/test/package.json:2-3] |
| Config file | `vitest.config.ts`; `playwright.config.ts` [VERIFIED: vitest.config.ts:1-80] [VERIFIED: playwright.config.ts:1-100] |
| Quick run command | `npm test -- tests/validation/booking-schemas.test.ts tests/search/progressive-search.test.tsx` [ASSUMED] |
| Full suite command | `npm test && npm run test:design && npm run lint && npm run build && npm run test:e2e` [VERIFIED: package.json:11-34] |

The phase has no mapped REQUIREMENTS.md IDs; use locked decision IDs D-01 through D-08 as traceability anchors until requirements are assigned. [VERIFIED: .planning/ROADMAP.md:1-260] [VERIFIED: .planning/REQUIREMENTS.md:1-520]

### Phase Decisions → Test Map

| Decision | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| D-01–D-03 | Idle pill, fixed progression, auto-advance, Back retention, Cancel clear, For-me immediate submit, valid-group submit | component | `npm test -- tests/search/progressive-search.test.tsx` | ❌ Wave 0 |
| D-04 | Full known catalogue, deterministic filter, exact option required, exact no-match copy | component/schema | `npm test -- tests/search/progressive-search.test.tsx tests/validation/booking-schemas.test.ts` | ❌ component file; ✅ schema file to extend |
| D-05 | Address and browser geolocation both resolve to party step; permission/failure is recoverable | component/E2E | `npm run test:e2e -- e2e/progressive-search.spec.ts` | ❌ Wave 0 |
| D-06–D-07 | Exact party bound and `max_occupancy >= partySize`; null/below excluded; equal/above included; no remaining-place promise | integration | `npm test -- tests/search/party-size-filter.test.ts` | ❌ Wave 0 |
| D-08 | Same direct-edit chips in populated and empty states; no legacy refinement hatches | component/E2E | `npm test -- tests/search/search-results-states.test.tsx` | ✅ rewrite |
| D-01–D-08 | 375px and desktop keyboard/focus/reduced-motion/axe/visual journey | E2E/design | `npm run test:e2e -- e2e/progressive-search.spec.ts && npm run test:design` | ❌ journey E2E; ✅ harness/baselines to update |

### Required Existing-Test Census

The following existing files encode the old expanded form, old query keys, duplicate streaming tree, or relaxation behavior and must be changed or intentionally retired in the plan: `e2e/search-and-book.spec.ts`, `e2e/zero-result-relax.spec.ts`, `e2e/one-tree.spec.ts`, `e2e/price-parity.spec.ts`, `e2e/axe-sweep.spec.ts`, `e2e/helpers/booker-seed.ts`, visual baseline definitions, `tests/search/search-results-states.test.tsx`, `tests/search/filters.test.ts`, and relevant fixtures in `tests/search/open-capacity-search.test.ts`. [VERIFIED: repository `rg` census, 2026-09-14] Each discrete selector/query expectation must be confirmed by opening the file again during implementation before editing; the census alone does not define its values.

For deterministic “Use my location” E2E, grant geolocation permission and set a known coordinate on the Playwright context; test the Photon-selected-address branch at component level so the suite does not depend on the live third-party service. [CITED: https://playwright.dev/docs/api/class-browsercontext#browser-context-grant-permissions] [ASSUMED]

### Sampling Rate

- **Per task commit:** focused schema/component test under 30 seconds once the DB test setup is available.
- **Per wave merge:** `npm test`, plus the focused progressive-search Playwright spec for UI waves.
- **Phase gate:** full unit/integration suite, design suite, lint, production build, and relevant/full E2E green before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `tests/search/progressive-search.test.tsx` — state transitions, retained answers, exact catalogue, group validation, focus, URL output.
- [ ] `tests/search/party-size-filter.test.ts` — parameterized capacity semantics, including `NULL`, boundary equality, both occupancy modes, and no date-derived promise.
- [ ] `e2e/progressive-search.spec.ts` — 375px/desktop full journey, Back/Edit/Cancel, geolocation, reload/share URL, result and empty chips.
- [ ] Extend `tests/validation/booking-schemas.test.ts` — `partySize` coercion, integer/bounds, malformed input, optional legacy/browse behavior, display-label length.
- [ ] Rewrite `tests/search/search-results-states.test.tsx` — populated/empty chips and absence of legacy hatches.
- [ ] Replace/retire `e2e/zero-result-relax.spec.ts` and update all old search selectors/query fixtures identified by the census.
- [ ] Add visual baselines for idle pill, each step, populated results chips, calm empty chips, and 375px layout; remove obsolete relaxation baselines.
- [ ] Restore Docker daemon access before DB-backed tests; no new test framework install is needed.

## Security Domain

Security enforcement is enabled and configured at ASVS level 1. [VERIFIED: .planning/config.json:1-120]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---|---:|---|
| V2 Authentication | no | Public search adds no identity boundary. [VERIFIED: .planning/phases/24-search-bar-rework/24-CONTEXT.md:5-13] |
| V3 Session Management | no | No session/token behavior is added. [VERIFIED: .planning/phases/24-search-bar-rework/24-CONTEXT.md:5-13] |
| V4 Access Control | yes, integrity boundary | Browser choices are convenience only; server validation and SQL own capacity/category enforcement. [VERIFIED: src/components/search/search-bar.tsx:1-14] |
| V5 Input Validation | yes | Zod for all URL values, closed catalogue enums, bounded integer/label, parameterized Drizzle SQL. [VERIFIED: src/lib/validation/booking.ts:68-120] |
| V6 Cryptography | no | No secrets, encryption, signatures, or credentials are introduced. [VERIFIED: .planning/phases/24-search-bar-rework/24-CONTEXT.md:5-13] |

### Known Threat Patterns for Next.js + Search URLs

| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| Client bypasses party control or sends huge/negative/fractional input | Tampering / DoS | Server-side Zod coercion + integer min/max and stage-one DB predicate; client attributes are UX only. [VERIFIED: src/lib/validation/booking.ts:68-120] |
| User value becomes a `router.push` scheme/host | Spoofing / XSS | Constant same-origin pathname and encoded `URLSearchParams`; never pass raw user input as the target. [CITED: https://nextjs.org/docs/app/api-reference/functions/use-router] |
| Display-only location label disagrees with coordinates | Spoofing | Treat label as presentational, visibly distinguish geolocation fallback, and prove SQL ignores it. [ASSUMED] |
| Raw catalogue text reaches SQL | Tampering | Accept only the exact Zod union backed by repository vocabulary. [VERIFIED: src/lib/validation/booking.ts:68-120] |
| SQL injection through URL values | Tampering | Keep all dynamic values in Drizzle parameter slots; never concatenate a SQL fragment from strings. [CITED: https://orm.drizzle.team/docs/sql] |
| Browser geolocation is requested unexpectedly or failure leaks a false location | Information disclosure / Spoofing | Request only from explicit “Use my location”; retain recoverable permission/error status; navigate only after success. [VERIFIED: src/components/search/search-bar.tsx:187-206] |
| Live geocoder response races or stale selection wins | Tampering | Preserve existing abort/cancellation and resolved-selection ownership. [VERIFIED: src/components/listing/address-autocomplete.tsx:199-275] |
| Removed legacy keys invisibly change results | Tampering / Repudiation | Canonical supported-key serializer and tests that old keys cannot alter a Phase 24 search after interaction. [ASSUMED] |

## Sources

### Primary (HIGH confidence)

- Repository source files opened in this session: `search-bar.tsx`, `address-autocomplete.tsx`, `page.tsx`, `loading.tsx`, `search-results.tsx`, `search-result-card.tsx`, `booking.ts`, `listing.ts`, `listing-vocab.ts`, `query.ts`, `schema.ts`, UI primitives, test configs, and relevant tests.
- Bundled Next.js 16.2.7 documentation in `node_modules/next/dist/docs/` — page search parameters, Server/Client composition, navigation, search-parameter hooks, and accessibility.
- [Next.js page convention](https://nextjs.org/docs/app/api-reference/file-conventions/page) — async `searchParams` and request-time behavior.
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) — client boundary ownership.
- [Next.js `useRouter`](https://nextjs.org/docs/app/api-reference/functions/use-router) — push/replace and unsafe URL warning.
- [Drizzle filter operators](https://orm.drizzle.team/docs/operators) and [SQL template](https://orm.drizzle.team/docs/sql) — comparison predicates and parameterization.
- [WAI multi-page forms](https://www.w3.org/WAI/tutorials/forms/multi-page/) — logical steps and progress context.
- [WAI-ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) — composite behavior.
- [WCAG focus order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order), [focus visible](https://www.w3.org/WAI/WCAG22/UNDERSTANDING/focus-visible.html), [status messages](https://www.w3.org/TR/WCAG22/#status-messages), and [animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions) — accessibility acceptance criteria.

### Secondary (MEDIUM confidence)

- Official sources above were retrieved through the research-plan websearch fallback because Context7 was unavailable in this runtime; the research seam classified verified websearch evidence as MEDIUM.

### Tertiary (LOW confidence)

- No third-party/community source is used as implementation authority. Items in the Assumptions Log are local design recommendations requiring planner/product confirmation where noted.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — installed package manifests and repository imports were opened directly.
- Architecture: HIGH — the existing RSC/client/query boundaries and exact schema contracts were opened directly; the proposed `locationLabel` detail remains an explicit assumption.
- Pitfalls: HIGH for repository migration risks, MEDIUM for externally sourced accessibility behavior because the runtime research seam classified websearch as MEDIUM.
- Security: HIGH for in-repo validation/query boundaries, MEDIUM for recommended new controls until implemented and tested.

**Research date:** 2026-09-14  
**Valid until:** 2026-10-14 for repository contracts; re-check installed Next docs and package manifests if dependencies change sooner.
