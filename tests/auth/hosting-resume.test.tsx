// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), email: vi.fn(), social: vi.fn(), signup: vi.fn(), signUpEmail: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks, useSearchParams: () => new URLSearchParams(window.location.search) }));
vi.mock("@/lib/auth-client", () => ({ authClient: { signIn: { email: mocks.email, social: mocks.social } } }));
vi.mock("@/app/actions/auth", () => ({ signup: mocks.signup }));
vi.mock("@/lib/auth", async (original) => {
  const actual = await original<typeof import("@/lib/auth")>();
  return { auth: { ...actual.auth, api: { ...actual.auth.api, signUpEmail: mocks.signUpEmail } } };
});
import LoginPage from "@/app/(auth)/login/page";
import SignupPage from "@/app/(auth)/signup/page";
import { sessionCheckResponse, type SessionCheckAuth } from "@/lib/session-check";

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/login?callbackURL=%2Fstart-hosting");
  mocks.email.mockResolvedValue({ error: null });
  mocks.social.mockResolvedValue({ error: null });
  mocks.signup.mockResolvedValue({ ok: true, redirectTo: "/" });
  mocks.signUpEmail.mockResolvedValue({ user: { id: "new-booker" } });
});
afterEach(cleanup);

async function fillSignup() {
  fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Journey" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "journey@example.com" } });
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "averylongpassword" } });
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "averylongpassword" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign up to book" }));
  await waitFor(() => expect(mocks.signup).toHaveBeenCalled());
}

describe("hosting auth resume", () => {
  it("login account switch keeps the checked hosting intent", () => {
    render(<LoginPage />);
    expect(screen.getByRole("link", { name: "Create an account" }).getAttribute("href")).toBe("/signup?callbackURL=%2Fstart-hosting");
  });
  it("signup login switch keeps the checked hosting intent", () => {
    render(<SignupPage />);
    expect(screen.getByRole("link", { name: "Log in" }).getAttribute("href")).toBe("/login?callbackURL=%2Fstart-hosting");
  });
  it("password login resumes hosting", async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "journey@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "averylongpassword" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/start-hosting"));
  });
  it("signup retains book intent and resumes the explicit entry", async () => {
    render(<SignupPage />);
    await fillSignup();
    expect(mocks.signup.mock.calls[0][0]).toMatchObject({ intent: "book" });
    expect(mocks.signup.mock.calls[0][0]).not.toHaveProperty("canHost");
    expect(mocks.signup.mock.calls[0][1]).toBe("/start-hosting");
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/start-hosting"));
  });
  it.each([LoginPage, SignupPage])("Google initiation uses the checked return", async (Page) => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(mocks.social).toHaveBeenCalledWith(expect.objectContaining({ provider: "google", callbackURL: "/start-hosting" })));
  });
  it("social failure retains checked intent and gives retry feedback", async () => {
    mocks.social.mockResolvedValue({ error: { message: "provider rejected" } });
    render(<SignupPage />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect((await screen.findByRole("alert")).textContent).toContain("try again");
    expect(screen.getByRole("link", { name: "Log in" }).getAttribute("href")).toContain("start-hosting");
  });
  it("normal signup keeps its existing server destination", async () => {
    window.history.replaceState({}, "", "/signup");
    render(<SignupPage />);
    await fillSignup();
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/"));
  });
  it.each(["https://evil.test/", "//evil.test/", "/ops", "/%6f%70%73", "/_ops-auth/login", "/profile%0a", "/bad%ZZ"])("rejects unsafe callback %s on both auth switches and Google", async (callback) => {
    window.history.replaceState({}, "", `/signup?callbackURL=${encodeURIComponent(callback)}`);
    render(<SignupPage />);
    expect(screen.getByRole("link", { name: "Log in" }).getAttribute("href")).toBe("/login");
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(mocks.social).toHaveBeenCalledWith(expect.objectContaining({ callbackURL: "/" })));
  });
});

describe("session-check hosting resume", () => {
  const fake = (signedIn: boolean): SessionCheckAuth => ({
    handler: async () => new Response(JSON.stringify(signedIn ? { user: { id: "booker" } } : null)),
    $context: Promise.resolve({ authCookies: { sessionToken: { name: "better-auth.session_token", attributes: { path: "/" } } } }),
  });
  it("valid cookie resumes hosting and is never cleared", async () => {
    const request = new NextRequest("http://localhost:3000/auth/session-check?next=" + encodeURIComponent("/login?callbackURL=%2Fstart-hosting"));
    const response = await sessionCheckResponse(fake(true), request);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/start-hosting");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("stale cookie preserves hosting intent on login and expires the cookie", async () => {
    const request = new NextRequest("http://localhost:3000/auth/session-check?next=" + encodeURIComponent("/login?callbackURL=%2Fstart-hosting"));
    const response = await sessionCheckResponse(fake(false), request);
    const target = new URL(response.headers.get("location")!);
    expect(target.pathname).toBe("/login");
    expect(target.searchParams.get("callbackURL")).toBe("/start-hosting");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});

describe("signup server callback boundary", () => {
  it("forwards a checked hosting return to the real signUpEmail call", async () => {
    const { signup } = await vi.importActual<typeof import("@/app/actions/auth")>("@/app/actions/auth");
    const input = { firstName: "Journey", email: "journey@example.com", password: "averylongpassword", confirmPassword: "averylongpassword", intent: "book" as const };
    // Optional callback argument is added by this task; RED uses runtime JS invocation.
    const call = signup as (input: typeof input, callback?: string) => ReturnType<typeof signup>;
    expect(await call(input, "/start-hosting")).toMatchObject({ ok: true });
    expect(mocks.signUpEmail).toHaveBeenCalledWith({ body: expect.objectContaining({ intent: "book", callbackURL: "/start-hosting" }) });
  });
});
