# Phase 16 — deferred items

Out-of-scope discoveries, logged rather than fixed (executor scope rule). Each names the file that
owns it, the plan that found it, and what a fix would cost.

---

## D1 — The zoom slider ships with NO accessible name

- **Found by:** plan 16-10, `tests/profile/avatar-field.test.tsx` (jsdom), 2026-08-25
- **Owner file:** `src/components/profile/image-crop-dialog.tsx` (plan 16-09's), the `<Slider>` call
- **Severity:** WCAG 2.2 SC 4.1.2 (Name, Role, Value) failure on a shipped control

**Measured, not inferred.** The element carrying `role="slider"` is Radix's THUMB
(`@radix-ui/react-slider/dist/index.mjs:430-434`), and its name is `props["aria-label"] || label`
where `label = getLabel(index, totalValues)` — which returns `undefined` for a single-value slider
(`:505-513`). The dialog passes `aria-label={AVATAR_ZOOM_LABEL}` to the vendored `Slider`, which
spreads it onto `SliderPrimitive.Root`; the Root renders a `<span data-slot="slider">` with **no
role**, so it contributes no accessible name to anything. Read out of a real render:

```
thumbAriaLabel : null
thumbLabelledBy: null
rootAriaLabel  : "Zoom"
rootRole       : null
queryAllByRole("slider", { name: "Zoom" }).length : 0
```

16-UI-SPEC § Surface contracts 2 specifies `aria-label="Zoom"` on the slider. It is present in the
source and absent from the accessibility tree — the same class of defect GATE-03's live-region gate
exists for (`role="status"` is `nameFrom:author`, so a region with perfect text can be unaddressable
and nothing on screen shows the difference).

**Why it was not fixed here.** `image-crop-dialog.tsx` is not in plan 16-10's `files_modified`; the
executor scope rule confines auto-fixes to issues the current task's own changes caused. A fix also
has to choose WHERE the name goes (`SliderPrimitive.Thumb`'s own `aria-label`, or a visible `<label>`
wired to the thumb), which is a design call the UI contract should make rather than an executor.

**Cheapest correct fix:** give the vendored `Slider` a way to name the thumb (it renders the thumbs
itself), or set the name on the thumb directly. Both are one line plus a rendering assertion.

**Suggested owner:** plan 16-13 (the phase's real-browser a11y pass) or a follow-up in 16-14…16-16.

---

## D2 — `overflow-320.spec.ts`'s Phase-13 confirmed-detail row is flaky under parallel workers

- **Found by:** plan 16-12, running the full `e2e/overflow-320.spec.ts` for the `/profile` rows, 2026-08-25
- **Owner file:** `e2e/overflow-320.spec.ts` (the AC#30/AC#22 Phase-13 table), or its fixture setup
- **Severity:** a false red on a green tree — the worst kind, because the next person spends the
  investigation on their own change

**Measured.** `npx playwright test e2e/overflow-320.spec.ts --project=chromium` (2 workers) failed on
`AC#30 / AC#22 … › the confirmed detail, no query · court` with `expectTargets`'s own non-vacuity
floor — zero controls collected:

```
> 868 |   ).toBeGreaterThan(0);
        at expectTargets (e2e\overflow-320.spec.ts:868:5)
1 failed · 14 skipped · 16 did not run · 44 passed
```

Re-run ALONE (`-g "the confirmed detail, no query"`, 1 worker): **2 passed**, both themes, 1.4s and
1.2s. So the surface renders and the selector still matches; the failure is a race in the fixture or
in the shared dev database the e2e run uses, not a layout regression.

**Why it was not fixed here.** Nothing in plan 16-12 touches a booking-detail surface — its files are
`src/lib/cloudinary.ts`, `src/app/actions/avatar.ts`, `src/components/profile/avatar-field.tsx`,
`src/lib/design/live-regions.ts` (prose only) and three test files. The `/profile` rows of this same
spec, which ARE this plan's surface, pass in both themes.

**Cheapest correct fix:** make the Phase-13 rows provision their own booking rather than reading one
another's, or serialise that describe block. Whichever it is, the fix belongs to whoever owns the
fixture, with a red watched under two workers first.

**Suggested owner:** the phase's real-browser plan (16-13) or a Phase-17 test-infrastructure pass.
