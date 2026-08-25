# Phase 16 — Touch-Device Crop UAT Log (CROP-04)

> A live operator walk of the avatar cropper on real phones. **Only what a human actually observed is
> recorded here.** A walk is discharged when the operator states the outcome, never when the automated
> half is green — the automated half is precisely the part that could not answer these questions.

**Operator:** the PM · **Requirement:** CROP-04 — *"Cropping works on a real touch device — verified on
hardware, not in desktop touch emulation."* · **Decisions in force:**

| Decision | What it binds here |
|---|---|
| **D-167** | Pinch-zoom, drag-pan **and** the slider must all work on real hardware. All three are clauses, not alternatives. |
| **D-173** | The controls carry no extras: no rotation, no numeric zoom readout. Zoom floor = fit-the-mask, ceiling = `min(anti-blur bound, 3x)`. A missing rotation control is **not** a defect. |
| **D-174** | Cancel, then pick **the identical file** again, and the cropper must re-open. Named as an acceptance criterion, not a nicety. |
| **D-175** | **This walk is the discharge.** Desktop touch emulation does not satisfy CROP-04 and no automated suite can. Planning must not claim CROP-04 from a Playwright run. |
| **Δ4 (Delta-4)** | The sheet is its own scroll container, so `touch-action: none` on the stage is the only thing standing between a pan gesture and a scroll. Clause 4 is what tests it. |
| **D-177** | The stage's backing is `bg-background`, so letterbox bars on a panorama render **WHITE**, not grey. Record it as expected, not as a defect. |

**The surface being walked:** `/profile` → the avatar field → the picker's four pre-dialog guards
(type → size → decode → dimensions) → `ImageCropDialog` (`react-easy-crop`, one zoom slider) →
`Save photo` → `Remove photo` with its `ResponsiveDialog` confirm.

---

## Environment — how to get a phone onto this machine's dev server

1. **Start the database and the app.** `npm run db:up` (Docker Desktop must be running), then `npm run dev`.
   Inngest is **not** needed for this walk — no notification, job or webhook path is exercised.
2. **Find the LAN URL.** `next dev` prints a `Network: http://<LAN-IP>:3000` line beside the localhost one.
   If it prints only localhost, run `npm run dev -- -H 0.0.0.0`. The phone must be on the **same Wi-Fi**,
   and Windows Defender must allow inbound `node` on the private network — a silent firewall block looks
   exactly like "the site can't be reached".
3. **⚠ Set `BETTER_AUTH_URL` to the LAN URL before you sign in, or the sign-in will be refused.**
   `src/lib/auth.ts:52-63` reads `BETTER_AUTH_URL` (default `http://localhost:3000`) and passes it as the
   **only** entry in `trustedOrigins`. A phone loading `http://<LAN-IP>:3000` sends that origin on the
   sign-in POST, it is not the trusted one, and the request is rejected. Put
   `BETTER_AUTH_URL=http://<LAN-IP>:3000` in `.env.local` and **restart** `next dev`. This is environment
   setup, not a product defect — do not record it as one.
4. **Sign in** as the seeded host: **`host@fitout.test` / `FitoutHost!2026`**. (The seed persists in the
   `fitout_pgdata` Docker volume; re-seed only if the volume was reset.) Then open **`/profile`**.
5. **A real save really uploads.** `uploadAvatarAction` calls Cloudinary server-side — plan 16-13 recorded
   that the automated Δ3 case performs one genuine upload per run (deferred item **D4**). If `Save photo`
   fails with a server error, check the server-side `CLOUDINARY_*` values in `.env.local` **before**
   recording it against a clause: a credentials failure is an environment fact, not a framing defect.

### The images to side-load, and why these ones

Copy these onto the device before starting (AirDrop / Drive / cable / email to yourself). They are not
served by the app — you cannot pick a file the phone does not have.

| File | Clause it serves | Why this file |
|---|---|---|
| `e2e/fixtures/panorama-4000x500.jpg` | 1 and 4 | 4000x500 with a red block at the left edge and a blue one at the right. A pan is **unambiguous** on it — you can see which way the photo moved. It also letterboxes, so it is where D-177's white bars show up. |
| `e2e/fixtures/square-400.png` | 5 | Small, and its zoom row is **disabled** (shorter side 400 → `avatarMaxZoom` is exactly 1), so a cancel-then-re-pick is not confounded by a zoom change between the two openings. |
| any ordinary photo from the device's own camera roll | 2 and 3 | A real camera photo has enough pixels to reach the full 3x ceiling, so pinch and the slider have real travel. It is also the case the product actually ships for. |

Using the same fixtures the automated suite used is deliberate: where a hardware observation disagrees
with a recorded machine measurement, the two are about the same bytes.

**Screenshots live outside the repository**, in this session's scratchpad — they are evidence, not
artifacts, and nothing image-shaped is committed:

```
C:\Users\Admin\AppData\Local\Temp\claude\C--Users-Admin-Roaming-FitOut\57b5c680-7c43-453f-a32f-33a27d9a66ec\scratchpad\uat-16-crop\
```

---

## Device coverage — read this before the walk table

**The device axis is `{iOS Safari, Android Chrome}` at MINIMUM, and one device does not discharge
CROP-04.** `react-easy-crop` registers a **dedicated Safari pinch path** — `gesturestart` /
`gesturechange` / `gestureend` plus `preventZoomSafari`, wired in `componentDidMount` — that is a
genuinely different branch from the two-finger `touchmove` path Android Chrome runs. Walking one
platform leaves the other branch unexecuted by anything, machine or human.

### Device inventory — fill this in before you start

| Slot | Platform | Device model | OS version | Browser version | Viewport height (px) | Status |
|---|---|---|---|---|---|---|
| A | **iOS Safari** | | | | | |
| B | **Android Chrome** | | | | | |
| C | a short phone for clause 4 (only if neither A nor B is <= 568px tall) | | | | | |

`Status` is either `walked` or **`BLOCKED — <the specific reason>`**.

**An unavailable device is a named row, never an omission.** This is the same convention
`15-UAT-EMAIL.md` used for Outlook desktop, and it states the reason in words worth repeating: *an
inventory somebody can work from, never a gap dressed as coverage.* If a platform cannot be walked,
write `BLOCKED — <reason>` into its Status cell **and** into that platform's column in the table below.
Do not delete the column, and do not fold the platform into "the devices we walked".

---

## The walk — one row per clause, six rows, because CROP-04 is conjunctive

**Leave a cell empty until you have done that thing on that device.** An empty cell is an honest "not
yet"; a filled one is a statement the phase will quote. Write what you **saw** — not "ok".

CROP-04 is conjunctive across six clauses, so the map has one row per clause. Phase 15 recorded the
reason at its own close: *"Ticking a requirement because every mapped row is green is only sound when
the map covers **every clause** of a conjunctive requirement."* AUTHUI-03's map covered three of five,
so "all green" was true and meaningless at the same time. **This table is CROP-04's map.**

| # | Clause | What must be observed | iOS Safari — observed | Android Chrome — observed |
|---|---|---|---|---|
| 1 | One-finger drag on the stage | the photo pans; **THE SHEET DOES NOT SCROLL** | | |
| 2 | Two-finger pinch | zoom changes; the slider thumb tracks it | | |
| 3 | Slider drag | zoom changes; the thumb is reachable with a thumb (>= 44px) | | |
| 4 | Vertical drag on a SHORT phone (<= 568px tall) where the sheet genuinely scrolls | the stage pans; the sheet **still scrolls** when dragged from the header or footer (Δ4 / Delta-4) | | |
| 5 | Cancel → re-pick the IDENTICAL file | the cropper **RE-OPENS** (D-174) | | |
| 6 | `Remove photo` → confirm | initials return; **`Keep photo`** was the focused action on open | | |

### How to walk each one

1. **Clause 1 — drag-pan.** Pick `panorama-4000x500.jpg`, then drag with one finger on the stage. The
   photo pans. **Watch whether the sheet moves behind your finger** — it must not. Record *both* halves:
   whether the photo moved, and whether the sheet did.
2. **Clause 2 — pinch.** Use the camera-roll photo. Pinch with two fingers: the zoom changes **and** the
   slider thumb moves with it. iOS runs a different code path from Android here — note any difference in
   how the two feel (stickiness, a jump on the first pinch, the photo drifting while you pinch).
3. **Clause 3 — the slider.** Drag the thumb with a **thumb**, not a fingernail. It must be catchable on
   the first try. The zoom row is labelled `Zoom`.
4. **Clause 4 — the short-phone vertical drag.** On a phone 568px tall or shorter (or with the browser
   chrome expanded so the sheet genuinely scrolls): drag vertically **ON THE STAGE** — the photo must pan
   and the sheet must not scroll — then drag vertically **FROM THE HEADER OR FOOTER** — the sheet must
   scroll normally. Clause 1 and clause 4 are the pair Δ4 exists for; both must say explicitly whether
   the sheet moved.
5. **Clause 5 — the same-file re-pick.** With `square-400.png`: press `Cancel`, then open the picker and
   choose **the identical file again**. The cropper must re-open. If nothing at all happens, that is
   D-174 and it is a **defect**, not a quirk.
6. **Clause 6 — removal.** Save a photo, then `Remove photo` → confirm. Initials return. On opening the
   confirm, note **which button was focused** — it must be `Keep photo`, never `Remove photo`.

---

## What the automated suite already showed, and why it discharges nothing here

`e2e/avatar-crop.spec.ts` ran in real Chromium and measured a great deal: the computed `touch-action` on
the cropper's container (`"none"`) against the shared dialog box (`"auto"`), the stage's geometry at three
viewports, arrow-key panning with the library's clamp, the four pre-dialog refusals against a real
decoder, a failed save keeping the framing on screen, and the byte-honesty proofs (EXIF orientation, the
white matte, a single still frame, a 400x400 output). **All of that is machine evidence about a machine,
and it discharges nothing in the table above.** Four things it structurally cannot answer:

- **Safari's `gesturestart` / `gesturechange` path.** `componentDidMount` registers it separately from the
  two-finger touch path. No emulator fires it, so that branch has never executed anywhere.
- **A finger on the stage.** A fingertip occludes a meaningful fraction of a stage this size. No headless
  run can tell you whether the result is workable — see § Measurements below, where the real number is
  larger than the phase text claims.
- **iOS momentum and rubber-banding** during a vertical drag — exactly the behaviour Δ4's `touch-action`
  guard exists to stop from becoming a sheet scroll.
- **The OS file picker.** D-174's re-pick lives in the browser's `change`-event behaviour for a re-selected
  identical file; Playwright's `setInputFiles` sets the value programmatically, which is a different event
  sequence. The suite's re-pick case is **synthesised** and proves the component, not the picker.

---

## Measurements this walk is also asked to settle

These are numbered separately from the six clauses on purpose — they are questions the phase raised, not
clauses of CROP-04. They do not gate the tick; they are recorded because this is the only pass that can
answer them.

### M1 — the stage is 44px taller than the phase text says. Is the confirm still above the fold?

Plan 16-13 measured the crop stage at **227.1875px** on a 320x568 viewport, against the `183` printed in
`16-UI-SPEC` Δ2 and repeated through the phase. The 183 was Δ2's own **chrome-budget** figure — the space
it calculated was available — not the value `min(320px, 100vw - 2rem, 40dvh)` produces. The contract did
not move and no term was re-tuned; a transcription was wrong. But it means the stage on a short phone is
**44px taller than every downstream sentence assumed**, and Δ2's stated reason for existing was that
*"without the cap the confirm falls below the fold on common phones."*

| Platform | On a short phone, is `Save photo` visible without scrolling the sheet? | If not, how far down is it? |
|---|---|---|
| iOS Safari | | |
| Android Chrome | | |

The named reversal if this reads badly is one value in one class (`40dvh` → `35dvh`), recorded in
`16-UI-SPEC` § Reversals row 14.

### M2 — does the circle show what actually gets saved?

Plan 16-14 found and fixed a real shipped bug: the crop stage sized itself from a bounding rect captured
while `DialogContent` was mid `zoom-in-95`, so the mask rendered at 182.4px over media laid out at 192px.
The person saw a circle covering ~95% of the photo's width while the saved bytes covered 100% — every
avatar carried a ~5% ring nobody ever saw inside the circle. Fixed in commit `7dca510`, and asserted in
Chromium. **This is the hardware confirmation of that fix.**

| Platform | Frame something to the very edge of the circle. Does the saved avatar match what the circle showed? | Screenshot path (before / after) |
|---|---|---|
| iOS Safari | | |
| Android Chrome | | |

### M3 — the disabled zoom row under a screen reader (optional, D7)

`square-400.png` and `small-300.png` both render the zoom row **disabled**. The thumb is removed from the
tab order but exposes **no `aria-disabled`** — filed as deferred item **D7**, an open policy call rather
than an oversight. If you run a VoiceOver or TalkBack pass over a disabled zoom row, record what was
**heard**; if you do not, leave these cells empty.

| Platform | Screen reader used | What was announced on the disabled zoom row |
|---|---|---|
| iOS Safari | | |
| Android Chrome | | |

---

## Expected, not defects — read before filing anything

Two behaviours will look wrong and are recorded trades:

- **White letterbox bars on the panorama.** D-177 put `bg-background` behind the stage so the white matte
  is visible before confirming (IC-02). Letterboxing on an extreme aspect renders **white rather than
  grey** as a consequence, and the cost was accepted explicitly.
- **The close `×` is visible but inert for about a second while a save is in flight.** That is Δ3's single
  guard covering all three dismiss affordances. If you judge it a real defect, say so — the named reversal
  is a five-line `dismissLocked` prop.

And three things already filed, so a walker does not report them as new:

- **The soft-source note fires at exactly 400px**, where nothing is soft — deferred item **D3**, a copy
  call awaiting a ruling.
- **The focus ring on the stage comes from the UA outline**, not from the Tailwind `ring-*` classes on the
  crop area (the vendor's unlayered `box-shadow` wins the cascade) — deferred item **D5**. An indicator
  *is* painted; the route is what is open.
- **No rotation control and no numeric zoom readout** — D-173, by design.

---

## Screenshots

One per platform per interesting moment. Absolute paths, outside the repository.

| Platform | Moment | Absolute path |
|---|---|---|
| iOS Safari | | |
| iOS Safari | | |
| Android Chrome | | |
| Android Chrome | | |

---

## Defects found

Recorded verbatim as stated by the operator. A fix is a plan, not a checkpoint note — anything found here
is triaged after the walk, not patched inside it.

| # | Platform | Clause | What was wrong (operator's words) | Disposition |
|---|---|---|---|---|
| | | | | |

---

## Acceptance — dated when given

**CROP-04 is not ticked complete until every one of the six clause rows is filled on at least the two
required platforms — iOS Safari and Android Chrome — or the PM explicitly accepts a named gap at phase
close.** Ticking it because "every mapped row is green" is only sound when the map covers every clause of
a conjunctive requirement, and **this table is that map**. A green Playwright run is not an input to this
line: D-175 forbids CROP-04 being claimed from any automated run, and `e2e/avatar-crop.spec.ts`'s own
header says so.

| Outcome | PM statement | Date |
|---|---|---|
| All six clause rows filled on **both** required platforms | | |
| A named gap is accepted at phase close (`BLOCKED — <reason>` recorded above, not omitted) | | |

**Status: OPEN.** No cell in this document has been filled. CROP-04 remains `Pending` in
`.planning/REQUIREMENTS.md` and stays there until one of the two lines above carries the PM's words and a
date.
