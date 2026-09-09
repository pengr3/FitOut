import { describe, expect, it } from "vitest";

import { hostVerificationStatus } from "@/lib/db/schema";
import type { HostVerificationState } from "@/lib/host/verification-status";
import {
  composeRetryAfterSentence,
  retryAllowedAt,
} from "@/lib/host/verification-signal";
import { COOLDOWN_HOURS } from "@/lib/host/verification-cooldown";
import {
  deriveVerificationRoadmap,
  type VerificationRoadmapInput,
  type VerificationRoadmapModel,
} from "@/lib/host/verification-roadmap";

const NOW = new Date("2026-09-09T04:00:00.000Z");
const GRACE_MINUTES = 30;

function verification(
  status: HostVerificationState["status"],
  overrides: Partial<HostVerificationState> = {},
): HostVerificationState {
  return {
    status,
    reason: null,
    suspended: status === "suspended",
    updatedAt: new Date("2026-09-09T03:45:00.000Z"),
    ...overrides,
  };
}

function listing(
  overrides: Partial<VerificationRoadmapInput["listings"][number]> = {},
): VerificationRoadmapInput["listings"][number] {
  return {
    id: "listing_1",
    status: "draft",
    reviewState: "pending",
    hasOperatingHours: false,
    ...overrides,
  };
}

function derive(
  overrides: Partial<VerificationRoadmapInput> = {},
): VerificationRoadmapModel {
  return deriveVerificationRoadmap({
    now: NOW,
    verification: verification("approved"),
    payoutStatus: "enabled",
    listings: [listing()],
    host: { emailVerified: true, payoutsEnabled: true },
    ...overrides,
  });
}

function steps(model: VerificationRoadmapModel) {
  expect(model.kind).toBe("roadmap");
  if (model.kind !== "roadmap") throw new Error("expected roadmap model");
  return model.steps;
}

describe("the identity card is total over stored verification state", () => {
  const expected = {
    unverified: "Current",
    pending: "Waiting",
    approved: "Done",
    rejected: "Not passed",
    suspended: "Paused",
    grandfathered: "Done",
  } as const;

  it("has exactly one explicit expectation for every enum value", () => {
    expect(Object.keys(expected).toSorted()).toEqual(
      [...hostVerificationStatus.enumValues].toSorted(),
    );
  });

  it.each(hostVerificationStatus.enumValues)("maps %s explicitly", (status) => {
    const identity = steps(derive({ verification: verification(status) }))[0];
    expect(identity.state).toBe(expected[status]);
    expect(identity.verificationStatus).toBe(status);
  });

  it("treats an absent row as unverified and rejects an invented state", () => {
    const identity = steps(derive({ verification: null }))[0];
    expect(identity.state).toBe("Current");
    expect(identity.verificationStatus).toBe("unverified");

    expect(() =>
      derive({
        verification: verification(
          "invented" as HostVerificationState["status"],
        ),
      }),
    ).toThrow(/Unsupported verification status/);
  });

  it("keeps the grandfathered branch capability-only", () => {
    const identity = steps(
      derive({ verification: verification("grandfathered") }),
    )[0];
    expect(identity.title).toBe("Account ready");
    expect(identity.body).toBe("Your account can create and publish listings.");
    expect(`${identity.title} ${identity.body}`.toLowerCase()).not.toMatch(
      /checked|approved|grandfathered/,
    );
  });
});

describe("the DB-clock rescue boundaries are exact", () => {
  it("offers Finish the check exactly at the shared 30-minute stale boundary", () => {
    const boundary = new Date(NOW.getTime() - GRACE_MINUTES * 60_000);
    const beforeBoundary = new Date(boundary.getTime() + 1);

    const ordinary = steps(
      derive({
        verification: verification("pending", { updatedAt: beforeBoundary }),
      }),
    )[0];
    expect(ordinary.state).toBe("Waiting");
    expect(ordinary.action).toBeUndefined();

    const stale = steps(
      derive({
        verification: verification("pending", { updatedAt: boundary }),
      }),
    )[0];
    expect(stale.state).toBe("Waiting");
    expect(stale.body).toBe(
      "Your check has been waiting for a result for more than 30 minutes. Open the check again so FitOut can continue.",
    );
    expect(stale.action).toMatchObject({
      kind: "link",
      label: "Finish the check",
      href: "/host/verify",
    });
  });

  it("shows the stored rejection cause and absolute retry instant before, at, and after eligibility", () => {
    const updatedAt = new Date("2026-09-08T04:00:00.000Z");
    const allowedAt = retryAllowedAt(updatedAt, COOLDOWN_HOURS);
    const expectedSentence = composeRetryAfterSentence(updatedAt, COOLDOWN_HOURS);

    const before = steps(
      derive({
        now: new Date(allowedAt.getTime() - 1),
        verification: verification("rejected", {
          reason: "The submitted details did not match.",
          updatedAt,
        }),
      }),
    )[0];
    expect(before.body).toBe(
      `The submitted details did not match. ${expectedSentence}`,
    );
    expect(before.action).toBeUndefined();

    for (const now of [allowedAt, new Date(allowedAt.getTime() + 1)]) {
      const eligible = steps(
        derive({
          now,
          verification: verification("rejected", {
            reason: "The submitted details did not match.",
            updatedAt,
          }),
        }),
      )[0];
      expect(eligible.action).toMatchObject({
        kind: "link",
        label: "Ask for another check",
        href: "/host/verify",
      });
    }
  });
});

describe("listing preparation, review adjacency, and final readiness", () => {
  it("keeps zero listings current/next and moves the sole action to Step 3", () => {
    const roadmap = steps(
      derive({ verification: verification("unverified"), listings: [] }),
    );
    expect(roadmap[2]).toMatchObject({ state: "Current" });
    expect(roadmap[3]).toMatchObject({ state: "Next" });
    expect(roadmap.flatMap((step) => (step.action ? [step.action] : []))).toEqual([
      expect.objectContaining({ label: "Create listing" }),
    ]);
  });

  it("does not let an unfinished draft complete preparation or supply review progress", () => {
    const roadmap = steps(
      derive({
        listings: [listing({ reviewState: "rejected" })],
      }),
    );
    expect(roadmap[2].state).toBe("Current");
    expect(roadmap[3].state).toBe("Current");
    expect(roadmap[3].body).toBe(
      "Finish a listing and submit it before FitOut can check it.",
    );
  });

  it("evaluates review only across individually prepared listings", () => {
    const roadmap = steps(
      derive({
        listings: [
          listing({ id: "draft_rejected", reviewState: "rejected" }),
          listing({
            id: "published_pending",
            status: "published",
            reviewState: "pending",
            hasOperatingHours: true,
          }),
        ],
      }),
    );
    expect(roadmap[2].state).toBe("Done");
    expect(roadmap[3].state).toBe("Waiting");
    expect(roadmap[3].title).toBe("FitOut checks your spaces");
  });

  it("uses the singular and plural review titles from the server snapshot", () => {
    expect(steps(derive({ listings: [listing()] }))[3].title).toBe(
      "FitOut checks your space",
    );
    expect(
      steps(derive({ listings: [listing(), listing({ id: "listing_2" })] }))[3]
        .title,
    ).toBe("FitOut checks your spaces");
  });

  it("renders the receipt if and only if a real listing passes deriveBookable", () => {
    const superficiallyComplete = derive({
      verification: verification("approved"),
      payoutStatus: "enabled",
      listings: [
        listing({
          status: "published",
          reviewState: "approved",
          hasOperatingHours: false,
        }),
      ],
      host: { emailVerified: true, payoutsEnabled: true },
    });
    expect(superficiallyComplete.kind).toBe("roadmap");

    const ready = derive({
      verification: verification("approved"),
      payoutStatus: "enabled",
      listings: [
        listing({
          status: "published",
          reviewState: "approved",
          hasOperatingHours: true,
        }),
      ],
      host: { emailVerified: true, payoutsEnabled: true },
    });
    expect(ready).toEqual({
      kind: "ready",
      heading: "Ready to take bookings",
      body: "You have a listing that guests can book.",
    });
  });

  it("lets one bookable listing win without reopening for a rejected sibling", () => {
    const model = derive({
      verification: verification("approved"),
      listings: [
        listing({
          id: "ready",
          status: "published",
          reviewState: "approved",
          hasOperatingHours: true,
        }),
        listing({
          id: "rejected",
          status: "published",
          reviewState: "rejected",
          hasOperatingHours: true,
        }),
      ],
    });
    expect(model.kind).toBe("ready");
  });

  it("is pure across repeated renders and never mutates the supplied snapshot", () => {
    const input: VerificationRoadmapInput = {
      now: NOW,
      verification: verification("pending"),
      payoutStatus: "not_started",
      listings: [listing()],
      host: { emailVerified: true, payoutsEnabled: false },
    };
    const before = structuredClone(input);
    expect(deriveVerificationRoadmap(input)).toEqual(deriveVerificationRoadmap(input));
    expect(input).toEqual(before);
  });
});
