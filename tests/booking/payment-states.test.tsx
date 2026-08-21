// @vitest-environment jsdom

// STATE-05 — THE THREE PAYMENT STATES ARE THREE VISIBLY DIFFERENT THINGS, AND NO TWO EVER CO-RENDER.
//
// WHY THIS FILE EXISTS. 13-UI-SPEC § The Three Payment States states the requirement as a table with
// four distinctness columns — hook, icon, `<h1>`, action set — and one negative ("any two never appear
// in one document"). A table in a planning document proves nothing; the falsifiable form of that table
// is rendering all three and comparing them, which is this file. Every column of the spec's table has
// a case here, and the negative has its own.
//
// THE THREE THINGS A SOURCE SCAN CANNOT SEE, and which are therefore the reason this file is RTL and
// not a grep:
//
//   (a) WHICH STATE A SET OF PROPS RENDERS. A component that ignored its props and always drew the
//       same heading would satisfy every source scan in the repository perfectly.
//   (b) WHAT THE COUNTDOWN DOES WHEN IT REACHES ZERO. 13-UI-SPEC § Not completed specifies an IN-PLACE
//       swap — the retry control is replaced by an expiry line and a recovery link — and an in-place
//       swap is a state transition, not a string in a file.
//   (c) WHETHER THE ALARM COLOUR REACHES THE DOM. The design gate 13-15 owns scans the FILES in
//       `src/components/booking/**`; it cannot see a token that arrives from a component one import
//       away. This file asserts it at the only place it matters — the rendered tree.
//
// ⚠ THE PENDING STATE'S CASES DRIVE A CLOCK, and the poller is the thing being preserved rather than
// tested: `pending-payment-state.tsx`'s mechanics are frozen by D-71 and 13-01 already proved them by
// diff. What is asserted here is the COPY at each of the three thresholds and the absence of a
// failure-shaped control at all three — the property D-71 states in the negative, which is exactly the
// kind of property that goes green forever if nobody ever renders the state.
//
// Modelled on `tests/booking/reversed-state.test.tsx` (the sibling state's suite) and
// `tests/booking/hold-countdown.test.tsx` (the fake-clock idiom).

import * as React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";

// `BookingReference` is a client component that imports `sonner` at module scope for its copy control.
// Mocked rather than mounted: nothing here clicks it, and the real toaster registers a portal + a
// document listener per render that would outlive `cleanup()`. (The idiom `reversed-state.test.tsx`
// records.)
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// `PendingPaymentState` polls by calling `router.refresh()`. The router is mocked so the poll is
// observable AND harmless — the real one is a Next runtime binding that does not exist under jsdom.
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { NotCompletedState } from "@/components/booking/not-completed-state";
import { PendingPaymentState } from "@/components/booking/pending-payment-state";
import { PaymentReversedState } from "@/components/booking/payment-reversed-state";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  refresh.mockReset();
});

const LISTING_ID = "lst_incomplete_1";
const BOOKING_ID = "bkg_incomplete_1";
const REFERENCE = "FIT-9K3MP7QZ";

/**
 * ⚠ TRUST-04's FOUR-ROW PANEL USED TO BE MOUNTED INTO ALL THREE STATES AS A SLOT, AND IT IS GONE
 * (13-19 / D-98).
 *
 * It was the real component rather than a stand-in so the distinctness assertions below compared three
 * trees a booker would actually see. That property is preserved and is now stronger in one respect:
 * the three trees no longer share a large identical block, so "these three states are distinct" is a
 * claim about the states themselves rather than about the three-quarters of each that differed.
 */

const T0 = new Date("2026-08-20T09:00:00.000Z");
const FIFTEEN_MIN_MS = 15 * 60_000;

/**
 * Mount the not-completed state on a fake clock with a live hold.
 *
 * The clock is fake from BEFORE the render, because `RequestCountdown` computes its first remaining-ms
 * during render: installing the timers afterwards would leave the initial paint on the real clock and
 * make every subsequent assertion about a component that had already decided it was expired.
 */
function mountIncomplete({ holdMs = FIFTEEN_MIN_MS }: { holdMs?: number } = {}) {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  const utils = render(
    <NotCompletedState
      bookingId={BOOKING_ID}
      listingId={LISTING_ID}
      reference={REFERENCE}
      holdExpiresAt={new Date(T0.getTime() + holdMs).toISOString()}
    />,
  );
  act(() => {
    vi.advanceTimersByTime(0);
  });
  return utils;
}

/** Collapse whitespace so an assertion is about the sentence and not about how JSX wrapped it. */
function flat(node: HTMLElement | null): string {
  return (node?.textContent ?? "").replace(/\s+/g, " ").trim();
}

describe("D-70 — the not-completed state, the one place 'you have not been charged' is true", () => {
  it("(1) states the money truth, the slot-held line, and its own heading", () => {
    const { container } = mountIncomplete();

    const state = container.querySelector('[data-testid="payment-state-incomplete"]');
    expect(state, "the state renders no container of its own — STATE-05 asserts distinctness between three concrete boxes").toBeTruthy();

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Your payment didn't go through",
    );

    // Exactly ONE money statement (STATE-06's single owner), and it carries BOTH specified lines.
    const panels = container.querySelectorAll('[data-testid="money-statement"]');
    expect(panels.length, "STATE-06: exactly one money statement per document").toBe(1);
    const panel = flat(panels[0] as HTMLElement);
    expect(panel).toContain("You haven't been charged.");
    expect(panel).toContain("Your slot is still held — finish paying and it's yours.");
  });

  it("(2) offers ONE coral retry, and it is a link to the shipped reserve page for this same hold", () => {
    mountIncomplete();

    const retry = screen.getByRole("link", { name: "Try paying again" });
    expect(
      retry.getAttribute("href"),
      "the retry must re-enter the SHIPPED reserve page for the SAME hold. A second checkout-minting " +
        "path is a real double charge: PayMongo does not honour the idempotency header on checkout- " +
        "session creation, and expire-before-create is the only guard that works.",
    ).toBe(`/listings/${LISTING_ID}/book?hold=${BOOKING_ID}`);
    // Coral, and 44px: `variant="brand"` + `size="touch"`.
    expect(retry.className).toContain("bg-brand");
    expect(retry.className).toContain("h-11");
    // ONE accent fill in the viewport — the recovery link must NOT also be coral while the retry is up.
    expect(
      [...document.querySelectorAll("a")].filter((a) => a.className.includes("bg-brand")).length,
    ).toBe(1);
  });

  it("(3) names the alternative rails inline, verbatim", () => {
    const { container } = mountIncomplete();
    expect(flat(container as unknown as HTMLElement)).toContain(
      "You can pay with GCash, Maya, card or QR Ph — a failed GCash payment doesn't cost you your slot.",
    );
  });

  it("(4) shows the hold countdown under its own label", () => {
    const { container } = mountIncomplete();
    expect(flat(container as unknown as HTMLElement)).toContain("Slot held for");
  });

  it("(5) on expiry IN PLACE, the retry is replaced by the expiry line and a coral recovery", () => {
    mountIncomplete({ holdMs: 2 * 60_000 });

    // Guard the guard: the retry is up before the clock runs out, or case (5) proves nothing.
    expect(screen.getByRole("link", { name: "Try paying again" })).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(3 * 60_000);
    });

    expect(
      screen.queryByRole("link", { name: "Try paying again" }),
      "the hold lapsed and the page still offers to take the booker's money for a slot it no longer holds",
    ).toBeNull();
    expect(screen.getByText("This hold has expired.")).toBeTruthy();
    const back = screen.getByRole("link", { name: "Back to availability" });
    expect(back.getAttribute("href")).toBe(`/listings/${LISTING_ID}`);
    expect(back.className).toContain("bg-brand");

    // The slot-held promise must NOT survive its own expiry — it is a money-adjacent sentence and it
    // is now false. The money truth above it ("you have not been charged") is still true and stays.
    const panel = flat(document.querySelector('[data-testid="money-statement"]') as HTMLElement);
    expect(panel).toContain("You haven't been charged.");
    expect(panel).not.toContain("Your slot is still held");
  });

  it("(6) renders the reference on this status too (TRUST-02)", () => {
    const { container } = mountIncomplete();
    expect(
      container.querySelector('[data-testid="booking-reference"]')?.textContent,
    ).toContain(REFERENCE);
  });

  it("(7) paints NO alarm colour in the rendered tree, at either threshold", () => {
    // ⚠ THIS IS A RENDERED-TREE ASSERTION AND THAT IS THE POINT. A source scan over
    // `src/components/booking/**` cannot see a token that arrives from a child component, and the
    // countdown reused here paints its digits with the alarm token whenever under an hour remains —
    // which, on a fifteen-minute hold, is ALWAYS. 13-UI-SPEC § Color: the alarm colour renders NOWHERE
    // in this phase, because a checkout that did not finish is not an error the booker caused.
    //
    // IT IS SCOPED TO UNCONDITIONAL PAINT, and the scoping is measured rather than cautious: the
    // vendored button recipe carries `aria-invalid:`-prefixed and `dark:`-prefixed spellings of the
    // same token on EVERY button in the application, and those are state-scoped rules that paint
    // nothing until a control is invalid. A substring match over `innerHTML` therefore reports every
    // surface in the repo — it was written that way first and reported this one, which is how the
    // distinction got measured. A bare utility (`text-…`, `bg-…`, `border-…`, `ring-…` with no
    // variant prefix) is the thing that actually reaches a pixel.
    const alarm = /^(text|bg|border|ring)-destr(uctive)\b/;
    const painted = (root: HTMLElement) =>
      [...root.querySelectorAll<HTMLElement>("*")]
        .flatMap((el) => (el.getAttribute("class") ?? "").split(/\s+/))
        .filter((token) => alarm.test(token));

    const { container } = mountIncomplete();
    expect(
      painted(container as unknown as HTMLElement),
      "the alarm colour reached the calmest surface in the phase",
    ).toEqual([]);

    act(() => {
      vi.advanceTimersByTime(FIFTEEN_MIN_MS + 60_000);
    });
    expect(
      painted(container as unknown as HTMLElement),
      "…and it must not arrive with the expiry either",
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE PENDING STATE — the promise, the three thresholds, and the affordance that must never appear.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const EMAIL = "jane@example.com";
const POLL_CAP_MS = 8 * 2500; // MAX_ATTEMPTS x POLL_INTERVAL_MS — read from the component, not chosen
const ESCALATION_MS = 120_000;

/** Mount the pending state on a fake clock, before any threshold has fired. */
function mountPending({ email = EMAIL as string | null } = {}) {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  const utils = render(
    <PendingPaymentState reference={REFERENCE} email={email} />,
  );
  act(() => {
    vi.advanceTimersByTime(0);
  });
  return utils;
}

/**
 * Every control inside the state, by its accessible text. The pending assertions are mostly about what
 * is ABSENT, and an absence assertion is only worth its ink if the set it is drawn from is visible —
 * so the cases below assert the whole set rather than querying for the strings they hope are missing.
 */
function controlNames(root: HTMLElement): string[] {
  return [...root.querySelectorAll<HTMLElement>("button, a")].map((el) =>
    (el.textContent ?? "").replace(/\s+/g, " ").trim(),
  );
}

/**
 * The reference's copy control, which plan 13-10 put on this state from the first paint (TRUST-02 /
 * D-78: the reference is present on EVERY status, and "every" is the requirement's own word).
 *
 * ⚠ THE SETS BELOW NAME IT RATHER THAN LOOSENING TO A SUBSET MATCH, and the distinction is the whole
 * value of the assertions it appears in. D-71's property is that the pending state never offers a way
 * to ACT ON A FAILURE while the webhook is still the outstanding authority — copying a reference is
 * not that: it changes nothing, retries nothing, and cannot cost a second charge. What must still be
 * impossible is a control nobody listed, so these cases keep asserting the WHOLE set and simply have
 * one more member in it. A `filter(name => name !== X)` would have the same teeth; a `toContain` would
 * not, which is why neither case was rewritten that way.
 */
const COPY_CONTROL = "Copy";

describe("D-71 / D-95 — the pending state promises safety and never offers a way to act on a failure", () => {
  it("(1) at 0-20s: the money truth, the self-updating line, and NOTHING to press", () => {
    const { container } = mountPending();

    expect(container.querySelector('[data-testid="payment-state-pending"]')).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Payment received");

    const panels = container.querySelectorAll('[data-testid="money-statement"]');
    expect(panels.length, "STATE-06: exactly one money statement per document").toBe(1);
    const panel = flat(panels[0] as HTMLElement);
    expect(panel).toContain("Your payment reached us.");
    expect(panel).toContain("We're waiting on the final confirmation — this page updates on its own.");

    expect(
      controlNames(container as unknown as HTMLElement),
      "the poller has not backed off yet, so there is nothing for the booker to DO about the payment " +
        "and nothing offered. The reference's copy control is not an action on the payment — see " +
        "COPY_CONTROL's note — and it is named here rather than excused by a looser matcher.",
    ).toEqual([COPY_CONTROL]);
  });

  it("(2) past the poll cap: the payment is safe, the booking is held, and an email is coming", () => {
    const { container } = mountPending();

    act(() => {
      vi.advanceTimersByTime(POLL_CAP_MS);
    });

    // The poller really ran — otherwise the copy below changed for some other reason.
    expect(refresh.mock.calls.length, "the poller stops at its cap and the cap is 8 attempts").toBe(8);

    const panel = flat(container.querySelector('[data-testid="money-statement"]') as HTMLElement);
    expect(panel, "L1 must not change: nothing about the booker's money changed").toContain(
      "Your payment reached us.",
    );
    expect(panel).toContain(
      `It's taking longer than usual. Your payment is safe, your booking is held, and we'll email you at ${EMAIL} the moment it confirms.`,
    );

    // D-95 — the control has an object, and it is the only control that acts on the PAYMENT.
    expect(controlNames(container as unknown as HTMLElement)).toEqual([
      "Refresh status",
      COPY_CONTROL,
    ]);
    expect(screen.getByRole("button", { name: "Refresh status" })).toBeTruthy();
  });

  it("(3) with no address on the session, the promise still names the mechanism", () => {
    const { container } = mountPending({ email: null });
    act(() => {
      vi.advanceTimersByTime(POLL_CAP_MS);
    });
    const panel = flat(container.querySelector('[data-testid="money-statement"]') as HTMLElement);
    expect(panel).toContain(
      "It's taking longer than usual. Your payment is safe, your booking is held, and we'll email you the moment it confirms.",
    );
    expect(panel, "...and it must not render an empty destination").not.toContain("email you at ");
  });

  it("(4) past the escalation threshold: the reference is named, inside the SAME one region", () => {
    const { container } = mountPending();

    // Guard the guard: the SENTENCE that names the reference has not appeared yet.
    //
    // ⚠ SCOPED TO THE MONEY PANEL SINCE 13-10, AND THE NARROWING IS THE CORRECTION, NOT A CONCESSION.
    // This used to assert the reference string was absent from the whole DOCUMENT, which was a
    // truthful reading of the tree at the time and the wrong assertion for the property: TRUST-02
    // puts the reference on every status from the first paint, so a document-wide absence check was
    // pinning the one thing this state was missing. What (4) is actually about is the ESCALATION —
    // that past a threshold one region gains a sentence, and that it is the SAME region rather than a
    // second one. That is a claim about the money panel, so it is asserted about the money panel.
    act(() => {
      vi.advanceTimersByTime(POLL_CAP_MS);
    });
    expect(
      flat(container.querySelector('[data-testid="money-statement"]') as HTMLElement),
    ).not.toContain(REFERENCE);
    // …and the reference ITSELF is on the page throughout, which is the half TRUST-02 requires.
    expect(screen.getByTestId("booking-reference").textContent).toBe(REFERENCE);

    act(() => {
      vi.advanceTimersByTime(ESCALATION_MS);
    });

    const panel = flat(container.querySelector('[data-testid="money-statement"]') as HTMLElement);
    expect(panel).toContain(
      `Your reference is ${REFERENCE} — we've recorded it against this booking.`,
    );
    // GATE-03 rule 6 — the threshold change is a text change INSIDE one region, not a second region.
    const regions = container.querySelectorAll('[role="status"], [role="alert"], [aria-live]');
    expect(
      regions.length,
      "a third threshold added a second live region; exactly one region announces one outcome",
    ).toBe(1);
    // Rules 4/5 — the region a screen reader lands on has a name.
    expect((regions[0] as HTMLElement).getAttribute("aria-label")).toBeTruthy();
  });

  it("(5) offers NO failure-shaped affordance and NO alarm colour at ANY of the three thresholds", () => {
    const { container } = mountPending();
    const root = container as unknown as HTMLElement;

    // The phrasings D-71 bans, spelled in two pieces so this test does not become the first violation
    // of the rule it enforces (the `reversed-copy.test.ts` idiom).
    const banned = [
      ["went", " wrong"],
      ["try", " again"],
      ["err", "or"],
      ["failed", " payment"],
    ].map(([a, b]) => a + b);
    const alarm = /^(text|bg|border|ring)-destr(uctive)\b/;
    const painted = () =>
      [...root.querySelectorAll<HTMLElement>("*")]
        .flatMap((el) => (el.getAttribute("class") ?? "").split(/\s+/))
        .filter((token) => alarm.test(token));

    const assertCalm = (when: string) => {
      const text = flat(root).toLowerCase();
      expect(
        banned.filter((phrase) => text.includes(phrase)),
        `${when}: the pending state offered the booker a failure. The webhook is still the outstanding ` +
          `authority at every threshold — the money HAS reached us — so a failure-shaped affordance ` +
          `here tells them to act at the one moment acting is wrong, and could cost a second charge.`,
      ).toEqual([]);
      expect(painted(), `${when}: an alarm colour reached the pending state`).toEqual([]);
      // The only control that may act on the PAYMENT is the refresh, and it never grows a sibling.
      // The reference's copy control is excluded BY NAME (see COPY_CONTROL) rather than by relaxing
      // the matcher, so an unlisted control still fails this immediately.
      expect(
        controlNames(root).filter(
          (name) => name !== "Refresh status" && name !== COPY_CONTROL,
        ),
        `${when}: a second control appeared beside the refresh`,
      ).toEqual([]);
    };

    assertCalm("on arrival");
    act(() => {
      vi.advanceTimersByTime(POLL_CAP_MS);
    });
    assertCalm("past the poll cap");
    act(() => {
      vi.advanceTimersByTime(ESCALATION_MS);
    });
    assertCalm("past the escalation threshold");
  });

  it("(6) the manual control runs the same refresh the poller ran — it retries nothing", () => {
    const { container } = mountPending();
    act(() => {
      vi.advanceTimersByTime(POLL_CAP_MS);
    });
    refresh.mockClear();

    const control = screen.getByRole("button", { name: "Refresh status" });
    act(() => {
      control.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(refresh.mock.calls.length, "the control must call the router refresh and nothing else").toBe(
      1,
    );
    // And the state did not fabricate a confirmed booking client-side (D-57 / T-13-07-FAKECONFIRM).
    expect(flat(container as unknown as HTMLElement).toLowerCase()).not.toContain("booking confirmed");
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// STATE-05 — THE DISTINCTNESS PROOF. Three states, four columns, and one negative.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The three states, each mounted the way its own page mounts it.
 *
 * They are rendered ONE AT A TIME into separate documents and the results compared, rather than side
 * by side in one tree: "no two co-render" is the property under test, so a harness that put two in one
 * document to compare them would have to violate the thing it is asserting in order to assert it.
 */
const STATES = [
  {
    hook: "payment-state-incomplete",
    render: () =>
      render(
        <NotCompletedState
          bookingId={BOOKING_ID}
          listingId={LISTING_ID}
          reference={REFERENCE}
          holdExpiresAt={new Date(T0.getTime() + FIFTEEN_MIN_MS).toISOString()}
            />,
      ),
  },
  {
    hook: "payment-state-pending",
    render: () =>
      render(<PendingPaymentState reference={REFERENCE} email={EMAIL} />),
  },
  {
    hook: "payment-state-reversed",
    render: () =>
      render(
        <PaymentReversedState
          listingId={LISTING_ID}
          reference={REFERENCE}
          amountLabel="₱1,428.00"
          branch="auto"
          rail="gcash"
            />,
      ),
  },
] as const;

/** Mount one state on the fake clock and return what the four distinctness columns resolve to. */
function readColumns(state: (typeof STATES)[number]) {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  const { container } = state.render();
  act(() => {
    vi.advanceTimersByTime(0);
  });
  const root = container as unknown as HTMLElement;
  const columns = {
    hook: root.querySelector(`[data-testid="${state.hook}"]`) !== null,
    heading: flat(root.querySelector("h1")),
    // The state's own leading glyph. Lucide stamps a per-icon class, so this reads the ICON identity
    // rather than a size or colour the three deliberately share.
    icon: (root.querySelector("svg")?.getAttribute("class") ?? "")
      .split(/\s+/)
      .filter((token) => token.startsWith("lucide-"))
      .join(" "),
    // The state's OWN action set. The reference's copy control is excluded deliberately: TRUST-02
    // gives it to every status, so it is shared BY DESIGN and is not a column any two states could
    // differ on. It is addressed by its accessible name — the property `booking-reference.tsx` keeps
    // on the control instead of a test hook — so this filter cannot silently widen.
    actions: [...root.querySelectorAll<HTMLElement>("button, a")]
      .filter((el) => el.getAttribute("aria-label") !== "Copy booking reference")
      .map((el) => flat(el)),
    moneyStatements: root.querySelectorAll('[data-testid="money-statement"]').length,
    // Every OTHER state's hook, counted inside this one.
    foreignHooks: STATES.filter((other) => other.hook !== state.hook).filter(
      (other) => root.querySelector(`[data-testid="${other.hook}"]`) !== null,
    ).length,
  };
  cleanup();
  vi.useRealTimers();
  return columns;
}

describe("STATE-05 — the three payment states are three visibly different things", () => {
  it("(1) each renders its OWN hook and no other state's", () => {
    for (const state of STATES) {
      const columns = readColumns(state);
      expect(columns.hook, `${state.hook} does not render its declared container`).toBe(true);
      expect(
        columns.foreignHooks,
        `${state.hook} rendered another payment state's container inside its own. Two states in one ` +
          `document is two answers to "what happened to my money", and the booker has no way to know ` +
          `which one is about them.`,
      ).toBe(0);
    }
  });

  it("(2) three distinct headings", () => {
    const headings = STATES.map((state) => readColumns(state).heading);
    expect(headings.every((heading) => heading.length > 0)).toBe(true);
    expect(
      new Set(headings).size,
      `two payment states share an <h1>: ${JSON.stringify(headings)}. The heading is the first thing ` +
        `read on the page and it is the whole of what most bookers will take from it.`,
    ).toBe(STATES.length);
  });

  it("(3) three distinct icons", () => {
    const icons = STATES.map((state) => readColumns(state).icon);
    expect(
      icons.every((icon) => icon.length > 0),
      `a state renders no identifiable leading glyph: ${JSON.stringify(icons)}`,
    ).toBe(true);
    expect(
      new Set(icons).size,
      `two payment states share a glyph: ${JSON.stringify(icons)}. 13-UI-SPEC gives each of the three ` +
        `its own precisely so the difference survives being skimmed.`,
    ).toBe(STATES.length);
  });

  it("(4) three distinct action sets", () => {
    const actions = STATES.map((state) => readColumns(state).actions);
    // The pending state's set is EMPTY before its poll backs off, and that is its distinguishing
    // feature rather than a gap — nothing is asked of a booker whose payment is still settling.
    expect(actions.map((set) => set.join(" | "))).toEqual([
      "Try paying again",
      "",
      "Back to availability | Search other spaces",
    ]);
    expect(new Set(actions.map((set) => set.join(" | "))).size).toBe(STATES.length);
  });

  it("(5) exactly one money statement per state (STATE-06)", () => {
    for (const state of STATES) {
      expect(
        readColumns(state).moneyStatements,
        `${state.hook} renders a number of money statements other than one. STATE-06 gives every ` +
          `payment state exactly one "where is your money" sentence, in one owner, in one box.`,
      ).toBe(1);
    }
  });
});
