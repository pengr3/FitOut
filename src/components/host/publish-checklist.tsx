"use client";

// THE PUBLISH CHECKLIST (HFLOW-02 / D-149) — one component, three placements, EXACTLY ONE INSTANCE
// PER DOCUMENT.
//
// ── WHAT MOVED HERE, AND WHAT DELIBERATELY DID NOT ────────────────────────────────────────────────
// The rows, the done/not-done marker and the fix affordance are LIFTED from the wizard's review step,
// not rewritten. What stayed behind is everything that reads form state: the row ARRAY, its occupancy
// fork and the key-to-index resolution all still live in `wizard.tsx`, because that is where the form
// is. This component derives nothing except two numbers off the array it is handed (how many rows are
// done, and how many there are), which is what makes the three placements incapable of disagreeing:
// there is one array and it is passed to whichever placement renders.
//
// ── WHY ONE INSTANCE IS THE WHOLE POINT ───────────────────────────────────────────────────────────
// Two checklists on one document is two places a host can read a different answer to "am I ready to
// publish". 14-UI-SPEC states it as a count over the document rather than as a description, and a
// count over the document is a claim about the DOM, not about what is visible: two placements toggled
// by a `hidden`/`block` variant pair are still TWO nodes to `querySelectorAll`, at every width. So the
// wizard renders exactly one of the three placements at a time — see `usePublishChecklistPlacement`
// below for how the width-dependent pair is chosen, and `tests/listing/publish-checklist.test.tsx`
// for the assertion.
//
// ── THE MARKER IS THE REASON FOUR COMMITTED INVENTORIES NAME THIS FILE ────────────────────────────
// The done marker carries the one filled success surface DS-10 left standing in the whole repo, and
// it survives because it holds a GLYPH AND NOTHING ELSE. Until this plan, four separate inventories
// addressed it by the string `wizard.tsx`:
//
//   1. `tests/design/status-vocab.test.ts` — the legal filled-pairing site constant, and
//   2.   the assertion that the scan actually reached it,
//   3. `tests/design/empty-state-adoption.test.ts` — the one legal filled-success surface in the tree,
//   4. `src/lib/design/contrast-pairs.ts` — the note declaring the pairing legal in the first place.
//
// All four were re-pointed at this file in the same commit that created it, each with its reason.
// None of their failure messages says "you moved a component", which is why the move had to carry
// them rather than discover them.
//
// ⚠ NAMING DISCIPLINE, INHERITED FROM `wizard.tsx`'s rail comment. Nothing in this file's prose quotes
// a class name that a committed gate counts. Two of those gates count occurrences of the filled
// success utility per FILE, and one counts sticky sites per file; a comment is textually
// indistinguishable from a call site to a text scan, and this repository has burned plans on exactly
// that. Every such token below is named descriptively. Keep it that way when you edit this.

import { useEffect, useState } from "react";
import { CheckIcon, ChevronDownIcon, MinusIcon } from "lucide-react";

import { PanelCard } from "@/components/patterns/panel-card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/**
 * One checklist row, exactly as the wizard already builds it.
 *
 * `step` is an index into the WALKED step list, resolved by KEY at the call site (`stepIndex`), never
 * a numeric literal — the walked list is occupancy-dependent, so a literal is correct for one mode
 * and silently wrong in the other. `null` means the row has no step to jump to (the verified-email
 * row is fixed off-surface), and `action` is the alternative affordance for exactly that case.
 */
export type PublishChecklistRow = {
  label: string;
  done: boolean;
  step: number | null;
  action?: () => void;
};

/**
 * THE CONTAINER, and the only element in this file carrying the declared hook.
 *
 * WHY A COMPONENT AND NOT THREE ATTRIBUTES. The one-instance-per-document assertion counts THIS
 * element, so the three placements have to agree on what "one checklist" is; three separately typed
 * attributes agree today and are one typo away from a placement that is invisible to the count. The
 * hook is spelled as a LITERAL rather than read from a constant because `selector-contract.ts`'s
 * bidirectional gate reads `data-testid` attributes out of the source AST — a constant reference is
 * not a rendered id as far as it can tell, and the contract goes red on `declared but rendered
 * nowhere`. Observed, not assumed: this file shipped with the constant form first and the gate said
 * exactly that.
 */
function ChecklistContainer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div data-testid="publish-checklist" className={className}>
      {children}
    </div>
  );
}

/** 14-UI-SPEC § Copy — the panel's title, spelled once so the two surfaces cannot drift. */
export const PUBLISH_CHECKLIST_TITLE = "Ready to publish?";

/** 14-UI-SPEC § Copy — the review step's lede over the unmet rows. Shipped wording, unchanged. */
export const PUBLISH_CHECKLIST_UNMET_LEAD = "Almost there — finish these to publish:";

/**
 * The collapsed trigger's label, below the large breakpoint.
 *
 * IT CARRIES THE FIGURE BECAUSE THE PANEL IS CLOSED. A permanently-open nine-row panel above every
 * field would push the first input below the fold on all nine steps of a nine-step form, so the
 * small-screen placement defaults CLOSED — and a closed panel that says nothing about its own state
 * is not a persistent checklist, it is a button. The number is what makes the state legible without
 * opening it, which is the entire job this placement has on a phone.
 */
export function publishChecklistTriggerLabel(done: number, total: number): string {
  return `${done} of ${total} ready to publish`;
}

/**
 * Which of the two PERSISTENT placements the viewport gets.
 *
 * WHY THIS IS A SCRIPTED QUERY AND NOT A VARIANT PAIR, which is the shape this repo reaches for
 * first and the shape that is wrong here. A `hidden` / `block` variant pair renders BOTH placements
 * into the document and hides one with CSS. That is correct for two decorations; it is incorrect for
 * this, because the property 14-UI-SPEC pins is a count over the document — `[data-testid]` resolves
 * against display-none nodes exactly as it resolves against painted ones, so the variant pair reads
 * as two checklists at all three widths and the one-instance rule becomes unassertable. One node is
 * therefore chosen, not two drawn.
 *
 * THE FALLBACK IS THE SMALL-SCREEN PLACEMENT, AND THAT IS THE SAFE DIRECTION. On the server, and on
 * the first client render before the effect runs, there is no viewport to ask — so the collapsible
 * ships. It is closed, it costs one row of vertical space, and it is correct at every width; the
 * panel, chosen wrongly, would put a fixed-width column beside a form that has no room for it. The
 * cost is one frame of the collapsed trigger on a wide screen before the panel replaces it, which is
 * recorded here rather than discovered in review.
 *
 * THE BREAKPOINT IS THE FRAMEWORK'S OWN LARGE STEP, in the same root-relative unit the two declared
 * measurements use — the checklist column and the grid track are both prefixed for that step, so all
 * three switch on one boundary. It is written in a media query rather than derived from
 * `measurements.ts` because that module is an inventory of BOX CLASSES and a media condition is not
 * one; a fourth spelling of the boundary in the wrong module would be worse than this comment.
 */
const PANEL_MEDIA_QUERY = "(min-width: 64rem)";

export function usePublishChecklistPlacement(): "panel" | "collapsible" {
  const [wide, setWide] = useState(false);

  useEffect(() => {
    // jsdom implements no media-query engine at all, so this is a real guard rather than defensive
    // noise: `tests/listing/wizard-occupancy.test.tsx` and `tests/listing/wizard-rail.test.tsx` run
    // against this component through the wizard, and an unguarded call throws there.
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(PANEL_MEDIA_QUERY);
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return wide ? "panel" : "collapsible";
}

/**
 * The rows themselves — ONE list, rendered identically by all three placements.
 *
 * There is no per-placement branch in here, deliberately. The labels, their order and the fix
 * affordance are the answer to "am I ready to publish", and an answer that reads differently
 * depending on where you read it is the defect this whole component exists to make impossible.
 */
function ChecklistRows({
  rows,
  onFix,
}: {
  rows: readonly PublishChecklistRow[];
  onFix: (step: number) => void;
}) {
  return (
    <ul className="space-y-1.5">
      {rows.map((c) => (
        <li key={c.label} className="flex items-center gap-2 text-sm">
          {/*
            DS-10 — THE ONE SURVIVING FILLED SUCCESS SURFACE IN THE REPO, and it survives on purpose.
            This is a PROGRESS INDICATOR, not a status badge: the marker holds a GLYPH and nothing
            else (no text node is possible in this span — both branches render an icon), which makes
            it the single legal pairing of the success foreground token, measured as a non-text glyph
            on the filled surface at 3.83 court / 3.84 grove against a 3.05 bar. Every OTHER filled
            green chip in the app was a status badge whose LABEL sat on the fill at 3.24:1, and all
            four were retired. The success foreground remains ILLEGAL AS TEXT. Both glyphs are
            aria-hidden so the decorative claim is provable rather than assumed — the done/not-done
            meaning is carried by the checklist copy and the strike-through beside it.

            THIS MARKUP IS WHY FOUR INVENTORIES NAME THIS FILE. See the header. Do not add a second
            filled success surface anywhere, and do not put a text node in this span in any placement.
          */}
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full",
              c.done ? "bg-success text-success-foreground" : "bg-muted",
            )}
          >
            {c.done ? (
              <CheckIcon className="size-3" aria-hidden="true" />
            ) : (
              <MinusIcon className="size-3 text-muted-foreground" aria-hidden="true" />
            )}
          </span>
          <span className={cn(c.done && "text-muted-foreground line-through")}>{c.label}</span>
          {!c.done && c.step !== null && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0"
              onClick={() => onFix(c.step as number)}
            >
              Fix
            </Button>
          )}
          {!c.done && c.action && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0"
              onClick={c.action}
            >
              Resend verification email
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * The three placements.
 *
 * `panel` and `collapsible` are the two halves of the PERSISTENT placement (D-149) and are chosen by
 * `usePublishChecklistPlacement` at the call site rather than in here — which is what lets a test
 * assert the markup of both without a viewport to simulate. `review` is the terminal step's inline
 * placement, and the persistent one is suppressed there.
 */
export type PublishChecklistProps =
  | {
      placement: "panel" | "collapsible";
      rows: readonly PublishChecklistRow[];
      onFix: (step: number) => void;
    }
  | {
      placement: "review";
      rows: readonly PublishChecklistRow[];
      onFix: (step: number) => void;
      /** Every row done. The authority is still the server's publish schema; this is only the telling. */
      eligible: boolean;
      emailVerified: boolean;
      hostEmail: string;
    };

export function PublishChecklist(props: PublishChecklistProps) {
  const { placement, rows, onFix } = props;

  if (placement === "review") {
    // BOTH BRANCHES LIVE INSIDE THE CONTAINER, and that is a deliberate change from the shipped
    // shape rather than a wrapper for tidiness. The container is the readiness REGION, and on the
    // review step a listing that is ready has a readiness answer too — "everything looks ready" IS
    // the answer. Leaving that branch outside would make the one-instance count read zero on exactly
    // the listings that are finished, so the rule would hold only for drafts and the assertion would
    // need a fixture caveat instead of being unconditional.
    return (
      <ChecklistContainer className="space-y-3">
        {props.eligible ? (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            Everything looks ready. Publishing makes your listing public. It becomes bookable once
            your payouts are set up (that step comes next).
          </div>
        ) : (
          <>
            <p className="text-sm font-medium">{PUBLISH_CHECKLIST_UNMET_LEAD}</p>
            <ChecklistRows rows={rows} onFix={onFix} />
            {!props.emailVerified && (
              <p className="text-xs text-muted-foreground">
                Verify your email to publish. We sent a link to {props.hostEmail}.
              </p>
            )}
          </>
        )}
      </ChecklistContainer>
    );
  }

  if (placement === "panel") {
    // THE PIN COMES FROM THE PATTERN'S OWN PROP, never from a class here. The offset that keeps the
    // panel clear of the app header is derived once, inside `panel-card.tsx`, and the design gate
    // that counts pinned sites counts them per file — a second file encoding the same offset takes
    // that count from one to two and reads as "somebody re-derived the header height", which is
    // exactly what it would be.
    return (
      <ChecklistContainer>
        <PanelCard sticky title={PUBLISH_CHECKLIST_TITLE}>
          <ChecklistRows rows={rows} onFix={onFix} />
        </PanelCard>
      </ChecklistContainer>
    );
  }

  return (
    <ChecklistContainer>
      {/*
        NO TITLE PROP ON THE PANEL HERE, and the trigger is why. The disclosure's own label already
        carries the title's sense plus the figure ("6 of 9 ready to publish"), so passing the title as
        well would print two headings for one region on the narrowest screen in the product — the one
        viewport where the whole argument for defaulting closed was vertical space.
      */}
      <PanelCard>
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="touch"
              // `px-0` cancels the touch size's horizontal padding so the label lines up with the
              // rows it discloses, while the 44px height and the full-width border box — which is
              // what a pointer actually hit-tests — are both kept. Same separation
              // `price-disclosure.tsx` makes on the booker side.
              className="w-full justify-between px-0 font-normal"
            >
              <span className="text-sm font-medium">
                {publishChecklistTriggerLabel(rows.filter((r) => r.done).length, rows.length)}
              </span>
              {/* The caret is the only motion here. The duration token is named EXPLICITLY rather
                  than inherited from the app-wide default, for the reason `price-disclosure.tsx`
                  records at length. `aria-hidden` because the state it depicts is already announced
                  through the trigger's own `aria-expanded`. */}
              <ChevronDownIcon
                className="transition-transform duration-(--motion-fast) group-data-[state=open]/button:rotate-180"
                aria-hidden
              />
            </Button>
          </CollapsibleTrigger>
          {/* `pt-2` so the revealed rows are not welded to the trigger's own box. No height
              animation: the region's height depends on how many rows the occupancy fork produces,
              and an unmeasured height transition above a form is motion nobody asked for. */}
          <CollapsibleContent className="pt-2">
            <ChecklistRows rows={rows} onFix={onFix} />
          </CollapsibleContent>
        </Collapsible>
      </PanelCard>
    </ChecklistContainer>
  );
}
