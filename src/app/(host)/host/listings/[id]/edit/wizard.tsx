"use client";

// The Airbnb-style listing creation/edit wizard (D-01). A single RHF form spans all steps; each
// "Save and continue" AUTOSAVES the draft via saveListingStep (the server re-validates with the same
// draftSchema — the client is never trusted) and advances. The terminal review step enforces nothing
// itself: it calls publishListing, which re-runs the full D-02 gate SERVER-SIDE (all core fields +
// both integer-cents rates + ≥3 photos + verified email). status is never set from the client.
//
// Steps (D-01, + the OPEN-01 occupancy fork): the whole-space flow walks
//   type → details → location → photos → occupancy → pricing → booking mode → cancellation → review,
// and the drop-in flow walks the same list WITHOUT `booking mode` (OC-10 — drop-in passes are instant
// only, so the step is removed from the walked list rather than shown and ignored, and its removal is
// explained once on the review step). Nothing here is addressed by numeric index: the walked list is
// mode-dependent, so both the render guards and the checklist's links resolve steps by KEY.
//
// The PHOTOS step is a documented seam — the signed direct-to-Cloudinary uploader grid lands in
// Plan 04 (Wave 3). Until then the review checklist's "3+ photos" row stays unmet (photoCount comes
// from the server), so publish is correctly blocked on photos this phase.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  CheckIcon,
  ChevronLeftIcon,
  DoorClosedIcon,
  LockIcon,
  MinusIcon,
  UsersIcon,
} from "lucide-react";

import {
  draftSchema,
  DROP_IN_INSTANT_ONLY_MESSAGE,
  OCCUPANCY_MODE_VALUES,
  type CancellationPolicyValue,
  type DraftListingInput,
  type OccupancyModeValue,
} from "@/lib/validation/listing";
import { formatMoney } from "@/lib/money";
import {
  ModeLockNotice,
  MODE_LOCK_NOTICE_ID,
} from "@/components/host/mode-lock-notice";
import {
  PublishChecklist,
  usePublishChecklistPlacement,
  type PublishChecklistRow,
} from "@/components/host/publish-checklist";
import {
  SPACE_TYPES,
  ACTIVITY_TAGS,
  ACTIVITY_TAG_LABELS,
  AMENITIES,
  type ActivityTagValue,
  type AmenityValue,
  type SpaceTypeValue,
} from "@/lib/listing-vocab";
import {
  saveListingStep,
  publishListing,
  type ListingResult,
} from "@/app/actions/listing";
import { authClient } from "@/lib/auth-client";
import {
  AddressAutocomplete,
  type ResolvedAddress,
} from "@/components/listing/address-autocomplete";
import { PhotoUploader } from "@/components/listing/photo-uploader";
import { type ListingPhotoRow } from "@/app/actions/listing-photo";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Toaster } from "@/components/ui/sonner";
import { PageHeader } from "@/components/patterns/page-header";
import { STEP_MARKER_BOX, WIZARD_CHECKLIST_COL } from "@/lib/design/measurements";
import { cn } from "@/lib/utils";

export type WizardListing = {
  id: string;
  title: string | null;
  description: string | null;
  primarySpaceType: SpaceTypeValue | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  neighborhood: string | null;
  lat: number | null;
  lng: number | null;
  maxOccupancy: number | null;
  hourlyRateCents: number | null;
  dayRateCents: number | null;
  /**
   * D-123 — how the space is sold. NOT nullable: the column carries a NOT NULL DEFAULT of `exclusive`, so
   * a listing nobody has decided about is indistinguishable from one deliberately set to whole-space. See
   * `hasChosenMode` below for how the wizard tells those apart without inventing a column.
   */
  occupancyMode: OccupancyModeValue;
  /** D-125 — the drop-in price per person, integer centavos. NULL on every exclusive listing. */
  perHeadPriceCents: number | null;
  /** D-108 — how many people the flat rate covers before the extra-guest fee applies. NULL ⇒ 1. */
  included: number | null;
  /** D-108 — per-extra-guest surcharge in integer centavos. NULL or 0 ⇒ flat pricing (no surcharge). */
  extraHeadFee: number | null;
  currency: string;
  bookingMode: "instant" | "request";
  /** D-77 — NULL until the host makes an explicit choice. There is deliberately no default. */
  cancellationPolicy: CancellationPolicyValue | null;
  showExactAddress: boolean;
  status: "draft" | "published" | "unlisted";
  amenities: string[];
  activityTags: string[];
  photoCount: number;
  photos: ListingPhotoRow[];
};

/**
 * The nine steps, in order, with the question each one asks.
 *
 * EXPORTED (D-148, plan 14-09) so `tests/listing/wizard-rail.test.tsx` can assert the rail's accessible
 * names and the rendered step title AGAINST THIS LIST rather than against retyped copies of these
 * strings. A test that retypes a title passes when the title and the marker drift apart in the same
 * edit — which is exactly the drift the rail's keying rule exists to prevent — and it also makes every
 * copy change a two-file edit. Read-only by construction (`as const`); nothing outside this module
 * mutates it, and the WALKED list is derived per-render below because it is mode-dependent.
 */
export const STEPS = [
  { key: "type", title: "What kind of space is it?" },
  { key: "details", title: "Tell guests about your space" },
  { key: "location", title: "Where is it?" },
  { key: "photos", title: "Add photos of your space" },
  // OPEN-01 / 09-UI-SPEC § 1a — the occupancy choice gets its OWN screen, immediately before pricing.
  // It must precede pricing because the mode decides which fields the pricing step renders, and it must
  // precede booking mode because in drop-in mode that step does not exist at all. Burying a mutually
  // exclusive business-model choice inside a scroll of currency inputs is how listings get misconfigured:
  // a host who misreads this either sells their whole gym to one person or sells one court thirty times.
  { key: "occupancy", title: "How do people use your space?" },
  { key: "pricing", title: "Set your rates" },
  { key: "booking", title: "How do you want to accept bookings?" },
  // Title phrased as a question to match the other steps' voice ("How do you want to accept bookings?"),
  // and deliberately NOT reusing the publish checklist's row label verbatim. Keeping that label a unique
  // string in this file means a grep for the unmet-requirement row finds the ROW, not this heading — the
  // same tripwire discipline 07-04/07-09 use for their forbidden-name greps.
  { key: "cancellation", title: "What happens if a guest cancels?" },
  { key: "review", title: "Review and publish" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

/**
 * The three D-67 tiers, host-facing (07-UI-SPEC § 6). Plain language, no dates — there is no booking yet;
 * the booker-facing surfaces derive their copy from the D-68 LADDER instead (see
 * src/components/booking/cancellation-policy-disclosure.tsx).
 *
 * ORDER IS NOT A RANKING. The three render at equal weight and nothing marks one as recommended — see the
 * no-default rationale on the step below.
 */
const CANCELLATION_TIERS: { value: CancellationPolicyValue; title: string; body: string }[] = [
  {
    value: "flexible",
    title: "Flexible",
    body: "Guests get a full refund if they cancel at least 12 hours before the session. Best for spaces that are easy to rebook.",
  },
  {
    value: "standard",
    title: "Standard",
    body: "Full refund up to 24 hours before; half back up to 6 hours before. A middle ground most hosts pick.",
  },
  {
    value: "strict",
    title: "Strict",
    body: "Full refund up to 48 hours before; half back up to 24 hours before. Best for spaces you turn down other bookings for.",
  },
];

/**
 * The two occupancy modes, host-facing (09-UI-SPEC § 1b, copy rule O1). Plain language with a worked
 * example each; the enum names, "occupancy mode", "per-head" and "admissions" appear NOWHERE a host can
 * read them — this is the phase's highest-stakes comprehension moment and DB vocabulary is how a host
 * mis-sells their space.
 *
 * Keyed by the enum value and rendered by mapping OCCUPANCY_MODE_VALUES (the 09-06 export), so the union is
 * never retyped here and a future third mode is a COMPILE error in this file rather than a silently missing
 * card. ORDER IS NOT A RANKING and neither card is recommended — see the no-pre-selection note on the step.
 */
const OCCUPANCY_MODE_CARDS: Record<
  OccupancyModeValue,
  { Icon: typeof DoorClosedIcon; title: string; body: string; example: string }
> = {
  exclusive: {
    Icon: DoorClosedIcon,
    title: "Whole space",
    body: "One booking at a time. Whoever books gets the space to themselves for the hours they picked.",
    example: "Best for court rentals, studio hire, and private training.",
  },
  open_capacity: {
    Icon: UsersIcon,
    title: "Drop-in passes",
    body: "Lots of people share the space on the same day. Each person buys a day pass and can come any time you're open. You set the price per person and how many people you'll let in each day.",
    example: "Best for gyms with day passes, open court sessions, and open-mat classes.",
  },
};

/**
 * The OC-17 lock, as the wizard consumes it. A DISCRIMINATED UNION, not three loose props: O7 requires the
 * lock to name why, WHEN it lifts, and a way out, so when `locked` is true the compiler makes both the count
 * and the already-formatted unlock instant mandatory. There is no shape of this type that can render a bare
 * "you can't" with no date. Computed server-side (09-06 `getModeLockState` + the shipped label helpers) —
 * the wizard derives neither the lock nor the timezone.
 */
export type ModeLockDisplay =
  | { locked: false }
  | { locked: true; lockedByCount: number; unlocksAtLabel: string };

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE SAVE STATE (D-150) — WHAT THE SERVER SAID, AND NOTHING ELSE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Every advance in this wizard autosaves, and until plan 14-11 the host was told about it in a toast
// that is gone on the next paint and gone for good on a refresh. The failure half was worse: the
// server's own refusal sentence went into the failure toast inside the save helper and was DISCARDED
// there, so the caller saw a bare `false` and had nothing left to render even if it had wanted to.
//
// ⚠ THE TOAST SPELLINGS ARE NAMED DESCRIPTIVELY THROUGHOUT THIS FILE'S PROSE, NOT QUOTED. The
// verification of this decision is a per-file COUNT of the two toast call spellings, and a comment
// quoting one is indistinguishable from a call site to a grep — this repo has burned plans on exactly
// that. The same rule applies to the status role's literal spelling below.
//
// D-150 replaces both with ONE region beside the control that triggers the save, and forbids by name
// the two shortcuts that would make it a lie:
//
//   1. AN OPTIMISTIC STRING — rendering "Saved" because a request was sent rather than because a
//      response said so. The host then finds out at publish time that their listing has no price.
//   2. A TIMER. A scheduled callback that clears or sets this state is an optimistic string wearing a
//      delay: it reports the passage of time, which the server has no opinion about. There is ZERO
//      scheduled-callback machinery on this path, it is asserted as a source fact AND as a rendered
//      behaviour under a fake clock in `tests/listing/wizard-save-state.test.tsx`, and both readings
//      exist because either one alone can be satisfied by a shape that fails the other.
//
// The analog is `src/app/(app)/profile/profile-form.tsx:45-63, 248-265` — the same RHF + zodResolver +
// server-action-returning-a-result stack, which already reaches these conclusions (no timer, no
// optimistic string, secondary ink rather than a filled surface, because a sentence that renders only
// after a real save IS the signal and the colour was decoration). This region differs in two ways
// only: it PERSISTS at idle rather than unmounting, so its text can change in place; and it carries
// the server's own sentence on failure instead of a re-authored one.

/** The four states, as a union so `failed` cannot exist without the sentence that explains it. */
type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "failed"; message: string };

const SAVE_STATE_IDLE: SaveState = { kind: "idle" };
const SAVE_STATE_SAVING: SaveState = { kind: "saving" };
const SAVE_STATE_SAVED: SaveState = { kind: "saved" };

/**
 * The region's NAME, which is a different mechanism from its CONTENT.
 *
 * The status role is `nameFrom: author` in ARIA — it takes NO name from its own text — so without
 * this attribute the region's accessible name is the empty string. The rule and its reasoning are
 * `src/components/group/share-link-box.tsx:109-171`'s, followed here rather than reinvented. (The
 * role's literal spelling appears once in this file, at the element itself, and nowhere in prose: the
 * check that there is exactly ONE such region here is a count over the file.)
 *
 * ⚠ IT IS A LABEL, NOT A SECOND COPY OF THE SENTENCE. `live-regions.ts` records the measured hazard: on
 * the VoiceOver/Safari pairing a NAMED live region can be announced by its NAME INSTEAD of its content,
 * so a name that duplicated the sentence would read it twice and a name that paraphrased it would
 * replace it with a worse version. Two words that say which region this is; the sentence stays content.
 */
export const SAVE_STATE_REGION_NAME = "Save state";

/**
 * The copy contract (14-UI-SPEC § The save state is visible and truthful).
 *
 * EXPORTED for the same reason `STEPS` is (plan 14-09): `tests/listing/wizard-save-state.test.tsx`
 * asserts these characters, and a test that RETYPES locked copy passes at exactly the moment the copy
 * and the assertion drift apart in one edit — while also making every wording change a two-file edit.
 * Read-only by construction; nothing outside this module assigns to them.
 */
export const SAVE_STATE_SAVING_LABEL = "Saving…";
export const SAVE_STATE_SAVED_LABEL = "Saved";
/** The prefix, and ONLY the prefix. What follows it is the server's sentence, rendered verbatim. */
export const SAVE_STATE_FAILED_PREFIX = "Couldn't save — ";

/**
 * What a server result MEANS, in one place.
 *
 * Three call sites set this state and a fourth reads it. A mapping written three times is three
 * places for "failed but with an empty sentence" to appear; written once, the three cannot disagree
 * about what a refusal looks like. Deliberately total over `ListingResult` — there is no third arm
 * for the caller to forget.
 */
function saveStateFor(res: ListingResult): SaveState {
  return res.ok ? SAVE_STATE_SAVED : { kind: "failed", message: res.error };
}

/**
 * The region's text, which is EMPTY at idle rather than absent.
 *
 * The element persists across all four states (see the render site), so this returns the empty string
 * instead of the caller branching on whether to mount anything. A region that unmounts and remounts is
 * a new region to assistive technology every time, and it cannot be found by a test between presses.
 */
function saveStateText(state: SaveState): string {
  if (state.kind === "saving") return SAVE_STATE_SAVING_LABEL;
  if (state.kind === "saved") return SAVE_STATE_SAVED_LABEL;
  if (state.kind === "failed") return SAVE_STATE_FAILED_PREFIX + state.message;
  return "";
}

/**
 * Has a HUMAN ever chosen how this space is sold?
 *
 * 09-UI-SPEC § 1b: no card is pre-selected on a NEW listing (same D-77 reasoning as the cancellation tier —
 * this governs real money and must not be set by accident), while an EXISTING listing shows its stored mode.
 * Telling those apart is not free: unlike `cancellation_policy`, `occupancy_mode` is NOT NULL with a DEFAULT
 * of `exclusive`, so a freshly created draft already reads "exclusive" without anyone having decided that.
 * Rather than add a column to record a click, the wizard asks whether the row carries EVIDENCE of a decision:
 *
 *   1. the stored mode is the non-default one — that value can only have come from a deliberate write; or
 *   2. the listing is no longer a draft — it passed the publish gate, which validates the listing AGAINST
 *      its mode, so the stored mode is genuinely how the space is sold today and showing it unselected
 *      would misstate the host's live configuration; or
 *   3. it already carries pricing that only one mode uses — the host has been through the mode-forked
 *      pricing step, which sits immediately after this one.
 *
 * Residual, and accepted: a host who picks "Whole space" and abandons the draft BEFORE entering any price
 * sees the card unselected on return. That is the safe direction to be wrong in — the alternative is
 * pre-selecting a whole-space listing for someone who never read the screen, which is exactly the
 * mis-selling this step exists to prevent. A locked listing always has bookings, hence is published, hence
 * satisfies (2) — so the lock can never render with nothing selected.
 */
function hasChosenMode(l: WizardListing): boolean {
  if (l.occupancyMode !== "exclusive") return true;
  if (l.status !== "draft") return true;
  return l.hourlyRateCents != null || l.dayRateCents != null || l.perHeadPriceCents != null;
}

/** Minimal currency-symbol map (single-region launch — the column future-proofs multi-currency). */
function currencySymbol(code: string): string {
  const c = code.toLowerCase();
  if (c === "usd") return "$";
  if (c === "php") return "₱";
  if (c === "eur") return "€";
  if (c === "gbp") return "£";
  return code.toUpperCase() + " ";
}

/** Turn the RHF values into a clean draftSchema payload (null/"" → undefined, numbers coerced). */
function toPayload(v: DraftListingInput): DraftListingInput {
  const num = (x: unknown) =>
    typeof x === "number" && !Number.isNaN(x) ? x : undefined;
  return {
    title: v.title || undefined,
    description: v.description || undefined,
    primarySpaceType: v.primarySpaceType || undefined,
    addressLine1: v.addressLine1 || undefined,
    addressLine2: v.addressLine2 || undefined,
    city: v.city || undefined,
    region: v.region || undefined,
    postalCode: v.postalCode || undefined,
    country: v.country || undefined,
    neighborhood: v.neighborhood || undefined,
    lat: num(v.lat),
    lng: num(v.lng),
    maxOccupancy: num(v.maxOccupancy),
    hourlyRateCents: num(v.hourlyRateCents),
    dayRateCents: num(v.dayRateCents),
    // D-108 group pricing. Both carry the app-level defaults (₱0 fee = flat pricing, 1 included head), so
    // saving them is a no-op for a host who never opens the subsection.
    included: num(v.included),
    extraHeadFee: num(v.extraHeadFee),
    // OPEN-01 — `undefined` until the host actually picks a card, which leaves the column untouched. That
    // matters for OC-17: saveListingStep refuses only a genuine CHANGE, so an autosave from any other step
    // must never invent a mode the host didn't choose.
    occupancyMode: v.occupancyMode,
    // D-125 — the drop-in price per person. Same forward-only semantics as every other rate: a booking
    // freezes its own price at hold time, so editing this never reprices a booking already made.
    perHeadPriceCents: num(v.perHeadPriceCents),
    bookingMode: v.bookingMode,
    cancellationPolicy: v.cancellationPolicy,
    showExactAddress: v.showExactAddress,
    amenities: v.amenities,
    activityTags: v.activityTags,
  };
}

export function ListingWizard({
  listing,
  hostEmail,
  emailVerified,
  modeLock,
}: {
  listing: WizardListing;
  hostEmail: string;
  emailVerified: boolean;
  /** OC-17, server-computed on the edit page. Required — a lock this wizard forgets to render is a lock. */
  modeLock: ModeLockDisplay;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  /**
   * The steps this host has ARRIVED AT, BY KEY (D-148).
   *
   * A SET OF KEYS, NEVER A SET OF INDEXES, and this is the same rule the walked list and the render
   * guards already obey for the same reason one step further along. The walked list is MODE-DEPENDENT
   * — the booking-mode step is filtered out in drop-in mode — so position 6 is `booking` in one mode
   * and `cancellation` in the other. An index-keyed set therefore survives every single-mode test and
   * fails only for a host who changes occupancy mode mid-flow: every marker after the occupancy step
   * silently repoints, and the failure a host sees is a marker that takes them to a different
   * question than the one it is named for. `tests/listing/wizard-rail.test.tsx` walks exactly that
   * path.
   *
   * Seeded with the first step's key because the host is standing on it at mount, and added to on
   * every arrival — see `goToStep`, which is the only place `step` moves except the review
   * checklist's existing links (which can only target steps already walked through).
   */
  const [visitedKeys, setVisitedKeys] = useState<ReadonlySet<StepKey>>(
    () => new Set<StepKey>([STEPS[0].key]),
  );
  /**
   * IN-FLIGHT LOCK, not a report. This is what disables the controls and swaps their labels while a
   * request is out, and it is deliberately NOT the same value as `saveState` below: on the publish
   * path it stays true through `publishListing` long after the SAVE has already resolved, so a single
   * flag would have to lie to one of its two readers. They are set together and mean different things.
   */
  const [saving, setSaving] = useState(false);
  /**
   * D-150 — what the server last said about this draft. Set ONLY from a returned result; see the
   * module header for the two shortcuts this must never take.
   */
  const [saveState, setSaveState] = useState<SaveState>(SAVE_STATE_IDLE);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  // Live photo count — seeded from the server, kept current by the PhotoUploader as photos are
  // added/removed, so the D-02 publish checklist ("3+ photos") reflects real rows without a reload.
  const [photoCount, setPhotoCount] = useState(listing.photoCount);
  const symbol = currencySymbol(listing.currency);

  const form = useForm<DraftListingInput>({
    resolver: zodResolver(draftSchema),
    defaultValues: {
      title: listing.title ?? undefined,
      description: listing.description ?? undefined,
      primarySpaceType: listing.primarySpaceType ?? undefined,
      addressLine1: listing.addressLine1 ?? undefined,
      addressLine2: listing.addressLine2 ?? undefined,
      city: listing.city ?? undefined,
      region: listing.region ?? undefined,
      postalCode: listing.postalCode ?? undefined,
      country: listing.country ?? undefined,
      neighborhood: listing.neighborhood ?? undefined,
      lat: listing.lat ?? undefined,
      lng: listing.lng ?? undefined,
      maxOccupancy: listing.maxOccupancy ?? undefined,
      hourlyRateCents: listing.hourlyRateCents ?? undefined,
      dayRateCents: listing.dayRateCents ?? undefined,
      // D-108 — seeded with the SAME defaults the pricing engine coalesces to (quoteWindow: fee 0, included
      // 1), so an untouched listing round-trips to exactly the flat price it has today.
      included: listing.included ?? 1,
      extraHeadFee: listing.extraHeadFee ?? 0,
      // OPEN-01 — `undefined`, never the column's default, when nobody has chosen yet. An unchosen mode must
      // reach the RadioGroup as unchosen so no card renders selected (09-UI-SPEC § 1b, the D-77 precedent).
      occupancyMode: hasChosenMode(listing) ? listing.occupancyMode : undefined,
      perHeadPriceCents: listing.perHeadPriceCents ?? undefined,
      bookingMode: listing.bookingMode,
      // D-77 — `undefined`, never a fallback tier. An unchosen policy must reach the RadioGroup as
      // unchosen so no card renders selected; seeding a default here would silently make the choice.
      cancellationPolicy: listing.cancellationPolicy ?? undefined,
      showExactAddress: listing.showExactAddress,
      amenities: listing.amenities as AmenityValue[],
      activityTags: listing.activityTags as ActivityTagValue[],
    },
  });

  const values = form.watch();

  /**
   * `saved → idle` ON THE NEXT FIELD EDIT (D-150). NOT on a delay — see the module header.
   *
   * "Saved" is a claim about the draft the server holds. The moment the host changes a field it stops
   * being true, so the region goes back to the empty string and says nothing rather than saying
   * something stale. Only the `saved` arm is cleared: `failed` stays until another save answers it,
   * because a refusal the host has not yet fixed is still the last thing the server said.
   *
   * ⚠ THE MECHANISM IS THE CHANGE SUBSCRIPTION, NOT `formState.isDirty`, and the difference is not
   * cosmetic. This wizard never re-baselines the form after an autosave, so `isDirty` LATCHES: it goes
   * true on the host's first keystroke of the session and stays true through every subsequent save.
   * A region keyed on "isDirty next becomes true" would therefore clear exactly once, on the first
   * edit, and then read "Saved" forever — the optimistic string this decision exists to forbid,
   * arriving through the clause meant to prevent it. Re-baselining with a form reset would make the
   * flag honest, at the cost of clearing validation and touched state on every advance in a nine-step
   * form. Subscribing to the change stream buys the same observable rule for neither price.
   *
   * The updater returns the SAME object when there is nothing to clear, so React bails out and a
   * keystroke costs no render.
   */
  useEffect(() => {
    const subscription = form.watch(() => {
      setSaveState((prev) => (prev.kind === "saved" ? SAVE_STATE_IDLE : prev));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // ── The mode fork (OPEN-01). `undefined` — nobody has chosen yet — reads as the whole-space flow, which
  // is both the column's default and the shape every pre-Phase-9 listing already has.
  const openMode = values.occupancyMode === "open_capacity";

  /**
   * The steps this host actually WALKS, which is not always `STEPS`.
   *
   * OC-10: drop-in passes are instant only — approval on a shared daily counter would need a
   * held-seat-pending-approval lifecycle for no real use case — so the booking-mode step is removed from
   * the flow rather than shown and ignored. It is removed from the LIST, not merely skipped, so the
   * "Step X of Y" line and the progress bar stay truthful (8 steps, not 9 with one missing). A control
   * cannot simply vanish, though: the review step below carries the one line that explains it.
   */
  const steps = openMode ? STEPS.filter((s) => s.key !== "booking") : STEPS;

  /**
   * The index of a step, BY KEY, against the WALKED list.
   *
   * WHY (09-UI-SPEC § 1a migration note): each checklist row used to carry a bare NUMERIC LITERAL as its
   * link target. A literal is correct only for one exact ordering, so inserting `occupancy` before pricing
   * silently repoints every row after it — the host clicks "Hourly rate" and lands on photos. And the
   * walked list is now MODE-DEPENDENT, so even a constant derived from `STEPS` would be wrong in drop-in
   * mode (cancellation sits one place earlier there). Never reintroduce a numeric literal as a link target.
   * (Deliberately NOT quoting the old shape, so the grep asserting no literal remains cannot be tripped by
   * the very comment forbidding it.)
   */
  const stepIndex = (key: StepKey) => steps.findIndex((s) => s.key === key);

  /** Index of the D-77 tier step, so the publish-checklist row links back to it without a magic number. */
  const CANCELLATION_STEP = stepIndex("cancellation");

  /**
   * Move to a position in the WALKED list and record the arrival by KEY (D-148).
   *
   * The index is clamped here rather than trusted, for the same reason the render clamp below exists:
   * the walked list can shrink, and a position past its end must resolve to a real step instead of
   * reading `undefined.key`. The key is read from the walked list AFTER clamping, so what gets marked
   * visited is always the step the host actually lands on.
   */
  function goToStep(next: number) {
    const i = Math.min(Math.max(next, 0), steps.length - 1);
    const key = steps[i].key;
    setVisitedKeys((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
    setStep(i);
  }

  /**
   * Autosave the current form state and RETURN WHAT THE SERVER SAID (D-150).
   *
   * ⚠ THE RETURN TYPE IS THE POINT OF THIS FUNCTION'S EXISTING SHAPE HAVING CHANGED. It used to answer
   * `boolean` and fire the refusal toast itself, which meant `res.error` — the only sentence that can
   * tell a host WHY their draft did not save — was consumed and dropped one frame before any caller
   * could see it. Every caller was then forced to render a generic "couldn't save", or nothing.
   *
   * It now reports and decides nothing. The three callers below own both, because they do not want the
   * same thing: two of them end in a navigation and one does not, and that difference is exactly what
   * decides whether a toast is the right surface (see `saveAsDraft`).
   *
   * This adds NO second write path. `saveListingStep` is still the one autosave authority and still
   * re-validates the payload server-side with the same shared schema; nothing about what it accepts,
   * writes or refuses moved in this plan.
   */
  async function persist(): Promise<ListingResult> {
    return saveListingStep(listing.id, toPayload(form.getValues()));
  }

  async function saveAndContinue() {
    setSaving(true);
    setSaveState(SAVE_STATE_SAVING);
    const res = await persist();
    setSaving(false);
    // THE ONLY TRANSITION, and it reads the result. No success toast here any more: this path does not
    // navigate, so the region is on screen to carry the outcome — and a toast beside it would be two
    // announcements for one save, which is the defect a status region is usually added to fix.
    setSaveState(saveStateFor(res));
    if (res.ok && step < steps.length - 1) goToStep(step + 1);
  }

  async function saveAsDraft() {
    setSaving(true);
    setSaveState(SAVE_STATE_SAVING);
    const res = await persist();
    setSaving(false);
    setSaveState(saveStateFor(res));
    if (res.ok) {
      // THIS TOAST SURVIVES, and the reason is the `router.push` on the next line: the surface holding
      // the region is about to be replaced, so a toast is the only report that can outlive the report.
      // The FAILURE arm has no toast, because a failure does not navigate — the region keeps it.
      toast.success("Draft saved");
      router.push("/host/listings");
    }
  }

  async function handlePublish() {
    setSaving(true);
    setSaveState(SAVE_STATE_SAVING);
    const saved = await persist();
    setSaveState(saveStateFor(saved));
    if (!saved.ok) {
      setSaving(false);
      return;
    }
    const res = await publishListing(listing.id);
    setSaving(false);
    if (!res.ok) {
      // THE PUBLISH GATE'S REFUSAL, WHICH IS NOT A SAVE REFUSAL AND DELIBERATELY DOES NOT GO TO THE
      // REGION. The draft above this line SAVED — the region says so, truthfully — and what failed is
      // the separate D-02 gate. Routing this sentence into a region named for the save state would
      // make it report an outcome it is not about, and would overwrite a true "Saved" with a
      // "couldn't save" that never happened. D-150 removes the two AUTOSAVE toasts; this is a third
      // outcome with its own action behind it, and it keeps the one announcement it has always had.
      toast.error(res.error);
      return;
    }
    // SURVIVES for the same reason `Draft saved` does — the next line replaces this whole surface.
    toast.success("Your listing is live!");
    router.push("/host/listings");
  }

  async function resendVerification() {
    try {
      await authClient.sendVerificationEmail({
        email: hostEmail,
        callbackURL: "/host/listings",
      });
      toast.success(`Verification email sent to ${hostEmail}.`);
    } catch {
      toast.error("Couldn't send the email. Try again in a moment.");
    }
  }

  function applyResolvedAddress(addr: ResolvedAddress) {
    form.setValue("addressLine1", addr.addressLine1, { shouldDirty: true });
    form.setValue("city", addr.city, { shouldDirty: true });
    form.setValue("region", addr.region, { shouldDirty: true });
    form.setValue("postalCode", addr.postalCode, { shouldDirty: true });
    form.setValue("country", addr.country, { shouldDirty: true });
    form.setValue("neighborhood", addr.neighborhood, { shouldDirty: true });
    form.setValue("lat", addr.lat, { shouldDirty: true });
    form.setValue("lng", addr.lng, { shouldDirty: true });
  }

  const selectedTags = (values.activityTags ?? []) as ActivityTagValue[];
  function toggleTag(tag: ActivityTagValue) {
    const cur = (form.getValues("activityTags") ?? []) as ActivityTagValue[];
    const next = cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag];
    form.setValue("activityTags", next, { shouldDirty: true });
  }

  const selectedAmenities = (values.amenities ?? []) as AmenityValue[];
  function toggleAmenity(value: AmenityValue, checked: boolean) {
    const cur = (form.getValues("amenities") ?? []) as AmenityValue[];
    const next = checked ? [...cur, value] : cur.filter((a) => a !== value);
    form.setValue("amenities", next, { shouldDirty: true });
  }

  // The live D-02 publish checklist (drives the review step). Each row links back to its step.
  const hasCoords = typeof values.lat === "number" && typeof values.lng === "number";
  // The row SHAPE is the shared component's exported type rather than an inline one, so a row that
  // gains a field here cannot quietly stop being renderable there. The array itself, its mode fork
  // and every `stepIndex` call below stay in this file: they read form state, and this is where the
  // form is.
  const checklist: PublishChecklistRow[] = [
    { label: "Title", done: Boolean(values.title), step: stepIndex("details") },
    { label: "Description", done: Boolean(values.description), step: stepIndex("details") },
    { label: "Space type", done: Boolean(values.primarySpaceType), step: stepIndex("type") },
    { label: "Address", done: Boolean(values.addressLine1 && values.city && values.region && values.country) && hasCoords, step: stepIndex("location") },
    // ── The mode-forked rows (09-UI-SPEC § 1e). ────────────────────────────────────────────────────────
    // THIS LIST AND `publishSchema`'S MODE FORK ARE TWO HALVES OF ONE RULE (07-15: a new publish
    // requirement must land in TWO places — the gate that enforces it and the checklist that names it).
    // They must change together: a row here that the gate does not require sends the host chasing a field
    // that was never blocking, and a gate requirement with no row leaves them staring at a dead Publish
    // button with nothing marked unmet. The gate is `src/lib/validation/listing.ts`; this is only the
    // telling. Whole space needs both rates; drop-in needs a price per person and a daily cap instead —
    // and the cap is named for the job it does in this mode, not for the column it lives in.
    ...(openMode
      ? [
          {
            label: "Drop-in cap",
            done: Boolean(values.maxOccupancy && values.maxOccupancy > 0),
            step: stepIndex("pricing"),
          },
          {
            label: "Price per person",
            done: Boolean(values.perHeadPriceCents && values.perHeadPriceCents > 0),
            step: stepIndex("pricing"),
          },
        ]
      : [
          {
            label: "Capacity",
            done: Boolean(values.maxOccupancy && values.maxOccupancy > 0),
            step: stepIndex("details"),
          },
          {
            label: "Hourly rate",
            done: Boolean(values.hourlyRateCents && values.hourlyRateCents > 0),
            step: stepIndex("pricing"),
          },
          {
            label: "Day rate",
            done: Boolean(values.dayRateCents && values.dayRateCents > 0),
            step: stepIndex("pricing"),
          },
        ]),
    { label: "3+ photos", done: photoCount >= 3, step: stepIndex("photos") },
    // D-77 joins the EXISTING checklist rather than inventing a new blocked affordance — the shipped
    // "Almost there — finish these to publish:" panel already renders unmet rows with a Fix link, and
    // `publishEligible = checklist.every(c => c.done)` picks this up with no other change. The real gate
    // is publishListing's server-side publishSchema; this row only tells the host what's missing.
    {
      label: "Choose a cancellation policy",
      done: Boolean(values.cancellationPolicy),
      step: CANCELLATION_STEP,
    },
    {
      label: "Verified email",
      done: emailVerified,
      step: null,
      action: emailVerified ? undefined : resendVerification,
    },
  ];
  const publishEligible = checklist.every((c) => c.done);

  /**
   * The drop-in listing, in one line, on the review step (09-UI-SPEC § 1d) —
   * `Drop-in passes · ₱350.00 per person · up to 30 people a day · Instant book`.
   *
   * Built by joining the parts that exist rather than interpolated into JSX text: a half-filled draft still
   * gets a truthful line instead of "₱undefined", and one expression container cannot be bitten by SWC's
   * JSX whitespace transform (the "₱300.00in cancellation fees" defect — see cancellation-fee-notice.tsx).
   */
  const openSummaryLine = [
    "Drop-in passes",
    values.perHeadPriceCents && values.perHeadPriceCents > 0
      ? `${formatMoney(values.perHeadPriceCents, listing.currency)} per person`
      : null,
    values.maxOccupancy && values.maxOccupancy > 0
      ? `up to ${values.maxOccupancy} people a day`
      : null,
    "Instant book",
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

  /**
   * The step being rendered, BY KEY — every render guard below tests this rather than a numeric index.
   *
   * Same rot as the checklist's old literals, but worse: inserting `occupancy` shifts pricing, booking mode,
   * cancellation and review each up by one, so an index-keyed guard would render the WRONG SCREEN with a
   * green typecheck. Keys are also what makes the drop-in flow possible at all — there the walked list has
   * no `booking` entry, so the same index means different things in the two modes.
   */
  // Clamp defensively. Today the mode can only be changed ON the occupancy step, whose index is identical
  // in both walked lists, so the list can never shrink out from under a later step — but a white screen is
  // an expensive way to discover that a future edit broke that property.
  const stepInList = Math.min(step, steps.length - 1);
  const currentKey = steps[stepInList].key;

  const progress = ((stepInList + 1) / steps.length) * 100;
  const advanceLabel = step === 0 ? "Get started" : "Save and continue";

  /**
   * Which of the two PERSISTENT checklist placements this viewport gets (D-149).
   *
   * Read UNCONDITIONALLY, above the review-step guard, because it is a hook: calling it inside the
   * branch that renders the checklist would change the hook order the first time a host reached the
   * review step. The value is simply unused there.
   */
  const checklistPlacement = usePublishChecklistPlacement();

  return (
    /*
      THREE GRID ITEMS, NOT ONE CONTAINER (D-149). The grid itself is the ROUTE's — `page.tsx` owns the
      shell and the declared track — so this component returns siblings rather than a wrapper: a wrapper
      would make the whole wizard ONE grid item and there would be no second column for the checklist to
      sit in.

      THE ORDER IS THE POINT, AND IT DIFFERS BY BREAKPOINT WITHOUT MOVING A NODE. Below the large
      breakpoint the grid is one column and the three items stack in source order — rail and question,
      then the collapsed checklist, then the form, which is 14-UI-SPEC's "above the form, under the
      <h1>". At the large breakpoint the first item spans both columns and the checklist takes the
      second column of the row beneath it, because it is ordered last there and grid placement follows
      the order property. One node, two layouts; see `publish-checklist.tsx` for why one node rather
      than a variant pair is not a stylistic preference here.
    */
    <>
      <div className="space-y-8 lg:col-span-2">
        <Toaster />

      {/* --- Stepper + progress --------------------------------------------------------------- */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          Step {stepInList + 1} of {steps.length}
        </p>
        <Progress value={progress} />
        {/*
          THE RAIL (D-148). Three states, and EXACTLY ONE of them is a control.

          ⚠ NAMING DISCIPLINE, INHERITED AND RE-EARNED. Nothing in this comment quotes a class name or a
          prop VALUE that a committed gate counts. `brand-recipe.test.ts` counts occurrences of the
          accent background utility and of the accent variant spelling in this file's SOURCE, and a
          comment is textually indistinguishable from a call site to a text scan — this repo has burned
          plans on exactly that. So the accent utility is named descriptively everywhere below, and so is
          the variant prop. Keep it that way when you edit this.

          1. VISITED (below the current step, and its KEY is in the arrival set) — a real <button>.
             It carries the check glyph, hidden from assistive technology because the button's own
             accessible name already says which step it returns to, and that name is composed FROM THE
             STEP LIST rather than retyped, so a title edit cannot leave the marker announcing the old
             question. The secondary surface pairing, not the accent: a rail whose "where you are" and
             "where you can go back to" were the same solid fill would have spent its strongest signal
             on nothing.

          2. CURRENT — the shipped non-control element, and it STAYS a non-control deliberately.
             Navigating to where you already are is not an action, and making it one would put a second
             reachable accent fill in the viewport. It is the ONLY state that paints the accent now
             (accent-inventory entry 7, narrowed in this same commit from current-or-done to
             current-only). The narrowing happens ON THE EXISTING CONDITION, on one line: converting
             this marker to a variant-driven control takes the pinned per-file count to zero, and
             splitting the fill across two branches takes it to two. Both are red for reasons that have
             nothing to do with the design contract.

          3. FUTURE — the shipped non-control element with the muted pairing. Inert, and therefore out
             of the tab order by construction: a <span> with no tabindex is not focusable, so there is
             nothing to remove.

          THE ALPHA BAN STILL BINDS, and the reason survives the narrowing: a tint of the accent over a
          light surface LIGHTENS, dragging the fill toward its own ink, and the accent's own foreground
          token measured 4.04:1 in court and 3.87:1 in grove against a 4.5 bar that way. That is a
          property of the alpha, not of which element carries it (T-10-25). The solid token is also
          required rather than the darkening mix the button variant uses, because the per-file inventory
          counts this exact utility.

          GEOMETRY IS READ, NOT TYPED. All three states share the declared marker box, which is the WCAG
          2.5.8 AA target-size bar now that one of them is a control — see its docblock in
          `measurements.ts` for the arithmetic, including why the rail's shipped gap means the spacing
          exception is not needed and why nine markers do not wrap at the 320px floor.
        */}
        <ol
          className="flex flex-wrap gap-2"
          aria-label="Listing steps"
          data-testid="wizard-step-rail"
        >
          {steps.map((s, i) => {
            const state = i < stepInList ? "done" : i === stepInList ? "current" : "future";
            // Visited-ness is asked BY KEY and position is asked separately. Forward markers stay
            // inert even once visited (D-148's literal reading): the path to a later step is the
            // advance control, which is the path that re-validates and autosaves.
            const canReturn = state === "done" && visitedKeys.has(s.key);
            return (
              <li key={s.key} aria-current={state === "current" ? "step" : undefined}>
                {canReturn ? (
                  <button
                    type="button"
                    onClick={() => goToStep(i)}
                    aria-label={`Go back to step ${i + 1}: ${s.title}`}
                    className={cn(
                      STEP_MARKER_BOX,
                      // The canonical DS-05 focus recipe, in ONE class string because it describes ONE
                      // element. The offset COLOUR is load-bearing and not decoration: the framework's
                      // default offset is a literal white, which is visibly wrong on a tinted ground.
                      "flex items-center justify-center rounded-full text-xs font-medium outline-none",
                      "bg-secondary text-secondary-foreground",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    )}
                  >
                    <CheckIcon className="size-3.5" aria-hidden="true" />
                  </button>
                ) : (
                  <span
                    className={cn(
                      STEP_MARKER_BOX,
                      "flex items-center justify-center rounded-full text-xs font-medium",
                      state === "current" && "bg-brand text-brand-foreground",
                      state !== "current" && "bg-muted text-muted-foreground",
                    )}
                  >
                    {i + 1}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/*
        THE STEP QUESTION IS THE PAGE TITLE (14-UI-SPEC § Typography rule 1). It used to render one
        ladder step larger than every other host page's title — two <h1> scales in one product is drift,
        and this was the outlier. `PageHeader` supplies the single level-one heading at the shared size,
        and rule 4 wants exactly one per document: the listing's name is deliberately NOT added here,
        because the question IS the title.
      */}
        <PageHeader title={steps[stepInList].title} />
      </div>

      {/*
        THE PERSISTENT PLACEMENT (D-149) — the checklist stops being an end-of-flow surprise and is
        readable from the FIRST step.

        SUPPRESSED ON THE REVIEW STEP, and that suppression is the whole one-instance rule. The review
        step renders its own inline placement below; rendering this one as well would put two answers
        to "am I ready to publish" on one document, which is the defect
        `tests/listing/publish-checklist.test.tsx` exists to reject.

        THE ROWS ARE THE SAME ARRAY THE REVIEW STEP IS HANDED, so the two label sets cannot differ —
        not "are kept in sync", cannot differ, because there is one array.

        `lg:order-last` is what puts this in the SECOND column at the large breakpoint while leaving it
        above the form below it. The width comes from the declared constant, which is derived from the
        grid track `page.tsx` renders; neither number is typed here.
      */}
      {currentKey !== "review" && (
        <aside className={cn(WIZARD_CHECKLIST_COL, "lg:order-last")}>
          <PublishChecklist
            placement={checklistPlacement}
            rows={checklist}
            onFix={goToStep}
          />
        </aside>
      )}

      {/*
        THE FORM COLUMN, and the <form> element IS the grid item — `Form` is RHF's provider and renders
        no DOM, so wrapping the two in a <div> would add a node for nothing.

        `min-w-0` so a long field cannot push the column past its own track. The track is already a
        zero-minimum one; the half that overflows is the ITEM's automatic minimum, and both have to say
        so. On the review step there is no aside beside it, so it takes the whole width rather than
        leaving a 288px gutter with nothing in it and the content sitting off centre.
      */}
      <Form {...form}>
        {/* We intentionally do NOT use handleSubmit here — advancing autosaves via saveListingStep. */}
        <form
          onSubmit={(e) => e.preventDefault()}
          className={cn("min-w-0 space-y-8", currentKey === "review" && "lg:col-span-2")}
        >
          {/* --- Step "type": Type + activity tags -------------------------------------------- */}
          {currentKey === "type" && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="primarySpaceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary space type</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose the best match" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SPACE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      One canonical category — it powers search and sorting.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Activity tags (optional)</FormLabel>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTags.length === 0 && (
                    <span className="text-sm text-muted-foreground">None yet.</span>
                  )}
                  {selectedTags.map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1">
                      {ACTIVITY_TAG_LABELS[t]}
                      <button
                        type="button"
                        aria-label={`Remove ${ACTIVITY_TAG_LABELS[t]}`}
                        onClick={() => toggleTag(t)}
                      >
                        <MinusIcon className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Popover open={tagPickerOpen} onOpenChange={setTagPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      Add activity tags
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-64 p-0">
                    <Command>
                      <CommandInput placeholder="Search activities…" />
                      <CommandList>
                        <CommandGroup>
                          {ACTIVITY_TAGS.map((t) => {
                            const active = selectedTags.includes(t.value);
                            return (
                              <CommandItem
                                key={t.value}
                                value={t.label}
                                onSelect={() => toggleTag(t.value)}
                              >
                                <span
                                  className={cn(
                                    "flex size-4 items-center justify-center rounded-[4px] border",
                                    active
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-input",
                                  )}
                                >
                                  {active && <CheckIcon className="size-3" />}
                                </span>
                                {t.label}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Covers multi-use venues (e.g. a gym that also has a court).
                </FormDescription>
              </div>
            </div>
          )}

          {/* --- Step "details": Details + amenities ------------------------------------------ */}
          {currentKey === "details" && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Sunny downtown pickleball court"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={5}
                        placeholder="What makes your space great? Flooring, lighting, equipment…"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxOccupancy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max occupancy</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        inputMode="numeric"
                        placeholder="e.g. 8"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          field.onChange(Number.isNaN(n) ? undefined : n);
                        }}
                      />
                    </FormControl>
                    {/* Mode-aware (09-UI-SPEC § 1c): the SAME number does a different job in each mode,
                        and the host meets it here first. The drop-in wording is repeated on the pricing
                        step under the label "People per day" — same field, two views, one value. */}
                    <FormDescription>
                      {openMode
                        ? "The most people you'll let in on one day — your drop-in cap."
                        : "Most people allowed at once — the cap for group bookings later."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <FormLabel>Amenities</FormLabel>
                <div className="grid gap-2 sm:grid-cols-2">
                  {AMENITIES.map((a) => {
                    const checked = selectedAmenities.includes(a.value);
                    return (
                      <label
                        key={a.value}
                        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => toggleAmenity(a.value, v === true)}
                          aria-label={a.label}
                        />
                        <span className="text-sm">{a.label}</span>
                      </label>
                    );
                  })}
                </div>
                <FormDescription>Pick everything guests can use.</FormDescription>
              </div>
            </div>
          )}

          {/* --- Step "location": Location ---------------------------------------------------- */}
          {currentKey === "location" && (
            <div className="space-y-6">
              <FormItem>
                <FormLabel>Address</FormLabel>
                <AddressAutocomplete
                  initialLabel={
                    [listing.addressLine1, listing.city, listing.region]
                      .filter(Boolean)
                      .join(", ") || undefined
                  }
                  hasCoordinates={hasCoords}
                  onResolved={applyResolvedAddress}
                />
              </FormItem>

              <FormField
                control={form.control}
                name="addressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit / suite (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="e.g. Suite 200" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="showExactAddress"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5 pr-4">
                      <FormLabel>Show exact address</FormLabel>
                      <FormDescription>
                        Off by default — guests see an approximate area until they book.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                        aria-label="Show exact address"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* --- Step "photos" (Plan-04 — signed direct-to-Cloudinary uploader + dnd reorder) -- */}
          {currentKey === "photos" && (
            <PhotoUploader
              listingId={listing.id}
              initialPhotos={listing.photos}
              onCountChange={setPhotoCount}
            />
          )}

          {/* --- Step "occupancy": how the space is sold (OPEN-01 / OC-08 / OC-17) ------------- */}
          {/*
            NO CARD IS PRE-SELECTED ON A NEW LISTING, DELIBERATELY — the same D-77 reasoning the
            cancellation step below records, and for a bigger number: this choice decides whether one
            booking takes the whole space or thirty people buy a pass for the same day. It must be made by
            a human who read the screen, never inherited from a column default (see `hasChosenMode`).

            Both cards render at EQUAL WEIGHT and the selection marker is neutral `border-primary`, NEVER
            coral. Coral is reserved for booker CTAs (09-UI-SPEC § Color); using it here would advertise a
            recommendation the product deliberately does not make — 09-CONTEXT records that the same space
            type goes both ways, so neither mode can ever be a preset.

            THE LOCK BELOW IS A COURTESY, NOT THE GATE. `saveListingStep` re-reads the PERSISTED mode and
            re-runs `getModeLockState` before accepting any change (09-06, threat T-09-19), because a stale
            tab or a crafted client never sees this disabled card at all. Both halves are load-bearing:
            do not delete either one as "redundant".
          */}
          {currentKey === "occupancy" && (
            <FormField
              control={form.control}
              name="occupancyMode"
              render={({ field }) => (
                <FormItem>
                  {/* Read FIRST — the reason a control is locked has to arrive before the control. */}
                  {modeLock.locked && (
                    <ModeLockNotice
                      lockedByCount={modeLock.lockedByCount}
                      unlocksAtLabel={modeLock.unlocksAtLabel}
                    />
                  )}
                  <FormControl>
                    <RadioGroup
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      className="gap-3"
                      // O7: the reason must be ANNOUNCED to anyone reaching the radios, not merely
                      // visible above them.
                      aria-describedby={modeLock.locked ? MODE_LOCK_NOTICE_ID : undefined}
                    >
                      {OCCUPANCY_MODE_VALUES.map((value) => {
                        const opt = OCCUPANCY_MODE_CARDS[value];
                        const selected = field.value === value;
                        // Only the card the listing is NOT currently sold under locks; the stored mode
                        // stays selected and legible.
                        const cardLocked = modeLock.locked && !selected;
                        return (
                          <label
                            key={value}
                            aria-disabled={cardLocked ? "true" : undefined}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-lg border p-4",
                              selected && "border-primary",
                              cardLocked && "pointer-events-none opacity-60",
                            )}
                          >
                            <RadioGroupItem
                              value={value}
                              className="mt-1"
                              disabled={cardLocked}
                            />
                            <span className="space-y-0.5">
                              <span className="flex items-center gap-2 text-sm font-medium">
                                <opt.Icon className="size-4 text-muted-foreground" />
                                {opt.title}
                                {/* Never opacity-only: a glyph AND the word, so the state survives
                                    low contrast, greyscale and a screen reader alike. */}
                                {cardLocked && (
                                  <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                                    <LockIcon className="size-3" />
                                    Locked
                                  </span>
                                )}
                              </span>
                              <span className="block text-sm text-muted-foreground">{opt.body}</span>
                              <span className="block text-sm text-muted-foreground">
                                {opt.example}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    {"This changes how you're paid and how people book. You can change it later, as long as you have no bookings still to come."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* --- Step "pricing" — MODE-FORKED (OC-08 / 09-UI-SPEC § 1c) ------------------------ */}
          {/*
            Whole space is priced by TIME (an hourly rate, a day rate, and optionally more when the group
            is bigger). Drop-in passes are priced by PERSON — one flat price per head, however long they
            stay — so the two field sets have nothing in common and rendering both would ask the host to
            answer a question their mode does not pose. D-110 also forbids the pair outright: a per-extra-
            guest surcharge alongside a per-person price is two different answers to "what does one more
            person cost". The whole group-pricing block is therefore absent in drop-in mode, not disabled.
          */}
          {currentKey === "pricing" && openMode && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="perHeadPriceCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per person</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                          {symbol}
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          className="pl-8"
                          placeholder="0.00"
                          value={field.value != null ? (field.value / 100).toString() : ""}
                          onChange={(e) => {
                            const major = parseFloat(e.target.value);
                            field.onChange(
                              Number.isNaN(major) ? undefined : Math.round(major * 100),
                            );
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      What one person pays for a day pass. The same price applies whether they stay one
                      hour or all day.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/*
                THE SAME FIELD THE DETAILS STEP ALREADY SHOWED, ON PURPOSE (09-UI-SPEC § 1c).

                D-124 puts the drop-in cap on `maxOccupancy`, which the host met in step 1 as "most people
                allowed at once". In drop-in mode that number quietly stops meaning "how many fit" and
                starts meaning "how many passes I sell for a day" — a materially different promise, and one
                the host is about to attach a price to. So it is rendered a second time, here, under the
                label it actually performs. Same RHF `name` ⇒ ONE value ⇒ the two views can never drift;
                this is deliberately not a second piece of state.
              */}
              <FormField
                control={form.control}
                name="maxOccupancy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>People per day</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        inputMode="numeric"
                        placeholder="e.g. 30"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          field.onChange(Number.isNaN(n) ? undefined : n);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      The most people you&apos;ll let in on one day. This is your drop-in cap.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {currentKey === "pricing" && !openMode && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="hourlyRateCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hourly rate</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                          {symbol}
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          className="pl-8"
                          placeholder="0.00"
                          value={field.value != null ? (field.value / 100).toString() : ""}
                          onChange={(e) => {
                            const major = parseFloat(e.target.value);
                            field.onChange(
                              Number.isNaN(major) ? undefined : Math.round(major * 100),
                            );
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>Charged per hour. Required to publish.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dayRateCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day rate</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                          {symbol}
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          className="pl-8"
                          placeholder="0.00"
                          value={field.value != null ? (field.value / 100).toString() : ""}
                          onChange={(e) => {
                            const major = parseFloat(e.target.value);
                            field.onChange(
                              Number.isNaN(major) ? undefined : Math.round(major * 100),
                            );
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>Charged for a full day. Required to publish.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* --- Group pricing (D-108, 08-UI-SPEC § 6) — OPTIONAL, NOT a publish requirement ------
                  Deliberately NOT in the publish checklist and deliberately optional in publishSchema:
                  both fields are backward-compatible with defaults (₱0 fee = flat pricing, 1 included
                  head), so a host who never opens this block publishes exactly as before.

                  There is NO occupancy-mode control here and there must not be one (D-109 / Open Q8):
                  the column exists with a single v1 value and a picker with one choice is noise. The
                  real second mode (open capacity) arrives with Phase 9. */}
              <div className="space-y-6 rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Group pricing (optional)</p>
                  <p className="text-sm text-muted-foreground">
                    Most spaces skip this — leave the fee at {symbol}0 and your rate stays flat however
                    many people come.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="extraHeadFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extra guest fee</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                            {symbol}
                          </span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            className="pl-8"
                            placeholder="0.00"
                            value={field.value != null ? (field.value / 100).toString() : ""}
                            onChange={(e) => {
                              const major = parseFloat(e.target.value);
                              field.onChange(
                                Number.isNaN(major) ? undefined : Math.round(major * 100),
                              );
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Charge more when a group is larger than your base capacity. Leave at {symbol}0 for
                        flat pricing — most spaces do.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Shown ONLY once a fee is actually set — `included` is meaningless without one. */}
                {(values.extraHeadFee ?? 0) > 0 && (
                  <FormField
                    control={form.control}
                    name="included"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base price covers</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            inputMode="numeric"
                            placeholder="1"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const n = parseInt(e.target.value, 10);
                              field.onChange(Number.isNaN(n) ? undefined : n);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          How many people your rate includes before the extra guest fee applies. Keep
                          this below your maximum capacity
                          {values.maxOccupancy ? ` (${values.maxOccupancy})` : ""} — if it equals or
                          exceeds capacity, the extra guest fee can never apply.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>
          )}

          {/* --- Step "booking": Booking mode -------------------------------------------------- */}
          {currentKey === "booking" && (
            <FormField
              control={form.control}
              name="bookingMode"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="gap-3"
                    >
                      {[
                        {
                          value: "instant" as const,
                          title: "Instant book",
                          body: "Guests book available times immediately — no approval needed.",
                        },
                        {
                          value: "request" as const,
                          title: "Request to book",
                          body: "You review and approve each request before it's confirmed.",
                        },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border p-4",
                            field.value === opt.value && "border-primary",
                          )}
                        >
                          <RadioGroupItem value={opt.value} className="mt-1" />
                          <span className="space-y-0.5">
                            <span className="block text-sm font-medium">{opt.title}</span>
                            <span className="block text-sm text-muted-foreground">{opt.body}</span>
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    You can change this anytime. It applies to new bookings — any requests already in
                    progress keep the mode they started under.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* --- Step "cancellation": Cancellation policy (D-77) ------------------------------- */}
          {/*
            NO CARD IS PRE-SELECTED, DELIBERATELY. This breaks the D-62 precedent of defaulting to the
            most booker-friendly option, because the cancellation tier is not a setting that should be
            set by accident — it governs real money. The tier a host picks here is snapshotted onto every
            booking at creation and is exactly what the refund ladder later applies, so an unchosen tier
            must stay unchosen until a human chooses it.

            All three cards render at equal weight; the selection marker is neutral `border-primary` and
            NEVER coral. Coral is reserved for booker CTAs (07-UI-SPEC § Color) and using it here would
            advertise a recommendation the product deliberately doesn't make.
          */}
          {currentKey === "cancellation" && (
            <FormField
              control={form.control}
              name="cancellationPolicy"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      className="gap-3"
                    >
                      {CANCELLATION_TIERS.map((opt) => (
                        <label
                          key={opt.value}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border p-4",
                            field.value === opt.value && "border-primary",
                          )}
                        >
                          <RadioGroupItem value={opt.value} className="mt-1" />
                          <span className="space-y-0.5">
                            <span className="block text-sm font-medium">{opt.title}</span>
                            <span className="block text-sm text-muted-foreground">{opt.body}</span>
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    Pick the policy that fits your space. You can change it later — it applies to new
                    bookings only; bookings already made keep the policy they were booked under.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* --- Step "review" ----------------------------------------------------------------- */}
          {currentKey === "review" && (
            <div className="space-y-6">
              {/*
                OC-10 / 09-UI-SPEC § 1d — THE ONLY PLACE THE REMOVED BOOKING-MODE STEP IS EXPLAINED, and
                therefore mandatory. A control that simply vanishes leaves the host wondering whether they
                skipped something or whether approval quietly got switched on; saying it plainly, once, on
                the screen where they review the whole listing, is the whole obligation.

                The sentence is the SHARED constant, not a retyped copy: `publishSchema` rejects a drop-in
                listing that somehow carries `request` with exactly these words (09-06), and the explanation
                a host reads here and the refusal they'd hit there must be one sentence, not two that drift.
                Renders in both branches below — a listing that is ready to publish needs the explanation
                just as much as one that is not.
              */}
              {openMode && (
                <div className="space-y-1 rounded-lg border bg-muted/40 p-4">
                  <p className="text-sm font-medium">{openSummaryLine}</p>
                  <p className="text-sm text-muted-foreground">{DROP_IN_INSTANT_ONLY_MESSAGE}</p>
                </div>
              )}
              {/*
                THE REVIEW STEP'S INLINE PLACEMENT (D-149). The markup that used to stand here now
                lives in `components/host/publish-checklist.tsx`, and the move was not a tidy-up: the
                done marker inside it is the one filled success surface DS-10 left standing, and four
                committed inventories addressed it by THIS FILE'S PATH. All four moved with it, in the
                same commit, each with its reason — see that component's header.

                The row array, its occupancy fork and the key-to-index resolution all stayed HERE,
                because this is where the form state is. The component derives nothing; it is handed
                the same array the persistent placement above is handed, which is what makes the two
                incapable of naming different things.

                `goToStep`, not `setStep`: a fix link is now reachable from the FIRST step (14-10),
                so it can jump FORWARD — and a forward jump that does not record its arrival leaves
                the rail marker for the step the host is standing on permanently inert. 14-09 left
                these links on the bare setter and named this plan as the one that would fold them in.
              */}
              <PublishChecklist
                placement="review"
                rows={checklist}
                onFix={goToStep}
                eligible={publishEligible}
                emailVerified={emailVerified}
                hostEmail={hostEmail}
              />
            </div>
          )}

          {/* --- Nav ------------------------------------------------------------------------- */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => goToStep(step - 1)}
              disabled={step === 0 || saving}
            >
              <ChevronLeftIcon className="size-4" /> Back
            </Button>

            {/* THE SAVE STATE AND THE CONTROL THAT CAUSES IT, GROUPED (D-150).

                Grouped rather than dropped in as a third `justify-between` child, because that would
                float the region into the middle of the row — equidistant from the control it is
                reporting on and the one it is not. It belongs IMMEDIATELY LEFT OF THE ADVANCE
                CONTROL, which is where the press happens: this is the bottom of a nine-step form and
                an indicator at the top of the page is off-screen at the exact moment it changes.

                `flex-1` + `justify-end` keeps the group hard right at every width; `min-w-0` lets a
                long refusal sentence WRAP inside the row rather than pushing the button off a 320px
                screen, and the row's own `flex-wrap` is the second half of that. */}
            <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
              {/* ONE ELEMENT, ALWAYS MOUNTED, TEXT EMPTY AT IDLE. It does not mount and unmount: a
                  region that comes and goes is a different region to assistive technology each time,
                  and a test cannot hold on to it between presses.

                  INK: secondary on failure's sibling states and the declared destructive pairing on
                  failure. No filled surface in any state — `Saved` is a sentence, and a fill would be
                  decoration on top of it (the same argument profile-form.tsx:252-258 makes in prose).
                  The check glyph is hidden from the accessible tree for the same reason: it repeats a
                  word that is already there. */}
              <p
                role="status"
                aria-label={SAVE_STATE_REGION_NAME}
                className={cn(
                  "inline-flex min-w-0 items-center gap-1 text-label",
                  saveState.kind === "failed"
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {saveState.kind === "saved" ? (
                  <CheckIcon aria-hidden className="size-3.5 shrink-0" />
                ) : null}
                {saveStateText(saveState)}
              </p>

              {stepInList < steps.length - 1 ? (
                <Button type="button" onClick={saveAndContinue} disabled={saving}>
                  {saving ? "Saving…" : advanceLabel}
                </Button>
              ) : publishEligible ? (
                <Button
                  type="button"
                  variant="brand"
                  onClick={handlePublish}
                  disabled={saving}
                >
                  {saving ? "Publishing…" : "Publish listing"}
                </Button>
              ) : (
                <Button type="button" variant="secondary" onClick={saveAsDraft} disabled={saving}>
                  {saving ? "Saving…" : "Save as draft"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}
