"use client";

// The `/profile` avatar field (CROP-01) — the picker, the four pre-dialog guards, the staged file,
// the crop dialog and the upload action, in one client composite.
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
//   - It renders NO removal control and NO destructive affordance of any kind. CROP-03 and its
//     action land together in plan 16-12, in this same file, because a destructive button shipped
//     ahead of the action behind it is a button that lies — `profile-form.tsx:120-122` says exactly
//     that about the seam this composite replaces.
//   - It authors NO user-visible string. Every sentence it renders is an imported literal: the four
//     refusals and the helper from `@/lib/avatar`, the size refusal and the save failure from
//     `@/lib/validation/profile`, which is where the two shipped ones already live. Two copies of a
//     string are two strings (rule F2).
//   - It knows nothing about the crop stage's geometry, its gestures or its bytes. `ImageCropDialog`
//     hands back a Blob; this file turns that Blob into a request.
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
// bug than the leak it would be trying to prevent. It is released on all three paths: a guard that
// refuses after minting, a cancel, and a successful save. It is NOT released from an effect cleanup,
// and that is a decision rather than an oversight: React remounts effects in development, so a
// cleanup here would revoke the URL the still-open dialog is displaying.

import * as React from "react";
import { useRouter } from "next/navigation";

import { uploadAvatarAction } from "@/app/actions/avatar";
import { ImageCropDialog } from "@/components/profile/image-crop-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AVATAR_ALLOWED_TYPES,
  AVATAR_CHANGE_LABEL,
  AVATAR_HELPER,
  AVATAR_MIN_SOURCE_PX,
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

  const [avatarUrl, setAvatarUrl] = React.useState(initialAvatarUrl);
  const [staged, setStaged] = React.useState<StagedAvatar | null>(null);
  const [saving, setSaving] = React.useState(false);

  /**
   * ONE REFUSAL SLOT FOR EVERY WAY THIS FIELD CAN REFUSE — the four pre-dialog guards AND the save
   * failure — not one per guard.
   *
   * A field that can only ever have refused ONE thing rendering two regions is the shape GATE-03
   * rule 6 forbids, and four slots would make that shape reachable by accident. It is safe to share
   * because the two halves are mutually exclusive in time: a guard refuses only when no file is
   * staged (it returns without mounting the dialog), and a save can only fail while one is. The
   * render below spends the slot in exactly one place accordingly — inside the dialog when a file is
   * staged, on the page when none is — so at no instant are both mounted.
   */
  const [refusal, setRefusal] = React.useState<string | null>(null);

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

  const initials = displayName.slice(0, 2).toUpperCase();

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
        <Button
          ref={primaryControl}
          type="button"
          variant="outline"
          size="touch"
          onClick={() => fileInput.current?.click()}
        >
          {avatarUrl ? AVATAR_CHANGE_LABEL : AVATAR_UPLOAD_LABEL}
        </Button>
        {/* Delta-14: the helper NAMES WEBP now. The shipped one did not, which under-stated what the
            picker accepts — so this is a changed string and not a lifted one. Delta-11: the label
            role, which is 14px in court AND travels to grove; a frozen size would fork this line
            from the second theme, which is the exact failure D-02 exists to surface. */}
        <p className="text-label text-muted-foreground">{AVATAR_HELPER}</p>
        {/* THE FIELD'S ONE REFUSAL REGION, and it renders only while no file is staged — when one
            is, the same slot is spent inside the dialog instead (see the state's docblock). The
            shipped block's busy label is gone with the state it described: nothing is in flight
            between picking a photo and confirming it, so there is nothing to report. Declared in
            `src/lib/design/live-regions.ts` as this file's alert #1. */}
        {refusal && !staged ? (
          <p role="alert" className="text-label text-destructive">
            {refusal}
          </p>
        ) : null}
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
