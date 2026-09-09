import { deriveBookable } from "@/lib/bookability";
import type {
  HostVerificationStatus,
  ListingReviewState,
} from "@/lib/db/schema";
import type { HostVerificationState } from "@/lib/host/verification-status";
import {
  composeRetryAfterSentence,
  composeVerificationRejectionReason,
  retryAllowedAt,
  VERIFICATION_SIGNAL,
} from "@/lib/host/verification-signal";
import {
  COOLDOWN_HOURS,
  DIDIT_RECONCILE_GRACE_MINUTES,
} from "@/lib/host/verification-cooldown";
import { composeSuspendedSentence } from "@/lib/listing/review-signal";
import type { PayoutStatus } from "@/components/host/payout-status";

export type RoadmapStepState =
  | "Done"
  | "Current"
  | "Waiting"
  | "Not passed"
  | "Paused"
  | "Next";

export type RoadmapAction =
  | {
      readonly kind: "link";
      readonly label: string;
      readonly href: string;
      readonly variant: "brand" | "default" | "outline";
    }
  | {
      readonly kind: "payout";
      readonly label: string;
    };

export type VerificationRoadmapStep = {
  readonly number: 1 | 2 | 3 | 4;
  readonly title: string;
  readonly state: RoadmapStepState;
  readonly body: string;
  readonly action?: RoadmapAction;
  readonly verificationStatus?: HostVerificationStatus;
};

export type VerificationRoadmapInput = {
  readonly now: Date;
  readonly verification: HostVerificationState | null;
  readonly payoutStatus: PayoutStatus;
  readonly listings: readonly {
    readonly id: string;
    readonly status: "draft" | "published" | "unlisted";
    readonly reviewState: ListingReviewState;
    readonly hasOperatingHours: boolean;
  }[];
  readonly host: {
    readonly emailVerified: boolean;
    readonly payoutsEnabled: boolean;
  };
};

export type VerificationRoadmapModel =
  | {
      readonly kind: "roadmap";
      readonly heading: "Get ready to take bookings";
      readonly lede: "These four checks show what is finished, what needs you, and what FitOut is still checking.";
      readonly steps: readonly VerificationRoadmapStep[];
    }
  | {
      readonly kind: "ready";
      readonly heading: "Ready to take bookings";
      readonly body: "You have a listing that guests can book.";
    };

function identityStep(
  verification: HostVerificationState,
  now: Date,
): Omit<VerificationRoadmapStep, "number" | "action"> & {
  action?: RoadmapAction;
} {
  switch (verification.status) {
    case "unverified": {
      const signal = VERIFICATION_SIGNAL.unverified;
      return {
        title: "Get your account checked",
        state: "Current",
        body: signal.reason,
        action: {
          kind: "link",
          label: signal.wayOut,
          href: "/host/verify",
          variant: "default",
        },
        verificationStatus: verification.status,
      };
    }
    case "pending": {
      const signal = VERIFICATION_SIGNAL.pending;
      const staleAt = verification.updatedAt
        ? new Date(
            verification.updatedAt.getTime() +
              DIDIT_RECONCILE_GRACE_MINUTES * 60_000,
          )
        : null;
      const stale = staleAt !== null && now.getTime() >= staleAt.getTime();
      return {
        title: "Get your account checked",
        state: "Waiting",
        body: stale
          ? "Your check has been waiting for a result for more than 30 minutes. Open the check again so FitOut can continue."
          : signal.reason,
        action: stale
          ? {
              kind: "link",
              label: signal.wayOut,
              href: "/host/verify",
              variant: "default",
            }
          : undefined,
        verificationStatus: verification.status,
      };
    }
    case "approved":
      return {
        title: "Get your account checked",
        state: "Done",
        body: VERIFICATION_SIGNAL.approved.reason,
        verificationStatus: verification.status,
      };
    case "rejected": {
      const reason = composeVerificationRejectionReason(verification.reason);
      const allowedAt = verification.updatedAt
        ? retryAllowedAt(verification.updatedAt, COOLDOWN_HOURS)
        : null;
      const retrySentence = verification.updatedAt
        ? composeRetryAfterSentence(verification.updatedAt, COOLDOWN_HOURS)
        : null;
      const retryAllowed = allowedAt !== null && now.getTime() >= allowedAt.getTime();
      return {
        title: "Get your account checked",
        state: "Not passed",
        body: retrySentence ? `${reason} ${retrySentence}` : reason,
        action: retryAllowed
          ? {
              kind: "link",
              label: VERIFICATION_SIGNAL.rejected.wayOut,
              href: "/host/verify",
              variant: "default",
            }
          : undefined,
        verificationStatus: verification.status,
      };
    }
    case "suspended":
      return {
        title: "Get your account checked",
        state: "Paused",
        body: composeSuspendedSentence(verification.reason),
        verificationStatus: verification.status,
      };
    case "grandfathered":
      return {
        title: "Account ready",
        state: "Done",
        body: "Your account can create and publish listings.",
        verificationStatus: verification.status,
      };
    default:
      throw new Error(`Unsupported verification status: ${String(verification.status)}`);
  }
}

function payoutStep(status: PayoutStatus, identityAllowsProgress: boolean) {
  switch (status) {
    case "enabled":
      return {
        state: "Done" as const,
        body: "Payouts are enabled. You can get paid when guests book your space.",
      };
    case "paused":
      return {
        state: "Not passed" as const,
        body: "Your payout account needs attention before guests can book.",
        action: { kind: "payout" as const, label: "Review payout setup" },
      };
    case "incomplete":
      return {
        state: identityAllowsProgress ? ("Current" as const) : ("Next" as const),
        body: "You've started payout setup. Finish it so guests can book your space and you get paid.",
        action: identityAllowsProgress
          ? { kind: "payout" as const, label: "Finish payout setup" }
          : undefined,
      };
    case "not_started":
      return {
        state: identityAllowsProgress ? ("Current" as const) : ("Next" as const),
        body: "Set up payouts so guests can book your space and you can get paid.",
        action: identityAllowsProgress
          ? { kind: "payout" as const, label: "Set up payouts" }
          : undefined,
      };
  }
}

export function deriveVerificationRoadmap(
  input: VerificationRoadmapInput,
): VerificationRoadmapModel {
  const verification: HostVerificationState = input.verification ?? {
    status: "unverified",
    reason: null,
    suspended: false,
    updatedAt: null,
  };
  const hostGate = {
    emailVerified: input.host.emailVerified,
    payoutsEnabled: input.host.payoutsEnabled,
    verificationStatus: verification.status,
  };

  if (input.listings.some((row) => deriveBookable(row, hostGate))) {
    return {
      kind: "ready",
      heading: "Ready to take bookings",
      body: "You have a listing that guests can book.",
    };
  }

  const identity = identityStep(verification, input.now);
  const payout = payoutStep(
    input.payoutStatus,
    verification.status === "approved" || verification.status === "grandfathered",
  );
  const hasListings = input.listings.length > 0;
  const preparedListings = input.listings.filter(
    (row) => row.status === "published" && row.hasOperatingHours,
  );
  const hasPreparedListing = preparedListings.length > 0;
  const hasRejected = preparedListings.some((row) => row.reviewState === "rejected");
  const hasPending = preparedListings.some((row) => row.reviewState === "pending");
  const reviewDone = preparedListings.some(
    (row) => row.reviewState === "approved" || row.reviewState === "grandfathered",
  );

  const steps: VerificationRoadmapStep[] = [
    { number: 1, ...identity },
    { number: 2, title: "Set up payouts", ...payout },
    {
      number: 3,
      title: "List a space",
      state: hasPreparedListing ? "Done" : "Current",
      body: !hasListings
        ? "Create a listing so guests can discover your space."
        : hasPreparedListing
          ? "You have a published listing with weekly hours."
          : "Finish a listing and set its weekly hours so FitOut can check it.",
      action: !hasListings
        ? {
            kind: "link",
            label: "Create listing",
            href: "/host/listings/new",
            variant: "brand",
          }
        : hasPreparedListing
          ? undefined
          : {
              kind: "link",
              label: "Your listings",
              href: "/host/listings",
              variant: "default",
            },
    },
    {
      number: 4,
      title: input.listings.length > 1 ? "FitOut checks your spaces" : "FitOut checks your space",
      state: !hasListings
        ? "Next"
        : !hasPreparedListing
          ? "Current"
        : hasRejected
          ? "Not passed"
          : hasPending
            ? "Waiting"
            : reviewDone
              ? "Done"
              : "Current",
      body: !hasListings || !hasPreparedListing
        ? "Finish a listing and submit it before FitOut can check it."
        : hasRejected
          ? "A listing needs changes before it can take bookings. Open your listings to see what to fix."
          : hasPending
            ? "FitOut is checking your listing. It can't take bookings until that's done."
            : reviewDone
              ? "FitOut has finished checking a listing."
              : "Finish a listing and submit it before FitOut can check it.",
      action:
        hasPreparedListing && hasRejected
          ? {
              kind: "link",
              label: "Review your listings",
              href: "/host/listings",
              variant: "default",
            }
          : hasPreparedListing && !hasPending && !reviewDone
            ? {
                kind: "link",
                label: "Your listings",
                href: "/host/listings",
                variant: "default",
              }
            : undefined,
    },
  ];

  // The no-listing empty edge deliberately relocates the sole action to Step 3. In populated states,
  // the earliest gate with a real way forward owns it; later cards stay explanatory.
  const actionOwner = !hasListings
    ? 3
    : (steps.find((step) => step.action)?.number ?? null);
  const ownedSteps = steps.map((step) => {
    if (step.number === actionOwner) return step;
    const { action: _laterAction, ...withoutAction } = step;
    return withoutAction;
  });

  return {
    kind: "roadmap",
    heading: "Get ready to take bookings",
    lede:
      "These four checks show what is finished, what needs you, and what FitOut is still checking.",
    steps: ownedSteps,
  };
}
