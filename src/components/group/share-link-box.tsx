"use client";

// ShareLinkBox (GROUP-02 · D-118, 08-UI-SPEC §2) — the invite link, and the app's first clipboard surface.
//
// ⚠️ THE TOKEN IN THIS URL IS A BEARER CREDENTIAL, NOT AN IDENTIFIER. Anyone holding the link can open the
// invite page and RSVP — that is the whole point of D-118 (no account required, GROUP-03). Two consequences
// this file is built around:
//
//   1. IT IS RENDERED BUT NEVER LOGGED. There is deliberately NO browser-log call of any kind in this file,
//      not even on the copy-failure path where logging the value you failed to copy is the obvious instinct.
//      A devtools log is a durable, screenshot-able, extension-readable surface; the server side of the same
//      rule is why `createGroup`'s audit meta carries the group id and never the token.
//
//      ⚠️ GREP TRIPWIRE (the 07-04 payout-sweep idiom). That absence is checked by grepping this file for
//      the browser logger's own name, and a grep is only a real guard if it cannot be tripped by the very
//      comment forbidding it — so the identifier is not spelled out anywhere here, comments included. If you
//      are tempted to name it "just in prose", don't: it disarms the check for good.
//   2. IT IS READ-ONLY, NOT DISABLED. A `disabled` input is unfocusable and unselectable, which would take
//      away the one manual escape hatch when the clipboard API is unavailable. `readOnly` keeps the field
//      selectable, focusable and keyboard-copyable while still being unmodifiable.
//
// COPY IS NEUTRAL, NOT CORAL. 08-UI-SPEC §Color enumerates the accent exhaustively and `Copy link` is not on
// it — the coral on this feature belongs to `Invite people` and `Yes, I'm coming`, both of which are the one
// decision on their surface. Copying is plumbing.
//
// THE CLIPBOARD CAN GENUINELY BE ABSENT. `navigator.clipboard` is undefined outside a secure context (plain
// http on a LAN IP, some in-app webviews) and `writeText` can reject on a denied permission. Both are
// handled the same calm way: select the field and tell the organizer to copy it by hand (08-UI-SPEC §Error
// states). A silent success toast over a clipboard that did nothing would be the worst outcome here — the
// organizer would paste stale content into a group chat and never know.

import * as React from "react";
import { CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Write to the clipboard, reporting success as a VALUE rather than by not throwing.
 *
 * The optional-call trap this exists to avoid: `await navigator.clipboard?.writeText(url)` resolves to
 * `undefined` when the API is missing, so a `try/catch` around it sees no error and the caller cheerfully
 * announces "Link copied" over an empty clipboard. Presence is therefore checked explicitly.
 */
async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Swallowed deliberately and WITHOUT logging: the rejection reason can echo the value (see the header).
    return false;
  }
}

export function ShareLinkBox({ inviteUrl }: { inviteUrl: string }) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleCopy() {
    if (await writeToClipboard(inviteUrl)) {
      // `sonner` announces this to assistive tech, which is how `Copy link` reports success without a
      // visual-only state change (08-UI-SPEC §Accessibility).
      toast.success("Link copied");
      return;
    }
    // The manual fallback: put the whole link under the selection so a plain Ctrl/Cmd-C finishes the job.
    inputRef.current?.focus();
    inputRef.current?.select();
    toast.error("Couldn't copy — select the link and copy it manually.");
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="invite-link" className="text-sm font-semibold">
        Your invite link
      </Label>
      {/* Stacked on mobile, inline from `sm` up (08-UI-SPEC §Spacing). Both controls clear 44px. */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="invite-link"
          ref={inputRef}
          readOnly
          value={inviteUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="h-11 flex-1 text-sm"
        />
        <Button type="button" variant="outline" className="h-11 sm:w-auto" onClick={handleCopy}>
          <CopyIcon aria-hidden="true" />
          Copy link
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Anyone with this link can say whether they&apos;re coming. Share it with the people you want
        there.
      </p>
    </div>
  );
}
