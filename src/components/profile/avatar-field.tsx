"use client";

// The `/profile` avatar field (CROP-01 + CROP-03) — the picker, the four pre-dialog guards, the
// staged file, the crop dialog and the upload action, plus the removal control and its confirm, in
// one client composite.
//
// ⚠ RULE F4 IS THE HEADLINE BEHAVIOUR, AND IT IS THE REASON THIS PHASE EXISTS. NOTHING REACHES THE
// NETWORK BETWEEN PICKING A FILE AND PRESSING THE CONFIRM. No pre-upload, no speculative upload, no
// "we'll clean it up if they cancel." The operator's complaint on 2026-08-10 was that the app *"just
// inserted the photo without confirming or adjusting the zoom and whatever"* — and it did, literally:
// `profile-form.tsx:78-93` called the action out of the input's own change event, so the bytes were
// already stored by the time anybody could frame them. A later "optimisation" that starts the request
// early to hide latency reinstates exactly that bug, which is why the rule is written down here
// rather than left to be inferred from the order of two function calls.
//
// THE OTHER HALF OF THE PRIOR MISTAKE, AND THE ONE THAT FAILED SILENTLY. The shipped handler never
// touched `e.target.value`. A browser fires no `change` event when the file picked is byte-identical
// to the one already sitting in the input, so cancelling a crop and re-choosing the SAME photo did
// nothing at all — no dialog, no refusal, no sign anything had been asked. D-174 makes the reset an
// acceptance criterion: it happens in a `finally`, on EVERY handled change, accepted, refused and
// cancelled alike.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO.
//   - It owns NO form state. It touches no react-hook-form field, it registers nothing, and it does
//     not participate in `updateProfile`. The file input carries no `name` and is deliberately
//     unregistered; `profile-form.tsx:99-103` records why, and that property must survive plan
//     16-11's extraction or the values the profile action receives change.
//   - It composes the removal confirm HERE rather than in `profile-form.tsx`, and that placement is
//     mechanical rather than aesthetic: `profile-pass.test.tsx` case (8) bans the destructive button
//     variant in the form, so composing the confirm there would redden an assertion nobody budgeted.
//     Case (8) must stay green through this file's whole life.
//   - It authors NO user-visible string. Every sentence it renders is an imported literal: the four
//     refusals and the helper from `@/lib/avatar`, the size refusal and the save failure from
//     `@/lib/validation/profile`, which is where the two shipped ones already live. Two copies of a
//     string are two strings (rule F2).
//   - It knows nothing about the crop stage's geometry, its gestures or its bytes. `ImageCropDialog`
//     hands back a Blob; this file turns that Blob into a request.
//
// ⚠ CROP-03 ARRIVED IN PLAN 16-12 — THE CONTROL AND THE ACTION IN THE SAME COMMIT. Until then this
// file said, in the list above, that it rendered no removal affordance of any kind, because a
// destructive button shipped ahead of the action behind it is a button that lies
// (`profile-form.tsx:120-122` reserved the seam in those words). `removeAvatarAction` now exists, so
// the sentence is discharged rather than deleted. Three properties of the removal are load-bearing:
//
//   FOCUS LANDS ON THE SAFE ACTION BY MECHANISM, NOT BY DOM ORDER. D-168 declined the alarm-semantics
//   overlay primitive in order to keep ONE focus trap and ONE escape behaviour in this app, and made
//   "default focus lands on `Keep photo`, never on `Remove photo`" the BINDING mitigation for that
//   trade. Plan 16-03 MEASURED what happens without a handler, on this exact footer order: Radix
//   focuses `Remove photo` — the destructive button. So the pattern's open-time focus hook is
//   supplied below, and omitting it would not be a cosmetic miss; it would be the mitigation failing
//   open. DOM order cannot substitute: `DialogFooter` is `flex-col-reverse … sm:flex-row`, so putting
//   the safe action first in the DOM would stack the DESTRUCTIVE one on top of the mobile column,
//   under the thumb.
//
//   THE TRIGGER IS PASSED TO THE OVERLAY — AND ON THE SUCCESS PATH IT UNMOUNTS ANYWAY, WHICH IS WHY
//   THE CLOSE-TIME RESTORE IS TAKEN OVER (CR-03). This file used to reason that a real `triggerRef`
//   made Radix's own restore correct here, and cited `request-row.tsx:242` for it. That is true on
//   the CANCEL path and false on the one the control exists for: `handleRemove` closes the overlay
//   and calls `setAvatarUrl(null)` in the same commit, and the whole `<ResponsiveDialog>` — trigger
//   included — is rendered only `{avatarUrl ? … : null}`. So React has detached the trigger's ref by
//   the time Radix's `onCloseAutoFocus` runs; `triggerRef.current` is `null`, its `?.focus()` is a
//   no-op, and the `preventDefault()` it already called has suppressed the browser's own restore.
//   Focus lands on `<body>` and the next Tab restarts the page — a WCAG 2.4.3 failure, and verbatim
//   the case `responsive-dialog.tsx:205-220` documents and supplies the prop for. The primary
//   control survives the commit (it only relabels to `Upload photo`), so it is the restore target,
//   exactly as `ImageCropDialog` does for the identical unmount-while-open situation.
//
//   DESTRUCTIVE COLOUR APPEARS EXACTLY ONCE IN THE PHASE, on the confirm verb INSIDE the overlay. The
//   `Remove photo` control on the page is `variant="outline"` and stays that way: 02-UI-SPEC's rule
//   is that the alarm palette pairs with a destructive verb inside a confirmation, never as a bare
//   coloured button in normal flow.
//
// ⚠ THE CLIENT GUARDS ARE A UX AFFORDANCE, NOT THE TRUST BOUNDARY (T-16-33). They exist so a person
// learns in a hundred milliseconds what they would otherwise learn after a five-megabyte round trip —
// they are not what makes the upload safe. `avatarFileSchema` re-validates type and size server-side
// on every call (`actions/avatar.ts:70-77`), and the 400x400 `c_fill` transform bounds the stored
// dimensions (D-171), because this action is publicly reachable and a client that skipped this
// component entirely still has to be refused. NOBODY MAY "REMOVE THE DUPLICATE CHECK": there is no
// duplicate. There is one check on each side of a boundary, and each is the only one on its side.
//
// THE OBJECT URL'S LIFETIME IS THIS FILE'S (T-16-35). `image-crop-dialog.tsx` neither mints nor
// revokes it, deliberately — whoever mints a URL revokes it, and two owners for one URL is a worse
// bug than the leak it would be trying to prevent. It is released on FOUR paths: a guard that
// refuses after minting, a cancel, a successful save, and — since WR-09 — this component unmounting
// while a file is still staged.
//
// THAT FOURTH PATH USED TO BE MISSING, AND ITS ABSENCE WAS RECORDED AS A DECISION: "React remounts
// effects in development, so a cleanup here would revoke the URL the still-open dialog is
// displaying." The reasoning was sound and the CONSEQUENCE was written down nowhere — a client-side
// navigation with the crop dialog open, a `router.refresh()` that re-renders the route skeleton, an
// error boundary, all unmount this component with `staged` non-null, and the URL then pins its
// decoded bitmap for the life of the tab. On a 5 MB source that is a real retention.
//
// The revoke is keyed to UNMOUNT ALONE (`[]` deps reading a ref), which is what makes it safe under
// the remount the old note was worried about: React's dev double-invoke fires the cleanup once
// immediately after mount, when nothing is staged yet, so it is a no-op — and it then never fires
// again until the component really goes away. A deps-keyed cleanup would have had the problem
// described; this one cannot.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";

import { removeAvatarAction, uploadAvatarAction } from "@/app/actions/avatar";
import { ResponsiveDialog } from "@/components/patterns/responsive-dialog";
import { ImageCropDialog } from "@/components/profile/image-crop-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AVATAR_ALLOWED_TYPES,
  AVATAR_CHANGE_LABEL,
  AVATAR_HELPER,
  AVATAR_MIN_SOURCE_PX,
  AVATAR_REMOVE_BODY,
  AVATAR_REMOVE_CANCEL,
  AVATAR_REMOVE_CONFIRM,
  AVATAR_REMOVE_CONFIRM_BUSY,
  AVATAR_REMOVE_LABEL,
  AVATAR_REMOVE_TITLE,
  AVATAR_TOO_SMALL_MESSAGE,
  AVATAR_UNREADABLE_MESSAGE,
  AVATAR_UPLOAD_LABEL,
  AVATAR_WRONG_TYPE_MESSAGE,
} from "@/lib/avatar";
import { measureImage, revokeAvatarObjectUrl } from "@/lib/avatar-canvas";
import {
  AVATAR_MAX_BYTES,
  AVATAR_TOO_LARGE_MESSAGE,
  AVATAR_UPLOAD_FAILED_MESSAGE,
} from "@/lib/validation/profile";

/**
 * The file the person chose, paired with the URL minted from it.
 *
 * The two travel together because they die together: the dialog is mounted only while this is
 * non-null, so unstaging IS unmounting, and the revoke belongs at the same moment. A cancel is
 * therefore a true no-op by construction — no crop, no zoom and no per-image bound survives it,
 * because no component survives it.
 */
type StagedAvatar = { file: File; objectUrl: string };

export type AvatarFieldProps = {
  /** The avatar the server rendered this page with, or `null` for the initials fallback. */
  avatarUrl: string | null;
  /** The person's display name — the initials fallback is its first two characters, as shipped. */
  displayName: string;
};

export function AvatarField({
  avatarUrl: initialAvatarUrl,
  displayName,
}: AvatarFieldProps) {
  const router = useRouter();

  const fileInput = React.useRef<HTMLInputElement>(null);

  /**
   * The control that opens the overlay, handed to the dialog so focus can come back to it.
   *
   * ⚠ NOT OPTIONAL POLISH. `responsive-dialog.tsx:205-220` records the measured Radix defect: a
   * modal dialog suppresses the browser's own focus restore in order to focus its trigger's ref, and
   * that ref is populated only by a real trigger element. This overlay opens programmatically and
   * has none, so without this ref it gets the suppression with none of the restore — Escape drops
   * focus to the document body and the next Tab restarts the page (Delta-5c).
   */
  const primaryControl = React.useRef<HTMLButtonElement>(null);

  /**
   * The removal confirm's SAFE action, so focus can be placed on it deliberately when the overlay
   * opens.
   *
   * ⚠ THIS REF IS THE WHOLE OF D-168's MITIGATION. Plan 16-03 measured Radix's untouched behaviour
   * against this exact footer order and recorded the reading: focus lands on `Remove photo`. There is
   * no DOM order that fixes it without putting the destructive action under the thumb on mobile (see
   * the header), so the only mechanism is to suppress Radix's own choice and focus this element.
   */
  const keepPhotoControl = React.useRef<HTMLButtonElement>(null);

  const [avatarUrl, setAvatarUrl] = React.useState(initialAvatarUrl);
  const [staged, setStaged] = React.useState<StagedAvatar | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [removeOpen, setRemoveOpen] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);

  /**
   * ONE REFUSAL SLOT FOR EVERY WAY THIS FIELD CAN REFUSE — the four pre-dialog guards, the save
   * failure AND the removal failure — not one per outcome.
   *
   * A field that can only ever have refused ONE thing rendering two regions is the shape GATE-03
   * rule 6 forbids, and four slots would make that shape reachable by accident. It is safe to share
   * because the halves are mutually exclusive in time: a guard refuses only when no file is staged
   * (it returns without mounting the dialog), a save can only fail while one is, and a removal can
   * only fail while the confirm is open — which requires no file staged and nothing saving. The
   * render below spends the slot in exactly one place accordingly — inside the crop dialog when a
   * file is staged, inside the removal confirm while it is open, on the page otherwise — so at no
   * instant are two mounted.
   *
   * ⚠ AND THERE IS EXACTLY ONE INTERRUPTING-REGION ELEMENT IN THIS FILE, WRITTEN ONCE AND PLACED
   * TWICE. That is not a style preference: `src/lib/design/live-regions.ts` declares this file as
   * carrying
   * ONE alert region, and `tests/design/live-regions.test.tsx` scans the SOURCE and keys regions by
   * their ordinal among same-kind siblings — so a second element here would be an undeclared
   * `alert#2` and would redden that gate, whether or not the two could ever mount together. Writing
   * the element once and choosing its parent is the shape that keeps the declaration true.
   */
  const [refusal, setRefusal] = React.useState<string | null>(null);

  /**
   * The staged file as of the last commit, readable from a cleanup that must not depend on it.
   *
   * An unmount cleanup with `staged` in its dep array would re-run on every stage and unstage, which
   * is exactly the revoke-while-the-dialog-is-open hazard the header used to decline the cleanup
   * over. A ref carries the value across instead, so the cleanup can have NO dependencies and
   * therefore fire only at mount (harmlessly, with nothing staged) and at real unmount.
   */
  const stagedRef = React.useRef<StagedAvatar | null>(null);
  React.useEffect(() => {
    stagedRef.current = staged;
  }, [staged]);

  React.useEffect(
    () => () => {
      // WR-09's fourth release path. Every ORDINARY end to a staged file — refuse, cancel, save —
      // has already revoked and cleared `staged` by the time this runs, and `URL.revokeObjectURL`
      // on an already-revoked url is a no-op, so this is the backstop for the ways a component
      // disappears without one of those: a client-side navigation with the dialog open, a
      // `router.refresh()` that re-renders the route, an error boundary.
      const url = stagedRef.current?.objectUrl;
      if (url) revokeAvatarObjectUrl(url);
    },
    [],
  );

  /** Unstage, release the URL, and forget any sentence the staged attempt produced. */
  function discardStaged(current: StagedAvatar) {
    revokeAvatarObjectUrl(current.objectUrl);
    setStaged(null);
    setRefusal(null);
  }

  /**
   * The four guards, in 999.2 § 2e's fixed order: type, size, decode, dimensions.
   *
   * The order is not arbitrary and is not a micro-optimisation. The two cheap checks come first so
   * that a wrong-typed or over-sized file is refused without a decode ever being attempted, and the
   * object URL is minted only once both have passed — a URL minted before a refusal is a URL that
   * has to be revoked on a path nobody remembers to write.
   *
   * A shorter side between AVATAR_MIN_SOURCE_PX and the output size is NOT a refusal. The dialog
   * opens with its zoom row disabled and its reason beneath it (rule F8); the person decides whether
   * a slightly soft photo is the one they want, and the app does not decide for them.
   */
  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      // Clear-then-set (`request-row.tsx:163-166`'s idiom): a second refusal is a second
      // announcement rather than a silent no-op, and a stale sentence never outlives its attempt.
      setRefusal(null);
      if (staged) discardStaged(staged);

      // 1. TYPE. The picker's own filter is a hint and not a gate — it can be defeated by choosing
      //    "All files" in every OS dialog there is — so the list is re-read here.
      if (!(AVATAR_ALLOWED_TYPES as readonly string[]).includes(file.type)) {
        setRefusal(AVATAR_WRONG_TYPE_MESSAGE);
        return;
      }

      // 2. SIZE. The same number and the same sentence the server refuses with, imported rather
      //    than restated, so the two sides cannot drift into disagreeing about five megabytes.
      if (file.size > AVATAR_MAX_BYTES) {
        setRefusal(AVATAR_TOO_LARGE_MESSAGE);
        return;
      }

      const objectUrl = URL.createObjectURL(file);

      // 3. DECODE. "Undecodable" is the image element's `error` event firing, full stop — a corrupt
      //    file, a mislabelled one, or a HEIC the browser cannot render (T-16-34). The refusal is a
      //    sentence naming what to pick instead, never a crash.
      let size: { width: number; height: number };
      try {
        size = await measureImage(objectUrl);
      } catch {
        revokeAvatarObjectUrl(objectUrl);
        setRefusal(AVATAR_UNREADABLE_MESSAGE);
        return;
      }

      // 4. DIMENSIONS. The hard floor. Below it there is no framing decision worth showing anybody:
      //    every crop of the image is smaller than the square we would store.
      if (Math.min(size.width, size.height) < AVATAR_MIN_SOURCE_PX) {
        revokeAvatarObjectUrl(objectUrl);
        setRefusal(AVATAR_TOO_SMALL_MESSAGE);
        return;
      }

      setStaged({ file, objectUrl });
    } finally {
      // D-174, ON EVERY PATH — accepted, refused and cancelled alike. See the header for the failure
      // this one line prevents; it is in a `finally` so that no `return` above can skip it and no
      // future branch can be added that forgets it.
      e.target.value = "";
    }
  }

  /** Cancel — a true no-op from BOTH entry states, which is why its label is the bare `Cancel`. */
  function handleOpenChange(next: boolean) {
    if (next || !staged) return;
    discardStaged(staged);
  }

  async function handleConfirm(blob: Blob) {
    // Re-entrancy guard BEFORE the disabled attribute can apply — `request-row.tsx:165`'s idiom,
    // and the failure it prevents is a double-press that starts two uploads of the same photo.
    if (saving) return;
    setSaving(true);
    setRefusal(null);

    let result: Awaited<ReturnType<typeof uploadAvatarAction>>;
    try {
      // A Blob appended WITH A FILENAME arrives server-side as a File, which is what keeps the
      // action's `z.instanceof(File)` true (999.2 § 1b). Its type is the one format D-172 emits,
      // inside the allow-list plan 16-07 narrowed.
      const fd = new FormData();
      fd.set("avatar", blob, "avatar.jpg");
      result = await uploadAvatarAction(fd);
    } catch (e) {
      setSaving(false);
      throw e;
    }

    setSaving(false);

    if (!result.ok) {
      // THE SERVER'S OWN SENTENCE, VERBATIM — no client re-authoring (`request-row.tsx:178-180`
      // states the rule). The dialog STAYS OPEN with the framing intact (rule F5): a failure that
      // closed the overlay would throw away the very thing the person is being asked to retry.
      setRefusal(result.error);
      return;
    }

    if (staged) discardStaged(staged);
    setAvatarUrl(result.avatarUrl);
    router.refresh();
  }

  /**
   * The bytes could not be produced at all — no measured element, no crop rectangle, or a rejecting
   * encoder. It maps to the SAME sentence the action returns on a failed upload, because to the
   * person "the save was refused" and "the bytes could not be made" are one outcome with one
   * recovery. One region, one source, whichever half failed.
   */
  function handleEncodeFailed() {
    setRefusal(AVATAR_UPLOAD_FAILED_MESSAGE);
  }

  /**
   * ONE guard covering all three of the confirm's dismiss affordances while the removal is in
   * flight — the `×`, the overlay click and `Escape` — exactly as the crop dialog does it (Delta-3).
   * The pattern exposes no `dismissLocked` prop and deliberately never will (plan 16-03 refused to
   * add one), so the controlled state IS the lock, which is why this overlay's `open` is controlled
   * even though it also has a trigger. The two compose.
   */
  function handleRemoveOpenChange(next: boolean) {
    if (removing) return;
    // Clear-then-set, the same idiom the picker uses: a sentence from a previous attempt must not
    // outlive it, in either direction of travel.
    setRefusal(null);
    setRemoveOpen(next);
  }

  /**
   * Place focus on the safe action when the overlay opens, suppressing Radix's own first-tabbable
   * choice. BOTH halves are required — without the `preventDefault()` Radix focuses the destructive
   * button after this returns, which plan 16-03 measured rather than predicted.
   */
  function steerFocusToSafeAction(event: Event) {
    event.preventDefault();
    keepPhotoControl.current?.focus();
  }

  /**
   * Where focus goes when the removal confirm CLOSES (CR-03).
   *
   * ⚠ NOT REDUNDANT WITH RADIX'S OWN RESTORE, because on the path that matters there is nothing left
   * for Radix to restore to. A successful removal unmounts the trigger in the SAME COMMIT as the
   * close (the overlay is rendered only while `avatarUrl` is non-null), so `triggerRef.current` is
   * already `null` inside `onCloseAutoFocus` and Radix's `?.focus()` no-ops after it has suppressed
   * the browser's own restore. `primaryControl` survives — it relabels from `Change photo` to
   * `Upload photo` — so it is both the nearest surviving control and the one that now offers the
   * only action left on the field. On the CANCEL path this lands focus one control to the left of
   * where Radix would have put it, which is the price of having one correct behaviour instead of
   * two divergent ones.
   */
  function returnFocusToPrimary(event: Event) {
    event.preventDefault();
    primaryControl.current?.focus();
  }

  async function handleRemove() {
    // Re-entrancy guard BEFORE the disabled attribute can apply — the same idiom the crop confirm
    // uses, and on a DESTRUCTIVE action the failure it prevents is two removals from one press.
    if (removing) return;
    setRemoving(true);
    setRefusal(null);

    let result: Awaited<ReturnType<typeof removeAvatarAction>>;
    try {
      result = await removeAvatarAction();
    } catch (e) {
      setRemoving(false);
      throw e;
    }

    setRemoving(false);

    if (!result.ok) {
      // THE SERVER'S OWN SENTENCE, VERBATIM, and the overlay STAYS OPEN on it (rule F5). Closing on
      // a failure would leave the person looking at the photo they asked to remove with nothing on
      // screen saying why it is still there.
      setRefusal(result.error);
      return;
    }

    setRemoveOpen(false);
    // The circle falls back to initials immediately; `router.refresh()` re-renders the server tree
    // so every other surface reading this row agrees.
    setAvatarUrl(null);
    router.refresh();
  }

  const initials = displayName.slice(0, 2).toUpperCase();

  /**
   * THE FIELD'S ONE REFUSAL REGION, written once here and placed by the render below. Declared in
   * `src/lib/design/live-regions.ts` as this file's alert #1 — see the state's docblock for why a
   * second element rather than a second parent would be the wrong shape.
   */
  const refusalLine = refusal ? (
    <p role="alert" className="text-label text-destructive">
      {refusal}
    </p>
  ) : null;

  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg" className="size-16">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="Your avatar" /> : null}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="space-y-1">
        {/* The only `<input type="file">` in `src/`. `accept` is narrowed to the three types the
            allow-list declares — it was `image/*`, which offered the person HEIC and TIFF and then
            refused them after the fact. It is a hint to the picker and nothing more, which is why
            guard 1 re-reads the list anyway. */}
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          aria-label="Upload avatar"
          onChange={onAvatarChange}
        />
        {/* `Change photo` FIRST, `Remove photo` after it — the 64px circle is the anchor and the
            constructive action reads first. `flex-wrap` so the pair falls to two rows rather than
            overflowing at 320px, where two 44px controls plus the circle do not fit on one line. */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            ref={primaryControl}
            type="button"
            variant="outline"
            size="touch"
            onClick={() => fileInput.current?.click()}
          >
            {avatarUrl ? AVATAR_CHANGE_LABEL : AVATAR_UPLOAD_LABEL}
          </Button>

          {/* RENDERED ONLY WITH A PHOTO TO REMOVE. There is no disabled-but-present spelling of this
              control: a removal affordance on a profile that has no photo is a control that acts on
              nothing. */}
          {avatarUrl ? (
            <ResponsiveDialog
              open={removeOpen}
              onOpenChange={handleRemoveOpenChange}
              onOpenAutoFocus={steerFocusToSafeAction}
              onCloseAutoFocus={returnFocusToPrimary}
              title={AVATAR_REMOVE_TITLE}
              description={AVATAR_REMOVE_BODY}
              trigger={
                // Passed as the pattern's `trigger` for the OPEN side — Radix wires the click and
                // the `aria-haspopup` relationship from it. The close side is handled by
                // `onCloseAutoFocus` above, because this element does not survive a successful
                // removal; see CR-03 in the header.
                <Button type="button" variant="outline" size="touch">
                  <Trash2Icon aria-hidden="true" />
                  {AVATAR_REMOVE_LABEL}
                </Button>
              }
              footer={
                <>
                  {/* DOM ORDER: DESTRUCTIVE FIRST. `DialogFooter` is `flex-col-reverse … sm:flex-row`,
                      so this puts `Keep photo` on TOP of the mobile stack (under the thumb) and on
                      the RIGHT on desktop. Focus is steered by the handler above, never by this
                      order — the two requirements pull in opposite directions and only one of them
                      can be satisfied by DOM order. */}
                  <Button
                    type="button"
                    variant="destructive"
                    size="touch"
                    onClick={handleRemove}
                    disabled={removing}
                    aria-disabled={removing}
                  >
                    {removing ? AVATAR_REMOVE_CONFIRM_BUSY : AVATAR_REMOVE_CONFIRM}
                  </Button>
                  <Button
                    ref={keepPhotoControl}
                    type="button"
                    variant="outline"
                    size="touch"
                    onClick={() => handleRemoveOpenChange(false)}
                    disabled={removing}
                    aria-disabled={removing}
                  >
                    {AVATAR_REMOVE_CANCEL}
                  </Button>
                </>
              }
            >
              {/* The removal failure, in the field's one region. See `refusalLine`. */}
              {refusalLine}
            </ResponsiveDialog>
          ) : null}
        </div>
        {/* Delta-14: the helper NAMES WEBP now. The shipped one did not, which under-stated what the
            picker accepts — so this is a changed string and not a lifted one. Delta-11: the label
            role, which is 14px in court AND travels to grove; a frozen size would fork this line
            from the second theme, which is the exact failure D-02 exists to surface. */}
        <p className="text-label text-muted-foreground">{AVATAR_HELPER}</p>
        {/* The refusal region on its PAGE parent, which it takes only when neither overlay owns it —
            no file staged, and the removal confirm closed. The shipped block's busy label is gone
            with the state it described: nothing is in flight between picking a photo and confirming
            it, so there is nothing to report. */}
        {!staged && !removeOpen ? refusalLine : null}
      </div>

      {/* MOUNTED ONLY WHILE A FILE IS STAGED. That is what makes a cancel structurally a no-op
          rather than a cleanup: there is no cropper state to reset because there is no cropper. */}
      {staged ? (
        <ImageCropDialog
          open
          onOpenChange={handleOpenChange}
          objectUrl={staged.objectUrl}
          onConfirm={handleConfirm}
          onEncodeFailed={handleEncodeFailed}
          saving={saving}
          error={refusal}
          returnFocusRef={primaryControl}
        />
      ) : null}
    </div>
  );
}
