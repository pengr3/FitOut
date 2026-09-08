import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => [] as string[]);
const originGate = vi.hoisted(() =>
  vi.fn(async () => {
    calls.push("origin");
  }),
);
const staffGate = vi.hoisted(() =>
  vi.fn(async () => {
    calls.push("staff");
    return { id: "staff-session-actor" };
  }),
);
const issueInvitation = vi.hoisted(() => vi.fn());
const resendInvitation = vi.hoisted(() => vi.fn());
const cancelInvitation = vi.hoisted(() => vi.fn());
const acceptInvitation = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());
const redirectTo = vi.hoisted(() =>
  vi.fn((destination: string) => {
    throw new Error(`NEXT_REDIRECT;${destination}`);
  }),
);

vi.mock("@/lib/ops/staff", () => ({
  requireOpsMutationOrigin: originGate,
  requireStaff: staffGate,
}));

vi.mock("@/lib/ops/invitations", () => ({
  issueStaffInvitation: issueInvitation,
  resendStaffInvitation: resendInvitation,
  cancelStaffInvitation: cancelInvitation,
  acceptStaffInvitation: acceptInvitation,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectTo,
}));

vi.mock("next/cache", () => ({ revalidatePath }));

type StaffActions = {
  inviteStaffAction: (input: { email: string }) => Promise<unknown>;
  resendStaffInviteAction: (ref: { id: string; version: string }) => Promise<unknown>;
  cancelStaffInviteAction: (ref: { id: string; version: string }) => Promise<unknown>;
};

type AuthActions = {
  acceptStaffInviteAction: (input: {
    token: string;
    name: string;
    password: string;
  }) => Promise<unknown>;
};

async function loadStaffActions(): Promise<StaffActions | null> {
  try {
    return (await vi.importActual("@/app/actions/ops-staff")) as StaffActions;
  } catch {
    return null;
  }
}

async function loadAuthActions(): Promise<AuthActions> {
  return (await vi.importActual("@/app/actions/ops-auth")) as AuthActions;
}

beforeEach(() => {
  calls.length = 0;
  vi.clearAllMocks();
  originGate.mockImplementation(async () => {
    calls.push("origin");
  });
  staffGate.mockImplementation(async () => {
    calls.push("staff");
    return { id: "staff-session-actor" };
  });
  issueInvitation.mockResolvedValue({ outcome: "sent" });
  resendInvitation.mockResolvedValue({ outcome: "sent" });
  cancelInvitation.mockResolvedValue({ outcome: "cancelled" });
  acceptInvitation.mockResolvedValue({ outcome: "inactive" });
});

describe("OPS-09 staff invitation Server Function boundaries", () => {
  it("exports lifecycle actions that establish exact ops authority before staff and domain work", async () => {
    const actions = await loadStaffActions();
    expect(actions?.inviteStaffAction, "inviteStaffAction must exist").toBeTypeOf("function");

    await actions!.inviteStaffAction({ email: "new.staff@example.com" });

    expect(calls).toEqual(["origin", "staff"]);
    expect(issueInvitation).toHaveBeenCalledWith(
      { email: "new.staff@example.com" },
      "staff-session-actor",
    );
  });

  it("refuses wrong authority before staff identity or invitation state is touched", async () => {
    const actions = await loadStaffActions();
    expect(actions?.inviteStaffAction).toBeTypeOf("function");
    originGate.mockRejectedValueOnce(new Error("NEXT_HTTP_ERROR_FALLBACK;404"));

    await expect(
      actions!.inviteStaffAction({
        email: "target@example.com",
        actorId: "client-supplied-actor",
      } as { email: string }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");

    expect(calls).toEqual([]);
    expect(staffGate).not.toHaveBeenCalled();
    expect(issueInvitation).not.toHaveBeenCalled();
  });

  it("binds resend and cancel to the supplied server reference and maps stale outcomes unchanged", async () => {
    const actions = await loadStaffActions();
    expect(actions?.resendStaffInviteAction).toBeTypeOf("function");
    expect(actions?.cancelStaffInviteAction).toBeTypeOf("function");
    const ref = { id: "server-bound-row", version: "server-bound-version" };
    resendInvitation.mockResolvedValueOnce({ outcome: "stale" });
    cancelInvitation.mockResolvedValueOnce({ outcome: "stale" });

    await expect(actions!.resendStaffInviteAction(ref)).resolves.toEqual({ outcome: "stale" });
    await expect(actions!.cancelStaffInviteAction(ref)).resolves.toEqual({ outcome: "stale" });

    expect(resendInvitation).toHaveBeenCalledWith(ref, "staff-session-actor");
    expect(cancelInvitation).toHaveBeenCalledWith(ref, "staff-session-actor");
  });

  it("accepts only token, name, and password after exact origin and redirects accepted setup", async () => {
    const actions = await loadAuthActions();
    expect(actions.acceptStaffInviteAction).toBeTypeOf("function");
    acceptInvitation.mockResolvedValueOnce({ outcome: "accepted", userId: "created-staff" });

    await expect(
      actions.acceptStaffInviteAction({
        token: "0123456789ABCDEFGHJK",
        name: "New Staff",
        password: "a-long-password",
        email: "attacker@example.com",
        actorId: "attacker",
        userId: "target",
      } as { token: string; name: string; password: string }),
    ).rejects.toThrow("NEXT_REDIRECT;/login?accepted=1");

    expect(calls).toEqual(["origin"]);
    expect(staffGate).not.toHaveBeenCalled();
    expect(acceptInvitation).toHaveBeenCalledWith({
      token: "0123456789ABCDEFGHJK",
      name: "New Staff",
      password: "a-long-password",
    });
  });

  it("returns typed invalid and inactive acceptance outcomes without redirecting", async () => {
    const actions = await loadAuthActions();
    acceptInvitation.mockResolvedValueOnce({ outcome: "invalid" });
    await expect(
      actions.acceptStaffInviteAction({ token: "", name: "", password: "" }),
    ).resolves.toEqual({ outcome: "invalid" });

    acceptInvitation.mockReset();
    acceptInvitation.mockResolvedValueOnce({ outcome: "inactive" });
    await expect(
      actions.acceptStaffInviteAction({
        token: "0123456789ABCDEFGHJK",
        name: "New Staff",
        password: "a-long-password",
      }),
    ).resolves.toEqual({ outcome: "inactive" });
    expect(redirectTo).not.toHaveBeenCalled();
  });
});
