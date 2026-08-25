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
