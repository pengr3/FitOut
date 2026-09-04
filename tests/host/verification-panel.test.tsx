// @vitest-environment jsdom

// WHAT `/host/verify` RENDERS, IN WHICH STATE — and above all WHEN it says the check needs a phone.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE ONE THIS FILE EXISTS FOR: D-273's *WHEN*, WHICH NO OTHER GATE CAN SEE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `tests/listing/review-signal.test.ts`'s own NOT COVERED list names this gap by name: that corpus can
// prove the mobile-only sentence EXISTS and that it is safe to say, and it explicitly cannot prove
// WHEN it is said — *"only the surface can be wrong about WHEN it is said, and saying it after a
// dead-end redirect is the failure that matters."* This file is that surface's test, and case 1 is
// that entry closed.
//
// WHY THE PLACEMENT IS THE DECISION RATHER THAN THE DESCRIPTION. The checking partner's hosted flow is
// configured so it will not run on a computer. A host who learns that AFTER pressing has been handed
// off to a flow that cannot run where they are standing, and the redirect they come back from cannot
// say why — the most expensive outcome in this flow is a decline that spends one of their tries. So
// the sentence has to be in the panel's RESTING state: on screen at first paint, before any press,
// with no interaction of any kind having happened.
//
// ⚠ ASSERTED AS AN ABSENCE OF INTERACTION AS WELL AS A PRESENCE OF TEXT. "The sentence is somewhere in
// the document after the test drove the form" would be true of an error message rendered too late,
// which is exactly the failure the decision rules out. So case 1 renders and asserts, with the action
// spy at ZERO calls — the mechanical form of *before the host presses anything*.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT ELSE IS HERE, AND WHY EACH ONE IS A RENDER RATHER THAN A SCAN
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • THE ABSENT CONTROLS. D-266's suspended branch and the cooling-down rejection both say
//     something by drawing NOTHING, and an absence in a source scan is indistinguishable from a
//     component that failed to render. Each is asserted with a positive control beside it. ⚠ The
//     `pending` panel used to be a third: it draws the resume form since plan 18.1-15, because the
//     partner returns the host's own unfinished session when asked again (`deferred-items.md` § D5).
//     The two remaining absences are what stop that edit becoming "every panel draws a form".
//   • THE ONE REGION, AND ITS NAME. `role="status"` is nameFrom:author in ARIA — it takes no name from
//     its own text — so a region with a perfectly good sentence in it can still be unaddressable, and
//     nothing on screen shows the difference. Read here through `@testing-library`'s `{ name }`
//     option, which runs `dom-accessibility-api`; that library is not imported directly, here or
//     anywhere in this repository.
//   • THE SERVER'S SENTENCE, VERBATIM. `toBe`, not `toContain`: a client re-authoring is a second
//     wording of a refusal, which is a second thing to keep in agreement with the code that refused.
//
// NOT COVERED, so the next reader under-trusts this file:
//   • THE SUCCESS PATH. It assigns `window.location.href` to leave for another origin, which jsdom
//     cannot perform. What happens on a successful ask is `tests/ops/host-verification-submit.test.ts`
//     and the adapter's own tests; nothing here drives it.
//   • PIXELS. Whether the stacked form and its two 44px controls survive the narrow floor in both
//     themes is a picture, and it belongs to the hand-measured sweep this phase defers.
//
// Stub set: `tests/host/request-refusal.test.tsx`'s — `next/link`, the action module, and the resend,
// whose two toast sentences have one owner one module over and are not this file's subject.

import * as React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/app/actions/host-verification", () => ({
  requestHostVerification: vi.fn(),
}));

vi.mock("@/lib/host/resend-verification", () => ({
  resendVerificationEmail: vi.fn(),
}));

import { requestHostVerification } from "@/app/actions/host-verification";
import { resendVerificationEmail } from "@/lib/host/resend-verification";
import { VerificationPanel } from "@/components/host/verification-panel";
import {
  HOST_VERIFICATION_NOTHING_CHANGED,
  HOST_VERIFICATION_PHONE_REQUIRED,
} from "@/lib/host/verification-refusals";
import {
  HOST_VERIFICATION_REGION_NAME,
  VERIFICATION_EMAIL_GATE_LABEL,
  VERIFICATION_EMAIL_RESEND_LABEL,
  VERIFICATION_HANDOFF_LINE,
  VERIFICATION_MOBILE_ONLY_LINE,
  VERIFICATION_PHONE_HELPER,
  VERIFICATION_SIGNAL,
  VERIFICATION_SUBMIT_PENDING_LABEL,
  composeEmailGateLine,
} from "@/lib/host/verification-signal";

const submitMock = vi.mocked(requestHostVerification);
const resendMock = vi.mocked(resendVerificationEmail);

const HOST_EMAIL = "maria.santos@example.com";

/** The cooldown sentence a rejected host reads while it is still running, composed server-side. */
const RETRY_SENTENCE = "You can ask for another check after 3 Sep 2026, 4:15 pm.";

function panel(overrides: Partial<React.ComponentProps<typeof VerificationPanel>> = {}) {
  return (
    <VerificationPanel
      status="unverified"
      reason={null}
      retryAfterSentence={null}
      hostEmail={HOST_EMAIL}
      emailVerified
      {...overrides}
    />
  );
}

beforeEach(() => {
  submitMock.mockReset();
  resendMock.mockReset();
});
afterEach(cleanup);

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// D-273 — THE DEVICE INSTRUCTION IS IN THE RESTING STATE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("D-273 — the check needs a phone, and the host reads that before pressing anything", () => {
  it("renders the line at first paint on the unverified panel, with the action never called", () => {
    render(panel());

    // THE CLAIM. Present in the document with no interaction of any kind having happened.
    expect(screen.getByText(VERIFICATION_MOBILE_ONLY_LINE)).toBeTruthy();
    // THE OTHER HALF OF THE CLAIM, and the one that makes it about WHEN rather than WHETHER: nothing
    // has been pressed, so this cannot be an outcome, an error or a late correction.
    expect(submitMock).not.toHaveBeenCalled();
    expect(resendMock).not.toHaveBeenCalled();
    // It is not inside the refusal region either — there is no refusal region yet, which is the
    // strongest available statement that the line is not an error dressed as advice.
    expect(screen.queryAllByRole("status")).toHaveLength(0);

    // The hand-off line keeps it company, for the same reason and in the same place: read before the
    // press rather than discovered after it. It names the partner's existence and no partner.
    expect(screen.getByText(VERIFICATION_HANDOFF_LINE)).toBeTruthy();
    expect(document.body.textContent?.toLowerCase()).not.toContain("didit");
  });

  it("renders it on the rejected panel too, once the cooldown has elapsed", () => {
    render(panel({ status: "rejected", reason: "We couldn't confirm who this account belongs to." }));

    expect(screen.getByText(VERIFICATION_MOBILE_ONLY_LINE)).toBeTruthy();
    expect(submitMock).not.toHaveBeenCalled();
    // Positive control: this really is the branch that draws the retry, not the one that draws a
    // sentence — otherwise the assertion above would be about the wrong panel.
    expect(
      screen.getByRole("button", { name: VERIFICATION_SIGNAL.rejected.wayOut as string }),
    ).toBeTruthy();
  });

  it("survives the press rather than appearing because of it", async () => {
    // The failure this rules out is the inverse of case 1's: a line that is only rendered once the
    // form is in flight, or once something came back, would satisfy "the sentence is on the surface"
    // and would still be telling a host too late. It is on screen before, during and after.
    let release: (value: { ok: false; error: string }) => void = () => {};
    submitMock.mockImplementation(
      () => new Promise((resolvePromise) => { release = resolvePromise; }),
    );

    render(panel());
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "0917 123 4567" } });
    fireEvent.click(
      screen.getByRole("button", { name: VERIFICATION_SIGNAL.unverified.wayOut as string }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: VERIFICATION_SUBMIT_PENDING_LABEL }),
      ).toBeTruthy(),
    );
    expect(screen.getByText(VERIFICATION_MOBILE_ONLY_LINE)).toBeTruthy();

    release({ ok: false, error: HOST_VERIFICATION_NOTHING_CHANGED });
    await waitFor(() => expect(screen.getByRole("status")).toBeTruthy());
    expect(screen.getByText(VERIFICATION_MOBILE_ONLY_LINE)).toBeTruthy();
  });

  it("is ABSENT on the branch that draws no control, because there is no press to precede", () => {
    // Not an oversight and not a weaker claim: the sentence tells a host how to start a check, and the
    // cooling-down panel offers no way to start one. A device instruction beside no control is advice
    // about an act nobody can perform.
    render(panel({ status: "rejected", reason: null, retryAfterSentence: RETRY_SENTENCE }));

    expect(screen.queryByText(VERIFICATION_MOBILE_ONLY_LINE)).toBeNull();
    expect(screen.getByText(RETRY_SENTENCE)).toBeTruthy();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHICH PANELS DRAW A CONTROL, AND WHICH SPEAK BY DRAWING NOTHING
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("D-266 / D-264 / D5 — the control each state may and may not draw", () => {
  it("suspended renders the shipped notice and NO submit control", () => {
    const { container } = render(
      panel({ status: "suspended", reason: "Repeated no-shows reported by bookers." }),
    );

    // The shipped component, identified by the marker it already carries on three other host surfaces
    // — so this asserts the notice was REUSED rather than that some paragraph exists.
    expect(container.querySelector("[data-hosting-paused]")).not.toBeNull();
    expect(container.textContent).toContain("Repeated no-shows reported by bookers.");
    // D-266 made visual: the machine does not draw the button that would try to reverse a named staff
    // member's enforcement decision. No control at all, of any weight.
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryByLabelText(/phone/i)).toBeNull();
  });

  it("pending renders the state, the reason and the resume control, labelled from the copy module", async () => {
    // D5, closed by plan 18.1-15. This panel used to draw nothing, on the reasoning that the
    // hosted-flow URL is not storable — which was true and is still true, and was never the whole
    // story: the partner hands back the host's own unfinished session when asked again, so the way
    // back in is a PRESS and the link is re-fetched rather than kept. The failure that reasoning
    // shipped was a host who got distracted mid-flow reading "in progress" for up to seven days with
    // nothing to press and nobody to ask.
    submitMock.mockResolvedValue({ ok: false, error: HOST_VERIFICATION_NOTHING_CHANGED });

    render(panel({ status: "pending" }));

    expect(screen.getByText(VERIFICATION_SIGNAL.pending.state)).toBeTruthy();
    expect(screen.getByText(VERIFICATION_SIGNAL.pending.reason)).toBeTruthy();

    // ONE control, and its accessible name is the copy module's — not a sentence typed here. There is
    // no third spelling of this label anywhere in the product.
    const control = screen.getByRole("button", {
      name: VERIFICATION_SIGNAL.pending.wayOut as string,
    });
    expect(screen.queryAllByRole("button")).toHaveLength(1);

    // The same form the first panel draws, so the same gate: the phone is re-collected because
    // § 21(b) contact details stay current and the host may be fixing a typo.
    const field = screen.getByLabelText(/phone/i) as HTMLInputElement;
    expect(field.type).toBe("tel");
    expect(field.required).toBe(true);

    // ⚠ D-273 AT FIRST PAINT ON THIS BRANCH TOO, and it is correct rather than incidental: the flow
    // is mobile-only when it is RESUMED just as much as when it is started, and the host reads that
    // BEFORE the press. The sibling case below is what stops this becoming "the line appears
    // everywhere" — it drives the cooling-down `rejected` panel, which still draws no control and
    // therefore still says nothing about a device, and it is byte-unchanged by this plan.
    expect(screen.getByText(VERIFICATION_MOBILE_ONLY_LINE)).toBeTruthy();
    expect(submitMock, "present before any interaction, not because of one").not.toHaveBeenCalled();

    fireEvent.change(field, { target: { value: "0917 123 4567" } });
    fireEvent.click(control);
    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));
    expect(submitMock).toHaveBeenCalledWith({ phone: "0917 123 4567" });

    // And the refusal the server may answer with — the partner already finished this session — lands
    // in the SAME one named region this surface has always had. No branch of its own, no second
    // wording: the sentence is the action's, verbatim.
    const region = await screen.findByRole("status", { name: HOST_VERIFICATION_REGION_NAME });
    expect(region.textContent).toBe(HOST_VERIFICATION_NOTHING_CHANGED);
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("approved states a fact — no control, no glyph, and no success hue", () => {
    const { container } = render(panel({ status: "approved" }));

    expect(screen.getByText(VERIFICATION_SIGNAL.approved.reason)).toBeTruthy();
    // One inline link OUT, and it is a destination rather than a control that acts.
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/host/listings");
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    // A host who has just been checked is being told a fact, not congratulated. The hue's scarcity is
    // the point: one that appears on every satisfied outcome stops meaning the one that matters.
    expect(container.innerHTML).not.toContain("success");
    expect(container.querySelector("svg")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE FORM — TWO GATES, ONE CONTROL, ONE REGION
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("the submission form's two gates", () => {
  it("D-269 — an unconfirmed email draws the resend and names the inbox; a confirmed one draws neither", () => {
    render(panel({ emailVerified: false }));

    expect(screen.getByText(VERIFICATION_EMAIL_GATE_LABEL)).toBeTruthy();
    expect(screen.getByText(composeEmailGateLine(HOST_EMAIL))).toBeTruthy();

    // The extracted resend, called with THIS surface's callback path — the one thing that differs
    // between its two call sites, and a parameter rather than a branch.
    fireEvent.click(screen.getByRole("button", { name: VERIFICATION_EMAIL_RESEND_LABEL }));
    expect(resendMock).toHaveBeenCalledWith({ email: HOST_EMAIL, callbackURL: "/host/verify" });

    cleanup();

    // The checklist grammar's other half: the action is present ONLY when the row is unmet.
    render(panel({ emailVerified: true }));
    expect(screen.getByText(VERIFICATION_EMAIL_GATE_LABEL)).toBeTruthy();
    expect(screen.queryByRole("button", { name: VERIFICATION_EMAIL_RESEND_LABEL })).toBeNull();
    expect(screen.queryByText(composeEmailGateLine(HOST_EMAIL))).toBeNull();
  });

  it("D-268 — the phone is a required tel field carrying the helper that says what it is NOT for", () => {
    render(panel());

    const field = screen.getByLabelText(/phone/i) as HTMLInputElement;
    expect(field.type).toBe("tel");
    expect(field.required).toBe(true);
    expect(field.name).toBe("phone");

    const helper = screen.getByText(VERIFICATION_PHONE_HELPER);
    // Associated, not merely adjacent: a helper a screen reader never reaches answers nobody's
    // question about why a marketplace wants their number.
    expect(field.getAttribute("aria-describedby")).toBe(helper.getAttribute("id"));
  });

  it("hands the typed phone to the action and locks the control while the press is out", async () => {
    let release: (value: { ok: false; error: string }) => void = () => {};
    submitMock.mockImplementation(
      () => new Promise((resolvePromise) => { release = resolvePromise; }),
    );

    render(panel());
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "02 8123 4567" } });
    fireEvent.click(
      screen.getByRole("button", { name: VERIFICATION_SIGNAL.unverified.wayOut as string }),
    );

    await waitFor(() => expect(submitMock).toHaveBeenCalledWith({ phone: "02 8123 4567" }));

    // BOTH attributes, which is the shipped idiom rather than a belt-and-braces habit: one of them
    // stops the press and the other is what a screen reader is told about it.
    const control = screen.getByRole("button", { name: VERIFICATION_SUBMIT_PENDING_LABEL });
    expect((control as HTMLButtonElement).disabled).toBe(true);
    expect(control.getAttribute("aria-disabled")).toBe("true");

    release({ ok: false, error: HOST_VERIFICATION_PHONE_REQUIRED });
    await waitFor(() => expect(screen.getByRole("status")).toBeTruthy());
    // Back to idle: the control is the retry, which is why the refusal region carries none of its own.
    expect(
      screen.getByRole("button", { name: VERIFICATION_SIGNAL.unverified.wayOut as string }),
    ).toBeTruthy();
  });
});

describe("the ONE named region carries every refusal, verbatim", () => {
  it("renders the server's sentence under a non-empty accessible NAME, and only one region exists", async () => {
    submitMock.mockResolvedValue({ ok: false, error: HOST_VERIFICATION_PHONE_REQUIRED });

    render(panel());
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "nope" } });
    fireEvent.click(
      screen.getByRole("button", { name: VERIFICATION_SIGNAL.unverified.wayOut as string }),
    );

    const region = await screen.findByRole("status", { name: HOST_VERIFICATION_REGION_NAME });
    // VERBATIM. `toBe`, not `toContain` — the client re-authors nothing.
    expect(region.textContent).toBe(HOST_VERIFICATION_PHONE_REQUIRED);
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("one press announces one thing: a second refusal REPLACES the first rather than joining it", async () => {
    submitMock.mockResolvedValueOnce({ ok: false, error: HOST_VERIFICATION_PHONE_REQUIRED });
    submitMock.mockResolvedValueOnce({ ok: false, error: HOST_VERIFICATION_NOTHING_CHANGED });

    render(panel());
    const control = () =>
      screen.getByRole("button", { name: VERIFICATION_SIGNAL.unverified.wayOut as string });

    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "nope" } });
    fireEvent.click(control());
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe(HOST_VERIFICATION_PHONE_REQUIRED),
    );

    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "0917 123 4567" } });
    fireEvent.click(control());
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe(HOST_VERIFICATION_NOTHING_CHANGED),
    );
    // Still ONE. A region per branch would be several announcements for one press — and, on this
    // surface, would hand back the distinction the 0-row sentence collapses on purpose.
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });
});
