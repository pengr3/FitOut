---
phase: 10-design-system-foundation-theme-runtime
reviewed: 2026-08-12
status: issues_found
depth: standard
diff_base: ffbf6b5
files_changed: 115
files_reviewed: 70
reviewers: 2
findings:
  critical: 3
  warning: 15
  info: 14
  total: 32
---

# Phase 10 — Code Review

Reviewed at `standard` depth across two slices:

- **Slice A — authored logic & configuration** (29 files): the token generator, the shared leak-pattern list, `cn()`'s tailwind-merge patch, the theme provider and `?theme=` allowlist, the Button CVA, `globals.css`, the Sonner mapping, the status-tone modules.
- **Slice B — the gate suite & swept surfaces** (41 files): all 23 design tests plus a sample of the mechanically-swept components.

**Scope note.** The workflow's default scoping reads `key_files` from SUMMARY frontmatter, which yielded only **44** files. The phase's real diff is **115**. The 71 it missed include `globals.css`, `button.tsx`, `utils.ts`, `layout.tsx`, `package.json` and `eslint.config.mjs` — the phase's most consequential changes, and the location of two of the three Critical findings. This review used the git diff instead. **The SUMMARY-based scoping is not trustworthy for this phase and should not be trusted for the next one.**

Every finding below was verified against running tooling — the real ESLint rule via stdin, the compiled stylesheet, `culori` arithmetic, the generator run twice, and the full suite (20 files / 375 tests green). Claims that could not be reproduced are recorded as such.

---

## CRITICAL

### CR-01 — `aria-invalid` overrides the DS-05 focus ring on every form control; focused invalid fields get a 1.44:1 indicator

**`src/components/ui/button.tsx:45`** and the identical string in `badge`, `checkbox`, `input`, `input-group`, `radio-group`, `select`, `switch`, `textarea`, `toggle` (**10 primitives**).

The base recipe carries `focus-visible:ring-ring` *and* `aria-invalid:ring-3 aria-invalid:ring-destructive/20`. Both set `--tw-ring-color`; both flatten to specificity (0,2,0), so **source order decides**. In the compiled stylesheet:

```
.focus-visible\:ring-ring            → line 2333
.aria-invalid\:ring-destructive\/20  → line 2707   ← later, wins
```

Measured composite of `destructive` at 20% over each surface: **1.44 (background) / 1.44 (card) / 1.43 (muted)**, both themes, against a **3:1** non-text bar. The solid `--ring` it displaces measures 7.44 / 7.13.

**Failure scenario.** `src/components/form.tsx:118` sets `aria-invalid={!!error}` on *every* react-hook-form control. A keyboard user submits the listing wizard with a bad rate and tabs back to fix the field. The base recipe sets `outline-none`, so the ring is the only focus affordance — and it now paints at 1.44:1. Focus is invisible on precisely the field the user was sent to. `border-destructive` does not rescue it: that border is present whether or not the control is focused, so it conveys *error*, not *focus*. Reproducible on the phase's own `/dev/theme` §6, which renders an `aria-invalid` Input deliberately.

**Why every gate missed it — two independent holes:**
- `contrast.test.ts` measures only rows declared in `CONTRAST_PAIRS`, and there is no row for a composited ring colour.
- `focus-recipe.test.ts:116` anchors its alpha ban on the literal substring `focus`: `/[^\s"'`]*focus[^\s"'`]*:ring-[a-z][a-z0-9-]*\/\d+/g`. The file's argument is *arithmetic* ("no value of `--ring` can fix the alpha form"), but the pattern is *scoped to focus variants*, so the identical dilution on a state variant is structurally invisible. This is the exact miss-mode `button.tsx:60-66` documents for the destructive variant's old override — repeated one line above it.

`src/components/availability/slot-picker.tsx:215` ships the same shape (`ring-brand/50`) on the booking flow's primary control. Neither appears in `EXCLUDED_PAIRS`, so both are in the third state the inventory header says must not exist: *neither measured nor exempted*.

**Fix.** Keep the shape, drop the colour override, and let focus win:
```
aria-invalid:ring-3 aria-invalid:border-destructive focus-visible:ring-ring
```
Then either widen `ALPHA_FOCUS_RING` to any state-scoped ring colour (`aria-invalid`, `data-*`, `group-*`) by dropping the `focus` anchor, or add explicit `EXCLUDED_PAIRS` rows with measured ratios and a "never the sole indicator" justification.

*Mitigating:* every instance is accompanied by a solid `border-destructive` / `border-brand`, so the alpha ring is not the sole *error* cue. It is, however, the sole *focus* cue.

---

### CR-02 — DS-13's leak gate does not match a hex inside a Tailwind arbitrary value; both halves share the hole

**`config/design-leak-patterns.mjs:52-53`**

The anchor character class is `[="'(:,]`. `[` and `_` are absent, so the bracket form — the idiomatic way a hex enters a Tailwind codebase, and a form **this phase itself uses** (`bg-[color-mix(...)]` at `button.tsx:50,53`) — is never matched.

Verified live, one file, one ESLint run:

```
1:14  error  Raw design value "#E8484E" — use a design token (DS-13 / D-15)   ← const BARE = "#E8484E"
                                                                              ← className="bg-[#E8484E]"  NO ERROR
```

Also unmatched: `text-[#fff]`, `border-[#000]`, `shadow-[0_1px_2px_#00000010]`.

**Failure scenario.** A future author writes `hover:bg-[#c0392b]` on a CTA. `npm run lint` green, `npm run test:design` green, `npm run build` ships — and the colour is frozen against both themes, which is the single failure DS-13 exists to prevent. `tests/design/leak.test.ts:175` imports the same `DESIGN_LEAK_PATTERNS`, so the authoritative half misses it identically. There is no second opinion.

This is the phase's headline deliverable failing on its headline pattern.

**Fix.**
```js
pattern: /(?:^\s*|[=_"'([:,]\s*)#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/
```
`see #3388 for details` still does not match (space is not in the class). Add both the bracket and bare shapes to the gate's positive-control fixtures — by the phase's own standard, a gate never observed failing on a form is not a gate for that form.

---

### CR-03 — Unmeasured 80%-alpha ink on the coral fill fails AA on the core booking surface

**`src/components/availability/slot-picker.tsx:223`**

`isSelected ? "text-brand-foreground/80" : "text-muted-foreground"` paints the "*N* of *M* free" sub-label at 80% opacity **on the `bg-brand` fill set ten lines above** (`:213`).

Measured with the same 8-bit gamma-space arithmetic `contrast.test.ts` uses:

| theme | fill | ink @100% | ink @80% | ratio @80% |
|---|---|---|---|---|
| court | `#da2d34` | `#fafafa` → 4.57 | `#f4d1d2` | **3.38 : 1** |
| grove | `#13807c` | `#f7fbfb` → 4.53 | `#c9e2e2` | **3.51 : 1** |

Against a **4.5** text bar. This is the exact arithmetic the phase invokes fifteen times to condemn `bg-brand/90` — *an alpha tint over a light surface lightens, dragging a filled control toward its own text colour* — applied to the foreground instead of the fill. The phase edited line 213 and left line 223.

**Why no gate sees it — three independent holes:**
- `brand-recipe.test.ts:237`'s `UNMEASURED_ACCENT_ALPHA` is `bg-` only: `/[^\s"'`]*bg-brand\/(?!10(?![\d.]))\d+/`. `text-brand-foreground/80`, `ring-brand/50` and `border-brand/30` all escape.
- `pair-drift.test.ts` cannot pair them — the fill and the ink are in **two different string literals** (separate `cn()` arguments), and `pairingsIn()` only cross-multiplies within one chunk.
- `contrast.test.ts` has no `brand-foreground @0.8 over brand` row.

**Fix.** Drop the modifier, or declare the pairing so it is measured:
```ts
{ fg: "brand-foreground", bg: "brand", bar: TEXT_BAR, alpha: { value: 0.8, over: "brand" } }
```
That row goes red at 3.38 — which is the point.

---

## WARNING

### WR-01 — DS-09 is ~20% adopted, and the gate's recorded justification for not noticing is factually wrong
**`tests/design/brand-recipe.test.ts:456-459`**

The gate pins `size="touch"` at exactly two call sites and defends its per-element scope with: *"Both files keep other 44px height classes on `<Input>` and `<SelectTrigger>` primitives, **which have no `touch` size to opt into**."*

That is false for both pinned files. `search-bar.tsx:257`, `:346` and `rsvp-form.tsx:342` are all `<Button variant="outline" className="h-11 …">` — `<Button>`s that *do* expose `size="touch"`. Repo-wide, **seven** `<Button>` elements still hand-roll the height (`group-refresh.tsx:70`, `regenerate-link-button.tsx:88`, `remove-attendee-button.tsx:88`, `rsvp-form.tsx:342`, `share-link-box.tsx:89`, `search-bar.tsx:257`, `:346`). Two carry comments *documenting* the hand-rolled convention D-22 replaced.

Concrete consequence: `rsvp-form.tsx`'s two adjacent buttons express the same 44px two different ways and get **different horizontal padding** (`px-4` from `size="touch"` vs `px-2.5` from `size="default"`).

DS-09 is correctly `Pending` with Phase 17 named as owner — but `brand-recipe.test.ts`'s comment is not what that deferral says, and it will mislead the next reader.

### WR-02 — `focus-recipe.test.ts` pairing checks are file-level: one element vouches for every other
**`tests/design/focus-recipe.test.ts:171-184`, `:230-236`** — both checks are `text.includes()` over the whole file. Any file already carrying the canonical recipe on one element (all 11 vendored primitives) can gain a second focusable element with `focus-visible:ring-offset-2` and **no offset colour**, ship Tailwind's hardcoded white band, and stay green — the exact leak `search-result-card.tsx` was just fixed for. Reuse `pair-drift.test.ts:259-289`'s AST literal walker to scan per class-string.

### WR-03 — The "one legal filled green surface" claim is an exact two-token adjacency and evades trivially
**`tests/design/status-vocab.test.ts:103`** — `RETIRED_FILLED_PAIRING = "bg-success text-success-foreground"` matched with `includes()`. All of these ship the retired 3.24:1 pairing and pass: reordered, double-spaced, split across `cn()` args, or with any class between. Detect the two classes independently within one class string and intersect.

### WR-04 — `brand-recipe.test.ts` is the only source-scan gate that does not strip comments, and it pins six exact counts
**`tests/design/brand-recipe.test.ts:352-397`** — raw `readFileSync`, while asserting `variant="brand"` totals of 15 and 20 and `bg-brand` at exactly 9 across 6 named files. Its mitigation is an unenforceable authoring convention (comments must *describe*, never *quote*, the class). The failure mode is live: delete a real conversion, add prose quoting it, total stays 20. Run the `stripLeadingComments` that already exists in two sibling files.

### WR-05 — `pair-drift`'s alpha-blind key lets a passing `/10` row legalise a failing solid pairing
**`tests/design/pair-drift.test.ts:149-153`** — `pairKey` drops `alpha`, so `foreground on brand @10% over background` (17.04 / 16.24) mints the key `"foreground on brand"`, which blanket-permits `text-foreground` on a **solid** `bg-brand`: court **4.16:1**, grove **4.00:1**, both under the 4.5 bar. The header notes the lookup is alpha-blind but not that a passing tint row silently vouches for a failing solid one.

### WR-06 — `scaffold-residue.test.ts`'s metadata `icons:` assertion silently disarms if the anchor moves
**`tests/design/scaffold-residue.test.ts:253-259`** — if `indexOf("export const metadata")` returns `-1`, `slice(-1)` yields the last character, the second `indexOf` returns `-1`, `slice(0,-1)` yields `""`, and `expect("").not.toMatch(…)` passes. Any refactor to the declaration form disarms it. Assert the anchor was found.

### WR-07 — Palette and white/black patterns miss directional and several prefixed forms
**`config/design-leak-patterns.mjs:74-75, 81`** — verified unmatched: `border-b-gray-200`, `border-t-slate-300`, `divide-x-zinc-200`, `border-l-white`, `ring-offset-white`, `from-white`, `to-black`, `decoration-white`, `shadow-black`, `caret-white`, `placeholder-white`. Also: `color-function` is case-sensitive (`RGB(255,0,0)` is valid CSS, unmatched), and `arbitrary-text-px` misses `text-[length:14px]`. Zero present in the tree today — latent, not shipping, but `border-b-border` → `border-b-gray-200` is one character class away.

### WR-08 — DS-10's tone→recipe map is implemented for one of four tones
**`src/lib/design/status-tones.ts:79-89`** — `STATUS_TONE_RECIPES.neutral` is declared `bg-muted text-foreground`; no call site renders it. `neutral` renders three different ways (`secondary`, `outline`, `secondary + text-muted-foreground`). `status-tones.ts:41` claims `outline` was collapsed into `neutral`, but `approved`/`processing` still render exactly that border treatment. `status-vocab.test.ts:373` destructures **only** `STATUS_TONE_RECIPES.positive`, so three of four tones have no by-value pin. The reconciliation is one closed *type* over three unreconciled recipes; changing `neutral.surface` changes nothing and fails nothing.

### WR-09 — `status-vocab`'s "BY VALUE" check is file-level and accepts opacity-modified surfaces
**`tests/design/status-vocab.test.ts:175, :372`** — the three recipe slots need only appear *somewhere* in the file, not on the same element. And `(?![\w-])` admits the opacity modifier, so `bg-muted/40` satisfies a `bg-muted` surface match — a different rendered colour with different contrast. `search-result-card.tsx` already ships `group-hover:bg-muted/40`.

### WR-10 — The four type-role names are hand-maintained in three places with no derivation
**`src/lib/utils.ts:32`, `src/app/globals.css:96-111`, `tests/design/type-scale.test.ts:68`** — the `cn()` fix itself is correct and non-regressive (verified across 13 merge cases). The defect is the invariant: three hard-coded copies, none derived. Add `--text-caption` to `@theme inline` and write `cn("text-caption", "text-muted-foreground")` and tailwind-merge deletes it again — with all 375 tests green, because `ROLES` never learned about it. Identical to the defect 10-16 fixed.

### WR-11 — The generator throws on alpha but silently clamps an out-of-gamut colour
**`scripts/generate-design-tokens.mjs:90-106`** — `formatHex` clamps per channel; browsers gamut-map in OKLCH. An out-of-gamut `oklch()` yields a plausible hex that is a *different colour* from what renders, and the byte-compare drift test would preserve it forever. All six current tokens are in gamut. This has already happened once here: `globals.css:196` records `oklch(0.577 0.245 27.325)` shipping outside the gamut. Add an `inGamut("rgb")` throw.

### WR-12 — `metadataBase` crashes the root layout on an empty `NEXT_PUBLIC_APP_URL`
**`src/app/layout.tsx:52`** — `??` catches only `null`/`undefined`. `NEXT_PUBLIC_APP_URL=` (key present, value blank — a very common deploy shape) reaches `new URL("")`, which throws `TypeError: Invalid URL` at **module evaluation of the root layout**, taking down every route. Use `?.trim() || fallback` plus `URL.canParse`.

### WR-13 — Payout badge exhaustiveness rests on a cast plus a guard over a *derived* value
**`src/components/host/payout-state-badge.tsx:52, 62`** — `failed` is excluded by `if (view.tone === "attention")`, a condition on `derivePayoutLedgerView`'s output rather than on `state`, then `state` is force-fitted with `as`. Give `failed` any other tone and `BADGE_RECIPES["failed"]` is `undefined`; the destructure throws and `/host/earnings` 500s for every host with a failed payout. TypeScript reports nothing, because the cast said the branch was unreachable. Branch on `state === "failed"` instead. (The phase's own `theme-query-param.tsx:13` header condemns exactly this pattern.)

### WR-14 — The "one rule id" constant is not read by the ESLint half
**`eslint.config.mjs:98-99`** vs **`config/design-leak-patterns.mjs:112`** — `LEAK_DISABLE_RULE_ID` is documented as the id *both* consumers report under, but `eslint.config.mjs` re-spells the plugin and rule names as separate literals; only the Vitest half imports the constant. Rename the plugin key and every `// eslint-disable-next-line fitout/no-raw-design-value` becomes a no-op in ESLint while the Vitest gate still honours it — the two halves disagreeing about exemptions is the one thing D-16 exists to prevent.

### WR-15 — Production code shape is now dictated by a test's line-count assertion
**`src/app/(host)/host/listings/[id]/edit/wizard.tsx:624-625`** — two branches with byte-identical output, kept apart because `brand-recipe.test.ts:382` counts **lines** containing `bg-brand`. The comment says so explicitly. The obvious refactor `(state === "current" || state === "done") && "…"` turns a committed gate red for a reason unrelated to the design contract. Count occurrences, not lines, then merge the branches.

---

## INFO

- **IN-01** — Declared-but-unconsumed tokens: `--z-sheet`, `--z-toast`, `--motion-base`, `--motion-slow`, `--ease-standard`, `--tracking-normal` (both themes). `--z-toast` is notable: the app's actual topmost layer is Sonner, which injects its own z-index and is not wrapped in the `isolate` `globals.css:397` prescribes — so the scale calling itself "the arbiter" does not govern the topmost surface.
- **IN-02** — `src/components/ui/sonner.tsx:62` sets `classNames.toast: "cn-toast"`, a class defined nowhere. Pre-existing; the phase rewrote this file's header without removing it.
- **IN-03** — `sonner.tsx:65` spreads `{...props}` *after* `theme`, so a caller passing `theme` overrides the total mapping the file exists to guarantee. No mount site does today.
- **IN-04** — `theme-query-param.tsx:41` reads `window.location.search` once in a mount effect and lives in the root layout, so `?theme=` is ignored on soft navigations. Dev-only. (The allowlist itself is sound: `THEMES.includes()` before `setTheme`, no cast, no interpolation, build-time-constant production guard.)
- **IN-05** — `contrast-pairs.ts:22-36` lists its blind spots honestly but omits three shipping composites: `aria-invalid:ring-destructive/20` (CR-01), `border-destructive/40`, `border-brand/30`. The `alpha` field already exists to express them.
- **IN-06** — `scaffold-residue.test.ts:258` asserts the `icons:` prohibition for `layout.tsx` only, while `favicon-swap.tsx:84` queries `link[rel="icon"]` globally — so a *child route* adding `metadata.icons` resurrects the two-link ambiguity. Route-level metadata is already precedent in this phase (`dev/theme/page.tsx:87`).
- **IN-07** — `e2e/reduced-motion.spec.ts` fails opaquely against a **production** server on :3000 (`/dev/theme` 404s, so it reads as a 30s visibility timeout). Assert the `h1` first. Otherwise sound: both directions asserted, and the synthetic probe checks `animationName` so a never-emitted class cannot pass vacuously.
- **IN-08** — `elevation-z.test.ts:576` title says "the 5 overlay sites"; `OVERLAY_INVENTORY` totals **6**. The 12-site total is correct; only the title is off — a trap in a suite whose value is that its numbers reconcile.
- **IN-09** — `type-scale.test.ts:596` `expect(bell).toContain("text-xs")` is not an anchor: `notification-bell.tsx` carries two `text-xs`, so reverting the migrated one stays green. The `ARBITRARY_PX` zero does the real work.
- **IN-10** — `elevation-z.test.ts:265` starts two real Tailwind compiles whose promises are never awaited. Harmless today; an unhandled rejection would surface as an opaque worker crash.
- **IN-11** — `theme-nesting-render.test.tsx:82` cleans up only in `afterAll`, so three renders accumulate in `document.body`. Safe only because every `data-testid` is currently unique.
- **IN-12** — `status-vocab.test.ts:331` `key.replace("-", "\\-")` escapes only the first hyphen. Inert today; latent for any hyphenated key.
- **IN-13** — Two size bumps land in fixed-size containers and were not visually verified: `booking-row.tsx:68` (`text-[10px]` → `text-xs`, +20% court / +30% grove) in a 48px thumbnail, and `notification-bell.tsx:117` (`text-[11px]` → `text-xs`) in a `min-w-5` badge leaving a 12px content box for 12–13px digits. Value-preservation was the stated goal for the other ten migrations.
- **IN-14** — **The `@tailwindcss/postcss` path-cache bug recorded by plan 10-12 did not reproduce.** Probed directly against the installed 4.3.0: compiling `globals.css` plain, then with `@source inline("shadow-md")` under the same `from:` path, emits `.shadow-md` correctly; a real vs. decoy safelist on the same path produces different bytes. The `compileAttributedTo` mitigation appears to be a no-op, and its slug derivation is lossy anyway (`["a-b"]` and `["a","b"]` collide; `.slice(0,80)` truncates). **This contradicts the phase's own record** — worth resolving rather than leaving two documents disagreeing.

---

## Verified sound

Stated explicitly so the list above is not read as a verdict on the whole phase.

**The central question — can any gate pass vacuously?** No gate in the suite is currently vacuous, and no "delete the file under test and it still passes" case could be constructed. Every source-scan gate roots at `resolve(process.cwd(), "src")`, has a `>200 files` walk assertion, and carries at least one named positive control reading real file content. Both block-comment strippers are line-oriented with an executable assertion against the `accept="image/*"` hazard — no `/\*[\s\S]*?\*/` regex anywhere in the suite. The weaknesses above are *evasions*, not vacuities: they require someone to write the code a particular way, not merely to delete it.

- **The negative dividers are correct.** `login/page.tsx:177` and `signup/page.tsx:199` are `-z-(--z-sticky)`, pinned by inventory *and* asserted at emitted-CSS level as `z-index: calc(var(--z-sticky) * -1)`.
- **The 9 non-Button `bg-brand` survivors were not converted.** All six files verified by diff. All four availability hovers became the `color-mix`; none was deleted.
- **`globals.css` theme key-set equality holds** — parsed with the repo's own parser: **59 keys each, zero court-only, zero grove-only**. The global `:root` block holds exactly the 8 z/motion names and is unreachable from `parseThemeTokens`.
- **Generator determinism holds** — run twice, `wrote 0/3 file(s)` both times, `git status` clean. No timestamp, no locale-aware sort, LF-only, and `.gitattributes:12-14` covers all three byte-compared artifacts.
- **`cn()`'s fix is correct** across 13 probed merge cases and does not mis-classify other namespaces.
- **`sonner.tsx`'s mapping is total and type-safe** — the `"system"` bug is genuinely gone, no cast.
- **`button.tsx` variants** — no alpha-tinted *hover* survives; `hover:bg-brand/90` absent; `defaultVariants` unchanged. The only alpha survivor is the ring (CR-01).
- **The strongest assertions are genuinely strong:** the `var(--color-*)` zero-count, the byte-equality regen gate, the "bare `z-dialog` emits nothing even force-safelisted" proof with a same-compile positive control, and the `(?<![\w-])` lookbehinds that correctly separate `-z-10` from `z-10`.

---

## Recommended order

1. **CR-01** — a shipped WCAG failure on every form control, on the field a user was just sent to fix. One class-string edit across 10 files, plus widening the gate that missed it.
2. **CR-02** — DS-13's gate has a hole in its headline pattern. One regex, plus fixtures.
3. **CR-03** — one class on the booking flow's primary control, plus a declared pair row.
4. **WR-05, WR-02, WR-09, WR-03, WR-04, WR-06** — the six gates that can be satisfied by a broken tree. These matter more than their severity suggests: the phase's entire correctness argument rests on them holding for the *next* change, not this one.
5. Everything else as ordinary backlog.

`/gsd:code-review 10 --fix` will attempt the mechanical ones. CR-01 and CR-03 involve a design judgement (what the invalid-state ring should look like; whether the sub-label keeps its de-emphasis) and are better done deliberately.
