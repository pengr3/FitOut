// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(), activate: vi.fn(), push: vi.fn(), refresh: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, useRouter: () => mocks }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.session } } }));
vi.mock("@/app/actions/capability", () => ({ activateHosting: mocks.activate }));
import StartHostingPage from "@/app/start-hosting/page";
import { HostingIntent } from "@/components/marketing/hosting-intent";

beforeEach(() => { vi.clearAllMocks(); mocks.session.mockResolvedValue(null); });
afterEach(cleanup);

describe("checked hosting entry", () => {
  it("sends anonymous visitors to login with hosting return without activation", async () => {
    await expect(StartHostingPage()).rejects.toThrow("REDIRECT:/login?callbackURL=%2Fstart-hosting");
    expect(mocks.activate).not.toHaveBeenCalled();
  });
  it("sends an existing host directly to the host surface", async () => {
    mocks.session.mockResolvedValue({ user: { id: "host", canHost: true, canBook: true } });
    await expect(StartHostingPage()).rejects.toThrow("REDIRECT:/host");
    expect(mocks.activate).not.toHaveBeenCalled();
  });
  it("repeated booker renders offer an explicit action and never activate on GET", async () => {
    mocks.session.mockResolvedValue({ user: { id: "booker", canHost: false, canBook: true } });
    render(await StartHostingPage());
    expect(screen.getByRole("button", { name: "Start hosting" })).toBeTruthy();
    await StartHostingPage();
    expect(mocks.activate).not.toHaveBeenCalled();
  });
});

describe("explicit hosting activation", () => {
  it("calls the protected action once only on click, then navigates to fresh host setup", async () => {
    let resolve!: (value: { ok: true; redirectTo: string }) => void;
    mocks.activate.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<HostingIntent />);
    expect(mocks.activate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Start hosting" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Starting hosting…" }).hasAttribute("disabled")).toBe(true));
    resolve({ ok: true, redirectTo: "/host" });
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/host"));
    expect(mocks.activate).toHaveBeenCalledTimes(1);
  });
  it("retains intent and allows retry after an action denial", async () => {
    mocks.activate.mockResolvedValueOnce({ ok: false, error: "Too many attempts. Please try again in a moment." })
      .mockResolvedValueOnce({ ok: true, redirectTo: "/host" });
    render(<HostingIntent />);
    fireEvent.click(screen.getByRole("button", { name: "Start hosting" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Too many attempts");
    expect(mocks.push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Start hosting" }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/host"));
  });
  it("catches network errors without losing the retry control", async () => {
    mocks.activate.mockRejectedValue(new Error("network"));
    render(<HostingIntent />);
    fireEvent.click(screen.getByRole("button", { name: "Start hosting" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Please try again");
    expect(screen.getByRole("button", { name: "Start hosting" }).hasAttribute("disabled")).toBe(false);
  });
  it("refuses an unexpected destination returned by activation", async () => {
    mocks.activate.mockResolvedValue({ ok: true, redirectTo: "https://evil.test/host" });
    render(<HostingIntent />);
    fireEvent.click(screen.getByRole("button", { name: "Start hosting" }));
    await screen.findByRole("alert");
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
