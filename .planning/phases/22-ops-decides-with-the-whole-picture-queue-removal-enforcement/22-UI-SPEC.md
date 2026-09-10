---
phase: "22"
slug: "ops-decides-with-the-whole-picture-queue-removal-enforcement"
status: approved
reviewed_at: "2026-09-10T16:38:44+08:00"
shadcn_initialized: true
preset: radix-nova
created: "2026-09-10"
---

# Phase 22 — UI Design Contract

> Visual and interaction contract for the existing `/ops` review queue. This phase expands a listing in place; it does not add an Ops route, a destination, an action, or a second decision surface.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn |
| Preset | `radix-nova`; RSC, CSS variables, Tailwind v4, Lucide icons |
| Component library | Radix UI primitives via project-local shadcn components |
| Icon library | Lucide |
| Font | Geist Sans through `--font-sans`; `--font-heading` is the same family |
| Source | `components.json`, `src/app/globals.css`, and `22-RESEARCH.md` |

The existing two-theme system is binding. Use semantic CSS variables and named text/elevation utilities only; do not introduce literals, a new font, a new palette, or a new dependency.

---

## Component Inventory

Enumerated by `$count = (Get-ChildItem src/components/ui -File -Filter '*.tsx').Count; $version = (Get-Content node_modules/shadcn/package.json -Raw | ConvertFrom-Json).version; "$count components — shadcn@$version"` — 32 components — shadcn@4.10.0 — 2026-09-10.

This is a non-exhaustive list of known-good local components, never a closed allowlist. `node node_modules/shadcn/dist/index.js info --cwd C:\Users\Admin\Roaming\FitOut` was also attempted, but could not reach the official registry from this environment.

| Component | Import path | Phase-22 use |
|-----------|-------------|--------------|
| Button | `@/components/ui/button` | Native disclosure control and the unchanged 44px decision controls |
| Card / CardContent | `@/components/ui/card` | Continue through `RowCard`; do not add a nested card for evidence |
| Badge | `@/components/ui/badge` | Neutral `outline` amenity labels only |
| Dialog | `@/components/ui/dialog` | Existing rejection confirmation only; do not create another dialog |
| Separator | `@/components/ui/separator` | Optional semantic divider between the decision zone and disclosure zone |
| PhotoGallery | `@/components/listing/photo-gallery` | Existing responsive mosaic, zero-photo state, and lightbox; render once inside evidence |
| RowCard | `@/components/patterns/row-card` | Existing terminal row shell; retain its one component tree at every width |
| OpsDecisionActions | `@/components/ops/ops-decision-actions` | Render once, above the disclosure and outside evidence |

---

## Spacing Scale

Declared values (all existing multiples of 4):

| Token | Value | Usage in this phase |
|-------|-------|---------------------|
| xs | 4px | Label-to-inline-value gaps only |
| sm | 8px | Amenity badge gaps and compact control grouping |
| md | 16px | Row padding, action-to-disclosure separation, and divider breathing room |
| lg | 24px | Evidence subsections and photo-to-facts separation |
| xl | 32px | Large card/evidence group separation |
| 2xl | 48px | No new use in a row; page rhythm remains existing |
| 3xl | 64px | No new use in a row; page rhythm remains existing |

Exceptions: decision, reject-trigger, and contact-reveal controls keep the existing `size="touch"` 44px minimum; long evidence never receives a fixed height or horizontal scroll region.

---

## Typography

The Phase-22 scale is exactly four existing semantic text tokens and exactly two existing semantic weight tokens. Use the named utilities below; do not add a literal font-size, a browser-default size, a numeric font-weight, or a fifth role. Each text token supplies its paired line-height, so do not layer a separate leading utility onto it.

| Role | Size token | Weight token | Phase-22 usage |
|------|------------|--------------|----------------|
| Label | `text-label` | `font-normal` | Fact terms, fact values, description, and amenity labels |
| Body | `text-body` | `font-normal` | Empty and error copy only |
| Heading | `text-heading` | `font-semibold` | Existing wait figure only; do not add an evidence subsection heading |
| Display | `text-display` | `font-semibold` | Existing page title only; never inside a queue row |

The only declared weights are regular (`font-normal`) and emphasis (`font-semibold`). The only declared sizes are Label, Body, Heading, and Display. Court and Grove continue to resolve these shared design-system tokens through their existing theme variables; that implementation detail is not a second Phase-22 size or weight scale and must not be copied or overridden. Evidence stays label-weight so it does not compete with the existing wait figure.

---

## Color

| Role | Token / value | Usage |
|------|---------------|-------|
| Dominant (60%) | `--background` and `--card`; Court `oklch(1 0 0)`, Grove `oklch(0.988 0.006 190)` / white card | Page and the existing row surface |
| Secondary (30%) | `--muted` / `--secondary`; Court `oklch(0.97 0 0)`, Grove `oklch(0.958 0.01 190)` | Photo fallback, disclosure hover/expanded state, neutral evidence grouping |
| Accent (10%) | `--brand`; Court `oklch(0.58 0.208 25)`; Grove's existing themed brand token | No new Phase-22 use |
| Destructive | `--destructive`, Court/Grove `oklch(0.535 0.215 27.325)` | Existing rejection confirmation and invalid-state semantics only |

Accent reserved for: existing opt-in brand CTAs elsewhere in FitOut. The Phase-22 disclosure, normal approval control, evidence headings, amenity badges, and focus treatment are neutral; focus remains the existing solid `--ring`, never brand. Success remains icon-only `--success` in the pre-existing empty state, never a new CTA colour.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | `Show listing evidence`; when open, the same button reads `Hide listing evidence` |
| Disclosure accessibility name | Button text is its accessible name; bind `aria-expanded` to state and `aria-controls` to the single evidence-region id |
| Empty state heading | `The queue is clear` |
| Empty state body | `Nothing is waiting on FitOut right now. New hosts and new listings land here the moment they're submitted, oldest first.` |
| Missing description | `Not set` |
| Missing amenities | `Not set` |
| Existing no-photo state | Preserve `No photos yet` from `PhotoGallery` |
| Error state | Preserve the server-returned refusal in the existing named `Decision not recorded` status region; do not add a disclosure fetch, spinner, retry, or generic error copy because evidence arrives with the server-rendered row |
| Destructive confirmation | No new destructive action. Preserve existing `Reject this listing?`, `This can't be undone here.`, and `Reject listing` copy in `OpsRejectDialog` |

---

## Interaction Contract

### Listing-row layout and disclosure

1. Listing rows alone receive one native `<button type="button">` disclosure. Host rows remain unchanged and receive no listing evidence, document, photo, identifier, placeholder, or disclosure control.
2. Keep one `OpsDecisionActions` widget directly below the listing header and before the disclosure trigger. It remains visible before and after expansion, is separated from evidence with the `md` (16px) gap and a neutral separator or equivalent structural boundary, and is never duplicated inside evidence.
3. The disclosure control follows the decision zone. It uses the existing `Button` `outline` or `secondary` treatment, not a brand or destructive treatment. The expanded state may use the component's existing `aria-expanded` muted treatment.
4. Activating the control only toggles local client state. It does not navigate, change the URL, fetch data, open a dialog, or add a second disclosure level. The row remains in the ordered queue.
5. The one evidence `<section>` is mounted only while expanded and begins below the controls. It contains, in this order: the existing `PhotoGallery`; Description; Amenities; the remaining listing facts (Address, Space type, Capacity, Price, Host standing, Submitted); then the existing contact-reveal facts. Preserve the current server-composed labels and money strings.
6. Render Description as readable wrapped prose (`whitespace-pre-wrap break-words`), not a clipped fact-row value. Render amenities as a wrapping semantic `<ul>` of neutral outline `Badge`s; map known values through `AMENITY_LABELS` and show an unknown key as its raw fallback. Never make badges controls.
7. Missing Description and Amenities render their stated neutral values in the same evidence section. No blank field is permitted. The selected, fail-closed host standing must always render one of the existing phrases: `not checked yet`, `waiting on a decision`, `checked`, `not approved`, `never checked`, or `hosting paused`.

### Terminality, focus, and responsive behavior

1. The row has zero anchors of every scheme and zero `[role="link"]` elements in collapsed and expanded states, for both listing and host rows. Do not pass `href` to `RowCard`, use `Link`, create a detail page, or imitate a link.
2. Use the native button's keyboard behavior; no clickable `div`, no custom button role, and no `preventDefault` keyboard shim. The disclosure does not move focus when toggled; the activated button retains focus and its changed `aria-expanded` state communicates the result.
3. Existing photo-lightbox buttons and existing contact reveal retain their shipped accessibility contracts. The contact reveal's successful plain-text focus move remains intact and is not reimplemented as a link or copy button.
4. Keep one responsive component tree. At 320px the evidence stacks naturally, the photo gallery retains its shipped hero-and-lightbox behavior, decision buttons may wrap while remaining 44px tall, and long description/amenity content wraps without horizontal page overflow. At desktop, evidence stays inside the existing `max-w-5xl` queue shell.
5. Do not make controls sticky in this MVP. Controls precede the disclosure so expansion adds content below them; verify at 320px and desktop that the single decision widget remains within the viewport after expansion before introducing a future sticky treatment.

---

## UI Considerations

Applicable state considerations resolved: 8 covered, 2 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty | Ordered review queue | ✅ covered | Existing positive queue-zero state keeps the specified heading/body and intentionally has no CTA. |
| empty | Photo gallery | ✅ covered | Reused `PhotoGallery` renders `No photos yet` rather than an empty media hole. |
| empty | Description and amenities | ✅ covered | Expanded evidence renders `Not set` for either absent value, never a blank fact. |
| loading | Disclosure control and evidence | ✅ covered | Evidence is included in the serializable server DTO; local toggling has no request or loading state. |
| error | Decision controls | ✅ covered | Existing named refusal region reports the server-returned reason; the action is the retry path. |
| populated | Listing evidence | ✅ covered | Exactly one disclosure shows gallery, description, amenities, facts, standing, and contact in the prescribed order. |
| partial | Listing evidence | ✅ covered | Each nullable/unknown value has a neutral fallback; host standing is total and fail-closed. |
| overflow | Description, amenity collection, and narrow row | 🧪 backstop | 320px and desktop browser checks prove long prose wraps, badges wrap, and no horizontal overflow occurs. |
| zero-one-many | Ordered queue and amenities | ✅ covered | Queue preserves its existing ordered-list semantics; amenity list handles zero with `Not set` and one/many with wrapping items. |
| long-text | Description, title, labels, and status values | 🧪 backstop | Long description wraps in evidence; title retains existing truncation; a focused visual test checks no control overlap or page overflow. |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official / project-local components | Existing Button, Badge, Card, Dialog, Separator only; no registry addition | not required — `components.json` `registries` is `{}` as inspected 2026-09-10 |
| Third-party | none | no third-party registry declared; no vetting required |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS
- [x] Dimension 7 Inventory Provenance: PASS

**Approval:** approved 2026-09-10; UI-state coverage accepted with explicit contract entries and browser-test backstops for overflow and long text.
