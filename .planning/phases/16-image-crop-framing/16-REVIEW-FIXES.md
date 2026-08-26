---
phase: 16-image-crop-framing
document: review-fix-record
source_review: 16-REVIEW.md
fixed: 2026-08-26
findings_total: 15
findings_closed: 15
findings_deferred: 0
status: all_closed
verification:
  tsc: "exit 0"
  vitest: "185 files passed / 2 skipped · 2121 tests passed / 5 skipped · 0 failures"
  test_design: "59 files · 1138 passed / 3 skipped"
  build: "npm run build exit 0 (lint + test:design + next build)"
  e2e_avatar_crop: "33 passed (chromium)"
commits:
  - b7cbc55  # CR-01
  - d43d4d2  # CR-02
  - 5a0879f  # CR-03
  - c454d1f  # WR-01
  - 31ea6a5  # WR-02 + WR-10
  - 6e2f6c3  # WR-03 WR-04 WR-07 WR-08 IN-01 IN-02
  - 0aac3c1  # WR-05 + WR-06
  - 37cf230  # WR-09
---

# Phase 16 — code-review fix record

All fifteen findings in `16-REVIEW.md` are closed. Nothing was deferred.

**Every fix was watched RED before it was accepted.** For each one the fix was reverted (or
disabled in place), the new assertions were run against the defect, and the failure was read to
confirm it is the failure the finding describes — not a different one that happens to be red. Those
readings are recorded per finding below, because "the test passes" is the weaker claim.

---

## The three criticals

### CR-01 — `avatarUrl` / `avatarPublicId` were client-writable · `b7cbc55`

Both were Better Auth `additionalFields` with no `input: false`, so `/api/auth/update-user` accepted
them from any signed-in caller. `avatarUrl` is classed PUBLIC (`src/lib/profile.ts:8`) and rendered
as a plain `<img src>` on the public listing page; `avatarPublicId` is the handle
`removeAvatarAction` passes to `destroyAvatar`, i.e. a cross-tenant delete primitive. The action was
never the hole — the column was.

`input: false` is enforced inside Better Auth's `parseInputData`, which the **server-side**
`auth.api.updateUser` goes through as well (it throws `FIELD_NOT_ALLOWED` on a truthy value and
silently drops a null, after which the route rejects the emptied body as "No fields to update"). So
both avatar actions now write the pair through Drizzle — the same trade `capability.ts:75` already
makes for `canHost`. The write stays scoped to `session.user.id`.

Three regression cases drive the route the browser reaches, not the action. **Red without the
guard:** both attack cases fail (`promise resolved "{ status: true }" instead of rejecting`); the
`bio` control case — a sibling field with no `input: false` — stays green, so the cases are not
passing because the endpoint rejects everything.

### CR-02 — the provenance guard proved the tenant, not the asset · `d43d4d2`

`startsWith('/<cloud>/image/upload/')` says the bytes come from our account and nothing more.
Everything after it is Cloudinary's transformation language, attacker-controlled, with the
`publicId` field free to hold the caller's own legitimate id.

**Deviation from the review's prescribed fix, deliberately.** It proposed dropping an optional
leading transformation component plus a `v<digits>` version and keeping the
"accepts a TRANSFORMATION segment" case green. That does not close the hole: transformations
*precede* the version in Cloudinary's url form, so an attacker appends a version after the overlay
(`l_fetch:…/v1/<own-id>.jpg`) and the tail matches again. Any rule that tolerates the DSL tolerates
the overlay, and telling `f_auto` from `l_fetch:` means maintaining a blocklist against a vendor
language that grows without us — the same losing shape this module's own header rejects for
hostnames.

The path is therefore required to be exactly `[v<digits>/]<publicId>[.<ext>]`. That is byte-for-byte
what `secure_url` returns, which is the only url `persistPhoto` is ever legitimately handed;
rendering transforms are built from the stored `publicId` at render time and never stored. The
transformation-accepting case flips to a rejection with the reasoning recorded in the test.

Two details that are not incidental: the path is **percent-decoded** before comparing (a filename
with a space would otherwise be refused as forged), and the extension is matched as an anchored
single segment rather than with `includes(` — the module's own source gate forbids substring
matching, and rightly.

**Red without the anchor:** all 7 new cases fail, all 21 pre-existing cases stay green. Each new case
asserts it clears https + host + tenant-prefix first, so only the anchor can be rejecting it.

### CR-03 — focus fell to `<body>` after a successful avatar removal · `5a0879f`

`handleRemove` closes the overlay and calls `setAvatarUrl(null)` in one commit, and the whole
`<ResponsiveDialog>` — trigger included — is rendered only while `avatarUrl` is non-null. The trigger
unmounts in the same commit as the close, so Radix's `onCloseAutoFocus` finds `triggerRef.current ===
null` after it has already `preventDefault()`ed the browser's own restore. Focus lands on `<body>`
and the next Tab restarts the page (WCAG 2.4.3).

The file's header had declined the prop on the reasoning that the trigger is real. True on the
*cancel* path, false on the *success* path — which is the one the control exists for. The header now
says so.

The existing e2e case opens the confirm, audits it with axe and walks the tab order, and **every one
of those passes on the defect** — it never presses `Remove photo`. The new case is about that one
press. **Red without the prop, measured in Chromium:** `probeActiveStop` returns `null`, which is
that helper's spelling of "focus is on `<body>`"; the sibling case stays green both ways.

---

## The warnings

| # | Fix | Red-run reading |
|---|---|---|
| **WR-01** | The post-animation re-measure awaited `document.getAnimations()`, unfiltered — one `iteration-count: infinite` anywhere (`animate-pulse`, `animate-spin`) never resolves `finished`, so `computeSizes()` never ran and the saved avatar carried a ~5 % ring that was never inside the mask. Now scoped to the overlay's own subtree (reached by `closest('[role="dialog"]')` — ARIA the product owns, not a test hook), skips infinite animations, races a 400 ms deadline, and **fails toward** the re-measure. `settleAnimations` in the e2e harness had the same document-wide `Promise.all` and would have hung; it filters too. | New e2e mounts an infinite animation and polls the crop square. With the old read restored: **9.61 px short on a 192 px square — 5 %, exactly as documented.** |
| **WR-02** | `reorderPhotos` used `orderedIds` raw. Duplicates write one row twice; a subset leaves omitted rows where the negative parking never touches them. Either collides with the `(listingId, position)` unique index, and with no `try` the rejection **escaped the server action** instead of returning the `{ ok: false, error }` shape `photo-uploader.tsx` reverts its optimistic order on. Now requires a permutation of this listing's own ids before the transaction opens, and catches what the check cannot name. | 4 new cases, each asserting the **stored order** is unchanged rather than just `ok === false` (a half-applied parking phase would satisfy the weaker one and leave rows at negative positions). All 4 fail with the check and catch disabled; the 8 originals stay green. |
| **WR-03** | `cloudinary.ts` hard-coded `400` beside `AVATAR_OUTPUT_PX`, and the test pinned `400` on both sides — agreeing with itself while disagreeing with the constant. Both now read the constant. | Covered by `test:design` + `tests/profile/avatar.test.ts`. |
| **WR-04** | Both machine-checked pins had moved to 28; four prose sentences had not, two of them written by this phase at the wrong number (27). | — (prose) |
| **WR-05** | The zoom slider was mounted with `min === max` on every source at or under the output size — the row's **resting** state. Radix positions its thumb at `(value-min)/(max-min)`, so that is a division by zero and it writes `calc(NaN% + 0px)`. A browser drops the declaration silently; jsdom throws, and the field's test harness had monkey-patched four `CSSStyleDeclaration` setters to absorb it. The locked row now gets the real ceiling (unreachable by construction — the control is disabled) and **the monkey-patch is deleted**, which is the second, independent signal. Also feature-detects `getAnimations`, killing 11 pre-existing uncaught `TypeError`s per run of that file. | With `max={maxZoom}` restored and the patch gone: **10 of 24 cases fail with `SyntaxError: ")" is expected`** — the jsdom throw the patch used to swallow. |
| **WR-06** | The census hard-coded five adopters under a docblock claiming they were all of them. Seven files render the pattern across eight call sites, and a **future** adopter adding the prop would have been invisible — a list cannot notice what is not on it. Now derived from the tree, minus two deliberate exceptions that each state their reason, with a non-vacuity floor (an empty derivation would register zero cases and report green) and a guard on the exceptions themselves. | The derived set names **exactly the five originals**. Removing one exception turns that file red with the census's own message, so the derivation really reaches the new adopters. |
| **WR-07** | `visual-baselines.ts` respelled `AVATAR_CROP_TITLE` as a literal, justified by "this module cannot import from `e2e/`". The string was never in `e2e/` — it is `src/lib/avatar.ts`, a directive-free leaf. Now interpolated. | Covered by `test:design`. |
| **WR-08** | `image-fixtures.test.ts` asserted **in prose** that this repo has no CI and concluded no other home existed for the gate. Both `ci.yml` and `baselines.yml` exist, and two files added by this same phase cite `ci.yml` **by line number**. Replaced with the true reason: `test:design` is build-blocking, so one home fails locally *and* in CI. | — (prose) |
| **WR-09** | The staged object URL leaked when the field unmounted with a file staged — a client-side navigation with the dialog open, a `router.refresh()`, an error boundary. The cleanup is keyed to **unmount alone** (`[]` deps reading a ref), which is what makes it safe under the dev remount the original note declined a cleanup over: the double-invoke fires at mount, when nothing is staged. | Red with the effect removed: only the leak case fails. Two non-vacuity pairs stay green (nothing staged → nothing revoked; cancel already revoked → no second release). **The deps-keyed variant the review proposed was also probed** — it double-releases on cancel and turns an existing case red. Recorded in the test rather than left as a preference. |
| **WR-10** | The `!cloudName` branch called itself fail-closed and only logged; the refusal was delegated to `isOwnCloudinaryAsset`'s own guard. Correct today, and silently reopened by any future default parameter on that signature with this comment still reading like the guard. It also emitted two warn lines per rejection in the state every CI run is in. It returns now; the validator's guard stays as defence in depth. | `tests/listing/photos.test.ts`'s absent-cloud-name case stays green. |
| **IN-01** | `engines` pinned to `node >=24.2` — the version `generate-image-fixtures.mjs` throws at import time without, which makes `image-fixtures.test.ts` fail at suite load with a message that reads like a fixture problem. | — |
| **IN-02** | `avatarMaxZoom(NaN)` returned `NaN`, escaping both clamp arms while the docblock claimed both clamped "for nonsense input". The sweep covered `0` and `-1` and missed the one value that got through. `|| 1` before the clamp; a `NaN` row added. | Covered by the row sweep. |

---

## Two things a later reader should know

**One finding's prescribed fix was not taken (CR-02).** The review's proposed anchor is reopened by
a version segment placed after the overlay. The shipped fix refuses the transformation DSL entirely
and flips the "accepts a TRANSFORMATION segment" test to a rejection. If someone later wants stored
transformed urls, the reason to be careful is in the test, not just in the commit.

**Two pre-existing problems were fixed in passing, because the code became mine.** The 11 uncaught
`TypeError`s from `getAnimations` in `avatar-field.test.tsx` (vitest reports these as "might cause
false positive tests"), and `settleAnimations` in the e2e harness hanging rather than settling on an
infinite animation. Neither was a review finding.

---

## What this does NOT close

Phase 16 is still **14 of 16 plans**, and both remaining plans are parked at operator checkpoints
that no amount of code review discharges:

- **16-15 Task 3** — the CI baselines dispatch. The Playwright `visual` project is Linux-only and
  this box is `win32`, so it cannot run here by design (`playwright.config.ts` refuses to create the
  project rather than minting a baseline that can never be committed).
- **16-16 Task 2** — the CROP-04 hardware walk on real iOS Safari and Android Chrome.
  `16-UAT-CROP.md` is authored with every observation cell empty.

`deferred-items.md` D1 (the zoom thumb's missing accessible name) is also still open — it is a
deferred item, not a review finding, and closing it is a design call about where the name goes.
