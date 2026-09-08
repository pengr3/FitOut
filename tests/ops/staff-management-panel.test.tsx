// @vitest-environment jsdom

import * as React from "react";
import { existsSync } from "node:fs";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StaffManagementSnapshot } from "@/lib/ops/staff-management";

const revokeStaffAction = vi.hoisted(() => vi.fn());

vi.mock("@/app/actions/ops-staff", () => ({
  INITIAL_OPS_STAFF_ACTION_STATE: { status: "idle" },
  revokeStaffAction,
}));

const panelPath = "src/components/ops/staff-management-panel.tsx";
const dialogPath = "src/components/ops/staff-action-dialog.tsx";
const panelExists = existsSync(panelPath);
const dialogExists = existsSync(dialogPath);

const snapshot: StaffManagementSnapshot = {
  activeStaff: [
    {
      email: "current.operator@example.com",
      staffSinceLabel: "Sep 7, 2026",
      isCurrentActor: true,
      canRevoke: false,
      revokeDisabledReason: "You can't revoke your own staff access.",
      actionRef: { targetUserId: "internal-current-id" },
    },
    {
      email: "colleague.with.a.very.long.address@example.com",
      staffSinceLabel: "Sep 8, 2026",
      isCurrentActor: false,
      canRevoke: true,
      revokeDisabledReason: null,
      actionRef: { targetUserId: "internal-colleague-id" },
    },
  ],
  pendingInvitations: [],
};

async function loadPanel() {
  return (await vi.importActual(
    "@/components/ops/staff-management-panel",
  )) as typeof import("@/components/ops/staff-management-panel");
}

beforeEach(() => {
  vi.clearAllMocks();
  revokeStaffAction.mockResolvedValue({
    status: "success",
    action: "revoke",
    message: "Staff access was revoked.",
    targetUserId: "internal-colleague-id",
  });
});

afterEach(() => cleanup());

describe("D-15 through D-19 staff management panel", () => {
  it("exports the one panel and shared responsive action dialog", () => {
    expect(panelExists, `${panelPath} must exist`).toBe(true);
    expect(dialogExists, `${dialogPath} must exist`).toBe(true);
  });

  it.skipIf(!panelExists || !dialogExists)(
    "renders the locked heading order, active facts, You marker, and no visible internal ids",
    async () => {
      const { StaffManagementPanel } = await loadPanel();
      render(<StaffManagementPanel snapshot={snapshot} />);

      const text = document.body.textContent ?? "";
      expect(text.indexOf("Staff management")).toBeLessThan(text.indexOf("Active staff"));
      expect(text.indexOf("Active staff")).toBeLessThan(text.indexOf("Pending invitations"));
      expect(screen.getByText("current.operator@example.com")).not.toBeNull();
      expect(screen.getByText("Staff since Sep 7, 2026")).not.toBeNull();
      expect(screen.getByText("You")).not.toBeNull();
      expect(screen.queryByText("internal-current-id")).toBeNull();
      expect(screen.queryByText("internal-colleague-id")).toBeNull();
    },
  );

  it.skipIf(!panelExists || !dialogExists)(
    "keeps self revoke visible-disabled with the shared reason and description binding",
    async () => {
      const { StaffManagementPanel } = await loadPanel();
      render(<StaffManagementPanel snapshot={snapshot} />);

      const currentRow = screen.getByText("current.operator@example.com").closest("li");
      expect(currentRow).not.toBeNull();
      const button = within(currentRow!).getByRole("button", { name: "Revoke access" });
      const reason = within(currentRow!).getByText("You can't revoke your own staff access.");
      expect((button as HTMLButtonElement).disabled).toBe(true);
      expect(button.getAttribute("aria-describedby")).toBe(reason.id);
    },
  );

  it.skipIf(!panelExists || !dialogExists)(
    "requires a responsive confirmation with the safe action first for eligible revoke",
    async () => {
      const { StaffManagementPanel } = await loadPanel();
      render(<StaffManagementPanel snapshot={snapshot} />);

      const colleagueRow = screen
        .getByText("colleague.with.a.very.long.address@example.com")
        .closest("li");
      fireEvent.click(within(colleagueRow!).getByRole("button", { name: "Revoke access" }));

      const dialog = await screen.findByRole("dialog", { name: "Revoke staff access?" });
      expect(
        within(dialog).getByText(
          /They will lose access on their next request\. This does not delete the account\./,
        ),
      ).not.toBeNull();
      const buttons = within(dialog).getAllByRole("button");
      expect(buttons.findIndex((button) => button.textContent === "Keep staff access")).toBeLessThan(
        buttons.findIndex((button) => button.textContent === "Revoke access"),
      );
      expect(document.activeElement).toBe(
        within(dialog).getByRole("button", { name: "Keep staff access" }),
      );
    },
  );

  it.skipIf(!panelExists || !dialogExists)(
    "persists a server refusal in the shared in-page alert instead of a toast",
    async () => {
      revokeStaffAction.mockResolvedValueOnce({
        status: "error",
        action: "revoke",
        message: "You can't revoke the last staff account.",
      });
      const { StaffManagementPanel } = await loadPanel();
      render(<StaffManagementPanel snapshot={snapshot} />);

      const colleagueRow = screen
        .getByText("colleague.with.a.very.long.address@example.com")
        .closest("li");
      fireEvent.click(within(colleagueRow!).getByRole("button", { name: "Revoke access" }));
      fireEvent.click(
        within(await screen.findByRole("dialog")).getByRole("button", {
          name: "Revoke access",
        }),
      );

      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByRole("alert").textContent,
      ).toBe("You can't revoke the last staff account.");
      expect(dialog).not.toBeNull();
      expect(document.querySelector("[data-sonner-toast]")).toBeNull();
    },
  );
});
