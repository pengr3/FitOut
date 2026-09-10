"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  Clock3,
  PauseCircle,
} from "lucide-react";

import { startPayoutOnboarding } from "@/app/actions/paymongo-connect";
import { PanelCard } from "@/components/patterns/panel-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  RoadmapStepState,
  VerificationRoadmapModel,
} from "@/lib/host/verification-roadmap";

export type VerificationRoadmapProps = {
  readonly model: VerificationRoadmapModel;
  readonly createListingAction: ReactNode;
};

const STATE_ICON = {
  Done: CheckCircle2,
  Current: CircleAlert,
  Waiting: Clock3,
  "Not passed": CircleAlert,
  Paused: PauseCircle,
  Next: Circle,
} satisfies Record<RoadmapStepState, typeof Circle>;

export function VerificationRoadmap({
  model,
  createListingAction,
}: VerificationRoadmapProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function beginPayoutOnboarding() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await startPayoutOnboarding();
        if (result.ok) {
          window.location.href = result.url;
          return;
        }
        setError(result.error);
      } catch {
        setError("We couldn't start payout setup. Please try again.");
      }
    });
  }

  if (model.kind === "ready") {
    return (
      <section aria-labelledby="verification-roadmap-heading">
        <PanelCard>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
            <div className="space-y-1">
              <h2 id="verification-roadmap-heading" className="text-heading">
                {model.heading}
              </h2>
              <p className="text-sm text-muted-foreground">{model.body}</p>
            </div>
          </div>
        </PanelCard>
      </section>
    );
  }

  return (
    <section aria-labelledby="verification-roadmap-heading" className="space-y-4">
      <div className="space-y-1">
        <h2 id="verification-roadmap-heading" className="text-heading">
          {model.heading}
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">{model.lede}</p>
      </div>

      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
        {model.steps.map((step) => {
          const StateIcon = STATE_ICON[step.state];
          const muted = ["Done", "Waiting", "Paused", "Next"].includes(step.state);
          return (
            <li key={step.number} className="h-full min-w-0 [&>[data-testid=panel-card]]:h-full">
              <PanelCard title={step.title} titleAs="h3" tone={muted ? "muted" : "default"}>
                <div
                  className="flex min-w-0 flex-col gap-4"
                  {...(step.verificationStatus
                    ? { "data-verification-owed": step.verificationStatus }
                    : {})}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Step {step.number} of 4
                    </span>
                    <Badge variant="outline">
                      <StateIcon
                        className={step.state === "Done" ? "size-3 text-success" : "size-3"}
                        aria-hidden="true"
                      />
                      {step.state}
                    </Badge>
                  </div>
                  <p className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                    {step.body}
                  </p>
                  {step.action ? (
                    <div className="mt-auto pt-2">
                      {step.action.kind === "link" ? (
                        step.action.variant === "brand" ? (
                          createListingAction
                        ) : (
                          <Button asChild variant={step.action.variant} size="touch">
                            <Link href={step.action.href}>{step.action.label}</Link>
                          </Button>
                        )
                      ) : (
                        <>
                          <Button
                            type="button"
                            size="touch"
                            onClick={beginPayoutOnboarding}
                            disabled={pending}
                          >
                            {step.action.label}
                          </Button>
                          {error ? (
                            <p className="mt-2 text-sm text-muted-foreground">
                              {error}
                            </p>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </PanelCard>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
