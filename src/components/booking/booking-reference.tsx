"use client";

// BookingReference (TRUST-02 · D-78) — the `FIT-XXXXXXXX` string, in fixed-advance-width glyphs, with a
// copy control that cannot lie about having copied.
//
// A CLIENT COMPONENT, and only because it owns a clipboard event. Everything else about it is display.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE VALUE ARRIVES AS A PROP AND IS NEVER RE-DERIVED HERE (T-13-02-REFLEAK)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The reference is derived in `src/lib/booking/reference.ts` by a SHA-256 over the booking id, using
// `node:crypto` — so it is server-only in practice and calling the deriver from a client component would
// drag a Node builtin into the browser bundle. The RSC computes it once
// (`src/app/(app)/bookings/[id]/page.tsx:540`) and passes the finished string down.
//
// ⚠ THE DERIVER IS NAMED DESCRIPTIVELY ABOVE RATHER THAN SPELLED, and that is the grep-tripwire
//   discipline this repository uses (13-PATTERNS § H; `share-link-box.tsx:14-17` is the original). The
//   check that this component never re-derives its own value is a raw grep for the deriver's identifier
//   returning ZERO on this file, and a grep is only a real guard if the comment forbidding the thing
//   cannot trip it. Do not "helpfully" name it here — that disarms the check for good.
//
// AND THE TWO STRINGS MUST NOT BE CONFUSED. The reference is a one-way, non-enumerable LABEL; the opaque
// UUID in the URL is the access token and stays owner-gated. Rendering the label is safe precisely
// because you cannot walk back from it to the id.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// `font-mono tabular-nums` — A DECIDED CALL, NOT A DEFAULT (13-UI-SPEC § Typography rule 1)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// TRUST-02 asks for "tabular figures". `tabular-nums` normalises DIGITS ONLY — and a Crockford base32
// reference is mostly LETTERS, so tabular figures alone do not make two references line up, which is the
// entire point of the requirement (a string read back over the phone, or lined up against an email
// subject). `Geist_Mono` is already loaded and exposed as `--font-mono` with zero call sites; this is
// its first. `tabular-nums` is KEPT so the requirement's literal wording is satisfied and an all-digit
// reference still aligns with the money column above it.
//
// NO `tracking-*` OVERRIDE. Mono advance widths already own the rhythm, and negative tracking on a
// monospace string is the one place it reads as a defect. The size still comes from a NAMED type role —
// `text-heading` on the confirmation moment, `text-body` on the detail page, the receipt and the group
// page — never an arbitrary step; `font-mono` is a font-FAMILY utility, not a fifth size.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// STATE-08 — WHY A TOAST IS CORRECT *HERE* AND ALMOST NOWHERE ELSE ON THIS SURFACE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A copy confirmation is NON-TERMINAL SUCCESS: nothing changed, nothing is owed, and if the booker
// misses the announcement they simply press the control again. That is the shape a toast is for, and
// `sonner` announces it to assistive tech, which is how the control reports success without a
// visual-only state change. A refund amount, a reduced headcount and a voided invite are the opposite of
// that on every axis, and STATE-08 names all three: what a booker must READ never travels in a toast.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE PHASE-15 SEAM (D-78) — A CONTRACT AND A HANDOVER, NOT A SEND
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// Phase 15's confirmation-mail subject line interpolates the EXACT string the reference module returns —
// never a retyped, reformatted, truncated or lower-cased variant. That is what makes the reference in an
// inbox and the reference on this page the same token to a person comparing them, and it is why nothing
// in this file normalises its input. **This plan adds no email module and moves no send trigger.**

import * as React from "react";
import { CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Write to the clipboard, reporting success as a VALUE rather than by not throwing.
 *
 * Copied in shape from `share-link-box.tsx:39-57`, including the reason it exists. The optional-call
 * trap: `await navigator.clipboard?.writeText(x)` resolves to `undefined` when the API is missing, so a
 * `try/catch` around it sees no error and the caller cheerfully announces a copy over an empty
 * clipboard. Presence is therefore checked EXPLICITLY, before the call.
 *
 * The API can genuinely be absent — `navigator.clipboard` is undefined outside a secure context (plain
 * http on a LAN IP, some in-app webviews) and `writeText` can reject on a denied permission. Both land
 * on the same calm fallback.
 */
async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Swallowed deliberately and WITHOUT logging: a rejection reason can echo the value it failed on.
    return false;
  }
}

/**
 * Put the whole reference under the selection, so a plain Ctrl/Cmd-C finishes the job by hand.
 *
 * The `share-link-box.tsx` fallback focuses a `readOnly` input and calls `select()`. This surface renders
 * the reference as TEXT rather than as a field — it is a fact on the page, not something to edit — so the
 * equivalent is a Range over the element's contents. Every step is presence-checked: the Selection API is
 * partial in some embedded webviews, and a fallback that throws would turn an honest failure into a
 * crash on the one path the booker reaches when something has already gone wrong.
 */
function selectContents(el: HTMLElement | null): void {
  if (el === null || typeof window === "undefined" || !window.getSelection) return;
  el.focus();
  const selection = window.getSelection();
  if (!selection || typeof document.createRange !== "function") return;
  const range = document.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);
}

export type BookingReferenceProps = {
  /**
   * The finished `FIT-XXXXXXXX` string, server-computed and passed in. Rendered VERBATIM: never
   * lower-cased, never stripped of its prefix, never re-derived. See the header.
   */
  reference: string;
  /**
   * Which named type role carries the string.
   *
   * `"moment"` → `text-heading`, the confirmation moment, where the reference is second only to the
   * `<h1>`. `"detail"` (the default) → `text-body`, everywhere it is one fact among several: the detail
   * page, the receipt and the group page.
   */
  size?: "moment" | "detail";
};

export function BookingReference({ reference, size = "detail" }: BookingReferenceProps) {
  const stringRef = React.useRef<HTMLParagraphElement>(null);

  async function handleCopy() {
    if (await writeToClipboard(reference)) {
      toast.success("Reference copied");
      return;
    }
    selectContents(stringRef.current);
    toast.error("Couldn't copy — select the reference and copy it manually.");
  }

  return (
    <div className="flex items-center gap-2">
      {/* THE HOOK IS ON THIS ELEMENT — the string, not the control. GATE-04's scope rule keeps the
          button on a role query, and the width measurement in `e2e/tabular-figures.spec.ts` reads
          THIS text node. `tabIndex={-1}` makes the element programmatically focusable for the
          manual-copy fallback without putting a non-interactive paragraph into the tab order. */}
      <p
        ref={stringRef}
        tabIndex={-1}
        data-testid="booking-reference"
        className={cn(
          "font-mono tabular-nums",
          size === "moment" ? "text-heading" : "text-body",
        )}
      >
        {reference}
      </p>
      {/* COPYING IS PLUMBING — neutral, never coral (`share-link-box.tsx:22-24`). The accent on these
          surfaces belongs to the one recovery action, and this is not it.

          The visible word is a single verb and stays one (D-95): it is not a bare label, because the
          accessible name below says what is being copied, and that name CONTAINS the visible word, so
          voice control and the screen reader agree on what to say. */}
      <Button
        type="button"
        variant="ghost"
        size="touch"
        aria-label="Copy booking reference"
        onClick={handleCopy}
      >
        <CopyIcon aria-hidden="true" />
        Copy
      </Button>
    </div>
  );
}
