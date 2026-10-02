// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const save = vi.fn();
const refresh = vi.fn();
vi.mock("@/app/actions/payout-destination", () => ({ savePayoutDestination: (...args: unknown[]) => save(...args) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/components/ui/checkbox", async () => {
  const React = await import("react");
  return {
    Checkbox: ({ checked, disabled, id, onCheckedChange }: { checked: boolean; disabled?: boolean; id?: string; onCheckedChange: (checked: boolean) => void }) =>
      React.createElement("input", { type: "checkbox", checked, disabled, id, onChange: (event: React.ChangeEvent<HTMLInputElement>) => onCheckedChange(event.target.checked) }),
  };
});

import { PayoutDestinationForm } from "@/components/host/payout-destination-form";

afterEach(() => {
  cleanup();
  save.mockReset();
  refresh.mockReset();
});

function submitForm() {
  const form = document.querySelector("form");
  if (!form) throw new Error("Payout form missing");
  fireEvent.submit(form);
}

describe("payout destination review", () => {
  it("opens a review dialog after saving and explains an unapproved host's blocked confirmation", async () => {
    save.mockResolvedValue({ ok: true });
    const attest = vi.fn();
    render(<PayoutDestinationForm institutions={[{ bic: "TESTPHM2XXX", name: "Test Bank" }]} hostApproved={false} onAttest={attest} />);

    submitForm();
    const dialog = await screen.findByRole("dialog", { name: "Review payout destination" });
    expect(within(dialog).getByText("Hosting approval needed")).toBeTruthy();
    expect(within(dialog).getByRole("link", { name: "Check verification status" }).getAttribute("href")).toBe("/host/verify");
    expect(within(dialog).getByRole("button", { name: "Confirm payout destination" }).hasAttribute("disabled")).toBe(true);
    expect(attest).not.toHaveBeenCalled();
  });

  it("keeps a failed confirmation in the dialog and gives clear success after retry", async () => {
    save.mockResolvedValue({ ok: true });
    const attest = vi.fn()
      .mockResolvedValueOnce({ ok: false, error: "Please review your account." })
      .mockResolvedValueOnce({ ok: true });
    const { rerender } = render(<PayoutDestinationForm institutions={[{ bic: "TESTPHM2XXX", name: "Test Bank" }]} hostApproved onAttest={attest} />);

    submitForm();
    const dialog = await screen.findByRole("dialog", { name: "Review payout destination" });
    fireEvent.click(within(dialog).getByRole("checkbox"));
    await waitFor(() => expect((within(dialog).getByRole("checkbox") as HTMLInputElement).checked).toBe(true));
    const confirm = within(dialog).getByRole("button", { name: "Confirm payout destination" });
    fireEvent.click(confirm);
    expect(await within(dialog).findByText("Please review your account.")).toBeTruthy();
    expect(screen.getByRole("dialog", { name: "Review payout destination" })).toBeTruthy();

    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Confirm payout destination" }).hasAttribute("disabled")).toBe(false));
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm payout destination" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("status").textContent).toContain("Payout destination confirmed");
    expect(attest).toHaveBeenCalledTimes(2);
    rerender(<PayoutDestinationForm institutions={[{ bic: "TESTPHM2XXX", name: "Test Bank" }]} confirmedDestination={{ institutionName: "Test Bank", accountLast4: "4567" }} hostApproved onAttest={attest} />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
