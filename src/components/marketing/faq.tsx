"use client";

import type { KeyboardEvent, ReactNode } from "react";

export type FaqQuestion = { question: string; answer: ReactNode };

function toggleWithKeyboard(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  if (event.repeat) return;
  const details = event.currentTarget.parentElement;
  if (details instanceof HTMLDetailsElement) details.open = !details.open;
}

export function MarketingFaq({ audience, questions }: { audience: "Players" | "Hosts"; questions: readonly FaqQuestion[] }) {
  const headingId = `faq-${audience.toLowerCase()}`;
  return (
    <section aria-labelledby={headingId} className="space-y-6">
      <h2 id={headingId} className="font-heading text-heading">{audience}</h2>
      <div className="divide-y divide-border rounded-xl border border-border bg-background">
        {questions.map(({ question, answer }) => (
          <details key={question} className="group px-5 sm:px-6">
            <summary onKeyDown={toggleWithKeyboard} className="min-h-11 cursor-pointer rounded-lg py-5 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">{question}</summary>
            <div className="space-y-3 pb-6 text-body text-muted-foreground">{answer}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
