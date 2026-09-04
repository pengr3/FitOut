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
//
// ── STATE-08 (plan 13-05) — THE ROTATION ALERT, AND WHY THE TWO COPY TOASTS STAY ─────────────────────────
// THE TWO TOASTS BELOW ARE UNTOUCHED AND ARE THE ALLOW-LISTED ROW IN `tests/design/status-vocab.test.ts`.
// They announce PLUMBING — whether a clipboard write happened — and the fact the organizer actually needs
// is the link itself, which is rendered in the read-only field beneath them and survives every refresh.
// Nothing in either sentence is a fact to retain, which is precisely what STATE-08 says a toast is for.
//
// THE ROTATION IS THE OPPOSITE CASE, and it gets an alert. When the invite credential is regenerated the
// previously-shared link stops resolving, and an organizer who missed a timed animation will keep sending
// a dead one. So this component announces it, once, in an addressable in-page region above the field.
//
// ⚠️ IT DECIDES TO ANNOUNCE BY NOTICING THAT THE URL IT RENDERS CHANGED, NOT BY BEING TOLD. `inviteUrl` is
// re-read server-side under the owner scope on every `router.refresh()`, so a rotation arrives here as a
// changed prop. Three consequences, all of them the reason this shape was chosen over a callback from
// `RegenerateLinkButton` (which lives in a different subtree, below the roster):
//   1. THE ANNOUNCEMENT CANNOT LIE. It is a function of the thing being announced. A refused, rate-limited
//      or failed regeneration leaves the URL exactly as it was and says nothing at all — where a callback
//      fired on `res.ok` would still be one refactor away from announcing a rotation that did not land.
//   2. THE CREDENTIAL STAYS WHERE D-118 PUT IT. Nothing new carries the token; the button never reads it.
//   3. IT IS TRUE OF ANY ROTATION, including one performed on the organizer's other device and picked up
//      by the D-84 poller. The old link is dead either way, and that is the sentence.
// The first render is NOT a change — a freshly navigated page is a page, not an event (GATE-03's rule for
// this phase) — so the alert is silent until the URL actually moves.
//
// ⚠️ THERE IS NO TOAST BESIDE IT. Two live regions announcing one outcome is GATE-03 rule 6's defect. The
// button's success toast was DELETED rather than kept alongside this.
//
// ── THE BOX IS `PanelCard` (DS-11 · 13-UI-SPEC § The Group Surfaces, plan 13-08) ─────────────────────────
// D-79's design-system pass, and nothing more: the label, the read-only field, the copy control and the
// microcopy are byte-identical, and the component gained no capability. The panel is `tone="default"` —
// the ROTATION ALERT above it keeps `tone="muted"`, which is what keeps the advisory legible AS an
// advisory now that the thing it sits above is also a box. Two `default` panels stacked would have read as
// one two-part panel.
//
// ⚠️ THE ALERT STAYS OUTSIDE THE PANEL, exactly where plan 13-05 put it. It is about the field, not part
// of it, and a region nested inside the box it describes reads as a line of that box's content.
//
// `Copy link` moved from a hand-rolled `h-11` to the NAMED `size="touch"` (WR-01 / D-22). Same 44px, but
// the number is now the design system's rather than this file's, and the size carries the wider padding
// that goes with a touch target. `rsvp-form.tsx:336-339` records the same conversion and the defect that
// motivated it — two adjacent controls expressing one height two ways get different horizontal insets.
// The `Input` beside it keeps its `h-11`: there is no named size on the input primitive, so a matched
// height is the only spelling available to it.

import * as React from "react";
import { CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PanelCard } from "@/components/patterns/panel-card";

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

/**
 * 13-UI-SPEC § Copywriting Contract → STATE-08 alerts. The locked string, hoisted so the test that
 * asserts it and the surface that renders it read the same characters.
 */
const LINK_ROTATED_SENTENCE =
  "The old invite link no longer works. Copy the new one below and share it again.";

/**
 * The region's NAME, which is a different mechanism from its CONTENT.
 *
 * `role="status"` is `nameFrom: author` in ARIA — a status region takes NO name from its own text — so
 * without this attribute the accessible name is the empty string. 13-UI-SPEC requires a non-empty one
 * on both STATE-08 alerts, and `live-regions.ts`'s rule 5 says the same in general.
 *
 * ⚠️ IT IS A LABEL, NOT A SECOND COPY OF THE SENTENCE, and that is deliberate rather than lazy.
 * `live-regions.ts` records the measured hazard: on the VoiceOver/Safari pairing a NAMED live region
 * can be announced by its name INSTEAD of its content. A name that duplicated the sentence would read
 * it twice; a name that paraphrased it would replace it with a worse version. Three words that say
 * which region this is, and the sentence stays the content.
 */
const LINK_ROTATED_REGION_NAME = "Invite link updated";

export function ShareLinkBox({ inviteUrl }: { inviteUrl: string }) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // ADJUSTING STATE WHEN A PROP CHANGES, in the render body — React's own documented pattern for
  // exactly this, and the reason there is no effect here. `seenUrl` is what this box last rendered;
  // when the server hands down a different one, the credential rotated under the organizer.
  //
  // A `useEffect` would announce one paint LATE and would re-run on every refresh the poller performs,
  // which is how a quiet gate becomes a chatty one.
  const [seenUrl, setSeenUrl] = React.useState(inviteUrl);
  const [rotated, setRotated] = React.useState(false);
  if (inviteUrl !== seenUrl) {
    setSeenUrl(inviteUrl);
    // NOT on the first render — a freshly mounted box has not seen a rotation, it has seen a page.
    setRotated(true);
  }

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
      {/* ABOVE THE BOX, so the sentence is read before the field it is about (13-UI-SPEC § STATE-08).
          `PanelCard tone="muted"` is DS-11's declared in-page advisory surface — not a new pattern, not
          `attention` tone (DS-10 reserves that for a genuine failure needing a human), and emphatically
          not the destructive variant, which renders NOWHERE in this phase. Rotating a leaked link is the
          fix, not the incident.

          The region wraps the panel rather than being the panel, because `PanelCard` takes no `role`:
          the same bare-wrapper shape `money-statement.tsx` uses to keep the panel's padding inside the
          measured box. */}
      {rotated && (
        <div role="status" aria-label={LINK_ROTATED_REGION_NAME}>
          <PanelCard tone="muted">
            <p className="text-sm">{LINK_ROTATED_SENTENCE}</p>
          </PanelCard>
        </div>
      )}
      <PanelCard>
        {/* ONE child carrying the box's inner rhythm — `PanelCard`'s content is `space-y-4`, and a label
            four steps above the field it names is a label that has stopped looking attached to it. */}
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
              // `sm:flex-1`, never bare `flex-1` — the identical trap `rsvp-form.tsx` was measured
              // failing: this row is `flex-col` below `sm:`, so there `flex-1` would set
              // `flex-basis: 0%` on the HEIGHT and override `h-11`, collapsing the field to its bare
              // content box. A column flex container already stretches its items to full width.
              className="h-11 text-sm sm:flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="touch"
              className="sm:w-auto"
              onClick={handleCopy}
            >
              <CopyIcon aria-hidden="true" />
              Copy link
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Anyone with this link can say whether they&apos;re coming. Share it with the people you
            want there.
          </p>
        </div>
      </PanelCard>
    </div>
  );
}
