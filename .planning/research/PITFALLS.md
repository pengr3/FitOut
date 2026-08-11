# Pitfalls Research

**Domain:** Retrofitting a design system + visual polish onto an already-shipped, test-proven, money-handling two-sided marketplace (Next.js 16 App Router / React 19 / Tailwind v4 / shadcn-radix-nova)
**Milestone:** v1.1 — Front-End Polish & Placeholder Design System
**Researched:** 2026-08-11
**Confidence:** HIGH for everything measured in this repo (every `file:line` below was read first-hand on 2026-08-11) and for Tailwind v4 semantics (official docs). MEDIUM for email-client behaviour and Playwright cross-OS baselines (vendor docs + community consensus). Every numeric contrast ratio below was **computed** from the shipped token values — method stated in § Colour maths so it can be re-derived, not taken on trust.

---

## How to read this file

v1.1's roadmap does not exist yet, so pitfalls are mapped to **topic-shaped phase IDs** the roadmapper can rename:

| ID | Phase topic |
|----|-------------|
| **P-TOKENS** | Design-system foundation: token contract, multi-theme mechanism, scaffold cleanup, dark-debt strip |
| **P-BOOKER** | Booker flow polish (home/search → listing → calendar → checkout → confirmation → my bookings → group → open-capacity) |
| **P-HOST** | Host tooling polish (dashboard, listings + wizard, availability editor, requests inbox, bookings, earnings) |
| **P-AUTH** | Auth, profile, and the transactional-email shell |
| **P-CROP** | Image crop/framing UI (promoted backlog 999.2 — UI-SPEC already written) |
| **GATE-*** | Cross-cutting, applies to *every* phase |

D-131 names four hard gates: **GATE-RESP** (320px-up), **GATE-A11Y** (keyboard + WCAG AA), **GATE-STATES** (loading/empty/error), **GATE-VRT** (visual-regression baselines).

> **The single most important recommendation in this document:** D-131's four gates are all about *the new thing being good*. **None of them is about the old thing still working.** This milestone's dominant failure mode is regression, so the roadmapper should add a fifth cross-cutting gate — **GATE-NOREG** — with the specific mechanical checks named in Pitfalls 1–5. Without it, "the phase is done" can be true while a booking flow is broken.

---

## Critical Pitfalls

These cause rewrites, lost money, or silent breakage of a v1.0 correctness invariant.

---

### Pitfall 1: Restyling breaks the e2e selectors that ARE the double-booking proof — and the suite goes quietly grey, not red

**What goes wrong:**
Phase 3's guarantee (`booking_no_overlap` GiST `EXCLUDE`) is proven end-to-end by `e2e/availability.spec.ts` and `e2e/search-and-book.spec.ts`. Those specs reach the calendar through **structural CSS selectors**:

```
e2e/availability.spec.ts:154-155   .and(page.locator("td:not([data-outside='true']) button"))
                                   .and(page.locator("button:not([disabled])"))
e2e/open-capacity.spec.ts:368-369  (same shape)
e2e/open-capacity.spec.ts:591      (same shape)
e2e/cancel.spec.ts:185             getByText("Refund to you").locator("xpath=following-sibling::dd[1]")
```

The `td` comes from react-day-picker's table markup and `data-outside` from its day modifiers. A calendar restyle — a `react-day-picker` bump, a switch to a CSS-grid day layout, a custom `Day` render prop, or a shadcn `calendar` re-vendor — deletes the `<td>` and the spec can no longer *find a bookable day*. The refund assertion walks a `<dl>/<dt>/<dd>` sibling axis; a "polish the refund breakdown" pass that swaps `<dl>` for flex divs breaks the one assertion that proves the disclosed refund equals the enforced refund (D-68).

The nasty part: a Playwright locator that matches nothing produces a **timeout on a specific step**, which reads as flake. Under `retries: 2` in CI it looks like an infra hiccup, and the standard reaction to "the calendar spec is flaky since the redesign" is to relax or skip it. The double-booking proof then exists only as a green checkbox.

**Why it happens:**
The specs were written against the markup that existed, not against a contract. There is **zero `data-testid` in the entire `src/` tree** (measured: `grep -rc data-testid src/` returns no matches), so nothing in the app is declared as "this node is load-bearing for a test."

**How to avoid:**
1. **Before any component is touched, add a `SELECTOR-CONTRACT.md`** listing every structural selector in `e2e/` and `tests/` — the ~22 `page.locator(...)` calls and the `container.querySelector(...)` calls — with the file, the surface, and what it proves. This is a one-hour inventory that turns invisible coupling into a checklist. The grep that produces it:
   `grep -rn "locator(\|querySelector(\|xpath=" e2e/ tests/`
2. **Replace structural locators with role/semantic ones at the same time as the restyle, in the same commit** — never "restyle now, fix the test after." The suite is already unusually resilient: of 207 e2e selectors, **92 are `getByRole`, 30 `getByLabel`** and those survive any amount of CSS. Only the 22 `locator(` calls and 63 `getByText` calls are exposed.
3. **Where a role locator is genuinely impossible** (a calendar day cell), add a stable `data-*` hook to the component and change the spec to use it. Precedent already exists in this repo: `[data-host-dashboard]` and `[data-mode-switch]` (`e2e/mode-switch.spec.ts:51,55,76`) are exactly this pattern and are immune to restyling.
4. **Mutation-verify the migrated selector.** v1.0's strongest habit — apply a deliberate mutation, record the verbatim RED, restore, prove with `git diff --exit-code src/`. Here the mutation is: make the (N+1)th booking succeed (comment out the constraint check / widen the range) and confirm the migrated spec goes RED. A selector rewrite that was never proven to still fail is a selector rewrite you do not have.

**The test that catches it:** `npx playwright test e2e/availability.spec.ts e2e/open-capacity.spec.ts e2e/cancel.spec.ts` run **before and after** each restyle commit, plus the mutation above once per phase. A skipped or `test.fixme`'d spec must be treated as a phase blocker, never as debt.

**Warning signs:**
- A spec starts timing out on a step it used to pass; the fix proposed is a longer timeout or a retry.
- `test.skip` / `test.fixme` appears in a diff whose message says "polish".
- `git diff` touches `src/components/ui/calendar.tsx` or `photo-gallery.tsx`/`refund-breakdown.tsx` and no `e2e/` file changes.

**Phase to address:** **GATE-NOREG** (inventory produced once, before P-BOOKER starts); enforced in **P-BOOKER** and **P-HOST**.

---

### Pitfall 2: A component test keeps passing while asserting on a different element (the first-anchor trap)

**What goes wrong:**
`tests/search/search-card-open.test.tsx:314,335` reads the card's link as:

```ts
const href = container.querySelector("a")?.getAttribute("href") ?? "";
expect(href).toContain(`date=${FRIDAY}`);
expect(href).not.toContain("start=");
```

That assertion proves a real correctness property: a drop-in card must forward the **date alone**, never a start/end window the listing page cannot resume (D-123/OC-02). `querySelector("a")` returns the **first anchor in document order**. A very ordinary card redesign — wrapping the cover image in its own link so the whole photo is clickable, or adding a "Saved" / host-name link above the title — changes which anchor is first. If the new first anchor happens to carry the same href the test still passes while testing a different node; if it carries a different one the test fails for a reason that looks unrelated to drop-in behaviour and invites someone to "fix" it by relaxing the assertion.

This is v1.0 Key Lesson 1 in a new costume: **independent proof layers can share one blind spot.** The unit test, the e2e spec, and human QA would all pass a card whose *second* link forwards a stale window.

**Why it happens:**
`container.querySelector` is the path of least resistance in a jsdom test when the element has no accessible name worth querying by.

**How to avoid:**
- Rewrite the three `container.querySelector("a")` reads as **name-scoped role queries**: `screen.getByRole("link", { name: /listing title/i })`. If a card grows a second link, a name-scoped query still resolves the right one — and if it becomes ambiguous, Testing Library throws a *loud* "found multiple elements" rather than silently picking one.
- Same for `container.querySelector('[role="status"]')` at `:257,:333` — that one proves an *absence* ("no drop-in decoration leaks onto an exclusive card"). v1.0's own pattern applies: **prove an absence by scanning for the forbidden shape and seed a control of the other mode.** Both are already present in that file; keep them when the markup changes.

**The test that catches it:** run `npm test -- tests/search tests/listing tests/booking tests/availability` after every card/row restyle, and read the *count* of matched elements, not just pass/fail. Any Testing Library "multiple elements" error during a polish pass is a genuine finding, not noise.

**Warning signs:** a card gains a second `<a>`; a row gains a second `role="status"`; a test file is edited in the same commit as the component it tests, with the assertion loosened.

**Phase to address:** **GATE-NOREG**; owned by **P-BOOKER**.

---

### Pitfall 3: A "responsiveness" refactor moves price or availability into the browser — a price-tamper vector, not a smell

**What goes wrong:**
The most natural instinct in a polish milestone is *"make checkout feel live"* — make the total update as the user changes pax, make the calendar reflect a filter without a round-trip. In this codebase that is one import away from a real vulnerability, and D-130 exists precisely to forbid it.

The exposure is measured, and it is subtler than "don't move the pricing function":

- `src/lib/booking/pricing.ts` is **deliberately directive-free and isomorphic** (its own header says so, lines 13-14) so both Server Components and the transactional `createPendingHold` can import it. It carries **no `server-only`** guard — only 5 files in `src/` do, and it is not one of them. Nothing mechanically prevents `import { quoteWindow } from "@/lib/booking/pricing"` inside a `"use client"` module. There are already **81 `"use client"` files**.
- A client-side duplicate of the number is *already sanctioned* for display (`availability-calendar.tsx:246-251` computes the same figure). So "there is a client price calculation" is not by itself the finding.

**The actual regression** is a change of *provenance*: today the reserve page renders `PriceBreakdown` as a **server node** and threads a **server-formatted `totalLabel`** into the client shell (`reserve-view.tsx:31-36` — `summary` and `breakdown` arrive as `React.ReactNode` props, `totalLabel` as a pre-formatted string). Turn `PriceBreakdown` into a `"use client"` component that computes from raw rates and the displayed price becomes a **client artifact**. The charge still uses the server-frozen `booking.quoted_total_cents`, so the money is safe — but the **disclosure** is no longer the thing enforced. D-68's whole promise ("the amount is shown before confirming, and `quoteRefund` enforces the identical number") quietly becomes untrue, and a rate edit between hold and render shows the booker a price they will not be charged.

The same shape applies to availability: search reuses the listing calendar's `getAvailability` read model (`src/lib/availability/read-model.ts:165`) *specifically so results cannot diverge*. A client-side "filter these slots without a refetch" optimisation reintroduces the divergence Phase 4 designed out.

**Why it happens:**
"It's just moving where the number is formatted" reads as a rendering change, not a trust-boundary change. And it is genuinely faster, so it looks like a win.

**How to avoid:**
1. **A written provenance rule in the phase plan:** *every money figure and every availability figure rendered on a booking-path surface must originate from a Server Component or a server action's return value; a client component may receive it but never derive it.* `reserve-actions.tsx:22-28` already documents this discipline for a different reason (it renders `result.error` rather than importing the constant, so it is "structurally incapable of drifting").
2. **A source-scan gate.** This repo already has the exact machinery: `tests/use-server-exports.test.ts` walks every `.ts/.tsx` under `src/` with the TypeScript AST and fails on an illegal export shape. Clone that harness into a `tests/client-boundary.test.ts` that fails when any module with a `"use client"` prologue transitively imports `@/lib/booking/pricing`, `@/lib/payments/*`, `@/lib/availability/read-model`, or `@/lib/db`. Syntactic, fast, and it survives refactors.
3. **An e2e equality assertion, not a screenshot.** On the reserve page, read `booking.quoted_total_cents` straight from Postgres (the specs already open a `postgres` connection — `search-and-book.spec.ts:36`) and assert the rendered total string equals `formatMoney` of that value. That is the only check that proves *disclosed == charged* after a restructure.
4. **Prefer `next/dynamic`-free, prop-threaded islands.** The existing `ReserveView` shape (server nodes handed down as props) is the pattern to copy, not to replace.

**Warning signs:** a diff adds `"use client"` to a file under `src/components/booking/`, `src/components/listing/`, or a `page.tsx`; `useState` appears near a currency string; anyone says "we can compute this on the client and skip the round-trip."

**Phase to address:** **GATE-NOREG** (the AST gate lands with **P-TOKENS**, before any surface work); enforced every phase, hardest in **P-BOOKER**.

---

### Pitfall 4: Layout changes break the hold countdown — the 15-minute clock the booking depends on

**What goes wrong:**
`HoldCountdown` (`src/components/booking/hold-countdown.tsx`) is not decoration. It sets a `window.setInterval`, and at zero it calls `onExpire`, which flips the whole reserve page to `HoldExpiredState` (`reserve-view.tsx:50`). Four polish-shaped changes break it:

1. **Unmount-on-scroll.** Any virtualisation, `content-visibility: auto`, or "collapse the summary on mobile" that conditionally unmounts the widget kills the interval. The page then shows a live-looking reserve form for an already-dead hold; `Confirm` returns `expired` and the user gets a failure at the moment they committed. (The server is still correct — it re-checks `expires_at > now()` — so this is a pure UX/trust regression, which on a money screen is exactly the wrong kind.)
2. **Remount-on-relayout.** The effect keys on `[target]` where `target = new Date(expiresAt).getTime()`. If a restructure re-mounts the component with a *fresh* `expiresAt` prop on every render (e.g. a parent that re-derives the ISO string), the interval restarts and the countdown never reaches zero.
3. **A mobile sticky booking bar.** There is no mobile sticky widget today — the widget is `lg:sticky lg:top-8` only (`src/app/listings/[id]/page.tsx:346`, `reserve-view.tsx:61`). GATE-RESP will strongly pull toward adding a `fixed bottom-0` mobile CTA bar. If that bar renders a **second** `HoldCountdown`, you now have two intervals and two `onExpire` callers; `onExpire` is not idempotent at the call site (only internally guarded by `fired`), and two components both flipping parent state is a race. **Render the countdown once and portal/position it — never mount a second instance.**
4. **`aria-live` regression.** The digits deliberately carry `role="timer" aria-live="off"` with a separate `sr-only aria-live="polite"` span that announces only at the 60-second threshold and at expiry (lines 70, 83-85). A "tidy up the live regions" pass that puts `aria-live="polite"` on the digits turns the countdown into a screen-reader machine gun — 900 announcements per hold. See Pitfall 17.

**How to avoid:**
- **A rule:** `HoldCountdown` and `RequestCountdown` are **structurally frozen** for this milestone. They may receive new className props; their effect bodies, their `role`/`aria-live` attributes, and their mount points may not change without an explicit deviation record.
- **A test:** extend the existing expiry e2e (`search-and-book.spec.ts` already forces `expires_at` into the past and asserts the calm `Your hold expired` state) with a **fake-timer unit test** that mounts `HoldCountdown` at T−3s, advances 4s, and asserts `onExpire` fired **exactly once**. Then add a second test that mounts the *whole reserve layout* at the 320px and 1280px breakpoints and asserts exactly one `role="timer"` exists at each.
- **A grep gate:** `grep -c 'role="timer"'` on the rendered reserve page in the e2e — one, at every breakpoint.

**Warning signs:** a diff adds a `fixed` or `sticky` container to the reserve/listing page; `HoldCountdown` appears twice in a file; `expiresAt` starts being computed rather than threaded.

**Phase to address:** **P-BOOKER**, gated by **GATE-NOREG** + **GATE-RESP**.

---

### Pitfall 5: CSS hides an error the user must read before paying

**What goes wrong:**
This codebase puts a lot of correctness into *inline text the user is meant to read at the moment of failure*, and much of it is easy to make invisible with CSS:

- `reserve-actions.tsx:89-91` renders the checkout-lease refusal **inline** (`role="status"`), deliberately keeping the page usable. It renders `result.error` — the **server's own sentence** — precisely so it can never drift from `CHECKOUT_IN_FLIGHT_MESSAGE`.
- `profile-form.tsx:126-130` renders the avatar error as `role="alert"`.
- `partial-grant-notice.tsx:85`, `pending-payment-state.tsx:60`, `payment-reversed-state.tsx:21-22`, `rsvp-form.tsx:211-213`, `hold-expired-state.tsx:19-20` all carry live-region status text.

Six ordinary polish moves hide these:
`overflow-hidden` on a card whose fixed height no longer fits the message · `line-clamp-2` on a container that also holds the error · `truncate` on a flex row · `max-h-*` + `overflow-hidden` on a "tidy" summary panel · `opacity-0`/`animate-in` entry animation that never resolves because the element mounted while `prefers-reduced-motion` disabled the animation · a `grid` whose error cell collapses to `0fr`.

The failure is total and silent: the user clicks `Confirm & pay`, nothing appears to happen, and they click again. On a payment screen that is the worst available outcome.

**Why it happens:**
Error text is the least-often-seen state, so it is the least-often-looked-at during a visual pass. GATE-STATES asks for error states to be *designed* — it does not by itself ask for them to be *proven visible after the redesign*.

**How to avoid:**
1. **Make GATE-STATES a rendering assertion, not a design deliverable.** For every async surface, an automated check that the error state is **in the accessibility tree and has a non-zero bounding box**. In Playwright: `await expect(locator).toBeVisible()` **plus** `expect((await locator.boundingBox())!.height).toBeGreaterThan(0)`; in jsdom, `toBeInTheDocument()` is not enough — jsdom does not do layout, so **jsdom cannot catch this class of bug at all.** This must be a browser check.
2. **Force each error state in e2e.** The specs already know how to force server state (`search-and-book.spec.ts` back-dates `expires_at` directly in SQL). Do the same for: checkout-lease refusal, avatar upload failure, RSVP over-capacity, and the host-cancel fee notice.
3. **A lint rule with teeth:** forbid `overflow-hidden`, `truncate`, `line-clamp-*` and fixed `h-[...]` on any element that is an ancestor of a `role="alert"` / `role="status"` node. Cheapest enforceable version is a source-scan test in the `use-server-exports.test.ts` style over the JSX AST.
4. **Add `motion-reduce:` fallbacks now.** There is currently **zero** `prefers-reduced-motion` / `motion-reduce:` handling anywhere in `src/`, while `tw-animate-css` is imported and `data-open:animate-in` is used (`dialog.tsx:42`). Any new entry animation on an error surface must have a `motion-reduce:animate-none motion-reduce:opacity-100` companion.

**Warning signs:** an error string is present in the DOM in a jsdom test but nobody has looked at it in a browser; a "compact" variant of a card lands; `overflow-hidden` appears on a container that also renders a status.

**Phase to address:** **GATE-STATES** + **GATE-NOREG**; owned by **P-BOOKER** first (checkout), then **P-HOST**, **P-AUTH**.

---

### Pitfall 6: The token contract is declared complete while a leak sits in plain sight — and the second theme is what finds it

**What goes wrong:**
D-128 is exactly right that a working second theme is the proof. The trap is *when* you look. The characteristic sequence is: build tokens → re-skin every surface in light → declare the contract complete → build theme #2 → **fifty leaked values surface at once**, on fifty screens, at the end of the milestone when there is no schedule left. Every one of them is a small fix; together they are a phase.

**This repo already contains the archetypal leak, and it is invisible to every class-based lint:**

```
src/components/listing/listing-map.tsx:22   const BRAND_CORAL = "#E8484E";  // "--brand (FitOut Coral)"
```

It is a **JavaScript string** interpolated into an inline SVG (`fill="${BRAND_CORAL}"`) and into Leaflet `pathOptions` (`color`, `fillColor`). No Tailwind-class scan, no CSS-variable scan, and no `dark:` audit will ever see it. And it has **already drifted**: `--brand: oklch(0.637 0.208 25)` renders as **`#ef4445`**, not `#E8484E` — a real, shipped, ~1.5% mismatch nobody noticed. Under a theme swap the entire app re-skins and the map pin stays coral.

The measured inventory of leaks as of today (all reachable by scan, so all fixable in one pass):

| Leak class | Count | Where |
|---|---|---|
| Raw palette utilities (`bg-zinc-50`, `text-emerald-800`, `bg-black`, `text-white`, `text-green-600`, `bg-emerald-950`, …) | **18 occurrences** | `(auth)/layout.tsx`, `(auth)/login/page.tsx`, `(auth)/signup/page.tsx`, `(host)/host/layout.tsx`, and one `bg-black/10` in `ui/dialog.tsx:42` |
| Hex string literals in TS | **2** | `listing-map.tsx:22,34` (`#E8484E`, `#fff`) |
| Arbitrary pixel values (`[28px]` ×12, `[110px]` ×3, `[220px]`, `[190px]`, `[170px]`, `[150px]`, `[130px]`, `[96px]`, `[32px]`, `[24px]`, `[14px]`, `[11px]`, `[10px]`, `[3px]` ×9, `[4px]` ×2, `[2px]`) | **~38** | mostly `ui/*` sizing; each one is a spacing/size decision outside the scale |
| Inline `style={{}}` | **3** | `listing-map.tsx:57` (layout only, fine), `ui/progress.tsx:25` (transform, fine), `ui/toggle-group.tsx:42` (a `--gap` custom prop — check it reads from the scale) |

**How to avoid — find the leaks BEFORE declaring the contract complete:**
1. **Write the scan first, in the phase that writes the tokens.** A `tests/design-tokens.test.ts` in the proven `use-server-exports.test.ts` shape that walks every `.ts/.tsx` under `src/` and fails on:
   - any `#RRGGBB`/`#RGB` literal outside an allow-list,
   - any `rgb(`/`hsl(`/`oklch(` literal outside `globals.css` (allow-list the one documented exception the 999.2 spec reserves: the crop scrim `oklch(0 0 0 / 55%)`),
   - any Tailwind colour utility naming a raw palette family (`slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black`),
   - any `\[[0-9.]+(px|rem)\]` arbitrary size outside an allow-list.
   Ship it **red** with the 58 known violations enumerated as a baseline, then drive the baseline to zero. A scan added after the re-skin is a scan that finds nothing because everything already looks fine in light.
2. **Build theme #2 in the SAME phase as theme #1, before any surface work.** Not as a feature — as the test. A second theme with deliberately *hostile* values (invert lightness, shift hue 180°, double the radius) makes a leak scream instead of whisper. This is the cheapest possible instance of v1.0's "count blind spots, not layers."
3. **Add a "theme-swap smoke" to GATE-VRT:** for each phase's surfaces, render under theme A and theme B and assert the two screenshots **differ** above a threshold. A surface whose two-theme screenshots are *identical* is a surface that ignored the tokens entirely. (This is the inverse of a normal VRT assertion and catches the exact failure a normal VRT assertion cannot.)
4. **A leak that cannot be tokenised gets a recorded exception,** with a one-line rationale, in the same style as the 999.2 spec's scrim carve-out. An undocumented exception is a leak; a documented one is a decision.

**Warning signs:** the scan test is written "after the tokens settle"; theme #2 is scheduled after the surface phases; a `const SOME_COLOR = "#..."` appears anywhere.

**Phase to address:** **P-TOKENS** (scan + theme #2 both land here, before P-BOOKER).

---

### Pitfall 7: WCAG AA fails on the shipped tokens themselves — the coral CTA and the focus ring both fail today

**What goes wrong:**
D-131 makes "keyboard operability + WCAG AA contrast/focus" a hard gate on every phase. **The tokens the milestone is built on do not pass it.** Computed from the shipped values in `globals.css` (method in § Colour maths):

| Pair | Renders as | Ratio | Verdict |
|---|---|---|---|
| `--brand` on `--background` (coral text/icon on white) | `#ef4445` on `#ffffff` | **3.76 : 1** | ✗ AA 1.4.3 (needs 4.5) · ✓ 3:1 large-text / non-text |
| `--brand-foreground` on `--brand` (**the coral CTA and its label**) | `#fafafa` on `#ef4445` | **3.60 : 1** | ✗ AA 1.4.3 · ✓ 3:1 |
| `--brand` on `--muted` | `#ef4445` on `#f5f5f5` | **3.45 : 1** | ✗ AA 1.4.3 |
| `--success-foreground` on `--success` (published / payouts-enabled badge) | `#fafafa` on `#03a14a` | **3.24 : 1** | ✗ AA 1.4.3 |
| `--success` on `--background` | `#03a14a` on `#ffffff` | **3.39 : 1** | ✗ AA 1.4.3 |
| **`--ring` on `--background` (the focus indicator)** | `#a1a1a1` on `#ffffff` | **2.58 : 1** | ✗ **fails even 3:1 non-text (1.4.11)** |
| **`--ring/50` as actually used** (`focus-visible:ring-ring/50`, composited over white ≈ `#d0d0d0`) | | **1.54 : 1** | ✗ **catastrophically below 3:1** |
| `--border` on `--background` (input outlines) | `#e5e5e5` on `#ffffff` | **1.26 : 1** | ✗ 3:1 — acceptable for decorative dividers, **not** as a control's only boundary |
| `--destructive` on `--background` | `#e7000b` on `#ffffff` | 4.91 : 1 | ✓ AA — **but see the gamut note below** |
| `--muted-foreground` on `--background` | `#737373` on `#ffffff` | 4.73 : 1 | ✓ AA (thin margin — any lightening breaks it) |
| `--foreground` on `--background` | `#0a0a0a` on `#ffffff` | 19.79 : 1 | ✓ |

**Two of these are milestone-shaping:**

- **The coral CTA fails AA for its own label.** `Book this space`, `Confirm & pay`, `Save photo` — every primary action in the product. Since D-127 makes coral a *placeholder*, this is cheap to fix now and expensive to fix after fifty surfaces are built on it. **Prescription:** at hue 25 / chroma 0.19, `oklch(0.58 0.19 25)` ≈ `#d33a3c` gives **4.71 : 1** on white and stays in sRGB gamut. Lightness ≤ 0.58 is the AA line; `0.60` gives only 4.33. Alternatively keep the coral lightness and **restrict coral-on-white to non-text and large text (≥24px, or ≥18.7px bold)**, with a documented rule — but that rule then binds every button label in the product, which is worse than moving the token.
- **The focus ring fails the very gate that names it.** `--ring: oklch(0.708 0 0)` at 50% alpha is the shadcn default and it is invisible-by-standard. Fix in `P-TOKENS`: darken `--ring` to ≈`oklch(0.45 0 0)` (or bind it to `--brand` at full opacity) and **drop the `/50`** on `focus-visible:ring-ring/50` across the vendored components. This is a token + one sed across `src/components/ui/`.

**`--destructive` is out of sRGB gamut.** `oklch(0.577 0.245 27.325)` — chroma 0.245 at that lightness/hue exceeds sRGB. The browser gamut-maps it, so:
- the rendered colour depends on the browser's gamut-mapping algorithm (which has changed between Chrome versions),
- on a P3 display it renders **more saturated** than on an sRGB display, with a **different luminance and therefore a different contrast ratio** than the 4.91:1 above (which was computed from the sRGB-clipped value),
- and **VRT baselines captured on a P3 laptop will not match a CI runner on sRGB** — the diff is real, not flake.

**How to avoid:**
1. **Compute contrast for every token pair mechanically, in CI**, not by eyeballing. A `tests/contrast.test.ts` that parses `globals.css`, converts each `oklch(...)` to sRGB, and asserts the declared pair list meets its declared bar (4.5 for text pairs, 3.0 for non-text/UI pairs). Run it **per theme** — see Pitfall 8.
2. **Assert every token is in sRGB gamut** in the same test (clip-and-compare: if any linear channel falls outside `[0,1]`, fail with the token name). Out-of-gamut is allowed only as a deliberate, recorded P3 opt-in — and then VRT must pin the display profile.
3. **Automated contrast ≠ AA.** A contrast test does not check focus *visibility* (2.4.11 also needs area and adjacency), reflow, or target size. Pair it with the manual checks in Pitfall 17.

**Warning signs:** anyone reports "the focus ring is hard to see"; a designer nudges `--brand` lighter "for warmth"; a badge label is white-on-green; the contrast test is written to assert only the pairs that already pass.

**Phase to address:** **P-TOKENS** (fix the tokens + land the test), enforced by **GATE-A11Y** every phase.

---

### Pitfall 8: Theme #2 looks fine and fails AA — contrast does not survive a token swap

**What goes wrong:**
A theme swap changes every colour but keeps every *pairing*. A candidate direction that darkens `--muted-foreground` by two steps silently drops `--muted-foreground` on `--background` below 4.5:1 across ~30 surfaces at once, and nothing visual signals it — muted grey text looks like muted grey text. `--muted-foreground` on `--background` is at **4.73:1 today**: a 6% lightening breaks AA everywhere.

This is a hard structural point about D-128: **the token contract guarantees that a theme swap re-skins everything; it guarantees nothing about accessibility.** A one-token-contract app has one place to change colour and *N* places for that change to violate AA.

**How to avoid:**
1. **Make the contrast test theme-parameterised from day one.** It must iterate `[theme A, theme B, …]` × `[declared pairs]`. A new theme cannot be merged until it passes. This turns "add a theme" from a design act into a gated act — which is exactly the discipline D-128's preview feature deserves.
2. **Declare the pair list as data, not as prose.** A `src/lib/theme/contrast-pairs.ts` exporting `[{fg: "--brand-foreground", bg: "--brand", bar: 4.5, why: "primary CTA label"}, …]`. When someone adds `--warning`, adding it to that list is the visible cost.
3. **Choose theme #2's values to be genuinely different, not a tint.** Two near-identical themes prove nothing about leaks (Pitfall 6) and nothing about contrast.

**Warning signs:** a theme is added in a commit that touches no test; the contrast test hardcodes `:root`.

**Phase to address:** **P-TOKENS**; enforced by **GATE-A11Y**.

---

### Pitfall 9: `@theme inline` semantics — the token that generates no utility, and the variable that resolves to nothing

**What goes wrong (v4-specific, and it is already live in this repo):**

Tailwind v4's `@theme` block is not a config object; it is CSS, and the `inline` modifier changes what gets emitted:

- Plain `@theme { --color-x: … }` emits `--color-x` as a real CSS custom property **and** generates utilities that reference `var(--color-x)`.
- `@theme inline { --color-x: var(--x) }` generates utilities that **inline the value** — `background-color: var(--x)` — and **does not emit `--color-x`**. Tailwind's docs: *"the utility class will use the theme variable value instead of referencing the actual theme variable."* The reason it exists is real and this project needs it: without `inline`, `var(--color-x)` resolves *where `--color-x` is defined* (`:root`), so a `.dark`/`[data-theme]` redefinition deeper in the tree would not be picked up. The docs' own example is exactly this trap.

`globals.css:7-53` uses `@theme inline` for everything. Consequences that will bite during P-TOKENS:

1. **`--color-background`, `--color-primary`, `--color-brand` etc. do not exist at runtime.** Anything that reaches for them — `bg-(--color-brand)`, a third-party stylesheet, an inline `style={{ color: "var(--color-brand)" }}`, or an email/SVG generator — gets nothing. Reference the underlying `--brand` instead. `button.tsx:16` already gets this right: `color-mix(in oklch, var(--secondary), var(--foreground) 5%)` uses `--secondary`, not `--color-secondary`.
2. **`--font-sans` is self-referential and resolves to nothing.** `globals.css:10` declares `--font-sans: var(--font-sans)` inside `@theme inline`. Because `inline` suppresses emission, `--font-sans` is never defined; `html { @apply font-sans }` (line 143) compiles to `font-family: var(--font-sans)` with no fallback → **invalid at computed-value time → the element falls back to the UA default font** (commonly a serif). The layout defines `--font-geist-sans` (`src/app/layout.tsx:6`), not `--font-sans`. **Every `font-sans` in the product is currently a browser default.** `--font-mono: var(--font-geist-mono)` (line 11) is correct and works — the contrast between the two lines is the proof.
   **Fix:** `--font-sans: var(--font-geist-sans)`. Then verify — do not assume — with a browser assertion: `getComputedStyle(document.documentElement).fontFamily` must contain `Geist`.
   **Note for VRT:** this single fix changes the rendered font of **every surface in the app**, so it must land in **P-TOKENS before any baseline is captured**, or the first phase's baselines are all invalidated by the second phase's fix.
3. **`--font-heading: var(--font-sans)`** (line 12) inherits the same nothing. Fix both together.
4. **A token in an unrecognised namespace generates no utility at all.** Only the documented namespaces (`--color-*`, `--font-*`, `--radius-*`, `--spacing-*`, `--shadow-*`, `--breakpoint-*`, `--text-*`, …) produce utilities. Declaring `--elevation-1` in `@theme` gives you a variable and **no `elevation-1` class**. For the D-128 elevation scale, use `--shadow-*` (which does generate `shadow-*`) or accept that elevation is variable-only and applied via `shadow-(--elevation-1)`.
5. **`@theme` output is tree-shaken by default.** Unused theme variables are not emitted. If a theme-preview UI needs to *enumerate* tokens at runtime (a swatch grid), use `@theme static` — otherwise the variables the preview wants to read will not be in the stylesheet.

**How to avoid:** a `tests/theme-contract.test.ts` that boots the built CSS (or a Playwright assertion on a rendered page) and asserts, for each declared token, that `getComputedStyle` resolves it to a **non-empty** value — and for each utility the design system promises (`font-sans`, `bg-brand`, `rounded-lg`, `shadow-*`), that the utility exists in the emitted CSS. A self-referential or misnamespaced token then fails loudly instead of degrading to a browser default for three months, which is what happened here.

**Warning signs:** a font "looks slightly off" and nobody can say why; `var(--color-…)` appears in an inline style; a new token category produces no class and someone adds an arbitrary value instead.

**Phase to address:** **P-TOKENS** — first task, before any surface work.

---

### Pitfall 10: v3 advice found online, applied to a v4 codebase

**What goes wrong:**
Most Tailwind material still describes v3, and much of it is confidently wrong here. This project has **no `tailwind.config.*` at all** (only `postcss.config.mjs` + `@tailwindcss/postcss`), so any answer that starts "add this to your `tailwind.config.js`" is inapplicable, not merely outdated. The specific v3→v4 traps, from the official upgrade guide:

| v3 advice you will find | v4 reality here |
|---|---|
| `@tailwind base; @tailwind components; @tailwind utilities;` | `@import "tailwindcss";` — the directives are gone |
| `@layer utilities { .my-thing {…} }` for a custom utility | *"In v4 we are using native cascade layers and no longer hijacking the `@layer` at-rule, so we've introduced the `@utility` API as a replacement."* A custom utility declared in `@layer utilities` **will not respond to variants** (`hover:`, `lg:`) |
| `theme('colors.brand')` dot notation | `theme(--color-brand)` — CSS-variable naming; and prefer the variable directly |
| `safelist: [...]` in config | `@source inline(...)` |
| `bg-[--brand]` (bare variable in brackets) | `bg-(--brand)` — parentheses. The bracket form now means something else |
| `!flex` important prefix | `flex!` — the `!` moved to the end |
| `first:*:pt-0` stacking | `*:first:pt-0` — variant stacking reversed to left-to-right |
| `focus:outline-none` to suppress the default ring | `outline-hidden`. In v4 `outline-none` actually sets `outline-style: none` — using it where v3 meant "hidden but keep forced-colors visibility" **removes the focus outline for Windows High Contrast users**. Directly relevant to GATE-A11Y |
| `border` gives you `gray-200` | v4 defaults `border-*`/`divide-*` to **`currentColor`**. A "just add a border" polish edit inherits the text colour, which on a coral CTA is a coral border nobody chose |
| `ring` = 3px blue-500 | v4 `ring` = **1px currentColor**. The repo already compensates with explicit `ring-3` (`button.tsx:8`, `input.tsx:11`) — anyone who writes bare `ring` copying a v3 snippet gets a 1px hairline |
| `hover:` works everywhere | v4 gates `hover:` behind `@media (hover: hover)`. **A control whose only affordance is a hover state is invisible on touch** — directly relevant to GATE-RESP at 320px |

**Plus the `@apply`-in-a-component-file trap, which is v4's sharpest new footgun:**
*"stylesheets that are bundled separately from your main CSS file (e.g. CSS modules files, `<style>` blocks in Vue, Svelte, or Astro, etc.) do not have access to theme variables, custom utilities, and custom variants defined in other files."* In a Next App Router project this bites the moment anyone adds a `*.module.css` and writes `@apply bg-brand` in it — it will fail or silently produce nothing, because the module has no view of `globals.css`. The fix is `@reference "../app/globals.css";` at the top of that file (which imports for reference **without duplicating any CSS**). The *better* fix for this project: **do not introduce CSS modules at all.** The one file with `@apply` today is `globals.css:135-144` itself, which is fine because it is the main stylesheet.

**Also relevant:** `globals.css:5` declares `@custom-variant dark (&:is(.dark *))`. The v4-native way to add named themes is the same directive — `@custom-variant theme-coral (&:where([data-theme="coral"] *))` — which is what the multi-theme mechanism should use. Note the `:where()` form: it contributes **zero specificity**, so a theme variant never accidentally out-specifies a state variant. Using `:is()` (as the shipped dark variant does) adds specificity and can produce surprises where a `[data-theme] .thing` rule beats a `hover:` rule.

**How to avoid:**
- Put a one-line banner in `globals.css`: *"Tailwind v4, CSS-first. There is no tailwind.config.*. Any advice mentioning a JS config, `@tailwind` directives, or `@layer utilities` is v3 and does not apply here."*
- When looking anything up, **check the doc's version selector or publication date** before applying it. Prefer `tailwindcss.com/docs/*` current pages and the upgrade guide over blog posts.
- Ban `*.module.css` in this milestone by convention; if one is unavoidable, `@reference` is mandatory and the file gets a comment saying why.

**Warning signs:** a diff adds `tailwind.config.ts`; `@layer utilities` appears; `outline-none` appears on a focus style; a bare `ring` appears; a `.module.css` appears.

**Phase to address:** **P-TOKENS** (the banner + the ban); every phase thereafter.

---

### Pitfall 11: Stripping the dark-mode debt — 56 of the 66 `dark:` classes are in vendored shadcn components, and removing them forks the vendor

**What goes wrong:**
D-129 says remove the 66 orphaned `dark:` classes. Measured breakdown as of 2026-08-11 (`grep -ro "dark:" src/`):

| Location | Occurrences |
|---|---|
| **`src/components/ui/*` (vendored shadcn)** | **56** across 14 files — `button` (4), `input-group` (3), `badge` (3), `tabs` (3), `switch` (2), `avatar`, `calendar`, `checkbox`, `dropdown-menu`, `input`, `radio-group`, `select`, `textarea`, `toggle` |
| **App code** | **10** across 5 files — `(auth)/layout.tsx` (2), `(auth)/login/page.tsx` (1), `(auth)/signup/page.tsx` (1), `(host)/host/layout.tsx` (1), `booking/bookings-tabs.tsx` (2)… |

Four things go wrong if you take "remove the 66" literally:

1. **You fork the vendored components from upstream, permanently.** 999.2 alone requires `npx shadcn add slider alert-dialog` (999.2-UI-SPEC § Design System explicitly says this is the phase's first task). Those two components will arrive **with** `dark:` classes, immediately re-violating the rule and making the audit unrepeatable. Every future `shadcn add` does it again.
2. **The classes are inside long `cva` strings with compound state selectors** — `dark:aria-invalid:ring-destructive/40`, `dark:data-[variant=destructive]:focus:bg-destructive/20`, `dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent`. A regex strip across these strings will, sooner or later, eat a neighbouring class and change **light-mode** behaviour. `button.tsx:8` is a single 500-character class string; `input-group.tsx:17` is longer.
3. **They cost nothing today.** `globals.css:5` defines `@custom-variant dark (&:is(.dark *))`. With no ancestor carrying `.dark`, every one of these rules is inert — they are emitted CSS bytes and nothing else. The debt is *conceptual* (a half-built feature) far more than it is *operational*.
4. **`avatar.tsx:20` is not a colour override** — `after:mix-blend-darken dark:after:mix-blend-lighten`. Removing it removes a blend-mode compensation. Any theme with a dark surface behind an avatar will show a wrong-signed ring. This is the "a component becomes unreadable in a FUTURE theme" case, concretely, in the codebase, today.

**How to avoid:**
- **Scope the strip to app code only: the 10 occurrences in 5 files.** Those are genuine one-off decisions (`bg-zinc-50 dark:bg-black`, `text-black dark:text-zinc-50`) that also happen to be raw-palette leaks (Pitfall 6) — so they get **rewritten into tokens**, not deleted. `bg-zinc-50 dark:bg-black` becomes `bg-muted`; `text-black dark:text-zinc-50` becomes `text-foreground`. **Rewriting into a token is strictly better than deleting, and it is the same edit.**
- **Leave `src/components/ui/*` alone.** Record the decision: *the vendored shadcn layer keeps its `dark:` classes so it stays diffable against upstream and so `shadcn add` stays a no-thought operation; they are inert while no `.dark` ancestor exists, and they become the free dark theme D-129 already promises.* This is a **deviation from a literal reading of D-129 and it should be raised as such at P-TOKENS planning** — the decision's *intent* (dark mode is not a v1.1 feature; don't double the QA surface) is fully served without touching 14 vendored files.
- **Keep `.dark` in `globals.css` and keep the `@custom-variant`.** D-129 already says the block stays dormant.
- **The real risk D-129 is worried about is different, and it needs its own guard:** during the strip, someone converts `bg-zinc-50 dark:bg-black` to a **hardcoded light value** (`bg-white`) instead of a token (`bg-background`). That is how "the component becomes unreadable in a future theme" actually happens. The Pitfall-6 token scan is the guard: it fails on `bg-white` just as it fails on `bg-zinc-50`.

**How to verify nothing depended on a `dark:` class for contrast or legibility:**
Nothing can have, structurally — **`next-themes` has no provider mounted** (grep: `ThemeProvider` appears nowhere in `src/`; `next-themes` is imported only by `ui/sonner.tsx`), so no `.dark` ancestor has ever existed at runtime. Every `dark:` rule in this app has been dead code since it was written. Confirm this once, mechanically, rather than reasoning about it: a Playwright assertion that `document.querySelectorAll(".dark").length === 0` on each route, run **before** the strip. That single check converts "we think these are orphaned" into "we proved they are."

**Warning signs:** a diff touches more than 5 files to remove `dark:`; `bg-white`/`text-black` appears in a strip commit; `shadcn add` output shows `dark:` and someone strips it by hand.

**Phase to address:** **P-TOKENS**.

---

### Pitfall 12: Mounting a multi-theme provider silently breaks toasts on day one

**What goes wrong (measured, and it will happen the first hour of P-TOKENS):**
`src/components/ui/sonner.tsx:8` does:

```tsx
const { theme = "system" } = useTheme()
return <Sonner theme={theme as ToasterProps["theme"]} … />
```

Today `useTheme()` returns `undefined` (no provider), so the default `"system"` applies and toasts render correctly. The moment a `ThemeProvider` is mounted with named themes — `themes={["coral","sage","slate"]}` — `useTheme()` returns `theme: "coral"` and Sonner receives `theme="coral"`. Sonner's `theme` prop accepts only `light | dark | system`; the `as` cast exists precisely because someone knew this and silenced the type error. Toasts will render with whatever Sonner does with an unknown theme value — in practice, unstyled or default-styled — across every surface that toasts.

`Toaster` is mounted in the booker shell (`(app)/layout.tsx:17`), so this is not a corner.

**How to avoid:**
- When mounting the provider, **map the app theme to Sonner's vocabulary explicitly**: `theme={resolvedTheme === "dark" ? "dark" : "light"}` — never pass the raw theme name through. The token-driven `--normal-bg: var(--popover)` block already in `sonner.tsx:32-38` is what actually themes the toast; Sonner's `theme` prop only picks its own base stylesheet.
- Use `next-themes`' **`attribute="data-theme"`** (not the `class` default) for named themes, so the theme selector does not collide with the `.dark` class the `@custom-variant` keys on. Then declare `@custom-variant theme-coral (&:where([data-theme="coral"] *))` per theme.
- **Add a toast to the P-TOKENS smoke test.** Fire one on each theme and assert its computed `background-color` equals the theme's `--popover`.

**More generally — audit every third-party component that reads theme or ships its own CSS before mounting the provider.** The two in this repo:
- `sonner` (above).
- **`leaflet`**, whose stylesheet is imported directly into a client component (`listing-map.tsx:20`) and sets `.leaflet-top/.leaflet-bottom` (map controls) to **`z-index: 1000`** and `.leaflet-pane` to 400 — while shadcn's `DialogOverlay` is **`z-50`** (`ui/dialog.tsx:42`). Whether Leaflet's zoom control punches through an open modal depends on stacking contexts, so **do not reason about it — test it**: open a dialog over a page containing the map and assert `document.elementFromPoint(...)` at the control's position is not a `.leaflet-control`. This becomes urgent if a map is added to the search view (see Pitfall 20).

**Warning signs:** `ThemeProvider` lands with no change to `sonner.tsx`; a toast looks "plain" after a theme switch; a map control is visible over a modal scrim.

**Phase to address:** **P-TOKENS**.

---

### Pitfall 13: Visual-regression tests become a maintenance tax and get disabled

**What goes wrong:**
GATE-VRT is the gate most likely to be quietly abandoned, and the abandonment is rational: a screenshot suite that fails for reasons unrelated to the change is worse than no suite, because it trains everyone to click "update baselines." The failure modes, in the order they will actually bite here:

1. **Dynamic content.** Every booking surface renders live data: `HoldCountdown` renders `mm:ss` changing **every second**; `RequestCountdown` likewise; `bookings` rows render relative labels ("2h ago") composed against the **database clock** (`(app)/layout.tsx` comment); `FIT-XXXXXXXX` references are random per run; prices vary with seeded rates; the map renders **OpenStreetMap tiles fetched over the network** (`listing-map.tsx:63`). Any baseline containing a countdown, a relative time, a reference, or a map tile is guaranteed to fail.
2. **Font loading.** `next/font/google` self-hosts Geist at build time, which is good — but a screenshot taken during the swap window captures fallback metrics. And note Pitfall 9: **`font-sans` currently resolves to nothing**, so any baseline captured before that fix bakes in the wrong font.
3. **Animation timing.** `tw-animate-css` is imported and `data-open:animate-in` drives dialogs (`ui/dialog.tsx:42`). A dialog screenshot mid-fade is a coin flip.
4. **OS/browser rendering.** Playwright names snapshots `<name>-<browser>-<platform>.png` and states plainly: *"Screenshots differ between browsers and platforms due to different rendering, fonts and more, so you will need different snapshots for them"* and *"For consistent screenshots, run tests in the same environment where the baseline screenshots were generated."*
5. **Intentional-redesign churn.** A token change invalidates every baseline at once, which is correct but indistinguishable from a regression in the diff view.

**Can local Windows baselines be trusted? — Straight answer: they can be trusted as a *local* signal and must NOT be committed as the project baseline.**
The dev machine is Windows 11. Playwright will write `…-chromium-win32.png`. Those files are valid on that machine and worthless anywhere else: Windows uses DirectWrite with ClearType subpixel rendering and a different font-fallback chain than Linux (fontconfig) or macOS (Core Text), so glyph rasterisation, text advance widths, and therefore **line-wrap positions** differ — a paragraph that fits on two lines on Windows can take three on Linux, which is a layout diff, not an antialiasing diff, and no pixel threshold rescues it. Additionally, out-of-gamut `--destructive` (Pitfall 7) renders differently on a P3 laptop panel than on a headless sRGB runner.

**The prescription:**
- **Generate and store baselines from ONE environment: the official Playwright Docker image** (`mcr.microsoft.com/playwright:v1.6x-noble`), which is what CI runs. Locally, run VRT through that same container. Commit only `…-chromium-linux.png`.
- **Add `.gitignore` for `*-win32.png` / `*-darwin.png`** so a local run can never accidentally become the baseline. This is v1.0 Key Lesson 4 — *"the verification artifact is not the verification"* — applied preemptively: a committed baseline nobody can reproduce is an artifact that proves nothing.

**The rest of the prescription (do all of it or don't do VRT):**
- `toHaveScreenshot({ animations: "disabled" })` — Playwright's built-in; it finishes CSS animations and disables transitions.
- **`stylePath`** — a single `e2e/vrt.css` injected into every screenshot that neutralises volatile content: `[role="timer"], .leaflet-container, [data-vrt-volatile] { visibility: hidden }`. Playwright's docs name `stylePath` for exactly this ("filter dynamic elements"). Add `data-vrt-volatile` to the reference string, the relative-time labels, and any avatar/photo `<img>`.
- **`mask: [...]`** for anything that must stay laid out but not compared (the map panel, listing photos).
- **Freeze the clock and the data.** VRT runs against a **dedicated seed** with fixed IDs, fixed prices, and a booking whose `expires_at` is far enough out that the countdown's *first two digits* are stable — or simply masked. Do **not** reuse the booking e2e seeds; they randomise IDs per run by design (`randomUUID()` in every spec).
- **Screenshot components/pages, not the viewport, and pick few.** One baseline per *surface archetype* (search result card, listing hero, calendar, checkout summary, booking row, host wizard step, email shell), at **320 / 768 / 1280**, per theme — not one per route. A suite of ~20 well-chosen baselines survives; a suite of 200 does not.
- **Baseline churn discipline:** an intentional redesign updates baselines in a **dedicated commit that changes nothing else**, so the diff is reviewable as "these 40 images changed and here is why." Never mix a baseline update with a code change.
- **Order the work so the churn happens once:** the font fix, the `--brand` contrast fix, and the `--ring` fix (Pitfalls 7 and 9) all change **every** screenshot. They must land in **P-TOKENS before the first baseline is captured.**

**Warning signs:** a PR updates baselines and source in one commit; `maxDiffPixels` is raised twice; `.png` files with `win32`/`darwin` in the name appear in `git status`; a VRT spec gets `test.skip`.

**Phase to address:** **GATE-VRT**, set up in **P-TOKENS**, honoured every phase.

---

### Pitfall 14: The email shell breaks `escapeHtml` — a security boundary undone by a "make it pretty" pass

**What goes wrong:**
`src/lib/email.ts` is deliberately thin (D-66: no React Email, no new email stack) and every interpolated field is escaped — **20+ call sites**, each with a `// WR-01` comment, covering space titles, booker labels, money labels, deadline labels, references, and **every URL** (`:55, :60, :111, :137, :164-165, :188, :220-221, :253…`). `tests/auth/email-escaping.test.ts` asserts on this.

Wrapping these in a branded shell breaks it in four distinct ways, and the first three are easy to miss in review:

1. **Double-escaping.** If the new `renderEmail({ heading, body, ctaLabel, ctaUrl })` helper escapes its inputs, and the existing call sites *already* escape theirs, `&` becomes `&amp;amp;` and a query-string URL `?token=x&redirect=y` breaks the reset link. **The reset link breaking is a P0 auth outage that no unit test asserting "the string is escaped" would catch.** Decide once: **the shell escapes, or the call sites do — never both.** Given the tests already pin the call sites, keep escaping at the call sites and make the shell a **pure concatenator that escapes nothing and assumes escaped input**, with that contract in its docblock and in its parameter names (`safeHeading`, `safeBodyHtml`, `safeCtaUrl`).
2. **A new un-escaped field.** The shell introduces `preheader`, `footerText`, `recipientName`, `unsubscribeUrl`. Every one is a new injection sink, and none is covered by the existing tests. v1.0's own pattern applies verbatim: **"a duplicated security check gets its own independent test"** — every new interpolated field gets its own assertion, not a shared "the shell escapes things" test.
3. **The URL in two places.** A branded CTA usually renders the link **twice**: as a styled `<a href>` button and as a fallback plain-text URL beneath it ("or paste this link"). Both are sinks. The existing pattern (`sendVerificationEmail`) already uses `safe` twice for exactly this reason — preserve it.
4. **`href` inside a table/VML wrapper.** Outlook button techniques (`<v:roundrect href="...">`) put the URL inside a *VML attribute*, and `escapeHtml`'s five-character escape is correct for HTML attributes but the VML/`mso` path is easy to get wrong by copy-paste. Prefer a padded `<td>` with a background colour and a plain `<a>` — no VML.

**The extra rule this codebase needs:** `email.ts` currently has a **dev fallback that logs the FULL email body including the live reset token** when `RESEND_API_KEY` is unset, gated hard on `NODE_ENV !== "production"` (`:38-49`, comment WR-02). A "let's preview our new emails" helper that renders bodies to disk or to a route **must not** re-open that hole. Any preview surface renders with a **dummy token**, never a real one, and never in production.

**Also: 999.1 is deliberately NOT in scope** (PROJECT.md), but it is adjacent — the auth emails are one-liners with the raw URL as its own anchor text. Applying the shell to them *looks* like it finishes 999.1. It does not: 999.1's substance is the missing expiry statement, the missing "if you didn't request this" line, and the silent post-reset landing. **Applying a shell to an auth email is in scope; changing its copy or its post-reset routing is 999.1 and is out.** State this boundary in the phase plan or it will be crossed by accident.

**Warning signs:** `escapeHtml` appears inside the shell helper AND at a call site; a new email field has no test; `dangerouslySetInnerHTML` appears anywhere near email; an email preview route lands.

**Phase to address:** **P-AUTH**.

---

### Pitfall 15: Email HTML is not web HTML — the branded shell renders correctly only in the browser you tested

**What goes wrong:**
The whole design system is CSS custom properties in oklch. **Email clients support neither.** Concretely:

- **No CSS custom properties.** `var(--brand)` is not supported in Outlook (Word engine) and is unreliable elsewhere. Every colour in an email must be a **literal hex**, which means the app's single source of truth cannot be the email's source of truth. → **Drift risk**, below.
- **No `oklch()`.** Same problem, worse — an unsupported colour function makes the whole declaration invalid, so the element falls back to its inherited/default colour. A coral CTA silently becomes a plain link.
- **Outlook (Windows desktop) renders with the Word engine.** No flexbox, no grid, no `max-width` on divs, unreliable `padding` on non-table elements, no `border-radius`, no background images without VML. Layout is **nested tables with fixed widths** or it is not layout.
- **Gmail clips at ~102 KB of raw HTML** and shows "[Message clipped] View entire message". The cut is at a byte count, not a tag boundary, so it produces broken markup and half-applied CSS. A verbose branded shell — inline styles repeated on every cell, an embedded `<style>` block with dark-mode media queries, a long footer — reaches 102 KB faster than people expect. **Budget: keep every send under ~90 KB.**
- **Dark mode is applied *to* your email, not *by* it.** Over 25% of opens are in dark mode (Litmus, May 2026). Gmail's apps apply **full colour inversion** and **ignore `prefers-color-scheme`**; Outlook iOS fully inverts; Apple Mail and Outlook Android partially invert; Apple Mail / iOS Mail / Outlook 2019+ / Samsung Mail / Thunderbird honour `prefers-color-scheme`. The practical consequence for FitOut: **a white-background email with dark text is safe** (inverts to a legible dark card). **A near-white `#fafafa` on coral CTA is not** — partial inversion can invert the label and leave the background, producing coral-on-coral. Same hazard for the `--success` badge.
- **Transparent PNG logos invert into invisibility.** Any brand mark in the shell must be a solid-background image or an SVG-free `<img>` with an explicit background — and D-127 says no brand asset is commissioned anyway, so **prefer a text wordmark**.

**How to avoid:**
1. **Give email its own token file, generated from the app tokens, and test the mapping.** `src/lib/email/tokens.ts` exporting `EMAIL_BRAND = "#ef4445"` etc., plus a **`tests/email-tokens.test.ts` that converts the `oklch()` values in `globals.css` to sRGB hex and asserts they equal the email constants.** That test is the entire answer to "drift between app tokens and email values" — and it would have caught the existing `#E8484E` vs `#ef4445` drift in `listing-map.tsx` (Pitfall 6). Same technique, two consumers.
2. **Design the shell to survive inversion rather than to fight it.** Light background, dark text, generous contrast, no colour-only meaning, an outlined-not-filled CTA if the filled one cannot be made safe. `[data-ogsc]` and `color-scheme: light dark` hacks are unreliable — do not stake legibility on them.
3. **A byte-size assertion in the test suite:** for each send, `expect(Buffer.byteLength(html)).toBeLessThan(90_000)`. Cheap, deterministic, and it is the only Gmail-clipping guard that runs without a rendering service.
4. **v1.0 Key Lesson 3 applies directly — some bugs are only reachable by a human against real infrastructure.** The webhook signature parser rejected *every* real PayMongo signature and only a live tunnel found it. Email is the same shape: **the phase is not done until one of each send has been opened in real Gmail (web + Android app), real Outlook desktop, and Apple Mail — at least one of them in dark mode.** Put those on the human-UAT list explicitly, and name the ones that are blocked on not having an account as *blocked-on-external* (v1.0 Key Lesson 5), not as unfinished.

**Warning signs:** `var(--` appears in an email template; a `<div>` is used for layout in an email; the email preview is only ever viewed in a browser; nobody has stated the byte size.

**Phase to address:** **P-AUTH**.

---

### Pitfall 16: The crop UI's server-side re-crop re-frames what the user just framed

**What goes wrong:**
`src/lib/cloudinary.ts:29` applies, unconditionally:

```ts
transformation: { width: 400, height: 400, crop: "fill", gravity: "face" }
```

This is the bug that created 999.2: `gravity: "face"` on a source with no face falls back to an arbitrary region. Once the cropper ships, this transform runs **after** the user's chosen framing and re-selects a region — the user's decision is overwritten by a guess. The 999.2 UI-SPEC settles it (§ 4): change `gravity` to `"center"` and **do not delete the transform**, because `uploadAvatarAction` is a public server action whose Zod guard checks type and size only (`validation/profile.ts:39-47`) — a non-browser client can POST a 4.9 MB 8000×6000 JPEG and never touch the cropper. The transform stays as a **fail-closed normalizer**; on the contract-honouring path (a 400×400 square in) it is arithmetically the identity.

**The pitfall is the regression:** someone later "simplifies" by restoring `gravity: "face"` or `"auto"`, or by deleting the transform. Both are silent. The spec already flags that two shipped comments become false with this change (`actions/avatar.ts:10`, `cloudinary.ts:1-9`) — *"a false comment on the money-adjacent path is how the next reader reintroduces `gravity: 'face'`."*

**How to avoid:**
- **A grep gate, in the codebase's own established style:** `tests/cloudinary-gravity.test.ts` asserting the source of `src/lib/cloudinary.ts` contains `gravity: "center"` and contains **no** occurrence of `"face"`, `"auto"`, `"faces"`, or `"custom"`. This repo already uses source-scanning gates for exactly this class of invariant (`tests/use-server-exports.test.ts`, and the `grep -c` gate pinning both hold paths' hours `EXISTS`).
- **Fix both comments in the same commit**, as the spec requires.
- **A round-trip test:** upload a 400×400 image whose four quadrants are distinct solid colours; assert the stored asset's quadrants are unchanged. A `gravity` regression moves them.

**Phase to address:** **P-CROP**.

---

### Pitfall 17: Accessibility retrofit — where AA actually fails in these five components

Each row below names the *specific* failure and the *specific* fix. GATE-A11Y should be read as this list, not as "run axe."

#### (a) Month → day → time-slot calendar picker
| Failure | Fix |
|---|---|
| Grid arrow-key navigation is broken by a custom day renderer. `react-day-picker` provides roving tabindex over a `<table>`; a CSS-grid rewrite that drops the table roles leaves 30+ tab stops per month. | Keep the table semantics (which also keeps the e2e selectors of Pitfall 1 alive). Test: `Tab` into the grid must produce **one** stop; `ArrowRight`/`ArrowDown` must move focus. |
| **Unavailable slots communicated by colour/opacity only.** Occupied, blocked and past hours are unselectable — if the only cue is a lighter fill, that is 1.4.1 (use of colour) and 1.3.1. | Every unavailable cell carries `aria-disabled="true"` **plus** an accessible name that states why (`"9:00 AM, unavailable"`). Never `disabled` alone on a focusable grid cell (it removes it from the tab order and from discovery). |
| Month change is not announced; a screen-reader user arrows past the last day and has no idea the grid changed. | An `aria-live="polite"` caption naming the visible month; move focus to the first day of the new month. |
| Selection is a *range* (hourly range-fill). The end of a range is meaningless without a statement. | On each selection change, announce the resulting window in the same `sr-only` polite region: `"Selected 5:00 PM to 7:00 PM, Makati time"` — it also matches the venue-timezone discipline already in the copy. |
| Day-cell hit area below 24×24 CSS px at 320px. | The 999.2 spec's `min-h-11` (44px) idiom is the house standard; apply it here. WCAG 2.2 **2.5.8 Target Size (Minimum)** is AA and requires 24×24. |

#### (b) Multi-step wizard (host listing create/edit)
| Failure | Fix |
|---|---|
| Step change does not move focus. The user submits step 2, new content renders, focus is still on the (now-detached) button or reset to `<body>`. Screen reader announces nothing; keyboard user is at the top of the document. | On step change, move focus to the new step's `<h2>` (`tabIndex={-1}` + `.focus()`), and announce the step in a live region: `"Step 3 of 6, Photos"`. |
| Validation errors are rendered but not associated. | `aria-describedby` from the input to its error node, `aria-invalid="true"` on the input, and **focus the first invalid field** on failed submit. RHF gives you the field order; use it. |
| The progress indicator is decorative markup with no semantics. | `<ol>` of steps with `aria-current="step"`, or a `role="progressbar"` with `aria-valuenow/min/max` and an accessible name. |
| An error summary appears at the top but is never reached. | Render it in a `role="alert"` container **and** focus it — and remember Pitfall 5: it must be laid out, not clipped. |

#### (c) Map + list search view
| Failure | Fix |
|---|---|
| **A Leaflet map is a keyboard trap or an unreachable region.** Leaflet's container is focusable and consumes arrow keys; without an escape route the keyboard user is stuck panning. | Make the map **supplementary, never the only path to a result.** The list is the source of truth and must be complete. Give the map `role="application"` with an accessible name, ensure `Esc`/`Tab` leaves it, and keep `scrollWheelZoom={false}` (already correct at `listing-map.tsx:59`). |
| Map markers are the only way to reach some listings. | Every marker has a corresponding list item. Marker ↔ card focus sync is a nice-to-have; list completeness is the requirement. |
| OSM tile attribution is removed for aesthetics. | Not an a11y issue but a **licence** one — the attribution control is required by the ODbL. Do not restyle it away. |
| Result count changes on filter with no announcement. | `role="status"` live region: `"12 spaces found."` |

#### (d) Modal payment flow
| Failure | Fix |
|---|---|
| Focus is not trapped, or is not returned to the trigger on close. | Radix `Dialog` gives both. **Do not override `onEscapeKeyDown`/`onInteractOutside` except while a mutation is in flight** — which the 999.2 spec already prescribes for the crop dialog's saving state, and which is the correct exception. |
| The dialog has no accessible name, or the name is an icon. | `DialogTitle` is mandatory; if visually hidden, use `sr-only`, never omit. |
| **Errors inside the dialog are announced but invisible, or visible but not announced.** | Both: `role="alert"` **and** the layout assertion from Pitfall 5. |
| A destructive confirm defaults focus to the destructive action. | Initial focus on the **safe** action (999.2's `Keep photo`; Phase 7's `Keep booking`). This is already the house rule — preserve it. |
| The real payment happens **off-site** (PayMongo hosted checkout). A modal that says "redirecting…" with only a spinner is silent to a screen reader. | `aria-live="polite"` text stating the redirect. `pending-payment-state.tsx:55-60` already does this correctly — copy that shape, don't reinvent it. |

#### (e) Countdown timer — a genuine screen-reader trap
| Failure | Fix |
|---|---|
| **`aria-live="polite"` on ticking digits** → an announcement every second; ~900 per 15-minute hold. The user cannot use the page. | The shipped implementation is already correct and must be **preserved verbatim**: `role="timer" aria-live="off"` on the digits, with a **separate `sr-only aria-live="polite"` span that fires only at the 60-second threshold and at expiry** (`hold-countdown.tsx:70,83-85`). Treat this as frozen (Pitfall 4). |
| Colour-only urgency. The final minute turns the numerals `text-destructive`. | Already handled — the icon and the `"Finish soon — "` label persist, so colour is never the sole signal (line 73). Do not "clean up" the redundant label. |
| `role="timer"` with no accessible name. | The surrounding sentence ("Held for 4:32") supplies it. If the layout splits them, add `aria-label`. |
| An animated/pulsing timer with no reduced-motion escape. | `motion-reduce:animate-none`. There is **no** `prefers-reduced-motion` handling anywhere in `src/` today — any new animation must add it. |

**Cross-cutting a11y prevention:**
- **Install an automated axe pass** (`@axe-core/playwright`) as part of GATE-A11Y, run against every polished route in both themes. There is **no axe/a11y tooling in the repo today**. But state the limit honestly: **axe finds ~30–40% of WCAG issues.** It will catch the contrast failures in Pitfall 7 and missing names; it will not catch focus order, focus return, keyboard traps, or a live region that announces at the wrong time.
- **The manual half is a scripted keyboard walk per surface:** Tab from the top to the primary action without a mouse; confirm every stop has a visible focus indicator (which requires the `--ring` fix); confirm no trap; confirm the primary action is reachable at 320px.
- **v1.0 Key Lesson 1 applies:** axe + VRT + human QA can share a blind spot if all three run at desktop width in light theme against the same seed. **Vary the axis deliberately** — run axe at 320px, run the keyboard walk in theme #2, run human QA on a real touch device.

**Phase to address:** **GATE-A11Y**, every phase; the token-level fixes in **P-TOKENS**.

---

### Pitfall 18: Image-crop specifics (999.2) that break on real devices

| Failure | Prevention | Owner |
|---|---|---|
| **Canvas limits on large uploads.** Safari caps a canvas at **16,777,216 px** total area (and iOS at roughly 4096×4096), with a device-dependent total-canvas-memory ceiling (~224–384 MB). Over the limit `getContext("2d")` returns **null**, so `toBlob()` silently produces nothing — the user taps `Save photo` and gets an unexplained failure. A 5 MB JPEG can decode to 8000×6000 = 48 M px. | **Never draw the source at full size.** Downscale to an intermediate ≤ 2048×2048 (or draw straight to a 400×400 destination canvas using the crop rect as the source rect — `drawImage(img, sx,sy,sw,sh, 0,0,400,400)` never allocates a large canvas at all). Then null-check the context and the blob and surface `AVATAR_UNREADABLE_MESSAGE` rather than failing silently. | **P-CROP** |
| **EXIF orientation mismatch between the stage and the bytes.** A phone photo with orientation 6 displays rotated in an `<img>` (browsers auto-apply EXIF for `<img>`) but `drawImage` from certain decode paths does not — the saved crop is rotated 90° from what the user framed, breaking IC-02 ("the preview IS the contract") silently. | Use **one decode path for both** — `createImageBitmap(file, { imageOrientation: "from-image" })` — and prove it: the spec already mandates *"one EXIF-orientation-6 JPEG walked end to end"* in verification. Keep that as a **committed test fixture**, not a manual step. | **P-CROP** |
| **Mobile drag/pinch ergonomics.** A one-finger drag that scrolls the page instead of panning; a pinch that zooms the whole page. | `touch-action: none` on the stage (already in the spec § 2b) **plus** Radix's body-scroll lock. Verify on a **real device** — Chrome DevTools touch emulation does not reproduce iOS Safari's gesture handling. v1.0 Key Lesson 3: some bugs are only reachable by a human on real hardware. |  **P-CROP** |
| **The Slider hidden on mobile** because "pinch is enough." Pinch is undiscoverable and unusable one-handed. | Spec § 2d already forbids hiding it. Keep the thumb hit area ≥ 44×44 even if the track is thinner. | **P-CROP** |
| **What a cancel leaves behind.** The classic: cancel, re-pick **the same file**, and nothing happens — because `<input type="file">` does not fire `change` when the value is unchanged. Silently dead retry. | Reset `input.value = ""` on close (spec § 2f), revoke the object URL, unmount the cropper. **Test it explicitly**: pick → cancel → pick the same file → dialog opens. | **P-CROP** |
| **Orphaned Cloudinary assets.** Not a risk here *by design*: nothing uploads before `Save photo` (F4), and `overwrite: true` + a single canonical `public_id` means no orphan accumulates. Preserve both properties. | A test asserting zero network calls occur before confirm. | **P-CROP** |
| **The cover preview drifting from the surfaces it previews.** Two ratios (16:9 hero, 4:3 cards) live as inline literals in three shipped files. | The spec's § 3a resolution is right and is **required, not optional**: a test that reads the ratio each shipped surface renders and compares it to `COVER_FRAME_HERO_RATIO` / `COVER_FRAME_CARD_RATIO`. **v1.1 makes this sharper:** P-BOOKER is *permitted to restructure search results and listing detail* (D-130), so the odds of a ratio changing during this milestone are high. Land the test **before** the restructure, not after. | **P-CROP** + **P-BOOKER** |
| **Copy constants placed in a `"use server"` module.** Next rejects a `"use server"` module exporting anything but async functions, **at module evaluation** — this exact mistake made avatar upload silently dead for all of Phase 1 while tests stayed green. | Constants live in directive-free modules (`src/lib/avatar.ts`). `tests/use-server-exports.test.ts` already holds this line repo-wide — do not weaken it, and note a **re-export is the same violation wearing a shim**. | **P-CROP** |

---

### Pitfall 19: Scope creep — the five characteristic ways a polish milestone goes bad

| Failure mode | Early warning sign | Discipline that prevents it |
|---|---|---|
| **Redesigning instead of polishing.** D-130 grants restructure rights on exactly three surfaces (search results, listing detail, checkout). It gets read as a general licence. | A wireframe appears for a surface not on the list. A phase plan says "rethink." A new component directory appears. A route is added or removed. | **Write the three-surface allow-list into every phase plan verbatim.** Everything else is a *re-skin*: same DOM shape, same copy, tokens and spacing swapped. Concretely: a non-allow-listed surface's diff should contain **no new JSX elements and no changed strings** — which is also a mechanical review check (`git diff --stat` on `.tsx` where the added-line count is dominated by `className=`). |
| **Making brand decisions while branding is unlocked (violates D-127).** | Someone proposes a logo, a wordmark, a custom typeface, a photography treatment, or "our" colour. A design review spends >15 minutes on a hue. Coral gets a name. | D-127 is a *decision*, so cite it and stop. The single legitimate colour conversation this milestone is **Pitfall 7's contrast fix**, which is an accessibility correction with a computed target (`L ≤ 0.58`) — not a taste call. Reframe every palette debate as "does it pass 4.5:1?" and it ends in ten seconds. **Timebox: any colour discussion longer than one exchange goes to the theme-preview surface and gets decided on real screens later — which is precisely what D-128 built the preview for.** |
| **Gold-plating low-traffic host surfaces while the booker flow stays rough.** Host earnings/payouts is the most fun screen to design and the least used. | Host surfaces are polished before booker surfaces. An earnings chart appears. `chart-1..5` tokens (currently all greyscale) get a real palette. | **Order the phases booker-first and say why in the roadmap**: the founding decision "optimize for the booking side first" is recorded in PROJECT.md and held for nine phases. Hold it a tenth time. Give host surfaces a **fixed, smaller budget** and accept "consistent, not beautiful" as the host bar. |
| **Building components nobody uses.** A design system attracts speculative components: `EmptyState`, `PageHeader`, `Stat`, `Callout`, `Section`… half of which get one call site. | A component lands in the same commit as its only consumer, or with none. `src/components/ui/` grows beyond the shadcn set. | **Rule of three: extract a component on its third call site, never its first.** shadcn's copy-in model already means every primitive you `add` is yours — prefer `npx shadcn add` (official, accessible, maintained) over hand-rolling, and prefer composition in the consuming file over premature abstraction. |
| **Bikeshedding placeholder colours.** The lowest-stakes decision attracts the most opinion precisely because everyone can hold one. | Multiple sessions revisit the same token. Themes multiply past three. Someone asks "but is coral *us*?" | D-127 answers that: **it is not "us," it is a placeholder, chosen because it is cheapest to swap.** Cap the theme count at **three** (one continuity theme + two deliberately different, per Pitfall 6/8) and make adding a fourth require passing the contrast gate — which converts a taste argument into a build task. |

**Two more, specific to this repo:**

- **Merging the two headers.** `(app)/layout.tsx` carries an explicit comment: *"the booker header and the host header are duplicated inline, and D-04 deliberately made the host shell distinct… Merging them is out of scope and contradicts D-04. **Do NOT refactor the two headers into one here.**"* A visual-consistency milestone will want to merge them. **The `bg-zinc-50` in the host header is a token leak to fix (→ `bg-muted`); the distinctness is a decision to keep.** Fix the leak, keep the fork.
- **Finishing 999.1 by accident.** See Pitfall 14.

**Phase to address:** all phases; enforced at **phase-plan review** and in the roadmap's phase-goal wording.

---

### Pitfall 20: Adding capability while calling it polish

**What goes wrong:**
The question set assumes a "map + list search view." **There is no map on search today** — `src/components/search/` contains `search-bar.tsx`, `search-result-card.tsx`, `search-results.tsx` and nothing map-related; the only map is the single-listing panel (`listing-map-panel.tsx` → `listing-map.tsx`, loaded `ssr: false`). Adding a map to search is **new capability**, not polish: it needs viewport-bounded querying (a `bbox` parameter the two-stage PostGIS search does not take today), marker clustering, marker ↔ card sync, a mobile map/list toggle, its own loading and empty states, and its own a11y story (Pitfall 17c). It is also the surface where the Leaflet `z-index: 1000` vs `z-50` collision (Pitfall 12) becomes a daily problem.

**Why it happens:** "Airbnb-calm" is the stated direction, and Airbnb's search *is* a map. The reference pulls the feature in.

**How to avoid:** state in the roadmap that **v1.1 adds no new transaction or discovery capability** — PROJECT.md already says "v1.1 adds no new transaction capability," so extend the same sentence to search. If a search map is genuinely wanted, it is a **v1.2 phase with its own requirements**, not a polish task. Same test applies to: a filter drawer with new filters, saved searches, a favourites/heart control, listing comparison, and an earnings chart. **The question to ask of any proposed surface: "if I build this, does a REQUIREMENTS ID change?" If yes, it is not polish.**

**Warning signs:** a phase plan mentions clustering, `bbox`, `IntersectionObserver`, or a new query parameter; a new column or migration is proposed in a visual milestone (v1.1 should ship **zero** migrations — 999.2's D-C explicitly adds no schema column).

**Phase to address:** roadmap definition; re-checked at every phase plan.

---

## Colour maths — how the numbers above were derived

So they can be re-checked rather than trusted. For each `oklch(L C h)` in `globals.css`:
1. OKLCh → OKLab: `a = C·cos(h°)`, `b = C·sin(h°)`.
2. OKLab → LMS′ via the standard Björn Ottosson matrix; cube each component.
3. LMS → linear sRGB via the standard matrix.
4. **Gamut check:** any linear channel outside `[0,1]` ⇒ the colour is outside sRGB and the browser will gamut-map it. (`--destructive` fails this.)
5. Clamp, then encode with the sRGB transfer function to get the hex shown.
6. WCAG 2.x relative luminance `Y = 0.2126R + 0.7152G + 0.0722B` on the **linear** values; contrast `= (Y_light + 0.05) / (Y_dark + 0.05)`.
7. For `ring-ring/50`, alpha compositing is done by browsers in **gamma-encoded** sRGB, so `#a1a1a1` at 50% over `#ffffff` composites to `#d0d0d0` — then step 6.

Bars applied: **4.5:1** for normal text (WCAG 1.4.3 AA), **3:1** for large text (≥24px, or ≥18.66px bold) and for non-text UI components and states (1.4.11), which is also the bar the focus indicator must clear.

These should be re-verified with a tool during P-TOKENS — but the *method* is the point: an automated contrast test that does exactly the above is what makes GATE-A11Y real rather than aspirational.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|---|---|---|---|
| Skip the token-leak scan; rely on the second theme to find leaks | Ships tokens a day sooner | Leaks surface at the end of the milestone, on fifty screens at once, with no schedule left | **Never** — the scan is ~80 lines in a proven harness |
| Build theme #2 after the surface phases | Feels like the natural order | Removes the only evidence D-128 asks for, exactly when it would be cheapest to act on | **Never** — theme #2 is the test, not the feature |
| Commit Windows-generated VRT baselines | VRT "works" today | Every CI run diffs; baselines get regenerated per-machine; the gate is abandoned within two phases | **Never** — gitignore `*-win32.png` |
| Raise `maxDiffPixels` to make a VRT failure go away | Green pipeline | The threshold that hides antialiasing also hides a shifted button | Only with a written reason **per assertion**, never globally |
| Strip `dark:` from vendored `src/components/ui/*` | Literal D-129 compliance | Forks 14 files from upstream; every `shadcn add` re-violates; regex strips risk mangling 500-char `cva` strings and changing light behaviour | **Never** — scope the strip to the 10 app-code occurrences and record the deviation |
| Convert `bg-zinc-50 dark:bg-black` to `bg-white` during the strip | One less token to name | Bakes a light-mode value into a component; the future theme renders it unreadable — the exact failure D-129 is trying to avoid | **Never** — convert to `bg-muted`/`bg-background` |
| `@apply` in a CSS module instead of utility classes | Familiar from v3 | Fails or silently no-ops without `@reference`; introduces a second styling system | Only with `@reference` **and** a recorded reason |
| Copy a hex into a component "just for this SVG/canvas" | Unblocks a marker/pin | Invisible to every class-based lint; drifts silently — **already happened** (`#E8484E` vs `#ef4445`) | Only via a generated constant that a test pins to the token |
| Restyle now, migrate the e2e selector after | Keeps the visual work flowing | The proof of the double-booking guarantee is unverified for the length of the gap, and "flaky" becomes the accepted diagnosis | **Never** — same commit |
| Defer the `--ring` / `--brand` contrast fix to "the a11y pass" | Faster first surfaces | Invalidates every VRT baseline captured before it and every surface built on a failing token | **Never** — land in P-TOKENS before the first baseline |
| Reuse the existing booking e2e seeds for VRT | No new fixtures | Those seeds randomise IDs and dates per run by design; every baseline churns | **Never** — VRT gets its own frozen seed |
| Let the email shell escape its inputs "to be safe" | Feels more secure | Double-escapes the reset URL's `&`; breaks password reset in production; no existing test catches it | **Never** — escape at exactly one layer |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|---|---|---|
| **next-themes** | Mount `ThemeProvider` with named themes and pass `theme` straight through to `Sonner` | Map to `light`/`dark` explicitly at `ui/sonner.tsx:8`; use `attribute="data-theme"` so named themes don't collide with the `.dark` class the `@custom-variant` keys on; add `disableTransitionOnChange` |
| **next-themes + SSR** | Read `theme` during render → hydration mismatch on every page | Gate on a mounted flag, or accept `suppressHydrationWarning` on `<html>` (the codebase already uses `suppressHydrationWarning` correctly for the countdown digits — same idea) |
| **shadcn/ui (vendored)** | Rename or re-layer a token (`--primary` → `--color-action`) and expect components to follow | All 30 vendored components hardcode the shadcn token names (`bg-primary`, `text-muted-foreground`, `border-input`, `ring-ring`). **Keep the shadcn names as the contract and re-point their *values*.** If a semantic layer is wanted, add `--action: var(--brand)` **on top**; never rename underneath. A rename means editing 30 files and permanently breaking `shadcn add` |
| **shadcn/ui `add`** | Run `npx shadcn add` mid-phase and discover it rewrites `globals.css` | It can modify the CSS and `components.json`. Run it as the **first task** of a phase (999.2 spec already mandates this for `slider`/`alert-dialog`), review the CSS diff, and re-run the token scan immediately after |
| **Tailwind v4** | Apply v3 advice (JS config, `@tailwind`, `@layer utilities`, `theme('a.b')`, `bg-[--x]`, `!important` prefix) | See Pitfall 10. There is no `tailwind.config.*` in this project |
| **Leaflet** | Assume its stylesheet is inert | It ships global `.leaflet-*` rules with `z-index` up to 1000 vs shadcn's `z-50` overlay, and a focusable container that eats arrow keys. Test overlay stacking with `elementFromPoint`; keep the map supplementary to the list |
| **Leaflet / OSM** | Restyle away the attribution control | Required by the ODbL. Style it; don't remove it |
| **Cloudinary widget** | "Just enable `cropping: true`" | Three measured blockers (999.2 § N1–N3): it forces `multiple: false` (breaking 20-photo batch upload), it does not crop the asset (only writes `customCoordinates`; all four delivery sites render the raw `secure_url`), and it 400s at `ALLOWED_SIGN_KEYS`. **And there is no single cover ratio to crop to** (16:9 hero vs 4:3 cards). The decision is a non-destructive preview |
| **Cloudinary server transform** | Delete it, or restore `gravity: "face"/"auto"` | Keep it as a fail-closed normalizer with `gravity: "center"`; pin with a source-scan test (Pitfall 16) |
| **Resend / plain-HTML email** | Introduce React Email or a component-based template engine to get a shell | **D-66 forbids it.** The shell is a plain-string concatenator over the existing `send()`/`escapeHtml()` helpers |
| **Gmail / Outlook / Apple Mail** | Test the branded email in a browser and ship | No CSS custom properties, no `oklch()`, Word-engine layout in Outlook, ~102 KB clipping in Gmail, forced inversion in Gmail/Outlook apps. Literal hex, table layout, byte budget, and a real-client human check |
| **Playwright screenshots** | Commit baselines from the dev machine | Baselines are `<name>-<browser>-<platform>.png`; Windows DirectWrite changes line-wrapping, not just antialiasing. Generate in the Playwright Docker image only |
| **`@axe-core/playwright`** | Treat a green axe run as WCAG AA compliance | Axe finds roughly a third of issues and no focus-order, focus-return, keyboard-trap, or live-region-timing problems. Pair with a scripted keyboard walk |
| **gsd-sdk** | Trust that phase/metric writes landed | v1.0: `record-metric`, `add-decision`, `record-session` silently no-op'd for entire phases and `milestone.complete` corrupted `STATE.md`. **Verify SDK writes by reading the file back** |

---

## Performance Traps

| Trap | Symptoms | Prevention | When it breaks |
|---|---|---|---|
| Client-bundle growth from `"use client"` creep during a "make it interactive" pass | Slower TTI on the listing page; the ORM or a payments module appears in a client chunk | The `tests/client-boundary.test.ts` AST gate (Pitfall 3). `reserve-actions.tsx:22-28` already documents the specific hazard: importing `checkout-lease.ts` would pull drizzle + the whole schema into the browser | Immediately — one bad import |
| Cropper draws the source at natural size | `Save photo` fails silently on iOS; tab crashes on Android | Draw with a source rect straight to a 400×400 destination; never allocate a >16 M px canvas | 4096×4096 on iOS; a 12 MP phone photo is already over |
| VRT suite grows one baseline per route × breakpoint × theme | CI time balloons; diffs become unreviewable; the gate gets skipped | ~20 archetype baselines, not 200 route baselines | ~50 baselines |
| Theme switching re-renders the whole tree and animates every transition | Visible flash/jank on switch | `disableTransitionOnChange`; theme lives on a `data-theme` attribute so the swap is pure CSS with no React re-render | Immediately, and worst on mobile |
| Map on search without clustering or viewport-bounded querying | All markers render; the page jank scales with the catalogue | Out of scope (Pitfall 20). If ever built: bbox-bounded query + clustering | ~200 listings |
| `@theme static` used everywhere "to be safe" | Every theme variable emitted whether used or not; larger CSS | Use `static` only where a runtime consumer must enumerate tokens (a swatch preview) | Marginal — but it also defeats the tree-shaking that keeps the CSS small |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---|---|---|
| The email shell double-escapes or forgets to escape a new field | `escapeHtml` was the **WR-01** fix; a raw URL in an `href` is a live injection sink, and double-escaping breaks the password-reset link outright | Escape at exactly one layer; a dedicated test per new interpolated field; keep `tests/auth/email-escaping.test.ts` green and **extend, never weaken** |
| A "preview our emails" route or script renders a real token | Reproduces the **WR-02** hazard the dev-fallback guard was written to close (`email.ts:38-49`) | Preview renders dummy tokens only; never enabled in production; keep the `NODE_ENV === "production"` guard exactly as written |
| A polish refactor makes the **displayed** price a client computation | Disclosure diverges from the charged, server-frozen `quoted_total_cents`; D-68's "disclosed == enforced" becomes untrue | Provenance rule + AST gate + the DB-vs-DOM equality e2e (Pitfall 3) |
| Restoring `gravity: "face"`/`"auto"` or deleting the Cloudinary transform | The transform is the only bound on a hostile direct POST to the public `uploadAvatarAction` (Zod checks type and size only) | Source-scan gate pinning `gravity: "center"`; fix the two now-false comments (Pitfall 16) |
| Widening `accept="image/*"` back, or loosening `ALLOWED_SIGN_KEYS` for a crop param | SVG upload path re-opens; an unsigned upload param becomes signable | 999.2 narrows to `image/jpeg,image/png,image/webp` and explicitly touches neither the sign allow-list nor the widget options — keep both |
| Moving copy constants into a `"use server"` module while tidying | Next rejects the module **at evaluation** — the action dies at runtime while unit tests stay green (this exact failure hid a dead avatar upload for a whole phase) | `tests/use-server-exports.test.ts` — do not weaken; a re-export is the same violation |
| Removing a live region or an error node while "cleaning up markup" | A user pays twice because the first failure was never communicated (Pitfall 5) | The layout-visibility assertion, in a browser, not jsdom |

---

## UX Pitfalls

| Pitfall | User impact | Better approach |
|---|---|---|
| Skeletons that don't match the content they replace | Layout jumps on load; on a booking page, a CTA moves under the cursor mid-click | Skeletons mirror the final geometry. Only two `loading.tsx` files exist today — the other ~25 routes need theirs, and each must be measured against the real content |
| Treating "no results" and "error" as the same empty state | A search that failed reads as "no gyms near you," so the user leaves instead of retrying | Distinct states with distinct copy and a retry affordance on the error one. GATE-STATES should require all three (loading / empty / error) named separately per surface |
| A polished happy path with an unpolished failure path | The most emotionally expensive moments (expired hold, declined request, sold-out day, failed payment) look like bugs | Every calm-recovery state already built in v1.0 (`HoldExpiredState`, `ExpiredApprovalState`, `PaymentReversedState`, `PendingPaymentState`, `PartialGrantNotice`) gets the same design attention as its happy path. They are the product's trust surface |
| Colour-only status (green badge / red badge) | Fails 1.4.1; and `--success` at 3.24:1 is illegible for many users regardless | Icon + text always. The house rule already exists ("never color-only") — preserve it |
| Hover-only affordances | v4 gates `hover:` behind `@media (hover: hover)`; on touch the control has **no** affordance at all | Every interactive element has a resting-state affordance. Check at 320px on a real device |
| Reworded copy in a polish pass | Breaks 63 `getByText` assertions and the "exported single literal" discipline that keeps component, action and test byte-identical | **Copy is out of scope unless a REQ says otherwise.** If a string must change, change the exported constant — never an inline duplicate |
| Making the crop dialog feel "premium" with an entry animation | Delays the one decision the dialog exists for; and with no `motion-reduce` fallback it is a vestibular hazard | 999.2 § 2e already forbids spinners/progress in the dialog. Keep it instant |
| Target sizes below 24×24 at 320px | WCAG 2.2 **2.5.8** is AA; and thumbs miss | The shipped `min-h-11` (44px) idiom is the standard; audit calendar cells, stepper buttons, and icon buttons at 320px |

---

## "Looks Done But Isn't" Checklist

- [ ] **Token contract:** looks complete in light — verify a **second, deliberately different** theme renders every surface correctly, and that the leak scan is **green at zero**, not "green with a baseline."
- [ ] **`font-sans`:** looks fixed — verify in a browser that `getComputedStyle(document.documentElement).fontFamily` contains `Geist`. The variable currently self-references and resolves to nothing.
- [ ] **Focus ring:** looks present — verify it measures **≥ 3:1** against every adjacent background, in every theme, and that `focus-visible:ring-ring/50`'s alpha has been removed or compensated.
- [ ] **Dark-debt strip:** looks done at 66 removed — verify the vendored `src/components/ui/*` files were **not** forked, that `npx shadcn add` still works cleanly, and that no `dark:` was replaced by a hardcoded **light** value.
- [ ] **Responsive at 320px:** looks fine in DevTools — verify no horizontal scroll (`document.documentElement.scrollWidth <= 320`), the primary CTA is reachable without zoom, and the calendar's day cells are ≥ 24px.
- [ ] **Loading/empty/error states:** looks covered — verify **error** is a *separate* state from *empty*, is rendered with a **non-zero bounding box in a browser**, and is announced. jsdom cannot prove this.
- [ ] **VRT baselines:** committed — verify they were generated in the **Linux container**, that no `*-win32.png` is tracked, and that at least one baseline actually **fails** when you deliberately shift a padding by 4px. A baseline suite that has never gone red is not a suite.
- [ ] **e2e still proves the guarantee:** all specs green — verify by **mutation**: make the (N+1)th overlapping booking succeed and confirm the availability/open-capacity specs go RED with the *new* selectors. Record the verbatim RED, restore, `git diff --exit-code src/`.
- [ ] **Emails:** render beautifully in the preview — verify in **real Gmail (web + Android), real Outlook desktop, Apple Mail**, at least one in dark mode, and that each send's HTML is **< 90 KB**.
- [ ] **Email escaping:** tests pass — verify **each new shell field** has its own assertion, and that a URL containing `&` and `'` still produces a **working** link (not just an escaped one).
- [ ] **Crop UI:** works on the dev machine — verify on a **real iPhone and a real Android** (pinch, drag, no page scroll), with an **EXIF-orientation-6** JPEG, with a **12 MP** source, and with pick → cancel → re-pick-the-same-file.
- [ ] **Cover preview:** matches the surfaces — verify the ratio-agreement test exists and is red if a shipped ratio changes. P-BOOKER is allowed to change those ratios.
- [ ] **Theme preview:** switches themes — verify **toasts** re-theme correctly (Sonner takes `light|dark|system` only) and that no `.dark` element exists at runtime unless intended.
- [ ] **Phase artifacts:** the VERIFICATION file exists — verify the gate was actually **run** and its output pasted, not drafted pre-execution. (v1.0 Key Lesson 4; Phase 2 shipped for two months with an unrun gate.)
- [ ] **SDK bookkeeping:** the phase was marked complete — verify by **reading `STATE.md`/`ROADMAP.md` back**. v1.0's SDK silently no-op'd and once actively corrupted state.

---

## Recovery Strategies

| Pitfall | Recovery cost | Recovery steps |
|---|---|---|
| e2e selectors broken by a restyle, discovered late | **MEDIUM** | Do not relax the assertion. `git log -S` the selector to find the restyle commit, read the old markup, add a `data-*` hook to the new component, re-point the spec, then **mutation-verify** it goes red for the right reason. |
| A skipped spec found at milestone close | **HIGH** | Treat as a v1.0-audit-class finding: the phase that skipped it is not complete. Un-skip, fix, re-verify, and correct the phase's VERIFICATION record — reporting closed work as open (or open as closed) is the drift v1.0's retrospective calls out in both directions. |
| Token leaks discovered when theme #2 lands late | **HIGH** (grows with surface count) | Run the scan to enumerate every leak, batch-fix by file (they cluster: `(auth)/*`, `(host)/layout`, `listing-map`), then land the scan as a permanent gate so it cannot recur. Do **not** fix them opportunistically as they're noticed. |
| `--brand` changed after baselines were captured | **MEDIUM** | Regenerate **all** baselines in a single dedicated commit that changes no source. Never partially update. |
| VRT abandoned as too flaky | **MEDIUM** | Delete the suite rather than leave it skipped (a skipped gate reads as a passing gate). Rebuild small: 5 archetypes, container-generated, `stylePath` + `mask` + `animations:"disabled"`, frozen seed. Grow only when it has been green for a phase. |
| Password-reset link broken by email double-escaping | **HIGH** (auth outage) | Revert the shell for auth sends immediately; add a test that asserts the rendered `href` **round-trips** through an HTML parser back to the original URL, not merely that it "is escaped"; re-land. |
| Vendored `ui/*` forked to strip `dark:` and `shadcn add` now conflicts | **MEDIUM** | Re-vendor the affected components from the registry, re-apply only the *token* changes (which should be zero — the values live in `globals.css`), and record the "don't strip vendored dark:" decision so it does not recur. |
| `gravity: "face"` reintroduced | **LOW** if the gate exists, **HIGH** if not (silently re-frames user-chosen avatars, and the framing is unrecoverable — the original is discarded per D-C) | Land the source-scan gate first; re-uploading is the only user-side remedy, so this one is worth preventing rather than recovering. |
| Client-boundary violation shipped (price computed client-side) | **HIGH** | Revert the component to a server node, re-thread the value as a prop, add the AST gate, and add the DB-vs-DOM equality e2e. Then check whether any booking rendered a price different from `quoted_total_cents` — that is a customer-communication question, not just a code one. |

---

## Pitfall-to-Phase Mapping

| # | Pitfall | Prevention phase | Verification |
|---|---|---|---|
| 1 | e2e structural selectors break | **GATE-NOREG** (inventory in P-TOKENS) · P-BOOKER, P-HOST | Selector inventory doc exists; all e2e green after each restyle commit; **mutation** proves the constraint spec still goes red |
| 2 | Component test asserts on the wrong element | **GATE-NOREG** · P-BOOKER | `container.querySelector` replaced by name-scoped role queries; no "multiple elements" warnings |
| 3 | Logic moves client-side (price/availability provenance) | **GATE-NOREG** (gate lands in P-TOKENS) · all | `tests/client-boundary.test.ts` green; DB-`quoted_total_cents`-vs-rendered-total e2e green |
| 4 | Countdown broken by layout | P-BOOKER | Fake-timer test: `onExpire` fires exactly once; exactly one `role="timer"` at 320/768/1280 |
| 5 | CSS hides a pre-payment error | **GATE-STATES** · P-BOOKER, P-HOST, P-AUTH | Browser-based visibility + bounding-box assertion on every forced error state |
| 6 | Token leaks defeat theme swap | **P-TOKENS** | `tests/design-tokens.test.ts` at zero violations; theme-A-vs-theme-B screenshots **differ** on every surface |
| 7 | Tokens fail WCAG AA (coral CTA, focus ring, out-of-gamut destructive) | **P-TOKENS** · GATE-A11Y | `tests/contrast.test.ts` green for every declared pair; sRGB-gamut assertion green |
| 8 | Contrast breaks on theme swap | **P-TOKENS** · GATE-A11Y | Contrast test is theme-parameterised; a new theme cannot merge without passing |
| 9 | `@theme inline` semantics / `--font-sans` resolves to nothing | **P-TOKENS** (first task) | Browser assertion: every declared token resolves non-empty; `font-sans` computes to Geist |
| 10 | v3 advice applied to v4 | **P-TOKENS** + all | No `tailwind.config.*`; no `@layer utilities`; no `outline-none`; no `.module.css` without `@reference` |
| 11 | Dark-debt strip forks vendored components | **P-TOKENS** | Only 5 app files changed; `npx shadcn add` clean; zero `.dark` elements at runtime (proved before the strip) |
| 12 | Theme provider breaks Sonner / Leaflet stacking | **P-TOKENS** | Toast background equals `--popover` per theme; `elementFromPoint` proves no Leaflet control over an open dialog |
| 13 | VRT becomes a maintenance tax | **GATE-VRT** (set up in P-TOKENS) | Baselines are `-linux` only; a deliberate 4px shift goes red; no `test.skip` in VRT specs |
| 14 | Email shell breaks `escapeHtml` | **P-AUTH** | Existing escaping tests green **plus** one new assertion per new field; reset URL round-trips through an HTML parser |
| 15 | Email HTML fails in real clients | **P-AUTH** | `< 90 KB` byte assertion; `tests/email-tokens.test.ts` pins hex to `oklch`; real-client human UAT recorded (or named blocked-on-external) |
| 16 | Cloudinary re-crop overrides user framing | **P-CROP** | Source-scan gate pins `gravity: "center"`; quadrant round-trip test |
| 17 | A11y gaps in calendar / wizard / map / modal / timer | **GATE-A11Y** · all | axe green at 320px in both themes **plus** the scripted keyboard walk per surface |
| 18 | Crop breaks on real devices | **P-CROP** | EXIF-6 fixture test; 12 MP source test; cancel→re-pick-same-file test; real-device human check |
| 19 | Scope creep (redesign / branding / gold-plating / speculative components / bikeshed) | Roadmap + every phase plan | Allow-list of three restructurable surfaces quoted in each plan; theme count capped at 3; rule-of-three for extraction |
| 20 | New capability shipped as polish | Roadmap definition | Zero migrations in v1.1; no REQ-ID changes; no new search query parameters |

---

## Sources

**Measured in this repository, 2026-08-11** (highest trust — every claim re-derivable by re-running the stated command)
- `src/app/globals.css` (token state, `@theme inline`, `@custom-variant dark`, `.dark` block) — HIGH
- `src/app/layout.tsx` (`--font-geist-sans`, `title: "Create Next App"`) — HIGH
- `src/components/listing/listing-map.tsx:22,34,57,59,63` (`#E8484E`, `#fff`, OSM tiles, `scrollWheelZoom={false}`) — HIGH
- `src/components/booking/hold-countdown.tsx` (interval, `role="timer" aria-live="off"`, threshold announcement) — HIGH
- `src/components/booking/reserve-view.tsx:31-36,50,61` · `reserve-actions.tsx:22-28,89-91` (server-node threading; render-the-server-string discipline) — HIGH
- `src/lib/booking/pricing.ts:1-14` (deliberately isomorphic, no `server-only`) · `src/lib/availability/read-model.ts:165` — HIGH
- `src/lib/email.ts:25-31,38-49,55,60,101+` (WR-01 `escapeHtml` at 20+ sites, WR-02 dev-fallback guard, D-66 thin sends) — HIGH
- `src/lib/cloudinary.ts:29` (`gravity: "face"`) · `src/app/api/cloudinary/sign/route.ts:35` (`ALLOWED_SIGN_KEYS`) — HIGH
- `src/components/ui/sonner.tsx:8` (`useTheme()` → `theme` passed straight to Sonner) — HIGH
- `e2e/*.spec.ts` selector census: 92 `getByRole`, 63 `getByText`, 30 `getByLabel`, 22 `locator`; zero `data-testid` in `src/` — HIGH
- `e2e/availability.spec.ts:154-155`, `e2e/open-capacity.spec.ts:368-369,591`, `e2e/cancel.spec.ts:185`, `e2e/mode-switch.spec.ts:51,55,76` — HIGH
- `tests/search/search-card-open.test.tsx:257,314,333,335` (`container.querySelector("a")`) — HIGH
- `tests/use-server-exports.test.ts` (the AST source-scan harness to clone) — HIGH
- `grep -ro "dark:" src/` → 66 total, 56 in `src/components/ui/`, 10 in app code across 5 files — HIGH
- Raw-palette utility census (18), hex literals (2), arbitrary-value census (~38), inline styles (3) — HIGH
- `playwright.config.ts` (chromium only, no VRT config), `package.json` (no cropper, no axe, `next-themes` 0.4.6 unmounted) — HIGH
- Route census: 27 pages, **2** `loading.tsx`, **0** `error.tsx`, **0** `not-found.tsx`; **0** `prefers-reduced-motion`/`motion-reduce:` — HIGH
- `node_modules/leaflet/dist/leaflet.css` (`.leaflet-pane` 400, controls 800/1000) vs `src/components/ui/dialog.tsx:42` (`z-50`) — HIGH

**Planning artifacts**
- `.planning/PROJECT.md` — D-127 … D-131, D-04, D-66, D-68, D-123, milestone scope — HIGH
- `.planning/RETROSPECTIVE.md` — v1.0 Key Lessons 1–5, "what was inefficient", established patterns — HIGH
- `.planning/phases/999.2-profile-picture-and-listing-photo-crop-ui/999.2-UI-SPEC.md` — IC-01…IC-06, findings N1–N3, the two-ratio finding, § 2e/2f/2g, § 3a, § 4, copy rules F1–F10 — HIGH
- `.planning/ROADMAP.md` § Backlog 999.2 — the dated Cloudinary correction; 999.1's constraints (`escapeHtml`, D-66, no auto-login) — HIGH

**External (verified 2026-08-11)**
- [tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme) — `@theme` vs `@theme inline` vs `@theme static`; namespaces; the var-resolution-scope example — HIGH
- [tailwindcss.com/docs/functions-and-directives](https://tailwindcss.com/docs/functions-and-directives) — `@reference`, `@utility`, `@custom-variant`, `@source inline()` — HIGH
- [tailwindcss.com/docs/upgrade-guide](https://tailwindcss.com/docs/upgrade-guide) — all v3→v4 breaking changes cited in Pitfall 10 — HIGH
- [playwright.dev/docs/test-snapshots](https://playwright.dev/docs/test-snapshots) — per-platform snapshot naming; *"run tests in the same environment where the baseline screenshots were generated"*; `maxDiffPixels`, `stylePath` — HIGH
- [emailonacid.com — Gmail email clipping](https://www.emailonacid.com/blog/article/email-development/gmail-email-clipping/) · [hteumeuleu/email-bugs#41](https://github.com/hteumeuleu/email-bugs/issues/41) · [mailchimp.com — Gmail is clipping my email](https://mailchimp.com/help/gmail-is-clipping-my-email/) — the ~102 KB raw-HTML clipping threshold and its mid-tag failure mode — MEDIUM (vendor/community consensus, no first-party Google doc)
- [litmus.com — Ultimate Guide to Dark Mode for Email](https://www.litmus.com/blog/the-ultimate-guide-to-dark-mode-for-email-marketers) · [mailmode.app — Email Client Dark Mode Support Matrix](https://www.mailmode.app/learn/email-client-dark-mode-support-matrix) · [Microsoft Q&A — Outlook overriding colors in dark mode](https://learn.microsoft.com/en-us/answers/questions/4756669/how-can-i-prevent-outlook-from-overriding-backgrou) — full vs partial inversion by client; Gmail ignores `prefers-color-scheme`; >25% of opens in dark mode (Litmus, May 2026) — MEDIUM
- [pqina.nl — Canvas area exceeds the maximum limit](https://pqina.nl/blog/canvas-area-exceeds-the-maximum-limit/) · [pqina.nl — Total canvas memory use exceeds the maximum limit](https://pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit/) · [Apple Developer Forums thread 112218](https://developer.apple.com/forums/thread/112218) — Safari's 16,777,216 px area cap, iOS 4096×4096, total-memory ceiling, `getContext("2d")` returning null — MEDIUM
- WCAG 2.2 success criteria referenced by number: 1.4.1 (use of colour), 1.4.3 (contrast minimum, 4.5:1), 1.4.11 (non-text contrast, 3:1), 2.4.11 (focus not obscured), 2.5.8 (target size minimum, 24×24) — HIGH
- Colour conversions computed locally with the standard OKLab↔linear-sRGB matrices and the WCAG 2.x relative-luminance formula (method stated in § Colour maths) — **HIGH for the method, MEDIUM for the exact digits until re-verified with a colour library during P-TOKENS**

---
*Pitfalls research for: retrofitting a design system + polish onto a shipped money-handling marketplace (FitOut v1.1)*
*Researched: 2026-08-11*
